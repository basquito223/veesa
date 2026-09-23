import { DestinationType, OfficialConsularInfo } from '../types';
import { MOROCCO_BILATERAL_EXEMPT_COUNTRIES } from './bilateralAgreements';

export const OFFICIAL_CONSULAR_DATA: Record<string, OfficialConsularInfo> = {
  france_etudes: {
    destinationName: 'France / Schengen - Long Séjour Études (VLS-TS)',
    flag: '🇫🇷',
    visaFeeEur: 99,
    visaFeeFcfa: 64940,
    officialSourcePortal: 'France-Visas (Gouvernement Français)',
    officialPortalUrl: 'https://france-visas.gouv.fr',
    biometricProviders: ['TLScontact', 'VFS Global', 'Capago'],
    financialThresholdsSummary:
      'Seuil légal 2026 : 877,50 € / mois (~575 600 FCFA/mois) soit 10 530 € pour 12 mois (AVI ou garant solvable).',
    officialRules: [
      'Seuil minimum légal de ressources : 877,50 € / mois (~575 600 FCFA/mois) applicable depuis le 1er août 2026.',
      'Modalités acceptées : AVI (Attestation de Virement Irrévocable bloquée sur 12 mois = minimum 10 530 €) OU prise en charge par un garant démontrant un reste à vivre suffisant (3 dernières fiches de paie + dernier avis d’imposition + pièce d’identité).',
      'Procédure obligatoire : Validation Campus France (EEF - Études En France) avec entretien réussi avant le dépôt du visa sur France-Visas.',
      'Justificatif d’hébergement pour les 3 premiers mois : Attestation Crous, attestation de résidence universitaire ou attestation d’hébergement sur l’honneur avec bail et quittance.',
    ],
    antiScamAlerts: [
      'AUCUN paiement de frais de visa ne se fait par Wave, Orange Money ou compte bancaire personnel.',
      'Méfiez-vous des faux prestataires AVI non régulés : seules les banques agréées ou organismes financiers certifiés sont acceptés par le consulat.',
      'Campus France ne délègue jamais ses entretiens à des agences privées.',
      'La promesse d’un "visa garanti à 100%" relève d’une escroquerie consulaire punie par la loi.',
    ],
  },
  france_visite: {
    destinationName: 'France / Schengen - Court Séjour (Tourisme / Affaires / Famille)',
    flag: '🇫🇷',
    visaFeeEur: 90,
    visaFeeFcfa: 59036,
    officialSourcePortal: 'France-Visas & Prestataire officiel',
    officialPortalUrl: 'https://france-visas.gouv.fr',
    biometricProviders: ['TLScontact', 'VFS Global', 'Capago'],
    financialThresholdsSummary:
      'Frais visa : 90 € adulte (~59 000 FCFA), 45 € enfant (6-12 ans). Journalier : 32,50 €/j (accueil mairie), 65 €/j (hôtel), 120 €/j (sans justificatif).',
    officialRules: [
      'Frais officiels de visa Schengen (2026) : 90 € par adulte (~59 000 FCFA), 45 € par enfant de 6 à 12 ans, gratuit pour les moins de 6 ans.',
      'Justificatifs financiers journaliers : 32,50 €/jour avec Attestation d’Accueil délivrée par la mairie en France.',
      '65 €/jour avec réservation d’hôtel confirmée et payée ou pré-réservée avec carte valide.',
      '120 €/jour sans aucun justificatif d’hébergement (très risqué pour le consulat).',
      'Assurance voyage et rapatriement obligatoire couvrant au minimum 30 000 € de frais médicaux.',
      'Preuve d’attaches socio-professionnelles ininterrompues au pays d’origine.',
    ],
    antiScamAlerts: [
      'Attention aux fausses réservations hôtelières annulées 24h après le dépôt : les consulats vérifient désormais la validité auprès de l’hôtel !',
      'Les frais de service du prestataire (TLS/VFS/Capago) s’ajoutent aux 90 € (env. 20 000 à 25 000 FCFA) mais sont payés uniquement via leurs canaux officiels.',
      'Ne donnez jamais vos identifiants France-Visas à une tierce personne.',
    ],
  },
  canada_etudes: {
    destinationName: 'Canada - Permis d’Études (IRCC)',
    flag: '🇨🇦',
    visaFeeCad: 150,
    visaFeeFcfa: 66500,
    officialSourcePortal: 'IRCC - Immigration, Réfugiés et Citoyenneté Canada',
    officialPortalUrl: 'https://www.canada.ca/fr/immigration-refugies-citoyennete.html',
    biometricProviders: ['VFS Global (CRDV - Centre de réception des demandes de visa canadien)'],
    financialThresholdsSummary:
      'Seuil de subsistance minimal (hors Québec) : 23 448 $ CAD / an (~10,4M FCFA) + 1ère année de scolarité payée + transport (~2 000 $ CAD).',
    officialRules: [
      'Frais de subsistance minimaux (hors Québec) : 23 448 $ CAD pour un demandeur seul (seuil effectif 2026 indexé sur le coût de la vie au Canada).',
      'À ajouter obligatoirement : le paiement effectif de la 1ère année de scolarité de l’université ou collège désigné + frais de transport aller-retour (~2 000 $ CAD).',
      'Lettre d’Attestation Provinciale (PAL - Provincial Attestation Letter) obligatoire pour la grande majorité des étudiants de premier cycle, en complément de la LOA (Letter of Acceptance) officielle de l’EED.',
      'Règle stricte IRCC : Obligation de prouver l’origine légale et la traçabilité des fonds (historique bancaire de 4 à 6 mois). Les versements forfaitaires récents inexpliqués entraînent un refus direct sous l’alinéa R216.',
    ],
    antiScamAlerts: [
      'Les agents d’immigration canadiens (CRIC) doivent impérativement être inscrits au Collège des consultants en immigration et en citoyenneté (CCIC). Un intermédiaire non certifié est illégal.',
      'Aucun permis de travail ou permis d’études canadien ne s’achète.',
      'Les frais de biométrie officiels IRCC sont de 85 $ CAD (~37 700 FCFA). Refusez tout tarif exorbitant.',
    ],
  },
  canada_visiteur: {
    destinationName: 'Canada - Visa de Visiteur (VRT / Résidence Temporaire)',
    flag: '🇨🇦',
    visaFeeCad: 100,
    visaFeeFcfa: 44300,
    officialSourcePortal: 'IRCC Canada',
    officialPortalUrl: 'https://www.canada.ca/fr/immigration-refugies-citoyennete.html',
    biometricProviders: ['VFS Global (CRDV)'],
    financialThresholdsSummary:
      'Frais de visa : 100 $ CAD (~44 300 FCFA) + 85 $ CAD biométrie. Preuve d’attaches économiques et familiales indispensable.',
    officialRules: [
      'Frais de traitement IRCC : 100 $ CAD (~44 300 FCFA). Frais biométriques : 85 $ CAD.',
      'Preuve d’attaches économiques et familiales indispensables : emploi stable avec autorisation d’absence rémunérée, bulletins de salaire, titres de propriété, enfants ou conjoint restés au pays.',
      'Relevés bancaires des 6 derniers mois avec flux réguliers et solde suffisant pour couvrir l’intégralité du séjour.',
      'Lettre d’invitation détaillée d’un résident permanent ou citoyen canadien avec preuve de son statut (avis de cotisation T4, passeport/carte RP).',
    ],
    antiScamAlerts: [
      'Méfiez-vous des offres de visa visiteur transformable automatiquement en permis de travail à l’arrivée : c’est une promesse mensongère répandue.',
      'IRCC n’utilise jamais Gmail, Yahoo ou WhatsApp pour communiquer avec les candidats.',
    ],
  },
  turquie: {
    destinationName: 'Turquie - Affaires, Shopping ou Tourisme',
    flag: '🇹🇷',
    visaFeeUsd: 60,
    visaFeeFcfa: 36000,
    officialSourcePortal: 'Portail officiel E-Visa Turquie & Gateway Globe',
    officialPortalUrl: 'https://www.evisa.gov.tr',
    biometricProviders: ['Gateway Globe / Ambassade de Turquie'],
    financialThresholdsSummary:
      'E-Visa (~60 USD) réservé UNIQUEMENT aux porteurs de visa/titre valide Schengen/USA/UK/Irlande. Sans cela : visa autocollant via Gateway.',
    officialRules: [
      'Le E-Visa en ligne (environ 60 USD) est réservé STRICTEMENT aux ressortissants détenant un visa ou titre de séjour en cours de validité d’un pays de l’Espace Schengen, des États-Unis, du Royaume-Uni ou de l’Irlande.',
      'Sans visa valide de ces zones, vous devez impérativement déposer une demande de visa autocollant (sticker visa) physique auprès du centre officiel Gateway Globe ou de l’ambassade.',
      'Passeport valide au moins 60 jours au-delà de la durée de validité du visa demandé (minimum 6 mois).',
      'Preuve de moyens de subsistance (au moins 50 USD par jour de séjour) et réservation d’hôtel vérifiable.',
    ],
    antiScamAlerts: [
      'ALERTE MAJEURE : De nombreux faux sites internet usurpent le portail e-Visa turc et vendent de faux e-visas à des demandeurs inéligibles. À l’embarquement à l’aéroport, vous serez refoulé !',
      'Le seul site officiel du e-visa turc est : evisa.gov.tr.',
    ],
  },
  dubai: {
    destinationName: 'Émirats Arabes Unis (Dubaï) - Visite / Shopping',
    flag: '🇦🇪',
    visaFeeUsd: 110,
    visaFeeFcfa: 66000,
    officialSourcePortal: 'GDRFA Dubai / Compagnies aériennes certifiées',
    officialPortalUrl: 'https://www.gdrfad.gov.ae',
    biometricProviders: ['Emirates Airlines', 'flydubai', 'Agences certifiées GDRFA'],
    financialThresholdsSummary:
      'E-Visa 30 ou 60 jours via compagnies aériennes ou agences certifiées. Passeport valide 6 mois minimum.',
    officialRules: [
      'Visa touristique électronique de 30 jours (env. 110 USD / 66 000 FCFA) ou 60 jours (env. 190 USD / 115 000 FCFA).',
      'Délivrance facilitée en passant directement par la compagnie aérienne avec laquelle vous voyagez (Emirates, flydubai, etc.) ou par des hôtels/agences agréés.',
      'Passeport impérativement valide au moins 6 mois à compter de la date d’entrée sur le territoire émirati.',
      'Billet d’avion aller-retour confirmé et réservation d’hébergement.',
    ],
    antiScamAlerts: [
      'Attention aux "visas de travail Dubaï 2 ans" vendus à prix d’or dans les rues ou sur TikTok : il s’agit souvent de visas de visite non autorisés pour travailler, laissant le voyageur dans l’illégalité et la précarité.',
    ],
  },
  maroc: {
    destinationName: 'Maroc — Entrée Réglementée (Exemption, e-Visa ou AEVM selon pays)',
    flag: '🇲🇦',
    visaFeeFcfa: 0,
    officialSourcePortal: 'Portail Unique Officiel Acces-Maroc (Ministère des Affaires Étrangères)',
    officialPortalUrl: 'https://www.acces-maroc.ma',
    biometricProviders: ['Postes frontières marocains & Consulats Généraux du Royaume'],
    financialThresholdsSummary:
      '🇲🇱 Mali : Exemption TOTALE de visa (0 visa, 0 FCFA) & sans AEVM | 🇸🇳 Sénégal : Sans visa 90j | 🇨🇮 CI : e-Visa obligatoire | 🇬🇳 Guinée : AEVM requise.',
    officialRules: [
      'Régime officiel d’entrée selon la nationalité du voyageur :',
      '• 🇲🇱 Maliens : TOTALEMENT EXEMPTÉS DE VISA (séjours jusqu’à 90 jours). Entrée sur simple présentation du passeport malien ordinaire en cours de validité (minimum 6 mois). L’exigence temporaire d’AEVM a été formellement levée le 27 avril 2026. Aucun visa (ni préalable, ni à l’arrivée, ni e-visa) n’est nécessaire !',
      '• 🇸🇳 Sénégalais : Exemption totale de visa et d’AEVM pour les séjours jusqu’à 90 jours (convention d’établissement).',
      '• 🇨🇮 Ivoiriens : Obtention préalable d’un e-Visa sur acces-maroc.ma obligatoire pour passeports ordinaires (mesure de contrôle documentaire).',
      '• 🇬🇳 Guinéens, 🇨🇬 Congolais : Demande d’AEVM obligatoire sur acces-maroc.ma au moins 96h avant le vol.',
      '• 🇧🇯 Béninois, 🇧🇫 Burkinabés, 🇳🇪 Nigériens, 🇬🇦 Gabonais : Exemption de visa pour séjours touristiques jusqu’à 90 jours.',
      '• 🇨🇲 Camerounais, 🇨🇩 Congolais (RDC) : Visa consulaire obligatoire ou e-Visa sous condition de titre Schengen/USA valide.',
      '• Formalités frontières communes : Passeport valide > 6 mois, billet aller-retour et fiche de police remise à bord du vol.',
    ],
    antiScamAlerts: [
      'Ne payez JAMAIS 100 000 FCFA ou 200 000 FCFA à une "agence" pour une AEVM ou une dispense de visa : acces-maroc.ma est le SEUL canal d’État officiel.',
      'Méfiez-vous des démarcheurs promettant de "contourner le e-Visa ivoirien" : la vérification est électronique et biométrique à l’aéroport (Casablanca, Marrakech, etc.).',
    ],
  },
  autre: {
    destinationName: 'Autre Destination Mondiale',
    flag: '🌍',
    visaFeeFcfa: 60000,
    officialSourcePortal: 'Site officiel du Consulat ou de l’Ambassade de la destination',
    officialPortalUrl: 'https://www.diplomatie.gouv.fr',
    biometricProviders: ['Centre consulaire agréé'],
    financialThresholdsSummary:
      'Vérifiez scrupuleusement les exigences sur le site officiel de l’ambassade accréditée dans votre pays.',
    officialRules: [
      'Toujours consulter le site de l’ambassade ou du ministère des affaires étrangères officiel.',
      'Vérifier si votre pays dispose d’une représentation consulaire directe ou s’il faut solliciter une représentation consulaire déléguée.',
      'Prévoir un relevé bancaire avec historique de 3 à 6 mois minimum.',
    ],
    antiScamAlerts: [
      'Exigez systématiquement une facture et un reçu officiel pour chaque paiement effectué.',
      'Aucun agent diplomatique ne donne rendez-vous dans un café ou un hôtel.',
    ],
  },
};

