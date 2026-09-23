import { AssessmentFinding, ConsularPillarId } from '../types/assessment';
import { ActionItem, ActionPlanSummary } from '../types/actionEngine';
import {
  DocumentCategory,
  DocumentChecklistItem,
  DocumentReadinessStatus,
  DocumentReadinessSummary,
  ReadinessEvidenceSource,
  ReadinessEvidenceType,
  DocumentApplicability,
  GeneratedDeliverableItem,
  GeneratedDeliverablesSummary,
  DocumentReadinessContext,
  ExplicitUploadedDocument,
  EvidenceComplianceStatus,
  EvidenceLifecycleStage,
  EvidenceRecord,
  EvidenceVerificationMethod,
  EvidenceVerificationEvent,
  VerificationProvenanceChain,
  VerificationOutcome,
  VerificationPerformer,
} from '../types/documentReadiness';
import { deriveDocumentReadinessState } from './evidenceStateMachine';

// ============================================================================
// VISAFlow V2.3.6 — DETERMINISTIC EVIDENCE PROVENANCE & APPLICABILITY ENGINE
// ============================================================================
// Core Invariants:
// Invariant #1: status = "ready" ONLY if explicit supporting evidence exists.
// Invariant #2: Evidence source distinction: declared facts, uploaded documents,
//               verified documents, assessment findings, completed actions,
//               and generated artifacts are NOT interchangeable.
// Invariant #3: Generated deliverables are strictly isolated and never applicant-owned.
// Invariant #4: Applicability must be evaluated before readiness. Not-applicable items
//               never receive a readiness status or contribute to readiness counts.
// Invariant #5: isEvidenceDirectlyVerified is strictly auditable.
// ============================================================================

/**
 * Définition d'un gabarit déterministe de pièce consulaire avec applicabilité V2.3.6
 */
interface DocumentBlueprint {
  id: string;
  category: DocumentCategory;
  title: string;
  description: string;
  isMandatoryByRegulation: boolean;
  relatedChecklistKey: string;
  targetPillars: ConsularPillarId[];
  officialBasis?: string;
  sourceRuleId?: string;
  concreteStep?: string;
  matchesFinding: (finding: AssessmentFinding) => boolean;
  evaluateApplicability?: (
    findings: AssessmentFinding[],
    context?: DocumentReadinessContext
  ) => {
    applicability: DocumentApplicability;
    notApplicableReason?: string;
  };
  evaluateStatus: (
    matchedFindings: AssessmentFinding[],
    matchedActions: ActionItem[],
    context?: DocumentReadinessContext
  ) => {
    status: DocumentReadinessStatus;
    statusReason: string;
    readinessEvidenceSource?: ReadinessEvidenceSource;
    readinessEvidenceType?: ReadinessEvidenceSource;
    readinessEvidenceIds: string[];
    isEvidenceDirectlyVerified: boolean;
    readinessJustification: string;
  };
}

// ----------------------------------------------------------------------------
// Helpers pour extraction de preuves explicites & profil consulaire (V2.3.8)
// ----------------------------------------------------------------------------

const CHECKLIST_KEY_ALIASES: Record<string, string[]> = {
  passport_original: ['passport', 'doc-passport', 'passport_original', 'passeport'],
  bank_statements: ['bank_statements_3m', 'doc-bank-statements', 'bank_statements', 'releves_bancaires'],
  admission_letter_dli: ['university_admission', 'doc-admission-letter', 'admission_letter', 'lettre_admission', 'admission_letter_dli'],
  tuition_payment_receipt: ['tuition_evidence', 'doc-tuition-evidence', 'tuition_receipt', 'tuition_payment_receipt'],
  pal_provincial_attestation: ['pal_caq', 'doc-pal-caq', 'pal', 'caq', 'pal_provincial_attestation'],
  schengen_travel_insurance_30k: ['travel_insurance', 'doc-travel-insurance', 'assurance_voyage', 'schengen_travel_insurance_30k'],
  accommodation_proof: ['accommodation', 'doc-accommodation-proof', 'hebergement', 'accommodation_proof'],
  civil_status_birth_certificate: ['civil_status', 'doc-civil-status', 'acte_naissance', 'civil_status_birth_certificate'],
  residence_permit_third_country: ['residence_permit', 'doc-residence-permit', 'titre_sejour', 'residence_permit_third_country'],
  flight_itinerary_reservation: ['flight_reservation', 'doc-flight-itinerary', 'billet_avion', 'flight_itinerary_reservation'],
  guarantor_affidavit_solvency: ['guarantor_dossier', 'doc-guarantor-dossier', 'garant', 'guarantor_affidavit_solvency'],
  tax_assessment_notice: ['tax_notice', 'doc-tax-notice', 'avis_imposition', 'tax_assessment_notice'],
  employment_contract_work: ['employment_proof', 'doc-employment-proof', 'contrat_travail', 'employment_contract_work'],
};

export function matchesChecklistKey(keyA: string, keyB: string, blueprintId?: string): boolean {
  if (!keyA || !keyB) return false;
  const a = keyA.toLowerCase().trim();
  const b = keyB.toLowerCase().trim();
  const bp = blueprintId ? blueprintId.toLowerCase().trim() : '';

  if (a === b || (bp && a === bp)) return true;
  if (a.replace(/_/g, '-') === b.replace(/_/g, '-')) return true;
  if (bp && a.replace(/_/g, '-') === bp.replace(/_/g, '-')) return true;

  for (const group of Object.values(CHECKLIST_KEY_ALIASES)) {
    const aInGroup = group.includes(a);
    const bInGroup = group.includes(b) || (bp && group.includes(bp));
    if (aInGroup && bInGroup) return true;
  }

  return false;
}

/**
 * Collecte et déduplication déterministe de tous les événements de vérification déclarés dans le contexte (V2.3.9)
 */
export function collectAllVerificationEvents(
  context?: DocumentReadinessContext
): EvidenceVerificationEvent[] {
  const events: EvidenceVerificationEvent[] = [];
  const seenEventMap = new Map<string, EvidenceVerificationEvent>();

  const allowedMethods = [
    'document_review',
    'official_source_match',
    'structured_validation',
    'manual_verification',
    'system_verification',
  ];

  const ingestEvent = (evt: EvidenceVerificationEvent) => {
    if (!evt || !evt.id) return;
    // Malformed, invalid, or illegal events must never enter the authoritative verification event registry
    if (!evt.timestamp || isNaN(new Date(evt.timestamp).getTime())) return;
    if (!evt.rationale || typeof evt.rationale !== 'string' || evt.rationale.trim().length === 0) return;
    if (!allowedMethods.includes(evt.method)) return;
    if (evt.performedBy === 'applicant' && evt.outcome === 'verified') return;

    if (seenEventMap.has(evt.id)) {
      const existing = seenEventMap.get(evt.id)!;
      // Détection de collision ou conflit d'événements sur le même identifiant
      if (
        existing.evidenceId !== evt.evidenceId ||
        existing.method !== evt.method ||
        existing.outcome !== evt.outcome ||
        existing.timestamp !== evt.timestamp ||
        existing.rationale !== evt.rationale ||
        existing.performedBy !== evt.performedBy
      ) {
        throw new Error(
          `Verification Invariant Breach: Duplicate verification event ID '${evt.id}' with conflicting properties.`
        );
      }
      return; // Identique, dédupliqué
    }
    seenEventMap.set(evt.id, evt);
    events.push(evt);
  };

  if (context?.verificationEvents) {
    for (const evt of context.verificationEvents) {
      ingestEvent(evt);
    }
  }

  if (context?.uploadedDocuments) {
    for (const doc of context.uploadedDocuments) {
      if (doc.verificationEvent) ingestEvent(doc.verificationEvent);
      if (doc.verificationEvents) {
        for (const evt of doc.verificationEvents) ingestEvent(evt);
      }
    }
  }

  if (context?.evidenceRecords) {
    for (const rec of context.evidenceRecords) {
      if (rec.verificationEvent) ingestEvent(rec.verificationEvent);
      if (rec.verificationEvents) {
        for (const evt of rec.verificationEvents) ingestEvent(evt);
      }
    }
  }

  return events;
}

/**
 * Résolution déterministe de l'état de vérification d'une preuve d'après ses événements auditables (V2.3.9)
 * Règle de résolution chronologique : l'événement valide le plus récent (selon timestamp ISO 8601, puis id) fait foi.
 */
export function resolveEvidenceVerificationState(
  evidenceId: string,
  source: ReadinessEvidenceSource,
  allEvents: EvidenceVerificationEvent[]
): {
  status: 'not_verified' | 'verified' | 'rejected';
  authoritativeEvent?: EvidenceVerificationEvent;
  method?: EvidenceVerificationMethod;
  eventId?: string;
  timestamp?: string;
  rationale?: string;
  performedBy?: VerificationPerformer;
  allCandidateEvents: EvidenceVerificationEvent[];
} {
  // Règle de source stricte (Section 4) : applicant_fact et generated_artifact sont inéligibles à la vérification
  if (source === 'applicant_fact' || source === 'generated_artifact') {
    return {
      status: 'not_verified',
      allCandidateEvents: [],
    };
  }

  // Filtrer les événements ciblant cet identifiant de preuve
  const candidateEvents = allEvents.filter((e) => e.evidenceId === evidenceId);
  if (candidateEvents.length === 0) {
    return {
      status: 'not_verified',
      allCandidateEvents: [],
    };
  }

  // Filtrer les événements techniquement valides
  const allowedMethods = [
    'document_review',
    'official_source_match',
    'structured_validation',
    'manual_verification',
    'system_verification',
  ];

  const validEvents: EvidenceVerificationEvent[] = [];
  for (const evt of candidateEvents) {
    if (!evt.timestamp || isNaN(new Date(evt.timestamp).getTime())) {
      continue;
    }
    if (!evt.rationale || typeof evt.rationale !== 'string' || evt.rationale.trim().length === 0) {
      continue;
    }
    if (!allowedMethods.includes(evt.method)) {
      continue;
    }
    // L'auto-vérification par le demandeur est strictement invalide (Section 4 & 5)
    if (evt.performedBy === 'applicant' && evt.outcome === 'verified') {
      continue;
    }
    validEvents.push(evt);
  }

  if (validEvents.length === 0) {
    return {
      status: 'not_verified',
      allCandidateEvents: candidateEvents,
    };
  }

  // Tri chronologique déterministe strict (Section 9) :
  // Ordre temporel croissant, bris d'égalité par ordre alphabétique de l'identifiant
  validEvents.sort((a, b) => {
    const tA = new Date(a.timestamp).getTime();
    const tB = new Date(b.timestamp).getTime();
    if (tA !== tB) return tA - tB;
    return a.id.localeCompare(b.id);
  });

  // Le dernier événement valide dans l'ordre chronologique est l'événement d'autorité actuel
  const latestEvent = validEvents[validEvents.length - 1];

  if (latestEvent.outcome === 'verified') {
    return {
      status: 'verified',
      authoritativeEvent: latestEvent,
      method: latestEvent.method,
      eventId: latestEvent.id,
      timestamp: latestEvent.timestamp,
      rationale: latestEvent.rationale,
      performedBy: latestEvent.performedBy,
      allCandidateEvents: validEvents,
    };
  } else {
    return {
      status: 'rejected',
      authoritativeEvent: latestEvent,
      method: latestEvent.method,
      eventId: latestEvent.id,
      timestamp: latestEvent.timestamp,
      rationale: latestEvent.rationale,
      performedBy: latestEvent.performedBy,
      allCandidateEvents: validEvents,
    };
  }
}

function findVerifiedUpload(
  checklistKey: string,
  context?: DocumentReadinessContext,
  blueprintId?: string
): ExplicitUploadedDocument | undefined {
  const allEvents = collectAllVerificationEvents(context);

  // 1. Recherche dans uploadedDocuments
  if (context?.uploadedDocuments) {
    for (const d of context.uploadedDocuments) {
      if (matchesChecklistKey(d.checklistKey, checklistKey, blueprintId)) {
        const resolution = resolveEvidenceVerificationState(d.id, 'uploaded_document', allEvents);
        if (resolution.status === 'verified') {
          return {
            ...d,
            isVerified: true,
            verificationStatus: 'verified',
            verificationMethod: resolution.method,
            verificationEventId: resolution.eventId,
            verifiedAt: resolution.timestamp,
            verificationRationale: resolution.rationale,
            verifiedBy: resolution.performedBy,
          };
        }
      }
    }
  }

  // 2. Recherche dans evidenceRecords
  if (context?.evidenceRecords) {
    for (const r of context.evidenceRecords) {
      if (matchesChecklistKey(r.relatedChecklistKey, checklistKey, blueprintId)) {
        const resolution = resolveEvidenceVerificationState(r.id, r.source, allEvents);
        if (resolution.status === 'verified') {
          return {
            id: r.id,
            checklistKey: r.relatedChecklistKey,
            fileName: r.fileName || `${checklistKey}.pdf`,
            isVerified: true,
            verificationStatus: 'verified',
            verificationMethod: resolution.method,
            verificationEventId: resolution.eventId,
            verifiedAt: resolution.timestamp,
            verificationRationale: resolution.rationale,
            verifiedBy: resolution.performedBy,
            complianceStatus: r.complianceStatus,
            complianceRuleIds: r.complianceRuleIds,
            complianceRationale: r.complianceRationale,
            isCompliant: r.isCompliant ?? (r.complianceStatus === 'compliant' ? true : r.complianceStatus === 'non_compliant' ? false : undefined),
            isExpired: r.isExpired,
            expiryDate: r.expiryDate,
            validityMonths: r.validityMonths,
            availableBalanceFcfa: r.availableBalanceFcfa,
            availableBalanceCad: r.availableBalanceCad,
            availableBalanceEur: r.availableBalanceEur,
            isInstitutionRecognized: r.isInstitutionRecognized,
            isInsuranceCompliant: r.isInsuranceCompliant,
            insuranceCoverageEur: r.insuranceCoverageEur,
            isLegible: r.isLegible,
            hasMissingPages: r.hasMissingPages,
          };
        }
      }
    }
  }

  return undefined;
}

function findUpload(
  checklistKey: string,
  context?: DocumentReadinessContext,
  blueprintId?: string
): ExplicitUploadedDocument | undefined {
  // Privilégier d'abord une pièce vérifiée si présente
  const verified = findVerifiedUpload(checklistKey, context, blueprintId);
  if (verified) return verified;

  // Sinon pièce téléversée brute (non vérifiée)
  const doc = context?.uploadedDocuments?.find((d) =>
    matchesChecklistKey(d.checklistKey, checklistKey, blueprintId)
  );
  if (doc) {
    return {
      ...doc,
      isVerified: false,
      verificationStatus: 'not_verified',
    };
  }

  // Sinon pièce enregistrée (non vérifiée)
  const rec = context?.evidenceRecords?.find(
    (r) =>
      (r.exists || r.source === 'uploaded_document' || r.source === 'verified_document') &&
      matchesChecklistKey(r.relatedChecklistKey, checklistKey, blueprintId)
  );
  if (rec) {
    return {
      id: rec.id,
      checklistKey: rec.relatedChecklistKey,
      fileName: rec.fileName || `${checklistKey}.pdf`,
      isVerified: false,
      verificationStatus: 'not_verified',
      complianceStatus: rec.complianceStatus,
      complianceRuleIds: rec.complianceRuleIds,
      complianceRationale: rec.complianceRationale,
      isCompliant: rec.isCompliant,
      isExpired: rec.isExpired,
      expiryDate: rec.expiryDate,
      validityMonths: rec.validityMonths,
      availableBalanceFcfa: rec.availableBalanceFcfa,
      availableBalanceCad: rec.availableBalanceCad,
      availableBalanceEur: rec.availableBalanceEur,
      isInstitutionRecognized: rec.isInstitutionRecognized,
      isInsuranceCompliant: rec.isInsuranceCompliant,
      insuranceCoverageEur: rec.insuranceCoverageEur,
      isLegible: rec.isLegible,
      hasMissingPages: rec.hasMissingPages,
    };
  }

  return undefined;
}

export function collectEvidenceRecordsForBlueprint(
  blueprint: DocumentBlueprint,
  context?: DocumentReadinessContext,
  matchedFindings: AssessmentFinding[] = [],
  matchedActions: ActionItem[] = []
): EvidenceRecord[] {
  const records: EvidenceRecord[] = [];
  const seenIds = new Set<string>();
  const allEvents = collectAllVerificationEvents(context);

  // 1. Preuves explicites dans context.evidenceRecords
  if (context?.evidenceRecords) {
    for (const rec of context.evidenceRecords) {
      if (matchesChecklistKey(rec.relatedChecklistKey, blueprint.relatedChecklistKey, blueprint.id)) {
        if (!seenIds.has(rec.id)) {
          seenIds.add(rec.id);
          const resolution = resolveEvidenceVerificationState(rec.id, rec.source, allEvents);
          const isVerified = resolution.status === 'verified';
          records.push({
            ...rec,
            source: isVerified ? 'verified_document' : rec.source,
            verificationStatus: resolution.status,
            verificationMethod: resolution.method || rec.verificationMethod || (isVerified ? 'system_verification' : 'not_verified'),
            verificationEventId: resolution.eventId || rec.verificationEventId,
            verificationEvent: resolution.authoritativeEvent || rec.verificationEvent,
            verifiedAt: resolution.timestamp || rec.verifiedAt,
            verificationRationale: resolution.rationale || rec.verificationRationale,
            verifiedBy: resolution.performedBy || rec.verifiedBy,
          });
        }
      }
    }
  }

  // 2. Preuves issues de context.uploadedDocuments
  if (context?.uploadedDocuments) {
    for (const doc of context.uploadedDocuments) {
      if (matchesChecklistKey(doc.checklistKey, blueprint.relatedChecklistKey, blueprint.id)) {
        if (!seenIds.has(doc.id)) {
          seenIds.add(doc.id);
          const resolution = resolveEvidenceVerificationState(doc.id, 'uploaded_document', allEvents);
          const isVerified = resolution.status === 'verified';

          let complianceStatus: EvidenceComplianceStatus = 'not_evaluated';
          if (doc.complianceStatus) {
            complianceStatus = doc.complianceStatus;
          } else if (doc.isCompliant === false || doc.isExpired === true || doc.isLegible === false || doc.hasMissingPages === true) {
            complianceStatus = 'non_compliant';
          } else if (doc.isCompliant === true) {
            complianceStatus = 'compliant';
          }

          records.push({
            id: doc.id,
            relatedChecklistKey: blueprint.relatedChecklistKey,
            source: isVerified ? 'verified_document' : 'uploaded_document',
            verificationStatus: resolution.status,
            verificationMethod: resolution.method || (isVerified ? 'system_verification' : 'not_verified'),
            verificationEventId: resolution.eventId,
            verificationEvent: resolution.authoritativeEvent,
            verifiedBy: resolution.performedBy,
            complianceStatus,
            exists: true,
            verifiedAt: resolution.timestamp || doc.verifiedAt,
            complianceRuleIds: doc.complianceRuleIds || [],
            verificationRationale:
              resolution.rationale ||
              doc.verificationRationale ||
              (isVerified
                ? 'Document vérifié et authentifié via un événement opposable.'
                : resolution.status === 'rejected'
                ? 'Document dont la vérification a été rejetée lors de l’audit.'
                : 'Document téléversé en attente de vérification matérielle.'),
            complianceRationale: doc.complianceRationale,
            fileName: doc.fileName,
            isExpired: doc.isExpired,
            expiryDate: doc.expiryDate,
            validityMonths: doc.validityMonths,
            availableBalanceFcfa: doc.availableBalanceFcfa,
            availableBalanceCad: doc.availableBalanceCad,
            availableBalanceEur: doc.availableBalanceEur,
            isInstitutionRecognized: doc.isInstitutionRecognized,
            isInsuranceCompliant: doc.isInsuranceCompliant,
            insuranceCoverageEur: doc.insuranceCoverageEur,
            isLegible: doc.isLegible,
            hasMissingPages: doc.hasMissingPages,
            isCompliant: doc.isCompliant,
          });
        }
      }
    }
  }

  // 3. Preuves déclaratives issues de context.applicantFacts
  if (context?.applicantFacts) {
    const facts = context.applicantFacts;
    let declared = false;
    if (blueprint.id === 'DOC-PASSPORT' && (facts.hasPassport === true || facts.hasPassport6MonthsValid === true)) declared = true;
    if (blueprint.id === 'DOC-ADMISSION-LETTER' && (facts.hasUniversityAdmissionLetter === true || facts.hasAdmissionLetter === true)) declared = true;
    if (blueprint.id === 'DOC-BANK-STATEMENTS' && (facts.hasCertifiedBankStatements === true || facts.hasBankStatements === true)) declared = true;
    if (blueprint.id === 'DOC-TRAVEL-INSURANCE' && (facts.hasValidTravelInsurance === true || facts.hasTravelInsurance === true)) declared = true;
    if (blueprint.id === 'DOC-ACCOMMODATION-PROOF' && (facts.hasConfirmedAccommodation === true || facts.hasAccommodation === true)) declared = true;
    if (blueprint.id === 'DOC-TUITION-EVIDENCE' && (facts.tuitionPaid === true || facts.hasTuitionReceipt === true)) declared = true;
    if (blueprint.id === 'DOC-PAL-CAQ' && (facts.hasPalCaq === true || facts.hasPal === true)) declared = true;
    if ((facts as any)[blueprint.relatedChecklistKey] === true) declared = true;

    if (declared) {
      const factId = `FACT-${blueprint.id}`;
      if (!seenIds.has(factId)) {
        seenIds.add(factId);
        records.push({
          id: factId,
          relatedChecklistKey: blueprint.relatedChecklistKey,
          source: 'applicant_fact',
          verificationStatus: 'not_verified',
          complianceStatus: 'not_evaluated',
          exists: false,
          complianceRuleIds: [],
          verificationRationale: 'Fait déclaré sur l’honneur par le demandeur sans pièce justificative matérielle.',
        });
      }
    }
  }

  // Ordonnancement déterministe de priorité pour qualifier la preuve principale
  records.sort((a, b) => {
    const getScore = (r: EvidenceRecord) => {
      if (r.verificationStatus === 'verified' && r.complianceStatus === 'compliant') return 100;
      if (r.verificationStatus === 'verified' && r.complianceStatus === 'non_compliant') return 80;
      if (r.verificationStatus === 'verified') return 60;
      if (r.source === 'uploaded_document' || r.exists) return 40;
      if (r.source === 'applicant_fact') return 20;
      return 10;
    };
    return getScore(b) - getScore(a);
  });

  return records;
}

