import {
  ConsularPillarId,
  PersonalizedConsularAssessment,
  AssessmentFinding,
  ConsularScrutinyLevel,
} from '../types/assessment';
import {
  FindingPresentationGroup,
  FindingSeverity,
  PresentedFinding,
  PillarScorecardData,
  FindingsPresentationSummary,
} from '../types/findingsPresentation';

// ============================================================================
// VISAFlow V2.3.2 — FINDINGS PRESENTATION ADAPTER
// ============================================================================

export const PILLAR_TITLES: Record<ConsularPillarId, string> = {
  legal_admissibility: 'Votre situation administrative et légale est-elle recevable ?',
  financial_sufficiency: 'Disposez-vous des moyens financiers suffisants pour votre séjour ?',
  financial_provenance: 'L’origine et la traçabilité de vos ressources sont-elles claires et justifiées ?',
  purpose_and_logistics: 'Votre projet de voyage et votre hébergement sont-ils cohérents ?',
  ties_and_anchors: 'Vos attaches personnelles et professionnelles au pays de départ sont-elles solides ?',
};

export const PILLAR_SHORT_TITLES: Record<ConsularPillarId, string> = {
  legal_admissibility: 'Situation Légale & Passeport',
  financial_sufficiency: 'Moyens Financiers',
  financial_provenance: 'Traçabilité des Fonds',
  purpose_and_logistics: 'Motif & Séjour',
  ties_and_anchors: 'Attaches au Pays de Départ',
};

export const GROUP_CONFIG: Record<
  FindingPresentationGroup,
  { label: string; description: string; badgeClass: string }
