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
import { Plus, DownloadCloud, Globe, LayoutGrid, List, ChevronLeft, ChevronRight, Calendar as CalIcon, Settings, Edit3 } from 'lucide-react';
import type { CalendarEvent } from '../../core/types/models';
import { CalendarEventFormModal } from './CalendarEventFormModal';
import { CalendarSubscriptionModal } from './CalendarSubscriptionModal';
import { CalendarIcsDetailModal } from './CalendarIcsDetailModal';
import { CalendarBulkEventModal } from './CalendarBulkEventModal';

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
  
  // CHIRURGISCHER EINGRIFF: Eigener Kalender-Titel (wird im LocalStorage des Browsers gespeichert)
  const [calendarTitle, setCalendarTitle] = useState(() => localStorage.getItem('papatodo_calendar_title') || 'Vereinskalender');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState('');

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [hideEmptyDays, setHideEmptyDays] = useState(true);

  const [currentView, setCurrentView] = useState<'month' | 'week' | 'day' | 'agenda'>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [selectedEventToEdit, setSelectedEventToEdit] = useState<CalendarEvent | undefined>(undefined);
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [selectedIcsEvent, setSelectedIcsEvent] = useState<AdaptedEvent | undefined>(undefined);
  const [isIcsDetailModalOpen, setIsIcsDetailModalOpen] = useState(false);

  useEffect(() => {
    fetchCalendarData();
  }, [fetchCalendarData]);

  // Setzt die Filter am Anfang alle auf aktiv
  useEffect(() => {
    const ids = ['manual', ...calendarSubscriptions.map(s => s.id)];
    setActiveFilters(ids);
  }, [calendarSubscriptions]);

  const handleTitleSave = () => {
    const newTitle = tempTitle.trim() || 'Vereinskalender';
    setCalendarTitle(newTitle);
    localStorage.setItem('papatodo_calendar_title', newTitle);
    setIsEditingTitle(false);
  };

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

  // CHIRURGISCHER EINGRIFF: Globale Filterung VOR dem Rendern in Grid ODER Liste
  const filteredEvents = useMemo(() => {
    return rbcEvents.filter(ev => activeFilters.includes(ev.sourceId));
  }, [rbcEvents, activeFilters]);

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

    return (
      <div className="flex-1 flex flex-col bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-white">
          <h2 className="text-lg font-bold text-gray-800 capitalize flex items-center">
            <CalIcon className="w-5 h-5 mr-2 text-blue-600" />
            {format(currentDate, 'MMMM yyyy', { locale: de })}
          </h2>
          <div className="flex items-center gap-1">
            <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition"><ChevronLeft className="w-5 h-5" /></button>
            <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition">Heute</button>
            <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition"><ChevronRight className="w-5 h-5" /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/30">
          {daysInMonth.map(day => {
            const dayEvents = filteredEvents.filter(e => {
              const eStart = startOfDay(e.start!);
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
              <div key={day.toISOString()} className={`bg-white rounded-lg shadow-sm border ${isToday ? 'border-blue-300 ring-1 ring-blue-100' : 'border-gray-200'} overflow-hidden`}>
                <div className={`px-4 py-2 border-b ${isToday ? 'bg-blue-50 border-blue-100' : 'bg-gray-50 border-gray-100'}`}>
                  <h3 className={`text-sm font-bold ${isToday ? 'text-blue-800' : 'text-gray-700'}`}>
                    {format(day, 'EEEE, dd. MMMM yyyy', { locale: de })}
                    {isToday && <span className="ml-2 text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full">Heute</span>}
                  </h3>
                </div>
                
                <div className="p-1.5">
                  {dayEvents.length === 0 ? (
                    <p className="p-2 text-xs text-gray-400 italic text-center">Keine Termine</p>
                  ) : (
                    <div className="space-y-1">
                      {dayEvents.map(e => (
                        <div key={`${e.id}-${day.toISOString()}`} onClick={() => handleSelectEvent(e)} className="flex flex-col sm:flex-row sm:items-center p-2 rounded hover:bg-gray-50 cursor-pointer transition" style={{ borderLeftWidth: '3px', borderLeftColor: e.color || '#3b82f6' }}>
                          <div className="w-20 shrink-0 text-xs font-bold text-gray-500 mb-1 sm:mb-0">
                            {e.allDay ? 'Ganztägig' : `${format(e.start!, 'HH:mm')} Uhr`}
                          </div>
                          <div className="flex-1">
                            <div className="font-bold text-gray-900 text-sm">{e.title}</div>
                            {e.location && <div className="text-xs text-gray-500 mt-0.5 flex items-center">📍 {e.location}</div>}
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
    <div className="h-full flex flex-col space-y-3">
      {/* CHIRURGISCHER EINGRIFF: Kompaktere, aufgeräumte Header-Leiste */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white p-3 rounded-xl shadow-sm border border-gray-200">
        
        {/* Der klickbare, speicherbare Titel */}
        <div className="flex-1">
          {isEditingTitle ? (
            <input
              type="text"
              value={tempTitle}
              onChange={(e) => setTempTitle(e.target.value)}
              onBlur={handleTitleSave}
              onKeyDown={(e) => e.key === 'Enter' && handleTitleSave()}
              className="text-xl sm:text-2xl font-bold text-gray-900 border-b-2 border-blue-500 focus:outline-none bg-transparent w-full max-w-sm"
              autoFocus
              placeholder="Vereinsname eingeben..."
            />
          ) : (
            <h1 
              onClick={() => { setTempTitle(calendarTitle); setIsEditingTitle(true); }}
              className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center cursor-pointer group hover:text-blue-700 transition-colors"
              title="Klicken zum Umbenennen"
            >
              {calendarTitle}
              <Edit3 className="w-4 h-4 ml-2 text-gray-300 group-hover:text-blue-500 transition-colors opacity-0 group-hover:opacity-100" />
            </h1>
          )}
          <p className="text-xs text-gray-500 mt-0.5">Zentrale Übersicht aller Spiele, Turniere und Termine.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          {/* Umschalter für die Ansicht */}
          <div className="flex bg-gray-100 p-1 rounded-lg">
            <button 
              onClick={() => setViewMode('grid')}
              className={`flex items-center px-3 py-1.5 rounded text-xs font-bold transition ${viewMode === 'grid' ? 'bg-white shadow-sm text-blue-700' : 'text-gray-500 hover:text-gray-800'}`}
            >
              <LayoutGrid className="w-4 h-4 mr-1.5" /> Kalender
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={`flex items-center px-3 py-1.5 rounded text-xs font-bold transition ${viewMode === 'list' ? 'bg-white shadow-sm text-blue-700' : 'text-gray-500 hover:text-gray-800'}`}
            >
              <List className="w-4 h-4 mr-1.5" /> Spielplan
            </button>
          </div>

          <div className="w-px h-6 bg-gray-200 hidden sm:block mx-1"></div>

          {/* Kompaktere Aktions-Buttons */}
          <button 
            onClick={() => alert('Wird in Phase 4 gebaut: Generiert den iFrame-Link für die Homepage!')}
            className="flex items-center px-2.5 py-1.5 bg-white border border-gray-300 text-gray-700 text-xs font-bold rounded-lg hover:bg-gray-50 transition shadow-sm"
          >
            <Globe className="w-3.5 h-3.5 mr-1.5 text-blue-500" /> Public Link
          </button>
          <button 
            onClick={() => setIsSubModalOpen(true)}
            className="flex items-center px-2.5 py-1.5 bg-white border border-gray-300 text-gray-700 text-xs font-bold rounded-lg hover:bg-gray-50 transition shadow-sm"
          >
            <DownloadCloud className="w-3.5 h-3.5 mr-1.5 text-green-500" /> Abos
          </button>
          <button 
            onClick={() => setIsBulkModalOpen(true)}
            className="flex items-center px-2.5 py-1.5 bg-orange-50 border border-orange-200 text-orange-700 text-xs font-bold rounded-lg hover:bg-orange-100 transition shadow-sm"
            title="Dienstpläne (z.B. Hallendienst) wochenweise generieren"
          >
            <Settings className="w-3.5 h-3.5 mr-1.5 text-orange-600" /> Dienste
          </button>
          <button 
            onClick={() => { setSelectedEventToEdit(undefined); setIsEventModalOpen(true); }}
            className="flex items-center px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition shadow-sm"
          >
            <Plus className="w-4 h-4 mr-1.5" /> Termin
          </button>
        </div>
      </div>

      {/* CHIRURGISCHER EINGRIFF: Die globale Filter-Leiste (gilt jetzt für Grid UND Liste) */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 bg-white px-4 py-2.5 rounded-xl border border-gray-200 shadow-sm">
        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Ansicht:</span>
        <label className="flex items-center space-x-1.5 text-xs cursor-pointer">
          <input type="checkbox" checked={activeFilters.includes('manual')} onChange={() => toggleFilter('manual')} className="rounded w-3.5 h-3.5 text-blue-600 focus:ring-blue-500"/>
          <span className="font-bold text-gray-700">Interne Termine</span>
        </label>
        
        {calendarSubscriptions.filter(s => s.isActive).map(sub => (
          <label key={sub.id} className="flex items-center space-x-1.5 text-xs cursor-pointer">
            <input type="checkbox" checked={activeFilters.includes(sub.id)} onChange={() => toggleFilter(sub.id)} className="rounded w-3.5 h-3.5 focus:ring-blue-500" style={{ accentColor: sub.color || '#10b981' }}/>
            <span className="font-bold" style={{ color: sub.color || '#10b981' }}>{sub.name}</span>
          </label>
        ))}
        
        {viewMode === 'list' && (
          <>
            <div className="flex-1 min-w-[10px]"></div>
            <label className="flex items-center space-x-1.5 text-xs cursor-pointer sm:border-l border-gray-200 sm:pl-4">
              <input type="checkbox" checked={hideEmptyDays} onChange={(e) => setHideEmptyDays(e.target.checked)} className="rounded w-3.5 h-3.5 text-gray-600 focus:ring-gray-500"/>
              <span className="text-gray-500 font-bold">Leere Tage ausblenden</span>
            </label>
          </>
        )}
      </div>

      {isCalendarLoading ? (
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 flex items-center justify-center text-gray-400 animate-pulse">
          Lade Vereinskalender...
        </div>
      ) : (
        <>
          {viewMode === 'grid' ? (
            <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 p-3 overflow-hidden flex flex-col min-h-[500px]">
              <Calendar
                culture="de"
                localizer={localizer}
                events={filteredEvents} // CHIRURGISCHER EINGRIFF: Nutzt jetzt die global gefilterten Events!
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
                className="font-sans text-gray-700 text-sm"
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
      {isSubModalOpen && <CalendarSubscriptionModal onClose={() => setIsSubModalOpen(false)} />}
      {isIcsDetailModalOpen && <CalendarIcsDetailModal event={selectedIcsEvent} onClose={() => setIsIcsDetailModalOpen(false)} />}
      {isBulkModalOpen && <CalendarBulkEventModal onClose={() => setIsBulkModalOpen(false)} />}
    </div>
  );
};
// Exakte Zeilenzahl: 388