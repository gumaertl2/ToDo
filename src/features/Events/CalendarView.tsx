// [2026-07-26] - BUGFIX: Dienstübernahme (Takeover) macht nun einen harten Schnitt und leert alle Platzhalter-Arrays (Admin), um Geister-Teilnehmer zu entfernen.
// [2026-07-26] - BUGFIX: Domain-Language Fallback ('Gast' -> 'Mitglied') korrigiert, um Profil-Berechtigungen im Kalender wiederherzustellen.
// [2026-07-24] - UX-FEATURE: Persistente Speicherung der Kalender-Filter (Abos, leere Tage, Historie) im localStorage eingebaut.
// [2026-05-30] - UX-FEATURE: Bestätigungsdialog (confirm) vor Dienst-Übernahme eingebaut. Liest den aktuellen Dienstleistenden aus dem Titel aus, um die Abfrage zu personalisieren.
// [2026-05-30] - BUGFIX: Visuelles Feedback bei "Dienst übernehmen" hinzugefügt. Der Titel des Termins wird nun automatisch mit dem Alias des neuen Helfers aktualisiert.
// [2026-05-30] - UX-OPTIMIERUNG: Einheitlicher Workflow für alle Nutzer. Jeder Klick auf einen Termin öffnet nun zuerst das detailreiche CalendarIcsDetailModal.
// src/features/Events/CalendarView.tsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import type { Event as RBCEvent } from 'react-big-calendar';
import { format } from 'date-fns/format';
import { parse } from 'date-fns/parse';
import { startOfWeek } from 'date-fns/startOfWeek';
import { endOfWeek } from 'date-fns/endOfWeek';
import { getDay } from 'date-fns/getDay';
import { eachDayOfInterval } from 'date-fns/eachDayOfInterval';
import { startOfDay } from 'date-fns/startOfDay';
import { addMonths, subMonths, addWeeks, subWeeks, addDays, subDays, addYears, subYears, getISOWeek } from 'date-fns';
import { de } from 'date-fns/locale/de';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { useClubStore } from '../../store/useClubStore';
import { Plus, DownloadCloud, Globe, Settings, Edit3, Printer, ChevronLeft, ChevronRight, Home, List as ListIcon, CalendarDays, Filter, CalendarPlus, Copy, Check, X } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
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

