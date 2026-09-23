import { evaluateConsularProfile } from '../utils/consularAssessmentEngine';
import { resolveOfficialRule, OFFICIAL_CONSULAR_RULES } from '../data/officialConsularRules';
import { UserAnswers } from '../types';
import { AssessmentFinding, ConsularPillarId } from '../types/assessment';
import { generateAdditionalAdversarialScenarios } from './additionalScenarios';

export interface AdversarialScenario {
  id: number;
  category: string;
  name: string;
  payload: any;
  expectedOutcome: string;
}

export interface ScenarioResult {
  scenarioId: number;
  category: string;
  name: string;
  payloadSummary: string;
  rulesConsumed: string[];
  findingsCount: number;
  blockersCount: number;
  pillarStatuses: Record<ConsularPillarId, string>;
  topPrioritiesCount: number;
  dataCompleteness: string;
  assessmentConfidence: string;
  expectedOutcome: string;
  actualOutcome: string;
  passed: boolean;
  failureReasons: string[];
}

// Systematic builder for 100 diverse, realistic adversarial profiles
export function generate100Scenarios(): AdversarialScenario[] {
  const list: AdversarialScenario[] = [];
  let id = 1;

  // -------------------------------------------------------------
  // Group 1: France Tourism (Scenarios 1-15)
  // -------------------------------------------------------------
  // 1. Hotel, 15 days, compliant budget
  list.push({
    id: id++,
    category: 'France Tourism',
    name: 'FR-Tour-Hotel-CompliantBudget',
    payload: {
      destination: 'France',
      visaReason: 'tourisme_visite',
      countryOfOrigin: 'Sénégal',
      status: 'salarie_prive',
      accommodationType: 'hotel',
      travelDurationDays: 15,
      fundingSource: 'autofinancement',
      availableBudgetFcfa: 1500000,
      hasPassport6MonthsValid: true,
      hasPreviousRefusal: false,
    },
    expectedOutcome: 'No blockers, compliant financial sufficiency, high completeness',
  });

  // 2. Hotel, 15 days, missing budget (Mandatory Test A)
  list.push({
    id: id++,
    category: 'France Tourism',
    name: 'FR-Tour-Hotel-MissingBudget',
    payload: {
      destination: 'France',
      visaReason: 'tourisme_visite',
      countryOfOrigin: 'Sénégal',
      status: 'salarie_prive',
      accommodationType: 'hotel',
      travelDurationDays: 15,
      fundingSource: 'autofinancement',
      availableBudgetFcfa: undefined,
      hasPassport6MonthsValid: true,
      hasPreviousRefusal: false,
    },
    expectedOutcome: 'NO blocker, insufficient_information finding, completeness penalized',
  });

  // 3. Hotel, 15 days, null budget (Mandatory Test A)
  list.push({
    id: id++,
    category: 'France Tourism',
    name: 'FR-Tour-Hotel-NullBudget',
    payload: {
      destination: 'France',
      visaReason: 'tourisme_visite',
      countryOfOrigin: 'Sénégal',
      status: 'salarie_prive',
      accommodationType: 'hotel',
      travelDurationDays: 15,
      fundingSource: 'autofinancement',
      availableBudgetFcfa: null as any,
      hasPassport6MonthsValid: true,
      hasPreviousRefusal: false,
    },
    expectedOutcome: 'NO blocker, insufficient_information finding, completeness penalized',
  });

  // 4. Hotel, 15 days, deficit budget (30,000 FCFA vs required ~640,000 FCFA)
  list.push({
    id: id++,
    category: 'France Tourism',
    name: 'FR-Tour-Hotel-DeficitBudget',
    payload: {
      destination: 'France',
      visaReason: 'tourisme_visite',
      countryOfOrigin: 'Sénégal',
      status: 'salarie_prive',
      accommodationType: 'hotel',
      travelDurationDays: 15,
      fundingSource: 'autofinancement',
      availableBudgetFcfa: 30000,
      hasPassport6MonthsValid: true,
      hasPreviousRefusal: false,
    },
    expectedOutcome: 'Direct blocker generated for budget insufficiency',
  });

  // 5. Attestation d’accueil (32.5 EUR/day), 20 days, compliant budget
  list.push({
    id: id++,
    category: 'France Tourism',
    name: 'FR-Tour-AttestationAccueil-Compliant',
    payload: {
      destination: 'France',
      visaReason: 'tourisme_visite',
      countryOfOrigin: 'Côte d’Ivoire',
      status: 'salarie_prive',
      accommodationType: 'attestation_accueil',
      travelDurationDays: 20,
      fundingSource: 'autofinancement',
      availableBudgetFcfa: 600000,
      hasPassport6MonthsValid: true,
      hasPreviousRefusal: false,
    },
    expectedOutcome: 'Compliant financial sufficiency using attestation d accueil daily rate (32.5 EUR)',
  });

  // 6. Attestation d’accueil, 20 days, deficit budget (100,000 FCFA vs required ~426,000 FCFA)
  list.push({
    id: id++,
    category: 'France Tourism',
    name: 'FR-Tour-AttestationAccueil-Deficit',
    payload: {
      destination: 'France',
      visaReason: 'tourisme_visite',
      countryOfOrigin: 'Côte d’Ivoire',
      status: 'salarie_prive',
      accommodationType: 'attestation_accueil',
      travelDurationDays: 20,
      fundingSource: 'autofinancement',
      availableBudgetFcfa: 100000,
      hasPassport6MonthsValid: true,
      hasPreviousRefusal: false,
    },
    expectedOutcome: 'Direct blocker generated against attestation accueil threshold',
  });

  // 7. Non-justifié (120 EUR/day), 10 days, compliant budget (850,000 FCFA > ~787,000 FCFA)
  list.push({
    id: id++,
    category: 'France Tourism',
    name: 'FR-Tour-NoLodgingProof-Compliant',
    payload: {
      destination: 'France',
      visaReason: 'tourisme_visite',
      countryOfOrigin: 'Cameroun',
      status: 'salarie_prive',
      accommodationType: 'non_justifie',
      travelDurationDays: 10,
      fundingSource: 'autofinancement',
      availableBudgetFcfa: 850000,
      hasPassport6MonthsValid: true,
      hasPreviousRefusal: false,
    },
    expectedOutcome: 'Compliant against 120 EUR/day threshold without lodging proof',
  });

  // 8. Non-justifié, 10 days, deficit budget (500,000 FCFA vs required ~787,000 FCFA)
  list.push({
    id: id++,
    category: 'France Tourism',
    name: 'FR-Tour-NoLodgingProof-Deficit',
    payload: {
      destination: 'France',
      visaReason: 'tourisme_visite',
      countryOfOrigin: 'Cameroun',
      status: 'salarie_prive',
      accommodationType: 'non_justifie',
      travelDurationDays: 10,
      fundingSource: 'autofinancement',
      availableBudgetFcfa: 500000,
      hasPassport6MonthsValid: true,
      hasPreviousRefusal: false,
    },
    expectedOutcome: 'Direct blocker generated against 120 EUR/day unverified lodging threshold',
  });

  // 9. Passport validity < 6 months, otherwise compliant (Mandatory Test B)
  list.push({
    id: id++,
    category: 'France Tourism',
    name: 'FR-Tour-PassportUnder6Months',
    payload: {
      destination: 'France',
      visaReason: 'tourisme_visite',
      countryOfOrigin: 'Sénégal',
      status: 'salarie_prive',
      accommodationType: 'hotel',
      travelDurationDays: 15,
      fundingSource: 'autofinancement',
      availableBudgetFcfa: 1500000,
      hasPassport6MonthsValid: false,
      hasPreviousRefusal: false,
    },
    expectedOutcome: 'NO blocker, clarification_point only, distinct from legal non-compliance',
  });

  // 10. Stay duration exceeds Schengen 90 days (100 days requested)
  list.push({
    id: id++,
    category: 'France Tourism',
    name: 'FR-Tour-StayDurationExceeded',
    payload: {
      destination: 'France',
      visaReason: 'tourisme_visite',
      countryOfOrigin: 'Sénégal',
      status: 'salarie_prive',
      accommodationType: 'hotel',
      travelDurationDays: 100,
      fundingSource: 'autofinancement',
      availableBudgetFcfa: 5000000,
      hasPassport6MonthsValid: true,
      hasPreviousRefusal: false,
    },
    expectedOutcome: 'Direct blocker for stay duration exceeding short-stay limit of 90 days',
  });

  // 11. Filing from third country with declared residency
  list.push({
    id: id++,
    category: 'France Tourism',
    name: 'FR-Tour-ThirdCountryResidency-Declared',
    payload: {
      destination: 'France',
      visaReason: 'tourisme_visite',
      countryOfOrigin: 'Mali',
      isFilingFromSameCountry: false,
      filingCountry: 'Sénégal',
      status: 'salarie_prive',
      accommodationType: 'hotel',
      travelDurationDays: 15,
      fundingSource: 'autofinancement',
      availableBudgetFcfa: 1500000,
      hasPassport6MonthsValid: true,
      hasPreviousRefusal: false,
    },
    expectedOutcome: 'No blocker, clarification_point for territorial consular jurisdiction',
  });

  // 12. Filing from third country with missing residence country
  list.push({
    id: id++,
    category: 'France Tourism',
    name: 'FR-Tour-ThirdCountryResidency-Missing',
    payload: {
      destination: 'France',
      visaReason: 'tourisme_visite',
      countryOfOrigin: 'Mali',
      isFilingFromSameCountry: false,
      filingCountry: '',
      status: 'salarie_prive',
      accommodationType: 'hotel',
      travelDurationDays: 15,
      fundingSource: 'autofinancement',
      availableBudgetFcfa: 1500000,
      hasPassport6MonthsValid: true,
      hasPreviousRefusal: false,
    },
    expectedOutcome: 'No blocker, insufficient_information for missing filing country',
  });

  // 13. France Tourism, Guarantor local without tax notices
  list.push({
    id: id++,
    category: 'France Tourism',
    name: 'FR-Tour-LocalGuarantor-NoTaxNotice',
    payload: {
      destination: 'France',
      visaReason: 'tourisme_visite',
      countryOfOrigin: 'Sénégal',
      status: 'salarie_prive',
      accommodationType: 'hotel',
      travelDurationDays: 15,
      fundingSource: 'garant_local',
      guarantorHasTaxNotices: false,
      hasPassport6MonthsValid: true,
      hasPreviousRefusal: false,
    },
    expectedOutcome: 'No blocker, evidence_gap for guarantor tax notices',
  });

  // 14. France Tourism, Guarantor abroad with full documentation
  list.push({
    id: id++,
    category: 'France Tourism',
    name: 'FR-Tour-ForeignGuarantor-Complete',
    payload: {
      destination: 'France',
      visaReason: 'tourisme_visite',
      countryOfOrigin: 'Sénégal',
      status: 'salarie_prive',
      accommodationType: 'hotel',
      travelDurationDays: 15,
      fundingSource: 'garant_etranger',
      guarantorHasTaxNotices: true,
      hasPassport6MonthsValid: true,
      hasPreviousRefusal: false,
    },
    expectedOutcome: 'No blocker, favorable evidence or balanced scrutiny for guarantor abroad',
  });

  // 15. France Tourism, Official scholarship with certificate
  list.push({
    id: id++,
    category: 'France Tourism',
    name: 'FR-Tour-OfficialScholarship',
    payload: {
      destination: 'France',
      visaReason: 'tourisme_visite',
      countryOfOrigin: 'Bénin',
      status: 'fonctionnaire',
      accommodationType: 'hotel',
      travelDurationDays: 20,
      fundingSource: 'bourse_officielle',
      hasScholarshipCertificate: true,
      hasPassport6MonthsValid: true,
      hasPreviousRefusal: false,
    },
    expectedOutcome: 'No blocker, favorable institutional scholarship evidence',
  });

  // -------------------------------------------------------------
  // Group 2: France Studies (Scenarios 16-30)
  // -------------------------------------------------------------
  // 16. France Student, AVI blocked account present
  list.push({
    id: id++,
    category: 'France Studies',
    name: 'FR-Stud-AVI-Present',
    payload: {
      destination: 'France',
      visaReason: 'etudes',
      countryOfOrigin: 'Sénégal',
      status: 'etudiant',
      targetMajorAbroad: 'Master Informatique',
      accommodationType: 'campus',
      travelDurationDays: 365,
      fundingSource: 'autofinancement',
      hasAviBlockedAccount: true,
      hasPassport6MonthsValid: true,
      hasPreviousRefusal: false,
    },
    expectedOutcome: 'Favorable evidence for AVI sanctuarisation, no blocker',
  });

  // 17. France Student, autofinancement with missing budget
  list.push({
    id: id++,
    category: 'France Studies',
    name: 'FR-Stud-MissingBudget',
    payload: {
      destination: 'France',
      visaReason: 'etudes',
      countryOfOrigin: 'Côte d’Ivoire',
      status: 'etudiant',
      targetMajorAbroad: 'Licence Économie',
      accommodationType: 'campus',
      travelDurationDays: 365,
      fundingSource: 'autofinancement',
      hasAviBlockedAccount: false,
      availableBudgetFcfa: undefined,
      hasPassport6MonthsValid: true,
      hasPreviousRefusal: false,
    },
    expectedOutcome: 'NO blocker, insufficient_information finding, completeness penalized',
  });

  // 18. France Student, autofinancement below CESEDA R422-2 threshold (2,000,000 FCFA vs required ~4,841,000 FCFA)
  list.push({
    id: id++,
    category: 'France Studies',
    name: 'FR-Stud-BudgetDeficit',
    payload: {
      destination: 'France',
      visaReason: 'etudes',
      countryOfOrigin: 'Côte d’Ivoire',
      status: 'etudiant',
      targetMajorAbroad: 'Licence Économie',
      accommodationType: 'campus',
      travelDurationDays: 365,
      fundingSource: 'autofinancement',
      hasAviBlockedAccount: false,
      availableBudgetFcfa: 2000000,
      hasPassport6MonthsValid: true,
      hasPreviousRefusal: false,
    },
    expectedOutcome: 'Direct blocker for student resources below 615 EUR/month legal threshold',
  });

  // 19. France Student, autofinancement compliant (6,000,000 FCFA > ~4,841,000 FCFA)
  list.push({
    id: id++,
    category: 'France Studies',
    name: 'FR-Stud-BudgetCompliant',
    payload: {
      destination: 'France',
      visaReason: 'etudes',
      countryOfOrigin: 'Côte d’Ivoire',
      status: 'etudiant',
      targetMajorAbroad: 'Licence Économie',
      accommodationType: 'campus',
      travelDurationDays: 365,
      fundingSource: 'autofinancement',
      hasAviBlockedAccount: false,
      availableBudgetFcfa: 6000000,
      hasPassport6MonthsValid: true,
      hasPreviousRefusal: false,
    },
    expectedOutcome: 'Compliant student financial coverage under CESEDA rule',
  });

  // 20. France Student, guarantor without tax notices
  list.push({
    id: id++,
    category: 'France Studies',
    name: 'FR-Stud-GuarantorNoTax',
    payload: {
      destination: 'France',
      visaReason: 'etudes',
      countryOfOrigin: 'Cameroun',
      status: 'etudiant',
      targetMajorAbroad: 'Master Biologie',
      accommodationType: 'campus',
      travelDurationDays: 365,
      fundingSource: 'garant_local',
      guarantorHasTaxNotices: false,
      hasPassport6MonthsValid: true,
      hasPreviousRefusal: false,
    },
    expectedOutcome: 'No blocker, evidence_gap for guarantor tax notices',
  });

  // 21. France Student, guarantor with full tax notices
  list.push({
    id: id++,
    category: 'France Studies',
    name: 'FR-Stud-GuarantorWithTax',
    payload: {
      destination: 'France',
      visaReason: 'etudes',
      countryOfOrigin: 'Cameroun',
      status: 'etudiant',
      targetMajorAbroad: 'Master Biologie',
      accommodationType: 'campus',
      travelDurationDays: 365,
      fundingSource: 'garant_local',
      guarantorHasTaxNotices: true,
      hasPassport6MonthsValid: true,
      hasPreviousRefusal: false,
    },
    expectedOutcome: 'No blocker, favorable evidence for documented guarantor',
  });

  // 22. France Student, official scholarship with certificate
  list.push({
    id: id++,
    category: 'France Studies',
    name: 'FR-Stud-ScholarshipWithCert',
    payload: {
      destination: 'France',
      visaReason: 'etudes',
      countryOfOrigin: 'Bénin',
      status: 'etudiant',
      targetMajorAbroad: 'Doctorat Mathématiques',
      accommodationType: 'campus',
      travelDurationDays: 365,
      fundingSource: 'bourse_officielle',
      hasScholarshipCertificate: true,
      hasPassport6MonthsValid: true,
      hasPreviousRefusal: false,
    },
    expectedOutcome: 'No blocker, favorable institutional scholarship evidence',
  });

  // 23. France Student, official scholarship without certificate
  list.push({
    id: id++,
    category: 'France Studies',
    name: 'FR-Stud-ScholarshipMissingCert',
    payload: {
      destination: 'France',
      visaReason: 'etudes',
      countryOfOrigin: 'Bénin',
      status: 'etudiant',
      targetMajorAbroad: 'Doctorat Mathématiques',
      accommodationType: 'campus',
      travelDurationDays: 365,
      fundingSource: 'bourse_officielle',
      hasScholarshipCertificate: false,
      hasPassport6MonthsValid: true,
      hasPreviousRefusal: false,
    },
    expectedOutcome: 'No blocker, evidence_gap for missing official scholarship grant letter',
  });

  // 24. France Student, missing target major
  list.push({
    id: id++,
    category: 'France Studies',
    name: 'FR-Stud-MissingMajor',
    payload: {
      destination: 'France',
      visaReason: 'etudes',
      countryOfOrigin: 'Sénégal',
      status: 'etudiant',
      targetMajorAbroad: '',
      accommodationType: 'campus',
      travelDurationDays: 365,
      fundingSource: 'autofinancement',
      hasAviBlockedAccount: true,
      hasPassport6MonthsValid: true,
      hasPreviousRefusal: false,
    },
    expectedOutcome: 'No blocker, insufficient_information for missing study program',
  });

  // 25. France Student, previous study visa refusal explained
  list.push({
    id: id++,
    category: 'France Studies',
    name: 'FR-Stud-RefusalExplained',
    payload: {
      destination: 'France',
      visaReason: 'etudes',
      countryOfOrigin: 'Sénégal',
      status: 'etudiant',
      targetMajorAbroad: 'Master Droit',
      accommodationType: 'campus',
      travelDurationDays: 365,
      fundingSource: 'autofinancement',
      hasAviBlockedAccount: true,
      hasPassport6MonthsValid: true,
      hasPreviousRefusal: true,
      previousRefusalReason: 'Motif 2 : manque de cohérence du parcours académique',
    },
    expectedOutcome: 'No blocker, clarification_point for explaining previous refusal remediation',
  });

  // 26. France Student, previous study visa refusal without reason (Mandatory Test D)
  list.push({
    id: id++,
    category: 'France Studies',
    name: 'FR-Stud-RefusalUnspecified',
    payload: {
      destination: 'France',
      visaReason: 'etudes',
      countryOfOrigin: 'Sénégal',
      status: 'etudiant',
      targetMajorAbroad: 'Master Droit',
      accommodationType: 'campus',
      travelDurationDays: 365,
      fundingSource: 'autofinancement',
      hasAviBlockedAccount: true,
      hasPassport6MonthsValid: true,
      hasPreviousRefusal: true,
      previousRefusalReason: undefined,
    },
    expectedOutcome: 'NO blocker, insufficient_information finding, completeness penalized',
  });

  // 27. France Student, lump deposit explained (family gift with notary act)
  list.push({
    id: id++,
    category: 'France Studies',
    name: 'FR-Stud-LumpDepositExplained',
    payload: {
      destination: 'France',
      visaReason: 'etudes',
      countryOfOrigin: 'Côte d’Ivoire',
      status: 'etudiant',
      targetMajorAbroad: 'Master Génie Civil',
      accommodationType: 'campus',
      travelDurationDays: 365,
      fundingSource: 'autofinancement',
      availableBudgetFcfa: 7000000,
      hasRecentLumpDeposit: true,
      lumpDepositExplanation: 'Donation familiale notariée des parents pour financer les études',
      hasPassport6MonthsValid: true,
      hasPreviousRefusal: false,
    },
    expectedOutcome: 'No blocker, clarification_point on lump deposit, no fraudulent accusation',
  });

  // 28. France Student, lump deposit unexplained
  list.push({
    id: id++,
    category: 'France Studies',
    name: 'FR-Stud-LumpDepositUnexplained',
    payload: {
      destination: 'France',
      visaReason: 'etudes',
      countryOfOrigin: 'Côte d’Ivoire',
      status: 'etudiant',
      targetMajorAbroad: 'Master Génie Civil',
      accommodationType: 'campus',
      travelDurationDays: 365,
      fundingSource: 'autofinancement',
      availableBudgetFcfa: 7000000,
      hasRecentLumpDeposit: true,
      lumpDepositExplanation: '',
      hasPassport6MonthsValid: true,
      hasPreviousRefusal: false,
    },
    expectedOutcome: 'No blocker, evidence_gap for unexplained recent deposit',
  });

  // 29. France Student, ties: admission certificate present
  list.push({
    id: id++,
    category: 'France Studies',
    name: 'FR-Stud-TiesAdmission',
    payload: {
      destination: 'France',
      visaReason: 'etudes',
      countryOfOrigin: 'Togo',
      status: 'etudiant',
      targetMajorAbroad: 'Licence Gestion',
      accommodationType: 'campus',
      travelDurationDays: 365,
      fundingSource: 'autofinancement',
      hasAviBlockedAccount: true,
      tiesType: 'etudes_en_cours',
      hasPassport6MonthsValid: true,
      hasPreviousRefusal: false,
    },
    expectedOutcome: 'No blocker, ties pillar coherent with student profile',
  });

  // 30. France Student, ties contradiction: status etudiant but tiesType 'contrat_cdi'
  list.push({
    id: id++,
    category: 'France Studies',
    name: 'FR-Stud-TiesContradiction',
    payload: {
      destination: 'France',
      visaReason: 'etudes',
      countryOfOrigin: 'Togo',
      status: 'sans_emploi_formel',
      targetMajorAbroad: 'Licence Gestion',
      accommodationType: 'campus',
      travelDurationDays: 365,
      fundingSource: 'autofinancement',
      availableBudgetFcfa: 5000000,
      tiesType: 'contrat_cdi',
      hasPassport6MonthsValid: true,
      hasPreviousRefusal: false,
    },
    expectedOutcome: 'factual_inconsistency finding between sans_emploi_formel and contrat_cdi',
  });

  // -------------------------------------------------------------
  // Group 3: Canada Studies (Scenarios 31-45)
  // -------------------------------------------------------------
  // 31. Canada Student, compliant budget (> 20,635 CAD ~ 9,182,575 FCFA) (Mandatory Test D)
  list.push({
    id: id++,
    category: 'Canada Studies',
    name: 'CA-Stud-CompliantBudget',
    payload: {
      destination: 'Canada',
      visaReason: 'etudes',
      countryOfOrigin: 'Sénégal',
      status: 'etudiant',
      targetMajorAbroad: 'Baccalauréat Génie Informatique',
      accommodationType: 'campus',
      travelDurationDays: 365,
      fundingSource: 'autofinancement',
      availableBudgetFcfa: 12000000,
      hasPassport6MonthsValid: true,
      hasPreviousRefusal: false,
    },
    expectedOutcome: 'Consumes RULE-CA-STUDENT-LICO-2024, compliant, ignores unverified 2026 rule',
  });

  // 32. Canada Student, missing budget (Mandatory Test A & D)
  list.push({
    id: id++,
    category: 'Canada Studies',
    name: 'CA-Stud-MissingBudget',
    payload: {
      destination: 'Canada',
      visaReason: 'etudes',
      countryOfOrigin: 'Sénégal',
      status: 'etudiant',
      targetMajorAbroad: 'Baccalauréat Génie Informatique',
      accommodationType: 'campus',
      travelDurationDays: 365,
      fundingSource: 'autofinancement',
      availableBudgetFcfa: undefined,
      hasPassport6MonthsValid: true,
      hasPreviousRefusal: false,
    },
    expectedOutcome: 'NO blocker, insufficient_information, unverified 2026 rule in meta only',
  });

  // 33. Canada Student, budget deficit (5,000,000 FCFA vs required ~9,182,575 FCFA)
  list.push({
    id: id++,
    category: 'Canada Studies',
    name: 'CA-Stud-BudgetDeficit',
    payload: {
      destination: 'Canada',
      visaReason: 'etudes',
      countryOfOrigin: 'Sénégal',
      status: 'etudiant',
      targetMajorAbroad: 'Baccalauréat Génie Informatique',
      accommodationType: 'campus',
      travelDurationDays: 365,
      fundingSource: 'autofinancement',
      availableBudgetFcfa: 5000000,
      hasPassport6MonthsValid: true,
      hasPreviousRefusal: false,
    },
    expectedOutcome: 'Direct blocker against RULE-CA-STUDENT-LICO-2024 threshold (20,635 CAD)',
  });

  // 34. Canada Student, Guarantor abroad without tax notices
  list.push({
    id: id++,
    category: 'Canada Studies',
    name: 'CA-Stud-GuarantorNoTax',
    payload: {
      destination: 'Canada',
      visaReason: 'etudes',
      countryOfOrigin: 'Côte d’Ivoire',
      status: 'etudiant',
      targetMajorAbroad: 'MBA Administration',
      accommodationType: 'campus',
      travelDurationDays: 365,
      fundingSource: 'garant_etranger',
      guarantorHasTaxNotices: false,
      hasPassport6MonthsValid: true,
      hasPreviousRefusal: false,
    },
    expectedOutcome: 'No blocker, evidence_gap for IRCC guarantor tax notices',
  });

  // 35. Canada Student, Guarantor abroad with full tax notices
  list.push({
    id: id++,
    category: 'Canada Studies',
    name: 'CA-Stud-GuarantorWithTax',
    payload: {
      destination: 'Canada',
      visaReason: 'etudes',
      countryOfOrigin: 'Côte d’Ivoire',
      status: 'etudiant',
      targetMajorAbroad: 'MBA Administration',
      accommodationType: 'campus',
      travelDurationDays: 365,
      fundingSource: 'garant_etranger',
      guarantorHasTaxNotices: true,
      hasPassport6MonthsValid: true,
      hasPreviousRefusal: false,
    },
    expectedOutcome: 'No blocker, balanced scrutiny, verified rule applied',
  });

  // 36. Canada Student, Scholarship with certificate
  list.push({
    id: id++,
    category: 'Canada Studies',
    name: 'CA-Stud-ScholarshipWithCert',
    payload: {
      destination: 'Canada',
      visaReason: 'etudes',
      countryOfOrigin: 'Cameroun',
      status: 'etudiant',
      targetMajorAbroad: 'Doctorat Santé Publique',
      accommodationType: 'campus',
      travelDurationDays: 365,
      fundingSource: 'bourse_officielle',
      hasScholarshipCertificate: true,
      hasPassport6MonthsValid: true,
      hasPreviousRefusal: false,
    },
    expectedOutcome: 'Favorable evidence for scholarship, no blocker',
  });

  // 37. Canada Student, Scholarship missing certificate
  list.push({
    id: id++,
    category: 'Canada Studies',
    name: 'CA-Stud-ScholarshipMissingCert',
    payload: {
      destination: 'Canada',
      visaReason: 'etudes',
      countryOfOrigin: 'Cameroun',
      status: 'etudiant',
      targetMajorAbroad: 'Doctorat Santé Publique',
      accommodationType: 'campus',
      travelDurationDays: 365,
      fundingSource: 'bourse_officielle',
      hasScholarshipCertificate: false,
      hasPassport6MonthsValid: true,
      hasPreviousRefusal: false,
    },
    expectedOutcome: 'No blocker, evidence_gap for official scholarship grant letter',
  });

  // 38. Canada Student, Passport < 6 months
  list.push({
    id: id++,
    category: 'Canada Studies',
    name: 'CA-Stud-PassportUnder6Months',
    payload: {
      destination: 'Canada',
      visaReason: 'etudes',
      countryOfOrigin: 'Sénégal',
      status: 'etudiant',
      targetMajorAbroad: 'Maîtrise Économie',
      accommodationType: 'campus',
      travelDurationDays: 365,
      fundingSource: 'autofinancement',
      availableBudgetFcfa: 12000000,
      hasPassport6MonthsValid: false,
      hasPreviousRefusal: false,
    },
    expectedOutcome: 'NO blocker, clarification_point only',
  });

  // 39. Canada Student, Previous study refusal explained
  list.push({
    id: id++,
    category: 'Canada Studies',
    name: 'CA-Stud-RefusalExplained',
    payload: {
      destination: 'Canada',
      visaReason: 'etudes',
      countryOfOrigin: 'Sénégal',
      status: 'etudiant',
      targetMajorAbroad: 'Maîtrise Économie',
      accommodationType: 'campus',
      travelDurationDays: 365,
      fundingSource: 'autofinancement',
      availableBudgetFcfa: 12000000,
      hasPassport6MonthsValid: true,
      hasPreviousRefusal: true,
      previousRefusalReason: 'Article R216 : non-satisfaction quant au retour au pays',
    },
    expectedOutcome: 'No blocker, clarification_point on dual intent and return anchors',
  });

  // 40. Canada Student, Previous refusal unrecorded reason
  list.push({
    id: id++,
    category: 'Canada Studies',
    name: 'CA-Stud-RefusalUnspecified',
    payload: {
      destination: 'Canada',
      visaReason: 'etudes',
      countryOfOrigin: 'Sénégal',
      status: 'etudiant',
      targetMajorAbroad: 'Maîtrise Économie',
      accommodationType: 'campus',
      travelDurationDays: 365,
      fundingSource: 'autofinancement',
      availableBudgetFcfa: 12000000,
      hasPassport6MonthsValid: true,
      hasPreviousRefusal: true,
      previousRefusalReason: '',
    },
    expectedOutcome: 'NO blocker, insufficient_information for unspecified refusal reason',
  });

  // 41. Canada Student, Lump deposit explained
  list.push({
    id: id++,
    category: 'Canada Studies',
    name: 'CA-Stud-LumpDepositExplained',
    payload: {
      destination: 'Canada',
      visaReason: 'etudes',
      countryOfOrigin: 'Mali',
      status: 'etudiant',
      targetMajorAbroad: 'Baccalauréat Biologie',
      accommodationType: 'campus',
      travelDurationDays: 365,
      fundingSource: 'autofinancement',
      availableBudgetFcfa: 11000000,
      hasRecentLumpDeposit: true,
      lumpDepositExplanation: 'Vente d’un terrain familial par le père attestée par acte notarié',
      hasPassport6MonthsValid: true,
      hasPreviousRefusal: false,
    },
    expectedOutcome: 'No blocker, clarification_point for asset liquidation proof',
  });

  // 42. Canada Student, Lump deposit unexplained
  list.push({
    id: id++,
    category: 'Canada Studies',
    name: 'CA-Stud-LumpDepositUnexplained',
    payload: {
      destination: 'Canada',
      visaReason: 'etudes',
      countryOfOrigin: 'Mali',
      status: 'etudiant',
      targetMajorAbroad: 'Baccalauréat Biologie',
      accommodationType: 'campus',
      travelDurationDays: 365,
      fundingSource: 'autofinancement',
      availableBudgetFcfa: 11000000,
      hasRecentLumpDeposit: true,
      lumpDepositExplanation: undefined,
      hasPassport6MonthsValid: true,
      hasPreviousRefusal: false,
    },
    expectedOutcome: 'No blocker, evidence_gap for unexplained bank deposit',
  });

  // 43. Canada Student, missing target major
  list.push({
    id: id++,
    category: 'Canada Studies',
    name: 'CA-Stud-MissingMajor',
    payload: {
      destination: 'Canada',
      visaReason: 'etudes',
      countryOfOrigin: 'Guinée',
      status: 'etudiant',
      targetMajorAbroad: undefined,
      accommodationType: 'campus',
      travelDurationDays: 365,
      fundingSource: 'autofinancement',
      availableBudgetFcfa: 10000000,
      hasPassport6MonthsValid: true,
      hasPreviousRefusal: false,
    },
    expectedOutcome: 'No blocker, insufficient_information for missing program',
  });

  // 44. Canada Student, filing from third country
  list.push({
    id: id++,
    category: 'Canada Studies',
    name: 'CA-Stud-ThirdCountry',
    payload: {
      destination: 'Canada',
      visaReason: 'etudes',
      countryOfOrigin: 'Guinée',
      isFilingFromSameCountry: false,
      filingCountry: 'Sénégal',
      status: 'etudiant',
      targetMajorAbroad: 'Génie Minier',
      accommodationType: 'campus',
      travelDurationDays: 365,
      fundingSource: 'autofinancement',
      availableBudgetFcfa: 10000000,
      hasPassport6MonthsValid: true,
      hasPreviousRefusal: false,
    },
    expectedOutcome: 'No blocker, clarification_point on territorial filing',
  });

  // 45. Canada Student, high budget and complete profile
  list.push({
    id: id++,
    category: 'Canada Studies',
    name: 'CA-Stud-HighBudgetComplete',
    payload: {
      destination: 'Canada',
      visaReason: 'etudes',
      countryOfOrigin: 'Sénégal',
      status: 'etudiant',
      targetMajorAbroad: 'Maîtrise Informatique',
      accommodationType: 'campus',
      travelDurationDays: 365,
      fundingSource: 'autofinancement',
      availableBudgetFcfa: 25000000,
      hasPassport6MonthsValid: true,
      hasPreviousRefusal: false,
      hasRecentLumpDeposit: false,
    },
    expectedOutcome: 'Full compliance under verified 2024 rule, unverified 2026 rule isolated',
  });

  // -------------------------------------------------------------
  // Group 4: Morocco Tourism & Nationality Resolution (Scenarios 46-60)
  // -------------------------------------------------------------
  // 46. Ivorian, 25 days (<= 30 days) (Mandatory Test C)
  list.push({
    id: id++,
    category: 'Morocco Tourism',
    name: 'MA-Tour-Ivorian-25Days',
    payload: {
      destination: 'Maroc',
      visaReason: 'tourisme_visite',
      countryOfOrigin: 'Côte d’Ivoire',
      status: 'salarie_prive',
      accommodationType: 'hotel',
      travelDurationDays: 25,
      fundingSource: 'autofinancement',
      availableBudgetFcfa: 1200000,
      hasPassport6MonthsValid: true,
      hasPreviousRefusal: false,
    },
    expectedOutcome: 'Resolves RULE-MA-IVORIAN-EVISA-30D, compliant stay duration, NO blocker',
  });

  // 47. Ivorian, 45 days (> 30 days) (Mandatory Test C)
  list.push({
    id: id++,
    category: 'Morocco Tourism',
    name: 'MA-Tour-Ivorian-45Days-Exceeded',
    payload: {
      destination: 'Maroc',
      visaReason: 'tourisme_visite',
      countryOfOrigin: 'Côte d’Ivoire',
      status: 'salarie_prive',
      accommodationType: 'hotel',
      travelDurationDays: 45,
      fundingSource: 'autofinancement',
      availableBudgetFcfa: 1500000,
      hasPassport6MonthsValid: true,
      hasPreviousRefusal: false,
    },
    expectedOutcome: 'Resolves RULE-MA-IVORIAN-EVISA-30D, generates direct blocker for duration > 30d',
  });

  // 48. Ivorian, variant spelling 'Cote d\'Ivoire', 20 days
  list.push({
    id: id++,
    category: 'Morocco Tourism',
    name: 'MA-Tour-Ivorian-SpellingVariant',
    payload: {
      destination: 'Maroc',
      visaReason: 'tourisme_visite',
      countryOfOrigin: 'Cote d\'Ivoire',
      status: 'salarie_prive',
      accommodationType: 'hotel',
      travelDurationDays: 20,
      fundingSource: 'autofinancement',
      availableBudgetFcfa: 1000000,
      hasPassport6MonthsValid: true,
      hasPreviousRefusal: false,
    },
    expectedOutcome: 'Resolves RULE-MA-IVORIAN-EVISA-30D through normalized matching',
  });

  // 49. Senegalese, 60 days (<= 90 days bilateral exemption)
  list.push({
    id: id++,
    category: 'Morocco Tourism',
    name: 'MA-Tour-Senegalese-60Days-Exempt',
    payload: {
      destination: 'Maroc',
      visaReason: 'tourisme_visite',
      countryOfOrigin: 'Sénégal',
      status: 'salarie_prive',
      accommodationType: 'hotel',
      travelDurationDays: 60,
      fundingSource: 'autofinancement',
      availableBudgetFcfa: 1500000,
      hasPassport6MonthsValid: true,
      hasPreviousRefusal: false,
    },
    expectedOutcome: 'Resolves RULE-MA-EXEMPTION-90D, compliant stay duration',
  });

  // 50. Senegalese, 120 days (> 90 days exemption)
  list.push({
    id: id++,
    category: 'Morocco Tourism',
    name: 'MA-Tour-Senegalese-120Days-Exceeded',
    payload: {
      destination: 'Maroc',
      visaReason: 'tourisme_visite',
      countryOfOrigin: 'Sénégal',
      status: 'salarie_prive',
      accommodationType: 'hotel',
      travelDurationDays: 120,
      fundingSource: 'autofinancement',
      availableBudgetFcfa: 2500000,
      hasPassport6MonthsValid: true,
      hasPreviousRefusal: false,
    },
    expectedOutcome: 'Resolves RULE-MA-EXEMPTION-90D, generates direct blocker for duration > 90d',
  });

  // 51. Malian, 45 days (Mali is bilateral partner)
  list.push({
    id: id++,
    category: 'Morocco Tourism',
    name: 'MA-Tour-Malian-45Days',
    payload: {
      destination: 'Maroc',
      visaReason: 'tourisme_visite',
      countryOfOrigin: 'Mali',
      status: 'salarie_prive',
      accommodationType: 'hotel',
      travelDurationDays: 45,
      fundingSource: 'autofinancement',
      availableBudgetFcfa: 1200000,
      hasPassport6MonthsValid: true,
      hasPreviousRefusal: false,
    },
    expectedOutcome: 'Resolves RULE-MA-EXEMPTION-90D, compliant stay duration',
  });

  // 52. Guinean, 30 days (Guinea is bilateral partner)
  list.push({
    id: id++,
    category: 'Morocco Tourism',
    name: 'MA-Tour-Guinean-30Days',
    payload: {
      destination: 'Maroc',
      visaReason: 'tourisme_visite',
      countryOfOrigin: 'Guinée',
      status: 'salarie_prive',
      accommodationType: 'hotel',
      travelDurationDays: 30,
      fundingSource: 'autofinancement',
      availableBudgetFcfa: 1000000,
      hasPassport6MonthsValid: true,
      hasPreviousRefusal: false,
    },
    expectedOutcome: 'Resolves RULE-MA-EXEMPTION-90D, compliant stay duration',
  });

  // 53. Cameroonian, 20 days (Cameroon is excluded from 90D exemption and not Côte d'Ivoire)
  list.push({
    id: id++,
    category: 'Morocco Tourism',
    name: 'MA-Tour-Cameroonian-NotExempt',
    payload: {
      destination: 'Maroc',
      visaReason: 'tourisme_visite',
      countryOfOrigin: 'Cameroun',
      status: 'salarie_prive',
      accommodationType: 'hotel',
      travelDurationDays: 20,
      fundingSource: 'autofinancement',
      availableBudgetFcfa: 1000000,
      hasPassport6MonthsValid: true,
      hasPreviousRefusal: false,
    },
    expectedOutcome: 'Does NOT resolve RULE-MA-EXEMPTION-90D (Cameroon excluded), no unearned exemption',
  });

  // 54. Congolese, 15 days (Congo is excluded from 90D exemption)
  list.push({
    id: id++,
    category: 'Morocco Tourism',
    name: 'MA-Tour-Congolese-NotExempt',
    payload: {
      destination: 'Maroc',
      visaReason: 'tourisme_visite',
      countryOfOrigin: 'Congo',
      status: 'salarie_prive',
      accommodationType: 'hotel',
      travelDurationDays: 15,
      fundingSource: 'autofinancement',
      availableBudgetFcfa: 900000,
      hasPassport6MonthsValid: true,
      hasPreviousRefusal: false,
    },
    expectedOutcome: 'Does NOT resolve RULE-MA-EXEMPTION-90D, no unearned exemption',
  });

  // 55. Gabonese, 15 days (Gabon is excluded from 90D exemption)
  list.push({
    id: id++,
    category: 'Morocco Tourism',
    name: 'MA-Tour-Gabonese-NotExempt',
    payload: {
      destination: 'Maroc',
      visaReason: 'tourisme_visite',
      countryOfOrigin: 'Gabon',
      status: 'salarie_prive',
      accommodationType: 'hotel',
      travelDurationDays: 15,
      fundingSource: 'autofinancement',
      availableBudgetFcfa: 1200000,
      hasPassport6MonthsValid: true,
      hasPreviousRefusal: false,
    },
    expectedOutcome: 'Does NOT resolve RULE-MA-EXEMPTION-90D, no unearned exemption',
  });

  // 56. Moroccan Tourism, missing budget
  list.push({
    id: id++,
    category: 'Morocco Tourism',
    name: 'MA-Tour-MissingBudget',
    payload: {
      destination: 'Maroc',
      visaReason: 'tourisme_visite',
      countryOfOrigin: 'Côte d’Ivoire',
      status: 'salarie_prive',
      accommodationType: 'hotel',
      travelDurationDays: 20,
      fundingSource: 'autofinancement',
      availableBudgetFcfa: undefined,
      hasPassport6MonthsValid: true,
      hasPreviousRefusal: false,
    },
    expectedOutcome: 'NO blocker, unverified financial threshold handled via insufficient_information',
  });

  // 57. Moroccan Tourism, passport < 6 months
  list.push({
    id: id++,
    category: 'Morocco Tourism',
    name: 'MA-Tour-PassportUnder6Months',
    payload: {
      destination: 'Maroc',
      visaReason: 'tourisme_visite',
      countryOfOrigin: 'Sénégal',
      status: 'salarie_prive',
      accommodationType: 'hotel',
      travelDurationDays: 20,
      fundingSource: 'autofinancement',
      availableBudgetFcfa: 1000000,
      hasPassport6MonthsValid: false,
      hasPreviousRefusal: false,
    },
    expectedOutcome: 'NO blocker, clarification_point only',
  });

  // 58. Moroccan Tourism, with guarantor
  list.push({
    id: id++,
    category: 'Morocco Tourism',
    name: 'MA-Tour-Guarantor',
    payload: {
      destination: 'Maroc',
      visaReason: 'tourisme_visite',
      countryOfOrigin: 'Côte d’Ivoire',
      status: 'salarie_prive',
      accommodationType: 'hotel',
      travelDurationDays: 20,
      fundingSource: 'garant_local',
      guarantorHasTaxNotices: true,
      hasPassport6MonthsValid: true,
      hasPreviousRefusal: false,
    },
    expectedOutcome: 'No blocker, e-Visa rule for Ivorian applied without stay violation',
  });

  // 59. Moroccan Tourism, previous refusal explained
  list.push({
    id: id++,
    category: 'Morocco Tourism',
    name: 'MA-Tour-RefusalExplained',
    payload: {
      destination: 'Maroc',
      visaReason: 'tourisme_visite',
      countryOfOrigin: 'Côte d’Ivoire',
      status: 'salarie_prive',
      accommodationType: 'hotel',
      travelDurationDays: 20,
      fundingSource: 'autofinancement',
      availableBudgetFcfa: 1500000,
      hasPassport6MonthsValid: true,
      hasPreviousRefusal: true,
      previousRefusalReason: 'Délai d’instruction dépassé',
    },
    expectedOutcome: 'No blocker, clarification_point on previous refusal',
  });

  // 60. Moroccan Tourism, third country filing
  list.push({
    id: id++,
    category: 'Morocco Tourism',
    name: 'MA-Tour-ThirdCountryFiling',
    payload: {
      destination: 'Maroc',
      visaReason: 'tourisme_visite',
      countryOfOrigin: 'Côte d’Ivoire',
      isFilingFromSameCountry: false,
      filingCountry: 'France',
      status: 'salarie_prive',
      accommodationType: 'hotel',
      travelDurationDays: 20,
      fundingSource: 'autofinancement',
      availableBudgetFcfa: 1500000,
      hasPassport6MonthsValid: true,
      hasPreviousRefusal: false,
    },
    expectedOutcome: 'Resolves Ivorian e-Visa rule, clarification on third country residence',
  });

  // -------------------------------------------------------------
  // Group 5: Employee Profiles & Ties (Scenarios 61-70)
  // -------------------------------------------------------------
  // 61. Salarié privé, employment certificate + payslips present
  list.push({
    id: id++,
    category: 'Employee Profiles',
    name: 'EMP-Private-FullDocs',
    payload: {
      destination: 'France',
      visaReason: 'tourisme_visite',
      countryOfOrigin: 'Sénégal',
      status: 'salarie_prive',
      accommodationType: 'hotel',
      travelDurationDays: 14,
      fundingSource: 'autofinancement',
      availableBudgetFcfa: 1800000,
      hasEmploymentCertificate: true,
      hasRecentPayslips: true,
      tiesType: 'contrat_cdi',
      hasPassport6MonthsValid: true,
      hasPreviousRefusal: false,
    },
    expectedOutcome: 'Favorable evidence for employee anchors, no blocker',
  });

  // 62. Salarié privé, missing payslips
  list.push({
    id: id++,
    category: 'Employee Profiles',
    name: 'EMP-Private-MissingPayslips',
    payload: {
      destination: 'France',
      visaReason: 'tourisme_visite',
      countryOfOrigin: 'Sénégal',
      status: 'salarie_prive',
      accommodationType: 'hotel',
      travelDurationDays: 14,
      fundingSource: 'autofinancement',
      availableBudgetFcfa: 1800000,
      hasEmploymentCertificate: true,
      hasRecentPayslips: false,
      tiesType: 'contrat_cdi',
      hasPassport6MonthsValid: true,
      hasPreviousRefusal: false,
    },
    expectedOutcome: 'No blocker, evidence_gap for missing payslips',
  });

  // 63. Salarié privé, missing employment certificate
  list.push({
    id: id++,
    category: 'Employee Profiles',
    name: 'EMP-Private-MissingCertificate',
    payload: {
      destination: 'France',
      visaReason: 'tourisme_visite',
      countryOfOrigin: 'Sénégal',
      status: 'salarie_prive',
      accommodationType: 'hotel',
      travelDurationDays: 14,
      fundingSource: 'autofinancement',
      availableBudgetFcfa: 1800000,
      hasEmploymentCertificate: false,
      hasRecentPayslips: true,
      tiesType: 'contrat_cdi',
      hasPassport6MonthsValid: true,
      hasPreviousRefusal: false,
    },
    expectedOutcome: 'No blocker, evidence_gap for missing employment certificate',
  });

  // 64. Fonctionnaire, attestation de présence au corps
  list.push({
    id: id++,
    category: 'Employee Profiles',
    name: 'EMP-CivilServant-FullDocs',
    payload: {
      destination: 'France',
      visaReason: 'tourisme_visite',
      countryOfOrigin: 'Côte d’Ivoire',
      status: 'fonctionnaire',
      accommodationType: 'hotel',
      travelDurationDays: 14,
      fundingSource: 'autofinancement',
      availableBudgetFcfa: 2000000,
      hasCivilServantProof: true,
      tiesType: 'contrat_cdi',
      hasPassport6MonthsValid: true,
      hasPreviousRefusal: false,
    },
    expectedOutcome: 'Favorable evidence for public servant status, no blocker',
  });

  // 65. Fonctionnaire, missing attestation
  list.push({
    id: id++,
    category: 'Employee Profiles',
    name: 'EMP-CivilServant-MissingDocs',
    payload: {
      destination: 'France',
      visaReason: 'tourisme_visite',
      countryOfOrigin: 'Côte d’Ivoire',
      status: 'fonctionnaire',
      accommodationType: 'hotel',
      travelDurationDays: 14,
      fundingSource: 'autofinancement',
      availableBudgetFcfa: 2000000,
      hasCivilServantProof: false,
      tiesType: 'contrat_cdi',
      hasPassport6MonthsValid: true,
      hasPreviousRefusal: false,
    },
    expectedOutcome: 'No blocker, evidence_gap for civil service proof',
  });

  // 66. Employee with real estate anchor
  list.push({
    id: id++,
    category: 'Employee Profiles',
    name: 'EMP-WithRealEstate',
    payload: {
      destination: 'France',
      visaReason: 'tourisme_visite',
      countryOfOrigin: 'Sénégal',
      status: 'salarie_prive',
      accommodationType: 'hotel',
      travelDurationDays: 14,
      fundingSource: 'autofinancement',
      availableBudgetFcfa: 2200000,
      tiesType: 'titre_foncier',
      hasPassport6MonthsValid: true,
      hasPreviousRefusal: false,
    },
    expectedOutcome: 'Strong patrimonial anchor noted, no blocker',
  });

  // 67. Employee with family anchor (spouse and dependent children)
  list.push({
    id: id++,
    category: 'Employee Profiles',
    name: 'EMP-WithFamilyAnchors',
    payload: {
      destination: 'France',
      visaReason: 'tourisme_visite',
      countryOfOrigin: 'Sénégal',
      status: 'salarie_prive',
      accommodationType: 'hotel',
      travelDurationDays: 14,
      fundingSource: 'autofinancement',
      availableBudgetFcfa: 2200000,
      tiesType: 'famille_a_charge',
      hasPassport6MonthsValid: true,
      hasPreviousRefusal: false,
    },
    expectedOutcome: 'Family anchor evaluated, no blocker',
  });

  // 68. Employee, leave authorization present
  list.push({
    id: id++,
    category: 'Employee Profiles',
    name: 'EMP-LeaveAuthorization',
    payload: {
      destination: 'France',
      visaReason: 'tourisme_visite',
      countryOfOrigin: 'Sénégal',
      status: 'salarie_prive',
      accommodationType: 'hotel',
      travelDurationDays: 10,
      fundingSource: 'autofinancement',
      availableBudgetFcfa: 1500000,
      hasEmploymentCertificate: true,
      hasRecentPayslips: true,
      hasPassport6MonthsValid: true,
      hasPreviousRefusal: false,
    },
    expectedOutcome: 'Full employer documentation, no blocker',
  });

  // 69. Employee, recent lump deposit with bonus certificate
  list.push({
    id: id++,
    category: 'Employee Profiles',
    name: 'EMP-LumpDeposit-AnnualBonus',
    payload: {
      destination: 'France',
      visaReason: 'tourisme_visite',
      countryOfOrigin: 'Sénégal',
      status: 'salarie_prive',
      accommodationType: 'hotel',
      travelDurationDays: 14,
      fundingSource: 'autofinancement',
      availableBudgetFcfa: 3000000,
      hasRecentLumpDeposit: true,
      lumpDepositExplanation: 'Versement de la prime annuelle d’intéressement avec fiche de paie correspondante',
      hasPassport6MonthsValid: true,
      hasPreviousRefusal: false,
    },
    expectedOutcome: 'Clarification_point on bonus documentation, no blocker, no fraud accusation',
  });

  // 70. Employee, unexplained lump deposit
  list.push({
    id: id++,
    category: 'Employee Profiles',
    name: 'EMP-LumpDeposit-Unexplained',
    payload: {
      destination: 'France',
      visaReason: 'tourisme_visite',
      countryOfOrigin: 'Sénégal',
      status: 'salarie_prive',
      accommodationType: 'hotel',
      travelDurationDays: 14,
      fundingSource: 'autofinancement',
      availableBudgetFcfa: 3000000,
      hasRecentLumpDeposit: true,
      lumpDepositExplanation: '',
      hasPassport6MonthsValid: true,
      hasPreviousRefusal: false,
    },
    expectedOutcome: 'evidence_gap on provenance, no blocker',
  });

  // -------------------------------------------------------------
  // Group 6: Entrepreneur Profiles & Formal Registrations (Scenarios 71-80)
  // -------------------------------------------------------------
  // 71. Entrepreneur with full legal registration (RCCM, NIF, bank balance)
  list.push({
    id: id++,
    category: 'Entrepreneur Profiles',
    name: 'ENT-FullRegistration',
    payload: {
      destination: 'France',
      visaReason: 'tourisme_visite',
      countryOfOrigin: 'Côte d’Ivoire',
      status: 'entrepreneur',
      hasRccmNif: true,
      hasBusinessTaxNotice: true,
      accommodationType: 'hotel',
      travelDurationDays: 15,
      fundingSource: 'autofinancement',
      availableBudgetFcfa: 4000000,
      hasPassport6MonthsValid: true,
      hasPreviousRefusal: false,
    },
    expectedOutcome: 'Favorable evidence for formal corporate registration, no blocker',
  });

  // 72. Entrepreneur without RCCM/NIF (informal commercial activity)
  list.push({
    id: id++,
    category: 'Entrepreneur Profiles',
    name: 'ENT-MissingRCCM',
    payload: {
      destination: 'France',
      visaReason: 'tourisme_visite',
      countryOfOrigin: 'Côte d’Ivoire',
      status: 'entrepreneur',
      hasRccmNif: false,
      hasBusinessTaxNotice: false,
      accommodationType: 'hotel',
      travelDurationDays: 15,
      fundingSource: 'autofinancement',
      availableBudgetFcfa: 4000000,
      hasPassport6MonthsValid: true,
      hasPreviousRefusal: false,
    },
    expectedOutcome: 'No blocker, clarification_point / evidence_gap on formal enterprise registration',
  });

  // 73. Entrepreneur with missing hasRccmNif question response
  list.push({
    id: id++,
    category: 'Entrepreneur Profiles',
    name: 'ENT-UndeclaredRCCM',
    payload: {
      destination: 'France',
      visaReason: 'tourisme_visite',
      countryOfOrigin: 'Côte d’Ivoire',
      status: 'entrepreneur',
      hasRccmNif: undefined,
      accommodationType: 'hotel',
      travelDurationDays: 15,
      fundingSource: 'autofinancement',
      availableBudgetFcfa: 4000000,
      hasPassport6MonthsValid: true,
      hasPreviousRefusal: false,
    },
    expectedOutcome: 'NO blocker, missing context recorded, completeness penalized',
  });

  // 74. Entrepreneur with corporate tax notice missing
  list.push({
    id: id++,
    category: 'Entrepreneur Profiles',
    name: 'ENT-MissingTaxNotice',
    payload: {
      destination: 'France',
      visaReason: 'tourisme_visite',
      countryOfOrigin: 'Côte d’Ivoire',
      status: 'entrepreneur',
      hasRccmNif: true,
      hasBusinessTaxNotice: false,
      accommodationType: 'hotel',
      travelDurationDays: 15,
      fundingSource: 'autofinancement',
      availableBudgetFcfa: 3500000,
      hasPassport6MonthsValid: true,
      hasPreviousRefusal: false,
    },
    expectedOutcome: 'No blocker, evidence_gap on business tax compliance',
  });

  // 75. Entrepreneur, business mission visaReason with company invite
  list.push({
    id: id++,
    category: 'Entrepreneur Profiles',
    name: 'ENT-BusinessMission',
    payload: {
      destination: 'France',
      visaReason: 'affaires_mission',
      countryOfOrigin: 'Sénégal',
      status: 'entrepreneur',
      hasRccmNif: true,
      accommodationType: 'hotel',
      travelDurationDays: 10,
      fundingSource: 'autofinancement',
      availableBudgetFcfa: 3000000,
      hasPassport6MonthsValid: true,
      hasPreviousRefusal: false,
    },
    expectedOutcome: 'Business purpose aligned, no blocker',
  });

  // 76. Entrepreneur, missing budget
  list.push({
    id: id++,
    category: 'Entrepreneur Profiles',
    name: 'ENT-MissingBudget',
    payload: {
      destination: 'France',
      visaReason: 'affaires_mission',
      countryOfOrigin: 'Sénégal',
      status: 'entrepreneur',
      hasRccmNif: true,
      accommodationType: 'hotel',
      travelDurationDays: 10,
      fundingSource: 'autofinancement',
      availableBudgetFcfa: undefined,
      hasPassport6MonthsValid: true,
      hasPreviousRefusal: false,
    },
    expectedOutcome: 'NO blocker, insufficient_information, completeness penalized',
  });

  // 77. Entrepreneur, budget deficit (< 10 days hotel)
  list.push({
    id: id++,
    category: 'Entrepreneur Profiles',
    name: 'ENT-BudgetDeficit',
    payload: {
      destination: 'France',
      visaReason: 'affaires_mission',
      countryOfOrigin: 'Sénégal',
      status: 'entrepreneur',
      hasRccmNif: true,
      accommodationType: 'hotel',
      travelDurationDays: 10,
      fundingSource: 'autofinancement',
      availableBudgetFcfa: 50000,
      hasPassport6MonthsValid: true,
      hasPreviousRefusal: false,
    },
    expectedOutcome: 'Direct blocker for insufficient budget below Schengen short stay rate',
  });

  // 78. Entrepreneur, real estate anchor declared
  list.push({
    id: id++,
    category: 'Entrepreneur Profiles',
    name: 'ENT-RealEstateAnchor',
    payload: {
      destination: 'France',
      visaReason: 'affaires_mission',
      countryOfOrigin: 'Sénégal',
      status: 'entrepreneur',
      hasRccmNif: true,
      accommodationType: 'hotel',
      travelDurationDays: 10,
      fundingSource: 'autofinancement',
      availableBudgetFcfa: 4000000,
      tiesType: 'titre_foncier',
      hasPassport6MonthsValid: true,
      hasPreviousRefusal: false,
    },
    expectedOutcome: 'Strong return anchor, no blocker',
  });

  // 79. Entrepreneur, previous commercial refusal explained
  list.push({
    id: id++,
    category: 'Entrepreneur Profiles',
    name: 'ENT-RefusalExplained',
    payload: {
      destination: 'France',
      visaReason: 'affaires_mission',
      countryOfOrigin: 'Sénégal',
      status: 'entrepreneur',
      hasRccmNif: true,
      accommodationType: 'hotel',
      travelDurationDays: 10,
      fundingSource: 'autofinancement',
      availableBudgetFcfa: 4000000,
      hasPassport6MonthsValid: true,
      hasPreviousRefusal: true,
      previousRefusalReason: 'Justification insuffisante de l’objet du déplacement',
    },
    expectedOutcome: 'No blocker, clarification_point on commercial purpose documentation',
  });

  // 80. Entrepreneur, previous commercial refusal unexplained
  list.push({
    id: id++,
    category: 'Entrepreneur Profiles',
    name: 'ENT-RefusalUnspecified',
    payload: {
      destination: 'France',
      visaReason: 'affaires_mission',
      countryOfOrigin: 'Sénégal',
      status: 'entrepreneur',
      hasRccmNif: true,
      accommodationType: 'hotel',
      travelDurationDays: 10,
      fundingSource: 'autofinancement',
      availableBudgetFcfa: 4000000,
      hasPassport6MonthsValid: true,
      hasPreviousRefusal: true,
      previousRefusalReason: '',
    },
    expectedOutcome: 'NO blocker, insufficient_information for unspecified refusal',
  });

  // -------------------------------------------------------------
  // Group 7: Missing Information & Sparse Profiles (Scenarios 81-90)
  // -------------------------------------------------------------
  // 81. Bare minimum profile (missing budget, missing ties)
  list.push({
    id: id++,
    category: 'Missing Information',
    name: 'SPARSE-MissingBudgetAndTies',
    payload: {
      destination: 'France',
      visaReason: 'tourisme_visite',
      countryOfOrigin: 'Sénégal',
      status: 'salarie_prive',
      accommodationType: 'hotel',
      travelDurationDays: 15,
      fundingSource: 'autofinancement',
      availableBudgetFcfa: undefined,
      hasPassport6MonthsValid: true,
      hasPreviousRefusal: false,
    },
    expectedOutcome: 'NO blocker, dataCompleteness low or medium, insufficient_information finding',
  });

  // 82. Missing accommodation type
  list.push({
    id: id++,
    category: 'Missing Information',
    name: 'SPARSE-MissingAccommodation',
    payload: {
      destination: 'France',
      visaReason: 'tourisme_visite',
      countryOfOrigin: 'Sénégal',
      status: 'salarie_prive',
      accommodationType: '' as any,
      travelDurationDays: 15,
      fundingSource: 'autofinancement',
      availableBudgetFcfa: 1500000,
      hasPassport6MonthsValid: true,
      hasPreviousRefusal: false,
    },
    expectedOutcome: 'NO blocker, completeness penalized, insufficient_information on logistics',
  });

  // 83. Missing travel duration (travelDurationDays undefined)
  list.push({
    id: id++,
    category: 'Missing Information',
    name: 'SPARSE-MissingDuration',
    payload: {
      destination: 'France',
      visaReason: 'tourisme_visite',
      countryOfOrigin: 'Sénégal',
      status: 'salarie_prive',
      accommodationType: 'hotel',
      travelDurationDays: undefined as any,
      fundingSource: 'autofinancement',
      availableBudgetFcfa: 1500000,
      hasPassport6MonthsValid: true,
      hasPreviousRefusal: false,
    },
    expectedOutcome: 'NO blocker, completeness penalized, default fallback duration handled gracefully',
  });

  // 84. Missing status (status undefined)
  list.push({
    id: id++,
    category: 'Missing Information',
    name: 'SPARSE-MissingStatus',
    payload: {
      destination: 'France',
      visaReason: 'tourisme_visite',
      countryOfOrigin: 'Sénégal',
      status: '' as any,
      accommodationType: 'hotel',
      travelDurationDays: 15,
      fundingSource: 'autofinancement',
      availableBudgetFcfa: 1500000,
      hasPassport6MonthsValid: true,
      hasPreviousRefusal: false,
    },
    expectedOutcome: 'NO blocker, dataCompleteness low, missing declared data tracked',
  });

  // 85. Missing funding source entirely
  list.push({
    id: id++,
    category: 'Missing Information',
    name: 'SPARSE-MissingFundingSource',
    payload: {
      destination: 'France',
      visaReason: 'tourisme_visite',
      countryOfOrigin: 'Sénégal',
      status: 'salarie_prive',
      accommodationType: 'hotel',
      travelDurationDays: 15,
      fundingSource: '' as any,
      availableBudgetFcfa: undefined,
      hasPassport6MonthsValid: true,
      hasPreviousRefusal: false,
    },
    expectedOutcome: 'NO blocker, insufficient_information for unverified funding source',
  });

  // 86. Missing destination entirely
  list.push({
    id: id++,
    category: 'Missing Information',
    name: 'SPARSE-MissingDestination',
    payload: {
      destination: '',
      visaReason: 'tourisme_visite',
      countryOfOrigin: 'Sénégal',
      status: 'salarie_prive',
      accommodationType: 'hotel',
      travelDurationDays: 15,
      fundingSource: 'autofinancement',
      availableBudgetFcfa: 1500000,
      hasPassport6MonthsValid: true,
      hasPreviousRefusal: false,
    },
    expectedOutcome: 'NO blocker, handled gracefully, dataCompleteness low',
  });

  // 87. Multiple missing fields simultaneously (budget, duration, accommodation)
  list.push({
    id: id++,
    category: 'Missing Information',
    name: 'SPARSE-MultipleMissingFields',
    payload: {
      destination: 'France',
      visaReason: 'tourisme_visite',
      countryOfOrigin: 'Sénégal',
      status: 'salarie_prive',
      accommodationType: '' as any,
      travelDurationDays: 0,
      fundingSource: 'autofinancement',
      availableBudgetFcfa: undefined,
      hasPassport6MonthsValid: true,
      hasPreviousRefusal: false,
    },
    expectedOutcome: 'NO blocker, dataCompleteness low, confidence penalized, no crash',
  });

  // 88. Missing passport validity response
  list.push({
    id: id++,
    category: 'Missing Information',
    name: 'SPARSE-MissingPassportResponse',
    payload: {
      destination: 'France',
      visaReason: 'tourisme_visite',
      countryOfOrigin: 'Sénégal',
      status: 'salarie_prive',
      accommodationType: 'hotel',
      travelDurationDays: 15,
      fundingSource: 'autofinancement',
      availableBudgetFcfa: 1500000,
      hasPassport6MonthsValid: undefined as any,
      hasPreviousRefusal: false,
    },
    expectedOutcome: 'NO blocker, treated as non-blocking clarification/insufficient information',
  });

  // 89. Missing previous refusal response
  list.push({
    id: id++,
    category: 'Missing Information',
    name: 'SPARSE-MissingPreviousRefusalBool',
    payload: {
      destination: 'France',
      visaReason: 'tourisme_visite',
      countryOfOrigin: 'Sénégal',
      status: 'salarie_prive',
      accommodationType: 'hotel',
      travelDurationDays: 15,
      fundingSource: 'autofinancement',
      availableBudgetFcfa: 1500000,
      hasPassport6MonthsValid: true,
      hasPreviousRefusal: undefined as any,
    },
    expectedOutcome: 'NO blocker, neutral assumption, no artificial flag',
  });

  // 90. Completely empty payload
  list.push({
    id: id++,
    category: 'Missing Information',
    name: 'SPARSE-EmptyPayload',
    payload: {} as any,
    expectedOutcome: 'NO blocker, dataCompleteness low, confidence low, pure insufficient_information',
  });

  // -------------------------------------------------------------
  // Group 8: Contradictory & Edge Case Profiles (Scenarios 91-100)
  // -------------------------------------------------------------
  // 91. Sans emploi formel + Contrat CDI (Contradiction factuelle)
  list.push({
    id: id++,
    category: 'Contradictory Profiles',
    name: 'EDGE-StatusUnemployed-TiesCDI',
    payload: {
      destination: 'France',
      visaReason: 'tourisme_visite',
      countryOfOrigin: 'Sénégal',
      status: 'sans_emploi_formel',
      tiesType: 'contrat_cdi',
      accommodationType: 'hotel',
      travelDurationDays: 15,
      fundingSource: 'autofinancement',
      availableBudgetFcfa: 1500000,
      hasPassport6MonthsValid: true,
      hasPreviousRefusal: false,
    },
    expectedOutcome: 'Generates factual_inconsistency finding, pillar5 action_requise, no false blocker',
  });

  // 92. Études in France + 0 travelDurationDays
  list.push({
    id: id++,
    category: 'Contradictory Profiles',
    name: 'EDGE-Student-ZeroDuration',
    payload: {
      destination: 'France',
      visaReason: 'etudes',
      countryOfOrigin: 'Côte d’Ivoire',
      status: 'etudiant',
      targetMajorAbroad: 'Master Informatique',
      accommodationType: 'campus',
      travelDurationDays: 0,
      fundingSource: 'autofinancement',
      hasAviBlockedAccount: true,
      hasPassport6MonthsValid: true,
      hasPreviousRefusal: false,
    },
    expectedOutcome: 'NO blocker, zero duration flagged as missing, defaults safely handled',
  });

  // 93. High duration tourism without exceeding threshold (89 days)
  list.push({
    id: id++,
    category: 'Contradictory Profiles',
    name: 'EDGE-Tourism-89DaysBorderline',
    payload: {
      destination: 'France',
      visaReason: 'tourisme_visite',
      countryOfOrigin: 'Sénégal',
      status: 'salarie_prive',
      accommodationType: 'hotel',
      travelDurationDays: 89,
      fundingSource: 'autofinancement',
      availableBudgetFcfa: 6000000, // 89 * 65 * 655.957 ~ 3,794,711 FCFA
      hasPassport6MonthsValid: true,
      hasPreviousRefusal: false,
    },
    expectedOutcome: 'No stay duration violation (89 <= 90), budget compliant',
  });

  // 94. Exact boundary stay duration (90 days)
  list.push({
    id: id++,
    category: 'Contradictory Profiles',
    name: 'EDGE-Tourism-90DaysExact',
    payload: {
      destination: 'France',
      visaReason: 'tourisme_visite',
      countryOfOrigin: 'Sénégal',
      status: 'salarie_prive',
      accommodationType: 'hotel',
      travelDurationDays: 90,
      fundingSource: 'autofinancement',
      availableBudgetFcfa: 6000000,
      hasPassport6MonthsValid: true,
      hasPreviousRefusal: false,
    },
    expectedOutcome: 'No stay duration violation (90 <= 90), boundary condition handled safely',
  });

  // 95. Stay duration 91 days (1 day over short-stay maximum)
  list.push({
    id: id++,
    category: 'Contradictory Profiles',
    name: 'EDGE-Tourism-91DaysViolation',
    payload: {
      destination: 'France',
      visaReason: 'tourisme_visite',
      countryOfOrigin: 'Sénégal',
      status: 'salarie_prive',
      accommodationType: 'hotel',
      travelDurationDays: 91,
      fundingSource: 'autofinancement',
      availableBudgetFcfa: 6000000,
      hasPassport6MonthsValid: true,
      hasPreviousRefusal: false,
    },
    expectedOutcome: 'Direct blocker generated for stay duration exceeding 90 days',
  });

  // 96. Unknown destination without verified rules in database
  list.push({
    id: id++,
    category: 'Contradictory Profiles',
    name: 'EDGE-UnknownDestination-Japan',
    payload: {
      destination: 'Japon',
      visaReason: 'tourisme_visite',
      countryOfOrigin: 'Sénégal',
      status: 'salarie_prive',
      accommodationType: 'hotel',
      travelDurationDays: 14,
      fundingSource: 'autofinancement',
      availableBudgetFcfa: 2000000,
      hasPassport6MonthsValid: true,
      hasPreviousRefusal: false,
    },
    expectedOutcome: 'NO blocker, insufficient_information for unverified country rule in local database',
  });

  // 97. Medical reason visa in France
  list.push({
    id: id++,
    category: 'Contradictory Profiles',
    name: 'EDGE-MedicalTreatment',
    payload: {
      destination: 'France',
      visaReason: 'soins_medicaux',
      countryOfOrigin: 'Sénégal',
      status: 'salarie_prive',
      accommodationType: 'hotel',
      travelDurationDays: 15,
      fundingSource: 'autofinancement',
      availableBudgetFcfa: 3000000,
      hasPassport6MonthsValid: true,
      hasPreviousRefusal: false,
    },
    expectedOutcome: 'No blocker, resolves short-stay stay duration rule, compliant budget',
  });

  // 98. Extreme budget overflow (1 billion FCFA)
  list.push({
    id: id++,
    category: 'Contradictory Profiles',
    name: 'EDGE-ExtremeBudget',
    payload: {
      destination: 'France',
      visaReason: 'tourisme_visite',
      countryOfOrigin: 'Sénégal',
      status: 'entrepreneur',
      hasRccmNif: true,
      accommodationType: 'hotel',
      travelDurationDays: 15,
      fundingSource: 'autofinancement',
      availableBudgetFcfa: 1000000000,
      hasPassport6MonthsValid: true,
      hasPreviousRefusal: false,
    },
    expectedOutcome: 'Compliant financial sufficiency, arithmetically stable, no integer overflow',
  });

  // 99. Negative budget declared (adversarial input)
  list.push({
    id: id++,
    category: 'Contradictory Profiles',
    name: 'EDGE-NegativeBudget',
    payload: {
      destination: 'France',
      visaReason: 'tourisme_visite',
      countryOfOrigin: 'Sénégal',
      status: 'salarie_prive',
      accommodationType: 'hotel',
      travelDurationDays: 15,
      fundingSource: 'autofinancement',
      availableBudgetFcfa: -50000,
      hasPassport6MonthsValid: true,
      hasPreviousRefusal: false,
    },
    expectedOutcome: 'Detected as deficit below required threshold (< totalRequiredFcfa)',
  });

  // 100. Simultaneous adversarial combination:
  // Missing budget + Passport < 6 mo + Previous refusal without reason + Morocco Ivorian > 30 days
  list.push({
    id: id++,
    category: 'Contradictory Profiles',
    name: 'EDGE-AdversarialCombo-AllEdgeCases',
    payload: {
      destination: 'Maroc',
      visaReason: 'tourisme_visite',
      countryOfOrigin: 'Côte d’Ivoire',
      status: 'entrepreneur',
      hasRccmNif: false,
      accommodationType: 'hotel',
      travelDurationDays: 35, // Exceeds Ivorian 30d limit!
      fundingSource: 'autofinancement',
      availableBudgetFcfa: undefined, // Missing budget -> must NOT be blocker!
      hasPassport6MonthsValid: false, // < 6 mo -> must NOT be blocker!
      hasPreviousRefusal: true,
      previousRefusalReason: undefined, // Missing refusal reason -> must NOT be blocker!
    },
    expectedOutcome: 'Single blocker for stay duration (35 > 30), all missing/clarification items non-blocking',
  });

  // ==========================================================================
  // EXTENSION V2.3.0 : VALIDATION DÉTERMINISTE DES RÈGLES P1
  // ==========================================================================

  // 101. Canada Student, missing tuition declaration (Mandatory P1 Test)
  list.push({
    id: id++,
    category: 'Canada Studies',
    name: 'CA-STUDENT-TUITION-MISSING',
    payload: {
      destination: 'Canada',
      visaReason: 'etudes',
      countryOfOrigin: 'Sénégal',
      status: 'etudiant',
      targetMajorAbroad: 'Maîtrise Informatique',
      accommodationType: 'campus',
      travelDurationDays: 365,
      fundingSource: 'autofinancement',
      availableBudgetFcfa: 10000000,
      declaredFirstYearTuitionCad: undefined,
      hasPassport6MonthsValid: true,
      hasPreviousRefusal: false,
    },
    expectedOutcome: 'NO blocker, insufficient_information finding for undeclared tuition, compliant LICO',
  });

  // 102. Canada Student, compliant tuition and LICO (Mandatory P1 Test)
  list.push({
    id: id++,
    category: 'Canada Studies',
    name: 'CA-STUDENT-TUITION-COMPLIANT',
    payload: {
      destination: 'Canada',
      visaReason: 'etudes',
      countryOfOrigin: 'Sénégal',
      status: 'etudiant',
      targetMajorAbroad: 'Maîtrise Informatique',
      accommodationType: 'campus',
      travelDurationDays: 365,
      fundingSource: 'autofinancement',
      availableBudgetFcfa: 18000000, // Covers (20635 + 15000) * 445 = ~15 857 575 FCFA
      declaredFirstYearTuitionCad: 15000,
      hasPassport6MonthsValid: true,
      hasPreviousRefusal: false,
    },
    expectedOutcome: 'NO blocker, favorable_evidence for fully covered LICO + tuition requirements',
  });

  // 103. Canada Student, tuition arithmetic deficit (Mandatory P1 Test)
  list.push({
    id: id++,
    category: 'Canada Studies',
    name: 'CA-STUDENT-TUITION-DEFICIT',
    payload: {
      destination: 'Canada',
      visaReason: 'etudes',
      countryOfOrigin: 'Sénégal',
      status: 'etudiant',
      targetMajorAbroad: 'Maîtrise Informatique',
      accommodationType: 'campus',
      travelDurationDays: 365,
      fundingSource: 'autofinancement',
      availableBudgetFcfa: 12000000, // Exceeds LICO (~9.18M) but deficit on (20635 + 15000) * 445 (~15.86M)
      declaredFirstYearTuitionCad: 15000,
      hasPassport6MonthsValid: true,
      hasPreviousRefusal: false,
    },
    expectedOutcome: 'Direct blocker (compliance_issue) for arithmetic deficit against combined LICO + tuition',
  });

  // 104. Canada Student, missing PAL declaration (Mandatory P1 Test)
  list.push({
    id: id++,
    category: 'Canada Studies',
    name: 'CA-STUDENT-PAL-MISSING',
    payload: {
      destination: 'Canada',
      visaReason: 'etudes',
      countryOfOrigin: 'Côte d’Ivoire',
      status: 'etudiant',
      targetMajorAbroad: 'Baccalauréat Économie',
      accommodationType: 'campus',
      travelDurationDays: 365,
      fundingSource: 'autofinancement',
      availableBudgetFcfa: 12000000,
      hasProvincialAttestationLetter: undefined,
      hasPassport6MonthsValid: true,
      hasPreviousRefusal: false,
    },
    expectedOutcome: 'NO blocker, insufficient_information for undeclared PAL status',
  });

  // 105. Canada Student, PAL declared absent (Mandatory P1 Test)
  list.push({
    id: id++,
    category: 'Canada Studies',
    name: 'CA-STUDENT-PAL-FALSE',
    payload: {
      destination: 'Canada',
      visaReason: 'etudes',
      countryOfOrigin: 'Côte d’Ivoire',
      status: 'etudiant',
      targetMajorAbroad: 'Baccalauréat Économie',
      accommodationType: 'campus',
      travelDurationDays: 365,
      fundingSource: 'autofinancement',
      availableBudgetFcfa: 12000000,
      hasProvincialAttestationLetter: false,
      hasPassport6MonthsValid: true,
      hasPreviousRefusal: false,
    },
    expectedOutcome: 'NO blocker, evidence_gap for missing PAL document, preparation-oriented guidance',
  });

  // 106. Canada Student, PAL declared present (Mandatory P1 Test)
  list.push({
    id: id++,
    category: 'Canada Studies',
    name: 'CA-STUDENT-PAL-TRUE',
    payload: {
      destination: 'Canada',
      visaReason: 'etudes',
      countryOfOrigin: 'Côte d’Ivoire',
      status: 'etudiant',
      targetMajorAbroad: 'Baccalauréat Économie',
      accommodationType: 'campus',
      travelDurationDays: 365,
      fundingSource: 'autofinancement',
      availableBudgetFcfa: 12000000,
      hasProvincialAttestationLetter: true,
      hasPassport6MonthsValid: true,
      hasPreviousRefusal: false,
    },
    expectedOutcome: 'NO blocker, favorable_evidence confirming administrative admissibility compliance',
  });

  // 107. France Tourism, missing insurance declaration (Mandatory P1 Test)
  list.push({
    id: id++,
    category: 'France Tourism',
    name: 'FR-TOUR-INSURANCE-MISSING',
    payload: {
      destination: 'France',
      visaReason: 'tourisme_visite',
      countryOfOrigin: 'Sénégal',
      status: 'salarie',
      accommodationType: 'hotel',
      travelDurationDays: 14,
      fundingSource: 'autofinancement',
      availableBudgetFcfa: 2000000,
      hasTravelInsurance: undefined,
      hasPassport6MonthsValid: true,
      hasPreviousRefusal: false,
    },
    expectedOutcome: 'NO blocker, insufficient_information for undeclared travel insurance',
  });

  // 108. France Tourism, insurance absent (Mandatory P1 Test)
  list.push({
    id: id++,
    category: 'France Tourism',
    name: 'FR-TOUR-INSURANCE-NONE',
    payload: {
      destination: 'France',
      visaReason: 'tourisme_visite',
      countryOfOrigin: 'Sénégal',
      status: 'salarie',
      accommodationType: 'hotel',
      travelDurationDays: 14,
      fundingSource: 'autofinancement',
      availableBudgetFcfa: 2000000,
      hasTravelInsurance: false,
      hasPassport6MonthsValid: true,
      hasPreviousRefusal: false,
    },
    expectedOutcome: 'NO blocker, evidence_gap for mandatory 30,000 EUR insurance, no refusal prediction',
  });

  // 109. France Tourism, insurance coverage below 30,000 EUR (Mandatory P1 Test)
  list.push({
    id: id++,
    category: 'France Tourism',
    name: 'FR-TOUR-INSURANCE-25000',
    payload: {
      destination: 'France',
      visaReason: 'tourisme_visite',
      countryOfOrigin: 'Sénégal',
      status: 'salarie',
      accommodationType: 'hotel',
      travelDurationDays: 14,
      fundingSource: 'autofinancement',
      availableBudgetFcfa: 2000000,
      hasTravelInsurance: true,
      travelInsuranceCoverageEur: 25000,
      hasPassport6MonthsValid: true,
      hasPreviousRefusal: false,
    },
    expectedOutcome: 'NO blocker, evidence_gap for coverage deficit (< 30,000 EUR), no compliance_issue',
  });

  // 110. France Tourism, compliant insurance coverage >= 30,000 EUR (Mandatory P1 Test)
  list.push({
    id: id++,
    category: 'France Tourism',
    name: 'FR-TOUR-INSURANCE-30000',
    payload: {
      destination: 'France',
      visaReason: 'tourisme_visite',
      countryOfOrigin: 'Sénégal',
      status: 'salarie',
      accommodationType: 'hotel',
      travelDurationDays: 14,
      fundingSource: 'autofinancement',
      availableBudgetFcfa: 2000000,
      hasTravelInsurance: true,
      travelInsuranceCoverageEur: 30000,
      hasPassport6MonthsValid: true,
      hasPreviousRefusal: false,
    },
    expectedOutcome: 'NO blocker, favorable_evidence for fully compliant 30,000 EUR travel insurance',
  });

  // Group 11-16: Append additional 90 scenarios (111-200) for Mission V2.3.7 200-scenario audit
  const additional = generateAdditionalAdversarialScenarios(id);
  list.push(...additional);

  return list;
}

