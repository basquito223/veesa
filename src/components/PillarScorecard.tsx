import React from 'react';
import {
  Scale,
  DollarSign,
  History,
  Compass,
  Anchor,
  CheckCircle2,
  AlertTriangle,
  Info,
  AlertOctagon,
  HelpCircle,
  FileText,
} from 'lucide-react';
import { ConsularPillarId } from '../types/assessment';
import { PillarScorecardData } from '../types/findingsPresentation';

interface PillarScorecardProps {
  scorecard: PillarScorecardData;
  isSelected?: boolean;
  onSelect?: () => void;
}

const DIMENSION_ICONS: Record<ConsularPillarId, React.FC<{ className?: string }>> = {
  legal_admissibility: Scale,
  financial_sufficiency: DollarSign,
  financial_provenance: History,
  purpose_and_logistics: Compass,
  ties_and_anchors: Anchor,
};

const STATUS_BADGE_CLASSES: Record<string, string> = {
  conforme: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  a_consolider: 'bg-slate-100 text-slate-700 border-slate-300',
  point_d_attention: 'bg-amber-50 text-amber-900 border-amber-300',
  action_requise: 'bg-rose-50 text-rose-900 border-rose-300 font-semibold',
};

export const PillarScorecard: React.FC<PillarScorecardProps> = ({
  scorecard,
  isSelected,
  onSelect,
}) => {
  const Icon = DIMENSION_ICONS[scorecard.pillarId] || Scale;
  const badgeClass = STATUS_BADGE_CLASSES[scorecard.status] || 'bg-slate-100 text-slate-800';

  // Synthèse textuelle claire et calme sans densité de micro-boîtes
  const itemsToAddress = scorecard.missingDocsCount + scorecard.additionalInfoCount + scorecard.regulatoryIssuesCount;

  return (
    <div
      id={`scorecard-${scorecard.pillarId}`}
      onClick={onSelect}
      className={`p-4 border transition-all cursor-pointer select-none rounded-xs flex flex-col justify-between ${
        isSelected
          ? 'bg-white border-slate-900 shadow-sm ring-1 ring-slate-900'
          : 'bg-white border-slate-200 hover:border-slate-400 hover:shadow-2xs'
      }`}
    >
      <div>
        {/* Top: Icon + Status Pill */}
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <div className="w-8 h-8 rounded-xs bg-slate-100 text-slate-800 flex items-center justify-center shrink-0">
            <Icon className="w-4 h-4" />
          </div>
          <span
            className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-0.5 border text-[11px] rounded-xs font-medium ${badgeClass}`}
          >
            {scorecard.status === 'conforme' && <CheckCircle2 className="w-3 h-3 shrink-0" />}
            {scorecard.status === 'action_requise' && <AlertOctagon className="w-3 h-3 shrink-0 text-rose-600" />}
            {scorecard.status === 'point_d_attention' && <AlertTriangle className="w-3 h-3 shrink-0 text-amber-600" />}
            {scorecard.status === 'a_consolider' && <Info className="w-3 h-3 shrink-0 text-slate-600" />}
            <span className="truncate max-w-[130px]">{scorecard.statusLabel}</span>
          </span>
        </div>

        {/* Short Applicant Title & Full Question */}
        <h4 className="text-xs font-bold text-slate-950 uppercase tracking-wider mb-1">
          {scorecard.shortTitle || scorecard.title}
        </h4>
        <p className="text-xs sm:text-sm font-semibold text-slate-900 leading-snug mb-2">
          {scorecard.title}
        </p>

        {/* Contextual Summary */}
        <p className="text-[11px] text-slate-600 line-clamp-2 mb-3">
          {scorecard.factsSummary}
        </p>
      </div>

      {/* Calm, readable status summary (Replaces 4-box grid) */}
      <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
        <span className="text-slate-500 font-medium">
          {itemsToAddress === 0 ? (
            <span className="text-emerald-700 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 inline text-emerald-600" />
              Critères réunis
            </span>
          ) : (
            <span className="text-slate-700 font-medium">
              {itemsToAddress} {itemsToAddress > 1 ? 'points à préparer' : 'point à préparer'}
            </span>
          )}
        </span>

        {scorecard.hasCriticalIssue ? (
          <span className="px-1.5 py-0.5 bg-rose-50 text-rose-800 border border-rose-200 text-[10px] font-bold rounded-xs">
            Bloquant
          </span>
        ) : (
          <span className="text-[11px] text-slate-400 font-mono">
            {scorecard.totalFindingsCount} {scorecard.totalFindingsCount > 1 ? 'constats' : 'constat'}
          </span>
        )}
      </div>
    </div>
  );
};
