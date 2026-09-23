import {
  evaluateConsularProfile,
} from '../utils/consularAssessmentEngine';
import {
  buildActionPlanSummary,
} from '../utils/actionEngine';
import {
  buildDocumentReadinessSummary,
  validateDocumentReadinessSummary,
} from '../utils/documentReadinessEngine';
import {
  DETERMINISTIC_TRANSITION_TABLE,
  computeNextState,
  validateStateTransition,
  deriveDocumentReadinessState,
  EvidenceMachineState,
  EvidenceLifecycleEvent,
} from '../utils/evidenceStateMachine';
import {
  ExplicitUploadedDocument,
  EvidenceVerificationEvent,
  ReadinessEvidenceSource,
  EvidenceComplianceStatus,
} from '../types/documentReadiness';
import { AssessmentFinding } from '../types/assessment';

// ============================================================================
// VISAFlow V2.3.10 — FORMAL STATE MACHINE CERTIFICATION AUDIT SUITE
// ============================================================================

export interface AuditSuiteResult {
  partName: string;
  totalTests: number;
  passedTests: number;
  passed: boolean;
  failures: string[];
}

export interface FullCertificationReport {
  passed: boolean;
  totalParts: number;
  passedParts: number;
  results: AuditSuiteResult[];
}

/**
 * Helper to build standard valid findings and action plan
 */
function getBaselineFixtures(destination = 'france', visaReason = 'tourisme_visite') {
  const assessment = evaluateConsularProfile(
    {
      destination,
      visaReason,
      countryOfOrigin: 'Sénégal',
      status: 'salarie',
      fundingSource: 'autofinancement',
      availableBudgetFcfa: 3500000,
      hasRecentLumpDeposit: false,
      tiesType: 'contrat_cdi',
      accommodationType: 'hotel_confirme',
      hasPassport6MonthsValid: true,
      hasPreviousRefusal: false,
      travelDurationDays: 14,
    } as any,
    'audit-v2310-fixture'
  );
  const findings = (Object.values(assessment.pillars) as any[]).flatMap(
    (p) => p.findings as AssessmentFinding[]
  );
  const actionPlan = buildActionPlanSummary(findings);
  return { findings, actionPlan };
}

// ----------------------------------------------------------------------------
// PART 2: STATE MACHINE TRANSITION INTEGRITY
// ----------------------------------------------------------------------------
export function runPart2StateMachineTransitions(): AuditSuiteResult {
  const failures: string[] = [];
  let testCount = 0;
  let passedCount = 0;

  testCount++;
  // Test 2.1: Transition table integrity
  if (DETERMINISTIC_TRANSITION_TABLE.length < 25) {
    failures.push(`Transition table has only ${DETERMINISTIC_TRANSITION_TABLE.length} rules, expected >= 25.`);
  } else {
    passedCount++;
  }

  testCount++;
  // Test 2.2: Cannot verify from declared
  const t22 = computeNextState('declared', 'VERIFY_SUCCESS');
  if (t22.allowed || t22.nextState === 'verified' || t22.nextState === 'ready') {
    failures.push('State machine allowed VERIFY_SUCCESS on declared fact!');
  } else {
    passedCount++;
  }

  testCount++;
  // Test 2.3: Cannot evaluate compliance pass on declared
  const t23 = computeNextState('declared', 'EVALUATE_COMPLIANCE_PASS');
  if (t23.allowed || t23.nextState === 'ready') {
    failures.push('State machine allowed EVALUATE_COMPLIANCE_PASS on declared fact!');
  } else {
    passedCount++;
  }

  testCount++;
  // Test 2.4: Uploaded + Verify -> Verified
  const t24 = computeNextState('uploaded', 'VERIFY_SUCCESS');
  if (!t24.allowed || t24.nextState !== 'verified') {
    failures.push(`Expected uploaded + VERIFY_SUCCESS -> verified, got ${t24.nextState}`);
  } else {
    passedCount++;
  }

  testCount++;
  // Test 2.5: Verified + Compliance Pass -> Ready
  const t25 = computeNextState('verified', 'EVALUATE_COMPLIANCE_PASS');
  if (!t25.allowed || t25.nextState !== 'ready') {
    failures.push(`Expected verified + EVALUATE_COMPLIANCE_PASS -> ready, got ${t25.nextState}`);
  } else {
    passedCount++;
  }

  testCount++;
  // Test 2.6: Ready + Revoke -> Rejected
  const t26 = computeNextState('ready', 'REVOKE_VERIFICATION');
  if (!t26.allowed || t26.nextState !== 'rejected') {
    failures.push(`Expected ready + REVOKE_VERIFICATION -> rejected, got ${t26.nextState}`);
  } else {
    passedCount++;
  }

  testCount++;
  // Test 2.7: Ready + Compliance Fail -> Compliance_Evaluated (loss of READY)
  const t27 = computeNextState('ready', 'EVALUATE_COMPLIANCE_FAIL');
  if (!t27.allowed || t27.nextState === 'ready') {
    failures.push('Ready + EVALUATE_COMPLIANCE_FAIL retained ready state!');
  } else {
    passedCount++;
  }

  return {
    partName: 'Part 2: Evidence State Machine Transition Audit',
    totalTests: testCount,
    passedTests: passedCount,
    passed: failures.length === 0,
    failures,
  };
}

