// [2026-05-31] - UX-FEATURE: Anzeige des echten Erledigungsdatums (completedAt) im Kanban-Board implementiert. Ersetzt die Fälligkeit in grüner Farbe, sobald die Aufgabe abgeschlossen ist.
// [2026-05-26] - BUGFIX: hasHistory und historyCount nutzen Blutlinien-Logik (baseItemId || id) identisch zum RollenTab. Die Uhr erscheint nun auch bei Items die noch nie kopiert wurden aber bereits erledigt waren. historyCount zeigt die korrekte globale Anzahl.
// [2026-05-25] - UX-FEATURE: Brotkrümel-Navigation für Unterpunkte im Kanban-Board. Zeigt den Titel des Oberpunkts (Parent Container) dezent in der ersten Zeile an.
// 2026-04-19 20:30 - FEATURE: Buntes Projekt-Badge (Titel + Datum) unter dem Aufgaben-Titel hinzugefügt
// 2026-05-02 10:35 - FIX: Typen für 'leadTimeUnit' in ItemCard aktualisiert
// 2026-05-02 10:50 - UX-FIX: Relative Termin-Badge wird strikt nur noch bei Unteraufgaben angezeigt
// 2026-05-08 17:55 - UX-FIX: Responsive Design (flex-wrap) für lange Titel und Badges auf Mobile
// 2026-05-10 14:15 - UX-FEATURE: isReadOnly-Prop eingebaut. Zeigt 'Auge' statt 'Stift' bei archivierten ToDos, blendet Löschen-Button aus.
// src/features/Shared/ItemCard.tsx
import React, { useState } from 'react';
import { Calendar, User, CheckSquare, FileText, Clock, Edit2, Trash2, Eye, CheckCircle2 } from 'lucide-react'; // CHIRURGISCHER EINGRIFF
import type { AgendaItem } from '../../core/types/models';
import { useClubStore } from '../../store/useClubStore';
import { TaskHistoryModal } from '../Tasks/TaskHistoryModal';
import { RichTextRenderer } from './RichText';

interface ItemCardProps {
  item: AgendaItem;
  onEdit?: (item: AgendaItem) => void;
  onDelete?: (id: string, title: string) => void;
  className?: string;
  isReadOnly?: boolean; 
}

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

const getRelativeTimeText = (item: AgendaItem) => {
  if (item.leadTimeUnit === 'same_day') return 'Am gleichen Tag';
  if (item.leadTimeUnit === 'days_before') return `${item.leadTimeValue} Tage vorher`;
  if (item.leadTimeUnit === 'days_after') return `${item.leadTimeValue} Tage nachher`;
  return 'Abweichend';
};

