import React from 'react';
import { AlertTriangle, ShieldCheck, ArrowRight } from 'lucide-react';

interface ScamInterceptionNoticeProps {
  reason: string;
  officialCost: string;
  officialRuleText: string;
  officialPortalUrl?: string;
  officialPortalName?: string;
  onViewRule?: () => void;
  className?: string;
}

export const ScamInterceptionNotice: React.FC<ScamInterceptionNoticeProps> = ({
  reason,
  officialCost,
  officialRuleText,
  officialPortalUrl,
  officialPortalName,
  onViewRule,
  className = '',
}) => {
  return (
    <div
      className={`border border-amber-300 bg-amber-50/60 p-4 sm:p-5 rounded-none text-slate-900 space-y-3 ${className}`}
    >
      <div className="flex items-start justify-between gap-2 border-b border-amber-200/80 pb-2.5">
        <div className="flex items-center space-x-2 text-amber-950 font-bold text-xs uppercase tracking-wider">
          <AlertTriangle className="w-4 h-4 text-amber-700 flex-shrink-0" />
          <span>Vérification avant paiement</span>
        </div>
        <div className="text-xs font-mono font-bold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 border border-emerald-300">
          Coût légal : {officialCost}
        </div>
      </div>

      <div className="space-y-1.5 text-xs sm:text-sm">
        <p className="font-semibold text-slate-900 leading-snug">{reason}</p>
        <p className="text-slate-700 text-xs leading-relaxed">{officialRuleText}</p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs">
        <div className="flex items-center space-x-1.5 text-slate-600 text-[11px]">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
          <span>Aucun frais légal ne se règle en dehors des guichets agréés d'État.</span>
        </div>

        {officialPortalUrl && (
          <a
            href={officialPortalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center space-x-1 font-bold text-emerald-900 hover:text-emerald-950 underline underline-offset-2"
          >
            <span>{officialPortalName || 'Voir le portail officiel'}</span>
            <ArrowRight className="w-3 h-3" />
          </a>
        )}
      </div>
    </div>
  );
};
