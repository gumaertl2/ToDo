// [2026-05-15] - FIX: Vite/TypeScript Build-Error (import type für StateCreator)
// src/store/slices/createTeamSlice.ts
import type { StateCreator } from 'zustand';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import type { StoreState } from '../useClubStore';
import type { Team } from '../../core/types/models';

export interface TeamSlice {
  teams: Team[];
  isTeamsLoading: boolean;
  fetchTeams: () => Promise<void>;
  addTeam: (team: Omit<Team, 'id' | 'createdAt' | 'updatedAt' | 'schemaVersion'>) => Promise<{ success: boolean; error?: any }>;
  updateTeam: (team: Team) => Promise<{ success: boolean; error?: any }>;
  deleteTeam: (id: string) => Promise<{ success: boolean; error?: any }>;
}

export const createTeamSlice: StateCreator<
  StoreState,
  [],
  [],
  TeamSlice
> = (set, get) => ({
  teams: [],
  isTeamsLoading: false,

  fetchTeams: async () => {
    set({ isTeamsLoading: true });
    try {
      const querySnapshot = await getDocs(collection(db, 'teams'));
      const teams: Team[] = [];
      querySnapshot.forEach((doc) => {
        teams.push({ id: doc.id, ...doc.data() } as Team);
      });
      // Alphabetisch sortieren für saubere Dropdowns
      teams.sort((a, b) => a.name.localeCompare(b.name));
      set({ teams, isTeamsLoading: false });
    } catch (error) {
      console.error("Fehler beim Laden der Teams:", error);
      set({ isTeamsLoading: false });
    }
  },

  addTeam: async (teamData) => {
    try {
      const now = Date.now();
      const newTeamData = {
        ...teamData,
        schemaVersion: '1.0',
        createdAt: now,
        updatedAt: now
      };
      const docRef = await addDoc(collection(db, 'teams'), newTeamData);
      const newTeam = { id: docRef.id, ...newTeamData } as Team;
      
      const updatedTeams = [...get().teams, newTeam].sort((a, b) => a.name.localeCompare(b.name));
      set({ teams: updatedTeams });
      
      return { success: true };
    } catch (error) {
      console.error("Fehler beim Erstellen des Teams:", error);
      return { success: false, error };
    }
  },

  updateTeam: async (updatedTeam) => {
    try {
      const { id, ...data } = updatedTeam;
      const teamRef = doc(db, 'teams', id);
      const now = Date.now();
      const updateData = { ...data, updatedAt: now };
      
      await updateDoc(teamRef, updateData);
      
      const updatedTeams = get().teams.map((t) => (t.id === id ? { ...updatedTeam, updatedAt: now } : t)).sort((a, b) => a.name.localeCompare(b.name));
      set({ teams: updatedTeams });
      
      return { success: true };
    } catch (error) {
      console.error("Fehler beim Aktualisieren des Teams:", error);
      return { success: false, error };
    }
  },

  deleteTeam: async (id) => {
    try {
      await deleteDoc(doc(db, 'teams', id));
      set({
        teams: get().teams.filter((t) => t.id !== id)
      });
      return { success: true };
    } catch (error) {
      console.error("Fehler beim Löschen des Teams:", error);
      return { success: false, error };
    }
  }
});
// --- END OF FILE ---