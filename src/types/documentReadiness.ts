import { ConsularPillarId, AssessmentFinding } from './assessment';
import { ActionItem, ActionPlanSummary } from './actionEngine';

// ============================================================================
// VISAFlow V2.3.8 — DETERMINISTIC EVIDENCE LIFECYCLE & VERIFICATION BRIDGE
// ============================================================================

/**
 * Étapes séquentielles du cycle de vie déterministe d'une pièce justificative (V2.3.8)
 * Progression stricte : NOT_PROVIDED ↓ DECLARED ↓ UPLOADED ↓ VERIFIED ↓ COMPLIANCE_EVALUATED ↓ READY
 */
export type EvidenceLifecycleStage =
  | 'not_provided'
  | 'declared'
  | 'uploaded'
  | 'verified'
  | 'compliance_evaluated'
  | 'ready';

/**
 * Méthodes déterministes et opposables de vérification d'éléments de preuve (V2.3.9)
 */
export type EvidenceVerificationMethod =
  | 'not_verified'
  | 'document_review'
  | 'official_source_match'
  | 'structured_validation'
  | 'manual_verification'
  | 'system_verification';

export type VerificationOutcome = 'verified' | 'rejected';
export type VerificationPerformer = 'system' | 'reviewer' | 'applicant' | 'consular_officer';

/**
 * Modèle formel d'événement de vérification de preuve (V2.3.9 Evidence Integrity & Audit Layer)
 * Tout état VERIFIED doit impérativement découler d'un événement traçable et explicite.
 */
export interface EvidenceVerificationEvent {
  id: string;                                 // Identifiant unique d'événement (ex: EVT-VERIF-001)
  evidenceId: string;                         // Référence explicite vers la preuve auditée
  method: EvidenceVerificationMethod;         // Méthode déterministe employée
  outcome: VerificationOutcome;               // 'verified' | 'rejected'
  timestamp: string;                          // Horodatage ISO 8601 vérifiable
  rationale: string;                          // Motivation substantielle et non-vide de la vérification
  performedBy: VerificationPerformer;         // Entité ayant réalisé la vérification
  sourceReferences?: string[];                // Références documentaires ou institutionnelles externes
}

/**
 * Chaîne causale complète de traçabilité pour toute pièce READY (V2.3.9)
 * Checklist Item → Evidence ID → Evidence Source → Verification Event ID → Method → Timestamp → Rationale → Compliance Rule ID → Evaluation → Rationale → READY
 */
export interface VerificationProvenanceChain {
  checklistItemId: string;
  evidenceId: string;
  evidenceSource: ReadinessEvidenceSource;
  verificationEventId: string;
  verificationMethod: EvidenceVerificationMethod;
  verificationTimestamp: string;
  verificationRationale: string;
  performedBy: VerificationPerformer;
  complianceRuleId: string;
  complianceRuleIds: string[];
  complianceStatus: EvidenceComplianceStatus;
  complianceRationale: string;
  isReady: boolean;
}

/**
 * Entité déterministe de preuve justificative (V2.3.8 & V2.3.9)
 */
export interface EvidenceRecord {
  id: string;
  relatedChecklistKey?: string;
  mappedChecklistKeys?: string[];
  label?: string;
  documentCategory?: DocumentCategory;

  source: ReadinessEvidenceSource;

  verificationStatus:
    | 'not_verified'
    | 'verified'
    | 'rejected';

  // V2.3.9 Provenance & Traçabilité formelle de l'événement de vérification
  verificationMethod?: EvidenceVerificationMethod;
  verificationEventId?: string;
  verificationEvent?: EvidenceVerificationEvent;
  verificationEvents?: EvidenceVerificationEvent[];
  verifiedBy?: VerificationPerformer;
  verificationTimestamp?: string;

  complianceStatus: EvidenceComplianceStatus;

  exists: boolean;

  lifecycleStage?: EvidenceLifecycleStage;

  verifiedAt?: string;

  complianceRuleIds: string[];

