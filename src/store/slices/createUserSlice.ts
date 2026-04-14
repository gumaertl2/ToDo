// src/store/slices/createUserSlice.ts
import type { StateCreator } from 'zustand';
import type { User, Helper, Group } from '../../core/types/models';
import { DataProcessor } from '../../services/DataProcessor';
import type { Result } from '../../core/types/shared';
import { collection, getDocs, doc, deleteDoc, writeBatch } from 'firebase/firestore';
import { db } from '../../services/firebase';

export interface UserSlice {
  users: User[];
  helpers: Helper[];
  groups: Group[];
  isUsersLoading: boolean;
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
  fetchUsersAndHelpers: async () => {
    set({ isUsersLoading: true });
    try {
      const [uSnap, hSnap, gSnap] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'helpers')),
        getDocs(collection(db, 'groups'))
      ]);
      const users: User[] = [];
      uSnap.forEach((d) => users.push(d.data() as User));
      const helpers: Helper[] = [];
      hSnap.forEach((d) => helpers.push(d.data() as Helper));
      const groups: Group[] = [];
      gSnap.forEach((d) => groups.push(d.data() as Group));
      set({ users, helpers, groups, isUsersLoading: false });
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
  // CHIRURGISCHER EINGRIFF: Neue Funktion für den sicheren Massenimport (Bulk)
  addHelpersBulk: async (helpersList: Helper[]) => {
    try {
      const batch = writeBatch(db);
      helpersList.forEach(h => {
        const ref = doc(db, 'helpers', h.id);
        batch.set(ref, h);
      });
      await batch.commit();
      
      // Update lokalen Store (überschreiben vorhandener und anfügen neuer)
      set((state) => {
        const existingMap = new Map(state.helpers.map(h => [h.id, h]));
        helpersList.forEach(h => existingMap.set(h.id, h));
        return { helpers: Array.from(existingMap.values()) };
      });
      
      return { success: true, data: undefined };
    } catch (error) {
      console.error("Fehler beim CSV-Import:", error);
      return { success: false, error: error as Error };
    }
  },
  updateHelper: async (helper) => {
    const result = await DataProcessor.saveDocument<Helper>('helpers', helper.id, helper);
    if (result.success) set((state) => ({ helpers: state.helpers.map(h => h.id === helper.id ? helper : h) }));
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
  fetchGroups: async () => {
    try {
      const snap = await getDocs(collection(db, 'groups'));
      const groups: Group[] = [];
      snap.forEach((d) => groups.push(d.data() as Group));
      set({ groups });
    } catch (e) {
      console.error(e);
    }
  },
  createGroup: async (group) => {
    const result = await DataProcessor.saveDocument<Group>('groups', group.id, group);
    if (result.success) {
      set((state) => ({ groups: [...state.groups, group] }));
    }
    return result;
  },
  updateGroup: async (group) => {
    const result = await DataProcessor.saveDocument<Group>('groups', group.id, group);
    if (result.success) {
      set((state) => ({ groups: state.groups.map(g => g.id === group.id ? group : g) }));
    }
    return result;
  },
  deleteGroup: async (groupId) => {
    try {
      await deleteDoc(doc(db, 'groups', groupId));
      set((state) => ({ groups: state.groups.filter((g) => g.id !== groupId) }));
      return { success: true, data: undefined };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e : new Error(String(e)) };
    }
  },
  createUser: async (user) => {
    const result = await DataProcessor.saveDocument<User>('users', user.id, user);
    if (result.success) set((state) => ({ users: [...state.users, user] }));
    return result;
  },
  updateUser: async (user) => {
    const result = await DataProcessor.saveDocument<User>('users', user.id, user);
    if (result.success) {
      set((state) => ({ users: state.users.map(u => u.id === user.id ? user : u) }));
    }
    return result;
  },
  deleteUser: async (userId) => {
    try {
      await deleteDoc(doc(db, 'users', userId));
      set((state) => ({ users: state.users.filter((u) => u.id !== userId) }));
      return { success: true, data: undefined };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e : new Error(String(e)) };
    }
  }
});
// Exakte Zeilenzahl: 160