// ----------------------------------------------------------------------------
// PART 4: AUDIT TEST 2 EXPLICIT COMPLIANCE & PAIRED NEGATIVE TEST
// ----------------------------------------------------------------------------
export function runPart4Test2ExplicitComplianceAndPairedNegative(): AuditSuiteResult {
  const { findings, actionPlan } = getBaselineFixtures();
  const failures: string[] = [];
  let testCount = 0;
  let passedCount = 0;

  // Positive Test: UPLOADED + VALID VERIFICATION + EXPLICIT COMPLIANCE -> READY
  testCount++;
  const positiveDoc: ExplicitUploadedDocument = {
    id: 'UPL-T4-POS-PASS',
    checklistKey: 'passport',
    fileName: 'verified_compliant_passport.pdf',
    isVerified: true,
    verificationStatus: 'verified',
    verificationMethod: 'official_source_match',
    verificationEventId: 'EVT-T4-POS-PASS',
    verificationEvent: {
      id: 'EVT-T4-POS-PASS',
      evidenceId: 'UPL-T4-POS-PASS',
      outcome: 'verified',
      method: 'official_source_match',
      timestamp: '2026-09-13T09:00:00Z',
      rationale: 'Passeport biométrique authentifié et validité 10 ans vérifiée.',
      performedBy: 'consular_officer',
    },
    isLegible: true,
    isExpired: false,
    isCompliant: true,
    complianceStatus: 'compliant', // Explicit compliance
    expiryDate: '2034-01-01',
  };

  const summaryPos = buildDocumentReadinessSummary(findings, actionPlan, {
    destination: 'france',
    visaType: 'tourisme',
    uploadedDocuments: [positiveDoc],
  });

  const passPos = summaryPos.items.find((i) => i.id === 'DOC-PASSPORT')!;
  if (
    passPos.isEvidenceDirectlyVerified !== true ||
    passPos.evidenceComplianceStatus !== 'compliant' ||
    passPos.status !== 'ready' ||
    passPos.lifecycleStage !== 'ready'
  ) {
    failures.push('Positive Test 4 failed: Verified and explicitly compliant document was not READY!');
  } else {
    passedCount++;
  }

  // Negative Paired Test: UPLOADED + VALID VERIFICATION + NO COMPLIANCE EVALUATION (not_evaluated) -> NOT READY
  testCount++;
  const unassessedDoc: ExplicitUploadedDocument = {
    id: 'UPL-T4-NEG-PASS',
    checklistKey: 'passport',
    fileName: 'verified_unassessed_passport.pdf',
    isVerified: true,
    verificationStatus: 'verified',
    verificationMethod: 'official_source_match',
    verificationEventId: 'EVT-T4-NEG-PASS',
    verificationEvent: {
      id: 'EVT-T4-NEG-PASS',
      evidenceId: 'UPL-T4-NEG-PASS',
      outcome: 'verified',
      method: 'official_source_match',
      timestamp: '2026-09-13T09:00:00Z',
      rationale: 'Passeport biométrique authentique mais conformité légale non encore instruite.',
      performedBy: 'consular_officer',
    },
    isLegible: true,
    complianceStatus: 'not_evaluated', // EXPLICITLY NOT EVALUATED
  };

  const summaryNeg = buildDocumentReadinessSummary(findings, actionPlan, {
    destination: 'france',
    visaType: 'tourisme',
    uploadedDocuments: [unassessedDoc],
  });

  const passNeg = summaryNeg.items.find((i) => i.id === 'DOC-PASSPORT')!;
  if (passNeg.isEvidenceDirectlyVerified !== true) {
    failures.push('Negative Paired Test failed: Document should still be VERIFIED!');
  } else if (passNeg.evidenceComplianceStatus !== 'not_evaluated') {
    failures.push(`Negative Paired Test failed: Compliance status should be 'not_evaluated', got '${passNeg.evidenceComplianceStatus}'`);
  } else if (passNeg.status === 'ready') {
    failures.push('Negative Paired Test failed: Document without compliance evaluation was marked READY! (VERIFIED != COMPLIANT violation)');
  } else if (passNeg.lifecycleStage === 'ready') {
    failures.push('Negative Paired Test failed: Lifecycle stage became ready without compliance evaluation!');
  } else {
    passedCount++;
  }

  return {
    partName: 'Part 4: Test 2 Audit & Paired Negative Compliance Test',
    totalTests: testCount,
    passedTests: passedCount,
    passed: failures.length === 0,
    failures,
  };
}

// ----------------------------------------------------------------------------
// PART 5: EVIDENCE SOURCE MATRIX (6 SOURCES x 4 PROPERTIES)
// ----------------------------------------------------------------------------
export function runPart5EvidenceSourceMatrix(): AuditSuiteResult {
  const { findings, actionPlan } = getBaselineFixtures();
  const failures: string[] = [];
  let testCount = 0;
  let passedCount = 0;

  const sources: ReadinessEvidenceSource[] = [
    'applicant_fact',
    'uploaded_document',
    'verified_document',
    'assessment_finding',
    'action_completion',
    'generated_artifact',
  ];

  for (const src of sources) {
    testCount++;
    const isVerifiedDoc = src === 'verified_document';

    // Pure derivation test
    const derivation = deriveDocumentReadinessState({
      isApplicable: true,
      exists: true,
      readinessEvidenceSource: src,
      readinessEvidenceIds: ['EV-ID-01'],
      isEvidenceDirectlyVerified: true,
      hasValidVerificationEvent: true,
      authoritativeVerificationEvent: {
        id: 'EVT-TEST',
        evidenceId: 'EV-ID-01',
        outcome: 'verified',
        method: 'official_source_match',
        timestamp: '2026-09-13T09:00:00Z',
        rationale: 'Valid rationale',
        performedBy: 'consular_officer',
      },
      complianceStatus: 'compliant',
      complianceRuleIds: ['RULE-TEST'],
      lifecycleStage: 'ready',
    });

    if (src === 'applicant_fact' && derivation.isReady) {
      failures.push('Source applicant_fact was allowed to become READY in derivation!');
    } else if (src === 'generated_artifact' && derivation.isReady) {
      failures.push('Source generated_artifact was allowed to become READY in derivation!');
    } else if (src === 'uploaded_document' && derivation.isReady) {
      failures.push('Source uploaded_document (unpromoted) was allowed to become READY in derivation!');
    } else if (src === 'assessment_finding' && derivation.isReady) {
      failures.push('Source assessment_finding was allowed to become READY in derivation!');
    } else if (src === 'action_completion' && derivation.isReady) {
      failures.push('Source action_completion was allowed to become READY in derivation!');
    } else if (src === 'verified_document' && !derivation.isReady) {
      failures.push(`Source verified_document with all conditions met was NOT READY! Reasons: ${derivation.failureReasons.join(', ')}`);
    } else {
      passedCount++;
    }
  }

  return {
    partName: 'Part 5: Automated Evidence Source Matrix',
    totalTests: testCount,
    passedTests: passedCount,
    passed: failures.length === 0,
    failures,
  };
}

