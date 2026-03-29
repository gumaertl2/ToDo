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
import { Plus, DownloadCloud, Globe, Settings, Edit3 } from 'lucide-react';
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
  seriesId?: string;
}

export const CalendarView: React.FC = () => {
  const { calendarEvents, calendarSubscriptions, fetchCalendarData, isCalendarLoading } = useClubStore();
  
  const [calendarTitle, setCalendarTitle] = useState(() => localStorage.getItem('papatodo_calendar_title') || 'Vereinskalender');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState('');

  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [hideEmptyDays, setHideEmptyDays] = useState(true);

  const [currentView, setCurrentView] = useState<'month' | 'week' | 'day' | 'agenda'>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [selectedEventToEdit, setSelectedEventToEdit] = useState<CalendarEvent | undefined>(undefined);
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  // CHIRURGISCHER EINGRIFF: State für die ausgewählte Serie
  const [selectedSeriesId, setSelectedSeriesId] = useState<string | undefined>(undefined);
  
  const [selectedIcsEvent, setSelectedIcsEvent] = useState<AdaptedEvent | undefined>(undefined);
  const [isIcsDetailModalOpen, setIsIcsDetailModalOpen] = useState(false);

  useEffect(() => {
    fetchCalendarData();
  }, [fetchCalendarData]);

  useEffect(() => {
    const ids = ['manual', 'dienste', ...calendarSubscriptions.map(s => s.id)];
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
      seriesId: ev.seriesId,
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

  const filteredEvents = useMemo(() => {
    return rbcEvents.filter(ev => {
      if (ev.sourceId === 'manual') {
        if (ev.seriesId) return activeFilters.includes('dienste');
        return activeFilters.includes('manual');
      }
      return activeFilters.includes(ev.sourceId);
    });
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
      // CHIRURGISCHER EINGRIFF: Die Weiche für Serien!
      if (event.sourceEvent.seriesId) {
        setSelectedSeriesId(event.sourceEvent.seriesId);
        setIsBulkModalOpen(true);
      } else {
        setSelectedEventToEdit(event.sourceEvent);
        setIsEventModalOpen(true);
      }
    }
  };

  const CustomAgendaView = useMemo(() => {
    const View = ({ date, events }: { date: Date, events: AdaptedEvent[] }) => {
      const monthStart = startOfMonth(date);
      const monthEnd = endOfMonth(date);
      const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

      return (
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/30 h-full">
          {daysInMonth.map(day => {
            const dayEvents = events.filter(e => {
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
      );
    };

    View.title = (date: Date) => format(date, 'MMMM yyyy', { locale: de });
    View.navigate = (date: Date, action: string) => {
      switch (action) {
        case 'PREV': return subMonths(date, 1);
        case 'NEXT': return addMonths(date, 1);
        default: return new Date();
      }
    };

    return View;
  }, [hideEmptyDays]);

  return (
    <div className="h-full flex flex-col space-y-3">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white p-3 rounded-xl shadow-sm border border-gray-200">
        
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
            onClick={() => { setSelectedSeriesId(undefined); setIsBulkModalOpen(true); }}
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

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 bg-white px-4 py-2.5 rounded-xl border border-gray-200 shadow-sm">
        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Ansicht:</span>
        <label className="flex items-center space-x-1.5 text-xs cursor-pointer">
          <input type="checkbox" checked={activeFilters.includes('manual')} onChange={() => toggleFilter('manual')} className="rounded w-3.5 h-3.5 text-blue-600 focus:ring-blue-500"/>
          <span className="font-bold text-gray-700">Termine</span>
        </label>
        
        <label className="flex items-center space-x-1.5 text-xs cursor-pointer">
          <input type="checkbox" checked={activeFilters.includes('dienste')} onChange={() => toggleFilter('dienste')} className="rounded w-3.5 h-3.5 text-orange-600 focus:ring-orange-500"/>
          <span className="font-bold text-orange-600">Dienste</span>
        </label>
        
        {calendarSubscriptions.filter(s => s.isActive).map(sub => (
          <label key={sub.id} className="flex items-center space-x-1.5 text-xs cursor-pointer">
            <input type="checkbox" checked={activeFilters.includes(sub.id)} onChange={() => toggleFilter(sub.id)} className="rounded w-3.5 h-3.5 focus:ring-blue-500" style={{ accentColor: sub.color || '#10b981' }}/>
            <span className="font-bold" style={{ color: sub.color || '#10b981' }}>{sub.name}</span>
          </label>
        ))}
        
        {currentView === 'agenda' && (
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
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 p-3 overflow-hidden flex flex-col min-h-[500px]">
          <Calendar
            culture="de"
            localizer={localizer}
            events={filteredEvents} 
            startAccessor="start"
            endAccessor="end"
            view={currentView}
            onView={(view: any) => setCurrentView(view)}
            views={{ month: true, week: true, day: true, agenda: CustomAgendaView }}
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
              agenda: "Spielplan", 
              noEventsInRange: "Keine Termine in diesem Zeitraum.",
              showMore: (total) => `+${total} weitere` 
            }}
            className="font-sans text-gray-700 text-sm"
          />
        </div>
      )}

      {isEventModalOpen && <CalendarEventFormModal existingEvent={selectedEventToEdit} onClose={() => { setIsEventModalOpen(false); setSelectedEventToEdit(undefined); }} />}
      {isSubModalOpen && <CalendarSubscriptionModal onClose={() => setIsSubModalOpen(false)} />}
      {isIcsDetailModalOpen && <CalendarIcsDetailModal event={selectedIcsEvent} onClose={() => setIsIcsDetailModalOpen(false)} />}
      
      {/* CHIRURGISCHER EINGRIFF: Bulk Modal mit bestehender ID aufrufen */}
      {isBulkModalOpen && (
        <CalendarBulkEventModal 
          existingSeriesId={selectedSeriesId} 
          onClose={() => { setIsBulkModalOpen(false); setSelectedSeriesId(undefined); }} 
        />
      )}
    </div>
  );
};
// Exakte Zeilenzahl: 346