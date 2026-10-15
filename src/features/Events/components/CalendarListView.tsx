// [2026-10-15] - FEATURE: 'ignoreYearFilter' Prop hinzugefügt, damit die Listen-Ansicht nahtlos als Child-Komponente im Saison-Modal (MatchLineupMatrix) verwendet werden kann.
// [2026-10-14] - BUGFIX: 'title' Typisierungsfehler behoben (typeof e.title === 'string').
// [2026-10-14] - UX-FEATURE: Langzeitgedächtnis für den Dienste-Filter! Die ausgewählten Kategorien (dienstFilters) werden nun via localStorage dauerhaft gespeichert.
// [2026-10-14] - UX-FIX: Layout-Quetschung behoben. 'w-full' von der Titel-Spalte entfernt und stattdessen harte Mindestbreiten für Betreuer/Fahrer eingeführt.
// [2026-10-14] - BUGFIX: React Hook Order Error (Crash beim Filtern) behoben. Der 'useMemo' Hook für die Tages-Gruppierung (groupedDienste) wurde vor das Early-Return verschoben.
// [2026-10-14] - UX-FEATURE: 100% Agenda-Design (Karten-Look) für gruppierte Dienste implementiert! 
// [2026-10-14] - UX-FEATURE: Emojis aus den Desktop-Logistikzellen entfernt (hideIcon) und stattdessen zentral in den Spalten-Header gepackt.
// src/features/Events/components/CalendarListView.tsx
import React, { useState, useMemo, useRef, useLayoutEffect, useEffect } from 'react';
import { format } from 'date-fns/format';
import { getISOWeek } from 'date-fns/getISOWeek';
import { startOfDay } from 'date-fns/startOfDay';
import { de } from 'date-fns/locale/de';
import { CalendarDays, ChevronDown } from 'lucide-react';
import type { AdaptedEvent } from '../hooks/useCalendarEvents';
import { useClubStore } from '../../../store/useClubStore';
import { MatchLineupLogisticsRow } from '../../Users/components/MatchLineupLogisticsRow';
import { generateStableEventId } from '../../Users/hooks/useMatchLineupMatrix';

// SMART COMPONENT: Abonniert live die Stimmen für exakt diesen einen Termin
const InlinePollSummary: React.FC<{ eventId: string; pollConfig: any }> = ({ eventId, pollConfig }) => {
  const { subscribeToEventPoll, unsubscribeFromEventPoll, pollResponsesByEvent } = useClubStore();

  useEffect(() => {
    subscribeToEventPoll(eventId);
    return () => unsubscribeFromEventPoll(eventId);
  }, [eventId, subscribeToEventPoll, unsubscribeFromEventPoll]);

  const responses = pollResponsesByEvent[eventId] || [];

  if (!pollConfig?.isActive || !pollConfig?.options) return null;

  if (responses.length === 0) {
    return (
      <span className="inline-flex items-center text-[10px] sm:text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-md shadow-sm whitespace-nowrap w-max shrink-0 mt-0.5 lg:mt-0">
        📊 Abstimmung
      </span>
    );
  }

  const parts = pollConfig.options.map((opt: any) => {
    const count = responses.filter((r: any) => (r.selectedOptionIds || []).includes(opt.id)).length;
    const match = opt.text.match(/^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)/u);
    const emoji = match ? match[1] : '';
    return emoji ? `${count} ${emoji}`.trim() : `${count}`;
  });

  return (
    <span className="inline-flex items-center text-[10px] sm:text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-md shadow-sm whitespace-nowrap w-max shrink-0 mt-0.5 lg:mt-0">
      📊 {parts.join(' | ')}
    </span>
  );
};

