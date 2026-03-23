// src/store/slices/createAuthSlice.ts
import { StateCreator } from 'zustand';
import { User } from '../../core/types/models';
import { auth } from '../../services/firebase';
import { onAuthStateChanged, signOut, signInWithEmailAndPassword } from 'firebase/auth';
import { DataProcessor } from '../../services/DataProcessor';
import { Result } from '../../core/types/shared';

export interface AuthSlice {
  user: User | null;
  isAuthenticated: boolean;
  isAuthLoading: boolean;
  initializeAuth: () => void;
  login: (email: string, pass: string) => Promise<Result<User>>;
  logout: () => Promise<void>;
}

export const createAuthSlice: StateCreator<AuthSlice, [], [], AuthSlice> = (set) => ({
  user: null,
  isAuthenticated: false,
  isAuthLoading: true,
  initializeAuth: () => {
    onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const result = await DataProcessor.getDocument<User>('users', firebaseUser.uid);
        if (result.success) {
          set({ user: result.data, isAuthenticated: true, isAuthLoading: false });
        } else {
          set({ user: null, isAuthenticated: false, isAuthLoading: false });
        }
      } else {
        set({ user: null, isAuthenticated: false, isAuthLoading: false });
      }
    });
  },
  login: async (email, pass) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, pass);
      const result = await DataProcessor.getDocument<User>('users', userCredential.user.uid);
      if (result.success) {
        set({ user: result.data, isAuthenticated: true });
        return { success: true, data: result.data };
      }
      return { success: false, error: result.error };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e : new Error(String(e)) };
    }
  },
  logout: async () => {
    await signOut(auth);
    set({ user: null, isAuthenticated: false });
  },
});

// Exakte Zeilenzahl: 55
