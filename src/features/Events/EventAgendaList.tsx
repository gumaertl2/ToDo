// src/features/Events/EventAgendaList.tsx
import React from 'react';
import { useClubStore } from '../../store/useClubStore';
import { Plus, Calendar } from 'lucide-react';
import { AgendaItemRow } from '../Shared/AgendaItemRow';
import type { Event, AgendaItem, Task } from '../../core/types/models';

interface EventAgendaListProps {
  eventId: string;
  currentEvent: Event;
  eventAgenda: AgendaItem[];
  isReadOnly: boolean;
  expandedIds: Set<string>;
  tempDurations: Record<string, number>;
  onToggleAllExpanded: () => void;
  onToggleItemExpanded: (id: string) => void;
  onAddNewItem: () => void;
  onEditItem: (item: AgendaItem) => void;
  onOpenHistory: (item: Task) => void;
  onPlanNextMeeting: () => void;
  onFinishEvent: () => void;
  onDurationPreview: (id: string, val: number) => void;
  onClearPreview: (id: string) => void;
}

export const EventAgendaList: React.FC<EventAgendaListProps> = ({
  eventId, currentEvent, eventAgenda, isReadOnly, expandedIds, tempDurations,
  onToggleAllExpanded, onToggleItemExpanded, onAddNewItem, onEditItem, onOpenHistory,
  onPlanNextMeeting, onFinishEvent, onDurationPreview, onClearPreview
}) => {
  const { moveAgendaItem, deleteAgendaItem, saveAgendaItem, fetchEventAgenda } = useClubStore();

  let currentRunningTime = currentEvent.plannedStartTime || new Date().setHours(19, 0, 0, 0);

  return (
    <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden print:!shadow-none print:!border-none print:!rounded-none print:!overflow-visible print:!block">
      <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center print:!bg-transparent print:!border-b-2 print:!border-black print:!px-0 print:!pt-0">
        <h2 className="text-lg font-bold text-gray-800 print:!text-black">Agenda & Protokoll</h2>
        <div className="flex items-center gap-2 print:!hidden print:!absolute print:!w-0 print:!h-0">
          <button onClick={onToggleAllExpanded} className="flex items-center justify-center w-8 h-8 bg-gray-200 text-gray-700 font-mono font-bold text-lg rounded hover:bg-gray-300 transition-colors" title="Alle Details ein-/ausblenden">+/-</button>
          {!isReadOnly && <button onClick={onAddNewItem} className="flex items-center px-3 py-1.5 bg-blue-100 text-blue-700 font-medium rounded hover:bg-blue-200 text-sm"><Plus className="w-4 h-4 mr-1" />Freier Punkt</button>}
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto bg-gray-50/10 p-4 print:!overflow-visible print:!p-0 print:!pt-4 print:!bg-white">
        {eventAgenda.length === 0 ? (
          <div className="text-center text-gray-400 py-10"><p>Die Agenda ist noch leer.</p></div>
        ) : (
          <>
            <div className="border border-gray-200 rounded-lg overflow-x-auto bg-white shadow-sm print:!border-none print:!shadow-none print:!overflow-visible print:!block">
              {eventAgenda.map((item, index) => {
                const effectiveDuration = tempDurations[item.id] !== undefined ? tempDurations[item.id] : (item.durationEstimate || 0);
                const startTimeStr = new Date(currentRunningTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const isOvertime = currentEvent.plannedEndTime ? currentRunningTime > currentEvent.plannedEndTime : false;
                
                currentRunningTime += effectiveDuration * 60000; 

                return (
                  <AgendaItemRow
                    key={item.id} item={item} index={index} totalItems={eventAgenda.length} startTimeStr={startTimeStr}
                    isExpanded={expandedIds.has(item.id)} onToggleExpand={onToggleItemExpanded}
                    onMove={moveAgendaItem} onEdit={onEditItem}
                    onOpenHistory={onOpenHistory as any}
                    
                    // CHIRURGISCHER EINGRIFF: Intelligente Lösch-Sperre im Protokoll
                    onDelete={(id, title) => {
                      if (item.type === 'AUFGABE') {
                        const isClone = !!item.baseItemId;
                        const isAssigned = (item.assigneeUserIds && item.assigneeUserIds.length > 0) || (item.assigneeGroupIds && item.assigneeGroupIds.length > 0);
                        
                        if (isClone) {
                          window.alert(`Die vererbte Aufgabe "${title}" kann nicht gelöscht werden.\n\nBitte setze den Fortschritt auf 100% (Erledigt), wenn sie beendet ist.`);
                          return;
                        }
                        if (isAssigned) {
                          window.alert(`Die zugewiesene Aufgabe "${title}" kann nicht mehr gelöscht werden.\n\nBitte setze den Fortschritt auf 100% (Erledigt), wenn sie beendet ist.`);
                          return;
                        }
                      }
                      
                      if (window.confirm(`"${title}" wirklich löschen?`)) {
                        deleteAgendaItem(id);
                      }
                    }}
                    
                    effectiveDuration={effectiveDuration}
                    onDurationPreview={(val) => onDurationPreview(item.id, val)}
                    onSaveInline={async (updatedItem) => {
                      await saveAgendaItem(updatedItem);
                      onClearPreview(item.id);
                      if (eventId) fetchEventAgenda(eventId);
                    }}
                    isReadOnly={isReadOnly}
                    isOvertime={isOvertime}
                  />
                );
              })}
            </div>

            {!isReadOnly && currentEvent.status === 'AKTIV' && (
              <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-5 flex flex-col sm:flex-row items-center justify-between shadow-sm print:!hidden print:!absolute print:!w-0 print:!h-0 print:!overflow-hidden print:!m-0 print:!p-0 print:!border-0">
                <div>
                  <h3 className="text-lg font-bold text-blue-900 flex items-center"><Calendar className="w-5 h-5 mr-2 text-blue-700" />Sitzung abschließen & Nächste Sitzung planen</h3>
                  <p className="text-sm text-blue-700 mt-1">Protokoll wird versiegelt, offene Aufgaben & Routinen werden ins neue Meeting übernommen.</p>
                </div>
                <div className="flex flex-col items-center sm:items-end mt-4 sm:mt-0">
                  <button onClick={onPlanNextMeeting} className="px-5 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-sm whitespace-nowrap">Nächste Sitzung planen</button>
                  <button onClick={onFinishEvent} className="text-xs text-blue-600 hover:underline mt-3">Projekt abschließen (Kein Folgetermin)</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
// Exakte Zeilenzahl: 104