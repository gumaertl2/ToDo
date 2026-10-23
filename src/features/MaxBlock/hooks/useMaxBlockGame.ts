// src/features/MaxBlock/hooks/useMaxBlockGame.ts
// [2026-10-23] - BUGFIX: Hard-Drop-Logik korrigiert (setzt den Stein jetzt verlässlich und augenblicklich auf den Boden/Grund).
// [2026-10-23] - TWEAK: Level-Geschwindigkeiten (dropTime) für Level 5 und Level 10 feinjustiert (flüssige Kurve).
// [2026-10-23] - FEATURE: variables Start-Level (startLevel) implementiert.
import { useState, useEffect, useCallback } from 'react';
import { BLOCKS, generateBlockBag } from '../utils/blocks';
import type { BlockType } from '../utils/blocks';

export const BOARD_WIDTH = 10;
export const BOARD_HEIGHT = 20;

export type CellValue = BlockType | 'EMPTY';
export type BoardState = CellValue[][];

export interface ActiveBlock {
  type: BlockType;
  shape: number[][];
  x: number;
  y: number;
}

export type GameStatus = 'idle' | 'playing' | 'paused' | 'gameover';

const createEmptyBoard = (): BoardState =>
  Array.from({ length: BOARD_HEIGHT }, () => Array(BOARD_WIDTH).fill('EMPTY'));

