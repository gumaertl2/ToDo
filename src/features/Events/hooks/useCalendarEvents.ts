// [2026-10-19] - BUGFIX: Gegner-Extraktion für calendarTitle unterstützt nun neben Bindestrichen (" - ") auch " vs. " und " vs ", damit der eigene Vereinsname in der Kalenderansicht zuverlässig ausgeblendet wird.
// [2026-10-19] - UX-FEATURE: Abgestufte Kalender-Titel (calendarTitle ohne eigenen Vereinsnamen & mobileShortTitle für Handy-Hochformat) in useCalendarEvents integriert.
// [2026-10-18] - UX-FEATURE: Abo-Namen (z.B. H1, J1) direkt mit Leerzeichen nach dem Heim-/Auswärts-Icon in den Begegnungstitel integriert (z.B. "🏠 H1 SC Maisach - ...").
// [2026-10-18] - BUGFIX: TypeScript-Check (TS2339) in useCalendarEvents behoben – nutzt nun offiziell reminderRecipientUserIds & reminderRecipientHelperIds auf CalendarEvent.
// [2026-10-18] - UX-FEATURE: Persönliche Einsatz-Erkennung (isMyAssignment & myAssignmentIcons: 🏓, 🚗, 📋, ☕) für den eingeloggten Nutzer in useCalendarEvents integriert.
// [2026-10-14] - BUGFIX: Unused import 'generateStableEventId' removed to fix TS6133 build error.
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
  isMyAssignment?: boolean;
  myAssignmentIcons?: string;
  calendarTitle?: string;
  mobileShortTitle?: string;
}

interface UseCalendarEventsProps {
  currentView: 'month' | 'week' | 'day' | 'agenda' | 'termine' | 'dienste';
  activeFilters: string[];
  showPastEvents: boolean;
}

// Extrahiert aus einer Paarung ("[Heim] vs. [Gast]" oder "[Heim] - [Gast]") gezielt den Gegnernamen
function extractOpponentName(rawTitle: string, isHeim: boolean): string {
  const separatorRegex = /\s+(?:vs\.?|-|–|:)\s+/i;
  if (!separatorRegex.test(rawTitle)) return rawTitle;

  const parts = rawTitle.split(separatorRegex);
  if (parts.length < 2) return rawTitle;

  return isHeim ? parts.slice(1).join(' - ').trim() : parts[0].trim();
}

