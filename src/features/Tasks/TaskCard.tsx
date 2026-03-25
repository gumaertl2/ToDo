// src/features/Tasks/TaskCard.tsx
import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import type { Task } from '../../core/types/models';
import { ItemCard } from '../Shared/ItemCard';

interface TaskCardProps {
  task: Task;
  onEditTask?: (task: Task) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({ task, onEditTask }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: { task },
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`cursor-grab active:cursor-grabbing ${isDragging ? 'opacity-50 ring-2 ring-blue-500 z-50 rounded-lg' : ''}`}
    >
      <ItemCard item={task} onEdit={onEditTask} className="!mb-0 border-2 hover:border-blue-300" />
    </div>
  );
};
// Exakte Zeilenzahl: 34