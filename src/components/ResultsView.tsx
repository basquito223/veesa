import React, { useState, useMemo, useRef } from 'react';
import {
  Printer,
  FileText,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  Scale,
  Clock,
  Compass,
  FolderOpen,
  MessageSquare,
  HelpCircle,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { GeneratedDeliverables } from '../utils/deliverableGenerator';
import { UserAnswers } from '../types';
import { getCountryProfile } from '../data/countriesData';
import { MOROCCO_BILATERAL_EXEMPT_COUNTRIES } from '../data/bilateralAgreements';
import { sound } from '../utils/feedback';
import { JourneyTracker } from './JourneyTracker';
import { evaluateConsularProfile } from '../utils/consularAssessmentEngine';
import { ConsularAssessmentPanel } from './ConsularAssessmentPanel';
import { DocumentReadinessChecklist } from './DocumentReadinessChecklist';
import { DeliverablesSection } from './DeliverablesSection';
import { InterviewPrepSection } from './InterviewPrepSection';
import { buildDocumentReadinessSummary } from '../utils/documentReadinessEngine';
import { buildActionPlanSummary } from '../utils/actionEngine';

interface ResultsViewProps {
  deliverables: GeneratedDeliverables;
  answers: UserAnswers;
  onModifyAnswers: () => void;
}

export type ResultsMainTab =
  | 'synthese'
  | 'documents'
  | 'evaluation'
  | 'livrables'
  | 'entretien';

export const ResultsView: React.FC<ResultsViewProps> = ({
  deliverables,
  answers,
  onModifyAnswers,
}) => {
  // V2.4.1 — 5 Non-redundant applicant-first tabs
  const [activeTab, setActiveTab] = useState<ResultsMainTab>('synthese');
  const [isExempt, setIsExempt] = useState<boolean>(false);
  const [expandedPriorityIndex, setExpandedPriorityIndex] = useState<number | null>(null);

  // Lifted physical preparation state (persists across tab switches)
  const [checkedOriginals, setCheckedOriginals] = useState<Record<string, boolean>>({});
  const [checkedCopies, setCheckedCopies] = useState<Record<string, boolean>>({});
  const [focusedDocId, setFocusedDocId] = useState<string | null>(null);

  const handleToggleOriginal = (id: string) => {
    setCheckedOriginals((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleToggleCopy = (id: string) => {
    setCheckedCopies((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleNavigateToDoc = (docId?: string) => {
    sound.tap();
    setActiveTab('documents');
    if (docId) {
      setFocusedDocId(docId);
    }
  };

  const tabList: ResultsMainTab[] = ['synthese', 'documents', 'evaluation', 'livrables', 'entretien'];
  const tabBtnIds: Record<ResultsMainTab, string> = {
    synthese: 'tab-btn-synthese',
    documents: 'tab-btn-checklist',
    evaluation: 'tab-btn-diagnostic',
    livrables: 'tab-btn-motivation',
    entretien: 'tab-btn-entretien',
  };

  const handleTabKeyDown = (e: React.KeyboardEvent, currentTab: ResultsMainTab) => {
    const currentIndex = tabList.indexOf(currentTab);
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      const nextTab = tabList[(currentIndex + 1) % tabList.length];
      setActiveTab(nextTab);
      document.getElementById(tabBtnIds[nextTab])?.focus();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const prevTab = tabList[(currentIndex - 1 + tabList.length) % tabList.length];
      setActiveTab(prevTab);
      document.getElementById(tabBtnIds[prevTab])?.focus();
    }
  };

  const tabScrollRef = useRef<HTMLDivElement>(null);
  const [showLeftTabFade, setShowLeftTabFade] = useState(false);
  const [showRightTabFade, setShowRightTabFade] = useState(false);

  const countryProfile = getCountryProfile(answers.countryOfOrigin);

  React.useEffect(() => {
    const originLower = (answers.countryOfOrigin || '').toLowerCase();
    setIsExempt(
      answers.destination === 'maroc' &&
        MOROCCO_BILATERAL_EXEMPT_COUNTRIES.some((c) => originLower.includes(c))
    );
  }, [answers.destination, answers.countryOfOrigin]);

  const checkTabScroll = () => {
    if (tabScrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = tabScrollRef.current;
      setShowLeftTabFade(scrollLeft > 8);
      setShowRightTabFade(scrollLeft < scrollWidth - clientWidth - 8);
    }
  };

  React.useEffect(() => {
    checkTabScroll();
    window.addEventListener('resize', checkTabScroll);
    return () => window.removeEventListener('resize', checkTabScroll);
  }, []);

  // Deterministic Engines computation
  const consularAssessment = useMemo(
    () => evaluateConsularProfile(answers, deliverables.dossierId),
    [answers, deliverables.dossierId]
  );

  const allFindings = useMemo(
    () => (Object.values(consularAssessment.pillars) as any[]).flatMap((p) => p.findings),
    [consularAssessment.pillars]
  );

  const actionPlan = useMemo(
    () => buildActionPlanSummary(allFindings),
    [allFindings]
  );

  const documentReadiness = useMemo(
    () =>
      buildDocumentReadinessSummary(allFindings, actionPlan, {
        destination: answers.destination,
        visaType: answers.visaReason,
        applicantFacts: answers as any,
        deliverables: [
          {
            id: 'DELIV-COVER-LETTER',
            title: 'Lettre de Motivation Consulaire & Note de Projet',
            type: 'motivation_letter',
          },
          ...(answers.visaReason === 'etudes'
            ? [
                {
                  id: 'DELIV-STUDY-PLAN',
                  title: 'Plan d’Études Détaillé & Projet Académique',
                  type: 'study_plan',
                },
              ]
            : []),
        ],
      }),
    [allFindings, actionPlan, answers]
  );

  const handlePrint = () => {
    sound.tap();
    window.print();
  };

  // Max 3 critical priority items for Section 1
  const priorityItems = useMemo(() => {
    if (actionPlan.criticalActions.length > 0) {
      return actionPlan.criticalActions.slice(0, 3).map((act, idx) => ({
        rank: idx + 1,
        title: act.title,
        whyItMatters: act.why || (act as any).rationale,
        whatToDo: act.concreteStep,
        legalBasis: act.officialBasis || (act as any).legalBasis,
        isBlocking: true,
        relatedDocumentKey: act.relatedDocumentKey,
      }));
    }
    if (consularAssessment.topPriorities.length > 0) {
      return consularAssessment.topPriorities.slice(0, 3).map((p) => ({
        rank: p.rank,
        title: p.title,
        whyItMatters: p.rationale,
        whatToDo: p.concreteStep,
        legalBasis: undefined,
        isBlocking: false,
        relatedDocumentKey: (p as any).relatedDocumentKey || (p as any).relatedFindingId,
      }));
    }
    return [];
  }, [actionPlan.criticalActions, consularAssessment.topPriorities]);

  // Points to clarify for Section 2
  const clarificationItems = useMemo(() => {
    if (actionPlan.importantActions.length > 0) {
      return actionPlan.importantActions.slice(0, 3);
    }
    return allFindings
      .filter((f) => f.presentationGroup === 'additional_info' || f.presentationGroup === 'missing_documents')
      .slice(0, 3);
  }, [actionPlan.importantActions, allFindings]);

  // Positive established facts for Section 3 (strictly using validated UserAnswers fields)
  const positiveFacts = useMemo(() => {
    const list: string[] = [];
    if (answers.hasPassport6MonthsValid) {
      list.push('Passeport physique en cours de validité (plus de 6 mois après la fin de séjour).');
    }
    if (answers.destination) {
      list.push(`Projet de séjour et motif déclarés de manière cohérente (${answers.destination.toUpperCase()}).`);
    }
    if (answers.availableBudgetFcfa > 0 || answers.fundingSource === 'bourse_officielle' || answers.fundingSource === 'garant_local' || answers.fundingSource === 'garant_etranger') {
      list.push('Schéma de subsistance et prise en charge financière clairement renseignés.');
    }
    if (answers.visaReason === 'etudes' || answers.hasProvincialAttestationLetter) {
      list.push('Inscription ou pré-admission dans un établissement d’enseignement attestée.');
    }
    if (answers.tiesType && answers.tiesType !== 'faibles_attaches') {
      list.push('Éléments d’attaches familiales et professionnelles au pays d’origine déclarés.');
    }
    return list.slice(0, 4);
  }, [answers]);

  return (
    <div id="results-view" className="w-full max-w-4xl xl:max-w-6xl 2xl:max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 lg:py-10 space-y-5 sm:space-y-8">
      {/* 1. Journey Anchor */}
      <div className="bg-white border border-slate-200 p-3.5 sm:p-5 shadow-xs overflow-hidden">
        <JourneyTracker
          originCountry={answers.countryOfOrigin}
          destination={answers.destination}
          visaReason={answers.visaReason}
          currentStage="documents"
          compact
        />
      </div>

      {/* 2. Applicant-First Header: Destination, Visa Type, Preparation Summary */}
      <div className="bg-white border border-slate-200 p-4 sm:p-8 space-y-5 sm:space-y-6 overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 sm:gap-6 border-b border-slate-200 pb-5 sm:pb-6">
          <div className="space-y-2 flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs font-mono text-slate-500 uppercase">
              <span>RÉFÉRENCE DOSSIER :</span>
              <span className="font-bold text-slate-900 break-all">{deliverables.dossierId}</span>
              <span className="text-slate-300">•</span>
              <span className="font-semibold text-slate-700">
                {answers.destination.toUpperCase()} — {answers.visaReason ? answers.visaReason.toUpperCase() : 'VISITE'}
              </span>
            </div>

            <h1 className="text-xl sm:text-3xl md:text-4xl font-bold tracking-tight text-slate-950 break-words [overflow-wrap:anywhere]">
              {isExempt ? "Fiche d'Entrée PAF & Séjour Régulier" : "Votre Préparation Visa Consulaire"}
            </h1>

            {/* Clear Preparation Summary (No percentages, no refusal score, no 'visa garanti') */}
            <p className="text-xs sm:text-sm text-slate-600 max-w-2xl leading-relaxed break-words [overflow-wrap:anywhere]">
              {isExempt
                ? "En vertu des accords bilatéraux en vigueur, aucun visa n'est exigé pour votre nationalité. Présentez cette fiche déclarative directement au contrôle frontalier de la Police de l'Air et des Frontières (PAF)."
                : consularAssessment.summaryAssessment.hasBlockingIssue
                ? "Votre dossier comporte un point d'attention réglementaire à régler avant de fixer votre rendez-vous consulaire."
                : priorityItems.length > 0
                ? "Votre préparation avance bien. Suivez les quelques démarches prioritaires ci-dessous pour sécuriser votre dépôt."
                : "Vos éléments déclarés répondent aux conditions des règles officielles 2026. Vous pouvez finaliser vos pièces justificatives."}
            </p>
          </div>

          {/* Dossier Badge & Official Costs */}
          <div className="w-full md:w-auto flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center p-3 sm:p-4 bg-slate-50 border border-slate-200 shrink-0 gap-1 md:min-w-[170px]">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
              Statut de préparation
            </span>
            <div className="text-base sm:text-xl md:text-2xl font-black text-slate-950 text-right md:mt-1">
              {deliverables.summaryHighlights.sanitaryVerdict}
            </div>
            <div className="text-[11px] sm:text-xs text-slate-500 font-medium md:mt-0.5">
              Frais légaux : <strong className="text-slate-900">{deliverables.summaryHighlights.officialCost}</strong>
            </div>
          </div>
        </div>

        {/* Global Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:space-x-2">
            <button
              id="btn-print-dossier"
              onClick={handlePrint}
              className="w-full sm:w-auto min-h-[44px] px-4 py-2.5 bg-slate-950 hover:bg-slate-800 text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center space-x-2 transition-colors cursor-pointer select-none shadow-2xs"
            >
              <Printer className="w-4 h-4 shrink-0" />
              <span>Imprimer (Format A4)</span>
            </button>

            <button
              id="btn-modify-flow"
              onClick={() => {
                sound.tap();
                onModifyAnswers();
              }}
              className="w-full sm:w-auto min-h-[44px] px-4 py-2.5 border border-slate-300 hover:border-slate-900 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-950 text-xs font-bold flex items-center justify-center transition-colors cursor-pointer select-none shadow-2xs"
            >
              Modifier mes réponses
            </button>
          </div>

          <span className="text-[11px] text-slate-500 font-mono text-center sm:text-right">
            Centre agréé : {countryProfile.biometricCenters.france[0] || 'VFS / TLS'}
          </span>
        </div>
      </div>

      {/* 3. Applicant-First 5-Tab Navigation Hierarchy */}
      <div className="relative w-full">
        <div
          ref={tabScrollRef}
          onScroll={checkTabScroll}
          role="tablist"
          aria-label="Navigation des résultats du dossier"
          className="flex items-center space-x-1 border-b border-slate-200 overflow-x-auto no-scrollbar scroll-smooth px-1"
        >
          {/* Tab 1: ACCUEIL / SYNTHÈSE */}
          <button
            id="tab-btn-synthese"
            role="tab"
            aria-selected={activeTab === 'synthese'}
            aria-controls="panel-synthese"
            tabIndex={activeTab === 'synthese' ? 0 : -1}
            onKeyDown={(e) => handleTabKeyDown(e, 'synthese')}
            onClick={() => {
              sound.tap();
              setActiveTab('synthese');
            }}
            className={`min-h-[44px] px-3.5 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold border-b-2 whitespace-nowrap transition-all shrink-0 flex items-center gap-1.5 cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 ${
              activeTab === 'synthese'
                ? 'border-slate-950 text-slate-950 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Compass className="w-4 h-4 shrink-0" />
            <span>Synthèse & Priorités</span>
            {consularAssessment.summaryAssessment.hasBlockingIssue ? (
              <span className="w-2 h-2 rounded-full bg-rose-600 shrink-0" />
            ) : priorityItems.length > 0 ? (
              <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
            ) : (
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
            )}
          </button>

          {/* Tab 2: DOCUMENTS */}
          <button
            id="tab-btn-checklist"
            role="tab"
            aria-selected={activeTab === 'documents'}
            aria-controls="panel-documents"
            tabIndex={activeTab === 'documents' ? 0 : -1}
            onKeyDown={(e) => handleTabKeyDown(e, 'documents')}
            onClick={() => {
              sound.tap();
              setActiveTab('documents');
            }}
            className={`min-h-[44px] px-3.5 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold border-b-2 whitespace-nowrap transition-all shrink-0 flex items-center gap-1.5 cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 ${
              activeTab === 'documents'
                ? 'border-slate-950 text-slate-950 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <FolderOpen className="w-4 h-4 shrink-0" />
            <span>Mes Documents ({documentReadiness.totalItems})</span>
            {documentReadiness.missingCount > 0 && (
              <span className="px-1.5 py-0.2 bg-rose-100 text-rose-800 text-[10px] font-mono font-bold rounded-xs">
                {documentReadiness.missingCount}
              </span>
            )}
          </button>

          {/* Tab 3: ÉVALUATION */}
          <button
            id="tab-btn-diagnostic"
            role="tab"
            aria-selected={activeTab === 'evaluation'}
            aria-controls="panel-evaluation"
            tabIndex={activeTab === 'evaluation' ? 0 : -1}
            onKeyDown={(e) => handleTabKeyDown(e, 'evaluation')}
            onClick={() => {
              sound.tap();
              setActiveTab('evaluation');
            }}
            className={`min-h-[44px] px-3.5 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold border-b-2 whitespace-nowrap transition-all shrink-0 flex items-center gap-1.5 cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 ${
              activeTab === 'evaluation'
                ? 'border-slate-950 text-slate-950 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Scale className="w-4 h-4 shrink-0" />
            <span>Évaluation Consulaire</span>
          </button>

          {/* Tab 4: LIVRABLES */}
          <button
            id="tab-btn-motivation"
            role="tab"
            aria-selected={activeTab === 'livrables'}
            aria-controls="panel-livrables"
            tabIndex={activeTab === 'livrables' ? 0 : -1}
            onKeyDown={(e) => handleTabKeyDown(e, 'livrables')}
            onClick={() => {
              sound.tap();
              setActiveTab('livrables');
            }}
            className={`min-h-[44px] px-3.5 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold border-b-2 whitespace-nowrap transition-all shrink-0 flex items-center gap-1.5 cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 ${
              activeTab === 'livrables'
                ? 'border-slate-950 text-slate-950 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <FileText className="w-4 h-4 shrink-0" />
            <span>Livrables Préparés</span>
          </button>

          {/* Tab 5: ENTRETIEN */}
          <button
            id="tab-btn-entretien"
            role="tab"
            aria-selected={activeTab === 'entretien'}
            aria-controls="panel-entretien"
            tabIndex={activeTab === 'entretien' ? 0 : -1}
            onKeyDown={(e) => handleTabKeyDown(e, 'entretien')}
            onClick={() => {
              sound.tap();
              setActiveTab('entretien');
            }}
            className={`min-h-[44px] px-3.5 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold border-b-2 whitespace-nowrap transition-all shrink-0 flex items-center gap-1.5 cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 ${
              activeTab === 'entretien'
                ? 'border-slate-950 text-slate-950 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <MessageSquare className="w-4 h-4 shrink-0" />
            <span>Préparation Entretien</span>
          </button>
        </div>

        {/* Visible Scroll Hints for Mobile */}
        {showLeftTabFade && (
          <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white to-transparent flex items-center justify-start pl-1 sm:hidden">
            <span className="text-slate-500 text-xs font-bold leading-none">‹</span>
          </div>
        )}
        {showRightTabFade && (
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent flex items-center justify-end pr-1 sm:hidden">
            <span className="text-slate-500 text-xs font-bold leading-none">›</span>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: ACCUEIL / SYNTHÈSE (Answers: "Qu'est-ce que je dois faire maintenant ?") */}
      {/* ========================================================================= */}
      <div
        id="panel-synthese"
        role="tabpanel"
        aria-labelledby="tab-btn-synthese"
        className={activeTab === 'synthese' ? 'space-y-6 sm:space-y-8 block' : 'hidden'}
      >
        {/* SECTION 1: À TRAITER EN PRIORITÉ (Max 3 items, Plain French) */}
          <div id="section-top-priorities" className="bg-white border border-slate-200 p-5 sm:p-7 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div className="space-y-0.5">
                <span className="text-xs font-mono uppercase tracking-wider text-rose-700 font-bold flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4" />
                  Section 1 • Démarches Essentielles
                </span>
                <h2 className="text-base sm:text-xl font-bold text-slate-950">
                  À Traiter en Priorité Avant Votre Rendez-Vous
                </h2>
              </div>
              <span className="text-xs font-mono px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-700 font-semibold self-start sm:self-auto">
                {priorityItems.length} {priorityItems.length > 1 ? 'ACTIONS PRIORITAIRES' : 'ACTION PRIORITAIRE'}
              </span>
            </div>

            {priorityItems.length > 0 ? (
              <div className="space-y-3">
                {priorityItems.map((item, idx) => {
                  const isExpanded = expandedPriorityIndex === idx;
                  return (
                    <div
                      key={idx}
                      id={`priority-item-${item.rank}`}
                      className="p-4 sm:p-5 border border-slate-200 bg-slate-50/50 hover:bg-white transition-all space-y-3 rounded-xs shadow-2xs"
                    >
                      <div className="flex items-start gap-3">
                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-bold shrink-0 mt-0.5">
                          {item.rank}
                        </span>
                        <div className="space-y-1 flex-1">
                          <h3 className="text-sm sm:text-base font-bold text-slate-950 leading-snug">
                            {item.title}
                          </h3>
                          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                            {item.whyItMatters}
                          </p>
                        </div>
                      </div>

                      <div className="ml-9 p-3 bg-white border border-slate-200 space-y-1">
                        <div className="text-[11px] font-mono uppercase tracking-wider text-slate-500 font-bold">
                          Ce qu'il faut faire concrètement :
                        </div>
                        <div className="text-xs sm:text-sm text-slate-900 font-semibold leading-relaxed">
                          {item.whatToDo}
                        </div>
                      </div>

                      {/* Progressive Disclosure "Pourquoi cette priorité ?" */}
                      <div className="ml-9 flex items-center justify-between pt-1">
                        <button
                          onClick={() => setExpandedPriorityIndex(isExpanded ? null : idx)}
                          className="text-xs font-medium text-slate-600 hover:text-slate-950 flex items-center gap-1 cursor-pointer"
                        >
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          <span>{isExpanded ? 'Masquer l’explication' : 'Pourquoi est-ce important ?'}</span>
                        </button>

                        <button
                          onClick={() => {
                            let docId = (item as any).relatedDocumentKey;
                            if (!docId) {
                              const t = item.title.toLowerCase();
                              if (t.includes('passeport')) docId = 'DOC-PASSPORT';
                              else if (t.includes('assurance')) docId = 'DOC-TRAVEL-INSURANCE';
                              else if (t.includes('hébergement') || t.includes('hebergement') || t.includes('accueil')) docId = 'DOC-ACCOMMODATION';
                              else if (t.includes('attestation') || t.includes('pal') || t.includes('caq')) docId = 'DOC-PAL-CAQ';
                              else if (t.includes('subsistance') || t.includes('financ') || t.includes('banque')) docId = 'DOC-BANK-STATEMENTS';
                              else docId = 'DOC-PASSPORT';
                            }
                            handleNavigateToDoc(docId);
                          }}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-800 hover:text-slate-950 hover:underline cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 rounded-xs"
                        >
                          <span>Voir les pièces justificatives</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {isExpanded && (
                        <div className="ml-9 p-3 bg-slate-100 border border-slate-200 text-xs text-slate-700 space-y-1 rounded-xs">
                          <span className="font-bold text-slate-900 block">Explication consulaire :</span>
                          <p className="leading-relaxed">
                            Les instructeurs consulaires appliquent un examen strict de conformité.
                            {item.legalBasis ? ` Fondement officiel : ${item.legalBasis}.` : ''}
                            Régler cette démarche en amont garantit que votre dossier ne sera pas ajourné.
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 sm:p-6 bg-emerald-50/50 border border-emerald-200 text-center space-y-2">
                <CheckCircle2 className="w-7 h-7 text-emerald-600 mx-auto" />
                <div className="text-sm sm:text-base font-bold text-emerald-950">
                  Aucun point bloquant préalable
                </div>
                <p className="text-xs sm:text-sm text-slate-600 max-w-xl mx-auto leading-relaxed">
                  Votre dossier ne présente aucune anomalie majeure. Vous pouvez procéder à l’impression de vos livrables et au classement de vos pièces.
                </p>
              </div>
            )}
          </div>

          {/* SECTION 2: POINTS À CLARIFIER (Unresolved non-blocking issues) */}
          {clarificationItems.length > 0 && (
            <div className="bg-white border border-slate-200 p-5 sm:p-6 shadow-xs space-y-3">
              <div className="border-b border-slate-100 pb-2">
                <span className="text-xs font-mono uppercase tracking-wider text-amber-700 font-bold flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4" />
                  Section 2 • Points à Clarifier
                </span>
                <h3 className="text-sm sm:text-base font-bold text-slate-950 mt-1">
                  Éléments à Expliciter ou Justifier dans Votre Dossier
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                {clarificationItems.map((item: any, idx: number) => (
                  <div key={idx} className="p-3 bg-amber-50/40 border border-amber-200 space-y-1">
                    <span className="font-bold text-amber-950 block">{item.title}</span>
                    <p className="text-slate-700 leading-relaxed">
                      {item.concreteStep || item.rationale || item.findingRationale || 'Vérifiez la concordance de ce document.'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SECTION 3: VOTRE DOSSIER AVANCE (Points positifs validés) */}
          <div className="bg-white border border-slate-200 p-5 sm:p-6 shadow-xs space-y-3">
            <div className="border-b border-slate-100 pb-2">
              <span className="text-xs font-mono uppercase tracking-wider text-emerald-800 font-bold flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                Section 3 • Points Positifs Établis
              </span>
              <h3 className="text-sm sm:text-base font-bold text-slate-950 mt-1">
                Ce Qui Est Déjà Conforme et Solide
              </h3>
            </div>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-700">
              {positiveFacts.map((fact, idx) => (
                <li key={idx} className="p-2.5 bg-emerald-50/50 border border-emerald-200/80 flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{fact}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* SECTION 4: VOS PROCHAINES ÉTAPES (1, 2, 3 Sequence) */}
          <div className="bg-white border border-slate-200 p-5 sm:p-6 shadow-xs space-y-3">
            <div className="border-b border-slate-100 pb-2">
              <span className="text-xs font-mono uppercase tracking-wider text-slate-500 font-bold flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                Section 4 • Feuille de Route
              </span>
              <h3 className="text-sm sm:text-base font-bold text-slate-950 mt-1">
                Vos Prochaines Étapes Logiques
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200 space-y-1">
                <span className="font-bold text-slate-900 block">1. Réunir les originaux</span>
                <p className="text-slate-600">Obtenez les attestations bancaires avec cachet et les originaux de vos diplômes.</p>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 space-y-1">
                <span className="font-bold text-slate-900 block">2. Signer vos livrables</span>
                <p className="text-slate-600">Relisez la lettre de motivation et l’attestation de garant, puis signez-les manuellement.</p>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 space-y-1">
                <span className="font-bold text-slate-900 block">3. Préparer votre entretien</span>
                <p className="text-slate-600">Révisez les questions types avec notre module de simulation avant votre dépôt.</p>
              </div>
            </div>
          </div>

          {/* SECTION 5: APERÇU DE VOS DOCUMENTS & ACCÈS DIRECTS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => {
                sound.tap();
                setActiveTab('documents');
              }}
              className="p-4 bg-white hover:bg-slate-50 border border-slate-200 text-left space-y-2 transition-all cursor-pointer shadow-2xs group"
            >
              <div className="flex items-center justify-between">
                <FolderOpen className="w-5 h-5 text-slate-700 group-hover:text-slate-950" />
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
              </div>
              <h4 className="text-sm font-bold text-slate-950">Mes Documents ({documentReadiness.totalItems})</h4>
              <p className="text-xs text-slate-600">
                Consulter la check-list complète des originaux et photocopies requises.
              </p>
            </button>

            <button
              onClick={() => {
                sound.tap();
                setActiveTab('livrables');
              }}
              className="p-4 bg-white hover:bg-slate-50 border border-slate-200 text-left space-y-2 transition-all cursor-pointer shadow-2xs group"
            >
              <div className="flex items-center justify-between">
                <FileText className="w-5 h-5 text-slate-700 group-hover:text-slate-950" />
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
              </div>
              <h4 className="text-sm font-bold text-slate-950">Livrables Préparés</h4>
              <p className="text-xs text-slate-600">
                Accéder aux lettres de motivation, attestations et feuilles de route.
              </p>
            </button>

            <button
              onClick={() => {
                sound.tap();
                setActiveTab('entretien');
              }}
              className="p-4 bg-white hover:bg-slate-50 border border-slate-200 text-left space-y-2 transition-all cursor-pointer shadow-2xs group"
            >
              <div className="flex items-center justify-between">
                <MessageSquare className="w-5 h-5 text-slate-700 group-hover:text-slate-950" />
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
              </div>
              <h4 className="text-sm font-bold text-slate-950">Préparation Entretien</h4>
              <p className="text-xs text-slate-600">
                Simuler l'entretien consulaire et réviser les arguments clés.
              </p>
            </button>
          </div>
        </div>

      {/* ========================================================================= */}
      {/* TAB 2: DOCUMENTS (Check-list pièces avec conformité & préparation physique) */}
      {/* ========================================================================= */}
      <div
        id="panel-documents"
        role="tabpanel"
        aria-labelledby="tab-btn-checklist"
        className={activeTab === 'documents' ? 'block' : 'hidden'}
      >
        <DocumentReadinessChecklist
          summary={documentReadiness}
          checkedOriginals={checkedOriginals}
          checkedCopies={checkedCopies}
          onToggleOriginal={handleToggleOriginal}
          onToggleCopy={handleToggleCopy}
          focusedDocId={focusedDocId}
        />
      </div>

      {/* ========================================================================= */}
      {/* TAB 3: ÉVALUATION (Grille des 5 dimensions consulaires) */}
      {/* ========================================================================= */}
      <div
        id="panel-evaluation"
        role="tabpanel"
        aria-labelledby="tab-btn-diagnostic"
        className={activeTab === 'evaluation' ? 'block' : 'hidden'}
      >
        <ConsularAssessmentPanel
          assessment={consularAssessment}
          onNavigateToChecklist={() => handleNavigateToDoc()}
        />
      </div>

      {/* ========================================================================= */}
      {/* TAB 4: LIVRABLES (Lettres, attestations, WhatsApp avec disclaimer clair) */}
      {/* ========================================================================= */}
      <div
        id="panel-livrables"
        role="tabpanel"
        aria-labelledby="tab-btn-motivation"
        className={activeTab === 'livrables' ? 'block' : 'hidden'}
      >
        <DeliverablesSection
          deliverables={deliverables}
          answers={answers}
          isExempt={isExempt}
        />
      </div>

      {/* ========================================================================= */}
      {/* TAB 5: ENTRETIEN (Questions types et simulation présentielle) */}
      {/* ========================================================================= */}
      <div
        id="panel-entretien"
        role="tabpanel"
        aria-labelledby="tab-btn-entretien"
        className={activeTab === 'entretien' ? 'block' : 'hidden'}
      >
        <InterviewPrepSection
          answers={answers}
          assessment={consularAssessment}
        />
      </div>
    </div>
  );
};
