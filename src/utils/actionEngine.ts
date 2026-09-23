import { ConsularPillarId, AssessmentFinding } from '../types/assessment';
import {
  ActionItem,
  ActionPriority,
  ActionCategory,
  ActionPlanSummary,
} from '../types/actionEngine';

// ============================================================================
// VISAFlow V2.3.3 — DETERMINISTIC ACTION ENGINE
// ============================================================================

/**
 * Détermination déterministe de la priorité d'un constat individuel
 */
export function determineFindingActionPriority(finding: AssessmentFinding): ActionPriority {
  // 1. Les bloquants directs ou non-conformités réglementaires sont impérativement CRITIQUES
  if (finding.isDirectBlocker || finding.type === 'compliance_issue' || finding.type === 'factual_inconsistency') {
    return 'critical';
  }

  // 2. Évaluation des preuves manquantes
  if (finding.type === 'evidence_gap') {
    const isMandatoryDoc = finding.recommendedEvidence?.some(
      (e) => e.category === 'mandatory_by_regulation'
    );
    if (isMandatoryDoc || finding.priorityEligibility.weight === 'high') {
      return 'important';
    }
    return 'recommended';
  }

  // 3. Évaluation des informations manquantes
  if (finding.type === 'insufficient_information') {
    if (finding.priorityEligibility.weight === 'high') {
      return 'important';
    }
    return 'recommended';
  }

  // 4. Points de clarification
  if (finding.type === 'clarification_point') {
    if (finding.priorityEligibility.weight === 'high') {
      return 'important';
    }
    return 'recommended';
  }

  // 5. Preuves favorables (sauvegarde et consolidation)
  if (finding.type === 'favorable_evidence') {
    return 'recommended';
  }

  // Fallback déterministe basé sur le poids d'éligibilité
  if (finding.priorityEligibility.weight === 'high') return 'important';
  return 'recommended';
}

/**
 * Détermination de la catégorie opérationnelle d'un constat
 */
export function determineFindingActionCategory(finding: AssessmentFinding): ActionCategory {
  if (finding.type === 'compliance_issue' || finding.type === 'factual_inconsistency') {
    return 'regularization';
  }
  if (finding.type === 'evidence_gap') {
    return 'evidence_collection';
  }
  if (finding.type === 'insufficient_information') {
    return 'information_completion';
  }
  if (finding.type === 'clarification_point') {
    return 'context_clarification';
  }
  if (finding.type === 'favorable_evidence') {
    return 'consolidation_safeguard';
  }
  return 'evidence_collection';
}

/**
 * Clé déterministe de regroupement (Collapsing Key)
 * Permet de fusionner plusieurs constats concernant le même document ou la même règle
 */
export function getDeterministicCollapseKey(finding: AssessmentFinding): string {
  // 1. Regroupement par clé de document probant
  const primaryDocKey = finding.recommendedEvidence?.[0]?.relatedChecklistKey;
  if (primaryDocKey) {
    return `doc:${primaryDocKey}`;
  }

  // 2. Regroupement par règle officielle spécifique
  if (finding.sourceRuleId) {
    return `rule:${finding.sourceRuleId}`;
  }

  // 3. Regroupements thématiques déterministes par domaine d'exigence
  if (finding.id.startsWith('FIND-PASSPORT')) {
    return 'domain:passport';
  }
  if (finding.id.startsWith('FIND-PREVIOUS-REFUSAL')) {
    return 'domain:previous_refusal';
  }
  if (finding.id.startsWith('FIND-TERRITORIAL')) {
    return 'domain:territorial_filing';
  }
  if (finding.id.startsWith('FIND-LUMP-DEPOSIT')) {
    return 'domain:lump_deposit';
  }
  if (finding.id.startsWith('FIND-CA-STUDENT-PAL')) {
    return 'domain:ca_pal';
  }

  // 4. Aucun regroupement possible : action unitaire
  return `finding:${finding.id}`;
}

/**
 * Libellés et démarches synthétisées pour les groupes fusionnés
 */
const SYNTHESIZED_ACTION_TEMPLATES: Record<
  string,
  {
    title: string;
    collapseReason: string;
    whyPrefix: string;
    concreteStep: string;
  }