// ----------------------------------------------------------------------------
// PART 6: COMPLIANCE MATRIX (6 DETERMINISTIC EDGE CASES)
// ----------------------------------------------------------------------------
export function runPart6ComplianceMatrix(): AuditSuiteResult {
  const { findings, actionPlan } = getBaselineFixtures();
  const failures: string[] = [];
  let testCount = 0;
  let passedCount = 0;

  // Case 1: VERIFIED + NOT_EVALUATED -> NOT READY
  testCount++;
  const d1 = deriveDocumentReadinessState({
    isApplicable: true,
    exists: true,
    readinessEvidenceSource: 'verified_document',
    readinessEvidenceIds: ['E1'],
    isEvidenceDirectlyVerified: true,
    hasValidVerificationEvent: true,
    complianceStatus: 'not_evaluated',
    complianceRuleIds: [],
  });
  if (d1.isReady) {
    failures.push('Case 1 failed: VERIFIED + NOT_EVALUATED became READY!');
  } else {
    passedCount++;
  }

  // Case 2: VERIFIED + COMPLIANT -> READY
  testCount++;
  const d2 = deriveDocumentReadinessState({
    isApplicable: true,
    exists: true,
    readinessEvidenceSource: 'verified_document',
    readinessEvidenceIds: ['E2'],
    isEvidenceDirectlyVerified: true,
    hasValidVerificationEvent: true,
    complianceStatus: 'compliant',
    complianceRuleIds: ['RULE-01'],
  });
  if (!d2.isReady) {
    failures.push('Case 2 failed: VERIFIED + COMPLIANT was NOT READY!');
  } else {
    passedCount++;
  }

  // Case 3: VERIFIED + NON_COMPLIANT -> NOT READY
  testCount++;
  const d3 = deriveDocumentReadinessState({
    isApplicable: true,
    exists: true,
    readinessEvidenceSource: 'verified_document',
    readinessEvidenceIds: ['E3'],
    isEvidenceDirectlyVerified: true,
    hasValidVerificationEvent: true,
    complianceStatus: 'non_compliant',
    complianceRuleIds: ['RULE-01'],
  });
  if (d3.isReady) {
    failures.push('Case 3 failed: VERIFIED + NON_COMPLIANT became READY!');
  } else {
    passedCount++;
  }

  // Case 4: UNVERIFIED + COMPLIANT -> NOT READY
  testCount++;
  const d4 = deriveDocumentReadinessState({
    isApplicable: true,
    exists: true,
    readinessEvidenceSource: 'uploaded_document',
    readinessEvidenceIds: ['E4'],
    isEvidenceDirectlyVerified: false,
    hasValidVerificationEvent: false,
    complianceStatus: 'compliant',
    complianceRuleIds: ['RULE-01'],
  });
  if (d4.isReady) {
    failures.push('Case 4 failed: UNVERIFIED + COMPLIANT became READY!');
  } else {
    passedCount++;
  }

  // Case 5: NO EVIDENCE + COMPLIANT -> NOT READY
  testCount++;
  const d5 = deriveDocumentReadinessState({
    isApplicable: true,
    exists: false,
    readinessEvidenceSource: undefined,
    readinessEvidenceIds: [],
    isEvidenceDirectlyVerified: false,
    hasValidVerificationEvent: false,
    complianceStatus: 'compliant',
    complianceRuleIds: ['RULE-01'],
  });
  if (d5.isReady) {
    failures.push('Case 5 failed: NO EVIDENCE + COMPLIANT became READY!');
  } else {
    passedCount++;
  }

  // Case 6: NOT_APPLICABLE + COMPLIANT -> NOT READY / NOT APPLICABLE
  testCount++;
  const d6 = deriveDocumentReadinessState({
    isApplicable: false,
    exists: true,
    readinessEvidenceSource: 'verified_document',
    readinessEvidenceIds: ['E6'],
    isEvidenceDirectlyVerified: true,
    hasValidVerificationEvent: true,
    complianceStatus: 'compliant',
    complianceRuleIds: ['RULE-01'],
  });
  if (d6.isReady) {
    failures.push('Case 6 failed: NOT_APPLICABLE + COMPLIANT became READY!');
  } else {
    passedCount++;
  }

  return {
    partName: 'Part 6: Compliance Matrix (6 Edge Cases)',
    totalTests: testCount,
    passedTests: passedCount,
    passed: failures.length === 0,
    failures,
  };
}

