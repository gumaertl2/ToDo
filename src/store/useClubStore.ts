// src/store/useClubStore.ts
import { create } from 'zustand';
import { createAuthSlice } from './slices/createAuthSlice';
import type { AuthSlice } from './slices/createAuthSlice';
import { createTaskSlice } from './slices/createTaskSlice';
import type { TaskSlice } from './slices/createTaskSlice';
import { createEventSlice } from './slices/createEventSlice';
import type { EventSlice } from './slices/createEventSlice';

export type StoreState = AuthSlice & TaskSlice & EventSlice;

export const useClubStore = create<StoreState>()((...a) => ({
  ...createAuthSlice(...a),
  ...createTaskSlice(...a),
  ...createEventSlice(...a),
}));

// Exakte Zeilenzahl: 13
