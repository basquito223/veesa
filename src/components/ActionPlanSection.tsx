import React, { useState } from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  FileText,
  Scale,
  Layers,
  Sparkles,
  ShieldAlert,
  Info,
} from 'lucide-react';
import { ActionItem, ActionPlanSummary, ActionPriority } from '../types/actionEngine';
import { sound } from '../utils/feedback';

interface ActionPlanSectionProps {
  actionPlan: ActionPlanSummary;
  onNavigateToChecklist?: () => void;
}

const PRIORITY_CONFIG: Record<
  ActionPriority,
  {
    label: string;
    sublabel: string;
    badgeClass: string;
    borderClass: string;
    headerBg: string;
    icon: React.ElementType;
  }
> = {
  critical: {
    label: 'Actions Critiques',
    sublabel: 'Régularisations impératives avant tout dépôt ou prise de rendez-vous',
    badgeClass: 'bg-rose-50 text-rose-800 border-rose-200',
    borderClass: 'border-rose-200 bg-rose-50/20',
    headerBg: 'bg-rose-50/70 border-rose-200 text-rose-950',
    icon: AlertOctagon,
  },
  important: {
    label: 'Actions Importantes',
    sublabel: 'Pièces probantes et clarifications contextuelles hautement prioritaires',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
    borderClass: 'border-amber-200 bg-amber-50/20',
    headerBg: 'bg-amber-50/70 border-amber-200 text-amber-950',
    icon: AlertTriangle,
  },
  recommended: {
    label: 'Améliorations Recommandées',
    sublabel: 'Consolidations et sécurisation des éléments favorables du dossier',
    badgeClass: 'bg-blue-50 text-blue-800 border-blue-200',
    borderClass: 'border-blue-200 bg-blue-50/20',
    headerBg: 'bg-blue-50/70 border-blue-200 text-blue-950',
    icon: Sparkles,
  },
};

const CATEGORY_LABELS: Record<string, string> = {
  regularization: 'Régularisation formelle',
  evidence_collection: 'Collecte de justificatif',
  information_completion: 'Complétion d’information',
  context_clarification: 'Clarification contextuelle',
  consolidation_safeguard: 'Sécurisation de preuve',
};

