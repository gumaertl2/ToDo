// [2026-07-22] - CHIRURGISCHER EINGRIFF: DSGVO Passiv-Mitglieder-Firewall (Schwärzungs-Logik) an Clickwrap-Zustimmungen gekoppelt.
// src/store/slices/createUserSlice.ts
import type { StateCreator } from 'zustand';
import type { User, Helper, Group, RoleProfile } from '../../core/types/models';
import { DataProcessor } from '../../services/DataProcessor';
import type { Result } from '../../core/types/shared';
import { collection, onSnapshot, doc, deleteDoc, writeBatch } from 'firebase/firestore';
import { db } from '../../services/firebase';
import type { StoreState } from '../useClubStore';

export interface UserSlice {
  users: User[];
  helpers: Helper[];
  groups: Group[];
  roleProfiles: RoleProfile[];
  isUsersLoading: boolean;
  focusedHelperId: string | null;
  setFocusedHelperId: (id: string | null) => void;
  unsubUsers: (() => void) | null;
  unsubHelpers: (() => void) | null;
  unsubGroups: (() => void) | null;
  unsubRoleProfiles: (() => void) | null;
  
  fetchUsersAndHelpers: () => Promise<void>;
  fetchRoleProfiles: () => Promise<void>;
  
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
  
  saveRoleProfile: (profile: RoleProfile) => Promise<Result<void>>;
  deleteRoleProfile: (profileId: string) => Promise<Result<void>>;
}

