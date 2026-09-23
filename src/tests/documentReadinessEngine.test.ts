import {
  buildDocumentReadinessSummary,
  validateDocumentReadinessSummary,
  validateComplianceInvariant,
} from '../utils/documentReadinessEngine';
import { buildActionPlanSummary } from '../utils/actionEngine';
import { evaluateConsularProfile } from '../utils/consularAssessmentEngine';
import { AssessmentFinding } from '../types/assessment';
import {
  ExplicitUploadedDocument,
  EvidenceVerificationEvent,
  EvidenceRecord,
  DocumentReadinessSummary,
} from '../types/documentReadiness';
import { generate100Scenarios } from './adversarialSuite';

// ============================================================================
// Verification suite for VISAFlow V2.3.6 Deterministic Evidence Provenance Layer
// ============================================================================
export function runDocumentReadinessEngineAudit(): { passed: boolean; message: string; details: any } {
  console.log('--- Starting V2.3.6 Deterministic Document Readiness Engine Audit ---');

  const emptyFindings: AssessmentFinding[] = [];
  const emptyActionPlan = buildActionPlanSummary(emptyFindings);

  // --------------------------------------------------------------------------
  // Audit Verification 1: Applicability Model (Canada Study Permit Scenario)
  // --------------------------------------------------------------------------
  const mockCanadaStudyFinding: AssessmentFinding = {
    id: 'FIND-CA-STUDENT-BUDGET-DEFICIT',
    pillarId: 'financial_sufficiency',
    type: 'compliance_issue',
    title: 'Déficit budgétaire pour études au Canada',
    declaredFact: 'Permis d’études Canada - Ressources 15 000 CAD vs seuil 43 000 CAD',
    findingRationale: 'Déficit de 28 000 CAD sur les frais de scolarité et subsistance selon LIPR Art. 219.',
    suggestedAction: 'Combler le déficit ou justifier du paiement préalable de la scolarité.',
    isDirectBlocker: true,
    officialBasis: 'LIPR Art. 219 & 220 Canada',
    priorityEligibility: { eligible: true, weight: 'high' },
  };

  const actionPlanCanada = buildActionPlanSummary([mockCanadaStudyFinding]);
  const readinessCanada = buildDocumentReadinessSummary(
    [mockCanadaStudyFinding],
    actionPlanCanada,
    {
      destination: 'canada',
      visaType: 'etudiant',
      applicantFacts: { destination: 'canada', visaReason: 'etudes' },
    }
  );

  // 1.1 Travel insurance must be NOT_APPLICABLE for Canada Study Permit
  const insuranceCanada = readinessCanada.items.find((i) => i.id === 'DOC-TRAVEL-INSURANCE');
  if (!insuranceCanada) {
    return { passed: false, message: 'Applicability Test 1 failed: DOC-TRAVEL-INSURANCE not in items', details: readinessCanada };
  }
  if (insuranceCanada.applicability !== 'not_applicable') {
    return {
      passed: false,
      message: `Applicability Test 1 failed: Expected not_applicable for Travel Insurance in Canada Study Permit, got '${insuranceCanada.applicability}'`,
      details: insuranceCanada,
    };
  }
  if (insuranceCanada.status !== undefined) {
    return {
      passed: false,
      message: `Applicability Test 1 failed: Not-applicable document received readiness status '${insuranceCanada.status}'! Must be undefined.`,
      details: insuranceCanada,
    };
  }

  // 1.2 PAL/CAQ must be APPLICABLE for Canada Study Permit
  const palCanada = readinessCanada.items.find((i) => i.id === 'DOC-PAL-CAQ');
  if (!palCanada || palCanada.applicability !== 'applicable') {
    return {
      passed: false,
      message: 'Applicability Test 1 failed: PAL/CAQ must be applicable for Canada Study Permit',
      details: palCanada,
    };
  }

  // 1.3 AVI must be NOT_APPLICABLE for Canada Study Permit
  const aviCanada = readinessCanada.items.find((i) => i.id === 'DOC-AVI-CERTIFICATE');
  if (aviCanada && aviCanada.applicability !== 'not_applicable') {
    return {
      passed: false,
      message: 'Applicability Test 1 failed: AVI must be not_applicable for Canada',
      details: aviCanada,
    };
  }

  // 1.4 Not-applicable documents must NOT participate in readiness counts
  const sumCanadaStatuses =
    readinessCanada.readyCount +
    readinessCanada.missingCount +
    readinessCanada.clarificationCount +
    readinessCanada.optionalCount;

  if (sumCanadaStatuses !== readinessCanada.applicableItems.length) {
    return {
      passed: false,
      message: `Applicability Test 1 failed: sum of statuses (${sumCanadaStatuses}) != applicableItems (${readinessCanada.applicableItems.length})`,
      details: readinessCanada,
    };
  }

  // --------------------------------------------------------------------------
  // Audit Verification 2: Admission Letter Hardening
  // --------------------------------------------------------------------------
  // 2.1 Verified upload -> READY + verified_document + isEvidenceDirectlyVerified = true
  const readinessAdmissionVerified = buildDocumentReadinessSummary(emptyFindings, emptyActionPlan, {
    uploadedDocuments: [
      {
        id: 'UPL-ADMISSION-01',
        checklistKey: 'admission_letter',
        fileName: 'lettre_admission_sorbonne.pdf',
        isVerified: true,
        verificationStatus: 'verified',
        verificationMethod: 'official_source_match',
        verificationEventId: 'EVT-ADMISSION-01',
        verificationEvent: {
          id: 'EVT-ADMISSION-01',
          evidenceId: 'UPL-ADMISSION-01',
          outcome: 'verified',
          method: 'official_source_match',
          timestamp: '2026-09-13T09:00:00Z',
          rationale: 'Lettre d’admission authentifiée auprès du portail universitaire officiel.',
          performedBy: 'consular_officer',
        },
      },
    ],
  });
  const admissionVerified = readinessAdmissionVerified.items.find((i) => i.id === 'DOC-ADMISSION-LETTER');
  if (!admissionVerified || admissionVerified.status !== 'ready') {
    return {
      passed: false,
      message: 'Admission Hardening failed: verified upload did not produce READY status',
      details: admissionVerified,
    };
  }
  if (admissionVerified.readinessEvidenceSource !== 'verified_document' || !admissionVerified.isEvidenceDirectlyVerified) {
    return {
      passed: false,
      message: 'Admission Hardening failed: verified upload must have source verified_document and isEvidenceDirectlyVerified=true',
      details: admissionVerified,
    };
  }

  // 2.2 Unverified upload -> REQUIRES_CLARIFICATION + uploaded_document + isEvidenceDirectlyVerified = false
  const readinessAdmissionUnverified = buildDocumentReadinessSummary(emptyFindings, emptyActionPlan, {
    uploadedDocuments: [
      {
        id: 'UPL-ADMISSION-02',
        checklistKey: 'admission_letter',
        fileName: 'lettre_admission_provisoire.pdf',
        isVerified: false,
      },
    ],
  });
  const admissionUnverified = readinessAdmissionUnverified.items.find((i) => i.id === 'DOC-ADMISSION-LETTER');
  if (!admissionUnverified || admissionUnverified.status !== 'requires_clarification') {
    return {
      passed: false,
      message: 'Admission Hardening failed: unverified upload MUST NOT produce READY status',
      details: admissionUnverified,
    };
  }
  if (admissionUnverified.readinessEvidenceSource !== 'uploaded_document' || admissionUnverified.isEvidenceDirectlyVerified) {
    return {
      passed: false,
      message: 'Admission Hardening failed: unverified upload must have source uploaded_document and isEvidenceDirectlyVerified=false',
      details: admissionUnverified,
    };
  }

  // 2.3 Declared fact only -> REQUIRES_CLARIFICATION + applicant_fact + isEvidenceDirectlyVerified = false
  const readinessAdmissionFact = buildDocumentReadinessSummary(emptyFindings, emptyActionPlan, {
    applicantFacts: { hasUniversityAdmissionLetter: true },
  });
  const admissionFact = readinessAdmissionFact.items.find((i) => i.id === 'DOC-ADMISSION-LETTER');
  if (!admissionFact || admissionFact.status !== 'requires_clarification') {
    return {
      passed: false,
      message: 'Admission Hardening failed: applicant fact MUST NOT produce READY status',
      details: admissionFact,
    };
  }
  if (admissionFact.readinessEvidenceSource !== 'applicant_fact' || admissionFact.isEvidenceDirectlyVerified) {
    return {
      passed: false,
      message: 'Admission Hardening failed: applicant fact must have source applicant_fact and isEvidenceDirectlyVerified=false',
      details: admissionFact,
    };
  }

  // 2.4 Academic continuity finding -> REQUIRES_CLARIFICATION + assessment_finding + isEvidenceDirectlyVerified = false
  const mockAcademicFinding: AssessmentFinding = {
    id: 'FIND-PURPOSE-ACADEMIC-CONTINUITY',
    pillarId: 'purpose_and_logistics',
    type: 'favorable_evidence',
    title: 'Continuité académique démontrée',
    declaredFact: 'Licence en Informatique validée, poursuite en Master Informatique',
    findingRationale: 'Le projet d’études s’inscrit dans la continuité directe du cursus initial.',
    suggestedAction: 'Joindre la lettre d’admission officielle.',
    isDirectBlocker: false,
    priorityEligibility: { eligible: true, weight: 'medium' },
  };
  const readinessAcademicFinding = buildDocumentReadinessSummary(
    [mockAcademicFinding],
    buildActionPlanSummary([mockAcademicFinding])
  );
  const admissionAcademic = readinessAcademicFinding.items.find((i) => i.id === 'DOC-ADMISSION-LETTER');
  if (!admissionAcademic || admissionAcademic.status !== 'requires_clarification') {
    return {
      passed: false,
      message: 'Admission Hardening failed: academic finding MUST NOT produce READY status',
      details: admissionAcademic,
    };
  }
  if (admissionAcademic.readinessEvidenceSource !== 'assessment_finding' || admissionAcademic.isEvidenceDirectlyVerified) {
    return {
      passed: false,
      message: 'Admission Hardening failed: academic finding must have source assessment_finding and isEvidenceDirectlyVerified=false',
      details: admissionAcademic,
    };
  }

  // --------------------------------------------------------------------------
  // Audit Verification 3: Strict Deliverable Isolation
  // --------------------------------------------------------------------------
  // Generated artifacts MUST NEVER appear in items or applicableItems
  for (const item of readinessCanada.items) {
    if (
      item.id.startsWith('DELIV-') ||
      item.id.startsWith('GEN-') ||
      item.readinessEvidenceSource === 'generated_artifact'
    ) {
      return {
        passed: false,
        message: `Deliverable Isolation failed: item ${item.id} is present in DocumentReadinessSummary.items!`,
        details: item,
      };
    }
  }
  if (!readinessCanada.deliverablesSummary || readinessCanada.deliverablesSummary.items.length === 0) {
    return {
      passed: false,
      message: 'Deliverable Isolation failed: deliverablesSummary is missing or empty',
      details: readinessCanada,
    };
  }
  const coverLetter = readinessCanada.deliverablesSummary.items.find((d) => d.id === 'DELIV-COVER-LETTER');
  if (!coverLetter || coverLetter.readinessEvidenceSource !== 'generated_artifact') {
    return {
      passed: false,
      message: 'Deliverable Isolation failed: DELIV-COVER-LETTER missing or not tagged generated_artifact',
      details: coverLetter,
    };
  }
  if (!coverLetter.requiresApplicantReview || !coverLetter.requiresApplicantAcceptance) {
    return {
      passed: false,
      message: 'Deliverable Isolation failed: DELIV-COVER-LETTER must require review and acceptance',
      details: coverLetter,
    };
  }

  // --------------------------------------------------------------------------
  // Audit Verification 4: Runtime Invariant Validator Assertions
  // --------------------------------------------------------------------------
  // 4.1 Invariant: Tampered READY without evidence throws
  let threwOnTamperedReady = false;
  try {
    const tampered = JSON.parse(JSON.stringify(readinessCanada));
    tampered.items[0].status = 'ready';
    tampered.items[0].readinessEvidenceSource = undefined;
    tampered.items[0].readinessEvidenceIds = [];
    validateDocumentReadinessSummary(tampered);
  } catch (err: any) {
    threwOnTamperedReady = true;
  }
  if (!threwOnTamperedReady) {
    return {
      passed: false,
      message: 'Validator assertion failed: Validator did not reject READY item missing evidence!',
      details: null,
    };
  }

  // 4.2 Invariant: Tampered NOT_APPLICABLE with status throws
  let threwOnNotApplicableWithStatus = false;
  try {
    const tampered = JSON.parse(JSON.stringify(readinessCanada));
    const notAppItem = tampered.items.find((i: any) => i.applicability === 'not_applicable');
    if (notAppItem) {
      notAppItem.status = 'ready';
      notAppItem.readinessEvidenceSource = 'verified_document';
      notAppItem.readinessEvidenceIds = ['FAKE-1'];
      notAppItem.isEvidenceDirectlyVerified = true;
      notAppItem.evidenceComplianceStatus = 'compliant';
      notAppItem.readinessJustification = 'Fake justification';
      validateDocumentReadinessSummary(tampered);
    }
  } catch (err: any) {
    threwOnNotApplicableWithStatus = true;
  }
  if (!threwOnNotApplicableWithStatus) {
    return {
      passed: false,
      message: 'Validator assertion failed: Validator did not reject not_applicable item with a status!',
      details: null,
    };
  }

  // 4.3 Invariant V2.3.7: Tampered READY with non_compliant evidence throws
  let threwOnReadyNonCompliant = false;
  try {
    const tampered = JSON.parse(JSON.stringify(readinessCanada));
    const targetItem = tampered.items.find((i: any) => i.applicability !== 'not_applicable');
    if (targetItem) {
      targetItem.status = 'ready';
      targetItem.readinessEvidenceSource = 'verified_document';
      targetItem.readinessEvidenceIds = ['FAKE-VERIFIED'];
      targetItem.isEvidenceDirectlyVerified = true;
      targetItem.evidenceComplianceStatus = 'non_compliant';
      targetItem.readinessJustification = 'Tampered ready with non_compliant';
      validateDocumentReadinessSummary(tampered);
    }
  } catch (err: any) {
    threwOnReadyNonCompliant = true;
  }
  if (!threwOnReadyNonCompliant) {
    return {
      passed: false,
      message: 'Validator assertion failed: Validator did not reject READY item with non_compliant status!',
      details: null,
    };
  }

  // 4.4 Invariant V2.3.7: Tampered READY with unverified evidence throws
  let threwOnReadyUnverified = false;
  try {
    const tampered = JSON.parse(JSON.stringify(readinessCanada));
    const targetItem = tampered.items.find((i: any) => i.applicability !== 'not_applicable');
    if (targetItem) {
      targetItem.status = 'ready';
      targetItem.readinessEvidenceSource = 'uploaded_document';
      targetItem.readinessEvidenceIds = ['FAKE-UPLOAD'];
      targetItem.isEvidenceDirectlyVerified = false;
      targetItem.evidenceComplianceStatus = 'compliant';
      targetItem.readinessJustification = 'Tampered ready with unverified';
      validateDocumentReadinessSummary(tampered);
    }
  } catch (err: any) {
    threwOnReadyUnverified = true;
  }
  if (!threwOnReadyUnverified) {
    return {
      passed: false,
      message: 'Validator assertion failed: Validator did not reject READY item with unverified evidence!',
      details: null,
    };
  }

  // 4.5 Invariant V2.3.7: Tampered READY with not_evaluated evidence throws
  let threwOnReadyNotEvaluated = false;
  try {
    const tampered = JSON.parse(JSON.stringify(readinessCanada));
    const targetItem = tampered.items.find((i: any) => i.applicability !== 'not_applicable');
    if (targetItem) {
      targetItem.status = 'ready';
      targetItem.readinessEvidenceSource = 'verified_document';
      targetItem.readinessEvidenceIds = ['FAKE-VERIFIED'];
      targetItem.isEvidenceDirectlyVerified = true;
      targetItem.evidenceComplianceStatus = 'not_evaluated';
      targetItem.readinessJustification = 'Tampered ready with not_evaluated';
      validateDocumentReadinessSummary(tampered);
    }
  } catch (err: any) {
    threwOnReadyNotEvaluated = true;
  }
  if (!threwOnReadyNotEvaluated) {
    return {
      passed: false,
      message: 'Validator assertion failed: Validator did not reject READY item with not_evaluated compliance status!',
      details: null,
    };
  }

  // 4.6 Verification of Verified-but-Non-Compliant Document
  const expiredPassportUpload: ExplicitUploadedDocument = {
    id: 'up-expired-pass',
    checklistKey: 'passport',
    fileName: 'expired_passport.pdf',
    isVerified: true,
    verificationStatus: 'verified',
    verificationMethod: 'document_review',
    verificationEventId: 'EVT-EXPIRED-PASS-01',
    verificationEvent: {
      id: 'EVT-EXPIRED-PASS-01',
      evidenceId: 'up-expired-pass',
      outcome: 'verified',
      method: 'document_review',
      timestamp: '2026-09-13T09:00:00Z',
      rationale: 'Passeport matériel authentique examiné.',
      performedBy: 'consular_officer',
    },
    isLegible: true,
    isExpired: true,
    isCompliant: false,
    expiryDate: '2024-01-01',
  };
  const readinessWithExpiredPassport = buildDocumentReadinessSummary(
    [mockCanadaStudyFinding],
    actionPlanCanada,
    {
      destination: 'canada',
      visaType: 'etudiant',
      applicantFacts: { destination: 'canada', visaReason: 'etudes', hasPassport: true },
      uploadedDocuments: [expiredPassportUpload],
    }
  );
  const passportItem = readinessWithExpiredPassport.items.find((i) => i.id === 'DOC-PASSPORT');
  if (!passportItem) {
    return {
      passed: false,
      message: 'DOC-PASSPORT item not found in readinessWithExpiredPassport',
      details: null,
    };
  }
  if (passportItem.status === 'ready') {
    return {
      passed: false,
      message: 'DOC-PASSPORT was marked READY despite being non-compliant (expired)!',
      details: passportItem,
    };
  }
  if (passportItem.evidenceComplianceStatus !== 'non_compliant') {
    return {
      passed: false,
      message: `DOC-PASSPORT expected evidenceComplianceStatus non_compliant, got ${passportItem.evidenceComplianceStatus}`,
      details: passportItem,
    };
  }
  if (!passportItem.evidenceComplianceRuleIds.includes('RULE-PASSPORT-6-MONTH-VALIDITY')) {
    return {
      passed: false,
      message: 'DOC-PASSPORT did not link compliance rule RULE-PASSPORT-6-MONTH-VALIDITY',
      details: passportItem,
    };
  }
  if (!passportItem.complianceRationale || (!passportItem.complianceRationale.toLowerCase().includes('expir') && !passportItem.complianceRationale.toLowerCase().includes('validit'))) {
    return {
      passed: false,
      message: 'DOC-PASSPORT missing transparent complianceRationale explaining the regulatory breach',
      details: passportItem,
    };
  }

  // --------------------------------------------------------------------------
  // Audit Verification 6: V2.3.8 Deterministic Evidence Lifecycle Bridge (10 Scenarios)
  // --------------------------------------------------------------------------
  console.log('--- Running V2.3.8 Evidence Lifecycle 10-Scenario Audit ---');

  // Scenario 6.1: No Evidence Provided
  // Item remains missing or requires_clarification, lifecycleStage = not_provided
  const summaryNoEvidence = buildDocumentReadinessSummary(emptyFindings, emptyActionPlan, {
    destination: 'france',
    visaType: 'tourisme',
  });
  const passportNoEvidence = summaryNoEvidence.items.find((i) => i.id === 'DOC-PASSPORT');
  if (!passportNoEvidence || passportNoEvidence.lifecycleStage !== 'not_provided' || passportNoEvidence.status === 'ready') {
    return {
      passed: false,
      message: `Lifecycle Test 6.1 failed: Expected lifecycleStage 'not_provided' and status != 'ready', got stage '${passportNoEvidence?.lifecycleStage}', status '${passportNoEvidence?.status}'`,
      details: passportNoEvidence,
    };
  }

  // Scenario 6.2: Declaration Only (Applicant Fact)
  // Item remains requires_clarification, lifecycleStage = declared, NOT ready, isEvidenceDirectlyVerified = false
  const summaryDeclaredOnly = buildDocumentReadinessSummary(emptyFindings, emptyActionPlan, {
    destination: 'france',
    visaType: 'tourisme',
    applicantFacts: { hasPassport: true },
  });
  const passportDeclared = summaryDeclaredOnly.items.find((i) => i.id === 'DOC-PASSPORT');
  if (
    !passportDeclared ||
    passportDeclared.lifecycleStage !== 'declared' ||
    passportDeclared.status === 'ready' ||
    passportDeclared.isEvidenceDirectlyVerified === true ||
    passportDeclared.readinessEvidenceSource !== 'applicant_fact'
  ) {
    return {
      passed: false,
      message: `Lifecycle Test 6.2 failed: Declaration only must produce stage 'declared', source 'applicant_fact', and status != 'ready'`,
      details: passportDeclared,
    };
  }

  // Scenario 6.3: Uploaded but Not Verified
  // Item remains requires_clarification, lifecycleStage = uploaded, NOT ready, isEvidenceDirectlyVerified = false
  const summaryUploadedUnverified = buildDocumentReadinessSummary(emptyFindings, emptyActionPlan, {
    destination: 'france',
    visaType: 'tourisme',
    uploadedDocuments: [
      {
        id: 'UPL-PASS-UNVERIF-01',
        checklistKey: 'passport',
        fileName: 'passport_scan.pdf',
        isVerified: false,
      },
    ],
  });
  const passportUploadedUnverified = summaryUploadedUnverified.items.find((i) => i.id === 'DOC-PASSPORT');
  if (
    !passportUploadedUnverified ||
    passportUploadedUnverified.lifecycleStage !== 'uploaded' ||
    passportUploadedUnverified.status === 'ready' ||
    passportUploadedUnverified.isEvidenceDirectlyVerified === true ||
    passportUploadedUnverified.readinessEvidenceSource !== 'uploaded_document'
  ) {
    return {
      passed: false,
      message: `Lifecycle Test 6.3 failed: Uploaded unverified document must have stage 'uploaded', source 'uploaded_document', and status != 'ready'`,
      details: passportUploadedUnverified,
    };
  }

  // Scenario 6.4: Uploaded AND Verified, but Non-Compliant
  // Item cannot be ready (requires_clarification or missing), lifecycleStage = compliance_evaluated, complianceStatus = non_compliant
  const summaryVerifiedNonCompliant = buildDocumentReadinessSummary(emptyFindings, emptyActionPlan, {
    destination: 'france',
    visaType: 'tourisme',
    uploadedDocuments: [
      {
        id: 'UPL-PASS-EXPIRED-01',
        checklistKey: 'passport',
        fileName: 'expired_passport.pdf',
        isVerified: true,
        verificationStatus: 'verified',
        verificationMethod: 'document_review',
        verificationEventId: 'EVT-PASS-EXPIRED-64',
        verificationEvent: {
          id: 'EVT-PASS-EXPIRED-64',
          evidenceId: 'UPL-PASS-EXPIRED-01',
          outcome: 'verified',
          method: 'document_review',
          timestamp: '2026-09-13T09:00:00Z',
          rationale: 'Passeport matériel authentique examiné.',
          performedBy: 'consular_officer',
        },
        isExpired: true,
        isCompliant: false,
        expiryDate: '2023-01-01',
      },
    ],
  });
  const passportVerifiedNonCompliant = summaryVerifiedNonCompliant.items.find((i) => i.id === 'DOC-PASSPORT');
  if (
    !passportVerifiedNonCompliant ||
    passportVerifiedNonCompliant.lifecycleStage !== 'compliance_evaluated' ||
    passportVerifiedNonCompliant.status === 'ready' ||
    passportVerifiedNonCompliant.evidenceComplianceStatus !== 'non_compliant'
  ) {
    return {
      passed: false,
      message: `Lifecycle Test 6.4 failed: Verified but non-compliant document must have stage 'compliance_evaluated', non_compliant status, and status != 'ready'`,
      details: passportVerifiedNonCompliant,
    };
  }

  // Scenario 6.5: Uploaded, Verified, AND Compliant
  // Item transitions to READY, lifecycleStage = ready, isEvidenceDirectlyVerified = true, complianceStatus = compliant
  const summaryVerifiedCompliant = buildDocumentReadinessSummary(emptyFindings, emptyActionPlan, {
    destination: 'france',
    visaType: 'tourisme',
    uploadedDocuments: [
      {
        id: 'UPL-PASS-COMPLIANT-01',
        checklistKey: 'passport',
        fileName: 'passport_valid_10yrs.pdf',
        isVerified: true,
        verificationStatus: 'verified',
        verificationMethod: 'official_source_match',
        verificationEventId: 'EVT-PASS-COMPLIANT-65',
        verificationEvent: {
          id: 'EVT-PASS-COMPLIANT-65',
          evidenceId: 'UPL-PASS-COMPLIANT-01',
          outcome: 'verified',
          method: 'official_source_match',
          timestamp: '2026-09-13T09:00:00Z',
          rationale: 'Passeport biométrique validé via base officielle.',
          performedBy: 'consular_officer',
        },
        isLegible: true,
        isExpired: false,
        isCompliant: true,
        expiryDate: '2032-12-31',
      },
    ],
  });
  const passportVerifiedCompliant = summaryVerifiedCompliant.items.find((i) => i.id === 'DOC-PASSPORT');
  if (
    !passportVerifiedCompliant ||
    passportVerifiedCompliant.lifecycleStage !== 'ready' ||
    passportVerifiedCompliant.status !== 'ready' ||
    passportVerifiedCompliant.isEvidenceDirectlyVerified !== true ||
    passportVerifiedCompliant.evidenceComplianceStatus !== 'compliant' ||
    passportVerifiedCompliant.readinessEvidenceSource !== 'verified_document'
  ) {
    return {
      passed: false,
      message: `Lifecycle Test 6.5 failed: Verified and compliant document must transition to READY with stage 'ready'`,
      details: passportVerifiedCompliant,
    };
  }

  // Scenario 6.6: Stale READY Detection
  // If compliant evidence becomes non-compliant, document immediately transitions out of READY
  let threwOnStaleReady = false;
  try {
    const staleCopy = JSON.parse(JSON.stringify(summaryVerifiedCompliant));
    const staleItem = staleCopy.items.find((i: any) => i.id === 'DOC-PASSPORT');
    staleItem.evidenceRecord.complianceStatus = 'non_compliant';
    staleItem.evidenceRecord.isCompliant = false;
    validateDocumentReadinessSummary(staleCopy);
  } catch (err) {
    threwOnStaleReady = true;
  }
  if (!threwOnStaleReady) {
    return {
      passed: false,
      message: 'Lifecycle Test 6.6 failed: Validator did not reject stale READY with non-compliant evidence record!',
      details: null,
    };
  }

  // Scenario 6.7: Direct Attempt to Produce READY with Source uploaded_document
  let threwOnUploadedDocumentReady = false;
  try {
    const invalidSourceCopy = JSON.parse(JSON.stringify(summaryVerifiedCompliant));
    const targetItem = invalidSourceCopy.items.find((i: any) => i.id === 'DOC-PASSPORT');
    targetItem.status = 'ready';
    targetItem.readinessEvidenceSource = 'uploaded_document';
    validateDocumentReadinessSummary(invalidSourceCopy);
  } catch (err) {
    threwOnUploadedDocumentReady = true;
  }
  if (!threwOnUploadedDocumentReady) {
    return {
      passed: false,
      message: 'Lifecycle Test 6.7 failed: Validator did not reject READY with source uploaded_document!',
      details: null,
    };
  }

  // Scenario 6.8: Direct Attempt to Produce READY with Source generated_artifact
  let threwOnGeneratedArtifactReady = false;
  try {
    const invalidArtifactCopy = JSON.parse(JSON.stringify(summaryVerifiedCompliant));
    const targetItem = invalidArtifactCopy.items.find((i: any) => i.id === 'DOC-PASSPORT');
    targetItem.status = 'ready';
    targetItem.readinessEvidenceSource = 'generated_artifact';
    validateDocumentReadinessSummary(invalidArtifactCopy);
  } catch (err) {
    threwOnGeneratedArtifactReady = true;
  }
  if (!threwOnGeneratedArtifactReady) {
    return {
      passed: false,
      message: 'Lifecycle Test 6.8 failed: Validator did not reject READY with source generated_artifact!',
      details: null,
    };
  }

  // Scenario 6.9: Not-Applicable Document Receiving Evidence
  // Even if uploaded and verified, receives NO readiness status (status = undefined, applicability = not_applicable)
  const summaryNotAppWithEvidence = buildDocumentReadinessSummary(emptyFindings, emptyActionPlan, {
    destination: 'canada',
    visaType: 'etudiant',
    applicantFacts: { destination: 'canada', visaReason: 'etudes' },
    uploadedDocuments: [
      {
        id: 'UPL-INSURANCE-CANADA-01',
        checklistKey: 'travel_insurance',
        fileName: 'schengen_insurance.pdf',
        isVerified: true,
        verificationStatus: 'verified',
        verificationMethod: 'document_review',
        verificationEventId: 'EVT-INS-69',
        verificationEvent: {
          id: 'EVT-INS-69',
          evidenceId: 'UPL-INSURANCE-CANADA-01',
          outcome: 'verified',
          method: 'document_review',
          timestamp: '2026-09-13T09:00:00Z',
          rationale: 'Attestation examinée.',
          performedBy: 'consular_officer',
        },
        isCompliant: true,
      },
    ],
  });
  const insuranceNotApp = summaryNotAppWithEvidence.items.find((i) => i.id === 'DOC-TRAVEL-INSURANCE');
  if (
    !insuranceNotApp ||
    insuranceNotApp.applicability !== 'not_applicable' ||
    insuranceNotApp.status !== undefined
  ) {
    return {
      passed: false,
      message: `Lifecycle Test 6.9 failed: Not-applicable document with uploaded verified evidence must have status=undefined and applicability='not_applicable'`,
      details: insuranceNotApp,
    };
  }
  if (summaryNotAppWithEvidence.readyCount > 0) {
    return {
      passed: false,
      message: 'Lifecycle Test 6.9 failed: Not-applicable document must NOT increment readyCount!',
      details: summaryNotAppWithEvidence,
    };
  }

  // Scenario 6.10: Dynamic Item with recommendedEvidence Starts at not_provided
  const mockRecFinding: AssessmentFinding = {
    id: 'FIND-DYNAMIC-TEST-01',
    pillarId: 'financial_sufficiency',
    type: 'compliance_issue',
    title: 'Justificatif de ressources complémentaires requis',
    declaredFact: 'Ressources non stabilisées',
    findingRationale: 'Ressources insuffisantes nécessitant un garant complémentaire.',
    suggestedAction: 'Joindre la lettre d’engagement du garant.',
    isDirectBlocker: false,
    recommendedEvidence: [
      {
        relatedChecklistKey: 'custom_guarantor_engagement',
        documentName: 'Lettre d’engagement du garant financier',
        consularUtility: 'Prouve la prise en charge financière des frais de séjour.',
        targetPillar: 'financial_sufficiency',
        category: 'mandatory_by_regulation',
      },
    ],
    priorityEligibility: { eligible: true, weight: 'high' },
  };
  const summaryDynamic = buildDocumentReadinessSummary(
    [mockRecFinding],
    buildActionPlanSummary([mockRecFinding])
  );
  const dynamicItem = summaryDynamic.items.find((i) => i.id === 'DOC-REC-CUSTOM_GUARANTOR_ENGAGEMENT');
  if (!dynamicItem || dynamicItem.lifecycleStage !== 'not_provided' || dynamicItem.status === 'ready') {
    return {
      passed: false,
      message: 'Lifecycle Test 6.10 failed: Dynamic item must initialize with lifecycleStage not_provided and status != ready',
      details: dynamicItem,
    };
  }

  // --------------------------------------------------------------------------
  // Audit Verification 7: Canadian Study Permit Mission Scenario
  // --------------------------------------------------------------------------
  console.log('--- Running Canadian Study Permit Mission Scenario ---');
  // Destination: Canada, Reason: Study
  // 1. Admission letter: verified, DLI recognized, compliant -> READY
  // 2. PAL: declared, not uploaded -> DECLARED
  // 3. Bank statements: uploaded, not verified -> UPLOADED
  // 4. Passport: verified, valid > 6 months -> READY
  // 5. Study Plan: generated deliverable -> isolated in deliverablesSummary, NOT in checklist items
  const caStudyAdmissionUpload: ExplicitUploadedDocument = {
    id: 'UPL-CA-STUDY-ADMISSION-01',
    checklistKey: 'admission_letter',
    fileName: 'mcgill_official_acceptance_loa.pdf',
    isVerified: true,
    verificationStatus: 'verified',
    verificationMethod: 'official_source_match',
    verificationEventId: 'EVT-CA-STUDY-ADMISSION-01',
    verificationEvent: {
      id: 'EVT-CA-STUDY-ADMISSION-01',
      evidenceId: 'UPL-CA-STUDY-ADMISSION-01',
      outcome: 'verified',
      method: 'official_source_match',
      timestamp: '2026-09-13T09:00:00Z',
      rationale: 'Lettre d’admission McGill authentifiée sur le portail DLI officiel.',
      performedBy: 'consular_officer',
    },
    isLegible: true,
    isCompliant: true,
    isInstitutionRecognized: true,
  };

  const caStudyPassportUpload: ExplicitUploadedDocument = {
    id: 'UPL-CA-STUDY-PASSPORT-01',
    checklistKey: 'passport',
    fileName: 'canadian_visa_passport_valid.pdf',
    isVerified: true,
    verificationStatus: 'verified',
    verificationMethod: 'official_source_match',
    verificationEventId: 'EVT-CA-STUDY-PASSPORT-01',
    verificationEvent: {
      id: 'EVT-CA-STUDY-PASSPORT-01',
      evidenceId: 'UPL-CA-STUDY-PASSPORT-01',
      outcome: 'verified',
      method: 'official_source_match',
      timestamp: '2026-09-13T09:00:00Z',
      rationale: 'Passeport biométrique validé.',
      performedBy: 'consular_officer',
    },
    isLegible: true,
    isCompliant: true,
    isExpired: false,
    expiryDate: '2029-08-15',
  };

  const caStudyBankUpload: ExplicitUploadedDocument = {
    id: 'UPL-CA-STUDY-BANK-01',
    checklistKey: 'bank_statements',
    fileName: 'attestation_solde_non_verifiee.pdf',
    isVerified: false,
    isLegible: true,
  };

  const caStudyFindings: AssessmentFinding[] = [];
  const caStudyActionPlan = buildActionPlanSummary(caStudyFindings);
  const caStudySummary = buildDocumentReadinessSummary(caStudyFindings, caStudyActionPlan, {
    destination: 'canada',
    visaType: 'etudiant',
    applicantFacts: {
      destination: 'canada',
      visaReason: 'etudes',
      hasPassport: true,
      hasUniversityAdmissionLetter: true,
      hasPalCaq: true, // Declared PAL!
    },
    uploadedDocuments: [
      caStudyAdmissionUpload,
      caStudyPassportUpload,
      caStudyBankUpload,
    ],
    deliverables: [
      {
        id: 'DELIV-STUDY-PLAN-01',
        title: 'Plan d’études pour le Canada',
        type: 'study_plan',
      },
    ],
  });

  // Verify Canadian Study Permit Counts and Metrics
  if (caStudySummary.totalApplicableCount !== 4) {
    return {
      passed: false,
      message: `Canada Study Scenario failed: Expected 4 applicable items (Admission, PAL, Bank, Passport), got ${caStudySummary.totalApplicableCount}. Items: ${caStudySummary.applicableItems.map((i) => i.id).join(', ')}`,
      details: caStudySummary.applicableItems,
    };
  }

  if (caStudySummary.readyCount !== 2) {
    return {
      passed: false,
      message: `Canada Study Scenario failed: Expected exactly 2 READY items (Admission & Passport), got ${caStudySummary.readyCount}. Ready items: ${caStudySummary.itemsByStatus.ready.map((i) => i.id).join(', ')}`,
      details: caStudySummary,
    };
  }

  if (caStudySummary.clarificationCount !== 2) {
    return {
      passed: false,
      message: `Canada Study Scenario failed: Expected exactly 2 REQUIRES_CLARIFICATION items (PAL & Bank), got ${caStudySummary.clarificationCount}`,
      details: caStudySummary,
    };
  }

  if (caStudySummary.missingCount !== 0) {
    return {
      passed: false,
      message: `Canada Study Scenario failed: Expected 0 missing items, got ${caStudySummary.missingCount}`,
      details: caStudySummary,
    };
  }

  // Verify Specific Items
  const caAdmission = caStudySummary.applicableItems.find((i) => i.id === 'DOC-ADMISSION-LETTER');
  if (!caAdmission || caAdmission.status !== 'ready' || caAdmission.lifecycleStage !== 'ready' || !caAdmission.isEvidenceDirectlyVerified) {
    return {
      passed: false,
      message: `Canada Study Scenario failed: Admission Letter must be READY with stage 'ready'`,
      details: caAdmission,
    };
  }

  const caPassport = caStudySummary.applicableItems.find((i) => i.id === 'DOC-PASSPORT');
  if (!caPassport || caPassport.status !== 'ready' || caPassport.lifecycleStage !== 'ready' || !caPassport.isEvidenceDirectlyVerified) {
    return {
      passed: false,
      message: `Canada Study Scenario failed: Passport must be READY with stage 'ready'`,
      details: caPassport,
    };
  }

  const caPal = caStudySummary.applicableItems.find((i) => i.id === 'DOC-PAL-CAQ');
  if (!caPal || caPal.status !== 'requires_clarification' || caPal.lifecycleStage !== 'declared' || caPal.isEvidenceDirectlyVerified) {
    return {
      passed: false,
      message: `Canada Study Scenario failed: PAL must be declared (status: requires_clarification, stage: declared, unverified)`,
      details: caPal,
    };
  }

  const caBank = caStudySummary.applicableItems.find((i) => i.id === 'DOC-BANK-STATEMENTS');
  if (!caBank || caBank.status !== 'requires_clarification' || caBank.lifecycleStage !== 'uploaded' || caBank.isEvidenceDirectlyVerified) {
    return {
      passed: false,
      message: `Canada Study Scenario failed: Bank Statements must be uploaded (status: requires_clarification, stage: uploaded, unverified)`,
      details: caBank,
    };
  }

  // Verify Stage Counts
  if (
    caStudySummary.stageCounts?.ready !== 2 ||
    caStudySummary.stageCounts?.uploaded !== 1 ||
    caStudySummary.stageCounts?.declared !== 1 ||
    caStudySummary.stageCounts?.not_provided !== 0
  ) {
    return {
      passed: false,
      message: `Canada Study Scenario failed: Stage counts mismatch. Expected {ready: 2, uploaded: 1, declared: 1, not_provided: 0}, got: ${JSON.stringify(caStudySummary.stageCounts)}`,
      details: caStudySummary.stageCounts,
    };
  }

  // Verify Deliverable Isolation
  if (
    !caStudySummary.deliverablesSummary ||
    caStudySummary.deliverablesSummary.items.length === 0 ||
    !caStudySummary.deliverablesSummary.items.some((d) => d.id === 'DELIV-STUDY-PLAN-01' || d.artifactType === 'study_plan' || (d as any).type === 'study_plan')
  ) {
    return {
      passed: false,
      message: 'Canada Study Scenario failed: Study Plan must be present in deliverablesSummary',
      details: caStudySummary.deliverablesSummary,
    };
  }

  for (const item of caStudySummary.items) {
    if (item.id.includes('STUDY-PLAN') || item.readinessEvidenceSource === 'generated_artifact') {
      return {
        passed: false,
        message: `Canada Study Scenario failed: Study Plan deliverable leaked into applicant checklist items! Item: ${item.id}`,
        details: item,
      };
    }
  }

  // --------------------------------------------------------------------------
  // Audit Verification 8: Adversarial Suite Across 200 Scenarios
  // --------------------------------------------------------------------------
  const scenarios = generate100Scenarios();
  let totalApplicableGenerated = 0;
  let totalNotApplicableGenerated = 0;
  let totalReadyCount = 0;
  let totalMissingCount = 0;
  let totalClarificationCount = 0;
  let totalOptionalCount = 0;
  let totalVerifiedCount = 0;
  let totalCompliantCount = 0;
  let totalNonCompliantCount = 0;

  for (const s of scenarios) {
    const assessment = evaluateConsularProfile(s.payload, String(s.id));
    const findings = (Object.values(assessment.pillars) as any[]).flatMap((p) => p.findings as AssessmentFinding[]);
    const actionPlan = buildActionPlanSummary(findings);
    const readiness = buildDocumentReadinessSummary(findings, actionPlan);

    totalApplicableGenerated += readiness.applicableItems.length;
    totalNotApplicableGenerated += readiness.notApplicableItems.length;
    totalReadyCount += readiness.readyCount;
    totalMissingCount += readiness.missingCount;
    totalClarificationCount += readiness.clarificationCount;
    totalOptionalCount += readiness.optionalCount;
    totalVerifiedCount += readiness.verifiedCount;
    totalCompliantCount += readiness.compliantCount;
    totalNonCompliantCount += readiness.nonCompliantCount;

    // Invariant 1: Sum of status counts must equal applicable count
    const sumStatuses = readiness.readyCount + readiness.missingCount + readiness.clarificationCount + readiness.optionalCount;
    if (sumStatuses !== readiness.applicableItems.length || sumStatuses !== readiness.totalApplicableCount) {
      return {
        passed: false,
        message: `Invariant 1 violation in scenario ${s.id}: sum of statuses (${sumStatuses}) != applicable count (${readiness.totalApplicableCount})`,
        details: readiness,
      };
    }

    // Invariant 2: Total items matches applicable + notApplicable
    if (readiness.items.length !== (readiness.applicableItems.length + readiness.notApplicableItems.length)) {
      return {
        passed: false,
        message: `Invariant 2 violation in scenario ${s.id}: items.length != applicable + notApplicable`,
        details: readiness,
      };
    }

    // Invariant V2.3.7 Metrics: Verification & Compliance sums match applicable items
    const sumVerification = readiness.verifiedCount + readiness.unverifiedCount;
    if (sumVerification !== readiness.totalApplicableCount) {
      return {
        passed: false,
        message: `Invariant V2.3.7 violation in scenario ${s.id}: verified (${readiness.verifiedCount}) + unverified (${readiness.unverifiedCount}) != totalApplicable (${readiness.totalApplicableCount})`,
        details: readiness,
      };
    }

    const sumCompliance = readiness.compliantCount + readiness.nonCompliantCount + readiness.compliancePendingCount;
    if (sumCompliance !== readiness.totalApplicableCount) {
      return {
        passed: false,
        message: `Invariant V2.3.7 violation in scenario ${s.id}: compliant (${readiness.compliantCount}) + nonCompliant (${readiness.nonCompliantCount}) + pending (${readiness.compliancePendingCount}) != totalApplicable (${readiness.totalApplicableCount})`,
        details: readiness,
      };
    }

    // Invariant 3: Auditability and evidence source distinction for every item
    for (const item of readiness.items) {
      if (!Array.isArray(item.sourceFindingIds) || !Array.isArray(item.sourceActionIds)) {
        return {
          passed: false,
          message: `Invariant 3 violation in scenario ${s.id}: item ${item.id} missing source arrays`,
          details: item,
        };
      }

      // If not_applicable, status must be undefined
      if (item.applicability === 'not_applicable') {
        if (item.status !== undefined) {
          return {
            passed: false,
            message: `Invariant 4 violation in scenario ${s.id}: not_applicable item ${item.id} has status ${item.status}`,
            details: item,
          };
        }
      }

      // Invariant V2.3.7: Every applicable item must have deterministic compliance attributes
      if (item.applicability !== 'not_applicable') {
        if (!item.evidenceComplianceStatus) {
          return {
            passed: false,
            message: `Invariant V2.3.7 violation in scenario ${s.id}: item ${item.id} missing evidenceComplianceStatus`,
            details: item,
          };
        }
        if (!Array.isArray(item.evidenceComplianceRuleIds)) {
          return {
            passed: false,
            message: `Invariant V2.3.7 violation in scenario ${s.id}: item ${item.id} missing evidenceComplianceRuleIds array`,
            details: item,
          };
        }
      }

      // Formal V2.3.7 Invariant: READY = APPLICABLE ∧ PROVEN ∧ VERIFIED ∧ COMPLIANT
      if (item.status === 'ready') {
        if (item.applicability === 'not_applicable') {
          return {
            passed: false,
            message: `Formal Invariant violation in scenario ${s.id}: Item ${item.id} is READY but NOT APPLICABLE!`,
            details: item,
          };
        }
        if (!item.readinessEvidenceSource || item.readinessEvidenceIds.length === 0) {
          return {
            passed: false,
            message: `Formal Invariant violation in scenario ${s.id}: Item ${item.id} is READY without explicit evidence (PROVEN check failed)!`,
            details: item,
          };
        }
        if (item.isEvidenceDirectlyVerified !== true) {
          return {
            passed: false,
            message: `Formal Invariant violation in scenario ${s.id}: Item ${item.id} is READY but isEvidenceDirectlyVerified is NOT true!`,
            details: item,
          };
        }
        if (item.evidenceComplianceStatus !== 'compliant') {
          return {
            passed: false,
            message: `Formal Invariant violation in scenario ${s.id}: Item ${item.id} is READY but evidenceComplianceStatus is NOT compliant (${item.evidenceComplianceStatus})!`,
            details: item,
          };
        }
        if (item.readinessEvidenceSource === 'generated_artifact') {
          return {
            passed: false,
            message: `Formal Invariant violation in scenario ${s.id}: Item ${item.id} in applicant checklist has generated_artifact source!`,
            details: item,
          };
        }
      }
    }
  }

  console.log(`Audit Success! Processed ${scenarios.length} scenarios:`);
  console.log(`Total applicable items: ${totalApplicableGenerated}, Not applicable: ${totalNotApplicableGenerated}`);
  console.log(`Ready: ${totalReadyCount}, Missing: ${totalMissingCount}, Clarification: ${totalClarificationCount}, Optional: ${totalOptionalCount}`);
  console.log(`Verified items: ${totalVerifiedCount}, Compliant items: ${totalCompliantCount}, Non-Compliant items: ${totalNonCompliantCount}`);

  // --------------------------------------------------------------------------
  // Audit Verification 9: Evidence-Backed Realistic Applicant Lifecycle Across 50 Scenarios
  // --------------------------------------------------------------------------
  console.log('--- Running Evidence-Backed Realistic Applicant Lifecycle Audit (50 Scenarios) ---');
  let evidenceBackedReadyCount = 0;
  let evidenceBackedVerifiedCount = 0;
  let evidenceBackedCompliantCount = 0;
  let evidenceBackedNonCompliantCount = 0;
  let evidenceBackedApplicableCount = 0;

  for (let i = 0; i < 50; i++) {
    const s = scenarios[i];
    const assessment = evaluateConsularProfile(s.payload, `evidence-${s.id}`);
    const findings = (Object.values(assessment.pillars) as any[]).flatMap((p) => p.findings as AssessmentFinding[]);
    const actionPlan = buildActionPlanSummary(findings);

    // Create realistic evidence context according to test partition
    const uploadedDocs: ExplicitUploadedDocument[] = [];
    const applicantFacts: Record<string, any> = { ...s.payload };

    if (i < 20) {
      // Partition A: Fully verified and compliant documents
      uploadedDocs.push({
        id: `UPL-AUDIT-PASS-${i}`,
        checklistKey: 'passport',
        fileName: `verified_passport_${i}.pdf`,
        isVerified: true,
        verificationStatus: 'verified',
        verificationMethod: 'official_source_match',
        verificationEventId: `EVT-VERIF-PASS-${i}`,
        verificationEvent: {
          id: `EVT-VERIF-PASS-${i}`,
          evidenceId: `UPL-AUDIT-PASS-${i}`,
          outcome: 'verified',
          method: 'official_source_match',
          timestamp: '2026-09-13T09:00:00Z',
          rationale: 'Passeport biométrique authentifié auprès du registre consulaire officiel.',
          performedBy: 'consular_officer',
        },
        isLegible: true,
        isExpired: false,
        isCompliant: true,
        expiryDate: '2030-01-01',
      });
      uploadedDocs.push({
        id: `UPL-AUDIT-BANK-${i}`,
        checklistKey: 'bank_statements',
        fileName: `verified_bank_${i}.pdf`,
        isVerified: true,
        verificationStatus: 'verified',
        verificationMethod: 'structured_validation',
        verificationEventId: `EVT-VERIF-BANK-${i}`,
        verificationEvent: {
          id: `EVT-VERIF-BANK-${i}`,
          evidenceId: `UPL-AUDIT-BANK-${i}`,
          outcome: 'verified',
          method: 'structured_validation',
          timestamp: '2026-09-13T09:05:00Z',
          rationale: 'Relevés bancaires certifiés avec cachet humide et solde vérifié.',
          performedBy: 'consular_officer',
        },
        isLegible: true,
        isCompliant: true,
      });
    } else if (i < 30) {
      // Partition B: Verified passport + unverified bank statements
      uploadedDocs.push({
        id: `UPL-AUDIT-PASS-${i}`,
        checklistKey: 'passport',
        fileName: `verified_passport_${i}.pdf`,
        isVerified: true,
        verificationStatus: 'verified',
        verificationMethod: 'official_source_match',
        verificationEventId: `EVT-VERIF-PASS-${i}`,
        verificationEvent: {
          id: `EVT-VERIF-PASS-${i}`,
          evidenceId: `UPL-AUDIT-PASS-${i}`,
          outcome: 'verified',
          method: 'official_source_match',
          timestamp: '2026-09-13T09:00:00Z',
          rationale: 'Passeport biométrique authentifié auprès du registre consulaire officiel.',
          performedBy: 'consular_officer',
        },
        isLegible: true,
        isExpired: false,
        isCompliant: true,
        expiryDate: '2030-01-01',
      });
      uploadedDocs.push({
        id: `UPL-AUDIT-BANK-${i}`,
        checklistKey: 'bank_statements',
        fileName: `unverified_bank_${i}.pdf`,
        isVerified: false,
        verificationStatus: 'not_verified',
        isLegible: true,
      });
    } else if (i < 40) {
      // Partition C: Verified but NON-COMPLIANT documents (expired passport)
      uploadedDocs.push({
        id: `UPL-AUDIT-PASS-EXPIRED-${i}`,
        checklistKey: 'passport',
        fileName: `expired_passport_${i}.pdf`,
        isVerified: true,
        verificationStatus: 'verified',
        verificationMethod: 'document_review',
        verificationEventId: `EVT-VERIF-PASS-EXPIRED-${i}`,
        verificationEvent: {
          id: `EVT-VERIF-PASS-EXPIRED-${i}`,
          evidenceId: `UPL-AUDIT-PASS-EXPIRED-${i}`,
          outcome: 'verified',
          method: 'document_review',
          timestamp: '2026-09-13T09:00:00Z',
          rationale: 'Passeport matériel authentique examiné.',
          performedBy: 'consular_officer',
        },
        isExpired: true,
        isCompliant: false,
        expiryDate: '2022-01-01',
      });
    } else {
      // Partition D: Applicant facts only (no uploads)
      applicantFacts.hasPassport = true;
      applicantFacts.hasCertifiedBankStatements = true;
    }

    const readiness = buildDocumentReadinessSummary(findings, actionPlan, {
      destination: s.payload.destination,
      visaType: s.payload.visaReason,
      applicantFacts,
      uploadedDocuments: uploadedDocs,
    });

    // Invariant validation on every summary
    validateComplianceInvariant(readiness);

    evidenceBackedReadyCount += readiness.readyCount;
    evidenceBackedVerifiedCount += readiness.verifiedCount;
    evidenceBackedCompliantCount += readiness.compliantCount;
    evidenceBackedNonCompliantCount += readiness.nonCompliantCount;
    evidenceBackedApplicableCount += readiness.totalApplicableCount;

    if (i < 20) {
      // Must have ready documents
      if (readiness.readyCount < 1) {
        return {
          passed: false,
          message: `Evidence Lifecycle Audit failed at scenario ${i}: Partition A expected readyCount >= 1, got 0`,
          details: readiness,
        };
      }
    } else if (i >= 30 && i < 40) {
      // Non-compliant partition: must not be ready
      const passportItem = readiness.applicableItems.find((item) => item.id === 'DOC-PASSPORT');
      if (passportItem && passportItem.status === 'ready') {
        return {
          passed: false,
          message: `Evidence Lifecycle Audit failed at scenario ${i}: Partition C expired passport marked READY!`,
          details: passportItem,
        };
      }
    }
  }

  console.log(`Evidence-Backed Audit Success across 50 scenarios:`);
  console.log(`Total Applicable: ${evidenceBackedApplicableCount}, Ready: ${evidenceBackedReadyCount}, Verified: ${evidenceBackedVerifiedCount}, Compliant: ${evidenceBackedCompliantCount}, Non-Compliant: ${evidenceBackedNonCompliantCount}`);

  if (evidenceBackedReadyCount === 0 || evidenceBackedVerifiedCount === 0) {
    return {
      passed: false,
      message: `Evidence Lifecycle Audit failed: Expected evidenceBackedReadyCount > 0 and evidenceBackedVerifiedCount > 0, got ready=${evidenceBackedReadyCount}, verified=${evidenceBackedVerifiedCount}`,
      details: null,
    };
  }

  // --------------------------------------------------------------------------
  // Audit Verification 10: V2.3.9 Evidence Integrity & Verification Provenance Layer (15 Tests)
  // --------------------------------------------------------------------------
  const v239Result = runEvidenceIntegrityAndVerificationAudit();
  if (!v239Result.passed) {
    return v239Result;
  }

  return {
    passed: true,
    message: `All V2.3.9 deterministic evidence integrity invariants and verification provenance bridges passed across 200 baseline + 50 evidence-backed scenarios + 15 verification audit tests. Baseline Ready: ${totalReadyCount}, Evidence-Backed Ready: ${evidenceBackedReadyCount}, Verified: ${evidenceBackedVerifiedCount}, Compliant: ${evidenceBackedCompliantCount}.`,
    details: {
      scenariosCount: scenarios.length + 50,
      totalApplicableGenerated,
      totalNotApplicableGenerated,
      baselineReadyCount: totalReadyCount,
      evidenceBackedReadyCount,
      evidenceBackedVerifiedCount,
      evidenceBackedCompliantCount,
      evidenceBackedNonCompliantCount,
      verificationAuditTests: 15,
    },
  };
}

