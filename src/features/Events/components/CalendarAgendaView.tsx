// [2026-10-12] - REFACTOR: Spielplan-Ansicht (CustomAgendaView) aus CalendarView in eigene Komponente ausgelagert.
// src/features/Events/components/CalendarAgendaView.tsx
import React, { useRef, useEffect, useMemo } from 'react';
import { startOfDay } from 'date-fns/startOfDay';
import { eachDayOfInterval } from 'date-fns/eachDayOfInterval';
import { format } from 'date-fns/format';
import { de } from 'date-fns/locale/de';
import type { AdaptedEvent } from '../hooks/useCalendarEvents';

export const useCalendarAgendaView = (
  showEmptyDays: boolean, 
  onSelectEvent: (event: AdaptedEvent) => void
) => {
  return useMemo(() => {
    const View = ({ date, events }: { date: Date, events: AdaptedEvent[] }) => {
      const scrollRef = useRef<HTMLDivElement>(null);
      const today = startOfDay(new Date());

      // Spielzeit-Rechner: Von Mai bis April des Folgejahres
      const { start: rangeStart, end: rangeEnd } = useMemo(() => {
        const month = date.getMonth();
        const startYear = month < 4 ? date.getFullYear() - 1 : date.getFullYear();
        return { start: new Date(startYear, 4, 1), end: new Date(startYear + 1, 4, 31) };
      }, [date]);

      const daysInInterval = eachDayOfInterval({ start: rangeStart, end: rangeEnd });
      
      // Auto-Scroll zum aktuellen Tag
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
            
            dayEvents.sort((a, b) => { 
              if (a.allDay && !b.allDay) return -1; 
              if (!a.allDay && b.allDay) return 1; 
              return a.start!.getTime() - b.start!.getTime(); 
            });
            
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
                        <div key={`${e.id}-${day.toISOString()}`} onClick={() => onSelectEvent(e)} className="flex flex-col sm:flex-row sm:items-center p-2 rounded hover:bg-gray-50 cursor-pointer transition print:border-l-[4px]" style={{ borderLeftWidth: '4px', borderLeftColor: e.color || '#3b82f6' }}>
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
    
    View.title = () => ''; 
    View.navigate = () => new Date(); 
    
    return View;
  }, [showEmptyDays, onSelectEvent]);
};
// --- END OF FILE ---