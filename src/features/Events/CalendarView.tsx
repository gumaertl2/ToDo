// 2026-04-14 17:30 - FEATURE: Dynamischer Farbkontrast & Schloss-Icon (🔒) für interne Termine
// src/features/Events/CalendarView.tsx
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
import { addMonths, subMonths, addWeeks, subWeeks, addDays, subDays, addYears, subYears, getISOWeek } from 'date-fns';
import { de } from 'date-fns/locale/de';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { useClubStore } from '../../store/useClubStore';
import { Plus, DownloadCloud, Globe, Settings, Edit3, Printer, Menu, ChevronLeft, ChevronRight, Home, List as ListIcon, CalendarDays } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { CalendarEvent, Event } from '../../core/types/models';
import { CalendarEventFormModal } from './CalendarEventFormModal';
import { CalendarSubscriptionModal } from './CalendarSubscriptionModal';
import { CalendarIcsDetailModal } from './CalendarIcsDetailModal';
import { CalendarBulkEventModal } from './CalendarBulkEventModal';
import { CalendarExportModal } from './CalendarExportModal';

const locales = { 'de': de };

const localizer = dateFnsLocalizer({
  format, parse, startOfWeek: (date: Date) => startOfWeek(date, { weekStartsOn: 1 }), getDay, locales,
});

// CHIRURGISCHER EINGRIFF: Kontrast-Berechnung für lesbare Schrift auf hellen Farben
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
  // YIQ Formel zur Bestimmung der wahrgenommenen Helligkeit
  const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
  return (yiq >= 128) ? '#1f2937' : 'white'; // Bei hellen Farben dunkles Grau (gray-800)
};

interface AdaptedEvent extends RBCEvent {
  id: string; sourceId: string; sourceEvent?: CalendarEvent; rawSitzung?: Event; color?: string; description?: string; location?: string; seriesId?: string;
}

