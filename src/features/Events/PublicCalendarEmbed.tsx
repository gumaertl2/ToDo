// 2026-04-15 21:10 - FEATURE: Aufgeräumte Filter-Leiste & Historien-Schalter nachgerüstet
// src/features/Events/PublicCalendarEmbed.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import type { Event as RBCEvent } from 'react-big-calendar';
import { format } from 'date-fns/format';
import { parse } from 'date-fns/parse';
import { startOfWeek } from 'date-fns/startOfWeek';
import { endOfWeek } from 'date-fns/endOfWeek';
import { getDay } from 'date-fns/getDay';
import { startOfMonth } from 'date-fns/startOfMonth';
import { endOfMonth } from 'date-fns/endOfMonth';
import { eachDayOfInterval } from 'date-fns/eachDayOfInterval';
import { startOfDay } from 'date-fns/startOfDay';
import { isSameMonth, addMonths, subMonths, addWeeks, subWeeks, addDays, subDays, addYears, subYears, getISOWeek } from 'date-fns';
import { de } from 'date-fns/locale/de';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { Printer, Menu, ChevronLeft, ChevronRight, Home, List as ListIcon, CalendarDays, MapPin, Clock, Info, X } from 'lucide-react';
import type { CalendarEvent, CalendarSubscription, Event } from '../../core/types/models';

const locales = { 'de': de };

const localizer = dateFnsLocalizer({
  format, parse, startOfWeek: (date: Date) => startOfWeek(date, { weekStartsOn: 1 }), getDay, locales,
});

const getContrastYIQ = (hexcolor?: string) => {
  if (!hexcolor || !hexcolor.startsWith('#')) return 'white';
  const hex = hexcolor.replace('#', '');
  if (hex.length !== 6 && hex.length !== 3) return 'white';
  let r = 0, g = 0, b = 0;
  if (hex.length === 3) {
    r = parseInt(hex[0] + hex[0], 16);
    g = parseInt(hex[1] + hex[1], 16);
    b = parseInt(hex[2] + hex[2], 16);
  } else {
    r = parseInt(hex.slice(0, 2), 16);
    g = parseInt(hex.slice(2, 4), 16);
    b = parseInt(hex.slice(4, 6), 16);
  }
  const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
  return (yiq >= 128) ? '#1f2937' : 'white';
};

interface AdaptedEvent extends RBCEvent {
  id: string; sourceId: string; sourceEvent?: CalendarEvent; rawSitzung?: Event; color?: string; description?: string; location?: string; seriesId?: string; showInMatchPlan?: boolean;
}

