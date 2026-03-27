// src/features/Events/EventsView.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useClubStore } from '../../store/useClubStore';
import { Calendar, Plus, MapPin, Edit2, Trash2, ArrowRight, Clock } from 'lucide-react';
import { EventFormModal } from './EventFormModal';
import type { Event } from '../../core/types/models';

export const EventsView: React.FC = () => {
  const { events, fetchEvents, addEvent, updateEvent, deleteEvent, isEventsLoading } = useClubStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [expandedSeries, setExpandedSeries] = useState<Set<string>>(new Set());
  
  const navigate = useNavigate();

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleCreate = () => {
    setEditingEvent(null);
    setIsModalOpen(true);
  };

  const handleEdit = (ev: Event) => {
    setEditingEvent(ev);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string, title: string) => {
    if (window.confirm(`Möchtest du die Sitzung "${title}" wirklich löschen?`)) {
      await deleteEvent(id);
    }
  };

  const handleSave = async (eventData: Event) => {
    let result;
    if (editingEvent) {
      result = await updateEvent(eventData);
    } else {
      result = await addEvent(eventData);
    }
    
    if (!result.success) {
      throw new Error(result.error?.message || 'Speichern fehlgeschlagen');
    }
    setIsModalOpen(false);
    fetchEvents();
  };

  const getStatusColor = (status: Event['status']) => {
    switch(status) {
      case 'PLANUNG': return 'bg-gray-100 text-gray-700';
      case 'AKTIV': return 'bg-green-100 text-green-700';
      case 'ABGESCHLOSSEN': return 'bg-blue-100 text-blue-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const toggleSeries = (seriesId: string) => {
    setExpandedSeries(prev => {
      const next = new Set(prev);
      if (next.has(seriesId)) next.delete(seriesId);
      else next.add(seriesId);
      return next;
    });
  };

  // CHIRURGISCHER EINGRIFF: Intelligente Bündelung nach seriesId
  const getGroupedEvents = () => {
    const seriesMap = new Map<string, Event[]>();
    
    // 1. Alle Events in ihre Serien-Töpfe sortieren
    events.forEach(ev => {
      const sId = ev.seriesId || ev.id;
      if (!seriesMap.has(sId)) seriesMap.set(sId, []);
      seriesMap.get(sId)!.push(ev);
    });

    // 2. Pro Serie das repräsentative "Kopf"-Event bestimmen
    const grouped = Array.from(seriesMap.values()).map(seriesEvents => {
      // Nach Datum absteigend sortieren
      seriesEvents.sort((a, b) => (b.plannedStartTime || 0) - (a.plannedStartTime || 0));
      
      // Das aktive oder geplante Event suchen
      const activeOrPlanned = seriesEvents.find(e => e.status !== 'ABGESCHLOSSEN');
      
      // Wenn es keins gibt, nehmen wir einfach das allerneueste (welches dann abgeschlossen ist)
      const headEvent = activeOrPlanned || seriesEvents[0];
      
      // Zählen, wie viele Historien-Protokolle es in dieser Serie gibt
      const historyEvents = seriesEvents.filter(e => e.status === 'ABGESCHLOSSEN' && e.id !== headEvent.id);
      const totalCompleted = historyEvents.length;
      
      return { headEvent, totalCompleted, historyEvents };
    });

    // 3. Die finalen Kacheln sortieren (die demnächst anstehenden zuerst)
    return grouped.sort((a, b) => (b.headEvent.plannedStartTime || 0) - (a.headEvent.plannedStartTime || 0));
  };

  const groupedEvents = getGroupedEvents();

  return (
    <div className="h-full flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4 sm:mb-0">Events & Sitzungen</h1>
        <button
          onClick={handleCreate}
          className="flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg shadow hover:bg-blue-700 transition"
        >
          <Plus className="w-5 h-5 mr-2" />
          Neue Sitzung anlegen
        </button>
      </div>

      <div className="bg-gray-50 rounded-xl shadow-inner border border-gray-200 flex-1 overflow-hidden flex flex-col p-4">
        {isEventsLoading ? (
          <div className="p-8 text-center text-gray-500 animate-pulse">Lade Sitzungen...</div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {groupedEvents.length === 0 && <div className="p-8 text-center text-gray-500">Noch keine Sitzungen vorhanden.</div>}
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {groupedEvents.map(({ headEvent: ev, totalCompleted, historyEvents }) => (
                <div key={ev.id} className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 flex flex-col hover:shadow-md transition-shadow relative">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex flex-col gap-1 items-start">
                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${getStatusColor(ev.status)}`}>
                        {ev.status === 'PLANUNG' ? 'In Planung' : ev.status === 'AKTIV' ? 'Aktiv' : 'Abgeschlossen'}
                      </span>
                    </div>
                    <div className="flex items-center ml-2 shrink-0">
                      <button onClick={() => handleEdit(ev)} className="text-blue-500 hover:text-blue-700 p-1 mr-1">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(ev.id, ev.title)} className="text-red-400 hover:text-red-600 p-1">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  <h3 className="text-lg font-bold text-gray-900 mb-1 leading-tight">{ev.title}</h3>
                  
                  {/* CHIRURGISCHER EINGRIFF: Das kleine Historien-Badge klickbar machen */}
                  {totalCompleted > 0 && (
                    <button 
                      onClick={() => toggleSeries(ev.seriesId || ev.id)}
                      className="flex items-center text-[11px] text-gray-500 font-medium mb-3 bg-gray-50 self-start px-2 py-0.5 rounded border border-gray-200 hover:bg-gray-100 transition-colors cursor-pointer"
                    >
                      <Clock className="w-3 h-3 mr-1" />
                      {totalCompleted} {totalCompleted === 1 ? 'altes Protokoll' : 'alte Protokolle'}
                    </button>
                  )}
                  
                  <div className="space-y-2 mb-4 flex-1 mt-2">
                    {ev.plannedStartTime && (
                      <div className="flex items-center text-sm text-gray-600">
                        <Calendar className="w-4 h-4 mr-2 text-gray-400 shrink-0" />
                        {new Date(ev.plannedStartTime).toLocaleDateString()}
                        {new Date(ev.plannedStartTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) !== '00:00' && 
                          ` · ${new Date(ev.plannedStartTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} Uhr`}
                      </div>
                    )}
                    {ev.location && (
                      <div className="flex items-center text-sm text-gray-600">
                        <MapPin className="w-4 h-4 mr-2 text-gray-400 shrink-0" />
                        <span className="truncate">{ev.location}</span>
                      </div>
                    )}
                  </div>

                  <button 
                    onClick={() => navigate(`/events/${ev.id}`)}
                    className="w-full flex items-center justify-center px-4 py-2 bg-gray-100 text-blue-700 font-medium rounded-lg hover:bg-blue-50 transition-colors mb-2"
                  >
                    Zur Agenda / Protokoll
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </button>
                  
                  {/* CHIRURGISCHER EINGRIFF: Das Archiv-Dropdown */}
                  {expandedSeries.has(ev.seriesId || ev.id) && historyEvents.length > 0 && (
                    <div className="mt-2 pt-3 border-t border-gray-100 flex flex-col gap-2">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Archiv ({totalCompleted})</span>
                      {historyEvents.map(hist => (
                        <div key={hist.id} className="flex items-center justify-between bg-gray-50 p-2 rounded border border-gray-100">
                          <div className="flex flex-col overflow-hidden mr-2">
                            <span className="text-xs font-medium text-gray-700 truncate">{hist.title}</span>
                            <span className="text-[10px] text-gray-500">
                              {hist.plannedStartTime ? new Date(hist.plannedStartTime).toLocaleDateString() : 'Kein Datum'}
                            </span>
                          </div>
                          <button
                            onClick={() => navigate(`/events/${hist.id}`)}
                            className="text-blue-500 hover:text-blue-700 p-1 shrink-0 bg-white rounded shadow-sm border border-gray-100"
                            title="Zum Protokoll"
                          >
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <EventFormModal 
        key={editingEvent ? editingEvent.id : 'new'}
        isOpen={isModalOpen} 
        existingEvent={editingEvent || undefined}
        onClose={() => setIsModalOpen(false)} 
        onSave={handleSave} 
      />
    </div>
  );
};
// Exakte Zeilenzahl: 221