// src/features/Auth/LoginView.tsx
import React, { useState } from 'react';
import { useClubStore } from '../../store/useClubStore';
import { Mail, Lock } from 'lucide-react';
// @ts-ignore - TS doesn't natively resolve absolute public paths without aliases
import logo from '/papatodo-logo.png';

export const LoginView: React.FC = () => {
  const { loginWithEmail, loginWithGoogle } = useClubStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [trustedDevice, setTrustedDevice] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const result = await loginWithEmail(email, password, trustedDevice);
    if (!result.success) {
      setError(result.error?.message || 'Login fehlgeschlagen. Bitte Zugangsdaten prüfen.');
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    const result = await loginWithGoogle(trustedDevice);
    if (!result.success) {
      setError(result.error?.message || 'Google Login fehlgeschlagen.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-lg">
        <img src={logo} alt="PapaToDo Logo" className="mx-auto h-24 w-auto mb-6" />
        <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">PapaToDo Login</h2>
        {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm">{error}</div>}
        <form onSubmit={handleEmailLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">E-Mail</label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                placeholder="vorstand@verein.de"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Passwort</label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                placeholder="••••••••"
              />
            </div>
          </div>
          
          <div className="flex items-center mt-4">
            <input
              id="trusted"
              type="checkbox"
              checked={trustedDevice}
              onChange={(e) => setTrustedDevice(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="trusted" className="ml-2 block text-sm text-gray-900 font-medium">
              Auf diesem Gerät angemeldet bleiben (Vertrauenswürdiges Gerät)
            </label>
          </div>

          <button
            type="submit"
            className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow transition duration-200 mt-6"
          >
            Anmelden
          </button>
        </form>

        <div className="mt-6 flex items-center justify-center">
          <span className="bg-white px-2 text-sm text-gray-500">Oder</span>
        </div>

        <button
          onClick={handleGoogleLogin}
          className="mt-6 w-full py-2 px-4 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold rounded-lg shadow-sm transition duration-200 flex items-center justify-center"
        >
          <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Mit Google anmelden
        </button>
      </div>
    </div>
  );
};

// Exakte Zeilenzahl: 110
