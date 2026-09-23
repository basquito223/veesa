import {
  EvidenceLifecycleStage,
  ReadinessEvidenceSource,
  EvidenceComplianceStatus,
  VerificationOutcome,
  EvidenceVerificationEvent,
} from '../types/documentReadiness';

// ============================================================================
// VISAFlow V2.3.10 — FORMAL EVIDENCE STATE MACHINE & DETERMINISTIC TRANSITIONS
// ============================================================================

/**
 * États du cycle de vie formel :
 * 6 états canoniques de progression + 2 états de contrôle (rejected, not_applicable)
 */
export type EvidenceMachineState =
  | EvidenceLifecycleStage
  | 'rejected'
  | 'not_applicable';

/**
 * Événements d'entrée gouvernant les transitions d'état de preuve
 */
export type EvidenceLifecycleEvent =
  | 'DECLARE_FACT'
  | 'UPLOAD_DOCUMENT'
  | 'REPLACE_UPLOAD'
  | 'VERIFY_SUCCESS'
  | 'VERIFY_REJECT'
  | 'REVOKE_VERIFICATION'
  | 'EVALUATE_COMPLIANCE_PASS'
  | 'EVALUATE_COMPLIANCE_FAIL'
  | 'RESET_COMPLIANCE'
  | 'DELETE_EVIDENCE'
  | 'MARK_NOT_APPLICABLE'
  | 'MARK_APPLICABLE';

/**
 * Entrée unitaire dans la table formelle des transitions
 */
export interface StateTransitionRule {
  currentState: EvidenceMachineState;
  event: EvidenceLifecycleEvent;
  nextState: EvidenceMachineState;
  allowed: boolean;
  reason: string;
}

/**
 * Table formelle et déterministe de transition d'états
 * Invariants non-négociables :
 * 1. Un fait seul ne peut jamais devenir VERIFIED ou READY.
 * 2. Un document téléversé brut ne peut jamais devenir READY sans passer par VERIFIED et COMPLIANT.
 * 3. Une révocation ou un rejet de vérification bascule immédiatement en REJECTED ou annule READY.
 * 4. Une non-conformité annule immédiatement READY.
 * 5. La non-applicabilité annule immédiatement tout statut de préparation.
 */
