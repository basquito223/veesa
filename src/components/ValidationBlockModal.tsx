import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertOctagon, ArrowRight, X, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { ValidationError } from '../utils/dossierValidation';
import { sound } from '../utils/feedback';

interface ValidationBlockModalProps {
  isOpen: boolean;
  onClose: () => void;
  errors: ValidationError[];
  onGoToStep: (stepIndex: number, fieldId?: string) => void;
}

export const ValidationBlockModal: React.FC<ValidationBlockModalProps> = ({
  isOpen,
  onClose,
  errors,
  onGoToStep,
}) => {
  if (!isOpen || errors.length === 0) return null;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs"
        role="dialog"
        aria-modal="true"
        aria-labelledby="validation-modal-title"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 10 }}
          transition={{ duration: 0.2 }}
          className="bg-white border-2 border-red-500 rounded-2xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
          id="validation-block-dialog"
        >
          {/* Header */}
          <div className="bg-red-50/90 border-b border-red-200 p-4 sm:p-5 flex items-start justify-between gap-3">
            <div className="flex items-start space-x-3">
              <div className="p-2 bg-red-600 text-white rounded-xl shadow-xs shrink-0 mt-0.5">
                <AlertOctagon className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-red-700 bg-red-100 px-2 py-0.5 rounded-md">
                    Contrôle de Conformité Consulaire
                  </span>
                  <span className="text-xs font-bold text-red-600">
                    {errors.length} anomalie{errors.length > 1 ? 's' : ''} détectée{errors.length > 1 ? 's' : ''}
                  </span>
                </div>
                <h3 id="validation-modal-title" className="text-base sm:text-lg font-bold text-slate-950 mt-1">
                  Génération des documents bloquée
                </h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Pour vous protéger d’un refus consulaire automatique pour vice de forme ou fausse déclaration, l’ensemble des données obligatoires doit être complet et valide avant la génération.
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                sound.tap();
                onClose();
              }}
              className="p-1 text-slate-400 hover:text-slate-600 hover:bg-red-100 rounded-lg transition-colors cursor-pointer shrink-0"
              title="Fermer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* List of Validation Errors with Direct Jump Buttons */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5 mb-1">
              <ShieldAlert className="w-3.5 h-3.5 text-red-500" />
              <span>Champs à corriger impérativement :</span>
            </div>

            {errors.map((err, idx) => (
              <motion.div
                key={`${err.stepIndex}-${err.fieldId}-${idx}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="p-3.5 bg-slate-50 hover:bg-red-50/40 border border-slate-200 hover:border-red-300 rounded-xl transition-all group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-200 text-slate-700 font-mono">
                        Étape {err.stepNumber} : {err.stepTitle}
                      </span>
                      <strong className="text-xs font-bold text-slate-900">
                        {err.fieldName}
                      </strong>
                    </div>
                    <p className="text-xs text-red-700 font-semibold leading-snug">
                      {err.message}
                    </p>
                    <p className="text-[11px] text-slate-600 leading-snug">
                      👉 <strong>Action requise :</strong> {err.actionAdvice}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      sound.tap();
                      onGoToStep(err.stepIndex, err.fieldId);
                      onClose();
                    }}
                    className="self-center px-3 py-1.5 bg-white group-hover:bg-red-600 text-slate-700 group-hover:text-white border border-slate-300 group-hover:border-red-600 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all shadow-xs shrink-0 cursor-pointer"
                  >
                    <span>Corriger</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Footer */}
          <div className="bg-slate-50 border-t border-slate-200 p-3 sm:p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
              <CheckCircle2 className="w-4 h-4 text-slate-400 shrink-0" />
              <span>La génération se débloquera dès la validation de ces points.</span>
            </div>
            <button
              type="button"
              onClick={() => {
                sound.tap();
                // If there are errors, automatically jump to the first error step to fix it
                if (errors.length > 0) {
                  onGoToStep(errors[0].stepIndex, errors[0].fieldId);
                }
                onClose();
              }}
              className="px-4 py-2 bg-slate-950 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0"
            >
              Corriger la première erreur (Étape {errors[0]?.stepNumber})
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
