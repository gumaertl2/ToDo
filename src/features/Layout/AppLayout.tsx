// 2026-04-15 19:00 - FEATURE: Mobile Bottom-Sheet ("Mehr"-Menü) für aufgeräumte Fußleiste implementiert
// src/features/Layout/AppLayout.tsx
import React, { useEffect, useState, useMemo } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { Users, Calendar, ClipboardList, CheckSquare, LogOut, LayoutDashboard, BookOpen, CalendarDays, Pin, PinOff, MessageCircle, BarChart2, Menu, X } from 'lucide-react';
import { useClubStore } from '../../store/useClubStore';

export const AppLayout: React.FC = () => {
  const { logout, user, fetchUsersAndHelpers, fetchGroups, calendarEvents, tasks, events, calendarSubscriptions, fetchEvents, fetchTasks, fetchCalendarData } = useClubStore();

  const [isPinned, setIsPinned] = useState(() => {
    const saved = localStorage.getItem('papatodo_sidebar_pinned');
    return saved !== null ? saved === 'true' : true;
  });
  const [isHovered, setIsHovered] = useState(false);
  const [sidebarTouchStart, setSidebarTouchStart] = useState<number | null>(null);
  
  // CHIRURGISCHER EINGRIFF: State für das mobile Overlay-Menü
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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

  const pendingRemindersCount = useMemo(() => {
    if (!user) return 0;
    
    let count = 0;
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const MS_PER_DAY = 1000 * 60 * 60 * 24;

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
        if (ev.status !== 'ABGESCHLOSSEN' && ev.reminderSenderUserId === user.id && !ev.reminderSentAt && ev.reminderLeadDays !== undefined && ev.plannedStartTime) {
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
  }, [user, calendarEvents, tasks, events, calendarSubscriptions]);

  useEffect(() => {
    if (pendingRemindersCount > 0) {
      if ('setAppBadge' in navigator) {
        navigator.setAppBadge(pendingRemindersCount).catch(() => {});
      }
    } else {
      if ('clearAppBadge' in navigator) {
        navigator.clearAppBadge().catch(() => {});
      }
    }
  }, [pendingRemindersCount]);

  // CHIRURGISCHER EINGRIFF: Aufteilung in Primär- und Setup-Menü
  const mainNavItems = [
    { to: '/calendar', icon: CalendarDays, label: 'Vereinskalender' },
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/todos', icon: CheckSquare, label: 'Meine ToDos' },
    { to: '/reminders', icon: MessageCircle, label: 'Erinnerungen' },
    { to: '/events', icon: Calendar, label: 'Projekte & Sitzungen' },
  ];

  const setupNavItems = [
    { to: '/users', icon: Users, label: 'User & Gruppen' },
    { to: '/templates', icon: ClipboardList, label: 'Vorlagen & Routinen' },
    { to: '/reports', icon: BarChart2, label: 'Reports & Statistik' },
    { to: '/help', icon: BookOpen, label: 'Handbuch & Hilfe' },
  ];

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
        {item.to === '/reminders' && pendingRemindersCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold px-1 min-w-[16px] h-4 rounded-full flex items-center justify-center border border-white">
            {pendingRemindersCount}
          </span>
        )}
      </div>
      <span className={`ml-3 font-medium transition-all duration-300 overflow-hidden ${isExpanded ? 'opacity-100 w-auto' : 'opacity-0 w-0'}`}>
        {item.label}
      </span>
    </NavLink>
  );

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-gray-100 flex-col lg:flex-row print:!h-auto print:!bg-white print:!block">
      
      {/* DESKTOP SIDEBAR */}
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
            <h1 className="text-xl font-bold text-blue-600">PapaToDo</h1>
            <div className="text-sm text-gray-500 mt-0.5 truncate">Hallo {user?.name || 'Vorstand'}</div>
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
          
          <div className="mt-6 mb-2">
            {isExpanded ? (
              <div className="px-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Setup & Info</div>
            ) : (
              <div className="border-t border-gray-200 mx-3"></div>
            )}
          </div>
          
          {setupNavItems.map(renderDesktopNavItem)}
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

      {/* HAUPTINHALT */}
      <main className="flex-1 overflow-y-auto min-h-0 p-4 lg:p-8 lg:pb-8 pb-6 print:!overflow-visible print:!p-0 print:!w-full print:!block print:!m-0">
        <Outlet />
      </main>

      {/* CHIRURGISCHER EINGRIFF: Mobile Overlay (Bottom Sheet) */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-[60] flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/50 transition-opacity" onClick={() => setIsMobileMenuOpen(false)}></div>
          <div className="bg-white rounded-t-3xl w-full p-5 relative animate-in slide-in-from-bottom-full duration-300 shadow-2xl">
            <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-3">
              <h2 className="text-xl font-bold text-gray-800">Mehr Funktionen</h2>
              <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-1 mb-6">
              {[mainNavItems[4], ...setupNavItems].map(item => (
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

      {/* CHIRURGISCHER EINGRIFF: Mobile Bottom Navigation (Nur Top 4 + "Mehr") */}
      <nav className="lg:hidden shrink-0 w-full bg-white border-t border-gray-200 flex justify-around items-center px-1 py-2 pb-safe shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-50 print:!hidden">
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
                {item.to === '/reminders' && pendingRemindersCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold px-1 min-w-[16px] h-4 rounded-full flex items-center justify-center border-2 border-white">
                    {pendingRemindersCount}
                  </span>
                )}
              </div>
            )}
          </NavLink>
        ))}
        
        {/* Der "Mehr"-Button */}
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className={`flex items-center justify-center p-3 rounded-xl transition-colors shrink-0 ${
            isMobileMenuOpen ? 'text-blue-600 bg-blue-50' : 'text-gray-500 hover:bg-gray-50'
          }`}
          title="Mehr Funktionen"
        >
          <Menu className="w-6 h-6" strokeWidth={isMobileMenuOpen ? 2.5 : 2} />
        </button>
      </nav>

    </div>
  );
};
// --- END OF FILE 298 Zeilen ---