/**
 * Robust helper to resolve the exact consular dataset for any destination input,
 * ensuring Canada, France, Morocco, etc. are accurately distinguished and never
 * erroneously fallback to France when Canada or another destination was chosen.
 */
export function getConsularData(
  destination: string,
  visaReason?: string,
  specificDestination?: string,
  countryOfOrigin?: string
): OfficialConsularInfo {
  const destLower = (destination || '').toLowerCase().trim();
  const specLower = (specificDestination || '').toLowerCase().trim();
  const isReasonStudy = visaReason === 'etudes';

  // 1. Maroc (Bilateral rules: e-Visa for Ivory Coast, Exemption for Mali/Senegal, AEVM for Guinea/Congo)
  if (
    destLower.includes('maroc') ||
    specLower.includes('maroc') ||
    destLower.includes('morocco') ||
    specLower.includes('morocco')
  ) {
    const originLower = (countryOfOrigin || '').toLowerCase().trim();
    if (originLower) {
      if (originLower.includes('ivoire') || originLower.includes('côte') || originLower.includes('cote')) {
        return {
          ...OFFICIAL_CONSULAR_DATA.maroc,
          visaFeeFcfa: 52000,
          financialThresholdsSummary:
            '🇨🇮 Côte d’Ivoire : e-Visa préalable obligatoire sur acces-maroc.ma (~770 MAD / ~52 000 FCFA). Séjour max : 30 jours.',
        };
      }
      const isExempt = MOROCCO_BILATERAL_EXEMPT_COUNTRIES.some((c) => originLower.includes(c));
      if (isExempt) {
        return {
          ...OFFICIAL_CONSULAR_DATA.maroc,
          visaFeeFcfa: 0,
          financialThresholdsSummary:
            'Exemption TOTALE de visa bilatérale (0 visa, 0 FCFA) pour séjours jusqu’à 90 jours (Mali: AEVM formellement levée le 27 avril 2026, Sénégal, Gabon, Bénin...).',
        };
      }
      if (originLower.includes('guinee') || originLower.includes('guin') || originLower.includes('congo')) {
        return {
          ...OFFICIAL_CONSULAR_DATA.maroc,
          visaFeeFcfa: 0,
          financialThresholdsSummary:
            'AEVM préalable obligatoire sur acces-maroc.ma au moins 96h avant le vol (délivrance administrative gratuite : 0 FCFA).',
        };
      }
      return {
        ...OFFICIAL_CONSULAR_DATA.maroc,
        visaFeeFcfa: 22000,
        financialThresholdsSummary:
          'Visa consulaire obligatoire auprès du consulat du Maroc (22 000 à 33 000 FCFA) ou e-Visa sous condition de titre Schengen/USA valide.',
      };
    }
    return OFFICIAL_CONSULAR_DATA.maroc;
  }

  // 2. Canada detection (either destination key, or specific destination)
  if (destLower.includes('canada') || specLower.includes('canada')) {
    return isReasonStudy ? OFFICIAL_CONSULAR_DATA.canada_etudes : OFFICIAL_CONSULAR_DATA.canada_visiteur;
  }

  // 3. France / Schengen detection
  if (
    destLower.includes('france') ||
    specLower.includes('france') ||
    destLower.includes('schengen') ||
    specLower.includes('schengen')
  ) {
    return isReasonStudy ? OFFICIAL_CONSULAR_DATA.france_etudes : OFFICIAL_CONSULAR_DATA.france_visite;
  }

  // 4. Direct key match in OFFICIAL_CONSULAR_DATA for remaining entries
  if (destination && (OFFICIAL_CONSULAR_DATA as Record<string, OfficialConsularInfo>)[destination]) {
    return (OFFICIAL_CONSULAR_DATA as Record<string, OfficialConsularInfo>)[destination];
  }

  // 5. Turquie
  if (
    destLower.includes('turqui') ||
    specLower.includes('turqui') ||
    destLower.includes('turkey') ||
    specLower.includes('turkey')
  ) {
    return OFFICIAL_CONSULAR_DATA.turquie;
  }

  // 6. Dubaï / EAU
  if (
    destLower.includes('dubai') ||
    specLower.includes('dubai') ||
    destLower.includes('émirat') ||
    destLower.includes('emirat')
  ) {
    return OFFICIAL_CONSULAR_DATA.dubai;
  }

  // 7. Specific World Destination (catalog selection)
  if (specificDestination && specificDestination.trim()) {
    const cleanName = specificDestination.trim();
    return {
      destinationName: cleanName,
      flag: '🌍',
      visaFeeFcfa: 55000,
      officialSourcePortal: `Ambassade / Consulat officiel de ${cleanName}`,
      officialPortalUrl: 'https://www.diplomatie.gouv.fr',
      biometricProviders: ['Centre agréé VFS Global / TLScontact'],
      financialThresholdsSummary: `Exigences financières et barème officiel fixés par les autorités consulaires de ${cleanName}.`,
      officialRules: [
        `Passeport original en cours de validité avec au minimum 2 pages consécutives vierges.`,
        `Relevés bancaires des 3 à 6 derniers mois avec historique de flux certifié.`,
        `Justificatif formel d'hébergement ou réservation confirmée et assurance voyage internationale.`,
        `Preuve indiscutable d'ancrage professionnel, familial et patrimonial au pays d'origine.`,
      ],
      antiScamAlerts: [
        `Aucun paiement de visa ne doit être transféré via des comptes privés ou mobile money informel.`,
        `Seuls les portails gouvernementaux officiels et prestataires diplomatiques certifiés sont habilités.`,
      ],
    };
  }

  // 8. If empty or unselected, return a neutral placeholder - NEVER default to France
  return {
    destinationName: 'Destination non sélectionnée',
    flag: '📍',
    visaFeeFcfa: 0,
    officialSourcePortal: 'Portail consulaire officiel',
    officialPortalUrl: '',
    biometricProviders: ['Centre consulaire agréé'],
    financialThresholdsSummary: 'Veuillez sélectionner votre destination pour charger le barème officiel.',
    officialRules: [
      'Sélectionnez une destination pour consulter les textes réglementaires et seuils 2026.',
    ],
    antiScamAlerts: [
      'N’effectuez aucun paiement avant d’avoir identifié le canal consulaire officiel de votre pays de destination.',
    ],
  };
}

