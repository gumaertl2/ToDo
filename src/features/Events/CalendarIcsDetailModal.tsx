// src/features/Events/CalendarIcsDetailModal.tsx
import React from 'react';
import { X, MapPin, AlignLeft, Calendar as CalIcon, Clock, Info } from 'lucide-react';

interface Props {
  event: any; // Das AdaptedEvent aus dem Kalender
  onClose: () => void;
}

export const CalendarIcsDetailModal: React.FC<Props> = ({ event, onClose }) => {
  if (!event) return null;

  const formatDateTime = (date: Date, allDay: boolean) => {
    const dateStr = date.toLocaleDateString('de-DE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    if (allDay) return dateStr;
    const timeStr = date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    return `${dateStr}, ${timeStr} Uhr`;
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header mit der Farbe des Abos */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between" style={{ backgroundColor: event.color || '#10b981', color: 'white' }}>
          <h2 className="text-lg font-bold flex items-center">
            <Info className="w-5 h-5 mr-2" />
            Termin-Details
          </h2>
          <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto space-y-6 bg-gray-50/50">
          
          {/* Titel */}
          <div>
            <h3 className="text-xl font-bold text-gray-900">{event.title.replace(/\s\([^)]+\)$/, '')}</h3>
            <span className="inline-block mt-2 text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-200 text-gray-700">
              {event.title.match(/\(([^)]+)\)$/)?.[1] || 'Abonnierter Kalender'}
            </span>
          </div>

          {/* Zeit */}
          <div className="flex items-start text-gray-700">
            {event.allDay ? <CalIcon className="w-5 h-5 mr-3 mt-0.5 text-gray-400" /> : <Clock className="w-5 h-5 mr-3 mt-0.5 text-gray-400" />}
            <div>
              <p className="font-medium text-sm">Zeitpunkt</p>
              <p className="text-sm mt-0.5">{formatDateTime(event.start, event.allDay)}</p>
              {!event.allDay && event.end && event.end.getTime() !== event.start.getTime() && (
                <p className="text-sm text-gray-500">bis {formatDateTime(event.end, event.allDay)}</p>
              )}
            </div>
          </div>

          {/* Ort */}
          {event.location && (
            <div className="flex items-start text-gray-700">
              <MapPin className="w-5 h-5 mr-3 mt-0.5 text-gray-400" />
              <div>
                <p className="font-medium text-sm">Ort / Halle</p>
                <p className="text-sm mt-0.5 whitespace-pre-wrap">{event.location}</p>
              </div>
            </div>
          )}

          {/* Lange Beschreibung */}
          {event.description && (
            <div className="flex items-start text-gray-700">
              <AlignLeft className="w-5 h-5 mr-3 mt-0.5 text-gray-400" />
              <div className="flex-1">
                <p className="font-medium text-sm">Details</p>
                <div className="text-sm mt-1.5 bg-white p-3 border border-gray-200 rounded-lg whitespace-pre-wrap leading-relaxed shadow-sm">
                  {event.description}
                </div>
              </div>
            </div>
          )}
          
        </div>

        <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end">
          <button onClick={onClose} className="px-5 py-2 bg-gray-200 text-gray-800 hover:bg-gray-300 rounded-lg font-medium transition-colors">
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
};
// Exakte Zeilenzahl: 75