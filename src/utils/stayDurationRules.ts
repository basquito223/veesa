export interface StayDurationCap {
  maxDays: number;
  sliderScaleMax: number;
  minDays: number;
  categoryLabel: string;
  reasonExplanation: string;
  legalBasis: string;
}

export function getStayDurationCap(answers: {
  visaReason?: string;
  destination?: string;
  countryOfOrigin?: string;
}): StayDurationCap {
  const reason = answers.visaReason || '';
  const dest = (answers.destination || '').toLowerCase();
  const origin = (answers.countryOfOrigin || '').toLowerCase();

  // 1. Long-stay / Studies
  if (reason === 'etudes' || dest.includes('etudes')) {
    return {
      maxDays: 365,
      sliderScaleMax: 400,
      minDays: 1,
      categoryLabel: 'Visa Long Séjour Études (VLS-TS / Permis IRCC)',
      reasonExplanation:
        'Votre motif d’études autorise un séjour d’une année académique complète (jusqu’à 365 jours par cycle, renouvelable avec titre de séjour).',
      legalBasis: 'Directive Campus France 2026 / Article R216 LIPR Canada',
    };
  }

  // 2. Destination: France / Schengen (Short-stay Type C)
  if (dest.includes('france') || dest.includes('visite')) {
    return {
      maxDays: 90,
      sliderScaleMax: 180,
      minDays: 1,
      categoryLabel: 'Visa Court Séjour Schengen (Type C)',
      reasonExplanation:
        'Votre catégorie de visa court séjour Schengen autorise une durée maximale stricte de 90 jours sur toute période glissante de 180 jours.',
      legalBasis: 'Article 6 du Code frontières Schengen & Code Communautaire des Visas',
    };
  }

  // 3. Destination: Maroc
  if (dest.includes('maroc')) {
    if (origin.includes('ivoire') || origin.includes('côte') || origin.includes('cote')) {
      return {
        maxDays: 30,
        sliderScaleMax: 90,
        minDays: 1,
        categoryLabel: 'e-Visa Royaume du Maroc (acces-maroc.ma)',
        reasonExplanation:
          'Le e-Visa touristique marocain délivré aux ressortissants ivoiriens autorise un séjour initial continu de 30 jours maximum.',
        legalBasis: 'Réglementation consulaire marocaine 2026 & acces-maroc.ma',
      };
    }
    return {
      maxDays: 90,
      sliderScaleMax: 180,
      minDays: 1,
      categoryLabel: 'Exemption Bilatérale de Visa (Convention d’établissement)',
      reasonExplanation:
        'L’exemption bilatérale totale de visa pour les ressortissants maliens et sénégalais plafonne le séjour continu sans carte d’immatriculation à 90 jours.',
      legalBasis: 'Convention bilatérale d’établissement & Loi 02-03 relative aux étrangers au Maroc',
    };
  }

  // 4. Destination: Canada (Visitor / Business short stay)
  if (dest.includes('canada')) {
    return {
      maxDays: 180,
      sliderScaleMax: 365,
      minDays: 1,
      categoryLabel: 'Visa de Résident Temporaire (VRT Canada)',
      reasonExplanation:
        'Le statut de visiteur temporaire au Canada autorise un séjour maximal continu de 180 jours (6 mois) à compter de l’entrée sur le territoire.',
      legalBasis: 'Article R183(2) du Règlement sur l’immigration et la protection des réfugiés (RIPR)',
    };
  }

  // 5. Destination: Dubaï / EAU
  if (dest.includes('dubai')) {
    return {
      maxDays: 60,
      sliderScaleMax: 120,
      minDays: 1,
      categoryLabel: 'E-Visa Touristique Émirats Arabes Unis (GDRFA)',
      reasonExplanation:
        'L’immigration émirienne (GDRFA Dubaï) plafonne le visa de court séjour / visite standard à 60 jours maximum.',
      legalBasis: 'Réglementation fédérale ICP / GDRFA Dubaï',
    };
  }

  // 6. Destination: Turquie
  if (dest.includes('turquie')) {
    return {
      maxDays: 30,
      sliderScaleMax: 90,
      minDays: 1,
      categoryLabel: 'E-Visa République de Turquie',
      reasonExplanation:
        'Le e-visa touristique turc délivré aux passeports éligibles autorise un séjour maximal continu de 30 jours par entrée.',
      legalBasis: 'Loi n° 6458 sur les étrangers et la protection internationale',
    };
  }

  // 7. Défaut / Catalogue mondial
  return {
    maxDays: 90,
    sliderScaleMax: 180,
    minDays: 1,
    categoryLabel: 'Visa Court Séjour International',
    reasonExplanation:
      'Votre catégorie de visa temporaire autorise une durée maximale légale de 90 jours.',
    legalBasis: 'Standard consulaire international',
  };
}
