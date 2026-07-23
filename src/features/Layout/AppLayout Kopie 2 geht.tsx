// [2026-07-22] - FEATURE: DSGVO Clickwrap in AppLayout integriert als unumgängliche UI-Schranke.
// [2026-06-11] - UX-FEATURE: ToDo-Badge von "/todos" auf "/" (Start) verschoben. Da das WelcomeDashboard nun die Kommandozentrale ist, leuchtet das "[Fällig im Zeitraum] / [Gesamt]" Badge jetzt direkt am Home-Icon auf.
// [2026-06-11] - UX-FEATURE: ToDo-Badge an WelcomeDashboard-Logik angeglichen. Nutzt den Lookahead-Zeitraum (localStorage) und färbt sich rot bei überfälligen Aufgaben.
// [2026-06-03] - BUGFIX: ToDo-Zähler filtert nun Vorlagen (isTemplate) korrekt heraus, damit das Notification-Badge nicht verfälscht wird.
// [2026-05-31] - BUGFIX: ToDo-Zähler in der Navigation (AppLayout) ignoriert nun konsequent Aufgaben-Zuweisungen an "Externe Betreuer / Helfer".
// [2026-05-31] - BUGFIX: ToDo-Zähler an strikte Logik angeglichen (Kill-Switch für 100%/ERLEDIGT).
// [2026-05-30] - UX-FIX: "Welcome Dashboard" (Startseite) als zentralen Einstiegspunkt verankert.
// [2026-05-28] - ARCHITEKTUR-FIX: Synchronisation der Erinnerungs-Schutzschilde. AppLayout nutzt nun dieselben Filter wie RemindersView.
// src/features/Layout/AppLayout.tsx
import React, { useEffect, useState, useMemo } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { 
   Users, Calendar, ClipboardList, CheckSquare, LogOut, 
   LayoutDashboard, BookOpen, CalendarDays, Pin, PinOff,
  MessageCircle, BarChart2, Menu, X, Key, Home 
} from 'lucide-react';
import { useClubStore } from '../../store/useClubStore';
import { DsgvoClickwrap } from '../Auth/DsgvoClickwrap';

