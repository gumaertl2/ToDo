// src/features/Shared/ItemCard.tsx
import React from 'react';
import { Calendar, User, CheckSquare, FileText, Clock, Edit2, Trash2 } from 'lucide-react';
import type { AgendaItem } from '../../core/types/models';
import { useClubStore } from '../../store/useClubStore';

interface ItemCardProps {
  item: AgendaItem;
  onEdit?: (item: AgendaItem) => void;
  onDelete?: (id: string, title: string) => void;
  className?: string;
}

// CHIRURGISCHER EINGRIFF: Die smarte Ampel-Logik
const getDueDateColor = (item: AgendaItem) => {
  if (item.type !== 'AUFGABE') return 'text-gray-600';
  if (item.status === 'ERLEDIGT' || item.progress === 100) return 'text-green-600 font-bold';
  if (item.isDueNextMeeting) return 'text-purple-600 font-bold';
  if (!item.dueDate) return 'text-gray-500';

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const due = new Date(item.dueDate);
  due.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 3600 * 24));

  if (diffDays < 0) return 'text-red-600 font-bold';
  if (diffDays <= 14) return 'text-orange-500 font-bold';
  return 'text-gray-600 font-medium';
};

export const ItemCard: React.FC<ItemCardProps> = ({ item, onEdit, onDelete, className = '' }) => {
  const { users, groups } = useClubStore();

  const getAssigneesText = () => {
    const uNames = (item.assigneeUserIds || []).map(id => users.find(u => u.id === id)?.name).filter(Boolean);
    const gNames = (item.assigneeGroupIds || []).map(id => groups.find(g => g.id === id)?.name).filter(Boolean);
    const all = [...uNames, ...gNames];
    return all.length > 0 ? all.join(', ') : 'Nicht zugewiesen';
  };

  const isTask = item.type === 'AUFGABE';
  const totalChecks = item.checkliste ? item.checkliste.length : 0;
  const doneChecks = item.checkliste ? item.checkliste.filter(c => c.isDone).length : 0;
  const progressValue = item.progress !== undefined ? item.progress : (totalChecks > 0 ? Math.round((doneChecks / totalChecks) * 100) : 0);
  
  const formatSafeDate = (timestamp?: number) => {
    if (!timestamp) return '';
    const d = new Date(timestamp);
    return isNaN(d.getTime()) ? '' : d.toLocaleDateString();
  };

  const dueDateStr = formatSafeDate(item.dueDate);
  const dateColor = getDueDateColor(item);

  return (
    <div 
      onClick={() => onEdit && onEdit(item)}
      className={`bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-3 transition-shadow flex flex-col ${onEdit ? 'cursor-pointer hover:border-blue-300 hover:shadow-md' : ''} ${className}`}
      title={item.description ? item.description : 'Keine zusätzliche Beschreibung'}
    >
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-semibold text-gray-800 flex items-center gap-2">
          {isTask ? <CheckSquare className={`w-4 h-4 ${progressValue === 100 ? 'text-green-600' : 'text-blue-600'}`} /> : <FileText className="w-4 h-4 text-blue-600" />}
          {item.title}
          {item.mustBeDoneBeforeEvent && (
            <span className="flex items-center text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium shrink-0">
              <Clock className="w-3 h-3 mr-1" />
              Vorlauf: {item.leadTimeValue} {item.leadTimeUnit === 'days' ? 'Tage' : 'Std.'}
            </span>
          )}
        </h4>
        {(onEdit || onDelete) && (
          <div className="flex items-center ml-2 shrink-0">
            {onEdit && <button onClick={(e) => { e.stopPropagation(); onEdit(item); }} className="text-blue-500 hover:text-blue-700 p-1 mr-1"><Edit2 className="w-4 h-4" /></button>}
            {onDelete && <button onClick={(e) => { e.stopPropagation(); onDelete(item.id, item.title); }} className="text-red-400 hover:text-red-600 p-1"><Trash2 className="w-4 h-4" /></button>}
          </div>
        )}
      </div>

      <div className="flex items-center text-xs text-gray-500 mb-3">
        <User className="w-3 h-3 mr-1" />
        <span className="truncate max-w-[200px]">{getAssigneesText()}</span>
      </div>

      <div className="flex items-center justify-between text-xs mt-auto">
        {isTask ? (
          <>
            <div className={`flex items-center ${dateColor}`}>
              <Calendar className="w-3 h-3 mr-1" />
              {item.isDueNextMeeting ? (
                <span>Nächste Sitzung</span>
              ) : item.dueDate ? (
                <span>{dueDateStr}</span>
              ) : (
                <span>Kein Datum</span>
              )}
            </div>
            <div className={`flex items-center font-medium ml-2 shrink-0 ${progressValue === 100 ? 'text-green-600' : 'text-blue-600'}`}>
              <CheckSquare className="w-3 h-3 mr-1" />{progressValue}%
            </div>
          </>
        ) : (
          <div className="flex items-center text-gray-500">
            <Clock className="w-3 h-3 mr-1" />Dauer: {item.durationEstimate || 0} Min.
          </div>
        )}
      </div>
      
      {isTask && (
        <div className="w-full bg-gray-100 rounded-full h-1.5 mt-2 overflow-hidden shrink-0">
          <div className={`h-1.5 rounded-full transition-all duration-300 ${progressValue === 100 ? 'bg-green-500' : 'bg-blue-500'}`} style={{ width: `${progressValue}%` }}></div>
        </div>
      )}
    </div>
  );
};
// Exakte Zeilenzahl: 119