  verificationRationale?: string;

  complianceRationale?: string;

  // Attributs matériels complémentaires
  fileName?: string;
  uploadedAt?: string;
  isLegible?: boolean;
  hasMissingPages?: boolean;
  isExpired?: boolean;
  expiryDate?: string;
  validityMonths?: number;
  availableBalanceFcfa?: number;
  availableBalanceCad?: number;
  availableBalanceEur?: number;
  isInstitutionRecognized?: boolean;
  isInsuranceCompliant?: boolean;
  insuranceCoverageEur?: number;
  isCompliant?: boolean;
}

/**
 * Statut d'évaluation de la conformité réglementaire déterministe (V2.3.7)
 * L'existence, la provenance et la vérification matérielle ne valent pas conformité légale.
 */
export type EvidenceComplianceStatus =
  | 'not_evaluated'
  | 'compliant'
  | 'non_compliant';

/**
 * Sources déterministes et non-interchangeables de preuve (V2.3.6)
 */
export type ReadinessEvidenceSource =
  | 'applicant_fact'         // Fait déclaré par le demandeur (non vérifié sur pièce)
  | 'uploaded_document'      // Document téléversé brut (non certifié)
  | 'verified_document'      // Document téléversé certifié ou validé matériellement
  | 'assessment_finding'     // Constat consulaire formel
  | 'action_completion'      // Action opérationnelle validée
  | 'generated_artifact';    // Livrable logiciel généré (jamais document demandeur)

/**
 * Alias de compatibilité ascendante
 */
export type ReadinessEvidenceType = ReadinessEvidenceSource;

/**
 * Modèle d'applicabilité consulaire déterministe (V2.3.6)
 * L'évaluation d'applicabilité précède impérativement l'évaluation de préparation.
 */
export type DocumentApplicability =
  | 'applicable'
  | 'not_applicable';

/**
 * Statut de préparation du document dans le dossier consulaire (si applicable)
 */
export type DocumentReadinessStatus =
  | 'ready'                  // Document réuni, certifié conforme et sans anomalie déclarée (preuve explicite requise)
  | 'missing'                // Document obligatoire ou pivot absent, non fourni ou non-conforme
  | 'requires_clarification' // Document présent ou envisagé nécessitant une justification ou mise en conformité
  | 'optional_reinforcement';// Document probant non obligatoire renforçant les attaches ou la solvabilité

/**
 * 6 Catégories déterministes normalisées pour le classement des pièces
 */
export type DocumentCategory =
  | 'identity_and_travel'         // Documents d'Identité & Voyage
  | 'financial_documents'         // Justificatifs Financiers & Ressources
  | 'education_documents'         // Justificatifs Académiques & Scolarité
  | 'employment_and_business'     // Situation Professionnelle & Activité
  | 'accommodation_and_logistics' // Hébergement & Logistique de Séjour
  | 'supporting_evidence';        // Attaches & Preuves Complémentaires

/**
 * Élément individuel de la check-list consulaire personnalisée
 */
export interface DocumentChecklistItem {
  id: string;                                // Identifiant canonique (ex: DOC-PASSPORT, DOC-PAL-CAQ)
  category: DocumentCategory;                // Catégorie d'appartenance
  title: string;                             // Intitulé officiel et précis du document
  description: string;                       // Exigences matérielles (format A4, original, cachet humide...)
  
  // V2.3.6 Modèle d'applicabilité strict
  applicability: DocumentApplicability;      // 'applicable' | 'not_applicable'

  // Statut déterministe calculé (défini si applicable, undefined si not_applicable)
  status?: DocumentReadinessStatus;          
  statusReason: string;                      // Justification objective et factuelle du statut
  isMandatoryByRegulation: boolean;          // Obligation légale stricte (ex: Code des Visas Schengen, LIPR Canada)
  relatedChecklistKey: string;               // Clé de référence interne
  targetPillars: ConsularPillarId[];         // Piliers consulaires impactés par cette pièce
  sourceFindingIds: string[];                // Traçabilité intégrale : identifiants des constats associés
  sourceActionIds: string[];                 // Traçabilité intégrale : identifiants des actions associées
  officialBasis?: string;                    // Référence au texte officiel ou décret
  sourceRuleId?: string;                     // Règle consulaire officielle vérifiée
  concreteStep?: string;                     // Consigne opérationnelle pour l'obtention ou la régularisation