export const useMaxBlockGame = () => {
  const [board, setBoard] = useState<BoardState>(createEmptyBoard());
  const [activeBlock, setActiveBlock] = useState<ActiveBlock | null>(null);
  const [nextBlocks, setNextBlocks] = useState<BlockType[]>([]);
  const [status, setStatus] = useState<GameStatus>('idle');
  const [score, setScore] = useState<number>(0);
  const [lines, setLines] = useState<number>(0);
  const [level, setLevel] = useState<number>(1);
  const [initialLevel, setInitialLevel] = useState<number>(1);

  // Feinjustierte Fallgeschwindigkeit (sanftere Kurve: Level 1 ~800ms, Level 5 ~400ms, Level 10 ~150ms)
  const dropTime = status === 'playing' ? Math.max(80, Math.floor(850 * Math.pow(0.85, level - 1))) : null;

  const checkCollision = useCallback((shape: number[][], targetX: number, targetY: number, currentBoard: BoardState): boolean => {
    for (let y = 0; y < shape.length; y++) {
      for (let x = 0; x < shape[y].length; x++) {
        if (shape[y][x] !== 0) {
          const newY = targetY + y;
          const newX = targetX + x;
          
          if (newX < 0 || newX >= BOARD_WIDTH || newY >= BOARD_HEIGHT) {
            return true;
          }
          if (newY >= 0 && currentBoard[newY][newX] !== 'EMPTY') {
            return true;
          }
        }
      }
    }
    return false;
  }, []);

  const spawnBlock = useCallback((currentNextBlocks: BlockType[]) => {
    let bag = [...currentNextBlocks];
    if (bag.length < 4) {
      bag = [...bag, ...generateBlockBag()];
    }
    const nextType = bag.shift()!;
    setNextBlocks(bag);

    const shape = BLOCKS[nextType].shape;
    const newBlock: ActiveBlock = {
      type: nextType,
      shape,
      x: Math.floor(BOARD_WIDTH / 2) - Math.floor(shape[0].length / 2),
      y: -shape.length
    };

    setActiveBlock(newBlock);
    return newBlock;
  }, []);

  const clearLinesAndScore = useCallback((currentBoard: BoardState, currentLevel: number) => {
    let linesCleared = 0;
    const newBoard = currentBoard.filter(row => {
      const isLineFull = row.every(cell => cell !== 'EMPTY');
      if (isLineFull) linesCleared++;
      return !isLineFull;
    });

    if (linesCleared > 0) {
      const emptyRows = Array.from({ length: linesCleared }, () => Array(BOARD_WIDTH).fill('EMPTY'));
      newBoard.unshift(...emptyRows);
      
      setBoard(newBoard);
      setLines(prev => {
        const updatedLines = prev + linesCleared;
        // Level erhöht sich alle 10 Linien
        setLevel(initialLevel + Math.floor(updatedLines / 10));
        return updatedLines;
      });
      
      const lineScores = [0, 100, 300, 500, 800];
      setScore(prev => prev + (lineScores[linesCleared] * currentLevel));
    } else {
      setBoard(currentBoard);
    }
  }, [initialLevel]);

  const lockBlockAtPosition = useCallback((blockToLock: ActiveBlock, currentBoard: BoardState) => {
    const newBoard = currentBoard.map(row => [...row]);
    let isGameOver = false;

    blockToLock.shape.forEach((row, y) => {
      row.forEach((value, x) => {
        if (value !== 0) {
          const boardY = blockToLock.y + y;
          const boardX = blockToLock.x + x;
          if (boardY < 0) {
            isGameOver = true;
          } else if (boardY < BOARD_HEIGHT) {
            newBoard[boardY][boardX] = blockToLock.type;
          }
        }
      });
    });

    if (isGameOver) {
      setStatus('gameover');
      return;
    }

    clearLinesAndScore(newBoard, level);
    const newBlock = spawnBlock(nextBlocks);
    
    if (checkCollision(newBlock.shape, newBlock.x, newBlock.y > 0 ? newBlock.y : 0, newBoard)) {
      setStatus('gameover');
    }
  }, [clearLinesAndScore, level, nextBlocks, spawnBlock, checkCollision]);

  const lockBlock = useCallback(() => {
    if (!activeBlock) return;
    lockBlockAtPosition(activeBlock, board);
  }, [activeBlock, board, lockBlockAtPosition]);

  const startGame = useCallback((startLevel: number = 1) => {
    setBoard(createEmptyBoard());
    setScore(0);
    setLines(0);
    setLevel(startLevel);
    setInitialLevel(startLevel);
    setStatus('playing');
    
    const initialBag = generateBlockBag();
    spawnBlock(initialBag);
  }, [spawnBlock]);

  const pauseGame = useCallback(() => {
    if (status === 'playing') setStatus('paused');
  }, [status]);

  const resumeGame = useCallback(() => {
    if (status === 'paused') setStatus('playing');
  }, [status]);

  const moveDown = useCallback(() => {
    if (!activeBlock || status !== 'playing') return;

    if (!checkCollision(activeBlock.shape, activeBlock.x, activeBlock.y + 1, board)) {
      setActiveBlock(prev => prev ? { ...prev, y: prev.y + 1 } : null);
    } else {
      lockBlock();
    }
  }, [activeBlock, status, board, checkCollision, lockBlock]);

  const moveHorizontal = useCallback((direction: -1 | 1) => {
    if (!activeBlock || status !== 'playing') return;

    if (!checkCollision(activeBlock.shape, activeBlock.x + direction, activeBlock.y, board)) {
      setActiveBlock(prev => prev ? { ...prev, x: prev.x + direction } : null);
    }
  }, [activeBlock, status, board, checkCollision]);

  const rotateBlock = useCallback(() => {
    if (!activeBlock || status !== 'playing') return;

    const newShape = activeBlock.shape[0].map((_, index) => 
      activeBlock.shape.map(row => row[index]).reverse()
    );

    let newX = activeBlock.x;
    if (checkCollision(newShape, newX, activeBlock.y, board)) {
      if (!checkCollision(newShape, newX + 1, activeBlock.y, board)) newX += 1;
      else if (!checkCollision(newShape, newX - 1, activeBlock.y, board)) newX -= 1;
      else return;
    }

    setActiveBlock(prev => prev ? { ...prev, shape: newShape, x: newX } : null);
  }, [activeBlock, status, board, checkCollision]);

  const hardDrop = useCallback(() => {
    if (!activeBlock || status !== 'playing') return;
    let targetY = activeBlock.y;
    while (!checkCollision(activeBlock.shape, activeBlock.x, targetY + 1, board)) {
      targetY += 1;
    }
    const droppedBlock = { ...activeBlock, y: targetY };
    setActiveBlock(null); // Verhindert Render-Konflikte während des Einrastens
    lockBlockAtPosition(droppedBlock, board);
  }, [activeBlock, status, board, checkCollision, lockBlockAtPosition]);

  const getGhostPieceY = useCallback(() => {
    if (!activeBlock) return 0;
    let ghostY = activeBlock.y;
    while (!checkCollision(activeBlock.shape, activeBlock.x, ghostY + 1, board)) {
      ghostY += 1;
    }
    return ghostY;
  }, [activeBlock, board, checkCollision]);

  useEffect(() => {
    if (!dropTime) return;
    const interval = setInterval(moveDown, dropTime);
    return () => clearInterval(interval);
  }, [dropTime, moveDown]);

  return {
    board,
    activeBlock,
    nextBlocks: nextBlocks.slice(0, 3), 
    status,
    score,
    lines,
    level,
    getGhostPieceY,
    startGame,
    pauseGame,
    resumeGame,
    moveHorizontal,
    moveDown,
    rotateBlock,
    hardDrop
  };
};
// --- END OF FILE ---
