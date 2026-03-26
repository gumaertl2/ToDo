// src/features/Events/EventDetailView.tsx
import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useClubStore } from '../../store/useClubStore';
import { ArrowLeft, Plus, Calendar, MapPin, Clock, Edit2, Trash2, ChevronRight, ChevronLeft, User, CheckSquare, ChevronUp, ChevronDown, Users, X } from 'lucide-react';
import { ItemFormModal } from '../Shared/ItemFormModal';
import { EventFormModal } from './EventFormModal';
import type { AgendaItem } from '../../core/types/models';

// CHIRURGISCHER EINGRIFF: Zeile empfängt nun den isExpanded State von oben
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
}> = ({ item, index, totalItems, startTimeStr, isExpanded, onToggleExpand, onMove, onEdit, onDelete }) => {
  const { users, groups } = useClubStore();
  const hasDescription = !!item.description;

  const getAssigneesText = (item: AgendaItem) => {
    const uNames = (item.assigneeUserIds || []).map(id => users.find(u => u.id === id)?.name).filter(Boolean);
    const gNames = (item.assigneeGroupIds || []).map(id => groups.find(g => g.id === id)?.name).filter(Boolean);
    const all = [...uNames, ...gNames];
    if (all.length > 0) return all.join(', ');
    if (item.type === 'INFO') return 'Allgemeine Info';
    return 'Nicht zugewiesen';
  };

  return (
    <div className="bg-white hover:bg-blue-50/30 transition-colors flex flex-col border-b border-gray-200 last:border-0 min-w-[700px]">
      <div className="p-3 grid grid-cols-[85px_1fr_auto] gap-3 items-center">
        {/* Spalte 1: Position & Zeit */}
        <div className="flex items-center gap-2">
          <select 
            value={index} 
            onChange={(e) => onMove(item.id, Number(e.target.value))} 
            className="appearance-none text-center font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 border border-transparent rounded text-sm py-1 px-1.5 cursor-pointer outline-none focus:ring-2 focus:ring-blue-500" 
            title="Position ändern"
          >
            {Array.from({length: totalItems}).map((_, i) => <option key={i} value={i}>{i + 1}</option>)}
          </select>
          <span className="font-bold text-gray-900 text-sm">{startTimeStr}</span>
        </div>

        {/* Spalte 2: Titel & Labels */}
        <div className="flex flex-col min-w-0 pr-4">
          <div className="font-bold text-gray-900 text-sm truncate" title={item.title}>{item.title}</div>
          {(item.type === 'BESCHLUSS' || item.mustBeDoneBeforeEvent) && (
            <div className="flex items-center gap-2 text-xs text-gray-600 mt-0.5 truncate">
              {item.type === 'BESCHLUSS' && <span className="px-1.5 py-0.5 bg-green-100 text-green-700 font-bold rounded">Beschluss</span>}
              {item.mustBeDoneBeforeEvent && <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 font-bold rounded">Vorlauf</span>}
            </div>
          )}
        </div>

        {/* Spalte 3: Die starre Matrix */}
        <div className="flex items-center shrink-0">
          
          {/* Block A: Verantwortlicher (CHIRURGISCHER EINGRIFF: Umbruch erlaubt, Icon oben ausgerichtet) */}
          <div className="w-[140px] flex items-start pr-4 text-xs text-gray-600 border-r border-transparent pt-0.5">
            <User className="w-3 h-3 mr-1.5 shrink-0 text-gray-400 mt-0.5" />
            <span className="whitespace-normal leading-tight break-words" title={getAssigneesText(item)}>{getAssigneesText(item)}</span>
          </div>

          {/* Block B: Fortschritt */}
          <div className="w-[70px] flex items-center pr-4">
            {item.type === 'AUFGABE' ? (
              <div className="flex items-center text-blue-600 font-medium text-xs">
                <CheckSquare className="w-3 h-3 shrink-0" />
                <span className="w-7 text-right inline-block ml-1">{item.progress || 0}%</span>
              </div>
            ) : <div className="w-full"></div>}
          </div>

          {/* Block C: Datum */}
          <div className="w-[120px] flex justify-start pr-2">
            {item.isDueNextMeeting ? (
              <span className="flex items-center text-purple-600 font-bold bg-purple-50 px-1.5 py-0.5 rounded text-xs"><Calendar className="w-3 h-3 mr-1 shrink-0" /> Nächste</span>
            ) : item.dueDate ? (
              <span className="flex items-center text-gray-600 text-xs"><Calendar className="w-3 h-3 mr-1 shrink-0" /> {new Date(item.dueDate).toLocaleDateString()}</span>
            ) : null}
          </div>

          {/* Block D: Aktionen */}
          <div className="w-[100px] flex items-center justify-end border-l border-gray-200 pl-3 gap-1">
            {hasDescription ? (
              <button onClick={() => onToggleExpand(item.id)} className="w-7 h-7 flex items-center justify-center text-gray-500 hover:bg-gray-100 rounded text-lg font-mono font-bold leading-none" title="Details ein/ausblenden">
                {isExpanded ? '-' : '+'}
              </button>
            ) : <div className="w-7"></div>}
            <button onClick={() => onEdit(item)} className="p-1.5 text-blue-500 hover:bg-blue-100 rounded" title="Bearbeiten"><Edit2 className="w-4 h-4" /></button>
            <button onClick={() => onDelete(item.id, item.title)} className="p-1.5 text-red-400 hover:bg-red-50 rounded" title="Löschen"><Trash2 className="w-4 h-4" /></button>
          </div>
        </div>
      </div>

      {/* Accordion für den Beschreibungstext (CHIRURGISCHER EINGRIFF: Volle Breite) */}
      {hasDescription && isExpanded && (
        <div className="px-3 pb-3">
          <div className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 p-3 rounded border border-gray-100 shadow-inner">
            {item.description}
          </div>
        </div>
      )}
    </div>
  );
};

export const EventDetailView: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  
  const { 
    currentEvent, 
    eventAgenda, 
    templates, 
    users,
    groups,
    tasks,
    fetchEventDetails, 
    fetchEventAgenda, 
    fetchTemplatesAndRoutines,
    fetchTasks,
    importTemplateToEvent,
    moveAgendaItem,
    deleteAgendaItem,
    saveAgendaItem,
    updateEvent,
    addEvent
  } = useClubStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AgendaItem | null>(null);
  const [isLibraryVisible, setIsLibraryVisible] = useState(true);
  const [showCompleted, setShowCompleted] = useState(false);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
  const [attendanceList, setAttendanceList] = useState<string[]>([]);
  
  // CHIRURGISCHER EINGRIFF: Master-Toggle State
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (eventId) {
      fetchEventDetails(eventId);
      fetchEventAgenda(eventId);
      fetchTemplatesAndRoutines();
      fetchTasks();
    }
  }, [eventId, fetchEventDetails, fetchEventAgenda, fetchTemplatesAndRoutines, fetchTasks]);

  const invitedUserIds = useMemo(() => {
    if (!currentEvent) return [];
    const ids = new Set<string>(currentEvent.participantUserIds || []);
    const eventGroupIds = currentEvent.participantGroupIds || [];
    users.forEach(u => {
      if (u.groupIds && u.groupIds.some(gId => eventGroupIds.includes(gId))) {
        ids.add(u.id);
      }
    });
    return Array.from(ids);
  }, [currentEvent, users]);

  if (!currentEvent) {
    return <div className="p-8 text-center text-gray-500 animate-pulse">Lade Sitzung...</div>;
  }

  const pastOpenTasks = tasks.filter(t => t.type === 'AUFGABE' && t.eventId && t.eventId !== eventId && t.status !== 'ERLEDIGT');
  const pastCompletedTasks = tasks.filter(t => t.type === 'AUFGABE' && t.eventId && t.eventId !== eventId && t.status === 'ERLEDIGT');

  // CHIRURGISCHER EINGRIFF: Master-Toggle Logik
  const toggleAllExpanded = () => {
    const itemsWithDesc = eventAgenda.filter(i => !!i.description);
    if (expandedIds.size === itemsWithDesc.length && itemsWithDesc.length > 0) {
      setExpandedIds(new Set());
    } else {
      setExpandedIds(new Set(itemsWithDesc.map(i => i.id)));
    }
  };

  const toggleItemExpanded = (id: string) => {
    const next = new Set(expandedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedIds(next);
  };

  const handlePublishAgenda = async () => {
    await updateEvent({ ...currentEvent, isPublished: true });
  };

  const handleStartSession = async () => {
    await updateEvent({ ...currentEvent, status: 'AKTIV', isPublished: true });
  };

  const validateBeforeClose = () => {
    const incompleteTasks = eventAgenda.filter(item => {
      if (item.type !== 'AUFGABE') return false;
      if (item.status === 'ERLEDIGT') return false;
      const hasAssignee = (item.assigneeUserIds && item.assigneeUserIds.length > 0) || (item.assigneeGroupIds && item.assigneeGroupIds.length > 0);
      const hasDueDate = item.dueDate || item.isDueNextMeeting;
      return !hasAssignee || !hasDueDate;
    });

    if (incompleteTasks.length > 0) {
      const taskNames = incompleteTasks.map(t => `- ${t.title}`).join('\n');
      alert(`Halt! Das Protokoll kann noch nicht geschlossen werden.\n\nFolgenden Aufgaben fehlt ein Verantwortlicher oder ein Fälligkeitsdatum:\n${taskNames}\n\nBitte trage diese Infos nach!`);
      return false;
    }
    return true;
  };

  const handleInitiateCloseProtocol = () => {
    if (validateBeforeClose()) setIsEventModalOpen(true);
  };

  const handleCloseWithoutNextEvent = async () => {
    if (validateBeforeClose() && window.confirm('Möchtest du das Protokoll wirklich schließen OHNE einen Folgetermin anzulegen?')) {
      await updateEvent({ ...currentEvent, status: 'ABGESCHLOSSEN', actualEndTime: Date.now() });
    }
  };

  const handleOpenAttendance = () => {
    setAttendanceList(currentEvent.actualAttendeeUserIds || invitedUserIds);
    setIsAttendanceModalOpen(true);
  };

  const handleSaveAttendance = async () => {
    await updateEvent({ ...currentEvent, actualAttendeeUserIds: attendanceList });
    setIsAttendanceModalOpen(false);
  };

  const handleImportTemplate = async (template: AgendaItem) => {
    if (!eventId) return;
    await importTemplateToEvent(template, eventId);
  };

  const handleEditItem = (item: AgendaItem) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleCreateCustomItem = () => {
    setEditingItem(null);
    setIsModalOpen(true);
  };

  const handleDeleteItem = async (id: string, title: string) => {
    if (window.confirm(`Möchtest du "${title}" wirklich von der Agenda entfernen?`)) {
      await deleteAgendaItem(id);
      if (eventId) fetchEventAgenda(eventId);
    }
  };

  const handleMoveItem = async (id: string, newIndex: number) => {
    await moveAgendaItem(id, newIndex);
  };

  const getAssigneesText = (item: AgendaItem) => {
    const uNames = (item.assigneeUserIds || []).map(id => users.find(u => u.id === id)?.name).filter(Boolean);
    const gNames = (item.assigneeGroupIds || []).map(id => groups.find(g => g.id === id)?.name).filter(Boolean);
    const all = [...uNames, ...gNames];
    if (all.length > 0) return all.join(', ');
    if (item.type === 'INFO') return 'Allgemeine Info';
    return 'Nicht zugewiesen';
  };

  let currentRunningTime = currentEvent.plannedStartTime || new Date().setHours(19, 0, 0, 0);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <button onClick={() => navigate('/events')} className="mr-4 text-gray-400 hover:text-blue-600 transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {currentEvent.title}
              {currentEvent.status === 'PLANUNG' && !currentEvent.isPublished && <span className="ml-3 text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded uppercase tracking-wider">Entwurf</span>}
              {currentEvent.status === 'PLANUNG' && currentEvent.isPublished && <span className="ml-3 text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded uppercase tracking-wider border border-purple-200">Agenda Veröffentlicht</span>}
            </h1>
            <div className="flex items-center text-sm text-gray-500 mt-1 gap-4 flex-wrap">
              {currentEvent.plannedStartTime && (
                <span className="flex items-center"><Calendar className="w-4 h-4 mr-1" /> {new Date(currentEvent.plannedStartTime).toLocaleDateString()}</span>
              )}
              {currentEvent.location && (
                <span className="flex items-center"><MapPin className="w-4 h-4 mr-1" /> {currentEvent.location}</span>
              )}
              
              {currentEvent.status !== 'PLANUNG' && (
                <span className="flex items-center bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-100">
                  <Users className="w-4 h-4 mr-1" /> 
                  Anwesend: {currentEvent.actualAttendeeUserIds ? currentEvent.actualAttendeeUserIds.length : '?'} / {invitedUserIds.length}
                  <button onClick={handleOpenAttendance} className="ml-2 font-bold hover:underline">
                    (Prüfen)
                  </button>
                </span>
              )}

              {currentEvent.actualEndTime && (
                <span className="flex items-center font-bold text-gray-700">
                  <Clock className="w-4 h-4 mr-1" />
                  Beendet: {new Date(currentEvent.actualEndTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} Uhr
                </span>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3 shrink-0 ml-4">
          {currentEvent.status === 'PLANUNG' && !currentEvent.isPublished && (
            <button onClick={handlePublishAgenda} className="flex items-center px-4 py-2 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors shadow-sm">
              Agenda veröffentlichen
            </button>
          )}
          {currentEvent.status === 'PLANUNG' && currentEvent.isPublished && (
            <button onClick={handleStartSession} className="flex items-center px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors shadow-sm">
              Sitzung / Protokoll starten
            </button>
          )}
          
          {currentEvent.status === 'ABGESCHLOSSEN' && (
            <span className="px-4 py-2 bg-gray-100 text-gray-600 font-bold rounded-lg border border-gray-200">
              Sitzung beendet
            </span>
          )}

          <button 
            onClick={() => setIsLibraryVisible(!isLibraryVisible)}
            className="flex items-center px-4 py-2 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            {isLibraryVisible ? <><ChevronRight className="w-4 h-4 mr-2" /> Fokus-Modus</> : <><ChevronLeft className="w-4 h-4 mr-2" /> Vorlagen einblenden</>}
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row gap-6 overflow-hidden">
        
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
            <h2 className="text-lg font-bold text-gray-800">Agenda & Protokoll</h2>
            
            {/* CHIRURGISCHER EINGRIFF: Master-Toggle für +/- hinzugefügt */}
            <div className="flex items-center gap-2">
              <button 
                onClick={toggleAllExpanded}
                className="flex items-center justify-center w-8 h-8 bg-gray-200 text-gray-700 font-mono font-bold text-lg rounded hover:bg-gray-300 transition-colors"
                title="Alle Details ein-/ausblenden"
              >
                +/-
              </button>
              <button 
                onClick={handleCreateCustomItem}
                className="flex items-center px-3 py-1.5 bg-blue-100 text-blue-700 font-medium rounded hover:bg-blue-200 transition-colors text-sm"
              >
                <Plus className="w-4 h-4 mr-1" />
                Freier Punkt
              </button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto bg-gray-50/10 p-4">
            
            {pastOpenTasks.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 shadow-sm">
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

            {pastCompletedTasks.length > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 shadow-sm transition-all">
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
              <div className="text-center text-gray-400 py-10">
                <p>Die Agenda ist noch leer.</p>
                {isLibraryVisible && <p className="text-sm mt-2">Klicke rechts auf das Plus (+), um Vorlagen hinzuzufügen.</p>}
              </div>
            ) : (
              <>
                <div className="border border-gray-200 rounded-lg overflow-x-auto bg-white shadow-sm">
                  {eventAgenda.map((item, index) => {
                    const startTimeStr = new Date(currentRunningTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    currentRunningTime += (item.durationEstimate || 0) * 60000; 

                    return (
                      <AgendaItemRow
                        key={item.id}
                        item={item}
                        index={index}
                        totalItems={eventAgenda.length}
                        startTimeStr={startTimeStr}
                        isExpanded={expandedIds.has(item.id)}
                        onToggleExpand={toggleItemExpanded}
                        onMove={handleMoveItem}
                        onEdit={handleEditItem}
                        onDelete={handleDeleteItem}
                      />
                    );
                  })}
                </div>

                <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-5 flex flex-col sm:flex-row items-center justify-between shadow-sm">
                  <div>
                    <h3 className="text-lg font-bold text-blue-900 flex items-center">
                      <Calendar className="w-5 h-5 mr-2 text-blue-700" />
                      Protokoll Abschluss & Nächste Sitzung
                    </h3>
                    <p className="text-sm text-blue-700 mt-1">Stimme jetzt den Folgetermin ab, um das Protokoll offiziell zu schließen.</p>
                  </div>
                  <div className="flex flex-col items-center sm:items-end mt-4 sm:mt-0">
                    {currentEvent.status === 'AKTIV' ? (
                      <>
                        <button 
                          onClick={handleInitiateCloseProtocol}
                          className="px-5 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition shadow-sm whitespace-nowrap"
                        >
                          Datum festlegen & Protokoll schließen
                        </button>
                        <button onClick={handleCloseWithoutNextEvent} className="text-xs text-blue-600 hover:underline mt-2">
                          Ohne Folgetermin schließen
                        </button>
                      </>
                    ) : currentEvent.status === 'PLANUNG' ? (
                      <button 
                        onClick={() => setIsEventModalOpen(true)}
                        className="px-5 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition shadow-sm whitespace-nowrap"
                      >
                        Datum festlegen & anlegen
                      </button>
                    ) : null}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {isLibraryVisible && (
          <div className="w-full md:w-1/3 bg-gray-50 rounded-xl shadow-inner border border-gray-200 flex flex-col overflow-hidden transition-all">
            <div className="p-4 border-b border-gray-200 bg-white">
              <h2 className="text-lg font-bold text-gray-800">Vorlagen-Bibliothek</h2>
              <p className="text-xs text-gray-500 mt-1">Klicke auf das Plus, um eine Vorlage in die Sitzung zu übernehmen.</p>
            </div>
            <div className="p-4 flex-1 overflow-y-auto space-y-3">
              {templates.length === 0 && <p className="text-sm text-gray-500 text-center">Keine Vorlagen gefunden.</p>}
              {templates.map(t => (
                <div key={t.id} className="bg-white p-3 rounded border border-gray-200 shadow-sm flex items-center justify-between hover:border-blue-300 transition-colors">
                  <div>
                    <h4 className="font-semibold text-gray-800 text-sm">{t.title}</h4>
                    <div className="text-xs text-gray-500 flex items-center mt-1">
                      <Clock className="w-3 h-3 mr-1" />
                      {t.durationEstimate || 0} Min.
                    </div>
                  </div>
                  <button 
                    onClick={() => handleImportTemplate(t)}
                    className="p-2 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-600 hover:text-white transition-colors"
                    title="Zur Agenda hinzufügen"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      <ItemFormModal
        key={editingItem ? editingItem.id : 'new-agenda'}
        isOpen={isModalOpen}
        existingItem={editingItem || { eventId: eventId, type: 'AGENDA' }}
        isFixedType={false}
        onClose={() => setIsModalOpen(false)}
        onSave={async (data) => {
          const isNew = !editingItem;
          const payload = { 
            ...data, 
            eventId: eventId,
            ...(isNew ? { createdAt: Date.now() } : {})
          };
          const result = await saveAgendaItem(payload);
          if (!result || (result && !result.success)) {
            throw new Error(result?.error?.message || "Fehler beim Speichern");
          }
          if (eventId) fetchEventAgenda(eventId);
          setIsModalOpen(false);
        }}
      />

      <EventFormModal
        isOpen={isEventModalOpen}
        onClose={() => setIsEventModalOpen(false)}
        onSave={async (data) => {
          const result = await addEvent(data);
          if (!result || (result && !result.success)) {
            throw new Error(result?.error?.message || "Fehler beim Speichern der neuen Sitzung");
          }
          
          const itemsToUpdate = eventAgenda.filter(i => i.isDueNextMeeting);
          if (itemsToUpdate.length > 0 && data.plannedStartTime) {
            const updatePromises = itemsToUpdate.map(item => {
              return saveAgendaItem({
                ...item,
                isDueNextMeeting: false,
                dueDate: data.plannedStartTime
              });
            });
            await Promise.all(updatePromises);
          }

          if (currentEvent.status === 'AKTIV') {
            await updateEvent({ 
              ...currentEvent, 
              status: 'ABGESCHLOSSEN',
              actualEndTime: Date.now()
            });
          }

          setIsEventModalOpen(false);
          if (window.confirm('Protokoll geschlossen und Folgetermin erfolgreich angelegt! Möchtest du direkt zur neuen Agenda wechseln?')) {
            navigate(`/events/${data.id}`);
          } else {
            if (eventId) fetchEventAgenda(eventId);
          }
        }}
      />

      {isAttendanceModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
              <h2 className="text-lg font-bold text-gray-900 flex items-center">
                <Users className="w-5 h-5 mr-2 text-blue-600" />
                Anwesenheitsliste
              </h2>
              <button onClick={() => setIsAttendanceModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              <p className="text-sm text-gray-500 mb-4">Hake hier ab, wer von den geladenen Personen heute tatsächlich anwesend ist.</p>
              <div className="space-y-2">
                {users.filter(u => invitedUserIds.includes(u.id)).map(u => (
                  <label key={u.id} className="flex items-center justify-between p-3 bg-white rounded border border-gray-200 cursor-pointer hover:bg-blue-50 transition-colors">
                    <span className="font-medium text-gray-800">{u.name} <span className="text-xs text-gray-500 font-normal ml-1">({u.amt})</span></span>
                    <input 
                      type="checkbox" 
                      className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                      checked={attendanceList.includes(u.id)}
                      onChange={(e) => {
                        if (e.target.checked) setAttendanceList([...attendanceList, u.id]);
                        else setAttendanceList(attendanceList.filter(id => id !== u.id));
                      }}
                    />
                  </label>
                ))}
                {users.filter(u => invitedUserIds.includes(u.id)).length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-4">Keine Personen direkt oder über Ämter eingeladen.</p>
                )}
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
// Exakte Zeilenzahl: 521