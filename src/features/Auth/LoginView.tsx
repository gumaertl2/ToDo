// src/features/Auth/LoginView.tsx
// [2026-10-23] - UX-TWEAK: Arcade-Zugang als Easter-Egg auf das Logo verschoben (Doppelklick), um die Login-Maske sauber zu halten.
// [2026-10-18] - UX-SIMPLIFICATION: Registrieren- und Passwort-vergessen-Ballast entfernt. Lässt ein Nutzer beim Klick auf "Mit E-Mail anmelden" das Passwort-Feld leer, legt die App ihn (falls neu) automatisch im Hintergrund an und sendet sofort den Link zum Passwort-Erstellen.
// [2026-10-06] - BUGFIX: Auto-Redirect (useEffect) hinzugefügt, falls der Nutzer im Hintergrund via Magic Link eingeloggt wird, aber noch auf der Maske festhängt.
// [2026-10-06] - FEATURE: Magic Link Modus (Passwortloser Login via E-Mail) in die Login-Maske integriert.
// 2026-04-24 10:30 - UX-FIX: Benutzerführung für E-Mail-Verifizierung nach Registrierung optimiert
// 2026-05-15 14:40 - BUGFIX: "Angemeldet bleiben" standardmäßig aktiviert & Offline-Login-Fehler übersetzt
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../../services/firebase';
import {
  GoogleAuthProvider,
  signInWithPopup,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence
} from 'firebase/auth';
import { useClubStore } from '../../store/useClubStore';
// @ts-ignore - TS doesn't natively resolve absolute public paths without aliases
import logo from '/papatodo-logo.png';

