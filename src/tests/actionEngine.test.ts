import { buildActionPlanSummary, determineFindingActionPriority, determineFindingActionCategory, getDeterministicCollapseKey } from '../utils/actionEngine';
import { AssessmentFinding } from '../types/assessment';
import { generate100Scenarios } from './adversarialSuite';
import { evaluateConsularProfile } from '../utils/consularAssessmentEngine';

// Verification suite for VISAFlow V2.3.3 Deterministic Action Engine
export function runActionEngineAudit(): { passed: boolean; message: string; details: any } {
  console.log('--- Starting V2.3.3 Deterministic Action Engine Audit ---');

  // Test 1: Verification of individual finding type mappings
  const mockComplianceFinding: AssessmentFinding = {
    id: 'FIND-TEST-COMPLIANCE',
    pillarId: 'legal_admissibility',
    type: 'compliance_issue',
    title: 'Dépassement de la durée autorisée de 90 jours',
    declaredFact: 'Séjour déclaré de 120 jours',
    findingRationale: 'Le Code des Visas Schengen plafonne les séjours de court séjour à 90 jours.',
    suggestedAction: 'Ajuster la durée du séjour à 90 jours maximum.',
    isDirectBlocker: true,
    priorityEligibility: { eligible: true, weight: 'high' },
  };

  const priority1 = determineFindingActionPriority(mockComplianceFinding);
  const category1 = determineFindingActionCategory(mockComplianceFinding);
  if (priority1 !== 'critical' || category1 !== 'regularization') {
    return { passed: false, message: `Failed Test 1: compliance_issue must be critical/regularization, got ${priority1}/${category1}`, details: null };
  }

  const mockFactualInconsistency: AssessmentFinding = {
    id: 'FIND-TEST-INCONSISTENCY',
    pillarId: 'purpose_and_logistics',
    type: 'factual_inconsistency',
    title: 'Budget déclaré incompatible avec l’hébergement',
    declaredFact: 'Budget 200€ pour 15 jours en hôtel',
    findingRationale: 'Contradiction matérielle directe.',
    suggestedAction: 'Harmoniser le budget et le mode d’hébergement.',
    isDirectBlocker: true,
    priorityEligibility: { eligible: true, weight: 'high' },
  };

  const priority2 = determineFindingActionPriority(mockFactualInconsistency);
  if (priority2 !== 'critical') {
    return { passed: false, message: `Failed Test 1b: factual_inconsistency must be critical, got ${priority2}`, details: null };
  }

  const mockEvidenceGap: AssessmentFinding = {
    id: 'FIND-TEST-GAP',
    pillarId: 'financial_sufficiency',
    type: 'evidence_gap',
    title: 'Absence de relevés bancaires',
    declaredFact: 'Autofinancement déclaré sans relevés',
    findingRationale: 'Relevés bancaires requis pour prouver les ressources.',
    suggestedAction: 'Télécharger les 3 derniers relevés de compte.',
    isDirectBlocker: false,
    priorityEligibility: { eligible: true, weight: 'high' },
    recommendedEvidence: [{
      targetPillar: 'financial_sufficiency',
      relatedChecklistKey: 'bank_statements',
      documentName: 'Relevés bancaires des 3 derniers mois',
      consularUtility: 'Prouver la disponibilité et stabilité des ressources',
      category: 'mandatory_by_regulation',
    }],
  };

  const priority3 = determineFindingActionPriority(mockEvidenceGap);
  const category3 = determineFindingActionCategory(mockEvidenceGap);
  if (priority3 !== 'important' || category3 !== 'evidence_collection') {
    return { passed: false, message: `Failed Test 1c: evidence_gap mandatory must be important/evidence_collection, got ${priority3}/${category3}`, details: null };
  }

  const mockFavorable: AssessmentFinding = {
    id: 'FIND-TEST-FAVORABLE',
    pillarId: 'ties_and_anchors',
    type: 'favorable_evidence',
    title: 'Emploi stable sous contrat à durée indéterminée',
    declaredFact: 'Salarié depuis 5 ans',
    findingRationale: 'Élément attestant d’un ancrage économique sérieux.',
    suggestedAction: 'Joindre l’attestation de travail et les bulletins récents.',
    isDirectBlocker: false,
    priorityEligibility: { eligible: false, weight: 'low' },
  };

  const priority4 = determineFindingActionPriority(mockFavorable);
  const category4 = determineFindingActionCategory(mockFavorable);
  if (priority4 !== 'recommended' || category4 !== 'consolidation_safeguard') {
    return { passed: false, message: `Failed Test 1d: favorable_evidence must be recommended/consolidation_safeguard, got ${priority4}/${category4}`, details: null };
  }

  // Test 2: Collapsing Verification
  // Two findings targeting the same document key 'bank_statements'
  const mockBankGap2: AssessmentFinding = {
    id: 'FIND-TEST-GAP-BANK-2',
    pillarId: 'financial_provenance',
    type: 'clarification_point',
    title: 'Origine d’un dépôt exceptionnel récent',
    declaredFact: 'Virement de 2M FCFA il y a 10 jours',
    findingRationale: 'Les mouvements de fonds récents et inhabituels doivent être traçables.',
    suggestedAction: 'Fournir l’acte de vente ou l’attestation de prêt.',
    isDirectBlocker: false,
    priorityEligibility: { eligible: true, weight: 'high' },
    recommendedEvidence: [{
      targetPillar: 'financial_provenance',
      relatedChecklistKey: 'bank_statements',
      documentName: 'Justificatif d’origine des fonds bancaires',
      consularUtility: 'Prouver la licéité et stabilité du capital déclaré',
      category: 'possible_clarification',
    }],
  };

  const planSummary = buildActionPlanSummary([mockEvidenceGap, mockBankGap2]);
  if (planSummary.totalActionsCount !== 1) {
    return { passed: false, message: `Failed Test 2: Expected 2 bank findings to collapse into 1 action, got ${planSummary.totalActionsCount}`, details: planSummary };
  }
  const collapsedAction = planSummary.allActions[0];
  if (collapsedAction.collapsedFindingsCount !== 2) {
    return { passed: false, message: `Failed Test 2b: Collapsed action should have collapsedFindingsCount=2, got ${collapsedAction.collapsedFindingsCount}`, details: collapsedAction };
  }
  if (collapsedAction.sourceFindingIds.length !== 2 || !collapsedAction.sourceFindingIds.includes('FIND-TEST-GAP') || !collapsedAction.sourceFindingIds.includes('FIND-TEST-GAP-BANK-2')) {
    return { passed: false, message: `Failed Test 2c: Auditability preserved sourceFindingIds missing`, details: collapsedAction };
  }

  // Test 3: Processing 100 Adversarial Scenarios
  const scenarios = generate100Scenarios();
  let totalFindingsProcessed = 0;
  let totalActionsGenerated = 0;
  let totalCollapsedActions = 0;

  for (const s of scenarios) {
    const assessment = evaluateConsularProfile(s.payload, String(s.id));
    const findings = (Object.values(assessment.pillars) as any[]).flatMap((p) => p.findings as AssessmentFinding[]);
    const plan = buildActionPlanSummary(findings);

    totalFindingsProcessed += findings.length;
    totalActionsGenerated += plan.totalActionsCount;
    totalCollapsedActions += plan.totalCollapsedFindings;

    // Check invariants
    // Invariant 1: Sum of sections equals totalActionsCount
    const sumSections = plan.criticalActions.length + plan.importantActions.length + plan.recommendedActions.length;
    if (sumSections !== plan.totalActionsCount) {
      return { passed: false, message: `Invariant violation in scenario ${s.id}: sum of sections (${sumSections}) != totalActions (${plan.totalActionsCount})`, details: s };
    }

    // Invariant 2: If there is a direct blocker, hasCriticalBlocker must be true
    const hasBlockerFinding = findings.some((f) => f.isDirectBlocker);
    if (hasBlockerFinding && !plan.hasCriticalBlocker) {
      return { passed: false, message: `Invariant violation in scenario ${s.id}: Direct blocker present in findings but not flagged in ActionPlanSummary`, details: s };
    }

    // Invariant 3: Auditability: all findings accounted for
    const allMappedSourceIds = plan.allActions.flatMap((a) => a.sourceFindingIds);
    if (allMappedSourceIds.length !== findings.length) {
      return { passed: false, message: `Audit invariant failed in scenario ${s.id}: mapped findings (${allMappedSourceIds.length}) != original findings (${findings.length})`, details: s };
    }
  }

  console.log(`Audit Success! Processed ${scenarios.length} scenarios, ${totalFindingsProcessed} findings -> ${totalActionsGenerated} deterministic actions (${totalCollapsedActions} collapsed findings).`);

  return {
    passed: true,
    message: `All invariants passed across 100 adversarial scenarios. Total findings: ${totalFindingsProcessed}, Actions: ${totalActionsGenerated}, Collapsed findings: ${totalCollapsedActions}.`,
    details: { scenariosCount: scenarios.length, totalFindingsProcessed, totalActionsGenerated, totalCollapsedActions },
  };
}
