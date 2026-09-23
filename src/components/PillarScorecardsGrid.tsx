import React from 'react';
import { ConsularPillarId } from '../types/assessment';
import { PillarScorecardData } from '../types/findingsPresentation';
import { PillarScorecard } from './PillarScorecard';

interface PillarScorecardsGridProps {
  scorecards: PillarScorecardData[];
  selectedPillarId: ConsularPillarId | 'all';
  onSelectPillar: (pillarId: ConsularPillarId | 'all') => void;
}

export const PillarScorecardsGrid: React.FC<PillarScorecardsGridProps> = ({
  scorecards,
  selectedPillarId,
  onSelectPillar,
}) => {
  return (
    <div id="pillar-scorecards-grid" className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-mono uppercase tracking-wider text-slate-500 font-bold">
          Les 5 Questions Clés de l’Instruction Consulaire
        </div>
        {selectedPillarId !== 'all' && (
          <button
            onClick={() => onSelectPillar('all')}
            className="text-xs text-slate-600 hover:text-slate-900 underline font-medium cursor-pointer"
          >
            Réinitialiser le filtre (Voir les 5 dimensions)
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {scorecards.map((scorecard) => (
          <PillarScorecard
            key={scorecard.pillarId}
            scorecard={scorecard}
            isSelected={selectedPillarId === scorecard.pillarId}
            onSelect={() => {
              if (selectedPillarId === scorecard.pillarId) {
                onSelectPillar('all');
              } else {
                onSelectPillar(scorecard.pillarId);
              }
            }}
          />
        ))}
      </div>
    </div>
  );
};
