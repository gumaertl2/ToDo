// 2026-04-30 17:15 - FEATURE: Slice für Team-PINs (Wettkampf-Tresor)
// src/store/slices/createTeamPinsSlice.ts
import type { StateCreator } from 'zustand';
import type { TeamPin } from '../../core/types/models';
import { DataProcessor } from '../../services/DataProcessor';
import type { Result } from '../../core/types/shared';
import { collection, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';

export interface TeamPinsSlice {
  teamPins: TeamPin[];
  isTeamPinsLoading: boolean;
  unsubTeamPins: (() => void) | null;
  
  fetchTeamPins: () => Promise<void>;
  saveTeamPin: (pin: TeamPin) => Promise<Result<void>>;
  deleteTeamPin: (pinId: string) => Promise<Result<void>>;
}

export const createTeamPinsSlice: StateCreator<TeamPinsSlice, [], [], TeamPinsSlice> = (set, get) => ({
  teamPins: [],
  isTeamPinsLoading: false,
  unsubTeamPins: null,

  fetchTeamPins: async () => {
    if (get().unsubTeamPins) get().unsubTeamPins!();
    set({ isTeamPinsLoading: true });
    
    const sub = onSnapshot(collection(db, 'team_pins'), (snap) => {
      const pins: TeamPin[] = [];
      snap.forEach((d) => pins.push(d.data() as TeamPin));
      
      // Alphabetisch nach Team-Namen sortieren
      pins.sort((a, b) => a.teamName.localeCompare(b.teamName));
      
      set({ teamPins: pins, isTeamPinsLoading: false });
    });

    set({ unsubTeamPins: sub });
  },

  saveTeamPin: async (pin) => {
    return await DataProcessor.saveDocument<TeamPin>('team_pins', pin.id, pin);
  },
  
  deleteTeamPin: async (pinId) => {
    try {
      await deleteDoc(doc(db, 'team_pins', pinId));
      return { success: true, data: undefined };
    } catch (e) {
      return { success: false, error: e as Error };
    }
  }
});
// --- END OF FILE ---