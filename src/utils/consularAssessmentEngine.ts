import { UserAnswers } from '../types';
import {
  PersonalizedConsularAssessment,
  ConsularPillarId,
  ConsularPillarDetail,
  ConsularScrutinyLevel,
  AssessmentFinding,
  EvidenceRecommendation,
  TargetedPriorityAction,
  InterviewPreparationQuestion,
  AssessmentMeta,
} from '../types/assessment';
import { resolveOfficialRule, getCandidateRules, OFFICIAL_CONSULAR_RULES } from '../data/officialConsularRules';

// ============================================================================
// 1. ÉVALUATION CONTEXTUELLE DE COMPLÉTUDE DES DONNÉES
// ============================================================================

function evaluateContextualRequirements(answers: UserAnswers): {
  requiredFields: string[];
  missingFields: string[];
  completeness: 'high' | 'medium' | 'low';
} {
  const missing: string[] = [];
  const required: string[] = ['destination', 'visaReason', 'countryOfOrigin', 'status'];

  if (!answers.destination) missing.push('Destination');
  if (!answers.visaReason) missing.push('Motif du séjour');
  if (!answers.countryOfOrigin) missing.push('Nationalité du passeport');
  if (!answers.status) missing.push('Statut socio-professionnel');

  // Financement contextuel
  if (answers.fundingSource !== 'bourse_officielle') {
    required.push('fundingSource');
    if (!answers.fundingSource) missing.push('Mode de financement');
    required.push('availableBudgetFcfa');
    if (answers.availableBudgetFcfa === undefined || answers.availableBudgetFcfa === null) {
      missing.push('Budget disponible');
    }
  }

  // Hébergement contextuel
  required.push('accommodationType');
  if (!answers.accommodationType) {
    missing.push('Type d’hébergement prévu');
  }

  // Durée de séjour
  required.push('travelDurationDays');
  if (!answers.travelDurationDays || answers.travelDurationDays <= 0) {
    missing.push('Durée prévisionnelle du séjour');
  }

  // Si études
  if (answers.visaReason === 'etudes') {
    required.push('targetMajorAbroad');
    if (!answers.targetMajorAbroad || answers.targetMajorAbroad.trim().length === 0) {
      missing.push('Filière d’études visée');
    }
  }

  // Si entrepreneur
  if (answers.status === 'entrepreneur') {
    required.push('hasRccmNif');
    if (answers.hasRccmNif === undefined) {
      missing.push('Immatriculation RCCM / NIF');
    }
  }

  // Si dépôt hors du pays d'origine
  if (answers.isFilingFromSameCountry === false) {
    required.push('filingCountry');
    if (!answers.filingCountry || answers.filingCountry.trim().length === 0) {
      missing.push('Pays de résidence pour le dépôt');
    }
  }

  // Si antécédent de refus déclaré
  if (answers.hasPreviousRefusal === true) {
    required.push('previousRefusalReason');
    if (!answers.previousRefusalReason || answers.previousRefusalReason.trim().length === 0) {
      missing.push('Motif notifié du précédent refus');
    }
  }

  let completeness: 'high' | 'medium' | 'low' = 'high';
  if (missing.length === 1) {
    completeness = 'medium';
  } else if (missing.length > 1) {
    completeness = 'low';
  }

  return { requiredFields: required, missingFields: missing, completeness };
}

// ============================================================================
// 2. MOTEUR D'ÉVALUATION PRINCIPAL (PUR, SYNCHRONE, SANS IA)
// ============================================================================

