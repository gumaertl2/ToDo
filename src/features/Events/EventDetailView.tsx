// src/features/Events/EventDetailView.tsx
import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Users, X } from 'lucide-react';
import { useClubStore } from '../../store/useClubStore';
import { doc, collection } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { ItemFormModal } from '../Shared/ItemFormModal';
import { EventFormModal } from './EventFormModal';
import { TaskHistoryModal } from '../Tasks/TaskHistoryModal';
import { EventDetailHeader } from './EventDetailHeader';
import { EventAgendaList } from './EventAgendaList';
import { EventTemplateSidebar } from './EventTemplateSidebar';
import type { AgendaItem, Event, Task } from '../../core/types/models';

export const EventDetailView: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { events, currentEvent, eventAgenda, users, groups, fetchEventDetails, fetchEventAgenda, fetchTemplatesAndRoutines, fetchTasks, saveAgendaItem, updateEvent, addEvent } = useClubStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditEventModalOpen, setIsEditEventModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AgendaItem | null>(null);
  const [historyTask, setHistoryTask] = useState<Task | null>(null);
  const [isLibraryVisible, setIsLibraryVisible] = useState(false); 
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
  const [attendanceList, setAttendanceList] = useState<string[]>([]);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // CHIRURGISCHER EINGRIFF: Die Simulations-Engine sitzt jetzt zentral
  const [tempDurations, setTempDurations] = useState<Record<string, number>>({});

  useEffect(() => {
    if (eventId) { fetchEventDetails(eventId); fetchEventAgenda(eventId); fetchTemplatesAndRoutines(); fetchTasks(); }
  }, [eventId, fetchEventDetails, fetchEventAgenda, fetchTemplatesAndRoutines, fetchTasks]);

  const invitedUserIds = useMemo(() => {
    if (!currentEvent) return [];
    const ids = new Set<string>(currentEvent.participantUserIds || []);
    const eventGroupIds = currentEvent.participantGroupIds || [];
    users.forEach(u => { if (u.groupIds && u.groupIds.some(gId => eventGroupIds.includes(gId))) ids.add(u.id); });
    return Array.from(ids);
  }, [currentEvent, users]);

  const rolloverTemplateEvent: Partial<Event> | undefined = useMemo(() => {
    if (!isEventModalOpen || !currentEvent || currentEvent.status !== 'AKTIV') return undefined;

    const targetSeriesId = currentEvent.seriesId || currentEvent.id;
    const now = new Date();
    const oldStart = currentEvent.plannedStartTime ? new Date(currentEvent.plannedStartTime) : now;
    
    const newStart = new Date(now.getTime());
    newStart.setHours(oldStart.getHours(), oldStart.getMinutes(), 0, 0);

    let newEnd: number | undefined = undefined;
    if (currentEvent.plannedEndTime) {
       const oldEnd = new Date(currentEvent.plannedEndTime);
       const nE = new Date(now.getTime());
       nE.setHours(oldEnd.getHours(), oldEnd.getMinutes(), 0, 0);
       newEnd = nE.getTime();
    }

    return {
      title: currentEvent.title,
      description: currentEvent.description,
      location: currentEvent.location,
      participantGroupIds: currentEvent.participantGroupIds,
      participantUserIds: currentEvent.participantUserIds,
      status: 'PLANUNG',
      seriesId: targetSeriesId,
      plannedStartTime: newStart.getTime(),
      plannedEndTime: newEnd,
    };
  }, [isEventModalOpen, currentEvent]);

  if (!currentEvent) return <div className="p-8 text-center text-gray-500 animate-pulse">Lade Sitzung...</div>;

  const isReadOnly = currentEvent.status === 'ABGESCHLOSSEN';
  const targetSeriesId = currentEvent.seriesId || currentEvent.id;
  const pastEvents = events
    .filter(e => e.status === 'ABGESCHLOSSEN' && (e.seriesId || e.id) === targetSeriesId)
    .sort((a,b) => (b.plannedStartTime || 0) - (a.plannedStartTime || 0));

  const getAssigneesText = (item: AgendaItem) => {
    const uNames = (item.assigneeUserIds || []).map(id => users.find(u => u.id === id)?.name).filter(Boolean);
    const gNames = (item.assigneeGroupIds || []).map(id => groups.find(g => g.id === id)?.name).filter(Boolean);
    const all = [...uNames, ...gNames];
    if (all.length > 0) return all.join(', ');
    if (item.type === 'INFO') return 'Allgemeine Info';
    return 'Nicht zugewiesen';
  };

  const handlePrint = () => {
    if (!currentEvent) return;

    let html = `
      <html>
        <head>
          <title>Protokoll: ${currentEvent.title}</title>
          <style>
            body { font-family: sans-serif; padding: 20px; color: #111; font-size: 13px; line-height: 1.4; }
            h1 { font-size: 22px; margin-bottom: 5px; border-bottom: 2px solid #111; padding-bottom: 10px; }
            .meta { font-size: 13px; color: #444; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th, td { border: 1px solid #ccc; padding: 10px 8px; text-align: left; vertical-align: top; }
            th { background-color: #f0f0f0; font-weight: bold; font-size: 12px; text-transform: uppercase; }
            .nr { width: 30px; font-weight: bold; text-align: center; }
            .zeit { width: 50px; white-space: nowrap; font-weight: bold; }
            .thema { width: 50%; }
            .wer { width: 20%; font-size: 12px; }
            .faellig { width: 20%; font-size: 12px; }
            .title { font-weight: bold; font-size: 14px; margin-bottom: 4px; display: block; color: #000; }
            .desc { font-size: 12px; color: #333; margin-top: 4px; white-space: pre-wrap; }
            @media print { button { display: none; } }
          </style>
        </head>
        <body>
          <h1>${currentEvent.title}</h1>
          <div class="meta">
            <strong>Datum:</strong> ${currentEvent.plannedStartTime ? new Date(currentEvent.plannedStartTime).toLocaleDateString() : 'Unbekannt'} | 
            <strong>Zeit:</strong> ${currentEvent.plannedStartTime ? new Date(currentEvent.plannedStartTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''} ${currentEvent.plannedEndTime ? ' - ' + new Date(currentEvent.plannedEndTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''} Uhr | 
            <strong>Ort:</strong> ${currentEvent.location || 'Kein Ort hinterlegt'}<br/>
            <strong>Status:</strong> ${currentEvent.status === 'ABGESCHLOSSEN' ? 'Versiegeltes Protokoll' : (currentEvent.status === 'AKTIV' ? 'Laufende Sitzung' : 'In Planung')}
          </div>
          
          <table>
            <thead>
              <tr>
                <th class="nr">Nr.</th>
                <th class="zeit">Zeit</th>
                <th class="thema">Thema / Beschreibung</th>
                <th class="wer">Wer</th>
                <th class="faellig">Fällig</th>
              </tr>
            </thead>
            <tbody>
    `;

    let runningTime = currentEvent.plannedStartTime || new Date().setHours(19, 0, 0, 0);

    if (eventAgenda.length === 0) {
      html += `<tr><td colspan="5" style="text-align:center; padding: 20px;">Keine Agendapunkte vorhanden.</td></tr>`;
    } else {
      eventAgenda.forEach((item, index) => {
        const timeStr = new Date(runningTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        runningTime += (item.durationEstimate || 0) * 60000;

        let statusStr = '-';
        if (item.type === 'AUFGABE') {
          if (item.isDueNextMeeting) statusStr = `Nächste Sitzung`;
          else if (item.dueDate) statusStr = `${new Date(item.dueDate).toLocaleDateString()}`;
        }

        html += `
          <tr>
            <td class="nr">${index + 1}.</td>
            <td class="zeit">${timeStr}</td>
            <td class="thema">
              <span class="title">${item.title}</span>
              ${item.description ? `<div class="desc">${item.description.replace(/\n/g, '<br/>')}</div>` : ''}
            </td>
            <td class="wer">${getAssigneesText(item)}</td>
            <td class="faellig">${statusStr}</td>
          </tr>
        `;
      });
    }

    html += `
            </tbody>
          </table>
          <script>window.onload = function() { window.print(); window.close(); }</script>
        </body>
      </html>
    `;

    const printWin = window.open('', '_blank');
    if (printWin) {
      printWin.document.open();
      printWin.document.write(html);
      printWin.document.close();
    } else {
      alert("Bitte erlaube Popups für diese Seite, um drucken zu können.");
    }
  };

  const validateBeforeClose = () => {
    const incompleteTasks = eventAgenda.filter(item => {
      if (item.type !== 'AUFGABE' || item.status === 'ERLEDIGT') return false;
      const hasAssignee = (item.assigneeUserIds && item.assigneeUserIds.length > 0) || (item.assigneeGroupIds && item.assigneeGroupIds.length > 0);
      return !hasAssignee;
    });
    if (incompleteTasks.length > 0) {
      alert(`Halt! Das Protokoll kann noch nicht geschlossen werden.\n\nFolgenden Aufgaben fehlt ein Verantwortlicher:\n${incompleteTasks.map(t => `- ${t.title}`).join('\n')}\n\nBitte weise diese Aufgaben jemandem zu!`);
      return false;
    }
    return true;
  };

  const handleSaveAttendance = async () => {
    await updateEvent({ ...currentEvent, actualAttendeeUserIds: attendanceList });
    setIsAttendanceModalOpen(false);
  };

  const formatTime = (ms: number) => new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const timeString = currentEvent.plannedStartTime ? `${formatTime(currentEvent.plannedStartTime)}${currentEvent.plannedEndTime ? ` - ${formatTime(currentEvent.plannedEndTime)}` : ''}` : '';

  const toggleAllExpanded = () => {
    const itemsWithDesc = eventAgenda.filter(i => !!i.description);
    if (expandedIds.size === itemsWithDesc.length && itemsWithDesc.length > 0) setExpandedIds(new Set());
    else setExpandedIds(new Set(itemsWithDesc.map(i => i.id)));
  };

  const toggleItemExpanded = (id: string) => {
    const next = new Set(expandedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setExpandedIds(next);
  };

  const handleDurationPreview = (id: string, val: number) => {
    setTempDurations(prev => ({ ...prev, [id]: val }));
  };

  const handleClearPreview = (id: string) => {
    setTempDurations(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  return (
    <div className="h-full flex flex-col print:!bg-white print:!h-auto print:!block print:!w-full print:!m-0 print:!p-0">
      <EventDetailHeader
        eventId={eventId || ''}
        currentEvent={currentEvent}
        isReadOnly={isReadOnly}
        invitedUserIds={invitedUserIds}
        timeString={timeString}
        pastEvents={pastEvents}
        isLibraryVisible={isLibraryVisible}
        onToggleLibrary={() => setIsLibraryVisible(!isLibraryVisible)}
        onEditEvent={() => setIsEditEventModalOpen(true)}
        onCheckAttendance={() => setIsAttendanceModalOpen(true)}
        onPrint={handlePrint}
      />

      <div className="flex-1 flex flex-col md:flex-row gap-6 overflow-hidden print:!overflow-visible print:!block print:!w-full print:!m-0">
        <EventAgendaList
          eventId={eventId || ''}
          currentEvent={currentEvent}
          eventAgenda={eventAgenda}
          isReadOnly={isReadOnly}
          expandedIds={expandedIds}
          tempDurations={tempDurations}
          onToggleAllExpanded={toggleAllExpanded}
          onToggleItemExpanded={toggleItemExpanded}
          onAddNewItem={() => { setEditingItem(null); setIsModalOpen(true); }}
          onEditItem={i => { setEditingItem(i); setIsModalOpen(true); }}
          onOpenHistory={i => setHistoryTask(i)}
          onPlanNextMeeting={() => { if (validateBeforeClose()) setIsEventModalOpen(true); }}
          onFinishEvent={async () => { if (validateBeforeClose() && window.confirm('Projekt abschließen?')) await updateEvent({ ...currentEvent, status: 'ABGESCHLOSSEN', actualEndTime: Date.now() }); }}
          onDurationPreview={handleDurationPreview}
          onClearPreview={handleClearPreview}
        />

        {!isReadOnly && isLibraryVisible && (
          <EventTemplateSidebar eventId={eventId || ''} />
        )}
      </div>

      {/* CHIRURGISCHER EINGRIFF: Modal an Simulations-Engine angeschlossen */}
      <ItemFormModal 
        key={editingItem ? editingItem.id : 'new'} 
        isOpen={isModalOpen} 
        existingItem={editingItem || { eventId: eventId, type: 'AGENDA' }} 
        onClose={() => {
          if (editingItem?.id) handleClearPreview(editingItem.id);
          setIsModalOpen(false);
        }} 
        onDurationPreview={(val) => {
          if (editingItem?.id) handleDurationPreview(editingItem.id, val);
        }}
        onSave={async (data) => { 
          await saveAgendaItem({ ...data, eventId, ...( !editingItem ? { createdAt: Date.now() } : {}) }); 
          if (editingItem?.id) handleClearPreview(editingItem.id);
          if (eventId) fetchEventAgenda(eventId); 
          setIsModalOpen(false); 
        }} 
      />

      {historyTask && (
        <TaskHistoryModal task={historyTask} onClose={() => setHistoryTask(null)} />
      )}

      {isEditEventModalOpen && (
        <EventFormModal 
          isOpen={true} 
          existingEvent={currentEvent}
          onClose={() => setIsEditEventModalOpen(false)} 
          onSave={async (data) => {
            const result = await updateEvent(data);
            if (!result?.success) throw new Error(result?.error?.message);
            setIsEditEventModalOpen(false);
            if (eventId) fetchEventDetails(eventId);
          }} 
        />
      )}

      {isEventModalOpen && (
        <EventFormModal 
          isOpen={true} 
          existingEvent={rolloverTemplateEvent as Event}
          onClose={() => setIsEventModalOpen(false)} 
          onSave={async (data) => {
            const result = await addEvent(data);
            if (!result?.success) throw new Error(result?.error?.message);
            
            if (currentEvent.status === 'AKTIV') {
              await updateEvent({ ...currentEvent, status: 'ABGESCHLOSSEN', actualEndTime: Date.now() });
              
              const itemsToCopy = eventAgenda.filter(item => {
                const isUnfinishedTask = item.type === 'AUFGABE' && item.status !== 'ERLEDIGT' && item.progress !== 100;
                const isRoutineItem = item.isRoutine === true || String(item.isRoutine) === 'true'; 
                
                if (isRoutineItem && item.routineEndDate && Date.now() > item.routineEndDate) {
                  return false;
                }
                
                return isUnfinishedTask || isRoutineItem;
              });

              let delay = 0;
              for (const item of itemsToCopy) {
                const { id, ...rest } = item; 
                const newId = doc(collection(db, 'agenda_items')).id;
                
                let newDueDate = item.dueDate;
                const isRoutine = item.isRoutine === true || String(item.isRoutine) === 'true';

                if (item.type === 'AUFGABE') {
                   if (item.mustBeDoneBeforeEvent && item.leadTimeValue && data.plannedStartTime) {
                      const leadMs = item.leadTimeUnit === 'days' ? item.leadTimeValue * 24 * 60 * 60 * 1000 : item.leadTimeValue * 60 * 60 * 1000;
                      newDueDate = data.plannedStartTime - leadMs;
                   }
                   else if (item.isDueNextMeeting || (!item.dueDate && !isRoutine)) {
                      newDueDate = data.plannedStartTime;
                   }
                   else if (isRoutine && item.routinePattern && item.routinePattern !== 'every_meeting' && item.dueDate) {
                      const nextDate = new Date(item.dueDate);
                      if (item.routinePattern === 'weekly') nextDate.setDate(nextDate.getDate() + 7);
                      else if (item.routinePattern === 'monthly') nextDate.setMonth(nextDate.getMonth() + 1);
                      else if (item.routinePattern === 'quarterly') nextDate.setMonth(nextDate.getMonth() + 3);
                      else if (item.routinePattern === 'yearly') nextDate.setFullYear(nextDate.getFullYear() + 1);
                      newDueDate = nextDate.getTime();
                   }
                }

                const safePayload = { 
                  ...rest,
                  id: newId,
                  eventId: data.id, 
                  baseItemId: item.baseItemId || item.id,
                  status: isRoutine && item.type !== 'AUFGABE' ? 'OFFEN' : (isRoutine ? 'OFFEN' : item.status), 
                  progress: isRoutine ? 0 : item.progress, 
                  approvedBy: isRoutine ? [] : item.approvedBy,
                  createdAt: Date.now() + delay, 
                  isDueNextMeeting: false, 
                  dueDate: newDueDate 
                };

                Object.keys(safePayload).forEach(key => {
                  if ((safePayload as any)[key] === undefined) {
                    delete (safePayload as any)[key];
                  }
                });

                await saveAgendaItem(safePayload);
                delay += 100;
              }
            }
            
            setIsEventModalOpen(false);
            if (window.confirm('Protokoll geschlossen und neues Event generiert! Zur neuen Agenda wechseln?')) navigate(`/events/${data.id}`); else if (eventId) fetchEventAgenda(eventId);
          }} 
        />
      )}
        
      {isAttendanceModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 print:!hidden print:!absolute print:!w-0 print:!h-0 print:!overflow-hidden print:!m-0 print:!p-0 print:!border-0">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
              <h2 className="text-lg font-bold text-gray-900 flex items-center"><Users className="w-5 h-5 mr-2 text-blue-600" />Anwesenheitsliste</h2>
              <button onClick={() => setIsAttendanceModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              <p className="text-sm text-gray-500 mb-4">Hake hier ab, wer von den geladenen Personen heute tatsächlich anwesend ist.</p>
              <div className="space-y-2">
                {users.filter(u => invitedUserIds.includes(u.id)).map(u => (
                  <label key={u.id} className="flex items-center justify-between p-3 bg-white rounded border border-gray-200 cursor-pointer hover:bg-blue-50 transition-colors">
                    <span className="font-medium text-gray-800">{u.name} <span className="text-xs text-gray-500 font-normal ml-1">({u.amt})</span></span>
                    <input type="checkbox" className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500" checked={attendanceList.includes(u.id)} onChange={(e) => { if (e.target.checked) setAttendanceList([...attendanceList, u.id]); else setAttendanceList(attendanceList.filter(id => id !== u.id)); }} />
                  </label>
                ))}
                {users.filter(u => invitedUserIds.includes(u.id)).length === 0 && <p className="text-sm text-gray-400 text-center py-4">Keine Personen direkt oder über Ämter eingeladen.</p>}
              </div>
            </div>
            <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-2">
              <button onClick={() => setIsAttendanceModalOpen(false)} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium">Abbrechen</button>
              <button onClick={handleSaveAttendance} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold shadow-sm">Speichern</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
// Exakte Zeilenzahl: 413