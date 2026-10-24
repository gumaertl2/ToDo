// src/features/Sudoku/components/SudokuWinScreen.tsx
// [2026-10-24] - FEATURE: 'rescueCount' (Rettungsring-Einsätze) in der Strafzeit-Zusammenfassung auf dem Gewinnbildschirm ergänzt.
// [2026-10-23] - BUGFIX: 'gameMode' restlos aus dem SudokuWinScreenProps Interface entfernt, um TS2741 Fehler zu beheben.
import React, { useState } from 'react';
import { formatTime } from './SudokuLeaderboard';
import type { EvaluationResult } from '../utils/scoreEvaluator';

interface SudokuWinScreenProps {
  timer: number;
  penaltySeconds: number;
  errorCount: number;
  hintCount: number;
  rescueCount: number;
  hasUsedPause: boolean;
  evaluation: EvaluationResult;
  onClose: () => void;
  onRetroactiveSave: () => void;
}

export const SudokuWinScreen: React.FC<SudokuWinScreenProps> = ({
  timer,
  penaltySeconds,
  errorCount,
  hintCount,
  rescueCount,
  hasUsedPause,
  evaluation,
  onClose,
  onRetroactiveSave
}) => {
  const [hasSaved, setHasSaved] = useState(false);

  const handleSave = () => {
    setHasSaved(true);
    onRetroactiveSave();
  };

  // Dynamisches Icon basierend auf der Auswertung
  let icon = '🎉';
  if (evaluation.medal === 'gold') icon = '🏆';
  else if (evaluation.medal === 'silver') icon = '🥈';
  else if (evaluation.medal === 'bronze') icon = '🥉';
  else if (evaluation.rank <= 10 && !hasUsedPause) icon = '🏅';

  return (
    <div className="absolute inset-0 z-20 bg-emerald-600/95 backdrop-blur-sm flex flex-col items-center justify-center text-white p-6 text-center animate-in fade-in zoom-in duration-300">
      <span className="text-7xl mb-6 drop-shadow-lg animate-bounce">{icon}</span>
      
      <h2 className="text-4xl font-black mb-2 tracking-tight">Geschafft!</h2>
      
      <div className="bg-emerald-700/50 px-6 py-3 rounded-2xl mb-6 border border-emerald-500/50 shadow-inner">
        <p className="text-3xl font-mono font-bold">{formatTime(timer)}</p>
        {penaltySeconds > 0 ? (
          <p className="text-[10px] uppercase tracking-widest text-emerald-200 mt-1 font-bold">
            Inkl. {penaltySeconds}s Strafe ({errorCount} ❌, {rescueCount} 🛟, {hintCount} 💡)
          </p>
        ) : (
          <p className="text-[10px] uppercase tracking-widest text-emerald-200 mt-1 font-bold">
            ✨ Fehlerfrei & ohne Hilfe gelöst!
          </p>
        )}
      </div>

      <p className="text-lg font-medium mb-8 max-w-sm leading-relaxed text-emerald-50">
        {evaluation.message}
      </p>

      <div className="flex flex-col gap-3 w-full max-w-xs">
        {evaluation.canRetroactivelySave && !hasSaved && (
          <button 
            onClick={handleSave}
            className="w-full py-4 bg-amber-400 hover:bg-amber-300 text-amber-900 font-black text-lg rounded-xl shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2"
          >
            <span>✍️</span> In die Hall of Fame
          </button>
        )}

        {hasSaved && (
          <div className="w-full py-3 bg-emerald-500 text-white font-bold rounded-xl border border-emerald-400 flex items-center justify-center gap-2">
            <span>✅</span> Gespeichert!
          </div>
        )}

        <button 
          onClick={onClose}
          className={`w-full py-3 rounded-xl font-bold transition-transform active:scale-95 ${
            evaluation.canRetroactivelySave && !hasSaved
              ? 'bg-emerald-800 hover:bg-emerald-900 text-emerald-100' // Sekundär-Look, wenn der Retro-Button aktiv ist
              : 'bg-white text-emerald-700 hover:bg-emerald-50 shadow-md' // Primär-Look im Normalfall
          }`}
        >
          Zurück zur Übersicht
        </button>
      </div>
    </div>
  );
};
// --- END OF FILE ---
