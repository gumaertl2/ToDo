// [2026-11-07] - BUGFIX & UX: Mehrtägige Termine (z. B. Schulferien) werden pro Woche als durchgehender Balken über die Tage gespannt statt als abgehackte Einzel-Pillen; exklusive iCal-Enddaten (inkl. 01:00/02:00 UTC-Versatz) bluten bei 1-Tages-Feiertagen nicht mehr in den Folgetag über.
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

interface EventSpanInfo {
  event: AdaptedEvent;
  startMs: number;
  endMs: number;
  isMultiDay: boolean;
}

interface MultiDayWeekSegment {
  event: AdaptedEvent;
  startCol: number;
  endCol: number;
  startsBeforeWeek: boolean;
  endsAfterWeek: boolean;
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

const computeEventSpan = (e: AdaptedEvent): EventSpanInfo | null => {
  if (!e.start) return null;
  const startMs = startOfDay(e.start).getTime();
  let rawEnd = e.end || e.start;

  if (rawEnd.getTime() > e.start.getTime()) {
    // Exklusives iCal-Enddatum (00:00 Ortszeit bzw. 01:00/02:00 aus altem UTC-Import) auf den echten letzten Kalendertag zurücksetzen
    if (e.allDay && rawEnd.getMinutes() === 0 && rawEnd.getHours() <= 3) {
      rawEnd = new Date(rawEnd.getTime() - 4 * 60 * 60 * 1000);
    } else if (e.allDay && rawEnd.getHours() === 0 && rawEnd.getMinutes() === 0) {
      rawEnd = new Date(rawEnd.getTime() - 1000);
    }
  }

  const endMs = Math.max(startMs, startOfDay(rawEnd).getTime());
  return {
    event: e,
    startMs,
    endMs,
    isMultiDay: endMs > startMs
  };
};

const splitLeadIcon = (rawDisplay: string): { leadIcon: string | null; restText: string } => {
  if (rawDisplay.startsWith('🏠')) {
    return { leadIcon: '🏠', restText: rawDisplay.replace(/^🏠\s*/, '') };
  }
  if (rawDisplay.startsWith('🚌')) {
    return { leadIcon: '🚗', restText: rawDisplay.replace(/^🚌\s*/, '') };
  }
  return { leadIcon: null, restText: rawDisplay };
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

  // Alle Events einmalig mit sauberem Start-/End-Tag vorberechnen
  const eventSpans = useMemo<EventSpanInfo[]>(() => {
    const list: EventSpanInfo[] = [];
    for (const ev of events) {
      const span = computeEventSpan(ev);
      if (span) list.push(span);
    }
    return list;
  }, [events]);

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
            const dayMsList = weekDays.map(d => startOfDay(d).getTime());
            const weekStartMs = dayMsList[0];
            const weekEndMs = dayMsList[6];

            // 1. Mehrtägige Termine (z. B. Ferien) als durchgehende Wochen-Segmente berechnen & in Spuren (Lanes) packen
            const multiDayInWeek = eventSpans
              .filter(s => s.isMultiDay && s.endMs >= weekStartMs && s.startMs <= weekEndMs)
              .sort((a, b) => {
                if (a.startMs !== b.startMs) return a.startMs - b.startMs;
                return (b.endMs - b.startMs) - (a.endMs - a.startMs);
              });

            const lanes: MultiDayWeekSegment[][] = [];
            multiDayInWeek.forEach(span => {
              let startCol = dayMsList.findIndex(ms => ms >= span.startMs);
              if (startCol === -1) startCol = 0;
              let endCol = 6;
              for (let c = 6; c >= 0; c--) {
                if (dayMsList[c] <= span.endMs) {
                  endCol = c;
                  break;
                }
              }

              const seg: MultiDayWeekSegment = {
                event: span.event,
                startCol,
                endCol,
                startsBeforeWeek: span.startMs < weekStartMs,
                endsAfterWeek: span.endMs > weekEndMs
              };

              let placed = false;
              for (const lane of lanes) {
                const overlaps = lane.some(existing => !(seg.endCol < existing.startCol || seg.startCol > existing.endCol));
                if (!overlaps) {
                  lane.push(seg);
                  placed = true;
                  break;
                }
              }
              if (!placed) {
                lanes.push([seg]);
              }
            });

            return (
              <div
                key={weekStartMs}
                data-week-ms={weekStartMs}
                className="relative min-h-[125px] sm:min-h-[150px] lg:min-h-[165px] flex flex-col"
              >
                {/* HINTERGRUND-GITTER (7 Tages-Spalten mit Rahmen & Heute-/Einsatz-Färbung durchgehend von oben bis unten) */}
                <div className="absolute inset-0 grid grid-cols-7 pointer-events-none">
                  {weekDays.map((_, dayIdx) => {
                    const dayMs = dayMsList[dayIdx];
                    const isToday = dayMs === todayMs;
                    const isPast = dayMs < todayMs;
                    const hasMyAssignment = eventSpans.some(
                      s => s.event.isMyAssignment && dayMs >= s.startMs && dayMs <= s.endMs
                    );

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
                        key={`bg-${dayMs}`}
                        className={`${cellBgClass} ${dayIdx < 6 ? 'border-r border-gray-200' : ''}`}
                      />
                    );
                  })}
                </div>

                {/* ZEILE A: TAGES-ZAHLEN KOPFZEILE (Mo. - So.) */}
                <div className="relative z-10 grid grid-cols-7">
                  {weekDays.map((day, dayIdx) => {
                    const dayMs = dayMsList[dayIdx];
                    const isToday = dayMs === todayMs;
                    const isPast = dayMs < todayMs;
                    const isFirstOfMonth = day.getDate() === 1;
                    const hasMyAssignment = eventSpans.some(
                      s => s.event.isMyAssignment && dayMs >= s.startMs && dayMs <= s.endMs
                    );

                    return (
                      <div
                        key={`hdr-${dayMs}`}
                        className={`flex items-center justify-between pt-1 sm:pt-1.5 pb-1 px-1.5 sm:px-2 min-h-[24px] ${
                          isPast && !isToday ? 'opacity-65' : ''
                        }`}
                      >
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
                    );
                  })}
                </div>

                {/* ZEILE B: DURCHGEHENDE MEHRTÄGIGE BALKEN (z. B. Ferien über mehrere Tage hinweg) */}
                {lanes.length > 0 && (
                  <div className="relative z-10 flex flex-col gap-1 mb-1">
                    {lanes.map((lane, laneIdx) => (
                      <div key={`lane-${laneIdx}`} className="grid grid-cols-7">
                        {lane.map((seg) => {
                          const ev = seg.event;
                          const bgColor = ev.color || '#3b82f6';
                          const textColor = getContrastYIQ(bgColor);
                          const rawDisplay = ev.calendarTitle || String(ev.title || '');
                          const { leadIcon, restText } = splitLeadIcon(rawDisplay);

                          const roundedLeft = seg.startsBeforeWeek ? 'rounded-l-none ml-0 pl-1.5' : 'rounded-l-[5px] ml-1 sm:ml-1.5 pl-1.5';
                          const roundedRight = seg.endsAfterWeek ? 'rounded-r-none mr-0 pr-1.5' : 'rounded-r-[5px] mr-1 sm:mr-1.5 pr-1.5';

                          return (
                            <div
                              key={`span-${ev.id}-${weekStartMs}-${seg.startCol}`}
                              onClick={() => onSelectEvent(ev)}
                              title={typeof ev.title === 'string' ? ev.title : undefined}
                              className={`flex items-center py-0.5 text-[10px] sm:text-xs leading-tight overflow-hidden cursor-pointer transition-transform hover:brightness-95 ${roundedLeft} ${roundedRight}`}
                              style={{
                                gridColumn: `${seg.startCol + 1} / ${seg.endCol + 2}`,
                                backgroundColor: bgColor,
                                color: textColor,
                                fontWeight: ev.isMyAssignment ? 700 : 600,
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
                    ))}
                  </div>
                )}

                {/* ZEILE C: EINZEL-TAGES-TERMINE & SPIELE JE TAG */}
                <div className="relative z-10 grid grid-cols-7 flex-1">
                  {weekDays.map((_, dayIdx) => {
                    const dayMs = dayMsList[dayIdx];
                    const isToday = dayMs === todayMs;
                    const isPast = dayMs < todayMs;

                    const singleDayEvents = eventSpans
                      .filter(s => !s.isMultiDay && s.startMs === dayMs)
                      .map(s => s.event)
                      .sort((a, b) => {
                        if (a.allDay && !b.allDay) return -1;
                        if (!a.allDay && b.allDay) return 1;
                        return a.start!.getTime() - b.start!.getTime();
                      });

                    return (
                      <div
                        key={`single-${dayMs}`}
                        className={`flex flex-col gap-1 px-1 sm:px-1.5 pb-1 sm:pb-1.5 min-w-0 overflow-hidden ${
                          isPast && !isToday ? 'opacity-65 hover:opacity-100' : ''
                        }`}
                      >
                        {singleDayEvents.map((ev) => {
                          const bgColor = ev.color || '#3b82f6';
                          const textColor = getContrastYIQ(bgColor);
                          const rawDisplay = isMobilePortrait
                            ? (ev.mobileShortTitle || ev.calendarTitle || String(ev.title || ''))
                            : (ev.calendarTitle || String(ev.title || ''));
                          const { leadIcon, restText } = splitLeadIcon(rawDisplay);

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
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
// --- END OF FILE ---