export const generate200Scenarios = generate100Scenarios;

// ============================================================================
// TEST HARNESS & INVARIANT AUDITOR
// ============================================================================

export function runAdversarialValidationSuite(): {
  results: ScenarioResult[];
  failuresCount: number;
  invariantsReport: Record<string, { tested: number; failed: number; violations: string[] }>;
} {
  const scenarios = generate100Scenarios();
  const results: ScenarioResult[] = [];
  let failuresCount = 0;

  const invariantsReport: Record<string, { tested: number; failed: number; violations: string[] }> = {
    'Invariant A (Missing budget never generates blocker)': { tested: 0, failed: 0, violations: [] },
    'Invariant B (Passport < 6 mo never generates blocker)': { tested: 0, failed: 0, violations: [] },
    'Invariant C (Morocco nationality resolution)': { tested: 0, failed: 0, violations: [] },
    'Invariant D (Canada student consumes verified 2024 rule)': { tested: 0, failed: 0, violations: [] },
    'Invariant E (Unverified rules never create compliance_issue)': { tested: 0, failed: 0, violations: [] },
    'Invariant F (Missing info never becomes blocker)': { tested: 0, failed: 0, violations: [] },
    'Invariant G (clarification_point is never isDirectBlocker)': { tested: 0, failed: 0, violations: [] },
    'Invariant H (evidence_gap is never isDirectBlocker)': { tested: 0, failed: 0, violations: [] },
    'Invariant I (Audit chain completeness)': { tested: 0, failed: 0, violations: [] },
    'Invariant J (topPriorities <= 3 items)': { tested: 0, failed: 0, violations: [] },
    'Invariant K (Missing tuition amount never creates blocker)': { tested: 0, failed: 0, violations: [] },
    'Invariant L (Missing PAL never creates blocker)': { tested: 0, failed: 0, violations: [] },
    'Invariant M (Missing insurance declaration never creates blocker)': { tested: 0, failed: 0, violations: [] },
    'Invariant N (Insurance < 30000 EUR never creates compliance_issue)': { tested: 0, failed: 0, violations: [] },
    'Invariant O (PAL absence never creates compliance_issue)': { tested: 0, failed: 0, violations: [] },
    'Invariant P (Only arithmetic tuition deficit may create blocker)': { tested: 0, failed: 0, violations: [] },
  };

  for (const sc of scenarios) {
    const assessment = evaluateConsularProfile(sc.payload, `sc-${sc.id}`);
    const allFindings = Object.values(assessment.pillars).flatMap((p) => p.findings);
    const blockers = allFindings.filter((f) => f.isDirectBlocker);
    const failureReasons: string[] = [];

    const pillarStatuses: Record<ConsularPillarId, string> = {
      legal_admissibility: assessment.pillars.legal_admissibility.status,
      financial_sufficiency: assessment.pillars.financial_sufficiency.status,
      financial_provenance: assessment.pillars.financial_provenance.status,
      purpose_and_logistics: assessment.pillars.purpose_and_logistics.status,
      ties_and_anchors: assessment.pillars.ties_and_anchors.status,
    };

    // Extract official rules referenced
    const rulesConsumed = Array.from(
      new Set(allFindings.map((f) => f.sourceRuleId).filter((r): r is string => Boolean(r)))
    );

    // -------------------------------------------------------------
    // AUDIT INVARIANT A: Missing budget must NEVER generate a blocker
    // -------------------------------------------------------------
    if (sc.payload.fundingSource === 'autofinancement' && (sc.payload.availableBudgetFcfa === undefined || sc.payload.availableBudgetFcfa === null)) {
      invariantsReport['Invariant A (Missing budget never generates blocker)'].tested++;
      const budgetFindings = allFindings.filter((f) =>
        f.pillarId === 'financial_sufficiency' &&
        (f.id.includes('BUDGET-UNDECLARED') || f.id.includes('SUFFICIENCY-BELOW-THRESHOLD'))
      );
      const falseBudgetBlocker = budgetFindings.find((f) => f.isDirectBlocker);
      if (falseBudgetBlocker) {
        const msg = `Scenario ${sc.id} (${sc.name}): Budget is missing but blocker ${falseBudgetBlocker.id} was generated!`;
        failureReasons.push(msg);
        invariantsReport['Invariant A (Missing budget never generates blocker)'].failed++;
        invariantsReport['Invariant A (Missing budget never generates blocker)'].violations.push(msg);
      }
    }

    // -------------------------------------------------------------
    // AUDIT INVARIANT B: Passport < 6 mo must NEVER generate a blocker
    // -------------------------------------------------------------
    if (sc.payload.hasPassport6MonthsValid === false) {
      invariantsReport['Invariant B (Passport < 6 mo never generates blocker)'].tested++;
      const passportBlockers = allFindings.filter(
        (f) => f.pillarId === 'legal_admissibility' && f.id.includes('PASSPORT') && f.isDirectBlocker
      );
      if (passportBlockers.length > 0) {
        const msg = `Scenario ${sc.id} (${sc.name}): hasPassport6MonthsValid = false generated direct blocker ${passportBlockers[0].id}!`;
        failureReasons.push(msg);
        invariantsReport['Invariant B (Passport < 6 mo never generates blocker)'].failed++;
        invariantsReport['Invariant B (Passport < 6 mo never generates blocker)'].violations.push(msg);
      }
    }

    // -------------------------------------------------------------
    // AUDIT INVARIANT C: Morocco nationality rules
    // -------------------------------------------------------------
    if ((sc.payload.destination || '').toLowerCase().includes('maroc')) {
      invariantsReport['Invariant C (Morocco nationality resolution)'].tested++;
      const nat = (sc.payload.countryOfOrigin || '').toLowerCase();
      if (nat.includes('ivoire') || nat.includes('ci')) {
        const hasWrongExemption = rulesConsumed.includes('RULE-MA-EXEMPTION-90D');
        if (hasWrongExemption) {
          const msg = `Scenario ${sc.id} (${sc.name}): Ivorian nationality erroneously consumed 90-day bilateral exemption RULE-MA-EXEMPTION-90D!`;
          failureReasons.push(msg);
          invariantsReport['Invariant C (Morocco nationality resolution)'].failed++;
          invariantsReport['Invariant C (Morocco nationality resolution)'].violations.push(msg);
        }
      }
      if (nat.includes('cameroun') || nat.includes('congo') || nat.includes('gabon')) {
        const hasWrongExemption = rulesConsumed.includes('RULE-MA-EXEMPTION-90D');
        if (hasWrongExemption) {
          const msg = `Scenario ${sc.id} (${sc.name}): Excluded nationality (${sc.payload.countryOfOrigin}) consumed RULE-MA-EXEMPTION-90D!`;
          failureReasons.push(msg);
          invariantsReport['Invariant C (Morocco nationality resolution)'].failed++;
          invariantsReport['Invariant C (Morocco nationality resolution)'].violations.push(msg);
        }
      }
    }

    // -------------------------------------------------------------
    // AUDIT INVARIANT D: Canada student profiles must consume RULE-CA-STUDENT-LICO-2024
    // -------------------------------------------------------------
    if ((sc.payload.destination || '').toLowerCase().includes('canada') && sc.payload.visaReason === 'etudes') {
      invariantsReport['Invariant D (Canada student consumes verified 2024 rule)'].tested++;
      const usedVerified = rulesConsumed.includes('RULE-CA-STUDENT-LICO-2024');
      const usedUnverified = rulesConsumed.includes('RULE-CA-STUDENT-2026-INDEXED');
      if (usedUnverified) {
        const msg = `Scenario ${sc.id} (${sc.name}): Consumed unverified RULE-CA-STUDENT-2026-INDEXED as rule source!`;
        failureReasons.push(msg);
        invariantsReport['Invariant D (Canada student consumes verified 2024 rule)'].failed++;
        invariantsReport['Invariant D (Canada student consumes verified 2024 rule)'].violations.push(msg);
      }
      // If student has financial check, it should reference RULE-CA-STUDENT-LICO-2024
      if (sc.payload.fundingSource === 'autofinancement' && !usedVerified) {
        const msg = `Scenario ${sc.id} (${sc.name}): Failed to consume verified RULE-CA-STUDENT-LICO-2024!`;
        failureReasons.push(msg);
        invariantsReport['Invariant D (Canada student consumes verified 2024 rule)'].failed++;
        invariantsReport['Invariant D (Canada student consumes verified 2024 rule)'].violations.push(msg);
      }
    }

    // -------------------------------------------------------------
    // AUDIT INVARIANT E: Unverified rules must NEVER create compliance_issue
    // -------------------------------------------------------------
    invariantsReport['Invariant E (Unverified rules never create compliance_issue)'].tested++;
    for (const f of allFindings) {
      if (f.type === 'compliance_issue' && f.sourceRuleId) {
        const matchedRule = OFFICIAL_CONSULAR_RULES.find((r) => r.id === f.sourceRuleId);
        if (matchedRule && matchedRule.isFullyVerified === false) {
          const msg = `Scenario ${sc.id} (${sc.name}): Finding ${f.id} of type compliance_issue is backed by unverified rule ${f.sourceRuleId}!`;
          failureReasons.push(msg);
          invariantsReport['Invariant E (Unverified rules never create compliance_issue)'].failed++;
          invariantsReport['Invariant E (Unverified rules never create compliance_issue)'].violations.push(msg);
        }
      }
    }

    // -------------------------------------------------------------
    // AUDIT INVARIANT F: Missing information must NEVER become a blocker
    // -------------------------------------------------------------
    invariantsReport['Invariant F (Missing info never becomes blocker)'].tested++;
    for (const f of allFindings) {
      if (f.type === 'insufficient_information' && f.isDirectBlocker) {
        const msg = `Scenario ${sc.id} (${sc.name}): Finding ${f.id} of type insufficient_information has isDirectBlocker = true!`;
        failureReasons.push(msg);
        invariantsReport['Invariant F (Missing info never becomes blocker)'].failed++;
        invariantsReport['Invariant F (Missing info never becomes blocker)'].violations.push(msg);
      }
    }

    // -------------------------------------------------------------
    // AUDIT INVARIANT G: No clarification_point may ever have isDirectBlocker=true
    // -------------------------------------------------------------
    invariantsReport['Invariant G (clarification_point is never isDirectBlocker)'].tested++;
    for (const f of allFindings) {
      if (f.type === 'clarification_point' && f.isDirectBlocker) {
        const msg = `Scenario ${sc.id} (${sc.name}): Finding ${f.id} of type clarification_point has isDirectBlocker = true!`;
        failureReasons.push(msg);
        invariantsReport['Invariant G (clarification_point is never isDirectBlocker)'].failed++;
        invariantsReport['Invariant G (clarification_point is never isDirectBlocker)'].violations.push(msg);
      }
    }

    // -------------------------------------------------------------
    // AUDIT INVARIANT H: No evidence_gap may ever have isDirectBlocker=true
    // -------------------------------------------------------------
    invariantsReport['Invariant H (evidence_gap is never isDirectBlocker)'].tested++;
    for (const f of allFindings) {
      if (f.type === 'evidence_gap' && f.isDirectBlocker) {
        const msg = `Scenario ${sc.id} (${sc.name}): Finding ${f.id} of type evidence_gap has isDirectBlocker = true!`;
        failureReasons.push(msg);
        invariantsReport['Invariant H (evidence_gap is never isDirectBlocker)'].failed++;
        invariantsReport['Invariant H (evidence_gap is never isDirectBlocker)'].violations.push(msg);
      }
    }

    // -------------------------------------------------------------
    // AUDIT INVARIANT I: Audit chain completeness: FACT -> RATIONALE
    // -------------------------------------------------------------
    invariantsReport['Invariant I (Audit chain completeness)'].tested++;
    for (const f of allFindings) {
      if (!f.declaredFact || f.declaredFact.trim().length === 0) {
        const msg = `Scenario ${sc.id} (${sc.name}): Finding ${f.id} missing declaredFact!`;
        failureReasons.push(msg);
        invariantsReport['Invariant I (Audit chain completeness)'].failed++;
        invariantsReport['Invariant I (Audit chain completeness)'].violations.push(msg);
      }
      if (!f.findingRationale || f.findingRationale.trim().length === 0) {
        const msg = `Scenario ${sc.id} (${sc.name}): Finding ${f.id} missing findingRationale!`;
        failureReasons.push(msg);
        invariantsReport['Invariant I (Audit chain completeness)'].failed++;
        invariantsReport['Invariant I (Audit chain completeness)'].violations.push(msg);
      }
    }

    // -------------------------------------------------------------
    // AUDIT INVARIANT J: topPriorities must never exceed 3 items
    // -------------------------------------------------------------
    invariantsReport['Invariant J (topPriorities <= 3 items)'].tested++;
    if (assessment.topPriorities.length > 3) {
      const msg = `Scenario ${sc.id} (${sc.name}): topPriorities has ${assessment.topPriorities.length} items (max 3 allowed)!`;
      failureReasons.push(msg);
      invariantsReport['Invariant J (topPriorities <= 3 items)'].failed++;
      invariantsReport['Invariant J (topPriorities <= 3 items)'].violations.push(msg);
    }

    // -------------------------------------------------------------
    // AUDIT INVARIANT K: Missing tuition amount never creates blocker
    // -------------------------------------------------------------
    if (
      (sc.payload.destination || '').toLowerCase().includes('canada') &&
      sc.payload.visaReason === 'etudes' &&
      (sc.payload.declaredFirstYearTuitionCad === undefined || sc.payload.declaredFirstYearTuitionCad === null)
    ) {
      invariantsReport['Invariant K (Missing tuition amount never creates blocker)'].tested++;
      const tuitionBlocker = allFindings.find(
        (f) => f.id.includes('TUITION') && f.isDirectBlocker
      );
      if (tuitionBlocker) {
        const msg = `Scenario ${sc.id} (${sc.name}): Missing tuition generated direct blocker ${tuitionBlocker.id}!`;
        failureReasons.push(msg);
        invariantsReport['Invariant K (Missing tuition amount never creates blocker)'].failed++;
        invariantsReport['Invariant K (Missing tuition amount never creates blocker)'].violations.push(msg);
      }
    }

    // -------------------------------------------------------------
    // AUDIT INVARIANT L: Missing PAL never creates blocker
    // -------------------------------------------------------------
    if (
      (sc.payload.destination || '').toLowerCase().includes('canada') &&
      sc.payload.visaReason === 'etudes' &&
      (sc.payload.hasProvincialAttestationLetter === undefined || sc.payload.hasProvincialAttestationLetter === null)
    ) {
      invariantsReport['Invariant L (Missing PAL never creates blocker)'].tested++;
      const palBlocker = allFindings.find((f) => f.id.includes('PAL') && f.isDirectBlocker);
      if (palBlocker) {
        const msg = `Scenario ${sc.id} (${sc.name}): Missing PAL generated direct blocker ${palBlocker.id}!`;
        failureReasons.push(msg);
        invariantsReport['Invariant L (Missing PAL never creates blocker)'].failed++;
        invariantsReport['Invariant L (Missing PAL never creates blocker)'].violations.push(msg);
      }
    }

    // -------------------------------------------------------------
    // AUDIT INVARIANT M: Missing insurance declaration never creates blocker
    // -------------------------------------------------------------
    if (
      (sc.payload.destination || '').toLowerCase().includes('france') &&
      sc.payload.visaReason !== 'etudes' &&
      (sc.payload.hasTravelInsurance === undefined || sc.payload.hasTravelInsurance === null)
    ) {
      invariantsReport['Invariant M (Missing insurance declaration never creates blocker)'].tested++;
      const insBlocker = allFindings.find((f) => f.id.includes('INSURANCE') && f.isDirectBlocker);
      if (insBlocker) {
        const msg = `Scenario ${sc.id} (${sc.name}): Missing insurance generated direct blocker ${insBlocker.id}!`;
        failureReasons.push(msg);
        invariantsReport['Invariant M (Missing insurance declaration never creates blocker)'].failed++;
        invariantsReport['Invariant M (Missing insurance declaration never creates blocker)'].violations.push(msg);
      }
    }

    // -------------------------------------------------------------
    // AUDIT INVARIANT N: Insurance < 30000 EUR never creates compliance_issue
    // -------------------------------------------------------------
    if (
      (sc.payload.destination || '').toLowerCase().includes('france') &&
      (sc.payload.hasTravelInsurance === false ||
        (sc.payload.hasTravelInsurance === true &&
          (sc.payload.travelInsuranceCoverageEur === undefined || sc.payload.travelInsuranceCoverageEur < 30000)))
    ) {
      invariantsReport['Invariant N (Insurance < 30000 EUR never creates compliance_issue)'].tested++;
      const insCompliance = allFindings.find(
        (f) => f.id.includes('INSURANCE') && f.type === 'compliance_issue'
      );
      if (insCompliance) {
        const msg = `Scenario ${sc.id} (${sc.name}): Insurance deficiency created compliance_issue ${insCompliance.id}!`;
        failureReasons.push(msg);
        invariantsReport['Invariant N (Insurance < 30000 EUR never creates compliance_issue)'].failed++;
        invariantsReport['Invariant N (Insurance < 30000 EUR never creates compliance_issue)'].violations.push(msg);
      }
    }

    // -------------------------------------------------------------
    // AUDIT INVARIANT O: PAL absence never creates compliance_issue
    // -------------------------------------------------------------
    if (sc.payload.hasProvincialAttestationLetter === false) {
      invariantsReport['Invariant O (PAL absence never creates compliance_issue)'].tested++;
      const palCompliance = allFindings.find(
        (f) => f.id.includes('PAL') && f.type === 'compliance_issue'
      );
      if (palCompliance) {
        const msg = `Scenario ${sc.id} (${sc.name}): PAL absence created compliance_issue ${palCompliance.id}!`;
        failureReasons.push(msg);
        invariantsReport['Invariant O (PAL absence never creates compliance_issue)'].failed++;
        invariantsReport['Invariant O (PAL absence never creates compliance_issue)'].violations.push(msg);
      }
    }

    // -------------------------------------------------------------
    // AUDIT INVARIANT P: Only arithmetic tuition deficit may create blocker
    // -------------------------------------------------------------
    if (
      (sc.payload.destination || '').toLowerCase().includes('canada') &&
      sc.payload.visaReason === 'etudes' &&
      sc.payload.fundingSource === 'autofinancement'
    ) {
      invariantsReport['Invariant P (Only arithmetic tuition deficit may create blocker)'].tested++;
      const tuitionCad = sc.payload.declaredFirstYearTuitionCad;
      const budget = sc.payload.availableBudgetFcfa;
      const totalReqFcfa = Math.round((20635 + (tuitionCad || 0)) * 445);

      const hasDeficitBlocker = allFindings.some(
        (f) => f.id === 'FIND-CA-STUDENT-BUDGET-DEFICIT' && f.isDirectBlocker
      );

      if (budget !== undefined && budget >= totalReqFcfa && hasDeficitBlocker) {
        const msg = `Scenario ${sc.id} (${sc.name}): Budget covers total requirements but deficit blocker was generated!`;
        failureReasons.push(msg);
        invariantsReport['Invariant P (Only arithmetic tuition deficit may create blocker)'].failed++;
        invariantsReport['Invariant P (Only arithmetic tuition deficit may create blocker)'].violations.push(msg);
      }
    }

    const passed = failureReasons.length === 0;
    if (!passed) failuresCount++;

    results.push({
      scenarioId: sc.id,
      category: sc.category,
      name: sc.name,
      payloadSummary: `dest:${sc.payload.destination || 'none'}, reason:${sc.payload.visaReason || 'none'}, origin:${sc.payload.countryOfOrigin || 'none'}, status:${sc.payload.status || 'none'}, funding:${sc.payload.fundingSource || 'none'}, budget:${sc.payload.availableBudgetFcfa ?? 'undef'}`,
      rulesConsumed,
      findingsCount: allFindings.length,
      blockersCount: blockers.length,
      pillarStatuses,
      topPrioritiesCount: assessment.topPriorities.length,
      dataCompleteness: assessment.meta.dataCompleteness,
      assessmentConfidence: assessment.meta.assessmentConfidence,
      expectedOutcome: sc.expectedOutcome,
      actualOutcome: passed
        ? `PASSED - ${blockers.length} blockers, ${allFindings.length} findings, ${assessment.topPriorities.length} priorities, completeness:${assessment.meta.dataCompleteness}`
        : `FAILED: ${failureReasons.join('; ')}`,
      passed,
      failureReasons,
    });
  }

  return { results, failuresCount, invariantsReport };
}

// CLI entry point
if (process.argv[1]?.includes('adversarialSuite')) {
  console.log('Running Adversarial Scenarios against Consular Assessment Engine...\n');
  const { results, failuresCount, invariantsReport } = runAdversarialValidationSuite();

  console.log('=== INVARIANT AUDIT REPORT ===');
  for (const [inv, stat] of Object.entries(invariantsReport)) {
    const status = stat.failed === 0 ? 'PASSED' : `FAILED (${stat.failed} violations)`;
    console.log(`[${status}] ${inv} - Tested ${stat.tested} times`);
    if (stat.violations.length > 0) {
      stat.violations.slice(0, 3).forEach((v) => console.log(`   * ${v}`));
    }
  }

  console.log(`\n=== SCENARIOS SUMMARY: ${results.length - failuresCount}/${results.length} PASSED ===`);
  if (failuresCount > 0) {
    console.error(`TOTAL FAILURES: ${failuresCount}`);
    process.exit(1);
  } else {
    console.log(`ALL ${results.length} SCENARIOS PASSED WITH ZERO FAILURES AND ZERO INVARIANT VIOLATIONS.`);
  }
}