export interface ConsularProfile {
  destination: 'canada' | 'france' | 'schengen' | 'other';
  isStudy: boolean;
  isVisit: boolean;
}

/**
 * Détection déterministe de la destination et du motif de visa
 */
export function detectDestinationAndVisaType(
  findings: AssessmentFinding[],
  context?: DocumentReadinessContext
): ConsularProfile {
  const normalizeStr = (s: string) =>
    (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  const ctxDest = normalizeStr(context?.destination || context?.applicantFacts?.destination || '');
  const ctxReason = normalizeStr(context?.visaType || context?.applicantFacts?.visaReason || (context?.applicantFacts as any)?.purpose || '');

  let isCanada = ctxDest.includes('canada');
  let isFranceOrSchengen = ctxDest.includes('france') || ctxDest.includes('schengen');
  let isStudy =
    ctxReason.includes('etud') ||
    ctxReason.includes('study') ||
    ctxReason.includes('student') ||
    ctxReason.includes('permis d\'etudes') ||
    Boolean(context?.applicantFacts?.hasUniversityAdmissionLetter) ||
    Boolean(context?.applicantFacts?.hasPalCaq);
  let isVisit = ctxReason.includes('visit') || ctxReason.includes('touris');

  for (const f of findings) {
    const fid = f.id.toUpperCase();
    const basis = (f.officialBasis || '').toUpperCase();
    const rule = (f.sourceRuleId || '').toUpperCase();
    const text = normalizeStr(f.title + ' ' + f.declaredFact + ' ' + f.findingRationale).toUpperCase();

    if (
      fid.includes('-CA-') ||
      rule.includes('-CA-') ||
      basis.includes('CANADA') ||
      basis.includes('LIPR') ||
      text.includes('CANADA') ||
      text.includes('IRCC')
    ) {
      isCanada = true;
    }
    if (
      fid.includes('-SCHENGEN-') ||
      fid.includes('-FR-') ||
      rule.includes('-FR-') ||
      basis.includes('SCHENGEN') ||
      basis.includes('FRANCE') ||
      text.includes('SCHENGEN') ||
      text.includes('CAMPUS FRANCE')
    ) {
      isFranceOrSchengen = true;
    }
    if (
      fid.includes('STUDENT') ||
      fid.includes('ACADEMIC') ||
      text.includes('ETUD') ||
      text.includes('SCOLARITE') ||
      text.includes('CAMPUS') ||
      text.includes('UNIVERSIT')
    ) {
      isStudy = true;
    }
    if (text.includes('TOURIS') || text.includes('VISITE')) {
      isVisit = true;
    }
  }

  return {
    destination: isCanada ? 'canada' : isFranceOrSchengen ? 'france' : 'other',
    isStudy,
    isVisit,
  };
}

/**
 * 1. REGISTRE DES GABARITS DE DOCUMENTS CONSULAIRES NORMALISÉS (APPLICANT-OWNED)
 * Note architecturale V2.3.6 : Les livrables générés par la plateforme (lettre de
 * motivation, note explicative) sont rigoureusement séparés dans GeneratedDeliverablesSummary.
 */
const DOCUMENT_BLUEPRINTS: DocumentBlueprint[] = [
  // --------------------------------------------------------------------------
  // A. IDENTITY & TRAVEL DOCUMENTS
  // --------------------------------------------------------------------------
  {
    id: 'DOC-PASSPORT',
    category: 'identity_and_travel',
    title: 'Passeport Original en cours de validité',
    description: 'Passeport biométrique ou ordinaire comportant au moins 2 pages vierges consécutives exemptes de tout cachet, d’une validité résiduelle conforme aux exigences consulaires.',
    isMandatoryByRegulation: true,
    relatedChecklistKey: 'passport_original',
    targetPillars: ['legal_admissibility'],
    officialBasis: 'Code Communautaire des Visas (Règlement CE n° 810/2009, Art. 12) / Loi sur l’immigration et la protection des réfugiés (LIPR Canada).',
    concreteStep: 'Vérifier la date d’expiration exacte du passeport et vous assurer qu’il comporte au moins 2 pages consécutives totalement vierges.',
    matchesFinding: (f) =>
      f.id.startsWith('FIND-PASSPORT') ||
      f.recommendedEvidence?.some((e) => e.relatedChecklistKey === 'passport_original') ||
      f.title.toLowerCase().includes('passeport') ||
      f.declaredFact.toLowerCase().includes('passeport'),
    evaluateApplicability: () => ({ applicability: 'applicable' }),
    evaluateStatus: (findings, _actions, context) => {
      // 1. Preuve explicite de téléversement certifié ou brut
      const uploadedDoc = findUpload('passport_original', context);
      if (uploadedDoc) {
        const isEvidenceDirectlyVerified = uploadedDoc.isVerified === true;
        return {
          status: 'ready',
          statusReason: isEvidenceDirectlyVerified
            ? 'Copie intégrale du passeport téléversée et certifiée conforme.'
            : 'Copie intégrale du passeport téléversée (en attente de certification physique).',
          readinessEvidenceSource: isEvidenceDirectlyVerified ? 'verified_document' : 'uploaded_document',
          readinessEvidenceType: isEvidenceDirectlyVerified ? 'verified_document' : 'uploaded_document',
          readinessEvidenceIds: [uploadedDoc.id],
          isEvidenceDirectlyVerified,
          readinessJustification: `Document téléversé ${isEvidenceDirectlyVerified ? 'vérifié et certifié' : 'fourni'} : ${uploadedDoc.fileName}.`,
        };
      }

      // 2. Blocage direct ou passeport expiré
      const blockerFinding = findings.find(
        (f) => f.id === 'FIND-PASSPORT-EXPIRED' || f.isDirectBlocker
      );
      if (blockerFinding) {
        return {
          status: 'missing',
          statusReason: 'Le passeport déclaré est expiré ou ne présente pas la durée résiduelle requise.',
          readinessEvidenceSource: 'assessment_finding',
          readinessEvidenceType: 'assessment_finding',
          readinessEvidenceIds: [blockerFinding.id],
          isEvidenceDirectlyVerified: false,
          readinessJustification: 'Constat consulaire formel établissant l’invalidité calendaire du titre de voyage.',
        };
      }

      // 3. Insuffisance d'information ou clarification consulaire
      const clarifFinding = findings.find(
        (f) =>
          f.id === 'FIND-PASSPORT-RULE-UNVERIFIED' ||
          f.id === 'FIND-PASSPORT-VALIDITY-CLARIFICATION' ||
          f.type === 'insufficient_information' ||
          f.type === 'clarification_point' ||
          f.type === 'compliance_issue'
      );
      if (clarifFinding) {
        return {
          status: 'requires_clarification',
          statusReason: 'La validité résiduelle exacte du passeport pour cette destination n’a pas pu être formellement certifiée par les données déclarées.',
          readinessEvidenceSource: 'assessment_finding',
          readinessEvidenceType: 'assessment_finding',
          readinessEvidenceIds: [clarifFinding.id],
          isEvidenceDirectlyVerified: false,
          readinessJustification: 'Constat consulaire d’information insuffisante ou règle non vérifiée : examen matériel de la date de validité et des pages vierges requis.',
        };
      }

      // 4. Preuve explicite de validité constatée
      const okFinding = findings.find(
        (f) => f.id === 'FIND-PASSPORT-VALIDITY-OK' || (f.type === 'favorable_evidence' && f.id.includes('PASSPORT'))
      );
      if (okFinding) {
        return {
          status: 'ready',
          statusReason: 'Passeport biométrique valide confirmé par le constat consulaire formel avec marge résiduelle conforme.',
          readinessEvidenceSource: 'assessment_finding',
          readinessEvidenceType: 'assessment_finding',
          readinessEvidenceIds: [okFinding.id],
          isEvidenceDirectlyVerified: false,
          readinessJustification: 'Constat consulaire favorable confirmant explicitement la validité résiduelle supérieure au seuil réglementaire.',
        };
      }

      // 5. Fallback déterministe (Required + Existence/Validity unproven -> REQUIRES_CLARIFICATION)
      return {
        status: 'requires_clarification',
        statusReason: 'Passeport obligatoire dont la validité résiduelle exacte (au moins 3 à 6 mois après le séjour) et les pages vierges doivent être constatées sur pièce.',
        readinessEvidenceSource: undefined,
        readinessEvidenceType: undefined,
        readinessEvidenceIds: [],
        isEvidenceDirectlyVerified: false,
        readinessJustification: 'Document obligatoire dont la conformité matérielle résiduelle nécessite une vérification avant dépôt.',
      };
    },
  },

  {
    id: 'DOC-RESIDENCE-PERMIT',
    category: 'identity_and_travel',
    title: 'Titre de Séjour / Carte de Résident du pays de dépôt',
    description: 'Titre de séjour en cours de validité établissant la résidence légale et continue dans le pays tiers où la demande est déposée.',
    isMandatoryByRegulation: true,
    relatedChecklistKey: 'residence_permit_third_country',
    targetPillars: ['legal_admissibility'],
    officialBasis: 'Code des Visas Schengen (Art. 6 - Compétence territoriale consulaire).',
    concreteStep: 'Joindre la copie recto-verso et l’original du titre de séjour attestant d’une résidence régulière dans le pays de dépôt.',
    matchesFinding: (f) =>
      f.id.startsWith('FIND-TERRITORIAL-FILING') ||
      f.recommendedEvidence?.some((e) => e.relatedChecklistKey === 'residence_permit_third_country') ||
      f.title.toLowerCase().includes('compétence territoriale') ||
      f.title.toLowerCase().includes('pays de dépôt'),
    evaluateApplicability: (findings, context) => {
      const hasThirdCountryFinding = findings.some(
        (f) => f.id.startsWith('FIND-TERRITORIAL-FILING') || f.title.toLowerCase().includes('pays de dépôt')
      );
      const hasThirdCountryFact = context?.applicantFacts?.residesInThirdCountry === true;
      if (!hasThirdCountryFinding && !hasThirdCountryFact) {
        return {
          applicability: 'not_applicable',
          notApplicableReason: "Le titre de séjour en pays tiers n'est pas applicable lorsque la demande est introduite dans le pays de nationalité.",
        };
      }
      return { applicability: 'applicable' };
    },
    evaluateStatus: (findings, _actions, context) => {
      const uploadedDoc = findUpload('residence_permit_third_country', context);
      if (uploadedDoc) {
        const isEvidenceDirectlyVerified = uploadedDoc.isVerified === true;
        return {
          status: 'ready',
          statusReason: 'Titre de séjour légal régulier téléversé et vérifié.',
          readinessEvidenceSource: isEvidenceDirectlyVerified ? 'verified_document' : 'uploaded_document',
          readinessEvidenceType: isEvidenceDirectlyVerified ? 'verified_document' : 'uploaded_document',
          readinessEvidenceIds: [uploadedDoc.id],
          isEvidenceDirectlyVerified,
          readinessJustification: `Titre de résident vérifié : ${uploadedDoc.fileName}.`,
        };
      }

      const missingFinding = findings.find((f) => f.id === 'FIND-TERRITORIAL-FILING-MISSING' || f.isDirectBlocker);
      if (missingFinding) {
        return {
          status: 'missing',
          statusReason: 'Absence d’indication ou de preuve de résidence légale dans le pays tiers où la demande est introduite.',
          readinessEvidenceSource: 'assessment_finding',
          readinessEvidenceType: 'assessment_finding',
          readinessEvidenceIds: [missingFinding.id],
          isEvidenceDirectlyVerified: false,
          readinessJustification: 'Constat consulaire d’irrecevabilité territoriale par défaut de titre de séjour.',
        };
      }
      const thirdCountryFinding = findings.find((f) => f.id === 'FIND-TERRITORIAL-FILING-THIRD-COUNTRY');
      if (thirdCountryFinding) {
        return {
          status: 'requires_clarification',
          statusReason: 'Dépôt hors du pays d’origine : la production du titre de séjour local en cours de validité est formellement requise.',
          readinessEvidenceSource: 'assessment_finding',
          readinessEvidenceType: 'assessment_finding',
          readinessEvidenceIds: [thirdCountryFinding.id],
          isEvidenceDirectlyVerified: false,
          readinessJustification: 'Dépôt dans un pays de résidence tiers nécessitant justification du titre de séjour légal.',
        };
      }
      return {
        status: 'optional_reinforcement',
        statusReason: 'Non requis lorsque le demandeur dépose dans son pays de nationalité.',
        readinessEvidenceSource: undefined,
        readinessEvidenceType: undefined,
        readinessEvidenceIds: [],
        isEvidenceDirectlyVerified: false,
        readinessJustification: 'Pièce de nationalité / résidence régulière couverte par la citoyenneté d’origine.',
      };
    },
  },

  {
    id: 'DOC-CIVIL-STATUS',
    category: 'identity_and_travel',
    title: 'Acte de Naissance / Fiche d’État Civil légalisée',
    description: 'Copie intégrale d’acte de naissance légalisée attestant de la filiation directe et de l’identité civile.',
    isMandatoryByRegulation: false,
    relatedChecklistKey: 'civil_status_birth_certificate',
    targetPillars: ['legal_admissibility', 'ties_and_anchors'],
    concreteStep: 'Obtenir une copie intégrale d’acte de naissance datant de moins de 3 mois auprès de la mairie du lieu de naissance.',
    matchesFinding: (f) =>
      f.title.toLowerCase().includes('naissance') ||
      f.title.toLowerCase().includes('filiation') ||
      f.declaredFact.toLowerCase().includes('parent direct') ||
      f.declaredFact.toLowerCase().includes('famille'),
    evaluateApplicability: () => ({ applicability: 'applicable' }),
    evaluateStatus: (_findings, _actions, context) => {
      const uploadedDoc = findUpload('civil_status_birth_certificate', context);
      if (uploadedDoc) {
        const isEvidenceDirectlyVerified = uploadedDoc.isVerified === true;
        return {
          status: 'ready',
          statusReason: 'Acte d’état civil légalisé téléversé et vérifié.',
          readinessEvidenceSource: isEvidenceDirectlyVerified ? 'verified_document' : 'uploaded_document',
          readinessEvidenceType: isEvidenceDirectlyVerified ? 'verified_document' : 'uploaded_document',
          readinessEvidenceIds: [uploadedDoc.id],
          isEvidenceDirectlyVerified,
          readinessJustification: `Acte de naissance vérifié : ${uploadedDoc.fileName}.`,
        };
      }
      return {
        status: 'optional_reinforcement',
        statusReason: 'Pièce justificative utile pour établir la filiation en cas de prise en charge par un parent ou de regroupement familial.',
        readinessEvidenceSource: undefined,
        readinessEvidenceType: undefined,
        readinessEvidenceIds: [],
        isEvidenceDirectlyVerified: false,
        readinessJustification: 'Document facultatif de renfort pour prouver les liens familiaux directs déclarés.',
      };
    },
  },

  // --------------------------------------------------------------------------
  // B. FINANCIAL DOCUMENTS
  // --------------------------------------------------------------------------
  {
    id: 'DOC-BANK-STATEMENTS',
    category: 'financial_documents',
    title: 'Relevés Bancaires Certifiés des 3 à 6 derniers mois',
    description: 'Relevés bancaires originaux de chaque compte présenté, avec visa nominatif, signature et cachet humide de l’agence émettrice sur chaque feuillet.',
    isMandatoryByRegulation: true,
    relatedChecklistKey: 'bank_statements',
    targetPillars: ['financial_sufficiency', 'financial_provenance'],
    officialBasis: 'Code Communautaire des Visas (Art. 14 & Annexe II) / Guide des instructions IRCC Canada.',
    concreteStep: 'Demander à votre conseiller bancaire une attestation de solde et l’historique certifié des mouvements des 3 à 6 derniers mois.',
    matchesFinding: (f) =>
      f.id.startsWith('FIND-FIN-SUFFICIENCY') ||
      f.id.startsWith('FIND-FIN-BUDGET') ||
      f.id.startsWith('FIND-STUDENT-BUDGET') ||
      f.id.startsWith('FIND-CA-STUDENT-BUDGET') ||
      f.recommendedEvidence?.some((e) => e.relatedChecklistKey === 'bank_statements') ||
      f.title.toLowerCase().includes('relevés bancaires') ||
      f.title.toLowerCase().includes('solvabilité'),
    evaluateApplicability: () => ({ applicability: 'applicable' }),
    evaluateStatus: (findings, actions, context) => {
      const uploadedDoc = findUpload('bank_statements', context);
      if (uploadedDoc) {
        const isEvidenceDirectlyVerified = uploadedDoc.isVerified === true;
        return {
          status: 'ready',
          statusReason: 'Relevés bancaires certifiés téléversés et vérifiés.',
          readinessEvidenceSource: isEvidenceDirectlyVerified ? 'verified_document' : 'uploaded_document',
          readinessEvidenceType: isEvidenceDirectlyVerified ? 'verified_document' : 'uploaded_document',
          readinessEvidenceIds: [uploadedDoc.id],
          isEvidenceDirectlyVerified,
          readinessJustification: `Relevés bancaires vérifiés : ${uploadedDoc.fileName}.`,
        };
      }

      const deficitFinding = findings.find(
        (f) =>
          f.id.includes('BELOW-THRESHOLD') ||
          f.id.includes('DEFICIT') ||
          f.id.includes('BUDGET-UNDECLARED') ||
          f.isDirectBlocker
      );
      if (deficitFinding) {
        return {
          status: 'missing',
          statusReason: 'Les fonds déclarés sont inférieurs aux barèmes consulaires ou font l’objet d’un déficit documentaire.',
          readinessEvidenceSource: 'assessment_finding',
          readinessEvidenceType: 'assessment_finding',
          readinessEvidenceIds: [deficitFinding.id],
          isEvidenceDirectlyVerified: false,
          readinessJustification: 'Constat consulaire de déficit budgétaire ou d’insuffisance de couverture financière.',
        };
      }

      const action = actions.find((a) => a.category === 'evidence_collection' || a.category === 'regularization');
      if (action) {
        return {
          status: 'requires_clarification',
          statusReason: 'Relevés certifiés et attestation de solde bancaire à réunir pour justifier la solvabilité.',
          readinessEvidenceSource: 'action_completion',
          readinessEvidenceType: 'action_completion',
          readinessEvidenceIds: [action.id],
          isEvidenceDirectlyVerified: false,
          readinessJustification: `Action requise pour collecte et certification des relevés : ${action.id}.`,
        };
      }

      const conformeFinding = findings.find((f) => f.id.includes('CONFORME') || f.type === 'favorable_evidence');
      if (conformeFinding && context?.applicantFacts?.hasCertifiedBankStatements === true) {
        return {
          status: 'ready',
          statusReason: 'Budget déclaré conforme aux barèmes officiels et relevés certifiés attestés.',
          readinessEvidenceSource: 'assessment_finding',
          readinessEvidenceType: 'assessment_finding',
          readinessEvidenceIds: [conformeFinding.id],
          isEvidenceDirectlyVerified: false,
          readinessJustification: 'Constat consulaire formel de conformité budgétaire et relevés bancaires déclarés disponibles.',
        };
      }

      return {
        status: 'requires_clarification',
        statusReason: 'Relevés de compte obligatoires dont les originaux cachetés et l’attestation de solde doivent être certifiés.',
        readinessEvidenceSource: undefined,
        readinessEvidenceType: undefined,
        readinessEvidenceIds: [],
        isEvidenceDirectlyVerified: false,
        readinessJustification: 'Document obligatoire dont les pièces bancaires matérielles doivent être rassemblées et authentifiées.',
      };
    },
  },

  {
    id: 'DOC-LUMP-DEPOSIT-JUSTIF',
    category: 'financial_documents',
    title: 'Justificatif Matériel d’Origine des Fonds (Crédit Exceptionnel)',
    description: 'Preuve documentaire incontestable de la provenance des fonds déposés récemment (acte de vente notarié, déblocage de prime, indemnité, contrat de prêt ou attestation bancaire du donateur).',
    isMandatoryByRegulation: false,
    relatedChecklistKey: 'lump_deposit_proof',
    targetPillars: ['financial_provenance'],
    officialBasis: 'Réglementation anti-blanchiment consulaire et détection des comptes alimentés artificiellement pour la demande.',
    concreteStep: 'Réunir l’acte notarié, le contrat ou le bordereau de virement prouvant l’origine licite du versement exceptionnel.',
    matchesFinding: (f) =>
      f.id === 'FIND-LUMP-DEPOSIT-UNEXPLAINED' ||
      f.title.toLowerCase().includes('dépôt') ||
      f.title.toLowerCase().includes('versement') ||
      f.declaredFact.toLowerCase().includes('crédit exceptionnel'),
    evaluateApplicability: () => ({ applicability: 'applicable' }),
    evaluateStatus: (findings, _actions, context) => {
      const uploadedDoc = findUpload('lump_deposit_proof', context);
      if (uploadedDoc) {
        const isEvidenceDirectlyVerified = uploadedDoc.isVerified === true;
        return {
          status: 'ready',
          statusReason: 'Justificatif d’origine des fonds téléversé et vérifié.',
          readinessEvidenceSource: isEvidenceDirectlyVerified ? 'verified_document' : 'uploaded_document',
          readinessEvidenceType: isEvidenceDirectlyVerified ? 'verified_document' : 'uploaded_document',
          readinessEvidenceIds: [uploadedDoc.id],
          isEvidenceDirectlyVerified,
          readinessJustification: `Justificatif de versement vérifié : ${uploadedDoc.fileName}.`,
        };
      }

      const isUnexplained = findings.find((f) => f.id === 'FIND-LUMP-DEPOSIT-UNEXPLAINED');
      if (isUnexplained) {
        return {
          status: 'requires_clarification',
          statusReason: 'Crédit exceptionnel récent identifié sur le compte sans explication documentée : risque majeur de rejet pour fonds de complaisance.',
          readinessEvidenceSource: 'assessment_finding',
          readinessEvidenceType: 'assessment_finding',
          readinessEvidenceIds: [isUnexplained.id],
          isEvidenceDirectlyVerified: false,
          readinessJustification: 'Constat d’anomalie sur provenance des fonds exigeant un justificatif matériel d’origine.',
        };
      }
      return {
        status: 'optional_reinforcement',
        statusReason: 'Justificatif utile en cas de variation significative du solde bancaire au cours des 3 derniers mois.',
        readinessEvidenceSource: undefined,
        readinessEvidenceType: undefined,
        readinessEvidenceIds: [],
        isEvidenceDirectlyVerified: false,
        readinessJustification: 'Document de renfort conditionnel à la régularité des mouvements de compte.',
      };
    },
  },

  {
    id: 'DOC-GUARANTOR-DOSSIER',
    category: 'financial_documents',
    title: 'Dossier Complet du Garant Financier (Prise en Charge)',
    description: 'Lettre d’engagement de prise en charge financière signée et légalisée, accompagnée des 3 derniers bulletins de paie, du contrat de travail et des 3 derniers relevés bancaires du garant.',
    isMandatoryByRegulation: true,
    relatedChecklistKey: 'guarantor_complete_file',
    targetPillars: ['financial_sufficiency', 'financial_provenance'],
    officialBasis: 'Code Communautaire des Visas (Annexe A) / Guide IRCC : exigence d’un garant solvable ayant des liens attestés avec le demandeur.',
    concreteStep: 'Faire signer et certifier l’engagement de prise en charge et rassembler les fiches de paie et relevés de compte du garant.',
    matchesFinding: (f) =>
      f.id.startsWith('FIND-GUARANTOR') ||
      f.recommendedEvidence?.some((e) => e.relatedChecklistKey === 'guarantor_complete_file') ||
      f.title.toLowerCase().includes('garant') ||
      f.declaredFact.toLowerCase().includes('garant') ||
      f.declaredFact.toLowerCase().includes('prise en charge'),
    evaluateApplicability: () => ({ applicability: 'applicable' }),
    evaluateStatus: (findings, _actions, context) => {
      const uploadedDoc = findUpload('guarantor_complete_file', context);
      if (uploadedDoc) {
        const isEvidenceDirectlyVerified = uploadedDoc.isVerified === true;
        return {
          status: 'ready',
          statusReason: 'Dossier de prise en charge financière du garant téléversé et vérifié.',
          readinessEvidenceSource: isEvidenceDirectlyVerified ? 'verified_document' : 'uploaded_document',
          readinessEvidenceType: isEvidenceDirectlyVerified ? 'verified_document' : 'uploaded_document',
          readinessEvidenceIds: [uploadedDoc.id],
          isEvidenceDirectlyVerified,
          readinessJustification: `Dossier garant vérifié : ${uploadedDoc.fileName}.`,
        };
      }

      const nonCompliant = findings.find(
        (f) =>
          f.id === 'FIND-GUARANTOR-ABSENT' ||
          f.id === 'FIND-GUARANTOR-NO-DOCUMENTATION' ||
          f.isDirectBlocker
      );
      if (nonCompliant) {
        return {
          status: 'missing',
          statusReason: 'Absence totale des justificatifs professionnels et bancaires du garant déclaré.',
          readinessEvidenceSource: 'assessment_finding',
          readinessEvidenceType: 'assessment_finding',
          readinessEvidenceIds: [nonCompliant.id],
          isEvidenceDirectlyVerified: false,
          readinessJustification: 'Constat consulaire d’absence de pièces matérielles de solvabilité pour le garant.',
        };
      }

      const insufficient = findings.find(
        (f) => f.id === 'FIND-GUARANTOR-INSUFFICIENT-INCOME' || f.id === 'FIND-GUARANTOR-TIES-UNCLEAR'
      );
      if (insufficient) {
        return {
          status: 'requires_clarification',
          statusReason: 'Revenus du garant déclarés justes ou lien de parenté insuffisant pour emporter la conviction du consulat.',
          readinessEvidenceSource: 'assessment_finding',
          readinessEvidenceType: 'assessment_finding',
          readinessEvidenceIds: [insufficient.id],
          isEvidenceDirectlyVerified: false,
          readinessJustification: 'Constat consulaire de fragilité sur le dossier de prise en charge financière.',
        };
      }

      const conformeFinding = findings.find((f) => f.id.includes('GUARANTOR-OK') || f.type === 'favorable_evidence');
      if (conformeFinding) {
        return {
          status: 'ready',
          statusReason: 'Garant financier solvable et documents attestés conformes.',
          readinessEvidenceSource: 'assessment_finding',
          readinessEvidenceType: 'assessment_finding',
          readinessEvidenceIds: [conformeFinding.id],
          isEvidenceDirectlyVerified: false,
          readinessJustification: 'Constat consulaire confirmant la solidité financière du garant.',
        };
      }

      return {
        status: 'requires_clarification',
        statusReason: 'Dossier de prise en charge financière à constituer avec attestations originales.',
        readinessEvidenceSource: undefined,
        readinessEvidenceType: undefined,
        readinessEvidenceIds: [],
        isEvidenceDirectlyVerified: false,
        readinessJustification: 'Justificatif de prise en charge dont la composition complète doit être finalisée.',
      };
    },
  },

  {
    id: 'DOC-GUARANTOR-TAX',
    category: 'financial_documents',
    title: 'Dernier Avis d’Imposition sur le Revenu du Garant (Feuille d’Impôt)',
    description: 'Avis complet d’imposition de l’année fiscale la plus récente émis par l’administration fiscale compétente (France, pays de résidence ou d’origine).',
    isMandatoryByRegulation: true,
    relatedChecklistKey: 'guarantor_tax_assessment',
    targetPillars: ['financial_sufficiency', 'financial_provenance'],
    officialBasis: 'Exigence consulaire systématique de corroboration fiscale des revenus déclarés.',
    concreteStep: 'Télécharger l’avis d’imposition officiel sur le portail fiscal des impôts du garant.',
    matchesFinding: (f) =>
      f.id === 'FIND-GUARANTOR-TAX-MISSING' ||
      f.title.toLowerCase().includes('avis d’imposition') ||
      f.title.toLowerCase().includes('fiscal') ||
      f.declaredFact.toLowerCase().includes('impôt'),
    evaluateApplicability: () => ({ applicability: 'applicable' }),
    evaluateStatus: (findings, _actions, context) => {
      const uploadedDoc = findUpload('guarantor_tax_assessment', context);
      if (uploadedDoc) {
        const isEvidenceDirectlyVerified = uploadedDoc.isVerified === true;
        return {
          status: 'ready',
          statusReason: 'Dernier avis fiscal du garant téléversé et vérifié.',
          readinessEvidenceSource: isEvidenceDirectlyVerified ? 'verified_document' : 'uploaded_document',
          readinessEvidenceType: isEvidenceDirectlyVerified ? 'verified_document' : 'uploaded_document',
          readinessEvidenceIds: [uploadedDoc.id],
          isEvidenceDirectlyVerified,
          readinessJustification: `Avis d’imposition vérifié : ${uploadedDoc.fileName}.`,
        };
      }

      const missingTax = findings.find((f) => f.id === 'FIND-GUARANTOR-TAX-MISSING');
      if (missingTax) {
        return {
          status: 'missing',
          statusReason: 'L’avis d’imposition est la seule pièce opposable attestant des revenus réels et nets du garant.',
          readinessEvidenceSource: 'assessment_finding',
          readinessEvidenceType: 'assessment_finding',
          readinessEvidenceIds: [missingTax.id],
          isEvidenceDirectlyVerified: false,
          readinessJustification: 'Constat consulaire d’absence d’avis d’imposition pour corroborer les fiches de paie.',
        };
      }
      return {
        status: 'requires_clarification',
        statusReason: 'Avis d’imposition officiel du garant à réclamer pour authentifier ses ressources déclarées.',
        readinessEvidenceSource: undefined,
        readinessEvidenceType: undefined,
        readinessEvidenceIds: [],
        isEvidenceDirectlyVerified: false,
        readinessJustification: 'Document obligatoire corroborant la sincérité fiscale des fiches de paie.',
      };
    },
  },

  {
    id: 'DOC-TUITION-EVIDENCE',
    category: 'financial_documents',
    title: 'Preuve de Paiement / Provision des Droits de Scolarité (Tuition Payment Evidence)',
    description: 'Reçu officiel de paiement des frais de scolarité de première année délivré par l’établissement d’enseignement ou attestation de provision bancaire dédiée.',
    isMandatoryByRegulation: true,
    relatedChecklistKey: 'tuition_payment_evidence',
    targetPillars: ['financial_sufficiency', 'purpose_and_logistics'],
    officialBasis: 'Instructions sur le permis d’études IRCC Canada (LIPR Art. 219 & 220) : capacité financière couvrant les droits de scolarité et les frais de subsistance.',
    concreteStep: 'Joindre le reçu de paiement de l’acompte ou de l’intégralité des frais de scolarité délivré par l’université ou le collège.',
    matchesFinding: (f) =>
      f.id === 'FIND-CA-STUDENT-TUITION-UNDECLARED' ||
      f.id === 'FIND-CA-STUDENT-BUDGET-DEFICIT' ||
      f.title.toLowerCase().includes('droits de scolarité') ||
      f.title.toLowerCase().includes('scolarité') ||
      f.declaredFact.toLowerCase().includes('droits de scolarité'),
    evaluateApplicability: (findings, context) => {
      const profile = detectDestinationAndVisaType(findings, context);
      if (!profile.isStudy && profile.isVisit && !findings.some((f) => f.title.toLowerCase().includes('scolarité') || f.id.includes('STUDENT'))) {
        return {
          applicability: 'not_applicable',
          notApplicableReason: "La preuve de paiement des frais de scolarité n'est exigible que pour les demandes de visa d'études.",
        };
      }
      return { applicability: 'applicable' };
    },
    evaluateStatus: (findings, _actions, context) => {
      const uploadedDoc = findUpload('tuition_payment_evidence', context);
      if (uploadedDoc) {
        const isEvidenceDirectlyVerified = uploadedDoc.isVerified === true;
        return {
          status: 'ready',
          statusReason: 'Reçu officiel de règlement des frais de scolarité téléversé et vérifié.',
          readinessEvidenceSource: isEvidenceDirectlyVerified ? 'verified_document' : 'uploaded_document',
          readinessEvidenceType: isEvidenceDirectlyVerified ? 'verified_document' : 'uploaded_document',
          readinessEvidenceIds: [uploadedDoc.id],
          isEvidenceDirectlyVerified,
          readinessJustification: `Reçu universitaire vérifié : ${uploadedDoc.fileName}.`,
        };
      }

      const isUndeclared = findings.find((f) => f.id === 'FIND-CA-STUDENT-TUITION-UNDECLARED');
      if (isUndeclared) {
        return {
          status: 'missing',
          statusReason: 'Montant ou justificatif de règlement des frais de scolarité de première année non renseigné pour le Canada.',
          readinessEvidenceSource: 'assessment_finding',
          readinessEvidenceType: 'assessment_finding',
          readinessEvidenceIds: [isUndeclared.id],
          isEvidenceDirectlyVerified: false,
          readinessJustification: 'Constat consulaire d’absence de déclaration des droits de scolarité.',
        };
      }

      const budgetDeficit = findings.find(
        (f) => f.id === 'FIND-CA-STUDENT-BUDGET-DEFICIT' || f.isDirectBlocker
      );
      if (budgetDeficit) {
        return {
          status: 'requires_clarification',
          statusReason: 'Frais de scolarité de 1ère année non acquittés et aucun reçu officiel de provision dédié produit au dossier.',
          readinessEvidenceSource: 'assessment_finding',
          readinessEvidenceType: 'assessment_finding',
          readinessEvidenceIds: [budgetDeficit.id],
          isEvidenceDirectlyVerified: false,
          readinessJustification: 'Déficit budgétaire global constaté : aucun reçu de paiement ni attestation de blocage des droits de scolarité n’a été produit pour couvrir la première année.',
        };
      }

      const paidFinding = findings.find((f) => f.id === 'FIND-CA-STUDENT-TUITION-PAID' || f.type === 'favorable_evidence');
      if (paidFinding && context?.applicantFacts?.tuitionPaid === true) {
        return {
          status: 'ready',
          statusReason: 'Reçu officiel de paiement intégral des frais de 1ère année confirmé.',
          readinessEvidenceSource: 'assessment_finding',
          readinessEvidenceType: 'assessment_finding',
          readinessEvidenceIds: [paidFinding.id],
          isEvidenceDirectlyVerified: false,
          readinessJustification: 'Constat consulaire confirmant le règlement effectif des droits universitaires.',
        };
      }

      return {
        status: 'requires_clarification',
        statusReason: 'Reçu de paiement ou attestation de provision bancaire des frais de scolarité à produire.',
        readinessEvidenceSource: undefined,
        readinessEvidenceType: undefined,
        readinessEvidenceIds: [],
        isEvidenceDirectlyVerified: false,
        readinessJustification: 'Document obligatoire dont le reçu de paiement effectif doit être versé au dossier.',
      };
    },
  },

  {
    id: 'DOC-SCHOLARSHIP-CERT',
    category: 'financial_documents',
    title: 'Attestation Officielle de Bourse d’Études (Organisme Public ou Privé)',
    description: 'Attestation nominative précisant le montant mensuel de la bourse, sa durée exacte et les postes de dépenses couverts (frais de scolarité, logement, assurance).',
    isMandatoryByRegulation: false,
    relatedChecklistKey: 'scholarship_certificate',
    targetPillars: ['financial_sufficiency'],
    officialBasis: 'Circulaires Campus France / Exemption de justificatifs financiers par bourse d’excellence.',
    concreteStep: 'Demander à l’organisme de bourse (ex: Campus France, gouvernement étranger) l’attestation officielle de prise en charge.',
    matchesFinding: (f) =>
      f.title.toLowerCase().includes('bourse') ||
      f.declaredFact.toLowerCase().includes('boursier') ||
      f.declaredFact.toLowerCase().includes('bourse'),
    evaluateApplicability: () => ({ applicability: 'applicable' }),
    evaluateStatus: (findings, _actions, context) => {
      const uploadedDoc = findUpload('scholarship_certificate', context);
      if (uploadedDoc) {
        const isEvidenceDirectlyVerified = uploadedDoc.isVerified === true;
        return {
          status: 'ready',
          statusReason: 'Attestation de bourse officielle téléversée et vérifiée.',
          readinessEvidenceSource: isEvidenceDirectlyVerified ? 'verified_document' : 'uploaded_document',
          readinessEvidenceType: isEvidenceDirectlyVerified ? 'verified_document' : 'uploaded_document',
          readinessEvidenceIds: [uploadedDoc.id],
          isEvidenceDirectlyVerified,
          readinessJustification: `Attestation de bourse vérifiée : ${uploadedDoc.fileName}.`,
        };
      }

      const conformeFinding = findings.find((f) => f.title.toLowerCase().includes('bourse') && f.type === 'favorable_evidence');
      if (conformeFinding) {
        return {
          status: 'requires_clarification',
          statusReason: 'Bourse d’études déclarée mais attestation définitive d’attribution en attente de vérification matérielle.',
          readinessEvidenceSource: 'assessment_finding',
          readinessEvidenceType: 'assessment_finding',
          readinessEvidenceIds: [conformeFinding.id],
          isEvidenceDirectlyVerified: false,
          readinessJustification: 'Constat consulaire de couverture par bourse en attente de vérification sur pièce.',
        };
      }
      return {
        status: 'requires_clarification',
        statusReason: 'Attestation définitive de bourse à joindre avec le barème mensuel exact.',
        readinessEvidenceSource: undefined,
        readinessEvidenceType: undefined,
        readinessEvidenceIds: [],
        isEvidenceDirectlyVerified: false,
        readinessJustification: 'Attestation d’attribution de bourse nécessaire pour faire foi.',
      };
    },
  },

  {
    id: 'DOC-AVI-CERTIFICATE',
    category: 'financial_documents',
    title: 'Attestation de Virement Irrévocable (AVI Étudiant)',
    description: 'Attestation délivrée par un organisme financier agréé garantissant le versement d’une allocation mensuelle minimale bloquée pour les études.',
    isMandatoryByRegulation: true,
    relatedChecklistKey: 'avi_blocked_account',
    targetPillars: ['financial_sufficiency', 'financial_provenance'],
    officialBasis: 'Code de l’entrée et du séjour des étrangers et du droit d’asile (CESEDA Art. R421-2).',
    concreteStep: 'Fournir le contrat original d’Attestation de Virement Irrévocable émis par la structure agréée (ex: Studely, banque partenaire).',
    matchesFinding: (f) =>
      f.id === 'FIND-STUDENT-AVI-PRESENT' ||
      f.title.toLowerCase().includes('virement irrévocable') ||
      f.title.toLowerCase().includes('compte bloqué') ||
      f.declaredFact.toLowerCase().includes('avi'),
    evaluateApplicability: (findings, context) => {
      const profile = detectDestinationAndVisaType(findings, context);
      if (profile.destination === 'canada') {
        return {
          applicability: 'not_applicable',
          notApplicableReason: "L'Attestation de Virement Irrévocable (AVI) est un instrument bancaire propre aux études en France/Schengen. Non applicable aux démarches de permis d'études pour le Canada.",
        };
      }
      return { applicability: 'applicable' };
    },
    evaluateStatus: (findings, _actions, context) => {
      const uploadedDoc = findUpload('avi_blocked_account', context);
      if (uploadedDoc) {
        const isEvidenceDirectlyVerified = uploadedDoc.isVerified === true;
        return {
          status: 'ready',
          statusReason: 'Contrat d’Attestation de Virement Irrévocable téléversé et vérifié.',
          readinessEvidenceSource: isEvidenceDirectlyVerified ? 'verified_document' : 'uploaded_document',
          readinessEvidenceType: isEvidenceDirectlyVerified ? 'verified_document' : 'uploaded_document',
          readinessEvidenceIds: [uploadedDoc.id],
          isEvidenceDirectlyVerified,
          readinessJustification: `Attestation AVI vérifiée : ${uploadedDoc.fileName}.`,
        };
      }

      const aviFinding = findings.find((f) => f.id === 'FIND-STUDENT-AVI-PRESENT');
      if (aviFinding && context?.applicantFacts?.hasAviCertificate === true) {
        return {
          status: 'requires_clarification',
          statusReason: 'Attestation de compte bloqué (AVI) déclarée mais certificat bancaire officiel en attente de vérification matérielle.',
          readinessEvidenceSource: 'assessment_finding',
          readinessEvidenceType: 'assessment_finding',
          readinessEvidenceIds: [aviFinding.id],
          isEvidenceDirectlyVerified: false,
          readinessJustification: 'Constat consulaire de constitution d’AVI en attente de vérification matérielle.',
        };
      }
      return {
        status: 'requires_clarification',
        statusReason: 'Attestation de compte bloqué (AVI) à faire émettre par l’organisme financier agréé.',
        readinessEvidenceSource: undefined,
        readinessEvidenceType: undefined,
        readinessEvidenceIds: [],
        isEvidenceDirectlyVerified: false,
        readinessJustification: 'Contrat financier d’allocation mensuelle bloquée à fournir.',
      };
    },
  },

  // --------------------------------------------------------------------------
  // C. EDUCATION DOCUMENTS
  // --------------------------------------------------------------------------
  {
    id: 'DOC-PAL-CAQ',
    category: 'education_documents',
    title: 'Lettre d’Attestation Provinciale (PAL) / Certificat d’Acceptation du Québec (CAQ)',
    description: 'Lettre d’attestation provinciale officielle délivrée par le gouvernement provincial canadien (ou CAQ pour le Québec) ou justificatif formel d’exemption légale.',
    isMandatoryByRegulation: true,
    relatedChecklistKey: 'provincial_attestation_letter',
    targetPillars: ['legal_admissibility'],
    officialBasis: 'Loi sur l’immigration et la protection des réfugiés (LIPR Canada, Art. 87.3 & Instructions ministérielles 2024-2026).',
    concreteStep: 'Obtenir la PAL officielle auprès de l’établissement d’enseignement désigné (EED) ou joindre la preuve de dispense.',
    matchesFinding: (f) =>
      f.id.startsWith('FIND-CA-STUDENT-PAL') ||
      f.recommendedEvidence?.some((e) => e.relatedChecklistKey === 'provincial_attestation_letter') ||
      f.title.toLowerCase().includes('attestation provinciale') ||
      f.title.toLowerCase().includes('pal'),
    evaluateApplicability: (findings, context) => {
      const profile = detectDestinationAndVisaType(findings, context);
      if (profile.destination !== 'canada' && !findings.some((f) => f.id.includes('-CA-'))) {
        return {
          applicability: 'not_applicable',
          notApplicableReason: "La Lettre d'Attestation Provinciale (PAL/CAQ) est strictement réservée aux demandes de permis d'études au Canada (LIPR Art. 87.3).",
        };
      }
      return { applicability: 'applicable' };
    },
    evaluateStatus: (findings, _actions, context) => {
      const uploadedDoc = findUpload('provincial_attestation_letter', context);
      if (uploadedDoc) {
        const isEvidenceDirectlyVerified = uploadedDoc.isVerified === true;
        return {
          status: 'ready',
          statusReason: 'Lettre d’attestation provinciale officielle téléversée et vérifiée.',
          readinessEvidenceSource: isEvidenceDirectlyVerified ? 'verified_document' : 'uploaded_document',
          readinessEvidenceType: isEvidenceDirectlyVerified ? 'verified_document' : 'uploaded_document',
          readinessEvidenceIds: [uploadedDoc.id],
          isEvidenceDirectlyVerified,
          readinessJustification: `Document PAL/CAQ vérifié : ${uploadedDoc.fileName}.`,
        };
      }

      const missingFinding = findings.find(
        (f) => f.id === 'FIND-CA-STUDENT-PAL-UNDECLARED' || f.id === 'FIND-CA-STUDENT-PAL-GAP' || f.isDirectBlocker
      );
      if (missingFinding) {
        return {
          status: 'missing',
          statusReason: 'La PAL est obligatoire depuis 2024 pour toute demande de permis d’études au Canada ; son absence entraîne le rejet automatique sans instruction.',
          readinessEvidenceSource: 'assessment_finding',
          readinessEvidenceType: 'assessment_finding',
          readinessEvidenceIds: [missingFinding.id],
          isEvidenceDirectlyVerified: false,
          readinessJustification: 'Constat d’absence de la lettre d’attestation provinciale requise par l’article 87.3 de la LIPR.',
        };
      }

      const isOkFinding = findings.find((f) => f.id === 'FIND-CA-STUDENT-PAL-OK' || (f.type === 'favorable_evidence' && f.id.includes('PAL')));
      if (isOkFinding) {
        return {
          status: 'requires_clarification',
          statusReason: 'Lettre d’attestation provinciale (PAL) déclarée disponible en attente de vérification matérielle.',
          readinessEvidenceSource: 'assessment_finding',
          readinessEvidenceType: 'assessment_finding',
          readinessEvidenceIds: [isOkFinding.id],
          isEvidenceDirectlyVerified: false,
          readinessJustification: 'Constat consulaire formel de validité de la PAL en attente de vérification matérielle.',
        };
      }

      const hasDeclaredPal =
        context?.applicantFacts?.hasPalCaq === true ||
        context?.applicantFacts?.palCaq === true ||
        context?.applicantFacts?.provincial_attestation_letter === true ||
        Boolean((context?.applicantFacts as any)?.hasProvincialAttestationLetter);
      if (hasDeclaredPal) {
        return {
          status: 'requires_clarification',
          statusReason: 'Lettre d’attestation provinciale (PAL) déclarée disponible par le demandeur en attente de vérification matérielle.',
          readinessEvidenceSource: 'applicant_fact',
          readinessEvidenceType: 'applicant_fact',
          readinessEvidenceIds: ['FACT-PAL-CAQ-DECLARED'],
          isEvidenceDirectlyVerified: false,
          readinessJustification: 'Existence déclarée par le demandeur non étayée par un document matériellement vérifié.',
        };
      }

      return {
        status: 'missing',
        statusReason: 'Document légal de recevabilité pour études au Canada manquant.',
        readinessEvidenceSource: undefined,
        readinessEvidenceType: undefined,
        readinessEvidenceIds: [],
        isEvidenceDirectlyVerified: false,
        readinessJustification: 'Obligation légale stricte dont la disponibilité n’a pas été prouvée.',
      };
    },
  },

  {
    id: 'DOC-ADMISSION-LETTER',
    category: 'education_documents',
    title: 'Lettre d’Admission Universitaire / Accord Préalable d’Inscription',
    description: 'Lettre d’acceptation officielle émise par un établissement d’enseignement supérieur agréé (EED, Université, Haute École) précisant le programme et le niveau d’études.',
    isMandatoryByRegulation: true,
    relatedChecklistKey: 'admission_letter',
    targetPillars: ['purpose_and_logistics'],
    officialBasis: 'Instruction interministérielle visas pour études (Campus France / IRCC LIPR Art. 219).',
    concreteStep: 'Joindre la lettre d’admission définitive ou l’accord préalable d’inscription Campus France en version originale.',
    matchesFinding: (f) =>
      f.id === 'FIND-PURPOSE-ACADEMIC-CONTINUITY' ||
      f.title.toLowerCase().includes('académique') ||
      f.title.toLowerCase().includes('admission') ||
      f.declaredFact.toLowerCase().includes('étudiant') ||
      f.declaredFact.toLowerCase().includes('master') ||
      f.declaredFact.toLowerCase().includes('licence'),
    evaluateApplicability: (findings, context) => {
      const profile = detectDestinationAndVisaType(findings, context);
      if (!profile.isStudy && profile.isVisit && !findings.some((f) => f.title.toLowerCase().includes('admission') || f.id.includes('STUDENT'))) {
        return {
          applicability: 'not_applicable',
          notApplicableReason: "La lettre d'admission universitaire est réservée aux motifs de séjour académique ou d'études.",
        };
      }
      return { applicability: 'applicable' };
    },
    evaluateStatus: (findings, _actions, context) => {
      // 1. Preuve explicite de vérification consulaire directe sur téléversement
      // Règle de durcissement V2.3.6 : Seul un document téléversé formellement VÉRIFIÉ produit READY
      const uploadedDoc = findUpload('admission_letter', context);
      if (uploadedDoc) {
        if (uploadedDoc.isVerified === true) {
          return {
            status: 'ready',
            statusReason: 'Lettre d’admission officielle (LOA) téléversée et matériellement vérifiée.',
            readinessEvidenceSource: 'verified_document',
            readinessEvidenceType: 'verified_document',
            readinessEvidenceIds: [uploadedDoc.id],
            isEvidenceDirectlyVerified: true,
            readinessJustification: `Lettre d’acceptation universitaire certifiée et vérifiée : ${uploadedDoc.fileName}.`,
          };
        }
        // Upload non vérifié -> requiert clarification / audit
        return {
          status: 'requires_clarification',
          statusReason: 'Lettre d’admission téléversée en attente d’authentification consulaire directe.',
          readinessEvidenceSource: 'uploaded_document',
          readinessEvidenceType: 'uploaded_document',
          readinessEvidenceIds: [uploadedDoc.id],
          isEvidenceDirectlyVerified: false,
          readinessJustification: `Document téléversé en attente de vérification matérielle : ${uploadedDoc.fileName}.`,
        };
      }

      // 2. Fait déclaré par le demandeur (document_exists sans vérification directe) -> requires_clarification
      const hasFact =
        context?.applicantFacts?.hasUniversityAdmissionLetter === true ||
        context?.applicantFacts?.admissionLetter === true;
      if (hasFact) {
        return {
          status: 'requires_clarification',
          statusReason: 'Lettre d’admission déclarée disponible par le demandeur ; l’original certifié ou la LOA vérifiée doit être produite.',
          readinessEvidenceSource: 'applicant_fact',
          readinessEvidenceType: 'applicant_fact',
          readinessEvidenceIds: ['FACT-ADMISSION-LETTER-DECLARED'],
          isEvidenceDirectlyVerified: false,
          readinessJustification: 'Existence déclarée par le demandeur non étayée par un document matériellement vérifié.',
        };
      }

      // 3. Continuité académique déclarée (Projet cohérent, mais document matériel non encore certifié)
      const academicFinding = findings.find((f) => f.id === 'FIND-PURPOSE-ACADEMIC-CONTINUITY');
      if (academicFinding) {
        return {
          status: 'requires_clarification',
          statusReason: 'Projet d’études dans la continuité du parcours antérieur ; la lettre d’admission officielle définitive (LOA) doit être formellement produite et vérifiée.',
          readinessEvidenceSource: 'assessment_finding',
          readinessEvidenceType: 'assessment_finding',
          readinessEvidenceIds: [academicFinding.id],
          isEvidenceDirectlyVerified: false,
          readinessJustification: 'Continuité académique constatée, mais existence matérielle et conformité de la lettre d’acceptation (LOA) à attester sur pièce.',
        };
      }

      // 4. Fallback déterministe (Required + Existence Unknown -> REQUIRES_CLARIFICATION)
      return {
        status: 'requires_clarification',
        statusReason: 'Justificatif fondamental de l’objet du séjour académique à intégrer au dossier.',
        readinessEvidenceSource: undefined,
        readinessEvidenceType: undefined,
        readinessEvidenceIds: [],
        isEvidenceDirectlyVerified: false,
        readinessJustification: 'Document obligatoire pour tout visa d’études dont la lettre définitive originale doit être versée au dossier.',
      };
    },
  },

  {
    id: 'DOC-ACADEMIC-TRANSCRIPTS',
    category: 'education_documents',
    title: 'Derniers Diplômes & Relevés de Notes Certifiés',
    description: 'Copies certifiées conformes des diplômes universitaires ou du baccalauréat, accompagnées des relevés de notes de toutes les années d’études post-secondaires.',
    isMandatoryByRegulation: false,
    relatedChecklistKey: 'academic_transcripts',
    targetPillars: ['purpose_and_logistics'],
    concreteStep: 'Faire certifier conformes les diplômes et relevés de notes auprès des universités d’origine ou des autorités académiques compétentes.',
    matchesFinding: (f) =>
      f.title.toLowerCase().includes('diplôme') ||
      f.title.toLowerCase().includes('relevé de notes') ||
      f.declaredFact.toLowerCase().includes('baccalauréat') ||
      f.declaredFact.toLowerCase().includes('diplôme'),
    evaluateApplicability: (findings, context) => {
      const profile = detectDestinationAndVisaType(findings, context);
      if (!profile.isStudy && profile.isVisit && !findings.some((f) => f.title.toLowerCase().includes('diplôme') || f.id.includes('STUDENT'))) {
        return {
          applicability: 'not_applicable',
          notApplicableReason: "Les relevés de notes et diplômes antérieurs concernent les projets d'études.",
        };
      }
      return { applicability: 'applicable' };
    },
    evaluateStatus: (_findings, _actions, context) => {
      const uploadedDoc = findUpload('academic_transcripts', context);
      if (uploadedDoc) {
        const isEvidenceDirectlyVerified = uploadedDoc.isVerified === true;
        return {
          status: 'ready',
          statusReason: 'Relevés de notes et diplômes téléversés et vérifiés.',
          readinessEvidenceSource: isEvidenceDirectlyVerified ? 'verified_document' : 'uploaded_document',
          readinessEvidenceType: isEvidenceDirectlyVerified ? 'verified_document' : 'uploaded_document',
          readinessEvidenceIds: [uploadedDoc.id],
          isEvidenceDirectlyVerified,
          readinessJustification: `Relevés académiques vérifiés : ${uploadedDoc.fileName}.`,
        };
      }
      return {
        status: 'optional_reinforcement',
        statusReason: 'Justificatifs recommandés pour attester du sérieux du parcours et de la légitimité académique.',
        readinessEvidenceSource: undefined,
        readinessEvidenceType: undefined,
        readinessEvidenceIds: [],
        isEvidenceDirectlyVerified: false,
        readinessJustification: 'Documents de cohérence académique renforçant la recevabilité du projet.',
      };
    },
  },

  // --------------------------------------------------------------------------
  // D. EMPLOYMENT & BUSINESS DOCUMENTS
  // --------------------------------------------------------------------------
  {
    id: 'DOC-WORK-CERT-PAYSLIPS',
    category: 'employment_and_business',
    title: 'Contrat de Travail, Certificat de Travail & 3 Derniers Bulletins de Paie',
    description: 'Contrat de travail à durée indéterminée (CDI), attestation d’emploi récente avec mention du salaire brut et net, et bulletins de salaire des 3 derniers mois.',
    isMandatoryByRegulation: true,
    relatedChecklistKey: 'work_certificate_payslips',
    targetPillars: ['ties_and_anchors', 'financial_sufficiency'],
    officialBasis: 'Code des Visas Schengen (Annexe II) : justification de la situation professionnelle stable dans le pays d’origine.',
    concreteStep: 'Obtenir auprès des ressources humaines une attestation de travail signée avec cachet de l’entreprise et rassembler vos 3 derniers bulletins.',
    matchesFinding: (f) =>
      f.id.startsWith('FIND-TIES-PROFESSIONAL') ||
      f.recommendedEvidence?.some((e) => e.relatedChecklistKey === 'work_certificate_payslips') ||
      f.title.toLowerCase().includes('salarié') ||
      f.declaredFact.toLowerCase().includes('salarié') ||
      f.declaredFact.toLowerCase().includes('bulletins de paie'),
    evaluateApplicability: () => ({ applicability: 'applicable' }),
    evaluateStatus: (findings, _actions, context) => {
      const uploadedDoc = findUpload('work_certificate_payslips', context);
      if (uploadedDoc) {
        const isEvidenceDirectlyVerified = uploadedDoc.isVerified === true;
        return {
          status: 'ready',
          statusReason: 'Dossier professionnel salarié téléversé et vérifié.',
          readinessEvidenceSource: isEvidenceDirectlyVerified ? 'verified_document' : 'uploaded_document',
          readinessEvidenceType: isEvidenceDirectlyVerified ? 'verified_document' : 'uploaded_document',
          readinessEvidenceIds: [uploadedDoc.id],
          isEvidenceDirectlyVerified,
          readinessJustification: `Bulletins et contrat vérifiés : ${uploadedDoc.fileName}.`,
        };
      }

      const missingFinding = findings.find(
        (f) => f.id === 'FIND-TIES-PROFESSIONAL-INCOMPLETE' || f.isDirectBlocker
      );
      if (missingFinding) {
        return {
          status: 'missing',
          statusReason: 'Incomplétude ou absence de bulletins de salaire attestant de la réalité de l’emploi déclaré.',
          readinessEvidenceSource: 'assessment_finding',
          readinessEvidenceType: 'assessment_finding',
          readinessEvidenceIds: [missingFinding.id],
          isEvidenceDirectlyVerified: false,
          readinessJustification: 'Constat consulaire d’ancrage professionnel non démontré par des fiches de paie probantes.',
        };
      }

      const conformeFinding = findings.find((f) => f.id.includes('PROFESSIONAL-OK') || f.type === 'favorable_evidence');
      if (conformeFinding) {
        return {
          status: 'requires_clarification',
          statusReason: 'Situation professionnelle déclarée stable en attente de vérification matérielle des fiches de paie et du contrat.',
          readinessEvidenceSource: 'assessment_finding',
          readinessEvidenceType: 'assessment_finding',
          readinessEvidenceIds: [conformeFinding.id],
          isEvidenceDirectlyVerified: false,
          readinessJustification: 'Constat consulaire d’ancrage professionnel en attente de contrôle matériel des pièces.',
        };
      }

      return {
        status: 'requires_clarification',
        statusReason: 'Pièces d’emploi salariées à formaliser avec attestations nominatives d’entreprise.',
        readinessEvidenceSource: undefined,
        readinessEvidenceType: undefined,
        readinessEvidenceIds: [],
        isEvidenceDirectlyVerified: false,
        readinessJustification: 'Documents nécessaires pour établir l’ancrage professionnel.',
      };
    },
  },

  {
    id: 'DOC-EMPLOYER-LEAVE',
    category: 'employment_and_business',
    title: 'Attestation de Congé Payé / Ordre de Mission de l’Employeur',
    description: 'Lettre officielle de l’employeur mentionnant expressément l’autorisation d’absence pour la période exacte du voyage et garantissant la réintégration au poste au retour.',
    isMandatoryByRegulation: true,
    relatedChecklistKey: 'employer_leave_authorization',
    targetPillars: ['ties_and_anchors', 'purpose_and_logistics'],
    officialBasis: 'Garantie consulaire indispensable contre le risque de migration économique déguisée.',
    concreteStep: 'Demander à votre employeur une attestation d’autorisation de congé reprenant scrupuleusement les dates prévisionnelles de voyage.',
    matchesFinding: (f) =>
      f.id === 'FIND-TIES-PROFESSIONAL-LEAVE-MISSING' ||
      f.title.toLowerCase().includes('congé') ||
      f.declaredFact.toLowerCase().includes('autorisation d’absence'),
    evaluateApplicability: () => ({ applicability: 'applicable' }),
    evaluateStatus: (findings, _actions, context) => {
      const uploadedDoc = findUpload('employer_leave_authorization', context);
      if (uploadedDoc) {
        const isEvidenceDirectlyVerified = uploadedDoc.isVerified === true;
        return {
          status: 'ready',
          statusReason: 'Autorisation de congé signée par l’employeur téléversée et vérifiée.',
          readinessEvidenceSource: isEvidenceDirectlyVerified ? 'verified_document' : 'uploaded_document',
          readinessEvidenceType: isEvidenceDirectlyVerified ? 'verified_document' : 'uploaded_document',
          readinessEvidenceIds: [uploadedDoc.id],
          isEvidenceDirectlyVerified,
          readinessJustification: `Attestation de congé vérifiée : ${uploadedDoc.fileName}.`,
        };
      }

      const missingLeave = findings.find((f) => f.id === 'FIND-TIES-PROFESSIONAL-LEAVE-MISSING');
      if (missingLeave) {
        return {
          status: 'missing',
          statusReason: 'Absence d’autorisation expresse de congé : présomption d’abandon de poste ou de projet migratoire non déclaré.',
          readinessEvidenceSource: 'assessment_finding',
          readinessEvidenceType: 'assessment_finding',
          readinessEvidenceIds: [missingLeave.id],
          isEvidenceDirectlyVerified: false,
          readinessJustification: 'Constat consulaire d’absence d’accord de l’employeur sur les dates du séjour.',
        };
      }
      return {
        status: 'requires_clarification',
        statusReason: 'Attestation de congé nominative avec réintégration garantie à obtenir auprès des RH.',
        readinessEvidenceSource: undefined,
        readinessEvidenceType: undefined,
        readinessEvidenceIds: [],
        isEvidenceDirectlyVerified: false,
        readinessJustification: 'Pièce maîtresse prouvant que l’emploi demeure actif à l’issue du séjour.',
      };
    },
  },

  {
    id: 'DOC-BUSINESS-RCCM',
    category: 'employment_and_business',
    title: 'Registre du Commerce (RCCM), Statuts & Relevés Bancaires d’Entreprise',
    description: 'Extrait Kbis ou RCCM en cours de validité (moins de 3 mois), statuts enregistrés, attestation de régularité fiscale et 3 derniers relevés du compte professionnel.',
    isMandatoryByRegulation: true,
    relatedChecklistKey: 'business_registration_rccm',
    targetPillars: ['ties_and_anchors', 'financial_sufficiency'],
    officialBasis: 'Exigences consulaires spécifiques pour entrepreneurs, commerçants et professions libérales.',
    concreteStep: 'Se procurer un extrait RCCM actualisé au greffe du tribunal de commerce et joindre les relevés bancaires professionnels.',
    matchesFinding: (f) =>
      f.id.startsWith('FIND-TIES-ENTREPRENEUR') ||
      f.recommendedEvidence?.some((e) => e.relatedChecklistKey === 'business_registration_rccm') ||
      f.title.toLowerCase().includes('entreprise') ||
      f.title.toLowerCase().includes('rccm') ||
      f.declaredFact.toLowerCase().includes('entrepreneur') ||
      f.declaredFact.toLowerCase().includes('commerce'),
    evaluateApplicability: () => ({ applicability: 'applicable' }),
    evaluateStatus: (findings, _actions, context) => {
      const uploadedDoc = findUpload('business_registration_rccm', context);
      if (uploadedDoc) {
        const isEvidenceDirectlyVerified = uploadedDoc.isVerified === true;
        return {
          status: 'ready',
          statusReason: 'Dossier commercial et juridique d’entreprise téléversé et vérifié.',
          readinessEvidenceSource: isEvidenceDirectlyVerified ? 'verified_document' : 'uploaded_document',
          readinessEvidenceType: isEvidenceDirectlyVerified ? 'verified_document' : 'uploaded_document',
          readinessEvidenceIds: [uploadedDoc.id],
          isEvidenceDirectlyVerified,
          readinessJustification: `Dossier RCCM vérifié : ${uploadedDoc.fileName}.`,
        };
      }

      const missingBiz = findings.find(
        (f) => f.id === 'FIND-TIES-ENTREPRENEUR-DOCUMENTATION-INCOMPLETE' || f.isDirectBlocker
      );
      if (missingBiz) {
        return {
          status: 'missing',
          statusReason: 'Absence d’extrait du registre du commerce ou des relevés bancaires de la société déclarée.',
          readinessEvidenceSource: 'assessment_finding',
          readinessEvidenceType: 'assessment_finding',
          readinessEvidenceIds: [missingBiz.id],
          isEvidenceDirectlyVerified: false,
          readinessJustification: 'Constat consulaire d’absence de pièces légales établissant l’activité commerciale réelle.',
        };
      }
      return {
        status: 'requires_clarification',
        statusReason: 'Dossier commercial complet à certifier pour prouver l’existence légale et la rentabilité de l’entreprise.',
        readinessEvidenceSource: undefined,
        readinessEvidenceType: undefined,
        readinessEvidenceIds: [],
        isEvidenceDirectlyVerified: false,
        readinessJustification: 'Documents juridiques et comptables nécessaires pour établir l’ancrage entrepreneurial.',
      };
    },
  },

  // --------------------------------------------------------------------------
  // E. ACCOMMODATION & LOGISTICS DOCUMENTS
  // --------------------------------------------------------------------------
  {
    id: 'DOC-TRAVEL-INSURANCE',
    category: 'accommodation_and_logistics',
    title: 'Attestation d’Assurance Médicale de Voyage (Garantie ≥ 30 000 €)',
    description: 'Police d’assurance médicale de voyage internationale souscrite auprès d’une compagnie agréée, garantissant les frais d’hospitalisation d’urgence et de rapatriement à concurrence d’au moins 30 000 €.',
    isMandatoryByRegulation: true,
    relatedChecklistKey: 'travel_insurance',
    targetPillars: ['purpose_and_logistics'],
    officialBasis: 'Code Communautaire des Visas Schengen (Règlement CE n° 810/2009, Art. 15).',
    concreteStep: 'Souscrire une attestation auprès d’un assureur agréé mentionnant explicitement la couverture minimale de 30 000 € pour l’espace Schengen.',
    matchesFinding: (f) =>
      f.id.startsWith('FIND-SCHENGEN-INSURANCE') ||
      f.recommendedEvidence?.some((e) => e.relatedChecklistKey === 'travel_insurance') ||
      f.title.toLowerCase().includes('assurance'),
    evaluateApplicability: (findings, context) => {
      const profile = detectDestinationAndVisaType(findings, context);
      // Invariant #4: Canada study permit does NOT require Schengen travel insurance
      if (profile.destination === 'canada') {
        return {
          applicability: 'not_applicable',
          notApplicableReason: "L'assurance médicale de voyage Schengen n'est pas applicable au permis d'études au Canada (IRCC / LIPR Art. 219). La couverture médicale étudiante est souscrite directement auprès des régimes provinciaux ou universitaires canadiens à l'arrivée.",
        };
      }
      return { applicability: 'applicable' };
    },
    evaluateStatus: (findings, _actions, context) => {
      const uploadedDoc = findUpload('travel_insurance', context);
      if (uploadedDoc) {
        const isEvidenceDirectlyVerified = uploadedDoc.isVerified === true;
        return {
          status: 'ready',
          statusReason: 'Police d’assurance médicale de voyage vérifiée.',
          readinessEvidenceSource: isEvidenceDirectlyVerified ? 'verified_document' : 'uploaded_document',
          readinessEvidenceType: isEvidenceDirectlyVerified ? 'verified_document' : 'uploaded_document',
          readinessEvidenceIds: [uploadedDoc.id],
          isEvidenceDirectlyVerified,
          readinessJustification: `Attestation d’assurance vérifiée : ${uploadedDoc.fileName}.`,
        };
      }

      const absentFinding = findings.find(
        (f) => f.id === 'FIND-SCHENGEN-INSURANCE-ABSENT' || f.id === 'FIND-SCHENGEN-INSURANCE-UNDECLARED' || f.isDirectBlocker
      );
      if (absentFinding) {
        return {
          status: 'missing',
          statusReason: 'L’assurance médicale de voyage Schengen est obligatoire ; son absence bloque la délivrance du visa.',
          readinessEvidenceSource: 'assessment_finding',
          readinessEvidenceType: 'assessment_finding',
          readinessEvidenceIds: [absentFinding.id],
          isEvidenceDirectlyVerified: false,
          readinessJustification: 'Constat consulaire formel établissant l’absence totale de police d’assurance voyage.',
        };
      }

      const deficitFinding = findings.find((f) => f.id === 'FIND-SCHENGEN-INSURANCE-COVERAGE-DEFICIT');
      if (deficitFinding) {
        return {
          status: 'requires_clarification',
          statusReason: 'Le plafond d’assurance déclaré est inférieur au minimum légal obligatoire de 30 000 € imposé par le Code des Visas.',
          readinessEvidenceSource: 'assessment_finding',
          readinessEvidenceType: 'assessment_finding',
          readinessEvidenceIds: [deficitFinding.id],
          isEvidenceDirectlyVerified: false,
          readinessJustification: 'Constat consulaire de couverture d’assurance inférieure au seuil obligatoire de 30 000 €.',
        };
      }

      const conformeFinding = findings.find((f) => f.id === 'FIND-SCHENGEN-INSURANCE-CONFORME' || f.type === 'favorable_evidence');
      if (conformeFinding && context?.applicantFacts?.hasValidTravelInsurance === true) {
        return {
          status: 'ready',
          statusReason: 'Attestation d’assurance conforme déclarée respectant le seuil légal de 30 000 €.',
          readinessEvidenceSource: 'assessment_finding',
          readinessEvidenceType: 'assessment_finding',
          readinessEvidenceIds: [conformeFinding.id],
          isEvidenceDirectlyVerified: false,
          readinessJustification: 'Constat consulaire formel confirmant une police d’assurance conforme et en cours de validité.',
        };
      }

      return {
        status: 'requires_clarification',
        statusReason: 'Attestation d’assurance médicale obligatoire à souscrire et vérifier (couverture minimale de 30 000 € requise).',
        readinessEvidenceSource: undefined,
        readinessEvidenceType: undefined,
        readinessEvidenceIds: [],
        isEvidenceDirectlyVerified: false,
        readinessJustification: 'Document obligatoire par le Code des Visas Schengen dont la souscription et la validité n’ont pas été démontrées par une preuve explicite.',
      };
    },
  },

  {
    id: 'DOC-ACCOMMODATION-PROOF',
    category: 'accommodation_and_logistics',
    title: 'Justificatif d’Hébergement (Attestation d’Accueil Mairie ou Réservation d’Hôtel)',
    description: 'Attestation d’accueil originale délivrée par la mairie du lieu de séjour de l’hôte, ou réservation d’hôtel ferme pour l’intégralité des nuitées.',
    isMandatoryByRegulation: true,
    relatedChecklistKey: 'accommodation_proof',
    targetPillars: ['purpose_and_logistics'],
    officialBasis: 'Code Communautaire des Visas (Art. 14.1.b) : justification des conditions de séjour et d’hébergement.',
    concreteStep: 'Demander à votre hébergeant de déposer le dossier d’attestation d’accueil en mairie, ou procéder à la réservation d’un hébergement certifié.',
    matchesFinding: (f) =>
      f.id.startsWith('FIND-ACCOMMODATION') ||
      f.recommendedEvidence?.some((e) => e.relatedChecklistKey === 'accommodation_proof') ||
      f.title.toLowerCase().includes('hébergement') ||
      f.title.toLowerCase().includes('accueil') ||
      f.declaredFact.toLowerCase().includes('hôtel'),
    evaluateApplicability: () => ({ applicability: 'applicable' }),
    evaluateStatus: (findings, _actions, context) => {
      const uploadedDoc = findUpload('accommodation_proof', context);
      if (uploadedDoc) {
        const isEvidenceDirectlyVerified = uploadedDoc.isVerified === true;
        return {
          status: 'ready',
          statusReason: 'Preuve d’hébergement conforme téléversée et vérifiée.',
          readinessEvidenceSource: isEvidenceDirectlyVerified ? 'verified_document' : 'uploaded_document',
          readinessEvidenceType: isEvidenceDirectlyVerified ? 'verified_document' : 'uploaded_document',
          readinessEvidenceIds: [uploadedDoc.id],
          isEvidenceDirectlyVerified,
          readinessJustification: `Justificatif d’hébergement vérifié : ${uploadedDoc.fileName}.`,
        };
      }

      const absentFinding = findings.find(
        (f) => f.id === 'FIND-ACCOMMODATION-ABSENT' || f.isDirectBlocker
      );
      if (absentFinding) {
        return {
          status: 'missing',
          statusReason: 'Aucun hébergement démontré : le séjour ne présente aucune cohérence logistique aux yeux du consulat.',
          readinessEvidenceSource: 'assessment_finding',
          readinessEvidenceType: 'assessment_finding',
          readinessEvidenceIds: [absentFinding.id],
          isEvidenceDirectlyVerified: false,
          readinessJustification: 'Constat consulaire d’absence totale d’adresse ou de preuve d’hébergement.',
        };
      }

      const lodgingOk = findings.find((f) => f.id.includes('ACCOMMODATION-OK') || f.type === 'favorable_evidence');
      if (lodgingOk && context?.applicantFacts?.hasConfirmedAccommodation === true) {
        return {
          status: 'requires_clarification',
          statusReason: 'Hébergement déclaré conforme mais justificatif matériel (attestation d’accueil ou réservation) en attente de vérification.',
          readinessEvidenceSource: 'assessment_finding',
          readinessEvidenceType: 'assessment_finding',
          readinessEvidenceIds: [lodgingOk.id],
          isEvidenceDirectlyVerified: false,
          readinessJustification: 'Constat consulaire de conformité de l’hébergement en attente de vérification matérielle.',
        };
      }

      return {
        status: 'requires_clarification',
        statusReason: 'Attestation d’accueil de la mairie ou réservation hôtelière ferme à réunir pour le dossier.',
        readinessEvidenceSource: undefined,
        readinessEvidenceType: undefined,
        readinessEvidenceIds: [],
        isEvidenceDirectlyVerified: false,
        readinessJustification: 'Document obligatoire dont la réservation confirmée ou l’attestation d’accueil doit être jointe.',
      };
    },
  },

  {
    id: 'DOC-FLIGHT-ITINERARY',
    category: 'accommodation_and_logistics',
    title: 'Itinéraire de Vol Aller-Retour Confirmé (Réservation)',
    description: 'Réservation de vol aller-retour mentionnant les dates et le plan de vol. Attention : les consulats recommandent de ne pas acheter de billet ferme avant l’accord de visa.',
    isMandatoryByRegulation: false,
    relatedChecklistKey: 'flight_reservation',
    targetPillars: ['purpose_and_logistics'],
    officialBasis: 'Consular Travel Logistics Standards : confirmation de la cohérence calendaire sans obligation d’achat ferme préalable.',
    concreteStep: 'Faire établir une réservation de billet d’avion aller-retour avec dates cohérentes auprès d’une agence de voyage.',
    matchesFinding: (f) =>
      f.id === 'FIND-STAY-DURATION-EXCEEDED' ||
      f.title.toLowerCase().includes('durée du séjour') ||
      f.title.toLowerCase().includes('vol'),
    evaluateApplicability: () => ({ applicability: 'applicable' }),
    evaluateStatus: (findings, _actions, context) => {
      const uploadedDoc = findUpload('flight_reservation', context);
      if (uploadedDoc) {
        const isEvidenceDirectlyVerified = uploadedDoc.isVerified === true;
        return {
          status: 'ready',
          statusReason: 'Itinéraire de vol confirmé téléversé.',
          readinessEvidenceSource: isEvidenceDirectlyVerified ? 'verified_document' : 'uploaded_document',
          readinessEvidenceType: isEvidenceDirectlyVerified ? 'verified_document' : 'uploaded_document',
          readinessEvidenceIds: [uploadedDoc.id],
          isEvidenceDirectlyVerified,
          readinessJustification: `Réservation de vol vérifiée : ${uploadedDoc.fileName}.`,
        };
      }

      const isExceeded = findings.find((f) => f.id === 'FIND-STAY-DURATION-EXCEEDED');
      if (isExceeded) {
        return {
          status: 'requires_clarification',
          statusReason: 'La durée de séjour déclarée excède le maximum légal de 90 jours : réajustement impératif des dates de transport.',
          readinessEvidenceSource: 'assessment_finding',
          readinessEvidenceType: 'assessment_finding',
          readinessEvidenceIds: [isExceeded.id],
          isEvidenceDirectlyVerified: false,
          readinessJustification: 'Constat de dépassement calendaire de la durée maximale autorisée pour visa court séjour.',
        };
      }
      return {
        status: 'optional_reinforcement',
        statusReason: 'Itinéraire de voyage corroborant le calendrier du séjour.',
        readinessEvidenceSource: undefined,
        readinessEvidenceType: undefined,
        readinessEvidenceIds: [],
        isEvidenceDirectlyVerified: false,
        readinessJustification: 'Document probant facultatif recommandé pour justifier la logistique de transport.',
      };
    },
  },

  // --------------------------------------------------------------------------
  // F. SUPPORTING EVIDENCE
  // --------------------------------------------------------------------------
  {
    id: 'DOC-TIES-EVIDENCE',
    category: 'supporting_evidence',
    title: 'Preuves Matérielles des Attaches Locales (Immobilier / Famille)',
    description: 'Titres de propriété foncière, actes notariés, livret de famille, certificats de scolarité des enfants ou contrats d’investissement prouvant les liens indéfectibles avec le pays d’origine.',
    isMandatoryByRegulation: false,
    relatedChecklistKey: 'ties_evidence',
    targetPillars: ['ties_and_anchors'],
    officialBasis: 'Code des Visas Schengen (Art. 21.1) / Guide IRCC : prévention du risque migratoire et présomption de retour.',
    concreteStep: 'Rassembler les originaux et copies notariées de vos titres fonciers ou pièces d’état civil familial.',
    matchesFinding: (f) =>
      f.pillarId === 'ties_and_anchors' &&
      !f.id.startsWith('FIND-TIES-PROFESSIONAL') &&
      !f.id.startsWith('FIND-TIES-ENTREPRENEUR') &&
      !f.id.startsWith('FIND-PREVIOUS-REFUSAL'),
    evaluateApplicability: () => ({ applicability: 'applicable' }),
    evaluateStatus: (findings, _actions, context) => {
      const uploadedDoc = findUpload('ties_evidence', context);
      if (uploadedDoc) {
        const isEvidenceDirectlyVerified = uploadedDoc.isVerified === true;
        return {
          status: 'ready',
          statusReason: 'Preuves d’ancrage patrimonial ou familial téléversées et vérifiées.',
          readinessEvidenceSource: isEvidenceDirectlyVerified ? 'verified_document' : 'uploaded_document',
          readinessEvidenceType: isEvidenceDirectlyVerified ? 'verified_document' : 'uploaded_document',
          readinessEvidenceIds: [uploadedDoc.id],
          isEvidenceDirectlyVerified,
          readinessJustification: `Attaches locales vérifiées : ${uploadedDoc.fileName}.`,
        };
      }

      const hasContradiction = findings.find((f) => f.id === 'FIND-CONTRADICTION-STATUS-TIES');
      if (hasContradiction) {
        return {
          status: 'requires_clarification',
          statusReason: 'Incohérence déclarative entre le statut socio-professionnel et les attaches déclarées.',
          readinessEvidenceSource: 'assessment_finding',
          readinessEvidenceType: 'assessment_finding',
          readinessEvidenceIds: [hasContradiction.id],
          isEvidenceDirectlyVerified: false,
          readinessJustification: 'Constat consulaire d’incohérence interne entre situation déclarée et attaches locales.',
        };
      }
      return {
        status: 'optional_reinforcement',
        statusReason: 'Pièces complémentaires précieuses pour dissiper tout soupçon de projet d’installation irrégulière.',
        readinessEvidenceSource: undefined,
        readinessEvidenceType: undefined,
        readinessEvidenceIds: [],
        isEvidenceDirectlyVerified: false,
        readinessJustification: 'Documents facultatifs de confort pour renforcer l’ancrage dans le pays d’origine.',
      };
    },
  },

  {
    id: 'DOC-PREVIOUS-REFUSAL-NOTE',
    category: 'supporting_evidence',
    title: 'Note de Clarification Circonstanciée sur Précédent Refus',
    description: 'Courrier explicatif objectif détaillant les motifs du refus consulaire antérieur et démontrant les évolutions matérielles substantielles intervenues depuis dans le dossier.',
    isMandatoryByRegulation: false,
    relatedChecklistKey: 'previous_refusal_explanation',
    targetPillars: ['ties_and_anchors'],
    officialBasis: 'Pratique consulaire : obligation de transparence sur l’historique des demandes sous peine de refus pour dissimulation.',
    concreteStep: 'Rédiger une note factuelle et dépassionnée répondant point par point au motif coché sur la notification de refus précédente.',
    matchesFinding: (f) =>
      f.id.startsWith('FIND-PREVIOUS-REFUSAL') ||
      f.title.toLowerCase().includes('refus'),
    evaluateApplicability: () => ({ applicability: 'applicable' }),
    evaluateStatus: (findings) => {
      const isUnspecified = findings.find((f) => f.id === 'FIND-PREVIOUS-REFUSAL-UNSPECIFIED');
      if (isUnspecified) {
        return {
          status: 'requires_clarification',
          statusReason: 'Antécédent de refus déclaré sans précision du motif officiel notifié : clarification impérative pour le consulat.',
          readinessEvidenceSource: 'assessment_finding',
          readinessEvidenceType: 'assessment_finding',
          readinessEvidenceIds: [isUnspecified.id],
          isEvidenceDirectlyVerified: false,
          readinessJustification: 'Constat d’antécédent consulaire défavorable non détaillé.',
        };
      }
      const refusalFinding = findings.find((f) => f.id.startsWith('FIND-PREVIOUS-REFUSAL'));
      return {
        status: 'requires_clarification',
        statusReason: 'Note circonstanciée requise pour attester de l’évolution objective de la situation depuis le dernier refus.',
        readinessEvidenceSource: refusalFinding ? 'assessment_finding' : undefined,
        readinessEvidenceType: refusalFinding ? 'assessment_finding' : undefined,
        readinessEvidenceIds: refusalFinding ? [refusalFinding.id] : [],
        isEvidenceDirectlyVerified: false,
        readinessJustification: 'Clarification requise pour répondre formellement aux précédents motifs d’ajournement.',
      };
    },
  },
];

// ============================================================================
// 2. SEPARATION V2.3.6 : MOTEUR DE SYNTHÈSE DES LIVRABLES GÉNÉRÉS
// ============================================================================

/**
 * Construit la synthèse des livrables générés par la plateforme VISAFlow.
 * Invariant #3 : Les livrables générés ne sont jamais assimilés à des pièces acquises du demandeur.
 */
export function buildGeneratedDeliverablesSummary(
  findings: AssessmentFinding[],
  actionPlan: ActionPlanSummary,
  contextDeliverables?: any
): GeneratedDeliverablesSummary {
  const items: GeneratedDeliverableItem[] = [
    {
      id: 'DELIV-COVER-LETTER',
      title: 'Lettre de Motivation Consulaire & Note Explicative de Projet',
      description: 'Projet rédigé exposant l’objet du voyage, le calendrier des activités et les garanties de retour au pays.',
      artifactType: 'motivation_letter',
      status: 'generated',
      generationStatus: 'generated',
      requiresApplicantReview: true,
      requiresApplicantAcceptance: true,
      requiresSignature: true,
      requiresApplicantReviewAndSignature: true,
      readinessEvidenceSource: 'generated_artifact',
      readinessEvidenceType: 'generated_artifact',
      readinessEvidenceIds: ['GEN-DELIV-COVER-LETTER'],
      justification: 'Livrable structuré rédigé par la plateforme VISAFlow disponible pour téléchargement ; requiert révision et signature par le demandeur.',
    },
  ];

  // Si garant requis ou mentionné dans les constats
  const hasGuarantor = findings.some(
    (f) =>
      f.id.startsWith('FIND-GUARANTOR') ||
      f.title.toLowerCase().includes('garant') ||
      f.declaredFact.toLowerCase().includes('prise en charge')
  );
  if (hasGuarantor) {
    items.push({
      id: 'DELIV-GUARANTOR-AFFIDAVIT',
      title: 'Modèle d’Engagement de Prise en Charge Financière & Filiation',
      description: 'Formulaire juridique de prise en charge financière à faire signer, dater et certifier par le garant auprès des autorités locales.',
      artifactType: 'guarantor_letter',
      status: 'generated',
      generationStatus: 'generated',
      requiresApplicantReview: true,
      requiresApplicantAcceptance: true,
      requiresSignature: true,
      requiresApplicantReviewAndSignature: true,
      readinessEvidenceSource: 'generated_artifact',
      readinessEvidenceType: 'generated_artifact',
      readinessEvidenceIds: ['GEN-DELIV-GUARANTOR-AFFIDAVIT'],
      justification: 'Modèle officiel d’attestation de prise en charge à faire légaliser par le garant.',
    });
  }

  // Si précédent refus ou attaches sensibles
  const hasRefusalOrTies = findings.some(
    (f) =>
      f.id.startsWith('FIND-PREVIOUS-REFUSAL') ||
      f.pillarId === 'ties_and_anchors' ||
      f.title.toLowerCase().includes('refus')
  );
  if (hasRefusalOrTies) {
    items.push({
      id: 'DELIV-TIES-EXPLANATION-MEMO',
      title: 'Note Circonstanciée sur les Attaches & Justification de Retour',
      description: 'Mémo structuré rédigé pour exposer la stabilité des liens familiaux, professionnels et patrimoniaux.',
      artifactType: 'ties_note',
      status: 'generated',
      generationStatus: 'generated',
      requiresApplicantReview: true,
      requiresApplicantAcceptance: true,
      requiresSignature: true,
      requiresApplicantReviewAndSignature: true,
      readinessEvidenceSource: 'generated_artifact',
      readinessEvidenceType: 'generated_artifact',
      readinessEvidenceIds: ['GEN-DELIV-TIES-EXPLANATION-MEMO'],
      justification: 'Note explicative rédigée par le moteur pour dissiper les doutes sur l’intention de retour.',
    });
  }

  // Feuille de route globale des actions
  if (actionPlan.allActions.length > 0) {
    items.push({
      id: 'DELIV-ACTION-ROADMAP-CHECKLIST',
      title: 'Feuille de Route d’Exécution & Chronogramme de Dépôt',
      description: 'Document de planification pas-à-pas séquençant les démarches administratives, bancaires et consulaires.',
      artifactType: 'roadmap',
      status: 'generated',
      generationStatus: 'generated',
      requiresApplicantReview: true,
      requiresApplicantAcceptance: false,
      requiresSignature: false,
      requiresApplicantReviewAndSignature: false,
      readinessEvidenceSource: 'generated_artifact',
      readinessEvidenceType: 'generated_artifact',
      readinessEvidenceIds: ['GEN-DELIV-ACTION-ROADMAP'],
      justification: 'Planning chronologique opérationnel synthétisant les étapes avant soumission.',
    });
  }

  // Livrables explicites fournis dans le contexte
  if (Array.isArray(contextDeliverables) && contextDeliverables.length > 0) {
    for (const d of contextDeliverables) {
      if (!items.some((existing) => existing.id === d.id)) {
        items.push({
          id: d.id,
          title: d.title || 'Livrable généré',
          description: d.description || 'Livrable structuré rédigé par la plateforme VISAFlow.',
          artifactType: d.type || d.artifactType || 'custom_artifact',
          status: 'generated',
          generationStatus: 'generated',
          requiresApplicantReview: true,
          requiresApplicantAcceptance: true,
          requiresSignature: false,
          requiresApplicantReviewAndSignature: false,
          readinessEvidenceSource: 'generated_artifact',
          readinessEvidenceType: 'generated_artifact',
          readinessEvidenceIds: [`GEN-${d.id}`],
          justification: 'Livrable spécifique à la demande rédigé par la plateforme VISAFlow.',
        });
      }
    }
  }

  return {
    totalDeliverables: items.length,
    items,
    hasPendingReview: items.some((i) => i.requiresApplicantReview),
  };
}

// ============================================================================
// 3. COUCHE D'ÉVALUATION DE LA CONFORMITÉ RÉGLEMENTAIRE (V2.3.7)
// ============================================================================

export interface DocumentComplianceEvaluation {
  complianceStatus: EvidenceComplianceStatus;
  complianceRuleIds: string[];
  complianceRationale: string;
}

/**
 * Couche d'évaluation déterministe de la conformité réglementaire (V2.3.7)
 * S'exécute strictement APRÈS la validation de provenance et AVANT l'attribution de préparation.
 *
 * Invariant : L'existence, le téléversement ou la vérification matérielle ne préjugent
 * jamais de la conformité légale ou réglementaire d'une pièce.
 */
export function evaluateDocumentCompliance(
  blueprintId: string,
  relatedChecklistKey: string,
  isApplicable: boolean,
  readinessEvidenceSource: ReadinessEvidenceSource | undefined,
  isEvidenceDirectlyVerified: boolean,
  matchedFindings: AssessmentFinding[],
  context?: DocumentReadinessContext,
  profile?: ConsularProfile
): DocumentComplianceEvaluation {
  // Si non applicable, la conformité n'est pas évaluée
  if (!isApplicable) {
    return {
      complianceStatus: 'not_evaluated',
      complianceRuleIds: [],
      complianceRationale: 'Document non applicable pour ce profil consulaire : conformité réglementaire non évaluée.',
    };
  }

  const uploadedDoc = findUpload(relatedChecklistKey, context);

  // 1. Anomalies matérielles rédhibitoires universelles ou statut de conformité explicite
  if (uploadedDoc) {
    if (uploadedDoc.isLegible === false) {
      return {
        complianceStatus: 'non_compliant',
        complianceRuleIds: ['RULE-DOC-MATERIAL-LEGIBILITY'],
        complianceRationale:
          'Document illisible, tronqué ou altéré lors de la numérisation : vérification de conformité matérielle impossible.',
      };
    }
    if (uploadedDoc.hasMissingPages === true) {
      return {
        complianceStatus: 'non_compliant',
        complianceRuleIds: ['RULE-DOC-COMPLETENESS-INTEGRITY'],
        complianceRationale:
          'Feuillets ou mentions obligatoires manquants lors de l’examen matériel : pièce incomplète.',
      };
    }
    // Si la conformité est explicitement non évaluée sur cette pièce (not_evaluated), elle ne peut jamais être réputée conforme
    if (uploadedDoc.complianceStatus === 'not_evaluated') {
      return {
        complianceStatus: 'not_evaluated',
        complianceRuleIds: [],
        complianceRationale:
          'Conformité réglementaire non encore évaluée pour cette pièce justificative.',
      };
    }
  }

  const isCanada = profile?.destination === 'canada';

  // 2. Règles de conformité spécifiques par gabarit de document

  // Passeport
  if (blueprintId === 'DOC-PASSPORT') {
    const expiredFinding = matchedFindings.find(
      (f) =>
        f.id === 'FIND-PASSPORT-EXPIRED' ||
        f.id === 'FIND-PASSPORT-VALIDITY-INSUFFICIENT' ||
        f.title.toLowerCase().includes('expiré') ||
        f.title.toLowerCase().includes('validité insuffisante') ||
        (f.isDirectBlocker && f.id.startsWith('FIND-PASSPORT'))
    );
    const isExpiredUpload =
      uploadedDoc?.isExpired === true ||
      (uploadedDoc?.expiryDate !== undefined && uploadedDoc.expiryDate < '2025-01-01') ||
      (uploadedDoc?.validityMonths !== undefined && uploadedDoc.validityMonths < (isCanada ? 6 : 3)) ||
      (uploadedDoc?.isCompliant === false);
    const isDeclaredInvalid = context?.applicantFacts?.hasPassport6MonthsValid === false;

    if (expiredFinding || isExpiredUpload || isDeclaredInvalid) {
      return {
        complianceStatus: 'non_compliant',
        complianceRuleIds: ['RULE-PASSPORT-6-MONTH-VALIDITY'],
        complianceRationale:
          'Le passeport est expiré ou présente une validité résiduelle inférieure au seuil réglementaire exigé (3 à 6 mois).',
      };
    }

    if (isEvidenceDirectlyVerified) {
      return {
        complianceStatus: 'compliant',
        complianceRuleIds: [isCanada ? 'RULE-CA-PASSPORT-VALIDITY' : 'RULE-SCHENGEN-PASSPORT-VALIDITY'],
        complianceRationale:
          'Passeport biométrique authentifié présentant une validité résiduelle supérieure aux exigences réglementaires.',
      };
    }

    return {
      complianceStatus: 'not_evaluated',
      complianceRuleIds: [],
      complianceRationale: 'Passeport en attente de présentation matérielle et d’authentification consulaire.',
    };
  }

  // Relevés bancaires / Solvabilité
  if (blueprintId === 'DOC-BANK-STATEMENTS') {
    const deficitFinding = matchedFindings.find(
      (f) =>
        f.id.includes('DEFICIT') ||
        f.id.includes('BELOW-THRESHOLD') ||
        f.id.includes('BUDGET-UNDECLARED') ||
        f.isDirectBlocker
    );
    const isBalanceInsufficient =
      (uploadedDoc?.availableBalanceFcfa !== undefined &&
        uploadedDoc.availableBalanceFcfa < (isCanada ? 10000000 : 4000000)) ||
      (uploadedDoc?.availableBalanceCad !== undefined && uploadedDoc.availableBalanceCad < 20635) ||
      (uploadedDoc?.availableBalanceEur !== undefined && uploadedDoc.availableBalanceEur < 7380);

    if (deficitFinding || isBalanceInsufficient) {
      return {
        complianceStatus: 'non_compliant',
        complianceRuleIds: [isCanada ? 'RULE-CA-STUDENT-LICO-2024' : 'RULE-FR-STUDENT-CESEDA-R422'],
        complianceRationale: 'Available funds remain below the minimum regulatory threshold.',
      };
    }

    if (isEvidenceDirectlyVerified) {
      return {
        complianceStatus: 'compliant',
        complianceRuleIds: [isCanada ? 'RULE-CA-STUDENT-LICO-2024' : 'RULE-FR-STUDENT-CESEDA-R422'],
        complianceRationale:
          'Historique de compte et solde bancaire certifiés conformes aux barèmes financiers réglementaires en vigueur.',
      };
    }

    return {
      complianceStatus: 'not_evaluated',
      complianceRuleIds: [],
      complianceRationale: 'Relevés bancaires en attente de certification par l’établissement bancaire.',
    };
  }

  // Lettre d'admission universitaire
  if (blueprintId === 'DOC-ADMISSION-LETTER') {
    const invalidFinding = matchedFindings.find(
      (f) =>
        f.id === 'FIND-PURPOSE-UNACCREDITED-INSTITUTION' ||
        f.id === 'FIND-PURPOSE-ACADEMIC-INCONSISTENCY' ||
        f.isDirectBlocker
    );
    const isUnrecognized = uploadedDoc?.isInstitutionRecognized === false;

    if (invalidFinding || isUnrecognized) {
      return {
        complianceStatus: 'non_compliant',
        complianceRuleIds: ['RULE-CA-DLI-VALIDATION'],
        complianceRationale: 'Institution not recognized or unaccredited under applicable consular regulations.',
      };
    }

    if (isEvidenceDirectlyVerified) {
      return {
        complianceStatus: 'compliant',
        complianceRuleIds: [isCanada ? 'RULE-CA-DLI-VALIDATION' : 'RULE-FR-CAMPUS-FRANCE-ACCREDITATION'],
        complianceRationale:
          'Lettre d’admission officielle émise par un établissement agréé (EED/DLI) et reconnue par les autorités consulaires.',
      };
    }

    return {
      complianceStatus: 'not_evaluated',
      complianceRuleIds: [],
      complianceRationale: 'Lettre d’admission en attente d’authentification formelle auprès de l’établissement.',
    };
  }

  // Assurance voyage
  if (blueprintId === 'DOC-TRAVEL-INSURANCE') {
    const deficitFinding = matchedFindings.find(
      (f) =>
        f.id.startsWith('FIND-SCHENGEN-INSURANCE-COVERAGE-DEFICIT') ||
        f.id.startsWith('FIND-SCHENGEN-INSURANCE-EXPIRED') ||
        f.id.startsWith('FIND-SCHENGEN-INSURANCE-ABSENT') ||
        f.isDirectBlocker
    );
    const isInsuranceInvalid =
      uploadedDoc?.isInsuranceCompliant === false ||
      (uploadedDoc?.insuranceCoverageEur !== undefined && uploadedDoc.insuranceCoverageEur < 30000);

    if (deficitFinding || isInsuranceInvalid) {
      return {
        complianceStatus: 'non_compliant',
        complianceRuleIds: ['RULE-SCHENGEN-INSURANCE-30K'],
        complianceRationale:
          'Police d’assurance médicale ne couvrant pas le plafond statutaire obligatoire de 30 000 € ou présentant une couverture expirée.',
      };
    }

    if (isEvidenceDirectlyVerified) {
      return {
        complianceStatus: 'compliant',
        complianceRuleIds: ['RULE-SCHENGEN-INSURANCE-30K'],
        complianceRationale:
          'Police d’assurance médicale internationale conforme au Règlement CE n° 810/2009 (Art. 15).',
      };
    }

    return {
      complianceStatus: 'not_evaluated',
      complianceRuleIds: [],
      complianceRationale: 'Police d’assurance en attente de souscription ou de contrôle de conformité.',
    };
  }

  // Attestation provinciale PAL / CAQ
  if (blueprintId === 'DOC-PAL-CAQ') {
    const missingFinding = matchedFindings.find(
      (f) => f.id === 'FIND-CA-STUDENT-PAL-UNDECLARED' || f.id === 'FIND-CA-STUDENT-PAL-GAP' || f.isDirectBlocker
    );
    if (missingFinding) {
      return {
        complianceStatus: 'non_compliant',
        complianceRuleIds: ['RULE-CA-LIPR-87-3-PAL'],
        complianceRationale: 'Attestation provinciale (PAL) manquante ou invalide selon les instructions ministérielles.',
      };
    }
    if (isEvidenceDirectlyVerified) {
      return {
        complianceStatus: 'compliant',
        complianceRuleIds: ['RULE-CA-LIPR-87-3-PAL'],
        complianceRationale: 'Attestation provinciale officielle (PAL/CAQ) authentifiée conforme.',
      };
    }
    return {
      complianceStatus: 'not_evaluated',
      complianceRuleIds: [],
      complianceRationale: 'Attestation provinciale en attente de délivrance.',
    };
  }

  // Frais de scolarité
  if (blueprintId === 'DOC-TUITION-EVIDENCE') {
    const deficitFinding = matchedFindings.find(
      (f) => f.id.includes('TUITION') && (f.isDirectBlocker || f.id.includes('DEFICIT'))
    );
    if (deficitFinding) {
      return {
        complianceStatus: 'non_compliant',
        complianceRuleIds: ['RULE-CA-STUDENT-TUITION-FEE'],
        complianceRationale: 'Frais de scolarité non acquittés et provision dédiée insuffisante.',
      };
    }
    if (isEvidenceDirectlyVerified) {
      return {
        complianceStatus: 'compliant',
        complianceRuleIds: ['RULE-CA-STUDENT-TUITION-FEE'],
        complianceRationale: 'Reçu officiel de règlement des droits universitaires vérifié.',
      };
    }
    return {
      complianceStatus: 'not_evaluated',
      complianceRuleIds: [],
      complianceRationale: 'Reçu de scolarité en attente d’encaissement.',
    };
  }

  // Hébergement
  if (blueprintId === 'DOC-ACCOMMODATION-PROOF') {
    const absentFinding = matchedFindings.find(
      (f) => f.id === 'FIND-ACCOMMODATION-ABSENT' || f.isDirectBlocker
    );
    if (absentFinding) {
      return {
        complianceStatus: 'non_compliant',
        complianceRuleIds: ['RULE-SCHENGEN-ACCOMMODATION-14-1-B'],
        complianceRationale: 'Absence d’hébergement probant ou non-conformité de l’attestation d’accueil.',
      };
    }
    if (isEvidenceDirectlyVerified) {
      return {
        complianceStatus: 'compliant',
        complianceRuleIds: ['RULE-SCHENGEN-ACCOMMODATION-14-1-B'],
        complianceRationale: 'Justificatif d’hébergement couvrant la totalité du séjour vérifié.',
      };
    }
    return {
      complianceStatus: 'not_evaluated',
      complianceRuleIds: [],
      complianceRationale: 'Justificatif d’hébergement en attente de vérification.',
    };
  }

  // Itinéraire de vol
  if (blueprintId === 'DOC-FLIGHT-ITINERARY') {
    const exceeded = matchedFindings.find((f) => f.id === 'FIND-STAY-DURATION-EXCEEDED');
    if (exceeded) {
      return {
        complianceStatus: 'non_compliant',
        complianceRuleIds: ['RULE-SCHENGEN-90-DAY-LIMIT'],
        complianceRationale: 'Calendrier de vol excédant le séjour maximal autorisé de 90 jours.',
      };
    }
    if (isEvidenceDirectlyVerified) {
      return {
        complianceStatus: 'compliant',
        complianceRuleIds: ['RULE-TRAVEL-LOGISTICS-COHERENCE'],
        complianceRationale: 'Itinéraire de vol cohérent avec les dates et la durée du séjour.',
      };
    }
    return {
      complianceStatus: 'not_evaluated',
      complianceRuleIds: [],
      complianceRationale: 'Réservation de vol en attente de contrôle calendaire.',
    };
  }

  // Règle générale pour autres pièces : tout constat bloquant entraîne non_compliant
  const genericBlocker = matchedFindings.find((f) => f.isDirectBlocker);
  if (genericBlocker) {
    return {
      complianceStatus: 'non_compliant',
      complianceRuleIds: [genericBlocker.sourceRuleId || 'RULE-REGULATORY-BLOCKER'],
      complianceRationale: genericBlocker.findingRationale || genericBlocker.title,
    };
  }

  if (isEvidenceDirectlyVerified) {
    return {
      complianceStatus: 'compliant',
      complianceRuleIds: ['RULE-EVIDENCE-VERIFIED-STATUTORY'],
      complianceRationale: 'Document original examiné, authentifié et conforme aux exigences réglementaires.',
    };
  }

  return {
    complianceStatus: 'not_evaluated',
    complianceRuleIds: [],
    complianceRationale: 'Conformité réglementaire en attente de production et vérification matérielle de la pièce.',
  };
}

// ============================================================================
// 4. VALIDATION STRICTE DES INVARIANTS V2.3.7 (RUNTIME INVARIANT ENFORCER)
// ============================================================================

/**
 * Valide de manière stricte et sans compromis les invariants de conformité réglementaire V2.3.7.
 * FORMAL INVARIANT: READY = APPLICABLE ∧ PROVEN ∧ VERIFIED ∧ COMPLIANT
 * 
 * Déclenche une exception si un document viole l'un des invariants non-négociables.
 */
export function validateComplianceInvariant(summary: DocumentReadinessSummary): void {
  for (const item of summary.items) {
    // 1. Generated artifact must NEVER appear as applicant document
    if (
      item.id.startsWith('DELIV-') ||
      item.id.startsWith('GEN-') ||
      item.readinessEvidenceSource === 'generated_artifact' ||
      item.readinessEvidenceType === 'generated_artifact'
    ) {
      throw new Error(
        `Compliance Invariant Breach (Invariant #3): Generated artifact '${item.id}' was found in applicant checklist items.`
      );
    }

    // 2. Not applicable item must not receive readiness status
    if (item.applicability === 'not_applicable') {
      if (item.status !== undefined) {
        throw new Error(
          `Compliance Invariant Breach (Invariant #4): Not applicable item '${item.id}' received status '${item.status}'. Not-applicable documents must not receive a readiness status.`
        );
      }
    }

    // 3. READY = APPLICABLE ∧ PROVEN ∧ VERIFIED ∧ COMPLIANT
    if (item.status === 'ready') {
      // Must be applicable
      if (item.applicability !== 'applicable') {
        throw new Error(
          `Compliance Invariant Breach: Item '${item.id}' is READY but applicability is '${item.applicability}'. Only applicable items may receive READY.`
        );
      }

      // Must have explicit supporting evidence and provenance
      if (!item.readinessEvidenceSource) {
        throw new Error(
          `Compliance Invariant Breach: Item '${item.id}' is READY but readinessEvidenceSource is missing.`
        );
      }

      // Evidence IDs must exist and not be empty
      if (!Array.isArray(item.readinessEvidenceIds) || item.readinessEvidenceIds.length === 0) {
        throw new Error(
          `Compliance Invariant Breach: Item '${item.id}' is READY but readinessEvidenceIds is empty.`
        );
      }

      // Must be verified
      if (item.isEvidenceDirectlyVerified !== true) {
        throw new Error(
          `Compliance Invariant Breach: Item '${item.id}' is marked READY but isEvidenceDirectlyVerified is false. Verification is strictly required for READY.`
        );
      }

      // Must be compliant (never non_compliant and never not_evaluated)
      if (item.evidenceComplianceStatus === 'non_compliant') {
        throw new Error(
          `Compliance Invariant Breach: Item '${item.id}' is marked READY but evidenceComplianceStatus is 'non_compliant'. Legally non-compliant items can never be READY.`
        );
      }

      if (item.evidenceComplianceStatus === 'not_evaluated') {
        throw new Error(
          `Compliance Invariant Breach: Item '${item.id}' is marked READY but evidenceComplianceStatus is 'not_evaluated'. Unassessed compliance can never be READY.`
        );
      }

      if (item.evidenceComplianceStatus !== 'compliant') {
        throw new Error(
          `Compliance Invariant Breach: Item '${item.id}' is marked READY but evidenceComplianceStatus is not 'compliant' (${item.evidenceComplianceStatus}).`
        );
      }

      // Compliance rule IDs must be populated
      if (!Array.isArray(item.evidenceComplianceRuleIds) || item.evidenceComplianceRuleIds.length === 0) {
        throw new Error(
          `Compliance Invariant Breach: Item '${item.id}' is marked READY but evidenceComplianceRuleIds is empty.`
        );
      }

      // Fact alone cannot be verified
      if (item.readinessEvidenceSource === 'applicant_fact') {
        throw new Error(
          `Compliance Invariant Breach: Item '${item.id}' has readinessEvidenceSource 'applicant_fact' but claimed READY.`
        );
      }

      // Unverified upload alone cannot satisfy READY
      if (item.readinessEvidenceSource === 'uploaded_document') {
        throw new Error(
          `Compliance Invariant Breach: Item '${item.id}' has readinessEvidenceSource 'uploaded_document' but claimed READY. Unverified uploads cannot satisfy READY.`
        );
      }

      // Generated artifact can never be READY or appear as applicant document
      if ((item.readinessEvidenceSource as string) === 'generated_artifact') {
        throw new Error(
          `Compliance Invariant Breach: Item '${item.id}' has readinessEvidenceSource 'generated_artifact' but claimed READY.`
        );
      }

      // Lifecycle stage must be ready
      if (item.lifecycleStage && item.lifecycleStage !== 'ready') {
        throw new Error(
          `Compliance Invariant Breach: Item '${item.id}' is marked READY but has lifecycle stage '${item.lifecycleStage}'.`
        );
      }

      // Stale READY after evidence becomes non-compliant
      if (
        item.evidenceRecord &&
        (item.evidenceRecord.complianceStatus === 'non_compliant' || item.evidenceRecord.isCompliant === false)
      ) {
        throw new Error(
          `Compliance Invariant Breach: Item '${item.id}' is marked READY but has a non-compliant evidence record.`
        );
      }

      // Invariant V2.3.9: Verification Event and Provenance Chain enforcement
      if (!item.verificationEventId) {
        throw new Error(
          `Verification Invariant Breach: Item '${item.id}' is marked READY but lacks a verificationEventId.`
        );
      }

      const vEvent = summary.verificationEvents?.find((e) => e.id === item.verificationEventId);
      if (!vEvent) {
        throw new Error(
          `Verification Invariant Breach: Item '${item.id}' references nonexistent verification event ID '${item.verificationEventId}'.`
        );
      }

      if (vEvent.outcome !== 'verified') {
        throw new Error(
          `Verification Invariant Breach: Item '${item.id}' is marked READY but verification event '${vEvent.id}' outcome is '${vEvent.outcome}'.`
        );
      }

      if (!item.verificationMethod || item.verificationMethod === 'not_verified') {
        throw new Error(
          `Verification Invariant Breach: Item '${item.id}' is marked READY but has invalid verification method '${item.verificationMethod}'.`
        );
      }

      if (!item.verificationTimestamp || isNaN(new Date(item.verificationTimestamp).getTime())) {
        throw new Error(
          `Verification Invariant Breach: Item '${item.id}' is marked READY but has invalid verification timestamp '${item.verificationTimestamp}'.`
        );
      }

      if (!item.verificationRationale || item.verificationRationale.trim().length === 0) {
        throw new Error(
          `Verification Invariant Breach: Item '${item.id}' is marked READY but has empty verification rationale.`
        );
      }

      if (!item.verificationProvenanceChain || !item.verificationProvenanceChain.isReady) {
        throw new Error(
          `Verification Invariant Breach: Item '${item.id}' is marked READY but lacks a complete verificationProvenanceChain.`
        );
      }

      // V2.3.10 Formal State Machine Derivation Check
      const stateMachineDerivation = deriveDocumentReadinessState({
        isApplicable: item.applicability === 'applicable',
        exists: Boolean(item.evidenceRecord?.exists || (item.evidenceRecords && item.evidenceRecords.length > 0)),
        readinessEvidenceSource: item.readinessEvidenceSource,
        readinessEvidenceIds: item.readinessEvidenceIds,
        isEvidenceDirectlyVerified: item.isEvidenceDirectlyVerified,
        hasValidVerificationEvent: Boolean(vEvent && vEvent.outcome === 'verified'),
        authoritativeVerificationEvent: vEvent,
        complianceStatus: item.evidenceComplianceStatus,
        complianceRuleIds: item.evidenceComplianceRuleIds,
        lifecycleStage: item.lifecycleStage,
      });

      if (!stateMachineDerivation.isReady) {
        throw new Error(
          `Compliance Invariant Breach (V2.3.10 State Machine): Item '${item.id}' failed formal derivation: ${stateMachineDerivation.failureReasons.join('; ')}`
        );
      }
    }

    // Provenance validation: if an evidence source is declared, IDs must exist
    if (
      (item.readinessEvidenceSource === 'verified_document' ||
        item.readinessEvidenceSource === 'uploaded_document' ||
        item.readinessEvidenceSource === 'applicant_fact') &&
      (!Array.isArray(item.readinessEvidenceIds) || item.readinessEvidenceIds.length === 0)
    ) {
      throw new Error(
        `Compliance Invariant Breach: Item '${item.id}' has evidence source '${item.readinessEvidenceSource}' but empty readinessEvidenceIds.`
      );
    }

    // Evidence IDs referencing nonexistent evidence records in registry
    if (
      (item.readinessEvidenceSource === 'verified_document' || item.readinessEvidenceSource === 'uploaded_document') &&
      summary.evidenceRecords &&
      summary.evidenceRecords.length > 0
    ) {
      for (const evId of item.readinessEvidenceIds) {
        const existsInRegistry = summary.evidenceRecords.some((r) => r.id === evId);
        const existsInItemRecords = item.evidenceRecords?.some((r) => r.id === evId);
        if (!existsInRegistry && !existsInItemRecords) {
          throw new Error(
            `Compliance Invariant Breach: Item '${item.id}' references evidence ID '${evId}' which does not exist in the evidence registry.`
          );
        }
      }
    }
  }

  // Verification Registry Audit (V2.3.9)
  // 1. Evidence records validation
  const seenEvidenceIds = new Set<string>();
  for (const rec of summary.evidenceRecords || []) {
    if (seenEvidenceIds.has(rec.id)) {
      throw new Error(
        `Verification Invariant Breach: Duplicate evidence ID '${rec.id}' in evidence registry.`
      );
    }
    seenEvidenceIds.add(rec.id);

    if (rec.verificationStatus === 'verified' || rec.source === 'verified_document') {
      if (!rec.exists) {
        throw new Error(
          `Verification Invariant Breach: Evidence '${rec.id}' claims verified but exists is false.`
        );
      }
      if (rec.source === 'applicant_fact') {
        throw new Error(
          `Verification Invariant Breach: Ineligible source 'applicant_fact' for evidence '${rec.id}' cannot be verified.`
        );
      }
      if (rec.source === 'generated_artifact') {
        throw new Error(
          `Verification Invariant Breach: Ineligible source 'generated_artifact' for evidence '${rec.id}' cannot be verified.`
        );
      }
      if (!rec.verificationEventId) {
        throw new Error(
          `Verification Invariant Breach: Evidence '${rec.id}' has verificationStatus 'verified' without verificationEventId.`
        );
      }
      const vEvent = summary.verificationEvents?.find((e) => e.id === rec.verificationEventId);
      if (!vEvent) {
        throw new Error(
          `Verification Invariant Breach: Evidence '${rec.id}' references nonexistent verification event ID '${rec.verificationEventId}'.`
        );
      }
      if (vEvent.evidenceId !== rec.id) {
        throw new Error(
          `Verification Invariant Breach: Verification event '${vEvent.id}' references evidence ID '${vEvent.evidenceId}', but evidence ID is '${rec.id}'.`
        );
      }
      if (vEvent.outcome !== 'verified') {
        throw new Error(
          `Verification Invariant Breach: Verification event '${vEvent.id}' for evidence '${rec.id}' has outcome '${vEvent.outcome}', not 'verified'.`
        );
      }
      if (!vEvent.method || vEvent.method === 'not_verified') {
        throw new Error(
          `Verification Invariant Breach: Verification event '${vEvent.id}' has unsupported or absent method.`
        );
      }
      if (!vEvent.rationale || vEvent.rationale.trim().length === 0) {
        throw new Error(
          `Verification Invariant Breach: Verification event '${vEvent.id}' has empty rationale.`
        );
      }
      if (!vEvent.timestamp || isNaN(new Date(vEvent.timestamp).getTime())) {
        throw new Error(
          `Verification Invariant Breach: Verification event '${vEvent.id}' has malformed timestamp '${vEvent.timestamp}'.`
        );
      }
      if (vEvent.performedBy === 'applicant') {
        throw new Error(
          `Verification Invariant Breach: Verification event '${vEvent.id}' cannot be performed by 'applicant'.`
        );
      }
    }

    if (rec.verificationEventId) {
      const vEvent = summary.verificationEvents?.find((e) => e.id === rec.verificationEventId);
      if (!vEvent) {
        throw new Error(
          `Verification Invariant Breach: Evidence '${rec.id}' references nonexistent verification event ID '${rec.verificationEventId}'.`
        );
      }
    }
  }

  // 2. Verification events validation
  const seenEventIds = new Set<string>();
  const allowedMethods = [
    'document_review',
    'official_source_match',
    'structured_validation',
    'manual_verification',
    'system_verification',
  ];

  for (const evt of summary.verificationEvents || []) {
    if (seenEventIds.has(evt.id)) {
      throw new Error(
        `Verification Invariant Breach: Duplicate verification event ID '${evt.id}'.`
      );
    }
    seenEventIds.add(evt.id);

    if (!evt.timestamp || isNaN(new Date(evt.timestamp).getTime())) {
      throw new Error(
        `Verification Invariant Breach: Verification event '${evt.id}' has malformed timestamp '${evt.timestamp}'.`
      );
    }
    if (!allowedMethods.includes(evt.method)) {
      throw new Error(
        `Verification Invariant Breach: Verification event '${evt.id}' has unsupported method '${evt.method}'.`
      );
    }
    if (!evt.rationale || evt.rationale.trim().length === 0) {
      throw new Error(
        `Verification Invariant Breach: Verification event '${evt.id}' has empty rationale.`
      );
    }
    if (evt.performedBy === 'applicant' && evt.outcome === 'verified') {
      throw new Error(
        `Verification Invariant Breach: Verification event '${evt.id}' cannot be performed by 'applicant'.`
      );
    }

    // Orphan check: evidence must exist in registry
    const targetEvidence = summary.evidenceRecords?.find((r) => r.id === evt.evidenceId);
    if (!targetEvidence) {
      throw new Error(
        `Verification Invariant Breach: Verification event '${evt.id}' references nonexistent evidence ID '${evt.evidenceId}'.`
      );
    }
    if (targetEvidence.source === 'applicant_fact') {
      throw new Error(
        `Verification Invariant Breach: Verification event '${evt.id}' targets ineligible evidence source 'applicant_fact'.`
      );
    }
    if (targetEvidence.source === 'generated_artifact') {
      throw new Error(
        `Verification Invariant Breach: Verification event '${evt.id}' targets ineligible evidence source 'generated_artifact'.`
      );
    }
  }

  // 4. Not applicable items must NOT participate in readiness counts
  const countedStatuses =
    summary.readyCount +
    summary.missingCount +
    summary.clarificationCount +
    summary.optionalCount;

  if (countedStatuses !== summary.applicableItems.length) {
    throw new Error(
      `Compliance Invariant Breach (Invariant #4): Readiness status counts sum (${countedStatuses}) does not match applicable items count (${summary.applicableItems.length}).`
    );
  }

  const countedVerification = summary.verifiedCount + summary.unverifiedCount;
  if (countedVerification !== summary.applicableItems.length) {
    throw new Error(
      `Compliance Invariant Breach: Verification counts sum (${countedVerification}) does not match applicable items count (${summary.applicableItems.length}).`
    );
  }

  const countedCompliance =
    summary.compliantCount +
    summary.nonCompliantCount +
    summary.compliancePendingCount;

  if (countedCompliance !== summary.applicableItems.length) {
    throw new Error(
      `Compliance Invariant Breach: Compliance counts sum (${countedCompliance}) does not match applicable items count (${summary.applicableItems.length}).`
    );
  }

  // 5. Lifecycle stage counts consistency
  if (summary.stageCounts) {
    const totalStages = Object.values(summary.stageCounts).reduce((a, b) => a + b, 0);
    if (totalStages !== summary.applicableItems.length) {
      throw new Error(
        `Compliance Invariant Breach: Lifecycle stage counts sum (${totalStages}) does not match applicable items count (${summary.applicableItems.length}).`
      );
    }
    if (summary.stageCounts.ready !== summary.readyCount) {
      throw new Error(
        `Compliance Invariant Breach: Lifecycle stage 'ready' count (${summary.stageCounts.ready}) does not match summary readyCount (${summary.readyCount}).`
      );
    }
  }
}

/**
 * Valide de manière stricte et sans compromis les invariants d'état du DocumentReadinessSummary.
 * Déclenche une exception si un document viole l'un des invariants non-négociables.
 */
export function validateDocumentReadinessSummary(summary: DocumentReadinessSummary): void {
  validateComplianceInvariant(summary);
}

// ============================================================================
// 5. MOTEUR DE TRANSFORMATION DÉTERMINISTE (MAIN ENGINE FUNCTION)
// ============================================================================

/**
 * Construit la synthèse déterministe de préparation documentaire à partir des constats,
 * du plan d'action et d'un contexte de preuves explicites optionnel.
 *
 * Exécute le pipeline en 5 étapes strictes :
 * Applicabilité -> Provenance des Preuves -> Vérification Matérielle -> Évaluation de Conformité -> Attribution de Préparation
 *
 * @param findings Liste complète des constats issus de l'évaluation consulaire
 * @param actionPlan Synthèse du plan d'action déterministe
 * @param context Contexte optionnel de preuves explicites (facts, uploads, completed actions)
 * @returns DocumentReadinessSummary
 */
export function buildDocumentReadinessSummary(
  findings: AssessmentFinding[],
  actionPlan: ActionPlanSummary,
  context?: DocumentReadinessContext
): DocumentReadinessSummary {
  const checklistItems: DocumentChecklistItem[] = [];
  const processedFindingIds = new Set<string>();
  const processedActionIds = new Set<string>();
  const allVerificationEvents = collectAllVerificationEvents(context);

  // Étape 1 : Détection déterministe du profil et de la destination
  const profile = detectDestinationAndVisaType(findings, context);

  // Étape 2 : Évaluation séquentielle de chaque gabarit de document
  for (const blueprint of DOCUMENT_BLUEPRINTS) {
    const matchedFindings = findings.filter((f) => blueprint.matchesFinding(f));

    // Invariant #4: L'évaluation d'applicabilité précède impérativement l'évaluation de préparation.
    const applicabilityEvaluation = blueprint.evaluateApplicability
      ? blueprint.evaluateApplicability(findings, context)
      : { applicability: 'applicable' as DocumentApplicability };

    const isApplicable = applicabilityEvaluation.applicability === 'applicable';

    const uploadForNotApp = findUpload(blueprint.relatedChecklistKey, context, blueprint.id);
    const hasUpload = Boolean(uploadForNotApp);
    const hasFact = Boolean(
      (context?.applicantFacts as any)?.[blueprint.relatedChecklistKey] ||
      (blueprint.id === 'DOC-ADMISSION-LETTER' && context?.applicantFacts?.hasUniversityAdmissionLetter) ||
      (blueprint.id === 'DOC-PASSPORT' && context?.applicantFacts?.hasPassport) ||
      (blueprint.id === 'DOC-BANK-STATEMENTS' && context?.applicantFacts?.hasCertifiedBankStatements) ||
      (blueprint.id === 'DOC-TRAVEL-INSURANCE' && context?.applicantFacts?.hasValidTravelInsurance) ||
      (blueprint.id === 'DOC-ACCOMMODATION-PROOF' && context?.applicantFacts?.hasConfirmedAccommodation) ||
      (blueprint.id === 'DOC-PAL-CAQ' && (context?.applicantFacts?.hasPalCaq || context?.applicantFacts?.palCaq || (context?.applicantFacts as any)?.provincial_attestation_letter)) ||
      (blueprint.id === 'DOC-TUITION-EVIDENCE' && context?.applicantFacts?.tuitionPaid) ||
      (blueprint.id === 'DOC-AVI-CERTIFICATE' && context?.applicantFacts?.hasAviCertificate)
    );

    // Un document obligatoire lié au profil ou destination est toujours instancié s'il est applicable
    const isProfileMandatory =
      blueprint.id === 'DOC-PASSPORT' ||
      blueprint.id === 'DOC-BANK-STATEMENTS' ||
      (blueprint.id === 'DOC-TRAVEL-INSURANCE' && isApplicable && profile.destination !== 'canada') ||
      (blueprint.id === 'DOC-PAL-CAQ' && isApplicable && profile.destination === 'canada' && profile.isStudy) ||
      (blueprint.id === 'DOC-TUITION-EVIDENCE' && isApplicable && (hasUpload || hasFact || matchedFindings.length > 0)) ||
      (blueprint.id === 'DOC-ADMISSION-LETTER' && isApplicable && (profile.isStudy || hasUpload || hasFact));

    if (isApplicable && !isProfileMandatory && matchedFindings.length === 0 && !hasUpload && !hasFact) {
      // Document applicable mais contextuel, sans constat ni déclaration explicite -> ne pas encombrer la checklist
      continue;
    }

    // Traitement des documents NON APPLICABLES
    if (!isApplicable) {
      // Les documents exclus explicitement du profil consulaire (ex: Assurance pour Canada, AVI pour Canada)
      const isRelevantNotApplicable =
        (blueprint.id === 'DOC-TRAVEL-INSURANCE' && profile.destination === 'canada') ||
        (blueprint.id === 'DOC-AVI-CERTIFICATE' && profile.destination === 'canada') ||
        (blueprint.id === 'DOC-PAL-CAQ' && profile.destination !== 'canada' && matchedFindings.length > 0) ||
        (blueprint.id === 'DOC-RESIDENCE-PERMIT' && context?.applicantFacts?.residesInThirdCountry === false) ||
        Boolean(uploadForNotApp);

      if (!isRelevantNotApplicable && matchedFindings.length === 0 && !uploadForNotApp) {
        continue;
      }

      const notAppRecords = collectEvidenceRecordsForBlueprint(blueprint, context);
      const notAppPrimary = notAppRecords[0];
      let notAppStage: EvidenceLifecycleStage = 'not_provided';
      if (notAppPrimary?.verificationStatus === 'verified') {
        notAppStage = 'compliance_evaluated';
      } else if (notAppPrimary?.exists) {
        notAppStage = 'uploaded';
      } else if (notAppPrimary?.source === 'applicant_fact') {
        notAppStage = 'declared';
      }

      // Invariant #4 : L'élément ne doit pas recevoir de statut de préparation et ne participe à aucun comptage.
      const item: DocumentChecklistItem = {
        id: blueprint.id,
        category: blueprint.category,
        title: blueprint.title,
        description: blueprint.description,
        applicability: 'not_applicable',
        status: undefined, // Aucun statut de préparation
        statusReason:
          applicabilityEvaluation.notApplicableReason ||
          'Document non applicable pour ce profil ou cette destination consulaire.',
        isMandatoryByRegulation: false,
        relatedChecklistKey: blueprint.relatedChecklistKey,
        targetPillars: blueprint.targetPillars,
        sourceFindingIds: [],
        sourceActionIds: [],
        officialBasis: blueprint.officialBasis,
        sourceRuleId: blueprint.sourceRuleId,
        concreteStep: undefined,
        readinessEvidenceSource: notAppPrimary?.source,
        readinessEvidenceType: notAppPrimary?.source,
        readinessEvidenceIds: notAppRecords.map((r) => r.id),
        isEvidenceDirectlyVerified: notAppPrimary?.verificationStatus === 'verified',
        readinessJustification: 'Pièce exclue déterministement du périmètre d’exigibilité pour ce type de dossier.',
        evidenceComplianceStatus: notAppPrimary?.complianceStatus || 'not_evaluated',
        evidenceComplianceRuleIds: notAppPrimary?.complianceRuleIds || [],
        complianceRuleIds: notAppPrimary?.complianceRuleIds || [],
        complianceRationale: 'Document non applicable au dossier : conformité réglementaire non évaluée.',
        lifecycleStage: notAppStage,
        evidenceRecord: notAppPrimary,
        evidenceRecords: notAppRecords.length > 0 ? notAppRecords : undefined,
      };
      checklistItems.push(item);
      continue;
    }

    // Trouver les actions correspondantes dans le plan d'action
    const matchedFindingIdSet = new Set(matchedFindings.map((f) => f.id));
    const matchedActions = actionPlan.allActions.filter((action) => {
      const hasFindingIntersection = action.sourceFindingIds.some((fid) => matchedFindingIdSet.has(fid));
      const hasKeyMatch =
        action.relatedDocumentKey &&
        (action.relatedDocumentKey === blueprint.relatedChecklistKey ||
          blueprint.relatedChecklistKey.includes(action.relatedDocumentKey));
      return hasFindingIntersection || hasKeyMatch;
    });

    // Étape 2.B : Preuve et provenance V2.3.8
    const candidateEvidenceRecords = collectEvidenceRecordsForBlueprint(
      blueprint,
      context,
      matchedFindings,
      matchedActions
    );
    const primaryEvidenceRecord = candidateEvidenceRecords.length > 0 ? candidateEvidenceRecords[0] : undefined;

    const rawStatusResult = blueprint.evaluateStatus(matchedFindings, matchedActions, context);

    // Synchronisation de rawStatusResult avec les preuves déterministes qualifiées
    if (primaryEvidenceRecord) {
      if (
        primaryEvidenceRecord.source === 'verified_document' ||
        (primaryEvidenceRecord.exists && primaryEvidenceRecord.verificationStatus === 'verified')
      ) {
        rawStatusResult.readinessEvidenceSource = 'verified_document';
        rawStatusResult.isEvidenceDirectlyVerified = true;
        if (
          !rawStatusResult.readinessEvidenceIds ||
          rawStatusResult.readinessEvidenceIds.length === 0 ||
          rawStatusResult.readinessEvidenceIds[0].startsWith('FACT-')
        ) {
          rawStatusResult.readinessEvidenceIds = [primaryEvidenceRecord.id];
        }
      } else if (primaryEvidenceRecord.source === 'uploaded_document' || primaryEvidenceRecord.exists) {
        if (rawStatusResult.readinessEvidenceSource !== 'verified_document') {
          rawStatusResult.readinessEvidenceSource = 'uploaded_document';
          rawStatusResult.isEvidenceDirectlyVerified = false;
          if (
            !rawStatusResult.readinessEvidenceIds ||
            rawStatusResult.readinessEvidenceIds.length === 0 ||
            rawStatusResult.readinessEvidenceIds[0].startsWith('FACT-')
          ) {
            rawStatusResult.readinessEvidenceIds = [primaryEvidenceRecord.id];
          }
        }
      } else if (primaryEvidenceRecord.source === 'applicant_fact') {
        if (!rawStatusResult.readinessEvidenceSource) {
          rawStatusResult.readinessEvidenceSource = 'applicant_fact';
          rawStatusResult.isEvidenceDirectlyVerified = false;
          rawStatusResult.readinessEvidenceIds = [primaryEvidenceRecord.id];
        }
      }
    }

    // Étape 2.C & 2.D : Évaluation de la conformité réglementaire déterministe
    const complianceEvaluation = evaluateDocumentCompliance(
      blueprint.id,
      blueprint.relatedChecklistKey,
      isApplicable,
      rawStatusResult.readinessEvidenceSource,
      rawStatusResult.isEvidenceDirectlyVerified,
      matchedFindings,
      context,
      profile
    );

    // Mettre à jour primaryEvidenceRecord avec la compliance évaluée
    if (primaryEvidenceRecord) {
      if (!primaryEvidenceRecord.complianceStatus || primaryEvidenceRecord.complianceStatus === 'not_evaluated') {
        if (complianceEvaluation.complianceStatus !== 'not_evaluated') {
          primaryEvidenceRecord.complianceStatus = complianceEvaluation.complianceStatus;
          primaryEvidenceRecord.complianceRuleIds = complianceEvaluation.complianceRuleIds;
          primaryEvidenceRecord.complianceRationale = complianceEvaluation.complianceRationale;
        }
      }
    }

    // Étape 2.E : Détermination du cycle de vie V2.3.8
    // Cycle: NOT_PROVIDED -> DECLARED -> UPLOADED -> VERIFIED -> COMPLIANCE_EVALUATED -> READY
    let lifecycleStage: EvidenceLifecycleStage = 'not_provided';

    const hasVerifiedEvidence =
      rawStatusResult.isEvidenceDirectlyVerified === true &&
      (rawStatusResult.readinessEvidenceSource === 'verified_document' ||
        primaryEvidenceRecord?.verificationStatus === 'verified');

    const hasUploadedEvidence =
      Boolean(primaryEvidenceRecord?.exists) ||
      rawStatusResult.readinessEvidenceSource === 'uploaded_document' ||
      hasVerifiedEvidence;

    const hasDeclaredFact =
      rawStatusResult.readinessEvidenceSource === 'applicant_fact' ||
      primaryEvidenceRecord?.source === 'applicant_fact';

    if (hasVerifiedEvidence) {
      if (complianceEvaluation.complianceStatus === 'compliant') {
        lifecycleStage = 'ready';
      } else if (complianceEvaluation.complianceStatus === 'non_compliant') {
        lifecycleStage = 'compliance_evaluated';
      } else {
        lifecycleStage = 'verified';
      }
    } else if (hasUploadedEvidence) {
      lifecycleStage = 'uploaded';
    } else if (hasDeclaredFact) {
      lifecycleStage = 'declared';
    } else {
      lifecycleStage = 'not_provided';
    }

    // Étape 2.F : Attribution déterministe du statut selon l'invariant FORMEL V2.3.10:
    // READY = APPLICABLE ∧ EXISTS ∧ PROVEN ∧ VERIFIED ∧ COMPLIANT
    const evidenceExists = Boolean(
      primaryEvidenceRecord?.exists ||
      (rawStatusResult.readinessEvidenceSource === 'uploaded_document' && hasUpload) ||
      (rawStatusResult.readinessEvidenceSource === 'verified_document' && (hasUpload || primaryEvidenceRecord?.exists))
    );

    const authoritativeVEvent = primaryEvidenceRecord?.verificationEventId
      ? allVerificationEvents.find((e) => e.id === primaryEvidenceRecord.verificationEventId)
      : undefined;

    const readinessDerivation = deriveDocumentReadinessState({
      isApplicable,
      exists: evidenceExists,
      readinessEvidenceSource: rawStatusResult.readinessEvidenceSource,
      readinessEvidenceIds: rawStatusResult.readinessEvidenceIds || [],
      isEvidenceDirectlyVerified: rawStatusResult.isEvidenceDirectlyVerified === true,
      hasValidVerificationEvent: Boolean(authoritativeVEvent && authoritativeVEvent.outcome === 'verified'),
      authoritativeVerificationEvent: authoritativeVEvent,
      complianceStatus: complianceEvaluation.complianceStatus,
      complianceRuleIds: complianceEvaluation.complianceRuleIds,
      lifecycleStage,
    });

    let finalStatus = rawStatusResult.status;
    let finalStatusReason = rawStatusResult.statusReason;

    if (readinessDerivation.isReady) {
      finalStatus = 'ready';
      finalStatusReason =
        rawStatusResult.statusReason ||
        'Document vérifié, authentifié et formellement conforme aux exigences réglementaires.';
    } else {
      // READY IS STRICTLY FORBIDDEN!
      if (finalStatus === 'ready') {
        if (complianceEvaluation.complianceStatus === 'non_compliant') {
          if (
            blueprint.id === 'DOC-BANK-STATEMENTS' ||
            blueprint.id === 'DOC-GUARANTOR-DOSSIER' ||
            blueprint.id === 'DOC-TUITION-EVIDENCE' ||
            blueprint.isMandatoryByRegulation
          ) {
            finalStatus = 'missing';
          } else {
            finalStatus = 'requires_clarification';
          }
          finalStatusReason = complianceEvaluation.complianceRationale;
        } else if (!rawStatusResult.isEvidenceDirectlyVerified) {
          finalStatus = 'requires_clarification';
          finalStatusReason = 'Document en attente de vérification matérielle et de certification officielle.';
        } else {
          finalStatus = 'requires_clarification';
          finalStatusReason = complianceEvaluation.complianceRationale;
        }
      } else if (!finalStatus) {
        finalStatus = blueprint.isMandatoryByRegulation ? 'missing' : 'requires_clarification';
      }
    }

    // Enregistrer les IDs pour l'auditabilité
    const sourceFindingIds = Array.from(new Set(matchedFindings.map((f) => f.id)));
    const sourceActionIds = Array.from(new Set(matchedActions.map((a) => a.id)));

    sourceFindingIds.forEach((id) => processedFindingIds.add(id));
    sourceActionIds.forEach((id) => processedActionIds.add(id));

    // Extraire les piliers consulaires combinés
    const targetPillarsSet = new Set<ConsularPillarId>(blueprint.targetPillars);
    matchedFindings.forEach((f) => targetPillarsSet.add(f.pillarId));

    // Création de l'item de check-list auditable V2.3.8
    const item: DocumentChecklistItem = {
      id: blueprint.id,
      category: blueprint.category,
      title: blueprint.title,
      description: blueprint.description,
      applicability: 'applicable',
      status: finalStatus,
      statusReason: finalStatusReason,
      isMandatoryByRegulation: blueprint.isMandatoryByRegulation,
      relatedChecklistKey: blueprint.relatedChecklistKey,
      targetPillars: Array.from(targetPillarsSet),
      sourceFindingIds,
      sourceActionIds,
      officialBasis: blueprint.officialBasis,
      sourceRuleId: blueprint.sourceRuleId || matchedFindings.find((f) => f.sourceRuleId)?.sourceRuleId,
      concreteStep: blueprint.concreteStep,
      readinessEvidenceSource: rawStatusResult.readinessEvidenceSource,
      readinessEvidenceType: rawStatusResult.readinessEvidenceSource || rawStatusResult.readinessEvidenceType,
      readinessEvidenceIds: rawStatusResult.readinessEvidenceIds,
      isEvidenceDirectlyVerified: rawStatusResult.isEvidenceDirectlyVerified,
      readinessJustification: rawStatusResult.readinessJustification,

      // V2.3.7 Compliance attributes
      evidenceComplianceStatus: complianceEvaluation.complianceStatus,
      evidenceComplianceRuleIds: complianceEvaluation.complianceRuleIds,
      complianceRuleIds: complianceEvaluation.complianceRuleIds,
      complianceRationale: complianceEvaluation.complianceRationale,

      // V2.3.8 Evidence Lifecycle Bridge
      lifecycleStage,
      evidenceRecord: primaryEvidenceRecord,
      evidenceRecords: candidateEvidenceRecords.length > 0 ? candidateEvidenceRecords : undefined,

      // V2.3.9 Evidence Integrity & Verification Audit Layer
      verificationEventId: primaryEvidenceRecord?.verificationEventId,
      verificationMethod: primaryEvidenceRecord?.verificationMethod,
      verificationTimestamp: primaryEvidenceRecord?.verifiedAt,
      verificationRationale: primaryEvidenceRecord?.verificationRationale,
      verificationPerformer: primaryEvidenceRecord?.verifiedBy,
      verificationProvenanceChain:
        finalStatus === 'ready' && primaryEvidenceRecord?.verificationEventId
          ? {
              checklistItemId: blueprint.id,
              evidenceId: primaryEvidenceRecord.id,
              evidenceSource: rawStatusResult.readinessEvidenceSource || 'verified_document',
              verificationEventId: primaryEvidenceRecord.verificationEventId,
              verificationMethod: primaryEvidenceRecord.verificationMethod || 'system_verification',
              verificationTimestamp: primaryEvidenceRecord.verifiedAt || '2026-09-13T09:30:00Z',
              verificationRationale:
                primaryEvidenceRecord.verificationRationale ||
                'Vérification matérielle opposable et certifiée.',
              performedBy: primaryEvidenceRecord.verifiedBy || 'system',
              complianceRuleId:
                complianceEvaluation.complianceRuleIds[0] || 'RULE-CONSULAR-COMPLIANCE-DEFAULT',
              complianceRuleIds: complianceEvaluation.complianceRuleIds,
              complianceStatus: complianceEvaluation.complianceStatus,
              complianceRationale: complianceEvaluation.complianceRationale,
              isReady: true,
            }
          : undefined,
    };

    checklistItems.push(item);
  }

  // Étape 3 : Traitement des constats avec `recommendedEvidence` non encore mappés
  for (const f of findings) {
    if (f.recommendedEvidence && f.recommendedEvidence.length > 0) {
      for (const rec of f.recommendedEvidence) {
        const alreadyCovered = checklistItems.some(
          (item) => item.relatedChecklistKey === rec.relatedChecklistKey
        );
        if (!alreadyCovered) {
          let category: DocumentCategory = 'supporting_evidence';
          if (rec.targetPillar === 'legal_admissibility') category = 'identity_and_travel';
          else if (rec.targetPillar === 'financial_sufficiency' || rec.targetPillar === 'financial_provenance')
            category = 'financial_documents';
          else if (rec.targetPillar === 'purpose_and_logistics') category = 'accommodation_and_logistics';
          else if (rec.targetPillar === 'ties_and_anchors') category = 'employment_and_business';

          const sourceFindingIds = [f.id];
          const matchedActions = actionPlan.allActions.filter((a) => a.sourceFindingIds.includes(f.id));
          const sourceActionIds = matchedActions.map((a) => a.id);

          processedFindingIds.add(f.id);
          sourceActionIds.forEach((id) => processedActionIds.add(id));

          const isMandatory = rec.category === 'mandatory_by_regulation';
          const status: DocumentReadinessStatus = isMandatory ? 'missing' : 'optional_reinforcement';

          const hasBlocker = f.isDirectBlocker;
          const complianceStatus: EvidenceComplianceStatus = hasBlocker ? 'non_compliant' : 'not_evaluated';
          const ruleIds = f.sourceRuleId ? [f.sourceRuleId] : [];
          const rationale = f.findingRationale || `Pièce prescrite directement par le constat consulaire ${f.id}.`;

          checklistItems.push({
            id: `DOC-REC-${rec.relatedChecklistKey.toUpperCase()}`,
            category,
            title: rec.documentName,
            description: rec.consularUtility,
            applicability: 'applicable',
            status,
            statusReason: `Prescrit par l'instruction consulaire : ${rec.consularUtility}`,
            isMandatoryByRegulation: isMandatory,
            relatedChecklistKey: rec.relatedChecklistKey,
            targetPillars: [rec.targetPillar],
            sourceFindingIds,
            sourceActionIds,
            officialBasis: f.officialBasis,
            sourceRuleId: f.sourceRuleId,
            concreteStep: f.suggestedAction,
            readinessEvidenceSource: 'assessment_finding',
            readinessEvidenceType: 'assessment_finding',
            readinessEvidenceIds: [f.id],
            isEvidenceDirectlyVerified: false,
            readinessJustification: `Pièce prescrite directement par le constat consulaire ${f.id}.`,
            evidenceComplianceStatus: complianceStatus,
            evidenceComplianceRuleIds: ruleIds,
            complianceRuleIds: ruleIds,
            complianceRationale: rationale,
            lifecycleStage: 'not_provided',
          });
        }
      }
    }
  }

  // Étape 4 : Synthèse et regroupements
  const itemsByCategory: Record<DocumentCategory, DocumentChecklistItem[]> = {
    identity_and_travel: [],
    financial_documents: [],
    education_documents: [],
    employment_and_business: [],
    accommodation_and_logistics: [],
    supporting_evidence: [],
  };

  const itemsByStatus: Record<DocumentReadinessStatus, DocumentChecklistItem[]> = {
    ready: [],
    missing: [],
    requires_clarification: [],
    optional_reinforcement: [],
  };

  let readyCount = 0;
  let missingCount = 0;
  let clarificationCount = 0;
  let optionalCount = 0;
  let verifiedCount = 0;
  let unverifiedCount = 0;
  let compliantCount = 0;
  let nonCompliantCount = 0;
  let compliancePendingCount = 0;
  let hasMissingMandatory = false;

  const applicableItems: DocumentChecklistItem[] = [];
  const notApplicableItems: DocumentChecklistItem[] = [];

  for (const item of checklistItems) {
    itemsByCategory[item.category].push(item);

    if (item.applicability === 'not_applicable') {
      notApplicableItems.push(item);
      // Invariant #4: Not-applicable items must NOT participate in ANY readiness counts!
      continue;
    }

    applicableItems.push(item);

    if (item.status) {
      itemsByStatus[item.status].push(item);

      if (item.status === 'ready') {
        readyCount++;
      } else if (item.status === 'missing') {
        missingCount++;
        if (item.isMandatoryByRegulation) {
          hasMissingMandatory = true;
        }
      } else if (item.status === 'requires_clarification') {
        clarificationCount++;
      } else if (item.status === 'optional_reinforcement') {
        optionalCount++;
      }
    }

    // Métriques V2.3.7 de vérification et de conformité
    if (item.isEvidenceDirectlyVerified === true) {
      verifiedCount++;
    } else {
      unverifiedCount++;
    }

    if (item.evidenceComplianceStatus === 'compliant') {
      compliantCount++;
    } else if (item.evidenceComplianceStatus === 'non_compliant') {
      nonCompliantCount++;
    } else {
      compliancePendingCount++;
    }
  }

  // Étape 5 : Génération des livrables séparés et registre des preuves
  const deliverablesSummary = buildGeneratedDeliverablesSummary(
    findings,
    actionPlan,
    context?.deliverables
  );

  // Consolidation du registre des preuves V2.3.8
  const allEvidenceRecords: EvidenceRecord[] = [];
  const seenAllEvidenceIds = new Set<string>();

  for (const item of checklistItems) {
    if (item.evidenceRecords) {
      for (const rec of item.evidenceRecords) {
        if (!seenAllEvidenceIds.has(rec.id)) {
          seenAllEvidenceIds.add(rec.id);
          allEvidenceRecords.push(rec);
        }
      }
    } else if (item.evidenceRecord) {
      if (!seenAllEvidenceIds.has(item.evidenceRecord.id)) {
        seenAllEvidenceIds.add(item.evidenceRecord.id);
        allEvidenceRecords.push(item.evidenceRecord);
      }
    }
  }

  if (context?.evidenceRecords) {
    for (const rec of context.evidenceRecords) {
      if (!seenAllEvidenceIds.has(rec.id)) {
        seenAllEvidenceIds.add(rec.id);
        allEvidenceRecords.push(rec);
      }
    }
  }

  const stageCounts: Record<EvidenceLifecycleStage, number> = {
    not_provided: 0,
    declared: 0,
    uploaded: 0,
    verified: 0,
    compliance_evaluated: 0,
    ready: 0,
  };

  for (const item of applicableItems) {
    stageCounts[item.lifecycleStage] = (stageCounts[item.lifecycleStage] || 0) + 1;
  }

  const summary: DocumentReadinessSummary = {
    totalItems: applicableItems.length,
    totalApplicableCount: applicableItems.length,
    notApplicableCount: notApplicableItems.length,
    readyCount,
    missingCount,
    clarificationCount,
    optionalCount,
    verifiedCount,
    unverifiedCount,
    compliantCount,
    nonCompliantCount,
    compliancePendingCount,
    items: checklistItems,
    applicableItems,
    notApplicableItems,
    itemsByCategory,
    itemsByStatus,
    hasMissingMandatory,
    auditStats: {
      totalFindingsMapped: processedFindingIds.size,
      totalActionsMapped: processedActionIds.size,
      unmappedFindingsCount: Math.max(0, findings.length - processedFindingIds.size),
    },
    deliverablesSummary,
    stageCounts,
    evidenceRecords: allEvidenceRecords,
    verificationEvents: allVerificationEvents,
  };

  // Étape 6 : Validation stricte des invariants V2.3.8
  validateDocumentReadinessSummary(summary);
  validateComplianceInvariant(summary);

  return summary;
}