// ----------------------------------------------------------------------------
// PART 7: NECESSARY-CONDITION MUTATION TESTS (9 CONDITIONS)
// ----------------------------------------------------------------------------
export function runPart7MutationTests(): AuditSuiteResult {
  const failures: string[] = [];
  let testCount = 0;
  let passedCount = 0;

  // Baseline 100% valid state
  const baseValid = {
    isApplicable: true,
    exists: true,
    readinessEvidenceSource: 'verified_document' as ReadinessEvidenceSource,
    readinessEvidenceIds: ['EV-BASE-01'],
    isEvidenceDirectlyVerified: true,
    hasValidVerificationEvent: true,
    authoritativeVerificationEvent: {
      id: 'EVT-BASE-01',
      evidenceId: 'EV-BASE-01',
      outcome: 'verified' as const,
      method: 'official_source_match' as const,
      timestamp: '2026-09-13T09:00:00Z',
      rationale: 'Valid rationale',
      performedBy: 'consular_officer' as const,
    },
    complianceStatus: 'compliant' as EvidenceComplianceStatus,
    complianceRuleIds: ['RULE-BASE-01'],
    lifecycleStage: 'ready' as const,
  };

  // Pre-check: base is ready
  const checkBase = deriveDocumentReadinessState(baseValid);
  if (!checkBase.isReady) {
    failures.push(`Base setup is not READY: ${checkBase.failureReasons.join('; ')}`);
  }

  // Mutation 1: isApplicable = false
  testCount++;
  const m1 = deriveDocumentReadinessState({ ...baseValid, isApplicable: false });
  if (m1.isReady) {
    failures.push('Mutation 1 failed: isApplicable=false was marked READY!');
  } else {
    passedCount++;
  }

  // Mutation 2: exists = false
  testCount++;
  const m2 = deriveDocumentReadinessState({ ...baseValid, exists: false });
  if (m2.isReady) {
    failures.push('Mutation 2 failed: exists=false was marked READY!');
  } else {
    passedCount++;
  }

  // Mutation 3: source = applicant_fact
  testCount++;
  const m3 = deriveDocumentReadinessState({ ...baseValid, readinessEvidenceSource: 'applicant_fact' });
  if (m3.isReady) {
    failures.push('Mutation 3 failed: source=applicant_fact was marked READY!');
  } else {
    passedCount++;
  }

  // Mutation 4: source = generated_artifact
  testCount++;
  const m4 = deriveDocumentReadinessState({ ...baseValid, readinessEvidenceSource: 'generated_artifact' });
  if (m4.isReady) {
    failures.push('Mutation 4 failed: source=generated_artifact was marked READY!');
  } else {
    passedCount++;
  }

  // Mutation 5: evidenceIds = []
  testCount++;
  const m5 = deriveDocumentReadinessState({ ...baseValid, readinessEvidenceIds: [] });
  if (m5.isReady) {
    failures.push('Mutation 5 failed: empty readinessEvidenceIds was marked READY!');
  } else {
    passedCount++;
  }

  // Mutation 6: isEvidenceDirectlyVerified = false
  testCount++;
  const m6 = deriveDocumentReadinessState({ ...baseValid, isEvidenceDirectlyVerified: false });
  if (m6.isReady) {
    failures.push('Mutation 6 failed: isEvidenceDirectlyVerified=false was marked READY!');
  } else {
    passedCount++;
  }

  // Mutation 7: verification event outcome = rejected
  testCount++;
  const m7 = deriveDocumentReadinessState({
    ...baseValid,
    hasValidVerificationEvent: false,
    authoritativeVerificationEvent: {
      ...baseValid.authoritativeVerificationEvent,
      outcome: 'rejected',
    },
  });
  if (m7.isReady) {
    failures.push('Mutation 7 failed: verification event rejected was marked READY!');
  } else {
    passedCount++;
  }

  // Mutation 8: complianceStatus = non_compliant
  testCount++;
  const m8 = deriveDocumentReadinessState({ ...baseValid, complianceStatus: 'non_compliant' });
  if (m8.isReady) {
    failures.push('Mutation 8 failed: complianceStatus=non_compliant was marked READY!');
  } else {
    passedCount++;
  }

  // Mutation 9: complianceStatus = not_evaluated
  testCount++;
  const m9 = deriveDocumentReadinessState({ ...baseValid, complianceStatus: 'not_evaluated' });
  if (m9.isReady) {
    failures.push('Mutation 9 failed: complianceStatus=not_evaluated was marked READY!');
  } else {
    passedCount++;
  }

  return {
    partName: 'Part 7: Necessary-Condition Mutation Tests (9 Invariants)',
    totalTests: testCount,
    passedTests: passedCount,
    passed: failures.length === 0,
    failures,
  };
}

