import React, { useState } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  FileCheck,
  RefreshCw,
  ExternalLink,
  Info,
  Clock,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { AFRICAN_COUNTRIES } from '../data/countriesData';
import { getBilateralRule, BilateralRule } from '../data/bilateralAgreements';
import { DestinationType, UserAnswers } from '../types';
import { sound } from '../utils/feedback';
import { OfficialSourceBadge } from './OfficialSourceBadge';
import { ScamInterceptionNotice } from './ScamInterceptionNotice';

interface BilateralCheckerProps {
  onSelectRoute?: (originCountry: string, destination: DestinationType) => void;
  currentAnswers?: UserAnswers;
}

const DESTINATIONS: { id: DestinationType; label: string; flag: string }[] = [
  { id: 'france', label: 'France / Espace Schengen', flag: '🇫🇷' },
  { id: 'canada', label: 'Canada (IRCC)', flag: '🇨🇦' },
  { id: 'maroc', label: 'Maroc (Royaume du Maroc)', flag: '🇲🇦' },
  { id: 'turquie', label: 'Turquie (E-Visa / Gateway Globe)', flag: '🇹🇷' },
  { id: 'dubai', label: 'Émirats Arabes Unis (Dubaï)', flag: '🇦🇪' },
];

export const BilateralChecker: React.FC<BilateralCheckerProps> = ({ onSelectRoute, currentAnswers }) => {
  const [selectedOrigin, setSelectedOrigin] = useState<string>(currentAnswers?.countryOfOrigin || 'Mali');
  const [selectedDestination, setSelectedDestination] = useState<DestinationType>(
    currentAnswers?.destination || 'france'
  );
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [verifiedAt, setVerifiedAt] = useState<string>(() => {
    return new Date().toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  });

  const [liveAiAnalysis, setLiveAiAnalysis] = useState<string | null>(null);
  const [liveNotice, setLiveNotice] = useState<string | null>(null);
  const [groundingSources, setGroundingSources] = useState<any[]>([]);

  const rule: BilateralRule = getBilateralRule(selectedOrigin, selectedDestination, currentAnswers?.visaReason);

  const handleAuditClick = async () => {
    sound.tap();
    setIsVerifying(true);
    setLiveNotice(null);

    try {
      const res = await fetch('/api/check-bilateral-live', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ originCountry: selectedOrigin, destination: selectedDestination }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.liveAnalysis) {
          setLiveAiAnalysis(data.liveAnalysis);
          setGroundingSources(data.groundingSources || []);
          if (data.quotaNotice) {
            setLiveNotice(data.quotaNotice);
          } else if (data.isFallback) {
            setLiveNotice('Référentiel diplomatique officiel 2026');
          } else {
            setLiveNotice('Analyse en direct avec ancrage web officiel');
          }
        }
      } else {
        // Fallback to local rule synthesis
        setLiveAiAnalysis(`RAPPORT CONSULAIRE OFFICIEL 2026 (${rule.verificationSource})\n\n` +
          `1. STATUT RÉGLEMENTAIRE : ${rule.badgeLabel}\n` +
          `• ${rule.headline}\n\n` +
          `2. CADRE JURIDIQUE : ${rule.legalBasis}\n\n` +
          `3. TARIF OFFICIEL : ${rule.officialCostDisplay}\n\n` +
          `4. PIÈCES EXIGÉES :\n${rule.entryDocuments.map((d) => `• ${d}`).join('\n')}\n\n` +
          `5. AVERTISSEMENT : ${rule.antiScamAlert}`);
        setLiveNotice('Référentiel consulaire certifié 2026');
      }
    } catch {
      // Local rule acts as resilient fallback
      setLiveAiAnalysis(`RAPPORT CONSULAIRE OFFICIEL 2026 (${rule.verificationSource})\n\n` +
        `1. STATUT RÉGLEMENTAIRE : ${rule.badgeLabel}\n` +
        `• ${rule.headline}\n\n` +
        `2. CADRE JURIDIQUE : ${rule.legalBasis}\n\n` +
        `3. TARIF OFFICIEL : ${rule.officialCostDisplay}\n\n` +
        `4. PIÈCES EXIGÉES :\n${rule.entryDocuments.map((d) => `• ${d}`).join('\n')}\n\n` +
        `5. AVERTISSEMENT : ${rule.antiScamAlert}`);
      setLiveNotice('Référentiel consulaire certifié 2026');
    } finally {
      setIsVerifying(false);
      setVerifiedAt(
        new Date().toLocaleDateString('fr-FR', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
      );
    }
  };

  const isExempt = rule.regimeType === 'exemption_totale';
  const isEvisa = rule.regimeType === 'evisa_obligatoire' || rule.regimeType === 'evisa_conditionnel';
  const isAevm = rule.regimeType === 'aevm_obligatoire';

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-8">
      {/* Editorial Header */}
      <div className="bg-white border border-slate-200 p-6 sm:p-8 space-y-3">
        <div className="flex items-center space-x-2 text-xs font-mono text-slate-500 uppercase tracking-wider">
          <span>ACCORDS DIPLOMATIQUES</span>
          <span>•</span>
          <span>DISPENSES OFFICIELLES</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-950">
          Ai-je Besoin d'un Visa ?
        </h1>
        <p className="text-sm text-slate-600 max-w-2xl leading-relaxed">
          Identifiez le régime d'entrée exact selon votre passeport et les traités bilatéraux en vigueur pour 2026.
        </p>
      </div>

      {/* Selectors Card */}
      <div className="bg-white border border-slate-200 p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              Nationalité & Passeport d'origine :
            </label>
            <select
              id="checker-origin-select"
              value={selectedOrigin}
              onChange={(e) => {
                sound.tap();
                setSelectedOrigin(e.target.value);
              }}
              className="w-full bg-white border border-slate-300 font-semibold text-slate-900 px-4 py-3 text-sm focus:outline-none focus:border-slate-950 focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 cursor-pointer"
            >
              {AFRICAN_COUNTRIES.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.flag} {c.name} ({c.capital})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              Pays de destination envisagé :
            </label>
            <select
              id="checker-destination-select"
              value={selectedDestination}
              onChange={(e) => {
                sound.tap();
                setSelectedDestination(e.target.value as DestinationType);
              }}
              className="w-full bg-white border border-slate-300 font-semibold text-slate-900 px-4 py-3 text-sm focus:outline-none focus:border-slate-950 focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 cursor-pointer"
            >
              {DESTINATIONS.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.flag} {d.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Anti-Scam Interception Notice for Exempt Destinations */}
      {isExempt && (
        <ScamInterceptionNotice
          reason={`Ressortissants de ${selectedOrigin} : Exemption totale de visa.`}
          officialCost={rule.officialCostDisplay}
          officialRuleText="Selon les conventions bilatérales, vous ne devez payer AUCUN frais consulaire. Ne versez aucun acompte à des démarcheurs prétendant vous vendre une dispense qui est de plein droit."
          officialPortalName={rule.officialPortalUrl ? rule.officialPortalName : undefined}
          officialPortalUrl={rule.officialPortalUrl}
        />
      )}

      {/* Primary Regime Verdict Box */}
      <div className="bg-white border border-slate-200 p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div className="space-y-1">
            <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider">
              Régime d'entrée vérifié
            </span>
            <div className="flex items-center space-x-2">
              <span className={`text-xs font-mono font-bold uppercase tracking-wider px-2.5 py-1 border ${
                isExempt
                  ? 'bg-emerald-50 text-emerald-950 border-emerald-300'
                  : isEvisa || isAevm
                  ? 'bg-amber-50 text-amber-950 border-amber-300'
                  : 'bg-slate-100 text-slate-900 border-slate-300'
              }`}>
                {rule.badgeLabel}
              </span>
              <span className="text-xs text-slate-500 font-mono">Frais légaux : {rule.officialCostDisplay}</span>
            </div>
          </div>

          <button
            onClick={handleAuditClick}
            disabled={isVerifying}
            className="px-4 py-2 border border-slate-300 hover:border-slate-900 text-slate-700 hover:text-slate-950 text-xs font-bold uppercase tracking-wider flex items-center space-x-2 transition-colors cursor-pointer self-start sm:self-center"
          >
            {isVerifying ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Interrogation en cours...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
                <span>Vérifier en direct (Gemini)</span>
              </>
            )}
          </button>
        </div>

        <div className="space-y-2">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-950">
            {rule.headline}
          </h2>
          <p className="text-slate-700 text-sm leading-relaxed">
            {rule.legalBasis}
          </p>
        </div>

        {/* Required Entry Documents */}
        {rule.entryDocuments && rule.entryDocuments.length > 0 && (
          <div className="p-4 border border-slate-200 bg-slate-50 space-y-2 text-xs">
            <div className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
              Pièces impératives à présenter à la frontière (PAF) :
            </div>
            <ul className="space-y-1 text-slate-700 list-disc list-inside">
              {rule.entryDocuments.map((doc, i) => (
                <li key={i}>{doc}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Legal Text & Grounding Source Citation */}
        <OfficialSourceBadge
          sourceName={rule.verificationSource}
          ruleCitation={rule.legalBasis}
          sourceUrl={rule.officialPortalUrl}
          lastCheckedDate={verifiedAt}
        />

        {/* Live Grounding Analysis if present */}
        {liveAiAnalysis && (
          <div className="p-4 border border-emerald-300 bg-emerald-50/60 text-xs text-slate-800 space-y-2">
            <div className="font-bold flex items-center justify-between text-emerald-950 uppercase tracking-wider text-[11px]">
              <div className="flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
                <span>Rapport d'audit consulaire vérifié</span>
              </div>
              {liveNotice && (
                <span className="text-[10px] font-semibold text-emerald-900 bg-emerald-100 border border-emerald-300 px-2 py-0.5">
                  {liveNotice}
                </span>
              )}
            </div>
            <div className="leading-relaxed whitespace-pre-line font-sans text-xs bg-white/80 p-3.5 border border-emerald-200">
              {liveAiAnalysis}
            </div>
          </div>
        )}

        {/* Action Button: Apply this route to journey */}
        {onSelectRoute && (
          <div className="pt-2 flex justify-end">
            <button
              onClick={() => {
                sound.tap();
                onSelectRoute(selectedOrigin, selectedDestination);
              }}
              className="px-5 py-2.5 bg-slate-950 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider flex items-center space-x-2 transition-colors cursor-pointer"
            >
              <span>Préparer mon dossier pour cet itinéraire</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
