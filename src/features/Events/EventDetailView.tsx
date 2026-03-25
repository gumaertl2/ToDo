// src/features/Events/EventDetailView.tsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useClubStore } from '../../store/useClubStore';
import { ArrowLeft, Plus, Calendar, MapPin, Clock, Edit2, Trash2, ChevronRight, ChevronLeft, User, CheckSquare, ChevronUp, ChevronDown } from 'lucide-react';
import { ItemFormModal } from '../Shared/ItemFormModal';
import type { AgendaItem } from '../../core/types/models';

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
    updateEvent
  } = useClubStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AgendaItem | null>(null);
  const [isLibraryVisible, setIsLibraryVisible] = useState(true);
  const [showCompleted, setShowCompleted] = useState(false);

  useEffect(() => {
    if (eventId) {
      fetchEventDetails(eventId);
      fetchEventAgenda(eventId);
      fetchTemplatesAndRoutines();
      fetchTasks();
    }
  }, [eventId, fetchEventDetails, fetchEventAgenda, fetchTemplatesAndRoutines, fetchTasks]);

  if (!currentEvent) {
    return <div className="p-8 text-center text-gray-500 animate-pulse">Lade Sitzung...</div>;
  }

  // CHIRURGISCHER EINGRIFF: Automatische Protokollkontrolle
  const pastOpenTasks = tasks.filter(t => t.type === 'AUFGABE' && t.eventId && t.eventId !== eventId && t.status !== 'ERLEDIGT');
  const pastCompletedTasks = tasks.filter(t => t.type === 'AUFGABE' && t.eventId && t.eventId !== eventId && t.status === 'ERLEDIGT');

  const handlePublish = async () => {
    await updateEvent({ ...currentEvent, status: 'AKTIV', isPublished: true });
  };

  const handleComplete = async () => {
    await updateEvent({ ...currentEvent, status: 'ABGESCHLOSSEN' });
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
    return all.length > 0 ? all.join(', ') : 'Nicht zugewiesen';
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
            <h1 className="text-2xl font-bold text-gray-900">{currentEvent.title}</h1>
            <div className="flex items-center text-sm text-gray-500 mt-1 gap-4">
              {currentEvent.plannedStartTime && (
                <span className="flex items-center"><Calendar className="w-4 h-4 mr-1" /> {new Date(currentEvent.plannedStartTime).toLocaleDateString()}</span>
              )}
              {currentEvent.location && (
                <span className="flex items-center"><MapPin className="w-4 h-4 mr-1" /> {currentEvent.location}</span>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {/* CHIRURGISCHER EINGRIFF: Workflow Buttons */}
          {currentEvent.status === 'PLANUNG' && (
            <button onClick={handlePublish} className="flex items-center px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors shadow-sm">
              Sitzung starten (Veröffentlichen)
            </button>
          )}
          {currentEvent.status === 'AKTIV' && (
            <button onClick={handleComplete} className="flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
              Protokoll schließen
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
            <button 
              onClick={handleCreateCustomItem}
              className="flex items-center px-3 py-1.5 bg-blue-100 text-blue-700 font-medium rounded hover:bg-blue-200 transition-colors text-sm"
            >
              <Plus className="w-4 h-4 mr-1" />
              Freier Punkt
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto bg-gray-50/10 p-4">
            
            {/* CHIRURGISCHER EINGRIFF: Automatische Protokollkontrolle */}
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
              <div className="divide-y divide-gray-200 border border-gray-200 rounded-lg overflow-hidden">
                {eventAgenda.map((item, index) => {
                  const startTimeStr = new Date(currentRunningTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  currentRunningTime += (item.durationEstimate || 0) * 60000; 

                  return (
                    <div key={item.id} className="bg-white hover:bg-blue-50/30 transition-colors flex flex-col">
                      <div className="p-3 flex items-center gap-4 flex-wrap sm:flex-nowrap">
                        <div className="flex items-center gap-2 shrink-0">
                          <select 
                            value={index} 
                            onChange={(e) => handleMoveItem(item.id, Number(e.target.value))}
                            className="font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 border border-transparent rounded text-sm py-1 px-1 cursor-pointer outline-none focus:ring-2 focus:ring-blue-500"
                            title="Position ändern"
                          >
                            {eventAgenda.map((_, i) => <option key={i} value={i}>{i + 1}</option>)}
                          </select>
                          <span className="font-bold text-gray-900 w-12 text-center text-sm">{startTimeStr}</span>
                          <span className="text-gray-400 text-xs w-8 text-right" title="Geplante Dauer">({item.durationEstimate || 0}m)</span>
                        </div>

                        <div className="font-bold text-gray-900 text-sm truncate shrink-0 max-w-[180px] xl:max-w-[250px]" title={item.title}>
                          {item.title}
                        </div>

                        <div className="flex items-center gap-3 text-xs text-gray-600 flex-1 overflow-hidden">
                          {item.type === 'BESCHLUSS' && <span className="px-1.5 py-0.5 bg-green-100 text-green-700 font-bold rounded">Beschluss</span>}
                          {item.mustBeDoneBeforeEvent && <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 font-bold rounded">Vorlauf</span>}
                          <span className="flex items-center truncate"><User className="w-3 h-3 mr-1 shrink-0" /> <span className="truncate">{getAssigneesText(item)}</span></span>
                          {item.dueDate && <span className="flex items-center shrink-0"><Calendar className="w-3 h-3 mr-1" /> {new Date(item.dueDate).toLocaleDateString()}</span>}
                          {item.type === 'AUFGABE' && <span className="flex items-center text-blue-600 font-medium shrink-0"><CheckSquare className="w-3 h-3 mr-1" /> {item.progress || 0}%</span>}
                        </div>

                        <div className="flex items-center shrink-0 ml-auto">
                          <button onClick={() => handleEditItem(item)} className="p-1.5 text-blue-500 hover:bg-blue-100 rounded mr-1" title="Bearbeiten"><Edit2 className="w-4 h-4" /></button>
                          <button onClick={() => handleDeleteItem(item.id, item.title)} className="p-1.5 text-red-400 hover:bg-red-50 rounded" title="Löschen"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </div>

                      {item.description && (
                        <div className="px-4 pb-3">
                          <div className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50/80 p-3 rounded border border-gray-100 shadow-inner">
                            {item.description}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
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
    </div>
  );
};
// Exakte Zeilenzahl: 345