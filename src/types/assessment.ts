import { UserAnswers } from '../types';

// ============================================================================
// 1. LES 5 PILIERS CONSULAIRES & NIVEAUX D'ÉVALUATION
// ============================================================================

export type ConsularPillarId =
  | 'legal_admissibility'
  | 'financial_sufficiency'
  | 'financial_provenance'
  | 'purpose_and_logistics'
  | 'ties_and_anchors';

/**
 * Statut d'évaluation d'un pilier :
 * 'conforme' signifie EXCLUSIVEMENT :
 * "Aucune anomalie objective n'a été identifiée sur cette dimension au regard des informations disponibles et des règles vérifiées."
 */
export type ConsularScrutinyLevel =
  | 'conforme'           // Conditions objectives applicables vérifiées avec preuves déclarées
  | 'a_consolider'       // Situation cohérente mais preuves documentaires complémentaires conseillées
  | 'point_d_attention'  // Situation appelant une clarification ou une explication contextuelle
  | 'action_requise';    // Non-conformité objective réglementaire avérée ou incohérence bloquante

// ============================================================================
// 2. TAXONOMIE DES FINDINGS & SÉPARATION BLOCKING / PRIORITY
// ============================================================================

export type AssessmentFindingType =
  | 'compliance_issue'         // Non-respect d'une obligation officielle vérifiée
  | 'evidence_gap'             // Fait déclaré favorable nécessitant un document probant
  | 'clarification_point'      // Situation légitime appelant une explication circonstanciée
  | 'factual_inconsistency'    // Contradiction matérielle directe entre deux déclarations
  | 'favorable_evidence'       // Fait favorable avéré, documenté et pertinent
  | 'insufficient_information';// Données déclarées ou règles officielles insuffisantes pour statuer

export type PriorityWeight = 'high' | 'medium' | 'low';

export interface PriorityEligibility {
  eligible: boolean;
  weight: PriorityWeight;
}

export interface AssessmentFinding {
  id: string;
  pillarId: ConsularPillarId;
  type: AssessmentFindingType;
  title: string;
  declaredFact: string;                  // NIVEAU A : Fait déclaré textuel
  officialBasis?: string;                // NIVEAU B : Règle légale applicable ou pratique d'instruction
  sourceRuleId?: string;                 // Référence exacte vers la règle officielle vérifiée
  findingRationale: string;              // NIVEAU C : Déduction neutre et motivée
  recommendedEvidence?: EvidenceRecommendation[]; // NIVEAU D : Pièces graduées
  suggestedAction?: string;              // Démarche concrète
  isDirectBlocker: boolean;              // Vrai UNIQUEMENT pour compliance_issue réglementaire avéré
  priorityEligibility: PriorityEligibility; // Détermine si ce finding concourt aux priorités d'action
}

// ============================================================================
// 3. RÈGLES OFFICIELLES SOURCÉES ET VÉRIFIABLES
// ============================================================================

export interface OfficialConsularRule {
  id: string;
  destination: string;
  visaType: string;
  ruleCategory:
    | 'passport_validity'
    | 'subsistence_threshold'
    | 'lodging_condition'
    | 'territorial_competence'
    | 'stay_duration'
    | 'administrative_admissibility'
    | 'insurance_requirement';
  ruleDescription: string;
  amount?: number;
  currency?: string;
  unit?: 'per_day' | 'per_month' | 'per_year' | 'total_stay';
  effectiveFrom: string;       // Date ISO (ex: "2026-01-01")
  effectiveTo?: string;
  sourceName: string;         // Intitulé exact du texte officiel (décret, code, directive)
  sourceUrl: string;          // URL exacte vers l'article légal (pas d'accueil générique)
  verifiedAt: string;         // Date ISO de vérification humaine individuelle
  isFullyVerified: boolean;   // Si false, le moteur bascule en insufficient_information
  applicableNationalities?: string[]; // Nationalités ou pays d'origine auxquels la règle s'applique spécifiquement
  excludedNationalities?: string[];   // Nationalités expressément exclues du champ d'application de la règle
}

// ============================================================================
// 4. CLASSIFICATION NORMATIVE DES PIÈCES JUSTIFICATIVES
// ============================================================================

export type DocumentNormativeCategory =
  | 'mandatory_by_regulation'  // Expressément prescrit par le texte de loi applicable
  | 'recommended_evidence'     // Utile pour prouver un fait déclaré, sans obligation légale
  | 'possible_clarification';  // Document contextuel facilitant la lecture du dossier

export interface EvidenceRecommendation {
  targetPillar: ConsularPillarId;
  relatedChecklistKey: string; // Clé de référence vers la check-list existante
  documentName: string;
  consularUtility: string;     // Utilité probatoire exacte
  category: DocumentNormativeCategory;
}

// ============================================================================
// 5. PRIORITÉS D'ACTION DYNAMIQUES (0 À 3 ACTIONS)
// ============================================================================

export interface TargetedPriorityAction {
  rank: 1 | 2 | 3;
  targetPillar: ConsularPillarId;
  title: string;
  rationale: string;
  concreteStep: string;
  checklistDocReference?: string;
}

export interface InterviewPreparationQuestion {
  question: string;
  contextExplanation: string; // Pourquoi l'instructeur s'intéresse à ce point
  factualGuidance: string;    // Comment répondre avec clarté et honnêteté
  relatedFindingId: string;
}

// ============================================================================
// 6. PILIERS ET COMPLÉTUDE CONTEXTUELLE
// ============================================================================

export interface ConsularPillarDetail {
  id: ConsularPillarId;
  title: string;
  status: ConsularScrutinyLevel;
  factsSummary: string;
  officerAngle: string;
  findings: AssessmentFinding[];
  evidenceList: EvidenceRecommendation[];
}

export interface AssessmentMeta {
  dataCompleteness: 'high' | 'medium' | 'low'; // Mesure UNIQUEMENT la présence des données nécessaires
  assessmentConfidence: 'high' | 'medium' | 'low';
  missingContextualInformation: string[];      // Données manquantes pour ce profil précis
  unverifiedRulesEncountered: string[];        // Règles requises mais non vérifiées avec certitude
  evaluatedAt: string;
}

// ============================================================================
// 7. ÉVALUATION CONSULAIRE GLOBALE
// ============================================================================

export interface PersonalizedConsularAssessment {
  dossierId: string;
  meta: AssessmentMeta;
  summaryAssessment: {
    readinessHeadline: string;
    narrativeOverview: string;
    noPriorityScenario?: 'A_complete_verified' | 'B_partial_data' | 'C_unverified_rules';
    hasBlockingIssue: boolean;
  };
  pillars: Record<ConsularPillarId, ConsularPillarDetail>;
  topPriorities: TargetedPriorityAction[]; // Tableau dynamique de 0 à 3 actions réelles
  preparationQuestions: InterviewPreparationQuestion[];
  disclaimer: string;
}
