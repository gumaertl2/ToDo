// [2026-05-28] - BUGFIX: TS6133 (Unused variable) behoben. Der ungenutzte Import 'History' aus lucide-react wurde entfernt, um den Build-Prozess nicht zu blockieren.
// [2026-05-28] - UX-FIX: Protokoll-Archiv Buttons. Der einzelne "Zur Agenda / Protokoll" Button in der Projekt-Kachel wurde in zwei Buttons aufgeteilt ("Nächste Sitzung" und "📜 Protokolle"), um Gelegenheitsnutzern den Zugang zur Historie direkt von der Übersichtsebene aus zu ermöglichen.
// 2026-05-12 19:25 - FEATURE: Participation-First Integration. Sichtbarkeits-Isolation für Sitzungen/Projekte implementiert.
// 2026-05-13 10:00 - BUGFIX: TypeScript Compiler-Fehler behoben (UserPermissions Typos).
// 2026-05-13 11:15 - UX-FEATURE: Teilnehmer (Nutzer & Gruppen) werden nun direkt auf den Projektkarten in der Übersicht angezeigt.
// src/features/Events/EventsView.tsx
import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useClubStore } from '../../store/useClubStore';
import { Calendar, Plus, MapPin, Edit2, Trash2, ArrowRight, Archive, ArchiveRestore, Users } from 'lucide-react';
import { EventFormModal } from './EventFormModal';
import type { Event } from '../../core/types/models';