export const CalendarView: React.FC = () => {
  const { 
    user, roleProfiles, calendarEvents, calendarSubscriptions, 
    fetchCalendarData, isCalendarLoading, events, fetchEvents,
    helpers, updateCalendarEvent
  } = useClubStore();
  const navigate = useNavigate();
  const location = useLocation();

  const currentProfile = useMemo(() => {
    return roleProfiles.find(p => p.id === user?.roleProfileId) || 
           roleProfiles.find(p => p.name === 'Mitglied') || 
           { permissions: {} as any };
  }, [user, roleProfiles]);
  const canManageSetup = !!currentProfile.permissions.manageCalendarSetup;

  const myHelper = useMemo(() => {
    return helpers?.find(h => h.email?.toLowerCase() === user?.email?.toLowerCase());
  }, [helpers, user]);

  const [calendarTitle, setCalendarTitle] = useState(() => localStorage.getItem('papatodo_calendar_title') || 'Vereinskalender');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState('');

  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  
  const [showEmptyDays, setShowEmptyDays] = useState(() => localStorage.getItem('papatodo_show_empty_days') === 'true');
  const [showPastEvents, setShowPastEvents] = useState(() => localStorage.getItem('papatodo_show_past_events') === 'true');

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
  const [touchStart, setTouchStart] = useState<number | null>(null);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const [showAboModal, setShowAboModal] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => { 
    fetchCalendarData(); 
    fetchEvents(); 
  }, [fetchCalendarData, fetchEvents]);

  useEffect(() => {
    const allIds = ['manual', 'dienste', ...calendarSubscriptions.map(s => s.id)];
    try {
      const storedHidden = localStorage.getItem('papatodo_hidden_subs');
      if (storedHidden) {
        const hiddenIds = JSON.parse(storedHidden) as string[];
        setActiveFilters(allIds.filter(id => !hiddenIds.includes(id)));
      } else {
        setActiveFilters(allIds);
      }
    } catch (e) {
      setActiveFilters(allIds);
    }
  }, [calendarSubscriptions]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/api/calendar`);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleTitleSave = () => {
    if (!canManageSetup) return;
    const newTitle = tempTitle.trim() || 'Vereinskalender';
    setCalendarTitle(newTitle);
    localStorage.setItem('papatodo_calendar_title', newTitle);
    setIsEditingTitle(false);
  };

  const toggleFilter = (id: string) => {
    setActiveFilters(prev => {
      const next = prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id];
      const allIds = ['manual', 'dienste', ...calendarSubscriptions.map(s => s.id)];
      const hidden = allIds.filter(x => !next.includes(x));
      localStorage.setItem('papatodo_hidden_subs', JSON.stringify(hidden));
      return next;
    });
  };

  const handleViewChange = (v: any) => {
    setCurrentView(v);
    setActiveFilters(prev => {
      let next = [...prev];
      if (v === 'dienste' && !next.includes('dienste')) next.push('dienste');
      if (v === 'termine' && !next.includes('manual')) next.push('manual');
      
      if (next.length !== prev.length) {
        const allIds = ['manual', 'dienste', ...calendarSubscriptions.map(s => s.id)];
        const hidden = allIds.filter(x => !next.includes(x));
        localStorage.setItem('papatodo_hidden_subs', JSON.stringify(hidden));
      }
      return next;
    });
  };

  const handleNavPrev = () => {
    if (['termine', 'dienste', 'agenda'].includes(currentView)) setCurrentDate(subYears(currentDate, 1));
    else if (currentView === 'month') setCurrentDate(subMonths(currentDate, 1));
    else if (currentView === 'week') setCurrentDate(subWeeks(currentDate, 1));
    else setCurrentDate(subDays(currentDate, 1));
  };

  const handleNavNext = () => {
    if (['termine', 'dienste', 'agenda'].includes(currentView)) setCurrentDate(addYears(currentDate, 1));
    else if (currentView === 'month') setCurrentDate(addMonths(currentDate, 1));
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
    const internalEvents = calendarEvents.map(ev => {
      const isHeim = ev.location?.toLowerCase().includes('maisach');
      const isAuswaerts = ev.location && !isHeim;
      const matchPrefix = ev.showInMatchPlan ? (isHeim ? '🏠 ' : (isAuswaerts ? '🚌 ' : '')) : '';
      const baseTitle = `${matchPrefix}${ev.title}`;

      return {
        id: ev.id, sourceId: 'manual', seriesId: ev.seriesId, 
        title: ev.isPublic ? baseTitle : `🔒 ${baseTitle}`,
        description: ev.description || '', location: ev.location || '',
        start: new Date(ev.startTime), end: ev.endTime ? new Date(ev.endTime) : new Date(ev.startTime + (1000 * 60 * 60)), 
        allDay: ev.isAllDay, sourceEvent: ev, color: ev.color || '#3b82f6',
        showInMatchPlan: ev.showInMatchPlan
      };
    });
    
    const internalSitzungen = events.filter(ev => ev.plannedStartTime && ev.status !== 'ABGESCHLOSSEN').map(ev => ({
      id: ev.id, sourceId: 'manual', seriesId: undefined, 
      title: ev.isPublic ? `Sitzung: ${ev.title}` : `🔒 Sitzung: ${ev.title}`,
      description: ev.description || '', location: ev.location || '',
      start: new Date(ev.plannedStartTime!), end: ev.plannedEndTime ? new Date(ev.plannedEndTime) : new Date(ev.plannedStartTime! + (1000 * 60 * 60 * 2)), 
      allDay: false, rawSitzung: ev, color: '#8b5cf6',
      showInMatchPlan: false
    }));

    const cachedExternalEvents = calendarSubscriptions.filter(sub => sub.isActive && sub.cachedEvents).flatMap(sub => 
        sub.cachedEvents!.map((ev, index) => {
          const isHeim = ev.location?.toLowerCase().includes('maisach');
          const isAuswaerts = ev.location && !isHeim;
          const matchPrefix = sub.showInMatchPlan ? (isHeim ? '🏠 ' : (isAuswaerts ? '🚌 ' : '')) : '';

          return {
            id: `ics-${sub.id}-${ev.uid}-${index}`, sourceId: sub.id, 
            title: `${matchPrefix}${ev.title}`, description: ev.description || '', location: ev.location || '',
            start: new Date(ev.startTime), end: new Date(ev.endTime), allDay: ev.isAllDay, color: sub.color,
            showInMatchPlan: sub.showInMatchPlan
          };
        })
      );
    return [...internalEvents, ...internalSitzungen, ...cachedExternalEvents];
  }, [calendarEvents, events, calendarSubscriptions]);

  const filteredEvents = useMemo(() => {
    const todayStart = startOfDay(new Date()).getTime();
    const isListView = ['termine', 'dienste'].includes(currentView);

    return rbcEvents.filter(ev => {
      if (currentView === 'agenda' && !ev.showInMatchPlan) return false;
      if (isListView && !showPastEvents) {
        let exclusiveEnd = ev.end || ev.start!;
        if (ev.allDay && exclusiveEnd.getTime() > ev.start!.getTime()) exclusiveEnd = new Date(exclusiveEnd.getTime() - 1000);
        if (exclusiveEnd.getTime() < todayStart) return false;
      }
      if (ev.sourceId === 'manual') return ev.seriesId ? activeFilters.includes('dienste') : activeFilters.includes('manual');
      return activeFilters.includes(ev.sourceId);
    });
  }, [rbcEvents, activeFilters, showPastEvents, currentView]);

  const displayEvents = useMemo(() => {
    if (currentView === 'termine') return filteredEvents.filter(e => e.sourceId === 'manual' && !e.seriesId);
    if (currentView === 'dienste') return filteredEvents.filter(e => !!e.seriesId);
    return filteredEvents;
  }, [filteredEvents, currentView]);

  const eventStyleGetter = (event: AdaptedEvent) => ({ 
    style: { 
      backgroundColor: event.color || '#3b82f6', borderRadius: '6px', opacity: 0.9, 
      color: getContrastYIQ(event.color || '#3b82f6'), border: 'none', display: 'block', cursor: 'pointer' 
    } 
  });

  const handleSelectEvent = (event: AdaptedEvent) => {
    if (event.id.startsWith('ics-')) { setSelectedIcsEvent(event); setIsIcsDetailModalOpen(true); return; }
    if (event.rawSitzung) { navigate(`/events/${event.rawSitzung.id}`); return; }
    
    if (event.sourceEvent) {
      setSelectedIcsEvent(event);
      setIsIcsDetailModalOpen(true);
    }
  };

  useEffect(() => {
    if (location.state?.targetDate) {
      setCurrentDate(new Date(location.state.targetDate));
    }

    if (location.state?.openEventId && rbcEvents.length > 0) {
      const targetId = location.state.openEventId;
      const target = rbcEvents.find(e =>
        e.id === targetId ||
        (e.sourceEvent && e.sourceEvent.id === targetId) ||
        (e.rawSitzung && e.rawSitzung.id === targetId)
      );

      if (target) {
        navigate(location.pathname, { replace: true, state: {} });
        setTimeout(() => {
           handleSelectEvent(target);
        }, 100);
      }
    }
  }, [location.state, rbcEvents, location.pathname, navigate]);

  const getNavLabel = () => {
    if (['termine', 'dienste'].includes(currentView)) return format(currentDate, 'yyyy', { locale: de });
    
    if (currentView === 'agenda') {
      const month = currentDate.getMonth(); 
      const startYear = month < 4 ? currentDate.getFullYear() - 1 : currentDate.getFullYear();
      return `Saison ${startYear}/${startYear + 1}`;
    }

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
      const scrollRef = useRef<HTMLDivElement>(null);
      const today = startOfDay(new Date());

      const { start: rangeStart, end: rangeEnd } = useMemo(() => {
        const month = date.getMonth();
        const startYear = month < 4 ? date.getFullYear() - 1 : date.getFullYear();
        return { start: new Date(startYear, 4, 1), end: new Date(startYear + 1, 4, 31) };
      }, [date]);

      const daysInInterval = eachDayOfInterval({ start: rangeStart, end: rangeEnd });
      
      useEffect(() => {
        if (scrollRef.current) {
          setTimeout(() => {
            const container = scrollRef.current;
            if (!container) return;
            const todayEl = container.querySelector('[data-is-future="true"]') as HTMLElement;
            if (todayEl) {
              container.scrollTop = Math.max(0, todayEl.offsetTop - 8);
            }
          }, 50);
        }
      }, [date, events, showEmptyDays]); 

      return (
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-2 sm:p-4 space-y-4 bg-gray-50/30 h-full relative print:bg-white print:overflow-visible">
          {daysInInterval.map(day => {
            const dayEvents = events.filter(e => {
              const eStart = startOfDay(e.start!);
              let exclusiveEnd = e.end || e.start!;
              if (e.allDay && exclusiveEnd.getTime() > e.start!.getTime()) exclusiveEnd = new Date(exclusiveEnd.getTime() - 1000); 
              return day >= eStart && day <= startOfDay(exclusiveEnd);
            });
            
            if (!showEmptyDays && dayEvents.length === 0) return null;
            
            dayEvents.sort((a, b) => { if (a.allDay && !b.allDay) return -1; if (!a.allDay && b.allDay) return 1; return a.start!.getTime() - b.start!.getTime(); });
            
            const isToday = day.getTime() === today.getTime();
            const isFutureOrToday = day >= today;

            return (
              <div 
                key={day.toISOString()} 
                data-is-future={isFutureOrToday ? "true" : "false"}
                className={`bg-white rounded-lg shadow-sm border ${isToday ? 'border-blue-300 ring-2 ring-blue-100' : 'border-gray-200'} overflow-hidden print:border-b print:shadow-none print:rounded-none`}
              >
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
          <div className="h-[80vh] print:hidden" aria-hidden="true" />
        </div>
      );
    };
    View.title = () => ''; View.navigate = () => new Date(); return View;
  }, [showEmptyDays]);

  const renderActionButtons = () => (
    <>
      <button onClick={() => { setIsSettingsOpen(false); setIsExportModalOpen(true); }} className="flex items-center px-3 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-bold rounded-lg hover:bg-gray-50 transition shadow-sm justify-center">
        <Printer className="w-4 h-4 mr-2 text-gray-600" /> Export / Druck
      </button>
      
      <button onClick={() => { setIsSettingsOpen(false); setShowAboModal(true); }} className="flex items-center px-3 py-2 bg-blue-50 border border-blue-200 text-blue-700 text-sm font-bold rounded-lg hover:bg-blue-100 transition shadow-sm justify-center">
        <CalendarPlus className="w-4 h-4 mr-2" /> Abonnieren
      </button>

      {canManageSetup && (
        <>
          <button 
            onClick={() => {
              setIsSettingsOpen(false);
              const currentDomain = window.location.origin;
              const iframeCode = `<iframe src="${currentDomain}/embed/kalender" width="100%" height="800px" style="border:none;"></iframe>`;
              window.prompt("Kopiere diesen HTML-Code (Strg+C / Cmd+C) für die Vereinswebseite:", iframeCode);
            }} 
            className="flex items-center px-3 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-bold rounded-lg hover:bg-gray-50 transition shadow-sm justify-center"
          >
            <Globe className="w-4 h-4 mr-2 text-blue-500" /> Public Link
          </button>
          <button onClick={() => { setIsSettingsOpen(false); setIsSubModalOpen(true); }} className="flex items-center px-3 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-bold rounded-lg hover:bg-gray-50 transition shadow-sm justify-center">
            <DownloadCloud className="w-4 h-4 mr-2 text-green-500" /> Abos
          </button>
          <button onClick={() => { setIsSettingsOpen(false); setSelectedSeriesId(undefined); setIsBulkModalOpen(true); }} className="flex items-center px-3 py-2 bg-orange-50 border border-orange-200 text-orange-700 text-sm font-bold rounded-lg hover:bg-orange-100 transition shadow-sm justify-center">
            <Settings className="w-4 h-4 mr-2 text-orange-600" /> Dienste
          </button>
          <button onClick={() => { setIsSettingsOpen(false); setSelectedEventToEdit(undefined); setIsEventModalOpen(true); }} className="flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 transition shadow-sm justify-center">
            <Plus className="w-5 h-5 mr-2" /> Termin
          </button>
        </>
      )}
    </>
  );

  const renderFilters = () => (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-y-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Kalender-Abos:</span>
        {calendarSubscriptions.filter(s => s.isActive).length === 0 && <span className="text-sm text-gray-400 italic">Keine aktiv</span>}
        {calendarSubscriptions.filter(s => s.isActive).map(sub => (
          <label key={sub.id} className="flex items-center space-x-2 text-sm cursor-pointer bg-gray-50 px-2 py-1 rounded-md border border-gray-100 hover:bg-gray-100 transition">
            <input type="checkbox" checked={activeFilters.includes(sub.id)} onChange={() => toggleFilter(sub.id)} className="rounded w-4 h-4 focus:ring-blue-500" style={{ accentColor: sub.color || '#10b981' }}/>
            <span className="font-bold" style={{ color: sub.color || '#10b981' }}>{sub.name}</span>
          </label>
        ))}
      </div>
      
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 md:border-l border-gray-200 md:pl-4">
        <label className="flex items-center space-x-2 text-sm cursor-pointer bg-blue-50 px-2 py-1 rounded-md border border-blue-100">
          <input type="checkbox" checked={activeFilters.includes('manual')} onChange={() => toggleFilter('manual')} className="rounded w-4 h-4 text-blue-600 focus:ring-blue-500"/>
          <span className="font-bold text-blue-800">Termine</span>
        </label>
        <label className="flex items-center space-x-2 text-sm cursor-pointer bg-orange-50 px-2 py-1 rounded-md border border-orange-100">
          <input type="checkbox" checked={activeFilters.includes('dienste')} onChange={() => toggleFilter('dienste')} className="rounded w-4 h-4 text-orange-600 focus:ring-orange-500"/>
          <span className="font-bold text-orange-800">Dienste</span>
        </label>
        
        {['agenda', 'termine', 'dienste'].includes(currentView) && (
          <label className="flex items-center space-x-2 text-sm cursor-pointer">
            <input type="checkbox" checked={showEmptyDays} onChange={(e) => {
              setShowEmptyDays(e.target.checked);
              localStorage.setItem('papatodo_show_empty_days', String(e.target.checked));
            }} className="rounded w-4 h-4 text-gray-600 focus:ring-gray-500"/>
            <span className="text-gray-600 font-bold">Leere Tage zeigen</span>
          </label>
        )}

        {['termine', 'dienste'].includes(currentView) && (
          <label className="flex items-center space-x-2 text-sm cursor-pointer">
            <input type="checkbox" checked={showPastEvents} onChange={(e) => {
              setShowPastEvents(e.target.checked);
              localStorage.setItem('papatodo_show_past_events', String(e.target.checked));
            }} className="rounded w-4 h-4 text-purple-600 focus:ring-purple-500"/>
            <span className="text-gray-600 font-bold">Historie zeigen</span>
          </label>
        )}
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col space-y-3 relative">
      
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between bg-white p-2 rounded-xl shadow-sm border border-gray-200 gap-3 z-20 relative">
        
        <div className="flex items-center justify-between lg:justify-start gap-1 flex-1">
          <button onClick={handleNavPrev} className="p-2 bg-gray-50 rounded-lg text-gray-700 border border-gray-200 hover:bg-gray-100 transition-colors"><ChevronLeft className="w-5 h-5"/></button>
          <button onClick={() => setCurrentDate(new Date())} className="p-2 bg-blue-50 rounded-lg text-blue-700 border border-blue-100 hover:bg-blue-100 transition-colors" title="Heute"><Home className="w-5 h-5"/></button>
          <button onClick={handleNavNext} className="p-2 bg-gray-50 rounded-lg text-gray-700 border border-gray-200 hover:bg-gray-100 transition-colors"><ChevronRight className="w-5 h-5"/></button>
          <div className="relative ml-2 lg:ml-4 flex-1 lg:flex-none">
            <span className="font-bold text-gray-800 text-lg capitalize w-full lg:w-48 text-center block whitespace-nowrap">{getNavLabel()}</span>
            <input type="date" value={format(currentDate, 'yyyy-MM-dd')} onChange={(e) => { if (e.target.value) setCurrentDate(new Date(e.target.value)); }} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
          </div>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1 lg:pb-0">
          <div className="flex bg-gray-100 p-1 rounded-lg shrink-0">
            {['termine', 'dienste', 'agenda', 'month', 'week', 'day'].map(v => (
              <button key={v} onClick={() => handleViewChange(v as any)} className={`px-3 py-1.5 text-xs sm:text-sm font-bold rounded-md transition-colors whitespace-nowrap flex items-center ${currentView === v ? 'bg-white shadow-sm text-blue-700' : 'text-gray-500 hover:text-gray-700'}`}>
                 {v === 'agenda' ? <><ListIcon className="w-4 h-4 sm:mr-1.5" /><span className="hidden sm:inline">Spielplan</span></> : 
                  v === 'termine' ? 'Termine' : 
                  v === 'dienste' ? 'Dienste' : 
                  v === 'month' ? 'Monat' : 
                  v === 'week' ? 'Woche' : 'Tag'}
              </button>
            ))}
          </div>
          
          <button
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            className={`flex items-center px-3 py-1.5 rounded-lg text-sm font-bold transition-colors shrink-0 border ${
              isSettingsOpen ? 'bg-blue-100 text-blue-700 border-blue-200 shadow-inner' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 shadow-sm'
            }`}
          >
            <Filter className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Optionen</span>
          </button>
        </div>
      </div>

      {isSettingsOpen && (
        <div className="bg-white p-4 rounded-xl shadow-md border border-gray-200 z-10 flex flex-col gap-4 animate-fade-in relative">
          <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-gray-100 pb-4 gap-4">
            <div className="flex-1">
              {isEditingTitle && canManageSetup ? (
                <input type="text" value={tempTitle} onChange={(e) => setTempTitle(e.target.value)} onBlur={handleTitleSave} onKeyDown={(e) => e.key === 'Enter' && handleTitleSave()} className="text-xl font-bold text-gray-900 border-b-2 border-blue-500 focus:outline-none bg-transparent w-full max-w-sm" autoFocus placeholder="Kalendername..." />
              ) : (
                <h1 onClick={() => { if (canManageSetup) { setTempTitle(calendarTitle); setIsEditingTitle(true); } }} className={`text-xl font-bold text-gray-900 flex items-center group truncate ${canManageSetup ? 'cursor-pointer hover:text-blue-700 transition-colors' : ''}`}>
                  {calendarTitle} 
                  {canManageSetup && <Edit3 className="w-4 h-4 ml-2 text-gray-300 group-hover:text-blue-500 transition-colors opacity-0 group-hover:opacity-100 shrink-0" />}
                </h1>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {renderActionButtons()}
            </div>
          </div>
          <div>
            {renderFilters()}
          </div>
        </div>
      )}
      
      <div 
        className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 p-2 sm:p-3 overflow-hidden flex flex-col min-h-[700px] lg:min-h-[850px] xl:min-h-[1000px]"
        onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}
      >
        {isCalendarLoading ? ( <div className="flex-1 flex items-center justify-center text-gray-400 animate-pulse font-medium">Lade Vereinskalender...</div> ) : 
         ['termine', 'dienste'].includes(currentView) ? renderYearlyList() : (
          <Calendar
            culture="de" localizer={localizer} events={displayEvents} startAccessor="start" endAccessor="end"
            view={currentView as any} toolbar={false} onView={handleViewChange}
            views={{ month: true, week: true, day: true, agenda: CustomAgendaView }}
            date={currentDate} onNavigate={(date) => setCurrentDate(date)}
            eventPropGetter={eventStyleGetter} 
            onSelectEvent={(event) => handleSelectEvent(event)} 
            popup 
            messages={{ showMore: (total) => `+${total} weitere` }}
            className="font-sans text-xs sm:text-sm"
          />
        )}
      </div>

      {showAboModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/50 animate-fade-in" onClick={() => setShowAboModal(false)}>
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b flex justify-between items-center bg-gray-50">
              <h3 className="text-lg font-bold text-gray-900 flex items-center">
                <CalendarPlus className="w-5 h-5 mr-2 text-blue-600" />
                Kalender abonnieren
              </h3>
              <button onClick={() => setShowAboModal(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors"><X size={20} className="text-gray-500"/></button>
            </div>
            
            <div className="p-5 space-y-4 bg-white">
              <p className="text-sm text-gray-600">Abonniere den Vereinskalender in deinem persönlichen Kalender, um immer auf dem neuesten Stand zu sein. Die Termine aktualisieren sich in deinem Handy automatisch!</p>
              
              <div className="space-y-3 mt-4">
                <a 
                  href={`webcal://${window.location.host}/api/calendar`}
                  className="flex items-center justify-center w-full px-4 py-3 bg-gray-900 text-white font-bold rounded-xl hover:bg-gray-800 transition shadow-sm text-center"
                >
                   Apple Kalender (iPhone / Mac)
                </a>
                
                <a 
                  href={`https://calendar.google.com/calendar/render?cid=${encodeURIComponent(`webcal://${window.location.host}/api/calendar`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center w-full px-4 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition shadow-sm text-center"
                >
                  G Google Kalender
                </a>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-100">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Manueller Link (.ics)</label>
                <div className="flex items-center bg-gray-50 border border-gray-200 rounded-lg p-1">
                  <div className="flex-1 overflow-hidden px-2 text-xs text-gray-600 font-mono whitespace-nowrap">
                    {`${window.location.origin}/api/calendar`}
                  </div>
                  <button onClick={handleCopyLink} className="flex items-center px-3 py-1.5 bg-white border border-gray-200 rounded text-xs font-bold text-gray-700 hover:bg-gray-50 shadow-sm">
                    {isCopied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {isEventModalOpen && <CalendarEventFormModal onClose={() => setIsEventModalOpen(false)} existingEvent={selectedEventToEdit} />}
      {isSubModalOpen && <CalendarSubscriptionModal onClose={() => setIsSubModalOpen(false)} />}
      
      {isIcsDetailModalOpen && selectedIcsEvent && (
        <CalendarIcsDetailModal 
          event={selectedIcsEvent as any} 
          onClose={() => setIsIcsDetailModalOpen(false)} 
          canEdit={canManageSetup && selectedIcsEvent.sourceId === 'manual'}
          onEdit={() => {
            setIsIcsDetailModalOpen(false);
            if (selectedIcsEvent.sourceEvent?.seriesId) {
              setSelectedSeriesId(selectedIcsEvent.sourceEvent.seriesId);
              setIsBulkModalOpen(true);
            } else if (selectedIcsEvent.sourceEvent) {
              setSelectedEventToEdit(selectedIcsEvent.sourceEvent);
              setIsEventModalOpen(true);
            }
          }}
          canTakeOver={
            selectedIcsEvent.sourceEvent?.eventType === 'DIENST' && 
            !!myHelper && 
            !((selectedIcsEvent.sourceEvent as any).participantHelperIds || []).includes(myHelper.id)
          }
          onTakeOver={async () => {
            if (!selectedIcsEvent.sourceEvent || !myHelper || !updateCalendarEvent) return;
            
            const ev = selectedIcsEvent.sourceEvent;

            // --- BESTÄTIGUNGS-DIALOG ---
            let existingName = "";
            if (ev.title.includes(':')) {
              existingName = ev.title.split(':')[1].trim();
            }
            
            const confirmMessage = existingName 
              ? `Willst du den Dienst von ${existingName} wirklich übernehmen?`
              : `Willst du diesen Dienst wirklich übernehmen?`;
              
            if (!window.confirm(confirmMessage)) {
              return;
            }

            try {
              // Sichtbaren Titel sofort anpassen!
              let newTitle = ev.title;
              const displayName = myHelper.alias || myHelper.name;
              if (newTitle.includes(':')) {
                newTitle = newTitle.split(':')[0].trim() + ': ' + displayName;
              } else {
                newTitle = newTitle.trim() + ': ' + displayName;
              }

              // CHIRURGISCHER EINGRIFF: Harter Schnitt! (Alle anderen Empfänger leeren)
              await updateCalendarEvent({ 
                ...ev, 
                title: newTitle,
                participantHelperIds: [myHelper.id],
                participantUserIds: [],
                participantGroupIds: [],
                participantTeamIds: [],
                reminderRecipientHelperIds: [myHelper.id],
                reminderRecipientUserIds: [],
                reminderRecipientGroupIds: [],
                reminderRecipientTeamIds: []
              } as any);
              
              setIsIcsDetailModalOpen(false);
            } catch (e) {
              console.error(e);
              alert("Fehler bei der Übernahme des Dienstes.");
            }
          }}
        />
      )}

      {isBulkModalOpen && <CalendarBulkEventModal onClose={() => setIsBulkModalOpen(false)} existingSeriesId={selectedSeriesId} />}
      {isExportModalOpen && <CalendarExportModal onClose={() => setIsExportModalOpen(false)} calendarTitle={calendarTitle} />}
    </div>
  );
};
// --- END OF FILE ---