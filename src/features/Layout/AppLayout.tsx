// src/features/Layout/AppLayout.tsx
import React, { useEffect } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { Users, Calendar, ClipboardList, CheckSquare, LogOut, LayoutDashboard, BookOpen, CalendarDays } from 'lucide-react';
import { useClubStore } from '../../store/useClubStore';

export const AppLayout: React.FC = () => {
  const { logout, user, fetchUsersAndHelpers, fetchGroups } = useClubStore();

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

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-gray-100 flex-col md:flex-row print:!h-auto print:!bg-white print:!block">
      <aside className="hidden md:flex flex-col w-64 shrink-0 bg-white shadow-md print:!hidden print:!absolute print:!w-0 print:!h-0 print:!overflow-hidden print:!m-0 print:!p-0">
        <div className="p-4 border-b border-gray-200">
          <h1 className="text-xl font-bold text-blue-600">PapaToDo</h1>
          <div className="text-sm text-gray-500 mt-1">Hallo {user?.name || 'Vorstand'}</div>
        </div>
        <nav className="flex-1 overflow-y-auto p-4 space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center p-3 rounded-lg transition-colors ${
                  isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'
                }`
              }
            >
              <item.icon className="w-5 h-5 mr-3" />
              <span className="font-medium">{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={() => logout()}
            className="flex items-center w-full p-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5 mr-3" />
            <span className="font-medium">Abmelden</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto min-h-0 p-4 md:p-8 md:pb-8 pb-6 print:!overflow-visible print:!p-0 print:!w-full print:!block print:!m-0">
        <Outlet />
      </main>

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
            {/* CHIRURGISCHER EINGRIFF: isActive wird hier über die Render-Props Funktion korrekt genutzt */}
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
// Exakte Zeilenzahl: 88