export const useCalendarEvents = ({ currentView, activeFilters, showPastEvents }: UseCalendarEventsProps) => {
  const { 
    user,
    calendarEvents, 
    events, 
    calendarSubscriptions, 
    teams, 
    helpers, 
    matchLineups,
    pollResponsesByEvent
  } = useClubStore();

  const myHelper = useMemo(() => {
    if (!user?.email || !helpers) return undefined;
    return helpers.find(h => h.email?.toLowerCase() === user.email?.toLowerCase());
  }, [user, helpers]);

  const rbcEvents: AdaptedEvent[] = useMemo(() => {
    const myHelperId = myHelper?.id;

    const internalEvents = calendarEvents.map(ev => {
      const isHeim = !!ev.location?.toLowerCase().includes('maisach');
      const isAuswaerts = !!(ev.location && !isHeim);
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

      // Prüfen, ob der eingeloggte Nutzer diesem Termin/Dienst direkt zugewiesen ist
      let isMyAssignment = false;
      let myAssignmentIcons = '';

      const isDirectUser = !!(user && (ev.reminderRecipientUserIds?.includes(user.id) || (ev as any).participantUserIds?.includes(user.id)));
      const isDirectHelper = !!(myHelperId && (ev.reminderRecipientHelperIds?.includes(myHelperId) || (ev as any).participantHelperIds?.includes(myHelperId)));
      let isAliasDuty = false;

      if (ev.eventType === 'DIENST' && ev.title.includes(':') && myHelper) {
        const parts = ev.title.split(':');
        const alias = parts[parts.length - 1].trim().toLowerCase();
        if (alias && (alias === (myHelper.alias || '').toLowerCase() || alias === myHelper.name.toLowerCase())) {
          isAliasDuty = true;
        }
      }

      if (ev.eventType === 'DIENST' && (isDirectUser || isDirectHelper || isAliasDuty)) {
        isMyAssignment = true;
        myAssignmentIcons = '☕';
      } else if (ev.showInMatchPlan && (isDirectUser || isDirectHelper)) {
        isMyAssignment = true;
        myAssignmentIcons = '🏓';
      }

      const fullTitle = ev.isPublic ? baseTitle : `🔒 ${baseTitle}`;
      const calendarClean = ev.showInMatchPlan
        ? `${matchPrefix}${extractOpponentName(ev.title, isHeim)}`
        : fullTitle;

      return {
        id: ev.id, 
        sourceId: 'manual', 
        seriesId: ev.seriesId, 
        title: fullTitle,
        calendarTitle: ev.isPublic ? calendarClean : `🔒 ${calendarClean}`,
        mobileShortTitle: ev.isPublic ? calendarClean : `🔒 ${calendarClean}`,
        description: ev.description || '', 
        location: ev.location || '',
        start: new Date(ev.startTime), 
        end: ev.endTime ? new Date(ev.endTime) : new Date(ev.startTime + (1000 * 60 * 60)), 
        allDay: ev.isAllDay, 
        sourceEvent: ev, 
        color: ev.color || '#3b82f6',
        showInMatchPlan: ev.showInMatchPlan,
        pollSummary,
        isMyAssignment,
        myAssignmentIcons: myAssignmentIcons || undefined
      };
    });
    
    const internalSitzungen = events.filter(ev => ev.plannedStartTime && ev.status !== 'ABGESCHLOSSEN').map(ev => {
      const sitzungTitle = ev.isPublic ? `Sitzung: ${ev.title}` : `🔒 Sitzung: ${ev.title}`;
      return {
        id: ev.id, 
        sourceId: 'manual', 
        seriesId: undefined, 
        title: sitzungTitle,
        calendarTitle: sitzungTitle,
        mobileShortTitle: sitzungTitle,
        description: ev.description || '', 
        location: ev.location || '',
        start: new Date(ev.plannedStartTime!), 
        end: ev.plannedEndTime ? new Date(ev.plannedEndTime) : new Date(ev.plannedStartTime! + (1000 * 60 * 60 * 2)), 
        allDay: false, 
        rawSitzung: ev, 
        color: '#8b5cf6',
        showInMatchPlan: false
      };
    });

    const cachedExternalEvents = calendarSubscriptions.filter(sub => sub.isActive && sub.cachedEvents).flatMap(sub => {
      const teamId = sub.reminderRecipientTeamIds?.[0];
      const team = teamId ? teams.find(t => t.id === teamId) : null;
      const subPrefix = sub.name ? `${sub.name.trim()} ` : '';

      return sub.cachedEvents!.map((ev, index) => {
        const isHeim = !!ev.location?.toLowerCase().includes('maisach');
        const isAuswaerts = !!(ev.location && !isHeim);
        const matchPrefix = sub.showInMatchPlan ? (isHeim ? '🏠 ' : (isAuswaerts ? '🚌 ' : '')) : '';

        // Prüfen, ob der eingeloggte Nutzer für dieses Spiel eingeteilt ist (Spieler, Fahrer, Betreuer)
        const icons: string[] = [];
        if (myHelperId && team) {
          const safeEventId = generateStableEventId(team.id, ev);
          const lineup = (matchLineups || []).find(m => m.id === safeEventId);
          const activePlayerIds = lineup ? lineup.lineupHelperIds : (team.defaultLineupHelperIds || []);

          if (activePlayerIds.includes(myHelperId)) {
            icons.push('🏓');
          }
          if (lineup?.fahrerHelperIds?.includes(myHelperId)) {
            icons.push('🚗');
          }
          if (lineup?.betreuerHelperIds?.includes(myHelperId)) {
            icons.push('📋');
          }
        }

        const isMyAssignment = icons.length > 0;
        const myAssignmentIcons = icons.join(' ');

        // Für die Kalenderansicht: Eigenen Verein aus "[Heim] vs. [Gast]" bzw. "[Heim] - [Gast]" weglassen -> nur Gegner anzeigen
        const opponentOnlyTitle = sub.showInMatchPlan
          ? extractOpponentName(ev.title, isHeim)
          : ev.title;

        const fullTitle = `${matchPrefix}${subPrefix}${ev.title}`;
        const calendarTitle = `${matchPrefix}${subPrefix}${opponentOnlyTitle}`;
        const mobileShortTitle = sub.showInMatchPlan && sub.name
          ? `${matchPrefix}${sub.name.trim()}`
          : calendarTitle;

        return {
          id: `ics-${sub.id}-${ev.uid}-${index}`, 
          sourceId: sub.id, 
          title: fullTitle, 
          calendarTitle,
          mobileShortTitle,
          description: ev.description || '', 
          location: ev.location || '',
          start: new Date(ev.startTime), 
          end: new Date(ev.endTime), 
          allDay: ev.isAllDay, 
          color: sub.color,
          showInMatchPlan: sub.showInMatchPlan,
          sourceEvent: ev,
          isMyAssignment,
          myAssignmentIcons: myAssignmentIcons || undefined
        };
      });
    });
      
    const logisticsEvents: AdaptedEvent[] = [];
    calendarSubscriptions.forEach(sub => {
        if (!sub.isActive || !sub.cachedEvents) return;
        const teamId = sub.reminderRecipientTeamIds?.[0];
        const team = teamId ? teams.find(t => t.id === teamId) : null;
        if (!team || (!team.requiresBetreuer && !team.requiresFahrer)) return;
        const subPrefix = sub.name ? `${sub.name.trim()} ` : '';

        sub.cachedEvents.forEach((ev, index) => {
            const isHeim = !!ev.location?.toLowerCase().includes('maisach');
            const isAuswaerts = !!(ev.location && !isHeim);
            const matchPrefix = sub.showInMatchPlan ? (isHeim ? '🏠 ' : (isAuswaerts ? '🚌 ' : '')) : '';

            const icons: string[] = [];
            if (myHelperId) {
              const safeEventId = generateStableEventId(team.id, ev);
              const lineup = (matchLineups || []).find(m => m.id === safeEventId);
              if (lineup?.fahrerHelperIds?.includes(myHelperId)) icons.push('🚗');
              if (lineup?.betreuerHelperIds?.includes(myHelperId)) icons.push('📋');
            }

            const fullTitle = `${matchPrefix}${subPrefix}${ev.title}`;

            logisticsEvents.push({
                id: `logistics-${sub.id}-${ev.uid}-${index}`,
                sourceId: sub.id, 
                title: fullTitle,
                calendarTitle: fullTitle,
                mobileShortTitle: fullTitle,
                description: ev.description || '',
                location: ev.location || '',
                start: new Date(ev.startTime),
                end: new Date(ev.endTime),
                allDay: ev.isAllDay,
                color: '#9333ea', 
                sourceEvent: ev, 
                isLogisticsDuty: true,
                teamName: team.name,
                isMyAssignment: icons.length > 0,
                myAssignmentIcons: icons.length > 0 ? icons.join(' ') : undefined
            });
        });
    });

    return [...internalEvents, ...internalSitzungen, ...cachedExternalEvents, ...logisticsEvents];
  }, [user, myHelper, calendarEvents, events, calendarSubscriptions, teams, helpers, matchLineups, pollResponsesByEvent]);

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