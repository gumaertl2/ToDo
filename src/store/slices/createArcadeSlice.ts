// src/store/slices/createArcadeSlice.ts
// [2026-10-23] - FEATURE: ArcadeSlice um MaxBlock erweitert (einheitlicher Listener, getrennte Arrays & Speicher-Routinen).
// [2026-10-23] - FEATURE & OPTIMIZATION: Echte Firebase-Anbindung für ArcadeScores inkl. Quoten-Schutz (Early Return) und Optimistic UI Updates.
import type { StateCreator } from 'zustand';
import type { StoreState } from '../useClubStore';
import type { ArcadeScore } from '../../core/types/models';
import { collection, onSnapshot, writeBatch, doc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { DataProcessor } from '../../services/DataProcessor';

export interface ArcadeSlice {
  sudokuScores: ArcadeScore[];
  maxBlockScores: ArcadeScore[];
  unsubArcade: (() => void) | null;
  
  fetchSudokuScores: () => Promise<void>;
  fetchMaxBlockScores: () => Promise<void>;
  
  saveSudokuScore: (scoreData: { userId: string; userName: string; timeInSeconds: number; difficulty: 'easy' | 'medium' | 'hard' | 'expert'; date: number }) => Promise<void>;
  saveMaxBlockScore: (scoreData: { userId: string; userName: string; score: number; level: number; lines: number; date: number }) => Promise<void>;
  
  resetSudokuSeason: (difficulty: 'easy' | 'medium' | 'hard' | 'expert') => Promise<void>;
  resetMaxBlockSeason: () => Promise<void>;
}

export const createArcadeSlice: StateCreator<
  StoreState,
  [],
  [],
  ArcadeSlice
> = (set, get) => ({
  sudokuScores: [],
  maxBlockScores: [],
  unsubArcade: null,

  fetchSudokuScores: async () => {
    // CHIRURGISCHER EINGRIFF: Quoten-Falle geschlossen!
    if (get().unsubArcade) return;

    // Ein einziger Listener lädt alle Scores und verteilt sie clientseitig in die jeweiligen Arrays.
    // Das spart Firebase-Reads und macht komplexe Composite-Indizes überflüssig.
    const unsub = onSnapshot(collection(db, 'arcade_scores'), (snap) => {
      const sScores: ArcadeScore[] = [];
      const mScores: ArcadeScore[] = [];
      
      snap.forEach((d) => {
        const data = d.data() as ArcadeScore;
        if (!data.isArchived) {
          if (data.game === 'SUDOKU') sScores.push({ ...data, id: d.id });
          if (data.game === 'MAXBLOCK') mScores.push({ ...data, id: d.id });
        }
      });
      
      set({ sudokuScores: sScores, maxBlockScores: mScores });
    }, (error) => {
      console.error("Fehler beim Laden der Arcade-Scores:", error);
    });

    set({ unsubArcade: unsub });
  },

  // Da beide Spiele auf dieselbe Collection zugreifen, können wir denselben Listener nutzen.
  fetchMaxBlockScores: async () => {
    get().fetchSudokuScores();
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

    try {
      await DataProcessor.saveDocument<ArcadeScore>('arcade_scores', newId, newScore, false);
    } catch (error) {
      console.error("Fehler beim Speichern des Sudoku-Scores:", error);
    }
  },

  saveMaxBlockScore: async (scoreData) => {
    const newId = doc(collection(db, 'arcade_scores')).id;
    const newScore: ArcadeScore = {
      id: newId,
      schemaVersion: '1.0',
      game: 'MAXBLOCK',
      createdAt: Date.now(),
      isArchived: false,
      ...scoreData
    };
    
    // Optimistic UI Update
    set((state) => ({
      maxBlockScores: [...state.maxBlockScores, newScore]
    }));

    try {
      await DataProcessor.saveDocument<ArcadeScore>('arcade_scores', newId, newScore, false);
    } catch (error) {
      console.error("Fehler beim Speichern des MaxBlock-Scores:", error);
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
      console.error(`Fehler beim Season-Reset für Sudoku (${difficulty}):`, error);
    }
  },

  resetMaxBlockSeason: async () => {
    const { user, maxBlockScores } = get();
    
    const scoresToArchive = maxBlockScores.filter(score => !score.isArchived);
    if (scoresToArchive.length === 0) return;

    const now = Date.now();
    const currentUserId = user?.id || 'unknown';

    // Lokales Optimistic Update
    set((state) => ({
      maxBlockScores: state.maxBlockScores.map(score => 
        (!score.isArchived)
          ? { ...score, isArchived: true, archivedAt: now, archivedBy: currentUserId }
          : score
      )
    }));

    // Firebase Batch-Update
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
      console.error(`Fehler beim Season-Reset für MaxBlock:`, error);
    }
  }
});
// --- END OF FILE ---
