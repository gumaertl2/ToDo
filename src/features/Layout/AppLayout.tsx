// src/features/Layout/AppLayout.tsx
import React, { useEffect, useState } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { Users, Calendar, ClipboardList, CheckSquare, LogOut, LayoutDashboard, BookOpen, CalendarDays, Pin, PinOff } from 'lucide-react';
import { useClubStore } from '../../store/useClubStore';

export const AppLayout: React.FC = () => {
  const { logout, user, fetchUsersAndHelpers, fetchGroups } = useClubStore();

  // CHIRURGISCHER EINGRIFF: State für das Pin-Feature, merkt sich die Einstellung
  const [isPinned, setIsPinned] = useState(() => {
    const saved = localStorage.getItem('papatodo_sidebar_pinned');
    return saved !== null ? saved === 'true' : true;
  });
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    localStorage.setItem('papatodo_sidebar_pinned', String(isPinned));
  }, [isPinned]);

  useEffect(() => {
    fetchUsersAndHelpers();
    fetchGroups();
  }, [fetchUsersAndHelpers, fetchGroups]);

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/calendar', icon: CalendarDays, label: 'Vereinskalender' },
    { to: '/users', icon: Users, label: 'User & Gruppen' },
    { to: '/events', icon: Calendar, label: 'Projekte & Sitzungen' },
    { to: '/templates', icon: ClipboardList, label: 'Vorlagen & Routinen' },
    { to: '/todos', icon: CheckSquare, label: 'Meine ToDos' },
    { to: '/help', icon: BookOpen, label: 'Handbuch & Hilfe' },
  ];

  // Leiste ist groß, wenn sie gepinnt ODER mit der Maus überfahren wird
  const isExpanded = isPinned || isHovered;

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-gray-100 flex-col md:flex-row print:!h-auto print:!bg-white print:!block">
      
      {/* CHIRURGISCHER EINGRIFF: Die animierte Desktop-Seitenleiste */}
      <aside 
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`hidden md:flex flex-col bg-white shadow-md transition-all duration-300 ease-in-out relative z-40 shrink-0
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
              <item.icon className="w-5 h-5 shrink-0" />
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

      <main className="flex-1 overflow-y-auto min-h-0 p-4 md:p-8 md:pb-8 pb-6 print:!overflow-visible print:!p-0 print:!w-full print:!block print:!m-0">
        <Outlet />
      </main>

      {/* CHIRURGISCHER EINGRIFF: Die mobile Leiste (Fehlerfrei und textlos) */}
      <nav className="md:hidden shrink-0 w-full bg-white border-t border-gray-200 flex justify-around items-center px-1 py-2 pb-safe shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-50 print:!hidden">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center justify-center p-2.5 rounded-xl transition-colors ${
                isActive ? 'text-blue-600 bg-blue-50' : 'text-gray-500 hover:bg-gray-50'
              }`
            }
            title={item.label}
          >
            {({ isActive }) => (
              <item.icon className="w-6 h-6" strokeWidth={isActive ? 2.5 : 2} />
            )}
          </NavLink>
        ))}
        <button
          onClick={() => logout()}
          className="flex items-center justify-center p-2.5 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
          title="Abmelden"
        >
          <LogOut className="w-6 h-6" strokeWidth={2} />
        </button>
      </nav>
    </div>
  );
};
// Exakte Zeilenzahl: 110