/**
 * Suite formelle de 15 tests unitaires et d'invariants pour la couche V2.3.9
 * d'intégrité et de traçabilité des preuves (Evidence Integrity & Verification Audit Layer).
 */
export function runEvidenceIntegrityAndVerificationAudit(): { passed: boolean; message: string; details: any } {
  console.log('\n--- Starting V2.3.9 Evidence Integrity & Verification Audit Layer (15 Tests) ---');

  const assessment = evaluateConsularProfile(
    {
      destination: 'france',
      visaReason: 'tourisme_visite',
      countryOfOrigin: 'Sénégal',
      status: 'salarie',
      fundingSource: 'autofinancement',
      availableBudgetFcfa: 3000000,
      hasRecentLumpDeposit: false,
      tiesType: 'contrat_cdi',
      accommodationType: 'hotel_confirme',
      hasPassport6MonthsValid: true,
      hasPreviousRefusal: false,
      travelDurationDays: 14,
    } as any,
    'test-audit-v239'
  );
  const findings = (Object.values(assessment.pillars) as any[]).flatMap((p) => p.findings as AssessmentFinding[]);
  const actionPlan = buildActionPlanSummary(findings);

  // --------------------------------------------------------------------------
  // TEST 1: Uploaded document without verification event -> NOT VERIFIED, NOT READY
  // --------------------------------------------------------------------------
  {
    const uploadedDocs: ExplicitUploadedDocument[] = [
      {
        id: 'UPL-T1-PASS',
        checklistKey: 'passport',
        fileName: 'unverified_pass.pdf',
        isVerified: true, // Claiming isVerified without verificationEvent
        isLegible: true,
        isExpired: false,
        isCompliant: true,
        expiryDate: '2030-01-01',
      },
    ];

    const summary = buildDocumentReadinessSummary(findings, actionPlan, {
      destination: 'france',
      visaType: 'tourisme',
      uploadedDocuments: uploadedDocs,
    });

    const passItem = summary.items.find((i) => i.id === 'DOC-PASSPORT')!;
    if (passItem.isEvidenceDirectlyVerified === true) {
      return {
        passed: false,
        message: 'TEST 1 FAILED: Upload without verification event was marked isEvidenceDirectlyVerified=true!',
        details: passItem,
      };
    }
    if (passItem.status === 'ready') {
      return {
        passed: false,
        message: 'TEST 1 FAILED: Upload without verification event was marked READY!',
        details: passItem,
      };
    }
    if (passItem.lifecycleStage === 'ready') {
      return {
        passed: false,
        message: 'TEST 1 FAILED: Upload without verification event reached lifecycleStage ready!',
        details: passItem,
      };
    }
    console.log('  ✓ Test 1 Passed: Uploaded document without verification event -> NOT VERIFIED, NOT READY');
  }

  // --------------------------------------------------------------------------
  // TEST 2: Uploaded document with valid verification event -> VERIFIED, READY (if compliant)
  // --------------------------------------------------------------------------
  {
    const validEvent: EvidenceVerificationEvent = {
      id: 'EVT-T2-PASS',
      evidenceId: 'UPL-T2-PASS',
      outcome: 'verified',
      method: 'official_source_match',
      timestamp: '2026-09-13T09:00:00Z',
      rationale: 'Passeport biométrique validé via base officielle du ministère.',
      performedBy: 'consular_officer',
    };

    const uploadedDocs: ExplicitUploadedDocument[] = [
      {
        id: 'UPL-T2-PASS',
        checklistKey: 'passport',
        fileName: 'verified_pass.pdf',
        isVerified: true,
        verificationStatus: 'verified',
        verificationMethod: 'official_source_match',
        verificationEventId: 'EVT-T2-PASS',
        verificationEvent: validEvent,
        isLegible: true,
        isExpired: false,
        isCompliant: true,
        complianceStatus: 'compliant', // Explicit compliance evaluation step
        expiryDate: '2030-01-01',
      },
    ];

    const summary = buildDocumentReadinessSummary(findings, actionPlan, {
      destination: 'france',
      visaType: 'tourisme',
      uploadedDocuments: uploadedDocs,
    });

    const passItem = summary.items.find((i) => i.id === 'DOC-PASSPORT')!;
    if (passItem.isEvidenceDirectlyVerified !== true) {
      return {
        passed: false,
        message: 'TEST 2 FAILED: Upload with valid verification event was NOT verified!',
        details: passItem,
      };
    }
    if (passItem.evidenceComplianceStatus !== 'compliant') {
      return {
        passed: false,
        message: 'TEST 2 FAILED: Upload was not marked compliant!',
        details: passItem,
      };
    }
    if (passItem.status !== 'ready') {
      return {
        passed: false,
        message: 'TEST 2 FAILED: Valid verified and compliant upload was not marked READY!',
        details: passItem,
      };
    }
    if (passItem.lifecycleStage !== 'ready') {
      return {
        passed: false,
        message: 'TEST 2 FAILED: Valid verified upload lifecycleStage is not ready!',
        details: passItem,
      };
    }
    if (!passItem.verificationProvenanceChain || !passItem.verificationProvenanceChain.isReady) {
      return {
        passed: false,
        message: 'TEST 2 FAILED: verificationProvenanceChain missing or isReady is false!',
        details: passItem,
      };
    }
    console.log('  ✓ Test 2 Passed: Uploaded document with valid verification event -> VERIFIED, READY (explicit compliance confirmed)');
  }

  // --------------------------------------------------------------------------
  // TEST 2-NEG: Paired Negative Test - UPLOADED + VALID VERIFICATION EVENT + NO COMPLIANCE EVALUATION = NOT READY
  // Proves VERIFIED ≠ COMPLIANT, and VERIFIED + UNASSESSED ≠ READY
  // --------------------------------------------------------------------------
  {
    const validEvent: EvidenceVerificationEvent = {
      id: 'EVT-T2-NEG-PASS',
      evidenceId: 'UPL-T2-NEG-PASS',
      outcome: 'verified',
      method: 'official_source_match',
      timestamp: '2026-09-13T09:00:00Z',
      rationale: 'Passeport biométrique validé via base officielle du ministère.',
      performedBy: 'consular_officer',
    };

    const uploadedDocsUnassessed: ExplicitUploadedDocument[] = [
      {
        id: 'UPL-T2-NEG-PASS',
        checklistKey: 'passport',
        fileName: 'verified_unassessed_pass.pdf',
        isVerified: true,
        verificationStatus: 'verified',
        verificationMethod: 'official_source_match',
        verificationEventId: 'EVT-T2-NEG-PASS',
        verificationEvent: validEvent,
        isLegible: true,
        complianceStatus: 'not_evaluated', // EXPLICITLY NOT EVALUATED FOR COMPLIANCE
      },
    ];

    const summaryNeg = buildDocumentReadinessSummary(findings, actionPlan, {
      destination: 'france',
      visaType: 'tourisme',
      uploadedDocuments: uploadedDocsUnassessed,
    });

    const passItemNeg = summaryNeg.items.find((i) => i.id === 'DOC-PASSPORT')!;
    if (passItemNeg.isEvidenceDirectlyVerified !== true) {
      return {
        passed: false,
        message: 'TEST 2-NEG FAILED: Item with valid verification event was expected to be verified!',
        details: passItemNeg,
      };
    }
    if (passItemNeg.evidenceComplianceStatus !== 'not_evaluated') {
      return {
        passed: false,
        message: `TEST 2-NEG FAILED: Expected complianceStatus 'not_evaluated', got '${passItemNeg.evidenceComplianceStatus}'`,
        details: passItemNeg,
      };
    }
    if (passItemNeg.status === 'ready') {
      return {
        passed: false,
        message: 'TEST 2-NEG FAILED: Item was marked READY despite unassessed compliance! (VERIFIED != COMPLIANT breach)',
        details: passItemNeg,
      };
    }
    if (passItemNeg.lifecycleStage === 'ready') {
      return {
        passed: false,
        message: 'TEST 2-NEG FAILED: Item lifecycleStage is ready despite unassessed compliance!',
        details: passItemNeg,
      };
    }
    console.log('  ✓ Test 2-NEG Passed: Uploaded + Valid Verification + No Compliance Evaluation -> VERIFIED but NOT READY');
  }

  // --------------------------------------------------------------------------
  // TEST 3: Uploaded document with invalid verification event -> verification rejected, NOT READY
  // --------------------------------------------------------------------------
  {
    // 3a: Malformed timestamp
    const invalidTimestampEvent: EvidenceVerificationEvent = {
      id: 'EVT-T3A-PASS',
      evidenceId: 'UPL-T3A-PASS',
      outcome: 'verified',
      method: 'document_review',
      timestamp: 'not-a-valid-timestamp',
      rationale: 'Raison valide.',
      performedBy: 'consular_officer',
    };

    const summary3a = buildDocumentReadinessSummary(findings, actionPlan, {
      destination: 'france',
      visaType: 'tourisme',
      uploadedDocuments: [
        {
          id: 'UPL-T3A-PASS',
          checklistKey: 'passport',
          fileName: 'pass_3a.pdf',
          verificationEvent: invalidTimestampEvent,
          isLegible: true,
          isCompliant: true,
          expiryDate: '2030-01-01',
        },
      ],
    });
    const pass3a = summary3a.items.find((i) => i.id === 'DOC-PASSPORT')!;
    if (pass3a.isEvidenceDirectlyVerified === true || pass3a.status === 'ready') {
      return {
        passed: false,
        message: 'TEST 3a FAILED: Malformed timestamp event was accepted as verified!',
        details: pass3a,
      };
    }

    // 3b: Empty rationale
    const emptyRationaleEvent: EvidenceVerificationEvent = {
      id: 'EVT-T3B-PASS',
      evidenceId: 'UPL-T3B-PASS',
      outcome: 'verified',
      method: 'document_review',
      timestamp: '2026-09-13T09:00:00Z',
      rationale: '   ',
      performedBy: 'consular_officer',
    };

    const summary3b = buildDocumentReadinessSummary(findings, actionPlan, {
      destination: 'france',
      visaType: 'tourisme',
      uploadedDocuments: [
        {
          id: 'UPL-T3B-PASS',
          checklistKey: 'passport',
          fileName: 'pass_3b.pdf',
          verificationEvent: emptyRationaleEvent,
          isLegible: true,
          isCompliant: true,
          expiryDate: '2030-01-01',
        },
      ],
    });
    const pass3b = summary3b.items.find((i) => i.id === 'DOC-PASSPORT')!;
    if (pass3b.isEvidenceDirectlyVerified === true || pass3b.status === 'ready') {
      return {
        passed: false,
        message: 'TEST 3b FAILED: Empty rationale event was accepted as verified!',
        details: pass3b,
      };
    }

    // 3c: Unsupported method
    const unsupportedMethodEvent: EvidenceVerificationEvent = {
      id: 'EVT-T3C-PASS',
      evidenceId: 'UPL-T3C-PASS',
      outcome: 'verified',
      method: 'ai_guess' as any,
      timestamp: '2026-09-13T09:00:00Z',
      rationale: 'IA a devine.',
      performedBy: 'consular_officer',
    };

    const summary3c = buildDocumentReadinessSummary(findings, actionPlan, {
      destination: 'france',
      visaType: 'tourisme',
      uploadedDocuments: [
        {
          id: 'UPL-T3C-PASS',
          checklistKey: 'passport',
          fileName: 'pass_3c.pdf',
          verificationEvent: unsupportedMethodEvent,
          isLegible: true,
          isCompliant: true,
          expiryDate: '2030-01-01',
        },
      ],
    });
    const pass3c = summary3c.items.find((i) => i.id === 'DOC-PASSPORT')!;
    if (pass3c.isEvidenceDirectlyVerified === true || pass3c.status === 'ready') {
      return {
        passed: false,
        message: 'TEST 3c FAILED: Unsupported method event was accepted as verified!',
        details: pass3c,
      };
    }

    console.log('  ✓ Test 3 Passed: Uploaded document with invalid verification event -> rejected, NOT READY');
  }

  // --------------------------------------------------------------------------
  // TEST 4: Duplicate evidence ID in registry -> validator rejection
  // --------------------------------------------------------------------------
  {
    const summary = buildDocumentReadinessSummary(findings, actionPlan, {
      destination: 'france',
      visaType: 'tourisme',
    });

    const duplicateEvidenceSummary: DocumentReadinessSummary = {
      ...summary,
      evidenceRecords: [
        {
          id: 'EVID-DUP-1',
          source: 'uploaded_document',
          documentCategory: 'identity_and_travel',
          label: 'Passeport A',
          exists: true,
          verificationStatus: 'not_verified',
          complianceStatus: 'compliant',
          complianceRuleIds: ['RULE-DOC-PASSPORT-VALIDITY'],
          isCompliant: true,
          lifecycleStage: 'uploaded',
          mappedChecklistKeys: ['passport'],
        },
        {
          id: 'EVID-DUP-1', // Duplicate ID
          source: 'uploaded_document',
          documentCategory: 'identity_and_travel',
          label: 'Passeport B',
          exists: true,
          verificationStatus: 'not_verified',
          complianceStatus: 'compliant',
          complianceRuleIds: ['RULE-DOC-PASSPORT-VALIDITY'],
          isCompliant: true,
          lifecycleStage: 'uploaded',
          mappedChecklistKeys: ['passport'],
        },
      ],
    };

    let caught = false;
    try {
      validateComplianceInvariant(duplicateEvidenceSummary);
    } catch (e: any) {
      if (e.message.includes('Duplicate evidence ID')) {
        caught = true;
      }
    }

    if (!caught) {
      return {
        passed: false,
        message: 'TEST 4 FAILED: Validator did not reject duplicate evidence ID in registry!',
        details: duplicateEvidenceSummary,
      };
    }
    console.log('  ✓ Test 4 Passed: Duplicate evidence ID in registry -> validator rejection');
  }

  // --------------------------------------------------------------------------
  // TEST 5: Duplicate verification event ID -> validator rejection
  // --------------------------------------------------------------------------
  {
    const summary = buildDocumentReadinessSummary(findings, actionPlan, {
      destination: 'france',
      visaType: 'tourisme',
    });

    const duplicateEventSummary: DocumentReadinessSummary = {
      ...summary,
      evidenceRecords: [
        {
          id: 'EVID-T5-1',
          source: 'uploaded_document',
          documentCategory: 'identity_and_travel',
          label: 'Passeport',
          exists: true,
          verificationStatus: 'not_verified',
          complianceStatus: 'compliant',
          complianceRuleIds: ['RULE-DOC-PASSPORT-VALIDITY'],
          isCompliant: true,
          lifecycleStage: 'uploaded',
          mappedChecklistKeys: ['passport'],
        },
      ],
      verificationEvents: [
        {
          id: 'EVT-DUP-1',
          evidenceId: 'EVID-T5-1',
          outcome: 'verified',
          method: 'document_review',
          timestamp: '2026-09-13T09:00:00Z',
          rationale: 'Revue A.',
          performedBy: 'consular_officer',
        },
        {
          id: 'EVT-DUP-1', // Duplicate ID
          evidenceId: 'EVID-T5-1',
          outcome: 'verified',
          method: 'official_source_match',
          timestamp: '2026-09-13T09:30:00Z',
          rationale: 'Revue B.',
          performedBy: 'consular_officer',
        },
      ],
    };

    let caught = false;
    try {
      validateComplianceInvariant(duplicateEventSummary);
    } catch (e: any) {
      if (e.message.includes('Duplicate verification event ID')) {
        caught = true;
      }
    }

    if (!caught) {
      return {
        passed: false,
        message: 'TEST 5 FAILED: Validator did not reject duplicate verification event ID!',
        details: duplicateEventSummary,
      };
    }
    console.log('  ✓ Test 5 Passed: Duplicate verification event ID -> validator rejection');
  }

  // --------------------------------------------------------------------------
  // TEST 6: Applicant claiming to verify their own document -> verification rejected
  // --------------------------------------------------------------------------
  {
    const applicantSelfVerifyEvent: EvidenceVerificationEvent = {
      id: 'EVT-T6-APPLICANT',
      evidenceId: 'UPL-T6-PASS',
      outcome: 'verified',
      method: 'document_review',
      timestamp: '2026-09-13T09:00:00Z',
      rationale: 'Le demandeur certifie sur lhonneur son propre document.',
      performedBy: 'applicant',
    };

    const summary = buildDocumentReadinessSummary(findings, actionPlan, {
      destination: 'france',
      visaType: 'tourisme',
      uploadedDocuments: [
        {
          id: 'UPL-T6-PASS',
          checklistKey: 'passport',
          fileName: 'pass_t6.pdf',
          verificationEvent: applicantSelfVerifyEvent,
          isLegible: true,
          isCompliant: true,
          expiryDate: '2030-01-01',
        },
      ],
    });

    const passItem = summary.items.find((i) => i.id === 'DOC-PASSPORT')!;
    if (passItem.isEvidenceDirectlyVerified === true || passItem.status === 'ready') {
      return {
        passed: false,
        message: 'TEST 6 FAILED: Applicant self-verification was accepted by the engine!',
        details: passItem,
      };
    }

    // Also test validator rejects an event with outcome verified performedBy applicant
    let validatorCaught = false;
    try {
      validateComplianceInvariant({
        ...summary,
        evidenceRecords: [
          {
            id: 'UPL-T6-PASS',
            source: 'uploaded_document',
            documentCategory: 'identity_and_travel',
            label: 'Passeport',
            exists: true,
            verificationStatus: 'verified',
            verificationEventId: 'EVT-T6-APPLICANT',
            complianceStatus: 'compliant',
            complianceRuleIds: ['RULE-DOC-PASSPORT-VALIDITY'],
            isCompliant: true,
            lifecycleStage: 'verified',
            mappedChecklistKeys: ['passport'],
          },
        ],
        verificationEvents: [applicantSelfVerifyEvent],
      });
    } catch (e: any) {
      if (e.message.includes("cannot be performed by 'applicant'")) {
        validatorCaught = true;
      }
    }

    if (!validatorCaught) {
      return {
        passed: false,
        message: 'TEST 6 FAILED: Validator did not reject verification event performed by applicant!',
        details: summary,
      };
    }
    console.log('  ✓ Test 6 Passed: Applicant claiming to verify own document -> rejected');
  }

  // --------------------------------------------------------------------------
  // TEST 7: Applicant fact attempting to create verification event -> validator rejection
  // --------------------------------------------------------------------------
  {
    const summary = buildDocumentReadinessSummary(findings, actionPlan, {
      destination: 'france',
      visaType: 'tourisme',
      applicantFacts: { hasPassport: true },
    });

    const illegalFactVerificationSummary: DocumentReadinessSummary = {
      ...summary,
      evidenceRecords: [
        {
          id: 'FACT-DOC-PASSPORT',
          source: 'applicant_fact',
          documentCategory: 'identity_and_travel',
          label: 'Déclaration passeport',
          exists: true,
          verificationStatus: 'verified',
          verificationEventId: 'EVT-ILLEGAL-FACT',
          complianceStatus: 'compliant',
          complianceRuleIds: ['RULE-DOC-PASSPORT-VALIDITY'],
          isCompliant: true,
          lifecycleStage: 'declared',
          mappedChecklistKeys: ['passport'],
        },
      ],
      verificationEvents: [
        {
          id: 'EVT-ILLEGAL-FACT',
          evidenceId: 'FACT-DOC-PASSPORT',
          outcome: 'verified',
          method: 'official_source_match',
          timestamp: '2026-09-13T09:00:00Z',
          rationale: 'Tentative de vérification d’un fait déclaré.',
          performedBy: 'consular_officer',
        },
      ],
    };

    let caught = false;
    try {
      validateComplianceInvariant(illegalFactVerificationSummary);
    } catch (e: any) {
      if (
        e.message.includes("targets ineligible evidence source 'applicant_fact'") ||
        e.message.includes("Ineligible source 'applicant_fact'")
      ) {
        caught = true;
      }
    }

    if (!caught) {
      return {
        passed: false,
        message: 'TEST 7 FAILED: Validator did not reject verification event targeting applicant_fact!',
        details: illegalFactVerificationSummary,
      };
    }
    console.log('  ✓ Test 7 Passed: Applicant fact attempting to create verification event -> validator rejection');
  }

  // --------------------------------------------------------------------------
  // TEST 8: Generated artifact attempting to create verification event -> validator rejection
  // --------------------------------------------------------------------------
  {
    const summary = buildDocumentReadinessSummary(findings, actionPlan, {
      destination: 'france',
      visaType: 'tourisme',
    });

    const illegalArtifactVerificationSummary: DocumentReadinessSummary = {
      ...summary,
      evidenceRecords: [
        {
          id: 'DELIV-COVER-LETTER-1',
          source: 'generated_artifact',
          documentCategory: 'supporting_evidence',
          label: 'Lettre explicative générée',
          exists: true,
          verificationStatus: 'verified',
          verificationEventId: 'EVT-ILLEGAL-ARTIFACT',
          complianceStatus: 'compliant',
          complianceRuleIds: ['RULE-DEFAULT'],
          isCompliant: true,
          lifecycleStage: 'declared',
          mappedChecklistKeys: ['cover_letter'],
        },
      ],
      verificationEvents: [
        {
          id: 'EVT-ILLEGAL-ARTIFACT',
          evidenceId: 'DELIV-COVER-LETTER-1',
          outcome: 'verified',
          method: 'document_review',
          timestamp: '2026-09-13T09:00:00Z',
          rationale: 'Tentative de vérification d’un livrable généré.',
          performedBy: 'consular_officer',
        },
      ],
    };

    let caught = false;
    try {
      validateComplianceInvariant(illegalArtifactVerificationSummary);
    } catch (e: any) {
      if (
        e.message.includes("targets ineligible evidence source 'generated_artifact'") ||
        e.message.includes("Ineligible source 'generated_artifact'")
      ) {
        caught = true;
      }
    }

    if (!caught) {
      return {
        passed: false,
        message: 'TEST 8 FAILED: Validator did not reject verification event targeting generated_artifact!',
        details: illegalArtifactVerificationSummary,
      };
    }
    console.log('  ✓ Test 8 Passed: Generated artifact attempting to create verification event -> validator rejection');
  }

  // --------------------------------------------------------------------------
  // TEST 9: Verification event references nonexistent evidence -> validator rejection
  // --------------------------------------------------------------------------
  {
    const summary = buildDocumentReadinessSummary(findings, actionPlan, {
      destination: 'france',
      visaType: 'tourisme',
    });

    const orphanEventSummary: DocumentReadinessSummary = {
      ...summary,
      verificationEvents: [
        {
          id: 'EVT-ORPHAN-1',
          evidenceId: 'NONEXISTENT-EVID-999',
          outcome: 'verified',
          method: 'official_source_match',
          timestamp: '2026-09-13T09:00:00Z',
          rationale: 'Vérification dune preuve inexistante.',
          performedBy: 'consular_officer',
        },
      ],
    };

    let caught = false;
    try {
      validateComplianceInvariant(orphanEventSummary);
    } catch (e: any) {
      if (e.message.includes("references nonexistent evidence ID 'NONEXISTENT-EVID-999'")) {
        caught = true;
      }
    }

    if (!caught) {
      return {
        passed: false,
        message: 'TEST 9 FAILED: Validator did not reject verification event referencing nonexistent evidence!',
        details: orphanEventSummary,
      };
    }
    console.log('  ✓ Test 9 Passed: Verification event references nonexistent evidence -> validator rejection');
  }

  // --------------------------------------------------------------------------
  // TEST 10: Evidence references nonexistent verification event -> validator rejection
  // --------------------------------------------------------------------------
  {
    const summary = buildDocumentReadinessSummary(findings, actionPlan, {
      destination: 'france',
      visaType: 'tourisme',
    });

    const brokenEvidenceSummary: DocumentReadinessSummary = {
      ...summary,
      evidenceRecords: [
        {
          id: 'EVID-T10-1',
          source: 'uploaded_document',
          documentCategory: 'identity_and_travel',
          label: 'Passeport',
          exists: true,
          verificationStatus: 'verified',
          verificationEventId: 'NONEXISTENT-EVT-999',
          complianceStatus: 'compliant',
          complianceRuleIds: ['RULE-DOC-PASSPORT-VALIDITY'],
          isCompliant: true,
          lifecycleStage: 'verified',
          mappedChecklistKeys: ['passport'],
        },
      ],
      verificationEvents: [],
    };

    let caught = false;
    try {
      validateComplianceInvariant(brokenEvidenceSummary);
    } catch (e: any) {
      if (e.message.includes("references nonexistent verification event ID 'NONEXISTENT-EVT-999'")) {
        caught = true;
      }
    }

    if (!caught) {
      return {
        passed: false,
        message: 'TEST 10 FAILED: Validator did not reject evidence referencing nonexistent verification event!',
        details: brokenEvidenceSummary,
      };
    }
    console.log('  ✓ Test 10 Passed: Evidence references nonexistent verification event -> validator rejection');
  }

  // --------------------------------------------------------------------------
  // TEST 11: Valid verification followed by rejection -> verification revoked, READY removed
  // --------------------------------------------------------------------------
  {
    const eventVerified: EvidenceVerificationEvent = {
      id: 'EVT-T11-VERIF',
      evidenceId: 'UPL-T11-PASS',
      outcome: 'verified',
      method: 'document_review',
      timestamp: '2026-09-13T08:00:00Z',
      rationale: 'Examen initial satisfaisant.',
      performedBy: 'consular_officer',
    };

    const eventRejected: EvidenceVerificationEvent = {
      id: 'EVT-T11-REJECT',
      evidenceId: 'UPL-T11-PASS',
      outcome: 'rejected',
      method: 'official_source_match',
      timestamp: '2026-09-13T10:00:00Z', // Later in time!
      rationale: 'Contrefaçon et altération matérielle détectées lors du contrôle secondaire.',
      performedBy: 'consular_officer',
    };

    const summary = buildDocumentReadinessSummary(findings, actionPlan, {
      destination: 'france',
      visaType: 'tourisme',
      uploadedDocuments: [
        {
          id: 'UPL-T11-PASS',
          checklistKey: 'passport',
          fileName: 'pass_t11.pdf',
          isLegible: true,
          isCompliant: true,
          expiryDate: '2030-01-01',
        },
      ],
      verificationEvents: [eventVerified, eventRejected],
    });

    const passItem = summary.items.find((i) => i.id === 'DOC-PASSPORT')!;
    if (passItem.isEvidenceDirectlyVerified === true) {
      return {
        passed: false,
        message: 'TEST 11 FAILED: Rejected event did not revoke isEvidenceDirectlyVerified!',
        details: passItem,
      };
    }
    if (passItem.status === 'ready') {
      return {
        passed: false,
        message: 'TEST 11 FAILED: Item remained READY despite revocation event!',
        details: passItem,
      };
    }
    if (passItem.lifecycleStage === 'ready') {
      return {
        passed: false,
        message: 'TEST 11 FAILED: Lifecycle stage remained ready despite revocation event!',
        details: passItem,
      };
    }
    console.log('  ✓ Test 11 Passed: Valid verification followed by rejection -> verification revoked, READY removed');
  }

  // --------------------------------------------------------------------------
  // TEST 12: Valid verification + compliant evidence followed by non-compliance -> READY removed deterministically
  // --------------------------------------------------------------------------
  {
    const validEvent: EvidenceVerificationEvent = {
      id: 'EVT-T12-PASS',
      evidenceId: 'UPL-T12-PASS',
      outcome: 'verified',
      method: 'official_source_match',
      timestamp: '2026-09-13T09:00:00Z',
      rationale: 'Passeport matériel authentifié.',
      performedBy: 'consular_officer',
    };

    const summary = buildDocumentReadinessSummary(findings, actionPlan, {
      destination: 'france',
      visaType: 'tourisme',
      uploadedDocuments: [
        {
          id: 'UPL-T12-PASS',
          checklistKey: 'passport',
          fileName: 'expired_passport.pdf',
          verificationEvent: validEvent,
          isLegible: true,
          isExpired: true, // EXPIRED!
          isCompliant: false,
          expiryDate: '2022-01-01',
        },
      ],
    });

    const passItem = summary.items.find((i) => i.id === 'DOC-PASSPORT')!;
    if (passItem.isEvidenceDirectlyVerified !== true) {
      return {
        passed: false,
        message: 'TEST 12 FAILED: Expected verification to hold for physical document!',
        details: passItem,
      };
    }
    if (passItem.evidenceComplianceStatus !== 'non_compliant') {
      return {
        passed: false,
        message: 'TEST 12 FAILED: Expired passport not marked non_compliant!',
        details: passItem,
      };
    }
    if (passItem.status === 'ready') {
      return {
        passed: false,
        message: 'TEST 12 FAILED: Expired passport marked READY!',
        details: passItem,
      };
    }
    if (passItem.lifecycleStage === 'ready') {
      return {
        passed: false,
        message: 'TEST 12 FAILED: Expired passport lifecycleStage is ready!',
        details: passItem,
      };
    }
    console.log('  ✓ Test 12 Passed: Valid verification followed by non-compliance -> READY removed deterministically');
  }

  // --------------------------------------------------------------------------
  // TEST 13: Two valid verification events with explicit timestamps -> deterministic current-state resolution
  // --------------------------------------------------------------------------
  {
    const eventEarly: EvidenceVerificationEvent = {
      id: 'EVT-T13-EARLY',
      evidenceId: 'UPL-T13-PASS',
      outcome: 'verified',
      method: 'document_review',
      timestamp: '2026-09-13T08:00:00Z',
      rationale: 'Examen visuel préliminaire satisfaisant.',
      performedBy: 'consular_officer',
    };

    const eventLate: EvidenceVerificationEvent = {
      id: 'EVT-T13-LATE',
      evidenceId: 'UPL-T13-PASS',
      outcome: 'verified',
      method: 'official_source_match',
      timestamp: '2026-09-13T12:00:00Z', // Later timestamp
      rationale: 'Vérification officielle approfondie via registre consulaire central.',
      performedBy: 'consular_officer',
    };

    const summary = buildDocumentReadinessSummary(findings, actionPlan, {
      destination: 'france',
      visaType: 'tourisme',
      uploadedDocuments: [
        {
          id: 'UPL-T13-PASS',
          checklistKey: 'passport',
          fileName: 'pass_t13.pdf',
          isLegible: true,
          isCompliant: true,
          expiryDate: '2030-01-01',
        },
      ],
      verificationEvents: [eventEarly, eventLate],
    });

    const passItem = summary.items.find((i) => i.id === 'DOC-PASSPORT')!;
    if (passItem.verificationEventId !== 'EVT-T13-LATE') {
      return {
        passed: false,
        message: `TEST 13 FAILED: Expected latest event EVT-T13-LATE, got ${passItem.verificationEventId}`,
        details: passItem,
      };
    }
    if (passItem.verificationMethod !== 'official_source_match') {
      return {
        passed: false,
        message: `TEST 13 FAILED: Expected method official_source_match, got ${passItem.verificationMethod}`,
        details: passItem,
      };
    }
    if (passItem.verificationRationale !== 'Vérification officielle approfondie via registre consulaire central.') {
      return {
        passed: false,
        message: `TEST 13 FAILED: Rationale was not taken from latest event!`,
        details: passItem,
      };
    }
    console.log('  ✓ Test 13 Passed: Two valid verification events with timestamps -> deterministic current-state resolution');
  }

  // --------------------------------------------------------------------------
  // TEST 14: Conflicting verification events -> deterministic conflict resolution (no array-order dependence)
  // --------------------------------------------------------------------------
  {
    const eventEarly: EvidenceVerificationEvent = {
      id: 'EVT-T14-EARLY',
      evidenceId: 'UPL-T14-PASS',
      outcome: 'verified',
      method: 'document_review',
      timestamp: '2026-09-13T08:00:00Z',
      rationale: 'Examen visuel préliminaire satisfaisant.',
      performedBy: 'consular_officer',
    };

    const eventLate: EvidenceVerificationEvent = {
      id: 'EVT-T14-LATE',
      evidenceId: 'UPL-T14-PASS',
      outcome: 'verified',
      method: 'official_source_match',
      timestamp: '2026-09-13T12:00:00Z',
      rationale: 'Vérification officielle approfondie via registre consulaire central.',
      performedBy: 'consular_officer',
    };

    const summaryOrder1 = buildDocumentReadinessSummary(findings, actionPlan, {
      destination: 'france',
      visaType: 'tourisme',
      uploadedDocuments: [
        {
          id: 'UPL-T14-PASS',
          checklistKey: 'passport',
          fileName: 'pass_t14.pdf',
          isLegible: true,
          isCompliant: true,
          expiryDate: '2030-01-01',
        },
      ],
      verificationEvents: [eventEarly, eventLate],
    });

    const summaryOrder2 = buildDocumentReadinessSummary(findings, actionPlan, {
      destination: 'france',
      visaType: 'tourisme',
      uploadedDocuments: [
        {
          id: 'UPL-T14-PASS',
          checklistKey: 'passport',
          fileName: 'pass_t14.pdf',
          isLegible: true,
          isCompliant: true,
          expiryDate: '2030-01-01',
        },
      ],
      verificationEvents: [eventLate, eventEarly], // Reversed array order!
    });

    const pass1 = summaryOrder1.items.find((i) => i.id === 'DOC-PASSPORT')!;
    const pass2 = summaryOrder2.items.find((i) => i.id === 'DOC-PASSPORT')!;

    if (
      pass1.verificationEventId !== pass2.verificationEventId ||
      pass1.verificationMethod !== pass2.verificationMethod ||
      pass1.verificationTimestamp !== pass2.verificationTimestamp ||
      pass1.verificationRationale !== pass2.verificationRationale ||
      pass1.status !== pass2.status
    ) {
      return {
        passed: false,
        message: 'TEST 14 FAILED: Array order affected verification resolution! Not deterministic.',
        details: { pass1, pass2 },
      };
    }
    console.log('  ✓ Test 14 Passed: Conflicting verification events -> deterministic conflict resolution (order independent)');
  }

  // --------------------------------------------------------------------------
  // TEST 15: Complete READY causal chain -> full provenance exposed on every READY item
  // --------------------------------------------------------------------------
  {
    const validEventPass: EvidenceVerificationEvent = {
      id: 'EVT-T15-PASS',
      evidenceId: 'UPL-T15-PASS',
      outcome: 'verified',
      method: 'official_source_match',
      timestamp: '2026-09-13T09:00:00Z',
      rationale: 'Passeport validé via base officielle consulaire.',
      performedBy: 'consular_officer',
    };

    const validEventBank: EvidenceVerificationEvent = {
      id: 'EVT-T15-BANK',
      evidenceId: 'UPL-T15-BANK',
      outcome: 'verified',
      method: 'structured_validation',
      timestamp: '2026-09-13T09:10:00Z',
      rationale: 'Relevés bancaires certifiés et soldes contrôlés.',
      performedBy: 'consular_officer',
    };

    const summary = buildDocumentReadinessSummary(findings, actionPlan, {
      destination: 'france',
      visaType: 'tourisme',
      uploadedDocuments: [
        {
          id: 'UPL-T15-PASS',
          checklistKey: 'passport',
          fileName: 'pass_t15.pdf',
          verificationEvent: validEventPass,
          isLegible: true,
          isCompliant: true,
          expiryDate: '2030-01-01',
        },
        {
          id: 'UPL-T15-BANK',
          checklistKey: 'bank_statements',
          fileName: 'bank_t15.pdf',
          verificationEvent: validEventBank,
          isLegible: true,
          isCompliant: true,
        },
      ],
    });

    const readyItems = summary.applicableItems.filter((i) => i.status === 'ready');
    if (readyItems.length < 2) {
      return {
        passed: false,
        message: `TEST 15 FAILED: Expected >= 2 ready items, got ${readyItems.length}`,
        details: summary,
      };
    }

    for (const item of readyItems) {
      const chain = item.verificationProvenanceChain;
      if (!chain) {
        return {
          passed: false,
          message: `TEST 15 FAILED: Item ${item.id} is READY but lacks verificationProvenanceChain!`,
          details: item,
        };
      }
      if (chain.checklistItemId !== item.id) {
        return {
          passed: false,
          message: `TEST 15 FAILED: Item ${item.id} chain.checklistItemId mismatch (${chain.checklistItemId})!`,
          details: chain,
        };
      }
      if (!chain.evidenceId || typeof chain.evidenceId !== 'string') {
        return {
          passed: false,
          message: `TEST 15 FAILED: Item ${item.id} chain.evidenceId is missing or invalid!`,
          details: chain,
        };
      }
      if (chain.evidenceSource !== 'verified_document') {
        return {
          passed: false,
          message: `TEST 15 FAILED: Item ${item.id} chain.evidenceSource is ${chain.evidenceSource}, expected verified_document!`,
          details: chain,
        };
      }
      if (!chain.verificationEventId || typeof chain.verificationEventId !== 'string') {
        return {
          passed: false,
          message: `TEST 15 FAILED: Item ${item.id} chain.verificationEventId missing!`,
          details: chain,
        };
      }
      if (!chain.verificationMethod || chain.verificationMethod === 'not_verified') {
        return {
          passed: false,
          message: `TEST 15 FAILED: Item ${item.id} chain.verificationMethod is invalid (${chain.verificationMethod})!`,
          details: chain,
        };
      }
      if (!chain.verificationTimestamp || isNaN(new Date(chain.verificationTimestamp).getTime())) {
        return {
          passed: false,
          message: `TEST 15 FAILED: Item ${item.id} chain.verificationTimestamp is invalid (${chain.verificationTimestamp})!`,
          details: chain,
        };
      }
      if (!chain.verificationRationale || chain.verificationRationale.trim().length === 0) {
        return {
          passed: false,
          message: `TEST 15 FAILED: Item ${item.id} chain.verificationRationale is empty!`,
          details: chain,
        };
      }
      if (chain.performedBy === 'applicant') {
        return {
          passed: false,
          message: `TEST 15 FAILED: Item ${item.id} chain.performedBy is applicant!`,
          details: chain,
        };
      }
      if (!chain.complianceRuleId) {
        return {
          passed: false,
          message: `TEST 15 FAILED: Item ${item.id} chain.complianceRuleId is empty!`,
          details: chain,
        };
      }
      if (!Array.isArray(chain.complianceRuleIds) || chain.complianceRuleIds.length === 0) {
        return {
          passed: false,
          message: `TEST 15 FAILED: Item ${item.id} chain.complianceRuleIds is empty!`,
          details: chain,
        };
      }
      if (chain.complianceStatus !== 'compliant') {
        return {
          passed: false,
          message: `TEST 15 FAILED: Item ${item.id} chain.complianceStatus is ${chain.complianceStatus}, expected compliant!`,
          details: chain,
        };
      }
      if (!chain.complianceRationale || chain.complianceRationale.trim().length === 0) {
        return {
          passed: false,
          message: `TEST 15 FAILED: Item ${item.id} chain.complianceRationale is empty!`,
          details: chain,
        };
      }
      if (chain.isReady !== true) {
        return {
          passed: false,
          message: `TEST 15 FAILED: Item ${item.id} chain.isReady is not true!`,
          details: chain,
        };
      }
    }
    console.log('  ✓ Test 15 Passed: Complete READY causal chain exposed on every READY item');
  }

  return {
    passed: true,
    message: 'All 15 Evidence Integrity & Verification Audit Layer test cases PASSED successfully.',
    details: { totalTests: 15, passed: 15 },
  };
}

// CLI entry point
if (process.argv[1]?.includes('documentReadinessEngine')) {
  console.log('Running Document Readiness Engine Deterministic Audit Suite...\n');
  const result = runDocumentReadinessEngineAudit();
  if (!result.passed) {
    console.error('AUDIT FAILED:', result.message);
    console.error('Details:', result.details);
    process.exit(1);
  } else {
    console.log('AUDIT PASSED:', result.message);
  }
}
