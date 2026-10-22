// src/features/Sudoku/components/SudokuBoard.tsx
// [2026-10-22] - FEATURE: Originales SudokuBoard UI mit Papier-Style Rand-Notizen für Zeilen und Spalten wiederhergestellt.
import React from 'react';
import type { CellData } from '../hooks/useSudokuGame';

interface SudokuBoardProps {
  board: CellData[];
  selectedCell: number | null;
  activeHighlightNumber: number | null;
  onSelectCell: (index: number) => void;
  disabled?: boolean;
  activeRowMemos: number[];
  activeColMemos: number[];
  missingInRows: Record<number, number[]>;
  missingInCols: Record<number, number[]>;
  onToggleRowMemo: (row: number) => void;
  onToggleColMemo: (col: number) => void;
}

export const SudokuBoard: React.FC<SudokuBoardProps> = ({
  board,
  selectedCell,
  activeHighlightNumber,
  onSelectCell,
  disabled = false,
  activeRowMemos,
  activeColMemos,
  missingInRows,
  missingInCols,
  onToggleRowMemo,
  onToggleColMemo,
}) => {
  const selectedRow = selectedCell !== null ? Math.floor(selectedCell / 9) : null;
  const selectedCol = selectedCell !== null ? selectedCell % 9 : null;
  const selectedBlock = selectedCell !== null ? Math.floor(selectedRow! / 3) * 3 + Math.floor(selectedCol! / 3) : null;

  return (
    <div className="w-full max-w-lg mx-auto flex flex-col items-center select-none">
      {/* OBERER RAND: Spalten-Memos (0 bis 8) - Exakt über dem Spielfeld ausgerichtet */}
      <div className="w-full grid grid-cols-9 gap-px pl-12 pr-12 sm:pr-12 mb-1">
        {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((colIndex) => {
          const isActive = activeColMemos.includes(colIndex);
          const missing = missingInCols[colIndex] || [];
          return (
            <div
              key={`col-memo-${colIndex}`}
              onClick={() => onToggleColMemo(colIndex)}
              className={`h-12 flex flex-col items-center justify-center rounded cursor-pointer transition-colors text-[9px] font-mono leading-tight ${
                isActive ? 'bg-amber-100 border border-amber-300 text-amber-800' : 'bg-slate-200/60 hover:bg-slate-200 text-slate-400'
              }`}
              title="Klick für Spalten-Notiz"
            >
              {isActive ? (
                <div className="grid grid-cols-3 gap-0.5 text-[8px] font-bold">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                    <span key={n} className={missing.includes(n) ? 'opacity-100 text-amber-900' : 'opacity-20 text-slate-400'}>
                      {n}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-xs">↕ {colIndex + 1}</span>
              )}
            </div>
          );
        })}
      </div>

      {/* MITTLERER BEREICH: Linker Rand + 9x9 Gitter + Rechter Rand */}
      <div className="w-full flex items-stretch gap-1">
        {/* LINKER RAND: Zeilen-Memos (0 bis 8) */}
        <div className="w-12 flex flex-col gap-px">
          {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((rowIndex) => {
            const isActive = activeRowMemos.includes(rowIndex);
            const missing = missingInRows[rowIndex] || [];
            return (
              <div
                key={`row-memo-l-${rowIndex}`}
                onClick={() => onToggleRowMemo(rowIndex)}
                className={`flex-1 flex items-center justify-center rounded cursor-pointer transition-colors text-[9px] font-mono ${
                  isActive ? 'bg-amber-100 border border-amber-300 text-amber-800 p-0.5' : 'bg-slate-200/60 hover:bg-slate-200 text-slate-400'
                }`}
                title="Klick für Zeilen-Notiz"
              >
                {isActive ? (
                  <div className="grid grid-cols-3 gap-0.5 text-[8px] font-bold text-center leading-none">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                      <span key={n} className={missing.includes(n) ? 'opacity-100 text-amber-900' : 'opacity-20 text-slate-400'}>
                        {n}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-[10px]">↔ {rowIndex + 1}</span>
                )}
              </div>
            );
          })}
        </div>

        {/* DAS 9x9 SPIELFELD */}
        <div className="flex-1 aspect-square bg-slate-300 border-4 border-slate-800 grid grid-cols-9 grid-rows-9 gap-px p-px">
          {board.map((cell) => {
            const isSelected = cell.index === selectedCell;
            const isCrosshair = !isSelected && selectedCell !== null && (cell.row === selectedRow || cell.col === selectedCol || cell.block === selectedBlock);
            const isHighlightedNumber = activeHighlightNumber !== null && cell.value === activeHighlightNumber;
            
            let bgClass = 'bg-white';
            if (cell.isConflict) {
              bgClass = 'bg-red-200';
            } else if (isSelected) {
              bgClass = 'bg-blue-300';
            } else if (isHighlightedNumber) {
              bgClass = 'bg-yellow-200';
            } else if (isCrosshair) {
              bgClass = 'bg-blue-50';
            }

            let textClass = 'text-slate-900';
            if (cell.isConflict) {
              textClass = 'text-red-600 font-bold';
            } else if (cell.isFixed) {
              textClass = 'text-slate-800 font-black';
            } else {
              textClass = 'text-blue-600 font-medium';
            }

            const borderRight = cell.col === 2 || cell.col === 5 ? 'border-r-2 border-slate-800' : '';
            const borderBottom = cell.row === 2 || cell.row === 5 ? 'border-b-2 border-slate-800' : '';

            return (
              <div
                key={cell.index}
                onClick={() => !disabled && onSelectCell(cell.index)}
                className={`relative flex items-center justify-center cursor-pointer select-none text-xl sm:text-2xl ${bgClass} ${textClass} ${borderRight} ${borderBottom}`}
                style={{ touchAction: 'manipulation' }}
              >
                {cell.value ? (
                  <span>{cell.value}</span>
                ) : (
                  cell.notes.length > 0 && (
                    <div className="absolute inset-0.5 grid grid-cols-3 grid-rows-3 text-[9px] sm:text-[10px] leading-none font-normal text-slate-500">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                        <div key={n} className="flex items-center justify-center">
                          {cell.notes.includes(n) ? n : ''}
                        </div>
                      ))}
                    </div>
                  )
                )}
              </div>
            );
          })}
        </div>

        {/* RECHTER RAND: Zeilen-Memos (für größere Displays) */}
        <div className="w-12 hidden sm:flex flex-col gap-px">
          {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((rowIndex) => {
            const isActive = activeRowMemos.includes(rowIndex);
            const missing = missingInRows[rowIndex] || [];
            return (
              <div
                key={`row-memo-r-${rowIndex}`}
                onClick={() => onToggleRowMemo(rowIndex)}
                className={`flex-1 flex items-center justify-center rounded cursor-pointer transition-colors text-[9px] font-mono ${
                  isActive ? 'bg-amber-100 border border-amber-300 text-amber-800 p-0.5' : 'bg-slate-200/60 hover:bg-slate-200 text-slate-400'
                }`}
                title="Klick für Zeilen-Notiz"
              >
                {isActive ? (
                  <div className="grid grid-cols-3 gap-0.5 text-[8px] font-bold text-center leading-none">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                      <span key={n} className={missing.includes(n) ? 'opacity-100 text-amber-900' : 'opacity-20 text-slate-400'}>
                        {n}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-[10px]">↔ {rowIndex + 1}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
// --- END OF FILE ---
