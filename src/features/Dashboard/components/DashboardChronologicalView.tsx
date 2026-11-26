// [2026-11-26] - FEATURE: Chronologische Tages-Timeline (Termine, Dienste, Sitzungen & optional Aufgaben) für das Dashboard erstellt.
// src/features/Dashboard/components/DashboardChronologicalView.tsx
import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Coffee, CheckCircle2, Clock, ChevronRight, Layers } from 'lucide-react';
import type { Task } from '../../../core/types/models';

interface DashboardChronologicalViewProps {
  isAppUser: boolean;
  includeTasks: boolean;
  onToggleIncludeTasks: (include: boolean) => void;
  eventsLookahead: number;
  onEventsLookaheadChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  servicesLookahead: number;
  onServicesLookaheadChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  upcomingEvents: any[];
  upcomingServices: any[];
  myLogisticsDuties: any[];
  upcomingSessions: any[];
  myTasks: Task[];
  todayStart: number;
  onEditTask: (task: Task) => void;
  formatDate: (ms: number) => string;
}

type TimelineKind = 'EVENT' | 'SERVICE' | 'SESSION' | 'TASK';

interface TimelineEntry {
  key: string;
  kind: TimelineKind;
  time: number | null;
  dayKey: string;
  dayLabel: string;
  isOverdue: boolean;
  title: string;
  subtitle?: string;
  timeLabel: string;
  driverNames?: string;
  departureTime?: string;
  onClick: () => void;
}

const getDayStartMs = (ms: number): number => {
  const d = new Date(ms);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
};

