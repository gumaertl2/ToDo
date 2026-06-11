// [2026-06-11] - TYP-SICHERHEIT: Globalen StoreState importiert und (set as any) im Logout entfernt. Der Store-Reset ist jetzt 100% typensicher.
// [2026-06-11] - ARCHITEKTUR-FIX: Massives Code-Duplikat für Profil-Ermittlung in zentrale 'resolveUserProfile'-Funktion ausgelagert. Logout-Funktion auf dynamisches 'unsubscribeAll'-Muster umgestellt.
// [2026-05-14 14:15] - FEATURE: Gastzugänge loggen nun hasAppAccess und lastAppLoginAt ins Helfer-Profil
// [2026-04-25 10:00] - UX-FIX: Auto-Resend für Bestätigungslinks und sprechende Fehler bei Doppel-Registrierung
// [2026-04-24 10:30] - SEC-FIX: Harten Türsteher (E-Mail Verifizierung) eingebaut & Gast-Login für Helfer aktiviert
// [2026-04-20 18:05] - FEATURE: lastActivityAt Zeitstempel beim App-Initialisieren aktualisieren
// --- START OF FILE ---
// src/store/slices/createAuthSlice.ts
import type { StateCreator } from 'zustand';
import type { User } from '../../core/types/models';
import { auth, db } from '../../services/firebase';
import { onAuthStateChanged, signOut, signInWithEmailAndPassword, sendPasswordResetEmail, createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { collection, query, where, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
import type { Result } from '../../core/types/shared';

// CHIRURGISCHER EINGRIFF: Import des globalen States, damit TypeScript das volle Bild hat
import type { StoreState } from '../useClubStore';

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

async function resolveUserProfile(firebaseUser: { uid: string, email: string | null }): Promise<User | null> {
  if (!firebaseUser.email) return null;
  
  const normalizedEmail = firebaseUser.email.toLowerCase().trim();
  const now = Date.now();
  
  const q = query(collection(db, 'users'), where('email', '==', normalizedEmail));
  const querySnapshot = await getDocs(q);

  let userData: User | null = null;
  let userDocId: string | null = null;
  let helperDocId: string | null = null;

  if (!querySnapshot.empty) {
    userDocId = querySnapshot.docs[0].id;
    userData = querySnapshot.docs[0].data() as User;
  } else {
    const docRef = doc(db, 'users', firebaseUser.uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      userDocId = firebaseUser.uid;
      userData = docSnap.data() as User;
    } else {
      const helperQ = query(collection(db, 'helpers'), where('email', '==', normalizedEmail));
      const helperSnap = await getDocs(helperQ);
      
      if (!helperSnap.empty) {
        helperDocId = helperSnap.docs[0].id;
        const helperData = helperSnap.docs[0].data();
        
        userData = {
          id: firebaseUser.uid,
          schemaVersion: '1.0',
          name: helperData.name || 'Helfer',
          amt: 'Externer Helfer',
          rolle: 'Gast',
          email: normalizedEmail,
          telefon: helperData.telefon || '',
          groupIds: [],
        } as User;
      }
    }
  }

  if (userData) {
    if (userDocId) {
      await updateDoc(doc(db, 'users', userDocId), { lastActivityAt: now });
      const helperQ = query(collection(db, 'helpers'), where('email', '==', normalizedEmail));
      const helperSnap = await getDocs(helperQ);
      if (!helperSnap.empty) {
        await updateDoc(doc(db, 'helpers', helperSnap.docs[0].id), { hasAppAccess: true, lastAppLoginAt: now });
      }
    } else if (helperDocId) {
      await updateDoc(doc(db, 'helpers', helperDocId), { lastActivityAt: now, hasAppAccess: true, lastAppLoginAt: now });
    }
    userData = { ...userData, lastActivityAt: now };
  }

  return userData;
}

// CHIRURGISCHER EINGRIFF: Die Definition ist nun mit StoreState gekoppelt, nicht mehr nur isoliert mit AuthSlice
export const createAuthSlice: StateCreator<StoreState, [], [], AuthSlice> = (set, get) => ({
  user: null,
  isAuthenticated: false,
  isAuthLoading: true,
  
  initializeAuth: () => {
    onAuthStateChanged(auth, async (firebaseUser) => {
      set({ isAuthLoading: true });
      
      if (firebaseUser && firebaseUser.email) {
        if (!firebaseUser.emailVerified) {
          console.warn("Zugriff blockiert: E-Mail noch nicht verifiziert.");
          await signOut(auth);
          set({ user: null, isAuthenticated: false, isAuthLoading: false });
          return;
        }

        try {
          const userData = await resolveUserProfile(firebaseUser);
          
          if (userData) {
            set({ user: userData, isAuthenticated: true, isAuthLoading: false });
          } else {
            console.error(`Kein Profil für die E-Mail ${firebaseUser.email} gefunden.`);
            await signOut(auth);
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
      
      if (!userCredential.user.emailVerified) {
        try {
          await sendEmailVerification(userCredential.user);
        } catch (e) {
          // Firebase Rate-Limit ignorieren
        }
        await signOut(auth);
        throw new Error("Dein Account ist noch nicht aktiviert. Wir haben dir gerade einen NEUEN Bestätigungslink gesendet! (Bitte prüfe auch deinen Spam-Ordner).");
      }

      const userData = await resolveUserProfile(userCredential.user);
      
      if (!userData) {
        await signOut(auth);
        throw new Error(`Zugriff verweigert: Deine E-Mail (${email}) steht nicht auf der Helfer- oder Vorstandsliste.`);
      }

      set({ user: userData, isAuthenticated: true });
      return { success: true, data: userData };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e : new Error(String(e)) };
    }
  },
  
  register: async (email, pass) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
      await sendEmailVerification(userCredential.user);
      await signOut(auth);
      return { success: true, data: undefined };
    } catch (e: any) {
      if (e.code === 'auth/email-already-in-use') {
        return { 
          success: false, 
          error: new Error('Diese E-Mail ist bereits registriert! Bitte wechsle auf "Mit E-Mail Anmelden". Falls dir der Link fehlt, logge dich einfach ein – wir senden dir dann automatisch einen neuen.') 
        };
      }
      return { success: false, error: e instanceof Error ? e : new Error(String(e)) };
    }
  },
  
  logout: async () => {
    const store = get() as any;
    Object.keys(store).forEach(key => {
      if (key.startsWith('unsub') && typeof store[key] === 'function') {
        store[key]();
      }
    });

    await signOut(auth);
    
    // CHIRURGISCHER EINGRIFF: 'as any' entfernt. TypeScript bewacht diesen Block ab sofort.
    set({ 
      user: null, 
      isAuthenticated: false,
      tasks: [],
      events: [],
      eventAgenda: [],
      currentEvent: null,
      users: [],
      helpers: [],
      groups: [],
      templates: [],
      calendarEvents: [],
      calendarSubscriptions: []
    });
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
// --- END OF FILE ---