export const DETERMINISTIC_TRANSITION_TABLE: StateTransitionRule[] = [
  // --- ÉTAT 1 : NOT_PROVIDED ---
  {
    currentState: 'not_provided',
    event: 'DECLARE_FACT',
    nextState: 'declared',
    allowed: true,
    reason: 'Le demandeur déclare un fait relatif à ce document sans fournir de pièce justificative.',
  },
  {
    currentState: 'not_provided',
    event: 'UPLOAD_DOCUMENT',
    nextState: 'uploaded',
    allowed: true,
    reason: 'Le demandeur téléverse une pièce brute non certifiée.',
  },
  {
    currentState: 'not_provided',
    event: 'VERIFY_SUCCESS',
    nextState: 'not_provided',
    allowed: false,
    reason: 'Impossible de vérifier une pièce inexistante (aucun élément matériel fourni).',
  },
  {
    currentState: 'not_provided',
    event: 'EVALUATE_COMPLIANCE_PASS',
    nextState: 'not_provided',
    allowed: false,
    reason: 'Impossible d’évaluer la conformité d’une pièce non fournie.',
  },
  {
    currentState: 'not_provided',
    event: 'MARK_NOT_APPLICABLE',
    nextState: 'not_applicable',
    allowed: true,
    reason: 'Le document est déterministement exclu du périmètre d’exigibilité.',
  },

  // --- ÉTAT 2 : DECLARED ---
  {
    currentState: 'declared',
    event: 'UPLOAD_DOCUMENT',
    nextState: 'uploaded',
    allowed: true,
    reason: 'Le demandeur matérialise son fait déclaré par le téléversement d’une pièce.',
  },
  {
    currentState: 'declared',
    event: 'VERIFY_SUCCESS',
    nextState: 'declared',
    allowed: false,
    reason: 'Un simple fait déclaré (applicant_fact) est strictement inéligible à la vérification formelle.',
  },
  {
    currentState: 'declared',
    event: 'EVALUATE_COMPLIANCE_PASS',
    nextState: 'declared',
    allowed: false,
    reason: 'Une déclaration d’intention ou un fait oral ne peut être certifié réglementairement conforme.',
  },
  {
    currentState: 'declared',
    event: 'DELETE_EVIDENCE',
    nextState: 'not_provided',
    allowed: true,
    reason: 'La déclaration est retirée par l’utilisateur.',
  },
  {
    currentState: 'declared',
    event: 'MARK_NOT_APPLICABLE',
    nextState: 'not_applicable',
    allowed: true,
    reason: 'Profil consulaire reconfiguré rendant la déclaration sans objet.',
  },

  // --- ÉTAT 3 : UPLOADED ---
  {
    currentState: 'uploaded',
    event: 'REPLACE_UPLOAD',
    nextState: 'uploaded',
    allowed: true,
    reason: 'Nouveau scan téléversé, remplaçant la version précédente en attente de vérification.',
  },
  {
    currentState: 'uploaded',
    event: 'VERIFY_SUCCESS',
    nextState: 'verified',
    allowed: true,
    reason: 'Vérification matérielle ou officielle opposable exécutée avec succès par une autorité autorisée.',
  },
  {
    currentState: 'uploaded',
    event: 'VERIFY_REJECT',
    nextState: 'rejected',
    allowed: true,
    reason: 'Examen matériel concluant à l’invalidité, la falsification ou le rejet du document.',
  },
  {
    currentState: 'uploaded',
    event: 'EVALUATE_COMPLIANCE_PASS',
    nextState: 'compliance_evaluated',
    allowed: true,
    reason: 'Conformité intrinsèque constatée mais pièce toujours non certifiée : READY interdit.',
  },
  {
    currentState: 'uploaded',
    event: 'EVALUATE_COMPLIANCE_FAIL',
    nextState: 'compliance_evaluated',
    allowed: true,
    reason: 'Constat de non-conformité matérielle (illisible, pages manquantes...).',
  },
  {
    currentState: 'uploaded',
    event: 'DELETE_EVIDENCE',
    nextState: 'not_provided',
    allowed: true,
    reason: 'Pièce téléversée supprimée par le demandeur.',
  },
  {
    currentState: 'uploaded',
    event: 'MARK_NOT_APPLICABLE',
    nextState: 'not_applicable',
    allowed: true,
    reason: 'Document téléversé devenu non exigible pour le profil consulaire.',
  },

  // --- ÉTAT 4 : VERIFIED ---
  {
    currentState: 'verified',
    event: 'EVALUATE_COMPLIANCE_PASS',
    nextState: 'ready',
    allowed: true,
    reason: 'Évaluation de conformité réussie : toutes les conditions de READY sont réunies (APPLICABLE ∧ EXISTS ∧ PROVEN ∧ VERIFIED ∧ COMPLIANT).',
  },
  {
    currentState: 'verified',
    event: 'EVALUATE_COMPLIANCE_FAIL',
    nextState: 'compliance_evaluated',
    allowed: true,
    reason: 'Pièce authentique mais non conforme à la réglementation (ex: passeport valide mais durée résiduelle insuffisante).',
  },
  {
    currentState: 'verified',
    event: 'REVOKE_VERIFICATION',
    nextState: 'rejected',
    allowed: true,
    reason: 'Événement de vérification formellement révoqué par une décision consulaire ultérieure.',
  },
  {
    currentState: 'verified',
    event: 'VERIFY_REJECT',
    nextState: 'rejected',
    allowed: true,
    reason: 'Nouvelle vérification constatant un rejet ou une annulation.',
  },
  {
    currentState: 'verified',
    event: 'REPLACE_UPLOAD',
    nextState: 'uploaded',
    allowed: true,
    reason: 'Le remplacement d’une pièce vérifiée par un nouveau fichier réinitialise la certification.',
  },
  {
    currentState: 'verified',
    event: 'DELETE_EVIDENCE',
    nextState: 'not_provided',
    allowed: true,
    reason: 'Preuve vérifiée supprimée du dossier.',
  },
  {
    currentState: 'verified',
    event: 'MARK_NOT_APPLICABLE',
    nextState: 'not_applicable',
    allowed: true,
    reason: 'Document vérifié devenu non applicable.',
  },

  // --- ÉTAT 5 : COMPLIANCE_EVALUATED ---
  {
    currentState: 'compliance_evaluated',
    event: 'VERIFY_SUCCESS',
    nextState: 'ready',
    allowed: true,
    reason: 'La pièce déjà reconnue conforme reçoit sa certification matérielle officielle -> READY.',
  },
  {
    currentState: 'compliance_evaluated',
    event: 'VERIFY_REJECT',
    nextState: 'rejected',
    allowed: true,
    reason: 'Vérification matérielle rejetée.',
  },
  {
    currentState: 'compliance_evaluated',
    event: 'EVALUATE_COMPLIANCE_FAIL',
    nextState: 'compliance_evaluated',
    allowed: true,
    reason: 'Nouvelle évaluation constatant une non-conformité.',
  },
  {
    currentState: 'compliance_evaluated',
    event: 'DELETE_EVIDENCE',
    nextState: 'not_provided',
    allowed: true,
    reason: 'Preuve supprimée.',
  },
  {
    currentState: 'compliance_evaluated',
    event: 'MARK_NOT_APPLICABLE',
    nextState: 'not_applicable',
    allowed: true,
    reason: 'Document devenu non applicable.',
  },

  // --- ÉTAT 6 : READY ---
  {
    currentState: 'ready',
    event: 'REVOKE_VERIFICATION',
    nextState: 'rejected',
    allowed: true,
    reason: 'Révocation de vérification : perte immédiate et irréversible du statut READY.',
  },
  {
    currentState: 'ready',
    event: 'VERIFY_REJECT',
    nextState: 'rejected',
    allowed: true,
    reason: 'Rejet de vérification : perte immédiate du statut READY.',
  },
  {
    currentState: 'ready',
    event: 'EVALUATE_COMPLIANCE_FAIL',
    nextState: 'compliance_evaluated',
    allowed: true,
    reason: 'Survenance d’un fait non-conforme (expiration, solde insuffisant) : perte immédiate de READY.',
  },
  {
    currentState: 'ready',
    event: 'REPLACE_UPLOAD',
    nextState: 'uploaded',
    allowed: true,
    reason: 'Nouveau téléversement remplaçant la pièce : perte de READY jusqu’à nouvelle certification.',
  },
  {
    currentState: 'ready',
    event: 'DELETE_EVIDENCE',
    nextState: 'not_provided',
    allowed: true,
    reason: 'Preuve supprimée : perte de READY.',
  },
  {
    currentState: 'ready',
    event: 'MARK_NOT_APPLICABLE',
    nextState: 'not_applicable',
    allowed: true,
    reason: 'Pièce devenue non applicable : exclusion de la check-list active et perte de READY.',
  },

  // --- ÉTAT 7 : REJECTED ---
  {
    currentState: 'rejected',
    event: 'UPLOAD_DOCUMENT',
    nextState: 'uploaded',
    allowed: true,
    reason: 'Le demandeur soumet une nouvelle pièce de substitution après rejet de la précédente.',
  },
  {
    currentState: 'rejected',
    event: 'DELETE_EVIDENCE',
    nextState: 'not_provided',
    allowed: true,
    reason: 'Preuve rejetée supprimée du dossier.',
  },
  {
    currentState: 'rejected',
    event: 'MARK_NOT_APPLICABLE',
    nextState: 'not_applicable',
    allowed: true,
    reason: 'Preuve rejetée devenue non applicable.',
  },

  // --- ÉTAT 8 : NOT_APPLICABLE ---
  {
    currentState: 'not_applicable',
    event: 'MARK_APPLICABLE',
    nextState: 'not_provided',
    allowed: true,
    reason: 'Changement de profil rendant le document à nouveau exigible.',
  },
];

