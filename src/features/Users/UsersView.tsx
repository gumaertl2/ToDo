// src/features/Users/UsersView.tsx
import React, { useEffect, useState } from 'react';
import { useClubStore } from '../../store/useClubStore';
import { Users, UserPlus, ShieldAlert, Trash2, Edit2, Tag, Clock, Calendar } from 'lucide-react';
import { HelperFormModal } from './HelperFormModal.tsx';
import { UserFormModal } from './UserFormModal.tsx';
import { GroupFormModal } from './GroupFormModal.tsx';
import { ItemFormModal } from '../Shared/ItemFormModal.tsx';
import type { Helper, User, Group, AgendaItem } from '../../core/types/models';

export const UsersView: React.FC = () => {
  const { user, users, helpers, groups, templates, events, tasks, fetchUsersAndHelpers, fetchTemplatesAndRoutines, fetchEvents, fetchTasks, saveAgendaItem, cleanupExpiredHelpers, deleteHelper, deleteUser, deleteGroup, isUsersLoading } = useClubStore();
  
  const [activeTab, setActiveTab] = useState<'vorstand' | 'helfer' | 'rollen'>('vorstand');
  
  const [isHelperModalOpen, setIsHelperModalOpen] = useState(false);
  const [editingHelper, setEditingHelper] = useState<Helper | undefined>(undefined);
  
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | undefined>(undefined);
  
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | undefined>(undefined);

  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<AgendaItem | null>(null);

  const [expiredHelpers, setExpiredHelpers] = useState<Helper[]>([]);
  const [showExpired, setShowExpired] = useState(false);

  useEffect(() => {
    fetchUsersAndHelpers();
    fetchTemplatesAndRoutines();
    fetchEvents();
    fetchTasks();
  }, [fetchUsersAndHelpers, fetchTemplatesAndRoutines, fetchEvents, fetchTasks]);

  const isAdmin = true;

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
    if (u.id === user?.id) {
      alert('Sicherheits-Sperre: Du kannst dein eigenes Profil nicht löschen!');
      return;
    }
    const adminCount = users.filter(usr => usr.rolle === 'ADMIN').length;
    if (u.rolle === 'ADMIN' && adminCount <= 1) {
      alert('Sicherheits-Sperre: Der letzte Administrator des Systems darf nicht gelöscht werden!');
      return;
    }
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

  const toggleGroupExpanded = (id: string) => {
    const next = new Set(expandedGroups);
    if (next.has(id)) next.delete(id); else next.add(id);
    setExpandedGroups(next);
  };

  const toggleAllGroups = () => {
    if (expandedGroups.size === groups.length && groups.length > 0) {
      setExpandedGroups(new Set());
    } else {
      setExpandedGroups(new Set(groups.map(g => g.id)));
    }
  };

  // CHIRURGISCHER EINGRIFF: Extraktion der Start- und End-Daten für den Lebenszyklus
  const getGroupRoutines = (gId: string) => {
    const routineMap = new Map<string, { title: string, pattern?: string, activeTask?: AgendaItem, completedCount: number, eventName?: string, createdAt?: number, endDate?: number }>();

    templates.filter(t => t.assigneeGroupIds?.includes(gId)).forEach(t => {
      routineMap.set(t.title, { 
        title: t.title, 
        pattern: t.routinePattern, 
        completedCount: 0,
        createdAt: t.createdAt,
        endDate: t.routineEndDate
      });
    });

    tasks.filter(t => t.isRoutine && t.assigneeGroupIds?.includes(gId)).forEach(t => {
      const entry = routineMap.get(t.title) || { 
        title: t.title, 
        pattern: t.routinePattern, 
        completedCount: 0,
        createdAt: t.createdAt,
        endDate: t.routineEndDate
      };
      
      // Das jeweils älteste Datum als "Start" der Daueraufgabe setzen
      if (t.createdAt && (!entry.createdAt || t.createdAt < entry.createdAt)) {
        entry.createdAt = t.createdAt;
      }
      // Wenn es ein aktuelleres Enddatum in einer Aufgabe gibt, dieses übernehmen
      if (t.routineEndDate && (!entry.endDate || t.routineEndDate > entry.endDate)) {
        entry.endDate = t.routineEndDate;
      }

      if (t.status === 'ERLEDIGT' || t.progress === 100) {
        entry.completedCount++;
      } else {
        entry.activeTask = t;
        const ev = events.find(e => e.id === t.eventId);
        if (ev) entry.eventName = ev.title;
      }
      routineMap.set(t.title, entry);
    });

    return Array.from(routineMap.values());
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
          
          {activeTab === 'rollen' && (
            <>
              <button onClick={toggleAllGroups} className="flex items-center justify-center w-10 h-10 bg-white text-gray-700 border border-gray-300 font-mono font-bold text-lg rounded-lg hover:bg-gray-50 shadow-sm transition-colors" title="Alle Daueraufgaben ein-/ausblenden">
                +/-
              </button>
              {isAdmin && (
                <button onClick={() => openGroupEditor()} className="flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg shadow hover:bg-blue-700 transition">
                  <Tag className="w-5 h-5 mr-2" />
                  Rolle anlegen
                </button>
              )}
            </>
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
                <div key={u.id} className="p-4 hover:bg-gray-50 flex items-center justify-between transition-colors">
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
                <div key={h.id} className="p-4 hover:bg-gray-50 flex justify-between items-center transition-colors">
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

              {activeTab === 'rollen' && groups.map((g) => {
                const groupRoutines = getGroupRoutines(g.id);
                const isExpanded = expandedGroups.has(g.id);
                
                return (
                  <div key={g.id} className="p-4 hover:bg-gray-50 flex flex-col justify-center transition-colors border-b border-gray-100 last:border-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="bg-purple-100 p-3 rounded-lg text-purple-600 mr-4">
                          <Tag className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{g.name}</h3>
                          {g.description && <p className="text-sm text-gray-500">{g.description}</p>}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {groupRoutines.length > 0 && (
                          <button onClick={() => toggleGroupExpanded(g.id)} className="w-8 h-8 flex items-center justify-center text-gray-500 hover:bg-gray-200 rounded text-lg font-mono font-bold leading-none transition-colors" title="Stellenbeschreibung anzeigen">
                            {isExpanded ? '-' : '+'}
                          </button>
                        )}
                        {isAdmin && (
                          <div className="flex items-center gap-2 ml-2 border-l border-gray-200 pl-2">
                            <button onClick={() => openGroupEditor(g)} className="text-gray-400 hover:text-blue-600 p-2">
                              <Edit2 className="w-5 h-5" />
                            </button>
                            <button onClick={() => handleSafeDeleteGroup(g)} className="text-red-400 hover:text-red-600 p-2">
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {isExpanded && groupRoutines.length > 0 && (
                      <div className="mt-4 ml-[60px] pl-4 border-l-2 border-purple-200">
                        <h4 className="text-xs font-bold text-purple-800 uppercase tracking-wider mb-3">Stellenbeschreibung: Daueraufgaben</h4>
                        <div className="space-y-2">
                          {groupRoutines.map((r, i) => {
                            const pMap: any = { weekly: 'Wöchentlich', monthly: 'Monatlich', quarterly: 'Quartalsweise', yearly: 'Jährlich' };
                            const routineText = r.pattern ? pMap[r.pattern] || r.pattern : 'Routine';
                            
                            return (
                              <div 
                                key={i} 
                                onClick={() => { if (r.activeTask) { setEditingTask(r.activeTask); setIsTaskModalOpen(true); } }}
                                className={`bg-white border border-gray-200 p-2.5 rounded-lg flex flex-col shadow-sm ${r.activeTask ? 'cursor-pointer hover:border-blue-300 hover:shadow-md transition-all' : ''}`}
                                title={r.activeTask ? "Klicken um offene Aufgabe zu bearbeiten" : ""}
                              >
                                <div className="font-bold text-sm text-gray-800 flex justify-between items-start">
                                  <span>{r.title}</span>
                                  {r.completedCount > 0 && (
                                    <span className="flex items-center text-[10px] text-gray-500 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100" title={`${r.completedCount} mal in der Historie abgeschlossen`}>
                                      <Clock className="w-3 h-3 mr-1" /> {r.completedCount}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                  <span className="text-[10px] font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                                    ↻ {routineText}
                                  </span>
                                  {r.eventName && (
                                    <span className="text-[10px] font-medium bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full flex items-center">
                                       <Calendar className="w-3 h-3 mr-1" /> {r.eventName}
                                    </span>
                                  )}
                                  {!r.activeTask && r.completedCount === 0 && (
                                     <span className="text-[10px] font-medium text-gray-400 italic">Noch nicht in einer Sitzung aktiv</span>
                                  )}
                                </div>
                                
                                {/* CHIRURGISCHER EINGRIFF: Anzeige der Start/End-Datum Logik */}
                                <div className="mt-2 pt-2 border-t border-gray-100 flex items-center text-[10px] text-gray-500">
                                   <span className="font-medium">
                                     Start: {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : 'Unbekannt'}
                                   </span>
                                   <span className="mx-1.5">·</span>
                                   <span className="font-medium">
                                     {r.endDate ? `Ende: ${new Date(r.endDate).toLocaleDateString()}` : 'ohne Ende'}
                                   </span>
                                </div>
                                
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {isHelperModalOpen && <HelperFormModal onClose={() => setIsHelperModalOpen(false)} existingHelper={editingHelper} />}
      {isUserModalOpen && <UserFormModal onClose={() => setIsUserModalOpen(false)} existingUser={editingUser} />}
      {isGroupModalOpen && <GroupFormModal onClose={() => setIsGroupModalOpen(false)} existingGroup={editingGroup} />}
      
      {isTaskModalOpen && editingTask && (
        <ItemFormModal 
          isOpen={isTaskModalOpen} 
          existingItem={editingTask} 
          onClose={() => setIsTaskModalOpen(false)} 
          onSave={async (data) => { 
            await saveAgendaItem(data); 
            fetchTasks(); 
            setIsTaskModalOpen(false); 
          }} 
        />
      )}
    </div>
  );
};
// Exakte Zeilenzahl: 388