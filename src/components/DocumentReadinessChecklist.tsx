import React, { useState, useMemo, useEffect } from 'react';
import {
  FileCheck2,
  AlertCircle,
  Clock,
  ShieldCheck,
  CheckCircle2,
  FolderOpen,
  HelpCircle,
  Sparkles,
  ChevronDown,
  ChevronUp,
  FileText,
  Filter,
  Scale,
  MinusCircle,
  ShieldAlert,
  Info,
} from 'lucide-react';
import {
  DocumentCategory,
  DocumentChecklistItem,
  DocumentReadinessStatus,
  DocumentReadinessSummary,
  ReadinessEvidenceSource,
  EvidenceComplianceStatus,
  EvidenceLifecycleStage,
} from '../types/documentReadiness';
import { sound } from '../utils/feedback';

export interface DocumentReadinessChecklistProps {
  summary: DocumentReadinessSummary;
  checkedOriginals?: Record<string, boolean>;
  checkedCopies?: Record<string, boolean>;
  onToggleOriginal?: (id: string) => void;
  onToggleCopy?: (id: string) => void;
  focusedDocId?: string | null;
}

const CATEGORY_LABELS: Record<DocumentCategory, { label: string; sub: string; icon: string }> = {
  identity_and_travel: {
    label: 'Identité & Voyage',
    sub: 'Passeport, photos et état civil',
    icon: '🛂',
  },
  financial_documents: {
    label: 'Finances & Ressources',
    sub: 'Relevés bancaires, attestations et garants',
    icon: '💰',
  },
  education_documents: {
    label: 'Scolarité & Académique',
    sub: 'Admissions, diplômes et attestations',
    icon: '🎓',
  },
  employment_and_business: {
    label: 'Situation Professionnelle',
    sub: 'Contrats, bulletins et autorisations',
    icon: '💼',
  },
  accommodation_and_logistics: {
    label: 'Hébergement & Logistique',
    sub: 'Réservations, attestations et billets',
    icon: '🏨',
  },
  supporting_evidence: {
    label: 'Attaches & Compléments',
    sub: 'Justificatifs d’ancrage et de retour',
    icon: '📁',
  },
};

// V2.4.1 — Applicant-First Dominant Status System
interface DominantStatusConfig {
  label: string;
  badgeClass: string;
  icon: React.ReactNode;
  bgClass: string;
}

const DOMINANT_STATUS_CONFIG: Record<
  DocumentReadinessStatus | 'not_applicable',
  DominantStatusConfig
> = {
  ready: {
    label: 'Prêt pour le dossier',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-300 font-bold',
    icon: <CheckCircle2 className="w-4 h-4 text-emerald-700" />,
    bgClass: 'border-l-4 border-l-emerald-600',
  },
  missing: {
    label: 'À traiter / fournir',
    badgeClass: 'bg-rose-50 text-rose-900 border-rose-300 font-bold',
    icon: <AlertCircle className="w-4 h-4 text-rose-600" />,
    bgClass: 'border-l-4 border-l-rose-600',
  },
  requires_clarification: {
    label: 'À clarifier / vérifier',
    badgeClass: 'bg-amber-50 text-amber-900 border-amber-300 font-bold',
    icon: <HelpCircle className="w-4 h-4 text-amber-600" />,
    bgClass: 'border-l-4 border-l-amber-500',
  },
  optional_reinforcement: {
    label: 'Renfort facultatif',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-300 font-medium',
    icon: <Sparkles className="w-4 h-4 text-slate-500" />,
    bgClass: 'border-l-4 border-l-slate-400',
  },
  not_applicable: {
    label: 'Non concerné',
    badgeClass: 'bg-slate-100 text-slate-500 border-slate-200 font-medium',
    icon: <MinusCircle className="w-4 h-4 text-slate-400" />,
    bgClass: 'border-l-4 border-l-slate-300 bg-slate-50/50',
  },
};

const PROVENANCE_LABELS: Record<ReadinessEvidenceSource, string> = {
  verified_document: 'Document vérifié directement',
  uploaded_document: 'Document téléversé (en attente de contrôle physique)',
  assessment_finding: 'Constat consulaire formel',
  applicant_fact: 'Déclaration du demandeur',
  action_completion: 'Action opérationnelle attestée',
  generated_artifact: 'Livrable préparé par la plateforme',
};