export const ItemCard: React.FC<ItemCardProps> = ({ item, onEdit, onDelete, className = '', isReadOnly = false }) => {
  const { users, groups, events, allAgendaItems } = useClubStore();
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  const getAssigneesText = () => {
    const uNames = (item.assigneeUserIds || []).map(id => users.find(u => u.id === id)?.name).filter((n): n is string => Boolean(n));
    const gNames = (item.assigneeGroupIds || []).map(id => groups.find(g => g.id === id)?.name).filter((n): n is string => Boolean(n));
    const all = [...uNames, ...gNames].sort((a, b) => a.localeCompare(b));
    return all.length > 0 ? all.join(', ') : 'Nicht zugewiesen';
  };

  const isTask = item.type === 'AUFGABE';
  const totalChecks = item.checkliste ? item.checkliste.length : 0;
  const doneChecks = item.checkliste ? item.checkliste.filter(c => c.isDone).length : 0;
  const progressValue = item.progress !== undefined ? item.progress : (totalChecks > 0 ? Math.round((doneChecks / totalChecks) * 100) : 0);
  
  const isCompleted = item.status === 'ERLEDIGT' || progressValue === 100; // CHIRURGISCHER EINGRIFF

  const formatSafeDate = (timestamp?: number) => {
    if (!timestamp) return '';
    const d = new Date(timestamp);
    return isNaN(d.getTime()) ? '' : d.toLocaleDateString();
  };

  const dueDateStr = formatSafeDate(item.dueDate);
  const dateColor = getDueDateColor(item);

  const bloodlineId = item.baseItemId || item.id;
  const historyCount = allAgendaItems.filter(t => {
    const tBloodlineId = t.baseItemId || t.id;
    return tBloodlineId === bloodlineId && (t.status === 'ERLEDIGT' || t.progress === 100);
  }).length;
  const hasHistory = historyCount > 0;

  const parentEvent = item.eventId ? events.find(e => e.id === item.eventId) : null;
  const projectColor = parentEvent ? (parentEvent as any).color : undefined;
  const parentDateStr = parentEvent?.plannedStartTime ? new Date(parentEvent.plannedStartTime).toLocaleDateString() : '';

  const parentContainerItem = item.isSubItem && item.parentItemId
    ? allAgendaItems.find(i => i.id === item.parentItemId)
    : null;

  return (
    <>
      <div 
        onClick={() => onEdit && onEdit(item)}
        className={`bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-3 transition-shadow flex flex-col ${onEdit ? 'cursor-pointer hover:border-blue-300 hover:shadow-md' : ''} ${className}`}
      >
        {parentContainerItem && (
          <div className="text-[11px] text-gray-400 font-medium mb-1.5 flex items-center truncate">
            <span className="mr-1">↳</span> {parentContainerItem.title}
          </div>
        )}

        <div className="flex justify-between items-start mb-2">
          <div className="flex-1 min-w-0 pr-2">
            <h4 className="font-semibold text-gray-800 flex items-center gap-2 flex-wrap">
              {isTask ? <CheckSquare className={`w-4 h-4 shrink-0 ${progressValue === 100 ? 'text-green-600' : 'text-blue-600'}`} /> : <FileText className="w-4 h-4 shrink-0 text-blue-600" />}
              <span className="truncate flex-1 min-w-[120px]">{item.title}</span>
              
              {hasHistory && (
                <button 
                  onClick={(e) => { e.stopPropagation(); setIsHistoryModalOpen(true); }} 
                  className="p-1 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100 transition-colors z-10 shrink-0"
                  title={`Historie dieser Aufgabe anzeigen (${historyCount}x erledigt)`}
                >
                  <Clock className="w-3.5 h-3.5" />
                </button>
              )}

              {item.isSubItem && item.leadTimeUnit && (
                <span className="flex items-center text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium shrink-0">
                  <Clock className="w-3 h-3 mr-1" />
                  Regel: {getRelativeTimeText(item)}
                </span>
              )}
            </h4>

            {parentEvent && (
              <div 
                className="flex items-center text-[10px] font-bold px-2 py-0.5 rounded ml-6 mt-1 w-max border transition-colors"
                style={{ 
                  backgroundColor: projectColor ? `${projectColor}15` : '#eef2ff',
                  color: projectColor || '#4338ca',
                  borderColor: projectColor ? `${projectColor}30` : '#e0e7ff'
                }}
              >
                <Calendar className="w-3 h-3 mr-1" />
                {parentEvent.title} {parentDateStr ? `(${parentDateStr})` : ''}
              </div>
            )}
          </div>
          
          {(onEdit || (!isReadOnly && onDelete)) && (
            <div className="flex items-center shrink-0">
              {onEdit && (
                <button 
                  onClick={(e) => { e.stopPropagation(); onEdit(item); }} 
                  className="text-blue-500 hover:text-blue-700 p-1 mr-1 z-10"
                  title={isReadOnly ? "Details ansehen" : "Bearbeiten"}
                >
                  {isReadOnly ? <Eye className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
                </button>
              )}
              {!isReadOnly && onDelete && (
                <button 
                  onClick={(e) => { e.stopPropagation(); onDelete(item.id, item.title); }} 
                  className="text-red-400 hover:text-red-600 p-1 z-10"
                  title="Löschen"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>

        {item.description && (
          <div className="mb-3 text-gray-600 border-l-2 border-gray-200 pl-2 mt-1">
            <RichTextRenderer text={item.description} className="text-xs" />
          </div>
        )}

        <div className="flex items-center text-xs text-gray-500 mb-3 mt-auto">
          <User className="w-3 h-3 mr-1 shrink-0" />
          <span className="truncate flex-1">{getAssigneesText()}</span>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-y-2 text-xs">
          {isTask ? (
            <>
              {/* CHIRURGISCHER EINGRIFF: Anzeige Erledigungsdatum vs. Frist */}
              <div className={`flex items-center ${dateColor}`}>
                {isCompleted && item.completedAt ? (
                  <>
                    <CheckCircle2 className="w-3 h-3 mr-1 shrink-0 text-green-600" />
                    <span className="text-green-600 font-bold" title={`Ursprüngliche Frist: ${dueDateStr || 'Keine'}`}>
                      Erledigt am: {new Date(item.completedAt).toLocaleDateString()}
                    </span>
                  </>
                ) : (
                  <>
                    <Calendar className="w-3 h-3 mr-1 shrink-0" />
                    {item.isDueNextMeeting ? (
                      <span>Nächste Sitzung</span>
                    ) : item.dueDate ? (
                      <span>{dueDateStr}</span>
                    ) : (
                      <span>Kein Datum</span>
                    )}
                  </>
                )}
              </div>
              
              <div className={`flex items-center font-medium shrink-0 ${progressValue === 100 ? 'text-green-600' : 'text-blue-600'}`}>
                <CheckSquare className="w-3 h-3 mr-1" />{progressValue}%
              </div>
            </>
          ) : (
            <div className="flex items-center text-gray-500">
              <Clock className="w-3 h-3 mr-1 shrink-0" />Dauer: {item.durationEstimate || 0} Min.
            </div>
          )}
        </div>
        
        {isTask && (
          <div className="w-full bg-gray-100 rounded-full h-1.5 mt-2 overflow-hidden shrink-0">
            <div className={`h-1.5 rounded-full transition-all duration-300 ${progressValue === 100 ? 'bg-green-500' : 'bg-blue-500'}`} style={{ width: `${progressValue}%` }}></div>
          </div>
        )}
      </div>

      {isHistoryModalOpen && (
        <TaskHistoryModal task={item as any} onClose={() => setIsHistoryModalOpen(false)} />
      )}
    </>
  );
};
// --- END OF FILE ---