export const ActionPlanSection: React.FC<ActionPlanSectionProps> = ({
  actionPlan,
  onNavigateToChecklist,
}) => {
  const [expandedAuditIds, setExpandedAuditIds] = useState<Record<string, boolean>>({});
  const [activeSectionFilter, setActiveSectionFilter] = useState<'all' | ActionPriority>('all');

  const toggleAudit = (actionId: string) => {
    sound.tap();
    setExpandedAuditIds((prev) => ({ ...prev, [actionId]: !prev[actionId] }));
  };

  const renderActionList = (actions: ActionItem[], priority: ActionPriority) => {
    if (actions.length === 0) {
      return (
        <div className="p-4 bg-slate-50 border border-slate-200 text-xs text-slate-500 rounded-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Aucune action de niveau {priority} identifiée sur la base des éléments déclarés.</span>
        </div>
      );
    }

    const config = PRIORITY_CONFIG[priority];
    const HeaderIcon = config.icon;

    return (
      <div className="space-y-3">
        {actions.map((action, index) => {
          const isAuditExpanded = !!expandedAuditIds[action.id];

          return (
            <div
              key={action.id}
              id={`action-item-${action.id}`}
              className={`p-4 sm:p-5 border rounded-xs transition-colors space-y-4 ${
                action.isDirectBlocker
                  ? 'bg-rose-50/30 border-rose-300'
                  : action.priority === 'critical'
                  ? 'bg-rose-50/20 border-rose-200'
                  : action.priority === 'important'
                  ? 'bg-amber-50/20 border-amber-200'
                  : 'bg-white border-slate-200'
              }`}
            >
              {/* Entête de l'action */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5">
                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-slate-900 text-white text-[11px] font-bold shrink-0">
                      {index + 1}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 border text-[10px] font-bold rounded-xs ${config.badgeClass}`}
                    >
                      <HeaderIcon className="w-3 h-3" />
                      <span>{config.label}</span>
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-700 text-[10px] font-semibold rounded-xs">
                      {CATEGORY_LABELS[action.category] || action.category}
                    </span>
                    {action.isDirectBlocker && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-600 text-white text-[10px] font-bold uppercase tracking-wider rounded-xs">
                        <ShieldAlert className="w-3 h-3" />
                        <span>Bloquant réglementaire</span>
                      </span>
                    )}
                    {action.collapsedFindingsCount > 1 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 border border-indigo-200 text-indigo-800 text-[10px] font-semibold rounded-xs">
                        <Layers className="w-3 h-3" />
                        <span>{action.collapsedFindingsCount} constats regroupés</span>
                      </span>
                    )}
                  </div>

                  <h4 className="text-sm sm:text-base font-bold text-slate-950 leading-snug">
                    {action.title}
                  </h4>
                </div>
              </div>

              {/* Rationale / Pourquoi cette action existe */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xs space-y-1">
                <div className="text-[11px] font-mono uppercase tracking-wider text-slate-500 font-bold flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-slate-500" />
                  <span>Explication Objective (Règle d'instruction) :</span>
                </div>
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                  {action.why}
                </p>
                {action.collapseReason && (
                  <p className="text-[11px] text-slate-500 italic mt-1">
                    Note de synthèse : {action.collapseReason}
                  </p>
                )}
              </div>

              {/* Référence réglementaire si présente */}
              {action.officialBasis && (
                <div className="text-xs text-blue-900 bg-blue-50/60 border border-blue-200 p-2.5 rounded-xs space-y-0.5">
                  <div className="font-semibold flex items-center gap-1.5">
                    <Scale className="w-3.5 h-3.5 text-blue-700" />
                    <span>Base officielle vérifiée :</span>
                  </div>
                  <p className="text-xs text-blue-800">{action.officialBasis}</p>
                  {action.sourceRuleId && (
                    <span className="font-mono text-[10px] text-blue-600 block mt-0.5">
                      Réf. : {action.sourceRuleId}
                    </span>
                  )}
                </div>
              )}

              {/* Démarche concrète */}
              <div className="p-3 bg-white border border-slate-300 rounded-xs space-y-1 shadow-2xs">
                <div className="text-[11px] font-mono uppercase tracking-wider text-slate-900 font-bold flex items-center gap-1.5">
                  <ArrowRight className="w-3.5 h-3.5 text-slate-900" />
                  <span>Démarche Concrète Recommandée :</span>
                </div>
                <p className="text-xs sm:text-sm text-slate-950 font-medium leading-relaxed">
                  {action.concreteStep}
                </p>
              </div>

              {/* Liens et Traçabilité d'Audit */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                <button
                  onClick={() => toggleAudit(action.id)}
                  className="inline-flex items-center gap-1 text-[11px] font-mono text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  <span>Audit : {action.sourceFindingIds.length} constat(s) d’origine</span>
                  {isAuditExpanded ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>

                {action.relatedDocumentKey && onNavigateToChecklist && (
                  <button
                    onClick={() => {
                      sound.tap();
                      onNavigateToChecklist();
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-800 hover:text-slate-950 hover:underline cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5 text-slate-600" />
                    <span>Consulter la check-list des pièces</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Tiroir d'auditabilité dépliable */}
              {isAuditExpanded && (
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xs space-y-2 text-xs">
                  <div className="font-mono font-bold text-slate-600 uppercase text-[10px] tracking-wider">
                    Traçabilité des Constats d'Origine :
                  </div>
                  <div className="space-y-2">
                    {action.sourceFindings.map((finding) => (
                      <div
                        key={finding.id}
                        className="p-2.5 bg-white border border-slate-200 rounded-xs space-y-1"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-[10px] font-bold text-slate-500">
                            {finding.id} [{finding.type}]
                          </span>
                          <span className="text-[10px] font-medium text-slate-500">
                            Critère : {finding.pillarId}
                          </span>
                        </div>
                        <p className="font-semibold text-slate-900 text-xs">{finding.title}</p>
                        <p className="text-[11px] text-slate-600">
                          <span className="font-medium text-slate-700">Fait déclaré : </span>
                          {finding.declaredFact}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div id="section-action-plan-engine" className="space-y-5">
      {/* En-tête avec métriques déterministes */}
      <div className="bg-white border border-slate-200 p-5 sm:p-7 shadow-xs space-y-4 rounded-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-slate-800" />
              <h3 className="text-base sm:text-lg font-bold text-slate-950">
                Plan d’Action Déterministe du Demandeur
              </h3>
            </div>
            <p className="text-xs text-slate-500">
              Synthèse opérationnelle hiérarchisée en 3 niveaux d’action, sans conclusion juridique ni prédiction.
            </p>
          </div>

          {/* Badges de synthèse */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-1 bg-slate-100 border border-slate-200 text-slate-800 text-xs font-bold rounded-xs">
              {actionPlan.totalActionsCount} action{actionPlan.totalActionsCount > 1 ? 's' : ''} au total
            </span>
            {actionPlan.totalCollapsedFindings > 0 && (
              <span className="px-2.5 py-1 bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs font-medium rounded-xs">
                {actionPlan.totalFindingsProcessed} constats synthétisés
              </span>
            )}
          </div>
        </div>

        {/* Compteurs par section & Filtre de vue */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Critique */}
          <button
            onClick={() => {
              sound.tap();
              setActiveSectionFilter((prev) => (prev === 'critical' ? 'all' : 'critical'));
            }}
            className={`p-3 border text-left rounded-xs transition-all cursor-pointer ${
              activeSectionFilter === 'critical'
                ? 'bg-rose-50 border-rose-300 shadow-xs'
                : 'bg-white border-slate-200 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-rose-900 flex items-center gap-1.5">
                <AlertOctagon className="w-3.5 h-3.5 text-rose-600" />
                Actions Critiques
              </span>
              <span className="px-2 py-0.5 bg-rose-100 text-rose-900 text-xs font-mono font-bold rounded-xs">
                {actionPlan.countsByPriority.critical}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Régularisations impératives
            </p>
          </button>

          {/* Important */}
          <button
            onClick={() => {
              sound.tap();
              setActiveSectionFilter((prev) => (prev === 'important' ? 'all' : 'important'));
            }}
            className={`p-3 border text-left rounded-xs transition-all cursor-pointer ${
              activeSectionFilter === 'important'
                ? 'bg-amber-50 border-amber-300 shadow-xs'
                : 'bg-white border-slate-200 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                Actions Importantes
              </span>
              <span className="px-2 py-0.5 bg-amber-100 text-amber-900 text-xs font-mono font-bold rounded-xs">
                {actionPlan.countsByPriority.important}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Pièces probantes et clarifications
            </p>
          </button>

          {/* Recommandé */}
          <button
            onClick={() => {
              sound.tap();
              setActiveSectionFilter((prev) => (prev === 'recommended' ? 'all' : 'recommended'));
            }}
            className={`p-3 border text-left rounded-xs transition-all cursor-pointer ${
              activeSectionFilter === 'recommended'
                ? 'bg-blue-50 border-blue-300 shadow-xs'
                : 'bg-white border-slate-200 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                Recommandations
              </span>
              <span className="px-2 py-0.5 bg-blue-100 text-blue-900 text-xs font-mono font-bold rounded-xs">
                {actionPlan.countsByPriority.recommended}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Consolidations et sécurisation
            </p>
          </button>
        </div>

        {/* Bouton de réinitialisation du filtre si actif */}
        {activeSectionFilter !== 'all' && (
          <div className="flex items-center justify-between text-xs pt-1">
            <span className="text-slate-500">
              Filtre actif : Section {activeSectionFilter}
            </span>
            <button
              onClick={() => {
                sound.tap();
                setActiveSectionFilter('all');
              }}
              className="text-slate-800 hover:underline font-semibold cursor-pointer"
            >
              Afficher toutes les sections
            </button>
          </div>
        )}
      </div>

      {/* Contenu des 3 Sections */}
      <div className="space-y-6">
        {/* Section 1 : Actions Critiques */}
        {(activeSectionFilter === 'all' || activeSectionFilter === 'critical') && (
          <div id="section-actions-critical" className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <AlertOctagon className="w-4 h-4 text-rose-600" />
              <h4 className="text-sm sm:text-base font-bold text-slate-900">
                1. Actions Critiques ({actionPlan.criticalActions.length})
              </h4>
              <span className="text-xs text-slate-500 hidden sm:inline">
                — Non-conformités réglementaires ou contradictions directes
              </span>
            </div>
            {renderActionList(actionPlan.criticalActions, 'critical')}
          </div>
        )}

        {/* Section 2 : Actions Importantes */}
        {(activeSectionFilter === 'all' || activeSectionFilter === 'important') && (
          <div id="section-actions-important" className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <h4 className="text-sm sm:text-base font-bold text-slate-900">
                2. Actions Importantes ({actionPlan.importantActions.length})
              </h4>
              <span className="text-xs text-slate-500 hidden sm:inline">
                — Justificatifs probants pivots et compléments essentiels
              </span>
            </div>
            {renderActionList(actionPlan.importantActions, 'important')}
          </div>
        )}

        {/* Section 3 : Améliorations Recommandées */}
        {(activeSectionFilter === 'all' || activeSectionFilter === 'recommended') && (
          <div id="section-actions-recommended" className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <h4 className="text-sm sm:text-base font-bold text-slate-900">
                3. Améliorations Recommandées ({actionPlan.recommendedActions.length})
              </h4>
              <span className="text-xs text-slate-500 hidden sm:inline">
                — Sécurisation des points forts et cohérence de confort
              </span>
            </div>
            {renderActionList(actionPlan.recommendedActions, 'recommended')}
          </div>
        )}
      </div>
    </div>
  );
};
