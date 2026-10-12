// [2026-10-12] - REFACTOR: ToDo-Kachel aus dem WelcomeDashboard in eigene Komponente ausgelagert.
// src/features/Dashboard/components/DashboardTasksWidget.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, KanbanSquare, ListTodo, Check, Clock, AlertTriangle } from 'lucide-react';
import type { Task } from '../../../core/types/models';

interface DashboardTasksWidgetProps {
  tasksLookahead: number;
  onLookaheadChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  totalOpenTasksCount: number;
  myTasks: Task[];
  onEditTask: (task: Task) => void;
  user: any;
  todayStart: number;
}

export const DashboardTasksWidget: React.FC<DashboardTasksWidgetProps> = ({
  tasksLookahead,
  onLookaheadChange,
  totalOpenTasksCount,
  myTasks,
  onEditTask,
  user,
  todayStart
}) => {
  const navigate = useNavigate();

  const getTaskStatusInfo = (dueDate?: number) => {
    if (!dueDate) return { label: 'Ohne Frist', color: 'bg-gray-100 text-gray-700', icon: Clock };
    if (dueDate < todayStart) return { label: 'Überfällig', color: 'bg-red-100 text-red-700', icon: AlertTriangle };
    
    const daysLeft = Math.ceil((dueDate - todayStart) / (1000 * 60 * 60 * 24));
    if (daysLeft === 0) return { label: 'Heute fällig', color: 'bg-amber-100 text-amber-800', icon: Clock };
    return { label: `In ${daysLeft} Tagen`, color: 'bg-blue-100 text-blue-800', icon: Clock };
  };

  return (
    <section className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden flex flex-col h-full sticky top-4">
      <div className="p-4 border-b border-gray-100 bg-gray-50 flex flex-col gap-4">
        <div className="flex items-center flex-wrap gap-2 justify-between">
          <div className="flex items-center">
            <CheckCircle2 className="w-5 h-5 mr-2 text-green-600" /> 
            <h2 className="text-lg font-bold text-gray-900 mr-2">Deine ToDos</h2>
            <span className="bg-green-100 text-green-800 text-xs font-bold px-2.5 py-0.5 rounded-full border border-green-200 shadow-sm">
              {totalOpenTasksCount} offen
            </span>
          </div>
          <div className="flex items-center ml-auto bg-white border border-gray-200 rounded-lg px-2 py-0.5 shadow-sm" title="Vorschau in Tagen">
             <input 
               type="number" min="1" max="365" 
               value={tasksLookahead} 
               onChange={onLookaheadChange} 
               className="w-10 text-center text-sm font-bold text-green-600 outline-none" 
             />
             <span className="text-[10px] uppercase font-bold text-gray-400 ml-1">Tage</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => navigate('/todos')} 
            className="flex-1 flex justify-center items-center text-sm font-medium text-blue-700 bg-blue-50 border border-blue-100 hover:bg-blue-100 transition-colors px-3 py-2 rounded-lg"
          >
            <KanbanSquare className="w-4 h-4 mr-2 opacity-70" /> Kanban-Board
          </button>
          <button 
            onClick={() => navigate('/todos', { state: { view: 'list' } })} 
            className="flex-1 flex justify-center items-center text-sm font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 transition-colors px-3 py-2 rounded-lg shadow-sm"
          >
            <ListTodo className="w-4 h-4 mr-2 opacity-70" /> Listenansicht
          </button>
        </div>
      </div>

      <div className="p-2 flex-1 overflow-y-auto max-h-[500px]">
        {myTasks.length === 0 ? (
          <div className="p-8 text-center flex flex-col items-center justify-center text-gray-500 h-full">
            <div className="bg-green-100 p-3 rounded-full mb-3 text-green-600"><Check className="w-6 h-6" /></div>
            <p className="font-medium">Alles erledigt für die nächsten {tasksLookahead} Tage!</p>
          </div>
        ) : (
          myTasks.map(task => {
            const statusInfo = getTaskStatusInfo(task.dueDate);
            const StatusIcon = statusInfo.icon;
            let reason = "Persönlich zugewiesen";
            
            if (!task.assigneeUserIds?.includes(user?.id || '')) {
              reason = "Über Team/Gruppe";
            }

            return (
              <button key={task.id} onClick={() => onEditTask(task)} className="w-full text-left p-3 hover:bg-gray-50 rounded-lg transition-colors border-b border-gray-100 last:border-0 group flex items-start gap-3">
                <StatusIcon className={`w-5 h-5 mt-1 ${statusInfo.label === 'Überfällig' ? 'text-red-500' : 'text-gray-400'}`} />
                <div>
                  <h4 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors leading-tight">{task.title}</h4>
                  <div className="mt-2 text-[10px] font-bold uppercase">{statusInfo.label} • {reason}</div>
                </div>
              </button>
            )
          })
        )}
      </div>
    </section>
  );
};
// --- END OF FILE ---