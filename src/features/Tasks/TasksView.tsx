// src/features/Tasks/TasksView.tsx
import React, { useEffect, useState } from 'react';
import { useClubStore } from '../../store/useClubStore';
import { KanbanBoard } from './KanbanBoard';

export const TasksView: React.FC = () => {
  const { tasks, fetchTasks, isTasksLoading, user } = useClubStore();
  const [filter, setFilter] = useState<'all' | 'my'>('my');

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const displayedTasks = tasks.filter((task) => {
    if (filter === 'my' && user) {
      return task.assignee_ids.includes(user.id);
    }
    return true;
  });

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
          <KanbanBoard tasks={displayedTasks} />
        </div>
      )}
    </div>
  );
};

// Exakte Zeilenzahl: 59
