// [2026-10-13] - BUGFIX: Eigene Inline-Komponente (InlinePollSummary) für die Abstimmung in der Liste erstellt. Diese abonniert aktiv die Live-Ergebnisse aus der Datenbank (Lazy Loading Fix), sodass die Übersicht sofort sichtbar ist, ohne das Modal öffnen zu müssen.
// [2026-10-13] - UX-FEATURE: Responsive Abstimmungs-Ergebnisse (pollSummary) direkt in die Termin-Tabelle integriert (Mobile: drunter, Desktop: daneben).
// [2026-10-12] - REFACTOR: Listen-Ansichten (Termine/Dienste) aus CalendarView in eigenständige Komponente ausgelagert.
// src/features/Events/components/CalendarListView.tsx
import React, { useState, useMemo, useRef, useLayoutEffect, useEffect } from 'react';
import { format } from 'date-fns/format';
import { getISOWeek } from 'date-fns/getISOWeek';
import { startOfDay } from 'date-fns/startOfDay';
import { de } from 'date-fns/locale/de';
import { CalendarDays } from 'lucide-react';
import type { AdaptedEvent } from '../hooks/useCalendarEvents';
import { useClubStore } from '../../../store/useClubStore';

// SMART COMPONENT: Abonniert live die Stimmen für exakt diesen einen Termin in der Liste
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

interface CalendarListViewProps {
  currentView: 'termine' | 'dienste';
  displayEvents: AdaptedEvent[];
  currentDate: Date;
  onSelectEvent: (event: AdaptedEvent) => void;
}