> = {
  'doc:bank_statements': {
    title: 'Constituer un dossier bancaire complet et probant (solde, antériorité et flux)',
    collapseReason: 'Regroupement de constats relatifs à la justification des avoirs financiers et de leur traçabilité.',
    whyPrefix: 'L’autorité consulaire exige des relevés bancaires réguliers, vérifiables et attestant de ressources suffisantes.',
    concreteStep:
      'Télécharger les relevés bancaires originaux certifiés des 3 à 6 derniers mois, accompagner les rentrées inhabituelles de pièces justificatives et joindre une attestation de solde récente.',
  },
  'doc:travel_insurance': {
    title: 'Souscrire une assurance voyage conforme aux normes réglementaires',
    collapseReason: 'Regroupement de constats relatifs à la couverture médicale et à la conformité du contrat.',
    whyPrefix: 'La réglementation consulaire impose une couverture d’assistance et rapatriement avec un plafond minimal opposable.',
    concreteStep:
      'Obtenir auprès d’une compagnie reconnue une attestation d’assurance mentionnant expressément la zone couverte, la durée exacte du séjour et le plafond minimum réglementaire (30 000 € pour Schengen).',
  },
  'doc:funding_guarantor': {
    title: 'Constituer le dossier probant complet du garant financier',
    collapseReason: 'Regroupement de constats relatifs à l’identification et aux capacités économiques du garant.',
    whyPrefix: 'La prise en charge par un tiers requiert l’établissement formel de son identité, de ses revenus nets et de sa solvabilité fiscale.',
    concreteStep:
      'Réunir la lettre d’engagement de prise en charge, les 3 derniers bulletins de paie ou avis d’imposition du garant, ses relevés bancaires et sa pièce d’identité officielle en cours de validité.',
  },
  'doc:attestation_accueil': {
    title: 'Finaliser les justificatifs d’hébergement (attestation officielle légalisée)',
    collapseReason: 'Regroupement de constats relatifs à l’adresse de séjour et aux conditions d’accueil.',
    whyPrefix: 'L’hébergement chez un particulier doit faire l’objet d’un document officiel validé par la mairie compétente.',
    concreteStep:
      'Obtenir l’attestation d’accueil originale délivrée par la mairie de l’hébergeant, ainsi qu’une copie de sa pièce d’identité et de son titre de propriété ou quittance de loyer.',
  },
  'doc:hotel_booking': {
    title: 'Sécuriser les réservations d’hébergement sur toute la durée du séjour',
    collapseReason: 'Regroupement de constats relatifs à la continuité de l’hébergement.',
    whyPrefix: 'Le consulat vérifie la cohérence et l’exhaustivité des nuitées sur l’ensemble de la période déclarée.',
    concreteStep:
      'Produire des confirmations de réservation d’hôtel couvrant sans interruption chaque nuit du séjour, avec mention explicite du nom du demandeur.',
  },
  'doc:provincial_attestation_letter': {
    title: 'Obtenir la Lettre d’Attestation Provinciale (PAL/CAQ)',
    collapseReason: 'Regroupement de constats sur les exigences préalables au permis d’études.',
    whyPrefix: 'Les règles d’immigration canadiennes subordonnent la recevabilité de la demande à l’attestation provinciale officielle.',
    concreteStep:
      'Vérifier auprès de votre établissement d’enseignement désigné l’émission de la PAL provinciale ou du document équivalent et l’annexer au formulaire de demande.',
  },
  'domain:passport': {
    title: 'Vérifier et sécuriser la conformité réglementaire du passeport',
    collapseReason: 'Regroupement des exigences formelles relatives au document de voyage.',
    whyPrefix: 'Le passeport doit répondre à des critères stricts de validité temporelle et de pages vierges disponibles.',
    concreteStep:
      'Vérifier que la validité résiduelle dépasse de plus de 3 à 6 mois la date de fin du séjour envisagé et qu’au moins 2 pages consécutives sont vierges de tout visa ou tampon.',
  },
  'domain:previous_refusal': {
    title: 'Préparer une note circonstanciée relative au précédent consulaire',
    collapseReason: 'Regroupement de constats sur l’historique des demandes antérieures.',
    whyPrefix: 'Le service consulaire vérifie systématiquement les antécédents et compare la nouvelle demande avec les motifs notifiés antérieurement.',
    concreteStep:
      'Rédiger une lettre explicative factuelle et courtoise précisant les éléments nouveaux et vérifiables apportés depuis la décision précédente, en joignant la notification d’origine.',
  },
};

/**
 * Transforme un groupe de constats fusionnés en un ActionItem déterministe
 */
