import { OfficialConsularRule } from '../types/assessment';

/**
 * REGISTRE DES RÈGLES OFFICIELLES CONSULAIRES (VERSIONNÉ ET AUDITABLE)
 * 
 * RÈGLE D'OR DE RIGUEUR :
 * - Une règle n'a `isFullyVerified: true` QUE si elle est rattachée à un texte légal
 *   ou réglementaire identifié (article de code, décret, directive) avec une URL précise.
 * - Si une règle ou un montant n'est pas vérifié de manière formelle et textuelle,
 *   `isFullyVerified: false` est obligatoire, empêchant toute comparaison mécanique arbitraire.
 */
export const OFFICIAL_CONSULAR_RULES: OfficialConsularRule[] = [
  // ==========================================================================
  // 1. FRANCE & ESPACE SCHENGEN — COURT SÉJOUR (TOURISME / AFFAIRES / VISITE)
  // ==========================================================================
  {
    id: 'RULE-SCHENGEN-PASSPORT-VALIDITY',
    destination: 'france',
    visaType: 'tourisme_visite',
    ruleCategory: 'passport_validity',
    ruleDescription: 'Validité minimale du document de voyage supérieure d’au moins 3 mois après la date prévue de sortie de l’espace Schengen, avec délivrance depuis moins de 10 ans.',
    effectiveFrom: '2010-04-05',
    sourceName: 'Code Communautaire des Visas (Règlement CE n° 810/2009, Art. 12) & Code Frontières Schengen (Règlement UE 2016/399, Art. 6 § 1 a)',
    sourceUrl: 'https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:32009R0810',
    verifiedAt: '2026-09-01',
    isFullyVerified: true,
  },
  {
    id: 'RULE-SCHENGEN-STAY-CAP',
    destination: 'france',
    visaType: 'tourisme_visite',
    ruleCategory: 'stay_duration',
    ruleDescription: 'Durée maximale autorisée pour un visa court séjour : 90 jours maximum sur toute période de 180 jours consécutifs.',
    amount: 90,
    unit: 'total_stay',
    effectiveFrom: '2016-03-09',
    sourceName: 'Code Frontières Schengen (Règlement UE 2016/399, Art. 6 § 1)',
    sourceUrl: 'https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:32016R0399',
    verifiedAt: '2026-09-01',
    isFullyVerified: true,
  },
  {
    id: 'RULE-FR-SUBSISTENCE-HOTEL',
    destination: 'france',
    visaType: 'tourisme_visite',
    ruleCategory: 'subsistence_threshold',
    ruleDescription: 'Montant de référence des moyens de subsistance exigés par jour de séjour en France avec une réservation hôtelière ou pré-réservation confirmée.',
    amount: 65,
    currency: 'EUR',
    unit: 'per_day',
    effectiveFrom: '2017-05-10',
    sourceName: 'CESEDA (Art. R311-3) & Arrêté ministériel du 10 mai 2017 fixant les montants de référence (NOR: INTV1700778C)',
    sourceUrl: 'https://www.service-public.fr/particuliers/vosdroits/F2190',
    verifiedAt: '2026-09-01',
    isFullyVerified: true,
  },
  {
    id: 'RULE-FR-SUBSISTENCE-ATTESTATION-ACCUEIL',
    destination: 'france',
    visaType: 'tourisme_visite',
    ruleCategory: 'subsistence_threshold',
    ruleDescription: 'Montant journalier réduit exigé lorsque le demandeur est hébergé par un particulier titulaire d’une Attestation d’Accueil officielle délivrée par la mairie.',
    amount: 32.5,
    currency: 'EUR',
    unit: 'per_day',
    effectiveFrom: '2017-05-10',
    sourceName: 'CESEDA (Art. R311-3) & Arrêté du 27 décembre 2000 / Arrêté du 10 mai 2017',
    sourceUrl: 'https://www.service-public.fr/particuliers/vosdroits/F2190',
    verifiedAt: '2026-09-01',
    isFullyVerified: true,
  },
  {
    id: 'RULE-FR-SUBSISTENCE-NO-LODGING-PROOF',
    destination: 'france',
    visaType: 'tourisme_visite',
    ruleCategory: 'subsistence_threshold',
    ruleDescription: 'Montant journalier plein exigé en l’absence de présentation de justificatif d’hébergement (évaluation à l’appréciation consulaire).',
    amount: 120,
    currency: 'EUR',
    unit: 'per_day',
    effectiveFrom: '2017-05-10',
    sourceName: 'CESEDA & Service-Public.fr (Seuils d’entrée sur le territoire français)',
    sourceUrl: 'https://www.service-public.fr/particuliers/vosdroits/F2190',
    verifiedAt: '2026-09-01',
    isFullyVerified: true,
  },
  {
    id: 'RULE-SCHENGEN-INSURANCE-MANDATORY',
    destination: 'france',
    visaType: 'tourisme_visite',
    ruleCategory: 'insurance_requirement',
    ruleDescription: 'Souscription obligatoire d’une assurance médicale de voyage couvrant le rapatriement pour raisons médicales, les soins médicaux d’urgence et les soins hospitaliers d’urgence, d’un montant minimal de 30 000 EUR valable pour tout le séjour dans l’espace Schengen.',
    amount: 30000,
    currency: 'EUR',
    unit: 'total_stay',
    effectiveFrom: '2010-04-05',
    sourceName: 'Code Communautaire des Visas (Règlement CE n° 810/2009, Art. 15)',
    sourceUrl: 'https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:32009R0810',
    verifiedAt: '2026-09-01',
    isFullyVerified: true,
  },

  // ==========================================================================
  // 2. FRANCE — LONG SÉJOUR ÉTUDES (VLS-TS)
  // ==========================================================================
  {
    id: 'RULE-FR-STUDENT-BASE-LEGAL',
    destination: 'france',
    visaType: 'etudes',
    ruleCategory: 'subsistence_threshold',
    ruleDescription: 'Obligation légale pour tout étudiant étranger en VLS-TS de justifier de moyens d’existence mensuels suffisants (CESEDA).',
    amount: 615,
    currency: 'EUR',
    unit: 'per_month',
    effectiveFrom: '2020-01-01',
    sourceName: 'Code de l’entrée et du séjour des étrangers et du droit d’asile (CESEDA, Art. R422-2) & Circulaire ministérielle Campus France',
    sourceUrl: 'https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000042805218',
    verifiedAt: '2026-09-01',
    isFullyVerified: true,
  },
  {
    id: 'RULE-FR-STUDENT-2026-PROJECTED',
    destination: 'france',
    visaType: 'etudes',
    ruleCategory: 'subsistence_threshold',
    ruleDescription: 'Seuil projeté de 877,50 € / mois cité dans les communications d’orientation 2026.',
    amount: 877.5,
    currency: 'EUR',
    unit: 'per_month',
    effectiveFrom: '2026-08-01',
    sourceName: 'Notice indicative France-Visas (en attente de publication de décret modifiant le CESEDA)',
    sourceUrl: 'https://france-visas.gouv.fr',
    verifiedAt: '2026-09-01',
    isFullyVerified: false, // NON VÉRIFIÉ PAR DÉCRET LÉGAL — Le moteur ne l'utilise pas en blocage mécanique
  },

  // ==========================================================================
  // 3. CANADA — PERMIS D'ÉTUDES (IRCC)
  // ==========================================================================
  {
    id: 'RULE-CA-STUDENT-LICO-2024',
    destination: 'canada',
    visaType: 'etudes',
    ruleCategory: 'subsistence_threshold',
    ruleDescription: 'Seuil de subsistance minimal obligatoire pour un demandeur seul hors Québec (75 % du SFR / LICO) en sus des droits de scolarité de 1ère année.',
    amount: 20635,
    currency: 'CAD',
    unit: 'per_year',
    effectiveFrom: '2024-01-01',
    sourceName: 'IRCC - Exigences financières relatives aux permis d’études (Règlement sur l’immigration et la protection des réfugiés, Art. R220)',
    sourceUrl: 'https://www.canada.ca/fr/immigration-refugies-citoyennete/services/etudier-canada/permis-etudes/obtenir-documents.html#doc-financiers',
    verifiedAt: '2026-09-01',
    isFullyVerified: true,
  },
  {
    id: 'RULE-CA-STUDENT-2026-INDEXED',
    destination: 'canada',
    visaType: 'etudes',
    ruleCategory: 'subsistence_threshold',
    ruleDescription: 'Indexation prévisionnelle 2026 (23 448 $ CAD) citée dans les barèmes indicatifs.',
    amount: 23448,
    currency: 'CAD',
    unit: 'per_year',
    effectiveFrom: '2026-01-01',
    sourceName: 'Communication indicative IRCC',
    sourceUrl: 'https://www.canada.ca/fr/immigration-refugies-citoyennete.html',
    verifiedAt: '2026-09-01',
    isFullyVerified: false, // Reste non vérifié par directive publiée
  },
  {
    id: 'RULE-CA-STUDENT-TUITION-FIRST-YEAR',
    destination: 'canada',
    visaType: 'etudes',
    ruleCategory: 'subsistence_threshold',
    ruleDescription: 'Obligation légale pour le demandeur d’un permis d’études de justifier des ressources suffisantes pour payer les frais de scolarité de la première année d’études, en sus des frais de subsistance (LICO).',
    effectiveFrom: '2002-06-28',
    sourceName: 'Règlement sur l’immigration et la protection des réfugiés (RIPR, Art. R220 a)',
    sourceUrl: 'https://laws-lois.justice.gc.ca/fra/reglements/DORS-2002-227/section-220.html',
    verifiedAt: '2026-09-01',
    isFullyVerified: true,
  },
  {
    id: 'RULE-CA-STUDENT-PAL-MANDATORY',
    destination: 'canada',
    visaType: 'etudes',
    ruleCategory: 'administrative_admissibility',
    ruleDescription: 'Obligation de fournir une Lettre d’attestation provinciale (PAL) de la province ou du territoire d’accueil pour toute demande de permis d’études post-secondaire (sauf exemptions expressément prévues : programmes de maîtrise, doctorat et scolarité primaire/secondaire).',
    effectiveFrom: '2024-01-22',
    sourceName: 'Instructions ministérielles IRCC relatives au plafond des demandes de permis d’études (LIPR, Art. 87.3)',
    sourceUrl: 'https://www.canada.ca/fr/immigration-refugies-citoyennete/services/etudier-canada/permis-etudes/obtenir-documents.html#pal',
    verifiedAt: '2026-09-01',
    isFullyVerified: true,
  },

  // ==========================================================================
  // 4. MAROC — DIRECTIVES OFFICIELLES & EXEMPTIONS
  // ==========================================================================
  {
    id: 'RULE-MA-IVORIAN-EVISA-30D',
    destination: 'maroc',
    visaType: 'tourisme_visite',
    ruleCategory: 'stay_duration',
    ruleDescription: 'e-Visa obligatoire pour les ressortissants ivoiriens sur acces-maroc.ma avec séjour limité strictement à 30 jours maximum non prorogeables.',
    amount: 30,
    unit: 'total_stay',
    effectiveFrom: '2023-01-01',
    sourceName: 'Ministère des Affaires Étrangères du Royaume du Maroc — Dispositions e-Visa acces-maroc.ma',
    sourceUrl: 'https://www.acces-maroc.ma',
    verifiedAt: '2026-09-01',
    isFullyVerified: true,
    applicableNationalities: [
      'côte d’ivoire',
      'côte d\'ivoire',
      'cote d\'ivoire',
      'cote d’ivoire',
      'ci',
      'ivoirien',
      'ivoirienne',
    ],
  },
  {
    id: 'RULE-MA-EXEMPTION-90D',
    destination: 'maroc',
    visaType: 'tourisme_visite',
    ruleCategory: 'stay_duration',
    ruleDescription: 'Exemption totale de visa et d’AEVM pour les ressortissants des pays liés par convention bilatérale (Sénégal, Mali, etc.) dans la limite de 90 jours.',
    amount: 90,
    unit: 'total_stay',
    effectiveFrom: '2003-11-11',
    sourceName: 'Loi marocaine n° 02-03 & Conventions bilatérales d’amitié et de libre circulation',
    sourceUrl: 'https://www.diplomatie.ma',
    verifiedAt: '2026-09-01',
    isFullyVerified: true,
    applicableNationalities: [
      'sénégal',
      'senegal',
      'mali',
      'guinée',
      'guinea',
      'guinée conakry',
      'niger',
      'tunisie',
      'tunisia',
      'algérie',
      'algerie',
      'algeria',
    ],
    excludedNationalities: [
      'côte d’ivoire',
      'côte d\'ivoire',
      'cote d\'ivoire',
      'cote d’ivoire',
      'cameroun',
      'cameroon',
      'congo',
      'rdc',
      'togo',
      'bénin',
      'benin',
      'gabon',
    ],
  },
];