export const EventsView: React.FC = () => {
  const { 
    events, 
    fetchEvents, 
    addEvent, 
    updateEvent, 
    deleteEvent, 
    toggleArchiveEvent, 
    isEventsLoading,
    user,
    roleProfiles,
    users,
    groups
  } = useClubStore();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'ARCHIVE'>('ACTIVE');
  
  // CHIRURGISCHER EINGRIFF: Wir brauchen einen lokalen State für das Dropdown pro Karte
  const [openHistoryId, setOpenHistoryId] = useState<string | null>(null);

  const navigate = useNavigate();

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // RECHTE-CHECK: Darf der User Sitzungen global verwalten?
  const userRoleProfile = roleProfiles?.find(p => p.id === user?.roleProfileId);
  const canManageEvents = !!userRoleProfile?.permissions?.manageEvents || !!(user?.permissions as any)?.manageEvents;

  // PARTICIPATION-FILTER: Zeige nur Events, bei denen der User berechtigt ist (als Admin oder als Teilnehmer)
  const filteredEvents = useMemo(() => {
    return events.filter(ev => {
      if (canManageEvents) return true; // Admins sehen alles
      
      const isDirectParticipant = ev.participantUserIds?.includes(user?.id || '');
      const isGroupParticipant = ev.participantGroupIds?.some(gId => user?.groupIds?.includes(gId));
      
      return isDirectParticipant || isGroupParticipant;
    });
  }, [events, user, canManageEvents]);

  const handleCreate = () => {
    setEditingEvent(null);
    setIsModalOpen(true);
  };

  const handleEdit = (ev: Event) => {
    setEditingEvent(ev);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string, title: string) => {
    // CHIRURGISCHER EINGRIFF: Wording geschärft, da nun das ganze Projekt gelöscht wird.
    if (window.confirm(`Achtung: Möchtest du das gesamte Projekt "${title}" inkl. ALLER bisherigen Sitzungen, Aufgaben und Protokolle unwiderruflich löschen?`)) {
      await deleteEvent(id);
    }
  };

  const handleToggleArchive = async (ev: Event) => {
    const action = ev.isArchived ? 'wiederherstellen' : 'archivieren';
    // CHIRURGISCHER EINGRIFF: Wording geschärft, da nun das ganze Projekt archiviert wird.
    if (window.confirm(`Möchtest du das gesamte Projekt "${ev.title}" mit allen zugehörigen Sitzungen ${action}?`)) {
      await toggleArchiveEvent(ev.id, !ev.isArchived);
    }
  };

  const handleSave = async (eventData: Event) => {
    let result;
    if (editingEvent) {
      result = await updateEvent(eventData);
    } else {
      result = await addEvent(eventData);
    }
    
    if (!result.success) {
      throw new Error(result.error?.message || 'Speichern fehlgeschlagen');
    }
    setIsModalOpen(false);
    fetchEvents();
  };

  const getStatusColor = (status: Event['status']) => {
    switch(status) {
      case 'PLANUNG': return 'bg-gray-100 text-gray-700';
      case 'AKTIV': return 'bg-green-100 text-green-700';
      case 'ABGESCHLOSSEN': return 'bg-blue-100 text-blue-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const visibleEvents = useMemo(() => {
    const seriesMap = new Map<string, Event[]>();
    
    // Wir nutzen hier nun die bereits auf den User zugeschnittene "filteredEvents"-Liste
    filteredEvents.forEach(ev => {
      const sId = ev.seriesId || ev.id;
      if (!seriesMap.has(sId)) seriesMap.set(sId, []);
      seriesMap.get(sId)!.push(ev);
    });

    const latest = Array.from(seriesMap.values()).map(series => {
      series.sort((a, b) => (b.plannedStartTime || 0) - (a.plannedStartTime || 0));
      const head = series.find(e => e.status !== 'ABGESCHLOSSEN') || series[0];
      return head;
    });

    return latest
      .filter(ev => activeTab === 'ACTIVE' ? !ev.isArchived : ev.isArchived)
      .sort((a, b) => (b.plannedStartTime || 0) - (a.plannedStartTime || 0));
  }, [filteredEvents, activeTab]);

  return (
    <div className="h-full flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4 sm:mb-0">Projekte & Sitzungen</h1>
        {canManageEvents && (
          <button
            onClick={handleCreate}
            className="flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg shadow hover:bg-blue-700 transition"
          >
            <Plus className="w-5 h-5 mr-2" />
            Neues Projekt / Sitzung anlegen
          </button>
        )}
      </div>

      <div className="bg-gray-50 rounded-xl shadow-inner border border-gray-200 flex-1 overflow-hidden flex flex-col">
        <div className="flex border-b border-gray-200 px-4 pt-4 bg-white">
          <button
            onClick={() => setActiveTab('ACTIVE')}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'ACTIVE' 
                ? 'border-blue-600 text-blue-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Aktuelle & Abgeschlossene
          </button>
          <button
            onClick={() => setActiveTab('ARCHIVE')}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'ARCHIVE' 
                ? 'border-blue-600 text-blue-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Archiv
          </button>
        </div>

        {isEventsLoading && visibleEvents.length === 0 ? (
          <div className="p-8 text-center text-gray-500 animate-pulse">Lade Projekte & Sitzungen...</div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 relative">
            {isEventsLoading && <div className="absolute top-2 right-4 text-xs text-blue-500 animate-pulse bg-blue-50 px-2 py-1 rounded-full shadow-sm border border-blue-100 z-10">Aktualisiere...</div>}
            
            {visibleEvents.length === 0 && !isEventsLoading && (
              <div className="p-8 text-center text-gray-500">
                {activeTab === 'ACTIVE' ? 'Noch keine für dich relevanten Sitzungen vorhanden.' : 'Das Archiv ist leer.'}
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {visibleEvents.map((ev) => {
                const uNames = (ev.participantUserIds || []).map(id => users.find(u => u.id === id)?.name).filter(Boolean);
                const gNames = (ev.participantGroupIds || []).map(id => groups.find(g => g.id === id)?.name).filter(Boolean);
                const allParticipants = [...uNames, ...gNames];
                const participantsText = allParticipants.length > 0 ? allParticipants.join(', ') : 'Keine Teilnehmer zugewiesen';
                
                // Historie berechnen
                const seriesId = ev.seriesId || ev.id;
                const pastEvents = events
                  .filter(e => e.seriesId === seriesId && e.status === 'ABGESCHLOSSEN' && e.id !== ev.id)
                  .sort((a, b) => (b.plannedStartTime || 0) - (a.plannedStartTime || 0));

                return (
                <div key={ev.id} className={`bg-white p-5 rounded-lg shadow-sm border border-gray-200 flex flex-col transition-shadow relative ${ev.isArchived ? 'opacity-80 grayscale-[20%]' : 'hover:shadow-md'}`}>
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex flex-col gap-1 items-start">
                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${getStatusColor(ev.status)}`}>
                        {ev.status === 'PLANUNG' ? 'In Planung' : ev.status === 'AKTIV' ? 'Aktiv' : 'Abgeschlossen'}
                      </span>
                    </div>
                    {canManageEvents && (
                      <div className="flex items-center ml-2 shrink-0">
                        <button onClick={() => handleToggleArchive(ev)} className="text-gray-400 hover:text-gray-600 p-1 mr-1" title={ev.isArchived ? 'Wiederherstellen' : 'Archivieren'}>
                          {ev.isArchived ? <ArchiveRestore className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
                        </button>
                        <button onClick={() => handleEdit(ev)} className="text-blue-500 hover:text-blue-700 p-1 mr-1" title="Bearbeiten">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(ev.id, ev.title)} className="text-red-400 hover:text-red-600 p-1" title="Unwiderruflich löschen">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                  
                  <h3 className="text-lg font-bold text-gray-900 mb-1 leading-tight">{ev.title}</h3>
                  
                  {ev.description && (
                    <p className="text-sm text-gray-600 italic line-clamp-2 mb-1">{ev.description}</p>
                  )}
                  
                  <div className="space-y-2 mb-4 flex-1 mt-2">
                    {ev.plannedStartTime && (
                      <div className="flex items-center text-sm text-gray-600">
                        <Calendar className="w-4 h-4 mr-2 text-gray-400 shrink-0" />
                        {new Date(ev.plannedStartTime).toLocaleDateString()}
                        {new Date(ev.plannedStartTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) !== '00:00' && 
                          ` · ${new Date(ev.plannedStartTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} Uhr`}
                      </div>
                    )}
                    {ev.location && (
                      <div className="flex items-center text-sm text-gray-600">
                        <MapPin className="w-4 h-4 mr-2 text-gray-400 shrink-0" />
                        <span className="truncate">{ev.location}</span>
                      </div>
                    )}
                    <div className="flex items-start text-sm text-gray-600 mt-1">
                      <Users className="w-4 h-4 mr-2 mt-0.5 text-gray-400 shrink-0" />
                      <span className="line-clamp-2 leading-snug" title={participantsText}>{participantsText}</span>
                    </div>
                  </div>

                  {/* CHIRURGISCHER EINGRIFF: Die neuen 2 Buttons auf der Kachel */}
                  <div className="grid grid-cols-2 gap-2 mt-auto relative">
                    <button 
                      onClick={() => setOpenHistoryId(openHistoryId === ev.id ? null : ev.id)} 
                      className={`flex items-center justify-center px-2 py-2 rounded-lg text-sm font-bold transition-colors ${openHistoryId === ev.id ? 'bg-blue-100 text-blue-700 border border-blue-200' : 'bg-gray-100 text-gray-700 border border-transparent hover:bg-gray-200 hover:border-gray-300'}`}
                      title="Alle abgeschlossenen Protokolle dieses Projekts"
                    >
                      📜 Protokolle
                    </button>
                    
                    <button 
                      onClick={() => navigate(`/events/${ev.id}`)}
                      className="flex items-center justify-center px-2 py-2 bg-blue-50 text-blue-700 font-bold rounded-lg hover:bg-blue-100 transition-colors border border-blue-100 text-sm"
                      title="Zur aktuellen Agenda / nächste Sitzung"
                    >
                      Aktuelle Sitzung
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </button>

                    {/* Dropdown für die Historie */}
                    {openHistoryId === ev.id && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setOpenHistoryId(null)}></div>
                        <div className="absolute left-0 bottom-[110%] mb-1 w-full bg-white border border-gray-200 shadow-xl rounded-lg transition-all z-50 overflow-hidden">
                           <div className="p-2 bg-gray-50 border-b border-gray-200 font-bold text-xs text-gray-500 uppercase tracking-wider flex justify-between items-center">
                             Projekt-Historie
                             <span className="text-[10px] bg-gray-200 text-gray-600 px-1.5 rounded">{pastEvents.length}</span>
                           </div>
                           <div className="max-h-48 overflow-y-auto">
                             {pastEvents.length === 0 && <div className="p-4 text-xs text-gray-400 text-center">Keine früheren Sitzungen für dieses Projekt.</div>}
                             {pastEvents.map(e => (
                               <button key={e.id} onClick={() => { setOpenHistoryId(null); navigate(`/events/${e.id}`); }} className="w-full text-left px-4 py-2 text-sm hover:bg-blue-50 border-b border-gray-100 last:border-0 text-gray-700">
                                 <div className="font-bold text-blue-800">{e.plannedStartTime ? new Date(e.plannedStartTime).toLocaleDateString() : 'Unbekannt'}</div>
                                 <div className="text-xs text-gray-500 truncate">{e.title}</div>
                               </button>
                             ))}
                           </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )})}
            </div>
          </div>
        )}
      </div>

      <EventFormModal 
        key={editingEvent ? editingEvent.id : 'new'}
        isOpen={isModalOpen} 
        existingEvent={editingEvent || undefined}
        onClose={() => setIsModalOpen(false)} 
        onSave={handleSave} 
      />
    </div>
  );
};
// --- END OF FILE ---