  // V2.3.6 Evidence Provenance Model (Mandatory for all items, strict for READY)
  readinessEvidenceSource?: ReadinessEvidenceSource; // Source explicite de preuve
  readinessEvidenceType?: ReadinessEvidenceSource;   // Alias de rétrocompatibilité
  readinessEvidenceIds: string[];                    // Identifiants des preuves explicites (obligatoire si READY)
  isEvidenceDirectlyVerified: boolean;               // Vrai si vérification matérielle directe attestée
  readinessJustification: string;                    // Justification déterministe auditable de la décision

  // V2.3.7 Deterministic Compliance Verification Layer
  evidenceComplianceStatus: EvidenceComplianceStatus; // 'not_evaluated' | 'compliant' | 'non_compliant'
  evidenceComplianceRuleIds: string[];                // Règles juridiques / réglementaires opposables (ex: RULE-CA-STUDENT-LICO-2024)
  complianceRuleIds: string[];                        // Alias direct de conformité réglementaire
  complianceRationale: string;                        // Rationale d'évaluation de la conformité juridique

  // V2.3.8 Deterministic Evidence Lifecycle Bridge
  lifecycleStage: EvidenceLifecycleStage;             // NOT_PROVIDED ↓ DECLARED ↓ UPLOADED ↓ VERIFIED ↓ COMPLIANCE_EVALUATED ↓ READY
  evidenceRecord?: EvidenceRecord;                    // Preuve qualifiante primaire rattachée
  evidenceRecords?: EvidenceRecord[];                 // Traçabilité intégrale de toutes les preuves associées

  // V2.3.9 Evidence Integrity & Verification Audit Layer
  verificationEventId?: string;                       // Identifiant de l'événement de vérification déterminant
  verificationMethod?: EvidenceVerificationMethod;     // Méthode formelle de vérification auditée
  verificationTimestamp?: string;                     // Horodatage formel de la vérification
  verificationRationale?: string;                     // Rationale opposable de vérification
  verificationPerformer?: VerificationPerformer;      // Entité vérificatrice
  verificationProvenanceChain?: VerificationProvenanceChain; // Chaîne causale complète pour pièces READY
}

/**
 * Livrable généré par la plateforme (strictement séparé des pièces fournies par le demandeur)
 */
export interface GeneratedDeliverableItem {
  id: string;                                // Identifiant du livrable (ex: DELIV-COVER-LETTER)
  title: string;                             // Nom du document généré
  description: string;                       // Rôle du document
  artifactType: 'motivation_letter' | 'guarantor_letter' | 'ties_note' | 'roadmap' | 'study_plan' | 'custom_artifact';
  status: 'generated' | 'draft_pending' | 'customization_required';
  generationStatus?: 'generated' | 'draft_pending' | 'customization_required';
  requiresApplicantReview: boolean;          // Révision requise
  requiresApplicantAcceptance: boolean;      // Approbation explicite
  requiresSignature: boolean;                // Signature requise
  requiresApplicantReviewAndSignature?: boolean; // Rétrocompatibilité UI
  readinessEvidenceSource: ReadinessEvidenceSource;
  readinessEvidenceType?: ReadinessEvidenceSource;
  readinessEvidenceIds: string[];
  justification: string;
}

/**
 * Synthèse des livrables générés par la plateforme
 */
export interface GeneratedDeliverablesSummary {
  totalDeliverables: number;
  items: GeneratedDeliverableItem[];
  hasPendingReview: boolean;
}

/**
 * Contexte optionnel d'évaluation documentaire pour preuves explicites
 */
