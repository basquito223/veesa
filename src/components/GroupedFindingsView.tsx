import React, { useState } from 'react';
import {
  CheckCircle2,
  FileText,
  HelpCircle,
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
  ExternalLink,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { ConsularPillarId } from '../types/assessment';
import {
  FindingPresentationGroup,
  FindingSeverity,
  PresentedFinding,
  FindingsPresentationSummary,
} from '../types/findingsPresentation';
import { GROUP_CONFIG, SEVERITY_CONFIG, PILLAR_SHORT_TITLES } from '../utils/findingsPresentationAdapter';

interface GroupedFindingsViewProps {
  summary: FindingsPresentationSummary;
  selectedPillarFilter?: ConsularPillarId | 'all';
  onNavigateToChecklist?: () => void;
}

const GROUP_ICONS: Record<FindingPresentationGroup, React.FC<{ className?: string }>> = {
  strengths: CheckCircle2,
  missing_documents: FileText,
  additional_info: HelpCircle,
  regulatory_issues: AlertOctagon,
};

export const GroupedFindingsView: React.FC<GroupedFindingsViewProps> = ({
  summary,
  selectedPillarFilter = 'all',
  onNavigateToChecklist,
}) => {
  const [activeGroup, setActiveGroup] = useState<FindingPresentationGroup | 'all'>('all');
  const [activeSeverity, setActiveSeverity] = useState<FindingSeverity | 'all'>('all');

  // Filtrage combiné par groupe, pilier et sévérité
  const filteredFindings = summary.allPresentedFindings.filter((finding) => {
    if (selectedPillarFilter !== 'all' && finding.pillarId !== selectedPillarFilter) {
      return false;
    }
    if (activeGroup !== 'all' && finding.group !== activeGroup) {
      return false;
    }
    if (activeSeverity !== 'all' && finding.severity !== activeSeverity) {
      return false;
    }
    return true;
  });

  const groupsOrder: FindingPresentationGroup[] = [
    'regulatory_issues',
    'missing_documents',
    'additional_info',
    'strengths',
  ];

  return (
    <div id="grouped-findings-view" className="space-y-5">
      {/* Barre d'onglets de regroupement */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <button
            onClick={() => setActiveGroup('all')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-xs border transition-colors cursor-pointer ${
              activeGroup === 'all'
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            Tous ({summary.totalFindings})
          </button>

          {groupsOrder.map((groupKey) => {
            const count = summary.countsByGroup[groupKey];
            const Icon = GROUP_ICONS[groupKey];
            const isCurrent = activeGroup === groupKey;
            const config = GROUP_CONFIG[groupKey];

            return (
              <button
                key={groupKey}
                onClick={() => setActiveGroup(groupKey)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xs border transition-colors cursor-pointer ${
                  isCurrent
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isCurrent ? 'text-white' : 'text-slate-500'}`} />
                <span>{config.label}</span>
                <span
                  className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    isCurrent ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Filtre de sévérité */}
        <div className="flex items-center gap-1.5 text-xs self-start sm:self-auto">
          <span className="text-[11px] text-slate-500 font-medium">Sévérité :</span>
          <select
            value={activeSeverity}
            onChange={(e) => setActiveSeverity(e.target.value as FindingSeverity | 'all')}
            className="text-xs bg-white border border-slate-200 px-2 py-1 rounded-xs text-slate-800 font-medium focus:outline-hidden focus:ring-1 focus:ring-slate-900"
          >
            <option value="all">Toutes ({summary.totalFindings})</option>
            <option value="critical">Critique ({summary.countsBySeverity.critical})</option>
            <option value="important">Important ({summary.countsBySeverity.important})</option>
            <option value="recommended">Recommandé ({summary.countsBySeverity.recommended})</option>
          </select>
        </div>
      </div>

      {/* Description du groupe actif si sélectionné */}
      {activeGroup !== 'all' && (
        <div className="p-3 bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed">
          <strong className="font-semibold text-slate-900">{GROUP_CONFIG[activeGroup].label} : </strong>
          {GROUP_CONFIG[activeGroup].description}
        </div>
      )}

      {/* Liste des constats filtrés */}
      {filteredFindings.length > 0 ? (
        <div className="space-y-3.5">
          {filteredFindings.map((finding) => {
            const severityInfo = SEVERITY_CONFIG[finding.severity];
            const groupInfo = GROUP_CONFIG[finding.group];
            const GroupIcon = GROUP_ICONS[finding.group];

            return (
              <div
                key={finding.id}
                id={`presented-finding-${finding.id}`}
                className={`p-4 sm:p-5 border transition-colors space-y-3 ${
                  finding.severity === 'critical'
                    ? 'bg-rose-50/40 border-rose-200 hover:bg-rose-50/70'
                    : finding.severity === 'important'
                    ? 'bg-amber-50/30 border-amber-200 hover:bg-amber-50/60'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                {/* Entête du constat */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 border text-[11px] font-semibold rounded-xs ${groupInfo.badgeClass}`}
                    >
                      <GroupIcon className="w-3 h-3 shrink-0" />
                      <span>{groupInfo.label}</span>
                    </span>

                    <span className="text-xs font-mono text-slate-400">|</span>

                    <span className="text-xs font-medium text-slate-600">
                      Dimension : <strong className="text-slate-900">{PILLAR_SHORT_TITLES[finding.pillarId] || finding.pillarTitle}</strong>
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2 py-0.5 border text-[11px] rounded-xs ${severityInfo.badgeClass}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${severityInfo.dotClass}`} />
                      <span>{severityInfo.label}</span>
                    </span>

                    {finding.isDirectBlocker && (
                      <span className="px-1.5 py-0.5 bg-rose-600 text-white text-[10px] font-bold uppercase tracking-wider rounded-xs">
                        Bloquant
                      </span>
                    )}
                  </div>
                </div>

                {/* Titre */}
                <h5 className="text-sm sm:text-base font-bold text-slate-950 leading-snug">
                  {finding.title}
                </h5>

                {/* Détails structurés */}
                <div className="space-y-2 text-xs sm:text-sm">
                  {/* Fait déclaré */}
                  <div className="text-slate-700 pl-3 border-l-2 border-slate-300">
                    <span className="font-semibold text-slate-900">Fait déclaré : </span>
                    <span>{finding.declaredFact}</span>
                  </div>

                  {/* Base officielle */}
                  {finding.officialBasis && (
                    <div className="text-slate-700 pl-3 border-l-2 border-blue-400 bg-blue-50/50 p-2 rounded-xs">
                      <span className="font-semibold text-blue-950">Base réglementaire vérifiée : </span>
                      <span>{finding.officialBasis}</span>
                      {finding.sourceRuleId && (
                        <span className="block font-mono text-[11px] text-blue-700 mt-0.5">
                          Réf. certifiée : {finding.sourceRuleId}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Rationale neutre */}
                  <div className="text-slate-800 leading-relaxed pl-3 border-l-2 border-slate-400">
                    <span className="font-semibold text-slate-950">Analyse consulaire : </span>
                    <span>{finding.findingRationale}</span>
                  </div>

                  {/* Démarche concrète */}
                  {finding.suggestedAction && (
                    <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-xs flex items-start gap-2.5">
                      <ArrowRight className="w-4 h-4 text-slate-800 shrink-0 mt-0.5" />
                      <div className="text-xs sm:text-sm">
                        <strong className="text-slate-950 font-semibold">Démarche recommandée : </strong>
                        <span className="text-slate-800">{finding.suggestedAction}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-xs space-y-2">
          <CheckCircle2 className="w-8 h-8 text-slate-400 mx-auto" />
          <div className="text-sm font-semibold text-slate-800">
            Aucun constat ne correspond aux filtres sélectionnés
          </div>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Ajustez le groupe ou le niveau de sévérité pour afficher les autres observations consulaires.
          </p>
        </div>
      )}
    </div>
  );
};
