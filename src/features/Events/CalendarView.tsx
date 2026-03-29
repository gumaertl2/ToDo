// src/features/Events/CalendarView.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import type { Event as RBCEvent } from 'react-big-calendar';
import { format } from 'date-fns/format';
import { parse } from 'date-fns/parse';
import { startOfWeek } from 'date-fns/startOfWeek';
import { getDay } from 'date-fns/getDay';
import { de } from 'date-fns/locale/de';
import { startOfMonth } from 'date-fns/startOfMonth';
import { endOfMonth } from 'date-fns/endOfMonth';
import { eachDayOfInterval } from 'date-fns/eachDayOfInterval';
import { startOfDay } from 'date-fns/startOfDay';
import { addMonths } from 'date-fns/addMonths';
import { subMonths } from 'date-fns/subMonths';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { useClubStore } from '../../store/useClubStore';
import { Plus, DownloadCloud, Globe, LayoutGrid, List, ChevronLeft, ChevronRight, Calendar as CalIcon } from 'lucide-react';
import type { CalendarEvent } from '../../core/types/models';
import { CalendarEventFormModal } from './CalendarEventFormModal';
import { CalendarSubscriptionModal } from './CalendarSubscriptionModal';
import { CalendarIcsDetailModal } from './CalendarIcsDetailModal';

const locales = {
  'de': de,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: (date: Date) => startOfWeek(date, { weekStartsOn: 1 }), 
  getDay,
  locales,
});

interface AdaptedEvent extends RBCEvent {
  id: string;
  sourceId: string;
  sourceEvent?: CalendarEvent;
  color?: string;
  description?: string;
  location?: string;
}

