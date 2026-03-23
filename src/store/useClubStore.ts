// src/store/useClubStore.ts
import { create } from 'zustand';
import { createAuthSlice, AuthSlice } from './slices/createAuthSlice';
import { createTaskSlice, TaskSlice } from './slices/createTaskSlice';
import { createEventSlice, EventSlice } from './slices/createEventSlice';

export type StoreState = AuthSlice & TaskSlice & EventSlice;

export const useClubStore = create<StoreState>()((...a) => ({
  ...createAuthSlice(...a),
  ...createTaskSlice(...a),
  ...createEventSlice(...a),
}));

// Exakte Zeilenzahl: 13
