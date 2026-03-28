// src/features/Tasks/TaskHistoryModal.tsx
import React, { useMemo } from 'react';
import { X, Clock, MessageSquare, CheckCircle2, Circle, ArrowRightCircle } from 'lucide-react';
import { useClubStore } from '../../store/useClubStore';
import type { Task } from '../../core/types/models';

interface TaskHistoryModalProps {
  task: Task;
  onClose: () => void;
}

export const TaskHistoryModal: React.FC<TaskHistoryModalProps> = ({ task, onClose }) => {
  const { tasks, events, users } = useClubStore();

  // CHIRURGISCHER EINGRIFF: Die Zeitreise-Logik. Sucht alle Klone und das Original.
  const historyChain = useMemo(() => {
    if (!task.baseItemId) return [task];
    
    // Alle Aufgaben mit derselben baseItemId finden (inkl. dem Original, dessen id == baseItemId ist)
    const chain = tasks.filter(t => t.baseItemId === task.baseItemId || t.id === task.baseItemId);
    
    // Chronologisch sortieren (älteste zuerst)
    return chain.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  }, [task, tasks]);

  const getStatusIcon = (status: string, progress: number) => {
    if (status === 'ERLEDIGT' || progress === 100) return <CheckCircle2 className="w-5 h-5 text-green-500" />;
    if (status === 'IN_ARBEIT' || progress > 0) return <ArrowRightCircle className="w-5 h-5 text-orange-500" />;
    return <Circle className="w-5 h-5 text-gray-400" />;
  };

  const getUserName = (userId: string) => {
    return users.find(u => u.id === userId)?.name || 'Unbekannt';
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4 print:hidden">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
          <h2 className="text-lg font-bold text-gray-900 flex items-center">
            <Clock className="w-5 h-5 mr-2 text-blue-600" />
            Historie: {task.title}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1 bg-gray-50/50">
          <div className="relative border-l-2 border-blue-200 ml-4 space-y-8 pb-4 mt-2">
            {historyChain.map((histTask, index) => {
              const event = events.find(e => e.id === histTask.eventId);
              const isLatest = index === historyChain.length - 1;
              const dateStr = event?.plannedStartTime 
                ? new Date(event.plannedStartTime).toLocaleDateString() 
                : (histTask.createdAt ? new Date(histTask.createdAt).toLocaleDateString() : 'Unbekannt');

              return (
                <div key={histTask.id} className="relative pl-6">
                  <div className="absolute -left-[11px] top-1 bg-white rounded-full">
                    {getStatusIcon(histTask.status, histTask.progress)}
                  </div>
                  
                  <div className={`bg-white p-4 rounded-lg border ${isLatest ? 'border-blue-300 shadow-md ring-1 ring-blue-100' : 'border-gray-200 shadow-sm'}`}>
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-full uppercase tracking-wider">
                          {dateStr}
                        </span>
                        <h3 className="font-bold text-gray-900 mt-2">
                          {event ? event.title : 'Kein Event / Freie Aufgabe'}
                        </h3>
                      </div>
                      <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        {histTask.progress}%
                      </span>
                    </div>

                    {histTask.comments && histTask.comments.length > 0 && (
                      <div className="mt-4 space-y-2 bg-gray-50 p-3 rounded border border-gray-100">
                        <h4 className="text-xs font-bold text-gray-700 flex items-center mb-2">
                          <MessageSquare className="w-3 h-3 mr-1" /> Kommentare in dieser Sitzung:
                        </h4>
                        {histTask.comments.map(comment => (
                          <div key={comment.id} className="text-sm">
                            <span className="font-bold text-gray-700 mr-2">{getUserName(comment.authorId)}:</span>
                            <span className="text-gray-600">{comment.text}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {(!histTask.comments || histTask.comments.length === 0) && (
                      <p className="text-xs text-gray-400 mt-2 italic">Keine Kommentare in dieser Sitzung.</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
// Exakte Zeilenzahl: 99