export const CalendarView: React.FC = () => {
  const { calendarEvents, calendarSubscriptions, fetchCalendarData, isCalendarLoading, events, fetchEvents } = useClubStore();
  const navigate = useNavigate();

  const [calendarTitle, setCalendarTitle] = useState(() => localStorage.getItem('papatodo_calendar_title') || 'Vereinskalender');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState('');

  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [hideEmptyDays, setHideEmptyDays] = useState(true);

  const [currentView, setCurrentView] = useState<'month' | 'week' | 'day' | 'agenda' | 'termine' | 'dienste'>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [selectedEventToEdit, setSelectedEventToEdit] = useState<CalendarEvent | undefined>(undefined);
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [selectedSeriesId, setSelectedSeriesId] = useState<string | undefined>(undefined);
  const [selectedIcsEvent, setSelectedIcsEvent] = useState<AdaptedEvent | undefined>(undefined);
  const [isIcsDetailModalOpen, setIsIcsDetailModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);

  useEffect(() => { 
    fetchCalendarData(); 
    fetchEvents(); 
  }, [fetchCalendarData, fetchEvents]);

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
    // CHIRURGISCHER EINGRIFF: Schloss-Icon (🔒) für nicht-öffentliche Termine & Sitzungen
    const internalEvents = calendarEvents.map(ev => ({
      id: ev.id, sourceId: 'manual', seriesId: ev.seriesId, 
      title: ev.isPublic ? ev.title : `🔒 ${ev.title}`, // Schloss für interne Termine
      description: ev.description || '', location: ev.location || '',
      start: new Date(ev.startTime), end: ev.endTime ? new Date(ev.endTime) : new Date(ev.startTime + (1000 * 60 * 60)), 
      allDay: ev.isAllDay, sourceEvent: ev, color: ev.color || '#3b82f6' 
    }));
    
    const internalSitzungen = events.filter(ev => ev.plannedStartTime && ev.status !== 'ABGESCHLOSSEN').map(ev => ({
      id: ev.id, sourceId: 'manual', seriesId: undefined, 
      title: ev.isPublished ? `Sitzung: ${ev.title}` : `🔒 Sitzung: ${ev.title}`, // Schloss für interne Sitzungen
      description: ev.description || '', location: ev.location || '',
      start: new Date(ev.plannedStartTime!), end: ev.plannedEndTime ? new Date(ev.plannedEndTime) : new Date(ev.plannedStartTime! + (1000 * 60 * 60 * 2)), 
      allDay: false, rawSitzung: ev, color: '#8b5cf6'
    }));

    const cachedExternalEvents = calendarSubscriptions.filter(sub => sub.isActive && sub.cachedEvents).flatMap(sub => 
        sub.cachedEvents!.map((ev, index) => ({
          id: `ics-${sub.id}-${ev.uid}-${index}`, sourceId: sub.id, title: ev.title, description: ev.description || '', location: ev.location || '',
          start: new Date(ev.startTime), end: new Date(ev.endTime), allDay: ev.isAllDay, color: sub.color,
        }))
      );
    return [...internalEvents, ...internalSitzungen, ...cachedExternalEvents];
  }, [calendarEvents, events, calendarSubscriptions]);

  const filteredEvents = useMemo(() => {
    return rbcEvents.filter(ev => {
      if (ev.sourceId === 'manual') return ev.seriesId ? activeFilters.includes('dienste') : activeFilters.includes('manual');
      return activeFilters.includes(ev.sourceId);
    });
  }, [rbcEvents, activeFilters]);

  const displayEvents = useMemo(() => {
    if (currentView === 'termine') return filteredEvents.filter(e => e.sourceId === 'manual' && !e.seriesId);
    if (currentView === 'dienste') return filteredEvents.filter(e => !!e.seriesId);
    return filteredEvents;
  }, [filteredEvents, currentView]);

  // CHIRURGISCHER EINGRIFF: Schriftfarbe über getContrastYIQ dynamisch berechnen
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
    if (event.id.startsWith('ics-')) { setSelectedIcsEvent(event); setIsIcsDetailModalOpen(true); return; }
    if (event.rawSitzung) { navigate(`/events/${event.rawSitzung.id}`); return; }
    if (event.sourceEvent) {
      if (event.sourceEvent.seriesId) { setSelectedSeriesId(event.sourceEvent.seriesId); setIsBulkModalOpen(true); } 
      else { setSelectedEventToEdit(event.sourceEvent); setIsEventModalOpen(true); }
    }
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
        <div className="flex justify-end mb-3 shrink-0 px-1 pt-1">
          <button onClick={() => setIsExportModalOpen(true)} className="flex items-center px-3 py-1.5 bg-white border border-gray-300 text-gray-700 text-sm font-bold rounded-lg hover:bg-gray-50 transition shadow-sm">
            <Printer className="w-4 h-4 mr-2 text-gray-600" /> Liste drucken
          </button>
        </div>
        
        <div className="overflow-y-auto overflow-x-auto w-full flex-1 custom-scrollbar pb-4">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead className="sticky top-0 bg-white shadow-sm z-10">
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
      const daysInMonth = eachDayOfInterval({ start: startOfMonth(date), end: endOfMonth(date) });
      return (
        <div className="flex-1 overflow-y-auto p-2 sm:p-4 space-y-4 bg-gray-50/30 h-full">
          {daysInMonth.map(day => {
            const dayEvents = events.filter(e => {
              const eStart = startOfDay(e.start!);
              let exclusiveEnd = e.end || e.start!;
              if (e.allDay && exclusiveEnd.getTime() > e.start!.getTime()) exclusiveEnd = new Date(exclusiveEnd.getTime() - 1000); 
              return day >= eStart && day <= startOfDay(exclusiveEnd);
            });
            if (hideEmptyDays && dayEvents.length === 0) return null;
            dayEvents.sort((a, b) => { if (a.allDay && !b.allDay) return -1; if (!a.allDay && b.allDay) return 1; return a.start!.getTime() - b.start!.getTime(); });
            const isToday = day.getTime() === startOfDay(new Date()).getTime();
            return (
              <div key={day.toISOString()} className={`bg-white rounded-lg shadow-sm border ${isToday ? 'border-blue-300 ring-2 ring-blue-100' : 'border-gray-200'} overflow-hidden`}>
                <div className={`px-4 py-2 border-b ${isToday ? 'bg-blue-50 border-blue-100' : 'bg-gray-50 border-gray-100'}`}>
                  <h3 className={`text-sm font-bold ${isToday ? 'text-blue-800' : 'text-gray-700'}`}>
                    {format(day, 'EEEE, dd. MMMM yyyy', { locale: de })}
                    {isToday && <span className="ml-2 text-[10px] uppercase tracking-wider font-bold bg-blue-600 text-white px-2 py-0.5 rounded-full">Heute</span>}
                  </h3>
                </div>
                <div className="p-1.5">
                  {dayEvents.length === 0 ? <p className="p-2 text-xs text-gray-400 italic text-center">Keine Termine</p> : (
                    <div className="space-y-1">
                      {dayEvents.map(e => (
                        <div key={`${e.id}-${day.toISOString()}`} onClick={() => handleSelectEvent(e)} className="flex flex-col sm:flex-row sm:items-center p-2 rounded hover:bg-gray-50 cursor-pointer transition" style={{ borderLeftWidth: '4px', borderLeftColor: e.color || '#3b82f6' }}>
                          <div className="w-20 shrink-0 text-xs font-bold text-gray-500 mb-1 sm:mb-0">{e.allDay ? 'Ganztägig' : `${format(e.start!, 'HH:mm')} Uhr`}</div>
                          <div className="flex-1"><div className="font-bold text-gray-900 text-sm">{e.title}</div>{e.location && <div className="text-xs text-gray-500 mt-0.5 flex items-center">📍 {e.location}</div>}</div>
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
  }, [hideEmptyDays]);

  const renderActionButtons = () => (
    <>
      <button 
        onClick={() => {
          setIsMobileMenuOpen(false);
          const currentDomain = window.location.origin;
          const iframeCode = `<iframe src="${currentDomain}/embed/kalender" width="100%" height="800px" style="border:none;"></iframe>`;
          window.prompt("Kopiere diesen HTML-Code (Strg+C / Cmd+C) für die Vereinswebseite:", iframeCode);
        }} 
        className="flex items-center w-full lg:w-auto px-3 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-bold rounded-lg hover:bg-gray-50 transition shadow-sm justify-center"
      >
        <Globe className="w-4 h-4 mr-2 text-blue-500" /> Public Link
      </button>
      <button onClick={() => { setIsMobileMenuOpen(false); setIsExportModalOpen(true); }} className="flex items-center w-full lg:w-auto px-3 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-bold rounded-lg hover:bg-gray-50 transition shadow-sm justify-center"><Printer className="w-4 h-4 mr-2 text-gray-600" /> Export / Druck</button>
      <button onClick={() => { setIsMobileMenuOpen(false); setIsSubModalOpen(true); }} className="flex items-center w-full lg:w-auto px-3 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-bold rounded-lg hover:bg-gray-50 transition shadow-sm justify-center"><DownloadCloud className="w-4 h-4 mr-2 text-green-500" /> Abos</button>
      <button onClick={() => { setIsMobileMenuOpen(false); setSelectedSeriesId(undefined); setIsBulkModalOpen(true); }} className="flex items-center w-full lg:w-auto px-3 py-2 bg-orange-50 border border-orange-200 text-orange-700 text-sm font-bold rounded-lg hover:bg-orange-100 transition shadow-sm justify-center"><Settings className="w-4 h-4 mr-2 text-orange-600" /> Dienste</button>
      <button onClick={() => { setIsMobileMenuOpen(false); setSelectedEventToEdit(undefined); setIsEventModalOpen(true); }} className="flex items-center w-full lg:w-auto px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 transition shadow-sm justify-center"><Plus className="w-5 h-5 mr-2" /> Termin</button>
    </>
  );

  const renderFilters = () => (
    <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-x-4 gap-y-3 p-3 bg-gray-50 lg:bg-white rounded-xl lg:border border-gray-200 lg:shadow-sm">
      <span className="text-xs font-bold text-gray-400 uppercase tracking-wider w-full sm:w-auto">Ansicht:</span>
      <label className="flex items-center space-x-2 text-sm cursor-pointer"><input type="checkbox" checked={activeFilters.includes('manual')} onChange={() => toggleFilter('manual')} className="rounded w-4 h-4 text-blue-600 focus:ring-blue-500"/><span className="font-bold text-gray-700">Termine & Sitzungen</span></label>
      <label className="flex items-center space-x-2 text-sm cursor-pointer"><input type="checkbox" checked={activeFilters.includes('dienste')} onChange={() => toggleFilter('dienste')} className="rounded w-4 h-4 text-orange-600 focus:ring-orange-500"/><span className="font-bold text-orange-600">Dienste</span></label>
      {calendarSubscriptions.filter(s => s.isActive).map(sub => (<label key={sub.id} className="flex items-center space-x-2 text-sm cursor-pointer"><input type="checkbox" checked={activeFilters.includes(sub.id)} onChange={() => toggleFilter(sub.id)} className="rounded w-4 h-4 focus:ring-blue-500" style={{ accentColor: sub.color || '#10b981' }}/><span className="font-bold" style={{ color: sub.color || '#10b981' }}>{sub.name}</span></label>))}
      
      {['agenda', 'termine', 'dienste'].includes(currentView) && (
        <>
          <div className="hidden sm:block flex-1 min-w-[10px]"></div>
          <label className="flex items-center space-x-2 text-sm cursor-pointer sm:border-l border-gray-200 sm:pl-4 mt-2 sm:mt-0 w-full sm:w-auto">
            <input type="checkbox" checked={hideEmptyDays} onChange={(e) => setHideEmptyDays(e.target.checked)} className="rounded w-4 h-4 text-gray-600 focus:ring-gray-500"/>
            <span className="text-gray-600 font-bold">Leere Tage ausblenden</span>
          </label>
        </>
      )}
    </div>
  );

  return (
    <div className="h-full flex flex-col space-y-3 relative">
      <div className="flex items-center justify-between bg-white p-3 sm:p-4 rounded-xl shadow-sm border border-gray-200 z-10 relative">
        <div className="flex-1">
          {isEditingTitle ? (
            <input type="text" value={tempTitle} onChange={(e) => setTempTitle(e.target.value)} onBlur={handleTitleSave} onKeyDown={(e) => e.key === 'Enter' && handleTitleSave()} className="text-xl sm:text-2xl font-bold text-gray-900 border-b-2 border-blue-500 focus:outline-none bg-transparent w-full max-w-sm" autoFocus placeholder="Name..." />
          ) : (
            <h1 onClick={() => { setTempTitle(calendarTitle); setIsEditingTitle(true); }} className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center cursor-pointer group hover:text-blue-700 transition-colors truncate pr-2">
              {calendarTitle} <Edit3 className="w-4 h-4 ml-2 text-gray-300 group-hover:text-blue-500 transition-colors opacity-0 group-hover:opacity-100 shrink-0" />
            </h1>
          )}
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="lg:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg"><Menu className="w-6 h-6" /></button>
        <div className="hidden lg:flex flex-wrap items-center gap-2">{renderActionButtons()}</div>
      </div>
      
      {isMobileMenuOpen && (
        <div className="lg:hidden flex flex-col gap-3 p-4 bg-white rounded-xl shadow-lg border border-gray-200 z-20 absolute top-16 left-0 right-0">
          <div className="grid grid-cols-2 gap-2">{renderActionButtons()}</div>
          <div className="border-t border-gray-100 pt-3">{renderFilters()}</div>
        </div>
      )}
      
      <div className="hidden lg:block">{renderFilters()}</div>
      
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between bg-white p-2 rounded-xl shadow-sm border border-gray-200 gap-2">
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
        className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 p-2 sm:p-3 overflow-hidden flex flex-col min-h-[600px] xl:min-h-[700px]"
        onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}
      >
        {isCalendarLoading ? ( <div className="flex-1 flex items-center justify-center text-gray-400 animate-pulse">Lade...</div> ) : 
         ['termine', 'dienste'].includes(currentView) ? renderYearlyList() : (
          <Calendar
            culture="de" localizer={localizer} events={displayEvents} startAccessor="start" endAccessor="end"
            view={currentView as any} toolbar={false} onView={handleViewChange}
            views={{ month: true, week: true, day: true, agenda: CustomAgendaView }}
            date={currentDate} onNavigate={(date) => setCurrentDate(date)}
            eventPropGetter={eventStyleGetter} onSelectEvent={handleSelectEvent} popup 
            messages={{ showMore: (total) => `+${total} weitere` }}
            className="font-sans text-xs sm:text-sm"
          />
        )}
      </div>

      {isEventModalOpen && <CalendarEventFormModal onClose={() => setIsEventModalOpen(false)} existingEvent={selectedEventToEdit} />}
      {isSubModalOpen && <CalendarSubscriptionModal onClose={() => setIsSubModalOpen(false)} />}
      {isIcsDetailModalOpen && selectedIcsEvent && <CalendarIcsDetailModal event={selectedIcsEvent as any} onClose={() => setIsIcsDetailModalOpen(false)} />}
      {isBulkModalOpen && <CalendarBulkEventModal onClose={() => setIsBulkModalOpen(false)} existingSeriesId={selectedSeriesId} />}
      {isExportModalOpen && <CalendarExportModal onClose={() => setIsExportModalOpen(false)} calendarTitle={calendarTitle} />}
    </div>
  );
};
// --- END OF FILE 505 Zeilen ---