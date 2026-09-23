import React, { useState } from 'react';
import { ShieldAlert, AlertTriangle, ShieldCheck, Check, RotateCcw } from 'lucide-react';
import { sound } from '../utils/feedback';

interface ScamIndicator {
  id: string;
  title: string;
  dangerLevel: 'critical' | 'high' | 'medium';
  description: string;
  officialReality: string;
}

const SCAM_INDICATORS: ScamIndicator[] = [
  {
    id: 'guaranteed_visa',
    title: 'On me promet un "visa garanti à 100%"',
    dangerLevel: 'critical',
    description: 'L’intermédiaire ou l’agence affirme détenir des entrées ou des garanties absolues au consulat.',
    officialReality:
      'AUCUNE entité privée ne peut garantir un visa. La décision finale relève de la souveraineté exclusive de l’officier consulaire. Toute promesse de visa garanti est une escroquerie avérée.',
  },
  {
    id: 'mobile_money_payment',
    title: 'Paiement exigé via Wave, Orange Money ou virement personnel',
    dangerLevel: 'critical',
    description: 'On vous demande d’envoyer 500 000 FCFA ou plus sur un numéro personnel sans quittance bancaire officielle.',
    officialReality:
      'Les frais consulaires officiels se règlent UNIQUEMENT au guichet du centre agréé (TLScontact, VFS Global, Capago), en ligne sur le portail d’État (IRCC) ou auprès d’une banque accréditée avec quittance.',
  },
  {
    id: 'fake_bank_dump',
    title: 'L’agence propose de "gonfler" mon compte ou de me "prêter" des millions',
    dangerLevel: 'critical',
    description: 'Versement temporaire de 5 à 15 millions de FCFA juste avant le rendez-vous consulaire.',
    officialReality:
      'Les consulats vérifient la traçabilité des fonds sur 3 à 6 mois et recoupent auprès des sièges bancaires. Un dépôt soudain inexpliqué entraîne un refus catégorique pour faux justificatifs (Motif R216 Canada, Motif 2 Schengen) et 5 ans d’interdiction de territoire.',
  },
  {
    id: 'fake_job_contract',
    title: 'Vente d’un contrat de travail étranger sans entretien préalable',
    dangerLevel: 'high',
    description: 'Une agence vous propose un emploi payé 3 000 $ ou 2 500 € au Canada moyennant 2 à 4 millions de FCFA.',
    officialReality:
      'Au Canada (EIMT/LMIA) comme en Europe, un employeur authentique réalise systématiquement des entrevues d’embauche techniques. La vente de contrats de travail est une fraude passible de poursuites pénales.',
  },
  {
    id: 'turkey_fake_evisa',
    title: 'Promesse d’e-visa turc sans visa Schengen, USA ou UK valide',
    dangerLevel: 'critical',
    description: 'On vous assure pouvoir obtenir le e-visa en ligne pour la Turquie en 24h avec un passeport ouest-africain ordinaire.',
    officialReality:
      'Pour les ressortissants d’Afrique de l’Ouest, le E-Visa turc (evisa.gov.tr) exige OBLIGATOIREMENT un visa ou titre de séjour valide Schengen, USA, UK ou Irlande. Sans cela, vous serez refoulé dès l’embarquement à l’aéroport.',
  },
  {
    id: 'hidden_credentials',
    title: 'L’intermédiaire refuse de me donner les accès à mes comptes officiels',
    dangerLevel: 'high',
    description: 'L’agence crée un compte France-Visas, Campus France ou IRCC avec son propre email et refuse de vous communiquer les mots de passe.',
    officialReality:
      'C’est une technique de séquestration numérique utilisée pour exercer un chantage financier avant de vous remettre vos notifications officielles.',
  },
  {
    id: 'morocco_scam_fee',
    title: 'Faux frais de visa pour le Maroc ou faux sites d’e-Visa (Mali, Sénégal, Côte d’Ivoire...)',
    dangerLevel: 'critical',
    description: 'Une agence ou un site pirate vous facture un "visa d’entrée Maroc", une fausse dispense AEVM, ou surfacture le e-Visa ivoirien.',
    officialReality:
      'DÉSINFORMATION & ESCROQUERIE : 1) Pour les Maliens, Sénégalais, Béninois, etc., l’entrée est TOTALEMENT SANS VISA et GRATUITE (0 FCFA, 90 jours max, AEVM levée). Aucun visa n’existe ! 2) Pour les Ivoiriens, le e-Visa légal s’acquitte EXCLUSIVEMENT sur le portail d’État acces-maroc.ma au tarif officiel de 770 MAD (~52 000 FCFA). Tout site miroir ou intermédiaire réclamant 150 000 à 350 000 FCFA est une arnaque.',
  },
  {
    id: 'fake_hotel_booking',
    title: 'Fausses réservations d’hôtel ou d’avion annulées dans les 48h',
    dangerLevel: 'medium',
    description: 'L’agence vous fournit un faux document PDF d’hôtel sans paiement effectif.',
    officialReality:
      'Les consulats contactent directement les réceptions d’hôtels. En cas de réservation annulée ou inexistante, le dossier est rejeté pour fraude documentaire.',
  },
];

