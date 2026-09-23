import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, AlertTriangle, ShieldCheck, Plus, Minus, Info } from 'lucide-react';
import { getStayDurationCap, StayDurationCap } from '../utils/stayDurationRules';
import { sound } from '../utils/feedback';

interface StayDurationSliderProps {
  value: number;
  onChange: (days: number) => void;
  answers: {
    visaReason?: string;
    destination?: string;
    countryOfOrigin?: string;
  };
  id?: string;
}

export const StayDurationSlider: React.FC<StayDurationSliderProps> = ({
  value,
  onChange,
  answers,
  id = 'input-travel-duration',
}) => {
  const stayCap: StayDurationCap = getStayDurationCap(answers);

  // Raw position of slider thumb (can move past maxDays on slider scale to detect overflow attempt)
  const initialValidValue = Math.max(stayCap.minDays, Math.min(value || 15, stayCap.maxDays));
  const [sliderPosition, setSliderPosition] = useState<number>(initialValidValue);
  const [isPastMax, setIsPastMax] = useState<boolean>(false);

  // Sync if stayCap changes (e.g. if user changes destination or reason)
  useEffect(() => {
    if (value > stayCap.maxDays) {
      onChange(stayCap.maxDays);
      setSliderPosition(stayCap.maxDays);
      setIsPastMax(false);
    } else if (value < stayCap.minDays) {
      onChange(stayCap.minDays);
      setSliderPosition(stayCap.minDays);
      setIsPastMax(false);
    }
  }, [stayCap.maxDays, stayCap.minDays]);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = Number(e.target.value);
    setSliderPosition(raw);

    if (raw > stayCap.maxDays) {
      // Clamped to actual maximum allowed
      onChange(stayCap.maxDays);
      setIsPastMax(true);
      sound.tap();
    } else {
      // Valid range
      onChange(raw);
      setIsPastMax(false);
    }
  };

  const handleIncrement = () => {
    sound.tap();
    const next = sliderPosition + (stayCap.maxDays > 90 ? 15 : 5);
    if (next > stayCap.maxDays) {
      setSliderPosition(Math.min(next, stayCap.sliderScaleMax));
      onChange(stayCap.maxDays);
      setIsPastMax(true);
    } else {
      setSliderPosition(next);
      onChange(next);
      setIsPastMax(false);
    }
  };

  const handleDecrement = () => {
    sound.tap();
    const prev = Math.max(stayCap.minDays, sliderPosition - (stayCap.maxDays > 90 ? 15 : 5));
    setSliderPosition(prev);
    onChange(Math.min(prev, stayCap.maxDays));
    if (prev <= stayCap.maxDays) {
      setIsPastMax(false);
    }
  };

  const handleSelectPreset = (days: number) => {
    sound.tap();
    const clamped = Math.min(days, stayCap.maxDays);
    setSliderPosition(clamped);
    onChange(clamped);
    setIsPastMax(false);
  };

  // Generate dynamic preset badges
  const presets: { label: string; days: number }[] = [];
  if (stayCap.maxDays >= 90) {
    presets.push({ label: '15j', days: 15 });
    presets.push({ label: '30j', days: 30 });
    presets.push({ label: '60j', days: 60 });
    presets.push({ label: `Plafond (${stayCap.maxDays}j)`, days: stayCap.maxDays });
  } else if (stayCap.maxDays >= 30) {
    presets.push({ label: '7j', days: 7 });
    presets.push({ label: '15j', days: 15 });
    presets.push({ label: '21j', days: 21 });
    presets.push({ label: `Plafond (${stayCap.maxDays}j)`, days: stayCap.maxDays });
  } else {
    presets.push({ label: '5j', days: 5 });
    presets.push({ label: '10j', days: 10 });
    presets.push({ label: `Plafond (${stayCap.maxDays}j)`, days: stayCap.maxDays });
  }

  // Percentage on slider track where cap occurs
  const capPercent = Math.min(100, Math.round((stayCap.maxDays / stayCap.sliderScaleMax) * 100));

  return (
    <div className="space-y-2 p-3 bg-slate-50 border border-slate-200 rounded-xl" id="stay-duration-slider-container">
      {/* Top Header with dynamic badge */}
      <div className="flex items-center justify-between gap-2">
        <label
          htmlFor={id}
          className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5"
        >
          <Calendar className="w-3.5 h-3.5 text-indigo-600" />
          <span>Durée envisagée du séjour</span>
        </label>

        <div className="flex items-center gap-2">
          {isPastMax ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 animate-pulse">
              ⚠️ Plafonnée à {stayCap.maxDays} jours
            </span>
          ) : (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-950 border border-indigo-200 font-mono">
              {value} {value === 1 ? 'jour' : 'jours'}
            </span>
          )}
          <span className="text-[10px] text-slate-500 font-semibold hidden sm:inline">
            (Plafond éligibilité : {stayCap.maxDays}j)
          </span>
        </div>
      </div>

      {/* Slider Controls with Decrement / Increment */}
      <div className="flex items-center gap-3 pt-1">
        <button
          type="button"
          onClick={handleDecrement}
          disabled={sliderPosition <= stayCap.minDays}
          className="p-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          title="Diminuer la durée"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>

        <div className="flex-1 relative py-1">
          {/* Track Visual Markers */}
          <div className="relative w-full">
            <input
              type="range"
              id={id}
              min={stayCap.minDays}
              max={stayCap.sliderScaleMax}
              step={1}
              value={sliderPosition}
              onChange={handleSliderChange}
              className="w-full h-2.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2"
              style={{
                background: `linear-gradient(to right, #4f46e5 0%, #4f46e5 ${Math.min(
                  (sliderPosition / stayCap.sliderScaleMax) * 100,
                  capPercent
                )}%, ${
                  sliderPosition > stayCap.maxDays ? '#f59e0b' : '#e2e8f0'
                } ${Math.min((sliderPosition / stayCap.sliderScaleMax) * 100, capPercent)}%, ${
                  sliderPosition > stayCap.maxDays ? '#f59e0b' : '#e2e8f0'
                } ${capPercent}%, #fecdd3 ${capPercent}%, #fecdd3 100%)`,
              }}
            />

            {/* Visual Cap Divider Pin */}
            <div
              className="absolute top-0 bottom-0 pointer-events-none flex flex-col items-center"
              style={{ left: `${capPercent}%`, transform: 'translateX(-50%)' }}
            >
              <div className="w-0.5 h-4 bg-slate-700 -mt-0.5 rounded-full" />
            </div>
          </div>

          {/* Scale Labels */}
          <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono mt-1 px-0.5">
            <span>{stayCap.minDays}j</span>
            <span className="text-slate-700 font-bold flex items-center gap-1">
              <span>Plafond : {stayCap.maxDays} jours</span>
            </span>
            <span className="text-slate-400">{stayCap.sliderScaleMax}j max échelle</span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleIncrement}
          className="p-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          title="Augmenter la durée"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Preset Buttons */}
      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
        <span className="text-[10px] uppercase font-bold text-slate-400 mr-1">Raccourcis :</span>
        {presets.map((preset) => (
          <button
            key={preset.days}
            type="button"
            onClick={() => handleSelectPreset(preset.days)}
            className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all cursor-pointer ${
              value === preset.days && !isPastMax
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
            }`}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* DYNAMIC TOOLTIP / TIP BOX: appears if user tries to drag past max, disappears when back within valid range */}
      <AnimatePresence>
        {isPastMax && (
          <motion.div
            initial={{ opacity: 0, y: -6, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -6, height: 0 }}
            transition={{ duration: 0.2 }}
            id="stay-duration-cap-tooltip"
            className="p-3 bg-amber-50 border border-amber-300 rounded-lg text-amber-950 text-xs shadow-sm flex items-start space-x-2.5 overflow-hidden"
          >
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <strong className="text-amber-900 font-bold text-xs">
                  Plafond réglementaire : {stayCap.categoryLabel}
                </strong>
                <span className="text-[10px] bg-amber-200/90 text-amber-950 font-bold px-2 py-0.5 rounded-full shrink-0">
                  Max légal : {stayCap.maxDays} jours
                </span>
              </div>
              <p className="text-[11px] text-amber-800 mt-1 leading-snug">
                {stayCap.reasonExplanation}
              </p>
              <div className="mt-1.5 pt-1.5 border-t border-amber-200/60 flex items-center justify-between text-[10px] text-amber-900">
                <span className="font-mono text-amber-800/80">
                  Réf. : {stayCap.legalBasis}
                </span>
                <button
                  type="button"
                  onClick={() => handleSelectPreset(stayCap.maxDays)}
                  className="font-bold underline text-amber-950 hover:text-amber-700 cursor-pointer"
                >
                  Ajuster au plafond ({stayCap.maxDays}j)
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Discreet Helper text if in valid range */}
      {!isPastMax && (
        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 pt-0.5">
          <Info className="w-3 h-3 text-slate-400 shrink-0" />
          <span>
            {stayCap.categoryLabel} : durée légale maximale de {stayCap.maxDays} jours par séjour.
          </span>
        </div>
      )}
    </div>
  );
};
