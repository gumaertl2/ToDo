// src/store/slices/createArcadeSlice.ts
// [2026-10-23] - FEATURE & OPTIMIZATION: Echte Firebase-Anbindung für ArcadeScores inkl. Quoten-Schutz (Early Return) und Optimistic UI Updates.
import type { StateCreator } from 'zustand';
import type { StoreState } from '../useClubStore';
import type { ArcadeScore } from '../../core/types/models';
import { collection, onSnapshot, writeBatch, doc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { DataProcessor } from '../../services/DataProcessor';

export interface ArcadeSlice {
  sudokuScores: ArcadeScore[];
  unsubArcade: (() => void) | null;
  fetchSudokuScores: () => Promise<void>;
  saveSudokuScore: (scoreData: { userId: string; userName: string; timeInSeconds: number; difficulty: 'easy' | 'medium' | 'hard' | 'expert'; date: number }) => Promise<void>;
  resetSudokuSeason: (difficulty: 'easy' | 'medium' | 'hard' | 'expert') => Promise<void>;
}

export const createArcadeSlice: StateCreator<
  StoreState,
  [],
  [],
  ArcadeSlice
> = (set, get) => ({
  sudokuScores: [],
  unsubArcade: null,

  fetchSudokuScores: async () => {
    // CHIRURGISCHER EINGRIFF: Quoten-Falle geschlossen!
    if (get().unsubArcade) return;

    // Wir laden die Scores und filtern clientseitig, um das Anlegen komplexer Composite-Indizes 
    // für isArchived & game in Firebase zu vermeiden (schont das Setup).
    const unsub = onSnapshot(collection(db, 'arcade_scores'), (snap) => {
      const scores: ArcadeScore[] = [];
      snap.forEach((d) => {
        const data = d.data() as ArcadeScore;
        if (data.game === 'SUDOKU' && !data.isArchived) {
          scores.push({ ...data, id: d.id });
        }
      });
      set({ sudokuScores: scores });
    }, (error) => {
      console.error("Fehler beim Laden der Arcade-Scores:", error);
    });

    set({ unsubArcade: unsub });
  },

  saveSudokuScore: async (scoreData) => {
    const newId = doc(collection(db, 'arcade_scores')).id;
    const newScore: ArcadeScore = {
      id: newId,
      schemaVersion: '1.0',
      game: 'SUDOKU',
      createdAt: Date.now(),
      isArchived: false,
      ...scoreData
    };
    
    // Optimistic UI Update: Sofort in die Liste aufnehmen für Offline-Feeling
    set((state) => ({
      sudokuScores: [...state.sudokuScores, newScore]
    }));

    // Echtes Firebase Speichern
    try {
      await DataProcessor.saveDocument<ArcadeScore>('arcade_scores', newId, newScore, false);
    } catch (error) {
      console.error("Fehler beim Speichern des Scores:", error);
    }
  },

  resetSudokuSeason: async (difficulty) => {
    const { user, sudokuScores } = get();
    
    const scoresToArchive = sudokuScores.filter(score => score.difficulty === difficulty && !score.isArchived);
    if (scoresToArchive.length === 0) return;

    const now = Date.now();
    const currentUserId = user?.id || 'unknown';

    // Lokales Optimistic Update
    set((state) => ({
      sudokuScores: state.sudokuScores.map(score => 
        (score.difficulty === difficulty && !score.isArchived)
          ? { ...score, isArchived: true, archivedAt: now, archivedBy: currentUserId }
          : score
      )
    }));

    // Firebase Batch-Update für Konsistenz
    try {
      const batch = writeBatch(db);
      scoresToArchive.forEach(score => {
        const docRef = doc(db, 'arcade_scores', score.id);
        batch.update(docRef, { 
          isArchived: true, 
          archivedAt: now, 
          archivedBy: currentUserId 
        });
      });
      await batch.commit();
    } catch (error) {
      console.error(`Fehler beim Season-Reset für ${difficulty}:`, error);
    }
  }
});
// --- END OF FILE ---
