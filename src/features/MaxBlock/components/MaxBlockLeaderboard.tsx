// src/features/MaxBlock/components/MaxBlockLeaderboard.tsx
// [2026-10-23] - FEATURE: Leaderboard (Hall of Fame) für MaxBlock. Sortiert nach Score > Level > Lines.
import React from 'react';
import { useClubStore } from '../../../store/useClubStore';

export const MaxBlockLeaderboard: React.FC = () => {
  const maxBlockScores = useClubStore(state => state.maxBlockScores);

  // Sortierung: 1. Score (absteigend), 2. Level (absteigend), 3. Lines (absteigend)
  const sortedScores = [...maxBlockScores].sort((a, b) => {
    if ((b.score || 0) !== (a.score || 0)) return (b.score || 0) - (a.score || 0);
    if ((b.level || 0) !== (a.level || 0)) return (b.level || 0) - (a.level || 0);
    return (b.lines || 0) - (a.lines || 0);
  });

  if (sortedScores.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center shadow-xl w-full max-w-sm">
        <p className="text-slate-400 font-medium">Noch keine Einträge in der Hall of Fame.</p>
        <p className="text-sm text-slate-500 mt-2">Werde der erste Vereinsmeister!</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl w-full max-w-sm">
      <div className="bg-slate-800/50 p-4 border-b border-slate-700/50">
        <h2 className="font-black text-lg text-white flex items-center justify-between">
          <span>🏆 Hall of Fame</span>
          <span className="text-xs font-bold bg-slate-700 text-slate-300 px-2 py-1 rounded-full uppercase tracking-wider">
            Top {sortedScores.length}
          </span>
        </h2>
      </div>
      
      <div className="max-h-[300px] overflow-y-auto">
        {sortedScores.map((score, index) => {
          let medal = '';
          if (index === 0) medal = '🥇';
          else if (index === 1) medal = '🥈';
          else if (index === 2) medal = '🥉';

          const dateStr = new Date(score.date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' });

          return (
            <div 
              key={score.id} 
              className={`flex items-center p-4 border-b border-slate-800/50 last:border-b-0 transition-colors hover:bg-slate-800/30 ${index === 0 ? 'bg-amber-900/10' : ''}`}
            >
              <div className="w-8 text-center font-black text-xl mr-3">
                {medal ? medal : <span className="text-slate-500 text-base">{index + 1}.</span>}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="font-bold text-slate-200 truncate text-base leading-tight">
                  {score.userName}
                </div>
                <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                  {dateStr}
                </div>
              </div>

              <div className="text-right flex flex-col items-end pl-3">
                <div className="font-mono font-black text-emerald-400 text-lg leading-tight">
                  {score.score}
                </div>
                <div className="text-[11px] text-slate-400 font-medium uppercase tracking-wider mt-0.5">
                  Lvl {score.level} • {score.lines} L
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
// --- END OF FILE ---
