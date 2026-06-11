// [2026-06-10] - BUGFIX: Bulletproof-Loading für den öffentlichen Kalender. Lade-Vorgänge für Termine, Sitzungen und Abos in separate try/catch Blöcke isoliert. Verhindert, dass ein Berechtigungs-Fehler (Firebase Rules) bei den Abos den kompletten Kalender für anonyme Gäste lahmlegt. Filter (Termine/Dienste) sind nun standardmäßig immer aktiv.
// [2026-05-28] - BUGFIX: Homepage-Leak geschlossen. Sitzungen werden im öffentlichen Kalender nun strikt nach 'isPublic' (Auf Homepage zeigen) statt nach 'isPublished' (Agenda veröffentlicht) gefiltert.
// 2026-04-15 21:40 - FEATURE: Automatische Heim (🏠) / Auswärts (🚌) Kennzeichnung + Google Maps Link
// 2026-04-20 17:00 - FEATURE: UX-Optimierung für Embeds - Kompakte Steuerung & Filter On-Demand (Zero-Loss)
// 2026-04-23 16:15 - FEATURE: Kalender-Abo (iCal) Funktion für externe Endgeräte integriert
// 2026-04-23 18:45 - FEATURE: "Endlos-Stream" (Mai bis Mai) für den Spielplan mit Auto-Scroll zum heutigen Tag
// 2026-04-23 19:15 - FIX: Aggressives 'scrollIntoView' durch isoliertes, sanftes 'scrollTop' ersetzt
// src/features/Events/PublicCalendarEmbed.tsx
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
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { Printer, ChevronLeft, ChevronRight, Home, List as ListIcon, CalendarDays, MapPin, Clock, Info, X, Filter, CalendarPlus, Copy, Check } from 'lucide-react';
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

  // CHIRURGISCHER EINGRIFF: Fallback-Standardwerte direkt setzen!
  const [activeFilters, setActiveFilters] = useState<string[]>(['manual', 'dienste']);
  const [showEmptyDays, setShowEmptyDays] = useState(false);
  const [showPastEvents, setShowPastEvents] = useState(false);

  const [currentView, setCurrentView] = useState<'month' | 'week' | 'day' | 'agenda' | 'termine' | 'dienste'>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const [selectedEventToView, setSelectedEventToView] = useState<AdaptedEvent | null>(null);
  
  const [showFilters, setShowFilters] = useState(false);
  const [showAboModal, setShowAboModal] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);

  useEffect(() => {
    const fetchPublicData = async () => {
      let loadedSubsIds: string[] = [];

      // BLOCK 1: Termine & Dienste (Unabhängig)
      try {
        const eventsQ = query(collection(db, 'calendar_events'), where('isPublic', '==', true));
        const eventsSnap = await getDocs(eventsQ);
        setCalendarEvents(eventsSnap.docs.map(doc => ({ ...doc.data(), id: doc.id } as CalendarEvent)));
      } catch (err) {
        console.error("Fehler beim Laden der Termine (Firebase):", err);
      }

      // BLOCK 2: Sitzungen (Unabhängig)
      try {
        const sitzQ = query(collection(db, 'events'), where('isPublic', '==', true));
        const sitzSnap = await getDocs(sitzQ);
        setSitzungen(sitzSnap.docs.map(doc => ({ ...doc.data(), id: doc.id } as Event)));
      } catch (err) {
        console.error("Fehler beim Laden der Sitzungen (Firebase):", err);
      }

      // BLOCK 3: Kalender-Abos (Unabhängig - Blockiert oft wegen fehlender Firestore Rules bei Gästen!)
      try {
        const subsSnap = await getDocs(collection(db, 'calendar_subscriptions'));
        const loadedSubs = subsSnap.docs.map(doc => ({ ...doc.data(), id: doc.id } as CalendarSubscription));
        const sortedSubs = loadedSubs.sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999));
        setCalendarSubscriptions(sortedSubs);
        loadedSubsIds = sortedSubs.map(s => s.id);
      } catch (err) {
        console.error("Fehler beim Laden der Abos (Sicherheitsregeln?):", err);
      }

      // Zusammenführen der aktiven Filter
      setActiveFilters(['manual', 'dienste', ...loadedSubsIds]);
      setIsLoading(false);
    };

    fetchPublicData();
  }, []);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/api/calendar`);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
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

      return {
        id: ev.id, sourceId: 'manual', seriesId: ev.seriesId, 
        title: `${matchPrefix}${ev.title}`, description: ev.description || '', location: ev.location || '',
        start: new Date(ev.startTime), end: ev.endTime ? new Date(ev.endTime) : new Date(ev.startTime + (1000 * 60 * 60)), 
        allDay: ev.isAllDay, sourceEvent: ev, color: ev.color || '#3b82f6',
        showInMatchPlan: ev.showInMatchPlan
      };
    });
    
    const publicSitzungen = sitzungen.filter(ev => ev.plannedStartTime && ev.status !== 'ABGESCHLOSSEN').map(ev => ({
      id: ev.id, sourceId: 'manual', seriesId: undefined, 
      title: `Sitzung: ${ev.title}`, description: ev.description || '', location: ev.location || '',
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
    return [...internalEvents, ...publicSitzungen, ...cachedExternalEvents];
  }, [calendarEvents, sitzungen, calendarSubscriptions]);

  const filteredEvents = useMemo(() => {
    const todayStart = startOfDay(new Date()).getTime();
    const isListView = ['termine', 'dienste'].includes(currentView);

    return rbcEvents.filter(ev => {
      if (currentView === 'agenda' && !ev.showInMatchPlan) {
        return false;
      }

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

  const renderFiltersPanel = () => (
    <div className="space-y-4">
      <div>
        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">Kalender-Abos</span>
        <div className="flex flex-wrap gap-2">
          {calendarSubscriptions.filter(s => s.isActive).length === 0 && <span className="text-sm text-gray-500 italic">Keine aktiv</span>}
          {calendarSubscriptions.filter(s => s.isActive).map(sub => (
            <label key={sub.id} className="flex items-center space-x-2 text-sm cursor-pointer bg-gray-50 px-2 py-1 rounded border border-gray-100 hover:bg-gray-100 transition">
              <input type="checkbox" checked={activeFilters.includes(sub.id)} onChange={() => toggleFilter(sub.id)} className="rounded w-4 h-4 focus:ring-blue-500" style={{ accentColor: sub.color || '#10b981' }}/>
              <span className="font-bold" style={{ color: sub.color || '#10b981' }}>{sub.name}</span>
            </label>
          ))}
        </div>
      </div>
      <div className="border-t border-gray-100 pt-3">
        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">Ansicht</span>
        <div className="flex flex-wrap gap-2">
          <label className="flex items-center space-x-2 text-sm cursor-pointer bg-blue-50 px-2 py-1 rounded border border-blue-100">
            <input type="checkbox" checked={activeFilters.includes('manual')} onChange={() => toggleFilter('manual')} className="rounded w-4 h-4 text-blue-600 focus:ring-blue-500"/>
            <span className="font-bold text-gray-700">Termine</span>
          </label>
          <label className="flex items-center space-x-2 text-sm cursor-pointer bg-orange-50 px-2 py-1 rounded border border-orange-100">
            <input type="checkbox" checked={activeFilters.includes('dienste')} onChange={() => toggleFilter('dienste')} className="rounded w-4 h-4 text-orange-600 focus:ring-orange-500"/>
            <span className="font-bold text-orange-600">Dienste</span>
          </label>
          {['agenda', 'termine', 'dienste'].includes(currentView) && (
            <label className="flex items-center space-x-2 text-sm cursor-pointer bg-gray-50 px-2 py-1 rounded border border-gray-100">
              <input type="checkbox" checked={showEmptyDays} onChange={(e) => setShowEmptyDays(e.target.checked)} className="rounded w-4 h-4 text-gray-600 focus:ring-gray-500"/>
              <span className="text-gray-600 font-bold">Leere Tage</span>
            </label>
          )}
          {['termine', 'dienste'].includes(currentView) && (
            <label className="flex items-center space-x-2 text-sm cursor-pointer bg-gray-50 px-2 py-1 rounded border border-gray-100">
              <input type="checkbox" checked={showPastEvents} onChange={(e) => setShowPastEvents(e.target.checked)} className="rounded w-4 h-4 text-purple-600 focus:ring-purple-500"/>
              <span className="text-gray-600 font-bold">Historie zeigen</span>
            </label>
          )}
        </div>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gray-50">
        <div className="text-blue-500 font-medium animate-pulse">Lade Vereinskalender...</div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-gray-50 overflow-hidden font-sans select-none">
      
      <div className="flex items-center justify-between p-1.5 sm:p-2 border-b border-gray-200 bg-white z-20 print:hidden shadow-sm">
        <div className="flex items-center gap-1 sm:gap-2 flex-1">
          <button onClick={handleNavPrev} className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-md text-gray-600 border border-transparent hover:border-gray-200 transition-colors"><ChevronLeft className="w-5 h-5"/></button>
          <button onClick={() => setCurrentDate(new Date())} className="p-1.5 sm:p-2 hover:bg-blue-50 rounded-md text-blue-600 border border-transparent hover:border-blue-100 transition-colors"><Home className="w-5 h-5"/></button>
          <button onClick={handleNavNext} className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-md text-gray-600 border border-transparent hover:border-gray-200 transition-colors"><ChevronRight className="w-5 h-5"/></button>
          <div className="relative flex items-center ml-1 sm:ml-2">
            <span className="font-bold text-gray-800 text-sm sm:text-base capitalize whitespace-nowrap">{getNavLabel()}</span>
            <input type="date" value={format(currentDate, 'yyyy-MM-dd')} onChange={(e) => { if (e.target.value) setCurrentDate(new Date(e.target.value)); }} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="flex bg-gray-100 p-0.5 rounded-lg overflow-x-auto custom-scrollbar max-w-[140px] sm:max-w-none">
            {['termine', 'dienste', 'agenda', 'month', 'week', 'day'].map(v => (
              <button key={v} onClick={() => handleViewChange(v as any)} className={`px-2.5 py-1.5 text-[11px] sm:text-sm font-bold rounded-md transition flex items-center shrink-0 ${currentView === v ? 'bg-white shadow-sm text-blue-700' : 'text-gray-500 hover:text-gray-700'}`}>
                {v === 'agenda' ? <><ListIcon className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-1.5" /><span className="hidden sm:inline">Spielplan</span></> : 
                 v === 'termine' ? 'Termine' : 
                 v === 'dienste' ? 'Dienste' : 
                 v === 'month' ? 'Monat' : 
                 v === 'week' ? 'Woche' : 'Tag'}
              </button>
            ))}
          </div>
          
          <button onClick={() => setShowFilters(!showFilters)} className={`p-1.5 sm:px-3 sm:py-1.5 rounded-lg border transition flex items-center shadow-sm ${showFilters ? 'bg-blue-100 border-blue-200 text-blue-700' : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
            <Filter className="w-4 h-4 sm:mr-1.5" />
            <span className="hidden sm:inline text-sm font-bold">Optionen</span>
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="absolute top-14 sm:top-16 right-2 left-2 sm:left-auto sm:w-96 bg-white shadow-xl border border-gray-200 rounded-xl p-4 z-30 animate-fade-in print:hidden">
          <div className="flex justify-between items-center mb-3 border-b border-gray-100 pb-3">
            <span className="text-base font-bold text-gray-800">{calendarTitle}</span>
            <div className="flex items-center gap-2">
              <button onClick={() => { setShowFilters(false); window.print(); }} className="flex items-center px-3 py-1.5 bg-gray-100 text-gray-700 text-xs font-bold rounded-lg hover:bg-gray-200 transition shadow-sm">
                <Printer className="w-3.5 h-3.5 mr-1.5" /> Drucken
              </button>
              <button onClick={() => { setShowFilters(false); setShowAboModal(true); }} className="flex items-center px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-bold rounded-lg hover:bg-blue-100 transition shadow-sm">
                <CalendarPlus className="w-3.5 h-3.5 mr-1.5" /> Abo
              </button>
              <button onClick={() => setShowFilters(false)} className="p-1 hover:bg-gray-100 rounded-full text-gray-500 transition-colors"><X className="w-5 h-5"/></button>
            </div>
          </div>
          {renderFiltersPanel()}
        </div>
      )}

      <div className="flex-1 p-1 sm:p-2 overflow-hidden flex flex-col bg-gray-50 print:p-0 print:border-none print:shadow-none print:bg-white" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        {['termine', 'dienste'].includes(currentView) ? renderYearlyList() : (
          <Calendar
            culture="de" localizer={localizer} events={displayEvents} startAccessor="start" endAccessor="end"
            view={currentView as any} toolbar={false} onView={(v) => setCurrentView(v as any)}
            views={{ month: true, week: true, day: true, agenda: CustomAgendaView }}
            date={currentDate} onNavigate={setCurrentDate}
            eventPropGetter={eventStyleGetter} onSelectEvent={handleSelectEvent} popup 
            messages={{ showMore: (total) => `+${total} weitere` }}
            className="h-full font-sans text-xs sm:text-sm bg-white rounded-b-xl shadow-sm border border-gray-200 print:border-none print:shadow-none print:h-[1000px]"
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
                  className="flex items-center justify-center w-full px-4 py-3 bg-gray-900 text-white font-bold rounded-xl hover:bg-gray-800 transition shadow-sm"
                >
                   Apple Kalender (iPhone / Mac)
                </a>
                
                <a 
                  href={`https://calendar.google.com/calendar/render?cid=${encodeURIComponent(`webcal://${window.location.host}/api/calendar`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center w-full px-4 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition shadow-sm"
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

      {selectedEventToView && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-black/40 animate-fade-in" onClick={() => setSelectedEventToView(null)}>
          <div className="bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b flex justify-between items-start" style={{ backgroundColor: `${selectedEventToView.color}15`, borderBottomColor: `${selectedEventToView.color}30` }}>
              <div>
                <h3 className="text-lg font-bold text-gray-900 leading-tight">{selectedEventToView.title}</h3>
                <p className="text-xs font-bold text-gray-500 mt-1 uppercase">
                  {format(selectedEventToView.start!, 'EEEE, dd. MMMM yyyy', { locale: de })}
                </p>
              </div>
              <button onClick={() => setSelectedEventToView(null)} className="p-2 hover:bg-white/50 rounded-full transition-colors"><X size={20} className="text-gray-500"/></button>
            </div>
            
            <div className="p-5 space-y-4 bg-white">
              <div className="flex items-center text-sm text-gray-700 bg-gray-50 p-3 rounded-lg border border-gray-100">
                <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center mr-3 text-gray-500 shrink-0"><Clock size={18}/></div>
                <div>
                  <p className="font-bold text-xs uppercase tracking-wider text-gray-400 mb-0.5">Zeit</p>
                  <p className="font-medium">{selectedEventToView.allDay ? 'Ganztägig' : `${format(selectedEventToView.start!, 'HH:mm')} - ${format(selectedEventToView.end!, 'HH:mm')} Uhr`}</p>
                </div>
              </div>
              
              {selectedEventToView.location && (
                <div className="flex items-start text-sm text-gray-700 bg-gray-50 p-3 rounded-lg border border-gray-100">
                  <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center mr-3 text-gray-500 shrink-0"><MapPin size={18}/></div>
                  <div className="flex-1">
                    <p className="font-bold text-xs uppercase tracking-wider text-gray-400 mb-0.5">Ort</p>
                    <p className="font-medium whitespace-pre-wrap">{selectedEventToView.location}</p>
                    <a 
                      href={`https://www.google.com/maps/search/?api=1&query=$${encodeURIComponent(selectedEventToView.location)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-bold rounded-lg hover:bg-blue-100 transition-colors print:hidden shadow-sm"
                    >
                      <MapPin className="w-3.5 h-3.5 mr-1.5" />
                      In Google Maps öffnen
                    </a>
                  </div>
                </div>
              )}
              
              {selectedEventToView.description && (
                <div className="flex items-start text-sm text-gray-700 bg-gray-50 p-3 rounded-lg border border-gray-100">
                  <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center mr-3 text-gray-500 shrink-0"><Info size={18}/></div>
                  <div className="flex-1">
                     <p className="font-bold text-xs uppercase tracking-wider text-gray-400 mb-0.5">Details</p>
                     <p className="whitespace-pre-wrap leading-relaxed">{selectedEventToView.description}</p>
                  </div>
                </div>
              )}
            </div>
            
            <div className="p-4 bg-gray-50 flex justify-end border-t border-gray-100">
              <button onClick={() => setSelectedEventToView(null)} className="px-6 py-2 bg-gray-900 text-white text-sm font-bold rounded-xl shadow-md hover:bg-gray-800 transition-colors">
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