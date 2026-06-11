// [2026-06-11] - BUGFIX: Regression beim Routing behoben. Der Deep-Link Parameter 'openEventId' für externe Vereinstermine wurde wiederhergestellt, sodass ein Klick auf der Startseite nicht nur den Kalender öffnet, sondern auch sofort das zugehörige Event-Modal aufklappt.
// [2026-06-11] - UX-FIX: Platzoptimierung bei den Vereinsterminen. Den redundanten Untertitel aus den Terminkarten entfernt.
// [2026-06-11] - FEATURE: Abonnierte externe ICS-Kalender (calendarSubscriptions) in die "Vereinstermine"-Ansicht des Dashboards integriert. Striktes Need-to-Know-Prinzip greift.
// [2026-06-11] - BUGFIX: TS2339 Compiler-Fehler behoben. Type-Casting (as any) für 'manageTasks' und 'manageEvents' bei userRoleProfile?.permissions hinzugefügt.
// [2026-06-11] - BUGFIX: 'isAppUser' Filter repariert. Unterscheidung zwischen App-Nutzer und Helfer basiert nun exklusiv auf der 'roleProfileId'. Reine Helfer sehen das Vollbild-Layout.
// [2026-06-11] - UX-FIX: Dynamisches Layout für normale Mitglieder/Helfer integriert. ToDo-Block, WhatsApp-Reminders und "Nächste Sitzungen" werden für Helfer ausgeblendet.
// [2026-06-11] - UX-FIX: Ergonomie verbessert. Buttons für Kanban-Board und Listenansicht vom Footer in den Header der ToDo-Kachel verschoben. Reihenfolge optimiert.
// [2026-06-11] - BUGFIX: ToDo-Zähler Abweichung korrigiert. ToDo-Engine nutzt nun strikt den 'isAssignee' Filter.
// [2026-06-11] - ARCHITEKTUR-UPGRADE: WelcomeDashboard zur Kommandozentrale ausgebaut. "Nächste Sitzungen" und WhatsApp-Erinnerungen integriert. 
// [2026-06-09] - BUGFIX: Dashboard zeigt mehrtägige Termine und Dienste nun an, solange ihr Enddatum (endTime) noch nicht in der Vergangenheit liegt.
// [2026-06-04] - FEATURE: Individuelle, persistente (localStorage) Lookahead-Zeiträume.
// src/features/Dashboard/WelcomeDashboard.tsx
import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  ChevronRight, 
  Coffee,
  Check,
  ArrowRight,
  MessageCircle,
  KanbanSquare,
  ListTodo
} from 'lucide-react';
import { useClubStore } from '../../store/useClubStore';
import { ItemFormModal } from '../Shared/ItemFormModal';
import type { Task } from '../../core/types/models';

