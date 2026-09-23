import React, { useState, useMemo } from 'react';
import { Search, X, Globe, Check, ShieldCheck, ExternalLink } from 'lucide-react';
import { WORLD_DESTINATIONS, WorldDestination } from '../data/worldDestinations';
import { sound } from '../utils/feedback';

interface OtherCountriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCountry: (destination: WorldDestination) => void;
  selectedDestinationName?: string;
}

export const OtherCountriesModal: React.FC<OtherCountriesModalProps> = ({
  isOpen,
  onClose,
  onSelectCountry,
  selectedDestinationName,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContinent, setSelectedContinent] = useState<string>('Tous');

  const continents = ['Tous', 'Europe', 'Amériques', 'Asie & Moyen-Orient', 'Afrique', 'Océanie'];

  const filteredCountries = useMemo(() => {
    return WORLD_DESTINATIONS.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.popularVisaType.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.continent.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesContinent =
        selectedContinent === 'Tous' || item.continent === selectedContinent;
      return matchesSearch && matchesContinent;
    });
  }, [searchQuery, selectedContinent]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                Catalogue Consulaire Mondial (2026)
              </h2>
              <p className="text-xs text-slate-500">
                Sélectionnez votre destination pour charger les critères et portails officiels d’État
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              sound.tap();
              onClose();
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Continent Filters */}
        <div className="p-3 sm:p-4 border-b border-slate-100 space-y-2.5 bg-white">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher un pays (ex: Royaume-Uni, États-Unis, Allemagne, Japon...)"
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all placeholder:text-slate-400 placeholder:font-normal"
              autoFocus
            />
          </div>

          {/* Continent Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
            {continents.map((cont) => (
              <button
                key={cont}
                type="button"
                onClick={() => {
                  sound.tap();
                  setSelectedContinent(cont);
                }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all ${
                  selectedContinent === cont
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                }`}
              >
                {cont}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable Countries List */}
        <div className="p-3 sm:p-4 overflow-y-auto flex-1 divide-y divide-slate-100 space-y-1">
          {filteredCountries.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <Globe className="w-10 h-10 mx-auto text-slate-300 stroke-1" />
              <p className="text-sm font-semibold text-slate-600">Aucun pays trouvé pour "{searchQuery}"</p>
              <p className="text-xs text-slate-400">
                Vous pouvez saisir librement le nom de votre destination.
              </p>
              <button
                type="button"
                onClick={() => {
                  onSelectCountry({
                    id: 'autre_libre',
                    name: searchQuery.trim(),
                    flag: '🌍',
                    continent: 'Europe',
                    popularVisaType: 'Visa officiel selon ambassade compétente',
                    officialPortal: 'Portail consulaire officiel d’État',
                    keyRule: 'Standard consulaire international : justification des ressources et attaches au pays d’origine.',
                  });
                  onClose();
                }}
                className="mt-2 px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700"
              >
                Choisir "{searchQuery}" comme destination
              </button>
            </div>
          ) : (
            filteredCountries.map((dest) => {
              const isSelected = selectedDestinationName === dest.name;
              return (
                <div
                  key={dest.id}
                  onClick={() => {
                    sound.tap();
                    onSelectCountry(dest);
                    onClose();
                  }}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-3 group ${
                    isSelected
                      ? 'bg-emerald-50/90 border-emerald-400 shadow-xs'
                      : 'hover:bg-slate-50 border-transparent hover:border-slate-200'
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <span className="text-2xl select-none shrink-0 mt-0.5">{dest.flag}</span>
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-sm text-slate-900 group-hover:text-emerald-950">
                          {dest.name}
                        </span>
                        <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                          {dest.continent}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 font-medium">
                        {dest.popularVisaType}
                      </p>
                      <div className="text-[11px] text-slate-500 flex items-center space-x-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="line-clamp-1">{dest.keyRule}</span>
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center space-x-1.5">
                    {isSelected ? (
                      <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    ) : (
                      <span className="text-xs font-bold text-emerald-700 opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-1">
                        <span>Choisir</span>
                        <Check className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between text-xs text-slate-500">
          <span>{filteredCountries.length} destination(s) disponible(s)</span>
          <button
            type="button"
            onClick={() => {
              sound.tap();
              onClose();
            }}
            className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-lg transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
