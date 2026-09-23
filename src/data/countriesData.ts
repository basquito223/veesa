import { CountryProfile } from '../types';

export const AFRICAN_COUNTRIES: CountryProfile[] = [
  {
    id: 'mali',
    name: 'Mali',
    flag: '🇲🇱',
    capital: 'Bamako',
    currencyCode: 'XOF',
    currencyName: 'Franc CFA (BCEAO)',
    biometricCenters: {
      france: ['VFS Global Bamako (ACI 2000)', 'Espace Campus France Bamako'],
      canada: ['CRDV VFS Global Bamako'],
    },
    moroccoAgreement: {
      status: 'dispense_totale',
      label: 'Exemption Totale de Visa (0 FCFA / 90 jours)',
      details:
        'Accord bilatéral historique : Aucun visa requis pour les ressortissants maliens (0 visa, 0 FCFA, 90 jours) et dispense totale d’AEVM. Entrée libre avec passeport ordinaire valide et billet retour.',
    },
  },
  {
    id: 'senegal',
    name: 'Sénégal',
    flag: '🇸🇳',
    capital: 'Dakar',
    currencyCode: 'XOF',
    currencyName: 'Franc CFA (BCEAO)',
    biometricCenters: {
      france: ['TLScontact Dakar (Mermoz)', 'Espace Campus France Sénégal (Dakar & Saint-Louis)'],
      canada: ['CRDV VFS Global Dakar (Almadies)'],
    },
    moroccoAgreement: {
      status: 'dispense_totale',
      label: 'Exemption Totale de Visa (90 jours)',
      details:
        'Accord historique de libre circulation : les citoyens sénégalais détenteurs d’un passeport ordinaire valide sont dispensés de visa et d’AEVM pour un séjour jusqu’à 90 jours.',
    },
  },
  {
    id: 'cote_ivoire',
    name: 'Côte d’Ivoire',
    flag: '🇨🇮',
    capital: 'Abidjan',
    currencyCode: 'XOF',
    currencyName: 'Franc CFA (BCEAO)',
    biometricCenters: {
      france: ['TLScontact / VFS Global Abidjan (Zone 4)', 'Espace Campus France Abidjan'],
      canada: ['CRDV VFS Global Abidjan'],
    },
    moroccoAgreement: {
      status: 'evisa_requis',
      label: 'e-Visa Maroc Obligatoire (Mesure 2026)',
      details:
        'Pour des raisons de contrôle documentaire et de lutte contre la fraude d’identité, les passeports ordinaires ivoiriens doivent obtenir un e-Visa officiel sur acces-maroc.ma avant le voyage (les passeports de service/diplomatiques restent exemptés).',
    },
  },
  {
    id: 'guinee',
    name: 'Guinée (Conakry)',
    flag: '🇬🇳',
    capital: 'Conakry',
    currencyCode: 'GNF',
    currencyName: 'Franc Guinéen',
    biometricCenters: {
      france: ['VFS Global Conakry (Kaloum)', 'Espace Campus France Guinée'],
      canada: ['CRDV VFS Global Conakry'],
    },
    moroccoAgreement: {
      status: 'aevm_requis',
      label: 'AEVM ou e-Visa Obligatoire',
      details:
        'Les ressortissants guinéens doivent obligatoirement déposer une demande d’Autorisation Électronique de Voyage (AEVM) ou e-Visa sur acces-maroc.ma au moins 96 heures avant l’embarquement.',
    },
  },
  {
    id: 'cameroun',
    name: 'Cameroun',
    flag: '🇨🇲',
    capital: 'Yaoundé / Douala',
    currencyCode: 'XAF',
    currencyName: 'Franc CFA (BEAC)',
    biometricCenters: {
      france: ['TLScontact Yaoundé & Douala', 'Espace Campus France Yaoundé/Douala'],
      canada: ['CRDV VFS Global Yaoundé'],
    },
    moroccoAgreement: {
      status: 'visa_consulaire',
      label: 'Visa Consulaire ou e-Visa conditionnel',
      details:
        'Visa classique exigé ou e-Visa réservé aux titulaires de titres de séjour ou visas valides des pays membres de l’Espace Schengen, USA, Canada, UK.',
    },
  },
  {
    id: 'benin',
    name: 'Bénin',
    flag: '🇧🇯',
    capital: 'Cotonou',
    currencyCode: 'XOF',
    currencyName: 'Franc CFA (BCEAO)',
    biometricCenters: {
      france: ['Capago Cotonou (Haie Vive)', 'Espace Campus France Cotonou'],
      canada: ['CRDV VFS Global Cotonou'],
    },
    moroccoAgreement: {
      status: 'dispense_totale',
      label: 'Entrée sans visa (90 jours)',
      details:
        'Les citoyens béninois bénéficient de la dispense de visa pour des séjours touristiques ou d’affaires jusqu’à 90 jours avec passeport en cours de validité.',
    },
  },
  {
    id: 'togo',
    name: 'Togo',
    flag: '🇹🇬',
    capital: 'Lomé',
    currencyCode: 'XOF',
    currencyName: 'Franc CFA (BCEAO)',
    biometricCenters: {
      france: ['Consulat Général de France à Lomé', 'Espace Campus France Togo'],
      canada: ['CRDV VFS Global Lomé'],
    },
    moroccoAgreement: {
      status: 'dispense_totale',
      label: 'Entrée sans visa (90 jours)',
      details:
        'Exemption de visa pour séjours touristiques de courte durée (maximum 90 jours) avec passeport ordinaire valide.',
    },
  },
  {
    id: 'burkina_faso',
    name: 'Burkina Faso',
    flag: '🇧🇫',
    capital: 'Ouagadougou',
    currencyCode: 'XOF',
    currencyName: 'Franc CFA (BCEAO)',
    biometricCenters: {
      france: ['Consulat Général / Prestataire agréé Ouagadougou', 'Campus France Ouagadougou'],
      canada: ['CRDV VFS Global Ouagadougou'],
    },
    moroccoAgreement: {
      status: 'dispense_totale',
      label: 'Entrée sans visa (90 jours)',
      details:
        'Accords bilatéraux d’exemption de visa pour séjours temporaires jusqu’à 90 jours avec passeport valide.',
    },
  },
  {
    id: 'niger',
    name: 'Niger',
    flag: '🇳🇪',
    capital: 'Niamey',
    currencyCode: 'XOF',
    currencyName: 'Franc CFA (BCEAO)',
    biometricCenters: {
      france: ['Centre de traitement consulaire Niamey', 'Campus France Niamey'],
      canada: ['CRDV VFS Niamey'],
    },
    moroccoAgreement: {
      status: 'dispense_totale',
      label: 'Entrée sans visa (90 jours)',
      details: 'Exemption de visa pour séjours jusqu’à 90 jours sous réserve de validité du passeport.',
    },
  },
  {
    id: 'gabon',
    name: 'Gabon',
    flag: '🇬🇦',
    capital: 'Libreville',
    currencyCode: 'XAF',
    currencyName: 'Franc CFA (BEAC)',
    biometricCenters: {
      france: ['TLScontact Libreville', 'Espace Campus France Libreville'],
      canada: ['CRDV VFS Global Libreville'],
    },
    moroccoAgreement: {
      status: 'dispense_totale',
      label: 'Exemption Totale de Visa (90 jours)',
      details:
        'Accord de suppression réciproque de visas pour passeports ordinaires : les citoyens gabonais sont totalement dispensés de visa et d’AEVM pour un séjour jusqu’à 90 jours.',
    },
  },
  {
    id: 'congo_brazzaville',
    name: 'Congo (Brazzaville)',
    flag: '🇨🇬',
    capital: 'Brazzaville',
    currencyCode: 'XAF',
    currencyName: 'Franc CFA (BEAC)',
    biometricCenters: {
      france: ['TLScontact Brazzaville & Pointe-Noire', 'Campus France Congo'],
      canada: ['CRDV VFS Global Brazzaville'],
    },
    moroccoAgreement: {
      status: 'aevm_requis',
      label: 'AEVM Obligatoire (acces-maroc.ma)',
      details:
        'AEVM requise pour les ressortissants congolais avant tout embarquement vers le Royaume du Maroc.',
    },
  },
  {
    id: 'rdc',
    name: 'RD Congo (Kinshasa)',
    flag: '🇨🇩',
    capital: 'Kinshasa',
    currencyCode: 'CDF',
    currencyName: 'Franc Congolais',
    biometricCenters: {
      france: ['TLScontact Kinshasa (Gombe)', 'Campus France RDC'],
      canada: ['CRDV VFS Global Kinshasa'],
    },
    moroccoAgreement: {
      status: 'visa_consulaire',
      label: 'Visa Consulaire ou e-Visa',
      details:
        'Visa préalable requis auprès de l’ambassade du Maroc à Kinshasa ou e-Visa si détenteur d’un visa Schengen/USA/Canada valide.',
    },
  },
  {
    id: 'tchad',
    name: 'Tchad',
    flag: '🇹🇩',
    capital: 'N’Djamena',
    currencyCode: 'XAF',
    currencyName: 'Franc CFA (BEAC)',
    biometricCenters: {
      france: ['Consulat de France N’Djamena', 'Campus France Tchad'],
      canada: ['CRDV VFS Global N’Djamena'],
    },
    moroccoAgreement: {
      status: 'visa_consulaire',
      label: 'Visa Consulaire',
      details: 'Demande de visa auprès de la représentation diplomatique marocaine.',
    },
  },
  {
    id: 'mauritanie',
    name: 'Mauritanie',
    flag: '🇲🇷',
    capital: 'Nouakchott',
    currencyCode: 'MRU',
    currencyName: 'Ouguiya Mauritanien',
    biometricCenters: {
      france: ['VFS Global / Consulat de France Nouakchott', 'Campus France Mauritanie'],
      canada: ['CRDV VFS Global Nouakchott'],
    },
    moroccoAgreement: {
      status: 'visa_consulaire',
      label: 'Visa ou procédure frontalière facilitée',
      details: 'Délivrance de visa consulaire ou e-Visa selon catégorie de passeport.',
    },
  },
  {
    id: 'madagascar',
    name: 'Madagascar',
    flag: '🇲🇬',
    capital: 'Antananarivo',
    currencyCode: 'MGA',
    currencyName: 'Ariary Malgache',
    biometricCenters: {
      france: ['TLScontact Antananarivo', 'Espace Campus France Madagascar'],
      canada: ['CRDV VFS Global Antananarivo'],
    },
    moroccoAgreement: {
      status: 'visa_consulaire',
      label: 'Visa Consulaire ou e-Visa',
      details: 'Demande de visa en ligne ou auprès de l’ambassade.',
    },
  },
  {
    id: 'ghana',
    name: 'Ghana',
    flag: '🇬🇭',
    capital: 'Accra',
    currencyCode: 'GHS',
    currencyName: 'Ghana Cedi',
    biometricCenters: {
      france: ['VFS Global Accra', 'Campus France Ghana'],
      canada: ['CRDV VFS Global Accra'],
    },
    moroccoAgreement: {
      status: 'aevm_requis',
      label: 'AEVM Obligatoire (acces-maroc.ma)',
      details: 'AEVM exigée pour les ressortissants ghanéens via acces-maroc.ma.',
    },
  },
];