/**
 * Résolveur sécurisé des règles officielles contextuel.
 * Prend en compte la destination, le motif, la catégorie et la nationalité du demandeur.
 * Ne renvoie la règle que si elle est entièrement vérifiée (`isFullyVerified === true`).
 */
export function resolveOfficialRule(
  destination: string,
  visaType: string,
  category: OfficialConsularRule['ruleCategory'],
  countryOfOrigin?: string
): OfficialConsularRule | null {
  const destClean = (destination || '').toLowerCase().trim();
  const visaClean = (visaType || '').toLowerCase().trim();
  const originClean = (countryOfOrigin || '').toLowerCase().trim();

  if (!destClean || !visaClean) return null;

  // 1. Filtrer les règles correspondant à destination + visaType + category + isFullyVerified
  const candidateRules = OFFICIAL_CONSULAR_RULES.filter((rule) => {
    const destMatch =
      rule.destination === destClean ||
      (destClean.includes('france') && rule.destination === 'france') ||
      (destClean.includes('canada') && rule.destination === 'canada') ||
      (destClean.includes('maroc') && rule.destination === 'maroc');

    const visaMatch =
      rule.visaType === visaClean ||
      (visaClean === 'affaires_mission' && rule.visaType === 'tourisme_visite') ||
      (visaClean === 'soins_medicaux' && rule.visaType === 'tourisme_visite') ||
      (visaClean === 'travail_stage' && rule.visaType === 'tourisme_visite');

    return destMatch && visaMatch && rule.ruleCategory === category && rule.isFullyVerified;
  });

  if (candidateRules.length === 0) return null;

  // 2. Si le pays d'origine / nationalité est fourni, vérifier en priorité les règles spécifiques
  if (originClean.length > 0) {
    // A. Règle ciblant expressément la nationalité du demandeur
    const nationalitySpecificRule = candidateRules.find((rule) => {
      if (!rule.applicableNationalities || rule.applicableNationalities.length === 0) return false;
      return rule.applicableNationalities.some(
        (nat) => originClean.includes(nat) || nat.includes(originClean)
      );
    });

    if (nationalitySpecificRule) {
      return nationalitySpecificRule;
    }

    // B. Éliminer les règles dont cette nationalité est explicitement exclue
    const nonExcludedRules = candidateRules.filter((rule) => {
      if (!rule.excludedNationalities || rule.excludedNationalities.length === 0) return true;
      const isExcluded = rule.excludedNationalities.some(
        (nat) => originClean.includes(nat) || nat.includes(originClean)
      );
      return !isExcluded;
    });

    // C. Parmi les non-exclues, retenir une règle générale (sans restriction de nationalité)
    const generalRule = nonExcludedRules.find(
      (rule) => !rule.applicableNationalities || rule.applicableNationalities.length === 0
    );

    return generalRule || null;
  }

  // 3. Sans nationalité renseignée, retourner une règle générale non restreinte
  const genericRule = candidateRules.find(
    (rule) => !rule.applicableNationalities || rule.applicableNationalities.length === 0
  );

  return genericRule || candidateRules[0] || null;
}

