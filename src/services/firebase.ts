// [2026-05-16] - FIX: auth.languageCode = 'de' wieder sauber aktiviert, um Mails clientseitig auf Deutsch zu forcieren.
// 2026-04-14 14:50 - FIX: Safari CORS und Timeout-Bug durch LongPolling behoben
// 2026-05-15 14:15 - FIX: Systemsprache für Firebase Auth (Mails) hart auf Deutsch gesetzt
// src/services/firebase.ts
import { initializeApp } from 'firebase/app';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);

const db = initializeFirestore(app, {
  // CHIRURGISCHER EINGRIFF: Zwingt Firebase zu einer stabilen Safari-Verbindung ohne Verbindungsabbruch
  experimentalForceLongPolling: true,
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
});

const auth = getAuth(app);

// CHIRURGISCHER EINGRIFF: Setzt die Sprache für den Mail-Versand (Aktivierung/Passwort) stabil auf Deutsch
auth.languageCode = 'de';

export { app, db, auth };
// --- END OF FILE ---