// ----------------------------------------------------------------------------
// PART 8: STATE REVERSALS (6 TRANSITIONS)
// ----------------------------------------------------------------------------
export function runPart8StateReversals(): AuditSuiteResult {
  const { findings, actionPlan } = getBaselineFixtures();
  const failures: string[] = [];
  let testCount = 0;
  let passedCount = 0;

  // 1. Revocation: Verified + Revocation -> Loss of READY
  testCount++;
  const summaryRevocation = buildDocumentReadinessSummary(findings, actionPlan, {
    destination: 'france',
    visaType: 'tourisme',
    uploadedDocuments: [
      {
        id: 'UPL-REV-01',
        checklistKey: 'passport',
        fileName: 'revoked_pass.pdf',
        isVerified: true,
        isLegible: true,
        isExpired: false,
        isCompliant: true,
        expiryDate: '2030-01-01',
      },
    ],
    verificationEvents: [
      {
        id: 'EVT-REV-INITIAL',
        evidenceId: 'UPL-REV-01',
        outcome: 'verified',
        method: 'document_review',
        timestamp: '2026-09-13T09:00:00Z',
        rationale: 'Initial verification',
        performedBy: 'consular_officer',
      },
      {
        id: 'EVT-REV-SUBSEQUENT',
        evidenceId: 'UPL-REV-01',
        outcome: 'rejected',
        method: 'document_review',
        timestamp: '2026-09-13T10:00:00Z',
        rationale: 'Subsequent revocation after fraud suspicion',
        performedBy: 'consular_officer',
      },
    ],
  });
  const passRev = summaryRevocation.items.find((i) => i.id === 'DOC-PASSPORT')!;
  if (passRev.status === 'ready' || passRev.isEvidenceDirectlyVerified === true) {
    failures.push('Reversal 1 failed: Revoked document retained READY or verified status!');
  } else {
    passedCount++;
  }

  // 2. Rejection: Uploaded doc rejected during review
  testCount++;
  const summaryReject = buildDocumentReadinessSummary(findings, actionPlan, {
    destination: 'france',
    visaType: 'tourisme',
    uploadedDocuments: [
      {
        id: 'UPL-REJ-01',
        checklistKey: 'passport',
        fileName: 'bad_scan.pdf',
        isVerified: false,
      },
    ],
    verificationEvents: [
      {
        id: 'EVT-REJ-01',
        evidenceId: 'UPL-REJ-01',
        outcome: 'rejected',
        method: 'document_review',
        timestamp: '2026-09-13T09:00:00Z',
        rationale: 'Falsification detectee',
        performedBy: 'consular_officer',
      },
    ],
  });
  const passRej = summaryReject.items.find((i) => i.id === 'DOC-PASSPORT')!;
  if (passRej.status === 'ready') {
    failures.push('Reversal 2 failed: Rejected document became READY!');
  } else {
    passedCount++;
  }

  // 3. Non-Compliance: Verified doc expires -> Loss of READY
  testCount++;
  const summaryExpired = buildDocumentReadinessSummary(findings, actionPlan, {
    destination: 'france',
    visaType: 'tourisme',
    uploadedDocuments: [
      {
        id: 'UPL-EXP-01',
        checklistKey: 'passport',
        fileName: 'pass_now_expired.pdf',
        isVerified: true,
        verificationStatus: 'verified',
        verificationMethod: 'document_review',
        verificationEventId: 'EVT-EXP-01',
        verificationEvent: {
          id: 'EVT-EXP-01',
          evidenceId: 'UPL-EXP-01',
          outcome: 'verified',
          method: 'document_review',
          timestamp: '2026-09-13T09:00:00Z',
          rationale: 'Authentic passport scan',
          performedBy: 'consular_officer',
        },
        isExpired: true,
        isCompliant: false,
        expiryDate: '2023-01-01',
      },
    ],
  });
  const passExp = summaryExpired.items.find((i) => i.id === 'DOC-PASSPORT')!;
  if (passExp.status === 'ready' || passExp.evidenceComplianceStatus === 'compliant') {
    failures.push('Reversal 3 failed: Expired verified passport remained READY or compliant!');
  } else {
    passedCount++;
  }

  // 4. Deletion: Removing uploaded document reverts item to missing/clarification
  testCount++;
  const summaryDeleted = buildDocumentReadinessSummary(findings, actionPlan, {
    destination: 'france',
    visaType: 'tourisme',
    uploadedDocuments: [], // empty (deleted)
  });
  const passDel = summaryDeleted.items.find((i) => i.id === 'DOC-PASSPORT')!;
  if (passDel.status === 'ready' || passDel.lifecycleStage !== 'not_provided') {
    failures.push('Reversal 4 failed: Deleted document did not revert to not_provided/non-ready!');
  } else {
    passedCount++;
  }

  // 5. Not-Applicable Transition: Travel insurance for Canada Study
  testCount++;
  const summaryNotApp = buildDocumentReadinessSummary(findings, actionPlan, {
    destination: 'canada',
    visaType: 'etudiant',
    applicantFacts: { destination: 'canada', visaReason: 'etudes' },
    uploadedDocuments: [
      {
        id: 'UPL-INS-01',
        checklistKey: 'travel_insurance',
        fileName: 'valid_insurance.pdf',
        isVerified: true,
        verificationStatus: 'verified',
        verificationMethod: 'document_review',
        verificationEventId: 'EVT-INS-01',
        verificationEvent: {
          id: 'EVT-INS-01',
          evidenceId: 'UPL-INS-01',
          outcome: 'verified',
          method: 'document_review',
          timestamp: '2026-09-13T09:00:00Z',
          rationale: 'Insurance valid',
          performedBy: 'consular_officer',
        },
        isCompliant: true,
      },
    ],
  });
  const insItem = summaryNotApp.items.find((i) => i.id === 'DOC-TRAVEL-INSURANCE')!;
  if (insItem.applicability !== 'not_applicable' || insItem.status !== undefined) {
    failures.push('Reversal 5 failed: Not-applicable document was assigned status or was not not_applicable!');
  } else {
    passedCount++;
  }

  // 6. Orphaned Evidence: Verification event for an unknown evidence ID must trigger validator rejection or not verify anything
  testCount++;
  try {
    const summaryOrphan = buildDocumentReadinessSummary(findings, actionPlan, {
      destination: 'france',
      visaType: 'tourisme',
      uploadedDocuments: [
        {
          id: 'UPL-REAL-01',
          checklistKey: 'passport',
          fileName: 'passport.pdf',
          isVerified: false,
        },
      ],
      verificationEvents: [
        {
          id: 'EVT-ORPHAN-01',
          evidenceId: 'UNKNOWN-EVIDENCE-GHOST',
          outcome: 'verified',
          method: 'official_source_match',
          timestamp: '2026-09-13T09:00:00Z',
          rationale: 'Ghost verification',
          performedBy: 'consular_officer',
        },
      ],
    });
    const passOrphan = summaryOrphan.items.find((i) => i.id === 'DOC-PASSPORT')!;
    if (passOrphan.isEvidenceDirectlyVerified === true || passOrphan.status === 'ready') {
      failures.push('Reversal 6 failed: Orphaned verification event attached to unrelated evidence!');
    } else {
      passedCount++;
    }
  } catch (err: any) {
    if (err?.message?.includes('references nonexistent evidence ID')) {
      // Invariant validator correctly rejected orphaned verification event!
      passedCount++;
    } else {
      failures.push(`Reversal 6 unexpected error: ${err?.message}`);
    }
  }

  return {
    partName: 'Part 8: State Reversal & Edge Case Audit',
    totalTests: testCount,
    passedTests: passedCount,
    passed: failures.length === 0,
    failures,
  };
}

