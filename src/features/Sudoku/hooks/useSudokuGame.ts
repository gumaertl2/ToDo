// src/features/Sudoku/hooks/useSudokuGame.ts
// [2026-10-25] - FEATURE: Auto-Save auf 4 unabhängige Speicherplätze (1 Slot je Schwierigkeitsstufe: easy, medium, hard, expert) erweitert, damit z.B. ein Experten-Sudoku pausiert bleiben kann, während man zwischendurch ein leichtes Sudoku spielt.
// [2026-10-25] - FEATURE: Auto-Save & Resume im localStorage integriert, damit laufende oder pausierte Sudokus (inkl. Notizen, Zeilen-/Spalten-Memos, Zeit und Modus) auch über Nacht oder nach App-Neustart erhalten bleiben. Pause-Funktion vergibt kein 'Außer Wertung' mehr.
// [2026-10-24] - FEATURE: Strafzeiten & Hilfen-Tracking geschärft: Tippfehler (❌ +60s), Rettungsring (🛟 +180s je falscher Zahl, eigener Zähler rescueCount), Tipp (💡 +600s je Tipp).
// [2026-10-24] - UX-FIX: Beim Ausschalten des Notiz-Modus (isNotesMode true -> false) wird die Zellen-Auswahl (selectedCell) automatisch aufgehoben, um versehentliche Fehleingaben zu verhindern.
// [2026-10-23] - FEATURE: 'rescueGame' Funktion hinzugefügt. Löscht falsche Eingaben, bestraft diese aber mit Strafsekunden pro Fehler.
// [2026-10-23] - UX-FEATURE: Auto-Deselect nach Zahleneingabe für flüssigen Gelb-Modus & Toggle-Löschen deaktiviert.
import { useState, useEffect, useCallback, useMemo } from 'react';
import { getSudoku } from 'sudoku-gen';

export type SudokuDifficulty = 'easy' | 'medium' | 'hard' | 'expert';
export type GameStatus = 'idle' | 'playing' | 'paused' | 'won';
export type SudokuGameMode = 'ranked' | 'practice';

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

export interface SavedSudokuGame {
  board: CellData[];
  difficulty: SudokuDifficulty;
  gameMode: SudokuGameMode;
  timer: number;
  penaltySeconds: number;
  errorCount: number;
  hintCount: number;
  rescueCount: number;
  activeRowMemos: number[];
  activeColMemos: number[];
  savedAt: number;
}

export type SavedSudokuMap = Partial<Record<SudokuDifficulty, SavedSudokuGame>>;

const SUDOKU_SAVE_MAP_KEY = 'papatodo_sudoku_saved_games_by_diff';
const LEGACY_SUDOKU_SAVE_KEY = 'papatodo_sudoku_saved_game';

const isValidSavedGame = (item: any): item is SavedSudokuGame => {
  return Boolean(item && Array.isArray(item.board) && item.board.length === 81 && item.difficulty);
};

const loadSavedGamesMapFromStorage = (): SavedSudokuMap => {
  const result: SavedSudokuMap = {};
  try {
    const rawMap = localStorage.getItem(SUDOKU_SAVE_MAP_KEY);
    if (rawMap) {
      const parsedMap = JSON.parse(rawMap);
      if (parsedMap && typeof parsedMap === 'object') {
        (['easy', 'medium', 'hard', 'expert'] as SudokuDifficulty[]).forEach((diff) => {
          if (isValidSavedGame(parsedMap[diff])) {
            result[diff] = parsedMap[diff];
          }
        });
      }
    }

    // Automatische Migration eines evtl. vorhandenen Einzel-Spielstands
    const rawLegacy = localStorage.getItem(LEGACY_SUDOKU_SAVE_KEY);
    if (rawLegacy) {
      const parsedLegacy = JSON.parse(rawLegacy);
      if (isValidSavedGame(parsedLegacy) && !result[parsedLegacy.difficulty]) {
        result[parsedLegacy.difficulty] = parsedLegacy;
        localStorage.setItem(SUDOKU_SAVE_MAP_KEY, JSON.stringify(result));
      }
      localStorage.removeItem(LEGACY_SUDOKU_SAVE_KEY);
    }
  } catch (e) {
    console.warn('Konnte gespeicherte Sudokus nicht laden:', e);
  }
  return result;
};

