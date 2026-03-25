// src/features/Dashboard/DashboardView.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { useClubStore } from '../../store/useClubStore';
import { Calendar, CheckSquare, Clock, ArrowRight, User } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { ItemCard } from '../Shared/ItemCard';
import { ItemFormModal } from '../Shared/ItemFormModal';
import type { Task } from '../../core/types/models';

export const DashboardView: React.FC = () => {
  const { events, tasks, user, users, groups, fetchEvents, fetchTasks, isEventsLoading, saveAgendaItem } = useClubStore();
  
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Task | null>(null);

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
    
    // CHIRURGISCHER EINGRIFF: Schrödinger-Filter (Aufgaben aus geplanten Sitzungen verstecken)
    filtered = filtered.filter((t) => {
      if (!t.eventId) return true;
      const ev = events.find(e => e.id === t.eventId);
      return ev ? ev.status !== 'PLANUNG' : true;
    });
    
    if (user) {
      filtered = filtered.filter((t) => {
        const isUserDirectlyAssigned = t.assigneeUserIds && t.assigneeUserIds.includes(user.id);
        const isUserGroupAssigned = t.assigneeGroupIds && user.groupIds && t.assigneeGroupIds.some(groupId => user.groupIds.includes(groupId));
        return isUserDirectlyAssigned || isUserGroupAssigned;
      });
    }
    
    return filtered.sort((a, b) => (a.dueDate || 0) - (b.dueDate || 0));
  }, [tasks, events, user]);

  const handleEditTask = (task: Task) => {
    setEditingItem(task);
    setIsItemModalOpen(true);
  };

  const getAssigneesText = (task: Task) => {
    const uNames = (task.assigneeUserIds || []).map(id => users.find(u => u.id === id)?.name).filter(Boolean);
    const gNames = (task.assigneeGroupIds || []).map(id => groups.find(g => g.id === id)?.name).filter(Boolean);
    const all = [...uNames, ...gNames];
    return all.length > 0 ? all.join(', ') : 'Nicht zugewiesen';
  };

  return (
    <div className="h-full flex flex-col space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Willkommen zurück{user ? `, ${user.name}` : ''}!</h1>
          <p className="text-sm text-gray-500 mt-1">Hier ist der Überblick über deine Aufgaben und anstehenden Termine.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1">
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
          <div className="p-4 flex-1 overflow-y-auto bg-gray-50/50">
            {openTasks.length === 0 ? (
              <div className="text-center text-gray-500 py-8">Super! Keine offenen Aufgaben.</div>
            ) : (
              <div className="space-y-3">
                {openTasks.map((task) => (
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
            await fetchTasks();
            setIsItemModalOpen(false);
          }}
        />
      )}
    </div>
  );
};
// Exakte Zeilenzahl: 147