export const CalendarView: React.FC = () => {
  const { calendarEvents, calendarSubscriptions, fetchCalendarData, isCalendarLoading } = useClubStore();
  
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [hideEmptyDays, setHideEmptyDays] = useState(true);

  const [currentView, setCurrentView] = useState<'month' | 'week' | 'day' | 'agenda'>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [selectedEventToEdit, setSelectedEventToEdit] = useState<CalendarEvent | undefined>(undefined);
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  
  const [selectedIcsEvent, setSelectedIcsEvent] = useState<AdaptedEvent | undefined>(undefined);
  const [isIcsDetailModalOpen, setIsIcsDetailModalOpen] = useState(false);

  useEffect(() => {
    fetchCalendarData();
  }, [fetchCalendarData]);

  useEffect(() => {
    const ids = ['manual', ...calendarSubscriptions.map(s => s.id)];
    setActiveFilters(ids);
  }, [calendarSubscriptions]);

  const toggleFilter = (id: string) => {
    setActiveFilters(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]);
  };

  const rbcEvents: AdaptedEvent[] = useMemo(() => {
    const internalEvents = calendarEvents.map(ev => ({
      id: ev.id,
      sourceId: 'manual',
      title: ev.title,
      description: ev.description || '',
      location: ev.location || '',
      start: new Date(ev.startTime),
      end: ev.endTime ? new Date(ev.endTime) : new Date(ev.startTime + (1000 * 60 * 60)), 
      allDay: ev.isAllDay,
      sourceEvent: ev,
      color: ev.color || '#3b82f6' 
    }));
    
    const cachedExternalEvents = calendarSubscriptions
      .filter(sub => sub.isActive && sub.cachedEvents)
      .flatMap(sub => 
        sub.cachedEvents!.map((ev, index) => ({
          // CHIRURGISCHER EINGRIFF: Index anhängen, um Duplikate durch schlampige ICS-Dateien absolut auszuschließen!
          id: `ics-${sub.id}-${ev.uid}-${index}`,
          sourceId: sub.id,
          title: ev.title,
          description: ev.description || '',
          location: ev.location || '',
          start: new Date(ev.startTime),
          end: new Date(ev.endTime),
          allDay: ev.isAllDay,
          color: sub.color,
        }))
      );
      
    return [...internalEvents, ...cachedExternalEvents];
  }, [calendarEvents, calendarSubscriptions]);

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

  const renderListView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

    const listEvents = rbcEvents.filter(ev => activeFilters.includes(ev.sourceId));

    return (
      <div className="flex-1 flex flex-col bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
          <h2 className="text-xl font-bold text-gray-800 capitalize flex items-center">
            <CalIcon className="w-5 h-5 mr-2 text-blue-600" />
            {format(currentDate, 'MMMM yyyy', { locale: de })}
          </h2>
          <div className="flex items-center gap-2">
            <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"><ChevronLeft className="w-5 h-5" /></button>
            <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition">Heute</button>
            <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"><ChevronRight className="w-5 h-5" /></button>
          </div>
        </div>

        <div className="p-4 border-b border-gray-200 bg-gray-50 flex flex-wrap gap-x-6 gap-y-3 items-center">
          <label className="flex items-center space-x-2 text-sm cursor-pointer">
            <input type="checkbox" checked={activeFilters.includes('manual')} onChange={() => toggleFilter('manual')} className="rounded w-4 h-4 text-blue-600 focus:ring-blue-500"/>
            <span className="font-semibold text-gray-700">Interne Termine</span>
          </label>
          
          {calendarSubscriptions.filter(s => s.isActive).map(sub => (
            <label key={sub.id} className="flex items-center space-x-2 text-sm cursor-pointer">
              <input type="checkbox" checked={activeFilters.includes(sub.id)} onChange={() => toggleFilter(sub.id)} className="rounded w-4 h-4 focus:ring-blue-500" style={{ accentColor: sub.color || '#10b981' }}/>
              <span className="font-semibold" style={{ color: sub.color || '#10b981' }}>{sub.name}</span>
            </label>
          ))}
          
          <div className="flex-1 min-w-[20px]"></div>
          
          <label className="flex items-center space-x-2 text-sm cursor-pointer border-l-2 border-gray-300 pl-4 py-1">
            <input type="checkbox" checked={hideEmptyDays} onChange={(e) => setHideEmptyDays(e.target.checked)} className="rounded w-4 h-4 text-gray-600 focus:ring-gray-500"/>
            <span className="text-gray-600 font-medium">Leere Tage ausblenden</span>
          </label>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-gray-50/30">
          {daysInMonth.map(day => {
            const dayEvents = listEvents.filter(e => {
              const eStart = startOfDay(e.start!);
              
              // CHIRURGISCHER EINGRIFF: Mitternachts-Fix für Ganztagstermine
              let exclusiveEnd = e.end || e.start!;
              if (e.allDay && exclusiveEnd.getTime() > e.start!.getTime()) {
                exclusiveEnd = new Date(exclusiveEnd.getTime() - 1000); 
              }
              const eEnd = startOfDay(exclusiveEnd);
              
              return day >= eStart && day <= eEnd;
            });

            if (hideEmptyDays && dayEvents.length === 0) return null;

            dayEvents.sort((a, b) => {
              if (a.allDay && !b.allDay) return -1;
              if (!a.allDay && b.allDay) return 1;
              return a.start!.getTime() - b.start!.getTime();
            });
            
            const isToday = day.getTime() === startOfDay(new Date()).getTime();

            return (
              <div key={day.toISOString()} className={`bg-white rounded-xl shadow-sm border ${isToday ? 'border-blue-300 ring-1 ring-blue-100' : 'border-gray-200'} overflow-hidden`}>
                <div className={`px-4 py-2 border-b ${isToday ? 'bg-blue-50 border-blue-100' : 'bg-gray-100 border-gray-200'}`}>
                  <h3 className={`text-base font-bold ${isToday ? 'text-blue-800' : 'text-gray-800'}`}>
                    {format(day, 'EEEE, dd. MMMM yyyy', { locale: de })}
                    {isToday && <span className="ml-2 text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full">Heute</span>}
                  </h3>
                </div>
                
                <div className="p-2">
                  {dayEvents.length === 0 ? (
                    <p className="p-3 text-sm text-gray-400 italic text-center">Keine Termine an diesem Tag</p>
                  ) : (
                    <div className="space-y-1">
                      {dayEvents.map(e => (
                        <div key={`${e.id}-${day.toISOString()}`} onClick={() => handleSelectEvent(e)} className="flex flex-col sm:flex-row sm:items-center p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition" style={{ borderLeftWidth: '4px', borderLeftColor: e.color || '#3b82f6' }}>
                          <div className="w-24 shrink-0 text-sm font-bold text-gray-600 mb-1 sm:mb-0">
                            {e.allDay ? 'Ganztägig' : `${format(e.start!, 'HH:mm')} Uhr`}
                          </div>
                          <div className="flex-1">
                            <div className="font-bold text-gray-900 text-base">{e.title}</div>
                            {e.location && <div className="text-xs text-gray-500 mt-1 flex items-center">📍 {e.location}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col space-y-4">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between mb-2 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            Vereinskalender
          </h1>
          <p className="text-sm text-gray-500 mt-1">Die zentrale Übersicht aller Spiele, Turniere und Vereinstermine.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex bg-gray-200/80 p-1 rounded-lg self-start sm:self-center">
            <button 
              onClick={() => setViewMode('grid')}
              className={`flex items-center px-4 py-2 rounded-md text-sm font-bold transition ${viewMode === 'grid' ? 'bg-white shadow-sm text-blue-700' : 'text-gray-600 hover:text-gray-900'}`}
            >
              <LayoutGrid className="w-4 h-4 mr-2" /> Kalender
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={`flex items-center px-4 py-2 rounded-md text-sm font-bold transition ${viewMode === 'list' ? 'bg-white shadow-sm text-blue-700' : 'text-gray-600 hover:text-gray-900'}`}
            >
              <List className="w-4 h-4 mr-2" /> Spielplan
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
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
      </div>

      {isCalendarLoading ? (
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 flex items-center justify-center text-gray-400 animate-pulse">
          Lade Vereinskalender...
        </div>
      ) : (
        <>
          {viewMode === 'grid' ? (
            <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 p-4 overflow-hidden flex flex-col min-h-[500px]">
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
                popup 
                messages={{
                  next: "Vor",
                  previous: "Zurück",
                  today: "Heute",
                  month: "Monat",
                  week: "Woche",
                  day: "Tag",
                  agenda: "Agenda",
                  noEventsInRange: "Keine Termine in diesem Zeitraum.",
                  showMore: (total) => `+${total} weitere` 
                }}
                className="font-sans text-gray-700"
              />
            </div>
          ) : (
            renderListView()
          )}
        </>
      )}

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
// Exakte Zeilenzahl: 351