function synthesizeCollapsedAction(
  collapseKey: string,
  findings: AssessmentFinding[]
): ActionItem {
  // Déterminer la priorité maximale du groupe
  let priority: ActionPriority = 'recommended';
  const hasCritical = findings.some(
    (f) => determineFindingActionPriority(f) === 'critical'
  );
  const hasImportant = findings.some(
    (f) => determineFindingActionPriority(f) === 'important'
  );

  if (hasCritical) {
    priority = 'critical';
  } else if (hasImportant) {
    priority = 'important';
  }

  // Déterminer la catégorie
  let category: ActionCategory = 'evidence_collection';
  if (findings.some((f) => f.type === 'compliance_issue' || f.type === 'factual_inconsistency')) {
    category = 'regularization';
  } else if (findings.some((f) => f.type === 'evidence_gap')) {
    category = 'evidence_collection';
  } else if (findings.some((f) => f.type === 'insufficient_information')) {
    category = 'information_completion';
  } else if (findings.some((f) => f.type === 'clarification_point')) {
    category = 'context_clarification';
  } else if (findings.every((f) => f.type === 'favorable_evidence')) {
    category = 'consolidation_safeguard';
  }

  // Piliers et métadonnées
  const targetPillars = Array.from(new Set(findings.map((f) => f.pillarId))) as ConsularPillarId[];
  const isDirectBlocker = findings.some((f) => f.isDirectBlocker);
  const sourceFindingIds = findings.map((f) => f.id);
  const relatedDocKey = findings.find((f) => f.recommendedEvidence?.[0]?.relatedChecklistKey)
    ?.recommendedEvidence?.[0]?.relatedChecklistKey;
  const officialBasis = findings.find((f) => f.officialBasis)?.officialBasis;
  const sourceRuleId = findings.find((f) => f.sourceRuleId)?.sourceRuleId;

  // Si un modèle prédéfini existe pour cette clé de regroupement
  const template = SYNTHESIZED_ACTION_TEMPLATES[collapseKey];

  let title = '';
  let why = '';
  let concreteStep = '';
  let collapseReason: string | undefined = undefined;

  if (findings.length > 1) {
    if (template) {
      title = template.title;
      collapseReason = template.collapseReason;
      why = `${template.whyPrefix} Cette action répond conjointement à ${findings.length} constats identifiés (${findings.map((f) => f.title).join(' ; ')}).`;
      concreteStep = template.concreteStep;
    } else {
      title = `Régulariser et documenter : ${findings[0].title}`;
      collapseReason = `Regroupement de ${findings.length} constats relatifs à la même exigence consulaire.`;
      why = `Points conjoints relevés lors de l'examen : ${findings.map((f) => f.findingRationale).join(' ')}`;
      concreteStep = findings.find((f) => f.suggestedAction)?.suggestedAction || 'Rassembler les justificatifs probants requis.';
    }
  } else {
    // Action unitaire (1 seul finding)
    const f = findings[0];
    title = f.title;
    why = f.findingRationale;
    concreteStep = f.suggestedAction || 'Produire le justificatif correspondant.';
  }

  const id = `ACT-${priority.toUpperCase().slice(0, 4)}-${collapseKey.replace(/[^a-zA-Z0-9]/g, '-').slice(0, 30)}`;

  return {
    id,
    priority,
    category,
    title,
    why,
    concreteStep,
    isDirectBlocker,
    targetPillars,
    sourceFindingIds,
    sourceFindings: findings,
    collapsedFindingsCount: findings.length,
    collapseReason,
    relatedDocumentKey: relatedDocKey,
    officialBasis,
    sourceRuleId,
  };
}

/**
 * Moteur Déterministe d'Actions (Transforme AssessmentFinding[] -> ActionPlanSummary)
 *
 * Règles :
 * - Fonction pure, synchrone, 100% déterministe
 * - Aucun modèle probabiliste ou heuristique d'IA
 * - Auditabilité intégrale avec conservation des références vers les constats d'origine
 * - Fusion ordonnée des constats visant le même document ou la même règle
 */
export function buildActionPlanSummary(findings: AssessmentFinding[]): ActionPlanSummary {
  if (!findings || findings.length === 0) {
    return {
      criticalActions: [],
      importantActions: [],
      recommendedActions: [],
      allActions: [],
      totalActionsCount: 0,
      countsByPriority: {
        critical: 0,
        important: 0,
        recommended: 0,
      },
      hasCriticalBlocker: false,
      totalFindingsProcessed: 0,
      totalCollapsedFindings: 0,
    };
  }

  // 1. Regroupement déterministe par clé de collapse
  const groups = new Map<string, AssessmentFinding[]>();

  for (const finding of findings) {
    const key = getDeterministicCollapseKey(finding);
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(finding);
  }

  // 2. Transformation de chaque groupe en ActionItem
  const actions: ActionItem[] = [];
  let totalCollapsedFindingsCount = 0;

  for (const [key, groupFindings] of groups.entries()) {
    if (groupFindings.length > 1) {
      totalCollapsedFindingsCount += groupFindings.length;
    }
    const action = synthesizeCollapsedAction(key, groupFindings);
    actions.push(action);
  }

  // 3. Répartition déterministe dans les 3 sections
  const criticalActions = actions.filter((a) => a.priority === 'critical');
  const importantActions = actions.filter((a) => a.priority === 'important');
  const recommendedActions = actions.filter((a) => a.priority === 'recommended');

  // Ordonnancement strict : Critical d'abord, puis Important, puis Recommended
  const allActions = [...criticalActions, ...importantActions, ...recommendedActions];

  const hasCriticalBlocker = criticalActions.some((a) => a.isDirectBlocker);

  return {
    criticalActions,
    importantActions,
    recommendedActions,
    allActions,
    totalActionsCount: actions.length,
    countsByPriority: {
      critical: criticalActions.length,
      important: importantActions.length,
      recommended: recommendedActions.length,
    },
    hasCriticalBlocker,
    totalFindingsProcessed: findings.length,
    totalCollapsedFindings: totalCollapsedFindingsCount,
  };
}
