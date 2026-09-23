import React from 'react';
import { ExternalLink, ShieldCheck, Calendar, Info } from 'lucide-react';

interface OfficialSourceBadgeProps {
  sourceName: string;
  sourceUrl?: string;
  lastCheckedDate?: string;
  ruleCitation?: string;
  legalBasis?: string;
  className?: string;
}

export const OfficialSourceBadge: React.FC<OfficialSourceBadgeProps> = ({
  sourceName,
  sourceUrl,
  lastCheckedDate = '10 septembre 2026',
  ruleCitation,
  legalBasis,
  className = '',
}) => {
  return (
    <div
      className={`border-l-2 border-emerald-600 bg-slate-50/70 pl-3.5 py-2 pr-3 text-xs text-slate-700 space-y-1 ${className}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center space-x-1.5 text-slate-900 font-semibold tracking-tight">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-700 flex-shrink-0" />
          <span className="uppercase text-[10px] font-bold tracking-wider text-slate-500">
            Source officielle :
          </span>
          <span className="font-bold text-slate-900">{sourceName}</span>
        </div>

        {sourceUrl && (
          <a
            href={sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center space-x-1 text-[11px] font-semibold text-emerald-800 hover:text-emerald-950 underline underline-offset-2"
          >
            <span>Consulter le texte</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>

      {ruleCitation && (
        <p className="text-slate-600 text-[11px] leading-relaxed italic">
          « {ruleCitation} »
        </p>
      )}

      {legalBasis && (
        <p className="text-slate-500 text-[10px]">
          <strong>Fondement juridique :</strong> {legalBasis}
        </p>
      )}

      <div className="flex items-center space-x-1.5 text-[10px] text-slate-400 pt-0.5 font-mono">
        <Calendar className="w-3 h-3 text-slate-400" />
        <span>Vérifié au : {lastCheckedDate}</span>
      </div>
    </div>
  );
};
