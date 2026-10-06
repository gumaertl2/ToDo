// [2026-10-06] - UX-FIX: E-Mail als URL-Parameter im Magic Link übergeben, um das window.prompt bei leerem localStorage (z.B. Inkognito) zu umgehen.
// [2026-10-06] - UX-FIX: Stummen Türsteher gesprächig gemacht. Schlägt der Magic Link oder die Profil-Prüfung fehl, wird nun ein sichtbares window.alert ausgegeben.
// [2026-10-06] - BUGFIX: Race-Condition beim Magic Link behoben. 'isProcessingMagicLink' blockiert den AuthGuard-Rauswurf, bis der Link fertig geladen ist.
// [2026-10-06] - FEATURE: Magic Link (Passwortloser Login) Logik implementiert. 'sendMagicLink' sendet die E-Mail, 'initializeAuth' fängt den Klick-Rückkehrer ab.
// [2026-09-28] - SEC-FIX: matchLineups in den Logout-Store-Reset aufgenommen, um Geister-Daten nach Account-Wechsel zu verhindern.
// [2026-07-26] - BUGFIX: 'Gast' Hardcoding beim resolveUserProfile Fallback auf 'Mitglied' korrigiert.
// src/store/slices/createAuthSlice.ts
import type { StateCreator } from 'zustand';
import type { User } from '../../core/types/models';
import { auth, db } from '../../services/firebase';
import { 
  onAuthStateChanged, 
  signOut, 
  signInWithEmailAndPassword, 
  sendPasswordResetEmail, 
  createUserWithEmailAndPassword, 
  sendEmailVerification,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink
} from 'firebase/auth';
import { collection, query, where, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
import type { Result } from '../../core/types/shared';
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
  sendMagicLink: (email: string) => Promise<Result<void>>;
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
          rolle: 'Mitglied',
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

export const createAuthSlice: StateCreator<StoreState, [], [], AuthSlice> = (set, get) => ({
  user: null,
  isAuthenticated: false,
  isAuthLoading: true,

  initializeAuth: () => {
    let isProcessingMagicLink = false;

    if (isSignInWithEmailLink(auth, window.location.href)) {
      isProcessingMagicLink = true;
      let emailForSignIn = window.localStorage.getItem('emailForSignIn');
      
      // CHIRURGISCHER EINGRIFF: Falls der localStorage leer ist, holen wir die E-Mail lautlos aus der URL
      if (!emailForSignIn) {
        const searchParams = new URLSearchParams(window.location.search);
        emailForSignIn = searchParams.get('email');
      }
      
      // Fallback, falls weder im Speicher noch in der URL eine E-Mail gefunden wurde
      if (!emailForSignIn) {
        emailForSignIn = window.prompt('Sicherheitsprüfung: Bitte bestätige deine E-Mail-Adresse für den Login:');
      }
      
      if (emailForSignIn) {
        signInWithEmailLink(auth, emailForSignIn, window.location.href)
          .then(() => {
            window.localStorage.removeItem('emailForSignIn');
            // Die URL wieder bereinigen (E-Mail und kryptische Parameter entfernen)
            window.history.replaceState(null, '', window.location.pathname);
          })
          .catch((error) => {
            console.error("Magic Link Fehler:", error);
            window.alert("Fehler beim Magic Link Login: " + error.message + "\n(Tipp: Der Link wurde eventuell schon einmal geklickt oder ist abgelaufen. Fordere einfach einen neuen an.)");
            set({ isAuthLoading: false }); 
          });
      } else {
        isProcessingMagicLink = false;
        set({ isAuthLoading: false });
      }
    }

    onAuthStateChanged(auth, async (firebaseUser) => {
      // Race Condition Block
      if (isProcessingMagicLink && !firebaseUser) {
        return;
      }

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
            window.alert(`Zugriff verweigert: Die E-Mail ${firebaseUser.email} steht nicht auf der offiziellen Vereinsliste. Du wurdest aus Sicherheitsgründen abgemeldet.`);
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

  sendMagicLink: async (email) => {
    try {
      // CHIRURGISCHER EINGRIFF: Wir hängen die E-Mail-Adresse direkt als Parameter an den Link
      const returnUrl = new URL(window.location.href);
      returnUrl.searchParams.set('email', email);
      
      const actionCodeSettings = {
        url: returnUrl.toString(), 
        handleCodeInApp: true,
      };
      await sendSignInLinkToEmail(auth, email, actionCodeSettings);
      window.localStorage.setItem('emailForSignIn', email);
      return { success: true, data: undefined };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e : new Error(String(e)) };
    }
  },

  login: async (email, pass) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, pass);
      
      if (!userCredential.user.emailVerified) {
        try {
          await sendEmailVerification(userCredential.user);
        } catch (e) {
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
      calendarSubscriptions: [],
      matchLineups: [] 
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