// [2026-10-19] - UX-FEATURE: Rollierendes 5-Wochen-Monatsgitter (CalendarMonthGridView) für den Reiter "Monat" eingebunden (Heute startet immer in Zeile 1, nahtloser Übergang in den Folgemonat).
// [2026-10-19] - UX-OPTIMIZATION: In der Monatsansicht wird der gesamte Platz im Balken für "[Heim/Auswärts] [Team] [Gegner]" reserviert (Markierung eigener Spiele erfolgt über grüne Tageskachel + kräftigen Rahmen).
// [2026-10-19] - UX-FEATURE: Kalenderansicht nutzt nun den kompakten Gegner-Titel (calendarTitle ohne eigenen Vereinsnamen) und schaltet im Handy-Hochformat (Monatsansicht) automatisch auf mobileShortTitle (z.B. "🏠 H1") um.
// [2026-10-18] - UX-FEATURE: Persönliche Einteilungen in der Monats-/Wochen-/Tagesansicht hervorgehoben (dezente grüne Tageskachel via dayPropGetter, Symbol hinter dem Titel via titleAccessor und kräftigerer Rahmen via eventPropGetter).
// [2026-10-13] - ARCHITECTURE-FIX: Spielplan (Agenda View) vollständig aus dem react-big-calendar Plugin befreit! Wird nun wie "Termine" und "Dienste" als eigenständige Komponente direkt im DOM verankert, um Mobile-Scroll-Bugs restlos zu beseitigen.
// [2026-10-12] - REFACTOR: Hauptkomponente drastisch vereinfacht. Daten-Logik (useCalendarEvents) und komplexe Ansichten (CalendarListView, CalendarAgendaView) in eigene Dateien ausgelagert.
// [2026-10-12] - BUGFIX: TS6133 'idx' is declared but its value is never read behoben.
// [2026-10-12] - BUGFIX: Auto-Scroll in Listenansichten (Termine/Dienste) angepasst.
// [2026-10-12] - FEATURE: Auto-Scroll (Contextual Nav) in den Listenansichten integriert.
// [2026-10-12] - FEATURE: Heimspiel-Logik in "Dienste" implementiert.
// [2026-10-12] - FEATURE: Abfahrtszeit (departureTime) in die Dienste-Liste integriert.
// [2026-10-11] - BUGFIX: Deep-Link Logik repariert.
// [2026-10-09] - FEATURE: Logistik-Dienste in die "Dienste"-Ansicht integriert.
// [2026-07-26] - BUGFIX: Dienstübernahme (Takeover) macht nun einen harten Schnitt.
// [2026-05-30] - UX-OPTIMIERUNG: Einheitlicher Workflow für alle Nutzer. Jeder Klick öffnet zuerst das CalendarIcsDetailModal.
// src/features/Events/CalendarView.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format } from 'date-fns/format';
import { parse } from 'date-fns/parse';
import { startOfWeek } from 'date-fns/startOfWeek';
import { endOfWeek } from 'date-fns/endOfWeek';
import { getDay } from 'date-fns/getDay';
import { addWeeks, subWeeks, addDays, subDays, addYears, subYears } from 'date-fns';
import { de } from 'date-fns/locale/de';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { useClubStore } from '../../store/useClubStore';
import { Plus, DownloadCloud, Globe, Settings, Edit3, Printer, ChevronLeft, ChevronRight, Home, List as ListIcon, Filter, CalendarPlus, Copy, Check, X } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

import { CalendarEventFormModal } from './CalendarEventFormModal';
import { CalendarSubscriptionModal } from './CalendarSubscriptionModal';
import { CalendarIcsDetailModal } from './CalendarIcsDetailModal';
import { CalendarBulkEventModal } from './CalendarBulkEventModal';
import { CalendarExportModal } from './CalendarExportModal';

import { useCalendarEvents } from './hooks/useCalendarEvents';
import type { AdaptedEvent } from './hooks/useCalendarEvents';
import { CalendarListView } from './components/CalendarListView';
import { CalendarAgendaView } from './components/CalendarAgendaView';
import { CalendarMonthGridView } from './components/CalendarMonthGridView';

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

