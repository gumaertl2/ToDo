// [2026-10-19] - REFACTOR: Lokalen Favoriten-Stern aus der "Mo."-Spaltenüberschrift entfernt, da der globale Master-Stern in CalendarView.tsx nun alle 6 Kalenderansichten zentral filtert.
// [2026-10-19] - UX-FEATURE: Favoriten-Stern in der "Mo."-Spaltenüberschrift ergänzt (mit localStorage-Persistenz). Filtert das Monatsgitter per 1-Klick auf alle Termine/Spiele/Dienste/Sitzungen, an denen der eingeloggte Nutzer beteiligt ist.
// [2026-10-19] - UX-FEATURE: Auswärts-Symbol im Monatskalender auf 🚗 (statt 🚌) umgestellt und führende Heim-/Auswärts-Symbole (🏠 / 🚗) auf ein weißes Mini-Badge gesetzt, damit sie sich auf allen Teamfarben (insb. Rot/Pink) scharf abheben.
// [2026-10-19] - FEATURE: Eigenständiges, rollierendes 5-Wochen-Monatsgitter (CalendarMonthGridView) erstellt. Startet mit der aktuellen Woche in Zeile 1, zeigt nahtlos die Folgewochen (inkl. Monatswechsel) und ermöglicht freies Scrollen in Vergangenheit & Zukunft.
// src/features/Events/components/CalendarMonthGridView.tsx
import React, { useRef, useEffect, useMemo, useState } from 'react';
import { startOfDay } from 'date-fns/startOfDay';
import { startOfWeek } from 'date-fns/startOfWeek';
import { endOfWeek } from 'date-fns/endOfWeek';
import { eachDayOfInterval } from 'date-fns/eachDayOfInterval';
import { addWeeks, subWeeks } from 'date-fns';
import { format } from 'date-fns/format';
import { de } from 'date-fns/locale/de';
import type { AdaptedEvent } from '../hooks/useCalendarEvents';

interface CalendarMonthGridViewProps {
  currentDate: Date;
  events: AdaptedEvent[];
  onSelectEvent: (event: AdaptedEvent) => void;
}

const WEEKDAYS = ['Mo.', 'Di.', 'Mi.', 'Do.', 'Fr.', 'Sa.', 'So.'];

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

