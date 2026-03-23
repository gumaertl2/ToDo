// src/features/Users/UsersView.tsx
import React, { useEffect, useState } from 'react';
import { useClubStore } from '../../store/useClubStore';
import { Users, UserPlus, ShieldAlert, Trash2 } from 'lucide-react';
import { HelperFormModal } from './HelperFormModal';
import type { Helper } from '../../core/types/models';

export const UsersView: React.FC = () => {
  const { user, users, helpers, fetchUsersAndHelpers, cleanupExpiredHelpers, deleteHelper, isUsersLoading } = useClubStore();
  const [activeTab, setActiveTab] = useState<'vorstand' | 'helfer'>('vorstand');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expiredHelpers, setExpiredHelpers] = useState<Helper[]>([]);
  const [showExpired, setShowExpired] = useState(false);

  useEffect(() => {
    fetchUsersAndHelpers();
  }, [fetchUsersAndHelpers]);

  const isAdmin = user?.rolle === 'ADMIN';

  const handleCheckGDPR = () => {
    const expired = cleanupExpiredHelpers();
    setExpiredHelpers(expired);
    setShowExpired(true);
  };

  const handleDeleteHelper = async (id: string) => {
    await deleteHelper(id);
    if (showExpired) {
      setExpiredHelpers(prev => prev.filter(h => h.id !== id));
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4 sm:mb-0">User & Gruppen</h1>
        {activeTab === 'helfer' && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg shadow hover:bg-blue-700 transition"
          >
            <UserPlus className="w-5 h-5 mr-2" />
            Helfer anlegen
          </button>
        )}
      </div>

      <div className="flex border-b border-gray-200 mb-6">
        <button
          onClick={() => { setActiveTab('vorstand'); setShowExpired(false); }}
          className={`py-3 px-6 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'vorstand' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Vorstände
        </button>
        <button
          onClick={() => { setActiveTab('helfer'); setShowExpired(false); }}
          className={`py-3 px-6 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'helfer' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Externe Helfer
        </button>
      </div>

      {activeTab === 'helfer' && isAdmin && !showExpired && (
        <div className="mb-6">
          <button
            onClick={handleCheckGDPR}
            className="flex items-center px-4 py-2 bg-yellow-100 text-yellow-800 font-medium rounded-lg hover:bg-yellow-200 transition"
          >
            <ShieldAlert className="w-5 h-5 mr-2" />
            DSGVO-Bereinigung prüfen
          </button>
        </div>
      )}

      {showExpired && isAdmin ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-yellow-900 flex items-center">
              <ShieldAlert className="w-5 h-5 mr-2" /> 
              Abgelaufene Helfer-Profile zur Löschung ({expiredHelpers.length})
            </h3>
            <button onClick={() => setShowExpired(false)} className="text-sm text-yellow-800 underline">Zurück</button>
          </div>
          {expiredHelpers.length === 0 ? (
            <p className="text-yellow-800">Keine abgelaufenen Profile gefunden. Alles DSGVO-konform!</p>
          ) : (
            <div className="space-y-3">
              {expiredHelpers.map((h) => (
                <div key={h.id} className="flex justify-between items-center bg-white p-3 rounded shadow-sm border border-yellow-100">
                  <div>
                    <div className="font-medium text-gray-900">{h.name}</div>
                    <div className="text-sm text-gray-500">Letzte Aktivität: {new Date(h.lastActivityAt || 0).toLocaleDateString()}</div>
                  </div>
                  <button onClick={() => handleDeleteHelper(h.id)} className="p-2 text-red-600 hover:bg-red-50 rounded">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex-1 overflow-hidden flex flex-col">
          {isUsersLoading ? (
            <div className="p-8 text-center text-gray-500 animate-pulse">Lade Daten...</div>
          ) : (
            <div className="divide-y divide-gray-200 flex-1 overflow-y-auto">
              {activeTab === 'vorstand' && users.length === 0 && <div className="p-8 text-center text-gray-500">Keine Vorstände gefunden.</div>}
              {activeTab === 'helfer' && helpers.length === 0 && <div className="p-8 text-center text-gray-500">Keine Helfer gefunden.</div>}
              
              {activeTab === 'vorstand' && users.map((u) => (
                <div key={u.id} className="p-4 hover:bg-gray-50 flex items-center">
                  <div className="bg-blue-100 p-3 rounded-full text-blue-600 mr-4">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{u.name}</h3>
                    <p className="text-sm text-gray-500">{u.amt} · {u.rolle}</p>
                  </div>
                </div>
              ))}

              {activeTab === 'helfer' && helpers.map((h) => (
                <div key={h.id} className="p-4 hover:bg-gray-50 flex justify-between items-center">
                  <div className="flex items-center">
                    <div className="bg-green-100 p-3 rounded-full text-green-600 mr-4">
                      <Users className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{h.name}</h3>
                      <p className="text-sm text-gray-500">{h.bezug}</p>
                    </div>
                  </div>
                  {isAdmin && (
                    <button onClick={() => handleDeleteHelper(h.id)} className="text-red-400 hover:text-red-600 p-2 hidden sm:block">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {isModalOpen && <HelperFormModal onClose={() => setIsModalOpen(false)} />}
    </div>
  );
};

// Exakte Zeilenzahl: 156
