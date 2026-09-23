import { UserAnswers } from '../types';
import { getStayDurationCap } from './stayDurationRules';

export interface ValidationError {
  stepIndex: number; // 0-indexed step in FLOW_QUESTIONS (or 7 for final step)
  stepNumber: number; // 1-indexed human display number (1 to 8)
  stepTitle: string;
  fieldId: string;
  fieldName: string;
  message: string;
  actionAdvice: string;
  isFatal: boolean;
}

export interface DossierValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  errorCount: number;
  completedStepCount: number;
  totalRequiredSteps: number;
}

/**
 * Validates whether all mandatory fields across all questionnaire steps
 * and the final applicant details step are complete, truthful, and legally valid.
 */
export function validateDossierBeforeGeneration(
  answers: UserAnswers,
  applicantDetails?: {
    fullName?: string;
    passportNumber?: string;
    guarantorFullName?: string;
    travelDurationDays?: number;
    customAiNotes?: string;
  }
): DossierValidationResult {
  const errors: ValidationError[] = [];

  // Merge applicantDetails into effective answers for evaluation
  const effectiveFullName = (
    applicantDetails?.fullName !== undefined ? applicantDetails.fullName : answers.fullName || ''
  ).trim();

  const effectivePassport = (
    applicantDetails?.passportNumber !== undefined
      ? applicantDetails.passportNumber
      : answers.passportNumber || ''
  ).trim();

  const effectiveGuarantor = (
    applicantDetails?.guarantorFullName !== undefined
      ? applicantDetails.guarantorFullName
      : answers.guarantorFullName || ''
  ).trim();

  const effectiveDuration =
    applicantDetails?.travelDurationDays !== undefined
      ? Number(applicantDetails.travelDurationDays)
      : Number(answers.travelDurationDays) || 0;

  // --- STEP 1: Motif du séjour (visaReason) ---
  if (!answers.visaReason || answers.visaReason.trim().length === 0) {
    errors.push({
      stepIndex: 0,
      stepNumber: 1,
      stepTitle: 'Motif du Séjour & Finalité',
      fieldId: 'visaReason',
      fieldName: 'Motif du visa',
      message: 'Le motif principal de votre séjour n’a pas été sélectionné.',
      actionAdvice: 'Sélectionnez la finalité de votre voyage (Études, Visite, Affaires, Soins ou Travail/Stage).',
      isFatal: true,
    });
  }

  // --- STEP 2: Nationalité & Pays de dépôt (countryOfOrigin) ---
  if (!answers.countryOfOrigin || answers.countryOfOrigin.trim().length === 0) {
    errors.push({
      stepIndex: 1,
      stepNumber: 2,
      stepTitle: 'Nationalité & Résidence',
      fieldId: 'countryOfOrigin',
      fieldName: 'Nationalité du passeport',
      message: 'Le pays de citoyenneté / nationalité n’est pas renseigné.',
      actionAdvice: 'Choisissez le pays émetteur de votre passeport.',
      isFatal: true,
    });
  } else if (answers.isFilingFromSameCountry === false && (!answers.filingCountry || answers.filingCountry.trim().length < 2)) {
    errors.push({
      stepIndex: 1,
      stepNumber: 2,
      stepTitle: 'Nationalité & Résidence',
      fieldId: 'filingCountry',
      fieldName: 'Pays de résidence / Dépôt effectif',
      message: 'Vous avez indiqué déposer depuis un pays tiers mais n’avez pas précisé le pays de résidence.',
      actionAdvice: 'Indiquez dans quel pays vous résidez pour effectuer le dépôt biométrique.',
      isFatal: true,
    });
  }

  // --- STEP 3: Destination (destination & specificDestination) ---
  if (!answers.destination || answers.destination.trim().length === 0) {
    errors.push({
      stepIndex: 2,
      stepNumber: 3,
      stepTitle: 'Pays de Destination',
      fieldId: 'destination',
      fieldName: 'Destination consulaire',
      message: 'Le pays de destination n’a pas été sélectionné.',
      actionAdvice: 'Choisissez la destination ciblée (France, Canada, Maroc, Turquie, Dubaï ou Autre).',
      isFatal: true,
    });
  } else if (answers.destination === 'autre' && (!answers.specificDestination || answers.specificDestination.trim().length < 2)) {
    errors.push({
      stepIndex: 2,
      stepNumber: 3,
      stepTitle: 'Pays de Destination',
      fieldId: 'specificDestination',
      fieldName: 'Pays international spécifique',
      message: 'Vous avez sélectionné une destination mondiale sans choisir le pays spécifique.',
      actionAdvice: 'Ouvrez le catalogue mondial et sélectionnez votre pays cible.',
      isFatal: true,
    });
  }

  // --- STEP 4: Situation socio-professionnelle (status) ---
  if (!answers.status || answers.status.trim().length === 0) {
    errors.push({
      stepIndex: 3,
      stepNumber: 4,
      stepTitle: 'Situation & Activité',
      fieldId: 'status',
      fieldName: 'Statut socio-professionnel',
      message: 'Votre situation professionnelle ou académique actuelle n’est pas sélectionnée.',
      actionAdvice: 'Indiquez votre statut (Salarié, Étudiant, Entrepreneur, Fonctionnaire ou Sans emploi formel).',
      isFatal: true,
    });
  }

  // --- STEP 5: Prise en charge financière (fundingSource) ---
  if (!answers.fundingSource || answers.fundingSource.trim().length === 0) {
    errors.push({
      stepIndex: 4,
      stepNumber: 5,
      stepTitle: 'Prise en Charge Financière',
      fieldId: 'fundingSource',
      fieldName: 'Source de financement',
      message: 'Le mode de financement de votre séjour n’a pas été sélectionné.',
      actionAdvice: 'Précisez si vos dépenses sont assurées par autofinancement, garant local, garant à l’étranger ou bourse.',
      isFatal: true,
    });
  }

  // --- STEP 6: Santé bancaire / Dépôt récent (hasRecentLumpDeposit) ---
  const isLumpDepositAnswered =
    (answers.lumpDepositChoice !== undefined && answers.lumpDepositChoice !== '') ||
    (answers.hasRecentLumpDeposit !== undefined && answers.hasRecentLumpDeposit !== null);

  if (!isLumpDepositAnswered) {
    errors.push({
      stepIndex: 5,
      stepNumber: 6,
      stepTitle: 'Santé du Compte Bancaire',
      fieldId: 'hasRecentLumpDeposit',
      fieldName: 'Historique des flux bancaires',
      message: 'L’état de vos relevés bancaires récents n’a pas été qualifié.',
      actionAdvice: 'Indiquez si vous présentez des flux réguliers ou un dépôt récent traçable.',
      isFatal: true,
    });
  }

  // --- STEP 7: Attaches au pays d’origine (tiesType) ---
  if (!answers.tiesType || answers.tiesType.trim().length === 0) {
    errors.push({
      stepIndex: 6,
      stepNumber: 7,
      stepTitle: 'Attaches au Pays d’Origine',
      fieldId: 'tiesType',
      fieldName: 'Preuve d’ancrage socio-économique',
      message: 'Votre garantie de retour (attache principale) n’a pas été sélectionnée.',
      actionAdvice: 'Sélectionnez votre attache probante (Contrat CDI, Biens fonciers, Famille directe ou Études).',
      isFatal: true,
    });
  }

  // --- STEP 8: ÉTAPE FINALE — Nom complet du demandeur ---
  if (effectiveFullName.length < 3) {
    errors.push({
      stepIndex: 7,
      stepNumber: 8,
      stepTitle: 'Informations du Dossier',
      fieldId: 'fullName',
      fieldName: 'Nom et prénom(s) du demandeur',
      message: 'Le nom complet du demandeur est obligatoire (minimum 3 caractères).',
      actionAdvice: 'Indiquez vos nom et prénom(s) exacts figurant sur votre passeport.',
      isFatal: true,
    });
  } else if (/^(test|xxx|nom|prenom|aucun|none|aaa|bbb)$/i.test(effectiveFullName)) {
    errors.push({
      stepIndex: 7,
      stepNumber: 8,
      stepTitle: 'Informations du Dossier',
      fieldId: 'fullName',
      fieldName: 'Nom et prénom(s) du demandeur',
      message: 'Le nom renseigné semble être un texte de remplissage provisoire.',
      actionAdvice: 'Renseignez une identité officielle complète (Ex. Amadou DIARRA).',
      isFatal: true,
    });
  }

  // --- STEP 8: ÉTAPE FINALE — Numéro de passeport ---
  const cleanPassport = effectivePassport.replace(/[\s\-_]/g, '');
  if (cleanPassport.length < 5) {
    errors.push({
      stepIndex: 7,
      stepNumber: 8,
      stepTitle: 'Informations du Dossier',
      fieldId: 'passportNumber',
      fieldName: 'Numéro de passeport',
      message: 'Le numéro de passeport officiel est obligatoire (minimum 5 caractères alphanumériques).',
      actionAdvice: 'Renseignez le numéro figurant sur la page d’identification de votre passeport.',
      isFatal: true,
    });
  } else if (/^(00000|11111|12345|xxxxx|ppppp)$/i.test(cleanPassport)) {
    errors.push({
      stepIndex: 7,
      stepNumber: 8,
      stepTitle: 'Informations du Dossier',
      fieldId: 'passportNumber',
      fieldName: 'Numéro de passeport',
      message: 'Le numéro de passeport renseigné est un numéro de test factice.',
      actionAdvice: 'Indiquez le véritable numéro de votre passeport de voyage (Ex. 24ML00000).',
      isFatal: true,
    });
  }

  // --- STEP 8: ÉTAPE FINALE — Garant financier ---
  const isAutofinanced = answers.fundingSource === 'autofinancement';
  if (!isAutofinanced && effectiveGuarantor.length < 3) {
    errors.push({
      stepIndex: 7,
      stepNumber: 8,
      stepTitle: 'Informations du Dossier',
      fieldId: 'guarantorFullName',
      fieldName: 'Nom du garant financier',
      message: 'Le nom du garant financier est obligatoire lorsque le séjour n’est pas autofinancé.',
      actionAdvice: 'Indiquez l’identité de la personne ou de l’organisme qui finance vos frais (ou écrivez votre nom si vous financez vous-même).',
      isFatal: true,
    });
  }

  // --- STEP 8: ÉTAPE FINALE — Durée du séjour & Plafond réglementaire ---
  const stayCap = getStayDurationCap(answers);
  if (!effectiveDuration || effectiveDuration <= 0) {
    errors.push({
      stepIndex: 7,
      stepNumber: 8,
      stepTitle: 'Informations du Dossier',
      fieldId: 'travelDurationDays',
      fieldName: 'Durée du séjour',
      message: 'La durée de séjour prévisionnelle doit être d’au moins 1 jour.',
      actionAdvice: 'Ajustez le curseur de durée de séjour.',
      isFatal: true,
    });
  } else if (effectiveDuration > stayCap.maxDays) {
    errors.push({
      stepIndex: 7,
      stepNumber: 8,
      stepTitle: 'Informations du Dossier',
      fieldId: 'travelDurationDays',
      fieldName: 'Durée du séjour',
      message: `La durée indiquée (${effectiveDuration} jours) dépasse le plafond légal de ${stayCap.maxDays} jours pour cette catégorie.`,
      actionAdvice: `Ajustez le curseur à ${stayCap.maxDays} jours maximum conformément à la réglementation consulaire (${stayCap.legalBasis}).`,
      isFatal: true,
    });
  }

  const totalRequiredSteps = 8;
  const errorSteps = new Set(errors.map((e) => e.stepNumber));
  const completedStepCount = Math.max(0, totalRequiredSteps - errorSteps.size);

  return {
    isValid: errors.length === 0,
    errors,
    errorCount: errors.length,
    completedStepCount,
    totalRequiredSteps,
  };
}
