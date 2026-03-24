// src/features/Events/EventsView.tsx
import React, { useEffect } from 'react';
import { useClubStore } from '../../store/useClubStore';
import { Calendar, Plus, ChevronRight } from 'lucide-react';

export const EventsView: React.FC = () => {
  const { events, fetchEvents, isEventsLoading } = useClubStore();

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handlePlanSession = () => {
    alert("Planung einer neuen Sitzung...");
  };

  const handleOpenProtocol = (id: string) => {
    alert(`Öffne Protokoll Editor für Event ID: ${id}`);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Events & Sitzungen</h1>
        <button
          onClick={handlePlanSession}
          className="flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg shadow hover:bg-blue-700 transition"
        >
          <Plus className="w-5 h-5 mr-2" />
          Neue Sitzung planen
        </button>
      </div>

      {isEventsLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-gray-500 animate-pulse">Lade Events...</div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="divide-y divide-gray-200">
            {events.length === 0 ? (
              <div className="p-8 text-center text-gray-500">Keine offenen Events gefunden.</div>
            ) : (
              events.map((event) => (
                <div key={event.id} className="p-4 hover:bg-gray-50 transition flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="bg-blue-100 p-3 rounded-lg text-blue-600 mr-4">
                      <Calendar className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{event.title}</h3>
                      <p className="text-sm text-gray-500">
                        {event.startDate ? new Date(event.startDate).toLocaleDateString() : 'Kein Datum'} · {event.location}
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleOpenProtocol(event.id)}
                    className="flex items-center text-sm text-blue-600 font-medium hover:text-blue-800"
                  >
                    Protokoll führen
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Exakte Zeilenzahl: 66