export const CalendarMonthGridView: React.FC<CalendarMonthGridViewProps> = ({
  currentDate,
  events,
  onSelectEvent
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const today = startOfDay(new Date());
  const todayMs = today.getTime();

  const [isMobilePortrait, setIsMobilePortrait] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 640 : false
  );

  useEffect(() => {
    const handleResize = () => setIsMobilePortrait(window.innerWidth < 640);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Wir spannen ein großzügiges, scrollbares Wochenfenster um das gewählte Datum auf
  // (26 Wochen zurück in die Vergangenheit bis 52 Wochen in die Zukunft)
  const weeks = useMemo(() => {
    const anchorWeekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const rangeStart = subWeeks(anchorWeekStart, 26);
    const rangeEnd = endOfWeek(addWeeks(anchorWeekStart, 52), { weekStartsOn: 1 });

    const allDays = eachDayOfInterval({ start: rangeStart, end: rangeEnd });
    const weekRows: Date[][] = [];
    for (let i = 0; i < allDays.length; i += 7) {
      weekRows.push(allDays.slice(i, i + 7));
    }
    return weekRows;
  }, [currentDate]);

  // Auto-Scroll: Die Woche des gewählten Datums (standardmäßig HEUTE) steht immer direkt in Zeile 1!
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const targetWeekStartMs = startOfWeek(currentDate, { weekStartsOn: 1 }).getTime();
    const weekEl = container.querySelector(`[data-week-ms="${targetWeekStartMs}"]`) as HTMLElement | null;

    if (weekEl) {
      // Sticky Header Höhe abziehen (~34px), damit Zeile 1 exakt unter "Mo. - So." einrastet
      const headerEl = container.querySelector('[data-month-sticky-header="true"]') as HTMLElement | null;
      const headerHeight = headerEl ? headerEl.offsetHeight : 34;
      container.scrollTo({
        top: Math.max(0, weekEl.offsetTop - headerHeight),
        behavior: 'smooth'
      });
    }
  }, [currentDate, weeks]);

  return (
    <div className="flex flex-col w-full h-full relative overflow-hidden rounded-lg border border-gray-200 bg-white">
      <div
        ref={scrollContainerRef}
        className="overflow-y-auto w-full flex-1 custom-scrollbar relative"
      >
        {/* STICKY WOCHENTAGE HEADER */}
        <div
          data-month-sticky-header="true"
          className="sticky top-0 z-20 grid grid-cols-7 bg-gray-50/95 backdrop-blur-sm border-b border-gray-200 shadow-xs"
        >
          {WEEKDAYS.map((dayName, idx) => (
            <div
              key={dayName}
              className={`py-1.5 px-1 text-center text-xs font-bold text-gray-600 ${
                idx < 6 ? 'border-r border-gray-200/70' : ''
              }`}
            >
              {dayName}
            </div>
          ))}
        </div>

        {/* ROLLIERENDE WOCHEN-ZEILEN */}
        <div className="divide-y divide-gray-200">
          {weeks.map((weekDays) => {
            const weekStartMs = weekDays[0].getTime();

            return (
              <div
                key={weekStartMs}
                data-week-ms={weekStartMs}
                className="grid grid-cols-7 min-h-[125px] sm:min-h-[150px] lg:min-h-[165px]"
              >
                {weekDays.map((day, dayIdx) => {
                  const dayMs = startOfDay(day).getTime();
                  const isToday = dayMs === todayMs;
                  const isPast = dayMs < todayMs;
                  const isFirstOfMonth = day.getDate() === 1;

                  const dayEvents = events.filter(e => {
                    if (!e.start) return false;
                    const eStart = startOfDay(e.start).getTime();
                    let exclusiveEnd = e.end || e.start;
                    if (e.allDay && exclusiveEnd.getTime() > e.start.getTime()) {
                      exclusiveEnd = new Date(exclusiveEnd.getTime() - 1000);
                    }
                    const eEnd = startOfDay(exclusiveEnd).getTime();
                    return dayMs >= eStart && dayMs <= eEnd;
                  });

                  dayEvents.sort((a, b) => {
                    if (a.allDay && !b.allDay) return -1;
                    if (!a.allDay && b.allDay) return 1;
                    return a.start!.getTime() - b.start!.getTime();
                  });

                  const hasMyAssignment = dayEvents.some(e => e.isMyAssignment);

                  // Hintergrund- & Rahmenlogik für die Tageskachel
                  let cellBgClass = 'bg-white';
                  if (isToday && hasMyAssignment) {
                    cellBgClass = 'bg-emerald-50/90 ring-2 ring-inset ring-blue-600';
                  } else if (isToday) {
                    cellBgClass = 'bg-blue-50/50 ring-2 ring-inset ring-blue-600';
                  } else if (hasMyAssignment) {
                    cellBgClass = 'bg-emerald-50/80';
                  } else if (isPast) {
                    cellBgClass = 'bg-gray-50/70';
                  }

                  return (
                    <div
                      key={dayMs}
                      className={`flex flex-col p-1 sm:p-1.5 transition-colors min-w-0 overflow-hidden ${cellBgClass} ${
                        dayIdx < 6 ? 'border-r border-gray-200' : ''
                      } ${isPast && !isToday ? 'opacity-65 hover:opacity-100' : ''}`}
                    >
                      {/* DATUMS-KOPFZEILE DER KACHEL */}
                      <div className="flex items-center justify-between mb-1 px-0.5 min-h-[20px]">
                        {isToday ? (
                          <span className="hidden sm:inline-block text-[9px] uppercase tracking-wider font-extrabold bg-blue-600 text-white px-1.5 py-0.5 rounded shadow-xs">
                            Heute
                          </span>
                        ) : isFirstOfMonth ? (
                          <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-tight text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 truncate">
                            {format(day, 'MMM', { locale: de })}
                          </span>
                        ) : (
                          <span />
                        )}

                        <span
                          className={`text-xs leading-none ${
                            isToday
                              ? 'bg-blue-600 text-white font-extrabold px-1.5 py-1 rounded-full shadow-xs'
                              : isFirstOfMonth
                                ? 'font-extrabold text-indigo-900'
                                : hasMyAssignment
                                  ? 'font-bold text-emerald-900'
                                  : isPast
                                    ? 'font-medium text-gray-400'
                                    : 'font-semibold text-gray-700'
                          }`}
                        >
                          {format(day, 'dd.')}
                        </span>
                      </div>

                      {/* TERMINE / SPIELE IN DER KACHEL */}
                      <div className="flex flex-col gap-1 flex-1 overflow-y-auto custom-scrollbar">
                        {dayEvents.map((ev) => {
                          const bgColor = ev.color || '#3b82f6';
                          const textColor = getContrastYIQ(bgColor);
                          const rawDisplay = isMobilePortrait
                            ? (ev.mobileShortTitle || ev.calendarTitle || String(ev.title || ''))
                            : (ev.calendarTitle || String(ev.title || ''));

                          // Führendes Heim-/Auswärts-Symbol extrahieren (🚌 -> 🚗) und auf weißem Badge rendern
                          let leadIcon: string | null = null;
                          let restText = rawDisplay;
                          if (rawDisplay.startsWith('🏠')) {
                            leadIcon = '🏠';
                            restText = rawDisplay.replace(/^🏠\s*/, '');
                          } else if (rawDisplay.startsWith('🚌')) {
                            leadIcon = '🚗';
                            restText = rawDisplay.replace(/^🚌\s*/, '');
                          }

                          return (
                            <div
                              key={`${ev.id}-${dayMs}`}
                              onClick={() => onSelectEvent(ev)}
                              title={typeof ev.title === 'string' ? ev.title : undefined}
                              className="flex items-center rounded-[5px] px-1 sm:px-1.5 py-0.5 text-[10px] sm:text-xs leading-tight overflow-hidden cursor-pointer transition-transform hover:brightness-95 shrink-0"
                              style={{
                                backgroundColor: bgColor,
                                color: textColor,
                                fontWeight: ev.isMyAssignment ? 700 : 500,
                                border: ev.isMyAssignment ? '2px solid #065f46' : 'none',
                                boxShadow: ev.isMyAssignment ? '0 1px 2px rgba(0,0,0,0.18)' : 'none'
                              }}
                            >
                              {leadIcon && (
                                <span className="inline-flex items-center justify-center bg-white/95 rounded-[3px] px-0.5 py-px mr-1 text-[10px] sm:text-[11px] leading-none shadow-2xs shrink-0">
                                  {leadIcon}
                                </span>
                              )}
                              <span className="truncate">{restText}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
// --- END OF FILE ---
