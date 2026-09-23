import { AdversarialScenario } from './adversarialSuite';

/**
 * Builds scenarios 111 to 200 (90 additional scenarios)
 * to achieve the 200-scenario adversarial audit required by Mission V2.3.7.
 */
export function generateAdditionalAdversarialScenarios(startId: number = 111): AdversarialScenario[] {
  const list: AdversarialScenario[] = [];
  let id = startId;

  // -------------------------------------------------------------
  // Group 11: Canada Study Permit Advanced Variants (Scenarios 111-125)
  // -------------------------------------------------------------
  const destinationsCanada = ['Canada'];
  const originsAfrica = ['Sénégal', 'Côte d\'Ivoire', 'Cameroun', 'Mali', 'Bénin', 'Togo'];

  for (let i = 0; i < 15; i++) {
    const origin = originsAfrica[i % originsAfrica.length];
    const tuition = 12000 + i * 1500;
    // Calculate safe budget: (20635 + tuition) * 445 + extra buffer
    const safeBudget = Math.round((20635 + tuition) * 445) + (i % 2 === 0 ? 3000000 : 5000000);

    list.push({
      id: id++,
      category: 'Canada Study In-Depth',
      name: `CA-STUDENT-COMPLIANT-VAR-${i + 1}`,
      payload: {
        destination: 'Canada',
        visaReason: 'etudes',
        countryOfOrigin: origin,
        status: 'etudiant',
        fundingSource: 'autofinancement',
        availableBudgetFcfa: safeBudget,
        declaredFirstYearTuitionCad: tuition,
        hasPassport6MonthsValid: true,
        hasPreviousRefusal: false,
        hasProvincialAttestationLetter: true,
        studyInstitutionType: 'universite_publique',
        hasConfirmedAccommodation: true,
      },
      expectedOutcome: 'No blockers, full financial sufficiency compliance for Canada LICO 2024 + tuition',
    });
  }

  // -------------------------------------------------------------
  // Group 12: France & Schengen University & Researcher Mobility (Scenarios 126-140)
  // -------------------------------------------------------------
  const schengenDests = ['France', 'Allemagne', 'Espagne', 'Italie', 'Belgique'];

  for (let i = 0; i < 15; i++) {
    const dest = schengenDests[i % schengenDests.length];
    const origin = originsAfrica[i % originsAfrica.length];
    const isScholarship = i % 3 === 0;

    list.push({
      id: id++,
      category: 'Schengen Academic Mobility',
      name: `${dest.substring(0, 2).toUpperCase()}-STUDENT-SCHOLARSHIP-VAR-${i + 1}`,
      payload: {
        destination: dest,
        visaReason: 'etudes',
        countryOfOrigin: origin,
        status: 'etudiant',
        fundingSource: isScholarship ? 'bourse' : 'autofinancement',
        availableBudgetFcfa: isScholarship ? 3500000 : 7500000,
        hasPassport6MonthsValid: true,
        hasPreviousRefusal: false,
        hasTravelInsurance: true,
        travelInsuranceCoverageEur: 30000,
        accommodationType: i % 2 === 0 ? 'crous' : 'location',
        travelDurationDays: 300,
      },
      expectedOutcome: 'No blockers, compliant long-stay academic profile with full funding',
    });
  }

  // -------------------------------------------------------------
  // Group 13: Schengen Professional, Trade Delegations & Business (Scenarios 141-155)
  // -------------------------------------------------------------
  for (let i = 0; i < 15; i++) {
    const dest = schengenDests[i % schengenDests.length];
    const origin = originsAfrica[i % originsAfrica.length];

    list.push({
      id: id++,
      category: 'Schengen Business Delegations',
      name: `${dest.substring(0, 2).toUpperCase()}-BIZ-MISSION-VAR-${i + 1}`,
      payload: {
        destination: dest,
        visaReason: 'affaires_pro',
        countryOfOrigin: origin,
        status: i % 2 === 0 ? 'salarie_prive' : 'entrepreneur',
        fundingSource: 'entreprise',
        availableBudgetFcfa: 4000000 + i * 500000,
        hasPassport6MonthsValid: true,
        hasPreviousRefusal: false,
        hasTravelInsurance: true,
        travelInsuranceCoverageEur: 30000,
        travelDurationDays: 7 + (i % 10),
        accommodationType: 'hotel',
      },
      expectedOutcome: 'No blockers, compliant corporate mission with full enterprise support',
    });
  }

  // -------------------------------------------------------------
  // Group 14: Private Hospitality, Town Hall & Family Ties (Scenarios 156-170)
  // -------------------------------------------------------------
  for (let i = 0; i < 15; i++) {
    const origin = originsAfrica[i % originsAfrica.length];
    const isAttestation = i % 2 === 0;

    list.push({
      id: id++,
      category: 'France & Schengen Family Visit',
      name: `FR-FAM-VISIT-VAR-${i + 1}`,
      payload: {
        destination: 'France',
        visaReason: 'tourisme_visite',
        countryOfOrigin: origin,
        status: 'salarie_public',
        fundingSource: 'autofinancement',
        availableBudgetFcfa: 2500000 + i * 300000,
        hasPassport6MonthsValid: true,
        hasPreviousRefusal: false,
        hasTravelInsurance: true,
        travelInsuranceCoverageEur: 30000,
        travelDurationDays: 14 + (i % 14),
        accommodationType: isAttestation ? 'attestation_accueil' : 'hotel',
      },
      expectedOutcome: 'No blockers, stable public employee visiting with confirmed accommodation',
    });
  }

  // -------------------------------------------------------------
  // Group 15: Non-Blocker Missing Info Robustness Tests (Scenarios 171-185)
  // -------------------------------------------------------------
  for (let i = 0; i < 15; i++) {
    const origin = originsAfrica[i % originsAfrica.length];
    // Invariant F: Missing info must NEVER become a blocker
    list.push({
      id: id++,
      category: 'Incomplete Data Robustness',
      name: `DATA-COMPLETENESS-EDGE-${i + 1}`,
      payload: {
        destination: i % 2 === 0 ? 'France' : 'Canada',
        visaReason: i % 2 === 0 ? 'tourisme_visite' : 'etudes',
        countryOfOrigin: origin,
        status: 'salarie',
        fundingSource: 'autofinancement',
        // Omit availableBudgetFcfa to trigger Invariant A
        availableBudgetFcfa: undefined,
        // Omit travel insurance to test Invariant M
        hasTravelInsurance: undefined,
        hasPassport6MonthsValid: true,
        hasPreviousRefusal: false,
      },
      expectedOutcome: 'No blockers, completeness is flagged as incomplete, engine remains deterministic',
    });
  }

  // -------------------------------------------------------------
  // Group 16: Regulatory Edge Cases & Compliance Verifications (Scenarios 186-200)
  // -------------------------------------------------------------
  for (let i = 0; i < 15; i++) {
    const origin = originsAfrica[i % originsAfrica.length];
    const isCanada = i % 2 === 0;

    list.push({
      id: id++,
      category: 'Compliance Safety Boundaries',
      name: `REGULATORY-EDGE-${i + 1}`,
      payload: {
        destination: isCanada ? 'Canada' : 'France',
        visaReason: isCanada ? 'etudes' : 'tourisme_visite',
        countryOfOrigin: origin,
        status: 'profession_liberale',
        fundingSource: 'autofinancement',
        availableBudgetFcfa: isCanada ? 25000000 : 5000000,
        declaredFirstYearTuitionCad: isCanada ? 15000 : undefined,
        hasPassport6MonthsValid: true,
        hasPreviousRefusal: false,
        hasTravelInsurance: !isCanada ? true : undefined,
        travelInsuranceCoverageEur: !isCanada ? 30000 : undefined,
        hasProvincialAttestationLetter: isCanada ? true : undefined,
        accommodationType: 'hotel',
        travelDurationDays: isCanada ? 365 : 20,
      },
      expectedOutcome: 'Zero invariant breaches, robust regulatory compliance mapping across all pillars',
    });
  }

  return list;
}
