import {
  ConsularPillarId,
  ConsularScrutinyLevel,
  AssessmentFinding,
  AssessmentFindingType,
  PersonalizedConsularAssessment,
} from './assessment';

// ============================================================================
// VISAFlow V2.3.2 — FINDINGS PRESENTATION TYPES (UX LAYER)
// ============================================================================

/**
 * 4 groupes de présentation centrés sur la compréhension du demandeur
 */
export type FindingPresentationGroup =
  | 'strengths'               // Points forts & Éléments favorables
  | 'missing_documents'       // Pièces justificatives à réunir
  | 'additional_info'         // Précisions & Informations à compléter
  | 'regulatory_issues';      // Anomalies réglementaires & Non-conformités

/**
 * 3 niveaux de sévérité clairs et opérationnels
 */
export type FindingSeverity =
  | 'critical'      // Bloquant direct ou incohérence majeure (Action indispensable)
  | 'important'     // Élément d'attention prioritaire (Impact direct sur la recevabilité)
  | 'recommended';  // Recommandation d'optimisation ou pratique de confort

/**
 * Modèle de constat enrichi pour l'affichage utilisateur
 */
export interface PresentedFinding {
  originalFinding: AssessmentFinding;
  id: string;
  pillarId: ConsularPillarId;
  pillarTitle: string;
  group: FindingPresentationGroup;
  severity: FindingSeverity;
  groupLabel: string;
  severityLabel: string;
  title: string;
  declaredFact: string;
  officialBasis?: string;
  sourceRuleId?: string;
  findingRationale: string;
  suggestedAction?: string;
  isDirectBlocker: boolean;
  recommendedEvidenceCount: number;
}

/**
 * Scorecard déterministe d'un pilier consulaire (Zéro scoring probabiliste)
 */
export interface PillarScorecardData {
  pillarId: ConsularPillarId;
  title: string;
  shortTitle?: string;
  status: ConsularScrutinyLevel;
  statusLabel: string;
  factsSummary: string;
  officerAngle: string;
  totalFindingsCount: number;
  strengthsCount: number;
  missingDocsCount: number;
  additionalInfoCount: number;
  regulatoryIssuesCount: number;
  hasCriticalIssue: boolean;
  severityBreakdown: {
    critical: number;
    important: number;
    recommended: number;
  };
}

/**
 * Synthèse globale préparée pour la couche d'interface utilisateur
 */
export interface FindingsPresentationSummary {
  scorecards: Record<ConsularPillarId, PillarScorecardData>;
  scorecardsList: PillarScorecardData[];
  groupedFindings: Record<FindingPresentationGroup, PresentedFinding[]>;
  allPresentedFindings: PresentedFinding[];
  countsByGroup: Record<FindingPresentationGroup, number>;
  countsBySeverity: Record<FindingSeverity, number>;
  totalFindings: number;
}
