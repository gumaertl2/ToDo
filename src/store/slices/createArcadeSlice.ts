// src/store/slices/createArcadeSlice.ts
// [2026-10-24] - FEATURE: saveSudokuScore um optionale Statistik-Felder (errorCount, hintCount, rescueCount) für die 2-Klassen-Wertung in der Hall of Fame erweitert.
// [2026-10-24] - DSGVO-FIX: Zentrale Alias-Auflösung in saveSudokuScore, saveMaxBlockScore und im Listener implementiert, damit in der öffentlichen Hall of Fame garantiert nur der Vereins-Alias (oder Vorname) statt des vollen Nachnamens gespeichert und angezeigt wird.
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
  
  saveSudokuScore: (scoreData: {
    userId: string;
    userName: string;
    timeInSeconds: number;
    difficulty: 'easy' | 'medium' | 'hard' | 'expert';
    date: number;
    errorCount?: number;
    hintCount?: number;
    rescueCount?: number;
  }) => Promise<void>;
  saveMaxBlockScore: (scoreData: { userId: string; userName: string; score: number; level: number; lines: number; date: number }) => Promise<void>;
  
  resetSudokuSeason: (difficulty: 'easy' | 'medium' | 'hard' | 'expert') => Promise<void>;
  resetMaxBlockSeason: () => Promise<void>;
}

const resolveSafeAlias = (state: StoreState, userId: string, rawUserName: string): string => {
  const currentUser = state.user;
  const targetUser = state.users?.find(u => u.id === userId) || (currentUser?.id === userId ? currentUser : null);
  const email = targetUser?.email?.toLowerCase().trim();

  const matchedHelper = state.helpers?.find(
    h => (email && h.email?.toLowerCase().trim() === email) || h.id === userId
  );

  if (matchedHelper?.alias?.trim()) {
    return matchedHelper.alias.trim();
  }

  return (rawUserName || '').trim().split(/\s+/)[0] || 'Spieler';
};

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
      const state = get();
      const sScores: ArcadeScore[] = [];
      const mScores: ArcadeScore[] = [];
      
      snap.forEach((d) => {
        const data = d.data() as ArcadeScore;
        if (!data.isArchived) {
          const safeName = resolveSafeAlias(state, data.userId, data.userName);
          const sanitizedScore: ArcadeScore = { ...data, id: d.id, userName: safeName };
          if (data.game === 'SUDOKU') sScores.push(sanitizedScore);
          if (data.game === 'MAXBLOCK') mScores.push(sanitizedScore);
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
    const state = get();
    const safeAlias = resolveSafeAlias(state, scoreData.userId, scoreData.userName);
    const newId = doc(collection(db, 'arcade_scores')).id;
    const newScore: ArcadeScore = {
      id: newId,
      schemaVersion: '1.0',
      game: 'SUDOKU',
      createdAt: Date.now(),
      isArchived: false,
      ...scoreData,
      userName: safeAlias
    };
    
    // Optimistic UI Update: Sofort in die Liste aufnehmen für Offline-Feeling
    set((prev) => ({
      sudokuScores: [...prev.sudokuScores, newScore]
    }));

    try {
      await DataProcessor.saveDocument<ArcadeScore>('arcade_scores', newId, newScore, false);
    } catch (error) {
      console.error("Fehler beim Speichern des Sudoku-Scores:", error);
    }
  },

  saveMaxBlockScore: async (scoreData) => {
    const state = get();
    const safeAlias = resolveSafeAlias(state, scoreData.userId, scoreData.userName);
    const newId = doc(collection(db, 'arcade_scores')).id;
    const newScore: ArcadeScore = {
      id: newId,
      schemaVersion: '1.0',
      game: 'MAXBLOCK',
      createdAt: Date.now(),
      isArchived: false,
      ...scoreData,
      userName: safeAlias
    };
    
    // Optimistic UI Update
    set((prev) => ({
      maxBlockScores: [...prev.maxBlockScores, newScore]
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