// ----------------------------------------------------------------------------
// PART 9: DETERMINISTIC EVENT RESOLUTION & TIE-BREAKING
// ----------------------------------------------------------------------------
export function runPart9EventResolutionAndTieBreaking(): AuditSuiteResult {
  const { findings, actionPlan } = getBaselineFixtures();
  const failures: string[] = [];
  let testCount = 0;
  let passedCount = 0;

  // Test 9.1: Order-independent resolution (verified at 10:00, rejected at 09:00 -> outcome is verified)
  testCount++;
  const ev1: EvidenceVerificationEvent = {
    id: 'EVT-01-REJ',
    evidenceId: 'UPL-T9-01',
    outcome: 'rejected',
    method: 'document_review',
    timestamp: '2026-09-13T09:00:00Z',
    rationale: 'Initial scan blurry',
    performedBy: 'consular_officer',
  };
  const ev2: EvidenceVerificationEvent = {
    id: 'EVT-02-VERIF',
    evidenceId: 'UPL-T9-01',
    outcome: 'verified',
    method: 'document_review',
    timestamp: '2026-09-13T10:00:00Z',
    rationale: 'Re-reviewed under high resolution and verified',
    performedBy: 'consular_officer',
  };

  // Pass array in reverse order [ev2, ev1]
  const summaryReverse = buildDocumentReadinessSummary(findings, actionPlan, {
    destination: 'france',
    visaType: 'tourisme',
    uploadedDocuments: [
      {
        id: 'UPL-T9-01',
        checklistKey: 'passport',
        fileName: 'pass.pdf',
        isLegible: true,
        isExpired: false,
        isCompliant: true,
        expiryDate: '2030-01-01',
      },
    ],
    verificationEvents: [ev2, ev1], // Reversed array order!
  });

  const passRev = summaryReverse.items.find((i) => i.id === 'DOC-PASSPORT')!;
  if (passRev.isEvidenceDirectlyVerified !== true || passRev.status !== 'ready') {
    failures.push('Test 9.1 failed: Later verification event (10:00) did not supersede earlier rejection (09:00) when array order reversed!');
  } else {
    passedCount++;
  }

  // Test 9.2: Tie-breaking by event ID when timestamps are identical
  testCount++;
  const evTieA: EvidenceVerificationEvent = {
    id: 'EVT-TIE-AAA',
    evidenceId: 'UPL-T9-02',
    outcome: 'rejected',
    method: 'document_review',
    timestamp: '2026-09-13T12:00:00Z',
    rationale: 'Concurrent review A',
    performedBy: 'consular_officer',
  };
  const evTieB: EvidenceVerificationEvent = {
    id: 'EVT-TIE-ZZZ',
    evidenceId: 'UPL-T9-02',
    outcome: 'verified',
    method: 'document_review',
    timestamp: '2026-09-13T12:00:00Z', // EXACT same timestamp
    rationale: 'Concurrent review B with higher sort ID',
    performedBy: 'consular_officer',
  };

  // Forward order
  const summaryTieForward = buildDocumentReadinessSummary(findings, actionPlan, {
    destination: 'france',
    visaType: 'tourisme',
    uploadedDocuments: [
      {
        id: 'UPL-T9-02',
        checklistKey: 'passport',
        fileName: 'pass_tie.pdf',
        isLegible: true,
        isExpired: false,
        isCompliant: true,
        expiryDate: '2030-01-01',
      },
    ],
    verificationEvents: [evTieA, evTieB],
  });

  // Backward order
  const summaryTieBackward = buildDocumentReadinessSummary(findings, actionPlan, {
    destination: 'france',
    visaType: 'tourisme',
    uploadedDocuments: [
      {
        id: 'UPL-T9-02',
        checklistKey: 'passport',
        fileName: 'pass_tie.pdf',
        isLegible: true,
        isExpired: false,
        isCompliant: true,
        expiryDate: '2030-01-01',
      },
    ],
    verificationEvents: [evTieB, evTieA],
  });

  const forwardPass = summaryTieForward.items.find((i) => i.id === 'DOC-PASSPORT')!;
  const backwardPass = summaryTieBackward.items.find((i) => i.id === 'DOC-PASSPORT')!;

  if (forwardPass.isEvidenceDirectlyVerified !== backwardPass.isEvidenceDirectlyVerified) {
    failures.push('Test 9.2 failed: Tie-breaking resolution produced non-deterministic results between forward and backward arrays!');
  } else {
    passedCount++;
  }

  return {
    partName: 'Part 9: Deterministic Event Resolution & Tie-Breaking',
    totalTests: testCount,
    passedTests: passedCount,
    passed: failures.length === 0,
    failures,
  };
}