export const WelcomeDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { 
    user, 
    tasks, 
    events, 
    calendarEvents,
    calendarSubscriptions,
    helpers,
    roleProfiles,
    saveAgendaItem,
    fetchTasks
  } = useClubStore();

  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Task | null>(null);
  const [openHistoryId, setOpenHistoryId] = useState<string | null>(null);

  // RECHTE-CHECK & DOMAIN LANGUAGE (App-Nutzer vs. reiner Helfer)
  const userRoleProfile = roleProfiles?.find(p => p.id === user?.roleProfileId);
  const canManageEvents = !!(userRoleProfile?.permissions as any)?.manageEvents || !!(user?.permissions as any)?.manageEvents;
  const canManageTasks = !!(userRoleProfile?.permissions as any)?.manageTasks || !!(user?.permissions as any)?.manageTasks;

  const isAppUser = !!user?.roleProfileId || canManageEvents || canManageTasks;

  // --- DYNAMISCHE LOOKAHEAD STATES (mit LocalStorage Persistenz) ---
  const [eventsLookahead, setEventsLookahead] = useState<number>(() => {
    const saved = localStorage.getItem('dashboard_events_lookahead');
    return saved !== null ? parseInt(saved, 10) : 14;
  });

  const [servicesLookahead, setServicesLookahead] = useState<number>(() => {
    const saved = localStorage.getItem('dashboard_services_lookahead');
    return saved !== null ? parseInt(saved, 10) : 14;
  });

  const [tasksLookahead, setTasksLookahead] = useState<number>(() => {
    const saved = localStorage.getItem('dashboard_tasks_lookahead');
    return saved !== null ? parseInt(saved, 10) : 14;
  });

  // LocalStorage aktualisieren, wenn sich die Werte ändern
  useEffect(() => { localStorage.setItem('dashboard_events_lookahead', eventsLookahead.toString()); }, [eventsLookahead]);
  useEffect(() => { localStorage.setItem('dashboard_services_lookahead', servicesLookahead.toString()); }, [servicesLookahead]);
  useEffect(() => { localStorage.setItem('dashboard_tasks_lookahead', tasksLookahead.toString()); }, [tasksLookahead]);

  // Input Handler, um leere Felder oder NaN abzufangen
  const handleLookaheadChange = (setter: React.Dispatch<React.SetStateAction<number>>) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    setter(isNaN(val) ? 0 : val);
  };

  // --- RESOLUTION ENGINE ---
  const { 
    myHelper, 
    userGroupIds, 
    todayStart, 
    eventsLookaheadDate,
    servicesLookaheadDate,
    tasksLookaheadDate
  } = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    
    const helper = helpers?.find(h => h.email?.toLowerCase() === user?.email?.toLowerCase());
    return {
      myHelper: helper,
      userGroupIds: user?.groupIds || [],
      todayStart: today,
      eventsLookaheadDate: today + (eventsLookahead * 24 * 60 * 60 * 1000),
      servicesLookaheadDate: today + (servicesLookahead * 24 * 60 * 60 * 1000),
      tasksLookaheadDate: today + (tasksLookahead * 24 * 60 * 60 * 1000)
    };
  }, [user, helpers, eventsLookahead, servicesLookahead, tasksLookahead]);

  // ZENTRALE RELEVANZ-PRÜFUNG FÜR TERMINE (Inkl. Helfer & Teams)
  const checkEventRelevance = (item: any) => {
    if (!user) return false;
    
    if (item.participantUserIds?.includes(user.id) || 
        item.assigneeUserIds?.includes(user.id) ||
        item.reminderRecipientUserIds?.includes(user.id)) return true;
        
    if (myHelper && (
        item.participantHelperIds?.includes(myHelper.id) || 
        item.assigneeHelperIds?.includes(myHelper.id) ||
        item.reminderRecipientHelperIds?.includes(myHelper.id)
    )) return true;
    
    if (item.participantGroupIds?.some((gId: string) => userGroupIds.includes(gId)) || 
        item.assigneeGroupIds?.some((gId: string) => userGroupIds.includes(gId)) ||
        item.reminderRecipientGroupIds?.some((gId: string) => userGroupIds.includes(gId))) return true;
        
    const itemTeamIds = [
        ...(item.participantTeamIds || []), 
        ...(item.assigneeTeamIds || []),
        ...(item.reminderRecipientTeamIds || [])
    ];
    
    if (itemTeamIds.length > 0 && myHelper) {
      const myTeamIds = myHelper.teamIds || [];
      if (itemTeamIds.some(tId => myTeamIds.includes(tId))) return true;
      
      const myStatus = myHelper.memberStatus?.toLowerCase(); 
      if (itemTeamIds.includes('vgroup-all')) return true;
      if (myStatus === 'aktiv' && itemTeamIds.includes('vgroup-aktiv')) return true;
      if (myStatus === 'passiv' && itemTeamIds.includes('vgroup-passiv')) return true;
      if (myStatus === 'jugend' && itemTeamIds.includes('vgroup-jugend')) return true;
    }
    
    return false;
  };

  // --- ToDo Engine (Deaktiviert für reine Helfer) ---
  const allMyOpenTasks = useMemo(() => {
    if (!isAppUser || !user || !tasks) return [];
    
    return tasks.filter(t => {
      if (t.isTemplate) return false;
      if (t.progress === 100 || t.status === 'ERLEDIGT' || t.status === 'TRASH') return false;
      
      if (t.isHistorical === true) return false;

      if (t.eventId && events) {
        const parentEvent = events.find(e => e.id === t.eventId);
        if (parentEvent && (parentEvent.status === 'ABGESCHLOSSEN' || parentEvent.isArchived)) return false;
        if (parentEvent?.status === 'PLANUNG' && !parentEvent.isPublished && !t.baseItemId) return false;
      }

      if (t.isSubItem && t.parentItemId) {
          const parentTask = tasks.find(p => p.id === t.parentItemId);
          if (parentTask && (parentTask.status === 'ERLEDIGT' || parentTask.progress === 100)) return false;
      }
      
      const isAssignee = t.assigneeUserIds?.includes(user.id) || 
                         t.assigneeGroupIds?.some(g => userGroupIds.includes(g));
      
      return isAssignee;
    }).sort((a, b) => {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return a.dueDate - b.dueDate;
    });
  }, [tasks, user, userGroupIds, events, isAppUser]);

  const totalOpenTasksCount = allMyOpenTasks.length;

  const myTasks = useMemo(() => {
    return allMyOpenTasks.filter(t => !t.dueDate || t.dueDate <= tasksLookaheadDate);
  }, [allMyOpenTasks, tasksLookaheadDate]);

  // --- Nächste Sitzungen (Deaktiviert für reine Helfer) ---
  const upcomingSessions = useMemo(() => {
    if (!isAppUser) return [];

    return events
      .filter((e) => {
        if (canManageEvents) return true;
        const isDirectParticipant = e.participantUserIds?.includes(user?.id || '');
        const isGroupParticipant = e.participantGroupIds?.some(gId => userGroupIds.includes(gId));
        return isDirectParticipant || isGroupParticipant;
      })
      .filter((e) => e.status !== 'ABGESCHLOSSEN' && !e.isArchived)
      .filter((e) => {
        const time = e.plannedStartTime || e.startDate;
        return time ? new Date(time).getTime() >= todayStart : true;
      })
      .sort((a, b) => (a.plannedStartTime || a.startDate || 0) - (b.plannedStartTime || b.startDate || 0))
      .slice(0, 3);
  }, [events, user, canManageEvents, todayStart, isAppUser, userGroupIds]);

  // --- Termine filtern ---
  const upcomingEvents = useMemo(() => {
    const combinedEvents: any[] = [];
    const processedEventKeys = new Set<string>();

    if (events) {
      events.forEach(ev => {
        if (ev.status === 'ABGESCHLOSSEN' || ev.isArchived) return;
        if (!ev.plannedStartTime) return;
        
        const evTime = new Date(ev.plannedStartTime).getTime();
        const evEnd = ev.plannedEndTime ? new Date(ev.plannedEndTime).getTime() : evTime;
        
        if (evEnd >= todayStart && evTime <= eventsLookaheadDate) {
          if (checkEventRelevance(ev)) {
            const dateStr = new Date(evTime).toISOString().split('T')[0];
            const normalizedTitle = ev.title.toLowerCase().trim();
            processedEventKeys.add(`${dateStr}|${normalizedTitle}`);

            combinedEvents.push({
              id: ev.id,
              title: ev.title,
              time: evTime,
              type: 'INTERN',
              source: 'Für mich relevant'
            });
          }
        }
      });
    }

    if (calendarEvents) {
      calendarEvents.forEach(ce => {
        const ceTime = new Date(ce.startTime).getTime();
        const ceEnd = ce.endTime ? new Date(ce.endTime).getTime() : ceTime;
        
        if (ceEnd >= todayStart && ceTime <= eventsLookaheadDate && ce.eventType !== 'DIENST') {
            const dateStr = new Date(ceTime).toISOString().split('T')[0];
            const normalizedTitle = ce.title.toLowerCase().trim();
            
            let isDuplicate = false;
            for (const key of processedEventKeys) {
              const [keyDate, keyTitle] = key.split('|');
              if (keyDate === dateStr && (keyTitle.includes(normalizedTitle) || normalizedTitle.includes(keyTitle))) {
                isDuplicate = true;
                break;
              }
            }

            if (!isDuplicate && checkEventRelevance(ce)) {
              combinedEvents.push({
                id: ce.id,
                title: ce.title,
                time: ceTime,
                type: 'EXTERN',
                source: 'Für mich relevant'
              });
            }
        }
      });
    }

    // Abonnierte Kalender (ICS) einlesen und auf Need-to-Know filtern
    if (calendarSubscriptions) {
      calendarSubscriptions.forEach(sub => {
        if (!sub.isActive || !sub.cachedEvents) return;
        
        // Firewall: Ist der Nutzer Empfänger für Erinnerungen dieses Abos?
        if (checkEventRelevance(sub)) {
          sub.cachedEvents.forEach(cachedEv => {
            const evTime = new Date(cachedEv.startTime).getTime();
            const evEnd = cachedEv.endTime ? new Date(cachedEv.endTime).getTime() : evTime;
            
            if (evEnd >= todayStart && evTime <= eventsLookaheadDate) {
              const dateStr = new Date(evTime).toISOString().split('T')[0];
              const normalizedTitle = cachedEv.title.toLowerCase().trim();
              
              let isDuplicate = false;
              for (const key of processedEventKeys) {
                const [keyDate, keyTitle] = key.split('|');
                if (keyDate === dateStr && (keyTitle.includes(normalizedTitle) || normalizedTitle.includes(keyTitle))) {
                  isDuplicate = true;
                  break;
                }
              }

              if (!isDuplicate) {
                processedEventKeys.add(`${dateStr}|${normalizedTitle}`);
                combinedEvents.push({
                  id: `sub-${sub.id}-${cachedEv.uid}`,
                  title: `${sub.name}: ${cachedEv.title}`,
                  time: evTime,
                  type: 'EXTERN',
                  source: 'Über externes Abo'
                });
              }
            }
          });
        }
      });
    }

    return combinedEvents.sort((a, b) => a.time - b.time);
  }, [events, calendarEvents, calendarSubscriptions, todayStart, eventsLookaheadDate, checkEventRelevance]);

  // --- Dienste filtern ---
  const upcomingServices = useMemo(() => {
    if (!calendarEvents) return [];
    
    return calendarEvents.filter(ce => {
      if (ce.eventType !== 'DIENST') return false;
      const ceTime = new Date(ce.startTime).getTime();
      const ceEnd = ce.endTime ? new Date(ce.endTime).getTime() : ceTime;
      
      if (ceEnd < todayStart || ceTime > servicesLookaheadDate) return false;

      return checkEventRelevance(ce);
    }).sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  }, [calendarEvents, todayStart, servicesLookaheadDate, checkEventRelevance]);

  // --- WhatsApp Erinnerungen filtern (Deaktiviert für reine Helfer) ---
  const pendingWhatsAppReminders = useMemo(() => {
    if (!isAppUser || !user) return 0;
    
    const MS_PER_DAY = 1000 * 60 * 60 * 24;
    let count = 0;

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

    if (tasks) {
      tasks.forEach(t => {
        if (t.isTemplate || t.isHistorical) return;
        if (t.status === 'ERLEDIGT' || t.status === 'TRASH' || t.progress === 100) return;

        if (t.eventId) {
          const parentEvent = events?.find(e => e.id === t.eventId);
          if (parentEvent && parentEvent.status === 'PLANUNG' && !parentEvent.isPublished) return;
          if (parentEvent && (parentEvent.status === 'ABGESCHLOSSEN' || parentEvent.isArchived)) return;
        }

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

    if (events) {
      events.forEach(ev => {
        const isReadyForReminder = ev.status !== 'PLANUNG' || ev.isPublished;
        if (!isReadyForReminder || ev.status === 'ABGESCHLOSSEN' || ev.isArchived) return;

        if (ev.reminderSenderUserId === user.id && !ev.reminderSentAt && ev.reminderLeadDays !== undefined && ev.plannedStartTime) {
          const eventStart = new Date(ev.plannedStartTime);
          const eventDateStart = new Date(eventStart.getFullYear(), eventStart.getMonth(), eventStart.getDate()).getTime();
          const stichtag = eventDateStart - (ev.reminderLeadDays * MS_PER_DAY);
          if (todayStart >= stichtag) count++;
        }
      });
    }

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
  }, [user, calendarEvents, tasks, events, calendarSubscriptions, todayStart, isAppUser]);

  // --- HILFSFUNKTIONEN ---
  const formatDate = (ms: number) => {
    const d = new Date(ms);
    return d.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  const getTaskStatusInfo = (dueDate?: number) => {
    if (!dueDate) return { label: 'Ohne Frist', color: 'bg-gray-100 text-gray-700', icon: Clock };
    if (dueDate < todayStart) return { label: 'Überfällig', color: 'bg-red-100 text-red-700', icon: AlertTriangle };
    
    const daysLeft = Math.ceil((dueDate - todayStart) / (1000 * 60 * 60 * 24));
    if (daysLeft === 0) return { label: 'Heute fällig', color: 'bg-amber-100 text-amber-800', icon: Clock };
    return { label: `In ${daysLeft} Tagen`, color: 'bg-blue-100 text-blue-800', icon: Clock };
  };

  const handleEditTask = (task: Task) => {
    setEditingItem(task);
    setIsItemModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">Hallo {user?.name.split(' ')[0] || 'Gast'}! 👋</h1>
          <p className="text-lg text-gray-600 mt-2">
            Hier ist dein Kompass. In deinem eingestellten Zeitraum stehen <strong className="text-blue-600">{upcomingEvents.length} Termine</strong>
            {isAppUser ? (
              <>
                , <strong className="text-purple-600">{upcomingServices.length} Dienste</strong> und <strong className="text-red-600">{myTasks.length} fällige Aufgaben</strong> für dich an.
              </>
            ) : (
              <>
                {' '}und <strong className="text-purple-600">{upcomingServices.length} Dienste</strong> für dich an.
              </>
            )}
          </p>
        </div>

        {/* Kachel für WhatsApp Erinnerungen */}
        {isAppUser && pendingWhatsAppReminders > 0 && (
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl shadow-md p-4 sm:p-5 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 animate-in fade-in slide-in-from-bottom-4">
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

        <div className={`grid grid-cols-1 ${isAppUser ? 'lg:grid-cols-12' : ''} gap-6 lg:gap-8`}>
          <div className={`${isAppUser ? 'lg:col-span-7' : 'w-full max-w-3xl'} space-y-8`}>
            
            <section className="relative z-10">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
                <div className="flex items-center">
                  <h2 className="text-xl font-bold text-gray-900 flex items-center">
                    <Calendar className="w-5 h-5 mr-2 text-blue-600" /> Vereinstermine
                  </h2>
                  <div className="flex items-center ml-3 bg-white border border-gray-200 rounded-lg px-2 py-0.5 shadow-sm" title="Vorschau in Tagen">
                     <input 
                       type="number" min="1" max="365" 
                       value={eventsLookahead} 
                       onChange={handleLookaheadChange(setEventsLookahead)} 
                       className="w-10 text-center text-sm font-bold text-blue-600 outline-none" 
                     />
                     <span className="text-[10px] uppercase font-bold text-gray-400 ml-1">Tage</span>
                  </div>
                </div>
                <button onClick={() => navigate('/calendar')} className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors">Zum Vereinskalender</button>
              </div>
              <div className="space-y-3">
                {upcomingEvents.length === 0 ? (
                  <div className="bg-white border border-gray-200 p-6 rounded-xl text-center text-gray-500">Keine relevanten Termine im gewählten Zeitraum.</div>
                ) : (
                  upcomingEvents.map(ev => (
                    // CHIRURGISCHER EINGRIFF: openEventId Deep-Link Payload wieder eingebaut
                    <button key={ev.id} onClick={() => ev.type === 'INTERN' ? navigate(`/events/${ev.id}`) : navigate('/calendar', { state: { openEventId: ev.id, targetDate: ev.time } })} className="w-full text-left bg-white border border-gray-200 p-4 rounded-xl shadow-sm hover:shadow-md hover:border-blue-300 transition-all group">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className={`inline-block px-2 py-1 text-xs font-bold rounded mb-2 ${ev.type === 'INTERN' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>{formatDate(ev.time)} Uhr</span>
                          <h3 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{ev.title}</h3>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-blue-500 mt-2" />
                      </div>
                    </button>
                  ))
                )}
              </div>
            </section>

            <section className="relative z-10">
              <div className="flex items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900 flex items-center">
                  <Coffee className="w-5 h-5 mr-2 text-purple-600" /> Meine Dienste
                </h2>
                <div className="flex items-center ml-3 bg-purple-50 border border-purple-200 rounded-lg px-2 py-0.5 shadow-sm" title="Vorschau in Tagen">
                   <input 
                     type="number" min="1" max="365" 
                     value={servicesLookahead} 
                     onChange={handleLookaheadChange(setServicesLookahead)} 
                     className="w-10 text-center text-sm font-bold text-purple-600 bg-transparent outline-none" 
                   />
                   <span className="text-[10px] uppercase font-bold text-purple-400 ml-1">Tage</span>
                </div>
              </div>
              <div className="space-y-3">
                {upcomingServices.length === 0 ? (
                  <div className="bg-purple-50/50 border border-purple-100 p-6 rounded-xl text-center text-purple-600/70 text-sm">Keine Dienste im gewählten Zeitraum.</div>
                ) : (
                  upcomingServices.map(srv => (
                    <button key={srv.id} onClick={() => navigate('/calendar', { state: { openEventId: srv.id, targetDate: new Date(srv.startTime).getTime() } })} className="w-full text-left bg-purple-50 border border-purple-200 p-4 rounded-xl shadow-sm hover:shadow-md hover:border-purple-400 transition-all group">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="inline-block px-2 py-1 bg-purple-200 text-purple-900 text-xs font-bold rounded mb-2">{formatDate(new Date(srv.startTime).getTime())}</span>
                          <h3 className="font-bold text-purple-900">{srv.title}</h3>
                        </div>
                        <ChevronRight className="w-5 h-5 text-purple-400 group-hover:text-purple-600 mt-2" />
                      </div>
                    </button>
                  ))
                )}
              </div>
            </section>
            
            {/* Nächste Sitzungen Block (NUR für AppUser) */}
            {isAppUser && (
              <section className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col relative z-20">
                <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between rounded-t-xl">
                  <h2 className="text-lg font-bold text-gray-800 flex items-center">
                    <Calendar className="w-5 h-5 mr-2 text-blue-600" />
                    Nächste Sitzungen
                  </h2>
                  <button onClick={() => navigate('/events')} className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center">
                    Alle zeigen <ArrowRight className="w-4 h-4 ml-1" />
                  </button>
                </div>
                <div className="p-4 flex-1">
                  {upcomingSessions.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-500 py-6">
                      <Calendar className="w-10 h-10 mb-3 text-gray-300" />
                      <p>Keine anstehenden Termine.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {upcomingSessions.map((ev) => {
                        const seriesId = ev.seriesId || ev.id;
                        const pastEvents = events
                          .filter(e => e.seriesId === seriesId && e.status === 'ABGESCHLOSSEN' && e.id !== ev.id)
                          .sort((a, b) => (b.plannedStartTime || 0) - (a.plannedStartTime || 0));

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
              </section>
            )}

          </div>

          {isAppUser && (
            <div className="lg:col-span-5">
              <section className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden flex flex-col h-full sticky top-4">
                
                {/* Die Buttons sind jetzt prominent und griffsicher im Header */}
                <div className="p-4 border-b border-gray-100 bg-gray-50 flex flex-col gap-4">
                  <div className="flex items-center flex-wrap gap-2 justify-between">
                    <div className="flex items-center">
                      <CheckCircle2 className="w-5 h-5 mr-2 text-green-600" /> 
                      <h2 className="text-lg font-bold text-gray-900 mr-2">Deine ToDos</h2>
                      <span className="bg-green-100 text-green-800 text-xs font-bold px-2.5 py-0.5 rounded-full border border-green-200 shadow-sm">
                        {totalOpenTasksCount} offen
                      </span>
                    </div>
                    <div className="flex items-center ml-auto bg-white border border-gray-200 rounded-lg px-2 py-0.5 shadow-sm" title="Vorschau in Tagen">
                       <input 
                         type="number" min="1" max="365" 
                         value={tasksLookahead} 
                         onChange={handleLookaheadChange(setTasksLookahead)} 
                         className="w-10 text-center text-sm font-bold text-green-600 outline-none" 
                       />
                       <span className="text-[10px] uppercase font-bold text-gray-400 ml-1">Tage</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => navigate('/todos')} 
                      className="flex-1 flex justify-center items-center text-sm font-medium text-blue-700 bg-blue-50 border border-blue-100 hover:bg-blue-100 transition-colors px-3 py-2 rounded-lg"
                    >
                      <KanbanSquare className="w-4 h-4 mr-2 opacity-70" /> Kanban-Board
                    </button>
                    <button 
                      onClick={() => navigate('/todos', { state: { view: 'list' } })} 
                      className="flex-1 flex justify-center items-center text-sm font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 transition-colors px-3 py-2 rounded-lg shadow-sm"
                    >
                      <ListTodo className="w-4 h-4 mr-2 opacity-70" /> Listenansicht
                    </button>
                  </div>
                </div>

                <div className="p-2 flex-1 overflow-y-auto max-h-[500px]">
                  {myTasks.length === 0 ? (
                    <div className="p-8 text-center flex flex-col items-center justify-center text-gray-500 h-full">
                      <div className="bg-green-100 p-3 rounded-full mb-3 text-green-600"><Check className="w-6 h-6" /></div>
                      <p className="font-medium">Alles erledigt für die nächsten {tasksLookahead} Tage!</p>
                    </div>
                  ) : (
                    myTasks.map(task => {
                      const statusInfo = getTaskStatusInfo(task.dueDate);
                      const StatusIcon = statusInfo.icon;
                      let reason = "Persönlich zugewiesen";
                      
                      if (!task.assigneeUserIds?.includes(user?.id || '')) {
                        reason = "Über Team/Gruppe";
                      }

                      return (
                        <button key={task.id} onClick={() => handleEditTask(task)} className="w-full text-left p-3 hover:bg-gray-50 rounded-lg transition-colors border-b border-gray-100 last:border-0 group flex items-start gap-3">
                          <StatusIcon className={`w-5 h-5 mt-1 ${statusInfo.label === 'Überfällig' ? 'text-red-500' : 'text-gray-400'}`} />
                          <div>
                            <h4 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors leading-tight">{task.title}</h4>
                            <div className="mt-2 text-[10px] font-bold uppercase">{statusInfo.label} • {reason}</div>
                          </div>
                        </button>
                      )
                    })
                  )}
                </div>
              </section>
            </div>
          )}
        </div>
      </div>

      {isAppUser && editingItem && (
        <ItemFormModal
          key={editingItem.id}
          isOpen={isItemModalOpen}
          existingItem={editingItem}
          isFixedType={true}
          onClose={() => { setIsItemModalOpen(false); setEditingItem(null); }}
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