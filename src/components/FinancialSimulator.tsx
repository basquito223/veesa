import React, { useState } from 'react';
import { Calculator, CheckCircle2, AlertTriangle, AlertOctagon, ShieldCheck, ArrowRight } from 'lucide-react';
import { DestinationType, AccommodationType, VisaReasonType } from '../types';
import { sound } from '../utils/feedback';
import { OfficialSourceBadge } from './OfficialSourceBadge';
import { AFRICAN_COUNTRIES } from '../data/countriesData';
import { MOROCCO_BILATERAL_EXEMPT_COUNTRIES } from '../data/bilateralAgreements';

interface FinancialSimulatorProps {
  currentDestination?: DestinationType;
  currentVisaReason?: VisaReasonType;
  countryOfOrigin?: string;
}

export const FinancialSimulator: React.FC<FinancialSimulatorProps> = ({
  currentDestination,
  currentVisaReason,
  countryOfOrigin,
}) => {
  // Derive initial base destination country
  const getInitialCountry = (): string => {
    const d = (currentDestination || 'france').toLowerCase();
    if (d.includes('canada')) return 'canada';
    if (d.includes('maroc')) return 'maroc';
    if (d.includes('turqui')) return 'turquie';
    if (d.includes('dubai')) return 'dubai';
    return 'france';
  };

  const getInitialReason = (): 'etudes' | 'visite' => {
    if (currentVisaReason === 'etudes' || currentDestination === 'france_etudes' || currentDestination === 'canada_etudes') {
      return 'etudes';
    }
    return 'visite';
  };

  const [selectedCountry, setSelectedCountry] = useState<string>(getInitialCountry);
  const [selectedOriginCountry, setSelectedOriginCountry] = useState<string>(() => {
    if (countryOfOrigin && countryOfOrigin.trim()) {
      const match = AFRICAN_COUNTRIES.find(
        (c) => c.name.toLowerCase() === countryOfOrigin.toLowerCase() || c.id.toLowerCase() === countryOfOrigin.toLowerCase()
      );
      return match ? match.name : countryOfOrigin;
    }
    return 'Mali';
  });
  const [selectedReason, setSelectedReason] = useState<'etudes' | 'visite'>(getInitialReason);
  const [stayDuration, setStayDuration] = useState<number>(getInitialReason() === 'etudes' ? 12 : 15);
  const [accommodation, setAccommodation] = useState<AccommodationType>('residence_etudiante');
  const [tuitionFeesCad, setTuitionFeesCad] = useState<number>(16000);
  const [applicantBudgetFcfa, setApplicantBudgetFcfa] = useState<number>(
    getInitialReason() === 'etudes' ? 7500000 : 1500000
  );

  // Official Conversion rates
  const RATE_EUR_FCFA = 655.957;
  const RATE_CAD_FCFA = 443.0;
  const RATE_USD_FCFA = 600.0;

  // Compute required funds
  let requiredAmountFcfa = 0;
  let requiredOriginalCurrency = '';
  let visaFeeFcfa = 0;
  let visaFeeOriginal = '';
  let ruleCitation = '';
  let legalBasis = '';

  const isStudy = (selectedCountry === 'france' || selectedCountry === 'canada') && selectedReason === 'etudes';

  if (selectedCountry === 'france' && isStudy) {
    const months = Math.max(stayDuration, 1);
    const monthlyEur = 877.50;
    const totalEur = monthlyEur * months;
    requiredAmountFcfa = Math.round(totalEur * RATE_EUR_FCFA);
    requiredOriginalCurrency = `${totalEur.toLocaleString('fr-FR')} € (${monthlyEur} €/mois sur ${months} mois)`;
    visaFeeFcfa = Math.round(99 * RATE_EUR_FCFA);
    visaFeeOriginal = '99 €';
    ruleCitation = 'Arrêté ministériel du 1er août 2026 fixant le seuil légal d’entretien étudiant à 877,50 € / mois (10 530 € sur 12 mois bloqués en AVI ou garant régulier).';
    legalBasis = 'Arrêté ministériel relatif aux moyens d’existence exigibles des étudiants étrangers';
  } else if (selectedCountry === 'france' && !isStudy) {
    const days = Math.max(stayDuration, 1);
    let dailyEur = 65.0;
    if (accommodation === 'attestation_accueil') {
      dailyEur = 32.50;
    } else if (accommodation === 'hotel_confirme') {
      dailyEur = 65.00;
    } else {
      dailyEur = 120.00;
    }
    const totalEur = dailyEur * days;
    requiredAmountFcfa = Math.round(totalEur * RATE_EUR_FCFA);
    requiredOriginalCurrency = `${totalEur.toLocaleString('fr-FR')} € (${dailyEur} €/jour pour ${days} jours)`;
    visaFeeFcfa = Math.round(90 * RATE_EUR_FCFA);
    visaFeeOriginal = '90 € (adulte)';
    ruleCitation = 'Barème officiel Schengen 2026 : 32,50 €/j avec attestation d’accueil mairie, 65 €/j avec hôtel, 120 €/j sans justificatif.';
    legalBasis = 'Code Communautaire des Visas — Article 14 & 21';
  } else if (selectedCountry === 'canada' && isStudy) {
    const livingCad = 23448;
    const transportCad = 2000;
    const totalCad = livingCad + tuitionFeesCad + transportCad;
    requiredAmountFcfa = Math.round(totalCad * RATE_CAD_FCFA);
    requiredOriginalCurrency = `${totalCad.toLocaleString('fr-FR')} $ CAD (${livingCad} $ subsistance + ${tuitionFeesCad} $ scolarité + ${transportCad} $ vol)`;
    visaFeeFcfa = Math.round((150 + 85) * RATE_CAD_FCFA);
    visaFeeOriginal = '150 $ CAD (visa) + 85 $ CAD (biométrie)';
    ruleCitation = 'Directive IRCC 2026 : Frais de subsistance fixés à 23 448 $ CAD / an (hors Québec) + 1ère année de scolarité payée + PAL.';
    legalBasis = 'Règlement sur l’immigration et la protection des réfugiés (RIPR) — Article R220';
  } else if (selectedCountry === 'canada' && !isStudy) {
    const days = Math.max(stayDuration, 1);
    const dailyCad = 150;
    const transportCad = 1800;
    const totalCad = dailyCad * days + transportCad;
    requiredAmountFcfa = Math.round(totalCad * RATE_CAD_FCFA);
    requiredOriginalCurrency = `${totalCad.toLocaleString('fr-FR')} $ CAD (${dailyCad} $ CAD/j + vol aller-retour)`;
    visaFeeFcfa = Math.round((100 + 85) * RATE_CAD_FCFA);
    visaFeeOriginal = '100 $ CAD (visa) + 85 $ CAD (biométrie)';
    ruleCitation = 'IRCC Résidence Temporaire : Justification d’attaches et budget complet couvrant l’ensemble du voyage sans travailler.';
    legalBasis = 'Directive opérationnelle IRCC temporaire';
  } else if (selectedCountry === 'turquie') {
    const days = Math.max(stayDuration, 1);
    const dailyUsd = 50;
    const totalUsd = dailyUsd * days;
    requiredAmountFcfa = Math.round(totalUsd * RATE_USD_FCFA);
    requiredOriginalCurrency = `${totalUsd.toLocaleString('fr-FR')} $ USD (${dailyUsd} $ USD/j)`;
    visaFeeFcfa = Math.round(60 * RATE_USD_FCFA);
    visaFeeOriginal = '60 $ USD (e-visa) ou ~130 $ USD (visa physique Gateway)';
    ruleCitation = 'Législation consulaire turque : E-visa réservé aux porteurs de visa Schengen/USA/UK. 50 USD/jour requis.';
    legalBasis = 'Direction Générale de la Gestion des Migrations (Turquie)';
  } else if (selectedCountry === 'maroc') {
    const days = Math.max(stayDuration, 1);
    const dailyMad = 300;
    const RATE_MAD_FCFA = 60.0;
    const totalMad = dailyMad * days;
    requiredAmountFcfa = Math.round(totalMad * RATE_MAD_FCFA);
    requiredOriginalCurrency = `${totalMad.toLocaleString('fr-FR')} MAD (~${dailyMad} MAD/j)`;

    const normOrigin = (selectedOriginCountry || '').toLowerCase();
    if (normOrigin.includes('ivoire')) {
      visaFeeFcfa = 52000;
      visaFeeOriginal = '52 000 FCFA (~770 MAD e-Visa acces-maroc.ma)';
      ruleCitation =
        'Royaume du Maroc (Accord CI 2026) : e-Visa électronique préalable OBLIGATOIRE sur acces-maroc.ma pour les passeports ordinaires ivoiriens (~770 MAD / ~52 000 FCFA). Séjour max : 30 jours.';
      legalBasis = 'Circulaire consulaire MAEC Maroc & Accord bilatéral régulé';
    } else if (MOROCCO_BILATERAL_EXEMPT_COUNTRIES.some((c) => normOrigin.includes(c))) {
      visaFeeFcfa = 0;
      visaFeeOriginal = '0 FCFA (Exemption bilatérale 90 jours)';
      ruleCitation =
        'Royaume du Maroc : Exemption totale de visa bilatérale pour Mali, Sénégal, Gabon, Togo, Bénin, Burkina... (0 FCFA, 90 jours). Passeport valide > 6 mois, billet retour et hébergement exigés à la PAF. L’obligation d’AEVM a été formellement levée pour le Mali le 27 avril 2026.';
      legalBasis = 'Conventions bilatérales d’établissement et de circulation';
    } else if (normOrigin.includes('guinee') || normOrigin.includes('guin') || normOrigin.includes('congo')) {
      visaFeeFcfa = 0;
      visaFeeOriginal = '0 FCFA (AEVM préalable gratuite sur acces-maroc.ma)';
      ruleCitation =
        'Royaume du Maroc : Autorisation Électronique de Voyage (AEVM) obligatoire sur acces-maroc.ma au moins 96h avant le vol. Délivrance administrative gratuite.';
      legalBasis = 'Protocole AEVM DGSN Maroc';
    } else {
      visaFeeFcfa = 22000;
      visaFeeOriginal = '22 000 à 33 000 FCFA (visa consulaire standard)';
      ruleCitation =
        'Royaume du Maroc : Dépôt de visa obligatoire auprès du consulat général du Maroc (ou e-Visa sous condition de titre Schengen/USA valide).';
      legalBasis = 'Tarif consulaire réglementaire';
    }
  } else {
    const days = Math.max(stayDuration, 1);
    const dailyUsd = 80;
    const totalUsd = dailyUsd * days;
    requiredAmountFcfa = Math.round(totalUsd * RATE_USD_FCFA);
    requiredOriginalCurrency = `${totalUsd.toLocaleString('fr-FR')} $ USD (${dailyUsd} $ USD/j)`;
    visaFeeFcfa = Math.round(110 * RATE_USD_FCFA);
    visaFeeOriginal = '110 $ USD (visa 30j)';
    ruleCitation = 'GDRFA Émirats Arabes Unis : Billet aller-retour et hébergement vérifiable requis.';
    legalBasis = 'Réglementation GDRFA Dubaï';
  }

  const deltaFcfa = applicantBudgetFcfa - requiredAmountFcfa;
  const coveragePercent = Math.min(Math.round((applicantBudgetFcfa / (requiredAmountFcfa || 1)) * 100), 100);
  const isBudgetSufficient = deltaFcfa >= 0;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-8">
      {/* Editorial Header */}
      <div className="bg-white border border-slate-200 p-6 sm:p-8 space-y-3">
        <div className="flex items-center space-x-2 text-xs font-mono text-slate-500 uppercase tracking-wider">
          <span>BAREME CONSULAIRE OFFICIEL</span>
          <span>•</span>
          <span>ÉDITION 2026</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-950">
          Simulateur de Couverture Financière
        </h1>
        <p className="text-sm text-slate-600 max-w-2xl leading-relaxed">
          Vérifiez si les ressources dont vous disposez couvrent exactement le seuil légal d'entretien imposé par l'État de destination.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Control Panel */}
        <div className="lg:col-span-7 bg-white border border-slate-200 p-6 sm:p-7 space-y-6">
          {/* Nationality of applicant (Bilateral impact) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Nationalité du Voyageur (Passeport)
              </label>
              <span className="text-[11px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 border border-emerald-200">
                Accords bilatéraux 2026
              </span>
            </div>
            <select
              id="select-sim-origin"
              value={selectedOriginCountry}
              onChange={(e) => {
                sound.tap();
                setSelectedOriginCountry(e.target.value);
              }}
              className="w-full px-4 py-3 bg-white border border-slate-300 font-semibold text-slate-900 text-sm focus:outline-none focus:border-slate-950 focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 cursor-pointer"
            >
              {AFRICAN_COUNTRIES.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.flag} {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Destination */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              Pays de Destination
            </label>
            <select
              id="select-sim-destination"
              value={selectedCountry}
              onChange={(e) => {
                sound.tap();
                const val = e.target.value;
                setSelectedCountry(val);
                if (val === 'france') {
                  setStayDuration(selectedReason === 'etudes' ? 12 : 15);
                  setApplicantBudgetFcfa(selectedReason === 'etudes' ? 7500000 : 1500000);
                } else if (val === 'canada') {
                  setStayDuration(selectedReason === 'etudes' ? 12 : 15);
                  setApplicantBudgetFcfa(selectedReason === 'etudes' ? 18000000 : 2500000);
                } else {
                  setStayDuration(15);
                  setApplicantBudgetFcfa(1500000);
                }
              }}
              className="w-full px-4 py-3 bg-white border border-slate-300 font-semibold text-slate-900 text-sm focus:outline-none focus:border-slate-950 focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 cursor-pointer"
            >
              <option value="france">🇫🇷 France / Espace Schengen</option>
              <option value="canada">🇨🇦 Canada</option>
              <option value="maroc">🇲🇦 Maroc</option>
              <option value="turquie">🇹🇷 Turquie</option>
              <option value="dubai">🇦🇪 Dubaï (Émirats Arabes Unis)</option>
            </select>
          </div>

          {/* Reason toggle for France and Canada */}
          {(selectedCountry === 'france' || selectedCountry === 'canada') && (
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Motif du Séjour
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    sound.tap();
                    setSelectedReason('etudes');
                    setStayDuration(12);
                    setApplicantBudgetFcfa(selectedCountry === 'canada' ? 18000000 : 7500000);
                  }}
                  className={`py-2.5 px-3 text-xs font-bold transition-colors border ${
                    selectedReason === 'etudes'
                      ? 'bg-slate-950 text-white border-slate-950'
                      : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  🎓 Études ({selectedCountry === 'france' ? 'VLS-TS' : 'Permis IRCC'})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    sound.tap();
                    setSelectedReason('visite');
                    setStayDuration(15);
                    setApplicantBudgetFcfa(selectedCountry === 'canada' ? 2500000 : 1500000);
                  }}
                  className={`py-2.5 px-3 text-xs font-bold transition-colors border ${
                    selectedReason === 'visite'
                      ? 'bg-slate-950 text-white border-slate-950'
                      : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  🧳 Court Séjour / Visite
                </button>
              </div>
            </div>
          )}

          {/* Duration */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-700">
              <span>{isStudy ? 'Durée de prise en charge (Mois)' : 'Durée du séjour (Jours)'}</span>
              <span className="font-mono text-slate-900 font-bold">
                {stayDuration} {isStudy ? 'mois' : 'jours'}
              </span>
            </div>
            <input
              type="range"
              id="range-stay-duration"
              min={isStudy ? 6 : 5}
              max={isStudy ? 24 : 90}
              value={stayDuration}
              onChange={(e) => setStayDuration(Number(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-none appearance-none cursor-pointer accent-slate-900"
            />
            <div className="flex justify-between text-[11px] text-slate-400 font-mono">
              <span>{isStudy ? '6 mois' : '5 jours'}</span>
              <span>{isStudy ? '12 mois' : '30 jours'}</span>
              <span>{isStudy ? '24 mois' : '90 jours max'}</span>
            </div>

            {selectedCountry === 'maroc' && selectedOriginCountry.toLowerCase().includes('ivoire') && stayDuration > 30 && (
              <div className="p-2.5 bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-start space-x-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                <span>
                  <strong>Plafond e-Visa Ivoirien (30 jours) :</strong> L’e-Visa Acces-Maroc pour les ressortissants de Côte d’Ivoire autorise un séjour maximum initial de <strong>30 jours</strong>. Ajustez votre curseur à 30 jours pour rester en conformité avec votre titre de voyage.
                </span>
              </div>
            )}
          </div>

          {/* Accommodation for France Visit */}
          {selectedCountry === 'france' && selectedReason === 'visite' && (
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Type de Justificatif d’Hébergement
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    sound.tap();
                    setAccommodation('attestation_accueil');
                  }}
                  className={`p-3 border text-left text-xs transition-colors ${
                    accommodation === 'attestation_accueil'
                      ? 'border-slate-950 bg-slate-900 text-white font-bold'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400'
                  }`}
                >
                  <div className="font-bold">Accueil Mairie</div>
                  <div className="text-[11px] opacity-80 mt-0.5">32,50 € / jour</div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    sound.tap();
                    setAccommodation('hotel_confirme');
                  }}
                  className={`p-3 border text-left text-xs transition-colors ${
                    accommodation === 'hotel_confirme'
                      ? 'border-slate-950 bg-slate-900 text-white font-bold'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400'
                  }`}
                >
                  <div className="font-bold">Hôtel confirmé</div>
                  <div className="text-[11px] opacity-80 mt-0.5">65,00 € / jour</div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    sound.tap();
                    setAccommodation('non_justifie');
                  }}
                  className={`p-3 border text-left text-xs transition-colors ${
                    accommodation === 'non_justifie'
                      ? 'border-slate-950 bg-slate-900 text-white font-bold'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400'
                  }`}
                >
                  <div className="font-bold">Sans réservation</div>
                  <div className="text-[11px] opacity-80 mt-0.5">120,00 € / jour</div>
                </button>
              </div>
            </div>
          )}

          {/* Canada Tuition Fees Input */}
          {selectedCountry === 'canada' && isStudy && (
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Frais de scolarité de la 1ère année ($ CAD)
              </label>
              <input
                type="number"
                value={tuitionFeesCad}
                onChange={(e) => setTuitionFeesCad(Number(e.target.value))}
                className="w-full px-4 py-2.5 bg-white border border-slate-300 font-semibold text-slate-900 text-sm focus:outline-none focus:border-slate-950 focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2"
              />
            </div>
          )}

          {/* User's Budget Input */}
          <div className="space-y-2 pt-2 border-t border-slate-200">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-700">
              <span>Votre Budget Mobilisable Réel (FCFA)</span>
              <span className="font-mono text-slate-900 font-bold">
                {applicantBudgetFcfa.toLocaleString('fr-FR')} FCFA
              </span>
            </div>
            <input
              type="number"
              value={applicantBudgetFcfa}
              onChange={(e) => setApplicantBudgetFcfa(Number(e.target.value))}
              className="w-full px-4 py-3 bg-white border border-slate-300 font-bold text-slate-900 text-base focus:outline-none focus:border-slate-950 focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 font-mono"
            />
          </div>
        </div>

        {/* Right Verdict Panel */}
        <div className="lg:col-span-5 space-y-6">
          {/* Summary Metric Box */}
          <div className="bg-white border border-slate-200 p-6 space-y-5">
            <div>
              <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider">
                Exigence Financière Légale
              </span>
              <div className="text-2xl sm:text-3xl font-black font-mono text-slate-950 mt-1">
                {requiredAmountFcfa.toLocaleString('fr-FR')} FCFA
              </div>
              <div className="text-xs text-slate-600 font-mono mt-0.5">
                {requiredOriginalCurrency}
              </div>
            </div>

            <div className="space-y-1.5 pt-4 border-t border-slate-200">
              <div className="flex justify-between text-xs font-semibold text-slate-700">
                <span>Taux de couverture légal :</span>
                <span className="font-mono font-bold">{coveragePercent}%</span>
              </div>
              <div className="w-full h-2 bg-slate-100 border border-slate-200">
                <div
                  className={`h-full ${isBudgetSufficient ? 'bg-emerald-600' : 'bg-red-500'}`}
                  style={{ width: `${coveragePercent}%` }}
                />
              </div>
            </div>

            {/* Verdict Callout */}
            <div
              className={`p-4 border text-xs leading-relaxed space-y-1 ${
                isBudgetSufficient
                  ? 'border-emerald-300 bg-emerald-50/70 text-emerald-950'
                  : 'border-red-300 bg-red-50/70 text-red-950'
              }`}
            >
              <div className="font-bold flex items-center space-x-1.5">
                {isBudgetSufficient ? (
                  <ShieldCheck className="w-4 h-4 text-emerald-700" />
                ) : (
                  <AlertOctagon className="w-4 h-4 text-red-600" />
                )}
                <span>{isBudgetSufficient ? 'Seuil Légal Couvert' : 'Déficit Financier Détecté'}</span>
              </div>
              <p>
                {isBudgetSufficient
                  ? `Votre budget excède le minimum réglementaire de +${deltaFcfa.toLocaleString('fr-FR')} FCFA. Veillez à ce que cette somme soit justifiée par des relevés réguliers.`
                  : `Il vous manque -${Math.abs(deltaFcfa).toLocaleString('fr-FR')} FCFA pour satisfaire les critères consulaires d'office.`}
              </p>
            </div>

            {/* Official Legal Cost */}
            <div className="pt-3 border-t border-slate-200 text-xs text-slate-600 space-y-1">
              <div className="flex justify-between">
                <span>Frais légaux de visa d'État :</span>
                <span className="font-mono font-bold text-slate-900">{visaFeeOriginal} (~{visaFeeFcfa.toLocaleString('fr-FR')} FCFA)</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Payable uniquement au guichet du centre agréé le jour du dépôt biométrique.
              </p>
            </div>
          </div>

          {/* Official Source Badge */}
          <OfficialSourceBadge
            sourceName="Barème Légal d’Entretien Consulaire 2026"
            ruleCitation={ruleCitation}
            legalBasis={legalBasis}
          />
        </div>
      </div>
    </div>
  );
};