export const PublicCalendarEmbed: React.FC = () => {
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [sitzungen, setSitzungen] = useState<Event[]>([]);
  const [calendarSubscriptions, setCalendarSubscriptions] = useState<CalendarSubscription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const calendarTitle = 'Vereinskalender';

  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [hideEmptyDays, setHideEmptyDays] = useState(true);
  
  // CHIRURGISCHER EINGRIFF: Historien-Schalter nachgerüstet
  const [showPastEvents, setShowPastEvents] = useState(false);

  const [currentView, setCurrentView] = useState<'month' | 'week' | 'day' | 'agenda' | 'termine' | 'dienste'>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const [selectedEventToView, setSelectedEventToView] = useState<AdaptedEvent | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);

  useEffect(() => {
    const fetchPublicData = async () => {
      try {
        const eventsQ = query(collection(db, 'calendar_events'), where('isPublic', '==', true));
        const eventsSnap = await getDocs(eventsQ);
        const loadedEvents = eventsSnap.docs.map(doc => ({ ...doc.data(), id: doc.id } as CalendarEvent));
        setCalendarEvents(loadedEvents);

        const sitzQ = query(collection(db, 'events'), where('isPublished', '==', true));
        const sitzSnap = await getDocs(sitzQ);
        const loadedSitzungen = sitzSnap.docs.map(doc => ({ ...doc.data(), id: doc.id } as Event));
        setSitzungen(loadedSitzungen);

        const subsSnap = await getDocs(collection(db, 'calendar_subscriptions'));
        const loadedSubs = subsSnap.docs.map(doc => ({ ...doc.data(), id: doc.id } as CalendarSubscription));
        const sortedSubs = loadedSubs.sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999));
        setCalendarSubscriptions(sortedSubs);

        const ids = ['manual', 'dienste', ...sortedSubs.map(s => s.id)];
        setActiveFilters(ids);
      } catch (err) {
        console.error("Fehler beim Laden der öffentlichen Daten:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPublicData();
  }, []);

  const toggleFilter = (id: string) => {
    setActiveFilters(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]);
  };

  const handleViewChange = (v: any) => {
    setCurrentView(v);
    if (v === 'dienste' && !activeFilters.includes('dienste')) setActiveFilters(prev => [...prev, 'dienste']);
    if (v === 'termine' && !activeFilters.includes('manual')) setActiveFilters(prev => [...prev, 'manual']);
  };

  const handleNavPrev = () => {
    if (['termine', 'dienste'].includes(currentView)) setCurrentDate(subYears(currentDate, 1));
    else if (currentView === 'month' || currentView === 'agenda') setCurrentDate(subMonths(currentDate, 1));
    else if (currentView === 'week') setCurrentDate(subWeeks(currentDate, 1));
    else setCurrentDate(subDays(currentDate, 1));
  };

  const handleNavNext = () => {
    if (['termine', 'dienste'].includes(currentView)) setCurrentDate(addYears(currentDate, 1));
    else if (currentView === 'month' || currentView === 'agenda') setCurrentDate(addMonths(currentDate, 1));
    else if (currentView === 'week') setCurrentDate(addWeeks(currentDate, 1));
    else setCurrentDate(addDays(currentDate, 1));
  };

  const handleTouchStart = (e: React.TouchEvent) => { setTouchStart(e.targetTouches[0].clientX); };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const touchEnd = e.changedTouches[0].clientX;
    const diff = touchStart - touchEnd;
    if (diff > 70) handleNavNext();
    if (diff < -70) handleNavPrev();
    setTouchStart(null);
  };

  const rbcEvents: AdaptedEvent[] = useMemo(() => {
    const internalEvents = calendarEvents.map(ev => ({
      id: ev.id, sourceId: 'manual', seriesId: ev.seriesId, title: ev.title, description: ev.description || '', location: ev.location || '',
      start: new Date(ev.startTime), end: ev.endTime ? new Date(ev.endTime) : new Date(ev.startTime + (1000 * 60 * 60)), 
      allDay: ev.isAllDay, sourceEvent: ev, color: ev.color || '#3b82f6',
      showInMatchPlan: ev.showInMatchPlan
    }));
    
    const publicSitzungen = sitzungen.filter(ev => ev.plannedStartTime && ev.status !== 'ABGESCHLOSSEN').map(ev => ({
      id: ev.id, sourceId: 'manual', seriesId: undefined, title: `Sitzung: ${ev.title}`, description: ev.description || '', location: ev.location || '',
      start: new Date(ev.plannedStartTime!), end: ev.plannedEndTime ? new Date(ev.plannedEndTime) : new Date(ev.plannedStartTime! + (1000 * 60 * 60 * 2)), 
      allDay: false, rawSitzung: ev, color: '#8b5cf6',
      showInMatchPlan: false
    }));

    const cachedExternalEvents = calendarSubscriptions.filter(sub => sub.isActive && sub.cachedEvents).flatMap(sub => 
        sub.cachedEvents!.map((ev, index) => ({
          id: `ics-${sub.id}-${ev.uid}-${index}`, sourceId: sub.id, title: ev.title, description: ev.description || '', location: ev.location || '',
          start: new Date(ev.startTime), end: new Date(ev.endTime), allDay: ev.isAllDay, color: sub.color,
          showInMatchPlan: sub.showInMatchPlan
        }))
      );
    return [...internalEvents, ...publicSitzungen, ...cachedExternalEvents];
  }, [calendarEvents, sitzungen, calendarSubscriptions]);

  const filteredEvents = useMemo(() => {
    const todayStart = startOfDay(new Date()).getTime();
    const isListView = ['termine', 'dienste', 'agenda'].includes(currentView);

    return rbcEvents.filter(ev => {
      if (currentView === 'agenda' && !ev.showInMatchPlan) {
        return false;
      }

      // CHIRURGISCHER EINGRIFF: Historien-Filterung für externe Besucher
      if (isListView && !showPastEvents) {
        let exclusiveEnd = ev.end || ev.start!;
        if (ev.allDay && exclusiveEnd.getTime() > ev.start!.getTime()) {
          exclusiveEnd = new Date(exclusiveEnd.getTime() - 1000);
        }
        if (exclusiveEnd.getTime() < todayStart) {
          return false;
        }
      }

      if (ev.sourceId === 'manual') return ev.seriesId ? activeFilters.includes('dienste') : activeFilters.includes('manual');
      return activeFilters.includes(ev.sourceId);
    });
  }, [rbcEvents, activeFilters, currentView, showPastEvents]);

  const displayEvents = useMemo(() => {
    if (currentView === 'termine') return filteredEvents.filter(e => e.sourceId === 'manual' && !e.seriesId);
    if (currentView === 'dienste') return filteredEvents.filter(e => !!e.seriesId);
    return filteredEvents;
  }, [filteredEvents, currentView]);

  const eventStyleGetter = (event: AdaptedEvent) => ({ 
    style: { 
      backgroundColor: event.color || '#3b82f6', 
      borderRadius: '6px', 
      opacity: 0.9, 
      color: getContrastYIQ(event.color || '#3b82f6'), 
      border: 'none', 
      display: 'block', 
      cursor: 'pointer' 
    } 
  });

  const handleSelectEvent = (event: AdaptedEvent) => {
    setSelectedEventToView(event);
  };

  const getNavLabel = () => {
    if (['termine', 'dienste'].includes(currentView)) return format(currentDate, 'yyyy', { locale: de });
    if (currentView === 'day') return format(currentDate, 'EEEE, dd.MM.yyyy', { locale: de });
    if (currentView === 'week') {
      const wStart = startOfWeek(currentDate, { weekStartsOn: 1 });
      const wEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
      return `${format(wStart, 'dd.MM.')} - ${format(wEnd, 'dd.MM.yyyy', { locale: de })}`;
    }
    return format(currentDate, 'MMMM yyyy', { locale: de });
  };

  const renderYearlyList = () => {
    const yearEvents = displayEvents.filter(e => e.start!.getFullYear() === currentDate.getFullYear());
    yearEvents.sort((a, b) => {
      if (a.start!.getTime() !== b.start!.getTime()) return a.start!.getTime() - b.start!.getTime();
      if (a.allDay && !b.allDay) return -1;
      if (!a.allDay && b.allDay) return 1;
      return 0;
    });

    if (yearEvents.length === 0) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center text-gray-400 h-full p-8">
          <CalendarDays className="w-12 h-12 mb-3 opacity-20" />
          <p>Keine {currentView === 'termine' ? 'Termine' : 'Dienste'} für {currentDate.getFullYear()} gefunden.</p>
        </div>
      );
    }

    const isDienste = currentView === 'dienste';

    return (
      <div className="flex flex-col w-full h-full">
        <div className="flex justify-end mb-3 shrink-0 px-1 pt-1 print:hidden">
          <button onClick={() => window.print()} className="flex items-center px-3 py-1.5 bg-white border border-gray-300 text-gray-700 text-sm font-bold rounded-lg hover:bg-gray-50 transition shadow-sm">
            <Printer className="w-4 h-4 mr-2 text-gray-600" /> Liste drucken
          </button>
        </div>
        
        <div className="overflow-y-auto overflow-x-auto w-full flex-1 custom-scrollbar pb-4 print:overflow-visible">
          <table className="w-full text-left border-collapse min-w-[600px] print:min-w-full">
            <thead className="sticky top-0 bg-white shadow-sm z-10 print:static">
              <tr className="border-b-2 border-gray-800 text-sm">
                {isDienste ? (
                  <>
                    <th className="py-3 px-4 font-bold text-gray-700 w-16">KW</th>
                    <th className="py-3 px-4 font-bold text-gray-700 w-32">Start</th>
                    <th className="py-3 px-4 font-bold text-gray-700 w-32">Ende</th>
                    <th className="py-3 px-4 font-bold text-gray-700">Dienst</th>
                  </>
                ) : (
                  <>
                    <th className="py-3 px-4 font-bold text-gray-700 w-32">Datum</th>
                    <th className="py-3 px-4 font-bold text-gray-700 w-32">Zeit</th>
                    <th className="py-3 px-4 font-bold text-gray-700">Termin</th>
                    <th className="py-3 px-4 font-bold text-gray-700 w-48">Ort</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {yearEvents.map(e => {
                const startD = e.start!;
                
                if (isDienste) {
                  const actualEnd = e.sourceEvent?.endTime ? new Date(e.sourceEvent.endTime) : startD;
                  const kw = getISOWeek(startD);
                  
                  return (
                    <tr key={e.id} className="border-b border-gray-100 hover:bg-blue-50 cursor-pointer transition-colors group" onClick={() => handleSelectEvent(e)}>
                      <td className="py-3 px-4 text-gray-900 font-medium whitespace-nowrap">{kw}</td>
                      <td className="py-3 px-4 text-gray-600 whitespace-nowrap">{format(startD, 'dd.MM.yyyy', { locale: de })}</td>
                      <td className="py-3 px-4 text-gray-600 whitespace-nowrap">{format(actualEnd, 'dd.MM.yyyy', { locale: de })}</td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-gray-900 group-hover:text-blue-700 transition-colors">
                          <span className="inline-block w-3 h-3 rounded-full mr-2" style={{ backgroundColor: e.color || '#3b82f6' }}></span>
                          {e.title}
                        </div>
                      </td>
                    </tr>
                  );
                } else {
                  const dateStr = format(startD, 'dd.MM.yyyy', { locale: de });
                  let timeStr = 'Ganztägig';
                  if (!e.allDay) {
                    timeStr = format(startD, 'HH:mm');
                    if (e.sourceEvent?.endTime && e.sourceEvent.endTime !== e.sourceEvent.startTime) {
                       timeStr += ' - ' + format(new Date(e.sourceEvent.endTime), 'HH:mm');
                    } else if (e.rawSitzung?.plannedEndTime) {
                       timeStr += ' - ' + format(new Date(e.rawSitzung.plannedEndTime), 'HH:mm');
                    } else if (!e.sourceEvent && !e.rawSitzung && e.end && format(e.end, 'HH:mm') !== format(startD, 'HH:mm')) {
                       timeStr += ' - ' + format(e.end, 'HH:mm');
                    }
                  }
                  
                  return (
                    <tr key={e.id} className="border-b border-gray-100 hover:bg-blue-50 cursor-pointer transition-colors group" onClick={() => handleSelectEvent(e)}>
                      <td className="py-3 px-4 text-gray-900 font-medium whitespace-nowrap">{dateStr}</td>
                      <td className="py-3 px-4 text-gray-600 whitespace-nowrap">{timeStr}</td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-gray-900 group-hover:text-blue-700 transition-colors">
                          <span className="inline-block w-3 h-3 rounded-full mr-2" style={{ backgroundColor: e.color || '#3b82f6' }}></span>
                          {e.title}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-600 truncate max-w-[200px]" title={e.location}>{e.location}</td>
                    </tr>
                  );
                }
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const CustomAgendaView = useMemo(() => {
    const View = ({ date, events }: { date: Date, events: AdaptedEvent[] }) => {
      const monthStart = startOfMonth(date);
      const monthEnd = endOfMonth(date);
      const today = startOfDay(new Date());

      let rangeStart = monthStart;
      if (!showPastEvents && isSameMonth(date, new Date())) {
        rangeStart = today;
      }

      const daysInMonth = eachDayOfInterval({ start: rangeStart, end: monthEnd });
      
      return (
        <div className="flex-1 overflow-y-auto p-2 sm:p-4 space-y-4 bg-gray-50/30 h-full print:bg-white print:overflow-visible">
          {daysInMonth.map(day => {
            const dayEvents = events.filter(e => {
              const eStart = startOfDay(e.start!);
              let exclusiveEnd = e.end || e.start!;
              if (e.allDay && exclusiveEnd.getTime() > e.start!.getTime()) exclusiveEnd = new Date(exclusiveEnd.getTime() - 1000); 
              return day >= eStart && day <= startOfDay(exclusiveEnd);
            });
            if (hideEmptyDays && dayEvents.length === 0) return null;
            dayEvents.sort((a, b) => { if (a.allDay && !b.allDay) return -1; if (!a.allDay && b.allDay) return 1; return a.start!.getTime() - b.start!.getTime(); });
            const isToday = day.getTime() === today.getTime();
            return (
              <div key={day.toISOString()} className={`bg-white rounded-lg shadow-sm border ${isToday ? 'border-blue-300 ring-2 ring-blue-100' : 'border-gray-200'} overflow-hidden print:border-b print:shadow-none print:rounded-none`}>
                <div className={`px-4 py-2 border-b ${isToday ? 'bg-blue-50 border-blue-100' : 'bg-gray-50 border-gray-100'} print:bg-transparent print:border-black`}>
                  <h3 className={`text-sm font-bold ${isToday ? 'text-blue-800 print:text-black' : 'text-gray-700 print:text-black'}`}>
                    {format(day, 'EEEE, dd. MMMM yyyy', { locale: de })}
                    {isToday && <span className="ml-2 text-[10px] uppercase tracking-wider font-bold bg-blue-600 text-white px-2 py-0.5 rounded-full print:hidden">Heute</span>}
                  </h3>
                </div>
                <div className="p-1.5">
                  {dayEvents.length === 0 ? <p className="p-2 text-xs text-gray-400 italic text-center print:hidden">Keine Termine</p> : (
                    <div className="space-y-1">
                      {dayEvents.map(e => (
                        <div key={`${e.id}-${day.toISOString()}`} onClick={() => handleSelectEvent(e)} className="flex flex-col sm:flex-row sm:items-center p-2 rounded hover:bg-gray-50 cursor-pointer transition print:border-l-[4px]" style={{ borderLeftWidth: '4px', borderLeftColor: e.color || '#3b82f6' }}>
                          <div className="w-20 shrink-0 text-xs font-bold text-gray-500 mb-1 sm:mb-0 print:text-black">{e.allDay ? 'Ganztägig' : `${format(e.start!, 'HH:mm')} Uhr`}</div>
                          <div className="flex-1"><div className="font-bold text-gray-900 text-sm print:text-black">{e.title}</div>{e.location && <div className="text-xs text-gray-500 mt-0.5 flex items-center print:text-black">📍 {e.location}</div>}</div>
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
    View.title = () => ''; View.navigate = () => new Date(); return View;
  }, [hideEmptyDays, showPastEvents]);

  // CHIRURGISCHER EINGRIFF: Neues, aufgeräumtes Layout für die öffentliche Filterleiste
  const renderFilters = () => (
    <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-y-3 p-3 bg-gray-50 lg:bg-white rounded-xl lg:border border-gray-200 lg:shadow-sm">
      
      {/* LINKE SEITE: Kalender-Abos */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider w-full sm:w-auto">Kalender-Abos:</span>
        {calendarSubscriptions.filter(s => s.isActive).length === 0 && <span className="text-sm text-gray-500 italic">Keine aktiv</span>}
        {calendarSubscriptions.filter(s => s.isActive).map(sub => (
          <label key={sub.id} className="flex items-center space-x-2 text-sm cursor-pointer">
            <input type="checkbox" checked={activeFilters.includes(sub.id)} onChange={() => toggleFilter(sub.id)} className="rounded w-4 h-4 focus:ring-blue-500" style={{ accentColor: sub.color || '#10b981' }}/>
            <span className="font-bold" style={{ color: sub.color || '#10b981' }}>{sub.name}</span>
          </label>
        ))}
      </div>
      
      {/* RECHTE SEITE: Interne Filter & Anzeige-Optionen */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 xl:border-l border-gray-200 xl:pl-4 w-full xl:w-auto pt-2 xl:pt-0 border-t xl:border-t-0 border-gray-100">
        <label className="flex items-center space-x-2 text-sm cursor-pointer">
          <input type="checkbox" checked={activeFilters.includes('manual')} onChange={() => toggleFilter('manual')} className="rounded w-4 h-4 text-blue-600 focus:ring-blue-500"/>
          <span className="font-bold text-gray-700">Termine</span>
        </label>
        <label className="flex items-center space-x-2 text-sm cursor-pointer">
          <input type="checkbox" checked={activeFilters.includes('dienste')} onChange={() => toggleFilter('dienste')} className="rounded w-4 h-4 text-orange-600 focus:ring-orange-500"/>
          <span className="font-bold text-orange-600">Dienste</span>
        </label>
        
        {['agenda', 'termine', 'dienste'].includes(currentView) && (
          <label className="flex items-center space-x-2 text-sm cursor-pointer">
            <input type="checkbox" checked={hideEmptyDays} onChange={(e) => setHideEmptyDays(e.target.checked)} className="rounded w-4 h-4 text-gray-600 focus:ring-gray-500"/>
            <span className="text-gray-600 font-bold">Leere Tage</span>
          </label>
        )}

        <label className="flex items-center space-x-2 text-sm cursor-pointer">
          <input type="checkbox" checked={showPastEvents} onChange={(e) => setShowPastEvents(e.target.checked)} className="rounded w-4 h-4 text-purple-600 focus:ring-purple-500"/>
          <span className="text-gray-600 font-bold">Historie</span>
        </label>
      </div>
      
    </div>
  );

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gray-50">
        <div className="text-blue-500 font-medium animate-pulse">Lade Kalender...</div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col space-y-3 relative bg-gray-50 p-2 sm:p-4 overflow-hidden font-sans">
      <div className="flex items-center justify-between bg-white p-3 sm:p-4 rounded-xl shadow-sm border border-gray-200 z-10 relative print:hidden">
        <div className="flex-1">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center truncate pr-2">
            {calendarTitle}
          </h1>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="lg:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg"><Menu className="w-6 h-6" /></button>
        <div className="hidden lg:flex flex-wrap items-center gap-2">
          <button onClick={() => window.print()} className="flex items-center px-4 py-2 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors shadow-sm">
            <Printer className="w-4 h-4 mr-2 text-gray-600" /> Drucken
          </button>
        </div>
      </div>
      
      {isMobileMenuOpen && (
        <div className="lg:hidden flex flex-col gap-3 p-4 bg-white rounded-xl shadow-lg border border-gray-200 z-20 absolute top-16 left-2 right-2 print:hidden">
          <button onClick={() => { setIsMobileMenuOpen(false); window.print(); }} className="flex items-center w-full px-3 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-bold rounded-lg hover:bg-gray-50 transition shadow-sm justify-center">
            <Printer className="w-4 h-4 mr-2 text-gray-600" /> Drucken
          </button>
          <div className="border-t border-gray-100 pt-3">{renderFilters()}</div>
        </div>
      )}
      
      <div className="hidden lg:block print:hidden">{renderFilters()}</div>
      
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between bg-white p-2 rounded-xl shadow-sm border border-gray-200 gap-2 print:hidden">
        <div className="flex items-center justify-between sm:justify-start gap-1 flex-1">
          <button onClick={handleNavPrev} className="p-3 sm:p-2 bg-gray-50 rounded-lg text-gray-700 border border-gray-200 hover:bg-gray-100"><ChevronLeft className="w-5 h-5"/></button>
          <button onClick={() => setCurrentDate(new Date())} className="p-3 sm:p-2 bg-blue-50 rounded-lg text-blue-700 border border-blue-100 hover:bg-blue-100"><Home className="w-5 h-5"/></button>
          <button onClick={handleNavNext} className="p-3 sm:p-2 bg-gray-50 rounded-lg text-gray-700 border border-gray-200 hover:bg-gray-100"><ChevronRight className="w-5 h-5"/></button>
          <div className="relative ml-2 sm:ml-4 flex items-center justify-center flex-1 sm:flex-none">
            <span className="font-bold text-gray-800 text-lg sm:text-base capitalize text-center w-full whitespace-nowrap">{getNavLabel()}</span>
            <input type="date" value={format(currentDate, 'yyyy-MM-dd')} onChange={(e) => { if (e.target.value) setCurrentDate(new Date(e.target.value)); }} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
          </div>
        </div>
        <div className="flex bg-gray-100 p-1 rounded-lg w-full sm:w-auto overflow-x-auto custom-scrollbar">
          {['termine', 'dienste', 'agenda', 'month', 'week', 'day'].map(v => (
            <button key={v} onClick={() => handleViewChange(v as any)} className={`flex-1 sm:flex-none flex items-center justify-center px-3 py-2 sm:py-1.5 text-xs sm:text-sm font-bold rounded-md transition whitespace-nowrap ${currentView === v ? 'bg-white shadow-sm text-blue-700' : 'text-gray-500 hover:text-gray-700'}`}>
               {v === 'agenda' ? <><ListIcon className="w-4 h-4 sm:mr-1.5" /><span className="hidden sm:inline">Spielplan</span></> : 
                v === 'termine' ? 'Termine' : 
                v === 'dienste' ? 'Dienste' : 
                v === 'month' ? 'Monat' : 
                v === 'week' ? 'Woche' : 'Tag'}
            </button>
          ))}
        </div>
      </div>
      
      <div 
        className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 p-2 sm:p-3 overflow-hidden flex flex-col print:border-none print:shadow-none print:p-0"
        onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}
      >
        {['termine', 'dienste'].includes(currentView) ? renderYearlyList() : (
          <Calendar
            culture="de" localizer={localizer} events={displayEvents} startAccessor="start" endAccessor="end"
            view={currentView as any} toolbar={false} onView={handleViewChange}
            views={{ month: true, week: true, day: true, agenda: CustomAgendaView }}
            date={currentDate} onNavigate={(date) => setCurrentDate(date)}
            eventPropGetter={eventStyleGetter} onSelectEvent={handleSelectEvent} popup 
            messages={{ showMore: (total) => `+${total} weitere` }}
            className="font-sans text-xs sm:text-sm print:h-[1000px]"
          />
        )}
      </div>

      {selectedEventToView && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 print:hidden">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center" style={{ backgroundColor: selectedEventToView.color || '#3b82f6', color: getContrastYIQ(selectedEventToView.color || '#3b82f6') }}>
              <h2 className="text-lg font-bold pr-4">{selectedEventToView.title}</h2>
              <button onClick={() => setSelectedEventToView(null)} className="opacity-80 hover:opacity-100 transition-opacity">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-5 space-y-4 bg-gray-50">
              <div className="flex items-center text-gray-700 bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
                <Clock className="w-5 h-5 mr-3 text-gray-400 shrink-0" />
                <div>
                  <div className="font-medium">
                    {format(selectedEventToView.start!, 'EEEE, dd. MMMM yyyy', { locale: de })}
                  </div>
                  {!selectedEventToView.allDay && (
                    <div className="text-sm text-gray-500">
                      {format(selectedEventToView.start!, 'HH:mm')} Uhr
                      {selectedEventToView.end && ` - ${format(selectedEventToView.end, 'HH:mm')} Uhr`}
                    </div>
                  )}
                  {selectedEventToView.allDay && <div className="text-sm text-gray-500">Ganztägig</div>}
                </div>
              </div>

              {selectedEventToView.location && (
                <div className="flex items-center text-gray-700 bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
                  <MapPin className="w-5 h-5 mr-3 text-gray-400 shrink-0" />
                  <span className="font-medium">{selectedEventToView.location}</span>
                </div>
              )}

              {selectedEventToView.description && (
                <div className="flex items-start text-gray-700 bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
                  <Info className="w-5 h-5 mr-3 text-gray-400 shrink-0 mt-0.5" />
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{selectedEventToView.description}</p>
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-gray-200 bg-white flex justify-end">
              <button onClick={() => setSelectedEventToView(null)} className="px-6 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-lg transition-colors">
                Schließen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
// --- END OF FILE ---