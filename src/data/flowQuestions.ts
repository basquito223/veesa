import { FlowQuestion } from '../types';

export const FLOW_QUESTIONS: FlowQuestion[] = [
  // ÉTAPE 1 : RAISON PRINCIPALE DU SÉJOUR (MOTIF DU VISA)
  {
    id: 'visaReason',
    stepNumber: 1,
    totalSteps: 7,
    stepTitle: 'Motif du Séjour & Finalité',
    categoryTitle: 'Orientation Préliminaire Obligatoire',
    question: 'Pour quelle raison principale demandes-tu un visa ?',
    helperText: 'Le motif détermine l’ensemble des pièces justificatives, le barème financier légal et les critères de refus consulaire.',
    options: [
      {
        id: 'etudes',
        label: '🎓 Études Universitaires / Formation Supérieure (Long Séjour)',
        subtitle: 'Licence, Master, Doctorat, Grandes écoles ou formations certifiantes',
        badge: 'Filière Académique',
        feedback: {
          type: 'positive',
          title: 'Projet d’études supérieures ciblé',
          message:
            'Excellente orientation ! Le visa pour études requiert un projet académique cohérent, des relevés de notes authentifiés et un plan de financement solide (garant solvable, bourse ou compte bloqué).',
          officialRule: 'Exige une admission ferme dans un établissement d’enseignement supérieur et la justification de ressources suffisantes pour couvrir l’année académique.',
        },
      },
      {
        id: 'tourisme_visite',
        label: '👨‍👩‍👧 Tourisme, Visite Familiale ou Séjour Privé (Court Séjour)',
        subtitle: 'Visite de parents/amis, vacances ou séjour de découverte (< 90 jours)',
        badge: 'Court Séjour Visiteur',
        feedback: {
          type: 'positive',
          title: 'Séjour privé ou familial',
          message:
            'Parfait ! La réussite d’un visa visiteur repose sur deux piliers : un justificatif d’hébergement probant (attestation d’accueil ou réservation hôtelière) et la preuve irréfutable d’attaches socio-économiques au pays pour garantir le retour.',
          officialRule: 'Exige un justificatif d’hébergement officiel et la preuve de ressources suffisantes pour la durée intégrale du séjour.',
        },
      },
      {
        id: 'affaires_mission',
        label: '💼 Mission Professionnelle, Affaires ou Congrès International',
        subtitle: 'Participation à un salon, négociation de contrat, formation d’entreprise',
        badge: 'Affaires & Commerce',
        feedback: {
          type: 'positive',
          title: 'Déplacement professionnel formel',
          message:
            'Très bien ! L’ordre de mission de votre employeur avec prise en charge intégrale des frais et la lettre d’invitation officielle de l’entreprise partenaire sont ici prépondérants.',
          officialRule: 'Exige la preuve d’une activité économique légalement déclarée (RCCM, NIF, relevés d’entreprise).',
        },
      },
      {
        id: 'soins_medicaux',
        label: '🩺 Soins Médicaux & Évacuation Sanitaire Programmée',
        subtitle: 'Hospitalisation spécialisée, bilan thérapeutique, chirurgie programmée',
        badge: 'Santé & Médical',
        feedback: {
          type: 'positive',
          title: 'Demande de visa pour soins médicaux',
          message:
            'Dossier sensible et prioritaire : il nécessite le devis estimatif visé par l’établissement hospitalier d’accueil, l’accord préalable du praticien et la consignation/garantie bancaire des frais médicaux.',
          officialRule: 'Attestation de paiement ou caution médicale préalable obligatoire pour l’instruction.',
        },
      },
      {
        id: 'travail_stage',
        label: '🏢 Stage en Entreprise / Emploi Salarié ou Perfectionnement',
        subtitle: 'Convention de stage tripartite visée ou contrat de travail temporaire',
        badge: 'Stage & Emploi',
        feedback: {
          type: 'positive',
          title: 'Stage conventionné ou mobilité professionnelle',
          message:
            'Noté ! La convention de stage dûment signée par les trois parties ou l’autorisation provisoire de travail délivrée par l’administration compétente est obligatoire.',
          officialRule: 'Exige une convention de stage officielle visée ou une autorisation de travail préalable délivrée par les autorités du pays hôte.',
        },
      },
    ],
  },

  // ÉTAPE 2 : PAYS DE CITOYENNETÉ DU DEMANDEUR
  {
    id: 'countryOfOrigin',
    stepNumber: 2,
    totalSteps: 7,
    stepTitle: 'Nationalité & Résidence',
    categoryTitle: 'Ancrage Géographique',
    question: 'Quelle est votre nationalité ?',
    helperText: 'Choisissez le pays dont vous détenez le passeport.',
    options: [
      {
        id: 'mali',
        label: '🇲🇱 Mali (Bamako)',
        subtitle: 'Passeport malien ordinaire | Circonscription consulaire de Bamako',
        badge: '🇲🇱 Mali',
        feedback: {
          type: 'positive',
          title: 'Circonscription Consulaire de Bamako',
          message:
            'Votre nationalité malienne est enregistrée. Les exigences de validité du passeport et les représentations consulaires agréées à Bamako sont prises en compte.',
          officialRule: 'Passeport valide au moins 3 à 6 mois au-delà de la date de retour prévue avec 2 pages vierges.',
        },
      },
      {
        id: 'senegal',
        label: '🇸🇳 Sénégal (Dakar)',
        subtitle: 'Passeport sénégalais ordinaire | Circonscription consulaire de Dakar',
        badge: '🇸🇳 Sénégal',
        feedback: {
          type: 'positive',
          title: 'Circonscription Consulaire de Dakar',
          message:
            'Votre nationalité sénégalaise est enregistrée. Les représentations consulaires et centres de traitement agréés à Dakar sont pris en compte.',
          officialRule: 'Passeport en cours de validité avec un minimum de 2 pages consécutives vierges.',
        },
      },
      {
        id: 'cote_ivoire',
        label: '🇨🇮 Côte d’Ivoire (Abidjan)',
        subtitle: 'Passeport ivoirien ordinaire | Circonscription consulaire d’Abidjan',
        badge: '🇨🇮 Côte d’Ivoire',
        feedback: {
          type: 'positive',
          title: 'Circonscription Consulaire d’Abidjan',
          message:
            'Votre nationalité ivoirienne est enregistrée. Les représentations consulaires et centres accrédités à Abidjan sont pris en compte.',
          officialRule: 'Passeport biométrique CEDEAO en cours de validité requis.',
        },
      },
      {
        id: 'guinee',
        label: '🇬🇳 Guinée (Conakry)',
        subtitle: 'Passeport guinéen ordinaire | Circonscription consulaire de Conakry',
        badge: '🇬🇳 Guinée',
        feedback: {
          type: 'positive',
          title: 'Circonscription Consulaire de Conakry',
          message:
            'Votre nationalité guinéenne est enregistrée. Les représentations consulaires et centres de traitement à Conakry sont pris en compte.',
          officialRule: 'Passeport ordinaire ou biométrique valide au moins 6 mois.',
        },
      },
      {
        id: 'cameroun',
        label: '🇨🇲 Cameroun (Yaoundé / Douala)',
        subtitle: 'Passeport camerounais | Circonscriptions de Yaoundé et Douala',
        badge: '🇨🇲 Cameroun',
        feedback: {
          type: 'positive',
          title: 'Circonscription Consulaire Camerounaise',
          message:
            'Votre nationalité camerounaise est enregistrée. Les centres consulaires agréés à Yaoundé et Douala sont pris en compte.',
          officialRule: 'Passeport en cours de validité et vérification stricte de l’authenticité des pièces d’état civil.',
        },
      },
      {
        id: 'benin',
        label: '🇧🇯 Bénin (Cotonou)',
        subtitle: 'Passeport béninois ordinaire | Circonscription consulaire de Cotonou',
        badge: '🇧🇯 Bénin',
        feedback: {
          type: 'positive',
          title: 'Circonscription Consulaire de Cotonou',
          message:
            'Votre nationalité béninoise est enregistrée. Les représentations consulaires agréées à Cotonou sont prises en compte.',
          officialRule: 'Passeport biométrique valide et certificat d’identification personnelle recommandés.',
        },
      },
      {
        id: 'autre_pays_dropdown',
        label: '🌍 Autre nationalité (Sélectionner dans la liste)',
        subtitle: 'Togo, Burkina Faso, Niger, Gabon, Congo, RDC, Tchad, Mauritanie, etc.',
        badge: '54 pays d’Afrique',
        feedback: {
          type: 'positive',
          title: 'Sélection interactive du pays de nationalité',
          message:
            'Choisissez votre nationalité dans la liste pour calibrer la validité du passeport et la juridiction consulaire compétente.',
        },
      },
    ],
    allowFreeInput: true,
    freeInputPlaceholder: 'Ou écris ton pays de nationalité (ex: Gabon, Togo, Congo, RDC...)',
    inputFieldKey: 'countryOfOrigin',
  },

  // ÉTAPE 3 : DESTINATION
  {
    id: 'destination',
    stepNumber: 3,
    totalSteps: 7,
    stepTitle: 'Destination',
    categoryTitle: 'Pays de Destination',
    question: 'Quel est votre pays de destination ?',
    helperText: 'Choisissez le pays où vous souhaitez vous rendre. Les barèmes officiels 2026 s’adapteront automatiquement à votre motif.',
    options: [
      {
        id: 'france',
        label: '🇫🇷 France / Espace Schengen',
        subtitle: 'France et 29 pays de l’espace Schengen européen',
        badge: 'Schengen Europe',
        feedback: {
          type: 'positive',
          title: 'France & Espace Schengen',
          message:
            'Les règles et barèmes légaux s’adaptent automatiquement à votre motif de séjour déclaré à l’étape 1.',
          officialRule: 'Procédure officielle via France-Visas et centre de dépôt TLScontact / VFS Global.',
        },
      },
      {
        id: 'canada',
        label: '🇨🇦 Canada',
        subtitle: 'Toutes provinces canadiennes — Formalités d’immigration IRCC',
        badge: 'IRCC Canada',
        feedback: {
          type: 'positive',
          title: 'Canada (IRCC)',
          message:
            'Les exigences financières et justificatives sont automatiquement calibrées selon votre motif.',
          officialRule: 'Dépôt du dossier en ligne sur le portail officiel IRCC avec biométrie au CRDV.',
        },
      },
      {
        id: 'maroc',
        label: '🇲🇦 Maroc',
        subtitle: 'Royaume du Maroc — Accords bilatéraux, e-Visa ou AEVM selon votre nationalité',
        badge: 'Accords Bilatéraux',
        feedback: {
          type: 'positive',
          title: 'Royaume du Maroc',
          message:
            'Actualisation vérifiée : Les Maliens et Sénégalais bénéficient d’une exemption totale de visa bilatérale (0 visa, 0 FCFA, séjour jusqu’à 90 jours avec passeport valide). Les Ivoiriens doivent obtenir un e-Visa officiel sur acces-maroc.ma.',
          officialRule: 'Portail d’État unique : acces-maroc.ma. Les pays exemptés ne paient aucun frais de visa.',
        },
      },
      {
        id: 'turquie',
        label: '🇹🇷 Turquie',
        subtitle: 'République de Turquie — E-Visa officiel ou visa physique Gateway Globe',
        badge: 'Turquie',
        feedback: {
          type: 'warning',
          title: 'Alerte Consulaire Turquie !',
          message:
            'Le e-Visa en ligne (evisa.gov.tr) est STRICTEMENT conditionné à la détention d’un visa valide Schengen, USA, UK ou Irlande. Sans cela, obligation de déposer un visa physique chez Gateway Globe.',
          officialRule: 'Seul portail officiel légal : evisa.gov.tr (~60 USD).',
        },
      },
      {
        id: 'dubai',
        label: '🇦🇪 Dubaï (Émirats Arabes Unis)',
        subtitle: 'Émirats Arabes Unis — E-Visa court séjour & affaires via filières agréées',
        badge: 'GDRFA Dubaï',
        feedback: {
          type: 'positive',
          title: 'Visa Émirats Arabes Unis',
          message:
            'Délivrance rapide et traçable via les compagnies aériennes officielles ou agences GDRFA agréées. Passeport valide 6 mois minimum.',
          officialRule: 'Attention aux faux "visas de travail 2 ans" vendus sur les réseaux sociaux.',
        },
      },
      {
        id: 'autre',
        label: '🌍 Autre pays',
        subtitle: 'États-Unis, Royaume-Uni, Chine, Belgique, Allemagne, etc.',
        badge: 'Catalogue Mondial',
        feedback: {
          type: 'positive',
          title: 'Destination internationale personnalisée',
          message:
            'Sélectionnez votre pays dans le catalogue mondial pour adapter les exigences consulaires.',
        },
      },
    ],
  },

  // ÉTAPE 4 : SITUATION SOCIO-PROFESSIONNELLE DU DEMANDEUR
  {
    id: 'status',
    stepNumber: 4,
    totalSteps: 7,
    stepTitle: 'Profil Professionnel ou Académique',
    categoryTitle: 'Stabilité & Ancrage',
    question: 'Quelle est ta situation actuelle dans ton pays de résidence ?',
    helperText: 'L’officier consulaire évalue ta trajectoire, ta stabilité et la cohérence avec le visa sollicité.',
    options: [
      {
        id: 'etudiant',
        label: '🎓 Étudiant / Jeune Diplômé',
        subtitle: 'En cours de licence, master, ou diplôme récent avec projet de poursuite logique',
        badge: 'Filière Études',
        feedback: {
          type: 'positive',
          title: 'Trajectoire académique claire',
          message:
            'Parfait ! Ton projet d’études doit montrer une suite logique avec tes diplômes antérieurs (pas de rupture incohérente de filière).',
        },
      },
      {
        id: 'salarie',
        label: '💼 Salarié du Secteur Privé (CDI / CDD)',
        subtitle: 'Avec bulletins de paie, déclaration de sécurité sociale et attestation de congés',
        badge: 'Profil Solide',
        feedback: {
          type: 'positive',
          title: 'Excellente ancre professionnelle !',
          message:
            'C’est noté, dossier solide ! Un contrat de travail et 3 fiches de salaire récentes sont des preuves d’attache majeures.',
        },
      },
      {
        id: 'entrepreneur',
        label: '🏢 Commerçant / Chef d’Entreprise / Prestataire',
        subtitle: 'Détenteur d’un RCCM, NIF, relevés de compte d’entreprise et patentes',
        badge: 'Entrepreneur',
        feedback: {
          type: 'positive',
          title: 'Activité économique enregistrée',
          message:
            'Très bon profil ! Il faudra impérativement joindre le RCCM, l’avis d’imposition et les relevés bancaires professionnels.',
        },
      },
      {
        id: 'fonctionnaire',
        label: '🏛️ Fonctionnaire / Agent de l’État',
        subtitle: 'Arrêté d’intégration, bulletin de solde et autorisation officielle de sortie',
        badge: 'Stabilité Maximale',
        feedback: {
          type: 'positive',
          title: 'Statut étatique hautement crédible',
          message:
            'Idéal ! Les fonctionnaires présentent un taux de retour garanti grâce à leur poste garanti au pays.',
        },
      },
      {
        id: 'sans_emploi_formel',
        label: '⚠️ Sans Emploi Formel / Activité Informelle',
        subtitle: 'Pas de fiches de paie ou de registre de commerce enregistré',
        badge: 'Flash Alerte Consulaire',
        feedback: {
          type: 'critical',
          title: 'Flash Alerte Consulaire ⚠️ : Risque élevé de refus Motif 2/10 !',
          message:
            'ATTENTION : L’absence d’emploi formel ou d’activité enregistrée est la première cause de refus de visa court séjour (soupçon d’émigration clandestine). Vous devez impérativement vous appuyer sur un garant local solide, des attaches familiales majeures (enfants, conjoint) ou formaliser une activité.',
          officialRule: 'L’officier consulaire doit être certain que vous avez un intérêt supérieur à revenir dans votre pays.',
          actionRequired: 'Désigner un garant financier de premier rang et justifier d’attaches patrimoniales ou familiales indiscutables.',
        },
      },
    ],
  },

  // ÉTAPE 5 : MONTAGE FINANCIER & SOLVABILITÉ
  {
    id: 'fundingSource',
    stepNumber: 5,
    totalSteps: 7,
    stepTitle: 'Montage Financier & Solvabilité',
    categoryTitle: 'Le nerf de la guerre',
    question: 'Comment est financé ton séjour ou tes études ?',
    helperText: 'Les consulats exigent des justificatifs financiers incontestables, avec une traçabilité totale.',
    options: [
      {
        id: 'autofinancement',
        label: 'A. Autofinancement (Mon propre compte bancaire)',
        subtitle: 'Historique bancaire personnel de 3 à 6 mois avec solde régulier suffisant',
        badge: 'Autonome',
        feedback: {
          type: 'positive',
          title: 'Autonomie financière déclarée',
          message:
            'Superbe si le compte est actif ! Règle d’or : chaque page de ton relevé doit comporter le cachet humide et la signature de la banque.',
          officialRule: 'Le solde moyen doit correspondre au niveau de vie requis sans versement suspect.',
        },
      },
      {
        id: 'garant_local',
        label: 'B. Garant Local (Parent ou proche dans mon pays d’origine)',
        subtitle: 'Père, mère, oncle avec revenus réguliers, fiches de paie ou entreprise déclarée',
        badge: 'Garantie Parentale',
        feedback: {
          type: 'positive',
          title: 'Prise en charge locale classique',
          message:
            'C’est noté ! Il faudra fournir l’acte de naissance prouvant le lien de parenté, les 3 dernières fiches de salaire et l’attestation de prise en charge.',
          officialRule: 'Le consulat vérifie le "reste à vivre" du garant une fois la pension versée.',
        },
      },
      {
        id: 'garant_etranger',
        label: 'C. Garant à l’Étranger (Résident dans le pays d’accueil)',
        subtitle: 'Famille ou proche résident régulier démontrant un logement et des revenus locaux',
        badge: 'Garant Étranger',
        feedback: {
          type: 'positive',
          title: 'Garantie sur place enregistrée',
          message:
            'Très bien ! Le garant étranger doit fournir son dernier avis d’imposition, ses 3 bulletins de paie et son titre de séjour ou passeport.',
          officialRule: 'Pour la France : l’attestation d’accueil légalisée en mairie est indispensable pour un court séjour.',
        },
      },
      {
        id: 'bourse_officielle',
        label: 'D. Bourse d’Études Officielle / Financement Institutionnel',
        subtitle: 'Gouvernement, Erasmus+, AUF, Banque Mondiale, entreprise partenaire',
        badge: 'Voie Royale',
        feedback: {
          type: 'positive',
          title: 'Financement institutionnel certifié !',
          message:
            'Voie royale ! Une attestation de bourse officielle écarte la majorité des motifs financiers de refus de visa.',
          officialRule: 'L’attestation doit mentionner le montant mensuel et la durée exacte de couverture.',
        },
      },
    ],
  },

  // ÉTAPE 6 : CONSULAR SANITY FILTER (ORIGINE DES FONDS & ANTI-GONFLAGE)
  {
    id: 'hasRecentLumpDeposit',
    stepNumber: 6,
    totalSteps: 7,
    stepTitle: 'Consular Sanity Filter',
    categoryTitle: 'Détection des Pièges Consulaire',
    question: 'Y a-t-il eu un dépôt d’argent massif et soudain sur le compte bancaire ces 3 derniers mois ?',
    helperText: 'Par exemple : un compte à 200 000 FCFA qui reçoit subitement 5 ou 10 millions de FCFA avant le dépôt.',
    options: [
      {
        id: 'non_flux_reguliers',
        label: 'NON — Flux réguliers et stables',
        subtitle: 'Les fonds se sont accumulés naturellement par salaires ou chiffres d’affaires prouvés',
        badge: 'Flux Sains',
        feedback: {
          type: 'positive',
          title: 'Parfait ! Historique bancaire authentique',
          message:
            'Excellent ! C’est exactement ce que cherchent les agents consulaires. Aucun drapeau rouge sur le compte.',
          officialRule: 'Les officiers IRCC et Schengen analysent la courbe des 3 à 6 derniers mois.',
        },
      },
      {
        id: 'oui_justifie',
        label: 'OUI — Mais justifié par un acte officiel',
        subtitle: 'Vente de terrain notariée, indemnité de départ, donation légale enregistrée',
        badge: 'Justifié Légalement',
        feedback: {
          type: 'positive',
          title: 'Traçabilité obligatoire à joindre au dossier',
          message:
            'Attention à la rigueur : vous devez IMPÉRATIVEMENT annexer l’acte notarié, le reçu fiscal ou la convention de donation enregistrée aux impôts pour ce versement.',
          officialRule: 'Tout montant supérieur aux entrées régulières doit porter une preuve matérielle d’origine.',
        },
      },
      {
        id: 'oui_non_justifie',
        label: 'OUI — Prêt familial informel ou argent prêté par une "agence"',
        subtitle: 'Argent déposé uniquement pour "gonfler" le compte le jour du rendez-vous',
        badge: 'Flash Alerte Consulaire ⚠️',
        feedback: {
          type: 'critical',
          title: 'Flash Alerte Consulaire ⚠️ : REFUS IMMÉDIAT MOTIF R216 / FRAUDE !',
          message:
            'DANGER ABSOLU : Les agences véreuses qui proposent de "louer un compte" ou de "verser 8 millions temporairement" commettent une escroquerie. Les consulats détectent ces mouvements instantanément. C’est la cause n°1 de refus catégorique pour motif de faux justificatifs financiers avec interdiction de visa sur 5 ans.',
          officialRule: 'IRCC Canada et France-Visas effectuent des contrôles d’origine bancaire systématiques.',
          actionRequired: 'Ne présentez jamais un compte gonflé artificiellement. Privilégiez un vrai garant financier ou une AVI légale.',
        },
      },
    ],
  },

  // ÉTAPE 7 : ATTACHES AU PAYS D'ORIGINE (GARANTIE DE RETOUR)
  {
    id: 'tiesType',
    stepNumber: 7,
    totalSteps: 7,
    stepTitle: 'Attaches au Pays d’Origine',
    categoryTitle: 'Preuve de retour indispensable',
    question: 'Qu’est-ce qui prouve de façon irréfutable que tu reviendras après ton séjour ?',
    helperText: 'L’article 32 du Code des Visas Schengen et l’article R216 IRCC exigent la certitude de quitter le territoire.',
    options: [
      {
        id: 'contrat_cdi',
        label: '💼 Contrat CDI + Autorisation de congé certifiée',
        subtitle: 'Poste stable avec maintien du salaire au retour et ancienneté',
        badge: 'Ancrage Professionnel',
        feedback: {
          type: 'positive',
          title: 'Attache professionnelle majeure !',
          message:
            'Garantie solide ! Joindre la lettre de mise en congé précisant la date exacte de reprise de service signée par la direction.',
        },
      },
      {
        id: 'biens_immobiliers',
        label: '🏡 Patrimoine Immobilier & Entreprise enregistrée',
        subtitle: 'Titre foncier, bail commercial, parts de société à ton nom',
        badge: 'Ancrage Patrimonial',
        feedback: {
          type: 'positive',
          title: 'Attache patrimoniale indéniable',
          message:
            'Très fort impact consulaire ! La détention d’actifs au pays démontre une assise économique concrète.',
        },
      },
      {
        id: 'famille_enfants',
        label: '👨‍👩‍👧 Liens Familiaux Directs (Conjoint et Enfants au pays)',
        subtitle: 'Actes de mariage, livrets de famille, certificats de scolarité des enfants restant au pays',
        badge: 'Attache Familiale',
        feedback: {
          type: 'positive',
          title: 'Foyer familial au pays d’origine',
          message:
            'C’est noté ! Le fait de laisser sa famille nucléaire au pays est l’un des motifs les plus rassurants pour le consulat.',
        },
      },
      {
        id: 'etudes_en_cours',
        label: '📚 Projet d’Études d’Excellence avec Réinvestissement Local',
        subtitle: 'Contrat d’alternance, engagement d’embauche locale ou projet de création d’entreprise au pays',
        badge: 'Vision de Retour',
        feedback: {
          type: 'positive',
          title: 'Projet d’avenir dans ton pays',
          message:
            'Essentiel pour le visa étudiant ! Notre lettre explicative formalisera précisément comment ces compétences seront réinvesties localement.',
        },
      },
      {
        id: 'faibles_attaches',
        label: '⚠️ Célibataire, sans emploi, sans biens matériels',
        subtitle: 'Aucune attache matérielle ou contractuelle formelle déclarée',
        badge: 'Flash Alerte Consulaire ⚠️',
        feedback: {
          type: 'critical',
          title: 'Flash Alerte Consulaire ⚠️ : Vulnérabilité majeure !',
          message:
            'ALERTE : Pour un visa de court séjour, c’est le motif de refus systématique : "Votre volonté de quitter le territoire des États membres n’a pas pu être établie". Pour contrer cela, il faut absolument démontrer une inscription universitaire, une promesse d’embauche future, ou un engagement associatif/social fort.',
          actionRequired: 'Structurer une lettre de justification des attaches d’une précision chirurgicale.',
        },
      },
    ],
  },
];
