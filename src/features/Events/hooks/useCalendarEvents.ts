// [2026-10-14] - UX-REFACTOR: Statische Logistik-Badges aus dem Event-Titel entfernt. Die App nutzt nun interaktive Inline-Komponenten direkt in der Kalender-Listenansicht.
// [2026-10-13] - FEATURE: pollSummary zum AdaptedEvent hinzugefügt.
// [2026-10-13] - BUGFIX: ev.uid durch generateStableEventId (Stable-ID) ersetzt.
// [2026-10-12] - REFACTOR: Daten-Mapping in eigenen Hook ausgelagert.
// src/features/Events/hooks/useCalendarEvents.ts
import { useMemo } from 'react';
import type { Event as RBCEvent } from 'react-big-calendar';
import { startOfDay } from 'date-fns/startOfDay';
import { useClubStore } from '../../../store/useClubStore';
import type { CalendarEvent, Event } from '../../../core/types/models';
import { generateStableEventId } from '../../Users/hooks/useMatchLineupMatrix';

export interface AdaptedEvent extends RBCEvent {
  id: string; 
  sourceId: string; 
  sourceEvent?: CalendarEvent | any; 
  rawSitzung?: Event; 
  color?: string; 
  description?: string; 
  location?: string; 
  seriesId?: string; 
  showInMatchPlan?: boolean;
  isLogisticsDuty?: boolean; 
  teamName?: string;
  pollSummary?: string; 
}

interface UseCalendarEventsProps {
  currentView: 'month' | 'week' | 'day' | 'agenda' | 'termine' | 'dienste';
  activeFilters: string[];
  showPastEvents: boolean;
}