export const CalendarListView: React.FC<CalendarListViewProps> = ({
  currentView,
  displayEvents,
  currentDate,
  onSelectEvent
}) => {
  const [dienstFilter, setDienstFilter] = useState<string>('ALL');
  const listContainerRef = useRef<HTMLDivElement>(null);
  
  const isDienste = currentView === 'dienste';
  const today = startOfDay(new Date());

  // --- AUTO-SCROLL LOGIK ---
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
  }, [currentView, currentDate, dienstFilter, displayEvents]);

  // Kategorie extrahieren (Thekendienst, Dienste J1, etc.)
  const getCategory = (e: AdaptedEvent) => {
     if (e.isLogisticsDuty) return `Dienste ${e.teamName}`;
     const titleStr = String(e.title || '');
     if (titleStr.includes(':')) return titleStr.split(':')[0].trim();
     return titleStr.trim();
  };

  const yearEvents = useMemo(() => {
    return displayEvents.filter(e => e.start && e.start.getFullYear() === currentDate.getFullYear());
  }, [displayEvents, currentDate]);

  const categories = useMemo(() => {
    return Array.from(new Set(yearEvents.map(getCategory))).sort();
  }, [yearEvents]);

  const filteredYearEvents = useMemo(() => {
    const filtered = yearEvents.filter(e => dienstFilter === 'ALL' || getCategory(e) === dienstFilter);
    filtered.sort((a, b) => {
      if (a.start!.getTime() !== b.start!.getTime()) return a.start!.getTime() - b.start!.getTime();
      if (a.allDay && !b.allDay) return -1;
      if (!a.allDay && b.allDay) return 1;
      return 0;
    });
    return filtered;
  }, [yearEvents, dienstFilter]);

  // Wenn keine Events für das Jahr gefunden wurden
  if (filteredYearEvents.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-gray-400 h-full p-8 relative">
        {isDienste && categories.length > 0 && (
           <div className="absolute top-4 left-4">
              <select 
                 className="bg-white border border-gray-200 rounded-lg font-bold text-gray-700 outline-none cursor-pointer px-3 py-1.5 shadow-sm text-sm"
                 value={dienstFilter}
                 onChange={e => setDienstFilter(e.target.value)}
              >
                 <option value="ALL">Alle Dienste</option>
                 {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
           </div>
        )}
        <CalendarDays className="w-12 h-12 mb-3 opacity-20" />
        <p>Keine {currentView === 'termine' ? 'Termine' : 'Dienste'} für {currentDate.getFullYear()} gefunden.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full h-full relative" ref={listContainerRef}>
      <div className="overflow-y-auto overflow-x-auto w-full flex-1 custom-scrollbar pb-4 relative">
        <table className="w-full text-left border-collapse min-w-[600px] relative">
          <thead className="sticky top-0 bg-white shadow-sm z-10">
            <tr className="border-b-2 border-gray-800 text-sm">
              {isDienste ? (
                <>
                  <th className="py-3 px-4 font-bold text-gray-700 w-16">KW</th>
                  <th className="py-3 px-4 font-bold text-gray-700 w-32">Start</th>
                  <th className="py-3 px-4 font-bold text-gray-700 w-32">Ende</th>
                  <th className="py-3 px-4 font-bold text-gray-700 flex items-center">
                     <select 
                       className="bg-transparent border-none font-bold text-gray-800 uppercase tracking-wider p-0 outline-none cursor-pointer focus:ring-0 text-sm hover:text-blue-700 transition-colors"
                       value={dienstFilter}
                       onChange={(e) => setDienstFilter(e.target.value)}
                       title="Dienste nach Kategorie filtern"
                     >
                       <option value="ALL">ALLE DIENSTE</option>
                       {categories.map(c => <option key={c} value={c}>{c.toUpperCase()}</option>)}
                     </select>
                  </th>
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
            {filteredYearEvents.map(e => {
              const startD = e.start!;
              
              // Data-Attribut für Auto-Scroll
              const isFutureRow = startOfDay(startD).getTime() >= today.getTime();
              const dataIsFutureRow = isFutureRow ? "true" : "false";

              if (isDienste) {
                const actualEnd = e.end || (e.sourceEvent?.endTime ? new Date(e.sourceEvent.endTime) : startD);
                const kw = getISOWeek(startD);
                return (
                  <tr key={e.id} data-is-future-row={dataIsFutureRow} className={`border-b border-gray-100 hover:bg-blue-50 cursor-pointer transition-colors group ${!isFutureRow ? 'opacity-60 bg-gray-50/50' : ''}`} onClick={() => onSelectEvent(e)}>
                    <td className="py-3 px-4 text-gray-900 font-medium whitespace-nowrap">{kw}</td>
                    <td className="py-3 px-4 text-gray-600 whitespace-nowrap">{format(startD, 'dd.MM.yyyy', { locale: de })}</td>
                    <td className="py-3 px-4 text-gray-600 whitespace-nowrap">{format(actualEnd, 'dd.MM.yyyy', { locale: de })}</td>
                    <td className="py-3 px-4">
                      <div className="flex flex-col lg:flex-row lg:items-center gap-1.5 lg:gap-3">
                        <div className="font-bold text-gray-900 group-hover:text-blue-700 transition-colors flex items-center">
                          <span className="inline-block w-3 h-3 rounded-full mr-2 shrink-0" style={{ backgroundColor: e.color || '#3b82f6' }}></span>
                          <span className="truncate">{e.title}</span>
                        </div>
                        {e.sourceEvent?.pollConfig?.isActive && (
                          <InlinePollSummary eventId={e.sourceEvent.id} pollConfig={e.sourceEvent.pollConfig} />
                        )}
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
                  <tr key={e.id} data-is-future-row={dataIsFutureRow} className={`border-b border-gray-100 hover:bg-blue-50 cursor-pointer transition-colors group ${!isFutureRow ? 'opacity-60 bg-gray-50/50' : ''}`} onClick={() => onSelectEvent(e)}>
                    <td className="py-3 px-4 text-gray-900 font-medium whitespace-nowrap">{dateStr}</td>
                    <td className="py-3 px-4 text-gray-600 whitespace-nowrap">{timeStr}</td>
                    <td className="py-3 px-4">
                      {/* HIER IST DIE FLEX-MAGIE: flex-col für Mobile, lg:flex-row für Tablet/PC */}
                      <div className="flex flex-col lg:flex-row lg:items-center gap-1 lg:gap-3">
                        <div className="font-bold text-gray-900 group-hover:text-blue-700 transition-colors flex items-center">
                          <span className="inline-block w-3 h-3 rounded-full mr-2 shrink-0" style={{ backgroundColor: e.color || '#3b82f6' }}></span>
                          <span className="line-clamp-2 lg:truncate">{e.title}</span>
                        </div>
                        {e.sourceEvent?.pollConfig?.isActive && (
                          <InlinePollSummary eventId={e.sourceEvent.id} pollConfig={e.sourceEvent.pollConfig} />
                        )}
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
// --- END OF FILE ---