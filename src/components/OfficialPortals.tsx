import React from 'react';
import { ExternalLink, ShieldCheck, Globe, Building2, AlertCircle } from 'lucide-react';
import { sound } from '../utils/feedback';

interface OfficialPortal {
  country: string;
  name: string;
  category: string;
  url: string;
  description: string;
  centersWestAfrica: string;
}

const OFFICIAL_PORTALS: OfficialPortal[] = [
  {
    country: '🇫🇷 France / Schengen',
    name: 'France-Visas',
    category: 'Portail Unique de Demande Officielle',
    url: 'https://france-visas.gouv.fr',
    description: 'Le seul portail officiel pour initier toute demande de visa court ou long séjour pour la France.',
    centersWestAfrica: 'Dépôts délégués à TLScontact (Dakar, Abidjan, Douala/Yaoundé), Capago (Cotonou, Lomé, Bamako), ou Consulat direct.',
  },
  {
    country: '🇫🇷 France (Étudiants)',
    name: 'Campus France (EEF - Études en France)',
    category: 'Validation Académique Préalable Obligatoire',
    url: 'https://pastel.diplomatie.gouv.fr/etudesenfrance',
    description: 'Procédure incontournable d’évaluation pédagogique pour les étudiants avant toute demande de visa VLS-TS.',
    centersWestAfrica: 'Espaces Campus France : Dakar, Abidjan, Cotonou, Lomé, Ouagadougou, Niamey, Bamako, Conakry, Yaoundé.',
  },
  {
    country: '🇨🇦 Canada',
    name: 'IRCC (Immigration, Réfugiés et Citoyenneté Canada)',
    category: 'Portail Fédéral Canadien',
    url: 'https://www.canada.ca/fr/immigration-refugies-citoyennete.html',
    description: 'Dépôt direct de la demande de permis d’études ou visa visiteur sans passer par aucun tiers non agréé.',
    centersWestAfrica: 'CRDV (Centres de Réception des Demandes de Visa) gérés par VFS Global à Dakar, Abidjan, Yaoundé.',
  },
  {
    country: '🇲🇦 Maroc',
    name: 'Acces-Maroc (Ministère des Affaires Étrangères)',
    category: 'Portail Unique AEVM & E-Visa',
    url: 'https://www.acces-maroc.ma',
    description: 'Portail d’État officiel pour le e-Visa (ex: Côte d’Ivoire, 770 MAD / ~52 000 FCFA) et l’AEVM gratuite (Guinée, Congo). Attention : Mali et Sénégal sont totalement exemptés de visa et d’AEVM.',
    centersWestAfrica: 'Démarche 100% en ligne sur acces-maroc.ma. Aucun intermédiaire nécessaire.',
  },
  {
    country: '🇹🇷 Turquie',
    name: 'Portail Officiel E-Visa République de Turquie',
    category: 'E-Visa Sécurisé (Sous Conditions)',
    url: 'https://www.evisa.gov.tr',
    description: 'Réservé UNIQUEMENT aux détenteurs d’un visa Schengen, USA, UK ou Irlande valide.',
    centersWestAfrica: 'Sans visa Schengen/USA valide, dépôt obligatoire au centre physique Gateway Globe ou à l’ambassade.',
  },
  {
    country: '🇦🇪 Émirats Arabes Unis',
    name: 'GDRFA Dubaï (General Directorate of Residency and Foreigners Affairs)',
    category: 'E-Visa Visiteur / Tourisme',
    url: 'https://www.gdrfad.gov.ae',
    description: 'Vérification et demande officielle directe de visa d’entrée à Dubaï.',
    centersWestAfrica: 'Procédure en ligne ou via les compagnies aériennes officielles (Emirates, flydubai).',
  },
];

export const OfficialPortals: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-8">
      {/* Editorial Header */}
      <div className="bg-white border border-slate-200 p-6 sm:p-8 space-y-3">
        <div className="flex items-center space-x-2 text-xs font-mono text-slate-500 uppercase tracking-wider">
          <span>CANAUX SOUVERAINS</span>
          <span>•</span>
          <span>LIENS DIRECTS</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-950">
          Portails Gouvernementaux & Guichets Accrédités
        </h1>
        <p className="text-sm text-slate-600 max-w-2xl leading-relaxed">
          Pour vous prémunir contre les sites miroirs frauduleux et les fausses plateformes d'intermédiaires, utilisez exclusivement ces accès officiels d'États.
        </p>
      </div>

      {/* Structured Cards List */}
      <div className="space-y-4">
        {OFFICIAL_PORTALS.map((portal) => (
          <div
            key={portal.name}
            className="bg-white border border-slate-200 p-5 sm:p-6 space-y-3 hover:border-slate-400 transition-colors"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-slate-500">{portal.country}</span>
                  <span className="text-slate-300">•</span>
                  <span className="text-xs font-mono font-semibold text-slate-600">{portal.category}</span>
                </div>
                <h2 className="text-lg font-bold text-slate-950 mt-0.5">{portal.name}</h2>
              </div>

              <a
                href={portal.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => sound.tap()}
                className="inline-flex items-center space-x-2 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold uppercase tracking-wider transition-colors self-start sm:self-center"
              >
                <span>Accéder au site officiel</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            <p className="text-xs text-slate-700 leading-relaxed">
              {portal.description}
            </p>

            <div className="text-[11px] text-slate-500 bg-slate-50 p-2.5 border border-slate-200 flex items-start space-x-2">
              <Building2 className="w-3.5 h-3.5 text-slate-600 flex-shrink-0 mt-0.5" />
              <span><strong>Centres et relais :</strong> {portal.centersWestAfrica}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