export const CalendarView: React.FC = () => {
  const { 
    user, roleProfiles, calendarSubscriptions, 
    fetchCalendarData, isCalendarLoading, fetchEvents,
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
  const [selectedEventToEdit, setSelectedEventToEdit] = useState<any>(undefined);
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

  // --- HOOKS FÜR LOGIK UND ANSICHTEN ---
  const { rbcEvents, displayEvents } = useCalendarEvents({ currentView, activeFilters, showPastEvents });

  const myAssignedDayKeys = useMemo(() => {
    const set = new Set<string>();
    displayEvents.forEach(e => {
      if (e.isMyAssignment && e.start) {
        set.add(format(e.start, 'yyyy-MM-dd'));
      }
    });
    return set;
  }, [displayEvents]);
  
  const handleSelectEvent = (event: AdaptedEvent) => {
    if (event.id.startsWith('ics-') || event.id.startsWith('logistics-')) { 
      setSelectedIcsEvent(event); 
      setIsIcsDetailModalOpen(true); 
      return; 
    }
    if (event.rawSitzung) { navigate(`/events/${event.rawSitzung.id}`); return; }
    
    if (event.sourceEvent) {
      setSelectedIcsEvent(event);
      setIsIcsDetailModalOpen(true);
    }
  };

  // --- DEEP LINKING ---
  useEffect(() => {
    if (location.state?.targetDate) {
      setCurrentDate(new Date(location.state.targetDate));
    }

    if (location.state && rbcEvents.length > 0) {
      const { openEventId, openEventSubId, openEventUid } = location.state;
      
      if (openEventId || (openEventSubId && openEventUid)) {
        const target = rbcEvents.find(e => {
          if (openEventSubId && openEventUid) {
             return e.sourceId === openEventSubId && e.sourceEvent?.uid === openEventUid;
          }
          if (openEventId) {
             if (e.id === openEventId) return true;
             if (e.sourceEvent && e.sourceEvent.id === openEventId) return true;
             if (e.rawSitzung && e.rawSitzung.id === openEventId) return true;
          }
          return false;
        });

        if (target) {
          handleSelectEvent(target);
          navigate(location.pathname, { replace: true, state: {} });
        }
      }
    }
  }, [location.state, rbcEvents, location.pathname, navigate]);

  // --- NAVIGATION ---
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
    else if (currentView === 'month') setCurrentDate(subWeeks(currentDate, 4));
    else if (currentView === 'week') setCurrentDate(subWeeks(currentDate, 1));
    else setCurrentDate(subDays(currentDate, 1));
  };

  const handleNavNext = () => {
    if (['termine', 'dienste', 'agenda'].includes(currentView)) setCurrentDate(addYears(currentDate, 1));
    else if (currentView === 'month') setCurrentDate(addWeeks(currentDate, 4));
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
    // In der rollierenden 5-Wochen-Monatsansicht prüfen wir, ob sich das 5-Wochen-Fenster über 2 Monate erstreckt
    const firstWeekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const fifthWeekEnd = endOfWeek(addWeeks(firstWeekStart, 4), { weekStartsOn: 1 });
    if (firstWeekStart.getMonth() !== fifthWeekEnd.getMonth()) {
      return `${format(firstWeekStart, 'MMM', { locale: de })} – ${format(fifthWeekEnd, 'MMM yyyy', { locale: de })}`;
    }
    return format(currentDate, 'MMMM yyyy', { locale: de });
  };

  // --- RENDER HILFSFUNKTIONEN FÜR DAS PANEL ---
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
      
      {/* HEADER & NAV */}
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

      {/* FILTER & EINSTELLUNGEN PANEL */}
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
      
      {/* HAUPT-ANSICHT (RBC oder Listen) */}
      <div 
        className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 p-2 sm:p-3 overflow-hidden flex flex-col min-h-[700px] lg:min-h-[850px] xl:min-h-[1000px]"
        onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}
      >
        {isCalendarLoading ? ( 
          <div className="flex-1 flex items-center justify-center text-gray-400 animate-pulse font-medium">Lade Vereinskalender...</div> 
        ) : ['termine', 'dienste'].includes(currentView) ? (
          <CalendarListView 
             currentView={currentView as 'termine' | 'dienste'} 
             displayEvents={displayEvents} 
             currentDate={currentDate} 
             onSelectEvent={handleSelectEvent} 
          />
        ) : currentView === 'agenda' ? (
          <CalendarAgendaView 
            currentDate={currentDate}
            events={displayEvents}
            showEmptyDays={showEmptyDays}
            onSelectEvent={handleSelectEvent}
          />
        ) : currentView === 'month' ? (
          <CalendarMonthGridView
            currentDate={currentDate}
            events={displayEvents}
            onSelectEvent={handleSelectEvent}
          />
        ) : (
          <Calendar
            culture="de" localizer={localizer} events={displayEvents} startAccessor="start" endAccessor="end"
            titleAccessor={(event: AdaptedEvent) => {
              const base = event.calendarTitle || (event.title as string);
              return event.myAssignmentIcons ? `${base} ${event.myAssignmentIcons}` : base;
            }}
            view={currentView as any} toolbar={false} onView={handleViewChange}
            views={{ week: true, day: true }}
            date={currentDate} onNavigate={(date) => setCurrentDate(date)}
            dayPropGetter={(date: Date) => {
              const dateKey = format(date, 'yyyy-MM-dd');
              const todayKey = format(new Date(), 'yyyy-MM-dd');
              if (myAssignedDayKeys.has(dateKey) && dateKey !== todayKey) {
                return { style: { backgroundColor: '#ecfdf5' } };
              }
              return {};
            }}
            eventPropGetter={(event: AdaptedEvent) => ({ 
              style: { 
                backgroundColor: event.color || '#3b82f6', 
                borderRadius: '6px', 
                opacity: event.isMyAssignment ? 1 : 0.88, 
                color: getContrastYIQ(event.color || '#3b82f6'), 
                border: event.isMyAssignment ? '2px solid #065f46' : 'none', 
                fontWeight: event.isMyAssignment ? 700 : 500,
                boxShadow: event.isMyAssignment ? '0 1px 3px rgba(0,0,0,0.2)' : 'none',
                display: 'block', 
                cursor: 'pointer' 
              } 
            })} 
            onSelectEvent={handleSelectEvent} 
            popup 
            messages={{ showMore: (total) => `+${total} weitere` }}
            className="font-sans text-xs sm:text-sm"
          />
        )}
      </div>

      {/* MODALS */}
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
            let existingName = "";
            if (ev.title.includes(':')) {
              existingName = ev.title.split(':')[1].trim();
            }
            
            const confirmMessage = existingName 
              ? `Willst du den Dienst von ${existingName} wirklich übernehmen?`
              : `Willst du diesen Dienst wirklich übernehmen?`;
              
            if (!window.confirm(confirmMessage)) return;

            try {
              let newTitle = ev.title;
              const displayName = myHelper.alias || myHelper.name;
              if (newTitle.includes(':')) {
                newTitle = newTitle.split(':')[0].trim() + ': ' + displayName;
              } else {
                newTitle = newTitle.trim() + ': ' + displayName;
              }

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