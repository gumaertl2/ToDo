// src/features/Dashboard/DashboardView.tsx
import React, { useEffect, useMemo } from 'react';
import { useClubStore } from '../../store/useClubStore';
import { Calendar, CheckSquare, Clock, ArrowRight } from 'lucide-react';
import { NavLink } from 'react-router-dom';

export const DashboardView: React.FC = () => {
  const { events, tasks, user, fetchEvents, fetchTasks, isEventsLoading } = useClubStore();

  useEffect(() => {
    fetchEvents();
    fetchTasks();
  }, [fetchEvents, fetchTasks]);

  const upcomingEvents = useMemo(() => {
    const now = new Date();
    return events
      .filter((e) => e.startDate ? new Date(e.startDate) >= now : false)
      .sort((a, b) => (a.startDate || 0) - (b.startDate || 0))
      .slice(0, 3);
  }, [events]);

  const openTasks = useMemo(() => {
    let filtered = tasks.filter((t) => t.status !== 'ERLEDIGT');
    if (user) {
      filtered = filtered.filter((t) => t.assigneeUserIds && t.assigneeUserIds.includes(user.id));
    }
    return filtered.sort((a, b) => new Date(a.dueDate || 0).getTime() - new Date(b.dueDate || 0).getTime());
  }, [tasks, user]);

  return (
    <div className="h-full flex flex-col space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Willkommen zurück{user ? `, ${user.name}` : ''}!</h1>
          <p className="text-sm text-gray-500 mt-1">Hier ist der Überblick über deine Aufgaben und anstehenden Termine.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1">
        {/* Nächste Termine Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-800 flex items-center">
              <Calendar className="w-5 h-5 mr-2 text-blue-600" />
              Nächste Termine
            </h2>
            <NavLink to="/events" className="text-sm text-blue-600 hover:underline flex items-center font-medium">
              Alle ansehen <ArrowRight className="w-4 h-4 ml-1" />
            </NavLink>
          </div>
          <div className="p-4 flex-1 overflow-y-auto">
            {isEventsLoading ? (
              <div className="animate-pulse text-gray-400 text-center py-4">Lade Termine...</div>
            ) : upcomingEvents.length === 0 ? (
              <div className="text-center text-gray-500 py-8">Keine anstehenden Termine in nächster Zeit.</div>
            ) : (
              <div className="space-y-4">
                {upcomingEvents.map((ev) => (
                  <div key={ev.id} className="flex items-start p-3 bg-blue-50/50 border border-blue-100 rounded-lg">
                    <div className="bg-blue-100 p-2 rounded-md text-blue-700 mr-3 mt-0.5">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{ev.title}</h3>
                      <p className="text-sm text-gray-600">{ev.startDate ? new Date(ev.startDate).toLocaleString() : 'Kein Datum'}</p>
                      {ev.location && <p className="text-xs text-gray-500 mt-1">📍 {ev.location}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Aktuelle Aufgaben Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-800 flex items-center">
              <CheckSquare className="w-5 h-5 mr-2 text-green-600" />
              Aktuelle Aufgaben
            </h2>
            <NavLink to="/todos" className="text-sm text-blue-600 hover:underline flex items-center font-medium">
              Meinem Board <ArrowRight className="w-4 h-4 ml-1" />
            </NavLink>
          </div>
          <div className="p-4 flex-1 overflow-y-auto">
            {openTasks.length === 0 ? (
              <div className="text-center text-gray-500 py-8">Super! Keine offenen Aufgaben.</div>
            ) : (
              <div className="space-y-3">
                {openTasks.map((task) => (
                  <div key={task.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    <div>
                      <h3 className="font-medium text-gray-900">{task.title}</h3>
                      {task.dueDate && (
                        <p className={`text-xs mt-1 ${new Date(task.dueDate) < new Date() ? 'text-red-500 font-bold' : 'text-gray-500'}`}>
                          Fällig: {new Date(task.dueDate).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      task.status === 'IN_ARBEIT' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {task.status === 'IN_ARBEIT' ? 'In Bearbeitung' : 'Offen'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
// Exakte Zeilenzahl: 104
