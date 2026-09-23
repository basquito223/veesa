import { UserAnswers } from '../types';
import { OFFICIAL_CONSULAR_DATA, getConsularData } from '../data/consularData2026';
import { getCountryProfile } from '../data/countriesData';
import { MOROCCO_BILATERAL_EXEMPT_COUNTRIES } from '../data/bilateralAgreements';

export interface GeneratedDeliverables {
  dossierId: string;
  lettreMotivation: string;
  lettreGarant: string;
  noteAttaches: string;
  checklistOriginals: { item: string; notes: string; critical: boolean }[];
  checklistCopies: { item: string; notes: string; critical: boolean }[];
  whatsappRoadmap: string;
  summaryHighlights: {
    destination: string;
    officialCost: string;
    financialRule: string;
    sanitaryStatus: 'vert' | 'orange' | 'rouge';
    sanitaryVerdict: string;
  };
}

export function generateUniqueDossierId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `VF-${code}`;
}

export async function generateAiConsularLetter(
  answers: UserAnswers,
  letterType: 'motivation' | 'garant' | 'attaches',
  tone: 'academique' | 'diplomatique' | 'professionnel' = 'academique',
  customNotes?: string
): Promise<{ success: boolean; content: string; generatedWithAI: boolean; modelUsed?: string }> {
  try {
    const consularInfo = getConsularData(
      answers.destination,
      answers.visaReason,
      answers.specificDestination,
      answers.countryOfOrigin
    );
    const response = await fetch('/api/generate-letter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        letterType,
        visaReason: answers.visaReason || 'etudes',
        destination: answers.destination || consularInfo.destinationName,
        destinationName: consularInfo.destinationName,
        countryOfOrigin: answers.countryOfOrigin || 'Mali',
        applicantName: answers.fullName || 'M./Mme [Nom du Demandeur]',
        passportNumber: answers.passportNumber || 'P00000000',
        status: answers.status,
        jobOrDegreeDetails: answers.jobTitle || answers.targetMajorAbroad || answers.highestDegree || '',
        fundingSource: answers.fundingSource,
        guarantorName: answers.guarantorFullName || 'M./Mme [Garant Financier]',
        guarantorRelation: answers.guarantorRelation || 'Parent direct',
        budgetFcfa: answers.availableBudgetFcfa || 7500000,
        tiesType: answers.tiesType,
        travelDurationDays: answers.travelDurationDays || 15,
        tone,
        customNotes: customNotes || answers.customAiNotes || '',
      }),
    });

    const data = await response.json();
    if (data.success && data.content) {
      return {
        success: true,
        content: data.content,
        generatedWithAI: true,
        modelUsed: data.modelUsed || 'gemini-2.5-flash',
      };
    }
  } catch (error) {
    console.warn('Fallback vers le générateur certifié suite à une erreur réseau IA:', error);
  }

  // Fallback to certified structured template if API key is not present or offline
  const baseDeliverables = generateDeliverables(answers);
  const fallbackContent =
    letterType === 'motivation'
      ? baseDeliverables.lettreMotivation
      : letterType === 'garant'
      ? baseDeliverables.lettreGarant
      : baseDeliverables.noteAttaches;

  return {
    success: true,
    content: fallbackContent,
    generatedWithAI: false,
  };
}