export const AntiScamRadar: React.FC = () => {
  const [selectedFlags, setSelectedFlags] = useState<Record<string, boolean>>({});

  const toggleFlag = (id: string) => {
    sound.tap();
    setSelectedFlags((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      if (next[id]) {
        sound.warning();
      }
      return next;
    });
  };

  const selectedCount = Object.values(selectedFlags).filter(Boolean).length;
  const criticalCount = SCAM_INDICATORS.filter(
    (item) => selectedFlags[item.id] && item.dangerLevel === 'critical'
  ).length;

  let riskScore = 0;
  if (criticalCount > 0) {
    riskScore = Math.min(60 + criticalCount * 15, 100);
  } else if (selectedCount > 0) {
    riskScore = selectedCount * 25;
  }

  let verdict = 'Aucun signal suspect sélectionné';
  let badgeColor = 'bg-slate-100 text-slate-700 border-slate-300';
  if (riskScore >= 60) {
    verdict = 'ALERTE ESCROQUERIE CONSULAIRE AVÉRÉE';
    badgeColor = 'bg-red-50 text-red-900 border-red-300';
  } else if (riskScore > 0) {
    verdict = 'SUSPICION ÉLEVÉE DE PRATIQUE FRAUDULEUSE';
    badgeColor = 'bg-amber-50 text-amber-900 border-amber-300';
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-8">
      {/* Editorial Header */}
      <div className="bg-white border border-slate-200 p-6 sm:p-8 space-y-3">
        <div className="flex items-center space-x-2 text-xs font-mono text-slate-500 uppercase tracking-wider">
          <span>SÉCURITÉ DU CANDIDAT</span>
          <span>•</span>
          <span>RÈGLES D'ÉTAT 2026</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-950">
          Vérifications Indispensables Avant Tout Paiement
        </h1>
        <p className="text-sm text-slate-600 max-w-2xl leading-relaxed">
          Une agence ou un intermédiaire vous réclame de l'argent ? Cochez les affirmations correspondantes pour évaluer la conformité légale de leur proposition.
        </p>
      </div>

      {/* Risk Assessment Verdict Bar */}
      <div className="bg-white border border-slate-200 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider">
            Niveau d'exposition au risque consulaire
          </span>
          <div className="flex items-baseline space-x-3">
            <span
              className={`text-3xl sm:text-4xl font-black font-mono tracking-tight ${
                riskScore >= 60 ? 'text-red-600' : riskScore > 0 ? 'text-amber-600' : 'text-slate-900'
              }`}
            >
              {riskScore}%
            </span>
            <span className={`text-xs font-bold uppercase tracking-wider px-2.5 py-1 border ${badgeColor}`}>
              {verdict}
            </span>
          </div>
        </div>

        {selectedCount > 0 && (
          <button
            onClick={() => {
              sound.tap();
              setSelectedFlags({});
            }}
            className="px-4 py-2 border border-slate-300 hover:border-slate-900 text-slate-700 hover:text-slate-950 text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer self-start sm:self-center"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Réinitialiser l'évaluation</span>
          </button>
        )}
      </div>

      {/* Structured Checklist of Flags */}
      <div className="space-y-3">
        {SCAM_INDICATORS.map((indicator) => {
          const isSelected = !!selectedFlags[indicator.id];
          const isCritical = indicator.dangerLevel === 'critical';

          return (
            <div
              key={indicator.id}
              onClick={() => toggleFlag(indicator.id)}
              className={`p-5 border transition-all cursor-pointer select-none ${
                isSelected
                  ? isCritical
                    ? 'border-red-400 bg-red-50/50'
                    : 'border-amber-400 bg-amber-50/50'
                  : 'border-slate-200 bg-white hover:border-slate-400'
              }`}
            >
              <div className="flex items-start space-x-3.5">
                {/* Checkbox indicator */}
                <div
                  className={`w-5 h-5 mt-0.5 border flex items-center justify-center flex-shrink-0 ${
                    isSelected
                      ? isCritical
                        ? 'border-red-600 bg-red-600 text-white'
                        : 'border-amber-600 bg-amber-600 text-white'
                      : 'border-slate-300 bg-white'
                  }`}
                >
                  {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>

                <div className="flex-1 space-y-1.5 min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-bold text-sm sm:text-base text-slate-950">
                      {indicator.title}
                    </span>
                    <span
                      className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 border ${
                        indicator.dangerLevel === 'critical'
                          ? 'bg-red-100 text-red-900 border-red-300'
                          : 'bg-amber-100 text-amber-900 border-amber-300'
                      }`}
                    >
                      {indicator.dangerLevel === 'critical' ? 'Fraude avérée' : 'Risque élevé'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    {indicator.description}
                  </p>

                  <div className="pt-2 border-t border-slate-200 text-xs text-slate-800 leading-relaxed">
                    <strong className="text-slate-950">Réalité réglementaire : </strong>
                    {indicator.officialReality}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Advisory Note */}
      <div className="p-5 border border-slate-200 bg-slate-50 text-xs text-slate-700 flex items-start space-x-3 leading-relaxed">
        <ShieldCheck className="w-5 h-5 text-emerald-700 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="font-bold text-slate-900">
            Principe fondamental de la procédure consulaire
          </div>
          <p>
            Un dossier sincère et transparent, même appuyé sur des revenus modestes mais traçables (bulletins de paie réguliers, attestations d'hébergement formelles, épargne stable), offre des probabilités d'acceptation infiniment supérieures à un dossier maquillé par une officine. La découverte d'une fausse pièce entraîne un refus irrémédiable assorti d'une interdiction de territoire de 5 ans.
          </p>
        </div>
      </div>
    </div>
  );
};
