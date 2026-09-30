// [2026-09-30] - FEATURE: Store unterstützt nun 'availabilities' und 'isLocked' (Base & Override V2).
// [2026-09-28] - BUGFIX: Optimistic Store-Update in saveMatchLineup hinzugefügt, um "Geister-Speichern" zu verhindern.
// [2026-09-28] - FEATURE: Slice für MatchLineups (Schatten-Akten für Aufstellungen) erstellt, um das Base & Override Prinzip zu unterstützen.
// src/store/slices/createMatchLineupSlice.ts
import type { StateCreator } from 'zustand';
import type { MatchLineup } from '../../core/types/models';
import { DataProcessor } from '../../services/DataProcessor';
import type { Result } from '../../core/types/shared';
import { collection, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';

export interface MatchLineupSlice {
  matchLineups: MatchLineup[];
  isMatchLineupsLoading: boolean;
  unsubMatchLineups: (() => void) | null;
  
  fetchMatchLineups: () => Promise<void>;
  saveMatchLineup: (lineup: MatchLineup) => Promise<Result<void>>;
  deleteMatchLineup: (id: string) => Promise<Result<void>>;
}

export const createMatchLineupSlice: StateCreator<MatchLineupSlice, [], [], MatchLineupSlice> = (set, get) => ({
  matchLineups: [],
  isMatchLineupsLoading: false,
  unsubMatchLineups: null,

  fetchMatchLineups: async () => {
    if (get().unsubMatchLineups) {
      get().unsubMatchLineups!();
    }
    
    set({ isMatchLineupsLoading: true });
    
    const sub = onSnapshot(collection(db, 'match_lineups'), (snap) => {
      const lineups: MatchLineup[] = [];
      snap.forEach((d) => {
        lineups.push({ ...d.data(), id: d.id } as MatchLineup);
      });
      
      set({ matchLineups: lineups, isMatchLineupsLoading: false });
    }, (error) => {
      console.error("Firebase Sync Fehler (MatchLineups):", error);
      set({ isMatchLineupsLoading: false });
    });

    set({ unsubMatchLineups: sub });
  },

  saveMatchLineup: async (lineup) => {
    const dataToSave = {
      ...lineup,
      updatedAt: Date.now()
    };

    // WICHTIGER FIX: Sofortiges lokales Speichern im Store (Optimistic Update).
    // Dadurch sind die Daten für das Frontend sofort da, egal wie lange Firebase braucht.
    // Funktioniert generisch auch perfekt für die neuen 'availabilities' und 'isLocked' Felder.
    set((state) => {
      const filtered = state.matchLineups.filter(m => m.id !== lineup.id);
      return { matchLineups: [...filtered, dataToSave as MatchLineup] };
    });

    // Danach lautlos im Hintergrund an die Datenbank senden
    return await DataProcessor.saveDocument<MatchLineup>('match_lineups', lineup.id, dataToSave);
  },
  
  deleteMatchLineup: async (id) => {
    try {
      // Auch hier: Erst lokal löschen, dann Datenbank
      set((state) => ({
        matchLineups: state.matchLineups.filter(m => m.id !== id)
      }));
      await deleteDoc(doc(db, 'match_lineups', id));
      return { success: true, data: undefined };
    } catch (e) {
      return { success: false, error: e as Error };
    }
  }
});
// --- END OF FILE ---