// ----------------------------------------------------------------------------
// PART 10: CROSS-DOSSIER ISOLATION
// ----------------------------------------------------------------------------
export function runPart10CrossDossierIsolation(): AuditSuiteResult {
  const failures: string[] = [];
  let testCount = 0;
  let passedCount = 0;

  testCount++;
  // Dossier A: France Tourism
  const dossierAFixtures = getBaselineFixtures('france', 'tourisme_visite');
  const summaryA = buildDocumentReadinessSummary(
    dossierAFixtures.findings,
    dossierAFixtures.actionPlan,
    {
      destination: 'france',
      visaType: 'tourisme',
      uploadedDocuments: [
        {
          id: 'UPL-DOSSIER-A-PASS',
          checklistKey: 'passport',
          fileName: 'passport_dossier_a.pdf',
          isVerified: true,
          verificationStatus: 'verified',
          verificationMethod: 'official_source_match',
          verificationEventId: 'EVT-DOSSIER-A',
          verificationEvent: {
            id: 'EVT-DOSSIER-A',
            evidenceId: 'UPL-DOSSIER-A-PASS',
            outcome: 'verified',
            method: 'official_source_match',
            timestamp: '2026-09-13T09:00:00Z',
            rationale: 'Verified for Dossier A',
            performedBy: 'consular_officer',
          },
          isLegible: true,
          isCompliant: true,
          expiryDate: '2030-01-01',
        },
      ],
    }
  );

  // Dossier B: Canada Study with empty evidence
  const dossierBFixtures = getBaselineFixtures('canada', 'etudes');
  const summaryB = buildDocumentReadinessSummary(
    dossierBFixtures.findings,
    dossierBFixtures.actionPlan,
    {
      destination: 'canada',
      visaType: 'etudiant',
      applicantFacts: { destination: 'canada', visaReason: 'etudes' },
      uploadedDocuments: [], // No evidence in Dossier B
    }
  );

  const passportA = summaryA.items.find((i) => i.id === 'DOC-PASSPORT')!;
  const passportB = summaryB.items.find((i) => i.id === 'DOC-PASSPORT')!;

  if (passportA.status !== 'ready') {
    failures.push('Dossier A passport was not READY');
  } else if (passportB.status === 'ready' || passportB.isEvidenceDirectlyVerified === true) {
    failures.push('Cross-Dossier Leak! Evidence from Dossier A leaked into Dossier B!');
  } else {
    passedCount++;
  }

  return {
    partName: 'Part 10: Cross-Dossier Isolation Audit',
    totalTests: testCount,
    passedTests: passedCount,
    passed: failures.length === 0,
    failures,
  };
}

// ----------------------------------------------------------------------------
// PART 11: GENERATED DELIVERABLE ISOLATION
// ----------------------------------------------------------------------------
export function runPart11GeneratedDeliverableIsolation(): AuditSuiteResult {
  const emptyFindings: AssessmentFinding[] = [];
  const emptyActionPlan = buildActionPlanSummary(emptyFindings);
  const failures: string[] = [];
  let testCount = 0;
  let passedCount = 0;

  testCount++;
  // 1. Deliverable must never appear in applicant checklist items
  const summaryWithDeliverable = buildDocumentReadinessSummary(emptyFindings, emptyActionPlan, {
    destination: 'canada',
    visaType: 'etudiant',
    deliverables: [
      {
        id: 'DELIV-MOTIVATION-01',
        title: 'Lettre explicative de projet',
        type: 'motivation_letter',
      },
    ],
  });

  const deliverableLeaked = summaryWithDeliverable.items.some(
    (item) => item.id.includes('MOTIVATION') || item.readinessEvidenceSource === 'generated_artifact'
  );
  if (deliverableLeaked) {
    failures.push('Deliverable leaked into applicant checklist items!');
  } else {
    passedCount++;
  }

  testCount++;
  // 2. Deliverables summary contains the isolated artifacts
  if (
    !summaryWithDeliverable.deliverablesSummary ||
    summaryWithDeliverable.deliverablesSummary.totalDeliverables < 1 ||
    !summaryWithDeliverable.deliverablesSummary.items.some((d) => d.id === 'DELIV-MOTIVATION-01')
  ) {
    failures.push(`Deliverables summary failed to contain isolated deliverable! Got total: ${summaryWithDeliverable.deliverablesSummary?.totalDeliverables}`);
  } else {
    passedCount++;
  }

  testCount++;
  // 3. Deliverables can NEVER be verified or marked ready
  const allArtifactsIsolated = summaryWithDeliverable.deliverablesSummary.items.every(
    (d) => (d as any).status !== 'ready' && d.readinessEvidenceSource === 'generated_artifact'
  );
  if (!allArtifactsIsolated) {
    failures.push('Generated deliverable claimed ready or invalid evidence source!');
  } else {
    passedCount++;
  }

  testCount++;
  // 4. When applicant signs and uploads a generated deliverable, it is treated as an uploaded_document requiring independent verification
  const summaryUploadedSigned = buildDocumentReadinessSummary(emptyFindings, emptyActionPlan, {
    destination: 'france',
    visaType: 'tourisme',
    uploadedDocuments: [
      {
        id: 'UPL-SIGNED-TRAVEL-PLAN-01',
        checklistKey: 'travel_insurance', // mapped to an applicable checklist key
        fileName: 'signed_travel_attestation.pdf',
        isVerified: false, // Uploaded by applicant, not yet verified by officer!
        isLegible: true,
      },
    ],
  });
  const signedItem = summaryUploadedSigned.items.find((i) => i.id === 'DOC-TRAVEL-INSURANCE')!;
  if (signedItem.status === 'ready' || signedItem.isEvidenceDirectlyVerified === true) {
    failures.push('Signed uploaded deliverable was marked ready or verified without independent verification!');
  } else if (signedItem.readinessEvidenceSource !== 'uploaded_document') {
    failures.push(`Expected uploaded signed deliverable to have source 'uploaded_document', got '${signedItem.readinessEvidenceSource}'`);
  } else {
    passedCount++;
  }

  return {
    partName: 'Part 11: Generated Deliverable Isolation Audit',
    totalTests: testCount,
    passedTests: passedCount,
    passed: failures.length === 0,
    failures,
  };
}