// SMART COMPONENT: Bringt die Saisonplaner-Logistik (Admin-Cockpit) direkt in die Liste!
const SmartLogisticsBlock: React.FC<{ event: AdaptedEvent; type: 'all' | 'betreuer' | 'fahrer' }> = ({ event, type }) => {
  const { user, helpers, teams, matchLineups, saveMatchLineup } = useClubStore();
  
  const [openPicker, setOpenPicker] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [localOverrides, setLocalOverrides] = useState<Record<string, any>>({});

  const sourceEvent = event.sourceEvent;
  if (!sourceEvent) return null;

  const team = teams.find(t => t.name === event.teamName);
  if (!team) return null;

  const myHelper = helpers.find(h => h.email?.toLowerCase() === user?.email?.toLowerCase());
  const myHelperId = myHelper?.id;

  const isAdmin = user?.roleProfileId === 'pro-admin';
  const isCaptain = team.captainHelperIds?.includes(myHelperId || '');
  const canManageLineup = isAdmin || isCaptain;
  const isReadOnly = !canManageLineup;

  const sortedHelpers = useMemo(() => [...helpers].sort((a, b) => (a.name || '').localeCompare(b.name || '')), [helpers]);
  const filteredHelpers = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return sortedHelpers;
    return sortedHelpers.filter(h => (h.name || '').toLowerCase().includes(term) || (h.alias || '').toLowerCase().includes(term));
  }, [sortedHelpers, searchTerm]);

  const safeEventId = generateStableEventId(team.id, sourceEvent);

  const handleLogisticsAction = async (eventId: string, logisticsType: 'fahrerHelperIds' | 'betreuerHelperIds', action: 'add' | 'remove' | 'takeover', targetHelperId: string, oldHelperId?: string) => {
     const currentLineup = matchLineups.find(m => m.id === eventId);
     const currentIds = localOverrides[eventId]?.[logisticsType] !== undefined 
        ? localOverrides[eventId][logisticsType] 
        : (currentLineup?.[logisticsType] || []);

     let newIds = [...currentIds];
     if (action === 'add') { if (!newIds.includes(targetHelperId)) newIds.push(targetHelperId); }
     else if (action === 'remove') { newIds = newIds.filter(id => id !== targetHelperId); }
     else if (action === 'takeover' && oldHelperId) {
       newIds = newIds.filter(id => id !== oldHelperId);
       if (!newIds.includes(targetHelperId)) newIds.push(targetHelperId);
     }

     setLocalOverrides((prev: any) => ({ ...prev, [eventId]: { ...prev[eventId], [logisticsType]: newIds } }));

     const newLineup: any = {
       id: eventId,
       schemaVersion: '1.0',
       teamId: team.id,
       lineupHelperIds: currentLineup?.lineupHelperIds || team.defaultLineupHelperIds || [],
       availabilities: currentLineup?.availabilities || {},
       isSetByMF: currentLineup?.isSetByMF || {},
       isLocked: currentLineup?.isLocked,
       betreuerHelperIds: logisticsType === 'betreuerHelperIds' ? newIds : (currentLineup?.betreuerHelperIds || []),
       fahrerHelperIds: logisticsType === 'fahrerHelperIds' ? newIds : (currentLineup?.fahrerHelperIds || []),
       departureTime: currentLineup?.departureTime,
       updatedAt: Date.now()
     };
     await saveMatchLineup(newLineup);
  };

  const handleDepartureTimeChange = async (eventId: string, newTime: string) => {
     const currentLineup = matchLineups.find(m => m.id === eventId);
     setLocalOverrides((prev: any) => ({ ...prev, [eventId]: { ...prev[eventId], departureTime: newTime } }));
     
     const newLineup: any = {
        id: eventId,
        schemaVersion: '1.0',
        teamId: team.id,
        lineupHelperIds: currentLineup?.lineupHelperIds || team.defaultLineupHelperIds || [],
        availabilities: currentLineup?.availabilities || {},
        isSetByMF: currentLineup?.isSetByMF || {},
        isLocked: currentLineup?.isLocked,
        betreuerHelperIds: currentLineup?.betreuerHelperIds || [],
        fahrerHelperIds: currentLineup?.fahrerHelperIds || [],
        departureTime: newTime,
        updatedAt: Date.now()
     };
     await saveMatchLineup(newLineup);
  };

  const isHomeGame = sourceEvent.location?.toLowerCase().includes('maisach') || false;
  const storeLineup = matchLineups.find(m => m.id === safeEventId);
  const hasAssignedDrivers = (localOverrides[safeEventId]?.fahrerHelperIds || storeLineup?.fahrerHelperIds || []).length > 0;
  
  const showBetreuer = team.requiresBetreuer && (type === 'all' || type === 'betreuer');
  const showFahrer = team.requiresFahrer && (!isHomeGame || hasAssignedDrivers || !isReadOnly) && (type === 'all' || type === 'fahrer');

  if (!showBetreuer && !showFahrer) return null;
  
  const shouldHideIcon = type !== 'all'; 

  return (
    <div className={`flex w-full ${type === 'all' ? 'flex-col gap-2 mt-1.5 pt-1.5 border-t border-gray-100/80' : 'items-center'}`}>
       {showBetreuer && (
         <div className="w-full">
           <MatchLineupLogisticsRow 
              type="betreuerHelperIds" label="🧑‍🏫 Betreuer" event={sourceEvent} team={team} isReadOnly={isReadOnly}
              myHelperId={myHelperId} hideIcon={shouldHideIcon} sortedAllHelpers={sortedHelpers} filteredLogisticsHelpers={filteredHelpers}
              openLogisticsPicker={openPicker} setOpenLogisticsPicker={setOpenPicker}
              logisticsSearchTerm={searchTerm} setLogisticsSearchTerm={setSearchTerm}
              localLogisticsOverrides={localOverrides} matchLineups={matchLineups}
              onLogisticsAction={handleLogisticsAction} onDepartureTimeChange={handleDepartureTimeChange}
           />
         </div>
       )}
       {showFahrer && (
         <div className="w-full">
           <MatchLineupLogisticsRow 
              type="fahrerHelperIds" label="🚗 Fahrer" event={sourceEvent} team={team} isReadOnly={isReadOnly}
              myHelperId={myHelperId} hideIcon={shouldHideIcon} sortedAllHelpers={sortedHelpers} filteredLogisticsHelpers={filteredHelpers}
              openLogisticsPicker={openPicker} setOpenLogisticsPicker={setOpenPicker}
              logisticsSearchTerm={searchTerm} setLogisticsSearchTerm={setSearchTerm}
              localLogisticsOverrides={localOverrides} matchLineups={matchLineups}
              onLogisticsAction={handleLogisticsAction} onDepartureTimeChange={handleDepartureTimeChange}
           />
         </div>
       )}
    </div>
  );
};


