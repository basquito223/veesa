import React, { useState } from 'react';
import { Sparkles, Compass, Calculator, FileCheck, ShieldAlert, Trash2 } from 'lucide-react';
import { sound } from '../utils/feedback';

export type TabKey =
  | 'onboarding'
  | 'deliverables'
  | 'checker'
  | 'simulator'
  | 'radar'
  | 'official_links';

interface NavbarProps {
  activeTab: TabKey;
  setActiveTab: (tab: TabKey) => void;
  hasCompletedFlow: boolean;
  onPurgeData?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab, hasCompletedFlow, onPurgeData }) => {
  const [showPurgeConfirm, setShowPurgeConfirm] = useState(false);

  const handleTabClick = (tab: TabKey) => {
    sound.tap();
    setActiveTab(tab);
  };

  const handleConfirmPurge = () => {
    sound.tap();
    if (onPurgeData) {
      onPurgeData();
    }
    setShowPurgeConfirm(false);
  };

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-2xs">
      <div className="max-w-6xl mx-auto px-3 sm:px-6">
        <div className="flex items-center justify-between h-13 sm:h-14 gap-2 sm:gap-4">
          {/* Brand Identity */}
          <button
            onClick={() => handleTabClick('onboarding')}
            className="flex items-center space-x-2.5 cursor-pointer select-none group shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 rounded-lg p-1 text-left"
            id="brand-logo"
            aria-label="VisaFlow - Accueil Mon Projet"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-600 via-teal-600 to-indigo-900 text-white flex items-center justify-center font-black text-xs sm:text-sm tracking-tight shadow-xs group-hover:scale-105 transition-transform">
              VF
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="text-base sm:text-lg font-black tracking-tight text-slate-950">
                Visa<span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-700 to-teal-600">Flow</span>
              </span>
              <span className="text-[9px] font-mono font-bold tracking-wider uppercase px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-800 border border-emerald-200/70 hidden xs:inline-block">
                OFFICIEL 2026
              </span>
            </div>
          </button>

          {/* Navigation with colored dynamic pills */}
          <nav aria-label="Navigation principale" className="flex items-center space-x-1 sm:space-x-1.5 overflow-x-auto no-scrollbar py-0.5 text-xs">
            {/* 1. Mon Projet */}
            <button
              id="nav-onboarding-btn"
              onClick={() => handleTabClick('onboarding')}
              className={`px-3 py-1.5 rounded-full font-bold transition-all select-none shrink-0 flex items-center space-x-1.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 ${
                activeTab === 'onboarding'
                  ? 'bg-slate-950 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-950 hover:bg-slate-100'
              }`}
            >
              <Compass className={`w-3.5 h-3.5 ${activeTab === 'onboarding' ? 'text-emerald-400' : 'text-slate-400'}`} />
              <span>Mon Projet</span>
            </button>

            {/* 2. Mon Dossier (if completed or viewing) */}
            {hasCompletedFlow && (
              <button
                id="nav-deliverables-btn"
                onClick={() => handleTabClick('deliverables')}
                className={`px-3 py-1.5 rounded-full font-bold transition-all select-none shrink-0 flex items-center space-x-1.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 ${
                  activeTab === 'deliverables'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/70'
                }`}
              >
                <FileCheck className="w-3.5 h-3.5 text-emerald-300" />
                <span>Mon Dossier</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              </button>
            )}

            {/* 3. Accords & Dispenses */}
            <button
              id="nav-checker-btn"
              onClick={() => handleTabClick('checker')}
              className={`px-3 py-1.5 rounded-full font-bold transition-all select-none shrink-0 flex items-center space-x-1.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 ${
                activeTab === 'checker'
                  ? 'bg-indigo-900 text-white shadow-xs'
                  : 'text-slate-700 hover:text-slate-950 hover:bg-slate-100'
              }`}
              title="Vérifier si un visa est exigé ou s'il y a une dispense"
            >
              <Sparkles className={`w-3.5 h-3.5 ${activeTab === 'checker' ? 'text-indigo-300' : 'text-indigo-600'}`} />
              <span className="hidden sm:inline">Ai-je besoin d'un visa ?</span>
              <span className="sm:hidden">Dispenses</span>
            </button>

            {/* 4. Mon Budget */}
            <button
              id="nav-simulator-btn"
              onClick={() => handleTabClick('simulator')}
              className={`px-3 py-1.5 rounded-full font-bold transition-all select-none shrink-0 flex items-center space-x-1.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 ${
                activeTab === 'simulator'
                  ? 'bg-teal-800 text-white shadow-xs'
                  : 'text-slate-700 hover:text-slate-950 hover:bg-slate-100'
              }`}
              title="Simuler les exigences financières officielles"
            >
              <Calculator className={`w-3.5 h-3.5 ${activeTab === 'simulator' ? 'text-teal-300' : 'text-teal-600'}`} />
              <span>Mon Budget</span>
            </button>

            {/* 5. Avant de Payer (Anti-Scam Signature) */}
            <button
              id="nav-radar-btn"
              onClick={() => handleTabClick('radar')}
              className={`px-3 py-1.5 rounded-full font-bold transition-all select-none shrink-0 flex items-center space-x-1.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 ${
                activeTab === 'radar'
                  ? 'bg-rose-700 text-white shadow-xs'
                  : 'text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200/80'
              }`}
              title="Vérifications indispensables avant de verser de l'argent"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-rose-500 shrink-0" />
              <span>Avant de payer</span>
            </button>

            {/* 6. Purge PII / Données locales */}
            {onPurgeData && (
              <div className="relative shrink-0">
                {showPurgeConfirm ? (
                  <div className="flex items-center space-x-1 bg-rose-50 border border-rose-300 px-2 py-1 rounded-full text-[11px]">
                    <span className="text-rose-800 font-semibold">Effacer tout ?</span>
                    <button
                      id="btn-confirm-purge"
                      onClick={handleConfirmPurge}
                      className="px-2 py-0.5 bg-rose-700 text-white font-bold rounded-full hover:bg-rose-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-950 cursor-pointer"
                    >
                      Oui
                    </button>
                    <button
                      onClick={() => setShowPurgeConfirm(false)}
                      className="px-1.5 py-0.5 text-slate-600 hover:text-slate-950 cursor-pointer"
                    >
                      Non
                    </button>
                  </div>
                ) : (
                  <button
                    id="btn-purge-data"
                    onClick={() => setShowPurgeConfirm(true)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-full transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-950 focus-visible:ring-offset-2"
                    title="Effacer mes données et mon historique local (sécurité PII)"
                    aria-label="Effacer mes données personnelles"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
};
