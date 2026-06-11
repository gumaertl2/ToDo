// [2026-05-28] - BUGFIX: Stacking Context (Z-Index) für das Protokoll-Dropdown repariert. Dynamischer Z-Index hebt nun die geöffnete Kachel über die nachfolgenden, damit das Dropdown nicht von darunterliegenden Texten überlagert wird.
// [2026-05-28] - BUGFIX: JSX Parse Error behoben. Ein fehlerhaft platzierter JSX-Kommentar direkt nach einem return-Statement wurde in einen normalen JS-Kommentar umgewandelt.
// [2026-05-28] - BUGFIX: Dashboard CSS-Clipping. 'overflow-hidden' von den Dashboard-Containern und Event-Kacheln entfernt, da dieses das absolut positionierte 'Protokoll'-Dropdown abgeschnitten und unsichtbar gemacht hat.
// [2026-05-28] - UX-FIX: Protokoll-Archiv Buttons. Das Dashboard zeigt nun auf den Event-Karten ebenfalls die 2er-Leiste ("📜 Protokolle" / "Sitzung") an, um den direkten Zugriff auf alte Sitzungen von der Startseite aus zu ermöglichen.
// [2026-05-28] - ARCHITEKTUR-FIX: Synchronisation der Erinnerungs-Schutzschilde. DashboardView nutzt nun dieselben Filter wie AppLayout (ignoriert archivierte/abgeschlossene Events sowie Unterpunkte von bereits erledigten Oberpunkten), um Geister-Erinnerungen zu eliminieren.
// [2026-05-28] - BUGFIX: WhatsApp-Erinnerungs-Zähler filtert nun erledigte/gelöschte Aufgaben und abgeschlossene/archivierte Events sauber heraus, um "Geister-Benachrichtigungen" zu verhindern.
// 2026-04-14 19:00 - FIX: Zähler für WhatsApp-Erinnerungen synchronisiert (Abo-Termine hinzugefügt)
// 2026-04-19 17:30 - CHIRURGISCHER EINGRIFF: Archiv-Sektion im Dashboard restlos entfernt.
// 2026-04-19 20:30 - FEATURE: Event-Beschreibung (Fokus der Sitzung) unter dem Titel im Dashboard hinzugefügt
// 2026-05-04 22:25 - FIX: Vorlagen (isTemplate) werden nun korrekt aus den offenen Aufgaben im Dashboard herausgefiltert
// 2026-05-10 12:20 - BUGFIX: Erinnerungs-Zähler ignoriert nun ebenfalls Vorlagen (isTemplate: true)
// 2026-05-12 19:35 - FIX: Type-Safety im useEffect (fetchCalendarEvents is not a function)
// 2026-05-12 19:36 - FEATURE: Participation-First Integration. Dashboard-Sichtbarkeit für Termine gefiltert.
// 2026-05-12 19:55 - FIX: NavLink Routing von /tasks auf /todos korrigiert (No routes matched location).
// 2026-05-13 10:00 - BUGFIX: TypeScript Compiler-Fehler behoben (Store-Typen, MAX_SAFE_INTEGER).
// 2026-05-14 12:00 - BUGFIX: Dashboard versteckt nun auch Aufgaben aus unveröffentlichten (PLANUNG) Agenden.
// 2026-05-14 12:15 - BUGFIX: TS2322 Regression behoben. ItemCard-Props wiederhergestellt.
// 2026-05-14 12:30 - BUGFIX: No routes matched location "/tasks" Regression endgültig behoben (auf /todos korrigiert).
// src/features/Dashboard/DashboardView.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { useClubStore } from '../../store/useClubStore';
import { Calendar, CheckSquare, Clock, ArrowRight, MessageCircle } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { ItemCard } from '../Shared/ItemCard';
import { ItemFormModal } from '../Shared/ItemFormModal';
import type { Task } from '../../core/types/models';