interface CalendarListViewProps {
  currentView: 'termine' | 'dienste';
  displayEvents: AdaptedEvent[];
  currentDate: Date;
  onSelectEvent: (event: AdaptedEvent) => void;
  ignoreYearFilter?: boolean; // <--- NEU
}

export const CalendarListView: React.FC<CalendarListViewProps> = ({
  currentView,
  displayEvents,
  currentDate,
  onSelectEvent,
  ignoreYearFilter
}) => {
  const [dienstFilters, setDienstFilters] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('papatodo_dienste_filters');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const listContainerRef = useRef<HTMLDivElement>(null);
  
  const isDienste = currentView === 'dienste';
  const today = startOfDay(new Date());

  useEffect(() => {
    localStorage.setItem('papatodo_dienste_filters', JSON.stringify(dienstFilters));
  }, [dienstFilters]);

  useLayoutEffect(() => {
    if (listContainerRef.current) {
      const timeoutId = setTimeout(() => {
        const wrapper = listContainerRef.current;
        if (!wrapper) return;
        
        const scrollContainer = wrapper.querySelector('.overflow-y-auto') || wrapper;
        const firstFutureEl = scrollContainer.querySelector('[data-is-future-row="true"]') as HTMLElement;
        
        if (firstFutureEl) {
          scrollContainer.scrollTo({
             top: Math.max(0, firstFutureEl.offsetTop - 45),
             behavior: 'smooth'
          });
        }
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [currentView, currentDate, dienstFilters, displayEvents]);

  const getCategory = (e: AdaptedEvent) => {
     if (e.isLogisticsDuty) return e.teamName || 'Dienste'; 
     const titleStr = String(e.title || '');
     if (titleStr.includes(':')) return titleStr.split(':')[0].trim();
     return titleStr.trim();
  };

  const yearEvents = useMemo(() => {
    if (ignoreYearFilter) return displayEvents;
    return displayEvents.filter(e => e.start && e.start.getFullYear() === currentDate.getFullYear());
  }, [displayEvents, currentDate, ignoreYearFilter]);

  const categories = useMemo(() => {
    return Array.from(new Set(yearEvents.map(getCategory))).sort();
  }, [yearEvents]);

  const filteredYearEvents = useMemo(() => {
    const filtered = yearEvents.filter(e => dienstFilters.length === 0 || dienstFilters.includes(getCategory(e)));
    filtered.sort((a, b) => {
      if (a.start!.getTime() !== b.start!.getTime()) return a.start!.getTime() - b.start!.getTime();
      if (a.allDay && !b.allDay) return -1;
      if (!a.allDay && b.allDay) return 1;
      return 0;
    });
    return filtered;
  }, [yearEvents, dienstFilters]);

  const groupedDienste = useMemo(() => {
     if (!isDienste) return [];
     const groups: { dateStr: string; date: Date; events: AdaptedEvent[] }[] = [];
     let lastDateStr = '';
     let currentGroup: any = null;
     
     filteredYearEvents.forEach(e => {
        const dateStr = format(e.start!, 'yyyy-MM-dd');
        if (dateStr !== lastDateStr) {
           currentGroup = { dateStr, date: e.start!, events: [] };
           groups.push(currentGroup);
           lastDateStr = dateStr;
        }
        currentGroup.events.push(e);
     });
     return groups;
  }, [filteredYearEvents, isDienste]);

  const handleToggleFilter = (cat: string) => {
    if (dienstFilters.includes(cat)) {
      setDienstFilters(dienstFilters.filter(c => c !== cat));
    } else {
      setDienstFilters([...dienstFilters, cat]);
    }
  };

  const filterLabel = dienstFilters.length === 0 
    ? 'ALLE DIENSTE' 
    : (dienstFilters.length === 1 ? dienstFilters[0].toUpperCase() : `${dienstFilters.length} AUSGEWÄHLT`);

  if (filteredYearEvents.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-gray-400 h-full p-8 relative">
        <CalendarDays className="w-12 h-12 mb-3 opacity-20" />
        <p>Keine {currentView === 'termine' ? 'Termine' : 'Dienste'} für das gewählte Kriterium gefunden.</p>
        {dienstFilters.length > 0 && (
          <button onClick={() => setDienstFilters([])} className="mt-4 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-bold hover:bg-gray-200">
            Filter zurücksetzen
          </button>
        )}
      </div>
    );
  }

  // --- SMART TABLE RENDER LOGIC ---
  const showDateHeaders = isDienste && (dienstFilters.length === 0 || dienstFilters.length > 1);
  const tableRows: React.ReactNode[] = [];

  if (isDienste) {
    groupedDienste.forEach((group, gIndex) => {
       const { dateStr, date, events } = group;
       
       if (showDateHeaders && gIndex > 0) {
          tableRows.push(
             <tr key={`spacer-${dateStr}`} className="h-6 bg-transparent">
                <td colSpan={5} className="border-0"></td>
             </tr>
          );
       }
       
       if (showDateHeaders) {
          const isToday = date.getTime() === startOfDay(new Date()).getTime();
          tableRows.push(
             <tr key={`header-${dateStr}`} className="bg-gray-50">
                <td colSpan={5} className={`py-2.5 px-4 text-[13px] font-bold rounded-t-xl border-t border-l border-r ${isToday ? 'bg-blue-50 border-blue-200 text-blue-800' : 'border-gray-200 text-gray-700'}`}>
                   {format(date, 'EEEE, dd. MMMM yyyy', { locale: de })}
                   {isToday && <span className="ml-2 text-[10px] uppercase tracking-wider font-bold bg-blue-600 text-white px-2 py-0.5 rounded-full">Heute</span>}
                </td>
             </tr>
          );
       }

       events.forEach((e, eIndex) => {
          const isLast = eIndex === events.length - 1;
          const startD = e.start!;
          const kw = getISOWeek(startD);
          const isFutureRow = startOfDay(startD).getTime() >= today.getTime();
          const dataIsFutureRow = isFutureRow ? "true" : "false";
          
          let timeStr = 'Ganztägig';
          if (!e.allDay) timeStr = format(startD, 'HH:mm');
          
          let rowClasses = `cursor-pointer transition-colors group ${!isFutureRow ? 'opacity-60 bg-white/60 hover:bg-gray-50/50' : 'bg-white hover:bg-blue-50/50'}`;
          let firstTdClass = "";
          let lastTdClass = "";
          let tdBorder = "border-b border-gray-100";
          let leftBorderStyle: React.CSSProperties = {};
          
          if (showDateHeaders) {
             firstTdClass = "border-l-[4px] ";
             leftBorderStyle = { borderLeftColor: e.color || '#3b82f6' };
             lastTdClass = "border-r border-gray-200";
             
             if (isLast) {
                rowClasses += " shadow-[0_2px_4px_rgba(0,0,0,0.03)]";
                firstTdClass += " rounded-bl-xl";
                lastTdClass += " rounded-br-xl";
                tdBorder = "border-b border-gray-200"; 
             }
          }

          tableRows.push(
             <tr key={e.id} data-is-future-row={dataIsFutureRow} className={rowClasses} onClick={() => onSelectEvent(e)}>
                <td className={`py-3 px-4 text-gray-900 font-medium whitespace-nowrap align-top lg:align-middle w-12 ${tdBorder} ${firstTdClass}`} style={leftBorderStyle}>
                   {kw}
                </td>
                
                <td className={`py-3 px-4 text-gray-600 whitespace-nowrap align-top lg:align-middle w-20 ${tdBorder}`}>
                   {showDateHeaders ? (
                      <span className="font-bold text-gray-700">{timeStr === 'Ganztägig' ? timeStr : `${timeStr} Uhr`}</span>
                   ) : (
                      <div className="flex flex-col">
                         <span className="font-bold text-gray-800">{format(startD, 'E, dd.MM.', { locale: de })}</span>
                         <span className="text-xs text-gray-500">{timeStr === 'Ganztägig' ? timeStr : `${timeStr} Uhr`}</span>
                      </div>
                   )}
                </td>
                
                <td className={`py-3 px-4 align-top lg:align-middle min-w-[200px] w-auto ${tdBorder}`}>
                   <div className="flex flex-col lg:flex-row lg:items-center gap-1.5 lg:gap-4 min-w-0 w-full overflow-hidden">
                      <div className="font-bold text-gray-900 group-hover:text-blue-700 transition-colors flex items-start lg:items-center min-w-0 shrink">
                         {!showDateHeaders && (
                            <span className="inline-block w-3 h-3 rounded-full mr-2 shrink-0 mt-1 lg:mt-0" style={{ backgroundColor: e.color || '#3b82f6' }}></span>
                         )}
                         <span className="truncate block flex-1" title={typeof e.title === 'string' ? e.title : undefined}>{e.title}</span>
                      </div>
                      
                      {e.sourceEvent?.pollConfig?.isActive && (
                         <div className="ml-5 lg:ml-0 shrink-0">
                            <InlinePollSummary eventId={e.sourceEvent.id} pollConfig={e.sourceEvent.pollConfig} />
                         </div>
                      )}
                      
                      {e.isLogisticsDuty && (
                         <div className="ml-5 lg:hidden mt-2 flex-1 w-full min-w-0">
                            <SmartLogisticsBlock event={e} type="all" />
                         </div>
                      )}
                   </div>
                </td>
                
                <td className={`hidden lg:table-cell align-middle px-4 py-3 w-40 min-w-[160px] border-l border-gray-100/50 ${tdBorder}`}>
                   {e.isLogisticsDuty ? <SmartLogisticsBlock event={e} type="betreuer" /> : null}
                </td>
                <td className={`hidden lg:table-cell align-middle px-4 py-3 w-[320px] min-w-[320px] border-l border-gray-100/50 ${tdBorder} ${lastTdClass}`}>
                   {e.isLogisticsDuty ? <SmartLogisticsBlock event={e} type="fahrer" /> : null}
                </td>
             </tr>
          );
       });
    });

  } else {
    filteredYearEvents.forEach(e => {
       const startD = e.start!;
       const isFutureRow = startOfDay(startD).getTime() >= today.getTime();
       const dataIsFutureRow = isFutureRow ? "true" : "false";
       const dateStr = format(startD, 'dd.MM.yyyy', { locale: de });
       const tdBorder = "border-b border-gray-100";
       
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
       
       tableRows.push(
          <tr key={e.id} data-is-future-row={dataIsFutureRow} className={`hover:bg-blue-50 cursor-pointer transition-colors group ${!isFutureRow ? 'opacity-60 bg-white/50' : 'bg-white'}`} onClick={() => onSelectEvent(e)}>
             <td className={`py-3 px-4 text-gray-900 font-medium whitespace-nowrap align-top lg:align-middle ${tdBorder}`}>{dateStr}</td>
             <td className={`py-3 px-4 text-gray-600 whitespace-nowrap align-top lg:align-middle ${tdBorder}`}>{timeStr}</td>
             <td className={`py-3 px-4 align-top lg:align-middle min-w-[200px] w-auto ${tdBorder}`}>
                <div className="flex flex-col lg:flex-row lg:items-center gap-1 lg:gap-3 min-w-0 w-full overflow-hidden">
                   <div className="font-bold text-gray-900 group-hover:text-blue-700 transition-colors flex items-start lg:items-center min-w-0 shrink">
                      <span className="inline-block w-3 h-3 rounded-full mr-2 shrink-0 mt-1 lg:mt-0" style={{ backgroundColor: e.color || '#3b82f6' }}></span>
                      <span className="truncate block flex-1" title={typeof e.title === 'string' ? e.title : undefined}>{e.title}</span>
                   </div>
                   {e.sourceEvent?.pollConfig?.isActive && (
                      <div className="ml-5 lg:ml-0 shrink-0">
                        <InlinePollSummary eventId={e.sourceEvent.id} pollConfig={e.sourceEvent.pollConfig} />
                      </div>
                   )}
                </div>
             </td>
             <td className={`py-3 px-4 text-gray-600 truncate max-w-[200px] align-top lg:align-middle ${tdBorder}`} title={e.location}>{e.location}</td>
          </tr>
       );
    });
  }

  return (
    <div className="flex flex-col w-full h-full relative" ref={listContainerRef}>
      <div className="overflow-y-auto overflow-x-auto w-full flex-1 custom-scrollbar pb-48 relative bg-gray-50/40 rounded-xl">
        <table className="w-full text-left border-separate border-spacing-0 min-w-[600px] relative">
          <thead className="sticky top-0 bg-white shadow-sm z-30">
            <tr className="text-sm">
              {isDienste ? (
                <>
                  <th className="py-3 px-4 font-bold text-gray-700 w-12 border-b border-gray-200">KW</th>
                  <th className="py-3 px-4 font-bold text-gray-700 w-20 border-b border-gray-200 uppercase tracking-wider">
                     {showDateHeaders ? 'Zeit' : 'Datum'}
                  </th>
                  <th className="py-3 px-4 font-bold text-gray-700 relative border-b border-gray-200">
                     <button 
                        onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)} 
                        className="flex items-center gap-1.5 font-bold text-gray-800 hover:text-blue-700 outline-none transition-colors"
                        title="Dienste gezielt filtern"
                     >
                        {filterLabel}
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                     </button>
                     
                     {isFilterMenuOpen && (
                        <>
                           <div className="fixed inset-0 z-40" onClick={() => setIsFilterMenuOpen(false)}></div>
                           <div className="absolute top-full left-4 mt-2 w-56 bg-white border border-gray-200 shadow-xl rounded-xl p-2 z-50 flex flex-col gap-0.5" onClick={e => e.stopPropagation()}>
                              <label className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer text-sm font-medium transition-colors">
                                 <input 
                                    type="checkbox" 
                                    checked={dienstFilters.length === 0} 
                                    onChange={() => setDienstFilters([])} 
                                    className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4" 
                                 />
                                 Alle Dienste zeigen
                              </label>
                              <div className="h-px bg-gray-100 my-1 mx-2"></div>
                              {categories.map(c => (
                                 <label key={c} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer text-sm font-medium transition-colors">
                                    <input 
                                       type="checkbox" 
                                       checked={dienstFilters.includes(c)} 
                                       onChange={() => handleToggleFilter(c)} 
                                       className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4" 
                                    />
                                    {c}
                                 </label>
                              ))}
                           </div>
                        </>
                     )}
                  </th>
                  <th className="py-3 px-4 font-bold text-gray-700 w-40 min-w-[160px] hidden lg:table-cell border-b border-gray-200">🧑‍🏫 Betreuer</th>
                  <th className="py-3 px-4 font-bold text-gray-700 w-[320px] min-w-[320px] hidden lg:table-cell border-b border-gray-200">🚗 Fahrer</th>
                </>
              ) : (
                <>
                  <th className="py-3 px-4 font-bold text-gray-700 w-32 border-b border-gray-200">Datum</th>
                  <th className="py-3 px-4 font-bold text-gray-700 w-32 border-b border-gray-200">Zeit</th>
                  <th className="py-3 px-4 font-bold text-gray-700 border-b border-gray-200">Termin</th>
                  <th className="py-3 px-4 font-bold text-gray-700 w-48 border-b border-gray-200">Ort</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {tableRows}
          </tbody>
        </table>
      </div>
    </div>
  );
};
// --- END OF FILE ---