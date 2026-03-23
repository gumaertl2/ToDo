// src/store/slices/createUserSlice.ts
import type { StateCreator } from 'zustand';
import type { User, Helper } from '../../core/types/models';
import { DataProcessor } from '../../services/DataProcessor';
import type { Result } from '../../core/types/shared';
import { collection, getDocs, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';

export interface UserSlice {
  users: User[];
  helpers: Helper[];
  isUsersLoading: boolean;
  fetchUsersAndHelpers: () => Promise<void>;
  addHelper: (helper: Helper) => Promise<Result<void>>;
  deleteHelper: (helperId: string) => Promise<Result<void>>;
  cleanupExpiredHelpers: () => Helper[];
}

export const createUserSlice: StateCreator<UserSlice, [], [], UserSlice> = (set, get) => ({
  users: [],
  helpers: [],
  isUsersLoading: false,
  fetchUsersAndHelpers: async () => {
    set({ isUsersLoading: true });
    try {
      const [uSnap, hSnap] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'helpers'))
      ]);
      const users: User[] = [];
      uSnap.forEach((d) => users.push(d.data() as User));
      const helpers: Helper[] = [];
      hSnap.forEach((d) => helpers.push(d.data() as Helper));
      set({ users, helpers, isUsersLoading: false });
    } catch (e) {
      set({ isUsersLoading: false });
    }
  },
  addHelper: async (helper) => {
    const result = await DataProcessor.saveDocument<Helper>('helpers', helper.id, helper);
    if (result.success) {
      set((state) => ({ helpers: [...state.helpers, helper] }));
    }
    return result;
  },
  deleteHelper: async (helperId) => {
    try {
      await deleteDoc(doc(db, 'helpers', helperId));
      set((state) => ({
        helpers: state.helpers.filter((h) => h.id !== helperId),
      }));
      return { success: true, data: undefined };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e : new Error(String(e)) };
    }
  },
  cleanupExpiredHelpers: () => {
    const now = Date.now();
    return get().helpers.filter(
      (h) => h.retentionExpiresAt && h.retentionExpiresAt < now
    );
  },
});

// Exakte Zeilenzahl: 58
