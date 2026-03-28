// src/features/Events/CalendarView.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import type { Event as RBCEvent } from 'react-big-calendar';
import { format } from 'date-fns/format';
import { parse } from 'date-fns/parse';
import { startOfWeek } from 'date-fns/startOfWeek';
import { getDay } from 'date-fns/getDay';
import { de } from 'date-fns/locale/de';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { useClubStore } from '../../store/useClubStore';
import { Plus, DownloadCloud, Globe } from 'lucide-react';
import type { CalendarEvent } from '../../core/types/models';
import { CalendarEventFormModal } from './CalendarEventFormModal';
import { CalendarSubscriptionModal } from './CalendarSubscriptionModal';
import { CalendarIcsDetailModal } from './CalendarIcsDetailModal';
import ICAL from 'ical.js';

const locales = {
  'de': de,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: (date: Date) => startOfWeek(date, { weekStartsOn: 1 }), // Montag
  getDay,
  locales,
});

interface AdaptedEvent extends RBCEvent {
  id: string;
  sourceEvent?: CalendarEvent;
  color?: string;
  description?: string;
  location?: string;
}

export const CalendarView: React.FC = () => {
  const { calendarEvents, calendarSubscriptions, fetchCalendarData, isCalendarLoading } = useClubStore();
  
  const [currentView, setCurrentView] = useState<'month' | 'week' | 'day' | 'agenda'>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [selectedEventToEdit, setSelectedEventToEdit] = useState<CalendarEvent | undefined>(undefined);
  
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  
  const [selectedIcsEvent, setSelectedIcsEvent] = useState<AdaptedEvent | undefined>(undefined);
  const [isIcsDetailModalOpen, setIsIcsDetailModalOpen] = useState(false);
  
  const [icsEvents, setIcsEvents] = useState<AdaptedEvent[]>([]);
  const [isIcsLoading, setIsIcsLoading] = useState(false);

  useEffect(() => {
    fetchCalendarData();
  }, [fetchCalendarData]);

  useEffect(() => {
    const loadExternalCalendars = async () => {
      if (calendarSubscriptions.length === 0) {
        setIcsEvents([]);
        return;
      }
      
      setIsIcsLoading(true);
      const parsedEvents: AdaptedEvent[] = [];

      for (const sub of calendarSubscriptions) {
        if (!sub.isActive) continue;
        try {
          let feedUrl = sub.url.trim();
          if (feedUrl.toLowerCase().startsWith('webcal://')) {
            feedUrl = 'https://' + feedUrl.substring(9);
          }

          // CHIRURGISCHER EINGRIFF: Der intelligente Doppel-Proxy-Motor
          const proxyUrls = [
            `https://api.allorigins.win/raw?url=${encodeURIComponent(feedUrl)}`, // Proxy 1 (Für Localhost)
            `https://corsproxy.io/?${encodeURIComponent(feedUrl)}`             // Proxy 2 (Für Vercel Live)
          ];

          let textData = null;

          // Wir probieren die Proxys der Reihe nach durch, bis einer funktioniert
          for (const proxyUrl of proxyUrls) {
            try {
              const response = await fetch(proxyUrl);
              if (response.ok) {
                const data = await response.text();
                if (data.includes('BEGIN:VCALENDAR')) {
                  textData = data;
                  break; // Erfolgreich! Wir können die Schleife abbrechen
                }
              }
            } catch (e) {
              // Wenn der Proxy geblockt wird, versuchen wir lautlos den nächsten
              console.warn(`Proxy-Versuch gescheitert, probiere nächsten...`);
            }
          }

          if (!textData) {
             console.error(`Alle Proxys haben für Abo '${sub.name}' versagt. Bitte URL prüfen.`);
             continue;
          }

          const jcalData = ICAL.parse(textData);
          const comp = new ICAL.Component(jcalData);
          const vevents = comp.getAllSubcomponents('vevent');

          vevents.forEach((vevent: any) => {
            const event = new ICAL.Event(vevent);
            
            if (!event.startDate) return; 
            
            const s = event.startDate;
            const startDate = new Date(s.year, s.month - 1, s.day, s.hour, s.minute);
            
            let endDate = startDate;
            if (event.endDate) {
              const e = event.endDate;
              endDate = new Date(e.year, e.month - 1, e.day, e.hour, e.minute);
            }

            parsedEvents.push({
              id: `ics-${sub.id}-${event.uid}`,
              title: `${event.summary} (${sub.name})`,
              description: event.description || '',
              location: event.location || '',
              start: startDate,
              end: endDate,
              allDay: s.isDate,
              color: sub.color,
            });
          });
        } catch (error) {
          console.error(`Kritischer Fehler beim Parsen von Abo '${sub.name}':`, error);
        }
      }
      
      setIcsEvents(parsedEvents);
      setIsIcsLoading(false);
    };

    loadExternalCalendars();
  }, [calendarSubscriptions]);

  const rbcEvents: AdaptedEvent[] = useMemo(() => {
    const internalEvents = calendarEvents.map(ev => ({
      id: ev.id,
      title: ev.title,
      description: ev.description || '',
      location: ev.location || '',
      start: new Date(ev.startTime),
      end: ev.endTime ? new Date(ev.endTime) : new Date(ev.startTime + (1000 * 60 * 60)), 
      allDay: ev.isAllDay,
      sourceEvent: ev,
      color: ev.color || '#3b82f6' 
    }));
    
    return [...internalEvents, ...icsEvents];
  }, [calendarEvents, icsEvents]);

  const eventStyleGetter = (event: AdaptedEvent) => {
    const backgroundColor = event.color || '#3b82f6';
    return {
      style: {
        backgroundColor,
        borderRadius: '6px',
        opacity: 0.9,
        color: 'white',
        border: 'none',
        display: 'block',
        cursor: 'pointer'
      }
    };
  };

  const handleSelectEvent = (event: AdaptedEvent) => {
    if (event.id.startsWith('ics-')) {
      setSelectedIcsEvent(event);
      setIsIcsDetailModalOpen(true);
      return;
    }
    if (event.sourceEvent) {
      setSelectedEventToEdit(event.sourceEvent);
      setIsEventModalOpen(true);
    }
  };

  return (
    <div className="h-full flex flex-col space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            Vereinskalender
            {isIcsLoading && <span className="ml-3 flex h-3 w-3"><span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-green-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span></span>}
          </h1>
          <p className="text-sm text-gray-500 mt-1">Die zentrale Übersicht aller Spiele, Turniere und Vereinstermine.</p>
        </div>
        
        <div className="flex gap-2 mt-4 sm:mt-0">
          <button 
            onClick={() => alert('Wird in Phase 4 gebaut: Generiert den iFrame-Link für die Homepage!')}
            className="flex items-center px-3 py-2 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg shadow-sm hover:bg-gray-50 transition"
          >
            <Globe className="w-4 h-4 mr-2 text-blue-500" />
            Public Link
          </button>
          <button 
            onClick={() => setIsSubModalOpen(true)}
            className="flex items-center px-3 py-2 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg shadow-sm hover:bg-gray-50 transition"
          >
            <DownloadCloud className="w-4 h-4 mr-2 text-green-500" />
            ICS Abos
          </button>
          <button 
            onClick={() => { setSelectedEventToEdit(undefined); setIsEventModalOpen(true); }}
            className="flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg shadow hover:bg-blue-700 transition"
          >
            <Plus className="w-5 h-5 mr-2" />
            Termin
          </button>
        </div>
      </div>

      <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 p-4 overflow-hidden flex flex-col">
        {isCalendarLoading ? (
          <div className="flex-1 flex items-center justify-center text-gray-400 animate-pulse">
            Lade Vereinskalender...
          </div>
        ) : (
          <div className="flex-1 min-h-[500px]">
            <Calendar
              culture="de"
              localizer={localizer}
              events={rbcEvents}
              startAccessor="start"
              endAccessor="end"
              view={currentView}
              onView={(view: any) => setCurrentView(view)}
              date={currentDate}
              onNavigate={(date) => setCurrentDate(date)}
              eventPropGetter={eventStyleGetter}
              onSelectEvent={handleSelectEvent}
              messages={{
                next: "Vor",
                previous: "Zurück",
                today: "Heute",
                month: "Monat",
                week: "Woche",
                day: "Tag",
                agenda: "Agenda",
                noEventsInRange: "Keine Termine in diesem Zeitraum.",
              }}
              className="font-sans text-gray-700"
            />
          </div>
        )}
      </div>

      {isEventModalOpen && (
        <CalendarEventFormModal 
          existingEvent={selectedEventToEdit} 
          onClose={() => { setIsEventModalOpen(false); setSelectedEventToEdit(undefined); }} 
        />
      )}
      
      {isSubModalOpen && (
        <CalendarSubscriptionModal onClose={() => setIsSubModalOpen(false)} />
      )}

      {isIcsDetailModalOpen && (
        <CalendarIcsDetailModal 
          event={selectedIcsEvent} 
          onClose={() => setIsIcsDetailModalOpen(false)} 
        />
      )}
    </div>
  );
};
// Exakte Zeilenzahl: 265