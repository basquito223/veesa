import React, { useState, useMemo } from 'react';
import {
  Scale,
  ShieldCheck,
  AlertTriangle,
  FileText,
  ChevronDown,
  ChevronUp,
  Check,
  Search,
  ArrowRight,
  LayoutGrid,
  Layers,
} from 'lucide-react';
import {
  PersonalizedConsularAssessment,
  ConsularPillarId,
  ConsularPillarDetail,
  ConsularScrutinyLevel,
  DocumentNormativeCategory,
} from '../types/assessment';
import { sound } from '../utils/feedback';
import { PillarScorecardsGrid } from './PillarScorecardsGrid';
import { GroupedFindingsView } from './GroupedFindingsView';
import {
  buildFindingsPresentationSummary,
  mapFindingToPresentationGroup,
  mapFindingToSeverity,
  GROUP_CONFIG,
  SEVERITY_CONFIG,
  PILLAR_TITLES,
  PILLAR_SHORT_TITLES,
} from '../utils/findingsPresentationAdapter';

interface ConsularAssessmentPanelProps {
  assessment: PersonalizedConsularAssessment;
  onNavigateToChecklist?: () => void;
}

const PILLAR_ORDER: ConsularPillarId[] = [
  'legal_admissibility',
  'financial_sufficiency',
  'financial_provenance',
  'purpose_and_logistics',
  'ties_and_anchors',
];

const STATUS_CONFIG: Record<
  ConsularScrutinyLevel,
  { label: string; badgeClass: string; icon: React.FC<{ className?: string }> }
> = {
  conforme: {
    label: 'Conforme aux règles vérifiées',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    icon: ShieldCheck,
  },
  a_consolider: {
    label: 'À consolider (données ou pièces)',
    badgeClass: 'bg-slate-100 text-slate-800 border-slate-300',
    icon: Search,
  },
  point_d_attention: {
    label: 'Point d’attention / Clarification',
    badgeClass: 'bg-amber-50 text-amber-900 border-amber-300',
    icon: AlertTriangle,
  },
  action_requise: {
    label: 'Action requise / Non-conformité',
    badgeClass: 'bg-rose-50 text-rose-900 border-rose-300',
    icon: AlertTriangle,
  },
};

const CATEGORY_LABELS: Record<DocumentNormativeCategory, { label: string; badgeClass: string }> = {
  mandatory_by_regulation: {
    label: 'Prescription réglementaire obligatoire',
    badgeClass: 'bg-rose-50 text-rose-800 border-rose-200',
  },
  recommended_evidence: {
    label: 'Justificatif probant recommandé',
    badgeClass: 'bg-blue-50 text-blue-800 border-blue-200',
  },
  possible_clarification: {
    label: 'Pièce contextuelle facultative',
    badgeClass: 'bg-slate-50 text-slate-700 border-slate-200',
  },
};

