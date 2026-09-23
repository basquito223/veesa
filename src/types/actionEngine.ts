import { ConsularPillarId, AssessmentFinding } from './assessment';

// ============================================================================
// VISAFlow V2.3.3 — DETERMINISTIC ACTION ENGINE TYPES
// ============================================================================

/**
 * 3 niveaux de priorité déterministes et opérationnels
 */
export type ActionPriority = 'critical' | 'important' | 'recommended';

/**
 * Catégorie d'action opérationnelle
 */
export type ActionCategory =
  | 'regularization'            // Non-conformité réglementaire stricte ou incohérence factuelle
  | 'evidence_collection'       // Collecte et production de pièces justificatives probantes
  | 'information_completion'    // Complétion d'informations contextuelles indispensables
  | 'context_clarification'     // Note de clarification circonstanciée ou justification formelle
  | 'consolidation_safeguard';  // Sécurisation et vérification formelle d'un élément favorable attesté

/**
 * Tâche opérationnelle concrète pour le demandeur de visa
 */
export interface ActionItem {
  id: string;                                   // Identifiant déterministe unique (ex: ACT-CRIT-PASSPORT)
  priority: ActionPriority;                    // 'critical' | 'important' | 'recommended'
  category: ActionCategory;                    // Typologie d'intervention
  title: string;                               // Intitulé opérationnel court et clair
  why: string;                                 // Justification objective (sans conclusion juridique ni pronostic)
  concreteStep: string;                        // Démarche concrète et vérifiable
  isDirectBlocker: boolean;                    // Vrai si issu d'un bloquant réglementaire strict
  targetPillars: ConsularPillarId[];           // Piliers consulaires concernés
  sourceFindingIds: string[];                  // Traçabilité intégrale : identifiants des constats d'origine
  sourceFindings: AssessmentFinding[];         // Objets constats d'origine complets pour auditabilité
  collapsedFindingsCount: number;              // Nombre de constats regroupés dans cette action (>= 1)
  collapseReason?: string;                     // Motif déterministe du regroupement si plusieurs constats
  relatedDocumentKey?: string;                 // Clé de document pour liaison directe avec la check-list
  officialBasis?: string;                      // Règle légale officielle si applicable
  sourceRuleId?: string;                       // Identifiant de la règle officielle vérifiée
}

/**
 * Synthèse globale du plan d'action déterministe
 */
export interface ActionPlanSummary {
  criticalActions: ActionItem[];               // Actions critiques indispensables (bloquants / non-conformités)
  importantActions: ActionItem[];              // Actions importantes prioritaires (preuves clés / lacunes majeures)
  recommendedActions: ActionItem[];            // Améliorations recommandées (optimisations / sécurisation)
  allActions: ActionItem[];                    // Ensemble ordonné des actions
  totalActionsCount: number;                   // Nombre total d'actions résultantes
  countsByPriority: {
    critical: number;
    important: number;
    recommended: number;
  };
  hasCriticalBlocker: boolean;                 // Indique la présence d'au moins une action critique bloquante
  totalFindingsProcessed: number;              // Nombre total de constats analysés en entrée
  totalCollapsedFindings: number;              // Nombre de constats ayant fait l'objet d'un regroupement
}