const formatDayGroupLabel = (dayMs: number, todayStart: number): string => {
  const oneDay = 24 * 60 * 60 * 1000;
  if (dayMs < todayStart) return 'Überfällig';
  if (dayMs === todayStart) return 'Heute';
  if (dayMs === todayStart + oneDay) return 'Morgen';
  return new Date(dayMs).toLocaleDateString('de-DE', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

const formatTimeOnly = (ms: number): string => {
  return new Date(ms).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) + ' Uhr';
};

export const DashboardChronologicalView: React.FC<DashboardChronologicalViewProps> = ({
  isAppUser,
  includeTasks,
  onToggleIncludeTasks,
  eventsLookahead,
  onEventsLookaheadChange,
  servicesLookahead,
  onServicesLookaheadChange,
  upcomingEvents,
  upcomingServices,
  myLogisticsDuties,
  upcomingSessions,
  myTasks,
  todayStart,
  onEditTask
}) => {
  const navigate = useNavigate();

  const groupedTimeline = useMemo(() => {
    const items: TimelineEntry[] = [];

    // 1. Vereinstermine
    upcomingEvents.forEach(ev => {
      const ms = Number(ev.time || 0);
      if (!ms) return;
      const dayMs = getDayStartMs(ms);
      items.push({
        key: `ev-${ev.id}`,
        kind: 'EVENT',
        time: ms,
        dayKey: String(dayMs),
        dayLabel: formatDayGroupLabel(dayMs, todayStart),
        isOverdue: false,
        title: ev.title,
        subtitle: ev.type === 'INTERN' ? 'Interne Sitzung' : 'Vereinstermin',
        timeLabel: formatTimeOnly(ms),
        driverNames: ev.driverNames,
        departureTime: ev.departureTime,
        onClick: () => {
          if (ev.type === 'INTERN') {
            navigate(`/events/${ev.id}`);
          } else if (ev.type === 'ABO_CALENDAR') {
            navigate('/calendar', { state: { openEventSubId: ev.subId, openEventUid: ev.uid, targetDate: ev.time } });
          } else {
            navigate('/calendar', { state: { openEventId: ev.id, targetDate: ev.time } });
          }
        }
      });
    });

    // 2. Kalender-Dienste
    upcomingServices.forEach(srv => {
      const ms = new Date(srv.startTime).getTime();
      if (!ms) return;
      const dayMs = getDayStartMs(ms);
      items.push({
        key: `srv-${srv.id}`,
        kind: 'SERVICE',
        time: ms,
        dayKey: String(dayMs),
        dayLabel: formatDayGroupLabel(dayMs, todayStart),
        isOverdue: false,
        title: srv.title,
        subtitle: 'Vereinsdienst',
        timeLabel: srv.isAllDay ? 'Ganztägig' : formatTimeOnly(ms),
        onClick: () => navigate('/calendar', { state: { openEventId: srv.id, targetDate: ms } })
      });
    });

    // 3. Logistik-Dienste (Fahrer / Betreuer)
    myLogisticsDuties.forEach(duty => {
      const ms = Number(duty.time || 0);
      if (!ms) return;
      const dayMs = getDayStartMs(ms);
      items.push({
        key: `log-${duty.id}`,
        kind: 'SERVICE',
        time: ms,
        dayKey: String(dayMs),
        dayLabel: formatDayGroupLabel(dayMs, todayStart),
        isOverdue: false,
        title: duty.title,
        subtitle: duty.role || 'Saison-Dienst',
        timeLabel: formatTimeOnly(ms),
        driverNames: duty.driverNames,
        departureTime: duty.departureTime,
        onClick: () =>
          navigate('/calendar', {
            state: { openEventSubId: duty.subId, openEventUid: duty.uid, targetDate: ms }
          })
      });
    });

    // 4. Nächste Sitzungen (sofern App-Nutzer und nicht bereits als INTERN-Termin vorhanden)
    if (isAppUser) {
      const seenEventIds = new Set(upcomingEvents.filter(e => e.type === 'INTERN').map(e => e.id));
      upcomingSessions.forEach(sess => {
        if (seenEventIds.has(sess.id)) return;
        const ms = Number(sess.plannedStartTime || sess.startDate || 0);
        const dayMs = ms ? getDayStartMs(ms) : Number.MAX_SAFE_INTEGER;
        items.push({
          key: `sess-${sess.id}`,
          kind: 'SESSION',
          time: ms || null,
          dayKey: ms ? String(dayMs) : 'nodate',
          dayLabel: ms ? formatDayGroupLabel(dayMs, todayStart) : 'Ohne festes Datum',
          isOverdue: false,
          title: sess.title,
          subtitle: 'Sitzung',
          timeLabel: ms ? formatTimeOnly(ms) : 'Offen',
          onClick: () => navigate(`/events/${sess.id}`)
        });
      });
    }

    // 5. Optional: Aufgaben in Timeline einbeziehen
    if (isAppUser && includeTasks) {
      myTasks.forEach(task => {
        const ms = task.dueDate ? Number(task.dueDate) : null;
        const dayMs = ms ? getDayStartMs(ms) : Number.MAX_SAFE_INTEGER;
        const isOverdue = !!(ms && dayMs < todayStart);
        items.push({
          key: `task-${task.id}`,
          kind: 'TASK',
          time: ms,
          dayKey: isOverdue ? 'overdue' : ms ? String(dayMs) : 'nodate',
          dayLabel: isOverdue ? 'Überfällig' : ms ? formatDayGroupLabel(dayMs, todayStart) : 'Aufgaben ohne Frist',
          isOverdue,
          title: task.title,
          subtitle: `Fortschritt: ${task.progress || 0}%`,
          timeLabel: ms ? new Date(ms).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }) : 'Ohne Frist',
          onClick: () => onEditTask(task)
        });
      });
    }

    // Chronologisch sortieren (Überfällig zuerst, dann nach Timestamp, ohne Datum am Ende)
    items.sort((a, b) => {
      if (a.isOverdue && !b.isOverdue) return -1;
      if (!a.isOverdue && b.isOverdue) return 1;
      if (a.time === null && b.time === null) return a.title.localeCompare(b.title, 'de');
      if (a.time === null) return 1;
      if (b.time === null) return -1;
      return a.time - b.time;
    });

    const groups: { key: string; label: string; isOverdue: boolean; isToday: boolean; items: TimelineEntry[] }[] = [];
    const groupMap = new Map<string, (typeof groups)[number]>();

    items.forEach(item => {
      let grp = groupMap.get(item.dayKey);
      if (!grp) {
        grp = {
          key: item.dayKey,
          label: item.dayLabel,
          isOverdue: item.isOverdue,
          isToday: item.dayKey === String(todayStart),
          items: []
        };
        groupMap.set(item.dayKey, grp);
        groups.push(grp);
      }
      grp.items.push(item);
    });

    return groups;
  }, [
    upcomingEvents,
    upcomingServices,
    myLogisticsDuties,
    upcomingSessions,
    myTasks,
    isAppUser,
    includeTasks,
    todayStart,
    navigate,
    onEditTask
  ]);

  const badgeConfig: Record<TimelineKind, { label: string; className: string; icon: React.ReactNode }> = {
    EVENT: {
      label: 'Termin',
      className: 'bg-blue-100 text-blue-800 border-blue-200',
      icon: <Calendar className="w-3 h-3" />
    },
    SERVICE: {
      label: 'Dienst',
      className: 'bg-purple-100 text-purple-800 border-purple-200',
      icon: <Coffee className="w-3 h-3" />
    },
    SESSION: {
      label: 'Sitzung',
      className: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      icon: <Clock className="w-3 h-3" />
    },
    TASK: {
      label: 'Aufgabe',
      className: 'bg-amber-100 text-amber-900 border-amber-200',
      icon: <CheckCircle2 className="w-3 h-3" />
    }
  };

  return (
    <section className="space-y-4">
      {/* STEUERLEISTE */}
      <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center bg-blue-50 border border-blue-200 rounded-lg px-2 py-1" title="Vorschau Termine in Tagen">
            <span className="font-bold text-blue-800 mr-1.5">Termine:</span>
            <input
              type="number"
              min="1"
              max="365"
              value={eventsLookahead}
              onChange={onEventsLookaheadChange}
              className="w-10 text-center font-bold text-blue-700 bg-transparent outline-none"
            />
            <span className="text-[10px] uppercase font-bold text-blue-500 ml-0.5">Tage</span>
          </div>

          <div className="flex items-center bg-purple-50 border border-purple-200 rounded-lg px-2 py-1" title="Vorschau Dienste in Tagen">
            <span className="font-bold text-purple-800 mr-1.5">Dienste:</span>
            <input
              type="number"
              min="1"
              max="365"
              value={servicesLookahead}
              onChange={onServicesLookaheadChange}
              className="w-10 text-center font-bold text-purple-700 bg-transparent outline-none"
            />
            <span className="text-[10px] uppercase font-bold text-purple-500 ml-0.5">Tage</span>
          </div>
        </div>

        {isAppUser && (
          <div className="inline-flex items-center bg-gray-100 p-0.5 rounded-lg border border-gray-200">
            <button
              type="button"
              onClick={() => onToggleIncludeTasks(false)}
              className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all flex items-center gap-1 ${
                !includeTasks ? 'bg-white text-blue-700 shadow-2xs' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Layers className="w-3 h-3" />
              Aufgaben separat
            </button>
            <button
              type="button"
              onClick={() => onToggleIncludeTasks(true)}
              className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all flex items-center gap-1 ${
                includeTasks ? 'bg-white text-blue-700 shadow-2xs' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <CheckCircle2 className="w-3 h-3" />
              Aufgaben in Liste
            </button>
          </div>
        )}
      </div>

      {/* TIMELINE */}
      {groupedTimeline.length === 0 ? (
        <div className="bg-white border border-gray-200 p-8 rounded-xl text-center text-gray-500 text-sm">
          Keine anstehenden Einträge im gewählten Zeitraum.
        </div>
      ) : (
        <div className="space-y-5">
          {groupedTimeline.map(group => (
            <div key={group.key} className="space-y-2">
              <div className="flex items-center gap-2 px-1">
                <span
                  className={`text-xs font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                    group.isOverdue
                      ? 'bg-red-100 text-red-800 border-red-200'
                      : group.isToday
                        ? 'bg-blue-600 text-white border-blue-700'
                        : 'bg-gray-100 text-gray-700 border-gray-200'
                  }`}
                >
                  {group.label}
                </span>
                <div className="h-px bg-gray-200 flex-1" />
              </div>

              <div className="space-y-2">
                {group.items.map(item => {
                  const cfg = badgeConfig[item.kind];
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={item.onClick}
                      className={`w-full text-left bg-white border p-3.5 rounded-xl shadow-xs hover:shadow-md transition-all group flex items-center justify-between gap-3 ${
                        item.isOverdue
                          ? 'border-red-200 hover:border-red-400 bg-red-50/30'
                          : 'border-gray-200 hover:border-blue-300'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold border ${cfg.className}`}>
                            {cfg.icon}
                            {cfg.label}
                          </span>
                          <span className="text-xs font-bold text-gray-500">{item.timeLabel}</span>
                          {item.subtitle && item.kind === 'SERVICE' && (
                            <span className="text-[11px] font-semibold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded">
                              {item.subtitle}
                            </span>
                          )}
                          {item.subtitle && item.kind === 'TASK' && (
                            <span className="text-[11px] font-semibold text-gray-500">{item.subtitle}</span>
                          )}
                        </div>

                        <h3 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors leading-snug truncate">
                          {item.title}
                        </h3>

                        {(item.departureTime || item.driverNames) && (
                          <div className="mt-1.5 text-xs text-gray-600 flex items-center bg-gray-50 border border-gray-200 px-2 py-1 rounded-md w-max">
                            <span className="mr-1.5">🚗</span>
                            {item.departureTime ? (
                              <span>
                                Abfahrt: <strong className="text-gray-900">{item.departureTime} Uhr</strong>
                                {item.driverNames ? ` (${item.driverNames})` : ''}
                              </span>
                            ) : (
                              <span>
                                Fahrer: <strong className="text-gray-900">{item.driverNames}</strong>
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-blue-500 shrink-0" />
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};
// --- END OF FILE ---