export function generateDeliverables(answers: UserAnswers, existingDossierId?: string): GeneratedDeliverables {
  const dossierId = existingDossierId || generateUniqueDossierId();
  const consularInfo = getConsularData(
    answers.destination,
    answers.visaReason,
    answers.specificDestination,
    answers.countryOfOrigin
  );
  const countryProfile = getCountryProfile(answers.countryOfOrigin);

  const destLower = (answers.destination || '').toLowerCase().trim();
  const specLower = (answers.specificDestination || '').toLowerCase().trim();
  const isCanada = destLower.includes('canada') || specLower.includes('canada');
  const isFrance = !isCanada && (
    destLower.includes('france') ||
    specLower.includes('france') ||
    destLower.includes('schengen') ||
    specLower.includes('schengen')
  );
  const isMorocco = destLower.includes('maroc') || specLower.includes('maroc');

  const applicantName =
    answers.fullName && answers.fullName.trim().length > 0 ? answers.fullName.trim() : 'M./Mme [Nom du Demandeur]';
  const countryName = answers.countryOfOrigin || 'Mali';
  const passportNumber =
    answers.passportNumber && answers.passportNumber.trim().length > 0 ? answers.passportNumber.trim() : 'P00000000';
  const guarantorName =
    answers.guarantorFullName && answers.guarantorFullName.trim().length > 0
      ? answers.guarantorFullName.trim()
      : 'M./Mme [Nom du Garant Financier]';

  const reason = answers.visaReason || 'etudes';
  const isStudy = reason === 'etudes' || destLower.includes('etudes');
  const isBusiness = reason === 'affaires_mission';
  const isMedical = reason === 'soins_medicaux';
  const isWork = reason === 'travail_stage';
  const countryLower = countryName.toLowerCase();
  const isIvorian = countryLower.includes('ivoire') || countryLower.includes('côte') || countryLower.includes('cote');
  const isAevmCountry = countryLower.includes('guinee') || countryLower.includes('guin') || countryLower.includes('congo');
  const isExemptCountryForMorocco =
    isMorocco &&
    !isIvorian &&
    !isAevmCountry &&
    (countryProfile.moroccoAgreement.status === 'dispense_totale' ||
      MOROCCO_BILATERAL_EXEMPT_COUNTRIES.some((c) => countryLower.includes(c)));

  // Destination-specific headers
  let consularRecipientTitle = `Monsieur / Madame l'Officier Consulaire`;
  let consularServiceLine = `Section des Visas – ${consularInfo.destinationName}`;
  let embassyLine = `Ambassade / Consulat Général`;
  let garantRecipientLine = `Ambassade / Consulat Général (${consularInfo.destinationName})`;

  if (isCanada) {
    consularRecipientTitle = `Madame, Monsieur l'Officier d'Immigration et des Visas`;
    consularServiceLine = `Section d'Immigration et des Visas – IRCC`;
    embassyLine = `Haut-Commissariat / Ambassade du Canada`;
    garantRecipientLine = `Section d'Immigration et des Visas – Ambassade / Haut-Commissariat du Canada (IRCC)`;
  } else if (isFrance) {
    consularRecipientTitle = `Monsieur / Madame l'Officier Consulaire`;
    consularServiceLine = `Section des Visas – France-Visas`;
    embassyLine = `Consulat Général / Ambassade de France`;
    garantRecipientLine = `Consulat Général / Ambassade de France (Section des Visas)`;
  } else if (isMorocco) {
    consularRecipientTitle = `Monsieur / Madame l'Officier Consulaire`;
    consularServiceLine = isIvorian || isAevmCountry
      ? `Portail Officiel d'Accès au Maroc (acces-maroc.ma)`
      : `Section des Visas – Royaume du Maroc`;
    embassyLine = `Ministère des Affaires Étrangères / Ambassade du Royaume du Maroc`;
    garantRecipientLine = `Services Consulaires et de Contrôle Frontalier – Royaume du Maroc`;
  }

  // 1. Lettre de motivation / Fiche déclarative personnalisée selon le statut
  let lettreMotivation = '';

  if (isExemptCountryForMorocco) {
    lettreMotivation = `${applicantName}
Nationalité : Citoyen(ne) de ${countryName}
Demeurant à : ${countryName}
Passeport N° : ${passportNumber} (Validité supérieure à 6 mois)
Contact : (+223 / +221 / +225 / +229) [Numéro de téléphone]

À l'attention des Services de la Police de l'Air et des Frontières (PAF)
Aéroport International Mohammed V de Casablanca / Menara Marrakech
Royaume du Maroc

Date du voyage : ${new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
Objet : Fiche déclarative d'entrée sur le territoire marocain – Voyage sans visa (Exemption Bilatérale 90 jours)

Monsieur l'Officier de Police des Frontières,

Je me présente au poste de contrôle frontière en qualité de ressortissant(e) de ${countryName}, bénéficiant de la convention bilatérale d'amitié et de libre circulation entre le Royaume du Maroc et ${countryName}, me dispensant intégralement de toute exigence de visa ou d'AEVM préalable pour un séjour n'excédant pas 90 jours.

1. Objet et itinéraire du séjour au Maroc :
Ce déplacement d'une durée prévisionnelle de ${answers.travelDurationDays || 15} jours a pour objet : ${
      isBusiness
        ? 'une mission professionnelle et de rencontres d’affaires partenariales'
        : isStudy
        ? 'un séjour préparatoire universitaire / prospection académique'
        : isMedical
        ? 'un séjour de consultations médicales et de soins'
        : 'un séjour touristique, familial et de découverte culturelle'
    }.

2. Justificatifs d'accueil et d'hébergement :
Durant mon séjour, je résiderai à l'adresse suivante :
[Nom de l'hôtel avec réservation confirmée OU Nom et adresse complète de l'hôte au Maroc]
Contact au Maroc : (+212) [Numéro de contact vérifiable au Maroc]

3. Moyens de subsistance et billet de retour :
Je dispose des moyens financiers requis pour couvrir l'intégralité de mes dépenses personnelles durant ce séjour, sans recours aux deniers publics.
Mon titre de transport aérien de retour vers ${countryName} est confirmé pour le vol prévu à l'issue de mon déplacement.

Je vous remets mon passeport original en cours de validité ainsi que la fiche de débarquement réglementaire dûment renseignée.

Fait pour servir et valoir ce que de droit auprès du contrôle frontalier.

${applicantName}
Signature manuscrite :`;
  } else if (isMorocco && isIvorian) {
    lettreMotivation = `${applicantName}
Nationalité : Citoyen(ne) de Côte d'Ivoire
Demeurant à : ${countryName}
Titulaire du Passeport Biométrique N° : ${passportNumber}
Email : contact@demandeur.ci | Tél : (+225) [Numéro de contact]

À l'attention des Services Consulaires du Royaume du Maroc
Direction des Affaires Consulaires et Sociales – Portail acces-maroc.ma
Rabat, Royaume du Maroc

Date : ${new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
Objet : Note justificative – Demande de e-Visa Court Séjour sur acces-maroc.ma (${answers.travelDurationDays || 15} jours)

Monsieur / Madame l'Officier Consulaire,

En application des dispositions régissant l'octroi du visa électronique par le Ministère des Affaires Étrangères du Royaume du Maroc pour les ressortissants ivoiriens, je soumets sur la plateforme officielle acces-maroc.ma ma demande de e-Visa pour un séjour d'une durée de ${answers.travelDurationDays || 15} jours (dans la limite légale stricte de 30 jours).

1. Objet et calendrier du séjour au Maroc :
Ce déplacement a pour finalité : ${
      isBusiness
        ? 'une mission professionnelle et de rencontres d’affaires partenariales au Maroc'
        : isStudy
        ? 'des démarches académiques et prospections universitaires'
        : isMedical
        ? 'des consultations médicales et soins spécialisés'
        : 'un séjour touristique et familial privé'
    }.
Mon billet d'avion aller-retour confirmé ainsi que ma réservation d'hébergement au Maroc sont annexés à ma demande en ligne.

2. Règlement des frais et solvabilité financière :
Les frais officiels de e-Visa (770 MAD / ~52 000 FCFA) sont acquittés par carte bancaire sécurisée sur le portail d'État acces-maroc.ma. Mes relevés bancaires attestent de ressources personnelles suffisantes pour subvenir à l'intégralité de mes dépenses durant ce séjour.

3. Respect scrupuleux des conditions de séjour et retour en Côte d'Ivoire :
Mon ancrage socio-économique en Côte d'Ivoire est garanti par mes activités professionnelles et attaches familiales. Dès l'expiration de la durée autorisée par le e-Visa (maximum 30 jours), je regagnerai sans délai mon pays de résidence.

Je vous remercie pour l'instruction de ma demande et vous prie d'agréer, Monsieur / Madame l'Officier Consulaire, mes salutations distinguées.

${applicantName}
Signature manuscrite :`;
  } else if (isMorocco && isAevmCountry) {
    lettreMotivation = `${applicantName}
Nationalité : Citoyen(ne) de ${countryName}
Demeurant à : ${countryName}
Titulaire du Passeport N° : ${passportNumber}
Email : contact@demandeur.org | Tél : [Numéro de contact]

À l'attention des Services Consulaires et du Contrôle Frontalier
Royaume du Maroc – Portail Officiel acces-maroc.ma

Date : ${new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
Objet : Fiche déclarative pour Autorisation Électronique de Voyage au Maroc (AEVM préalable gratuite)

Monsieur / Madame l'Officier,

Conformément aux directives consulaires du Royaume du Maroc, j'ai procédé à l'enregistrement préalable de mon Autorisation Électronique de Voyage au Maroc (AEVM) sur le portail officiel gratuit acces-maroc.ma plus de 96 heures avant mon départ.

1. Objet et calendrier du séjour :
Ce déplacement d'une durée prévisionnelle de ${answers.travelDurationDays || 15} jours a pour objet : ${
      isBusiness
        ? 'une mission d’affaires et partenariats professionnels'
        : isStudy
        ? 'un séjour académique et prospection d’études'
        : isMedical
        ? 'un séjour pour soins médicaux'
        : 'un déplacement touristique et familial privé'
    }.

2. Gratuité et authenticité de la démarche :
Je confirme que cette formalité AEVM est strictement gratuite (0 FCFA) et n'a donné lieu à aucun versement auprès d'un intermédiaire non agréé. Je dispose d'un billet aller-retour confirmé, d'un justificatif d'hébergement au Maroc et de moyens de subsistance personnels suffisants.

À l'issue de mon séjour, je regagnerai immédiatement ${countryName}.

${applicantName}
Signature manuscrite :`;
  } else if (isStudy) {
    if (isCanada) {
      lettreMotivation = `${applicantName}
Demeurant à : ${countryName}
Titulaire du Passeport N° : ${passportNumber}
Email : contact@demandeur.org | Tél : (+223 / +221 / +225) [Numéro de contact]

À l'attention de ${consularRecipientTitle}
${consularServiceLine}
${embassyLine}

Date : ${new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
Objet : Demande de permis d'études (IRCC) – Projet académique au Canada et engagement de réinvestissement en ${countryName}

${consularRecipientTitle},

Par la présente, je soumets à votre bienveillante appréciation ma demande de permis d'études afin d'effectuer mon cursus supérieur au Canada au sein de l'Établissement d'Enseignement Désigné (EED) d'accueil conventionné.

1. Cohérence du cursus académique et opportunité stratégique :
Titulaire d'un parcours académique rigoureux et validé en ${countryName}, la poursuite de mes études au Canada s'inscrit dans le prolongement logique direct de mes acquis. Les modules d'excellence dispensés dans ce programme me permettront d'acquérir une expertise technique de pointe, hautement recherchée pour le développement économique de mon pays d'origine.

2. Montage financier transparent et respect scrupuleux des normes IRCC 2026 :
Conformément aux exigences d'Immigration, Réfugiés et Citoyenneté Canada (seuil de subsistance minimal de 23 448 $ CAD par an pour un demandeur seul, en sus du règlement effectif de la première année de scolarité et des frais de transport), mon plan de financement a été rigoureusement audité sans aucun versement artificiel de complaisance. Les ressources mobilisées couvrent l'intégralité des droits de scolarité et l'ensemble des frais de subsistance via des flux bancaires d'une traçabilité absolue certifiés par l'établissement financier émetteur.

3. Perspective irrévocable de retour en ${countryName} (Conformité Alinéa R216 du RIPR) :
Mon projet universitaire s'inscrit dans un plan de carrière rigoureusement orienté vers le marché de l'emploi en ${countryName}. L'essor des secteurs prioritaires nationaux exige des compétences spécialisées. Conformément aux dispositions de l'alinéa R216 du Règlement sur l'immigration et la protection des réfugiés (RIPR), je m'engage solennellement à quitter le territoire canadien dès l'achèvement de mon programme d'études pour regagner ${countryName} et y exercer mes fonctions professionnelles.

La Lettre d'Acceptation (LOA) de l'EED, la Lettre d'Attestation Provinciale (PAL) ainsi que les justificatifs financiers originaux sont annexés au présent dossier.

En vous remerciant pour l'attention portée à ma demande, je vous prie d'agréer, ${consularRecipientTitle}, l'expression de ma haute considération.

${applicantName}
Signature manuscrite :`;
    } else {
      lettreMotivation = `${applicantName}
Demeurant à : ${countryName}
Titulaire du Passeport N° : ${passportNumber}
Email : contact@demandeur.org | Tél : (+221 / +223 / +225) [Numéro de contact]

À l'attention de ${consularRecipientTitle}
${consularServiceLine}
${embassyLine}

Date : ${new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
Objet : Demande de visa de long séjour pour études – Projet académique et plan de réinvestissement en ${countryName}

${consularRecipientTitle},

Par la présente, je soumets à votre bienveillante appréciation ma demande de visa de long séjour pour études afin de suivre le cursus supérieur au sein de l'établissement d'accueil conventionné.

1. Cohérence du cursus académique et opportunité stratégique :
Titulaire d'un parcours académique régulier et validé en ${countryName}, la poursuite de mes études s'inscrit dans le prolongement logique direct de mes acquis. Les modules spécialisés dispensés dans ce programme me permettront d'acquérir une expertise technique d'excellence, introuvable à ce niveau de spécialisation dans mon pays de résidence.

2. Montage financier transparent et respect scrupuleux des seuils légaux 2026 :
Conformément aux normes consulaires en vigueur (seuil réglementaire de 877,50 € / mois soit 10 530 € par an pour la France), mon plan de financement a été rigoureusement audité sans aucun versement artificiel de complaisance. Les ressources mobilisées couvrent l'intégralité des droits universitaires et l'ensemble des frais de subsistance via des flux bancaires d'une traçabilité absolue certifiés par la banque émettrice.

3. Perspective irrévocable de retour et contribution au développement de ${countryName} :
Mon projet universitaire s'inscrit dans un plan de carrière rigoureusement orienté vers le marché de l'emploi en ${countryName}. L'essor des secteurs prioritaires nationaux requiert des cadres hautement qualifiés. Dès l'obtention de mon diplôme, mon engagement formel est de réintégrer mon pays d'origine pour y mettre à profit ces compétences stratégiques.

Je vous transmets l'ensemble des originaux et justificatifs conformes aux exigences consulaires 2026.

En vous remerciant pour l'attention portée à mon dossier, je vous prie d'agréer, ${consularRecipientTitle}, l'expression de ma haute considération.

${applicantName}
Signature manuscrite :`;
    }
  } else if (isBusiness) {
    lettreMotivation = `${applicantName}
Demeurant à : ${countryName}
Passeport N° : ${passportNumber}
Fonction : ${answers.status === 'entrepreneur' ? 'Chef d’Entreprise / Dirigeant commercial' : 'Cadre / Responsable de Mission'}
Entreprise / Organisation : [Nom de l'entreprise en ${countryName}]

À l'attention de ${consularRecipientTitle}
${consularServiceLine}
${embassyLine}

Date : ${new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
Objet : Demande de visa pour mission professionnelle et rencontres d'affaires

${consularRecipientTitle},

J'ai l'honneur de solliciter la délivrance d'un visa de court séjour pour une mission professionnelle d'une durée prévisionnelle de ${answers.travelDurationDays || 10} jours.

1. Objet économique du déplacement :
Ce déplacement s'inscrit dans le cadre du développement partenarial de notre structure en ${countryName} avec nos interlocuteurs professionnels. L'ordre de mission officiel ainsi que la lettre d'invitation détaillée du partenaire hôte sont annexés au présent bordereau.

2. Prise en charge intégrale des frais de mission :
L'ensemble des frais inhérents au voyage (billets d'avion aller-retour, hébergement hôtelier, frais de subsistance et assurance voyage rapatriement) est intégralement pris en charge par l'entreprise mandataire, attesté par les états financiers et relevés bancaires professionnels certifiés.

3. Impératif professionnel de retour en ${countryName} :
En tant que responsable actif, ma présence physique permanente au siège de notre entreprise en ${countryName} est impérative pour superviser les opérations courantes dès l'achèvement des séances de travail programmées.

Restant à votre entière disposition pour tout complément d'information, je vous prie de recevoir, ${consularRecipientTitle}, mes salutations distinguées.

${applicantName}
Signature manuscrite :`;
  } else if (isMedical) {
    lettreMotivation = `${applicantName}
Demeurant à : ${countryName}
Passeport N° : ${passportNumber}

À l'attention de ${consularRecipientTitle}
${consularServiceLine}
${embassyLine}

Date : ${new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
Objet : Demande de visa pour soins médicaux programmés

${consularRecipientTitle},

Je sollicite par la présente un visa pour motif médical afin de recevoir des soins spécialisés au sein de l'établissement hospitalier d'accueil.

1. Protocole médical et admission préalable :
Ce séjour thérapeutique est justifié par le compte-rendu médical circonstancié de mon médecin traitant en ${countryName} et l'accord préalable de prise en charge délivré par le service hospitalier d'accueil.

2. Garantie financière et caution médicale :
L'intégralité du devis estimatif des actes médicaux ainsi que les frais annexes de séjour et d'hébergement ont fait l'objet d'un règlement préalable ou d'un blocage de caution bancaire certifiée, conformément aux dispositions consulaires en vigueur.

3. Convalescence et retour au pays de résidence :
Dès la stabilisation de mon état de santé et l'autorisation formelle du praticien responsable, je regagnerai immédiatement ${countryName} auprès de ma famille.

Je vous remercie pour votre bienveillance dans le traitement de cette demande et vous prie d'agréer mes salutations respectueuses.

${applicantName}
Signature manuscrite :`;
  } else {
    // Tourist / Family Visit / Private stay
    if (isCanada) {
      lettreMotivation = `${applicantName}
Demeurant à : ${countryName}
Passeport N° : ${passportNumber}
Profession : ${answers.status === 'salarie' ? 'Salarié sous contrat à durée indéterminée' : answers.status === 'fonctionnaire' ? 'Agent titulaire de la fonction publique' : 'Professionnel indépendant / Commerçant'}

À l'attention de ${consularRecipientTitle}
${consularServiceLine}
${embassyLine}

Date : ${new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
Objet : Demande de visa de résident temporaire (VRT Visiteur IRCC) – Séjour au Canada et garanties de retour en ${countryName}

${consularRecipientTitle},

J'ai l'honneur de solliciter la délivrance d'un visa de résident temporaire (visa de visiteur) pour un séjour au Canada d'une durée de ${answers.travelDurationDays || 15} jours.

1. Objet et calendrier du séjour au Canada :
Ce voyage a pour finalité exclusive un séjour touristique et familial privé minutieusement préparé. Mon itinéraire complet, la lettre d'invitation avec preuve de statut au Canada de l'hôte, les réservations confirmées et l'assurance voyage internationale sont joints au présent dossier.

2. Conformité et solvabilité financière :
Mes relevés bancaires personnels des 6 derniers mois attestent de flux réguliers et stables, issus exclusivement de mon activité économique déclarée en ${countryName}. Les montants disponibles couvrent l'intégralité des dépenses prévues en Dollars Canadiens ($ CAD) sans aucun versement soudain inexpliqué.

3. Attaches majeures et garantie formelle de départ (Article R179 du RIPR) :
Mon ancrage socio-économique dans mon pays de résidence (${countryName}) est indiscutable :
- Sur le plan professionnel : mon employeur m'a délivré une attestation d'emploi et de congé avec reprise de fonctions obligatoire dès mon retour ;
- Sur le plan familial et patrimonial : mon foyer, mes proches et mes obligations matérielles demeurent établis en ${countryName}.

À l'expiration de la période autorisée par IRCC, je quitterai immédiatement le Canada pour réintégrer ${countryName} en pleine conformité avec les règlements sur l'immigration.

Je vous prie de recevoir, ${consularRecipientTitle}, l'assurance de mes salutations distinguées.

${applicantName}
Signature manuscrite :`;
    } else {
      lettreMotivation = `${applicantName}
Demeurant à : ${countryName}
Passeport N° : ${passportNumber}
Profession : ${answers.status === 'salarie' ? 'Salarié sous contrat à durée indéterminée' : answers.status === 'fonctionnaire' ? 'Agent titulaire de la fonction publique' : 'Professionnel indépendant / Commerçant'}

À l'attention de ${consularRecipientTitle}
${consularServiceLine}
${embassyLine}

Date : ${new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
Objet : Demande de visa de court séjour – Justification du séjour et garanties de retour en ${countryName}

${consularRecipientTitle},

J'ai l'honneur de solliciter la délivrance d'un visa de court séjour pour un déplacement d'une durée de ${answers.travelDurationDays || 15} jours.

1. Objet et calendrier du séjour :
Ce voyage a pour finalité exclusive un séjour touristique et familial privé minutieusement préparé. Mon itinéraire complet, le justificatif d'hébergement officiel (attestation d'accueil légalisée ou réservation confirmée) et l'assurance voyage internationale couvrant au minimum 30 000 € sont joints au présent dossier.

2. Conformité et solvabilité financière :
Mes relevés bancaires personnels des 6 derniers mois attestent de flux réguliers et stables, issus exclusivement de mon activité économique déclarée en ${countryName}. Les montants disponibles excèdent largement les barèmes journaliers officiels requis sans aucun dépôt soudain non justifié.

3. Attaches majeures et retour immédiat en ${countryName} :
Mon ancrage socio-économique dans mon pays de résidence est indiscutable :
- Sur le plan professionnel : mon employeur m'a délivré une attestation de congé précisant ma réintégration obligatoire dès le terme du séjour ;
- Sur le plan familial et patrimonial : mon foyer, mes proches et mes obligations matérielles demeurent établis en ${countryName}.

À l'expiration de la période autorisée, je regagnerai immédiatement mon pays conformément au Code des Visas.

Je vous prie de recevoir, ${consularRecipientTitle}, l'assurance de mes salutations distinguées.

${applicantName}
Signature manuscrite :`;
    }
  }

  // 2. Lettre d'engagement du garant financier
  let garantFinancialThreshold = '1. Le versement d\'une allocation mensuelle conforme aux normes légales (minimum 877,50 € / mois soit 10 530 € par an pour la France).';
  if (isCanada) {
    garantFinancialThreshold = '1. Le versement d\'une pension ou allocation mensuelle conforme aux normes légales d\'IRCC (seuil de subsistance de 23 448 $ CAD par an + couverture des droits de scolarité ou frais de séjour).';
  } else if (isMorocco) {
    garantFinancialThreshold = isExemptCountryForMorocco
      ? '1. La prise en charge intégrale des frais de séjour, d\'hébergement et de subsistance au Royaume du Maroc sans recours aux deniers publics (Régime bilatéral sans visa).'
      : isIvorian
      ? '1. La couverture intégrale des frais de séjour, de transport et de subsistance au Royaume du Maroc pour la durée du e-Visa (30 jours maximum, portail acces-maroc.ma).'
      : '1. La couverture des frais de subsistance et d\'hébergement au Royaume du Maroc conformément aux dispositions consulaires marocaines.';
  } else if (!isFrance) {
    garantFinancialThreshold = `1. Le versement régulier des allocations de séjour conformément au barème officiel fixé par les autorités consulaires de ${consularInfo.destinationName}.`;
  }

  const lettreGarant = `${guarantorName}
Demeurant à : [Adresse complète du Garant]
Profession / Fonction : [Profession ou Titre, ex. Cadre Supérieur / Commerçant agréé]
Employeur / Entreprise : [Nom de l'organisme ou société]
Téléphone : [Numéro vérifiable] | Email : [Email officiel]

À l'attention du Service des Visas et de l'Immigration
${garantRecipientLine}

Date : ${new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
Objet : Engagement formel de prise en charge financière et d'hébergement
Demandeur soutenu : ${applicantName} (Passeport : ${passportNumber})
Lien avec le demandeur : ${answers.guarantorRelation || 'Parent direct'}

Je soussigné(e), ${guarantorName}, déclare sur l'honneur par la présente m'engager de manière irrévocable à subvenir à l'ensemble des besoins matériels, financiers et médicaux de ${applicantName} durant toute la durée de son séjour / ses études sur le territoire de destination (${consularInfo.destinationName}).

Cet engagement comprend expressément :
${garantFinancialThreshold}
2. La garantie de son hébergement (attestation d'hébergement officielle, bail ou mise à disposition de logement conforme).
3. La prise en charge intégrale des frais de rapatriement sanitaire si nécessaire.

Pour attester de ma solvabilité et de mon reste à vivre largement suffisant après prise en charge, je joins au présent engagement :
- La copie certifiée conforme de ma pièce d'identité officielle / titre de séjour régulier ;
- Mes trois derniers bulletins de salaire ou bilans comptables certifiés ;
- Mon dernier avis d'imposition sur le revenu certifié par l'administration fiscale ;
- Mes relevés bancaires originaux des six derniers mois visés et tamponnés par l'établissement teneur de compte ;
- L'acte d'état civil légalisé établissant notre lien familial.

Fait pour servir et valoir ce que de droit auprès des autorités consulaires compétentes.

${guarantorName}
Fait à [Ville de signature], le [Date]
Signature manuscrite :`;

  // 3. Note explicative des attaches au pays d'origine
  const noteAttachesLawReference = isCanada
    ? 'Alinéa R216 et Article L179 du Règlement sur l\'immigration et la protection des réfugiés (IRCC Canada)'
    : isFrance
    ? 'Article 32 du Code Communautaire des Visas Schengen'
    : isMorocco
    ? 'Loi n° 02-03 relative à l\'entrée et au séjour des étrangers au Royaume du Maroc et conventions bilatérales'
    : `Directives consulaires officielles applicables auprès de ${consularInfo.destinationName}`;

  const noteAttaches = `NOTE DE SYNTHÈSE : JUSTIFICATION DES ATTACHES AU PAYS D'ORIGINE
Demandeur : ${applicantName} | Passeport N° : ${passportNumber} | Résidence principale : ${countryName}
Objet : Démonstration probante de la volonté et de l'obligation de retour (${noteAttachesLawReference})

${consularRecipientTitle},

En application des critères réglementaires d'instruction, le présent argumentaire formalise les éléments matériels, juridiques et économiques établissant avec certitude l'obligation de retour du demandeur en ${countryName} à l'issue de son séjour.

I. ATTACHES PROFESSIONNELLES ET ÉCONOMIQUES EN ${countryName.toUpperCase()} :
- Statut actuel : ${
    answers.status === 'salarie'
      ? 'Salarié en contrat CDI dans une structure pérenne'
      : answers.status === 'entrepreneur'
      ? 'Dirigeant d’entreprise immatriculée au registre du commerce local'
      : answers.status === 'fonctionnaire'
      ? 'Fonctionnaire titulaire de l’Administration étatique'
      : 'Étudiant inscrit dans un cycle d’excellence orienté vers l’emploi local'
  }.
- Attestation d'absence et garantie contractuelle : Lettre de l'employeur certifiant la mise en congé et la reprise de fonctions obligatoire au retour.
- Ancrage bancaire local : Historique bancaire actif et certifié dans le pays de résidence.

II. ATTACHES FAMILIALES ET SOCIALES :
- Foyer et responsabilités directes établis en ${countryName} (présentation des actes d'état civil légalisés).
- Réseau d'entraide et présence indispensable auprès des ascendants ou descendants au pays.

III. PROJET POST-SÉJOUR :
L'objet de la présente demande est strictement délimité. À son terme, le demandeur regagnera sans délai ${countryName} pour y poursuivre sa trajectoire professionnelle et familiale.

Certifié exact et sincère pour valoir justification légale.

${applicantName}
Signature manuscrite :`;

  // 4. Checklist Consulaire
  let studyAdmissionDoc = 'Attestation d’Inscription / d’Admission officielle de l’établissement d’accueil';
  let visitorHostingDoc = 'Justificatif d’hébergement officiel ou réservation hôtelière ferme';

  if (isCanada) {
    studyAdmissionDoc = 'Lettre d’Attestation Provinciale (PAL) + Lettre d’Acceptation (LOA) de l’EED';
    visitorHostingDoc = 'Lettre d’Invitation au Canada + Preuve de statut de l’hôte (T4 / Avis de cotisation / Carte RP)';
  } else if (isFrance) {
    studyAdmissionDoc = 'Attestation d’Admission + Accord préalable Campus France (EEF)';
    visitorHostingDoc = 'Attestation d’Accueil délivrée en Mairie ou Réservation Hôtelière Ferme';
  }

  let checklistOriginals = [
    {
      item: 'Passeport Original valide > 6 mois',
      notes: 'Avec au minimum 2 pages vierges consécutives exemptes de tout cachet.',
      critical: true,
    },
    {
      item: 'Relevés Bancaires Originaux des 3 à 6 derniers mois',
      notes: 'Chaque page impérativement visée par le cachet humide et la signature de la banque.',
      critical: true,
    },
    {
      item: isStudy
        ? studyAdmissionDoc
        : isBusiness
        ? 'Ordre de mission employeur + Invitation officielle de l’entreprise partenaire'
        : isMedical
        ? 'Devis hospitalier visé + Accord préalable du médecin praticien'
        : visitorHostingDoc,
      notes: 'Document original indispensable pour justifier de l’objet du séjour.',
      critical: true,
    },
    {
      item: answers.fundingSource === 'bourse_officielle'
        ? 'Attestation d’Attribution de Bourse Officielle'
        : answers.fundingSource === 'autofinancement'
        ? 'Attestation Bancaire Personnelle et Relevés Certifiés'
        : 'Attestation de Prise en Charge Financière Manuscrite du Garant',
      notes: 'Accompagnée des preuves d’identité et de solvabilité du garant.',
      critical: true,
    },
    {
      item: answers.status === 'salarie' || answers.status === 'fonctionnaire'
        ? 'Attestation de Travail + 3 Derniers Bulletins de Paie + Ordre de Congé'
        : answers.status === 'entrepreneur'
        ? 'Registre du Commerce (RCCM) + Carte d’Identité Fiscale + Bilans Certifiés'
        : 'Certificat de Scolarité / Dernier Diplôme Obtenu',
      notes: 'Prouve l’ancrage professionnel ou académique et le retour garanti.',
      critical: true,
    },
  ];

  if (isMorocco) {
    if (isExemptCountryForMorocco) {
      checklistOriginals = [
        {
          item: 'Passeport Original valide > 6 mois',
          notes: 'Passeport ordinaire en cours de validité dispensé de visa en vertu de l’accord bilatéral.',
          critical: true,
        },
        {
          item: 'Billet d’Avion Aller-Retour Confirmé',
          notes: 'Titre de transport aller-retour dont la date de retour n’excède pas 90 jours.',
          critical: true,
        },
        {
          item: 'Justificatif d’Hébergement au Maroc',
          notes: 'Réservation d’hôtel confirmée ou lettre d’invitation légalisée avec pièce d’identité de l’hôte.',
          critical: true,
        },
        {
          item: 'Fiche Sanitaire & Débarquement PAF (remise à bord)',
          notes: 'Formulaire de débarquement remis dans l’avion et présenté au poste frontière de l’aéroport.',
          critical: true,
        },
        {
          item: 'Moyens Financiers Personnels',
          notes: 'Carte bancaire internationale, devises déclarées ou relevé attestant de votre autonomie financière.',
          critical: false,
        },
      ];
    } else if (isIvorian) {
      checklistOriginals = [
        {
          item: 'Récépissé e-Visa imprimé en couleur (acces-maroc.ma)',
          notes: 'Reçu officiel d’approbation du visa électronique avec QR Code consulaire (~770 MAD).',
          critical: true,
        },
        {
          item: 'Passeport Biométrique Ivoirien valide > 6 mois',
          notes: 'Passeport biométrique avec 2 pages vierges au minimum.',
          critical: true,
        },
        {
          item: 'Billet d’Avion Aller-Retour Confirmé (Séjour ≤ 30 jours)',
          notes: 'Le e-Visa pour le Maroc est limité à 30 jours maximum non prorogeables.',
          critical: true,
        },
        {
          item: 'Justificatif d’Hébergement au Maroc',
          notes: 'Réservation d’hôtel ferme ou attestation d’hébergement chez un résident au Maroc.',
          critical: true,
        },
        {
          item: 'Relevés Bancaires des 3 derniers mois certifiés',
          notes: 'Attestant de revenus réguliers et suffisants pour la durée du séjour.',
          critical: true,
        },
      ];
    } else if (isAevmCountry) {
      checklistOriginals = [
        {
          item: 'Autorisation Électronique de Voyage (AEVM) imprimée',
          notes: 'Document officiel gratuit généré sur acces-maroc.ma au moins 96h avant le départ.',
          critical: true,
        },
        {
          item: 'Passeport Original valide > 6 mois',
          notes: 'Passeport ordinaire en cours de validité.',
          critical: true,
        },
        {
          item: 'Billet d’Avion Aller-Retour Confirmé',
          notes: 'Titre de transport retour obligatoire.',
          critical: true,
        },
        {
          item: 'Justificatif d’Hébergement au Maroc',
          notes: 'Réservation hôtelière ou lettre d’invitation.',
          critical: true,
        },
      ];
    }
  }

  const checklistCopies = [
    {
      item: 'Photocopie des pages d’identité et anciens visas du passeport',
      notes: 'Format A4 clair, lisible, sans rognage des marges.',
      critical: true,
    },
    {
      item: 'Copie intégrale d’Acte de Naissance légalisée',
      notes: 'Établit la filiation légale et les attaches familiales directes.',
      critical: false,
    },
    {
      item: 'Attestation d’Assurance Voyage et Rapatriement',
      notes: isCanada
        ? 'Assurance médicale internationale couvrant la durée du séjour.'
        : isMorocco
        ? 'Assurance assistance voyage internationale couvrant le séjour au Maroc.'
        : 'Couverture minimale légale obligatoire de 30 000 €.',
      critical: true,
    },
    {
      item: 'Copies des diplômes, relevés de notes et attestations de travail',
      notes: 'Certifiées conformes par l’établissement émetteur ou la mairie.',
      critical: isStudy,
    },
  ];

  // 5. Format WhatsApp optimisé
  const biometricCenterText = isCanada
    ? (countryProfile.biometricCenters.canada?.join(', ') || 'CRDV VFS Global Canada')
    : isFrance
    ? (countryProfile.biometricCenters.france?.join(', ') || 'Centre TLScontact / VFS Global France')
    : (consularInfo.biometricProviders?.join(', ') || 'Centre consulaire agréé');

  const moroccoSectionText = isMorocco
    ? `\n*2. PROTOCOLE MAROC 2026 :*\n• Statut pour ${countryName} : ${countryProfile.moroccoAgreement.label}\n• Détail : ${countryProfile.moroccoAgreement.details}\n`
    : '';

  let moroccoOfficialCost = `${consularInfo.visaFeeFcfa.toLocaleString('fr-FR')} FCFA`;
  if (isMorocco) {
    if (isExemptCountryForMorocco) {
      moroccoOfficialCost = '0 FCFA (Exemption Totale Bilatérale)';
    } else if (isIvorian) {
      moroccoOfficialCost = '52 000 FCFA (~770 MAD e-Visa sur acces-maroc.ma)';
    } else if (isAevmCountry) {
      moroccoOfficialCost = '0 FCFA (AEVM préalable gratuite sur acces-maroc.ma)';
    } else {
      moroccoOfficialCost = `${consularInfo.visaFeeFcfa.toLocaleString('fr-FR')} FCFA (Visa consulaire)`;
    }
  }

  const whatsappRoadmap = `*DOSSIER VISAFLOW CERTIFIÉ 2026*
*Demandeur :* ${applicantName} (${countryName})
*Motif :* ${reason.toUpperCase()}
*Destination :* ${consularInfo.destinationName}

*1. SEUILS & FRAIS LÉGAUX :*
• Frais officiels : ${isMorocco ? moroccoOfficialCost : `${consularInfo.visaFeeFcfa.toLocaleString('fr-FR')} FCFA`} (${consularInfo.officialSourcePortal})
• Solde/Barème officiel : ${consularInfo.financialThresholdsSummary}
• Centre biométrique : ${biometricCenterText}${moroccoSectionText}
*${isMorocco ? '3' : '2'}. CHECKLIST PRIORITAIRE ORIGINAUX :*
${checklistOriginals.map((o) => `[ ] ${o.item} - ${o.notes}`).join('\n')}

*${isMorocco ? '4' : '3'}. RÈGLE D'OR CONSULAIRE :*
Tout dépôt bancaire massif non justifié par acte notarié = refus direct Motif R216 / Fraude. Conservez vos relevés authentiques et certifiés !

Généré avec l'assistant VisaFlow Afrique 2026`;

  // Sanitary status calculation
  let sanitaryStatus: 'vert' | 'orange' | 'rouge' = 'vert';
  let sanitaryVerdict = isExemptCountryForMorocco
    ? 'Exemption Bilatérale Validée : Entrée Sans Visa et Sans AEVM (0 FCFA)'
    : isMorocco && isIvorian
    ? 'e-Visa Préalable Obligatoire sur acces-maroc.ma (~770 MAD)'
    : isMorocco && isAevmCountry
    ? 'AEVM Obligatoire sur acces-maroc.ma (Min. 96h avant le vol)'
    : 'Dossier Conforme & Équilibré';

  if (answers.hasRecentLumpDeposit && !answers.lumpDepositExplanation && !isExemptCountryForMorocco) {
    sanitaryStatus = 'rouge';
    sanitaryVerdict = 'Alerte Critique : Dépôt bancaire massif non justifié (Risque refus immédiat)';
  } else if (
    (answers.status === 'sans_emploi_formel' || answers.tiesType === 'faibles_attaches') &&
    !isExemptCountryForMorocco
  ) {
    sanitaryStatus = 'orange';
    sanitaryVerdict = 'Attention : Attaches socio-économiques à renforcer impérativement';
  }

  return {
    dossierId,
    lettreMotivation,
    lettreGarant,
    noteAttaches,
    checklistOriginals,
    checklistCopies,
    whatsappRoadmap,
    summaryHighlights: {
      destination: isExemptCountryForMorocco
        ? `${consularInfo.destinationName} (Régime Sans Visa Bilatéral)`
        : consularInfo.destinationName,
      officialCost: isMorocco
        ? moroccoOfficialCost
        : `${consularInfo.visaFeeFcfa.toLocaleString('fr-FR')} FCFA`,
      financialRule: isExemptCountryForMorocco
        ? '0 visa requis. Passeport valide > 6 mois, billet retour et hébergement.'
        : consularInfo.financialThresholdsSummary,
      sanitaryStatus,
      sanitaryVerdict,
    },
  };
}