export const createUserSlice: StateCreator<StoreState, [], [], UserSlice> = (set, get) => {
  let allHelpers: Helper[] = [];

  const updateFilteredHelpers = () => {
    const globalState = get();
    const currentUser = globalState.user;
    
    let hasViewEhrungen = false;
    if (currentUser) {
      if (currentUser.permissions && currentUser.permissions.viewEhrungen !== undefined) {
        hasViewEhrungen = !!currentUser.permissions.viewEhrungen;
      } else if (currentUser.roleProfileId) {
        const profile = globalState.roleProfiles?.find(p => p.id === currentUser.roleProfileId);
        if (profile) {
          hasViewEhrungen = !!profile.permissions.viewEhrungen;
        }
      }
    }

    // CHIRURGISCHER EINGRIFF: Die DSGVO Clickwrap Firewall (Schwärzungs-Logik)
    let filtered = allHelpers;

    if (!hasViewEhrungen) {
      const myHelper = currentUser ? allHelpers.find(h => h.email?.toLowerCase() === currentUser.email?.toLowerCase()) : null;
      const myConsent = myHelper?.consentConfirmed === true;
      
      filtered = allHelpers.map(h => {
        // Ausnahmen: Den eigenen Datensatz darf man immer vollständig sehen
        if (h.id === myHelper?.id) return h;

        // Gegenseitigkeits-Prinzip:
        // 1. Wenn ich selbst nicht zugestimmt habe, sehe ich bei NIEMANDEM die Daten.
        // 2. Wenn der andere nicht zugestimmt hat, sehe ich SEINE Daten nicht (auch wenn ich zugestimmt habe).
        const canSeeDetails = myConsent && h.consentConfirmed === true;

        if (!canSeeDetails) {
          return {
            ...h,
            telefon: '',
            telefonEltern: '',
            email: '',
            emailEltern: ''
          };
        }
        
        return h;
      });
    }

    set({ helpers: filtered });
  };

  return {
    users: [],
    helpers: [],
    groups: [],
    roleProfiles: [],
    isUsersLoading: false,
    focusedHelperId: null,
    setFocusedHelperId: (id) => set({ focusedHelperId: id }),
    unsubUsers: null,
    unsubHelpers: null,
    unsubGroups: null,
    unsubRoleProfiles: null,

    fetchRoleProfiles: async () => {
      if (get().unsubRoleProfiles) get().unsubRoleProfiles!();
      
      const rpSub = onSnapshot(collection(db, 'role_profiles'), async (snap) => {
        if (snap.empty) {
          const batch = writeBatch(db);
          const defaults: RoleProfile[] = [
            { 
              id: 'pro-admin', schemaVersion: '1.0', name: 'ADMIN', isSystemRole: true, 
              permissions: { viewDashboard: true, viewEvents: true, viewTasks: true, viewCalendar: true, viewUsers: true, viewReports: true, viewReminders: true, viewTemplates: true, viewAppUsers: true, viewRoles: true, viewEhrungen: true, viewAllReminders: true, viewTeamPins: true, manageTeamPins: true, manageMitglieder: true, manageCalendarSetup: true, manageEvents: true, deleteAnyItem: true } 
            },
            { 
              id: 'pro-vorstand', schemaVersion: '1.0', name: 'Vorstand', 
              permissions: { viewDashboard: true, viewEvents: true, viewTasks: true, viewCalendar: true, viewUsers: true, viewReports: true, viewReminders: true, viewTemplates: true, viewAppUsers: false, viewRoles: false, viewEhrungen: true, viewAllReminders: true, viewTeamPins: true, manageTeamPins: true, manageMitglieder: true, manageCalendarSetup: true, manageEvents: true, deleteAnyItem: true } 
            },
            { 
              id: 'pro-bereichsleiter', schemaVersion: '1.0', name: 'Bereichsleiter', 
              permissions: { viewDashboard: true, viewEvents: true, viewTasks: true, viewCalendar: true, viewUsers: true, viewReports: true, viewReminders: true, viewTemplates: true, viewAppUsers: false, viewRoles: false, viewEhrungen: true, viewAllReminders: false, viewTeamPins: false, manageTeamPins: false, manageMitglieder: true, manageCalendarSetup: false, manageEvents: false, deleteAnyItem: false } 
            },
            { 
              id: 'pro-teamleiter', schemaVersion: '1.0', name: 'Mannschaftsführer / Trainer', 
              permissions: { viewDashboard: true, viewEvents: false, viewTasks: true, viewCalendar: true, viewUsers: true, viewReports: false, viewReminders: true, viewTemplates: false, viewAppUsers: false, viewRoles: false, viewEhrungen: false, viewAllReminders: false, viewTeamPins: true, manageTeamPins: false, manageMitglieder: false, manageCalendarSetup: false, manageEvents: false, deleteAnyItem: false } 
            },
            { 
              id: 'pro-gast', schemaVersion: '1.0', name: 'Gast', 
              permissions: { viewDashboard: true, viewEvents: false, viewTasks: false, viewCalendar: true, viewUsers: false, viewReports: false, viewReminders: false, viewTemplates: false, viewAppUsers: false, viewRoles: false, viewEhrungen: false, viewAllReminders: false, viewTeamPins: false, manageTeamPins: false, manageMitglieder: false, manageCalendarSetup: false, manageEvents: false, deleteAnyItem: false } 
            }
          ];
          defaults.forEach(p => batch.set(doc(db, 'role_profiles', p.id), p));
          await batch.commit();
          return;
        }
        
        const profiles: RoleProfile[] = [];
        snap.forEach((d) => profiles.push(d.data() as RoleProfile));
        set({ roleProfiles: profiles.sort((a,b) => a.name.localeCompare(b.name)) });
        updateFilteredHelpers();
      });
      
      set({ unsubRoleProfiles: rpSub });
    },

    fetchUsersAndHelpers: async () => {
      if (get().unsubUsers) get().unsubUsers!();
      if (get().unsubHelpers) get().unsubHelpers!();
      
      get().fetchRoleProfiles();
      
      set({ isUsersLoading: true });
      
      const uSub = onSnapshot(collection(db, 'users'), (snap) => {
        const users: User[] = [];
        snap.forEach((d) => users.push(d.data() as User));
        set({ users });
      });

      const hSub = onSnapshot(collection(db, 'helpers'), (snap) => {
        const helpersList: Helper[] = [];
        snap.forEach((d) => helpersList.push(d.data() as Helper));
        allHelpers = helpersList;
        updateFilteredHelpers();
        set({ isUsersLoading: false });
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
    },

    saveRoleProfile: async (profile) => await DataProcessor.saveDocument<RoleProfile>('role_profiles', profile.id, profile),
    
    deleteRoleProfile: async (profileId) => {
      try {
        await deleteDoc(doc(db, 'role_profiles', profileId));
        return { success: true, data: undefined };
      } catch (e) { return { success: false, error: e as Error }; }
    }
  };
};
// --- END OF FILE ---