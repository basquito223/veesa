import React, { useState, useEffect } from 'react';
import { Navbar, TabKey } from './components/Navbar';
import { GuidedJourney } from './components/GuidedJourney';
import { ResultsView } from './components/ResultsView';
import { FinancialSimulator } from './components/FinancialSimulator';
import { AntiScamRadar } from './components/AntiScamRadar';
import { OfficialPortals } from './components/OfficialPortals';
import { BilateralChecker } from './components/BilateralChecker';
import { UserAnswers, DestinationType } from './types';
import { generateDeliverables, generateUniqueDossierId, GeneratedDeliverables } from './utils/deliverableGenerator';

const STORAGE_KEY_ANSWERS = 'visaflow_user_answers_v5';
const STORAGE_KEY_DOSSIER_ID = 'visaflow_dossier_id_v5';
const STORAGE_KEY_COMPLETED = 'visaflow_has_completed_v5';
const STORAGE_KEY_TIMESTAMP = 'visaflow_session_timestamp_v5';
const SESSION_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours security TTL for PII retention

export const DEFAULT_ANSWERS: UserAnswers = {
  visaReason: '',       // Neutral, nothing pre-selected at step 1
  destination: '',      // Empty until selected on destination step
  specificDestination: '',
  countryOfOrigin: '',  // Empty, user must pick their country
  filingCountry: '',
  isFilingFromSameCountry: true,
  travelDurationDays: 15,
  status: 'etudiant',
  fundingSource: 'garant_local',
  availableBudgetFcfa: 0,
  hasRecentLumpDeposit: false,
  lumpDepositChoice: '',
  tiesType: 'etudes_en_cours',
  accommodationType: 'residence_etudiante',
  hasPassport6MonthsValid: true,
  hasPreviousRefusal: false,
  fullName: '',
  passportNumber: '',
  guarantorFullName: '',
};

