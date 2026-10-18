// [2026-10-18] - UX-FEATURE: Persönliche Einteilungen (Spieler, Fahrer, Betreuer, Dienst) im Spielplan visuell hervorgehoben (kräftigere Datumszeile in Smaragdgrün + Symbol hinter dem Titel ohne Layout-Verschiebung).
// [2026-10-14] - UX-FEATURE: Langzeitgedächtnis für den Spielplan-Filter! Die ausgewählten Mannschaften (teamFilters) werden nun via localStorage dauerhaft auf dem Gerät gespeichert.
// [2026-10-14] - UX-FEATURE: Multi-Select Filter (Sticky Toolbar) in den Spielplan (Agenda View) integriert. Erlaubt gezieltes Filtern nach einzelnen oder mehreren Mannschaften, ohne endloses Scrollen.
// [2026-10-13] - ARCHITECTURE-FIX: Spielplan (Agenda View) vollständig aus dem react-big-calendar Plugin befreit! Komponente ist nun eine eigenständige React-Komponente, um den Safari-Touch/Scroll-Bug auf iPhones final zu beheben.
// [2026-10-13] - BUGFIX: Auto-Scroll Logik repariert. Der Spielplan scrollt nun korrekt zum übergebenen Datum.
// [2026-10-12] - REFACTOR: Spielplan-Ansicht aus CalendarView in eigene Komponente ausgelagert.
// src/features/Events/components/CalendarAgendaView.tsx
import React, { useRef, useEffect, useMemo, useState } from 'react';
import { startOfDay } from 'date-fns/startOfDay';
import { eachDayOfInterval } from 'date-fns/eachDayOfInterval';
import { format } from 'date-fns/format';
import { de } from 'date-fns/locale/de';
import { ChevronDown } from 'lucide-react';
import type { AdaptedEvent } from '../hooks/useCalendarEvents';
import { useClubStore } from '../../../store/useClubStore';

interface CalendarAgendaViewProps {
  currentDate: Date;
  events: AdaptedEvent[];
  showEmptyDays: boolean;
  onSelectEvent: (event: AdaptedEvent) => void;
}

