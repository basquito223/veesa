import React, { useState } from 'react';
import {
  MessageSquare,
  HelpCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Building,
  GraduationCap,
  Briefcase,
  DollarSign,
  Compass,
  FileCheck,
} from 'lucide-react';
import { UserAnswers } from '../types';
import { PersonalizedConsularAssessment } from '../types/assessment';
import { sound } from '../utils/feedback';

interface InterviewPrepSectionProps {
  answers: UserAnswers;
  assessment: PersonalizedConsularAssessment;
}

interface InterviewQuestion {
  id: string;
  category: 'projet' | 'finances' | 'attaches' | 'logistique';
  question: string;
  officerIntent: string;
  recommendedAnswer: string;
  trapsToAvoid: string[];
  applicableCondition?: (answers: UserAnswers) => boolean;
}

export const InterviewPrepSection: React.FC<InterviewPrepSectionProps> = ({ answers, assessment }) => {
  const [expandedQuestionId, setExpandedQuestionId] = useState<string>('q1');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'projet' | 'finances' | 'attaches' | 'logistique'>('all');

  const isStudent = answers.visaReason === 'etudes';
  const isWorker = answers.visaReason === 'travail_stage';
  const isCanada = answers.destination === 'canada';
  const isFrance = answers.destination === 'france';

  const questions: InterviewQuestion[] = [
    {
      id: 'q1',
      category: 'projet',
      question: isStudent
        ? "Pourquoi avoir choisi cette formation et cet établissement précisément ?"
        : isWorker
        ? "Quelles seront vos missions exactes et pourquoi votre employeur a-t-il recruté hors frontières ?"
        : "Quel est l’objet précis de votre séjour et quel est votre itinéraire ?",
      officerIntent: "Vérifier l’authenticité de votre projet et la cohérence de votre parcours intellectuel ou professionnel.",
      recommendedAnswer: isStudent
        ? `Exposez clairement la continuité avec votre cursus actuel. Mentionnez le nom de l'établissement (${answers.destination.toUpperCase()}), le programme visé et les compétences spécifiques que vous venez y acquérir pour votre projet de carrière.`
        : "Présentez l'adéquation exacte entre votre profil et le contrat de travail ou l'objet de la visite, sans exagération.",
      trapsToAvoid: [
        "Répondre vaguement « parce que c'est un bon pays » ou « pour avoir un meilleur avenir ».",
        "Ignorer le contenu exact du programme ou le nom des modules d'enseignement.",
        "Évoquer une intention d'immigration permanente si vous demandez un visa de séjour temporaire.",
      ],
    },
    {
      id: 'q2',
      category: 'finances',
      question: isStudent
        ? "Comment vos études et votre coût de la vie seront-ils financés pendant toute la durée du séjour ?"
        : "Comment assurez-vous le financement de votre séjour et de vos imprévus médicaux ?",
      officerIntent: "S’assurer de la disponibilité réelle de fonds licites sans risque de travail dissimulé ou de charge publique.",
      recommendedAnswer: `Indiquez avec précision le montant bloqué ou mensuel disponible (${
        answers.availableBudgetFcfa ? answers.availableBudgetFcfa.toLocaleString('fr-FR') + ' FCFA' : 'selon le barème officiel'
      }) et l'origine des fonds : prise en charge familiale avec lien de parenté formel, attestation bancaire irrévocable (AVI) ou bourse officielle.`,
      trapsToAvoid: [
        "Hésiter sur les montants déclarés ou donner des chiffres différents de l'attestation bancaire fournie.",
        "Déclarer que vous comptez « travailler sur place pour financer votre année » (le travail étudiant n'est qu'un appoint accessoire, jamais un moyen de financement principal).",
        "Ne pas savoir expliquer l'origine d'un virement récent sur votre compte.",
      ],
    },
    {
      id: 'q3',
      category: 'finances',
      question: "Qui est votre garant et quelle est son activité professionnelle ?",
      officerIntent: "Valider la solvabilité morale et matérielle du tiers qui s’engage pour vous.",
      recommendedAnswer: "Précisez l'identité, le lien familial direct (père, mère, oncle, employeur), son secteur d'activité et la stabilité de ses revenus. Confirmez qu'il a formalisé une lettre d'engagement légalisée.",
      trapsToAvoid: [
        "Présenter un garant éloigné sans lien affectif ni historique financier démontré.",
        "Ignorer la profession exacte ou l'employeur de votre garant.",
      ],
    },
    {
      id: 'q4',
      category: 'logistique',
      question: "Où allez-vous loger à votre arrivée ?",
      officerIntent: "Vérifier la faisabilité matérielle et l’absence de précarité résidentielle.",
      recommendedAnswer: "Mentionnez l'adresse ou la solution retenue : résidence universitaire (CROUS / campus), réservation d'hôtel temporaire, ou attestation d'accueil certifiée par la mairie (France) ou l'hôte.",
      trapsToAvoid: [
        "Dire « je chercherai sur place en arrivant » sans aucune réservation initiale.",
        "Fournir une adresse dans une ville située à plusieurs heures de route de votre établissement sans justification de transport.",
      ],
    },
    {
      id: 'q5',
      category: 'attaches',
      question: "Que ferez-vous à la fin de vos études ou de votre mission ?",
      officerIntent: "Évaluer la garantie de retour au pays d'origine (critère déterminant de l'Article 32 du Code des Visas et du R216(1) canadien).",
      recommendedAnswer: "Décrivez avec enthousiasme votre projet professionnel au pays d'origine ou dans votre sous-région : secteur en plein développement, besoins identifiés du marché local, projet de création d'entreprise ou reprise d'activité.",
      trapsToAvoid: [
        "Déclarer : « Je ferai tout pour rester définitivement sur place ».",
        "Démontrer une rupture totale de liens avec votre pays d'origine.",
        "Minimiser l'importance de vos attaches familiales ou patrimoniales locales.",
      ],
    },
    ...(answers.hasPreviousRefusal
      ? [
          {
            id: 'q-refusal',
            category: 'attaches' as const,
            question: "Vous avez déjà fait l’objet d’un refus de visa. Qu’est-ce qui a changé dans votre situation ?",
            officerIntent: "Vérifier la transparence du demandeur et s'assurer que les motifs initiaux du refus ont été résolus de manière tangible.",
            recommendedAnswer: "Reconnaissez le refus précédent avec calme et professionnalisme. Expliquez les éléments concrets nouveaux : garant supplémentaire vérifié, admission dans un établissement reconnu, consolidation des ressources ou nouvelle situation professionnelle.",
            trapsToAvoid: [
              "Dissimuler le refus antérieur (les consulats partagent le fichier biométrique VIS et le système mondial).",
              "Critiquer agressivement la décision consulaire précédente.",
              "Redéposer un dossier identique sans aucune pièce nouvelle probante.",
            ],
          },
        ]
      : []),
  ];

  const filteredQuestions = selectedCategory === 'all'
    ? questions
    : questions.filter((q) => q.category === selectedCategory);

  const toggleQuestion = (id: string) => {
    sound.tap();
    setExpandedQuestionId((prev) => (prev === id ? '' : id));
  };

  return (
    <div id="interview-prep-section" className="space-y-6">
      {/* 1. Header Banner */}
      <div className="bg-white border border-slate-200 p-5 sm:p-7 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="space-y-1">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-500 font-bold flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4 text-slate-700" />
              Entretien Consulaire & Campus France
            </span>
            <h2 className="text-lg sm:text-2xl font-bold text-slate-950 tracking-tight">
              Préparation de votre Entretien Présentiel
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 max-w-2xl leading-relaxed">
              L’entretien consulaire ou pédagogique (Campus France) sert à vérifier la sincérité et la solidité de votre dossier.
              Entraînez-vous avec les questions types basées sur votre profil ({answers.destination.toUpperCase()} • {answers.visaReason}).
            </p>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 text-xs rounded-xs space-y-1 self-start sm:self-auto shrink-0">
            <span className="text-[10px] font-mono uppercase text-slate-500 font-bold block">Règle d'or</span>
            <span className="font-semibold text-slate-900 block">Concordance à 100% avec les pièces écrites</span>
          </div>
        </div>

        {/* Categories Filter */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-xs text-slate-500 font-medium mr-1">Filtrer par thème :</span>
          {(
            [
              { id: 'all', label: 'Toutes les questions' },
              { id: 'projet', label: 'Projet & Études' },
              { id: 'finances', label: 'Finances & Garant' },
              { id: 'attaches', label: 'Attaches & Retour' },
              { id: 'logistique', label: 'Hébergement' },
            ] as const
          ).map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                sound.tap();
                setSelectedCategory(cat.id);
              }}
              className={`min-h-[36px] px-3 py-1 text-xs font-semibold rounded-xs transition-colors cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-slate-950 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Questions List (Fiches de révision interactives) */}
      <div className="space-y-3">
        {filteredQuestions.map((q, idx) => {
          const isExpanded = expandedQuestionId === q.id;

          return (
            <div
              key={q.id}
              id={`interview-card-${q.id}`}
              className="bg-white border border-slate-200 overflow-hidden shadow-2xs transition-all"
            >
              <button
                id={`btn-interview-q-${q.id}`}
                onClick={() => toggleQuestion(q.id)}
                aria-expanded={isExpanded}
                aria-controls={`interview-answer-${q.id}`}
                className="w-full p-4 sm:p-5 flex items-start justify-between gap-3 text-left hover:bg-slate-50/70 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2"
              >
                <div className="flex items-start gap-3">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-bold shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold block">
                      Thème : {q.category.toUpperCase()}
                    </span>
                    <h3 className="text-sm sm:text-base font-bold text-slate-950 leading-snug">
                      « {q.question} »
                    </h3>
                  </div>
                </div>

                <div className="shrink-0 p-1 text-slate-400">
                  {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </div>
              </button>

              {isExpanded && (
                <div
                  id={`interview-answer-${q.id}`}
                  className="p-4 sm:p-6 border-t border-slate-100 bg-slate-50/40 space-y-4"
                >
                  {/* Intention de l'officier */}
                  <div className="p-3 bg-white border border-slate-200 text-xs sm:text-sm text-slate-700 space-y-1">
                    <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500 font-bold block">
                      Ce que vérifie l’agent :
                    </span>
                    <p className="italic text-slate-600">{q.officerIntent}</p>
                  </div>

                  {/* Réponse recommandée */}
                  <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 text-xs sm:text-sm text-slate-800 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-emerald-900 font-bold text-xs uppercase tracking-wider">
                      <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                      <span>Orientation de réponse recommandée</span>
                    </div>
                    <p className="leading-relaxed">{q.recommendedAnswer}</p>
                  </div>

                  {/* Pièges à éviter */}
                  <div className="p-3.5 bg-rose-50/70 border border-rose-200 text-xs sm:text-sm text-slate-800 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-rose-900 font-bold text-xs uppercase tracking-wider">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>Pièges éliminatoires à proscrire absolument</span>
                    </div>
                    <ul className="space-y-1 text-slate-700 list-disc list-inside">
                      {q.trapsToAvoid.map((trap, tIdx) => (
                        <li key={tIdx}>{trap}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 3. General Consular Posture Checklist */}
      <div className="bg-white border border-slate-200 p-5 sm:p-6 shadow-xs space-y-3">
        <h4 className="text-sm font-bold text-slate-950 uppercase tracking-wider flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-slate-700" />
          <span>Attitude et Posture au Guichet Consulaire</span>
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-700">
          <div className="p-3 bg-slate-50 border border-slate-200 space-y-1">
            <span className="font-bold text-slate-900 block">Ponctualité & Présentation</span>
            <p>Arrivez 20 minutes avant l’heure fixée. Prévoyez une tenue soignée et professionnelle.</p>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200 space-y-1">
            <span className="font-bold text-slate-900 block">Classement Méthodique</span>
            <p>Rangez vos pièces dans l'ordre de la check-list consulaire pour répondre instantanément sans chercher.</p>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200 space-y-1">
            <span className="font-bold text-slate-900 block">Clarté et Concision</span>
            <p>Répondez directement aux questions posées sans monologue superflu ni hésitations prolongées.</p>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200 space-y-1">
            <span className="font-bold text-slate-900 block">Calme et Assurance</span>
            <p>L’officier effectue une vérification réglementaire standard. Gardez un ton posé et courtois.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
