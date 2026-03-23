// src/features/Tasks/TaskCard.tsx
import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { Calendar, CheckSquare } from 'lucide-react';
import { Task } from '../../core/types/models';

interface TaskCardProps {
  task: Task;
}

export const TaskCard: React.FC<TaskCardProps> = ({ task }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: { task },
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  const totalChecks = task.checklist ? task.checklist.length : 0;
  const doneChecks = task.checklist ? task.checklist.filter(c => c.done).length : 0;
  const progress = totalChecks > 0 ? Math.round((doneChecks / totalChecks) * 100) : 0;
  
  const dueDateStr = new Date(task.dueDate).toLocaleDateString();

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`bg-white p-4 rounded-lg shadow-sm border border-gray-200 cursor-grab active:cursor-grabbing mb-3 ${isDragging ? 'opacity-50 ring-2 ring-blue-500 z-50' : 'hover:shadow-md transition-shadow'}`}
    >
      <h4 className="font-semibold text-gray-800 mb-2">{task.title}</h4>
      <div className="flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center">
          <Calendar className="w-3 h-3 mr-1" />
          {dueDateStr}
        </div>
        {totalChecks > 0 && (
          <div className="flex items-center text-blue-600 font-medium">
            <CheckSquare className="w-3 h-3 mr-1" />
            {progress}%
          </div>
        )}
      </div>
      {totalChecks > 0 && (
        <div className="w-full bg-gray-100 rounded-full h-1.5 mt-2 overflow-hidden">
          <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${progress}%` }}></div>
        </div>
      )}
    </div>
  );
};

// Exakte Zeilenzahl: 57
