export type VisaReasonType =
  | 'etudes'
  | 'tourisme_visite'
  | 'affaires_mission'
  | 'soins_medicaux'
  | 'travail_stage'
  | '';

export type DestinationType =
  | 'france'
  | 'canada'
  | 'france_etudes'
  | 'france_visite'
  | 'canada_etudes'
  | 'canada_visiteur'
  | 'turquie'
  | 'dubai'
  | 'maroc'
  | 'autre'
  | '';

export type ProfessionalStatus =
  | 'etudiant'
  | 'salarie'
  | 'entrepreneur'
  | 'fonctionnaire'
  | 'sans_emploi_formel';

export type FundingSource =
  | 'autofinancement'
  | 'garant_local'
  | 'garant_etranger'
  | 'bourse_officielle';

export type AccommodationType =
  | 'attestation_accueil'
  | 'hotel_confirme'
  | 'residence_etudiante'
  | 'non_justifie';

export interface CountryProfile {
  id: string;
  name: string;
  flag: string;
  capital: string;
  currencyCode: string;
  currencyName: string;
  biometricCenters: {
    france: string[];
    canada: string[];
  };
  moroccoAgreement: {
    status: 'dispense_aevm' | 'dispense_totale' | 'evisa_requis' | 'aevm_requis' | 'visa_consulaire';
    label: string;
    details: string;
  };
}

export interface UserAnswers {
  // Etape 1 : Raison du séjour (motif)
  visaReason: VisaReasonType;
  
  // Etape 2 : Pays d'origine (Demandeur) & Lieu de dépôt
  countryOfOrigin: string; // ex: Mali, Sénégal, Côte d'Ivoire, Bénin, etc.
  filingCountry?: string; // Si dépôt depuis un autre pays de résidence
  isFilingFromSameCountry?: boolean;
  
  // Etape 3 : Destination & type de visa
  destination: DestinationType;
  specificDestination?: string; // Nom exact si 'autre' (ex: États-Unis, Allemagne...)
  travelDurationDays: number;
  
  // Etape 4 : Situation socio-professionnelle
  status: ProfessionalStatus;
  highestDegree?: string;
  fieldOfStudy?: string;
  academicGrade?: string;
  targetMajorAbroad?: string;
  jobTitle?: string;
  monthlyIncomeFcfa?: number;
  hasRccmNif?: boolean;
  yearsOfExperience?: number;
  
  // Etape 5 : Financement & Solvabilité
  fundingSource: FundingSource;
  availableBudgetFcfa: number;
  hasAviBlockedAccount?: boolean;
  guarantorRelation?: string;
  guarantorMonthlyIncomeFcfa?: number;
  guarantorHasTaxNotices?: boolean;
  hasScholarshipCertificate?: boolean;
  
  // Etape 6 : Consular Sanity Filter
  hasRecentLumpDeposit: boolean; // Dépôt massif soudain?
  lumpDepositChoice?: 'non_flux_reguliers' | 'oui_justifie' | 'oui_non_justifie' | '';
  lumpDepositExplanation?: string;
  tiesType: 'contrat_cdi' | 'biens_immobiliers' | 'famille_enfants' | 'etudes_en_cours' | 'faibles_attaches';
  tiesDescription?: string;
  accommodationType: AccommodationType;
  hasPassport6MonthsValid: boolean;
  hasPreviousRefusal: boolean;
  previousRefusalReason?: string;

  // Extension réglementaire V2.3.0 (Priorités P1)
  declaredFirstYearTuitionCad?: number;
  hasProvincialAttestationLetter?: boolean;
  hasTravelInsurance?: boolean;
  travelInsuranceCoverageEur?: number;
  
  // Détails d'identité & personnalisation
  fullName?: string;
  birthDate?: string;
  passportNumber?: string;
  guarantorFullName?: string;
  customAiNotes?: string;
}

export interface ConsularFeedback {
  type: 'positive' | 'warning' | 'critical';
  title: string;
  message: string;
  officialRule?: string;
  actionRequired?: string;
}

export interface QuestionOption {
  id: string;
  label: string;
  subtitle?: string;
  iconName?: string;
  badge?: string;
  feedback: ConsularFeedback;
  nextOverrides?: Record<string, unknown>;
}

export interface FlowQuestion {
  id: string;
  stepNumber: number;
  totalSteps: number;
  stepTitle: string;
  categoryTitle: string;
  question: string;
  helperText?: string;
  options: QuestionOption[];
  allowFreeInput?: boolean;
  freeInputPlaceholder?: string;
  inputFieldKey?: keyof UserAnswers;
  isNumericInput?: boolean;
}

export interface OfficialConsularInfo {
  destinationName: string;
  flag: string;
  visaFeeEur?: number;
  visaFeeCad?: number;
  visaFeeUsd?: number;
  visaFeeFcfa: number;
  officialSourcePortal: string;
  officialPortalUrl: string;
  biometricProviders: string[];
  officialRules: string[];
  antiScamAlerts: string[];
  financialThresholdsSummary: string;
}
