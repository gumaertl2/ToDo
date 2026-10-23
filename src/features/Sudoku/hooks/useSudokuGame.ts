// src/features/Sudoku/hooks/useSudokuGame.ts
// [2026-10-22] - FEATURE: Flag hasUsedPause integriert, damit pausierte Spiele aus der Wertung fliegen.
import { useState, useEffect, useCallback, useMemo } from 'react';
import { getSudoku } from 'sudoku-gen';

export type SudokuDifficulty = 'easy' | 'medium' | 'hard' | 'expert';
export type GameStatus = 'idle' | 'playing' | 'paused' | 'won';

export interface CellData {
  index: number;
  row: number;
  col: number;
  block: number;
  value: number | null;
  solution: number;
  isFixed: boolean;
  notes: number[];
  isConflict: boolean;
}

export const useSudokuGame = () => {
  const [board, setBoard] = useState<CellData[]>([]);
  const [status, setStatus] = useState<GameStatus>('idle');
  const [difficulty, setDifficulty] = useState<SudokuDifficulty>('medium');
  const [timer, setTimer] = useState<number>(0);
  const [penaltySeconds, setPenaltySeconds] = useState<number>(0);
  const [errorCount, setErrorCount] = useState<number>(0);
  const [hintCount, setHintCount] = useState<number>(0);
  const [isNotesMode, setIsNotesMode] = useState<boolean>(false);
  const [selectedCell, setSelectedCell] = useState<number | null>(null);
  const [activeHighlightNumber, setActiveHighlightNumber] = useState<number | null>(null);
  const [hasUsedPause, setHasUsedPause] = useState<boolean>(false);

  const [activeRowMemos, setActiveRowMemos] = useState<number[]>([]);
  const [activeColMemos, setActiveColMemos] = useState<number[]>([]);

  // Timer Effect
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (status === 'playing') {
      interval = setInterval(() => {
        setTimer((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [status]);

  const getRow = (index: number) => Math.floor(index / 9);
  const getCol = (index: number) => index % 9;
  const getBlock = (row: number, col: number) => Math.floor(row / 3) * 3 + Math.floor(col / 3);

  const calculateConflicts = (currentBoard: CellData[]): { newBoard: CellData[]; hasNewConflicts: boolean } => {
    let hasNewConflicts = false;
    const newBoard = currentBoard.map(c => ({ ...c, isConflict: false }));
    
    for (let i = 0; i < 81; i++) {
      const cell = newBoard[i];
      if (!cell.value) continue;
      
      for (let j = i + 1; j < 81; j++) {
        const other = newBoard[j];
        if (other.value === cell.value) {
          if (cell.row === other.row || cell.col === other.col || cell.block === other.block) {
            cell.isConflict = true;
            other.isConflict = true;
            hasNewConflicts = true;
          }
        }
      }
    }
    return { newBoard, hasNewConflicts };
  };

  const startGame = useCallback((selectedDifficulty: SudokuDifficulty) => {
    const rawSudoku = getSudoku(selectedDifficulty);
    const newBoard: CellData[] = [];

    for (let i = 0; i < 81; i++) {
      const row = getRow(i);
      const col = getCol(i);
      const block = getBlock(row, col);
      const char = rawSudoku.puzzle[i];
      const solChar = rawSudoku.solution[i];
      const isFixed = char !== '-';
      
      newBoard.push({
        index: i,
        row,
        col,
        block,
        value: isFixed ? parseInt(char, 10) : null,
        solution: parseInt(solChar, 10),
        isFixed,
        notes: [],
        isConflict: false
      });
    }

    setBoard(newBoard);
    setDifficulty(selectedDifficulty);
    setStatus('playing');
    setTimer(0);
    setPenaltySeconds(0);
    setErrorCount(0);
    setHintCount(0);
    setHasUsedPause(false);
    setSelectedCell(null);
    setActiveHighlightNumber(null);
    setActiveRowMemos([]);
    setActiveColMemos([]);
  }, []);

  const pauseGame = () => {
    setStatus('paused');
    setHasUsedPause(true);
  };
  
  const resumeGame = () => setStatus('playing');

  const checkWinCondition = (currentBoard: CellData[]) => {
    const isWon = currentBoard.every(c => c.value === c.solution);
    if (isWon) {
      setStatus('won');
    }
  };

  const handleSelectCell = useCallback((index: number) => {
    if (selectedCell === index) {
      setSelectedCell(null);
      setActiveHighlightNumber(null);
    } else {
      setSelectedCell(index);
      const cell = board[index];
      if (cell && cell.value !== null) {
        setActiveHighlightNumber(cell.value);
      } else {
        setActiveHighlightNumber(null);
      }
    }
  }, [selectedCell, board]);

  const setNumber = useCallback((num: number) => {
    if (status !== 'playing' || selectedCell === null) return;
    
    setBoard(prev => {
      const cell = prev[selectedCell];
      if (cell.isFixed) return prev;

      let newBoard = [...prev];

      if (isNotesMode) {
        const hasNote = cell.notes.includes(num);
        const newNotes = hasNote ? cell.notes.filter(n => n !== num) : [...cell.notes, num].sort();
        newBoard[selectedCell] = { ...cell, notes: newNotes, value: null };
      } else {
        if (cell.value === num) {
          newBoard[selectedCell] = { ...cell, value: null }; 
        } else {
          newBoard[selectedCell] = { ...cell, value: num, notes: [] };
          
          newBoard = newBoard.map(c => {
            if (c.index !== selectedCell && !c.isFixed && (c.row === cell.row || c.col === cell.col || c.block === cell.block)) {
              if (c.notes.includes(num)) {
                return { ...c, notes: c.notes.filter(n => n !== num) };
              }
            }
            return c;
          });
        }
      }

      const evaluated = calculateConflicts(newBoard);
      newBoard = evaluated.newBoard;

      const conflictCellsCount = newBoard.filter(c => c.isConflict).length;
      if (conflictCellsCount > 0 && !cell.isFixed) {
        setTimer(t => t + 60);
        setPenaltySeconds(p => p + 60);
        setErrorCount(e => e + 1);
      }

      checkWinCondition(newBoard);
      return newBoard;
    });
  }, [status, selectedCell, isNotesMode]);

  const clearCell = useCallback(() => {
    if (status !== 'playing' || selectedCell === null) return;
    setBoard(prev => {
      const cell = prev[selectedCell];
      if (cell.isFixed) return prev;
      let newBoard = [...prev];
      newBoard[selectedCell] = { ...cell, value: null, notes: [] };
      const evaluated = calculateConflicts(newBoard);
      return evaluated.newBoard;
    });
  }, [status, selectedCell]);

  const useHint = useCallback(() => {
    if (status !== 'playing' || selectedCell === null) return;
    setBoard(prev => {
      const cell = prev[selectedCell];
      if (cell.isFixed || cell.value === cell.solution) return prev;
      
      const correctValue = cell.solution;
      let newBoard = [...prev];
      newBoard[selectedCell] = { ...cell, value: correctValue, notes: [] };
      
      newBoard = newBoard.map(c => {
        if (c.index !== selectedCell && !c.isFixed && (c.row === cell.row || c.col === cell.col || c.block === cell.block)) {
          return { ...c, notes: c.notes.filter(n => n !== correctValue) };
        }
        return c;
      });
      
      const evaluated = calculateConflicts(newBoard);
      checkWinCondition(evaluated.newBoard);
      return evaluated.newBoard;
    });
    
    setTimer(prev => prev + 60);
    setPenaltySeconds(prev => prev + 60);
    setHintCount(prev => prev + 1);
  }, [status, selectedCell]);

  const toggleRowMemo = (rowIndex: number) => {
    setActiveRowMemos(prev => 
      prev.includes(rowIndex) ? prev.filter(r => r !== rowIndex) : [...prev, rowIndex]
    );
  };

  const toggleColMemo = (colIndex: number) => {
    setActiveColMemos(prev => 
      prev.includes(colIndex) ? prev.filter(c => c !== colIndex) : [...prev, colIndex]
    );
  };

  const missingInRows = useMemo(() => {
    const map: Record<number, number[]> = {};
    for (let r = 0; r < 9; r++) {
      const present = new Set(board.filter(c => c.row === r && c.value !== null).map(c => c.value));
      const missing: number[] = [];
      for (let n = 1; n <= 9; n++) {
        if (!present.has(n)) missing.push(n);
      }
      map[r] = missing;
    }
    return map;
  }, [board]);

  const missingInCols = useMemo(() => {
    const map: Record<number, number[]> = {};
    for (let col = 0; col < 9; col++) {
      const present = new Set(board.filter(c => c.col === col && c.value !== null).map(c => c.value));
      const missing: number[] = [];
      for (let n = 1; n <= 9; n++) {
        if (!present.has(n)) missing.push(n);
      }
      map[col] = missing;
    }
    return map;
  }, [board]);

  const completedNumbers = useMemo(() => {
    const counts: Record<number, number> = {};
    for (let i = 1; i <= 9; i++) counts[i] = 0;
    board.forEach(c => {
      if (c.value) counts[c.value]++;
    });
    const completed: number[] = [];
    for (let i = 1; i <= 9; i++) {
      if (counts[i] >= 9) completed.push(i);
    }
    return completed;
  }, [board]);

  const toggleHighlightNumber = (num: number) => {
    setActiveHighlightNumber(prev => prev === num ? null : num);
  };

  return {
    board,
    status,
    difficulty,
    timer,
    penaltySeconds,
    errorCount,
    hintCount,
    isNotesMode,
    selectedCell,
    activeHighlightNumber,
    completedNumbers,
    activeRowMemos,
    activeColMemos,
    missingInRows,
    missingInCols,
    hasUsedPause,
    startGame,
    pauseGame,
    resumeGame,
    handleSelectCell,
    setIsNotesMode,
    setNumber,
    clearCell,
    useHint,
    toggleHighlightNumber,
    toggleRowMemo,
    toggleColMemo,
  };
};
// --- END OF FILE ---