export const ConsularAssessmentPanel: React.FC<ConsularAssessmentPanelProps> = ({
  assessment,
  onNavigateToChecklist,
}) => {
  const [expandedPillars, setExpandedPillars] = useState<Record<string, boolean>>({
    legal_admissibility: true,
    financial_sufficiency: true,
    financial_provenance: true,
    purpose_and_logistics: false,
    ties_and_anchors: false,
  });

  const [activeFilter, setActiveFilter] = useState<'all' | 'attention_only'>('all');
  const [viewMode, setViewMode] = useState<'grouped' | 'pillars'>('grouped');
  const [selectedPillarFilter, setSelectedPillarFilter] = useState<ConsularPillarId | 'all'>('all');

  const presentationSummary = useMemo(
    () => buildFindingsPresentationSummary(assessment),
    [assessment]
  );

  const togglePillar = (id: string) => {
    sound.tap();
    setExpandedPillars((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const confidenceBadge =
    assessment.meta.assessmentConfidence === 'high'
      ? { label: 'Confiance Élevée (Sources vérifiées)', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' }
      : assessment.meta.assessmentConfidence === 'medium'
      ? { label: 'Confiance Modérée (Seuils indicatifs)', color: 'text-amber-700 bg-amber-50 border-amber-200' }
      : { label: 'Confiance Partielle (Données à compléter)', color: 'text-slate-700 bg-slate-100 border-slate-300' };

  const completenessBadge =
    assessment.meta.dataCompleteness === 'high'
      ? { label: 'Données déclarées : Complètes', color: 'text-slate-700' }
      : assessment.meta.dataCompleteness === 'medium'
      ? { label: 'Données déclarées : 1 champ manquant', color: 'text-amber-800 font-semibold' }
      : { label: 'Données déclarées : Partiellement renseignées', color: 'text-rose-800 font-semibold' };

  return (
    <div id="consular-assessment-panel" className="space-y-6 sm:space-y-8">
      {/* 1. Header Sobre & Statut de l'Analyse */}
      <div className="bg-white border border-slate-200 p-5 sm:p-7 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Scale className="w-5 h-5 text-slate-700" />
              <span className="text-xs font-mono uppercase tracking-wider text-slate-500 font-semibold">
                Évaluation Consulaire Approfondie 2026
              </span>
            </div>
            <h2 className="text-lg sm:text-2xl font-bold text-slate-950 tracking-tight">
              Évaluation Détaillée de votre Dossier
            </h2>
            <p className="text-xs sm:text-sm text-slate-600">
              Découvrez l'examen méthodique de votre demande selon les 5 questions clés posées par les autorités consulaires.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span
              id="badge-confidence-status"
              className={`inline-flex items-center px-2.5 py-1 border font-medium ${confidenceBadge.color}`}
            >
              {confidenceBadge.label}
            </span>
            <span
              id="badge-completeness-status"
              className={`inline-flex items-center px-2.5 py-1 bg-slate-50 border border-slate-200 ${completenessBadge.color}`}
            >
              {completenessBadge.label}
            </span>
          </div>
        </div>

        {/* Posture consulaire globale */}
        <div
          id="summary-posture-card"
          className={`p-4 border ${
            assessment.summaryAssessment.hasBlockingIssue
              ? 'bg-rose-50/70 border-rose-200'
              : assessment.topPriorities.length > 0
              ? 'bg-amber-50/60 border-amber-200'
              : 'bg-slate-50 border-slate-200'
          }`}
        >
          <div className="flex items-start gap-3">
            {assessment.summaryAssessment.hasBlockingIssue ? (
              <AlertTriangle className="w-5 h-5 text-rose-700 shrink-0 mt-0.5" />
            ) : (
              <ShieldCheck className="w-5 h-5 text-slate-700 shrink-0 mt-0.5" />
            )}
            <div className="space-y-1">
              <div className="text-sm sm:text-base font-bold text-slate-950">
                {assessment.summaryAssessment.readinessHeadline}
              </div>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                {assessment.summaryAssessment.narrativeOverview}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Scorecards des 5 Dimensions */}
      <div id="section-pillars-scorecards" className="space-y-5">
        <div className="bg-white border border-slate-200 p-4 sm:p-6 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-500 font-bold">
              Les 5 Questions Clés de l’Instruction
            </span>
            <span className="text-[11px] text-slate-500">
              Cliquez sur une dimension pour filtrer les constats
            </span>
          </div>
          <PillarScorecardsGrid
            scorecards={presentationSummary.scorecardsList}
            selectedPillarId={selectedPillarFilter}
            onSelectPillar={(pid) => {
              sound.tap();
              setSelectedPillarFilter(pid);
            }}
          />
        </div>

        {/* 3. Panneau Principal des Constats */}
        <div className="bg-white border border-slate-200 p-5 sm:p-7 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-950">
                {viewMode === 'grouped'
                  ? 'Constats Consulaires Regroupés par Nature d’Enjeu'
                  : 'Évaluation Détaillée par Dimension Consulaire'}
              </h3>
              <p className="text-xs text-slate-500">
                {viewMode === 'grouped'
                  ? 'Synthèse opérationnelle : Éléments favorables, Pièces à réunir, Précisions requises et Points bloquants.'
                  : 'Grille d’instruction objective confrontée aux règles officielles vérifiées.'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              {/* Toggle Vue par Enjeu / Vue par Dimension */}
              <div className="flex items-center p-0.5 bg-slate-100 rounded-xs border border-slate-200">
                <button
                  onClick={() => {
                    sound.tap();
                    setViewMode('grouped');
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xs transition-colors cursor-pointer ${
                    viewMode === 'grouped'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>Vue par Enjeu</span>
                </button>
                <button
                  onClick={() => {
                    sound.tap();
                    setViewMode('pillars');
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xs transition-colors cursor-pointer ${
                    viewMode === 'pillars'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Vue par Question</span>
                </button>
              </div>

              {viewMode === 'pillars' && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setActiveFilter('all')}
                    className={`px-2.5 py-1 text-xs border rounded-xs transition-colors cursor-pointer ${
                      activeFilter === 'all'
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    Tous
                  </button>
                  <button
                    onClick={() => setActiveFilter('attention_only')}
                    className={`px-2.5 py-1 text-xs border rounded-xs transition-colors cursor-pointer ${
                      activeFilter === 'attention_only'
                        ? 'bg-amber-600 text-white border-amber-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    À consolider / corriger
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Affichage des constats selon le mode choisi */}
          {viewMode === 'grouped' ? (
            <GroupedFindingsView
              summary={presentationSummary}
              onNavigateToChecklist={onNavigateToChecklist}
            />
          ) : (
            <div className="space-y-4">
              {PILLAR_ORDER.map((pillarId) => {
                if (selectedPillarFilter !== 'all' && selectedPillarFilter !== pillarId) {
                  return null;
                }

                const pillar = assessment.pillars[pillarId];
                const isExpanded = !!expandedPillars[pillarId];
                const statusInfo = STATUS_CONFIG[pillar.status];
                const StatusIcon = statusInfo.icon;

                const hasAttention = pillar.status !== 'conforme';
                if (activeFilter === 'attention_only' && !hasAttention) {
                  return null;
                }

                return (
                  <div
                    key={pillar.id}
                    id={`pillar-card-${pillar.id}`}
                    className="bg-white border border-slate-200 overflow-hidden shadow-xs transition-all"
                  >
                    {/* Header cliquable du pilier */}
                    <button
                      onClick={() => togglePillar(pillar.id)}
                      className="w-full p-4 sm:p-5 flex items-start sm:items-center justify-between gap-3 text-left hover:bg-slate-50/80 transition-colors cursor-pointer"
                    >
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="text-[11px] font-mono uppercase tracking-wider text-slate-500 font-bold">
                          {PILLAR_SHORT_TITLES[pillar.id] || pillar.title}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm sm:text-base font-bold text-slate-950">
                            {PILLAR_TITLES[pillar.id] || pillar.title}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 border text-xs font-medium ${statusInfo.badgeClass}`}
                          >
                            <StatusIcon className="w-3.5 h-3.5 shrink-0" />
                            <span>{statusInfo.label}</span>
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 line-clamp-1 sm:line-clamp-none">
                          {pillar.factsSummary}
                        </p>
                      </div>

                      <div className="shrink-0 p-1 text-slate-400 hover:text-slate-700">
                        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </div>
                    </button>

                    {/* Corps du pilier déplié */}
                    {isExpanded && (
                      <div className="p-4 sm:p-6 border-t border-slate-100 bg-white space-y-6">
                        {/* Angle de l'instructeur */}
                        <div className="p-3.5 bg-slate-50 border border-slate-200 text-xs sm:text-sm text-slate-700 leading-relaxed flex items-start gap-2.5">
                          <Search className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                          <div>
                            <strong className="text-slate-900 font-semibold">
                              Ce que regarde l’instructeur consulaire :{' '}
                            </strong>
                            {pillar.officerAngle}
                          </div>
                        </div>

                        {/* Findings du pilier */}
                        {pillar.findings.length > 0 ? (
                          <div className="space-y-4">
                            <div className="text-xs font-mono uppercase tracking-wider text-slate-500 font-bold">
                              Observations & Déductions Méthodologiques ({pillar.findings.length}) :
                            </div>

                            <div className="space-y-3">
                              {pillar.findings.map((finding) => {
                                const group = mapFindingToPresentationGroup(finding);
                                const severity = mapFindingToSeverity(finding);
                                const groupMeta = GROUP_CONFIG[group];
                                const severityMeta = SEVERITY_CONFIG[severity];

                                return (
                                  <div
                                    key={finding.id}
                                    id={`finding-${finding.id}`}
                                    className={`p-4 border space-y-3 ${
                                      severity === 'critical'
                                        ? 'bg-rose-50/50 border-rose-200'
                                        : severity === 'important'
                                        ? 'bg-amber-50/40 border-amber-200'
                                        : 'bg-slate-50/50 border-slate-200'
                                    }`}
                                  >
                                    <div className="flex flex-wrap items-start justify-between gap-2">
                                      <div className="space-y-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                          <span
                                            className={`inline-flex items-center px-2 py-0.5 border text-[10px] font-bold rounded-xs ${groupMeta.badgeClass}`}
                                          >
                                            {groupMeta.label}
                                          </span>
                                          <span
                                            className={`inline-flex items-center gap-1 px-2 py-0.5 border text-[10px] rounded-xs ${severityMeta.badgeClass}`}
                                          >
                                            <span className={`w-1.5 h-1.5 rounded-full ${severityMeta.dotClass}`} />
                                            <span>{severityMeta.label}</span>
                                          </span>
                                          <h5 className="text-sm font-bold text-slate-950">
                                            {finding.title}
                                          </h5>
                                        </div>
                                      </div>
                                      {finding.isDirectBlocker && (
                                        <span className="shrink-0 px-2 py-0.5 bg-rose-600 text-white text-[10px] font-bold uppercase tracking-wider rounded-xs">
                                          Bloquant réglementaire
                                        </span>
                                      )}
                                    </div>

                                    {/* Niveau A : Fait déclaré */}
                                    <div className="text-xs text-slate-700 space-y-0.5 pl-3 border-l-2 border-slate-300">
                                      <span className="font-semibold text-slate-900">Fait déclaré : </span>
                                      <span>{finding.declaredFact}</span>
                                    </div>

                                    {/* Niveau B : Base officielle */}
                                    {finding.officialBasis && (
                                      <div className="text-xs text-slate-700 space-y-0.5 pl-3 border-l-2 border-blue-400 bg-blue-50/40 p-2 rounded-xs">
                                        <span className="font-semibold text-blue-950">Base réglementaire vérifiée : </span>
                                        <span>{finding.officialBasis}</span>
                                        {finding.sourceRuleId && (
                                          <span className="block font-mono text-[10px] text-blue-700 mt-0.5">
                                            Réf. : {finding.sourceRuleId}
                                          </span>
                                        )}
                                      </div>
                                    )}

                                    {/* Niveau C : Rationale */}
                                    <div className="text-xs sm:text-sm text-slate-800 leading-relaxed pl-3 border-l-2 border-slate-400">
                                      <span className="font-semibold text-slate-950">Déduction motivée : </span>
                                      <span>{finding.findingRationale}</span>
                                    </div>

                                    {/* Action suggérée */}
                                    {finding.suggestedAction && (
                                      <div className="p-2.5 bg-white border border-slate-200 text-xs text-slate-900 flex items-start gap-2 rounded-xs">
                                        <ArrowRight className="w-3.5 h-3.5 text-slate-700 shrink-0 mt-0.5" />
                                        <div>
                                          <strong className="font-semibold">Démarche : </strong>
                                          {finding.suggestedAction}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ) : (
                          <div className="p-3 bg-emerald-50/50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
                            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>
                              Aucune anomalie objective n’a été identifiée sur cette dimension au regard des informations disponibles et des règles vérifiées.
                            </span>
                          </div>
                        )}

                        {/* Pièces Justificatives Associées au Pilier */}
                        {pillar.evidenceList.length > 0 && (
                          <div className="space-y-2 pt-2 border-t border-slate-100">
                            <div className="text-xs font-mono uppercase tracking-wider text-slate-500 font-bold">
                              Justificatifs à Produire pour ce Critère :
                            </div>
                            <div className="space-y-2">
                              {pillar.evidenceList.map((doc, idx) => {
                                const cat = CATEGORY_LABELS[doc.category];
                                return (
                                  <div
                                    key={idx}
                                    className="p-3 bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                                  >
                                    <div className="space-y-0.5">
                                      <div className="text-xs sm:text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                                        <FileText className="w-3.5 h-3.5 text-slate-500" />
                                        <span>{doc.documentName}</span>
                                      </div>
                                      <p className="text-[11px] text-slate-600">
                                        {doc.consularUtility}
                                      </p>
                                    </div>
                                    <span
                                      className={`inline-block px-2 py-0.5 border text-[10px] font-semibold whitespace-nowrap self-start sm:self-auto ${cat.badgeClass}`}
                                    >
                                      {cat.label}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 4. Traçabilité & Référentiel des Règles Officielles */}
      <div
        id="section-traceability-audit"
        className="bg-slate-50 border border-slate-200 p-4 sm:p-6 text-xs space-y-3 text-slate-600"
      >
        <div className="font-mono uppercase tracking-wider text-slate-700 font-bold flex items-center justify-between">
          <span>Traçabilité & Méthodologie d’Évaluation</span>
          <span>Dossier : {assessment.dossierId}</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
          <div className="space-y-1">
            <span className="font-semibold text-slate-900">Complétude contextuelle :</span>{' '}
            {assessment.meta.missingContextualInformation.length === 0 ? (
              <span className="text-emerald-700">Toutes les informations nécessaires ont été fournies.</span>
            ) : (
              <span className="text-amber-700">
                Informations complémentaires conseillées : {assessment.meta.missingContextualInformation.join(', ')}.
              </span>
            )}
          </div>

          <div className="space-y-1">
            <span className="font-semibold text-slate-900">Règles indicatives non vérifiées rencontrées :</span>{' '}
            {assessment.meta.unverifiedRulesEncountered.length === 0 ? (
              <span className="text-emerald-700">Aucune règle incertaine utilisée.</span>
            ) : (
              <span className="text-slate-700">
                {assessment.meta.unverifiedRulesEncountered.join(' ; ')} (écartées de l’évaluation mécanique).
              </span>
            )}
          </div>
        </div>

        {/* Mention Déontologique Obligatoire */}
        <div className="pt-3 border-t border-slate-200 text-[11px] text-slate-500 leading-relaxed">
          {assessment.disclaimer}
        </div>
      </div>
    </div>
  );
};