> = {
  strengths: {
    label: 'Éléments Favorables Confirmés',
    description: 'Éléments attestés et vérifiés qui confortent votre dossier au regard des critères consulaires.',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  },
  missing_documents: {
    label: 'Pièces Justificatives à Réunir',
    description: 'Documents obligatoires ou recommandés à rassembler avant de déposer votre dossier.',
    badgeClass: 'bg-blue-50 text-blue-800 border-blue-200',
  },
  additional_info: {
    label: 'Points à Préciser ou Compléter',
    description: 'Données ou éclaircissements nécessaires pour clarifier votre situation auprès du consulat.',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  regulatory_issues: {
    label: 'Points Bloquants Réglementaires',
    description: 'Non-conformités objectives strictes à corriger impérativement avant le dépôt (ex: durée, budget plancher).',
    badgeClass: 'bg-rose-50 text-rose-800 border-rose-200',
  },
};

export const SEVERITY_CONFIG: Record<
  FindingSeverity,
  { label: string; badgeClass: string; dotClass: string }
> = {
  critical: {
    label: 'Critique (Bloquant)',
    badgeClass: 'bg-rose-100 text-rose-800 border-rose-300 font-bold',
    dotClass: 'bg-rose-600',
  },
  important: {
    label: 'Important',
    badgeClass: 'bg-amber-100 text-amber-900 border-amber-300 font-semibold',
    dotClass: 'bg-amber-500',
  },
  recommended: {
    label: 'Recommandé',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-300 font-medium',
    dotClass: 'bg-slate-400',
  },
};

export const STATUS_LABELS: Record<ConsularScrutinyLevel, string> = {
  conforme: 'Conforme aux règles vérifiées',
  a_consolider: 'Données ou pièces à consolider',
  point_d_attention: 'Point d’attention / Clarification',
  action_requise: 'Action corrective indispensable',
};

/**
 * Mappe de façon déterministe un finding technique vers son groupe de présentation
 */
export function mapFindingToPresentationGroup(finding: AssessmentFinding): FindingPresentationGroup {
  if (finding.isDirectBlocker || finding.type === 'compliance_issue') {
    return 'regulatory_issues';
  }
  if (finding.type === 'favorable_evidence') {
    return 'strengths';
  }
  if (finding.type === 'evidence_gap') {
    return 'missing_documents';
  }
  // 'insufficient_information', 'clarification_point', 'factual_inconsistency'
  return 'additional_info';
}

/**
 * Mappe de façon déterministe un finding technique vers son niveau de sévérité
 */
export function mapFindingToSeverity(finding: AssessmentFinding): FindingSeverity {
  if (finding.isDirectBlocker || finding.type === 'factual_inconsistency') {
    return 'critical';
  }
  if (finding.type === 'favorable_evidence') {
    return 'recommended';
  }
  if (finding.priorityEligibility.weight === 'high') {
    return 'important';
  }
  return 'recommended';
}

/**
 * Transforme un AssessmentFinding individuel en PresentedFinding enrichi
 */
export function presentFinding(finding: AssessmentFinding): PresentedFinding {
  const group = mapFindingToPresentationGroup(finding);
  const severity = mapFindingToSeverity(finding);

  return {
    originalFinding: finding,
    id: finding.id,
    pillarId: finding.pillarId,
    pillarTitle: PILLAR_TITLES[finding.pillarId] || finding.pillarId,
    group,
    severity,
    groupLabel: GROUP_CONFIG[group].label,
    severityLabel: SEVERITY_CONFIG[severity].label,
    title: finding.title,
    declaredFact: finding.declaredFact,
    officialBasis: finding.officialBasis,
    sourceRuleId: finding.sourceRuleId,
    findingRationale: finding.findingRationale,
    suggestedAction: finding.suggestedAction,
    isDirectBlocker: finding.isDirectBlocker,
    recommendedEvidenceCount: finding.recommendedEvidence?.length || 0,
  };
}

/**
 * Construit les scorecards des 5 piliers consulaires et les regroupements de l'évaluation
 */
export function buildFindingsPresentationSummary(
  assessment: PersonalizedConsularAssessment
): FindingsPresentationSummary {
  const pillarIds: ConsularPillarId[] = [
    'legal_admissibility',
    'financial_sufficiency',
    'financial_provenance',
    'purpose_and_logistics',
    'ties_and_anchors',
  ];

  const groupedFindings: Record<FindingPresentationGroup, PresentedFinding[]> = {
    strengths: [],
    missing_documents: [],
    additional_info: [],
    regulatory_issues: [],
  };

  const countsByGroup: Record<FindingPresentationGroup, number> = {
    strengths: 0,
    missing_documents: 0,
    additional_info: 0,
    regulatory_issues: 0,
  };

  const countsBySeverity: Record<FindingSeverity, number> = {
    critical: 0,
    important: 0,
    recommended: 0,
  };

  const allPresentedFindings: PresentedFinding[] = [];
  const scorecards: Partial<Record<ConsularPillarId, PillarScorecardData>> = {};

  for (const pid of pillarIds) {
    const pillarDetail = assessment.pillars[pid];
    const presentedPillarFindings = pillarDetail.findings.map(presentFinding);

    let strengthsCount = 0;
    let missingDocsCount = 0;
    let additionalInfoCount = 0;
    let regulatoryIssuesCount = 0;
    let hasCriticalIssue = false;

    const severityBreakdown = {
      critical: 0,
      important: 0,
      recommended: 0,
    };

    for (const pf of presentedPillarFindings) {
      allPresentedFindings.push(pf);
      groupedFindings[pf.group].push(pf);
      countsByGroup[pf.group]++;
      countsBySeverity[pf.severity]++;

      if (pf.group === 'strengths') strengthsCount++;
      else if (pf.group === 'missing_documents') missingDocsCount++;
      else if (pf.group === 'additional_info') additionalInfoCount++;
      else if (pf.group === 'regulatory_issues') regulatoryIssuesCount++;

      if (pf.severity === 'critical') {
        severityBreakdown.critical++;
        hasCriticalIssue = true;
      } else if (pf.severity === 'important') {
        severityBreakdown.important++;
      } else {
        severityBreakdown.recommended++;
      }
    }

    scorecards[pid] = {
      pillarId: pid,
      title: PILLAR_TITLES[pid],
      shortTitle: PILLAR_SHORT_TITLES[pid],
      status: pillarDetail.status,
      statusLabel: STATUS_LABELS[pillarDetail.status],
      factsSummary: pillarDetail.factsSummary,
      officerAngle: pillarDetail.officerAngle,
      totalFindingsCount: presentedPillarFindings.length,
      strengthsCount,
      missingDocsCount,
      additionalInfoCount,
      regulatoryIssuesCount,
      hasCriticalIssue,
      severityBreakdown,
    };
  }

  const scorecardsList = pillarIds.map((id) => scorecards[id] as PillarScorecardData);

  return {
    scorecards: scorecards as Record<ConsularPillarId, PillarScorecardData>,
    scorecardsList,
    groupedFindings,
    allPresentedFindings,
    countsByGroup,
    countsBySeverity,
    totalFindings: allPresentedFindings.length,
  };
}
