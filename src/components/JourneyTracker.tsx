import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, Compass } from 'lucide-react';
import { DestinationType, VisaReasonType } from '../types';

interface JourneyTrackerProps {
  originCountry: string;
  filingCountry?: string;
  isFilingFromSameCountry?: boolean;
  destination: DestinationType;
  specificDestination?: string;
  visaReason?: VisaReasonType;
  currentStepIndex?: number;
  totalSteps?: number;
  currentStage?: string;
  onNavigateStep?: (stepIndex: number) => void;
  compact?: boolean;
}

const DESTINATION_LABELS: Record<DestinationType, { country: string; flag: string }> = {
  france: { country: 'France / Schengen', flag: '🇫🇷' },
  canada: { country: 'Canada', flag: '🇨🇦' },
  france_etudes: { country: 'France (Études)', flag: '🇫🇷' },
  france_visite: { country: 'France / Schengen', flag: '🇫🇷' },
  canada_etudes: { country: 'Canada (Études)', flag: '🇨🇦' },
  canada_visiteur: { country: 'Canada (Visite)', flag: '🇨🇦' },
  maroc: { country: 'Maroc', flag: '🇲🇦' },
  turquie: { country: 'Turquie', flag: '🇹🇷' },
  dubai: { country: 'Dubaï (EAU)', flag: '🇦🇪' },
  autre: { country: 'Autre pays', flag: '🌍' },
  '': { country: '', flag: '' },
};

const REASON_LABELS: Record<VisaReasonType, string> = {
  etudes: 'Études',
  tourisme_visite: 'Tourisme / Visite',
  affaires_mission: 'Affaires',
  soins_medicaux: 'Soins médicaux',
  travail_stage: 'Emploi / Stage',
  '': '',
};

export const JourneyTracker: React.FC<JourneyTrackerProps> = ({
  originCountry,
  filingCountry,
  isFilingFromSameCountry = true,
  destination,
  specificDestination,
  visaReason,
  currentStepIndex,
  totalSteps = 8,
}) => {
  const safeCurrentStepIndex = currentStepIndex !== undefined ? currentStepIndex : totalSteps - 1;
  const hasOrigin = !!originCountry && originCountry.trim() !== '';
  const hasReason = !!visaReason && !!REASON_LABELS[visaReason];

  // Resolve display name for destination
  let destDisplay = { country: '', flag: '' };
  if (destination === 'autre' && specificDestination) {
    destDisplay = { country: specificDestination, flag: '🌍' };
  } else if (destination && DESTINATION_LABELS[destination]) {
    destDisplay = DESTINATION_LABELS[destination];
  }
  const hasDestination = Boolean(destination && destDisplay.country);

  const currentStepNumber = Math.min(totalSteps, safeCurrentStepIndex + 1);
  const progressPercent = Math.min(
    100,
    Math.max(8, Math.round((currentStepNumber / totalSteps) * 100))
  );

  return (
    <div className="w-full select-none space-y-2.5">
      {/* Top Bar: Live Route & Percentage Progress */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
        {/* Dynamic Route Chips & Neutral Placeholders */}
        <div className="flex items-center space-x-1.5 font-semibold text-slate-800 flex-wrap gap-y-1">
          <AnimatePresence mode="popLayout">
            {/* Origin Chip or Neutral Placeholder */}
            {hasOrigin ? (
              <motion.div
                key={`origin-${originCountry}`}
                initial={{ opacity: 0, scale: 0.9, x: -6 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
                className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-900 font-bold border border-slate-200"
              >
                <span>{originCountry}</span>
                {!isFilingFromSameCountry && filingCountry && filingCountry !== originCountry && (
                  <span className="text-[10px] text-slate-500 font-normal">
                    (Dépôt : {filingCountry})
                  </span>
                )}
              </motion.div>
            ) : (
              <motion.span
                key="origin-placeholder"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-50 text-slate-400 font-normal border border-dashed border-slate-200 text-[11px]"
              >
                Pays d'origine
              </motion.span>
            )}

            {/* Connecting Route Arrow */}
            <div key="route-arrow" className="flex items-center">
              <ArrowRight
                className={`w-3 h-3 stroke-[2.5] ${
                  hasOrigin && hasDestination ? 'text-slate-500' : 'text-slate-300'
                }`}
              />
            </div>

            {/* Destination Chip or Neutral Placeholder */}
            {hasDestination ? (
              <motion.span
                key={`dest-${destDisplay.country}`}
                initial={{ opacity: 0, scale: 0.9, x: -6 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
                className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 font-bold border border-emerald-200"
              >
                <span>{destDisplay.flag}</span>
                <span>{destDisplay.country}</span>
              </motion.span>
            ) : (
              <motion.span
                key="dest-placeholder"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-50 text-slate-400 font-normal border border-dashed border-slate-200 text-[11px]"
              >
                Destination
              </motion.span>
            )}

            {/* Reason Chip or Neutral Placeholder */}
            {hasReason ? (
              <motion.span
                key={`reason-${visaReason}`}
                initial={{ opacity: 0, scale: 0.9, x: -6 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
                className="inline-flex items-center px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-800 font-semibold border border-indigo-100 text-[11px]"
              >
                {REASON_LABELS[visaReason]}
              </motion.span>
            ) : (
              <motion.span
                key="reason-placeholder"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-50 text-slate-400 font-normal border border-dashed border-slate-200 text-[11px]"
              >
                Motif
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Accurate Single Progress Readout */}
        <div className="flex items-center space-x-2 text-[11px] font-mono shrink-0 sm:ml-auto">
          <span className="text-slate-500 font-medium">
            Étape {currentStepNumber} sur {totalSteps}
          </span>
          <span className="text-slate-300">•</span>
          <motion.span
            key={`pct-${progressPercent}`}
            initial={{ scale: 0.92 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="font-black text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/80"
          >
            {progressPercent}% complété
          </motion.span>
        </div>
      </div>

      {/* Single Unified Percentage Progress Bar with smooth spring animation */}
      <div className="relative w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200/80">
        <motion.div
          className="h-full bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-600 rounded-full shadow-xs"
          initial={{ width: '8%' }}
          animate={{ width: `${progressPercent}%` }}
          transition={{ duration: 0.4, ease: [0.25, 1, 0.5, 1] }}
        />
      </div>
    </div>
  );
};
