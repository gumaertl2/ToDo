// src/features/Auth/LoginView.tsx
import React, { useState } from 'react';
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
  const [isTrusted, setIsTrusted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const navigate = useNavigate();
  const { login, resetPassword } = useClubStore();

  const handlePersistence = async () => {
    const persistence = isTrusted ? browserLocalPersistence : browserSessionPersistence;
    await setPersistence(auth, persistence);
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      await handlePersistence();
      const result = await login(email, password);
      if (result.success) {
        navigate('/');
      } else {
        setError(result.error?.message || 'Login fehlgeschlagen.');
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    try {
      await handlePersistence();
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      navigate('/');
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(String(err));
      }
    }
  };

  const handlePasswordReset = async () => {
    setResetMessage(null);
    if (!email.trim()) {
      setResetMessage({ type: 'error', text: 'Bitte gib zuerst deine E-Mail-Adresse oben in das Feld ein.' });
      return;
    }
    setIsLoading(true);
    const result = await resetPassword(email.trim());
    setIsLoading(false);
    if (result.success) {
      setResetMessage({ type: 'success', text: 'Ein Link zum Setzen des Passworts wurde an deine E-Mail gesendet!' });
    } else {
      setResetMessage({ type: 'error', text: 'Fehler: ' + (result.error?.message || 'Link konnte nicht gesendet werden.') });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-lg">
        <img src={logo} alt="PapaToDo Logo" className="mx-auto h-24 w-auto mb-6" />
        <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">PapaToDo Login</h2>
        
        {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm">{error}</div>}
        
        {resetMessage && (
          <div className={`p-3 rounded-lg text-sm mb-4 ${resetMessage.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {resetMessage.text}
          </div>
        )}

        <form onSubmit={handleEmailLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">E-Mail</label>
            <input
              type="email"
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border focus:ring-blue-500 focus:border-blue-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Passwort</label>
            <input
              type="password"
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border focus:ring-blue-500 focus:border-blue-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
            />
          </div>
          <div className="flex items-center mt-4">
            <input
              id="trusted"
              type="checkbox"
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              checked={isTrusted}
              onChange={(e) => setIsTrusted(e.target.checked)}
              disabled={isLoading}
            />
            <label htmlFor="trusted" className="ml-2 block text-sm text-gray-900">
              Auf diesem Gerät angemeldet bleiben / Vertrauenswürdiges Gerät
            </label>
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? 'Lädt...' : 'Mit E-Mail Anmelden'}
          </button>
        </form>

        <div className="text-center mt-4">
          <button 
            type="button" 
            onClick={handlePasswordReset} 
            disabled={isLoading}
            className="text-sm text-blue-600 hover:text-blue-800 hover:underline font-medium disabled:opacity-50"
          >
            Passwort vergessen / Erstes Passwort setzen?
          </button>
        </div>

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Oder</span>
            </div>
          </div>
          <div className="mt-6">
            <button
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              Mit Google anmelden
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
