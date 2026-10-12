// [2026-10-12] - REFACTOR: Daten-Mapping, Filterung und Heimspiel-Logik aus CalendarView in eigenen Hook (useCalendarEvents) ausgelagert.
// src/features/Events/hooks/useCalendarEvents.ts
import { useMemo } from 'react';
import type { Event as RBCEvent } from 'react-big-calendar';
import { startOfDay } from 'date-fns/startOfDay';
import { useClubStore } from '../../../store/useClubStore';
import type { CalendarEvent, Event } from '../../../core/types/models';

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
    matchLineups 
  } = useClubStore();

  // 1. RAW MAPPING: Aus Datenbank-Modellen die Kalender-Events generieren
  const rbcEvents: AdaptedEvent[] = useMemo(() => {
    const internalEvents = calendarEvents.map(ev => {
      const isHeim = ev.location?.toLowerCase().includes('maisach');
      const isAuswaerts = ev.location && !isHeim;
      const matchPrefix = ev.showInMatchPlan ? (isHeim ? '🏠 ' : (isAuswaerts ? '🚌 ' : '')) : '';
      const baseTitle = `${matchPrefix}${ev.title}`;

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
        showInMatchPlan: ev.showInMatchPlan
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
      
    // Logistik-Einträge als Dienste generieren (inklusive Helfer-Namen)
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

            const safeEventId = ev.uid.replace(/[\/\\.#$\[\]]/g, '_');
            const lineup = matchLineups.find(m => m.id === safeEventId);

            const badges: string[] = [];
            
            // Heimspiel-Logik für Fahrer
            if (team.requiresFahrer) {
                const fahrerIds = lineup?.fahrerHelperIds || [];
                if (!isHeim || fahrerIds.length > 0) {
                    if (fahrerIds.length === 0) {
                        badges.push('🚗 Offen');
                    } else {
                        const names = fahrerIds.map(id => {
                            const h = helpers.find(x => x.id === id);
                            return h ? (h.alias || h.name.split(' ')[0]) : '?';
                        });
                        let fahrerStr = `🚗 ${names.join(', ')}`;
                        if (lineup?.departureTime) {
                             fahrerStr += ` (Abfahrt: ${lineup.departureTime} Uhr)`;
                        }
                        badges.push(fahrerStr);
                    }
                }
            }

            if (team.requiresBetreuer) {
                const betreuerIds = lineup?.betreuerHelperIds || [];
                if (betreuerIds.length === 0) {
                    badges.push('🧑‍🏫 Offen');
                } else {
                    const names = betreuerIds.map(id => {
                        const h = helpers.find(x => x.id === id);
                        return h ? (h.alias || h.name.split(' ')[0]) : '?';
                    });
                    badges.push(`🧑‍🏫 ${names.join(', ')}`);
                }
            }

            if (badges.length === 0) return;

            const badgesString = badges.length > 0 ? ` (${badges.join(' | ')})` : '';

            logisticsEvents.push({
                id: `logistics-${sub.id}-${ev.uid}-${index}`,
                sourceId: sub.id, 
                title: `Dienste ${team.name}: ${matchPrefix}${ev.title}${badgesString}`,
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
  }, [calendarEvents, events, calendarSubscriptions, teams, helpers, matchLineups]);

  // 2. FILTERING: Welche Events dürfen in der aktuellen Ansicht überhaupt auftauchen?
  const filteredEvents = useMemo(() => {
    const todayStart = startOfDay(new Date()).getTime();
    const isListView = ['termine', 'dienste'].includes(currentView);

    return rbcEvents.filter(ev => {
      // Logistik-Dienste gehören exklusiv in die Dienste-Ansicht
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

  // 3. DISPLAY SPLIT: Trennung für die Listenansichten
  const displayEvents = useMemo(() => {
    if (currentView === 'termine') return filteredEvents.filter(e => e.sourceId === 'manual' && !e.seriesId && !e.isLogisticsDuty);
    if (currentView === 'dienste') return filteredEvents.filter(e => !!e.seriesId || e.isLogisticsDuty);
    return filteredEvents;
  }, [filteredEvents, currentView]);

  return { rbcEvents, displayEvents };
};
// --- END OF FILE ---