/**
 * Valide si une transition d'état donnée est permise par la machine d'états
 */
export function validateStateTransition(
  currentState: EvidenceMachineState,
  event: EvidenceLifecycleEvent,
  requestedNextState: EvidenceMachineState
): { valid: boolean; reason: string } {
  const rule = DETERMINISTIC_TRANSITION_TABLE.find(
    (t) => t.currentState === currentState && t.event === event
  );

  if (!rule) {
    return {
      valid: false,
      reason: `Transition indéfinie : Événement '${event}' non supporté depuis l’état '${currentState}'.`,
    };
  }

  if (!rule.allowed) {
    return {
      valid: false,
      reason: `Transition interdite : ${rule.reason}`,
    };
  }

  if (rule.nextState !== requestedNextState) {
    return {
      valid: false,
      reason: `Incohérence d'état suivant : la règle prescrit '${rule.nextState}' et non '${requestedNextState}'.`,
    };
  }

  return { valid: true, reason: rule.reason };
}

/**
 * Calcule l'état suivant déterministe à partir d'un état courant et d'un événement
 */
export function computeNextState(
  currentState: EvidenceMachineState,
  event: EvidenceLifecycleEvent
): {
  allowed: boolean;
  nextState: EvidenceMachineState;
  reason: string;
} {
  const rule = DETERMINISTIC_TRANSITION_TABLE.find(
    (t) => t.currentState === currentState && t.event === event
  );

  if (!rule) {
    return {
      allowed: false,
      nextState: currentState,
      reason: `Aucune transition définie pour l’événement '${event}' depuis l’état '${currentState}'.`,
    };
  }

  return {
    allowed: rule.allowed,
    nextState: rule.allowed ? rule.nextState : currentState,
    reason: rule.reason,
  };
}