// ----------------------------------------------------------------------------
// PART 12: CANADIAN STUDY PERMIT REGRESSION CERTIFICATION
// ----------------------------------------------------------------------------
export function runPart12CanadaStudyPermitRegression(): AuditSuiteResult {
  const caStudyFindings: AssessmentFinding[] = [];
  const caStudyActionPlan = buildActionPlanSummary(caStudyFindings);
  const failures: string[] = [];
  let testCount = 0;
  let passedCount = 0;

  testCount++;
  const caSummary = buildDocumentReadinessSummary(caStudyFindings, caStudyActionPlan, {
    destination: 'canada',
    visaType: 'etudiant',
    applicantFacts: {
      destination: 'canada',
      visaReason: 'etudes',
      hasPassport: true,
      hasUniversityAdmissionLetter: true,
      hasPalCaq: true,
    },
    uploadedDocuments: [
      {
        id: 'UPL-CA-REG-ADMISSION',
        checklistKey: 'admission_letter',
        fileName: 'mcgill_loa.pdf',
        isVerified: true,
        verificationStatus: 'verified',
        verificationMethod: 'official_source_match',
        verificationEventId: 'EVT-CA-REG-ADMISSION',
        verificationEvent: {
          id: 'EVT-CA-REG-ADMISSION',
          evidenceId: 'UPL-CA-REG-ADMISSION',
          outcome: 'verified',
          method: 'official_source_match',
          timestamp: '2026-09-13T09:00:00Z',
          rationale: 'LOA McGill authentifiée sur le portail DLI.',
          performedBy: 'consular_officer',
        },
        isLegible: true,
        isInstitutionRecognized: true,
        isCompliant: true,
      },
      {
        id: 'UPL-CA-REG-PASSPORT',
        checklistKey: 'passport',
        fileName: 'passport_ca.pdf',
        isVerified: true,
        verificationStatus: 'verified',
        verificationMethod: 'official_source_match',
        verificationEventId: 'EVT-CA-REG-PASSPORT',
        verificationEvent: {
          id: 'EVT-CA-REG-PASSPORT',
          evidenceId: 'UPL-CA-REG-PASSPORT',
          outcome: 'verified',
          method: 'official_source_match',
          timestamp: '2026-09-13T09:00:00Z',
          rationale: 'Passeport biométrique authentifié.',
          performedBy: 'consular_officer',
        },
        isLegible: true,
        isExpired: false,
        isCompliant: true,
        expiryDate: '2029-08-15',
      },
      {
        id: 'UPL-CA-REG-BANK',
        checklistKey: 'bank_statements',
        fileName: 'releves_bancaires.pdf',
        isVerified: false,
        isLegible: true,
      },
    ],
    deliverables: [
      {
        id: 'DELIV-CA-REG-STUDY-PLAN',
        title: 'Plan d’études pour le Canada',
        type: 'study_plan',
      },
    ],
  });

  // Verify Counts
  if (caSummary.totalApplicableCount !== 4) {
    failures.push(`Canada Study Permit: Expected 4 applicable items, got ${caSummary.totalApplicableCount}`);
  } else if (caSummary.readyCount !== 2) {
    failures.push(`Canada Study Permit: Expected exactly 2 READY items, got ${caSummary.readyCount}`);
  } else if (caSummary.clarificationCount !== 2) {
    failures.push(`Canada Study Permit: Expected exactly 2 clarification items, got ${caSummary.clarificationCount}`);
  } else if (caSummary.missingCount !== 0) {
    failures.push(`Canada Study Permit: Expected 0 missing items, got ${caSummary.missingCount}`);
  } else if (caSummary.stageCounts?.ready !== 2) {
    failures.push(`Canada Study Permit: Expected 2 stage ready, got ${caSummary.stageCounts?.ready}`);
  } else {
    passedCount++;
  }

  return {
    partName: 'Part 12: Canadian Study Permit Regression Audit',
    totalTests: testCount,
    passedTests: passedCount,
    passed: failures.length === 0,
    failures,
  };
}

// ----------------------------------------------------------------------------
// MASTER AUDIT RUNNER
// ----------------------------------------------------------------------------
export function runCompleteDeterministicCertificationSuite(): FullCertificationReport {
  console.log('\n================================================================================');
  console.log('VISAFlow V2.3.10 — FORMAL DETERMINISTIC CERTIFICATION & STATE-MACHINE AUDIT');
  console.log('================================================================================\n');

  const suiteResults: AuditSuiteResult[] = [
    runPart2StateMachineTransitions(),
    runPart4Test2ExplicitComplianceAndPairedNegative(),
    runPart5EvidenceSourceMatrix(),
    runPart6ComplianceMatrix(),
    runPart7MutationTests(),
    runPart8StateReversals(),
    runPart9EventResolutionAndTieBreaking(),
    runPart10CrossDossierIsolation(),
    runPart11GeneratedDeliverableIsolation(),
    runPart12CanadaStudyPermitRegression(),
  ];

  let passedParts = 0;
  for (const res of suiteResults) {
    if (res.passed) {
      passedParts++;
      console.log(`  ✓ ${res.partName}: ${res.passedTests}/${res.totalTests} tests PASSED`);
    } else {
      console.error(`  ✗ ${res.partName} FAILED (${res.passedTests}/${res.totalTests} passed):`);
      res.failures.forEach((f) => console.error(`      - ${f}`));
    }
  }

  const allPassed = passedParts === suiteResults.length;
  console.log('\n--------------------------------------------------------------------------------');
  console.log(`Certification Summary: ${passedParts}/${suiteResults.length} Audit Suites Passed`);
  console.log('--------------------------------------------------------------------------------\n');

  return {
    passed: allPassed,
    totalParts: suiteResults.length,
    passedParts,
    results: suiteResults,
  };
}

// CLI entry point
if (process.argv[1]?.includes('stateMachineAuditSuite')) {
  const result = runCompleteDeterministicCertificationSuite();
  if (!result.passed) {
    process.exit(1);
  }
}
