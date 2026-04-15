// 2026-04-15 19:40 - FEATURE: Echtzeit-Sync (onSnapshot) für User, Gruppen & Helfer
// src/store/slices/createUserSlice.ts
import type { StateCreator } from 'zustand';
import type { User, Helper, Group } from '../../core/types/models';
import { DataProcessor } from '../../services/DataProcessor';
import type { Result } from '../../core/types/shared';
import { collection, onSnapshot, doc, deleteDoc, writeBatch } from 'firebase/firestore';
import { db } from '../../services/firebase';

export interface UserSlice {
  users: User[];
  helpers: Helper[];
  groups: Group[];
  isUsersLoading: boolean;
  unsubUsers: (() => void) | null;
  unsubHelpers: (() => void) | null;
  unsubGroups: (() => void) | null;
  fetchUsersAndHelpers: () => Promise<void>;
  addHelper: (helper: Helper) => Promise<Result<void>>;
  addHelpersBulk: (helpersList: Helper[]) => Promise<Result<void>>;
  updateHelper: (helper: Helper) => Promise<Result<void>>;
  deleteHelper: (helperId: string) => Promise<Result<void>>;
  cleanupExpiredHelpers: () => Helper[];
  fetchGroups: () => Promise<void>;
  createGroup: (group: Group) => Promise<Result<void>>;
  updateGroup: (group: Group) => Promise<Result<void>>;
  deleteGroup: (groupId: string) => Promise<Result<void>>;
  createUser: (user: User) => Promise<Result<void>>;
  updateUser: (user: User) => Promise<Result<void>>;
  deleteUser: (userId: string) => Promise<Result<void>>;
}

export const createUserSlice: StateCreator<UserSlice, [], [], UserSlice> = (set, get) => ({
  users: [],
  helpers: [],
  groups: [],
  isUsersLoading: false,
  unsubUsers: null,
  unsubHelpers: null,
  unsubGroups: null,

  fetchUsersAndHelpers: async () => {
    if (get().unsubUsers) get().unsubUsers!();
    if (get().unsubHelpers) get().unsubHelpers!();
    
    set({ isUsersLoading: true });
    
    const uSub = onSnapshot(collection(db, 'users'), (snap) => {
      const users: User[] = [];
      snap.forEach((d) => users.push(d.data() as User));
      set({ users });
    });

    const hSub = onSnapshot(collection(db, 'helpers'), (snap) => {
      const helpers: Helper[] = [];
      snap.forEach((d) => helpers.push(d.data() as Helper));
      set({ helpers, isUsersLoading: false });
    });

    set({ unsubUsers: uSub, unsubHelpers: hSub });
  },

  fetchGroups: async () => {
    if (get().unsubGroups) get().unsubGroups!();
    const gSub = onSnapshot(collection(db, 'groups'), (snap) => {
      const groups: Group[] = [];
      snap.forEach((d) => groups.push(d.data() as Group));
      set({ groups });
    });
    set({ unsubGroups: gSub });
  },

  addHelper: async (helper) => await DataProcessor.saveDocument<Helper>('helpers', helper.id, helper),
  
  addHelpersBulk: async (helpersList: Helper[]) => {
    try {
      const batch = writeBatch(db);
      helpersList.forEach(h => batch.set(doc(db, 'helpers', h.id), h));
      await batch.commit();
      return { success: true, data: undefined };
    } catch (error) {
      return { success: false, error: error as Error };
    }
  },
  
  updateHelper: async (helper) => await DataProcessor.saveDocument<Helper>('helpers', helper.id, helper),
  
  deleteHelper: async (helperId) => {
    try {
      await deleteDoc(doc(db, 'helpers', helperId));
      return { success: true, data: undefined };
    } catch (e) { return { success: false, error: e as Error }; }
  },

  cleanupExpiredHelpers: () => {
    const now = Date.now();
    return get().helpers.filter(h => h.retentionExpiresAt && h.retentionExpiresAt < now);
  },

  createGroup: async (group) => await DataProcessor.saveDocument<Group>('groups', group.id, group),
  updateGroup: async (group) => await DataProcessor.saveDocument<Group>('groups', group.id, group),
  
  deleteGroup: async (groupId) => {
    try {
      await deleteDoc(doc(db, 'groups', groupId));
      return { success: true, data: undefined };
    } catch (e) { return { success: false, error: e as Error }; }
  },

  createUser: async (user) => await DataProcessor.saveDocument<User>('users', user.id, user),
  updateUser: async (user) => await DataProcessor.saveDocument<User>('users', user.id, user),
  
  deleteUser: async (userId) => {
    try {
      await deleteDoc(doc(db, 'users', userId));
      return { success: true, data: undefined };
    } catch (e) { return { success: false, error: e as Error }; }
  }
});
// --- END OF FILE ---