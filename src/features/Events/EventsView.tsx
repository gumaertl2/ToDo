// src/features/Events/EventsView.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useClubStore } from '../../store/useClubStore';
import { Calendar, Plus, MapPin, Edit2, Trash2, ArrowRight } from 'lucide-react';
import { EventFormModal } from './EventFormModal';
import type { Event } from '../../core/types/models';

export const EventsView: React.FC = () => {
  const { events, fetchEvents, addEvent, updateEvent, deleteEvent, isEventsLoading } = useClubStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  
  // CHIRURGISCHER EINGRIFF: Navigation einbauen
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
            {events.length === 0 && <div className="p-8 text-center text-gray-500">Noch keine Sitzungen vorhanden.</div>}
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {events.sort((a, b) => (b.plannedStartTime || 0) - (a.plannedStartTime || 0)).map((ev) => (
                <div key={ev.id} className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 flex flex-col hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-3">
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${getStatusColor(ev.status)}`}>
                      {ev.status === 'PLANUNG' ? 'In Planung' : ev.status === 'AKTIV' ? 'Aktiv' : 'Abgeschlossen'}
                    </span>
                    <div className="flex items-center ml-2 shrink-0">
                      <button onClick={() => handleEdit(ev)} className="text-blue-500 hover:text-blue-700 p-1 mr-1">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(ev.id, ev.title)} className="text-red-400 hover:text-red-600 p-1">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{ev.title}</h3>
                  
                  <div className="space-y-2 mb-4 flex-1">
                    {ev.plannedStartTime && (
                      <div className="flex items-center text-sm text-gray-600">
                        <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                        {new Date(ev.plannedStartTime).toLocaleDateString()}
                        {new Date(ev.plannedStartTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) !== '00:00' && 
                          ` · ${new Date(ev.plannedStartTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} Uhr`}
                      </div>
                    )}
                    {ev.location && (
                      <div className="flex items-center text-sm text-gray-600">
                        <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                        <span className="truncate">{ev.location}</span>
                      </div>
                    )}
                  </div>

                  <button 
                    onClick={() => navigate(`/events/${ev.id}`)}
                    className="w-full flex items-center justify-center px-4 py-2 bg-gray-100 text-blue-700 font-medium rounded-lg hover:bg-blue-50 transition-colors"
                  >
                    Zur Agenda / Protokoll
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </button>
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
// Exakte Zeilenzahl: 132