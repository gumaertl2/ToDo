// 2026-04-14 13:40 - FIX: Globaler Reload-Schutz für alle benötigten Daten (inkl. CalendarEvents)
// src/features/Layout/AppLayout.tsx
import React, { useEffect, useState, useMemo } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { Users, Calendar, ClipboardList, CheckSquare, LogOut, LayoutDashboard, BookOpen, CalendarDays, Pin, PinOff, MessageCircle } from 'lucide-react';
import { useClubStore } from '../../store/useClubStore';

export const AppLayout: React.FC = () => {
  // CHIRURGISCHER EINGRIFF: fetchCalendarEvents ergänzt
  const { logout, user, fetchUsersAndHelpers, fetchGroups, calendarEvents, tasks, fetchEvents, fetchTasks, fetchCalendarEvents } = useClubStore();

  const [isPinned, setIsPinned] = useState(() => {
    const saved = localStorage.getItem('papatodo_sidebar_pinned');
    return saved !== null ? saved === 'true' : true;
  });
  const [isHovered, setIsHovered] = useState(false);
  const [sidebarTouchStart, setSidebarTouchStart] = useState<number | null>(null);

  useEffect(() => {
    localStorage.setItem('papatodo_sidebar_pinned', String(isPinned));
  }, [isPinned]);

  // CHIRURGISCHER EINGRIFF: Alle Fetch-Calls bei App-Start aufrufen (falls vorhanden)
  useEffect(() => {
    if (fetchUsersAndHelpers) fetchUsersAndHelpers();
    if (fetchGroups) fetchGroups();
    if (fetchEvents) fetchEvents();
    if (fetchTasks) fetchTasks();
    if (fetchCalendarEvents) fetchCalendarEvents();
  }, [fetchUsersAndHelpers, fetchGroups, fetchEvents, fetchTasks, fetchCalendarEvents]);

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

    return count;
  }, [user, calendarEvents, tasks]);

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

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/calendar', icon: CalendarDays, label: 'Vereinskalender' },
    { to: '/users', icon: Users, label: 'User & Gruppen' },
    { to: '/events', icon: Calendar, label: 'Projekte & Sitzungen' },
    { to: '/templates', icon: ClipboardList, label: 'Vorlagen & Routinen' },
    { to: '/todos', icon: CheckSquare, label: 'Meine ToDos' },
    { to: '/reminders', icon: MessageCircle, label: 'Erinnerungen' },
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

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-gray-100 flex-col lg:flex-row print:!h-auto print:!bg-white print:!block">
      
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
        
        <nav className="flex-1 overflow-y-auto overflow-x-hidden p-3 space-y-2">
          {navItems.map((item) => (
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
          ))}
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

      <main className="flex-1 overflow-y-auto min-h-0 p-4 lg:p-8 lg:pb-8 pb-6 print:!overflow-visible print:!p-0 print:!w-full print:!block print:!m-0">
        <Outlet />
      </main>

      <nav className="lg:hidden shrink-0 w-full bg-white border-t border-gray-200 flex justify-around items-center px-1 py-2 pb-safe shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-50 print:!hidden overflow-x-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center justify-center p-2.5 rounded-xl transition-colors shrink-0 ${
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
        <button
          onClick={() => logout()}
          className="flex items-center justify-center p-2.5 text-red-500 hover:bg-red-50 rounded-xl transition-colors shrink-0"
          title="Abmelden"
        >
          <LogOut className="w-6 h-6" strokeWidth={2} />
        </button>
      </nav>
    </div>
  );
};
// Exakte Zeilenzahl: 206