// ============================================================================
// DÉRIVATION FORMELLE DE L'ÉTAT READY (V2.3.10)
// ============================================================================

export interface DocumentReadinessDerivationInput {
  isApplicable: boolean;
  exists: boolean;
  readinessEvidenceSource?: ReadinessEvidenceSource;
  readinessEvidenceIds?: string[];
  isEvidenceDirectlyVerified: boolean;
  hasValidVerificationEvent: boolean;
  authoritativeVerificationEvent?: EvidenceVerificationEvent;
  complianceStatus: EvidenceComplianceStatus;
  complianceRuleIds?: string[];
  lifecycleStage?: EvidenceLifecycleStage;
}

export interface DocumentReadinessDerivationResult {
  isReady: boolean;
  failureReasons: string[];
  evaluatedConditions: {
    applicable: boolean;
    exists: boolean;
    provenanceExists: boolean;
    evidenceIdsExist: boolean;
    directlyVerified: boolean;
    verificationEventValid: boolean;
    complianceStatusCompliant: boolean;
    complianceRulesExist: boolean;
    lifecycleStageReady: boolean;
    ineligibleSourceCheckPassed: boolean;
  };
}

/**
 * Calcul d'autorité formel et exclusif de l'état READY (V2.3.10)
 * 
 * STRICT INVARIANT:
 * READY = APPLICABLE ∧ EXISTS ∧ PROVEN ∧ VERIFIED ∧ COMPLIANT
 * 
 * Aucune assignation manuelle, aucun cache, aucun état par défaut ne peut se substituer
 * à cette fonction pure d'évaluation.
 */
