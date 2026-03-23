// src/store/useClubStore.ts
import { create } from 'zustand';
import { createAuthSlice } from './slices/createAuthSlice';
import type { AuthSlice } from './slices/createAuthSlice';
import { createTaskSlice } from './slices/createTaskSlice';
import type { TaskSlice } from './slices/createTaskSlice';
import { createEventSlice } from './slices/createEventSlice';
import type { EventSlice } from './slices/createEventSlice';
import { createUserSlice } from './slices/createUserSlice';
import type { UserSlice } from './slices/createUserSlice';
import { createTemplateSlice } from './slices/createTemplateSlice';
import type { TemplateSlice } from './slices/createTemplateSlice';

export type StoreState = AuthSlice & TaskSlice & EventSlice & UserSlice & TemplateSlice;

export const useClubStore = create<StoreState>()((...a) => ({
  ...createAuthSlice(...a),
  ...createTaskSlice(...a),
  ...createEventSlice(...a),
  ...createUserSlice(...a),
  ...createTemplateSlice(...a),
}));

// Exakte Zeilenzahl: 13