const LIFECYCLE_LABELS: Record<EvidenceLifecycleStage, string> = {
  not_provided: '1. Non fourni',
  declared: '2. Déclaré sur l’honneur',
  uploaded: '3. Téléversé',
  verified: '4. Vérifié matériellement',
  compliance_evaluated: '5. Conformité évaluée',
  ready: '6. Prêt & Conforme',
};

export const DocumentReadinessChecklist: React.FC<DocumentReadinessChecklistProps> = ({
  summary,
  checkedOriginals: propsCheckedOriginals,
  checkedCopies: propsCheckedCopies,
  onToggleOriginal,
  onToggleCopy,
  focusedDocId,
}) => {
  const [selectedStatus, setSelectedStatus] = useState<DocumentReadinessStatus | 'all' | 'not_applicable'>('all');
  const [selectedCategory, setSelectedCategory] = useState<DocumentCategory | 'all'>('all');
  const [expandedAuditIds, setExpandedAuditIds] = useState<Record<string, boolean>>({});
  const [showTechnicalMetrics, setShowTechnicalMetrics] = useState<boolean>(false);

  // User-managed physical preparation state: prefer lifted state from props, fallback to local
  const [localCheckedOriginals, setLocalCheckedOriginals] = useState<Record<string, boolean>>({});
  const [localCheckedCopies, setLocalCheckedCopies] = useState<Record<string, boolean>>({});

  const checkedOriginals = propsCheckedOriginals ?? localCheckedOriginals;
  const checkedCopies = propsCheckedCopies ?? localCheckedCopies;

  const toggleAudit = (id: string) => {
    sound.tap();
    setExpandedAuditIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleOriginal = (id: string) => {
    sound.tap();
    if (onToggleOriginal) {
      onToggleOriginal(id);
    } else {
      setLocalCheckedOriginals((prev) => ({ ...prev, [id]: !prev[id] }));
    }
  };

  const toggleCopy = (id: string) => {
    sound.tap();
    if (onToggleCopy) {
      onToggleCopy(id);
    } else {
      setLocalCheckedCopies((prev) => ({ ...prev, [id]: !prev[id] }));
    }
  };

  // Deep-link auto-scroll and highlight animation
  useEffect(() => {
    if (focusedDocId) {
      const timer = setTimeout(() => {
        const el = document.getElementById(`doc-item-${focusedDocId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.classList.add('ring-4', 'ring-indigo-500', 'ring-offset-2');
          el.setAttribute('tabindex', '-1');
          el.focus();
          const removeTimer = setTimeout(() => {
            el.classList.remove('ring-4', 'ring-indigo-500', 'ring-offset-2');
          }, 3000);
          return () => clearTimeout(removeTimer);
        }
      }, 80);
      return () => clearTimeout(timer);
    }
  }, [focusedDocId]);

  // Applicable items for physical counter tracking
  const applicableItems = useMemo(() => {
    return summary.items.filter((item) => item.applicability !== 'not_applicable');
  }, [summary.items]);

  const totalApplicable = applicableItems.length;
  const readyOriginalsCount = useMemo(() => {
    return applicableItems.filter((i) => checkedOriginals[i.id]).length;
  }, [applicableItems, checkedOriginals]);
  const readyCopiesCount = useMemo(() => {
    return applicableItems.filter((i) => checkedCopies[i.id]).length;
  }, [applicableItems, checkedCopies]);
  const fullyPreparedCount = useMemo(() => {
    return applicableItems.filter((i) => checkedOriginals[i.id] && checkedCopies[i.id]).length;
  }, [applicableItems, checkedOriginals, checkedCopies]);

  // Filtrage combiné par statut et catégorie
  const filteredItems = useMemo(() => {
    return summary.items.filter((item) => {
      // Filtre de statut
      if (selectedStatus === 'not_applicable') {
        if (item.applicability !== 'not_applicable') return false;
      } else if (selectedStatus !== 'all') {
        if (item.applicability === 'not_applicable' || item.status !== selectedStatus) return false;
      }

      // Filtre de catégorie
      if (selectedCategory !== 'all' && item.category !== selectedCategory) {
        return false;
      }

      return true;
    });
  }, [summary.items, selectedStatus, selectedCategory]);

  const categoriesPresent = useMemo(() => {
    const set = new Set<DocumentCategory>();
    summary.items.forEach((item) => set.add(item.category));
    return Array.from(set);
  }, [summary.items]);

  return (
    <div id="document-readiness-checklist" className="space-y-6">
      {/* 1. Header & Filtres par Statut Simplifiés */}
      <div className="bg-white border border-slate-200 p-5 sm:p-7 shadow-xs space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="space-y-1">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-500 font-bold flex items-center gap-1.5">
              <FolderOpen className="w-4 h-4 text-slate-700" />
              Check-list Déterministe 2026
            </span>
            <h2 className="text-lg sm:text-2xl font-bold text-slate-950 tracking-tight">
              Pièces Justificatives de Votre Dossier
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 max-w-2xl leading-relaxed">
              Consultez l'état de chaque pièce justificative requise. Chaque document doit être rassemblé en original et en photocopie conforme avant votre rendez-vous.
            </p>
          </div>

          <button
            onClick={() => setShowTechnicalMetrics(!showTechnicalMetrics)}
            className="text-xs text-slate-600 hover:text-slate-950 underline self-start md:self-auto cursor-pointer font-medium"
          >
            {showTechnicalMetrics ? 'Masquer la traçabilité technique' : 'Voir les métriques de vérification'}
          </button>
        </div>

        {/* Status Filter Cards (Applicant-First Vocabulary) */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          {/* Tous */}
          <button
            onClick={() => setSelectedStatus('all')}
            className={`p-3 border text-left cursor-pointer transition-all ${
              selectedStatus === 'all'
                ? 'border-slate-900 bg-slate-900 text-white shadow-xs'
                : 'border-slate-200 bg-slate-50/50 hover:bg-white text-slate-800'
            }`}
          >
            <div className="text-xs font-semibold">Toutes les pièces</div>
            <div className={`text-2xl font-black mt-1 font-mono ${selectedStatus === 'all' ? 'text-white' : 'text-slate-900'}`}>
              {summary.totalItems}
            </div>
            <span className={`text-[11px] block mt-0.5 ${selectedStatus === 'all' ? 'text-slate-300' : 'text-slate-500'}`}>
              Périmètre complet
            </span>
          </button>

          {/* 🔴 À Traiter */}
          <button
            onClick={() => setSelectedStatus(selectedStatus === 'missing' ? 'all' : 'missing')}
            className={`p-3 border text-left cursor-pointer transition-all ${
              selectedStatus === 'missing'
                ? 'border-rose-600 bg-rose-50 ring-1 ring-rose-600 shadow-xs'
                : 'border-slate-200 bg-slate-50/50 hover:bg-white'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-rose-900">🔴 À Traiter</span>
              <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
            </div>
            <div className="text-2xl font-black text-rose-700 mt-1 font-mono">{summary.missingCount}</div>
            <span className="text-[11px] text-slate-500 block mt-0.5">Pièces à fournir</span>
          </button>

          {/* 🟠 À Clarifier */}
          <button
            onClick={() => setSelectedStatus(selectedStatus === 'requires_clarification' ? 'all' : 'requires_clarification')}
            className={`p-3 border text-left cursor-pointer transition-all ${
              selectedStatus === 'requires_clarification'
                ? 'border-amber-600 bg-amber-50 ring-1 ring-amber-600 shadow-xs'
                : 'border-slate-200 bg-slate-50/50 hover:bg-white'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-900">🟠 À Clarifier</span>
              <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
            </div>
            <div className="text-2xl font-black text-amber-700 mt-1 font-mono">{summary.clarificationCount}</div>
            <span className="text-[11px] text-slate-500 block mt-0.5">Vérification requise</span>
          </button>

          {/* 🟢 Prêts */}
          <button
            onClick={() => setSelectedStatus(selectedStatus === 'ready' ? 'all' : 'ready')}
            className={`p-3 border text-left cursor-pointer transition-all ${
              selectedStatus === 'ready'
                ? 'border-emerald-600 bg-emerald-50 ring-1 ring-emerald-600 shadow-xs'
                : 'border-slate-200 bg-slate-50/50 hover:bg-white'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-900">🟢 Prêts</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-emerald-700 mt-1 font-mono">{summary.readyCount}</div>
            <span className="text-[11px] text-slate-500 block mt-0.5">Conformes & validés</span>
          </button>

          {/* ⚪ Non concernés */}
          <button
            onClick={() => setSelectedStatus(selectedStatus === 'not_applicable' ? 'all' : 'not_applicable')}
            className={`p-3 border text-left cursor-pointer transition-all ${
              selectedStatus === 'not_applicable'
                ? 'border-slate-600 bg-slate-200 ring-1 ring-slate-600 shadow-xs'
                : 'border-slate-200 bg-slate-50/50 hover:bg-white'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700">⚪ Non concerné</span>
              <MinusCircle className="w-3.5 h-3.5 text-slate-500" />
            </div>
            <div className="text-2xl font-black text-slate-700 mt-1 font-mono">{summary.notApplicableCount}</div>
            <span className="text-[11px] text-slate-500 block mt-0.5">Exemptés pour vous</span>
          </button>
        </div>

        {/* Secondary Technical Metrics (Toggled) */}
        {showTechnicalMetrics && (
          <div className="space-y-3 pt-3 border-t border-slate-100">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="p-2.5 bg-slate-50 border border-slate-200 text-xs flex items-center justify-between">
                <span className="text-slate-600">Vérification Matérielle Directe</span>
                <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 border border-slate-200">
                  {summary.verifiedCount || 0}
                </span>
              </div>
              <div className="p-2.5 bg-emerald-50/70 border border-emerald-200 text-xs flex items-center justify-between">
                <span className="text-emerald-800">Conformes Réglementaires</span>
                <span className="font-mono font-bold text-emerald-900 bg-white px-2 py-0.5 border border-emerald-300">
                  {summary.compliantCount || 0}
                </span>
              </div>
              <div className="p-2.5 bg-rose-50/70 border border-rose-200 text-xs flex items-center justify-between">
                <span className="text-rose-800">Non-Conformités</span>
                <span className="font-mono font-bold text-rose-900 bg-white px-2 py-0.5 border border-rose-300">
                  {summary.nonCompliantCount || 0}
                </span>
              </div>
              <div className="p-2.5 bg-slate-50 border border-slate-200 text-xs flex items-center justify-between">
                <span className="text-slate-600">Conformité en Attente</span>
                <span className="font-mono font-bold text-slate-700 bg-white px-2 py-0.5 border border-slate-200">
                  {summary.compliancePendingCount || 0}
                </span>
              </div>
            </div>

            {/* Cycle de Vie des Preuves */}
            {summary.stageCounts && (
              <div className="p-3 bg-slate-900 text-white rounded-xs space-y-2 border border-slate-800">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-mono uppercase tracking-wider text-slate-200 font-bold flex items-center gap-1.5">
                    <Scale className="w-3.5 h-3.5 text-amber-400" />
                    Cycle de Vie Déterministe des Preuves (V2.3.8)
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Progression stricte 1 à 6
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-center text-xs">
                  <div className="p-1.5 bg-slate-800 rounded-xs border border-slate-700">
                    <div className="text-[10px] text-slate-400">1. Non Fourni</div>
                    <div className="text-sm font-bold font-mono text-slate-200">{summary.stageCounts.not_provided}</div>
                  </div>
                  <div className="p-1.5 bg-slate-800 rounded-xs border border-slate-700">
                    <div className="text-[10px] text-amber-400">2. Déclaré</div>
                    <div className="text-sm font-bold font-mono text-amber-300">{summary.stageCounts.declared}</div>
                  </div>
                  <div className="p-1.5 bg-slate-800 rounded-xs border border-slate-700">
                    <div className="text-[10px] text-sky-400">3. Téléversé</div>
                    <div className="text-sm font-bold font-mono text-sky-300">{summary.stageCounts.uploaded}</div>
                  </div>
                  <div className="p-1.5 bg-slate-800 rounded-xs border border-slate-700">
                    <div className="text-[10px] text-indigo-400">4. Vérifié</div>
                    <div className="text-sm font-bold font-mono text-indigo-300">{summary.stageCounts.verified}</div>
                  </div>
                  <div className="p-1.5 bg-slate-800 rounded-xs border border-slate-700">
                    <div className="text-[10px] text-purple-400">5. Évalué</div>
                    <div className="text-sm font-bold font-mono text-purple-300">{summary.stageCounts.compliance_evaluated}</div>
                  </div>
                  <div className="p-1.5 bg-emerald-950 rounded-xs border border-emerald-600">
                    <div className="text-[10px] text-emerald-300">6. Prêt</div>
                    <div className="text-sm font-bold font-mono text-emerald-300">{summary.stageCounts.ready}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Alerte Pièces Obligatoires Manquantes */}
        {summary.hasMissingMandatory && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 flex items-start gap-3 text-xs text-rose-900">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold uppercase tracking-wider block">
                Pièces Obligatoires à Rassembler
              </span>
              <p className="leading-relaxed">
                Certains documents prescrits expressément par la réglementation (ex: passeport valide, justificatifs financiers ou attestation officielle)
                sont encore incomplets. Veillez à les obtenir avant votre dépôt pour éviter tout rejet de dossier.
              </p>
            </div>
          </div>
        )}

        {/* Contrôle Physique Consulaire (Synthèse des formats papier) */}
        <div className="bg-slate-50 border border-slate-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="space-y-0.5">
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-700 font-bold flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              Préparation Matérielle pour le Guichet
            </span>
            <p className="text-slate-600 font-medium">
              Chaque pièce requise doit comporter son original et sa photocopie A4 conforme. Cochez vos pièces physiques directement dans les fiches ci-dessous.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 font-mono text-xs text-slate-800 rounded-xs shadow-2xs">
              <span className="text-slate-500">Originaux :</span>
              <strong className={readyOriginalsCount === totalApplicable && totalApplicable > 0 ? 'text-emerald-700 font-bold' : 'text-slate-900'}>
                {readyOriginalsCount}/{totalApplicable}
              </strong>
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 font-mono text-xs text-slate-800 rounded-xs shadow-2xs">
              <span className="text-slate-500">Copies A4 :</span>
              <strong className={readyCopiesCount === totalApplicable && totalApplicable > 0 ? 'text-emerald-700 font-bold' : 'text-slate-900'}>
                {readyCopiesCount}/{totalApplicable}
              </strong>
            </span>
            {fullyPreparedCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-100 text-emerald-900 border border-emerald-300 font-mono text-xs font-semibold rounded-xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                {fullyPreparedCount} complet{fullyPreparedCount > 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>

        {/* 2. Filtres par Catégorie */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-semibold text-slate-500 flex items-center gap-1 mr-1">
              <Filter className="w-3.5 h-3.5" />
              Catégorie :
            </span>
            <button
              onClick={() => setSelectedCategory('all')}
              className={`min-h-[36px] px-3 py-1 text-xs font-semibold rounded-xs transition-colors cursor-pointer ${
                selectedCategory === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Toutes ({summary.items.length})
            </button>
            {categoriesPresent.map((cat) => {
              const count = summary.items.filter((i) => i.category === cat).length;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`min-h-[36px] px-3 py-1 text-xs font-semibold rounded-xs transition-colors cursor-pointer flex items-center gap-1.5 ${
                    selectedCategory === cat
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <span>{CATEGORY_LABELS[cat].icon}</span>
                  <span>{CATEGORY_LABELS[cat].label}</span>
                  <span className="opacity-70 font-mono text-[11px]">({count})</span>
                </button>
              );
            })}
          </div>

          {(selectedStatus !== 'all' || selectedCategory !== 'all') && (
            <button
              onClick={() => {
                setSelectedStatus('all');
                setSelectedCategory('all');
              }}
              className="text-xs font-medium text-slate-500 hover:text-slate-900 underline self-end md:self-auto cursor-pointer"
            >
              Réinitialiser les filtres
            </button>
          )}
        </div>
      </div>

      {/* 3. Document Cards by Category */}
      {categoriesPresent.map((category) => {
        const items = filteredItems.filter((i) => i.category === category);
        if (items.length === 0) return null;

        const catMeta = CATEGORY_LABELS[category];

        return (
          <div key={category} className="space-y-3">
            {/* Header de la Catégorie */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">{catMeta.icon}</span>
                <div>
                  <h3 className="text-sm font-bold text-slate-950 uppercase tracking-wider">
                    {catMeta.label}
                  </h3>
                  <span className="text-xs text-slate-500 block">{catMeta.sub}</span>
                </div>
              </div>
              <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 border border-slate-200">
                {items.length} {items.length > 1 ? 'PIÈCES' : 'PIÈCE'}
              </span>
            </div>

            {/* Cartes épurées pour le demandeur */}
            <div className="space-y-3">
              {items.map((item) => {
                const isNotApplicable = item.applicability === 'not_applicable';
                const dominantStatusKey = isNotApplicable ? 'not_applicable' : (item.status || 'missing');
                const statusMeta = DOMINANT_STATUS_CONFIG[dominantStatusKey];
                const isAuditOpen = !!expandedAuditIds[item.id];
                const isOriginalChecked = !!checkedOriginals[item.id];
                const isCopyChecked = !!checkedCopies[item.id];
                const isBothChecked = isOriginalChecked && isCopyChecked;

                return (
                  <div
                    key={item.id}
                    id={`doc-item-${item.id}`}
                    className={`bg-white border p-4 sm:p-5 transition-all shadow-2xs space-y-3.5 ${
                      statusMeta.bgClass
                    } ${isBothChecked ? 'ring-1 ring-emerald-500/30' : ''}`}
                  >
                    {/* Top Row: Title, Single Dominant Status Pill, and Physical Prep Summary Badge */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          {/* ONE DOMINANT STATUS PILL */}
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 border text-xs rounded-xs ${statusMeta.badgeClass}`}
                          >
                            {statusMeta.icon}
                            <span>{statusMeta.label}</span>
                          </span>

                          {/* At most ONE secondary label if strictly needed */}
                          {isNotApplicable ? (
                            <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 border border-slate-200">
                              Non exigé
                            </span>
                          ) : item.isMandatoryByRegulation ? (
                            <span className="text-[11px] font-semibold text-rose-800 bg-rose-50 border border-rose-200 px-2 py-0.5">
                              Obligation légale
                            </span>
                          ) : (
                            <span className="text-[11px] font-medium text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5">
                              Conseillé
                            </span>
                          )}
                        </div>

                        <h4
                          className={`text-base sm:text-lg font-bold leading-snug mt-1 ${
                            isNotApplicable
                              ? 'text-slate-600'
                              : isBothChecked
                              ? 'text-emerald-950 font-bold'
                              : 'text-slate-950'
                          }`}
                        >
                          {item.title}
                        </h4>
                      </div>

                      {/* Physical preparation indicator in top row */}
                      {!isNotApplicable && (
                        <div className="self-start sm:self-auto shrink-0">
                          {isBothChecked ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-300 text-xs font-semibold rounded-xs">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Prêt pour le guichet</span>
                            </span>
                          ) : isOriginalChecked || isCopyChecked ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-300 text-xs font-semibold rounded-xs">
                              <Clock className="w-3.5 h-3.5 text-amber-600" />
                              <span>Format partiel (1/2)</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-600 border border-slate-200 text-xs font-medium rounded-xs">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                              <span>À préparer (0/2)</span>
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Middle: Plain Language Explanation & Requirements */}
                    <div className="text-xs sm:text-sm text-slate-700 leading-relaxed space-y-2">
                      <p className="text-slate-600">{item.description}</p>

                      {/* Plain-Language Diagnosis */}
                      <div
                        className={`p-2.5 border text-xs flex items-start gap-2 ${
                          isNotApplicable
                            ? 'bg-slate-100/70 border-slate-300 text-slate-700'
                            : item.status === 'ready'
                            ? 'bg-emerald-50/50 border-emerald-200 text-emerald-950'
                            : item.status === 'missing'
                            ? 'bg-rose-50/50 border-rose-200 text-rose-950'
                            : 'bg-amber-50/50 border-amber-200 text-amber-950'
                        }`}
                      >
                        <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 opacity-70" />
                        <span className="leading-relaxed font-medium">
                          {item.statusReason}
                        </span>
                      </div>

                      {/* Concrete Step if applicable */}
                      {item.concreteStep && !isNotApplicable && item.status !== 'ready' && (
                        <div className="p-3 bg-slate-50 border border-slate-200 text-xs space-y-1">
                          <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500 font-bold block">
                            Action recommandée :
                          </span>
                          <span className="text-slate-900 font-semibold leading-relaxed block">
                            {item.concreteStep}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Contrôle de Préparation Matérielle (Guichet Consulaire) */}
                    {!isNotApplicable && (
                      <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xs space-y-2.5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                          <span className="text-[11px] font-mono uppercase tracking-wider text-slate-700 font-bold flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-slate-500" />
                            Contrôle physique pour le guichet :
                          </span>
                          <span className="text-[11px] text-slate-500">
                            Cochez chaque format matériel présent dans votre pochette
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {/* Contrôle 1 : Original présent */}
                          <button
                            id={`doc-orig-${item.id}`}
                            type="button"
                            onClick={() => toggleOriginal(item.id)}
                            className={`min-h-[44px] px-3.5 py-2 text-xs font-semibold border flex items-center justify-between transition-all cursor-pointer select-none rounded-xs ${
                              isOriginalChecked
                                ? 'bg-emerald-700 text-white border-emerald-700 shadow-2xs'
                                : 'bg-white text-slate-800 border-slate-300 hover:border-slate-800 hover:bg-slate-50'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <div
                                className={`w-4 h-4 border flex items-center justify-center rounded-2xs ${
                                  isOriginalChecked
                                    ? 'border-white bg-white/20'
                                    : 'border-slate-400 bg-white'
                                }`}
                              >
                                {isOriginalChecked && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                              </div>
                              <span>Original présent</span>
                            </div>
                            <span className={`text-[10px] font-mono ${isOriginalChecked ? 'text-emerald-100' : 'text-slate-500'}`}>
                              Document original
                            </span>
                          </button>

                          {/* Contrôle 2 : Copie A4 présente */}
                          <button
                            id={`doc-copy-${item.id}`}
                            type="button"
                            onClick={() => toggleCopy(item.id)}
                            className={`min-h-[44px] px-3.5 py-2 text-xs font-semibold border flex items-center justify-between transition-all cursor-pointer select-none rounded-xs ${
                              isCopyChecked
                                ? 'bg-emerald-700 text-white border-emerald-700 shadow-2xs'
                                : 'bg-white text-slate-800 border-slate-300 hover:border-slate-800 hover:bg-slate-50'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <div
                                className={`w-4 h-4 border flex items-center justify-center rounded-2xs ${
                                  isCopyChecked
                                    ? 'border-white bg-white/20'
                                    : 'border-slate-400 bg-white'
                                }`}
                              >
                                {isCopyChecked && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                              </div>
                              <span>Copie A4 présente</span>
                            </div>
                            <span className={`text-[10px] font-mono ${isCopyChecked ? 'text-emerald-100' : 'text-slate-500'}`}>
                              Format A4
                            </span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Bottom: Progressive Disclosure "Voir le détail de la vérification" */}
                    <div className="border-t border-slate-100 pt-2">
                      <button
                        id={`btn-audit-toggle-${item.id}`}
                        onClick={() => toggleAudit(item.id)}
                        aria-expanded={isAuditOpen}
                        aria-controls={`doc-audit-${item.id}`}
                        className="min-h-[36px] text-xs font-semibold text-slate-600 hover:text-slate-950 flex items-center gap-1.5 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 rounded-xs"
                      >
                        {isAuditOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        <span>Voir le détail de la vérification</span>
                      </button>

                      {/* Audit Drawer with Clean Separation */}
                      {isAuditOpen && (
                        <div
                          id={`doc-audit-${item.id}`}
                          className="mt-3 p-4 sm:p-5 bg-slate-900 text-slate-100 text-xs rounded-xs space-y-4 shadow-inner"
                        >
                          {/* Part 1: Informations pour votre dossier */}
                          <div className="space-y-2 pb-3 border-b border-slate-800">
                            <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-400 font-bold block">
                              1. Informations pour votre dossier
                            </span>
                            <div className="text-xs text-slate-300 space-y-1">
                              <p><strong className="text-white">Exigences matérielles :</strong> {item.description}</p>
                              {item.concreteStep && (
                                <p><strong className="text-white">Démarche conseillée :</strong> {item.concreteStep}</p>
                              )}
                              {item.officialBasis && (
                                <p><strong className="text-white">Base officielle :</strong> {item.officialBasis}</p>
                              )}
                            </div>
                          </div>

                          {/* Part 2: Traçabilité technique & conformité légale */}
                          <div className="space-y-2 text-[11px] font-mono">
                            <span className="uppercase tracking-wider text-amber-400 font-bold block">
                              2. Traçabilité technique & Réglementaire
                            </span>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-300 pt-1">
                              <div>
                                <span className="text-slate-500 block">Identifiant technique :</span>
                                <span className="font-bold text-white">{item.id}</span>
                              </div>
                              <div>
                                <span className="text-slate-500 block">Source de preuve :</span>
                                <span className="text-cyan-300">{item.readinessEvidenceSource ? PROVENANCE_LABELS[item.readinessEvidenceSource] : 'Déclaratif'}</span>
                              </div>
                              <div>
                                <span className="text-slate-500 block">Étape du cycle de vie :</span>
                                <span className="text-indigo-300">{item.lifecycleStage ? LIFECYCLE_LABELS[item.lifecycleStage] : 'Non défini'}</span>
                              </div>
                              <div>
                                <span className="text-slate-500 block">Vérification directe :</span>
                                <span className={item.isEvidenceDirectlyVerified ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
                                  {item.isEvidenceDirectlyVerified ? 'OUI (Attestée)' : 'NON (En attente)'}
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-500 block">Conformité réglementaire :</span>
                                <span className={item.evidenceComplianceStatus === 'compliant' ? 'text-emerald-400' : item.evidenceComplianceStatus === 'non_compliant' ? 'text-rose-400' : 'text-slate-400'}>
                                  {item.evidenceComplianceStatus?.toUpperCase() || 'EN ATTENTE'}
                                </span>
                              </div>
                              {item.complianceRuleIds && item.complianceRuleIds.length > 0 && (
                                <div>
                                  <span className="text-slate-500 block">Règles applicables :</span>
                                  <span className="text-emerald-300">{item.complianceRuleIds.join(', ')}</span>
                                </div>
                              )}
                            </div>

                            {item.complianceRationale && (
                              <div className="p-2 bg-slate-950/80 border border-slate-800 text-slate-300 mt-2">
                                <span className="text-slate-500 block uppercase text-[10px]">Rationale de conformité :</span>
                                {item.complianceRationale}
                              </div>
                            )}

                            {/* Causal Chain if READY */}
                            {item.verificationProvenanceChain && (
                              <div className="p-2.5 bg-emerald-950/60 border border-emerald-800 text-emerald-200 space-y-1 mt-2">
                                <span className="font-bold text-[10px] uppercase tracking-wider text-emerald-300 block">
                                  Chaîne causale de vérification (READY) :
                                </span>
                                <p className="text-[11px] leading-relaxed">
                                  Événement {item.verificationProvenanceChain.verificationEventId} vérifié par{' '}
                                  {item.verificationProvenanceChain.performedBy} ({item.verificationProvenanceChain.verificationMethod}) à l'appui de{' '}
                                  {item.verificationProvenanceChain.complianceRuleId}.
                                </p>
                              </div>
                            )}

                            <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-800 flex justify-between">
                              <span>Critères d'examen associés : {item.targetPillars.join(', ')}</span>
                              <span>Constats sources : {item.sourceFindingIds.join(', ') || 'Aucun'}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {filteredItems.length === 0 && (
        <div className="p-8 bg-white border border-slate-200 text-center space-y-2">
          <FolderOpen className="w-8 h-8 text-slate-400 mx-auto" />
          <h4 className="text-sm font-bold text-slate-900">Aucun document ne correspond à ce filtre</h4>
          <p className="text-xs text-slate-500">
            Modifiez la catégorie ou le filtre de statut pour réafficher les pièces.
          </p>
        </div>
      )}
    </div>
  );
};
