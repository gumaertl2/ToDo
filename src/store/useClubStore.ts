// [2026-05-15] - FIX: Vercel Build Error TS2551 (Korrektur Singular/Plural von roleProfiles in partialize)
// src/store/useClubStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// Slice Imports (Werte/Funktionen)
import { createAuthSlice } from './slices/createAuthSlice';
import { createUserSlice } from './slices/createUserSlice';
import { createCalendarSlice } from './slices/createCalendarSlice';
import { createEventSlice } from './slices/createEventSlice';
import { createTaskSlice } from './slices/createTaskSlice';
import { createTemplateSlice } from './slices/createTemplateSlice';
import { createTeamPinsSlice } from './slices/createTeamPinsSlice';
import { createTeamSlice } from './slices/createTeamSlice';

// Slice Imports (Typen/Interfaces)
import type { AuthSlice } from './slices/createAuthSlice';
import type { UserSlice } from './slices/createUserSlice';
import type { CalendarSlice } from './slices/createCalendarSlice';
import type { EventSlice } from './slices/createEventSlice';
import type { TaskSlice } from './slices/createTaskSlice';
import type { TemplateSlice } from './slices/createTemplateSlice';
import type { TeamPinsSlice } from './slices/createTeamPinsSlice';
import type { TeamSlice } from './slices/createTeamSlice';

export interface StoreState 
  extends AuthSlice, 
          UserSlice, 
          CalendarSlice, 
          EventSlice, 
          TaskSlice, 
          TemplateSlice, 
          TeamPinsSlice,
          TeamSlice {}

export const useClubStore = create<StoreState>()(
  persist(
    (...a) => ({
      ...createAuthSlice(...a),
      ...createUserSlice(...a),
      ...createCalendarSlice(...a),
      ...createEventSlice(...a),
      ...createTaskSlice(...a),
      ...createTemplateSlice(...a),
      ...createTeamPinsSlice(...a),
      ...createTeamSlice(...a),
    }),
    {
      name: 'club-management-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Nur persistente Daten im LocalStorage speichern
        user: state.user,
        roleProfiles: state.roleProfiles,
        isAuthenticated: state.isAuthenticated,
        // Teams und Gruppen werden beim App-Start frisch gefetcht, 
        // können aber für Offline-Fähigkeit hier drin bleiben:
        teams: state.teams,
        groups: state.groups,
      }),
    }
  )
);
// --- END OF FILE ---