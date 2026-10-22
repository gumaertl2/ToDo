// [2026-10-22] - FIX: Import von StoreState und ArcadeScore auf 'type' umgestellt, um Vite SyntaxError beim Build zu beheben.
// [2026-10-22] - FIX: Import von StateCreator auf 'type' umgestellt, um Vite SyntaxError beim Build zu beheben.
// [2026-10-22] - FEATURE: ArcadeSlice für die Verwaltung der Vereins-Sudoku Highscores und Seasons.
import type { StateCreator } from 'zustand';
import type { StoreState } from '../useClubStore';
import type { ArcadeScore } from '../../core/types/models';

export interface ArcadeSlice {
  sudokuScores: ArcadeScore[];
  fetchSudokuScores: () => Promise<void>;
  saveSudokuScore: (scoreData: { userId: string; userName: string; timeInSeconds: number; difficulty: 'easy' | 'medium' | 'hard'; date: number }) => Promise<void>;
  resetSudokuSeason: (difficulty: 'easy' | 'medium' | 'hard') => Promise<void>;
}

export const createArcadeSlice: StateCreator<
  StoreState,
  [],
  [],
  ArcadeSlice
> = (set, get) => ({
  sudokuScores: [],

  fetchSudokuScores: async () => {
    // TODO: Echter Firebase-Abruf (z.B. über firebaseOperations.ts)
    // Query: collection('arcadeScores'), where('game', '==', 'SUDOKU'), where('isArchived', '!=', true)
    console.log("Fetching Sudoku scores...");
  },

  saveSudokuScore: async (scoreData) => {
    const newScore: ArcadeScore = {
      id: crypto.randomUUID(), // Temporäre ID für Optimistic UI
      schemaVersion: '1.0',
      game: 'SUDOKU',
      createdAt: Date.now(),
      ...scoreData
    };
    
    // Optimistic UI Update: Sofort in die Liste aufnehmen
    set((state) => ({
      sudokuScores: [...state.sudokuScores, newScore]
    }));

    // TODO: Firebase Call zum Speichern in der DB anstoßen
    console.log("Saved score:", newScore);
  },

  resetSudokuSeason: async (difficulty) => {
    const { user } = get();
    
    // Lokales Update: Alle aktiven Scores dieser Schwierigkeit ausblenden (isArchived = true)
    set((state) => ({
      sudokuScores: state.sudokuScores.map(score => 
        (score.difficulty === difficulty && !score.isArchived)
          ? { ...score, isArchived: true, archivedAt: Date.now(), archivedBy: user?.id }
          : score
      )
    }));

    // TODO: Firebase Batch-Update, um diese Dokumente auch in der Datenbank als archiviert zu markieren
    console.log(`Season reset for ${difficulty}`);
  }
});
// --- END OF FILE ---
