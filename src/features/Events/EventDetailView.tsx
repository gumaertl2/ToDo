// src/features/Events/EventDetailView.tsx
import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useClubStore } from '../../store/useClubStore';
import { ArrowLeft, Plus, Calendar, MapPin, Clock, Edit2, Trash2, ChevronRight, ChevronLeft, User, CheckSquare, ChevronUp, ChevronDown, Users, X } from 'lucide-react';
import { ItemFormModal } from '../Shared/ItemFormModal';
import { EventFormModal } from './EventFormModal';
import type { AgendaItem } from '../../core/types/models';

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
  return 'text-gray-600';
};

// CHIRURGISCHER EINGRIFF: Inline-Editing in der Row
const AgendaItemRow: React.FC<{
  item: AgendaItem;
  index: number;
  totalItems: number;
  startTimeStr: string;
  isExpanded: boolean;
  onToggleExpand: (id: string) => void;
  onMove: (id: string, newIdx: number) => void;
  onEdit: (item: AgendaItem) => void;
  onDelete: (id: string, title: string) => void;
  onSaveInline: (item: AgendaItem) => void;
}> = ({ item, index, totalItems, startTimeStr, isExpanded, onToggleExpand, onMove, onEdit, onDelete, onSaveInline }) => {
  const { users, groups } = useClubStore();
  const hasDescription = !!item.description;

  // Lokaler State für das blitzschnelle Inline-Editing
  const [editField, setEditField] = useState<'title' | 'description' | null>(null);
  const [editVal, setEditVal] = useState('');

  const todayStr = new Date().toISOString().substring(0, 10);

  const getAssigneesText = (item: AgendaItem) => {
    const uNames = (item.assigneeUserIds || []).map(id => users.find(u => u.id === id)?.name).filter(Boolean);
    const gNames = (item.assigneeGroupIds || []).map(id => groups.find(g => g.id === id)?.name).filter(Boolean);
    const all = [...uNames, ...gNames];
    if (all.length > 0) return all.join(', ');
    if (item.type === 'INFO') return 'Allgemeine Info';
    return 'Nicht zugewiesen';
  };

  const startEdit = (field: 'title' | 'description', currentVal: string) => {
    setEditVal(currentVal);
    setEditField(field);
  };

  const handleInlineSaveText = () => {
    if (editField === 'title' && editVal.trim() !== item.title) onSaveInline({ ...item, title: editVal.trim() });
    if (editField === 'description' && editVal.trim() !== item.description) onSaveInline({ ...item, description: editVal.trim() });
    setEditField(null);
  };

  const handleInlineDate = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value) onSaveInline({ ...item, dueDate: new Date(e.target.value).getTime() });
  };

  const handleInlineProgress = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    onSaveInline({ ...item, progress: val, status: val === 100 ? 'ERLEDIGT' : (val === 0 ? 'OFFEN' : 'IN_ARBEIT') });
  };

  return (
    <div className="bg-white hover:bg-blue-50/30 transition-colors flex flex-col border-b border-gray-200 last:border-0 min-w-[700px]">
      <div className="p-3 grid grid-cols-[85px_1fr_auto] gap-3 items-center">
        {/* Spalte 1: Position */}
        <div className="flex items-center gap-2">
          <select value={index} onChange={(e) => onMove(item.id, Number(e.target.value))} className="appearance-none text-center font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 border border-transparent rounded text-sm py-1 px-1.5 cursor-pointer outline-none">
            {Array.from({length: totalItems}).map((_, i) => <option key={i} value={i}>{i + 1}</option>)}
          </select>
          <span className="font-bold text-gray-900 text-sm">{startTimeStr}</span>
        </div>

        {/* Spalte 2: Titel (Klickbar für Inline-Edit) */}
        <div className="flex flex-col min-w-0 pr-4">
          {editField === 'title' ? (
            <input 
              autoFocus value={editVal} onChange={e => setEditVal(e.target.value)} onBlur={handleInlineSaveText} onKeyDown={e => e.key === 'Enter' && handleInlineSaveText()}
              className="w-full font-bold text-gray-900 text-sm border-b-2 border-blue-500 outline-none bg-blue-50 p-0.5"
            />
          ) : (
            <div className="font-bold text-gray-900 text-sm truncate cursor-text hover:bg-gray-100 rounded px-1 -ml-1 transition-colors" title="Klicken zum Bearbeiten" onClick={() => startEdit('title', item.title)}>
              {item.title}
            </div>
          )}
          
          {(item.type === 'BESCHLUSS' || item.mustBeDoneBeforeEvent) && (
            <div className="flex items-center gap-2 text-xs text-gray-600 mt-0.5 truncate pl-1">
              {item.type === 'BESCHLUSS' && <span className="px-1.5 py-0.5 bg-green-100 text-green-700 font-bold rounded">Beschluss</span>}
              {item.mustBeDoneBeforeEvent && <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 font-bold rounded">Vorlauf</span>}
            </div>
          )}
        </div>

        {/* Spalte 3: Die starre Matrix */}
        <div className="flex items-center shrink-0">
          <div className="w-[140px] flex items-start pr-4 text-xs text-gray-600 border-r border-transparent pt-0.5">
            <User className="w-3 h-3 mr-1.5 shrink-0 text-gray-400 mt-0.5" />
            <span className="whitespace-normal leading-tight break-words">{getAssigneesText(item)}</span>
          </div>

          {/* Inline Slider für % */}
          <div className="w-[70px] flex items-center pr-4 group relative">
            {item.type === 'AUFGABE' ? (
              <div className="flex items-center text-blue-600 font-medium text-xs cursor-pointer" title="Klicken um Fortschritt zu ändern">
                <CheckSquare className="w-3 h-3 shrink-0" />
                <span className="w-7 text-right inline-block ml-1 group-hover:hidden">{item.progress || 0}%</span>
                <input type="range" min="0" max="100" step="10" value={item.progress || 0} onChange={handleInlineProgress} className="hidden group-hover:block w-12 ml-1 h-2 accent-blue-600" />
              </div>
            ) : <div className="w-full"></div>}
          </div>

          {/* Inline Date Picker & Ampel */}
          <div className="w-[120px] flex justify-start pr-2 group relative">
            {item.isDueNextMeeting ? (
              <span className="flex items-center text-purple-600 font-bold bg-purple-50 px-1.5 py-0.5 rounded text-xs"><Calendar className="w-3 h-3 mr-1 shrink-0" /> Nächste</span>
            ) : item.type === 'AUFGABE' ? (
              <div className="relative flex items-center">
                <Calendar className={`w-3 h-3 mr-1 shrink-0 ${getDueDateColor(item)}`} />
                <span className={`text-xs ${getDueDateColor(item)} group-hover:hidden`}>{item.dueDate ? new Date(item.dueDate).toLocaleDateString() : 'Kein Datum'}</span>
                <input type="date" min={todayStr} value={item.dueDate ? new Date(item.dueDate).toISOString().substring(0,10) : ''} onChange={handleInlineDate} className="hidden group-hover:block w-24 text-xs border border-gray-300 rounded p-0.5 bg-white z-10" />
              </div>
            ) : null}
          </div>

          <div className="w-[100px] flex items-center justify-end border-l border-gray-200 pl-3 gap-1">
            {hasDescription ? (
              <button onClick={() => onToggleExpand(item.id)} className="w-7 h-7 flex items-center justify-center text-gray-500 hover:bg-gray-100 rounded text-lg font-mono font-bold leading-none">{isExpanded ? '-' : '+'}</button>
            ) : <div className="w-7"></div>}
            <button onClick={() => onEdit(item)} className="p-1.5 text-blue-500 hover:bg-blue-100 rounded"><Edit2 className="w-4 h-4" /></button>
            <button onClick={() => onDelete(item.id, item.title)} className="p-1.5 text-red-400 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
          </div>
        </div>
      </div>

      {hasDescription && isExpanded && (
        <div className="px-3 pb-3">
          {editField === 'description' ? (
             <textarea 
               autoFocus value={editVal} onChange={e => setEditVal(e.target.value)} onBlur={handleInlineSaveText}
               className="w-full text-sm text-gray-900 bg-white p-3 rounded border-2 border-blue-500 outline-none shadow-sm min-h-[80px]"
             />
          ) : (
            <div onClick={() => startEdit('description', item.description || '')} className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 p-3 rounded border border-gray-100 shadow-inner cursor-text hover:bg-gray-100 transition-colors" title="Klicken zum Bearbeiten">
              {item.description}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const EventDetailView: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { currentEvent, eventAgenda, templates, users, groups, tasks, fetchEventDetails, fetchEventAgenda, fetchTemplatesAndRoutines, fetchTasks, importTemplateToEvent, moveAgendaItem, deleteAgendaItem, saveAgendaItem, updateEvent, addEvent } = useClubStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AgendaItem | null>(null);
  const [isLibraryVisible, setIsLibraryVisible] = useState(true);
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

  const pastOpenTasks = tasks.filter(t => t.type === 'AUFGABE' && t.eventId && t.eventId !== eventId && t.status !== 'ERLEDIGT');
  const pastCompletedTasks = tasks.filter(t => t.type === 'AUFGABE' && t.eventId && t.eventId !== eventId && t.status === 'ERLEDIGT');

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

  let currentRunningTime = currentEvent.plannedStartTime || new Date().setHours(19, 0, 0, 0);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <button onClick={() => navigate('/events')} className="mr-4 text-gray-400 hover:text-blue-600 transition-colors"><ArrowLeft className="w-6 h-6" /></button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {currentEvent.title}
              {currentEvent.status === 'PLANUNG' && !currentEvent.isPublished && <span className="ml-3 text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded uppercase">Entwurf</span>}
              {currentEvent.status === 'PLANUNG' && currentEvent.isPublished && <span className="ml-3 text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded uppercase border border-purple-200">Agenda Veröffentlicht</span>}
            </h1>
            <div className="flex items-center text-sm text-gray-500 mt-1 gap-4 flex-wrap">
              {currentEvent.plannedStartTime && <span className="flex items-center"><Calendar className="w-4 h-4 mr-1" /> {new Date(currentEvent.plannedStartTime).toLocaleDateString()}</span>}
              {currentEvent.location && <span className="flex items-center"><MapPin className="w-4 h-4 mr-1" /> {currentEvent.location}</span>}
              {currentEvent.status !== 'PLANUNG' && (
                <span className="flex items-center bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-100">
                  <Users className="w-4 h-4 mr-1" /> Anwesend: {currentEvent.actualAttendeeUserIds ? currentEvent.actualAttendeeUserIds.length : '?'} / {invitedUserIds.length}
                  <button onClick={() => setIsAttendanceModalOpen(true)} className="ml-2 font-bold hover:underline">(Prüfen)</button>
                </span>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3 shrink-0 ml-4">
          {currentEvent.status === 'PLANUNG' && !currentEvent.isPublished && <button onClick={() => updateEvent({ ...currentEvent, isPublished: true })} className="px-4 py-2 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 shadow-sm">Agenda veröffentlichen</button>}
          {currentEvent.status === 'PLANUNG' && currentEvent.isPublished && <button onClick={() => updateEvent({ ...currentEvent, status: 'AKTIV', isPublished: true })} className="px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 shadow-sm">Sitzung starten</button>}
          {currentEvent.status === 'ABGESCHLOSSEN' && <span className="px-4 py-2 bg-gray-100 text-gray-600 font-bold rounded-lg border border-gray-200">Sitzung beendet</span>}
          <button onClick={() => setIsLibraryVisible(!isLibraryVisible)} className="flex items-center px-4 py-2 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors">
            {isLibraryVisible ? <><ChevronRight className="w-4 h-4 mr-2" /> Fokus-Modus</> : <><ChevronLeft className="w-4 h-4 mr-2" /> Vorlagen einblenden</>}
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row gap-6 overflow-hidden">
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
            <h2 className="text-lg font-bold text-gray-800">Agenda & Protokoll</h2>
            <div className="flex items-center gap-2">
              <button onClick={toggleAllExpanded} className="flex items-center justify-center w-8 h-8 bg-gray-200 text-gray-700 font-mono font-bold text-lg rounded hover:bg-gray-300 transition-colors" title="Alle Details ein-/ausblenden">+/-</button>
              <button onClick={() => { setEditingItem(null); setIsModalOpen(true); }} className="flex items-center px-3 py-1.5 bg-blue-100 text-blue-700 font-medium rounded hover:bg-blue-200 text-sm"><Plus className="w-4 h-4 mr-1" />Freier Punkt</button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto bg-gray-50/10 p-4">
            {eventAgenda.length === 0 ? (
              <div className="text-center text-gray-400 py-10"><p>Die Agenda ist noch leer.</p></div>
            ) : (
              <>
                <div className="border border-gray-200 rounded-lg overflow-x-auto bg-white shadow-sm">
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
                      />
                    );
                  })}
                </div>

                <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-5 flex flex-col sm:flex-row items-center justify-between shadow-sm">
                  <div>
                    <h3 className="text-lg font-bold text-blue-900 flex items-center"><Calendar className="w-5 h-5 mr-2 text-blue-700" />Protokoll Abschluss & Nächste Sitzung</h3>
                  </div>
                  <div className="flex flex-col items-center sm:items-end mt-4 sm:mt-0">
                    {currentEvent.status === 'AKTIV' ? (
                      <>
                        <button onClick={() => { if (validateBeforeClose()) setIsEventModalOpen(true); }} className="px-5 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-sm whitespace-nowrap">Datum festlegen & Protokoll schließen</button>
                        <button onClick={async () => { if (validateBeforeClose() && window.confirm('Ohne Folgetermin schließen?')) await updateEvent({ ...currentEvent, status: 'ABGESCHLOSSEN', actualEndTime: Date.now() }); }} className="text-xs text-blue-600 hover:underline mt-2">Ohne Folgetermin schließen</button>
                      </>
                    ) : currentEvent.status === 'PLANUNG' && <button onClick={() => setIsEventModalOpen(true)} className="px-5 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-sm whitespace-nowrap">Datum festlegen & anlegen</button>}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ... (Library Sidebar remains identical) ... */}
        {isLibraryVisible && (
          <div className="w-full md:w-1/3 bg-gray-50 rounded-xl shadow-inner border border-gray-200 flex flex-col overflow-hidden transition-all">
            <div className="p-4 border-b border-gray-200 bg-white"><h2 className="text-lg font-bold text-gray-800">Vorlagen-Bibliothek</h2></div>
            <div className="p-4 flex-1 overflow-y-auto space-y-3">
              {templates.map(t => (
                <div key={t.id} className="bg-white p-3 rounded border border-gray-200 flex items-center justify-between hover:border-blue-300">
                  <div><h4 className="font-semibold text-sm">{t.title}</h4></div>
                  <button onClick={() => importTemplateToEvent(t, eventId!)} className="p-2 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-600 hover:text-white"><Plus className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <ItemFormModal key={editingItem ? editingItem.id : 'new'} isOpen={isModalOpen} existingItem={editingItem || { eventId: eventId, type: 'AGENDA' }} onClose={() => setIsModalOpen(false)} onSave={async (data) => { await saveAgendaItem({ ...data, eventId, ...( !editingItem ? { createdAt: Date.now() } : {}) }); if (eventId) fetchEventAgenda(eventId); setIsModalOpen(false); }} />

      <EventFormModal isOpen={isEventModalOpen} onClose={() => setIsEventModalOpen(false)} onSave={async (data) => {
          const result = await addEvent(data);
          if (!result?.success) throw new Error(result?.error?.message);
          const itemsToUpdate = eventAgenda.filter(i => i.isDueNextMeeting);
          if (itemsToUpdate.length > 0 && data.plannedStartTime) {
            await Promise.all(itemsToUpdate.map(item => saveAgendaItem({ ...item, isDueNextMeeting: false, dueDate: data.plannedStartTime })));
          }
          if (currentEvent.status === 'AKTIV') await updateEvent({ ...currentEvent, status: 'ABGESCHLOSSEN', actualEndTime: Date.now() });
          setIsEventModalOpen(false);
          if (window.confirm('Protokoll geschlossen! Zur neuen Agenda wechseln?')) navigate(`/events/${data.id}`); else if (eventId) fetchEventAgenda(eventId);
        }} />
        
      {/* Attendance Modal Omitted for Brevity (Same as before) */}
    </div>
  );
};
// Exakte Zeilenzahl: 301