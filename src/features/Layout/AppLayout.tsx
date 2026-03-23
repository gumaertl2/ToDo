// src/features/Layout/AppLayout.tsx
import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { Users, Calendar, ClipboardList, CheckSquare, LogOut } from 'lucide-react';
import { useClubStore } from '../../store/useClubStore';

export const AppLayout: React.FC = () => {
  const { logout, user } = useClubStore();

  const navItems = [
    { to: '/users', icon: Users, label: 'User & Gruppen' },
    { to: '/events', icon: Calendar, label: 'Events & Sitzungen' },
    { to: '/templates', icon: ClipboardList, label: 'Vorlagen & Routinen' },
    { to: '/todos', icon: CheckSquare, label: 'Meine ToDos' },
  ];

  return (
    <div className="flex h-screen bg-gray-100 flex-col md:flex-row">
      <aside className="hidden md:flex flex-col w-64 bg-white shadow-md">
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

      <main className="flex-1 overflow-y-auto p-4 md:p-8 md:pb-8 pb-24">
        <Outlet />
      </main>

      <nav className="md:hidden fixed bottom-0 w-full bg-white border-t border-gray-200 flex justify-around p-2 pb-safe shadow-lg z-50">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex flex-col items-center p-2 rounded-lg transition-colors ${
                isActive ? 'text-blue-600' : 'text-gray-500 hover:bg-gray-50'
              }`
            }
          >
            <item.icon className="w-6 h-6 mb-1" />
            <span className="text-xs font-medium">{item.label}</span>
          </NavLink>
        ))}
        <button
          onClick={() => logout()}
          className="flex flex-col items-center p-2 text-red-500 hover:bg-red-50 rounded-lg"
        >
          <LogOut className="w-6 h-6 mb-1" />
          <span className="text-xs font-medium">Exit</span>
        </button>
      </nav>
    </div>
  );
};

// Exakte Zeilenzahl: 82