export const DashboardView: React.FC = () => {
  const { user, events, tasks, calendarEvents, calendarSubscriptions, isEventsLoading, isUsersLoading, fetchEvents, fetchTasks, saveAgendaItem, roleProfiles } = useClubStore();
  const navigate = useNavigate();

  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Task | null>(null);
  
  // CHIRURGISCHER EINGRIFF: Wir brauchen einen lokalen State für das Dropdown pro Karte (wie in EventsView)
  const [openHistoryId, setOpenHistoryId] = useState<string | null>(null);

  // RECHTE-CHECK (Participation-First)
  const userRoleProfile = roleProfiles?.find(p => p.id === user?.roleProfileId);
  const canManageEvents = !!userRoleProfile?.permissions?.manageEvents || !!(user?.permissions as any)?.manageEvents;

  useEffect(() => {
    if (typeof fetchEvents === 'function') fetchEvents();
    if (typeof fetchTasks === 'function') fetchTasks();
  }, [fetchEvents, fetchTasks]);

  const upcomingEvents = useMemo(() => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    return events
      .filter((e) => {
        // CHIRURGISCHER EINGRIFF: Participation-First Filterung
        if (canManageEvents) return true; // Admins sehen alles
        const isDirectParticipant = e.participantUserIds?.includes(user?.id || '');
        const isGroupParticipant = e.participantGroupIds?.some(gId => user?.groupIds?.includes(gId));
        return isDirectParticipant || isGroupParticipant;
      })
      .filter((e) => e.status !== 'ABGESCHLOSSEN' && !e.isArchived)
      .filter((e) => {
        const time = e.plannedStartTime || e.startDate;
        return time ? new Date(time).getTime() >= startOfToday.getTime() : true;
      })
      .sort((a, b) => (a.plannedStartTime || a.startDate || 0) - (b.plannedStartTime || b.startDate || 0))
      .slice(0, 3);
  }, [events, user, canManageEvents]);

  const openTasks = useMemo(() => {
    if (!user) return [];
    
    // Die TasksView/KanbanBoard Logik zur Bestimmung von "offenen" Aufgaben für den User
    return tasks
      .filter(t => {
        if (t.isTemplate) return false;
        
        const isAssignee = t.assigneeUserIds?.includes(user.id) || 
                          t.assigneeGroupIds?.some(g => user.groupIds?.includes(g));
        
        if (!isAssignee) return false;
        if (t.status === 'ERLEDIGT' || t.status === 'TRASH') return false;

        // Parent Event Status prüfen (wenn vorhanden)
        if (t.eventId) {
          const parentEvent = events.find(e => e.id === t.eventId);
          // Aufgaben in abgeschlossenen Events sind auch abgeschlossen
          if (parentEvent?.status === 'ABGESCHLOSSEN' || parentEvent?.isArchived) return false;
          
          // Aufgaben in geheimen (Planung) Events verstecken, außer sie sind erb-punkte
          if (parentEvent?.status === 'PLANUNG' && !parentEvent.isPublished && !t.baseItemId) return false;
        }

        return true;
      })
      .sort((a, b) => {
        const aDate = a.dueDate || Number.MAX_SAFE_INTEGER;
        const bDate = b.dueDate || Number.MAX_SAFE_INTEGER;
        return aDate - bDate;
      })
      .slice(0, 5); // Zeige maximal 5 Aufgaben direkt auf dem Dashboard an
  }, [tasks, user, events]);

  const pendingWhatsAppReminders = useMemo(() => {
    if (!user) return 0;
    
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const MS_PER_DAY = 1000 * 60 * 60 * 24;
    
    let count = 0;

    // 1. Kalender-Einträge (Dienste)
    if (calendarEvents) {
      calendarEvents.forEach(ce => {
        if (ce.reminderSenderUserId === user.id && !ce.reminderSentAt && ce.reminderLeadDays !== undefined) {
          const eventStart = new Date(ce.startTime);
          const eventDateStart = new Date(eventStart.getFullYear(), eventStart.getMonth(), eventStart.getDate()).getTime();
          const stichtag = eventDateStart - (ce.reminderLeadDays * MS_PER_DAY);
          if (todayStart >= stichtag) count++;
        }
      });
    }

    // 2. Aufgaben & Agenda-Punkte
    if (tasks) {
      tasks.forEach(t => {
        if (t.isTemplate) return;
        
        // CHIRURGISCHER EINGRIFF: Schutzschilde aus AppLayout synchronisiert
        if (t.status === 'ERLEDIGT' || t.status === 'TRASH' || t.progress === 100) return;

        // Projekt-Schutzschild
        if (t.eventId) {
          const parentEvent = events?.find(e => e.id === t.eventId);
          if (parentEvent && parentEvent.status === 'PLANUNG' && !parentEvent.isPublished) return;
          if (parentEvent && (parentEvent.status === 'ABGESCHLOSSEN' || parentEvent.isArchived)) return;
        }

        // Unterpunkt-Schutzschild
        if (t.isSubItem && t.parentItemId) {
          const parentTask = tasks.find(p => p.id === t.parentItemId);
          if (parentTask && parentTask.status === 'ERLEDIGT') return;
        }
        
        if (t.reminderSenderUserId === user.id && !t.reminderSentAt && t.reminderLeadDays !== undefined && t.dueDate) {
          const taskDue = new Date(t.dueDate);
          const taskDateStart = new Date(taskDue.getFullYear(), taskDue.getMonth(), taskDue.getDate()).getTime();
          const stichtag = taskDateStart - (t.reminderLeadDays * MS_PER_DAY);
          if (todayStart >= stichtag) count++;
        }
      });
    }

    // 3. Sitzungen (Events)
    if (events) {
      events.forEach(ev => {
        const isReadyForReminder = ev.status !== 'PLANUNG' || ev.isPublished;
        
        // CHIRURGISCHER EINGRIFF: Abgeschlossene oder archivierte Events konsequent ignorieren
        if (!isReadyForReminder || ev.status === 'ABGESCHLOSSEN' || ev.isArchived) return;

        if (ev.reminderSenderUserId === user.id && !ev.reminderSentAt && ev.reminderLeadDays !== undefined && ev.plannedStartTime) {
          const eventStart = new Date(ev.plannedStartTime);
          const eventDateStart = new Date(eventStart.getFullYear(), eventStart.getMonth(), eventStart.getDate()).getTime();
          const stichtag = eventDateStart - (ev.reminderLeadDays * MS_PER_DAY);
          if (todayStart >= stichtag) count++;
        }
      });
    }

    // 4. Kalender-Abos (ICS)
    if (calendarSubscriptions) {
      calendarSubscriptions.forEach(sub => {
        if (sub.isActive && sub.reminderSenderUserId === user.id && sub.reminderLeadDays !== undefined && sub.cachedEvents) {
          sub.cachedEvents.forEach(cachedEv => {
            if (!cachedEv.reminderSentAt) {
              const eventStart = new Date(cachedEv.startTime);
              const eventDateStart = new Date(eventStart.getFullYear(), eventStart.getMonth(), eventStart.getDate()).getTime();
              const stichtag = eventDateStart - (sub.reminderLeadDays! * MS_PER_DAY);
              if (todayStart >= stichtag) count++;
            }
          });
        }
      });
    }

    return count;
  }, [user, calendarEvents, tasks, events, calendarSubscriptions]);

  const handleEditTask = (task: any) => {
    setEditingItem(task);
    setIsItemModalOpen(true);
  };

  const isLoading = isEventsLoading || isUsersLoading;

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="text-gray-500 animate-pulse flex flex-col items-center">
          <div className="w-12 h-12 bg-blue-100 rounded-full mb-4 flex items-center justify-center">
             <Calendar className="w-6 h-6 text-blue-500" />
          </div>
          Dashboard wird geladen...
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Hallo, {user?.name.split(' ')[0]} 👋
        </h1>
        <p className="text-sm text-gray-500 mt-1">Hier ist dein Überblick für heute.</p>
      </div>
      
      {/* Kachel für WhatsApp Erinnerungen */}
      {pendingWhatsAppReminders > 0 && (
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl shadow-md p-4 sm:p-5 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-center">
            <div className="bg-white/20 p-3 rounded-full mr-4 shrink-0">
              <MessageCircle className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Erinnerungen versenden</h2>
              <p className="text-green-50 text-sm mt-0.5 max-w-md">Es gibt anstehende Termine oder Aufgaben, für die du eine WhatsApp-Benachrichtigung an die Verantwortlichen schicken musst.</p>
            </div>
          </div>
          <button 
            onClick={() => navigate('/reminders')}
            className="w-full sm:w-auto px-5 py-2.5 bg-white text-green-700 font-bold rounded-lg shadow-sm hover:bg-green-50 transition-colors flex items-center justify-center shrink-0"
          >
            <span className="bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded-full mr-2">{pendingWhatsAppReminders}</span>
            Jetzt erledigen
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Nächste Sitzungen / Projekte */}
        {/* CHIRURGISCHER EINGRIFF: overflow-hidden entfernt, um Dropdown nicht abzuschneiden */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col relative z-10">
          <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between rounded-t-xl">
            <h2 className="text-lg font-bold text-gray-800 flex items-center">
              <Calendar className="w-5 h-5 mr-2 text-blue-600" />
              Nächste Sitzungen
            </h2>
            <NavLink to="/events" className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center">
              Alle zeigen <ArrowRight className="w-4 h-4 ml-1" />
            </NavLink>
          </div>
          <div className="p-4 flex-1">
            {upcomingEvents.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-500 py-8">
                <Calendar className="w-12 h-12 mb-3 text-gray-300" />
                <p>Keine anstehenden Termine.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingEvents.map((ev) => {
                  const seriesId = ev.seriesId || ev.id;
                  const pastEvents = events
                    .filter(e => e.seriesId === seriesId && e.status === 'ABGESCHLOSSEN' && e.id !== ev.id)
                    .sort((a, b) => (b.plannedStartTime || 0) - (a.plannedStartTime || 0));

                  // CHIRURGISCHER EINGRIFF: Dynamischer z-index für das Dropdown
                  return (
                  <div 
                    key={ev.id} 
                    className={`flex flex-col bg-blue-50/50 border border-blue-100 rounded-lg hover:shadow-md transition-all relative ${openHistoryId === ev.id ? 'z-50 shadow-md ring-2 ring-blue-200' : 'z-10'}`}
                  >
                    <div 
                      onClick={() => navigate(`/events/${ev.id}`)}
                      className="flex items-start p-3 cursor-pointer hover:bg-blue-100/50 rounded-t-lg"
                    >
                      <div className="bg-blue-100 p-2 rounded-md text-blue-700 mr-3 mt-0.5">
                        <Clock className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate">{ev.title}</h3>
                        <p className="text-sm text-gray-600">{(ev.plannedStartTime || ev.startDate) ? new Date(ev.plannedStartTime || ev.startDate || 0).toLocaleString() : 'Kein Datum'}</p>
                        {ev.description && (
                          <p className="text-xs text-gray-500 mt-1 italic line-clamp-2 pr-2">
                            {ev.description}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    {/* CHIRURGISCHER EINGRIFF: Dashboard Buttons - hier greift das Clipping nur für die Ränder der Buttons */}
                    <div className="bg-white border-t border-blue-100 grid grid-cols-2 rounded-b-lg overflow-hidden relative z-30">
                      <button 
                        onClick={() => setOpenHistoryId(openHistoryId === ev.id ? null : ev.id)} 
                        className={`flex items-center justify-center py-2 text-xs font-bold transition-colors border-r border-blue-100 ${openHistoryId === ev.id ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}
                      >
                        📜 Protokolle
                      </button>
                      <button 
                        onClick={() => navigate(`/events/${ev.id}`)}
                        className="flex items-center justify-center py-2 text-xs font-bold text-blue-600 hover:bg-blue-50 transition-colors"
                      >
                        Sitzung <ArrowRight className="w-3 h-3 ml-1" />
                      </button>
                    </div>

                    {/* Dropdown für die Historie */}
                    {openHistoryId === ev.id && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setOpenHistoryId(null)}></div>
                        <div className="absolute left-0 top-full mt-1 w-full bg-white border border-gray-200 shadow-xl rounded-lg transition-all z-50 overflow-hidden">
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
                )})}
              </div>
            )}
          </div>
        </div>

        {/* Meine offenen Aufgaben */}
        {/* CHIRURGISCHER EINGRIFF: overflow-hidden ebenfalls der Konsistenz halber entfernt */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col relative z-10">
          <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between rounded-t-xl">
            <h2 className="text-lg font-bold text-gray-800 flex items-center">
              <CheckSquare className="w-5 h-5 mr-2 text-emerald-600" />
              Meine Aufgaben
            </h2>
            <NavLink to="/todos" className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center">
              Zum Board <ArrowRight className="w-4 h-4 ml-1" />
            </NavLink>
          </div>
          <div className="p-4 flex-1">
            {openTasks.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-500 py-8">
                <CheckSquare className="w-12 h-12 mb-3 text-gray-300" />
                <p>Du hast aktuell keine offenen Aufgaben.</p>
                <p className="text-sm mt-1">Gute Arbeit!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {openTasks.map((task: Task) => (
                  <ItemCard key={task.id} item={task} onEdit={handleEditTask} className="!mb-0" />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {editingItem && (
        <ItemFormModal
          key={editingItem.id}
          isOpen={isItemModalOpen}
          existingItem={editingItem}
          isFixedType={true}
          onClose={() => setIsItemModalOpen(false)}
          onSave={async (data) => {
            const result = await saveAgendaItem(data);
            if (!result || (result && !result.success)) {
              throw new Error(result?.error?.message || "Fehler beim Speichern in Firebase.");
            }
            if (typeof fetchTasks === 'function') {
               await fetchTasks();
            }
            setIsItemModalOpen(false);
            setEditingItem(null);
          }}
        />
      )}
    </div>
  );
};
// --- END OF FILE ---