export function evaluateConsularProfile(
  answers: UserAnswers,
  dossierId: string
): PersonalizedConsularAssessment {
  const findings: AssessmentFinding[] = [];
  const candidateRules = getCandidateRules(answers.destination, answers.visaReason);
  const unverifiedRulesEncountered = candidateRules.unverified.map((r) => `${r.id} (${r.sourceName})`);

  const { missingFields, completeness } = evaluateContextualRequirements(answers);

  // --------------------------------------------------------------------------
  // PILIER 1 : LEGAL ADMISSIBILITY (Admissibilité réglementaire)
  // --------------------------------------------------------------------------
  const p1Findings: AssessmentFinding[] = [];
  const p1Evidence: EvidenceRecommendation[] = [
    {
      targetPillar: 'legal_admissibility',
      relatedChecklistKey: 'passport_original',
      documentName: 'Passeport Original en cours de validité',
      consularUtility: 'Établit l’identité internationale et la conformité aux exigences réglementaires de validité.',
      category: 'mandatory_by_regulation',
    },
  ];

  // --------------------------------------------------------------------------
  // FUTURE READY NOTE — Évolution vers dates calendaires précises :
  // Le champ actuel `hasPassport6MonthsValid` est un indicateur déclaratif binaire.
  // Lors d'une future migration vers les champs calendaires :
  // - `passportExpiryDate` (date ISO d'expiration du document de voyage)
  // - `plannedExitDate` (date ISO de fin de séjour / sortie prévue du territoire)
  // Le moteur calculera le delta calendaire exact :
  // deltaDays = diffInDays(passportExpiryDate, plannedExitDate);
  // if (deltaDays < 90) -> compliance_issue (isDirectBlocker: true) [Article 12 CSVI]
  // else -> favorable_evidence (isDirectBlocker: false)
  // En attendant ces champs calendaires précis, une réponse négative à la validité de 6 mois
  // est traitée comme un point de clarification (clarification_point, isDirectBlocker: false),
  // distinguant l'exigence légale stricte (3 mois post-séjour) de la recommandation pratique (6 mois).
  // --------------------------------------------------------------------------

  // Vérification passeport
  const passportRule = resolveOfficialRule(
    answers.destination,
    answers.visaReason,
    'passport_validity',
    answers.countryOfOrigin
  );

  if (passportRule) {
    if (answers.hasPassport6MonthsValid === false) {
      p1Findings.push({
        id: 'FIND-PASSPORT-VALIDITY-CLARIFICATION',
        pillarId: 'legal_admissibility',
        type: 'clarification_point',
        title: 'Validité du passeport : distinction entre exigence légale et recommandation pratique',
        declaredFact: 'Passeport déclaré avec une validité restante inférieure à 6 mois.',
        officialBasis: 'Article 12 du Code Communautaire des Visas (Règlement CE n° 810/2009) : validité d’au moins 3 mois après la date prévue de départ et délivrance depuis moins de 10 ans.',
        sourceRuleId: passportRule.id,
        findingRationale:
          'Distinction réglementaire essentielle : L’exigence légale stricte (Art. 12 CSVI) impose une validité résiduelle d’au moins 3 mois après la date prévue de sortie du territoire (et délivrance depuis moins de 10 ans). La validité de 6 mois relève d’une recommandation pratique fréquente des compagnies aériennes et représentations consulaires. Une réponse inférieure à 6 mois ne constitue donc pas une non-conformité légale avérée tant que la marge de 3 mois post-séjour est respectée par rapport à votre date de retour effective.',
        isDirectBlocker: false,
        priorityEligibility: { eligible: true, weight: 'medium' },
        suggestedAction:
          'Vérifier que la date de fin de validité de votre passeport dépasse d’au moins 3 mois la date de fin de voyage envisagée.',
        recommendedEvidence: [
          {
            targetPillar: 'legal_admissibility',
            relatedChecklistKey: 'passport_original',
            documentName: 'Passeport original avec validité calendaire conforme',
            consularUtility: 'Garantit la recevabilité formelle de la demande au guichet du centre de visas.',
            category: 'mandatory_by_regulation',
          },
        ],
      });
    } else if (answers.hasPassport6MonthsValid === true) {
      p1Findings.push({
        id: 'FIND-PASSPORT-VALIDITY-OK',
        pillarId: 'legal_admissibility',
        type: 'favorable_evidence',
        title: 'Validité du passeport a priori conforme au seuil de sécurité',
        declaredFact: 'Passeport déclaré avec une validité supérieure à 6 mois.',
        officialBasis: passportRule.ruleDescription,
        sourceRuleId: passportRule.id,
        findingRationale:
          'Une validité résiduelle supérieure à 6 mois offre une marge suffisante pour couvrir l’exigence minimale de 3 mois après la date de sortie fixée par le Code des Visas.',
        isDirectBlocker: false,
        priorityEligibility: { eligible: false, weight: 'low' },
      });
    }
  } else {
    // Si la règle de validité spécifique n'est pas vérifiée dans la base
    p1Findings.push({
      id: 'FIND-PASSPORT-RULE-UNVERIFIED',
      pillarId: 'legal_admissibility',
      type: 'insufficient_information',
      title: 'Exigence de validité du passeport non vérifiée pour cette destination',
      declaredFact: `Passeport déclaré valide pour un séjour de ${answers.travelDurationDays || 15} jours.`,
      findingRationale:
        'Le texte officiel spécifique régissant la marge de validité du passeport pour cette destination n’est pas vérifié dans la base locale. Une vérification manuelle auprès de l’autorité consulaire est nécessaire.',
      isDirectBlocker: false,
      priorityEligibility: { eligible: false, weight: 'low' },
    });
  }

  // Vérification de la durée maximale autorisée
  const stayRule = resolveOfficialRule(
    answers.destination,
    answers.visaReason,
    'stay_duration',
    answers.countryOfOrigin
  );
  if (stayRule && stayRule.amount) {
    const declaredDays = answers.travelDurationDays || 0;
    if (declaredDays > stayRule.amount) {
      p1Findings.push({
        id: 'FIND-STAY-DURATION-EXCEEDED',
        pillarId: 'legal_admissibility',
        type: 'compliance_issue',
        title: 'Durée de séjour déclarée supérieure au plafond légal',
        declaredFact: `Durée déclarée de ${declaredDays} jours pour un séjour court.`,
        officialBasis: stayRule.ruleDescription,
        sourceRuleId: stayRule.id,
        findingRationale: `La durée demandée excède la limite réglementaire stricte de ${stayRule.amount} jours fixée pour ce type d’autorisation.`,
        isDirectBlocker: true,
        priorityEligibility: { eligible: true, weight: 'high' },
        suggestedAction: `Réduire la durée déclarée à ${stayRule.amount} jours maximum ou solliciter un titre de long séjour adapté.`,
      });
    }
  }

  // Vérification compétence territoriale
  if (answers.isFilingFromSameCountry === false) {
    if (answers.filingCountry && answers.filingCountry.trim().length > 0) {
      p1Findings.push({
        id: 'FIND-TERRITORIAL-FILING-THIRD-COUNTRY',
        pillarId: 'legal_admissibility',
        type: 'clarification_point',
        title: 'Dépôt prévu depuis un pays de résidence tiers',
        declaredFact: `Nationalité de ${answers.countryOfOrigin || 'pays d’origine'}, dépôt prévu en ${answers.filingCountry}.`,
        officialBasis: 'Compétence consulaire liée à la résidence légale effective du demandeur.',
        findingRationale:
          'Les consulats instruisent prioritairement les demandes des résidents réguliers de leur circonscription. Il convient de joindre un titre de séjour régulier en cours de validité dans le pays de dépôt.',
        isDirectBlocker: false,
        priorityEligibility: { eligible: true, weight: 'medium' },
        suggestedAction: 'Joindre la copie du titre de séjour régulier ou de la carte consulaire du pays de dépôt.',
        recommendedEvidence: [
          {
            targetPillar: 'legal_admissibility',
            relatedChecklistKey: 'residence_permit_third_country',
            documentName: 'Titre de séjour ou carte de résident du pays de dépôt',
            consularUtility: 'Établit la compétence territoriale du consulat saisi.',
            category: 'recommended_evidence',
          },
        ],
      });
    } else {
      p1Findings.push({
        id: 'FIND-TERRITORIAL-FILING-MISSING',
        pillarId: 'legal_admissibility',
        type: 'insufficient_information',
        title: 'Pays de dépôt tiers non précisé',
        declaredFact: 'Dépôt déclaré en dehors du pays de citoyenneté, mais pays de résidence non renseigné.',
        findingRationale:
          'L’absence d’indication du pays de dépôt effectif empêche de vérifier la compétence territoriale du centre consulaire.',
        isDirectBlocker: false,
        priorityEligibility: { eligible: true, weight: 'high' },
        suggestedAction: 'Préciser le pays dans lequel sera effectuée la démarche biométrique.',
      });
    }
  }

  // Vérification administrative Canada PAL (LIPR Art. 87.3)
  const isCanadaForP1 = (answers.destination || '').toLowerCase().includes('canada');
  const isStudentForP1 = answers.visaReason === 'etudes';

  if (isCanadaForP1 && isStudentForP1) {
    const palRule = resolveOfficialRule(
      'canada',
      'etudes',
      'administrative_admissibility',
      answers.countryOfOrigin
    );
    const palBasis = palRule
      ? palRule.ruleDescription
      : 'Instructions ministérielles IRCC relatives au plafond des demandes de permis d’études (LIPR, Art. 87.3)';
    const palRuleId = palRule ? palRule.id : 'RULE-CA-STUDENT-PAL-MANDATORY';

    if (answers.hasProvincialAttestationLetter === undefined || answers.hasProvincialAttestationLetter === null) {
      p1Findings.push({
        id: 'FIND-CA-STUDENT-PAL-UNDECLARED',
        pillarId: 'legal_admissibility',
        type: 'insufficient_information',
        title: 'Disponibilité de la Lettre d’Attestation Provinciale (PAL) non précisée',
        declaredFact: 'Projet de permis d’études au Canada sans déclaration sur la détention d’une PAL.',
        officialBasis: palBasis,
        sourceRuleId: palRuleId,
        findingRationale:
          'Depuis le 22 janvier 2024, les demandes de permis d’études post-secondaires au Canada requièrent une Lettre d’attestation provinciale (PAL) émise par la province d’accueil (sauf dispenses : maîtrises, doctorats ou scolarité primaire/secondaire). Cette information est requise pour vérifier la recevabilité administrative préalable.',
        isDirectBlocker: false,
        priorityEligibility: { eligible: true, weight: 'high' },
        suggestedAction:
          'Vérifier auprès de votre établissement désigné (EED) si votre programme est soumis à l’obligation de PAL ou s’il bénéficie d’une dispense officielle.',
      });
    } else if (answers.hasProvincialAttestationLetter === false) {
      p1Findings.push({
        id: 'FIND-CA-STUDENT-PAL-GAP',
        pillarId: 'legal_admissibility',
        type: 'evidence_gap',
        title: 'Lettre d’Attestation Provinciale (PAL) à obtenir avant soumission',
        declaredFact: 'Demandeur déclarant ne pas encore détenir la Lettre d’attestation provinciale (PAL).',
        officialBasis: palBasis,
        sourceRuleId: palRuleId,
        findingRationale:
          'La Lettre d’attestation provinciale (PAL) constitue une condition de recevabilité administrative obligatoire pour le traitement de la demande par IRCC. Une demande transmise sans PAL (ou sans justificatif d’exemption formelle) ne peut être instruite et sera retournée sans traitement.',
        isDirectBlocker: false,
        priorityEligibility: { eligible: true, weight: 'high' },
        suggestedAction:
          'Attendre la délivrance formelle de la PAL par votre établissement d’enseignement provincial avant de finaliser la transmission de votre dossier sur le portail IRCC.',
        recommendedEvidence: [
          {
            targetPillar: 'legal_admissibility',
            relatedChecklistKey: 'provincial_attestation_letter',
            documentName: 'Lettre d’attestation provinciale (PAL) officielle ou attestation de dispense',
            consularUtility: 'Condition administrative obligatoire de recevabilité de la demande (LIPR Art. 87.3).',
            category: 'mandatory_by_regulation',
          },
        ],
      });
    } else {
      p1Findings.push({
        id: 'FIND-CA-STUDENT-PAL-OK',
        pillarId: 'legal_admissibility',
        type: 'favorable_evidence',
        title: 'Lettre d’Attestation Provinciale (PAL) déclarée disponible',
        declaredFact: 'Détention confirmée de la Lettre d’attestation provinciale (PAL) requise par IRCC.',
        officialBasis: palBasis,
        sourceRuleId: palRuleId,
        findingRationale:
          'La possession déclarée de la PAL remplit la condition de recevabilité administrative préalable imposée par les instructions ministérielles IRCC.',
        isDirectBlocker: false,
        priorityEligibility: { eligible: false, weight: 'low' },
      });
    }
  }

  const p1Status: ConsularScrutinyLevel = p1Findings.some((f) => f.isDirectBlocker)
    ? 'action_requise'
    : p1Findings.some((f) => f.type === 'evidence_gap')
    ? 'point_d_attention'
    : p1Findings.some((f) => f.type === 'clarification_point')
    ? 'point_d_attention'
    : p1Findings.some((f) => f.type === 'insufficient_information')
    ? 'a_consolider'
    : 'conforme';

  const pillar1: ConsularPillarDetail = {
    id: 'legal_admissibility',
    title: 'Admissibilité Réglementaire & Validité',
    status: p1Status,
    factsSummary: `Passeport (${answers.hasPassport6MonthsValid ? 'valide > 6 mois' : 'validité déclarée courte'}), séjour de ${answers.travelDurationDays || 15} jours prévu en ${answers.destination || 'destination déclarée'}.`,
    officerAngle:
      'L’officier consulaire vérifie en premier lieu la recevabilité juridique immédiate de la demande (validité du passeport, durée dans les plafonds légaux, compétence territoriale).',
    findings: p1Findings,
    evidenceList: p1Evidence,
  };

  // --------------------------------------------------------------------------
  // PILIER 2 : FINANCIAL SUFFICIENCY (Suffisance des ressources)
  // --------------------------------------------------------------------------
  const p2Findings: AssessmentFinding[] = [];
  const p2Evidence: EvidenceRecommendation[] = [];

  const isFrance = (answers.destination || '').toLowerCase().includes('france');
  const isCanada = (answers.destination || '').toLowerCase().includes('canada');
  const isStudent = answers.visaReason === 'etudes';
  const duration = answers.travelDurationDays || 15;

  if (isFrance && !isStudent) {
    // Calcul précis selon le type d'hébergement vérifié
    const accType = answers.accommodationType;

    // On utilise la règle officielle selon l'hébergement
    let dailyRateEur = 65; // Barème avec hôtel
    let ruleId = 'RULE-FR-SUBSISTENCE-HOTEL';
    if (accType === 'attestation_accueil') {
      dailyRateEur = 32.5;
      ruleId = 'RULE-FR-SUBSISTENCE-ATTESTATION-ACCUEIL';
    } else if (accType === 'non_justifie') {
      dailyRateEur = 120;
      ruleId = 'RULE-FR-SUBSISTENCE-NO-LODGING-PROOF';
    }

    const officialRule = resolveOfficialRule(
      'france',
      'tourisme_visite',
      'subsistence_threshold',
      answers.countryOfOrigin
    );
    const totalRequiredEur = dailyRateEur * duration;
    const totalRequiredFcfa = Math.round(totalRequiredEur * 655.957);

    if (answers.fundingSource === 'autofinancement') {
      const budget = answers.availableBudgetFcfa;
      if (budget === undefined || budget === null || isNaN(budget)) {
        p2Findings.push({
          id: 'FIND-FIN-BUDGET-UNDECLARED',
          pillarId: 'financial_sufficiency',
          type: 'insufficient_information',
          title: 'Montant du budget personnel disponible non renseigné',
          declaredFact: 'Autofinancement déclaré sans précision du montant chiffré des ressources disponibles.',
          officialBasis: `Barème officiel de subsistance : ${dailyRateEur} € / jour (soit ${totalRequiredFcfa.toLocaleString('fr-FR')} FCFA pour ${duration} jours selon justificatif d'hébergement).`,
          sourceRuleId: ruleId,
          findingRationale:
            'Le mode de financement par autofinancement déclaré exige la communication d’un budget disponible chiffré pour permettre à l’autorité consulaire d’évaluer la suffisance des moyens d’existence par rapport au barème officiel applicable. Cette information manquante ne permet pas d’effectuer la comparaison arithmétique.',
          isDirectBlocker: false,
          priorityEligibility: { eligible: true, weight: 'high' },
          suggestedAction:
            'Renseigner le montant exact de votre budget disponible pour vérifier sa conformité avec le barème consulaire officiel.',
        });
      } else if (budget < totalRequiredFcfa) {
        p2Findings.push({
          id: 'FIND-FIN-SUFFICIENCY-BELOW-THRESHOLD',
          pillarId: 'financial_sufficiency',
          type: 'compliance_issue',
          title: 'Ressources déclarées inférieures au barème journalier officiel',
          declaredFact: `Budget liquide déclaré : ${budget.toLocaleString('fr-FR')} FCFA pour ${duration} jours.`,
          officialBasis: `Barème officiel : ${dailyRateEur} € / jour (soit ${totalRequiredFcfa.toLocaleString('fr-FR')} FCFA pour ${duration} jours selon justificatif d'hébergement).`,
          sourceRuleId: ruleId,
          findingRationale:
            'Le montant déclaré disponible ne couvre pas l’intégralité du barème officiel de subsistance fixé par la réglementation pour la durée sollicitée.',
          isDirectBlocker: true,
          priorityEligibility: { eligible: true, weight: 'high' },
          suggestedAction:
            'Ajuster la durée du séjour ou compléter les réserves bancaires pour satisfaire au barème journalier officiel de référence.',
          recommendedEvidence: [
            {
              targetPillar: 'financial_sufficiency',
              relatedChecklistKey: 'bank_statements',
              documentName: 'Attestation de solde bancaire et relevés certifiés',
              consularUtility: 'Atteste de la disponibilité effective des fonds requis pour l’intégralité du séjour.',
              category: 'mandatory_by_regulation',
            },
          ],
        });
      } else {
        p2Findings.push({
          id: 'FIND-FIN-SUFFICIENCY-CONFORME',
          pillarId: 'financial_sufficiency',
          type: 'favorable_evidence',
          title: 'Couverture financière conforme au barème officiel de référence',
          declaredFact: `Budget liquide disponible déclaré (${budget.toLocaleString('fr-FR')} FCFA) pour un besoin de référence de ${totalRequiredFcfa.toLocaleString('fr-FR')} FCFA.`,
          officialBasis: `Barème journalier officiel de ${dailyRateEur} € / jour.`,
          sourceRuleId: ruleId,
          findingRationale:
            'Les fonds personnels liquides déclarés couvrent le montant de référence fixé par la réglementation pour la durée et le mode d’hébergement choisis.',
          isDirectBlocker: false,
          priorityEligibility: { eligible: false, weight: 'low' },
        });
      }
    } else if (answers.fundingSource === 'garant_local' || answers.fundingSource === 'garant_etranger') {
      p2Evidence.push({
        targetPillar: 'financial_sufficiency',
        relatedChecklistKey: 'funding_guarantor',
        documentName: 'Engagement de prise en charge financière du garant + 3 bulletins de salaire + avis d’imposition',
        consularUtility: 'Démontre la capacité contributive et le reste à vivre suffisant du tiers garant.',
        category: 'mandatory_by_regulation',
      });

      if (!answers.guarantorHasTaxNotices) {
        p2Findings.push({
          id: 'FIND-FIN-GUARANTOR-TAX-GAP',
          pillarId: 'financial_sufficiency',
          type: 'evidence_gap',
          title: 'Avis fiscal d’imposition du garant non mentionné',
          declaredFact: 'Prise en charge par un tiers sans déclaration de l’avis fiscal ou bilan certifié.',
          findingRationale:
            'Les fiches de paie seules ne suffisent pas à établir le revenu net annuel disponible ; l’avis d’imposition récent est la pièce de référence examinée par le consulat pour juger de la solvabilité du garant.',
          isDirectBlocker: false,
          priorityEligibility: { eligible: true, weight: 'high' },
          suggestedAction: 'Solliciter auprès du garant son dernier avis d’imposition officiel ou bilan comptable certifié.',
        });
      }
    } else if (answers.fundingSource === 'bourse_officielle') {
      if (answers.hasScholarshipCertificate) {
        p2Findings.push({
          id: 'FIND-FIN-SCHOLARSHIP-OK',
          pillarId: 'financial_sufficiency',
          type: 'favorable_evidence',
          title: 'Financement institutionnel étayé par une bourse',
          declaredFact: 'Bourse officielle avec attestation d’attribution disponible déclarée.',
          findingRationale:
            'La présence d’une attestation nominative d’attribution de bourse officielle couvre la charge de subsistance selon les termes de l’organisme bailleur.',
          isDirectBlocker: false,
          priorityEligibility: { eligible: false, weight: 'low' },
        });
      } else {
        p2Findings.push({
          id: 'FIND-FIN-SCHOLARSHIP-NO-CERT',
          pillarId: 'financial_sufficiency',
          type: 'evidence_gap',
          title: 'Attestation formelle d’attribution de bourse à joindre',
          declaredFact: 'Bourse déclarée sans attestation nominative confirmée.',
          findingRationale:
            'Pour être prise en compte par le service des visas, la bourse doit faire l’objet d’un arrêté ou d’une attestation d’attribution précisant la durée et les montants alloués.',
          isDirectBlocker: false,
          priorityEligibility: { eligible: true, weight: 'high' },
          suggestedAction: 'Obtenir l’attestation officielle d’attribution de bourse auprès de l’organisme donateur.',
        });
      }
    }
  } else if (isFrance && isStudent) {
    // Études en France
    const studentBaseRule = resolveOfficialRule(
      'france',
      'etudes',
      'subsistence_threshold',
      answers.countryOfOrigin
    );
    if (studentBaseRule && studentBaseRule.amount) {
      const annualTargetEur = studentBaseRule.amount * 12;
      const annualTargetFcfa = Math.round(annualTargetEur * 655.957);

      if (answers.hasAviBlockedAccount) {
        p2Findings.push({
          id: 'FIND-STUDENT-AVI-PRESENT',
          pillarId: 'financial_sufficiency',
          type: 'favorable_evidence',
          title: 'Sanctuarisation financière par compte bloqué (AVI)',
          declaredFact: 'Attestation de Virement Irrévocable (AVI) déclarée mise en place.',
          officialBasis: studentBaseRule.ruleDescription,
          sourceRuleId: studentBaseRule.id,
          findingRationale:
            'L’AVI délivrée par un établissement financier agréé constitue la preuve documentaire de référence de la mise à disposition mensuelle des fonds de subsistance pour l’année universitaire.',
          isDirectBlocker: false,
          priorityEligibility: { eligible: false, weight: 'low' },
        });
      } else if (answers.fundingSource === 'autofinancement') {
        const budget = answers.availableBudgetFcfa;
        if (budget === undefined || budget === null || isNaN(budget)) {
          p2Findings.push({
            id: 'FIND-STUDENT-BUDGET-UNDECLARED',
            pillarId: 'financial_sufficiency',
            type: 'insufficient_information',
            title: 'Montant du budget d’études non renseigné',
            declaredFact: 'Autofinancement déclaré pour les études sans précision du montant des ressources disponibles.',
            officialBasis: studentBaseRule.ruleDescription,
            sourceRuleId: studentBaseRule.id,
            findingRationale:
              'Le mode de financement par autofinancement déclaré pour les études exige la communication d’un budget disponible chiffré pour évaluer la couverture du seuil légal minimal de 615 €/mois (7 380 €/an) fixé par l’article R422-2 du CESEDA.',
            isDirectBlocker: false,
            priorityEligibility: { eligible: true, weight: 'high' },
            suggestedAction:
              'Renseigner vos disponibilités financières pour vérifier leur conformité avec l’exigence légale d’au moins 615 € / mois.',
          });
        } else if (budget < annualTargetFcfa) {
          p2Findings.push({
            id: 'FIND-STUDENT-BUDGET-DEFICIT',
            pillarId: 'financial_sufficiency',
            type: 'compliance_issue',
            title: 'Ressources liquides déclarées inférieures au plancher légal étudiant (CESEDA)',
            declaredFact: `Budget liquide déclaré : ${budget.toLocaleString('fr-FR')} FCFA (seuil légal de base : ${annualTargetFcfa.toLocaleString('fr-FR')} FCFA pour 12 mois).`,
            officialBasis: studentBaseRule.ruleDescription,
            sourceRuleId: studentBaseRule.id,
            findingRationale:
              'Le montant disponible déclaré est inférieur au minimum réglementaire fixé par l’article R422-2 du CESEDA pour subvenir aux besoins d’une année complète d’études.',
            isDirectBlocker: true,
            priorityEligibility: { eligible: true, weight: 'high' },
            suggestedAction:
              'Mobiliser un garant financier solvable complémentaire ou mettre en place une AVI couvrant le montant annuel réglementaire.',
          });
        } else {
          p2Findings.push({
            id: 'FIND-STUDENT-BUDGET-CONFORME',
            pillarId: 'financial_sufficiency',
            type: 'favorable_evidence',
            title: 'Ressources liquides déclarées conformes au plancher légal étudiant',
            declaredFact: `Budget liquide déclaré (${budget.toLocaleString('fr-FR')} FCFA) couvrant le plancher légal annuel (${annualTargetFcfa.toLocaleString('fr-FR')} FCFA).`,
            officialBasis: studentBaseRule.ruleDescription,
            sourceRuleId: studentBaseRule.id,
            findingRationale:
              'Le montant liquide disponible déclaré satisfait au minimum réglementaire fixé par l’article R422-2 du CESEDA pour l’année d’études.',
            isDirectBlocker: false,
            priorityEligibility: { eligible: false, weight: 'low' },
          });
        }
      }
    }
  } else if (isCanada && isStudent) {
    // Permis d'études pour le Canada : application de la règle vérifiée RULE-CA-STUDENT-LICO-2024 et RULE-CA-STUDENT-TUITION-FIRST-YEAR
    const canadaStudentRule = resolveOfficialRule(
      'canada',
      'etudes',
      'subsistence_threshold',
      answers.countryOfOrigin
    );
    const tuitionRule = OFFICIAL_CONSULAR_RULES.find((r) => r.id === 'RULE-CA-STUDENT-TUITION-FIRST-YEAR');

    if (canadaStudentRule && canadaStudentRule.amount) {
      const cadAmount = canadaStudentRule.amount; // 20 635 $ CAD
      const rateCadToFcfa = 445; // Taux de conversion de référence vers la zone FCFA
      const licoTargetFcfa = Math.round(cadAmount * rateCadToFcfa); // ~9 182 575 FCFA

      p2Evidence.push({
        targetPillar: 'financial_sufficiency',
        relatedChecklistKey: 'bank_statements',
        documentName: 'Preuves de ressources financières pour le Canada (Relevés bancaires certifiés + GIC si applicable)',
        consularUtility: 'Démontre la capacité à couvrir les frais de subsistance (LICO) en sus des droits de scolarité de première année.',
        category: 'mandatory_by_regulation',
      });

      // Évaluation de la déclaration des droits de scolarité de 1ère année (RIPR Art. R220 a)
      const hasTuitionDeclared =
        answers.declaredFirstYearTuitionCad !== undefined &&
        answers.declaredFirstYearTuitionCad !== null &&
        !isNaN(answers.declaredFirstYearTuitionCad);

      if (!hasTuitionDeclared) {
        p2Findings.push({
          id: 'FIND-CA-STUDENT-TUITION-UNDECLARED',
          pillarId: 'financial_sufficiency',
          type: 'insufficient_information',
          title: 'Droits de scolarité de première année non déclarés (IRPR/R220)',
          declaredFact: 'Droits de scolarité de première année non renseignés pour le projet d’études au Canada.',
          officialBasis: tuitionRule
            ? tuitionRule.ruleDescription
            : 'Règlement sur l’immigration et la protection des réfugiés (RIPR, Art. R220 a) : justification obligatoire des frais de scolarité de 1ère année.',
          sourceRuleId: tuitionRule?.id || 'RULE-CA-STUDENT-TUITION-FIRST-YEAR',
          findingRationale:
            'L’article R220 a) du RIPR exige de justifier des ressources suffisantes pour couvrir les frais de scolarité de la première année d’études, en sus du seuil de subsistance légal (LICO). En l’absence de mention des droits de scolarité, l’exigence financière globale ne peut être arrêtée arithmétiquement.',
          isDirectBlocker: false,
          priorityEligibility: { eligible: true, weight: 'high' },
          suggestedAction:
            'Renseigner le montant des droits de scolarité de 1ère année mentionné sur votre lettre d’acceptation (LOA).',
        });
      }

      if (answers.fundingSource === 'autofinancement') {
        const budget = answers.availableBudgetFcfa;

        if (budget === undefined || budget === null || isNaN(budget)) {
          p2Findings.push({
            id: 'FIND-CA-STUDENT-BUDGET-UNDECLARED',
            pillarId: 'financial_sufficiency',
            type: 'insufficient_information',
            title: 'Montant du budget de subsistance pour le Canada non renseigné',
            declaredFact: 'Autofinancement déclaré pour un permis d’études au Canada sans montant chiffré.',
            officialBasis: canadaStudentRule.ruleDescription,
            sourceRuleId: canadaStudentRule.id,
            findingRationale:
              'L’absence de montant chiffré ne permet pas de vérifier si les fonds couvrent le seuil de subsistance IRCC (20 635 $ CAD hors frais de scolarité). Cette information est requise pour une évaluation financière complète.',
            isDirectBlocker: false,
            priorityEligibility: { eligible: true, weight: 'high' },
            suggestedAction:
              'Renseigner vos disponibilités financières liquides pour vérifier leur adéquation avec les exigences de subsistance IRCC.',
          });
        } else if (hasTuitionDeclared) {
          const declaredTuitionCad = answers.declaredFirstYearTuitionCad as number;
          const totalRequiredCad = cadAmount + declaredTuitionCad;
          const totalRequiredFcfa = Math.round(totalRequiredCad * rateCadToFcfa);

          if (budget < totalRequiredFcfa) {
            p2Findings.push({
              id: 'FIND-CA-STUDENT-BUDGET-DEFICIT',
              pillarId: 'financial_sufficiency',
              type: 'compliance_issue',
              title: 'Ressources liquides déclarées inférieures au total légal (LICO 2024 + Frais de scolarité)',
              declaredFact: `Budget déclaré de ${budget.toLocaleString('fr-FR')} FCFA (~${Math.round(budget / rateCadToFcfa).toLocaleString('fr-FR')} $ CAD) pour un besoin total légal de ${totalRequiredFcfa.toLocaleString('fr-FR')} FCFA (${totalRequiredCad.toLocaleString('fr-FR')} $ CAD, dont ${cadAmount.toLocaleString('fr-FR')} $ CAD de subsistance et ${declaredTuitionCad.toLocaleString('fr-FR')} $ CAD de scolarité).`,
              officialBasis: `${canadaStudentRule.ruleDescription} & ${tuitionRule?.ruleDescription || 'RIPR Art. R220'}`,
              sourceRuleId: canadaStudentRule.id,
              findingRationale:
                'L’article R220 du RIPR exige de justifier des ressources suffisantes pour couvrir les frais de subsistance (20 635 $ CAD / an hors Québec) ET les droits de scolarité de la première année d’études. Les disponibilités déclarées présentent un déficit arithmétique par rapport au total cumulé exigé.',
              isDirectBlocker: true,
              priorityEligibility: { eligible: true, weight: 'high' },
              suggestedAction:
                'Consolider l’apport financier personnel, recourir à un garant solvable ou justifier d’une bourse complémentaire pour couvrir le total de subsistance et scolarité.',
            });
          } else {
            p2Findings.push({
              id: 'FIND-CA-STUDENT-BUDGET-CONFORME',
              pillarId: 'financial_sufficiency',
              type: 'favorable_evidence',
              title: 'Ressources liquides déclarées conformes au total légal (LICO + Frais de scolarité)',
              declaredFact: `Budget déclaré de ${budget.toLocaleString('fr-FR')} FCFA couvrant le besoin total légal de ${totalRequiredFcfa.toLocaleString('fr-FR')} FCFA (${totalRequiredCad.toLocaleString('fr-FR')} $ CAD, incluant subsistance et 1ère année de scolarité).`,
              officialBasis: `${canadaStudentRule.ruleDescription} & ${tuitionRule?.ruleDescription || 'RIPR Art. R220'}`,
              sourceRuleId: canadaStudentRule.id,
              findingRationale:
                'Les fonds liquides personnels déclarés couvrent l’intégralité des exigences cumulées (subsistance LICO et 1ère année de scolarité) fixées par l’article R220 du RIPR.',
              isDirectBlocker: false,
              priorityEligibility: { eligible: false, weight: 'low' },
            });
          }
        } else {
          // Tuition non déclarée : comparaison arithmétique contre le plancher LICO seul (20 635 $ CAD)
          if (budget < licoTargetFcfa) {
            p2Findings.push({
              id: 'FIND-CA-STUDENT-BUDGET-DEFICIT',
              pillarId: 'financial_sufficiency',
              type: 'compliance_issue',
              title: 'Ressources liquides déclarées inférieures au seuil de subsistance IRCC (LICO 2024)',
              declaredFact: `Budget déclaré de ${budget.toLocaleString('fr-FR')} FCFA (~${Math.round(budget / rateCadToFcfa).toLocaleString('fr-FR')} $ CAD) pour un seuil légal de subsistance de ${licoTargetFcfa.toLocaleString('fr-FR')} FCFA (${cadAmount.toLocaleString('fr-FR')} $ CAD hors scolarité).`,
              officialBasis: canadaStudentRule.ruleDescription,
              sourceRuleId: canadaStudentRule.id,
              findingRationale:
                'L’article R220 du Règlement sur l’immigration et la protection des réfugiés (RIPR) exige de justifier des ressources suffisantes pour couvrir les frais de subsistance (20 635 $ CAD / an hors Québec pour un demandeur seul), en sus des droits de scolarité de première année. Les fonds déclarés sont inférieurs à ce seuil réglementaire.',
              isDirectBlocker: true,
              priorityEligibility: { eligible: true, weight: 'high' },
              suggestedAction:
                'Consolider l’apport financier personnel, recourir à un garant solvable ou justifier d’un soutien institutionnel complémentaire conforme aux barèmes IRCC.',
            });
          } else {
            p2Findings.push({
              id: 'FIND-CA-STUDENT-BUDGET-CONFORME',
              pillarId: 'financial_sufficiency',
              type: 'favorable_evidence',
              title: 'Ressources liquides déclarées conformes au seuil de subsistance IRCC',
              declaredFact: `Budget déclaré de ${budget.toLocaleString('fr-FR')} FCFA couvrant le seuil réglementaire de subsistance de 20 635 $ CAD (~${licoTargetFcfa.toLocaleString('fr-FR')} FCFA).`,
              officialBasis: canadaStudentRule.ruleDescription,
              sourceRuleId: canadaStudentRule.id,
              findingRationale:
                'Les fonds liquides personnels déclarés couvrent le montant obligatoire de subsistance exigé par l’article R220 du RIPR pour une année d’études au Canada hors Québec.',
              isDirectBlocker: false,
              priorityEligibility: { eligible: false, weight: 'low' },
            });
          }
        }
      } else if (answers.fundingSource === 'garant_local' || answers.fundingSource === 'garant_etranger') {
        if (!answers.guarantorHasTaxNotices) {
          p2Findings.push({
            id: 'FIND-CA-STUDENT-GUARANTOR-TAX-GAP',
            pillarId: 'financial_sufficiency',
            type: 'evidence_gap',
            title: 'Avis fiscaux de cotisation du garant à joindre pour le Canada',
            declaredFact: 'Prise en charge financière d’études au Canada par un tiers garant sans avis fiscal précisé.',
            findingRationale:
              'IRCC examine la capacité financière réelle et continue du tiers garant ; les avis de cotisation fiscale ou déclarations de revenus récentes sont nécessaires pour établir la viabilité de la prise en charge.',
            isDirectBlocker: false,
            priorityEligibility: { eligible: true, weight: 'high' },
            suggestedAction:
              'Obtenir du garant sa lettre d’engagement financier accompagnée de ses avis de cotisation fiscale récents et attestations d’emploi.',
          });
        }
      } else if (answers.fundingSource === 'bourse_officielle') {
        if (answers.hasScholarshipCertificate) {
          p2Findings.push({
            id: 'FIND-CA-STUDENT-SCHOLARSHIP-OK',
            pillarId: 'financial_sufficiency',
            type: 'favorable_evidence',
            title: 'Financement institutionnel étayé par une bourse d’études',
            declaredFact: 'Bourse officielle avec attestation d’attribution disponible déclarée.',
            findingRationale:
              'Une attestation officielle d’octroi de bourse émise par un gouvernement ou un organisme agréé est reconnue par IRCC pour satisfaire aux exigences financières.',
            isDirectBlocker: false,
            priorityEligibility: { eligible: false, weight: 'low' },
          });
        } else {
          p2Findings.push({
            id: 'FIND-CA-STUDENT-SCHOLARSHIP-NO-CERT',
            pillarId: 'financial_sufficiency',
            type: 'evidence_gap',
            title: 'Lettre officielle d’octroi de bourse à fournir',
            declaredFact: 'Bourse d’études déclarée sans lettre nominative officielle jointe.',
            findingRationale:
              'La prise en compte d’un financement par bourse exige la production d’une lettre nominative officielle précisant les montants accordés et la période couverte.',
            isDirectBlocker: false,
            priorityEligibility: { eligible: true, weight: 'high' },
            suggestedAction: 'Obtenir la lettre d’octroi officielle de la bourse avant le dépôt de la demande.',
          });
        }
      }
    } else {
      p2Findings.push({
        id: 'FIND-CA-STUDENT-RULE-UNVERIFIED',
        pillarId: 'financial_sufficiency',
        type: 'insufficient_information',
        title: 'Barème financier pour permis d’études non résolu dans les règles vérifiées',
        declaredFact: 'Demande de permis d’études au Canada.',
        findingRationale:
          'Le barème officiel applicable à votre profil n’a pas pu être résolu parmi les règles certifiées de la base locale.',
        isDirectBlocker: false,
        priorityEligibility: { eligible: false, weight: 'low' },
      });
    }
  } else {
    // Destination sans règle financière vérifiée dans le registre
    p2Findings.push({
      id: 'FIND-FIN-UNVERIFIED-DESTINATION-RULE',
      pillarId: 'financial_sufficiency',
      type: 'insufficient_information',
      title: 'Barème financier officiel non vérifié dans la base locale',
      declaredFact: `Destination : ${answers.destination || 'Non spécifiée'}, mode de financement : ${answers.fundingSource || 'Non spécifié'}.`,
      findingRationale:
        'Le barème officiel de subsistance pour cette destination spécifique n’est pas certifié par un texte de loi vérifié dans le référentiel actuel. Une vérification manuelle auprès du consulat ou portail officiel est requise.',
      isDirectBlocker: false,
      priorityEligibility: { eligible: false, weight: 'low' },
    });
  }

  const p2Status: ConsularScrutinyLevel = p2Findings.some((f) => f.isDirectBlocker)
    ? 'action_requise'
    : p2Findings.some((f) => f.type === 'evidence_gap')
    ? 'point_d_attention'
    : p2Findings.some((f) => f.type === 'insufficient_information')
    ? 'a_consolider'
    : 'conforme';

  const budgetDisplay =
    answers.availableBudgetFcfa !== undefined && answers.availableBudgetFcfa !== null
      ? `${answers.availableBudgetFcfa.toLocaleString('fr-FR')} FCFA`
      : 'non renseigné';

  const pillar2: ConsularPillarDetail = {
    id: 'financial_sufficiency',
    title: 'Suffisance des Moyens d’Existence',
    status: p2Status,
    factsSummary: `Financement par ${answers.fundingSource || 'mode non précisé'}, budget déclaré : ${budgetDisplay}.`,
    officerAngle:
      'L’autorité consulaire compare les montants disponibles aux barèmes journaliers ou mensuels applicables pour s’assurer de l’autonomie du voyageur sans recours aux deniers publics.',
    findings: p2Findings,
    evidenceList: p2Evidence,
  };

  // --------------------------------------------------------------------------
  // PILIER 3 : FINANCIAL PROVENANCE (Traçabilité & Origine des fonds)
  // --------------------------------------------------------------------------
  const p3Findings: AssessmentFinding[] = [];
  const p3Evidence: EvidenceRecommendation[] = [
    {
      targetPillar: 'financial_provenance',
      relatedChecklistKey: 'bank_statements',
      documentName: 'Relevés bancaires des 3 à 6 derniers mois visés par la banque',
      consularUtility: 'Atteste de la régularité des entrées et de l’absence d’artifice comptable.',
      category: 'mandatory_by_regulation',
    },
  ];

  // Gestion rigoureuse du dépôt récent (CORRECTION 3 : l'absence de dépôt est strictement neutre)
  if (answers.hasRecentLumpDeposit === true) {
    // Ce n'est JAMAIS un compliance_issue ni une fraude
    if (answers.lumpDepositExplanation && answers.lumpDepositExplanation.trim().length > 0) {
      p3Findings.push({
        id: 'FIND-LUMP-DEPOSIT-EXPLAINED',
        pillarId: 'financial_provenance',
        type: 'clarification_point',
        title: 'Mouvement bancaire récent déclaré à documenter par une pièce justificative',
        declaredFact: `Crédit récent déclaré : ${answers.lumpDepositExplanation}`,
        findingRationale:
          'Une rentrée financière significative intervenue peu avant le dépôt de la demande appelle une explication matérielle pour attester qu’il s’agit d’une ressource réelle et pérenne.',
        isDirectBlocker: false,
        priorityEligibility: { eligible: true, weight: 'high' },
        suggestedAction:
          'Joindre le document matérialisant l’opération déclarée (acte de cession, reçu de solde de tout compte, bulletin de gratification ou convention d’aide familiale).',
        recommendedEvidence: [
          {
            targetPillar: 'financial_provenance',
            relatedChecklistKey: 'lump_deposit_proof',
            documentName: 'Justificatif matériel d’origine des fonds (acte de vente, contrat ou attestation bancaire du donateur)',
            consularUtility:
              'Permet de documenter et de contextualiser l’origine des fonds correspondant au crédit bancaire récent.',
            category: 'recommended_evidence',
          },
        ],
      });
    } else {
      p3Findings.push({
        id: 'FIND-LUMP-DEPOSIT-UNEXPLAINED',
        pillarId: 'financial_provenance',
        type: 'evidence_gap',
        title: 'Origine matérielle du versement récent à expliciter',
        declaredFact: 'Dépôt bancaire récent déclaré sans détail sur l’origine des fonds.',
        findingRationale:
          'Un mouvement créditeur exceptionnel sans justificatif d’origine incite le service instructeur à s’interroger sur un éventuel prêt de complaisance temporaire.',
        isDirectBlocker: false,
        priorityEligibility: { eligible: true, weight: 'high' },
        suggestedAction:
          'Identifier la cause exacte de cette entrée de fonds et préparer la pièce justificative correspondante.',
      });
    }
  } else {
    // hasRecentLumpDeposit === false : NEUTRE, pas de favorable_evidence artificielle
    // Le pilier est conforme sans anomalie
  }

  const p3Status: ConsularScrutinyLevel = p3Findings.some((f) => f.type === 'evidence_gap')
    ? 'point_d_attention'
    : p3Findings.some((f) => f.type === 'clarification_point')
    ? 'point_d_attention'
    : 'conforme';

  const pillar3: ConsularPillarDetail = {
    id: 'financial_provenance',
    title: 'Traçabilité & Origine des Ressources',
    status: p3Status,
    factsSummary: answers.hasRecentLumpDeposit
      ? `Dépôt récent signalé (${answers.lumpDepositExplanation || 'origine à expliciter'}).`
      : 'Flux bancaires déclarés réguliers sur les relevés.',
    officerAngle:
      'L’officier instructeur analyse l’historique des mouvements pour vérifier que les fonds présentés appartiennent véritablement au demandeur et ne constituent pas un montage éphémère.',
    findings: p3Findings,
    evidenceList: p3Evidence,
  };

  // --------------------------------------------------------------------------
  // PILIER 4 : PURPOSE AND LOGISTICS (Motif & Cohérence logistique)
  // --------------------------------------------------------------------------
  const p4Findings: AssessmentFinding[] = [];
  const p4Evidence: EvidenceRecommendation[] = [];

  // Hébergement
  if (answers.accommodationType === 'hotel_confirme') {
    p4Evidence.push({
      targetPillar: 'purpose_and_logistics',
      relatedChecklistKey: 'hotel_booking',
      documentName: 'Réservation hôtelière confirmée couvrant le séjour',
      consularUtility: 'Établit le point de chute logistique durant le voyage.',
      category: 'recommended_evidence',
    });
  } else if (answers.accommodationType === 'attestation_accueil') {
    p4Evidence.push({
      targetPillar: 'purpose_and_logistics',
      relatedChecklistKey: 'attestation_accueil',
      documentName: 'Attestation d’Accueil délivrée par la mairie ou invitation officielle légalisée',
      consularUtility: 'Atteste de la mise à disposition d’un logement conforme par un résident.',
      category: 'mandatory_by_regulation',
    });
  } else if (answers.accommodationType === 'residence_etudiante') {
    p4Evidence.push({
      targetPillar: 'purpose_and_logistics',
      relatedChecklistKey: 'campus_housing',
      documentName: 'Attestation Crous ou contrat de bail étudiant',
      consularUtility: 'Prouve la disposition effective d’un hébergement pérenne pour les études.',
      category: 'recommended_evidence',
    });
  } else if (answers.accommodationType === 'non_justifie') {
    p4Findings.push({
      id: 'FIND-PURPOSE-NO-LODGING',
      pillarId: 'purpose_and_logistics',
      type: 'evidence_gap',
      title: 'Modalité d’hébergement non définie à ce stade',
      declaredFact: 'Aucun justificatif d’hébergement déclaré disponible.',
      findingRationale:
        'L’absence de justificatif d’accueil ou de réservation d’hôtel augmente le barème journalier exigible et peut susciter une question sur l’organisation logistique.',
      isDirectBlocker: false,
      priorityEligibility: { eligible: true, weight: 'high' },
      suggestedAction:
        'Sécuriser une réservation hôtelière ferme ou demander une attestation d’accueil officielle à votre hôte avant le dépôt.',
    });
  }

  // Absence professionnelle et durée pour les salariés
  if (answers.status === 'salarie' && (answers.travelDurationDays || 0) > 21) {
    p4Findings.push({
      id: 'FIND-PURPOSE-LONG-STAY-SALARIE',
      pillarId: 'purpose_and_logistics',
      type: 'clarification_point',
      title: 'Organisation de l’absence professionnelle à matérialiser',
      declaredFact: `Salarié déclarant un déplacement d’une durée de ${answers.travelDurationDays} jours.`,
      findingRationale:
        'Les informations disponibles permettent de documenter la cohérence du séjour sous réserve que l’employeur formalise son accord pour cette durée d’absence avec garantie de réintégration.',
      isDirectBlocker: false,
      priorityEligibility: { eligible: true, weight: 'medium' },
      suggestedAction:
        'Fournir une attestation d’accord de congé signée par la direction mentionnant les dates d’absence autorisées et la date précise de reprise de fonction.',
      recommendedEvidence: [
        {
          targetPillar: 'purpose_and_logistics',
          relatedChecklistKey: 'employer_leave_authorization',
          documentName: 'Attestation d’autorisation de congé et de reprise de poste',
          consularUtility: 'Matérialise l’accord formel de l’employeur et la compatibilité du voyage avec le poste.',
          category: 'recommended_evidence',
        },
      ],
    });
  }

  // Si études : cohérence du projet
  if (isStudent && answers.highestDegree && answers.targetMajorAbroad) {
    p4Findings.push({
      id: 'FIND-PURPOSE-ACADEMIC-CONTINUITY',
      pillarId: 'purpose_and_logistics',
      type: 'favorable_evidence',
      title: 'Continuité académique documentable',
      declaredFact: `Dernier diplôme déclaré : ${answers.highestDegree}, cursus visé : ${answers.targetMajorAbroad}.`,
      findingRationale:
        'Les informations disponibles permettent de documenter la logique de progression académique entre le parcours antérieur et la formation demandée.',
      isDirectBlocker: false,
      priorityEligibility: { eligible: false, weight: 'low' },
    });
  }

  // Assurance voyage médicale obligatoire Schengen (Art. 15 Code Communautaire des Visas)
  const isFranceProfileForP4 = (answers.destination || '').toLowerCase().includes('france');
  const isStudentProfileForP4 = answers.visaReason === 'etudes';
  const isSchengenTourism = isFranceProfileForP4 && (answers.visaReason === 'tourisme_visite' || !isStudentProfileForP4);

  if (isSchengenTourism) {
    const insuranceRule = resolveOfficialRule(
      'france',
      'tourisme_visite',
      'insurance_requirement',
      answers.countryOfOrigin
    );
    const insBasis = insuranceRule
      ? insuranceRule.ruleDescription
      : 'Code Communautaire des Visas (Règlement CE n° 810/2009, Art. 15) : souscription obligatoire d’une assurance médicale de voyage couvrant un montant minimal de 30 000 EUR.';
    const insRuleId = insuranceRule ? insuranceRule.id : 'RULE-SCHENGEN-INSURANCE-MANDATORY';

    if (answers.hasTravelInsurance === undefined || answers.hasTravelInsurance === null) {
      p4Findings.push({
        id: 'FIND-SCHENGEN-INSURANCE-UNDECLARED',
        pillarId: 'purpose_and_logistics',
        type: 'insufficient_information',
        title: 'Assurance médicale de voyage Schengen non renseignée',
        declaredFact: 'Aucune indication sur la souscription d’une assurance médicale de voyage pour le séjour en France / Schengen.',
        officialBasis: insBasis,
        sourceRuleId: insRuleId,
        findingRationale:
          'L’article 15 du Code Communautaire des Visas subordonne la délivrance du visa court séjour à la souscription d’une assurance médicale couvrant au minimum 30 000 EUR (soins d’urgence et rapatriement). L’absence d’indication ne permet pas de statuer sur la complétude documentaire.',
        isDirectBlocker: false,
        priorityEligibility: { eligible: true, weight: 'high' },
        suggestedAction:
          'Vérifier si vous disposez d’une attestation d’assurance voyage conforme (ex: liée à une carte bancaire haut de gamme ou contrat d’assistance dédié) ou souscrire une police agréée.',
      });
    } else if (answers.hasTravelInsurance === false) {
      p4Findings.push({
        id: 'FIND-SCHENGEN-INSURANCE-ABSENT',
        pillarId: 'purpose_and_logistics',
        type: 'evidence_gap',
        title: 'Assurance médicale de voyage obligatoire (30 000 €) à souscrire',
        declaredFact: 'Demandeur déclarant ne pas disposer d’assurance médicale de voyage pour son séjour Schengen.',
        officialBasis: insBasis,
        sourceRuleId: insRuleId,
        findingRationale:
          'L’article 15 du Code Communautaire des Visas exige la présentation d’une police d’assurance médicale couvrant au moins 30 000 EUR pour les frais de rapatriement sanitaire, soins médicaux et hospitaliers d’urgence. Cette pièce est requise pour la délivrance du visa.',
        isDirectBlocker: false,
        priorityEligibility: { eligible: true, weight: 'high' },
        suggestedAction:
          'Souscrire une assurance voyage Schengen certifiée d’un plafond minimal de 30 000 EUR couvrant l’intégralité de la période de déplacement avant le dépôt du dossier.',
        recommendedEvidence: [
          {
            targetPillar: 'purpose_and_logistics',
            relatedChecklistKey: 'travel_insurance',
            documentName: 'Attestation d’assurance médicale de voyage Schengen (garantie ≥ 30 000 €)',
            consularUtility: 'Obligation réglementaire stricte imposée par l’article 15 du Code Communautaire des Visas.',
            category: 'mandatory_by_regulation',
          },
        ],
      });
    } else if (
      answers.travelInsuranceCoverageEur === undefined ||
      answers.travelInsuranceCoverageEur === null ||
      answers.travelInsuranceCoverageEur < 30000
    ) {
      const declaredCoverage = answers.travelInsuranceCoverageEur ?? 0;
      p4Findings.push({
        id: 'FIND-SCHENGEN-INSURANCE-COVERAGE-DEFICIT',
        pillarId: 'purpose_and_logistics',
        type: 'evidence_gap',
        title: 'Plafond de garantie de l’assurance voyage inférieur au seuil légal (30 000 €)',
        declaredFact: `Assurance voyage déclarée avec un plafond de garantie de ${declaredCoverage.toLocaleString('fr-FR')} EUR (seuil légal obligatoire : 30 000 EUR).`,
        officialBasis: insBasis,
        sourceRuleId: insRuleId,
        findingRationale:
          'L’article 15 § 2 du Code Communautaire des Visas dispose que la couverture minimale doit s’élever à 30 000 EUR. Une police déclarée avec un montant inférieur ne remplit pas le critère réglementaire de validité documentaire.',
        isDirectBlocker: false,
        priorityEligibility: { eligible: true, weight: 'high' },
        suggestedAction:
          'Demander à votre assureur une attestation d’extension ou souscrire un avenant portant le plafond de garantie à 30 000 EUR au minimum.',
        recommendedEvidence: [
          {
            targetPillar: 'purpose_and_logistics',
            relatedChecklistKey: 'travel_insurance',
            documentName: 'Attestation ou avenant d’assurance voyage certifiant un plafond ≥ 30 000 €',
            consularUtility: 'Prouve le respect du seuil minimal obligatoire imposé par le Code Communautaire des Visas.',
            category: 'mandatory_by_regulation',
          },
        ],
      });
    } else {
      // hasTravelInsurance === true && travelInsuranceCoverageEur >= 30000
      p4Findings.push({
        id: 'FIND-SCHENGEN-INSURANCE-CONFORME',
        pillarId: 'purpose_and_logistics',
        type: 'favorable_evidence',
        title: 'Assurance médicale de voyage conforme aux exigences réglementaires',
        declaredFact: `Assurance médicale de voyage déclarée avec une couverture de ${answers.travelInsuranceCoverageEur.toLocaleString('fr-FR')} EUR (seuil minimal légal : 30 000 EUR).`,
        officialBasis: insBasis,
        sourceRuleId: insRuleId,
        findingRationale:
          'La police d’assurance déclarée satisfait aux exigences de l’article 15 du Code Communautaire des Visas en matière de plafond de garantie.',
        isDirectBlocker: false,
        priorityEligibility: { eligible: false, weight: 'low' },
      });
    }
  }

  const p4Status: ConsularScrutinyLevel = p4Findings.some((f) => f.isDirectBlocker)
    ? 'action_requise'
    : p4Findings.some((f) => f.type === 'evidence_gap')
    ? 'point_d_attention'
    : p4Findings.some((f) => f.type === 'clarification_point')
    ? 'point_d_attention'
    : p4Findings.some((f) => f.type === 'insufficient_information')
    ? 'a_consolider'
    : 'conforme';

  const pillar4: ConsularPillarDetail = {
    id: 'purpose_and_logistics',
    title: 'Motif du Séjour & Logistique',
    status: p4Status,
    factsSummary: `Motif : ${answers.visaReason || 'non précisé'}, durée : ${answers.travelDurationDays || 15} jours, hébergement : ${answers.accommodationType || 'non précisé'}.`,
    officerAngle:
      'L’instructeur vérifie l’adéquation matérielle entre l’objet annoncé du déplacement, le calendrier et les réservations logistiques fournies.',
    findings: p4Findings,
    evidenceList: p4Evidence,
  };

  // --------------------------------------------------------------------------
  // PILIER 5 : TIES AND ANCHORS (Ancrages & Garanties de retour)
  // --------------------------------------------------------------------------
  const p5Findings: AssessmentFinding[] = [];
  const p5Evidence: EvidenceRecommendation[] = [];

  // Situation professionnelle (CORRECTION 7 : jamais "l'emploi garantit le retour")
  if (answers.status === 'salarie' || answers.status === 'fonctionnaire') {
    p5Findings.push({
      id: 'FIND-TIES-PROFESSIONAL-DOCUMENTABLE',
      pillarId: 'ties_and_anchors',
      type: 'favorable_evidence',
      title: 'Ancrage socio-professionnel documentable au pays d’origine',
      declaredFact: `Statut déclaré : ${answers.status === 'fonctionnaire' ? 'Fonctionnaire' : 'Salarié'}${answers.jobTitle ? ` (${answers.jobTitle})` : ''}.`,
      findingRationale:
        'Votre situation professionnelle déclarée constitue un élément documentable de votre situation actuelle. Une attestation de travail, les 3 derniers bulletins de paie et une confirmation de reprise de poste permettent de matérialiser cet ancrage.',
      isDirectBlocker: false,
      priorityEligibility: { eligible: false, weight: 'low' },
      recommendedEvidence: [
        {
          targetPillar: 'ties_and_anchors',
          relatedChecklistKey: 'status_employment',
          documentName: 'Attestation de travail + 3 derniers bulletins de paie + ordre de congé',
          consularUtility: 'Établit la réalité de l’emploi en cours et la poursuite de l’activité après le voyage.',
          category: 'recommended_evidence',
        },
      ],
    });
  } else if (answers.status === 'entrepreneur') {
    if (answers.hasRccmNif) {
      p5Findings.push({
        id: 'FIND-TIES-ENTREPRENEUR-REGISTERED',
        pillarId: 'ties_and_anchors',
        type: 'favorable_evidence',
        title: 'Ancrage économique formalisé par registre de commerce (RCCM/NIF)',
        declaredFact: 'Activité entrepreneuriale immatriculée au registre formel déclarée.',
        findingRationale:
          'L’existence d’une immatriculation au registre du commerce documente l’exercice régulier d’une activité commerciale ou libérale locale.',
        isDirectBlocker: false,
        priorityEligibility: { eligible: false, weight: 'low' },
        recommendedEvidence: [
          {
            targetPillar: 'ties_and_anchors',
            relatedChecklistKey: 'status_business_rccm',
            documentName: 'Registre du Commerce (RCCM) + Carte d’Identité Fiscale + Bilans certifiés',
            consularUtility: 'Démontre l’ancrage économique et la réalité de l’exploitation au pays.',
            category: 'recommended_evidence',
          },
        ],
      });
    } else {
      p5Findings.push({
        id: 'FIND-TIES-ENTREPRENEUR-NO-RCCM',
        pillarId: 'ties_and_anchors',
        type: 'evidence_gap',
        title: 'Formalisation documentaire de l’activité indépendante à apporter',
        declaredFact: 'Activité entrepreneuriale sans mention de justificatif formel (RCCM/NIF).',
        findingRationale:
          'Une activité professionnelle informelle sans preuve d’immatriculation officielle est plus difficilement matérialisable auprès de l’autorité consulaire.',
        isDirectBlocker: false,
        priorityEligibility: { eligible: true, weight: 'medium' },
        suggestedAction:
          'Fournir les justificatifs disponibles d’exercice effectif (patente, contrats de prestation, quittances ou registre local).',
      });
    }
  }

  // Antécédents de refus (CORRECTION V2.2 : traitement raisonné)
  if (answers.hasPreviousRefusal) {
    if (answers.previousRefusalReason && answers.previousRefusalReason.trim().length > 0) {
      p5Findings.push({
        id: 'FIND-PREVIOUS-REFUSAL-EXPLAINED',
        pillarId: 'ties_and_anchors',
        type: 'clarification_point',
        title: 'Précédente décision de refus à mettre en perspective',
        declaredFact: `Antécédent de refus déclaré (${answers.previousRefusalReason}).`,
        findingRationale:
          'Le refus précédent doit être mis en perspective avec votre situation actuelle. Le point principal à documenter est de montrer ce qui a changé depuis cette décision et quels justificatifs nouveaux répondent au motif initial.',
        isDirectBlocker: false,
        priorityEligibility: { eligible: true, weight: 'high' },
        suggestedAction:
          'Rédiger une note de synthèse explicative ciblant précisément les éléments nouveaux apportés en réponse au motif du refus précédent.',
      });
    } else {
      p5Findings.push({
        id: 'FIND-PREVIOUS-REFUSAL-UNSPECIFIED',
        pillarId: 'ties_and_anchors',
        type: 'insufficient_information',
        title: 'Motif du précédent refus à identifier pour cibler la préparation',
        declaredFact: 'Refus de visa antérieur déclaré sans précision du motif notifié.',
        findingRationale:
          'L’absence de communication du motif consulaire notifié ne permet pas d’analyser les éléments matériels à faire évoluer pour ce nouveau dépôt.',
        isDirectBlocker: false,
        priorityEligibility: { eligible: true, weight: 'medium' },
        suggestedAction:
          'Consulter la lettre officielle de notification du refus précédent pour identifier le critère à consolider en priorité.',
      });
    }
  }

  // Contradiction factuelle éventuelle (ex: statut sans emploi mais contrat CDI coché dans les attaches)
  if (answers.status === 'sans_emploi_formel' && answers.tiesType === 'contrat_cdi') {
    p5Findings.push({
      id: 'FIND-CONTRADICTION-STATUS-TIES',
      pillarId: 'ties_and_anchors',
      type: 'factual_inconsistency',
      title: 'Incompatibilité factuelle entre le statut déclaré et l’attache cochée',
      declaredFact: 'Statut déclaré « sans emploi formel » combiné avec une attache par « contrat CDI en cours ».',
      findingRationale:
        'Ces deux informations sont matériellement incompatibles et provoqueraient une incompréhension immédiate lors de l’examen du dossier.',
      isDirectBlocker: false,
      priorityEligibility: { eligible: true, weight: 'high' },
      suggestedAction:
        'Harmoniser le questionnaire en choisissant l’ancrage correspondant à votre situation effective.',
    });
  }

  const p5Status: ConsularScrutinyLevel = p5Findings.some((f) => f.type === 'factual_inconsistency')
    ? 'action_requise'
    : p5Findings.some((f) => f.type === 'evidence_gap' || f.type === 'clarification_point')
    ? 'point_d_attention'
    : p5Findings.some((f) => f.type === 'insufficient_information')
    ? 'a_consolider'
    : 'conforme';

  const pillar5: ConsularPillarDetail = {
    id: 'ties_and_anchors',
    title: 'Ancrages Socio-Économiques & Retour',
    status: p5Status,
    factsSummary: `Activité : ${answers.status || 'non précisée'}, attaches principales : ${answers.tiesType || 'non précisées'}, précédent refus : ${answers.hasPreviousRefusal ? 'Oui' : 'Non'}.`,
    officerAngle:
      'L’autorité consulaire apprécie l’ensemble des éléments matériels et d’activité démontrant l’enracinement du demandeur dans son pays de résidence habituelle.',
    findings: p5Findings,
    evidenceList: p5Evidence,
  };

  // --------------------------------------------------------------------------
  // REGROUPEMENT DE TOUS LES FINDINGS
  // --------------------------------------------------------------------------
  findings.push(...p1Findings, ...p2Findings, ...p3Findings, ...p4Findings, ...p5Findings);

  // --------------------------------------------------------------------------
  // PRIORITY ENGINE (0 À 3 ACTIONS RÉELLES SANS BLUFF)
  // --------------------------------------------------------------------------
  const topPriorities: TargetedPriorityAction[] = [];

  // Niveau 1 : Non-conformités objectives bloquantes (isDirectBlocker === true)
  const blockers = findings.filter((f) => f.isDirectBlocker);
  for (const b of blockers) {
    if (topPriorities.length < 3) {
      topPriorities.push({
        rank: (topPriorities.length + 1) as 1 | 2 | 3,
        targetPillar: b.pillarId,
        title: b.title,
        rationale: b.findingRationale,
        concreteStep: b.suggestedAction || 'Régulariser ce point formel avant tout dépôt consulaire.',
        checklistDocReference: b.recommendedEvidence?.[0]?.relatedChecklistKey,
      });
    }
  }

  // Niveau 2 : Clarifications ou lacunes majeures non bloquantes (weight === 'high')
  const highPriorityItems = findings.filter(
    (f) => !f.isDirectBlocker && f.priorityEligibility.eligible && f.priorityEligibility.weight === 'high'
  );
  for (const item of highPriorityItems) {
    if (topPriorities.length < 3) {
      topPriorities.push({
        rank: (topPriorities.length + 1) as 1 | 2 | 3,
        targetPillar: item.pillarId,
        title: item.title,
        rationale: item.findingRationale,
        concreteStep: item.suggestedAction || 'Rassembler la pièce probante ou explicative nécessaire.',
        checklistDocReference: item.recommendedEvidence?.[0]?.relatedChecklistKey,
      });
    }
  }

  // Niveau 3 : Autres consolidations documentaires (weight === 'medium')
  const mediumPriorityItems = findings.filter(
    (f) => !f.isDirectBlocker && f.priorityEligibility.eligible && f.priorityEligibility.weight === 'medium'
  );
  for (const item of mediumPriorityItems) {
    if (topPriorities.length < 3) {
      topPriorities.push({
        rank: (topPriorities.length + 1) as 1 | 2 | 3,
        targetPillar: item.pillarId,
        title: item.title,
        rationale: item.findingRationale,
        concreteStep: item.suggestedAction || 'Obtenir le justificatif recommandé.',
        checklistDocReference: item.recommendedEvidence?.[0]?.relatedChecklistKey,
      });
    }
  }

  // --------------------------------------------------------------------------
  // DÉTERMINATION DU SCÉNARIO LORSQUE topPriorities.length === 0 (CORRECTION 4)
  // --------------------------------------------------------------------------
  let noPriorityScenario: 'A_complete_verified' | 'B_partial_data' | 'C_unverified_rules' | undefined = undefined;
  if (topPriorities.length === 0) {
    if (unverifiedRulesEncountered.length > 0) {
      noPriorityScenario = 'C_unverified_rules';
    } else if (completeness !== 'high') {
      noPriorityScenario = 'B_partial_data';
    } else {
      noPriorityScenario = 'A_complete_verified';
    }
  }

  // --------------------------------------------------------------------------
  // CALCUL DE LA CONFIANCE DE L'ÉVALUATION
  // --------------------------------------------------------------------------
  let assessmentConfidence: 'high' | 'medium' | 'low' = 'high';
  if (completeness === 'low' || unverifiedRulesEncountered.length > 1) {
    assessmentConfidence = 'low';
  } else if (completeness === 'medium' || unverifiedRulesEncountered.length > 0) {
    assessmentConfidence = 'medium';
  }

  // --------------------------------------------------------------------------
  // QUESTIONS DE PRÉPARATION À L'ENTRETIEN (FONDÉES SUR LES FINDINGS RÉELS)
  // --------------------------------------------------------------------------
  const preparationQuestions: InterviewPreparationQuestion[] = [];
  const clarificationFindings = findings.filter(
    (f) => f.type === 'clarification_point' || f.type === 'evidence_gap' || f.type === 'factual_inconsistency'
  );

  for (const cf of clarificationFindings) {
    if (cf.id === 'FIND-LUMP-DEPOSIT-EXPLAINED' || cf.id === 'FIND-LUMP-DEPOSIT-UNEXPLAINED') {
      preparationQuestions.push({
        question: 'Quelle est la provenance exacte du versement récent constaté sur votre relevé bancaire ?',
        contextExplanation:
          'L’officier instructeur cherche à s’assurer que les sommes créditées correspondent à une opération économique légitime et ne résultent pas d’un emprunt d’artifice.',
        factualGuidance:
          'Répondez en citant la cause matérielle réelle (ex. vente de bien, indemnité professionnelle, soutien d’un proche) et présentez immédiatement la pièce justificative préparée.',
        relatedFindingId: cf.id,
      });
    } else if (cf.id === 'FIND-PURPOSE-LONG-STAY-SALARIE') {
      preparationQuestions.push({
        question: 'Comment votre absence professionnelle de plus de trois semaines a-t-elle été autorisée par votre entreprise ?',
        contextExplanation:
          'Le consulat souhaite vérifier que votre contrat de travail demeure actif et que votre employeur attend formellement votre retour à la date convenue.',
        factualGuidance:
          'Remettez l’attestation de mise en congé signée de votre direction précisant le cumul de congés payés ou l’autorisation exceptionnelle d’absence.',
        relatedFindingId: cf.id,
      });
    } else if (cf.id === 'FIND-PREVIOUS-REFUSAL-EXPLAINED') {
      preparationQuestions.push({
        question: 'Quels éléments nouveaux apportez-vous aujourd’hui par rapport à votre précédente demande de visa ?',
        contextExplanation:
          'L’autorité consulaire compare la nouvelle demande avec l’historique enregistré dans le système pour vérifier si le motif initial a trouvé réponse.',
        factualGuidance:
          'Indiquez avec calme et précision les faits ou documents qui ont évolué depuis cette décision sans polémiquer sur la décision antérieure.',
        relatedFindingId: cf.id,
      });
    } else if (cf.id === 'FIND-TERRITORIAL-FILING-THIRD-COUNTRY') {
      preparationQuestions.push({
        question: 'Pour quelle raison effectuez-vous votre demande dans ce pays plutôt que dans votre pays de citoyenneté ?',
        contextExplanation:
          'Le consulat doit établir qu’il est territorialement compétent pour recevoir votre demande.',
        factualGuidance:
          'Exposez votre statut de résidence légale habituelle dans le pays de dépôt et présentez votre titre de séjour local en cours de validité.',
        relatedFindingId: cf.id,
      });
    }
  }

  // --------------------------------------------------------------------------
  // SYNTHÈSE DE POSTURE GLOBALE (LANGAGE FACTUEL ET SANS BLUFF)
  // --------------------------------------------------------------------------
  const hasBlocker = blockers.length > 0;
  let readinessHeadline = '';
  let narrativeOverview = '';

  if (hasBlocker) {
    readinessHeadline = 'Action requise : Condition réglementaire objective à régulariser avant le dépôt';
    narrativeOverview =
      'L’examen des éléments déclarés met en évidence un point de non-conformité avec les règles officielles applicables. Il est impératif de corriger cet élément avant toute démarche consulaire définitive.';
  } else if (topPriorities.length > 0) {
    readinessHeadline = `Dossier structuré • ${topPriorities.length} point${topPriorities.length > 1 ? 's' : ''} d’attention à clarifier`;
    narrativeOverview =
      'Aucune non-conformité réglementaire bloquante n’a été identifiée. Les points répertoriés ci-dessous méritent toutefois d’être documentés avec rigueur afin de prévenir toute interrogation du service des visas.';
  } else {
    readinessHeadline = 'Dossier méthodologiquement cohérent au regard des éléments disponibles';
    if (noPriorityScenario === 'A_complete_verified') {
      narrativeOverview =
        'Aucune action corrective majeure n’a été identifiée dans les éléments évalués au regard des règles officielles vérifiées.';
    } else if (noPriorityScenario === 'B_partial_data') {
      narrativeOverview =
        'Aucune action corrective majeure n’a été identifiée sur les éléments déclarés, mais certaines dimensions restent à préciser pour une évaluation complète.';
    } else {
      narrativeOverview =
        'Aucune non-conformité n’a été identifiée sur les éléments vérifiables. Certaines exigences officielles restent toutefois à confirmer auprès des sources consulaires compétentes.';
    }
  }

  const disclaimer =
    'Mention Déontologique : VisaFlow est un outil logiciel indépendant d’aide à la préparation méthodologique des demandes de visa. VisaFlow n’est affilié à aucun consulat, ambassade ou organisme gouvernemental. La présente analyse est fondée exclusivement sur les informations déclarées par l’utilisateur et sur les règles officielles disponibles au moment de la consultation. Elle ne constitue ni un conseil juridique formel, ni une garantie ou prédiction d’octroi ou de refus de visa, la décision finale relevant de la compétence exclusive de l’autorité consulaire instructrice.';

  const assessment: PersonalizedConsularAssessment = {
    dossierId,
    meta: {
      dataCompleteness: completeness,
      assessmentConfidence,
      missingContextualInformation: missingFields,
      unverifiedRulesEncountered,
      evaluatedAt: new Date().toISOString(),
    },
    summaryAssessment: {
      readinessHeadline,
      narrativeOverview,
      noPriorityScenario,
      hasBlockingIssue: hasBlocker,
    },
    pillars: {
      legal_admissibility: pillar1,
      financial_sufficiency: pillar2,
      financial_provenance: pillar3,
      purpose_and_logistics: pillar4,
      ties_and_anchors: pillar5,
    },
    topPriorities,
    preparationQuestions,
    disclaimer,
  };

  return assessment;
}