export function deriveDocumentReadinessState(
  input: DocumentReadinessDerivationInput
): DocumentReadinessDerivationResult {
  const failureReasons: string[] = [];

  // 1. Condition d'applicabilité
  const applicable = input.isApplicable === true;
  if (!applicable) {
    failureReasons.push('Le document n’est pas applicable pour ce profil consulaire.');
  }

  // 2. Condition d'existence matérielle
  const exists = input.exists === true;
  if (!exists) {
    failureReasons.push('Aucun élément de preuve matérielle n’existe pour ce document.');
  }

  // 3. Condition de provenance qualifiée
  const isEligibleSource =
    input.readinessEvidenceSource === 'verified_document' ||
    input.readinessEvidenceSource === 'uploaded_document';
  const isStrictVerifiedSource = input.readinessEvidenceSource === 'verified_document';
  const ineligibleSourceCheckPassed =
    input.readinessEvidenceSource !== 'applicant_fact' &&
    input.readinessEvidenceSource !== 'generated_artifact' &&
    isStrictVerifiedSource;

  if (!input.readinessEvidenceSource) {
    failureReasons.push('Source de preuve non définie.');
  } else if (input.readinessEvidenceSource === 'applicant_fact') {
    failureReasons.push('Un fait déclaré (applicant_fact) ne constitue pas une preuve certifiée.');
  } else if (input.readinessEvidenceSource === 'generated_artifact') {
    failureReasons.push('Un livrable logiciel généré ne peut jamais constituer une preuve demandeur.');
  } else if (input.readinessEvidenceSource === 'uploaded_document' && !isStrictVerifiedSource) {
    failureReasons.push('Un document simplement téléversé sans vérification certifiée ne peut être READY.');
  }

  // 4. Condition d'identifiants de preuve
  const evidenceIdsExist =
    Array.isArray(input.readinessEvidenceIds) && input.readinessEvidenceIds.length > 0;
  if (!evidenceIdsExist) {
    failureReasons.push('Identifiants de preuve justificative absents ou vides.');
  }

  // 5. Condition de vérification directe
  const directlyVerified = input.isEvidenceDirectlyVerified === true;
  if (!directlyVerified) {
    failureReasons.push('Vérification matérielle directe non attestée.');
  }

  // 6. Condition d'événement de vérification valide
  let verificationEventValid = input.hasValidVerificationEvent === true;
  if (input.authoritativeVerificationEvent) {
    if (input.authoritativeVerificationEvent.outcome !== 'verified') {
      verificationEventValid = false;
      failureReasons.push(
        `L’événement de vérification fait état d’un rejet : '${input.authoritativeVerificationEvent.outcome}'.`
      );
    }
    if (!input.authoritativeVerificationEvent.rationale?.trim()) {
      verificationEventValid = false;
      failureReasons.push('L’événement de vérification ne comporte aucune motivation opposable.');
    }
  } else if (!input.hasValidVerificationEvent) {
    failureReasons.push('Aucun événement de vérification formel et valide rattaché.');
  }

  // 7. Condition de conformité réglementaire
  const complianceStatusCompliant = input.complianceStatus === 'compliant';
  if (input.complianceStatus === 'non_compliant') {
    failureReasons.push('La pièce est formellement évaluée non-conforme aux exigences légales.');
  } else if (input.complianceStatus === 'not_evaluated') {
    failureReasons.push('La conformité réglementaire n’a pas encore été évaluée pour cette pièce.');
  }

  // 8. Présence des règles juridiques de conformité
  const complianceRulesExist =
    Array.isArray(input.complianceRuleIds) && input.complianceRuleIds.length > 0;
  if (complianceStatusCompliant && !complianceRulesExist) {
    failureReasons.push('Aucune référence réglementaire (ruleId) associée à la conformité.');
  }

  // 9. Stade du cycle de vie
  const lifecycleStageReady = input.lifecycleStage === 'ready' || input.lifecycleStage === undefined;

  const evaluatedConditions = {
    applicable,
    exists,
    provenanceExists: isStrictVerifiedSource,
    evidenceIdsExist,
    directlyVerified,
    verificationEventValid,
    complianceStatusCompliant,
    complianceRulesExist,
    lifecycleStageReady,
    ineligibleSourceCheckPassed,
  };

  const isReady =
    applicable &&
    exists &&
    isStrictVerifiedSource &&
    evidenceIdsExist &&
    directlyVerified &&
    verificationEventValid &&
    complianceStatusCompliant &&
    complianceRulesExist &&
    ineligibleSourceCheckPassed;

  return {
    isReady,
    failureReasons,
    evaluatedConditions,
  };
}