/**
 * Récupère toutes les règles candidates (vérifiées ou non) pour un audit de traçabilité.
 */
export function getCandidateRules(
  destination: string,
  visaType: string
): { verified: OfficialConsularRule[]; unverified: OfficialConsularRule[] } {
  const destClean = (destination || '').toLowerCase().trim();
  const visaClean = (visaType || '').toLowerCase().trim();

  if (!destClean || !visaClean) {
    return { verified: [], unverified: [] };
  }

  const candidates = OFFICIAL_CONSULAR_RULES.filter((rule) => {
    const destMatch =
      rule.destination === destClean ||
      (destClean.includes('france') && rule.destination === 'france') ||
      (destClean.includes('canada') && rule.destination === 'canada') ||
      (destClean.includes('maroc') && rule.destination === 'maroc');

    const visaMatch =
      rule.visaType === visaClean ||
      (visaClean === 'affaires_mission' && rule.visaType === 'tourisme_visite') ||
      (visaClean === 'soins_medicaux' && rule.visaType === 'tourisme_visite') ||
      (visaClean === 'travail_stage' && rule.visaType === 'tourisme_visite');

    return destMatch && visaMatch;
  });

  return {
    verified: candidates.filter((r) => r.isFullyVerified),
    unverified: candidates.filter((r) => !r.isFullyVerified),
  };
}
