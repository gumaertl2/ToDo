// src/store/slices/createAuthSlice.ts
import type { StateCreator } from 'zustand';
import type { User } from '../../core/types/models';
import { auth, db } from '../../services/firebase';
import { onAuthStateChanged, signOut, signInWithEmailAndPassword, sendPasswordResetEmail, createUserWithEmailAndPassword } from 'firebase/auth';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import type { Result } from '../../core/types/shared';

export interface AuthSlice {
  user: User | null;
  isAuthenticated: boolean;
  isAuthLoading: boolean;
  initializeAuth: () => void;
  login: (email: string, pass: string) => Promise<Result<User>>;
  register: (email: string, pass: string) => Promise<Result<void>>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<Result<void>>;
}

export const createAuthSlice: StateCreator<AuthSlice, [], [], AuthSlice> = (set) => ({
  user: null,
  isAuthenticated: false,
  isAuthLoading: true,
  initializeAuth: () => {
    onAuthStateChanged(auth, async (firebaseUser) => {
      set({ isAuthLoading: true });
      if (firebaseUser && firebaseUser.email) {
        try {
          const normalizedEmail = firebaseUser.email.toLowerCase().trim();
          const q = query(collection(db, 'users'), where('email', '==', normalizedEmail));
          const querySnapshot = await getDocs(q);

          let userData: User | null = null;

          if (!querySnapshot.empty) {
            // Akte über E-Mail gefunden (vom Admin vorher angelegt)
            userData = querySnapshot.docs[0].data() as User;
          } else {
            // Fallback: Versuch es über die UID (für den allerersten Admin-Account)
            const docRef = doc(db, 'users', firebaseUser.uid);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
              userData = docSnap.data() as User;
            } else {
              console.error(`Kein Profil für die E-Mail ${normalizedEmail} gefunden.`);
              set({ user: null, isAuthenticated: false, isAuthLoading: false });
              return;
            }
          }
          
          if (userData) {
            set({ user: userData, isAuthenticated: true, isAuthLoading: false });
          } else {
            set({ user: null, isAuthenticated: false, isAuthLoading: false });
          }
        } catch (e) {
          console.error("Fehler beim Laden des User-Profils:", e);
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
      
      const normalizedEmail = userCredential.user.email?.toLowerCase().trim() || email.toLowerCase().trim();
      const q = query(collection(db, 'users'), where('email', '==', normalizedEmail));
      const querySnapshot = await getDocs(q);

      let userData: User | null = null;

      if (!querySnapshot.empty) {
        // Akte über E-Mail gefunden (vom Admin vorher angelegt)
        userData = querySnapshot.docs[0].data() as User;
      } else {
        // Fallback: Versuch es über die UID
        const docRef = doc(db, 'users', userCredential.user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          userData = docSnap.data() as User;
        } else {
          throw new Error(`Kein Profil für die E-Mail ${normalizedEmail} gefunden. Bitte den Admin, dich im System anzulegen.`);
        }
      }

      set({ user: userData, isAuthenticated: true });
      return { success: true, data: userData };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e : new Error(String(e)) };
    }
  },
  register: async (email, pass) => {
    try {
      await createUserWithEmailAndPassword(auth, email, pass);
      return { success: true, data: undefined };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e : new Error(String(e)) };
    }
  },
  logout: async () => {
    await signOut(auth);
    set({ user: null, isAuthenticated: false });
  },
  resetPassword: async (email) => {
    try {
      await sendPasswordResetEmail(auth, email);
      return { success: true, data: undefined };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e : new Error(String(e)) };
    }
  },
});