export const LoginView: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isTrusted, setIsTrusted] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isMagicLinkMode, setIsMagicLinkMode] = useState(false);
  const [resetMessage, setResetMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const navigate = useNavigate();
  const { login, resetPassword, sendMagicLink, isAuthenticated } = useClubStore();

  // Sobald der Magic Link im Hintergrund erfolgreich war, werfen wir den Nutzer sofort in die App!
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  const handlePersistence = async () => {
    const persistence = isTrusted ? browserLocalPersistence : browserSessionPersistence;
    await setPersistence(auth, persistence);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResetMessage(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError('Bitte gib deine E-Mail-Adresse ein.');
      return;
    }

    setIsLoading(true);
    try {
      await handlePersistence();

      if (isMagicLinkMode) {
        const result = await sendMagicLink(trimmedEmail);
        if (!result.success) {
          const errorMsg = result.error?.message || '';
          if (errorMsg.includes('auth/network-request-failed')) {
            setError('Du bist offline! Für das Senden benötigst du kurz eine Internetverbindung.');
          } else {
            setError(errorMsg || 'Magic Link konnte nicht gesendet werden.');
          }
        } else {
          setResetMessage({
            type: 'success',
            text: 'Magic Link gesendet! Prüfe dein E-Mail-Postfach und tippe auf den Link, um dich direkt ohne Passwort anzumelden.'
          });
        }
        return;
      }

      // POKA-YOKE: Kein Passwort eingegeben (Neuer Kamerad oder Passwort vergessen) -> Automatisch Passwort-Link senden!
      if (!password.trim()) {
        const resetResult = await resetPassword(trimmedEmail);
        if (resetResult.success) {
          setResetMessage({
            type: 'success',
            text: 'Wir haben dir einen Link an deine E-Mail gesendet! Öffne die E-Mail und klicke auf den Link, um dein neues Passwort festzulegen.'
          });
        } else {
          const errorMsg = resetResult.error?.message || '';
          if (errorMsg.includes('auth/network-request-failed')) {
            setError('Du bist offline! Bitte schalte dein WLAN oder mobile Daten ein.');
          } else {
            setError('Fehler: ' + (errorMsg || 'Passwort-Link konnte nicht gesendet werden.'));
          }
        }
        return;
      }

      // Normale Anmeldung mit E-Mail + Passwort
      const result = await login(trimmedEmail, password);
      if (!result.success) {
        const errorMsg = result.error?.message || '';
        if (errorMsg.includes('auth/network-request-failed')) {
          setError('Du bist offline! Für den Neu-Login benötigst du kurz eine Internetverbindung.');
        } else {
          setError(errorMsg || 'Ein Fehler ist aufgetreten.');
        }
      } else {
        navigate('/');
      }
    } catch (err: any) {
      if (String(err).includes('auth/network-request-failed')) {
        setError('Du bist offline! Für den Neu-Login benötigst du kurz eine Internetverbindung.');
      } else {
        setError(String(err));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setResetMessage(null);
    try {
      await handlePersistence();
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      navigate('/');
    } catch (err: any) {
      if (err.message && err.message.includes('auth/network-request-failed')) {
        setError('Du bist offline! Für den Neu-Login benötigst du kurz eine Internetverbindung.');
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(String(err));
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-lg">
        {/* EASTER EGG: Doppelklick aufs Logo öffnet den Offline-Spielemodus */}
        <img 
          src={logo} 
          alt="PapaToDo Logo" 
          className="mx-auto h-24 w-auto mb-6 select-none cursor-pointer active:scale-95 transition-transform" 
          onDoubleClick={(e) => {
            e.preventDefault();
            navigate('/pause');
          }}
          title="PapaToDo"
        />
        <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">PapaToDo Login</h2>
        
        {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm font-medium">{error}</div>}
        
        {resetMessage && (
          <div className={`p-3 rounded-lg text-sm font-medium mb-4 ${resetMessage.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700'}`}>
            {resetMessage.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">E-Mail</label>
            <input
              type="email"
              required
              placeholder="deine.email@beispiel.de"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border focus:ring-blue-500 focus:border-blue-500 outline-none"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
            />
          </div>
          
          {!isMagicLinkMode && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Passwort</label>
              <input
                type="password"
                placeholder="Leer lassen, falls neu oder vergessen"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border focus:ring-blue-500 focus:border-blue-500 outline-none placeholder:text-gray-400 placeholder:text-xs sm:placeholder:text-sm"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
              <p className="mt-1 text-xs text-gray-500">
                Neu hier oder Passwort vergessen? Lass das Feld einfach leer und klicke auf Anmelden.
              </p>
            </div>
          )}

          <div className="flex items-center mt-4">
            <input
              id="trusted"
              type="checkbox"
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
              checked={isTrusted}
              onChange={(e) => setIsTrusted(e.target.checked)}
              disabled={isLoading}
            />
            <label htmlFor="trusted" className="ml-2 block text-sm text-gray-900 cursor-pointer">
              Auf diesem Gerät angemeldet bleiben / Vertrauenswürdiges Gerät
            </label>
          </div>
          
          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition cursor-pointer"
          >
            {isLoading 
              ? 'Lädt...' 
              : (isMagicLinkMode ? '✨ Magic Link senden' : 'Mit E-Mail Anmelden')}
          </button>
        </form>

        <div className="text-center mt-4 border-t border-gray-200 pt-4">
          {isMagicLinkMode ? (
            <button 
              type="button" 
              onClick={() => { setIsMagicLinkMode(false); setError(null); setResetMessage(null); }} 
              className="text-sm font-bold text-blue-600 hover:text-blue-800 hover:underline transition cursor-pointer"
              disabled={isLoading}
            >
              Doch lieber mit Passwort anmelden
            </button>
          ) : (
            <button 
              type="button" 
              onClick={() => { setIsMagicLinkMode(true); setError(null); setResetMessage(null); }} 
              disabled={isLoading}
              className="text-sm font-bold text-indigo-600 hover:text-indigo-800 hover:underline transition cursor-pointer"
            >
              ✨ Ohne Passwort einloggen (Magic Link)
            </button>
          )}
        </div>

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500 font-medium">Oder sofort loslegen</span>
            </div>
          </div>
          <div className="mt-6">
            <button
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full flex justify-center py-2.5 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-bold text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 transition cursor-pointer"
            >
              Mit Google anmelden
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
// --- END OF FILE ---