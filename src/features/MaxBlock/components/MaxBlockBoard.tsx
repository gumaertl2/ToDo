// src/features/MaxBlock/components/MaxBlockBoard.tsx
// [2026-10-23] - FEATURE: Option 'showGhost' hinzugefügt, um den Geisterblock im Wettkampf-Modus auszublenden.
// [2026-10-23] - BUGFIX: Type-Only Imports für BlockType hinzugefügt.
// [2026-10-23] - FEATURE: Visuelles Grid-System für MaxBlock, inkl. Active-Piece und Ghost-Schatten.
import React from 'react';
import type { BoardState, ActiveBlock, GameStatus } from '../hooks/useMaxBlockGame';
import { BOARD_WIDTH, BOARD_HEIGHT } from '../hooks/useMaxBlockGame';
import { BLOCKS } from '../utils/blocks';
import type { BlockType } from '../utils/blocks';

type CellValue = BoardState[number][number];
type RenderCell = CellValue | `GHOST_${BlockType}`;

interface MaxBlockBoardProps {
  board: BoardState;
  activeBlock: ActiveBlock | null;
  getGhostPieceY: () => number;
  status: GameStatus;
  showGhost: boolean; // <-- NEU
}

export const MaxBlockBoard: React.FC<MaxBlockBoardProps> = ({
  board,
  activeBlock,
  getGhostPieceY,
  status,
  showGhost
}) => {
  const renderBoard: RenderCell[][] = board.map(row => [...row]);

  if (activeBlock && status !== 'gameover') {
    
    // 1. Ghost Piece einzeichnen (Schatten) - NUR im Übungsmodus (showGhost === true)
    if (showGhost) {
      const ghostY = getGhostPieceY();
      activeBlock.shape.forEach((row, y) => {
        row.forEach((value, x) => {
          if (value !== 0) {
            const bY = ghostY + y;
            const bX = activeBlock.x + x;
            if (bY >= 0 && bY < BOARD_HEIGHT && bX >= 0 && bX < BOARD_WIDTH) {
               renderBoard[bY][bX] = `GHOST_${activeBlock.type}`;
            }
          }
        });
      });
    }

    // 2. Active Piece einzeichnen (übermalt den Schatten, falls sie sich überlappen)
    activeBlock.shape.forEach((row, y) => {
      row.forEach((value, x) => {
        if (value !== 0) {
          const bY = activeBlock.y + y;
          const bX = activeBlock.x + x;
          if (bY >= 0 && bY < BOARD_HEIGHT && bX >= 0 && bX < BOARD_WIDTH) {
            renderBoard[bY][bX] = activeBlock.type;
          }
        }
      });
    });
  }

  const getCellClasses = (cellValue: RenderCell) => {
    if (cellValue === 'EMPTY') return 'bg-slate-900 border-slate-800/30';
    
    if (cellValue.startsWith('GHOST_')) {
      const type = cellValue.replace('GHOST_', '') as BlockType;
      const baseColor = BLOCKS[type].color.split(' ')[0]; 
      return `${baseColor} opacity-25 border-white/40 border-[1px] shadow-none`;
    }

    const type = cellValue as BlockType;
    return `${BLOCKS[type].color} border-[1px]`;
  };

  return (
    <div className="relative w-full max-w-[320px] mx-auto aspect-[1/2] bg-slate-900 border-4 border-slate-800 rounded-lg overflow-hidden shadow-2xl">
      <div 
        className="w-full h-full grid"
        style={{ 
          gridTemplateColumns: `repeat(${BOARD_WIDTH}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${BOARD_HEIGHT}, minmax(0, 1fr))`
        }}
      >
        {renderBoard.map((row, y) => (
          row.map((cell, x) => (
            <div 
              key={`${y}-${x}`}
              className={`w-full h-full box-border transition-all duration-75 ${getCellClasses(cell)}`}
            />
          ))
        ))}
      </div>

      {status === 'gameover' && (
        <div className="absolute inset-0 z-10 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center p-4">
          <h2 className="text-4xl font-black text-rose-500 mb-2 drop-shadow-lg tracking-widest uppercase">
            Game Over
          </h2>
          <div className="w-12 h-1 bg-rose-500 rounded-full mb-4"></div>
          <p className="text-slate-300 font-medium">Turm zu hoch gebaut!</p>
        </div>
      )}
    </div>
  );
};
// --- END OF FILE ---