export const AppLayout: React.FC = () => {
  const { 
     logout, user, roleProfiles, fetchUsersAndHelpers, fetchGroups, 
     calendarEvents, allAgendaItems, events, calendarSubscriptions,
     fetchEvents, fetchTasks, fetchCalendarData,
    helpers, groups, tasks
  } = useClubStore();
  const location = useLocation();

  const [isPinned, setIsPinned] = useState(() => {
    const saved = localStorage.getItem('papatodo_sidebar_pinned');
    return saved !== null ? saved === 'true' : true;
  });
  const [isHovered, setIsHovered] = useState(false);
  const [sidebarTouchStart, setSidebarTouchStart] = useState<number | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const currentProfile = useMemo(() => {
    return roleProfiles.find(p => p.id === user?.roleProfileId) || 
           roleProfiles.find(p => p.name === 'Gast') || 
           { permissions: {} as any };
  }, [user, roleProfiles]);

  const perms = currentProfile.permissions;
  const canViewAllReminders = !!perms?.viewAllReminders || !!user?.permissions?.viewAllReminders;

  useEffect(() => {
    localStorage.setItem('papatodo_sidebar_pinned', String(isPinned));
  }, [isPinned]);

  useEffect(() => {
    const initApp = async () => {
      if (fetchUsersAndHelpers) await fetchUsersAndHelpers();
      if (fetchGroups) await fetchGroups();
      if (fetchEvents) await fetchEvents();
      if (fetchTasks) await fetchTasks();
      if (fetchCalendarData) await fetchCalendarData();
    };
    initApp();
  }, [fetchUsersAndHelpers, fetchGroups, fetchEvents, fetchTasks, fetchCalendarData]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && navigator.onLine) {
        if (fetchUsersAndHelpers) fetchUsersAndHelpers();
        if (fetchGroups) fetchGroups();
        if (fetchEvents) fetchEvents();
        if (fetchTasks) fetchTasks();
        if (fetchCalendarData) fetchCalendarData();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchUsersAndHelpers, fetchGroups, fetchEvents, fetchTasks, fetchCalendarData]);

  const reminderCounts = useMemo(() => {
    if (!user) return { myCount: 0, allCount: 0 };
    
    let myCount = 0;
    let allCount = 0;
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const MS_PER_DAY = 1000 * 60 * 60 * 24;
    
    const userGroupIds = user.groupIds || [];
    const myHelperId = helpers?.find(h => h.email?.toLowerCase() === user.email?.toLowerCase())?.id;

    if (calendarEvents) {
      calendarEvents.forEach(ce => {
        if (ce.reminderSenderUserId && !ce.reminderSentAt) {
          const leadDays = Number(ce.reminderLeadDays) || 0;
          const eventStart = new Date(ce.startTime);
          const eventDateStart = new Date(eventStart.getFullYear(), eventStart.getMonth(), eventStart.getDate()).getTime();
          const stichtag = eventDateStart - (leadDays * MS_PER_DAY);

          if (todayStart >= stichtag) {
            allCount++;
            
            let isRecipient = false;
            if (ce.eventType === 'DIENST' && ce.title.includes(':')) {
              const parts = ce.title.split(':');
              const alias = parts[parts.length - 1].trim(); 
              if (alias) {
                const helper = helpers?.find(h => 
                    (h.alias || '').toLowerCase() === alias.toLowerCase() || 
                    h.name.toLowerCase() === alias.toLowerCase()
                );
                if (helper && helper.id === myHelperId) isRecipient = true;
              }
            }

            if (ce.reminderSenderUserId === user.id || isRecipient) myCount++;
          }
        }
      });
    }

    if (allAgendaItems) {
      allAgendaItems.forEach(t => {
        if (t.isTemplate || t.reminderSentAt || !t.reminderSenderUserId || !t.dueDate || t.status === 'TRASH') return;

        if (t.eventId) {
          const parentEvent = events?.find(e => e.id === t.eventId);
          if (parentEvent && parentEvent.status === 'PLANUNG' && !parentEvent.isPublished) return;
          if (parentEvent && (parentEvent.status === 'ABGESCHLOSSEN' || parentEvent.isArchived)) return;
        }

        if (t.isSubItem && t.parentItemId) {
          const parentTask = allAgendaItems.find(p => p.id === t.parentItemId);
          if (parentTask && parentTask.status === 'ERLEDIGT') return;
        }

        const leadDays = Number(t.reminderLeadDays) || 0;
        const taskDue = new Date(t.dueDate);
        const taskDateStart = new Date(taskDue.getFullYear(), taskDue.getMonth(), taskDue.getDate()).getTime();
        const stichtag = taskDateStart - (leadDays * MS_PER_DAY);
        
        if (todayStart >= stichtag) {
          allCount++;
          const isDirectRecipient = t.assigneeUserIds?.includes(user.id);
          const isGroupRecipient = t.assigneeGroupIds?.some(gId => userGroupIds.includes(gId));
          const isHelperRecipient = myHelperId && t.assigneeHelperIds?.includes(myHelperId);
          
          if (t.reminderSenderUserId === user.id || isDirectRecipient || isGroupRecipient || isHelperRecipient) myCount++;
        }
      });
    }

    if (events) {
      events.forEach(ev => {
        const isReadyForReminder = ev.status !== 'PLANUNG' || ev.isPublished;
        
        if (isReadyForReminder && ev.status !== 'ABGESCHLOSSEN' && ev.reminderSenderUserId && !ev.reminderSentAt && ev.plannedStartTime) {
          const leadDays = Number(ev.reminderLeadDays) || 0;
          const eventStart = new Date(ev.plannedStartTime);
          const eventDateStart = new Date(eventStart.getFullYear(), eventStart.getMonth(), eventStart.getDate()).getTime();
          const stichtag = eventDateStart - (leadDays * MS_PER_DAY);
          
          if (todayStart >= stichtag) {
            allCount++;
            const isDirectRecipient = ev.participantUserIds?.includes(user.id);
            const isGroupRecipient = ev.participantGroupIds?.some(gId => userGroupIds.includes(gId));
            
            if (ev.reminderSenderUserId === user.id || isDirectRecipient || isGroupRecipient) myCount++;
          }
        }
      });
    }

    if (calendarSubscriptions) {
      calendarSubscriptions.forEach(sub => {
        if (sub.isActive && sub.reminderSenderUserId && sub.cachedEvents) {
          const leadDays = Number(sub.reminderLeadDays) || 0;
          sub.cachedEvents.forEach(cachedEv => {
            if (!cachedEv.reminderSentAt) {
              const eventStart = new Date(cachedEv.startTime);
              const eventDateStart = new Date(eventStart.getFullYear(), eventStart.getMonth(), eventStart.getDate()).getTime();
              const stichtag = eventDateStart - (leadDays * MS_PER_DAY);
              if (todayStart >= stichtag) {
                allCount++;
                if (sub.reminderSenderUserId === user.id) myCount++;
              }
            }
          });
        }
      });
    }

    return { myCount, allCount };
  }, [user, calendarEvents, allAgendaItems, events, calendarSubscriptions, helpers, groups]);

  const shouldShowBadge = canViewAllReminders ? reminderCounts.allCount > 0 : reminderCounts.myCount > 0;
  const badgeText = canViewAllReminders ? `${reminderCounts.myCount}/${reminderCounts.allCount}` : `${reminderCounts.myCount}`;

  // CHIRURGISCHER EINGRIFF: Lookahead-Wert reaktiv auslesen, getriggert durch Routen-Wechsel
  const tasksLookahead = useMemo(() => {
    const saved = localStorage.getItem('dashboard_tasks_lookahead');
    return saved !== null ? parseInt(saved, 10) : 14;
  }, [location.pathname]);

  const taskCounts = useMemo(() => {
    if (!user || !tasks) return { total: 0, overdue: 0, inLookahead: 0 };
    
    let total = 0;
    let overdue = 0;
    let inLookahead = 0;
    
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const lookaheadDate = todayStart + (tasksLookahead * 24 * 60 * 60 * 1000);
    
    const userGroupIds = user.groupIds || [];
    
    tasks.forEach(t => {
      if (t.isTemplate) return;
      if (t.progress === 100 || t.status === 'ERLEDIGT' || t.status === 'TRASH') return;
      if (t.isHistorical === true) return;

      if (t.eventId && events) {
        const parentEvent = events.find(e => e.id === t.eventId);
        if (parentEvent && (parentEvent.status === 'ABGESCHLOSSEN' || parentEvent.isArchived)) return;
        if (parentEvent?.status === 'PLANUNG' && !parentEvent.isPublished && !t.baseItemId) return;
      }

      if (t.isSubItem && t.parentItemId) {
        const parentTask = tasks.find(p => p.id === t.parentItemId);
        if (parentTask && (parentTask.status === 'ERLEDIGT' || parentTask.progress === 100)) return;
      }
      
      const isDirect = t.assigneeUserIds?.includes(user.id);
      const isGroup = t.assigneeGroupIds?.some(gId => userGroupIds.includes(gId));
      
      if (isDirect || isGroup) {
        total++;
        if (t.dueDate && t.dueDate < todayStart) {
          overdue++;
        }
        if (!t.dueDate || t.dueDate <= lookaheadDate) {
          inLookahead++;
        }
      }
    });
    
    return { total, overdue, inLookahead };
  }, [tasks, user, events, tasksLookahead]);

  useEffect(() => {
    const reminderReport = canViewAllReminders ? reminderCounts.allCount : reminderCounts.myCount;
    const countToReport = reminderReport > 0 ? reminderReport : taskCounts.overdue;
    
    if (countToReport > 0) {
      if ('setAppBadge' in navigator) {
        navigator.setAppBadge(countToReport).catch(() => {});
      }
    } else {
      if ('clearAppBadge' in navigator) {
        navigator.clearAppBadge().catch(() => {});
      }
    }
  }, [reminderCounts, taskCounts, canViewAllReminders]);

  const allMainNavItems = [
    { to: '/', icon: Home, label: 'Start', show: true },
    { to: '/calendar', icon: CalendarDays, label: 'Vereinskalender', show: perms?.viewCalendar },
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', show: perms?.viewDashboard },
    { to: '/team-pins', icon: Key, label: 'Team-PINs', show: perms?.viewTeamPins || user?.permissions?.viewTeamPins },
    { to: '/todos', icon: CheckSquare, label: 'Meine ToDos', show: perms?.viewTasks },
    { to: '/reminders', icon: MessageCircle, label: 'Erinnerungen', show: perms?.viewReminders },
    { to: '/events', icon: Calendar, label: 'Projekte & Sitzungen', show: perms?.viewEvents },
  ];

  const mainNavItems = allMainNavItems.filter(item => item.show);

  const allSetupNavItems = [
    { to: '/users', icon: Users, label: 'User & Gruppen', show: perms?.viewUsers },
    { to: '/templates', icon: ClipboardList, label: 'Vorlagen & Routinen', show: perms?.viewTemplates },
    { to: '/reports', icon: BarChart2, label: 'Reports & Statistik', show: perms?.viewReports },
    { to: '/help', icon: BookOpen, label: 'Handbuch & Hilfe', show: true }, 
  ];

  const setupNavItems = allSetupNavItems.filter(item => item.show);

  const handleMouseEnter = () => {
    if (window.matchMedia('(hover: hover)').matches) setIsHovered(true);
  };

  const handleMouseLeave = () => {
    if (window.matchMedia('(hover: hover)').matches) setIsHovered(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setSidebarTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (sidebarTouchStart === null) return;
    const touchEnd = e.changedTouches[0].clientX;
    const diff = sidebarTouchStart - touchEnd;
    
    if (diff > 50) setIsPinned(false); 
    if (diff < -50) setIsPinned(true); 
    
    setSidebarTouchStart(null);
  };

  const isExpanded = isPinned || isHovered;

  const renderDesktopNavItem = (item: { to: string; icon: React.ElementType; label: string }) => (
    <NavLink
      key={item.to}
      to={item.to}
      title={!isExpanded ? item.label : undefined}
      className={({ isActive }) =>
        `flex items-center p-3 rounded-lg transition-colors whitespace-nowrap ${
          isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'
        }`
      }
    >
      <div className="relative shrink-0 flex items-center justify-center">
        <item.icon className="w-5 h-5" />
        
        {item.to === '/reminders' && shouldShowBadge && (
          <span className="absolute -top-1.5 -right-3 bg-red-500 text-white text-[10px] font-bold px-1.5 min-w-[16px] h-4 rounded-full flex items-center justify-center border border-white whitespace-nowrap shadow-sm">
            {badgeText}
          </span>
        )}
        {/* CHIRURGISCHER EINGRIFF: Badge von /todos auf / (Start) verschoben */}
        {item.to === '/' && taskCounts.total > 0 && (
          <span className={`absolute -top-1.5 -right-3 text-white text-[10px] font-bold px-1.5 min-w-[16px] h-4 rounded-full flex items-center justify-center border border-white whitespace-nowrap shadow-sm ${taskCounts.overdue > 0 ? 'bg-red-500' : 'bg-blue-500'}`}>
            {taskCounts.inLookahead}/{taskCounts.total}
          </span>
        )}
      </div>
      <span className={`ml-3 font-medium transition-all duration-300 overflow-hidden ${isExpanded ? 'opacity-100 w-auto' : 'opacity-0 w-0'}`}>
        {item.label}
      </span>
    </NavLink>
  );

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-gray-100 flex-col landscape:flex-row lg:!flex-row print:!h-auto print:!bg-white print:!block">
      
      {/* DSGVO Clickwrap Barriere */}
      <DsgvoClickwrap />

      <aside 
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className={`hidden lg:flex flex-col bg-white shadow-md transition-all duration-300 ease-in-out relative z-40 shrink-0
          ${isExpanded ? 'w-64' : 'w-[76px]'}
          print:!hidden print:!absolute print:!w-0 print:!h-0 print:!overflow-hidden print:!m-0 print:!p-0`}
      >
        <div className="p-4 border-b border-gray-200 flex items-center justify-between h-[73px] overflow-hidden shrink-0">
          <div className={`transition-all duration-300 whitespace-nowrap overflow-hidden ${isExpanded ? 'opacity-100 w-full' : 'opacity-0 w-0'}`}>
            <NavLink to="/" className="flex items-center hover:opacity-80 transition-opacity group">
              <Home className="w-5 h-5 text-blue-600 mr-2 group-hover:text-blue-700 transition-colors" strokeWidth={2.5} />
              <h1 className="text-xl font-bold text-blue-600 group-hover:text-blue-700 transition-colors">PapaToDo</h1>
            </NavLink>
            <div className="text-sm text-gray-500 mt-0.5 truncate">Hallo {user?.name || 'Gast'}</div>
          </div>
          <button
            onClick={() => setIsPinned(!isPinned)}
            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors shrink-0"
            title={isPinned ? "Menü abpinnen" : "Menü anpinnen"}
          >
            {isPinned ? <PinOff className="w-5 h-5" /> : <Pin className="w-5 h-5" />}
          </button>
        </div>
        
        <nav className="flex-1 overflow-y-auto overflow-x-hidden p-3 space-y-1 custom-scrollbar">
          {mainNavItems.map(renderDesktopNavItem)}
          
          {setupNavItems.length > 0 && (
            <>
              <div className="mt-6 mb-2">
                {isExpanded ? (
                  <div className="px-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Setup & Info</div>
                ) : (
                  <div className="border-t border-gray-200 mx-3"></div>
                )}
              </div>
              {setupNavItems.map(renderDesktopNavItem)}
            </>
          )}
        </nav>
        
        <div className="p-3 border-t border-gray-200 overflow-hidden shrink-0">
          <button
            onClick={() => logout()}
            title={!isExpanded ? "Abmelden" : undefined}
            className="flex items-center w-full p-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors whitespace-nowrap"
          >
            <LogOut className="w-5 h-5 shrink-0" />
            <span className={`ml-3 font-medium transition-all duration-300 overflow-hidden ${isExpanded ? 'opacity-100 w-auto' : 'opacity-0 w-0'}`}>
              Abmelden
            </span>
          </button>
        </div>
      </aside>

      <nav className="lg:hidden shrink-0 bg-white shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] landscape:shadow-[4px_0_6px_-1px_rgba(0,0,0,0.05)] z-50 print:!hidden
        w-full flex-row border-t border-gray-200 justify-around items-center px-1 py-2 pb-safe flex
        landscape:w-[76px] landscape:flex-col landscape:border-t-0 landscape:border-r landscape:border-gray-200 landscape:justify-start landscape:py-4 landscape:space-y-2 landscape:pb-4"
      >
        {mainNavItems.slice(0, 4).map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center justify-center p-3 rounded-xl transition-colors shrink-0 ${
                isActive ? 'text-blue-600 bg-blue-50' : 'text-gray-500 hover:bg-gray-50'
              }`
            }
            title={item.label}
          >
            {({ isActive }) => (
              <div className="relative flex items-center justify-center">
                <item.icon className="w-6 h-6" strokeWidth={isActive ? 2.5 : 2} />
                
                {item.to === '/reminders' && shouldShowBadge && (
                  <span className="absolute -top-1.5 -right-3 bg-red-500 text-white text-[10px] font-bold px-1.5 min-w-[16px] h-4 rounded-full flex items-center justify-center border-2 border-white whitespace-nowrap shadow-sm">
                    {badgeText}
                  </span>
                )}
                {/* CHIRURGISCHER EINGRIFF: Badge von /todos auf / (Start) verschoben */}
                {item.to === '/' && taskCounts.total > 0 && (
                  <span className={`absolute -top-1.5 -right-3 text-white text-[10px] font-bold px-1.5 min-w-[16px] h-4 rounded-full flex items-center justify-center border-2 border-white whitespace-nowrap shadow-sm ${taskCounts.overdue > 0 ? 'bg-red-500' : 'bg-blue-500'}`}>
                    {taskCounts.inLookahead}/{taskCounts.total}
                  </span>
                )}
              </div>
            )}
          </NavLink>
        ))}
        
        {(mainNavItems.length > 4 || setupNavItems.length > 0) && (
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className={`flex items-center justify-center p-3 rounded-xl transition-colors shrink-0 landscape:mt-auto ${
              isMobileMenuOpen ? 'text-blue-600 bg-blue-50' : 'text-gray-500 hover:bg-gray-50'
            }`}
            title="Mehr Funktionen"
          >
            <Menu className="w-6 h-6" strokeWidth={isMobileMenuOpen ? 2.5 : 2} />
          </button>
        )}
      </nav>

      <main className="flex-1 overflow-y-auto min-h-0 p-4 lg:p-8 lg:pb-8 pb-6 landscape:order-1 print:!overflow-visible print:!p-0 print:!w-full print:!block print:!m-0">
        <Outlet />
      </main>

      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-[60] flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/50 transition-opacity" onClick={() => setIsMobileMenuOpen(false)}></div>
          <div className="bg-white rounded-t-3xl w-full p-5 relative animate-in slide-in-from-bottom-full duration-300 shadow-2xl">
            <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-3">
              <div className="flex items-center">
                <h2 className="text-xl font-bold text-gray-800">Mehr Funktionen</h2>
              </div>
              <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-1 mb-6">
              {[...(mainNavItems.length > 4 ? mainNavItems.slice(4) : []), ...setupNavItems].map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center p-3.5 rounded-xl transition-colors ${
                      isActive ? 'bg-blue-50 text-blue-700 font-bold' : 'text-gray-700 hover:bg-gray-50 font-medium'
                    }`
                  }
                >
                  <item.icon className="w-5 h-5 mr-4" />
                  {item.label}
                </NavLink>
              ))}
            </div>
            
            <button
              onClick={() => { setIsMobileMenuOpen(false); logout(); }}
              className="flex items-center w-full p-4 text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors font-bold justify-center"
            >
              <LogOut className="w-5 h-5 mr-2" />
              Abmelden
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
// --- END OF FILE ---