// src/features/Tasks/TasksView.tsx
import React, { useEffect, useState } from 'react';
import { useClubStore } from '../../store/useClubStore';
import { KanbanBoard } from './KanbanBoard';
import { ItemFormModal } from '../Shared/ItemFormModal';
import type { Task } from '../../core/types/models';

export const TasksView: React.FC = () => {
  const { tasks, fetchTasks, isTasksLoading, user, saveAgendaItem, events, fetchEvents } = useClubStore();
  const [filter, setFilter] = useState<'all' | 'my'>('my');
  
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Task | null>(null);

  useEffect(() => {
    fetchTasks();
    fetchEvents();
  }, [fetchTasks, fetchEvents]);

  const displayedTasks = tasks.filter((task) => {
    // CHIRURGISCHER EINGRIFF: Schrödinger-Filter
    if (task.eventId) {
      const ev = events.find(e => e.id === task.eventId);
      if (ev && ev.status === 'PLANUNG') return false;
    }

    if (filter === 'my' && user) {
      const isUserDirectlyAssigned = task.assigneeUserIds && task.assigneeUserIds.includes(user.id);
      const isUserGroupAssigned = task.assigneeGroupIds && user.groupIds && task.assigneeGroupIds.some(groupId => user.groupIds.includes(groupId));
      return isUserDirectlyAssigned || isUserGroupAssigned;
    }
    return true;
  });

  const handleEditTask = (task: Task) => {
    setEditingItem(task);
    setIsItemModalOpen(true);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4 sm:mb-0">Meine ToDos</h1>
        
        <div className="flex bg-gray-200 p-1 rounded-lg self-start sm:self-auto">
          <button
            onClick={() => setFilter('my')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              filter === 'my' ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Nur meine Aufgaben
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              filter === 'all' ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Alle Aufgaben
          </button>
        </div>
      </div>

      {isTasksLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-gray-500 font-medium animate-pulse">Lade Aufgaben...</div>
        </div>
      ) : (
        <div className="flex-1 overflow-hidden">
          <KanbanBoard tasks={displayedTasks} onEditTask={handleEditTask} />
        </div>
      )}

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
// Exakte Zeilenzahl: 95