export default function App() {
  const [answers, setAnswers] = useState<UserAnswers>(() => {
    try {
      // Clear legacy keys containing obsolete pre-selected test data
      ['visaflow_user_answers', 'visaflow_user_answers_v2', 'visaflow_user_answers_v3', 'visaflow_user_answers_v4'].forEach((k) => {
        try { localStorage.removeItem(k); } catch {}
      });

      // Security: Check TTL expiration
      const lastActive = localStorage.getItem(STORAGE_KEY_TIMESTAMP);
      if (lastActive && Date.now() - parseInt(lastActive, 10) > SESSION_TTL_MS) {
        localStorage.removeItem(STORAGE_KEY_ANSWERS);
        localStorage.removeItem(STORAGE_KEY_DOSSIER_ID);
        localStorage.removeItem(STORAGE_KEY_COMPLETED);
        localStorage.removeItem(STORAGE_KEY_TIMESTAMP);
        return DEFAULT_ANSWERS;
      }

      const saved = localStorage.getItem(STORAGE_KEY_ANSWERS);
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...DEFAULT_ANSWERS, ...parsed };
      }
      return DEFAULT_ANSWERS;
    } catch {
      return DEFAULT_ANSWERS;
    }
  });

  const [dossierId, setDossierId] = useState<string>(() => {
    try {
      const savedId = localStorage.getItem(STORAGE_KEY_DOSSIER_ID);
      return savedId || generateUniqueDossierId();
    } catch {
      return generateUniqueDossierId();
    }
  });

  const [hasCompletedFlow, setHasCompletedFlow] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_COMPLETED) === 'true';
    } catch {
      return false;
    }
  });

  const [activeTab, setActiveTab] = useState<TabKey>(
    hasCompletedFlow ? 'deliverables' : 'onboarding'
  );

  // Sync to local storage with privacy guard
  useEffect(() => {
    try {
      const isCleanInitial = !answers.visaReason && !answers.destination && !answers.fullName && !answers.passportNumber && !hasCompletedFlow;
      if (isCleanInitial) {
        localStorage.removeItem(STORAGE_KEY_ANSWERS);
        localStorage.removeItem(STORAGE_KEY_COMPLETED);
        localStorage.removeItem(STORAGE_KEY_TIMESTAMP);
      } else {
        localStorage.setItem(STORAGE_KEY_ANSWERS, JSON.stringify(answers));
        localStorage.setItem(STORAGE_KEY_DOSSIER_ID, dossierId);
        localStorage.setItem(STORAGE_KEY_COMPLETED, String(hasCompletedFlow));
        localStorage.setItem(STORAGE_KEY_TIMESTAMP, String(Date.now()));
      }
    } catch (e) {
      console.warn('LocalStorage error:', e);
    }
  }, [answers, dossierId, hasCompletedFlow]);

  const handlePurgeAllData = () => {
    try {
      localStorage.removeItem(STORAGE_KEY_ANSWERS);
      localStorage.removeItem(STORAGE_KEY_DOSSIER_ID);
      localStorage.removeItem(STORAGE_KEY_COMPLETED);
      localStorage.removeItem(STORAGE_KEY_TIMESTAMP);
      sessionStorage.clear();
    } catch {}
    setAnswers(DEFAULT_ANSWERS);
    setDossierId(generateUniqueDossierId());
    setHasCompletedFlow(false);
    setActiveTab('onboarding');
  };

  const deliverables: GeneratedDeliverables = generateDeliverables(answers, dossierId);

  const handleFlowComplete = () => {
    setHasCompletedFlow(true);
    setActiveTab('deliverables');
  };

  const handleSelectRouteFromChecker = (originCountry: string, destination: DestinationType) => {
    setAnswers((prev) => ({
      ...prev,
      countryOfOrigin: originCountry,
      destination,
    }));
    setActiveTab('onboarding');
  };

  return (
    <div className="min-h-screen bg-[#FAFAFB] text-slate-900 flex flex-col selection:bg-slate-900 selection:text-white font-sans antialiased">
      {/* Top Navbar - Clean, compact and fully accessible */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        hasCompletedFlow={hasCompletedFlow}
        onPurgeData={handlePurgeAllData}
      />

      {/* Main App Content Body */}
      <main className="flex-1 flex flex-col justify-start">
        {activeTab === 'onboarding' && (
          <GuidedJourney
            answers={answers}
            setAnswers={setAnswers}
            onComplete={handleFlowComplete}
            onOpenChecker={() => setActiveTab('checker')}
          />
        )}

        {activeTab === 'checker' && (
          <BilateralChecker
            onSelectRoute={handleSelectRouteFromChecker}
            currentAnswers={answers}
          />
        )}

        {activeTab === 'deliverables' && (
          <ResultsView
            deliverables={deliverables}
            answers={answers}
            onModifyAnswers={() => setActiveTab('onboarding')}
          />
        )}

        {activeTab === 'simulator' && (
          <FinancialSimulator
            currentDestination={answers.destination}
            currentVisaReason={answers.visaReason}
            countryOfOrigin={answers.countryOfOrigin}
          />
        )}

        {activeTab === 'radar' && <AntiScamRadar />}

        {activeTab === 'official_links' && <OfficialPortals />}
      </main>

      {/* Ultra-compact discreet footer for zero scroll */}
      <footer className="border-t border-slate-200/70 bg-white/80 py-2 px-3 text-[11px] text-slate-500 text-center no-print mt-auto shrink-0">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-2 flex-wrap text-center sm:text-left">
          <div className="flex items-center space-x-1.5 mx-auto sm:mx-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="font-bold text-slate-800">VisaFlow 2026</span>
            <span className="text-slate-400">•</span>
            <span className="text-slate-600">Normes France-Visas (2026), IRCC Canada & Accords bilatéraux vérifiés</span>
          </div>
          <span className="text-[10px] text-slate-400 mx-auto sm:mx-0">
            Outil indépendant — Seule l'autorité consulaire est souveraine.
          </span>
        </div>
      </footer>
    </div>
  );
}
