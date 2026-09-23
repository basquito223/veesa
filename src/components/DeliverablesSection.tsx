import React, { useState } from 'react';
import {
  Copy,
  Check,
  Printer,
  Sparkles,
  RefreshCw,
  FileText,
  Share2,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';
import { GeneratedDeliverables, generateAiConsularLetter } from '../utils/deliverableGenerator';
import { UserAnswers } from '../types';
import { getCountryProfile } from '../data/countriesData';
import { OfficialSourceBadge } from './OfficialSourceBadge';
import { sound } from '../utils/feedback';

interface DeliverablesSectionProps {
  deliverables: GeneratedDeliverables;
  answers: UserAnswers;
  isExempt?: boolean;
}

export type DeliverableSubTab = 'lettre_motivation' | 'lettre_garant' | 'note_attaches' | 'whatsapp';

export const DeliverablesSection: React.FC<DeliverablesSectionProps> = ({
  deliverables,
  answers,
  isExempt = false,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<DeliverableSubTab>('lettre_motivation');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // AI letter customization state
  const [letterTexts, setLetterTexts] = useState<Record<string, string>>({
    lettre_motivation: deliverables.lettreMotivation,
    lettre_garant: deliverables.lettreGarant,
    note_attaches: deliverables.noteAttaches,
    whatsapp: deliverables.whatsappRoadmap,
  });

  const [aiGeneratedStatus, setAiGeneratedStatus] = useState<Record<string, boolean>>({
    lettre_motivation: false,
    lettre_garant: false,
    note_attaches: false,
    whatsapp: false,
  });

  // Keep letter texts synced when deliverables update unless user generated custom AI version
  React.useEffect(() => {
    setLetterTexts((prev) => ({
      lettre_motivation: aiGeneratedStatus.lettre_motivation ? prev.lettre_motivation : deliverables.lettreMotivation,
      lettre_garant: aiGeneratedStatus.lettre_garant ? prev.lettre_garant : deliverables.lettreGarant,
      note_attaches: aiGeneratedStatus.note_attaches ? prev.note_attaches : deliverables.noteAttaches,
      whatsapp: deliverables.whatsappRoadmap,
    }));
  }, [
    deliverables.lettreMotivation,
    deliverables.lettreGarant,
    deliverables.noteAttaches,
    deliverables.whatsappRoadmap,
    aiGeneratedStatus.lettre_motivation,
    aiGeneratedStatus.lettre_garant,
    aiGeneratedStatus.note_attaches,
  ]);

  const [isGeneratingAi, setIsGeneratingAi] = useState<boolean>(false);

  const [selectedTone, setSelectedTone] = useState<'diplomatique' | 'academique' | 'professionnel'>(
    answers.visaReason === 'etudes'
      ? 'academique'
      : answers.visaReason === 'travail_stage' || answers.visaReason === 'affaires_mission'
      ? 'professionnel'
      : 'diplomatique'
  );
  const [customAiPrompt, setCustomAiPrompt] = useState<string>(answers.customAiNotes || '');

  const countryProfile = getCountryProfile(answers.countryOfOrigin);

  const handleCopy = (text: string, key: string) => {
    sound.tap();
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    sound.success();
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handlePrint = () => {
    sound.tap();
    window.print();
  };

  const handleAiGeneration = async () => {
    if (activeSubTab !== 'lettre_motivation' && activeSubTab !== 'lettre_garant' && activeSubTab !== 'note_attaches') {
      return;
    }
    sound.tap();
    setIsGeneratingAi(true);

    const letterType =
      activeSubTab === 'lettre_motivation'
        ? 'motivation'
        : activeSubTab === 'lettre_garant'
        ? 'garant'
        : 'attaches';

    try {
      const result = await generateAiConsularLetter(answers, letterType, selectedTone, customAiPrompt);
      if (result.success && result.content) {
        sound.success();
        setLetterTexts((prev) => ({ ...prev, [activeSubTab]: result.content }));
        setAiGeneratedStatus((prev) => ({ ...prev, [activeSubTab]: result.generatedWithAI }));
      }
    } catch (e) {
      console.error('Erreur lors de la génération IA:', e);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const activeLetterText = letterTexts[activeSubTab] || '';

  return (
    <div id="deliverables-section" className="space-y-6">
      {/* 1. Clear Isolation Disclaimer Banner */}
      <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-sm text-amber-900 text-xs sm:text-sm flex items-start gap-3 shadow-2xs">
        <ShieldAlert className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-bold uppercase tracking-wider block text-[11px] text-amber-800">
            Documents de travail générés par VISAflow
          </span>
          <p className="leading-relaxed text-slate-700 text-xs sm:text-sm">
            Ces projets de lettres sont fournis pour structurer vos arguments selon les standards consulaires.
            <strong className="text-slate-900 font-semibold"> Ils ne constituent pas des documents délivrés par une autorité publique </strong>
            et ne remplacent aucun justificatif officiel (actes d’état civil, attestations bancaires originales).
            Veillez à les relire attentivement, les personnaliser et y apposer votre signature manuscrite.
          </p>
        </div>
      </div>

      {/* 2. Sub-Tabs Selector */}
      <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 border border-slate-200 rounded-sm">
        <button
          id="deliverable-tab-motivation"
          onClick={() => {
            sound.tap();
            setActiveSubTab('lettre_motivation');
          }}
          className={`min-h-[44px] px-4 py-2 text-xs sm:text-sm font-semibold rounded-xs transition-all cursor-pointer flex items-center gap-2 ${
            activeSubTab === 'lettre_motivation'
              ? 'bg-slate-950 text-white shadow-xs'
              : 'text-slate-700 hover:text-slate-950 hover:bg-white/70'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>{isExempt ? "Fiche d'Entrée PAF" : "Lettre de Motivation"}</span>
        </button>

        <button
          id="deliverable-tab-garant"
          onClick={() => {
            sound.tap();
            setActiveSubTab('lettre_garant');
          }}
          className={`min-h-[44px] px-4 py-2 text-xs sm:text-sm font-semibold rounded-xs transition-all cursor-pointer flex items-center gap-2 ${
            activeSubTab === 'lettre_garant'
              ? 'bg-slate-950 text-white shadow-xs'
              : 'text-slate-700 hover:text-slate-950 hover:bg-white/70'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Attestation du Garant</span>
        </button>

        <button
          id="deliverable-tab-attaches"
          onClick={() => {
            sound.tap();
            setActiveSubTab('note_attaches');
          }}
          className={`min-h-[44px] px-4 py-2 text-xs sm:text-sm font-semibold rounded-xs transition-all cursor-pointer flex items-center gap-2 ${
            activeSubTab === 'note_attaches'
              ? 'bg-slate-950 text-white shadow-xs'
              : 'text-slate-700 hover:text-slate-950 hover:bg-white/70'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Attaches au Pays</span>
        </button>

        <button
          id="deliverable-tab-whatsapp"
          onClick={() => {
            sound.tap();
            setActiveSubTab('whatsapp');
          }}
          className={`min-h-[44px] px-4 py-2 text-xs sm:text-sm font-semibold rounded-xs transition-all cursor-pointer flex items-center gap-2 ${
            activeSubTab === 'whatsapp'
              ? 'bg-emerald-800 text-white shadow-xs'
              : 'text-emerald-900 bg-emerald-50/70 hover:bg-emerald-100/80 border border-emerald-200/60'
          }`}
        >
          <Share2 className="w-4 h-4 text-emerald-600" />
          <span>Feuille de Route WhatsApp</span>
        </button>
      </div>

      {/* 3. Deliverable Content */}
      {activeSubTab === 'whatsapp' ? (
        <div className="bg-white border border-slate-200 p-5 sm:p-7 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="space-y-1">
              <span className="text-xs font-mono uppercase tracking-wider text-emerald-800 font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Format Mobile Condensé
              </span>
              <h3 className="text-base sm:text-lg font-bold text-slate-950">
                Feuille de Route Démarches pour Smartphone
              </h3>
              <p className="text-xs text-slate-600">
                Envoyez-vous ce mémo par WhatsApp ou par message pour garder sous la main les contacts de votre centre et les règles clés.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleCopy(letterTexts.whatsapp, 'whatsapp')}
                className="min-h-[44px] px-4 py-2 border border-slate-300 hover:border-slate-900 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
              >
                {copiedKey === 'whatsapp' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-500" />}
                <span>{copiedKey === 'whatsapp' ? 'Copié !' : 'Copier le texte'}</span>
              </button>

              <a
                href={`https://api.whatsapp.com/send?text=${encodeURIComponent(letterTexts.whatsapp)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[44px] px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer shadow-2xs"
              >
                <Share2 className="w-4 h-4" />
                <span>Ouvrir WhatsApp</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-80" />
              </a>
            </div>
          </div>

          <div className="p-4 sm:p-6 bg-slate-50 border border-slate-200 font-mono text-xs sm:text-sm text-slate-800 whitespace-pre-line leading-relaxed overflow-x-auto">
            {letterTexts.whatsapp}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          <div className="xl:col-span-8 space-y-5">
            {/* AI Customizer Box */}
            <div className="p-4 sm:p-5 bg-white border border-slate-200 space-y-3 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-700" />
                  <span className="text-xs font-bold text-slate-900">
                    Ajuster le ton consulaire avec l’IA
                  </span>
                </div>
                {aiGeneratedStatus[activeSubTab] && (
                  <span className="text-[11px] font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 border border-emerald-200 font-semibold">
                    Personnalisé avec Gemini 3.6
                  </span>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-slate-500 font-medium">Tonalité :</span>
                  {(['diplomatique', 'academique', 'professionnel'] as const).map((tone) => (
                    <button
                      key={tone}
                      onClick={() => {
                        sound.tap();
                        setSelectedTone(tone);
                      }}
                      className={`min-h-[38px] px-3 py-1.5 border text-xs font-medium cursor-pointer transition-colors ${
                        selectedTone === tone
                          ? 'bg-slate-950 text-white border-slate-950'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {tone.charAt(0).toUpperCase() + tone.slice(1)}
                    </button>
                  ))}
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={customAiPrompt}
                    onChange={(e) => setCustomAiPrompt(e.target.value)}
                    placeholder="Préciser une consigne particulière (ex: mentionner ma bourse d'excellence, mon parrain)..."
                    className="flex-1 min-h-[44px] px-3.5 py-2 border border-slate-300 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 bg-slate-50/50"
                  />
                  <button
                    onClick={handleAiGeneration}
                    disabled={isGeneratingAi}
                    className="min-h-[44px] px-4 py-2 bg-slate-950 hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50 shrink-0 shadow-2xs"
                  >
                    {isGeneratingAi ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
                        <span>Rédaction...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>Régénérer</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* A4 Paper Preview */}
            <div className="bg-white border border-slate-300 p-5 sm:p-8 md:p-10 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
                <div className="space-y-1 min-w-0">
                  <span className="text-[11px] font-mono font-bold text-slate-500 uppercase tracking-widest block">
                    DOCUMENT DE TRAVAIL PRÊT POUR RÉVISION ET SIGNATURE
                  </span>
                  <p className="text-xs sm:text-sm text-slate-800 font-semibold">
                    Demandeur : {answers.fullName || 'Amadou Seydou DIALLO'} — Passeport : {answers.passportNumber || '23AO98124'}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    id="btn-copy-active-letter"
                    onClick={() => handleCopy(activeLetterText, activeSubTab)}
                    className="min-h-[44px] px-3.5 py-2 border border-slate-300 hover:border-slate-900 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer shrink-0"
                  >
                    {copiedKey === activeSubTab ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-500" />}
                    <span>{copiedKey === activeSubTab ? 'Copié !' : 'Copier'}</span>
                  </button>

                  <button
                    onClick={handlePrint}
                    className="min-h-[44px] px-3.5 py-2 bg-slate-950 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer shrink-0"
                  >
                    <Printer className="w-4 h-4" />
                    <span className="hidden sm:inline">Imprimer A4</span>
                  </button>
                </div>
              </div>

              {/* Letter Body */}
              <div className="font-serif text-sm sm:text-base text-slate-900 whitespace-pre-line leading-relaxed break-words max-w-full">
                {activeLetterText}
              </div>

              {/* Source note */}
              <div className="pt-5 border-t border-slate-200">
                <OfficialSourceBadge
                  sourceName="Texte de Conformité Consulaire VisaFlow 2026"
                  ruleCitation={isExempt ? "Accords bilatéraux et convention de libre circulation" : "Article 32 du Code Communautaire des Visas"}
                />
              </div>
            </div>
          </div>

          {/* Desktop Companion Console */}
          <div className="hidden xl:block xl:col-span-4 space-y-4">
            <div className="bg-white border border-slate-200 p-4 space-y-3 shadow-2xs">
              <span className="text-xs font-mono uppercase tracking-wider text-slate-500 font-bold block border-b border-slate-100 pb-2">
                Conseils de Dépôt Physique
              </span>
              <ul className="space-y-2 text-xs text-slate-700 leading-relaxed">
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0 mt-1.5" />
                  <span>Imprimez chaque lettre sur une feuille blanche neuve de format standard A4 (recto seul).</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0 mt-1.5" />
                  <span>Signez chaque pièce à l’encre noire ou bleue foncée avant de la déposer au guichet.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0 mt-1.5" />
                  <span>Pour l’attestation de garant, veillez à joindre la pièce d’identité signée du garant.</span>
                </li>
              </ul>
            </div>

            <div className="bg-slate-50 border border-slate-200 p-4 space-y-2 text-xs shadow-2xs">
              <span className="text-xs font-mono uppercase tracking-wider text-slate-500 font-bold block border-b border-slate-200 pb-1.5">
                Rappel Consulaire
              </span>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Réf. Dossier</span>
                <span className="font-mono font-bold text-slate-900">{deliverables.dossierId}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Centre agréé</span>
                <span className="font-semibold text-slate-800">{countryProfile.biometricCenters.france[0] || 'VFS / TLS'}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Frais officiels</span>
                <span className="font-bold text-emerald-800">{deliverables.summaryHighlights.officialCost}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