export interface ExplicitUploadedDocument {
  id: string;
  checklistKey: string;
  fileName: string;
  isVerified?: boolean;
  verificationStatus?: 'not_verified' | 'verified' | 'rejected';
  verificationMethod?: EvidenceVerificationMethod;
  verificationEventId?: string;
  verificationEvent?: EvidenceVerificationEvent;
  verificationEvents?: EvidenceVerificationEvent[];
  verifiedBy?: VerificationPerformer;
  complianceStatus?: EvidenceComplianceStatus;
  verifiedAt?: string;
  verificationRationale?: string;
  // Propriétés de conformité matérielle et réglementaire (V2.3.7)
  isExpired?: boolean;
  expiryDate?: string;
  validityMonths?: number;
  availableBalanceFcfa?: number;
  availableBalanceCad?: number;
  availableBalanceEur?: number;
  isInstitutionRecognized?: boolean;
  isInsuranceCompliant?: boolean;
  insuranceCoverageEur?: number;
  isLegible?: boolean;
  hasMissingPages?: boolean;
  complianceRuleIds?: string[];
  complianceRationale?: string;
  isCompliant?: boolean;
}

export interface ExplicitApplicantFact {
  factKey: string;
  factValue: boolean | string | number;
  factDescription: string;
}

export interface DocumentReadinessContext {
  destination?: string;
  visaType?: string;
  applicantFacts?: Record<string, any>;
  uploadedDocuments?: ExplicitUploadedDocument[];
  evidenceRecords?: EvidenceRecord[];
  verificationEvents?: EvidenceVerificationEvent[];
  completedActionIds?: string[];
  deliverables?: any;
}

/**
 * Synthèse globale de l'état de préparation documentaire (Readiness)
 */
export interface DocumentReadinessSummary {
  totalItems: number;                        // Nombre total de documents applicables
  totalApplicableCount: number;              // Nombre total de documents applicables
  notApplicableCount: number;                // Nombre de documents non applicables exclus
  readyCount: number;                        // Nombre de pièces prêtes et conformes
  missingCount: number;                      // Nombre de pièces manquantes ou non-conformes
  clarificationCount: number;                // Nombre de pièces nécessitant clarification
  optionalCount: number;                     // Nombre de pièces de confort / renfort facultatif

  // Métriques de vérification et de conformité V2.3.7 & V2.3.9
  verifiedCount: number;                     // Nombre de pièces vérifiées matériellement
  unverifiedCount: number;                   // Nombre de pièces non vérifiées
  compliantCount: number;                    // Nombre de pièces légalement conformes
  nonCompliantCount: number;                 // Nombre de pièces non-conformes
  compliancePendingCount: number;            // Nombre de pièces dont la conformité est en attente (not_evaluated)

  // V2.3.8 & V2.3.9 Registre de preuves, événements et métriques de cycle de vie
  evidenceRecords?: EvidenceRecord[];
  verificationEvents?: EvidenceVerificationEvent[];
  stageCounts?: Record<EvidenceLifecycleStage, number>;

  items: DocumentChecklistItem[];            // Liste complète ordonnée de tous les documents (applicables et non-applicables)
  applicableItems: DocumentChecklistItem[];  // Documents participant au dossier
  notApplicableItems: DocumentChecklistItem[]; // Documents exclus du périmètre
  itemsByCategory: Record<DocumentCategory, DocumentChecklistItem[]>; // Regroupement par catégorie
  itemsByStatus: Record<DocumentReadinessStatus, DocumentChecklistItem[]>; // Regroupement par statut
  hasMissingMandatory: boolean;              // Vrai si au moins un document obligatoire est 'missing'
  auditStats: {
    totalFindingsMapped: number;             // Nombre total d'occurrences de constats tracées
    totalActionsMapped: number;              // Nombre total d'occurrences d'actions tracées
    unmappedFindingsCount: number;           // Constats sans impact documentaire direct
  };
  deliverablesSummary: GeneratedDeliverablesSummary; // Séparation stricte des livrables générés
}