export const useCalendarEvents = ({ currentView, activeFilters, showPastEvents }: UseCalendarEventsProps) => {
  const { 
    calendarEvents, 
    events, 
    calendarSubscriptions, 
    teams, 
    helpers, 
    matchLineups,
    pollResponsesByEvent
  } = useClubStore();

  const rbcEvents: AdaptedEvent[] = useMemo(() => {
    const internalEvents = calendarEvents.map(ev => {
      const isHeim = ev.location?.toLowerCase().includes('maisach');
      const isAuswaerts = ev.location && !isHeim;
      const matchPrefix = ev.showInMatchPlan ? (isHeim ? '🏠 ' : (isAuswaerts ? '🚌 ' : '')) : '';
      const baseTitle = `${matchPrefix}${ev.title}`;

      let pollSummary = undefined;
      if (ev.pollConfig?.isActive && ev.pollConfig.options?.length > 0) {
        const responses = pollResponsesByEvent[ev.id] || [];
        if (responses.length > 0) {
          const parts = ev.pollConfig.options.map(opt => {
            const count = responses.filter(r => (r.selectedOptionIds || []).includes(opt.id)).length;
            const match = opt.text.match(/^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)/u);
            const emoji = match ? match[1] : '';
            return `${count} ${emoji}`.trim();
          });
          pollSummary = parts.join('  |  ');
        } else {
          pollSummary = "Noch keine Antworten";
        }
      }

      return {
        id: ev.id, 
        sourceId: 'manual', 
        seriesId: ev.seriesId, 
        title: ev.isPublic ? baseTitle : `🔒 ${baseTitle}`,
        description: ev.description || '', 
        location: ev.location || '',
        start: new Date(ev.startTime), 
        end: ev.endTime ? new Date(ev.endTime) : new Date(ev.startTime + (1000 * 60 * 60)), 
        allDay: ev.isAllDay, 
        sourceEvent: ev, 
        color: ev.color || '#3b82f6',
        showInMatchPlan: ev.showInMatchPlan,
        pollSummary
      };
    });
    
    const internalSitzungen = events.filter(ev => ev.plannedStartTime && ev.status !== 'ABGESCHLOSSEN').map(ev => ({
      id: ev.id, 
      sourceId: 'manual', 
      seriesId: undefined, 
      title: ev.isPublic ? `Sitzung: ${ev.title}` : `🔒 Sitzung: ${ev.title}`,
      description: ev.description || '', 
      location: ev.location || '',
      start: new Date(ev.plannedStartTime!), 
      end: ev.plannedEndTime ? new Date(ev.plannedEndTime) : new Date(ev.plannedStartTime! + (1000 * 60 * 60 * 2)), 
      allDay: false, 
      rawSitzung: ev, 
      color: '#8b5cf6',
      showInMatchPlan: false
    }));

    const cachedExternalEvents = calendarSubscriptions.filter(sub => sub.isActive && sub.cachedEvents).flatMap(sub => 
        sub.cachedEvents!.map((ev, index) => {
          const isHeim = ev.location?.toLowerCase().includes('maisach');
          const isAuswaerts = ev.location && !isHeim;
          const matchPrefix = sub.showInMatchPlan ? (isHeim ? '🏠 ' : (isAuswaerts ? '🚌 ' : '')) : '';

          return {
            id: `ics-${sub.id}-${ev.uid}-${index}`, 
            sourceId: sub.id, 
            title: `${matchPrefix}${ev.title}`, 
            description: ev.description || '', 
            location: ev.location || '',
            start: new Date(ev.startTime), 
            end: new Date(ev.endTime), 
            allDay: ev.isAllDay, 
            color: sub.color,
            showInMatchPlan: sub.showInMatchPlan,
            sourceEvent: ev 
          };
        })
      );
      
    const logisticsEvents: AdaptedEvent[] = [];
    calendarSubscriptions.forEach(sub => {
        if (!sub.isActive || !sub.cachedEvents) return;
        const teamId = sub.reminderRecipientTeamIds?.[0];
        const team = teamId ? teams.find(t => t.id === teamId) : null;
        if (!team || (!team.requiresBetreuer && !team.requiresFahrer)) return;

        sub.cachedEvents.forEach((ev, index) => {
            const isHeim = ev.location?.toLowerCase().includes('maisach');
            const isAuswaerts = ev.location && !isHeim;
            const matchPrefix = sub.showInMatchPlan ? (isHeim ? '🏠 ' : (isAuswaerts ? '🚌 ' : '')) : '';

            // WIR BAUEN DIE LOGISTIK EVENTS (nur die Hüllen, die Details macht das Frontend live!)
            logisticsEvents.push({
                id: `logistics-${sub.id}-${ev.uid}-${index}`,
                sourceId: sub.id, 
                title: `${matchPrefix}${ev.title}`,
                description: ev.description || '',
                location: ev.location || '',
                start: new Date(ev.startTime),
                end: new Date(ev.endTime),
                allDay: ev.isAllDay,
                color: '#9333ea', 
                sourceEvent: ev, 
                isLogisticsDuty: true,
                teamName: team.name
            });
        });
    });

    return [...internalEvents, ...internalSitzungen, ...cachedExternalEvents, ...logisticsEvents];
  }, [calendarEvents, events, calendarSubscriptions, teams, helpers, matchLineups, pollResponsesByEvent]);

  const filteredEvents = useMemo(() => {
    const todayStart = startOfDay(new Date()).getTime();
    const isListView = ['termine', 'dienste'].includes(currentView);

    return rbcEvents.filter(ev => {
      if (ev.isLogisticsDuty) {
          if (currentView !== 'dienste') return false;
          return activeFilters.includes('dienste');
      }

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
    if (currentView === 'termine') return filteredEvents.filter(e => e.sourceId === 'manual' && !e.seriesId && !e.isLogisticsDuty);
    if (currentView === 'dienste') return filteredEvents.filter(e => !!e.seriesId || e.isLogisticsDuty);
    return filteredEvents;
  }, [filteredEvents, currentView]);

  return { rbcEvents, displayEvents };
};
// --- END OF FILE ---