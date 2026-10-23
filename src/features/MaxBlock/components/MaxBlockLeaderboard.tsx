// src/features/MaxBlock/components/MaxBlockLeaderboard.tsx
// [2026-10-23] - REFACTOR: Light Theme adaptiert (100% identisch zur Sudoku Hall of Fame), kompakteres Layout und Du-Highlighting.
// [2026-10-23] - FEATURE: Leaderboard (Hall of Fame) für MaxBlock. Sortiert nach Score > Level > Lines.
import React from 'react';
import { useClubStore } from '../../../store/useClubStore';

interface MaxBlockLeaderboardProps {
  currentUserId?: string;
}

export const MaxBlockLeaderboard: React.FC<MaxBlockLeaderboardProps> = ({ currentUserId }) => {
  const maxBlockScores = useClubStore(state => state.maxBlockScores || []);

  // Sortierung: 1. Score (absteigend), 2. Level (absteigend), 3. Lines (absteigend)
  const sortedScores = [...maxBlockScores].sort((a, b) => {
    if ((b.score || 0) !== (a.score || 0)) return (b.score || 0) - (a.score || 0);
    if ((b.level || 0) !== (a.level || 0)) return (b.level || 0) - (a.level || 0);
    return (b.lines || 0) - (a.lines || 0);
  });
  
  const top10 = sortedScores.slice(0, 10);

  const renderRank = (index: number) => {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return <span className="text-slate-500 font-semibold text-base">{index + 1}.</span>;
  };

  return (
    <div className="w-full bg-slate-50 rounded-2xl p-4 shadow-inner border border-slate-100">
      <h3 className="text-base font-bold text-slate-800 text-center mb-4 flex items-center justify-center gap-2">
        <span>🏆 Hall of Fame</span>
        <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full uppercase tracking-wider">Top {top10.length || 10}</span>
      </h3>
      
      {top10.length === 0 ? (
        <div className="text-center py-6 text-slate-400 text-sm">
          Noch keine Einträge in der Hall of Fame.<br/>Werde der erste Vereinsmeister!
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {top10.map((score, index) => {
            const isMe = score.userId === currentUserId;
            const dateStr = new Date(score.date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' });

            return (
              <div 
                key={score.id} 
                className={`flex items-center justify-between p-3 rounded-lg ${isMe ? 'bg-blue-50 border border-blue-200' : 'bg-white border border-slate-100 shadow-sm'}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-6 text-center text-lg">{renderRank(index)}</div>
                  <div className="flex flex-col">
                    <div className={`font-medium text-sm leading-tight ${isMe ? 'text-blue-800' : 'text-slate-700'}`}>
                      {score.userName} {isMe && <span className="text-[10px] text-blue-500 ml-1">(Du)</span>}
                    </div>
                    <div className="text-[10px] text-slate-400 font-medium">
                      {dateStr}
                    </div>
                  </div>
                </div>

                <div className="text-right flex flex-col items-end">
                  <div className={`font-mono font-black text-base leading-tight ${isMe ? 'text-blue-700' : 'text-slate-900'}`}>
                    {score.score}
                  </div>
                  <div className="text-[9px] text-slate-400 font-medium uppercase tracking-wider">
                    Lvl {score.level} • {score.lines} L
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
// --- END OF FILE ---
