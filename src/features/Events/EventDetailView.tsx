// src/features/Events/EventDetailView.tsx
import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useClubStore } from '../../store/useClubStore';
import { ArrowLeft, Plus, Calendar, MapPin, Clock, ChevronRight, ChevronLeft, User, ChevronUp, ChevronDown, Users, X, Printer } from 'lucide-react';
import { doc, collection } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { ItemFormModal } from '../Shared/ItemFormModal';
import { EventFormModal } from './EventFormModal';
import { AgendaItemRow } from '../Shared/AgendaItemRow';
import { ItemCard } from '../Shared/ItemCard';
import type { AgendaItem, Event } from '../../core/types/models';

export const EventDetailView: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { events, currentEvent, eventAgenda, templates, users, groups, tasks, fetchEventDetails, fetchEventAgenda, fetchTemplatesAndRoutines, fetchTasks, importTemplateToEvent, moveAgendaItem, deleteAgendaItem, saveAgendaItem, updateEvent, addEvent } = useClubStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AgendaItem | null>(null);
  const [isLibraryVisible, setIsLibraryVisible] = useState(false); // CHIRURGISCHER EINGRIFF: Focus-Mode als Standard!
  const [showCompleted, setShowCompleted] = useState(false);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
  const [attendanceList, setAttendanceList] = useState<string[]>([]);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

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

  if (!currentEvent) return <div className="p-8 text-center text-gray-500 animate-pulse">Lade Sitzung...</div>;

  const isReadOnly = currentEvent.status === 'ABGESCHLOSSEN';

  const targetSeriesId = currentEvent.seriesId || currentEvent.id;
  const pastEvents = events
    .filter(e => e.status === 'ABGESCHLOSSEN' && (e.seriesId || e.id) === targetSeriesId)
    .sort((a,b) => (b.plannedStartTime || 0) - (a.plannedStartTime || 0));

  const pastOpenTasks = tasks.filter(t => t.type === 'AUFGABE' && t.eventId && t.eventId !== eventId && t.status !== 'ERLEDIGT');
  const pastCompletedTasks = tasks.filter(t => t.type === 'AUFGABE' && t.eventId && t.eventId !== eventId && t.status === 'ERLEDIGT');

  const getAssigneesText = (item: AgendaItem) => {
    const uNames = (item.assigneeUserIds || []).map(id => users.find(u => u.id === id)?.name).filter(Boolean);
    const gNames = (item.assigneeGroupIds || []).map(id => groups.find(g => g.id === id)?.name).filter(Boolean);
    const all = [...uNames, ...gNames];
    if (all.length > 0) return all.join(', ');
    if (item.type === 'INFO') return 'Allgemeine Info';
    return 'Nicht zugewiesen';
  };

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

  const handlePrint = () => {
    window.print();
  };

  const validateBeforeClose = () => {
    const incompleteTasks = eventAgenda.filter(item => {
      if (item.type !== 'AUFGABE' || item.status === 'ERLEDIGT') return false;
      const hasAssignee = (item.assigneeUserIds && item.assigneeUserIds.length > 0) || (item.assigneeGroupIds && item.assigneeGroupIds.length > 0);
      return !hasAssignee || (!item.dueDate && !item.isDueNextMeeting);
    });
    if (incompleteTasks.length > 0) {
      alert(`Halt! Das Protokoll kann noch nicht geschlossen werden.\n\nFolgenden Aufgaben fehlt ein Verantwortlicher oder ein Fälligkeitsdatum:\n${incompleteTasks.map(t => `- ${t.title}`).join('\n')}\n\nBitte trage diese Infos nach!`);
      return false;
    }
    return true;
  };

  const handleSaveAttendance = async () => {
    await updateEvent({ ...currentEvent, actualAttendeeUserIds: attendanceList });
    setIsAttendanceModalOpen(false);
  };

  let currentRunningTime = currentEvent.plannedStartTime || new Date().setHours(19, 0, 0, 0);

  const rolloverTemplateEvent: Partial<Event> | undefined = isEventModalOpen && currentEvent.status === 'AKTIV' ? {
    title: currentEvent.title,
    description: currentEvent.description,
    location: currentEvent.location,
    participantGroupIds: currentEvent.participantGroupIds,
    participantUserIds: currentEvent.participantUserIds,
    status: 'PLANUNG',
    seriesId: targetSeriesId,
    plannedStartTime: currentEvent.plannedStartTime,
    plannedEndTime: currentEvent.plannedEndTime,
  } : undefined;

  return (
    <div className="h-full flex flex-col print:!bg-white print:!h-auto print:!block print:!w-full print:!m-0 print:!p-0">
      <div className="flex items-center justify-between mb-6 print:!mb-4">
        <div className="flex items-center">
          <button onClick={() => navigate('/events')} className="mr-4 text-gray-400 hover:text-blue-600 transition-colors print:!hidden print:!absolute print:!w-0 print:!h-0"><ArrowLeft className="w-6 h-6" /></button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900 print:!text-black">
                {currentEvent.title}
                {currentEvent.status === 'PLANUNG' && !currentEvent.isPublished && <span className="ml-3 text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded uppercase print:!border print:!border-gray-400 print:!bg-transparent print:!text-gray-800">Entwurf</span>}
                {currentEvent.status === 'PLANUNG' && currentEvent.isPublished && <span className="ml-3 text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded uppercase border border-purple-200 print:!border-gray-400 print:!text-gray-800 print:!bg-transparent">Agenda Veröffentlicht</span>}
                {isReadOnly && <span className="ml-3 text-xs bg-gray-600 text-white px-2 py-1 rounded uppercase print:!border print:!border-gray-400 print:!text-gray-800 print:!bg-transparent">Versiegelt</span>}
              </h1>
              
              <div className="relative group ml-2 print:!hidden print:!absolute print:!w-0 print:!h-0">
                <button className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors" title="Historie dieses Projekts / dieser Reihe">
                  <Clock className="w-5 h-5" />
                </button>
                <div className="absolute left-0 top-full mt-1 w-64 bg-white border border-gray-200 shadow-xl rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 overflow-hidden">
                   <div className="p-2 bg-gray-50 border-b border-gray-200 font-bold text-xs text-gray-500 uppercase tracking-wider">Projekt-Historie</div>
                   <div className="max-h-60 overflow-y-auto">
                     {pastEvents.length === 0 && <div className="p-4 text-xs text-gray-400 text-center">Keine früheren Sitzungen für dieses Projekt.</div>}
                     {pastEvents.map(e => (
                        <button key={e.id} onClick={() => navigate(`/events/${e.id}`)} className={`w-full text-left px-4 py-2 text-sm hover:bg-blue-50 border-b border-gray-100 last:border-0 ${e.id === eventId ? 'bg-blue-50 text-blue-700 font-bold' : 'text-gray-700'}`}>
                          {e.title} <br/><span className="text-xs text-gray-500">{new Date(e.plannedStartTime||0).toLocaleDateString()}</span>
                        </button>
                     ))}
                   </div>
                </div>
              </div>
            </div>

            <div className="flex items-center text-sm text-gray-500 mt-1 gap-4 flex-wrap print:!text-black">
              {currentEvent.plannedStartTime && <span className="flex items-center"><Calendar className="w-4 h-4 mr-1 print:!hidden" /> {new Date(currentEvent.plannedStartTime).toLocaleDateString()}</span>}
              {currentEvent.location && <span className="flex items-center"><MapPin className="w-4 h-4 mr-1 print:!hidden" /> {currentEvent.location}</span>}
              {currentEvent.status !== 'PLANUNG' && (
                <span className="flex items-center bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-100 print:!border-none print:!p-0 print:!bg-transparent print:!text-black">
                  <Users className="w-4 h-4 mr-1 print:!hidden" /> Anwesend: {currentEvent.actualAttendeeUserIds ? currentEvent.actualAttendeeUserIds.length : '?'} / {invitedUserIds.length}
                  {!isReadOnly && <button onClick={() => setIsAttendanceModalOpen(true)} className="ml-2 font-bold hover:underline print:!hidden">(Prüfen)</button>}
                </span>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3 shrink-0 ml-4 print:!hidden print:!absolute print:!w-0 print:!h-0 print:!overflow-hidden">
          <button onClick={handlePrint} className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-gray-300" title="Drucken / PDF">
            <Printer className="w-5 h-5" />
          </button>
          {!isReadOnly && currentEvent.status === 'PLANUNG' && !currentEvent.isPublished && <button onClick={() => updateEvent({ ...currentEvent, isPublished: true })} className="px-4 py-2 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 shadow-sm">Agenda veröffentlichen</button>}
          {!isReadOnly && currentEvent.status === 'PLANUNG' && currentEvent.isPublished && <button onClick={() => updateEvent({ ...currentEvent, status: 'AKTIV', isPublished: true })} className="px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 shadow-sm">Sitzung starten</button>}
          {!isReadOnly && (
            <button onClick={() => setIsLibraryVisible(!isLibraryVisible)} className="flex items-center px-4 py-2 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors">
              {isLibraryVisible ? <><ChevronRight className="w-4 h-4 mr-2" /> Fokus-Modus</> : <><ChevronLeft className="w-4 h-4 mr-2" /> Vorlagen einblenden</>}
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row gap-6 overflow-hidden print:!overflow-visible print:!block print:!w-full print:!m-0">
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden print:!shadow-none print:!border-none print:!rounded-none print:!overflow-visible print:!block">
          <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center print:!bg-transparent print:!border-b-2 print:!border-black print:!px-0 print:!pt-0">
            <h2 className="text-lg font-bold text-gray-800 print:!text-black">Agenda & Protokoll</h2>
            <div className="flex items-center gap-2 print:!hidden print:!absolute print:!w-0 print:!h-0">
              <button onClick={toggleAllExpanded} className="flex items-center justify-center w-8 h-8 bg-gray-200 text-gray-700 font-mono font-bold text-lg rounded hover:bg-gray-300 transition-colors" title="Alle Details ein-/ausblenden">+/-</button>
              {!isReadOnly && <button onClick={() => { setEditingItem(null); setIsModalOpen(true); }} className="flex items-center px-3 py-1.5 bg-blue-100 text-blue-700 font-medium rounded hover:bg-blue-200 text-sm"><Plus className="w-4 h-4 mr-1" />Freier Punkt</button>}
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto bg-gray-50/10 p-4 print:!overflow-visible print:!p-0 print:!pt-4 print:!bg-white">
            
            {!isReadOnly && pastOpenTasks.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 shadow-sm print:!hidden print:!absolute print:!w-0 print:!h-0 print:!overflow-hidden print:!m-0 print:!p-0 print:!border-0">
                <h3 className="font-bold text-red-800 mb-3 flex items-center">
                  <span className="w-2 h-2 rounded-full bg-red-600 mr-2 animate-pulse"></span>
                  Protokollkontrolle: Offene Aufgaben
                </h3>
                <div className="space-y-2">
                  {pastOpenTasks.map(t => (
                    <div key={t.id} className="flex justify-between items-center bg-white p-2 rounded border border-red-100 text-sm shadow-sm">
                      <span className="font-medium text-gray-900">{t.title}</span>
                      <span className="text-gray-500 flex items-center"><User className="w-3 h-3 mr-1"/> {getAssigneesText(t)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!isReadOnly && pastCompletedTasks.length > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 shadow-sm transition-all print:!hidden print:!absolute print:!w-0 print:!h-0 print:!overflow-hidden print:!m-0 print:!p-0 print:!border-0">
                <button onClick={() => setShowCompleted(!showCompleted)} className="w-full flex justify-between items-center font-bold text-green-800 outline-none">
                  <span className="flex items-center">
                    <span className="w-2 h-2 rounded-full bg-green-600 mr-2"></span>
                    Kürzlich erledigte Aufgaben ({pastCompletedTasks.length})
                  </span>
                  {showCompleted ? <ChevronUp className="w-5 h-5"/> : <ChevronDown className="w-5 h-5"/>}
                </button>
                {showCompleted && (
                  <div className="mt-3 space-y-2 pt-3 border-t border-green-200/50">
                    {pastCompletedTasks.map(t => (
                      <div key={t.id} className="flex justify-between items-center bg-white/60 p-2 rounded text-sm text-gray-600 line-through">
                        <span>{t.title}</span>
                        <span className="flex items-center"><User className="w-3 h-3 mr-1"/> {getAssigneesText(t)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {eventAgenda.length === 0 ? (
              <div className="text-center text-gray-400 py-10"><p>Die Agenda ist noch leer.</p></div>
            ) : (
              <>
                <div className="border border-gray-200 rounded-lg overflow-x-auto bg-white shadow-sm print:!border-none print:!shadow-none print:!overflow-visible print:!block">
                  {eventAgenda.map((item, index) => {
                    const startTimeStr = new Date(currentRunningTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    currentRunningTime += (item.durationEstimate || 0) * 60000; 
                    return (
                      <AgendaItemRow
                        key={item.id} item={item} index={index} totalItems={eventAgenda.length} startTimeStr={startTimeStr}
                        isExpanded={expandedIds.has(item.id)} onToggleExpand={toggleItemExpanded}
                        onMove={moveAgendaItem} onEdit={i => { setEditingItem(i); setIsModalOpen(true); }}
                        onDelete={(id, title) => window.confirm(`"${title}" löschen?`) && deleteAgendaItem(id)}
                        onSaveInline={async (updatedItem) => {
                          await saveAgendaItem(updatedItem);
                          if (eventId) fetchEventAgenda(eventId);
                        }}
                        isReadOnly={isReadOnly}
                      />
                    );
                  })}
                </div>

                {!isReadOnly && (
                  <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-5 flex flex-col sm:flex-row items-center justify-between shadow-sm print:!hidden print:!absolute print:!w-0 print:!h-0 print:!overflow-hidden print:!m-0 print:!p-0 print:!border-0">
                    <div>
                      <h3 className="text-lg font-bold text-blue-900 flex items-center"><Calendar className="w-5 h-5 mr-2 text-blue-700" />Protokoll Abschluss & Nächste Sitzung</h3>
                    </div>
                    <div className="flex flex-col items-center sm:items-end mt-4 sm:mt-0">
                      {currentEvent.status === 'AKTIV' ? (
                        <>
                          <button onClick={() => { if (validateBeforeClose()) setIsEventModalOpen(true); }} className="px-5 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-sm whitespace-nowrap">Datum festlegen & Protokoll schließen</button>
                          <button onClick={async () => { if (validateBeforeClose() && window.confirm('Projekt abschließen?')) await updateEvent({ ...currentEvent, status: 'ABGESCHLOSSEN', actualEndTime: Date.now() }); }} className="text-xs text-blue-600 hover:underline mt-2">Projekt abschließen</button>
                        </>
                      ) : currentEvent.status === 'PLANUNG' && <button onClick={() => setIsEventModalOpen(true)} className="px-5 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-sm whitespace-nowrap">Datum festlegen & anlegen</button>}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {!isReadOnly && isLibraryVisible && (
          <div className="w-full md:w-1/3 bg-gray-50 rounded-xl shadow-inner border border-gray-200 flex flex-col overflow-hidden transition-all print:!hidden print:!absolute print:!w-0 print:!h-0 print:!overflow-hidden print:!m-0 print:!p-0 print:!border-0">
            <div className="p-4 border-b border-gray-200 bg-white"><h2 className="text-lg font-bold text-gray-800">Vorlagen-Bibliothek</h2></div>
            <div className="p-4 flex-1 overflow-y-auto space-y-3">
              {templates.map(t => (
                <div key={t.id} className="relative group">
                  <ItemCard item={t} className="!mb-0 pr-12 border-blue-100 hover:border-blue-300" />
                  <button 
                    onClick={() => importTemplateToEvent(t, eventId!)} 
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 shadow-sm transition-transform active:scale-95"
                    title="Zur Agenda hinzufügen"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <ItemFormModal key={editingItem ? editingItem.id : 'new'} isOpen={isModalOpen} existingItem={editingItem || { eventId: eventId, type: 'AGENDA' }} onClose={() => setIsModalOpen(false)} onSave={async (data) => { await saveAgendaItem({ ...data, eventId, ...( !editingItem ? { createdAt: Date.now() } : {}) }); if (eventId) fetchEventAgenda(eventId); setIsModalOpen(false); }} />

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
                const isUnfinishedTask = item.type === 'AUFGABE' && item.status !== 'ERLEDIGT';
                // CHIRURGISCHER EINGRIFF: Explizit auf true prüfen, damit auch wirklich JEDER Routinepunkt mitkommt!
                const isRoutineItem = item.isRoutine === true; 
                return isUnfinishedTask || isRoutineItem;
              });

              for (const item of itemsToCopy) {
                const { id, ...rest } = item; 
                const newId = doc(collection(db, 'agenda_items')).id;
                await saveAgendaItem({ 
                  ...rest,
                  id: newId,
                  eventId: data.id, 
                  status: item.isRoutine && item.type !== 'AUFGABE' ? 'OFFEN' : (item.isRoutine ? 'OFFEN' : item.status), 
                  progress: item.isRoutine ? 0 : item.progress, 
                  approvedBy: item.isRoutine ? [] : item.approvedBy,
                  createdAt: Date.now(), 
                  isDueNextMeeting: false, 
                  dueDate: item.isDueNextMeeting ? data.plannedStartTime : item.dueDate 
                });
              }
              
            } else {
               const itemsToUpdate = eventAgenda.filter(i => i.isDueNextMeeting);
               if (itemsToUpdate.length > 0 && data.plannedStartTime) {
                 for (const item of itemsToUpdate) {
                   await saveAgendaItem({ ...item, isDueNextMeeting: false, dueDate: data.plannedStartTime });
                 }
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
// Exakte Zeilenzahl: 351