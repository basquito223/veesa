import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  AlertOctagon,
  ShieldCheck,
  Check,
  Globe,
  Sparkles,
  Compass,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { FLOW_QUESTIONS } from '../data/flowQuestions';
import { AFRICAN_COUNTRIES, getCountryProfile } from '../data/countriesData';
import { UserAnswers, FlowQuestion, QuestionOption, ConsularFeedback } from '../types';
import { sound } from '../utils/feedback';
import { JourneyTracker } from './JourneyTracker';
import { ScamInterceptionNotice } from './ScamInterceptionNotice';
import { OtherCountriesModal } from './OtherCountriesModal';
import { WorldDestination } from '../data/worldDestinations';
import { StayDurationSlider } from './StayDurationSlider';
import { validateDossierBeforeGeneration } from '../utils/dossierValidation';
import { ValidationBlockModal } from './ValidationBlockModal';
import { getStayDurationCap } from '../utils/stayDurationRules';

interface GuidedJourneyProps {
  answers: UserAnswers;
  setAnswers: React.Dispatch<React.SetStateAction<UserAnswers>>;
  onComplete: () => void;
  onOpenChecker?: () => void;
}

// Option colors and icons for vibrant, engaging visual cards
const OPTION_ACCENTS: Record<string, { bg: string; border: string; activeBg: string; activeBorder: string; badgeBg: string; badgeText: string; icon: string }> = {
  etudes: {
    bg: 'hover:border-indigo-300 hover:bg-indigo-50/40',
    border: 'border-slate-200/90',
    activeBg: 'bg-indigo-950 text-white border-indigo-500 shadow-sm ring-2 ring-indigo-500/30',
    activeBorder: 'border-indigo-500',
    badgeBg: 'bg-indigo-100/90',
    badgeText: 'text-indigo-800',
    icon: '🎓',
  },
  tourisme_visite: {
    bg: 'hover:border-amber-300 hover:bg-amber-50/40',
    border: 'border-slate-200/90',
    activeBg: 'bg-slate-900 text-white border-amber-500 shadow-sm ring-2 ring-amber-500/30',
    activeBorder: 'border-amber-500',
    badgeBg: 'bg-amber-100/90',
    badgeText: 'text-amber-800',
    icon: '✈️',
  },
  affaires_mission: {
    bg: 'hover:border-blue-300 hover:bg-blue-50/40',
    border: 'border-slate-200/90',
    activeBg: 'bg-slate-900 text-white border-blue-500 shadow-sm ring-2 ring-blue-500/30',
    activeBorder: 'border-blue-500',
    badgeBg: 'bg-blue-100/90',
    badgeText: 'text-blue-800',
    icon: '💼',
  },
  soins_medicaux: {
    bg: 'hover:border-rose-300 hover:bg-rose-50/40',
    border: 'border-slate-200/90',
    activeBg: 'bg-slate-900 text-white border-rose-500 shadow-sm ring-2 ring-rose-500/30',
    activeBorder: 'border-rose-500',
    badgeBg: 'bg-rose-100/90',
    badgeText: 'text-rose-800',
    icon: '🩺',
  },
  travail_stage: {
    bg: 'hover:border-teal-300 hover:bg-teal-50/40',
    border: 'border-slate-200/90',
    activeBg: 'bg-slate-900 text-white border-teal-500 shadow-sm ring-2 ring-teal-500/30',
    activeBorder: 'border-teal-500',
    badgeBg: 'bg-teal-100/90',
    badgeText: 'text-teal-800',
    icon: '🏢',
  },
  non_flux_reguliers: {
    bg: 'hover:border-emerald-300 hover:bg-emerald-50/40',
    border: 'border-slate-200/90',
    activeBg: 'bg-slate-900 text-white border-emerald-500 shadow-sm ring-2 ring-emerald-500/30',
    activeBorder: 'border-emerald-500',
    badgeBg: 'bg-emerald-100/90',
    badgeText: 'text-emerald-800',
    icon: '✅',
  },
  oui_justifie: {
    bg: 'hover:border-blue-300 hover:bg-blue-50/40',
    border: 'border-slate-200/90',
    activeBg: 'bg-slate-900 text-white border-blue-500 shadow-sm ring-2 ring-blue-500/30',
    activeBorder: 'border-blue-500',
    badgeBg: 'bg-blue-100/90',
    badgeText: 'text-blue-800',
    icon: '📑',
  },
  oui_non_justifie: {
    bg: 'hover:border-red-300 hover:bg-red-50/40',
    border: 'border-slate-200/90',
    activeBg: 'bg-slate-900 text-white border-red-500 shadow-sm ring-2 ring-red-500/30',
    activeBorder: 'border-red-500',
    badgeBg: 'bg-red-100/90',
    badgeText: 'text-red-800',
    icon: '⚠️',
  },
};

