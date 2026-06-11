// 2026-04-19 17:30 - FEATURE: isReadOnly Prop integriert (deaktiviert Drag & Drop für historische Aufgaben)
// 2026-04-19 19:15 - FIX: Klick-Event & Pointer wiederhergestellt für archivierte Aufgaben (Read-Only Detailansicht)
// 2026-04-22 20:20 - FEATURE: Anzeige der Protokoll-Nummer (protocolIndex) als Badge integriert
// 2026-05-10 14:15 - FIX: isReadOnly wird nun an die ItemCard durchgereicht für korrekte Button-Darstellung
// 2026-05-12 15:35 - UX-FIX: Anzeige der Protokoll-Nummer (Badge) entfernt, da im ToDo-Kontext ohne Hierarchie irreführend.
// src/features/Tasks/TaskCard.tsx
import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import type { Task } from '../../core/types/models';
import { ItemCard } from '../Shared/ItemCard';

interface TaskCardProps {
  task: Task;
  onEditTask?: (task: Task) => void;
  isReadOnly?: boolean;
}

export const TaskCard: React.FC<TaskCardProps> = ({ task, onEditTask, isReadOnly }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: { task },
    disabled: isReadOnly, 
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(isReadOnly ? {} : listeners)}
      {...(isReadOnly ? {} : attributes)}
      className={`relative ${isReadOnly ? 'cursor-pointer opacity-70 grayscale-[10%]' : 'cursor-grab active:cursor-grabbing'} ${isDragging ? 'opacity-50 ring-2 ring-blue-500 z-50 rounded-lg' : ''}`}
    >
      {/* CHIRURGISCHER EINGRIFF: protocolIndex Badge hier restlos entfernt */}
      <ItemCard 
        item={task} 
        onEdit={onEditTask} 
        isReadOnly={isReadOnly} 
        className={`!mb-0 border-2 ${isReadOnly ? 'border-transparent hover:border-gray-200' : 'hover:border-blue-300'}`} 
      />
    </div>
  );
};
// --- END OF FILE ---