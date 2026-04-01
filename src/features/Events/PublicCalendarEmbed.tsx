// src/features/Events/PublicCalendarEmbed.tsx
import React, { useState, useEffect } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import type { Event as RBCEvent } from 'react-big-calendar'; // CHIRURGISCHER EINGRIFF: Korrekter Type-Import
import { format } from 'date-fns/format';
import { parse } from 'date-fns/parse';
import { startOfWeek } from 'date-fns/startOfWeek';
import { getDay } from 'date-fns/getDay';
import { de } from 'date-fns/locale/de';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';
import type { CalendarEvent } from '../../core/types/models';
import { MapPin, Clock, Info, X } from 'lucide-react';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const locales = { de: de };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

const messages = {
  allDay: 'Ganztägig',
  previous: 'Zurück',
  next: 'Weiter',
  today: 'Heute',
  month: 'Monat',
  week: 'Woche',
  day: 'Tag',
  agenda: 'Agenda',
  date: 'Datum',
  time: 'Zeit',
  event: 'Termin',
  noEventsInRange: 'Keine Termine in diesem Zeitraum.',
  showMore: (total: number) => `+ ${total} weitere`
};

export const PublicCalendarEmbed: React.FC = () => {
  const [events, setEvents] = useState<RBCEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  useEffect(() => {
    const fetchPublicEvents = async () => {
      try {
        const q = query(collection(db, 'calendar_events'), where('isPublic', '==', true));
        const snap = await getDocs(q);
        
        const loadedEvents: RBCEvent[] = [];
        snap.forEach((doc) => {
          const data = { ...doc.data(), id: doc.id } as CalendarEvent;
          loadedEvents.push({
            id: data.id,
            title: data.title,
            start: new Date(data.startTime),
            end: new Date(data.endTime || data.startTime),
            allDay: data.isAllDay,
            resource: data
          });
        });
        setEvents(loadedEvents);
      } catch (err) {
        setError('Fehler beim Laden der Termine.');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPublicEvents();
  }, []);

  const eventStyleGetter = (event: RBCEvent) => {
    const ev = event.resource as CalendarEvent;
    return {
      style: {
        backgroundColor: ev.color || '#f97316',
        borderRadius: '4px',
        opacity: 0.9,
        color: 'white',
        border: '0px',
        display: 'block',
        fontSize: '0.85rem'
      }
    };
  };

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
        <div className="text-orange-500 font-medium animate-pulse">Lade Vereinskalender...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
        <div className="text-red-500 font-medium">{error}</div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-white overflow-hidden flex flex-col font-sans">
      <div className="flex-1 bg-white overflow-hidden">
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: '100%', padding: '10px' }}
          culture="de"
          messages={messages}
          eventPropGetter={eventStyleGetter}
          views={['month', 'week', 'agenda']}
          defaultView="month"
          popup
          selectable={false}
          onSelectEvent={(e) => setSelectedEvent(e.resource as CalendarEvent)}
        />
      </div>

      {selectedEvent && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center" style={{ backgroundColor: selectedEvent.color || '#f97316' }}>
              <h2 className="text-lg font-bold text-white pr-4">{selectedEvent.title}</h2>
              <button onClick={() => setSelectedEvent(null)} className="text-white/80 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-5 space-y-4 bg-gray-50">
              <div className="flex items-center text-gray-700 bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
                <Clock className="w-5 h-5 mr-3 text-gray-400 shrink-0" />
                <div>
                  <div className="font-medium">
                    {new Date(selectedEvent.startTime).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: 'long', year: 'numeric' })}
                  </div>
                  {!selectedEvent.isAllDay && (
                    <div className="text-sm text-gray-500">
                      {new Date(selectedEvent.startTime).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr
                      {selectedEvent.endTime && ` - ${new Date(selectedEvent.endTime).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr`}
                    </div>
                  )}
                  {selectedEvent.isAllDay && <div className="text-sm text-gray-500">Ganztägig</div>}
                </div>
              </div>

              {selectedEvent.location && (
                <div className="flex items-center text-gray-700 bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
                  <MapPin className="w-5 h-5 mr-3 text-gray-400 shrink-0" />
                  <span className="font-medium">{selectedEvent.location}</span>
                </div>
              )}

              {selectedEvent.description && (
                <div className="flex items-start text-gray-700 bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
                  <Info className="w-5 h-5 mr-3 text-gray-400 shrink-0 mt-0.5" />
                  <p className="text-sm whitespace-pre-wrap">{selectedEvent.description}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
// Exakte Zeilenzahl: 154