export const GuidedJourney: React.FC<GuidedJourneyProps> = ({
  answers,
  setAnswers,
  onComplete,
  onOpenChecker,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [direction, setDirection] = useState<number>(1);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [freeInputText, setFreeInputText] = useState<string>('');
  const [activeFeedback, setActiveFeedback] = useState<ConsularFeedback | null>(null);
  const [showAlerteModal, setShowAlerteModal] = useState<boolean>(false);
  const [isOtherCountriesModalOpen, setIsOtherCountriesModalOpen] = useState<boolean>(false);
  const [showValidationBlockModal, setShowValidationBlockModal] = useState<boolean>(false);
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState<boolean>(false);

  const [applicantDetails, setApplicantDetails] = useState({
    fullName: answers.fullName || '',
    passportNumber: answers.passportNumber || '',
    guarantorFullName: answers.guarantorFullName || '',
    travelDurationDays: answers.travelDurationDays || 15,
    customAiNotes: answers.customAiNotes || '',
  });

  // Resynchronize stay duration if user navigates back and modifies visaReason, destination, or origin:
  // Preserves user-chosen duration and only clamps if it exceeds the new regulatory ceiling
  useEffect(() => {
    const stayCap = getStayDurationCap(answers);
    setApplicantDetails((prev) => {
      let newDuration = prev.travelDurationDays;
      if (newDuration > stayCap.maxDays) {
        newDuration = stayCap.maxDays;
      } else if (newDuration < stayCap.minDays) {
        newDuration = stayCap.minDays;
      }

      if (newDuration !== prev.travelDurationDays) {
        return { ...prev, travelDurationDays: newDuration };
      }
      return prev;
    });
  }, [answers.visaReason, answers.destination, answers.countryOfOrigin]);

  const totalSteps = FLOW_QUESTIONS.length + 1;
  const currentQuestion: FlowQuestion | undefined = FLOW_QUESTIONS[currentStepIndex];
  const isFinalDetailsStep = currentStepIndex === FLOW_QUESTIONS.length;

  const selectedCountryProfile = getCountryProfile(answers.countryOfOrigin);

  // Full validation evaluated dynamically across all steps and final details
  const validationResult = useMemo(() => {
    return validateDossierBeforeGeneration(answers, applicantDetails);
  }, [answers, applicantDetails]);

  // Derive pre-selected option ID from existing answers when navigating steps
  const getPreselectedOptionId = (): string | null => {
    if (!currentQuestion) return null;
    switch (currentQuestion.id) {
      case 'visaReason':
        return answers.visaReason || null;
      case 'destination':
        return answers.destination || null;
      case 'status':
        return answers.status || null;
      case 'fundingSource':
        return answers.fundingSource || null;
      case 'hasRecentLumpDeposit':
        return answers.lumpDepositChoice || null;
      case 'tiesType':
        return answers.tiesType || null;
      default:
        return null;
    }
  };

  // Synchronize selectedOptionId and activeFeedback when step changes
  useEffect(() => {
    if (currentQuestion && currentStepIndex < FLOW_QUESTIONS.length) {
      const preselectedId = getPreselectedOptionId();
      if (preselectedId) {
        const found = currentQuestion.options.find((opt) => opt.id === preselectedId);
        if (found) {
          setSelectedOptionId(found.id);
          setActiveFeedback(found.feedback);
          return;
        }
      }
      setSelectedOptionId(null);
      setActiveFeedback(null);
      setFreeInputText('');
    }
  }, [currentStepIndex]);

  // Jump directly to any step from validation warnings or modal
  const handleGoToStep = (stepIndex: number, fieldId?: string) => {
    sound.tap();
    setDirection(stepIndex > currentStepIndex ? 1 : -1);
    setCurrentStepIndex(stepIndex);
    setShowValidationBlockModal(false);
    if (stepIndex === FLOW_QUESTIONS.length && fieldId) {
      setTimeout(() => {
        const el = document.getElementById(fieldId) || document.getElementById(`input-${fieldId}`);
        if (el) {
          el.focus();
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 250);
    }
  };

  const fullNameError = hasAttemptedSubmit
    ? validationResult.errors.find((e) => e.fieldId === 'fullName')
    : undefined;
  const passportError = hasAttemptedSubmit
    ? validationResult.errors.find((e) => e.fieldId === 'passportNumber')
    : undefined;
  const guarantorError = hasAttemptedSubmit
    ? validationResult.errors.find((e) => e.fieldId === 'guarantorFullName')
    : undefined;
  const durationError = hasAttemptedSubmit
    ? validationResult.errors.find((e) => e.fieldId === 'travelDurationDays')
    : undefined;
  const previousStepsErrors = validationResult.errors.filter((e) => e.stepIndex < FLOW_QUESTIONS.length);

  // Map step index to journey stages
  const getCurrentJourneyStage = (): 'eligibilite' | 'finances' | 'documents' | 'demande' | 'rdv' => {
    if (currentStepIndex <= 2) return 'eligibilite';
    if (currentStepIndex <= 5) return 'finances';
    if (currentStepIndex === 6) return 'documents';
    return 'demande';
  };

  const handleSelectOption = (option: QuestionOption) => {
    sound.tap();
    setSelectedOptionId(option.id);
    setActiveFeedback(option.feedback);

    if (currentQuestion) {
      if (currentQuestion.id === 'visaReason') {
        setAnswers((prev) => ({
          ...prev,
          visaReason: option.id as any,
        }));
      } else if (currentQuestion.id === 'countryOfOrigin') {
        const countryMap: Record<string, string> = {
          mali: 'Mali',
          senegal: 'Sénégal',
          cote_ivoire: 'Côte d’Ivoire',
          guinee: 'Guinée',
          cameroun: 'Cameroun',
          benin: 'Bénin',
        };
        const countryName = countryMap[option.id] || option.label;
        setAnswers((prev) => ({
          ...prev,
          countryOfOrigin: countryName,
          filingCountry: prev.isFilingFromSameCountry ? countryName : prev.filingCountry,
        }));
      } else if (currentQuestion.id === 'destination') {
        setAnswers((prev) => ({ ...prev, destination: option.id as any }));
        if (option.id === 'autre') {
          setIsOtherCountriesModalOpen(true);
        } else if (option.id === 'france') {
          if (answers.visaReason === 'etudes') {
            setActiveFeedback({
              type: 'positive',
              title: '🇫🇷 France — Visa Long Séjour Études (VLS-TS)',
              message:
                'Pour vos études en France : le seuil légal en vigueur 2026 est de 877,50 € / mois (10 530 €/an). Vous devez impérativement sécuriser votre AVI (Attestation de Virement Irrévocable) ou un garant régulier solvable, ainsi que votre accord Campus France (EEF).',
              officialRule: 'Seuil officiel légal : 877,50 € / mois (575 600 FCFA/mois) + attestation EEF Campus France.',
            });
          } else {
            setActiveFeedback({
              type: 'positive',
              title: '🇫🇷 France / Schengen — Visa Court Séjour',
              message:
                'Pour votre séjour en France (visite, tourisme, affaires ou soins) : durée maximale de 90 jours. Vous devez fournir une attestation d’accueil de mairie (32,50 €/j) ou une réservation hôtelière ferme (65 €/j), une assurance voyage de 30 000 € et des preuves d’attaches professionnelles.',
              officialRule: 'Frais officiels de visa : 90 € (~59 000 FCFA). Preuves d’attaches socio-économiques indispensables.',
            });
          }
        } else if (option.id === 'canada') {
          if (answers.visaReason === 'etudes') {
            setActiveFeedback({
              type: 'positive',
              title: '🇨🇦 Canada — Permis d’Études (IRCC)',
              message:
                'Pour vos études au Canada : le seuil de subsistance officiel 2026 est de 23 448 $ CAD/an + 1ère année de scolarité payée + Lettre d’Attestation Provinciale (PAL). Les dépôts forfaitaires suspects sans acte notarié sont refusés sous l’article R216 LIPR.',
              officialRule: 'Seuil de subsistance minimal hors Québec : 23 448 $ CAD + scolarité + PAL.',
            });
          } else {
            setActiveFeedback({
              type: 'positive',
              title: '🇨🇦 Canada — Visa de Visiteur (VRT)',
              message:
                'Pour votre visite ou mission au Canada : le facteur décisif pour l’agent d’immigration d’IRCC est la certitude de votre retour (emploi, famille, biens immobiliers) et la cohérence de vos ressources financières.',
              officialRule: 'Frais officiels : 100 $ CAD + 85 $ CAD biométrie au CRDV (VFS Global).',
            });
          }
        }
      } else if (currentQuestion.id === 'status') {
        setAnswers((prev) => ({ ...prev, status: option.id as any }));
      } else if (currentQuestion.id === 'fundingSource') {
        setAnswers((prev) => ({ ...prev, fundingSource: option.id as any }));
      } else if (currentQuestion.id === 'hasRecentLumpDeposit') {
        setAnswers((prev) => ({
          ...prev,
          hasRecentLumpDeposit: option.id !== 'non_flux_reguliers',
          lumpDepositChoice: option.id as any,
          lumpDepositExplanation: option.id === 'oui_justifie' ? 'Acte de vente notarié certifié' : undefined,
        }));
      } else if (currentQuestion.id === 'tiesType') {
        setAnswers((prev) => ({ ...prev, tiesType: option.id as any }));
      }
    }

    if (option.feedback.type === 'critical') {
      sound.warning();
      setShowAlerteModal(true);
    }
  };

  const handleCountryDropdownChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const countryId = e.target.value;
    if (!countryId) return;
    sound.tap();
    const profile = getCountryProfile(countryId);
    setAnswers((prev) => ({
      ...prev,
      countryOfOrigin: profile.name,
      filingCountry: prev.isFilingFromSameCountry ? profile.name : prev.filingCountry,
    }));
    setSelectedOptionId(profile.id);
    setActiveFeedback({
      type: 'positive',
      title: `${profile.flag} ${profile.name} : Juridiction Consulaire`,
      message: `Passeport émis par les autorités de ${profile.name}. Circonscription consulaire : ${profile.capital}. Monnaie de référence : ${profile.currencyName} (${profile.currencyCode}).`,
      officialRule: `Le passeport doit avoir une validité minimale de 3 à 6 mois après la date de départ prévue et comporter au moins 2 pages vierges consécutives.`,
    });
  };

  const handleSelectWorldDestination = (dest: WorldDestination) => {
    sound.tap();
    setAnswers((prev) => ({
      ...prev,
      destination: 'autre',
      specificDestination: dest.name,
    }));
    setSelectedOptionId('autre');
    setActiveFeedback({
      type: 'positive',
      title: `${dest.flag} ${dest.name} : Régime Consulaire 2026`,
      message: `${dest.popularVisaType} | Portail d'État : ${dest.officialPortal}.`,
      officialRule: dest.keyRule,
    });
  };

  const handleNext = () => {
    sound.tap();
    if (isFinalDetailsStep) {
      // Validate every required field across all steps before generation
      const validation = validateDossierBeforeGeneration(answers, applicantDetails);
      if (!validation.isValid) {
        sound.warning();
        setHasAttemptedSubmit(true);
        setShowValidationBlockModal(true);
        return; // STRICTLY BLOCK DOCUMENT GENERATION
      }

      sound.success();
      setAnswers((prev) => ({
        ...prev,
        fullName: applicantDetails.fullName.trim(),
        passportNumber: applicantDetails.passportNumber.trim().toUpperCase(),
        guarantorFullName: applicantDetails.guarantorFullName.trim(),
        travelDurationDays: Number(applicantDetails.travelDurationDays) || 15,
        customAiNotes: applicantDetails.customAiNotes.trim(),
      }));
      onComplete();
      return;
    }

    if (currentQuestion?.inputFieldKey && freeInputText.trim().length > 0) {
      setAnswers((prev) => ({
        ...prev,
        [currentQuestion.inputFieldKey as keyof UserAnswers]: freeInputText.trim(),
      }));
    }

    if (currentStepIndex < FLOW_QUESTIONS.length) {
      setDirection(1);
      setCurrentStepIndex((prev) => prev + 1);
      setSelectedOptionId(null);
      setActiveFeedback(null);
      setFreeInputText('');
    }
  };

  const handlePrevious = () => {
    sound.tap();
    if (currentStepIndex > 0) {
      setDirection(-1);
      setCurrentStepIndex((prev) => prev - 1);
      setSelectedOptionId(null);
      setActiveFeedback(null);
      setFreeInputText('');
    }
  };

  const isResidenceValid =
    answers.isFilingFromSameCountry !== false ||
    (!!answers.filingCountry && answers.filingCountry.trim().length > 0);

  const isCurrentStepAnswered = () => {
    if (!currentQuestion) return false;
    switch (currentQuestion.id) {
      case 'visaReason':
        return !!answers.visaReason;
      case 'countryOfOrigin':
        return !!answers.countryOfOrigin && isResidenceValid;
      case 'destination':
        return !!answers.destination && (answers.destination !== 'autre' || !!answers.specificDestination);
      case 'status':
        return !!answers.status;
      case 'fundingSource':
        return !!answers.fundingSource;
      case 'hasRecentLumpDeposit':
        return (
          (answers.lumpDepositChoice !== undefined && answers.lumpDepositChoice !== '') ||
          selectedOptionId !== null
        );
      case 'tiesType':
        return !!answers.tiesType;
      default:
        return selectedOptionId !== null || freeInputText.trim().length > 0;
    }
  };

  const canProceed = isFinalDetailsStep
    ? true // Always clickable; if invalid, handleNext blocks generation and triggers detailed feedback
    : isCurrentStepAnswered();

  // Detect bilateral exemption on destination step
  const isMaliOrSenegal =
    answers.countryOfOrigin.toLowerCase().includes('mali') ||
    answers.countryOfOrigin.toLowerCase().includes('senegal') ||
    answers.countryOfOrigin.toLowerCase().includes('sénégal');

  // Only expose selections to the tracker once they have actually been made by the user in this flow:
  const isReasonSelected =
    currentStepIndex > 0
      ? !!answers.visaReason
      : selectedOptionId !== null && !!answers.visaReason;

  const isOriginSelected =
    currentStepIndex > 1
      ? !!answers.countryOfOrigin
      : currentStepIndex === 1
      ? !!answers.countryOfOrigin && isResidenceValid
      : false;

  const isDestinationSelected =
    currentStepIndex > 2
      ? !!answers.destination
      : currentStepIndex === 2
      ? (selectedOptionId !== null || (answers.destination && answers.destination.trim().length > 0))
      : false;

  const trackerReason = isReasonSelected ? answers.visaReason : ('' as any);
  const trackerOrigin = isOriginSelected ? answers.countryOfOrigin : '';
  const trackerDestination = isDestinationSelected ? answers.destination : ('' as any);

  const stepVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 28 : -28,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (dir: number) => ({
      x: dir < 0 ? 28 : -28,
      opacity: 0,
    }),
  };

  return (
    <div className="max-w-3xl mx-auto px-3 sm:px-5 py-2 sm:py-3 space-y-2.5">
      {/* 1. Ultra-Compact Progress Bar */}
      <div className="bg-white rounded-xl border border-slate-200/90 px-3.5 py-2.5 shadow-2xs">
        <JourneyTracker
          originCountry={trackerOrigin}
          filingCountry={answers.filingCountry}
          isFilingFromSameCountry={answers.isFilingFromSameCountry}
          destination={trackerDestination}
          specificDestination={answers.specificDestination}
          visaReason={trackerReason}
          currentStepIndex={currentStepIndex}
          totalSteps={totalSteps}
          compact={true}
        />
      </div>

      {/* Main Guided Card - Zero-scroll compact design */}
      <AnimatePresence mode="wait" custom={direction}>
        {!isFinalDetailsStep && currentQuestion && (
          <motion.div
            key={currentQuestion.id}
            custom={direction}
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.22, ease: [0.25, 1, 0.5, 1] }}
            className="bg-white rounded-xl border border-slate-200/90 p-3.5 sm:p-5 shadow-xs space-y-3"
          >
            {/* Question Header */}
            <div className="space-y-1 border-b border-slate-100 pb-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center space-x-1.5">
                  <span className="inline-flex items-center space-x-1 text-[10px] font-mono font-bold tracking-wider text-emerald-800 uppercase bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/70">
                    <span>Étape {currentStepIndex + 1}/{totalSteps}</span>
                  </span>
                  <span className="text-[11px] text-slate-500 font-semibold hidden sm:inline">
                    {currentQuestion.categoryTitle}
                  </span>
                </div>

                {currentQuestion.id === 'destination' && onOpenChecker && (
                  <button
                    type="button"
                    onClick={onOpenChecker}
                    className="text-[11px] font-bold text-indigo-700 hover:text-indigo-900 underline underline-offset-2 flex items-center space-x-1"
                  >
                    <Sparkles className="w-3 h-3 text-indigo-500" />
                    <span>Vérifier dispenses</span>
                  </button>
                )}
              </div>

              <h1 className="text-lg sm:text-xl font-black tracking-tight text-slate-950 leading-tight">
                {currentQuestion.question}
              </h1>

              {currentQuestion.helperText && (
                <p className="text-slate-500 text-[11px] sm:text-xs leading-snug">
                  {currentQuestion.helperText}
                </p>
              )}
            </div>

            {/* Special Interception Notice for Mali/Sénégal towards Morocco - only when Morocco is explicitly chosen */}
            {currentQuestion.id === 'destination' && answers.destination === 'maroc' && isMaliOrSenegal && (
              <ScamInterceptionNotice
                reason={`Ressortissant de ${answers.countryOfOrigin} se rendant au Maroc : Exemption totale de visa.`}
                officialCost="0 FCFA"
                officialRuleText="Selon les traités bilatéraux et la levée formelle de l'AEVM, vous êtes dispensé de visa. Vous ne devez payer AUCUN frais consulaire. Ne versez aucun argent à un démarcheur pour une dispense gratuite."
                officialPortalName="Portail officiel acces-maroc.ma"
                officialPortalUrl="https://www.acces-maroc.ma"
              />
            )}

            {/* ÉTAPE 2 : NATIONALITÉ & PAYS DE RÉSIDENCE */}
            {currentQuestion.id === 'countryOfOrigin' && (
              <div className="space-y-3.5">
                {/* 1. Sélection de la nationalité */}
                <div className="rounded-xl border border-slate-200 bg-white p-3.5 sm:p-4 space-y-3 shadow-xs">
                  <div className="space-y-1">
                    <label
                      htmlFor="select-country-dropdown"
                      className="text-xs sm:text-sm font-bold text-slate-900 flex items-center justify-between"
                    >
                      <span className="flex items-center gap-1.5">
                        <span>🌍</span>
                        <span>Sélectionnez votre pays de nationalité :</span>
                      </span>
                      {answers.countryOfOrigin && (
                        <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          {selectedCountryProfile.flag} {answers.countryOfOrigin}
                        </span>
                      )}
                    </label>
                    <p className="text-[11px] text-slate-500">
                      Indiquez le pays dont vous détenez le passeport officiel.
                    </p>
                  </div>

                  {/* Dropdown complet */}
                  <select
                    id="select-country-dropdown"
                    value={selectedCountryProfile.id}
                    onChange={handleCountryDropdownChange}
                    className="w-full px-3 py-2.5 bg-slate-50/70 border border-slate-300 rounded-lg font-bold text-slate-900 text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 cursor-pointer shadow-2xs transition-colors"
                  >
                    <option value="">-- Choisissez un pays dans la liste --</option>
                    {AFRICAN_COUNTRIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.flag} {c.name} ({c.capital})
                      </option>
                    ))}
                  </select>

                  {/* Raccourcis fréquents */}
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Choix fréquents :
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { id: 'mali', name: 'Mali', flag: '🇲🇱' },
                        { id: 'senegal', name: 'Sénégal', flag: '🇸🇳' },
                        { id: 'cote_ivoire', name: 'Côte d’Ivoire', flag: '🇨🇮' },
                        { id: 'guinee', name: 'Guinée', flag: '🇬🇳' },
                        { id: 'cameroun', name: 'Cameroun', flag: '🇨🇲' },
                        { id: 'benin', name: 'Bénin', flag: '🇧🇯' },
                      ].map((quick) => {
                        const isChosen =
                          answers.countryOfOrigin.toLowerCase() === quick.name.toLowerCase();
                        return (
                          <button
                            key={quick.id}
                            type="button"
                            id={`quick-country-${quick.id}`}
                            onClick={() => {
                              sound.tap();
                              const profile = getCountryProfile(quick.id);
                              setAnswers((prev) => ({
                                ...prev,
                                countryOfOrigin: profile.name,
                                filingCountry:
                                  prev.isFilingFromSameCountry !== false
                                    ? profile.name
                                    : prev.filingCountry,
                              }));
                              setSelectedOptionId(profile.id);
                              setActiveFeedback({
                                type: 'positive',
                                title: `${profile.flag} ${profile.name} : Nationalité enregistrée`,
                                message: `Passeport émis par les autorités de ${profile.name}. Circonscription consulaire : ${profile.capital}. Monnaie de référence : ${profile.currencyName} (${profile.currencyCode}).`,
                                officialRule: `Le passeport doit avoir une validité minimale de 3 à 6 mois après la date de départ prévue et comporter au moins 2 pages vierges consécutives.`,
                              });
                            }}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer inline-flex items-center space-x-1.5 ${
                              isChosen
                                ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs ring-2 ring-emerald-500/20'
                                : 'bg-slate-100/80 hover:bg-slate-200/80 text-slate-800 border-slate-200'
                            }`}
                          >
                            <span>{quick.flag}</span>
                            <span>{quick.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Fiche consulaire du passeport */}
                  {selectedCountryProfile && selectedCountryProfile.id !== 'autre' && selectedCountryProfile.id !== '' && (
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs text-slate-700 space-y-1 mt-2">
                      <div className="flex items-center justify-between font-bold text-slate-900">
                        <span>{selectedCountryProfile.flag} {selectedCountryProfile.name} (Nationalité enregistrée)</span>
                        <span className="text-slate-500 font-mono text-[10px]">Devise : {selectedCountryProfile.currencyCode}</span>
                      </div>
                      <div className="text-slate-600 text-[11px]">
                        <strong>Circonscription consulaire d'origine :</strong> {selectedCountryProfile.capital}
                      </div>
                      <div className="text-slate-600 text-[11px]">
                        <strong>Règle passeport :</strong> Validité minimale de 3 à 6 mois au-delà du séjour prévu et 2 pages vierges consécutives.
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. Question Résidence (affichée dès qu'un pays de nationalité est choisi) */}
                {!!answers.countryOfOrigin && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className="rounded-xl border border-slate-200 bg-white p-3.5 sm:p-4 space-y-3 shadow-xs"
                  >
                    <div className="space-y-1">
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5">
                        <span>📍</span>
                        <span>Dans quel pays résidez-vous actuellement ?</span>
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Votre demande de visa sera déposée auprès du consulat ou centre de visas compétent dans ce pays.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                      {/* Option 1 : Même pays de nationalité (Présélectionnée par défaut) */}
                      <button
                        type="button"
                        id="residence-same-country-btn"
                        onClick={() => {
                          sound.tap();
                          setAnswers((prev) => ({
                            ...prev,
                            isFilingFromSameCountry: true,
                            filingCountry: prev.countryOfOrigin,
                          }));
                        }}
                        className={`text-left p-3 rounded-xl border transition-all cursor-pointer ${
                          answers.isFilingFromSameCountry !== false
                            ? 'bg-emerald-50/80 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs'
                            : 'bg-slate-50/60 border-slate-200 hover:border-slate-300 hover:bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className="text-base">{selectedCountryProfile.flag || '🌍'}</span>
                            <span className="text-xs sm:text-sm font-bold text-slate-900">
                              {answers.countryOfOrigin}
                            </span>
                          </div>
                          <div
                            className={`w-4 h-4 rounded-full flex items-center justify-center border ${
                              answers.isFilingFromSameCountry !== false
                                ? 'border-emerald-600 bg-emerald-600 text-white'
                                : 'border-slate-300 bg-white'
                            }`}
                          >
                            {answers.isFilingFromSameCountry !== false && (
                              <Check className="w-2.5 h-2.5 stroke-[3]" />
                            )}
                          </div>
                        </div>
                        <p className="text-[11px] text-emerald-800 font-semibold mt-1">
                          ✓ Même pays que ma nationalité
                        </p>
                        <p className="text-[10px] text-slate-500">
                          Dépôt sur place dans votre circonscription consulaire d'origine.
                        </p>
                      </button>

                      {/* Option 2 : Dans un autre pays */}
                      <button
                        type="button"
                        id="residence-other-country-btn"
                        onClick={() => {
                          sound.tap();
                          setAnswers((prev) => ({
                            ...prev,
                            isFilingFromSameCountry: false,
                            filingCountry:
                              prev.filingCountry === prev.countryOfOrigin ? '' : prev.filingCountry,
                          }));
                        }}
                        className={`text-left p-3 rounded-xl border transition-all cursor-pointer ${
                          answers.isFilingFromSameCountry === false
                            ? 'bg-indigo-50/80 border-indigo-500 ring-2 ring-indigo-500/20 shadow-xs'
                            : 'bg-slate-50/60 border-slate-200 hover:border-slate-300 hover:bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className="text-base">🌐</span>
                            <span className="text-xs sm:text-sm font-bold text-slate-900">
                              Dans un autre pays
                            </span>
                          </div>
                          <div
                            className={`w-4 h-4 rounded-full flex items-center justify-center border ${
                              answers.isFilingFromSameCountry === false
                                ? 'border-indigo-600 bg-indigo-600 text-white'
                                : 'border-slate-300 bg-white'
                            }`}
                          >
                            {answers.isFilingFromSameCountry === false && (
                              <Check className="w-2.5 h-2.5 stroke-[3]" />
                            )}
                          </div>
                        </div>
                        <p className="text-[11px] text-indigo-800 font-semibold mt-1">
                          Résidence légale à l'étranger
                        </p>
                        <p className="text-[10px] text-slate-500">
                          Vous résidez dans un autre pays muni d'un titre de séjour en cours.
                        </p>
                      </button>
                    </div>

                    {/* Sélecteur si résidence dans un autre pays */}
                    {answers.isFilingFromSameCountry === false && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="pt-2.5 border-t border-slate-100 space-y-2"
                      >
                        <label
                          htmlFor="select-filing-country"
                          className="text-[11px] font-bold text-slate-800 block"
                        >
                          Indiquez votre pays de résidence et de dépôt :
                        </label>
                        <select
                          id="select-filing-country"
                          value={answers.filingCountry || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setAnswers((prev) => ({ ...prev, filingCountry: val }));
                          }}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-bold text-slate-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 cursor-pointer shadow-2xs"
                        >
                          <option value="">-- Choisissez le pays où vous résidez légalement --</option>
                          <option value="France">🇫🇷 France (avec titre de séjour)</option>
                          <option value="Maroc">🇲🇦 Maroc (avec carte de séjour)</option>
                          <option value="Sénégal">🇸🇳 Sénégal</option>
                          <option value="Côte d’Ivoire">🇨🇮 Côte d’Ivoire</option>
                          <option value="Canada">🇨🇦 Canada (permis valide)</option>
                          <option value="États-Unis">🇺🇸 États-Unis</option>
                          <option value="Belgique">🇧🇪 Belgique</option>
                          <option value="Autre pays">🌍 Autre pays</option>
                          {AFRICAN_COUNTRIES.filter(
                            (c) => c.name.toLowerCase() !== answers.countryOfOrigin.toLowerCase()
                          ).map((c) => (
                            <option key={`residence-${c.id}`} value={c.name}>
                              {c.flag} {c.name} ({c.capital})
                            </option>
                          ))}
                        </select>
                        <p className="text-[10px] text-slate-500">
                          Important : vous devrez joindre la preuve de votre résidence régulière (titre de séjour, visa de long séjour en cours) dans ce pays lors du rendez-vous consulaire.
                        </p>
                      </motion.div>
                    )}
                  </motion.div>
                )}
              </div>
            )}

            {/* Dynamic Options Grid - 2 columns on tablet/desktop for zero-scroll compactness (for other steps) */}
            {currentQuestion.id !== 'countryOfOrigin' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {currentQuestion.options.map((option, idx) => {
                const isSelected = selectedOptionId === option.id;
                const accent = OPTION_ACCENTS[option.id];

                let dynamicLabel = option.label;
                let dynamicSubtitle = option.subtitle;

                // Dynamic bilateral label & reason-combined subtitles for destination step
                if (currentQuestion.id === 'destination') {
                  if (option.id === 'france') {
                    if (answers.visaReason === 'etudes') {
                      dynamicSubtitle = 'Procédure VLS-TS Études 2026 (Campus France & seuil légal 877,50 €/mois)';
                    } else {
                      dynamicSubtitle = 'Visa Court Séjour Schengen (90 jours max, barème 32,50 € à 120 €/jour)';
                    }
                  } else if (option.id === 'canada') {
                    if (answers.visaReason === 'etudes') {
                      dynamicSubtitle = 'Permis d’études IRCC 2026 (seuil 23 448 $ CAD/an + scolarité + PAL)';
                    } else {
                      dynamicSubtitle = 'Visa de Résident Temporaire VRT (frais 100 $ CAD + biométrie 85 $ CAD)';
                    }
                  } else if (option.id === 'maroc' && answers.countryOfOrigin) {
                    const countryLower = answers.countryOfOrigin.toLowerCase();
                    if (countryLower.includes('mali')) {
                      dynamicLabel = '🇲🇦 Maroc — Exemption totale de visa (0 FCFA / 90 jours)';
                      dynamicSubtitle =
                        'Accord bilatéral : Aucun visa requis pour les passeports maliens ordinaires et dispense totale d’AEVM.';
                    } else if (countryLower.includes('senegal') || countryLower.includes('sénégal')) {
                      dynamicLabel = '🇲🇦 Maroc — Exemption totale de visa (0 FCFA / 90 jours)';
                      dynamicSubtitle =
                        'Convention d’établissement : Citoyens sénégalais exemptés de visa et d’AEVM pour tout séjour jusqu’à 90 jours.';
                    } else if (countryLower.includes('ivoire')) {
                      dynamicLabel = '🇲🇦 Maroc — e-Visa obligatoire (acces-maroc.ma)';
                      dynamicSubtitle =
                        'Règle 2026 : e-Visa obligatoire avant l’embarquement pour les ressortissants ivoiriens ordinaires.';
                    }
                  } else if (option.id === 'autre' && answers.specificDestination) {
                    dynamicLabel = `🌍 ${answers.specificDestination} — Destination Mondiale`;
                    dynamicSubtitle =
                      'Destination sélectionnée dans le catalogue mondial. Cliquez sur le bouton pour changer.';
                  }
                }

                return (
                  <motion.button
                    key={option.id}
                    id={`option-card-${option.id}`}
                    initial={{ opacity: 0, y: 8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.2, delay: idx * 0.035, ease: [0.25, 1, 0.5, 1] }}
                    whileHover={{ scale: 1.012, transition: { duration: 0.15 } }}
                    whileTap={{ scale: 0.985 }}
                    onClick={() => handleSelectOption(option)}
                    className={`w-full text-left p-2.5 sm:p-3 rounded-lg border transition-colors duration-150 select-none relative group ${
                      isSelected
                        ? (accent ? accent.activeBg : 'bg-slate-900 text-white border-emerald-500 shadow-sm ring-2 ring-emerald-500/30')
                        : `border-slate-200/90 bg-slate-50/70 hover:bg-white text-slate-900 ${accent ? accent.bg : 'hover:border-slate-300'}`
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5 flex-1 min-w-0">
                        <div className="flex items-center space-x-1.5">
                          <span className={`font-bold text-xs sm:text-[13px] leading-snug ${isSelected ? 'text-white' : 'text-slate-950'}`}>
                            {dynamicLabel}
                          </span>
                        </div>
                        {dynamicSubtitle && (
                          <p className={`text-[10px] sm:text-[11px] leading-snug line-clamp-2 ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                            {dynamicSubtitle}
                          </p>
                        )}
                      </div>

                      {/* Selector indicator with spring micro-interaction */}
                      <div
                        className={`w-4 h-4 rounded-full flex items-center justify-center border shrink-0 mt-0.5 transition-colors ${
                          isSelected
                            ? 'border-emerald-400 bg-emerald-500 text-slate-950 shadow-xs'
                            : 'border-slate-300 bg-white text-transparent group-hover:border-slate-400'
                        }`}
                      >
                        <AnimatePresence>
                          {isSelected && (
                            <motion.div
                              key="check-icon"
                              initial={{ scale: 0, rotate: -45 }}
                              animate={{ scale: 1, rotate: 0 }}
                              exit={{ scale: 0 }}
                              transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                            >
                              <Check className="w-2.5 h-2.5 stroke-[3]" />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>

                    {/* Expandable World Destination Trigger */}
                    {option.id === 'autre' && (
                      <div className="mt-2 pt-1.5 border-t border-slate-200/70 flex items-center justify-between">
                        <span className={`text-[10px] font-bold ${isSelected ? 'text-indigo-200' : 'text-indigo-700'}`}>
                          {answers.specificDestination
                            ? `Sélection : ${answers.specificDestination}`
                            : 'Catalogue de 50+ pays mondiaux'}
                        </span>
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(e) => {
                            e.stopPropagation();
                            sound.tap();
                            setIsOtherCountriesModalOpen(true);
                          }}
                          className={`text-[10px] font-bold px-2 py-0.5 rounded border inline-flex items-center space-x-1 cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-indigo-700 hover:bg-indigo-600 text-white border-indigo-400'
                              : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border-indigo-200'
                          }`}
                        >
                          <Globe className="w-3 h-3" />
                          <span>{answers.specificDestination ? 'Modifier' : 'Ouvrir catalogue'}</span>
                        </span>
                      </div>
                    )}

                    {/* Official Source Reference attached directly to option */}
                    {option.feedback.officialRule && isSelected && (
                      <motion.div
                        initial={{ opacity: 0, y: 3 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-1.5 pt-1.5 border-t border-slate-700/80 text-[10px] text-emerald-300 flex items-start space-x-1.5"
                      >
                        <ShieldCheck className="w-3 h-3 text-emerald-400 shrink-0 mt-0.5" />
                        <span className="truncate"><strong>Règle officielle :</strong> {option.feedback.officialRule}</span>
                      </motion.div>
                    )}
                  </motion.button>
                );
              })}
            </div>
          )}

            {/* Contextual Feedback Banner when selected */}
            <AnimatePresence>
              {activeFeedback && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.98 }}
                  transition={{ duration: 0.2 }}
                  className={`p-2.5 rounded-lg border text-xs leading-snug space-y-0.5 ${
                    activeFeedback.type === 'critical'
                      ? 'border-red-300 bg-red-50 text-red-950'
                      : activeFeedback.type === 'warning'
                      ? 'border-amber-300 bg-amber-50 text-amber-950'
                      : 'border-emerald-200 bg-emerald-50/80 text-emerald-950'
                  }`}
                >
                  <div className="font-bold flex items-center space-x-1.5">
                    {activeFeedback.type === 'critical' ? (
                      <AlertOctagon className="w-3.5 h-3.5 text-red-600 shrink-0" />
                    ) : (
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                    )}
                    <span>{activeFeedback.title}</span>
                  </div>
                  <p className="text-[11px] text-slate-700">{activeFeedback.message}</p>
                  {activeFeedback.actionRequired && (
                    <p className="font-bold text-slate-900 text-[10px] pt-0.5">
                      Action requise : {activeFeedback.actionRequired}
                    </p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Final Identity Details Step */}
        {isFinalDetailsStep && (
          <motion.div
            key="final-details"
            custom={direction}
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.22, ease: [0.25, 1, 0.5, 1] }}
            className="bg-white rounded-xl border border-slate-200/90 p-4 sm:p-5 shadow-xs space-y-3.5"
          >
            <div className="space-y-0.5 border-b border-slate-100 pb-2.5">
              <span className="text-[10px] font-mono font-bold tracking-wider text-indigo-700 uppercase bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200/60">
                Étape finale — Personnalisation officielle
              </span>
              <h1 className="text-lg sm:text-xl font-black tracking-tight text-slate-950">
                Finaliser l'identification de votre dossier
              </h1>
              <p className="text-slate-500 text-[11px]">
                Ces informations obligatoires garantissent la pleine conformité et recevabilité de vos attestations et lettres de motivation.
              </p>
            </div>

            {/* Incomplete previous steps banner if user navigated here with missing requirements */}
            {previousStepsErrors.length > 0 && (
              <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center space-x-2 text-amber-950 font-bold text-xs">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Champs manquants dans les étapes précédentes ({previousStepsErrors.length})</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowValidationBlockModal(true)}
                    className="text-[11px] font-bold text-amber-800 hover:text-amber-950 underline cursor-pointer"
                  >
                    Voir tout
                  </button>
                </div>
                <p className="text-[11px] text-amber-800 leading-snug">
                  La génération de documents officiels exige que chaque étape préalable soit renseignée. Cliquez pour compléter :
                </p>
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {previousStepsErrors.map((err) => (
                    <button
                      key={err.fieldId}
                      type="button"
                      onClick={() => handleGoToStep(err.stepIndex, err.fieldId)}
                      className="px-2.5 py-1 bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-[11px] font-bold flex items-center space-x-1 shadow-2xs transition-all cursor-pointer"
                    >
                      <span>Étape {err.stepNumber} : {err.fieldName}</span>
                      <ArrowRight className="w-3 h-3 text-amber-700" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-700 mb-1 flex items-center justify-between">
                  <span>Nom & Prénom (Demandeur) *</span>
                  {fullNameError && (
                    <span className="text-red-600 font-semibold normal-case text-[10px] flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> Requis
                    </span>
                  )}
                </label>
                <input
                  type="text"
                  id="input-applicant-fullname"
                  value={applicantDetails.fullName}
                  onChange={(e) => setApplicantDetails({ ...applicantDetails, fullName: e.target.value })}
                  placeholder="Ex. Amadou Seydou DIALLO"
                  className={`w-full px-2.5 py-1.5 bg-slate-50 border rounded-lg text-slate-900 text-xs sm:text-sm font-semibold focus:outline-none focus:bg-white focus:ring-2 transition-all ${
                    fullNameError
                      ? 'border-red-500 ring-2 ring-red-500/20 bg-red-50/20 text-red-950'
                      : 'border-slate-300 focus:ring-indigo-500/20 focus:border-indigo-600'
                  }`}
                />
                {fullNameError && (
                  <p className="text-[11px] text-red-600 font-medium mt-1 leading-tight">
                    {fullNameError.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-700 mb-1 flex items-center justify-between">
                  <span>N° Passeport Ordinaire *</span>
                  {passportError && (
                    <span className="text-red-600 font-semibold normal-case text-[10px] flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> Requis
                    </span>
                  )}
                </label>
                <input
                  type="text"
                  id="input-applicant-passport"
                  value={applicantDetails.passportNumber}
                  onChange={(e) => setApplicantDetails({ ...applicantDetails, passportNumber: e.target.value.toUpperCase() })}
                  placeholder="Ex. 24ML00000"
                  className={`w-full px-2.5 py-1.5 bg-slate-50 border rounded-lg text-slate-900 text-xs sm:text-sm font-semibold font-mono focus:outline-none focus:bg-white focus:ring-2 transition-all ${
                    passportError
                      ? 'border-red-500 ring-2 ring-red-500/20 bg-red-50/20 text-red-950'
                      : 'border-slate-300 focus:ring-indigo-500/20 focus:border-indigo-600'
                  }`}
                />
                {passportError && (
                  <p className="text-[11px] text-red-600 font-medium mt-1 leading-tight">
                    {passportError.message}
                  </p>
                )}
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-700 mb-1 flex items-center justify-between">
                  <span>Nom complet du Garant Financier {answers.fundingSource !== 'autofinancement' ? '*' : '(optionnel si autofinancement)'}</span>
                  {guarantorError && (
                    <span className="text-red-600 font-semibold normal-case text-[10px] flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> Requis
                    </span>
                  )}
                </label>
                <input
                  type="text"
                  id="input-guarantor-fullname"
                  value={applicantDetails.guarantorFullName}
                  onChange={(e) => setApplicantDetails({ ...applicantDetails, guarantorFullName: e.target.value })}
                  placeholder="Ex. Ousmane DIALLO (Oncle direct)"
                  className={`w-full px-2.5 py-1.5 bg-slate-50 border rounded-lg text-slate-900 text-xs sm:text-sm font-semibold focus:outline-none focus:bg-white focus:ring-2 transition-all ${
                    guarantorError
                      ? 'border-red-500 ring-2 ring-red-500/20 bg-red-50/20 text-red-950'
                      : 'border-slate-300 focus:ring-indigo-500/20 focus:border-indigo-600'
                  }`}
                />
                {guarantorError && (
                  <p className="text-[11px] text-red-600 font-medium mt-1 leading-tight">
                    {guarantorError.message}
                  </p>
                )}
              </div>

              {/* Slider with dynamic capping, scale overflow detection, and instant regulatory tooltip */}
              <div className="sm:col-span-2">
                <StayDurationSlider
                  id="input-travel-duration"
                  value={applicantDetails.travelDurationDays}
                  onChange={(days) => setApplicantDetails((prev) => ({ ...prev, travelDurationDays: days }))}
                  answers={answers}
                />
                {durationError && (
                  <p className="text-[11px] text-red-600 font-semibold mt-1">
                    ⚠️ {durationError.message}
                  </p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                Précisions particulières pour l'IA consulaire (optionnel)
              </label>
              <textarea
                id="input-custom-notes"
                rows={2}
                value={applicantDetails.customAiNotes}
                onChange={(e) => setApplicantDetails({ ...applicantDetails, customAiNotes: e.target.value })}
                placeholder="Ex. Université ciblée, entreprise partenaire, attaches notariales..."
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-xs font-medium focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
              />
            </div>

            {/* Validation State Banner Before Generation */}
            {validationResult.isValid ? (
              <div className="p-2.5 bg-emerald-50 border border-emerald-300 rounded-xl text-xs text-emerald-950 flex items-center justify-between gap-2 shadow-2xs">
                <div className="flex items-center space-x-2 min-w-0">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="text-[11px] font-semibold text-emerald-950">
                    Dossier 100% complet & conforme : Prêt pour la génération des documents certifiés.
                  </span>
                </div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-emerald-200 text-emerald-900 shrink-0">
                  VALIDÉ
                </span>
              </div>
            ) : (
              <div className="p-2.5 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-950 flex items-center justify-between gap-2 shadow-2xs">
                <div className="flex items-center space-x-2 min-w-0">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span className="text-[11px] font-semibold text-amber-950">
                    Validation requise : <strong>{validationResult.errorCount} point{validationResult.errorCount > 1 ? 's' : ''}</strong> à corriger avant génération.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowValidationBlockModal(true)}
                  className="text-[10px] font-bold px-2.5 py-1 rounded-md bg-amber-200 hover:bg-amber-300 text-amber-950 flex items-center space-x-1 cursor-pointer shrink-0 transition-colors"
                >
                  <span>Détails</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            )}

            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-700 flex items-start space-x-2">
              <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
              <span className="text-[11px]">
                <strong>Confidentialité consulaire :</strong> Vos données restent strictement privées et stockées localement.
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation Actions Bar */}
      <div className="pt-1 flex items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <motion.button
            whileHover={currentStepIndex > 0 ? { scale: 1.02 } : {}}
            whileTap={currentStepIndex > 0 ? { scale: 0.98 } : {}}
            onClick={handlePrevious}
            disabled={currentStepIndex === 0}
            className={`px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:text-slate-950 hover:bg-slate-100 text-xs font-bold flex items-center space-x-1.5 transition-all ${
              currentStepIndex === 0 ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'
            }`}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Précédent</span>
          </motion.button>

          <motion.button
            id="btn-step-reset"
            whileHover={{ rotate: -90, scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => {
              sound.tap();
              setDirection(-1);
              setCurrentStepIndex(0);
              setSelectedOptionId(null);
              setActiveFeedback(null);
              setFreeInputText('');
              setHasAttemptedSubmit(false);
              setAnswers({
                visaReason: '' as any,
                destination: '' as any,
                specificDestination: '',
                countryOfOrigin: '',
                filingCountry: '',
                isFilingFromSameCountry: true,
                travelDurationDays: 15,
                status: 'etudiant',
                fundingSource: 'garant_local',
                availableBudgetFcfa: 0,
                hasRecentLumpDeposit: false,
                lumpDepositChoice: '',
                tiesType: 'etudes_en_cours',
                accommodationType: 'residence_etudiante',
                hasPassport6MonthsValid: true,
                hasPreviousRefusal: false,
                fullName: '',
                passportNumber: '',
                guarantorFullName: '',
              });
              try {
                localStorage.removeItem('visaflow_user_answers_v5');
                localStorage.removeItem('visaflow_has_completed_v5');
                localStorage.removeItem('visaflow_dossier_id_v5');
                localStorage.removeItem('visaflow_session_timestamp');
              } catch {}
            }}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            title="Recommencer depuis l'étape 1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </motion.button>
        </div>

        <motion.button
          id="btn-step-next"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleNext}
          className={`px-4 sm:px-6 py-2 rounded-lg font-bold text-xs uppercase tracking-wider flex items-center justify-center space-x-2 transition-all select-none shadow-xs cursor-pointer ${
            isFinalDetailsStep
              ? validationResult.isValid
                ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-900 hover:from-emerald-700 hover:to-indigo-950 text-white hover:shadow-sm'
                : 'bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-500/40'
              : canProceed
              ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-900 hover:from-emerald-700 hover:to-indigo-950 text-white hover:shadow-sm'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
          }`}
          disabled={!isFinalDetailsStep && !canProceed}
        >
          {isFinalDetailsStep ? (
            validationResult.isValid ? (
              <>
                <span>Générer mes documents officiels</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            ) : (
              <>
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                <span>Vérifier & Débloquer ({validationResult.errorCount})</span>
              </>
            )
          ) : (
            <>
              <span>Continuer</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </>
          )}
        </motion.button>
      </div>

      {/* Critical Vulnerability Warning Modal */}
      <AnimatePresence>
        {showAlerteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="bg-white border-2 border-red-500 max-w-md w-full p-5 text-slate-900 shadow-xl space-y-3"
            >
              <div className="flex items-center space-x-2 text-red-600">
                <AlertOctagon className="w-5 h-5 shrink-0" />
                <span className="text-xs font-mono font-bold uppercase tracking-wider">
                  Signal d'alerte consulaire
                </span>
              </div>

              <h3 className="text-base font-bold text-slate-950">
                Point critique détecté
              </h3>

              <div className="text-xs text-slate-700 space-y-2 leading-relaxed">
                <p className="font-semibold text-red-950">{activeFeedback?.title}</p>
                <p>{activeFeedback?.message}</p>
                {activeFeedback?.actionRequired && (
                  <div className="p-2.5 bg-red-50 border-l-2 border-red-600 text-red-900 text-xs font-medium">
                    <strong>Action corrective indispensable :</strong> {activeFeedback.actionRequired}
                  </div>
                )}
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  id="btn-close-alerte"
                  onClick={() => {
                    sound.tap();
                    setShowAlerteModal(false);
                  }}
                  className="w-full px-4 py-2 bg-slate-950 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider transition-colors"
                >
                  J'ai pris note du risque consulaire
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 3. Searchable World Destinations Modal */}
      <OtherCountriesModal
        isOpen={isOtherCountriesModalOpen}
        onClose={() => setIsOtherCountriesModalOpen(false)}
        onSelectCountry={handleSelectWorldDestination}
        selectedDestinationName={answers.specificDestination}
      />

      {/* 4. Document Generation Full Validation Block Modal */}
      <ValidationBlockModal
        isOpen={showValidationBlockModal}
        onClose={() => setShowValidationBlockModal(false)}
        errors={validationResult.errors}
        onGoToStep={handleGoToStep}
      />
    </div>
  );
};
