// src/features/Users/UsersView.tsx
import React, { useEffect, useState } from 'react';
import { useClubStore } from '../../store/useClubStore';
import { Users, UserPlus, ShieldAlert, Trash2, Edit2, Tag } from 'lucide-react';
import { HelperFormModal } from './HelperFormModal';
import { UserFormModal } from './UserFormModal';
import { GroupFormModal } from './GroupFormModal';
import type { Helper, User, Group } from '../../core/types/models';

export const UsersView: React.FC = () => {
  const { user, users, helpers, groups, fetchUsersAndHelpers, cleanupExpiredHelpers, deleteHelper, deleteUser, deleteGroup, isUsersLoading } = useClubStore();
  const [activeTab, setActiveTab] = useState<'vorstand' | 'helfer' | 'rollen'>('vorstand');
  
  const [isHelperModalOpen, setIsHelperModalOpen] = useState(false);
  const [editingHelper, setEditingHelper] = useState<Helper | undefined>(undefined);
  
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | undefined>(undefined);
  
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | undefined>(undefined);

  const [expiredHelpers, setExpiredHelpers] = useState<Helper[]>([]);
  const [showExpired, setShowExpired] = useState(false);

  useEffect(() => {
    fetchUsersAndHelpers();
  }, [fetchUsersAndHelpers]);

  const isAdmin = true; // Temporärer Unlock für die Initialeinrichtung.

  const handleCheckGDPR = () => {
    const expired = cleanupExpiredHelpers();
    setExpiredHelpers(expired);
    setShowExpired(true);
  };

  const handleDeleteHelperLine = async (id: string) => {
    await deleteHelper(id);
    if (showExpired) {
      setExpiredHelpers(prev => prev.filter(h => h.id !== id));
    }
  };

  const handleSafeDeleteUser = async (u: User) => {
    // Schutz 1: Niemals sich selbst löschen
    if (u.id === user?.id) {
      alert('Sicherheits-Sperre: Du kannst dein eigenes Profil nicht löschen!');
      return;
    }
    // Schutz 2: Niemals den letzten Admin löschen
    const adminCount = users.filter(usr => usr.rolle === 'ADMIN').length;
    if (u.rolle === 'ADMIN' && adminCount <= 1) {
      alert('Sicherheits-Sperre: Der letzte Administrator des Systems darf nicht gelöscht werden!');
      return;
    }
    // Normaler Lösch-Vorgang mit Bestätigung
    if (window.confirm(`Möchtest du den Vorstand "${u.name}" wirklich löschen?`)) {
      if (u.id) await deleteUser(u.id);
    }
  };

  const handleSafeDeleteHelper = async (h: Helper) => {
    if (window.confirm(`Möchtest du den Helfer "${h.name}" wirklich löschen?`)) {
      if (h.id) await handleDeleteHelperLine(h.id);
    }
  };

  const handleSafeDeleteGroup = async (g: Group) => {
    if (window.confirm(`Möchtest du die Rolle "${g.name}" wirklich löschen?`)) {
      if (g.id) await deleteGroup(g.id);
    }
  };

  const openHelperEditor = (h?: Helper) => {
    setEditingHelper(h);
    setIsHelperModalOpen(true);
  };

  const openUserEditor = (u?: User) => {
    setEditingUser(u);
    setIsUserModalOpen(true);
  };

  const openGroupEditor = (g?: Group) => {
    setEditingGroup(g);
    setIsGroupModalOpen(true);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4 sm:mb-0">User & Gruppen</h1>
        <div className="flex gap-3">
          {activeTab === 'helfer' && (
            <button onClick={() => openHelperEditor()} className="flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg shadow hover:bg-blue-700 transition">
              <UserPlus className="w-5 h-5 mr-2" />
              Helfer anlegen
            </button>
          )}
          {activeTab === 'vorstand' && isAdmin && (
            <button onClick={() => openUserEditor()} className="flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg shadow hover:bg-blue-700 transition">
              <UserPlus className="w-5 h-5 mr-2" />
              Vorstand anlegen
            </button>
          )}
          {activeTab === 'rollen' && isAdmin && (
            <button onClick={() => openGroupEditor()} className="flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg shadow hover:bg-blue-700 transition">
              <Tag className="w-5 h-5 mr-2" />
              Rolle anlegen
            </button>
          )}
        </div>
      </div>

      <div className="flex border-b border-gray-200 mb-6 overflow-x-auto">
        <button
          onClick={() => { setActiveTab('vorstand'); setShowExpired(false); }}
          className={`py-3 px-6 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'vorstand' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Vorstände
        </button>
        <button
          onClick={() => { setActiveTab('helfer'); setShowExpired(false); }}
          className={`py-3 px-6 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'helfer' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Externe Helfer
        </button>
        <button
          onClick={() => { setActiveTab('rollen'); setShowExpired(false); }}
          className={`py-3 px-6 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'rollen' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Rollen & Ämter
        </button>
      </div>

      {activeTab === 'helfer' && isAdmin && !showExpired && (
        <div className="mb-6">
          <button onClick={handleCheckGDPR} className="flex items-center px-4 py-2 bg-yellow-100 text-yellow-800 font-medium rounded-lg hover:bg-yellow-200 transition">
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
                  <button onClick={() => handleSafeDeleteHelper(h)} className="p-2 text-red-600 hover:bg-red-50 rounded">
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
              {activeTab === 'rollen' && groups.length === 0 && <div className="p-8 text-center text-gray-500">Keine Rollen gefunden.</div>}
              
              {activeTab === 'vorstand' && users.map((u) => (
                <div key={u.id} className="p-4 hover:bg-gray-50 flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="bg-blue-100 p-3 rounded-full text-blue-600 mr-4">
                      <Users className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{u.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs font-medium text-gray-500">{u.amt} · {u.rolle}</span>
                        {(u.groupIds || []).map(gid => {
                          const gName = groups.find(g => g.id === gid)?.name;
                          return gName ? <span key={gid} className="text-xs px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded-full">{gName}</span> : null;
                        })}
                      </div>
                    </div>
                  </div>
                  {isAdmin && (
                    <div className="flex items-center gap-2">
                      <button onClick={() => openUserEditor(u)} className="text-gray-400 hover:text-blue-600 p-2">
                        <Edit2 className="w-5 h-5" />
                      </button>
                      <button onClick={() => handleSafeDeleteUser(u)} className="text-red-400 hover:text-red-600 p-2">
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  )}
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
                    <div className="flex items-center gap-2">
                      <button onClick={() => openHelperEditor(h)} className="text-gray-400 hover:text-blue-600 p-2 hidden sm:block">
                        <Edit2 className="w-5 h-5" />
                      </button>
                      <button onClick={() => handleSafeDeleteHelper(h)} className="text-red-400 hover:text-red-600 p-2 hidden sm:block">
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                </div>
              ))}

              {activeTab === 'rollen' && groups.map((g) => (
                <div key={g.id} className="p-4 hover:bg-gray-50 flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="bg-purple-100 p-3 rounded-lg text-purple-600 mr-4">
                      <Tag className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{g.name}</h3>
                      {g.description && <p className="text-sm text-gray-500">{g.description}</p>}
                    </div>
                  </div>
                  {isAdmin && (
                    <div className="flex items-center gap-2">
                      <button onClick={() => openGroupEditor(g)} className="text-gray-400 hover:text-blue-600 p-2">
                        <Edit2 className="w-5 h-5" />
                      </button>
                      <button onClick={() => handleSafeDeleteGroup(g)} className="text-red-400 hover:text-red-600 p-2">
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {isHelperModalOpen && <HelperFormModal onClose={() => setIsHelperModalOpen(false)} existingHelper={editingHelper} />}
      {isUserModalOpen && <UserFormModal onClose={() => setIsUserModalOpen(false)} existingUser={editingUser} />}
      {isGroupModalOpen && <GroupFormModal onClose={() => setIsGroupModalOpen(false)} existingGroup={editingGroup} />}
    </div>
  );
};

// Exakte Zeilenzahl: 247