export function getCountryProfile(countryNameOrId?: string): CountryProfile {
  if (!countryNameOrId || !countryNameOrId.trim()) {
    return {
      id: '',
      name: '',
      flag: '🌍',
      capital: '',
      currencyCode: 'XOF',
      currencyName: 'Franc CFA',
      biometricCenters: {
        france: ['Centre consulaire agréé'],
        canada: ['Centre de réception des visas (CRDV)'],
      },
      moroccoAgreement: {
        status: 'visa_consulaire',
        label: 'Vérification consulaire préalable',
        details: 'Consulter le portail officiel.',
      },
    };
  }

  const normalized = countryNameOrId.toLowerCase().trim();
  const found = AFRICAN_COUNTRIES.find(
    (c) =>
      c.id === normalized ||
      c.name.toLowerCase() === normalized ||
      normalized.includes(c.name.toLowerCase()) ||
      c.name.toLowerCase().includes(normalized)
  );
  return (
    found || {
      id: 'autre',
      name: countryNameOrId || 'Autre pays',
      flag: '🌍',
      capital: 'Capitale',
      currencyCode: 'XOF',
      currencyName: 'Devise locale',
      biometricCenters: {
        france: ['Centre consulaire agréé'],
        canada: ['Centre de réception des visas (CRDV)'],
      },
      moroccoAgreement: {
        status: 'visa_consulaire',
        label: 'Vérification consulaire préalable',
        details: 'Consulter acces-maroc.ma ou l’ambassade du Maroc compétente.',
      },
    }
  );
}