export const useSudokuGame = () => {
  const [board, setBoard] = useState<CellData[]>([]);
  const [status, setStatus] = useState<GameStatus>('idle');
  const [difficulty, setDifficulty] = useState<SudokuDifficulty>('medium');
  const [savedGameMode, setSavedGameMode] = useState<SudokuGameMode>('ranked');
  const [timer, setTimer] = useState<number>(0);
  const [penaltySeconds, setPenaltySeconds] = useState<number>(0);
  const [errorCount, setErrorCount] = useState<number>(0);
  const [hintCount, setHintCount] = useState<number>(0);
  const [rescueCount, setRescueCount] = useState<number>(0);
  const [isNotesMode, setIsNotesMode] = useState<boolean>(false);
  const [selectedCell, setSelectedCell] = useState<number | null>(null);
  const [activeHighlightNumber, setActiveHighlightNumber] = useState<number | null>(null);
  const [hasUsedPause, setHasUsedPause] = useState<boolean>(false);

  const [activeRowMemos, setActiveRowMemos] = useState<number[]>([]);
  const [activeColMemos, setActiveColMemos] = useState<number[]>([]);

  const [savedGamesByDifficulty, setSavedGamesByDifficulty] = useState<SavedSudokuMap>(() =>
    loadSavedGamesMapFromStorage()
  );

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (status === 'playing') {
      interval = setInterval(() => {
        setTimer((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [status]);

  // Auto-Save in den jeweiligen Schwierigkeits-Slot bei jeder Änderung während des Spiels oder in der Pause
  useEffect(() => {
    if ((status === 'playing' || status === 'paused') && board.length === 81) {
      const payload: SavedSudokuGame = {
        board,
        difficulty,
        gameMode: savedGameMode,
        timer,
        penaltySeconds,
        errorCount,
        hintCount,
        rescueCount,
        activeRowMemos,
        activeColMemos,
        savedAt: Date.now()
      };
      setSavedGamesByDifficulty((prev) => {
        const next: SavedSudokuMap = { ...prev, [difficulty]: payload };
        try {
          localStorage.setItem(SUDOKU_SAVE_MAP_KEY, JSON.stringify(next));
        } catch (e) {
          console.warn('Auto-Save für Sudoku fehlgeschlagen:', e);
        }
        return next;
      });
    } else if (status === 'won') {
      setSavedGamesByDifficulty((prev) => {
        if (!prev[difficulty]) return prev;
        const next: SavedSudokuMap = { ...prev };
        delete next[difficulty];
        try {
          localStorage.setItem(SUDOKU_SAVE_MAP_KEY, JSON.stringify(next));
        } catch (e) {}
        return next;
      });
    }
  }, [
    status,
    board,
    difficulty,
    savedGameMode,
    timer,
    penaltySeconds,
    errorCount,
    hintCount,
    rescueCount,
    activeRowMemos,
    activeColMemos
  ]);

  const clearSavedGame = useCallback((targetDifficulty?: SudokuDifficulty) => {
    const diffToClear = targetDifficulty || difficulty;
    setSavedGamesByDifficulty((prev) => {
      const next: SavedSudokuMap = { ...prev };
      delete next[diffToClear];
      try {
        localStorage.setItem(SUDOKU_SAVE_MAP_KEY, JSON.stringify(next));
      } catch (e) {}
      return next;
    });
    if (!targetDifficulty || targetDifficulty === difficulty) {
      setStatus('idle');
    }
  }, [difficulty]);

  const resumeSavedGame = useCallback((targetDifficulty?: SudokuDifficulty): SavedSudokuGame | null => {
    const currentMap = loadSavedGamesMapFromStorage();
    setSavedGamesByDifficulty(currentMap);

    const diffToResume = targetDifficulty || difficulty;
    const saved = currentMap[diffToResume] || Object.values(currentMap)[0] || null;
    if (!saved) return null;

    setBoard(saved.board);
    setDifficulty(saved.difficulty);
    setSavedGameMode(saved.gameMode || 'ranked');
    setTimer(saved.timer || 0);
    setPenaltySeconds(saved.penaltySeconds || 0);
    setErrorCount(saved.errorCount || 0);
    setHintCount(saved.hintCount || 0);
    setRescueCount(saved.rescueCount || 0);
    setActiveRowMemos(saved.activeRowMemos || []);
    setActiveColMemos(saved.activeColMemos || []);
    setHasUsedPause(false);
    setIsNotesMode(false);
    setSelectedCell(null);
    setActiveHighlightNumber(null);
    setStatus('playing');
    return saved;
  }, [difficulty]);

  const savedGameInfo = useMemo<SavedSudokuGame | null>(() => {
    return savedGamesByDifficulty[difficulty] || Object.values(savedGamesByDifficulty)[0] || null;
  }, [savedGamesByDifficulty, difficulty]);

  const handleSetIsNotesMode = useCallback((nextValue: boolean | ((prev: boolean) => boolean)) => {
    setIsNotesMode(prev => {
      const resolved = typeof nextValue === 'function' ? nextValue(prev) : nextValue;
      if (prev && !resolved) {
        setSelectedCell(null);
        setActiveHighlightNumber(null);
      }
      return resolved;
    });
  }, []);

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

  const checkWinCondition = useCallback((currentBoard: CellData[]) => {
    const isWon = currentBoard.every(c => c.value === c.solution);
    if (isWon) {
      setStatus('won');
    }
  }, []);

  const startGame = useCallback((selectedDifficulty: SudokuDifficulty, selectedGameMode: SudokuGameMode = 'ranked') => {
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
    setSavedGameMode(selectedGameMode);
    setStatus('playing');
    setTimer(0);
    setPenaltySeconds(0);
    setErrorCount(0);
    setHintCount(0);
    setRescueCount(0);
    setHasUsedPause(false);
    setIsNotesMode(false);
    setSelectedCell(null);
    setActiveHighlightNumber(null);
    setActiveRowMemos([]);
    setActiveColMemos([]);
  }, []);

  // Pause ist regulär erlaubt (Brett wird im Pause-Modus verdeckt) und führt NICHT mehr zu 'Außer Wertung'
  const pauseGame = useCallback(() => {
    setStatus('paused');
    setSelectedCell(null);
    setActiveHighlightNumber(null);
  }, []);
  
  const resumeGame = useCallback(() => {
    setStatus('playing');
  }, []);

  const clearConflicts = useCallback((currentBoard: CellData[]) => {
    let changed = false;
    const nextBoard = currentBoard.map(c => {
      if (!c.isFixed && c.isConflict) {
        changed = true;
        return { ...c, value: null, isConflict: false };
      }
      return c;
    });
    if (changed) {
      return calculateConflicts(nextBoard).newBoard;
    }
    return currentBoard;
  }, []);

  const handleSelectCell = useCallback((index: number | null) => {
    let currentBoard = board;
    
    const hasConflicts = board.some(c => !c.isFixed && c.isConflict);
    if (hasConflicts) {
      currentBoard = clearConflicts(board);
      setBoard(currentBoard);
    }

    if (index === null || selectedCell === index) {
      setSelectedCell(null);
      setActiveHighlightNumber(null);
    } else {
      setSelectedCell(index);
      const cell = currentBoard[index];
      if (cell && cell.value !== null) {
        setActiveHighlightNumber(cell.value);
      }
    }
  }, [board, selectedCell, clearConflicts]);

  const setNumber = useCallback((num: number) => {
    if (status !== 'playing' || selectedCell === null) return;
    
    const cell = board[selectedCell];
    if (cell.isFixed) return;

    let newBoard = [...board];
    let isErrorTriggered = false;

    if (isNotesMode) {
      const hasNote = cell.notes.includes(num);
      const newNotes = hasNote ? cell.notes.filter(n => n !== num) : [...cell.notes, num].sort();
      newBoard[selectedCell] = { ...cell, notes: newNotes, value: null };
      const evaluated = calculateConflicts(newBoard);
      newBoard = evaluated.newBoard;
    } else {
      if (cell.value !== num) {
        newBoard[selectedCell] = { ...cell, value: num, notes: [] };
        
        newBoard = newBoard.map(c => {
          if (c.index !== selectedCell && !c.isFixed && (c.row === cell.row || c.col === cell.col || c.block === cell.block)) {
            if (c.notes.includes(num)) {
              return { ...c, notes: c.notes.filter(n => n !== num) };
            }
          }
          return c;
        });

        const evaluated = calculateConflicts(newBoard);
        newBoard = evaluated.newBoard;

        if (newBoard[selectedCell].isConflict) {
          isErrorTriggered = true;
        }
      }
    }

    setBoard(newBoard);
    checkWinCondition(newBoard);

    if (isErrorTriggered) {
      setTimer(t => t + 60);
      setPenaltySeconds(p => p + 60);
      setErrorCount(e => e + 1);
    }

    if (!isNotesMode) {
      setSelectedCell(null);
      setActiveHighlightNumber(null);
    }
  }, [status, selectedCell, isNotesMode, board, checkWinCondition]);

  const clearCell = useCallback(() => {
    if (status !== 'playing' || selectedCell === null) return;
    const cell = board[selectedCell];
    if (cell.isFixed) return;
    
    let newBoard = [...board];
    newBoard[selectedCell] = { ...cell, value: null, notes: [] };
    const evaluated = calculateConflicts(newBoard);
    
    setBoard(evaluated.newBoard);
  }, [status, selectedCell, board]);

  const useHint = useCallback(() => {
    if (status !== 'playing' || selectedCell === null) return;
    const cell = board[selectedCell];
    if (cell.isFixed || cell.value === cell.solution) return;
    
    const correctValue = cell.solution;
    let newBoard = [...board];
    newBoard[selectedCell] = { ...cell, value: correctValue, notes: [] };
    
    newBoard = newBoard.map(c => {
      if (c.index !== selectedCell && !c.isFixed && (c.row === cell.row || c.col === cell.col || c.block === cell.block)) {
        return { ...c, notes: c.notes.filter(n => n !== correctValue) };
      }
      return c;
    });
    
    const evaluated = calculateConflicts(newBoard);
    setBoard(evaluated.newBoard);
    checkWinCondition(evaluated.newBoard);
    
    // Tipp-Strafe: +600s (10 Minuten) & zählt als Hilfe
    setTimer(prev => prev + 600);
    setPenaltySeconds(prev => prev + 600);
    setHintCount(prev => prev + 1);
    
    setSelectedCell(null);
    setActiveHighlightNumber(null);
  }, [status, selectedCell, board, checkWinCondition]);

  // CHIRURGISCHER EINGRIFF: Die Rescue-Funktion (+180s je falscher Zahl & eigener Zähler rescueCount)
  const rescueGame = useCallback((): number => {
    if (status !== 'playing') return 0;
    
    let localErrorCount = 0;
    let changed = false;
    
    const nextBoard = board.map(c => {
      if (!c.isFixed && c.value !== null && c.value !== c.solution) {
        localErrorCount++;
        changed = true;
        return { ...c, value: null, isConflict: false };
      }
      return c;
    });

    if (changed) {
      const evaluated = calculateConflicts(nextBoard);
      setBoard(evaluated.newBoard);
      
      setTimer(prev => prev + (localErrorCount * 180));
      setPenaltySeconds(prev => prev + (localErrorCount * 180));
      setRescueCount(prev => prev + localErrorCount);
      
      setSelectedCell(null);
      setActiveHighlightNumber(null);
    }
    
    return localErrorCount;
  }, [board, status]);

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

  useEffect(() => {
    setActiveRowMemos(prev => prev.filter(r => (missingInRows[r] || []).length > 0));
    setActiveColMemos(prev => prev.filter(c => (missingInCols[c] || []).length > 0));
  }, [missingInRows, missingInCols]);

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
    rescueCount,
    isNotesMode,
    selectedCell,
    activeHighlightNumber,
    completedNumbers,
    activeRowMemos,
    activeColMemos,
    missingInRows,
    missingInCols,
    hasUsedPause,
    savedGameInfo,
    savedGamesByDifficulty,
    startGame,
    pauseGame,
    resumeGame,
    resumeSavedGame,
    clearSavedGame,
    handleSelectCell,
    setIsNotesMode: handleSetIsNotesMode,
    setNumber,
    clearCell,
    useHint,
    rescueGame,
    toggleHighlightNumber,
    toggleRowMemo,
    toggleColMemo,
  };
};
// --- END OF FILE ---