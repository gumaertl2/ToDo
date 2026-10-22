// [2026-10-22] - FIX: Import von SudokuDifficulty auf 'type' umgestellt, um Vite SyntaxError beim Build zu beheben.
// [2026-10-22] - FEATURE: SudokuLeaderboard UI. Zeigt die Top 10 Rangliste pro Schwierigkeitsgrad, den Sticky-Rank für den aktuellen Nutzer und den geschützten Admin-Saison-Reset.
import React from 'react';
import type { SudokuDifficulty } from '../hooks/useSudokuGame';

export interface LeaderboardEntry {
  id: string;
  userId: string;
  userName: string;
  timeInSeconds: number;
  date: number;
}

interface SudokuLeaderboardProps {
  scores: LeaderboardEntry[];
  currentUserId?: string;
  difficulty: SudokuDifficulty;
  onDifficultyChange: (diff: SudokuDifficulty) => void;
  isAdmin: boolean;
  onResetSeason: (difficulty: SudokuDifficulty) => void;
}

export const formatTime = (totalSeconds: number) => {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

export const SudokuLeaderboard: React.FC<SudokuLeaderboardProps> = ({
  scores,
  currentUserId,
  difficulty,
  onDifficultyChange,
  isAdmin,
  onResetSeason
}) => {
  // Sortierung: Schnellste Zeit zuerst
  const sortedScores = [...scores].sort((a, b) => a.timeInSeconds - b.timeInSeconds);
  const top10 = sortedScores.slice(0, 10);
  
  // Finde den Rang des aktuellen Nutzers (bestes Ergebnis)
  const myRankIndex = sortedScores.findIndex(s => s.userId === currentUserId);
  const myBestScore = myRankIndex !== -1 ? sortedScores[myRankIndex] : null;
  const isNotInTop10 = myRankIndex >= 10;

  const renderRank = (index: number) => {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return <span className="text-slate-500 font-semibold">{index + 1}.</span>;
  };

  const renderRow = (entry: LeaderboardEntry, index: number, isSticky = false) => {
    const isMe = entry.userId === currentUserId;
    return (
      <div 
        key={isSticky ? `sticky-${entry.id}` : entry.id}
        className={`flex items-center justify-between p-3 rounded-lg ${isMe ? 'bg-blue-50 border border-blue-200' : 'bg-white border border-slate-100'}`}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 text-center text-lg">{renderRank(index)}</div>
          <div className={`font-medium ${isMe ? 'text-blue-800' : 'text-slate-700'}`}>
            {entry.userName} {isMe && <span className="text-xs text-blue-500 ml-1">(Du)</span>}
          </div>
        </div>
        <div className={`font-mono font-bold ${isMe ? 'text-blue-700' : 'text-slate-900'}`}>
          {formatTime(entry.timeInSeconds)}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full max-w-md mx-auto mt-6 bg-slate-50 rounded-2xl p-4 shadow-inner">
      <h3 className="text-lg font-bold text-slate-800 text-center mb-4">🏆 Hall of Fame</h3>
      
      {/* TABS für Schwierigkeitsgrade */}
      <div className="flex bg-slate-200 p-1 rounded-xl mb-4">
        {[
          { id: 'easy', label: 'Leicht' },
          { id: 'medium', label: 'Mittel' },
          { id: 'hard', label: 'Schwer' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => onDifficultyChange(tab.id as SudokuDifficulty)}
            className={`flex-1 text-sm font-semibold py-2 rounded-lg transition-all ${
              difficulty === tab.id 
                ? 'bg-white text-blue-700 shadow-sm' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TOP 10 LISTE */}
      <div className="flex flex-col gap-2 mb-2">
        {top10.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-sm">
            Noch keine Rekorde in dieser Kategorie.<br/>Sei der Erste!
          </div>
        ) : (
          top10.map((score, idx) => renderRow(score, idx))
        )}
      </div>

      {/* STICKY RANK (Falls nicht in den Top 10) */}
      {isNotInTop10 && myBestScore && (
        <>
          <div className="flex items-center justify-center my-2 text-slate-300">
            <span className="text-xl">⋮</span>
          </div>
          {renderRow(myBestScore, myRankIndex, true)}
        </>
      )}

      {/* ADMIN BEREICH */}
      {isAdmin && (
        <div className="mt-8 pt-4 border-t border-slate-200 flex justify-center">
          <button
            onClick={() => {
              if (window.confirm('Möchtest du die Rangliste für diese Schwierigkeit wirklich zurücksetzen? Die aktuellen Zeiten werden archiviert (Saison-Neustart).')) {
                onResetSeason(difficulty);
              }
            }}
            className="text-xs font-semibold text-red-500 hover:text-red-700 px-4 py-2 bg-red-50 rounded-lg transition-colors"
          >
            ⚠️ Saison zurücksetzen ({difficulty === 'easy' ? 'Leicht' : difficulty === 'medium' ? 'Mittel' : 'Schwer'})
          </button>
        </div>
      )}
    </div>
  );
};
// --- END OF FILE ---
