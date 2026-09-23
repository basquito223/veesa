import { DestinationType } from '../types';

export type RegimeType =
  | 'exemption_totale'
  | 'evisa_obligatoire'
  | 'aevm_obligatoire'
  | 'visa_consulaire'
  | 'evisa_conditionnel';

export interface BilateralRule {
  originCountry: string;
  destination: DestinationType;
  destinationLabel: string;
  regimeType: RegimeType;
  badgeLabel: string;
  headline: string;
  legalBasis: string;
  stayLimitDays: number;
  officialCostFcfa: number;
  officialCostDisplay: string;
  officialPortalName: string;
  officialPortalUrl: string;
  entryDocuments: string[];
  antiScamAlert: string;
  verificationSource: string;
}

export const MOROCCO_BILATERAL_EXEMPT_COUNTRIES = [
  'mali',
  'senegal',
  'sénégal',
  'benin',
  'bénin',
  'togo',
  'burkina',
  'burkina faso',
  'niger',
  'gabon',
  'algerie',
  'algérie',
  'tunisie',
];

export function getBilateralRule(
  originCountry: string,
  destination: DestinationType,
  visaReason?: string
): BilateralRule {
  const normOrigin = (originCountry || 'mali').trim().toLowerCase();

  // 1. DESTINATION MAROC
  if (destination === 'maroc') {
    // Cas Mali (Spécifiquement vérifié 2026 : Exemption totale & levée de l'AEVM en avril 2026)
    if (normOrigin.includes('mali')) {
      return {
        originCountry: 'Mali',
        destination: 'maroc',
        destinationLabel: 'Royaume du Maroc',
        regimeType: 'exemption_totale',
        badgeLabel: 'Exemption Totale (0 Visa / Sans AEVM)',
        headline: '🇲🇱 Maliens vers le Maroc : AUCUN VISA REQUIS (Séjour libre jusqu’à 90 jours)',
        legalBasis:
          'Convention bilatérale d’amitié et d’établissement Maroc-Mali. L’obligation de formalité préalable AEVM a été suspendue et levée le 27 avril 2026 par accord diplomatique mutuel. Les citoyens maliens détenteurs d’un passeport ordinaire valide entrent sans visa et sans taxe.',
        stayLimitDays: 90,
        officialCostFcfa: 0,
        officialCostDisplay: '0 FCFA (Entrée 100% Gratuite)',
        officialPortalName: 'Ministère des Affaires Étrangères du Maroc (diplomatie.ma)',
        officialPortalUrl: 'https://www.diplomatie.ma',
        entryDocuments: [
          'Passeport ordinaire malien en cours de validité (minimum 6 mois)',
          'Billet d’avion aller-retour confirmé (Bamako - Casablanca, etc.)',
          'Justificatif d’hébergement (réservation d’hôtel confirmée ou attestation de prise en charge par un résident au Maroc)',
          'Fiche de débarquement remise à bord de l’avion pour la Police des Frontières (PAF)',
          'AUCUN visa consulaire ni formulaire AEVM en ligne n’est nécessaire',
        ],
        antiScamAlert:
          'ATTENTION AUX ARNAQUES : Tout démarcheur, agence de voyage ou site web vous demandant de payer pour un "visa Maroc" ou des frais d’AEVM pour un passeport malien est un escroc ! L’entrée est strictement sans visa.',
        verificationSource: 'Registre Diplomatique MAEC Maroc & Ambassade du Mali à Rabat (Vérifié 2026)',
      };
    }

    // Cas Sénégal
    if (normOrigin.includes('senegal') || normOrigin.includes('sénégal')) {
      return {
        originCountry: 'Sénégal',
        destination: 'maroc',
        destinationLabel: 'Royaume du Maroc',
        regimeType: 'exemption_totale',
        badgeLabel: 'Exemption Totale (0 Visa)',
        headline: '🇸🇳 Sénégalais vers le Maroc : ENTRÉE LIBRE SANS VISA (90 jours)',
        legalBasis:
          'Traité d’amitié et convention d’établissement sénégalo-marocaine de 1964 renforcée. Les citoyens sénégalais détenteurs d’un passeport ordinaire valide sont dispensés de visa de court séjour et d’AEVM.',
        stayLimitDays: 90,
        officialCostFcfa: 0,
        officialCostDisplay: '0 FCFA (Gratuit)',
        officialPortalName: 'Portail Consulaire Maroc',
        officialPortalUrl: 'https://www.diplomatie.ma',
        entryDocuments: [
          'Passeport sénégalais valide > 6 mois',
          'Billet de transport aller-retour',
          'Réservation hôtelière ou attestation d’accueil',
          'Fiche de débarquement remplie pour la PAF',
        ],
        antiScamAlert:
          'Ne payez aucun intermédiaire. Les Sénégalais ne sont soumis à aucun visa pour visiter le Maroc jusqu’à 90 jours.',
        verificationSource: 'Convention d’Établissement Bilatérale (En vigueur)',
      };
    }

    // Cas Côte d'Ivoire (e-Visa obligatoire)
    if (normOrigin.includes('ivoire')) {
      return {
        originCountry: 'Côte d’Ivoire',
        destination: 'maroc',
        destinationLabel: 'Royaume du Maroc',
        regimeType: 'evisa_obligatoire',
        badgeLabel: 'e-Visa Préalable Obligatoire',
        headline: '🇨🇮 Ivoiriens vers le Maroc : e-Visa OBLIGATOIRE sur acces-maroc.ma',
        legalBasis:
          'Accord bilatéral régulé (application 2024-2026) : instauration du visa électronique préalable obligatoire pour les titulaires de passeports ordinaires ivoiriens se rendant au Maroc.',
        stayLimitDays: 30,
        officialCostFcfa: 52000,
        officialCostDisplay: '52 000 FCFA (~770 MAD)',
        officialPortalName: 'Plateforme Officielle Acces-Maroc (Régalien)',
        officialPortalUrl: 'https://www.acces-maroc.ma',
        entryDocuments: [
          'e-Visa Acces-Maroc approuvé et imprimé sur papier',
          'Passeport ordinaire ivoirien valide au moins 6 mois',
          'Billet d’avion aller-retour',
          'Réservation d’hôtel ou prise en charge',
          'Justificatif de moyens financiers (relevé bancaire)',
        ],
        antiScamAlert:
          'Demandez l’e-Visa EXCLUSIVEMENT sur www.acces-maroc.ma. Méfiez-vous des faux sites tiers imitant le portail marocain et facturant 3x le prix.',
        verificationSource: 'Circulaire Consulaire MAEC Maroc (Mise à jour 2026)',
      };
    }

    // Cas Guinée ou Congo (AEVM obligatoire)
    if (normOrigin.includes('guinee') || normOrigin.includes('guin') || normOrigin.includes('congo')) {
      return {
        originCountry: originCountry,
        destination: 'maroc',
        destinationLabel: 'Royaume du Maroc',
        regimeType: 'aevm_obligatoire',
        badgeLabel: 'AEVM Préalable Obligatoire',
        headline: `AEVM Obligatoire sur acces-maroc.ma (Autorisation Électronique de Voyage)`,
        legalBasis:
          'Protocole d’autorisation électronique préalable (AEVM) pour les ressortissants guinéens et congolais. Doit être déposée et approuvée au minimum 96 heures avant le départ.',
        stayLimitDays: 90,
        officialCostFcfa: 0,
        officialCostDisplay: 'Gratuit (Autorisation administrative)',
        officialPortalName: 'Portail Réalisations AEVM Maroc',
        officialPortalUrl: 'https://www.acces-maroc.ma',
        entryDocuments: [
          'Accord AEVM imprimé avec code QR de validation',
          'Passeport valide > 6 mois',
          'Billet d’avion retour confirmé',
          'Justificatif d’hébergement au Maroc',
        ],
        antiScamAlert:
          'L’AEVM se fait uniquement sur le portail officiel du gouvernement marocain sans intermédiaire.',
        verificationSource: 'Direction Générale de la Sûreté Nationale (DGSN) Maroc',
      };
    }

    // Autres pays exemptés pour le Maroc (Bénin, Burkina, Niger, Gabon)
    const isOtherExempt = MOROCCO_BILATERAL_EXEMPT_COUNTRIES.some((c) => normOrigin.includes(c));
    if (isOtherExempt) {
      return {
        originCountry: originCountry,
        destination: 'maroc',
        destinationLabel: 'Royaume du Maroc',
        regimeType: 'exemption_totale',
        badgeLabel: 'Exemption Totale (0 Visa)',
        headline: `${originCountry} vers le Maroc : EXEMPTION DE VISA BILATÉRALE (90 jours)`,
        legalBasis:
          'Accords bilatéraux de suppression réciproque de visa de court séjour pour les détenteurs de passeports ordinaires.',
        stayLimitDays: 90,
        officialCostFcfa: 0,
        officialCostDisplay: '0 FCFA',
        officialPortalName: 'Portail Diplomatique Maroc',
        officialPortalUrl: 'https://www.diplomatie.ma',
        entryDocuments: [
          'Passeport valide > 6 mois',
          'Billet d’avion aller-retour',
          'Réservation d’hébergement ou hôte',
        ],
        antiScamAlert: 'Aucun visa requis. Ne payez rien pour entrer au Maroc pour du tourisme ou affaires de moins de 90 jours.',
        verificationSource: 'MAEC Maroc Accord Bilatéral',
      };
    }

    // Pays soumis à visa consulaire classique (ex: Cameroun, RDC, Tchad)
    return {
      originCountry: originCountry,
      destination: 'maroc',
      destinationLabel: 'Royaume du Maroc',
      regimeType: 'visa_consulaire',
      badgeLabel: 'Visa Consulaire Obligatoire',
      headline: `${originCountry} vers le Maroc : Visa Consulaire Obligatoire`,
      legalBasis:
        'Dépôt de demande de visa auprès de la section consulaire de l’Ambassade du Royaume du Maroc (ou e-Visa si détenteur d’un visa valide Schengen/USA/Royaume-Uni).',
      stayLimitDays: 90,
      officialCostFcfa: 22000,
      officialCostDisplay: '22 000 à 33 000 FCFA',
      officialPortalName: 'Ambassade du Maroc / acces-maroc.ma',
      officialPortalUrl: 'https://www.acces-maroc.ma',
      entryDocuments: [
        'Formulaire de visa officiel signé',
        'Passeport original + copies',
        'Attestation de travail et relevés bancaires 3 mois',
        'Réservation d’hôtel confirmée',
      ],
      antiScamAlert:
        'Paiement des frais de chancellerie uniquement au guichet consulaire ou via la plateforme agréée.',
      verificationSource: 'Services Consulaires Maroc',
    };
  }

  // 2. DESTINATION FRANCE / SCHENGEN (ÉTUDES OU VISITE)
  if (destination === 'france' || destination === 'france_etudes' || destination === 'france_visite') {
    const isEtudes = destination === 'france_etudes' || visaReason === 'etudes';
    return {
      originCountry: originCountry,
      destination,
      destinationLabel: 'France — Espace Schengen',
      regimeType: 'visa_consulaire',
      badgeLabel: 'Visa Obligatoire (France-Visas + TLScontact/VFS)',
      headline: `${originCountry} vers la France : ${isEtudes ? 'Visa Long Séjour Études (VLS-TS)' : 'Visa Court Séjour Schengen'}`,
      legalBasis:
        isEtudes
          ? 'Code de l’Entrée et du Séjour des Étrangers et du Droit d’Asile (CESEDA). Seuil financier officiel 2026 : 877,50 € / mois (615 € si hébergé gratuitement).'
          : 'Code Communautaire des Visas Schengen (Règlement UE 810/2009). Barème légal : 120 €/jour sans hébergement, 65 €/jour avec hôtel, 32,50 €/jour avec attestation d’accueil.',
      stayLimitDays: isEtudes ? 365 : 90,
      officialCostFcfa: isEtudes ? 65000 : 59000,
      officialCostDisplay: isEtudes ? '99 € (environ 65 000 FCFA)' : '90 € (environ 59 000 FCFA)',
      officialPortalName: 'Portail Unique de l’État Français : France-Visas',
      officialPortalUrl: 'https://france-visas.gouv.fr',
      entryDocuments: [
        'Quittance de demande France-Visas avec code-barres',
        'Passeport valide au moins 3 mois après la fin du séjour',
        isEtudes ? 'Attestation d’accord préalable Campus France (EEF)' : 'Attestation d’accueil de mairie ou réservation d’hôtel',
        'Relevés bancaires originaux certifiés des 3 à 6 derniers mois',
        'Assurance voyage rapatriement 30 000 €',
      ],
      antiScamAlert:
        'ALERTE RENDEZ-VOUS : Ne payez jamais des revendeurs illégaux sur Telegram ou WhatsApp pour des créneaux TLScontact/VFS Global. Les frais de visa sont réglés exclusivement le jour du rendez-vous.',
      verificationSource: 'Ministère de l’Intérieur Français & France-Visas (Normes 2026)',
    };
  }

  // 3. DESTINATION CANADA
  if (destination === 'canada' || destination === 'canada_etudes' || destination === 'canada_visiteur') {
    const isEtudes = destination === 'canada_etudes' || visaReason === 'etudes';
    return {
      originCountry: originCountry,
      destination,
      destinationLabel: 'Canada (IRCC)',
      regimeType: 'visa_consulaire',
      badgeLabel: 'Demande en Ligne IRCC Obligatoire',
      headline: `${originCountry} vers le Canada : ${isEtudes ? 'Permis d’Études IRCC' : 'Visa de Résident Temporaire (VRT)'}`,
      legalBasis:
        isEtudes
          ? 'Loi sur l’immigration et la protection des réfugiés (LIPR). Seuil de subsistance officiel 2026 : 23 448 $ CAD par an hors frais de scolarité, avec lettre d’acceptation (EED) et lettre d’attestation provinciale (PAL).'
          : 'Examen de conformité financière et liens d’attache avec le pays d’origine. Données biométriques obligatoires au CRDV (VFS Global).',
      stayLimitDays: isEtudes ? 365 : 180,
      officialCostFcfa: isEtudes ? 105000 : 82000,
      officialCostDisplay: isEtudes ? '150 $ CAD + 85 $ CAD biométrie' : '100 $ CAD + 85 $ CAD biométrie',
      officialPortalName: 'Portail Officiel IRCC (Gouvernement du Canada)',
      officialPortalUrl: 'https://www.canada.ca/fr/immigration-refugies-citoyennete.html',
      entryDocuments: [
        'Formulaires IMM 1294 / IMM 5257 remplis et téléversés',
        'Passeport valide',
        isEtudes ? 'Lettre d’admission EED + Attestation Provinciale (PAL)' : 'Preuve de fonds suffisants et lettre d’invitation',
        'Relevés bancaires 4 mois et preuve d’emploi/entreprise',
      ],
      antiScamAlert:
        'Aucun "consultant" ne peut garantir un visa canadien. Seuls les agents d’immigration d’IRCC détiennent le pouvoir discrétionnaire de décision.',
      verificationSource: 'IRCC Canada Barèmes Réglementaires 2026',
    };
  }

  // 4. TURQUIE
  if (destination === 'turquie') {
    return {
      originCountry: originCountry,
      destination: 'turquie',
      destinationLabel: 'République de Turquie',
      regimeType: 'evisa_conditionnel',
      badgeLabel: 'e-Visa Conditionnel ou Visa Sticker',
      headline: `${originCountry} vers la Turquie : e-Visa Conditionnel ou Gateway Globe`,
      legalBasis:
        'Les détenteurs d’un visa Schengen, USA ou UK valide en cours de validité peuvent obtenir un e-Visa en ligne sur evisa.gov.tr. Les autres doivent déposer un dossier complet au centre Gateway Globe.',
      stayLimitDays: 30,
      officialCostFcfa: 40000,
      officialCostDisplay: '60 $ US (e-Visa) ou ~80 € (Centre Gateway)',
      officialPortalName: 'Système e-Visa Officiel de la Turquie',
      officialPortalUrl: 'https://www.evisa.gov.tr',
      entryDocuments: [
        'Passeport valide minimum 6 mois',
        'e-Visa imprimé ou visa autocollant Gateway',
        'Billet aller-retour (Turkish Airlines ou autre)',
        'Réservation d’hôtel et 50 $ US/jour de séjour',
      ],
      antiScamAlert:
        'Le seul site pour l’e-Visa officiel est evisa.gov.tr. Attention aux sites miroirs facturant 150 $ au lieu de 60 $.',
      verificationSource: 'Ministère des Affaires Étrangères de Turquie',
    };
  }

  // 5. DUBAÏ / ÉMIRATS ARABES UNIS
  return {
    originCountry: originCountry,
    destination: 'dubai',
    destinationLabel: 'Émirats Arabes Unis (Dubaï)',
    regimeType: 'evisa_obligatoire',
    badgeLabel: 'Visa Électronique Sponsors / GDRFA',
    headline: `${originCountry} vers Dubaï : Visa Électronique Garanti par Sponsor/Compagnie`,
    legalBasis:
      'Délivrance par la GDRFA (General Directorate of Residency and Foreigners Affairs) ou ICP via la compagnie aérienne (Emirates, Flydubai) ou un sponsor hôtelier agréé.',
    stayLimitDays: 30,
    officialCostFcfa: 75000,
    officialCostDisplay: '350 à 450 AED (~65 000 - 80 000 FCFA)',
    officialPortalName: 'Portail GDRFA Dubaï & ICP Émirats',
    officialPortalUrl: 'https://smart.gdrfad.gov.ae',
    entryDocuments: [
      'Copie couleur du passeport valide > 6 mois',
      'Photo d’identité sur fond blanc',
      'Billet de transport confirmé aller-retour',
      'Visa touristique électronique imprimé avec QR code',
    ],
    antiScamAlert:
      'Exigez toujours le visa électronique officiel vérifiable directement sur le site smart.gdrfad.gov.ae avant tout départ.',
    verificationSource: 'GDRFA Dubaï & ICP UAE 2026',
  };
}
