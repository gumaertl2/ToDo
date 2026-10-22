// [2026-10-22] - FEATURE: SudokuControls UI. Ziffernblock in kompakter 9er-Reihe.
import React from 'react';

interface SudokuControlsProps {
  isNotesMode: boolean;
  onToggleNotes: () => void;
  onNumberInput: (num: number) => void;
  onClearCell: () => void;
  onHint: () => void;
  completedNumbers: number[];
  activeHighlightNumber: number | null;
  onToggleHighlight: (num: number) => void;
  hasSelectedCell: boolean;
  disabled?: boolean;
}

export const SudokuControls: React.FC<SudokuControlsProps> = ({
  isNotesMode,
  onToggleNotes,
  onNumberInput,
  onClearCell,
  onHint,
  completedNumbers,
  activeHighlightNumber,
  onToggleHighlight,
  hasSelectedCell,
  disabled = false
}) => {

  const handleNumberClick = (num: number) => {
    if (disabled) return;
    
    if (hasSelectedCell) {
      if (!completedNumbers.includes(num)) {
        onNumberInput(num);
      }
    } else {
      onToggleHighlight(num);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto mt-4 sm:mt-6 flex flex-col gap-3">
      {/* WERKZEUG-LEISTE (Löschen, Joker, Bleistift) */}
      <div className="flex justify-between gap-2 px-1">
        <button
          onClick={onClearCell}
          disabled={disabled || !hasSelectedCell}
          className="flex-1 flex flex-col items-center justify-center py-2 bg-slate-100 rounded-xl active:bg-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ touchAction: 'manipulation' }}
        >
          <span className="text-lg sm:text-xl mb-0.5">🗑️</span>
          <span className="text-[11px] font-semibold text-slate-600">Löschen</span>
        </button>

        <button
          onClick={onHint}
          disabled={disabled || !hasSelectedCell}
          className="flex-1 flex flex-col items-center justify-center py-2 bg-slate-100 rounded-xl active:bg-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed relative"
          style={{ touchAction: 'manipulation' }}
        >
          <span className="text-lg sm:text-xl mb-0.5">💡</span>
          <span className="text-[11px] font-semibold text-slate-600">Tipp (+60s)</span>
          <div className="absolute top-1 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
        </button>

        <button
          onClick={onToggleNotes}
          disabled={disabled}
          className={`flex-1 flex flex-col items-center justify-center py-2 rounded-xl transition-colors ${
            isNotesMode ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 active:bg-slate-200'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
          style={{ touchAction: 'manipulation' }}
        >
          <span className="text-lg sm:text-xl mb-0.5">✏️</span>
          <span className={`text-[11px] font-semibold ${isNotesMode ? 'text-white' : 'text-slate-600'}`}>Notizen</span>
        </button>
      </div>

      {/* ZIFFERNBLOCK (1-9 in einer einzigen Reihe) */}
      <div className="grid grid-cols-9 gap-1.5 px-1">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => {
          const isCompleted = completedNumbers.includes(num);
          const isHighlighted = activeHighlightNumber === num;
          
          let btnClass = "bg-white border-2 border-slate-200 text-slate-800 active:bg-slate-100 shadow-sm";
          
          if (isHighlighted) {
            btnClass = "bg-yellow-200 border-yellow-400 text-slate-900";
          } else if (isCompleted) {
            btnClass = "bg-slate-50 border-slate-100 text-slate-300 opacity-50";
          } else if (isNotesMode && hasSelectedCell) {
            btnClass = "bg-blue-50 border-blue-200 text-blue-700";
          }

          return (
            <button
              key={num}
              onClick={() => handleNumberClick(num)}
              disabled={disabled}
              className={`h-12 sm:h-14 flex items-center justify-center rounded-xl text-xl sm:text-2xl font-bold transition-all ${btnClass}`}
              style={{ touchAction: 'manipulation' }}
            >
              {num}
            </button>
          );
        })}
      </div>
    </div>
  );
};
// --- END OF FILE ---