export const CalendarAgendaView: React.FC<CalendarAgendaViewProps> = ({
  currentDate,
  events,
  showEmptyDays,
  onSelectEvent
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const today = startOfDay(new Date());
  
  const { calendarSubscriptions } = useClubStore();
  
  // HIER IST DAS LANGZEITGEDÄCHTNIS (Lesen beim Start)
  const [teamFilters, setTeamFilters] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('papatodo_agenda_filters');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);

  // HIER IST DAS AUTO-SAVE (Speichern bei jeder Änderung)
  useEffect(() => {
    localStorage.setItem('papatodo_agenda_filters', JSON.stringify(teamFilters));
  }, [teamFilters]);

  // Kategorie (Teamname) extrahieren
  const getCategory = (e: AdaptedEvent) => {
     if (e.sourceId === 'manual') return 'Vereinstermine';
     const sub = calendarSubscriptions.find(s => s.id === e.sourceId);
     return sub ? sub.name : 'Sonstige';
  };

  const categories = useMemo(() => {
    return Array.from(new Set(events.map(getCategory))).sort();
  }, [events, calendarSubscriptions]);

  const filteredEvents = useMemo(() => {
    return events.filter(e => teamFilters.length === 0 || teamFilters.includes(getCategory(e)));
  }, [events, teamFilters, calendarSubscriptions]);

  const handleToggleFilter = (cat: string) => {
    if (teamFilters.includes(cat)) {
      setTeamFilters(teamFilters.filter(c => c !== cat));
    } else {
      setTeamFilters([...teamFilters, cat]);
    }
  };

  const filterLabel = teamFilters.length === 0 
    ? 'ALLE TEAMS' 
    : (teamFilters.length === 1 ? teamFilters[0].toUpperCase() : `${teamFilters.length} AUSGEWÄHLT`);

  // Spielzeit-Rechner: Von Mai bis April des Folgejahres (basierend auf dem übergebenen currentDate)
  const { start: rangeStart, end: rangeEnd } = useMemo(() => {
    const month = currentDate.getMonth();
    const startYear = month < 4 ? currentDate.getFullYear() - 1 : currentDate.getFullYear();
    return { start: new Date(startYear, 4, 1), end: new Date(startYear + 1, 4, 31) };
  }, [currentDate]);

  const daysInInterval = useMemo(() => eachDayOfInterval({ start: rangeStart, end: rangeEnd }), [rangeStart, rangeEnd]);
  
  // Auto-Scroll zum gewählten Datum (Reagiert jetzt auch auf Filter-Änderungen)
  useEffect(() => {
    if (scrollRef.current) {
      setTimeout(() => {
        const container = scrollRef.current;
        if (!container) return;
        
        const targetMs = startOfDay(currentDate).getTime();
        let targetEl: HTMLElement | null = null;
        
        const dayNodes = Array.from(container.querySelectorAll('[data-date-ms]')) as HTMLElement[];
        for (const node of dayNodes) {
           const ms = parseInt(node.dataset.dateMs || '0', 10);
           if (ms >= targetMs) {
              targetEl = node;
              break;
           }
        }
        
        if (!targetEl) {
          targetEl = container.querySelector('[data-is-future="true"]') as HTMLElement;
        }
        
        if (targetEl) {
          container.scrollTo({
             top: Math.max(0, targetEl.offsetTop - 55),
             behavior: 'smooth'
          });
        }
      }, 100);
    }
  }, [currentDate, filteredEvents, showEmptyDays]); 

  return (
    <div className="flex flex-col w-full h-full relative">
      <div 
        ref={scrollRef} 
        className="overflow-y-auto w-full flex-1 custom-scrollbar bg-gray-50/30 relative print:bg-white print:overflow-visible print:h-auto"
      >
        {/* STICKY FILTER TOOLBAR */}
        <div className="sticky top-0 z-30 bg-gray-50/80 backdrop-blur-md border-b border-gray-200/80 px-4 py-2 flex justify-end print:hidden shadow-sm">
           <div className="relative">
              <button 
                 onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)} 
                 className="flex items-center gap-1.5 font-bold text-gray-700 hover:text-blue-700 text-[13px] bg-white border border-gray-200 shadow-sm px-3 py-1.5 rounded-lg transition-colors outline-none"
                 title="Spielplan nach Mannschaften filtern"
              >
                 {filterLabel}
                 <ChevronDown className="w-4 h-4 text-gray-400" />
              </button>
              
              {isFilterMenuOpen && (
                 <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsFilterMenuOpen(false)}></div>
                    <div className="absolute top-full right-0 mt-2 w-64 bg-white border border-gray-200 shadow-xl rounded-xl p-2 z-50 flex flex-col gap-0.5">
                       <label className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer text-sm font-medium transition-colors">
                          <input 
                             type="checkbox" 
                             checked={teamFilters.length === 0} 
                             onChange={() => setTeamFilters([])} 
                             className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4" 
                          />
                          Alle Teams zeigen
                       </label>
                       <div className="h-px bg-gray-100 my-1 mx-2"></div>
                       <div className="max-h-[50vh] overflow-y-auto custom-scrollbar">
                         {categories.map(c => (
                            <label key={c} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer text-sm font-medium transition-colors">
                               <input 
                                  type="checkbox" 
                                  checked={teamFilters.includes(c)} 
                                  onChange={() => handleToggleFilter(c)} 
                                  className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4" 
                               />
                               <span className="truncate">{c}</span>
                            </label>
                         ))}
                       </div>
                    </div>
                 </>
              )}
           </div>
        </div>

        {/* SPIELPLAN KARTEN */}
        <div className="p-2 sm:p-4 space-y-4">
          {daysInInterval.map(day => {
            const dayEvents = filteredEvents.filter(e => {
              const eStart = startOfDay(e.start!);
              let exclusiveEnd = e.end || e.start!;
              if (e.allDay && exclusiveEnd.getTime() > e.start!.getTime()) exclusiveEnd = new Date(exclusiveEnd.getTime() - 1000); 
              return day >= eStart && day <= startOfDay(exclusiveEnd);
            });
            
            if (!showEmptyDays && dayEvents.length === 0) return null;
            
            dayEvents.sort((a, b) => { 
              if (a.allDay && !b.allDay) return -1; 
              if (!a.allDay && b.allDay) return 1; 
              return a.start!.getTime() - b.start!.getTime(); 
            });
            
            const isToday = day.getTime() === today.getTime();
            const isFutureOrToday = day >= today;
            const hasMyAssignmentToday = dayEvents.some(e => e.isMyAssignment);

            return (
              <div 
                key={day.toISOString()} 
                data-date-ms={day.getTime()}
                data-is-future={isFutureOrToday ? "true" : "false"}
                className={`bg-white rounded-lg shadow-sm border ${
                  isToday 
                    ? 'border-blue-300 ring-2 ring-blue-100' 
                    : hasMyAssignmentToday 
                      ? 'border-emerald-300 ring-1 ring-emerald-100' 
                      : 'border-gray-200'
                } overflow-hidden print:border-b print:shadow-none print:rounded-none`}
              >
                <div className={`px-4 py-2 border-b ${
                  isToday 
                    ? 'bg-blue-50 border-blue-100' 
                    : hasMyAssignmentToday 
                      ? 'bg-emerald-100/80 border-emerald-200' 
                      : 'bg-gray-50 border-gray-100'
                } print:bg-transparent print:border-black`}>
                  <h3 className={`text-sm font-bold ${
                    isToday 
                      ? 'text-blue-800 print:text-black' 
                      : hasMyAssignmentToday 
                        ? 'text-emerald-900 print:text-black' 
                        : 'text-gray-700 print:text-black'
                  }`}>
                    {format(day, 'EEEE, dd. MMMM yyyy', { locale: de })}
                    {isToday && <span className="ml-2 text-[10px] uppercase tracking-wider font-bold bg-blue-600 text-white px-2 py-0.5 rounded-full print:hidden">Heute</span>}
                  </h3>
                </div>
                <div className="p-1.5">
                  {dayEvents.length === 0 ? <p className="p-2 text-xs text-gray-400 italic text-center print:hidden">Keine Termine</p> : (
                    <div className="space-y-1">
                      {dayEvents.map(e => (
                        <div 
                          key={`${e.id}-${day.toISOString()}`} 
                          onClick={() => onSelectEvent(e)} 
                          className={`flex flex-col sm:flex-row sm:items-center p-2 rounded cursor-pointer transition print:border-l-[4px] ${
                            e.isMyAssignment 
                              ? 'bg-emerald-50/70 hover:bg-emerald-100/70' 
                              : 'hover:bg-gray-50'
                          }`} 
                          style={{ borderLeftWidth: '4px', borderLeftColor: e.color || '#3b82f6' }}
                        >
                          <div className={`w-20 shrink-0 text-xs font-bold mb-1 sm:mb-0 print:text-black ${e.isMyAssignment ? 'text-emerald-800' : 'text-gray-500'}`}>
                            {e.allDay ? 'Ganztägig' : `${format(e.start!, 'HH:mm')} Uhr`}
                          </div>
                          <div className="flex-1">
                            <div className="font-bold text-gray-900 text-sm print:text-black">
                              {e.title}
                              {e.myAssignmentIcons && (
                                <span className="ml-2 shrink-0" title="Du bist eingeteilt">
                                  {e.myAssignmentIcons}
                                </span>
                              )}
                            </div>
                            {e.location && <div className="text-xs text-gray-500 mt-0.5 flex items-center print:text-black">📍 {e.location}</div>}
                          </div>
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
      </div>
    </div>
  );
};
// --- END OF FILE ---