// 2026-04-18 16:30 - FEATURE: Toggle-Button für historische Aufgaben in der ERLEDIGT-Spalte
// 2026-04-19 17:30 - REFACTOR: Button unten restlos entfernt, strikter Read-Only Modus in DnD
// src/features/Tasks/KanbanBoard.tsx
import React from 'react';
import {
  DndContext,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDroppable,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { TaskCard } from './TaskCard';
import type { Task, TaskStatus } from '../../core/types/models';
import { useClubStore } from '../../store/useClubStore';

interface KanbanColumnProps {
  id: TaskStatus;
  title: string;
  tasks: Task[];
  onEditTask?: (task: Task) => void;
  historicalTaskIds: Set<string>;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({ 
  id, 
  title, 
  tasks, 
  onEditTask,
  historicalTaskIds
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id: id,
  });

  return (
    <div className="flex flex-col w-full md:w-1/3 min-w-[300px] bg-gray-100/50 rounded-xl p-4 mr-0 md:mr-4 mb-4 md:mb-0">
      <div className="flex items-center justify-between mb-4 px-1">
        <h3 className="font-bold text-gray-700">{title}</h3>
        <span className="bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full text-xs font-medium">
          {tasks.length}
        </span>
      </div>
      <div
        ref={setNodeRef}
        className={`flex-1 min-h-[150px] md:min-h-[500px] rounded-lg transition-colors ${
          isOver ? 'bg-blue-50 border-2 border-dashed border-blue-300' : 'bg-transparent'
        }`}
      >
        {tasks.map((task) => (
          <TaskCard 
            key={task.id} 
            task={task} 
            onEditTask={onEditTask} 
            isReadOnly={historicalTaskIds.has(task.id)} 
          />
        ))}
      </div>
    </div>
  );
};

interface KanbanBoardProps {
  tasks: Task[];
  onEditTask?: (task: Task) => void;
  historicalTaskIds: Set<string>;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({ 
  tasks, 
  onEditTask,
  historicalTaskIds
}) => {
  const { updateTask } = useClubStore();

  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: {
      distance: 5,
    },
  });

  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: {
      delay: 250,
      tolerance: 5,
    },
  });

  const sensors = useSensors(mouseSensor, touchSensor);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const taskId = active.id as string;
    const newStatus = over.id as TaskStatus;

    // CHIRURGISCHER EINGRIFF: Verhindere Status-Änderung von Read-Only Aufgaben
    if (historicalTaskIds.has(taskId)) return;

    const activeTask = tasks.find((t) => t.id === taskId);
    if (!activeTask || activeTask.status === newStatus) return;

    const updatedTask = { ...activeTask, status: newStatus };
    await updateTask(updatedTask);
  };

  const columns: { id: TaskStatus; title: string }[] = [
    { id: 'OFFEN', title: 'Offen' },
    { id: 'IN_ARBEIT', title: 'In Bearbeitung' },
    { id: 'ERLEDIGT', title: 'Erledigt' },
  ];

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="flex flex-col md:flex-row overflow-x-auto pb-4 h-full">
        {columns.map((col) => (
          <KanbanColumn
            key={col.id}
            id={col.id}
            title={col.title}
            tasks={tasks.filter((t) => t.status === col.id)}
            onEditTask={onEditTask}
            historicalTaskIds={historicalTaskIds}
          />
        ))}
      </div>
    </DndContext>
  );
};
// --- END OF FILE ---