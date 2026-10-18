// [2026-10-18] - FEAT: Konfigurierbarer Rückblick-Zeitraum (historyLookbackDays, Standard 30 Tage mit localStorage-Persistenz) für die Erinnerungs-Historie ergänzt.
// [2026-10-18] - FEAT: Audit-Trail & Verlauf (Gesendet/Verworfen von wem & wann), Wiederherstellen-Funktion sowie Differenzierung zwischen Terminen (strikte Mitternachtsregel) und offenen Aufgaben (bleiben nach Fälligkeit als Überfällig sichtbar, bis sie erledigt sind).
// [2026-10-18] - REFACTOR: Berechnungs-, Formatierungs- und Aktionslogik (WhatsApp-Versand, Snooze, Verwerfen, Auto-Kader) aus der überladenen RemindersView.tsx in einen dedizierten Custom Hook ausgelagert (Separation of Concerns).
// src/features/Reminders/hooks/useRemindersData.ts
import { useMemo, useState, useEffect } from 'react';
import { useClubStore } from '../../../store/useClubStore';

export type ReminderModelType = 'calendarEvent' | 'task' | 'event' | 'subscription';

export interface PendingReminderItem {
  id: string;
  type: string;
  title: string;
  date: number;
  text: string;
  targetsNames: string;
  isDirect: boolean;
  phone: string;
  rawItem: any;
  diffDays: number;
  senderUserId: string;
  senderName: string;
  isRecipient: boolean;
  model: ReminderModelType;
  sentAt?: number;
  sentBy?: string;
  action?: 'SENT' | 'DISMISSED';
}

// Hilfsfunktion: Macht iCal-UIDs sicher für Firestore Dokument-Pfade
const sanitizeId = (id: string) => id.replace(/[\/\\.#$\[\]]/g, '_');

export const formatReminderText = (type: string, item: any, customText?: string): string => {
  const baseText = customText ? customText : 'Hallo, hier ist eine kurze Erinnerung für dich:';
  const details: string[] = [];

  if (type === 'Event' || type === 'Sitzung' || type === 'Abo' || type === 'Dienst' || type === 'Termin') {
    const start = new Date(item.startTime || item.plannedStartTime);
    let dateStr = start.toLocaleDateString('de-DE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    
    let timeStr = 'Ganztägig';
    const endTs = item.endTime || item.plannedEndTime;

    // CHIRURGISCHER EINGRIFF: Enddatum auswerten (auch bei ganztägigen Terminen)
    if (endTs) {
      let end = new Date(endTs);
      
      // Korrektur für exklusive ICS-Enddaten bei ganztägigen Events (00:00 Uhr am Folgetag)
      if (item.isAllDay && end.getHours() === 0 && end.getMinutes() === 0 && end.getTime() > start.getTime()) {
        end = new Date(end.getTime() - 1000);
      }

      const startDayStr = start.toLocaleDateString('de-DE');
      const endDayStr = end.toLocaleDateString('de-DE');

      // Wenn der Termin über mehrere Tage geht
      if (startDayStr !== endDayStr) {
        dateStr += ` bis ${end.toLocaleDateString('de-DE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`;
      }

      // Uhrzeit formatieren (wenn nicht ganztägig)
      if (!item.isAllDay) {
        timeStr = start.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) + ' Uhr';
        if (startDayStr !== endDayStr) {
          timeStr += ` (Ende: ${end.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr)`;
        } else {
          timeStr += ` - ${end.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr`;
        }
      }
    } else if (!item.isAllDay) {
      // Kein Enddatum vorhanden, aber spezifische Startzeit
      timeStr = start.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) + ' Uhr';
    }

    details.push(`📌 Titel: ${item.title}`);
    details.push(`📅 Termin: ${dateStr}`);
    details.push(`⏰ Zeit: ${timeStr}`);
    if (item.location) {
      details.push(`📍 Ort: ${item.location}`);
    }
    if (item.description) {
      details.push(`ℹ️ Info: ${item.description}`);
    }
  } else {
    details.push(`📌 Titel: ${item.title}`);
    if (item.dueDate) {
      details.push(`📅 Fällig am: ${new Date(item.dueDate).toLocaleDateString('de-DE')}`);
    }
    if (item.description) {
      details.push(`ℹ️ Info: ${item.description}`);
    }
  }

  return `${baseText}\n\n${details.join('\n')}`;
};

export const useRemindersData = () => {
  const { 
    events,
    calendarEvents, 
    tasks, 
    allAgendaItems,
    calendarSubscriptions, 
    groups, 
    helpers,
    users, 
    teams,
    matchLineups,
    user, 
    roleProfiles, 
    saveAgendaItem,
    updateCalendarEvent,
    updateEvent,
    updateCalendarSubscription, 
    isEventsLoading,
    isUsersLoading,
    fetchTasks
  } = useClubStore();

  useEffect(() => {
    if (user && !isEventsLoading) {
      if (allAgendaItems?.length === 0 && tasks?.length === 0 && typeof fetchTasks === 'function') {
        fetchTasks();
      }
    }
  }, [user, isEventsLoading, allAgendaItems?.length, tasks?.length, fetchTasks]);

  const isDataLoading = isEventsLoading || isUsersLoading;

  const userRoleProfile = roleProfiles?.find(p => p.id === user?.roleProfileId);
  const canViewAll = !!userRoleProfile?.permissions?.viewAllReminders || !!user?.permissions?.viewAllReminders;
  
  const [showAll, setShowAll] = useState(false);
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
  const [snoozeDays, setSnoozeDays] = useState<Record<string, number>>({});

  const [historyLookbackDays, setHistoryLookbackDays] = useState<number>(() => {
    const saved = localStorage.getItem('reminders_history_lookback');
    return saved !== null ? parseInt(saved, 10) : 30;
  });

  useEffect(() => {
    localStorage.setItem('reminders_history_lookback', historyLookbackDays.toString());
  }, [historyLookbackDays]);

  const { allPendingReminders, allHistoryReminders } = useMemo<{
    allPendingReminders: PendingReminderItem[];
    allHistoryReminders: PendingReminderItem[];
  }>(() => {
    if (!user) return { allPendingReminders: [], allHistoryReminders: [] };
    
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const MS_PER_DAY = 1000 * 60 * 60 * 24;
    const historyCutoff = todayStart - (Math.max(0, historyLookbackDays) * MS_PER_DAY);
    
    const userGroupIds = user.groupIds || [];
    const myHelper = helpers.find(h => h.email?.toLowerCase() === user.email?.toLowerCase());
    const myHelperId = myHelper?.id;
    const myTeamIds = myHelper?.teamIds || [];

    const resolveSender = (rawSenderId: string, fallbackUserIds?: string[]) => {
      const effectiveId = rawSenderId === 'auto' ? (fallbackUserIds?.[0] || 'auto') : rawSenderId;
      const senderName = users.find(u => u.id === effectiveId)?.name || (rawSenderId === 'auto' ? 'Automatisch (Kein App-Nutzer)' : 'Unbekannt');
      return { effectiveId, senderName };
    };

    const pendingItems: PendingReminderItem[] = [];
    const historyItems: PendingReminderItem[] = [];

    // 1. KALENDER-TERMINE & DIENSTE (Strikte Mitternachtsregel für offene Erinnerungen)
    if (calendarEvents) {
      calendarEvents.forEach(ce => {
        if (!ce.reminderSenderUserId && !ce.reminderSentAt) return;

        const leadDays = Number(ce.reminderLeadDays) || 0;
        const eventStart = new Date(ce.startTime);
        const eventDateStart = new Date(eventStart.getFullYear(), eventStart.getMonth(), eventStart.getDate()).getTime();
        const stichtag = eventDateStart - (leadDays * MS_PER_DAY);
        const diffDays = Math.ceil((eventDateStart - todayStart) / MS_PER_DAY);

        const isPendingDue = !ce.reminderSentAt && !!ce.reminderSenderUserId && todayStart >= stichtag && todayStart <= eventDateStart;
        const isHistory = !!ce.reminderSentAt && ce.reminderSentAt >= historyCutoff;

        if (!isPendingDue && !isHistory) return;

        let targetsNames = 'Manuelle Gruppenwahl';
        let isDirect = false;
        let phone = '';
        let isRecipient = false;

        if (ce.eventType === 'DIENST' && ce.title.includes(':')) {
          const parts = ce.title.split(':');
          const alias = parts[parts.length - 1].trim(); 
          
          if (alias) {
            const helper = helpers.find(h => 
              (h.alias || '').toLowerCase() === alias.toLowerCase() || 
              h.name.toLowerCase() === alias.toLowerCase()
            );

            if (helper) {
              targetsNames = helper.alias || helper.name;
              isDirect = !!helper.telefon;
              phone = helper.telefon || '';
              if (helper.id === myHelperId) isRecipient = true;
            } else {
              targetsNames = `${alias} (Keine Nummer hinterlegt)`;
            }
          }
        } else {
          const targets: { name: string, phone?: string, isGroup: boolean }[] = [];
          
          ce.reminderRecipientGroupIds?.forEach(id => { const g = groups.find(x => x.id === id); if (g) targets.push({ name: g.name, isGroup: true }); });
          ce.reminderRecipientTeamIds?.forEach(id => { const t = teams.find(x => x.id === id); if (t) targets.push({ name: t.name, isGroup: true }); });
          ce.reminderRecipientUserIds?.forEach(id => { const u = users.find(x => x.id === id); if (u) targets.push({ name: u.name, phone: u.telefon, isGroup: false }); });
          ce.reminderRecipientHelperIds?.forEach(id => { const h = helpers.find(x => x.id === id); if (h) targets.push({ name: h.alias || h.name, phone: h.telefon, isGroup: false }); });

          const isDirectRecipient = ce.reminderRecipientUserIds?.includes(user.id);
          const isGroupRecipient = ce.reminderRecipientGroupIds?.some(id => userGroupIds.includes(id));
          const isTeamRecipient = ce.reminderRecipientTeamIds?.some(id => myTeamIds.includes(id));
          const isHelperRecipient = myHelperId && ce.reminderRecipientHelperIds?.includes(myHelperId);

          targetsNames = targets.map(x => x.name).join(', ');
          if (!targetsNames) targetsNames = 'Manuelle Auswahl';
          isDirect = targets.length === 1 && !targets[0].isGroup && !!targets[0].phone;
          phone = isDirect ? (targets[0].phone || '') : '';
          isRecipient = !!(isDirectRecipient || isGroupRecipient || isTeamRecipient || isHelperRecipient);
        }

        const fullText = formatReminderText(ce.eventType === 'DIENST' ? 'Dienst' : 'Termin', ce, ce.reminderCustomText);
        const { effectiveId, senderName } = resolveSender(ce.reminderSenderUserId || '', ce.reminderRecipientUserIds);

        const itemObj: PendingReminderItem = {
          id: ce.id,
          type: ce.eventType === 'DIENST' ? 'Dienst' : 'Termin',
          title: ce.title,
          date: ce.startTime,
          text: fullText,
          targetsNames,
          isDirect,
          phone,
          rawItem: ce,
          diffDays,
          senderUserId: effectiveId,
          senderName,
          isRecipient,
          model: 'calendarEvent',
          sentAt: ce.reminderSentAt,
          sentBy: ce.reminderSentBy || 'Unbekannt (Altbestand)',
          action: ce.reminderAction || 'SENT'
        };

        if (isHistory) {
          historyItems.push(itemObj);
        } else if (isPendingDue) {
          pendingItems.push(itemObj);
        }
      });
    }

    // 2. AUFGABEN & AGENDAPUNKTE
    // - Offene Aufgaben (AUFGABE): Bleiben auch nach Fälligkeit als "Überfällig" sichtbar, bis sie erledigt (100% / ERLEDIGT) oder versendet/verworfen sind.
    // - Reine Agendapunkte/Infos/Beschlüsse: Strikte Mitternachtsregel.
    if (allAgendaItems) {
      allAgendaItems.forEach(t => {
        if (t.isTemplate || !t.dueDate) return;
        if (!t.reminderSenderUserId && !t.reminderSentAt) return;

        const isTask = !t.type || t.type === 'AUFGABE';
        const isCompletedOrDeleted = t.status === 'ERLEDIGT' || t.progress === 100 || t.status === 'TRASH' || t.isHistorical;

        if (!t.reminderSentAt) {
          if (isCompletedOrDeleted) return;

          if (t.eventId) {
            const parentEvent = events.find(e => e.id === t.eventId);
            if (!parentEvent) return; 
            if (parentEvent.status === 'PLANUNG' && !parentEvent.isPublished) return; 
            if (parentEvent.status === 'ABGESCHLOSSEN' || parentEvent.isArchived) return; 
          }

          if (t.isSubItem && t.parentItemId) {
            const parentTask = allAgendaItems.find(x => x.id === t.parentItemId);
            if (parentTask && parentTask.status === 'ERLEDIGT') return; 
          }
        }

        const leadDays = Number(t.reminderLeadDays) || 0;
        const taskDue = new Date(t.dueDate);
        const taskDateStart = new Date(taskDue.getFullYear(), taskDue.getMonth(), taskDue.getDate()).getTime();
        const stichtag = taskDateStart - (leadDays * MS_PER_DAY);
        const diffDays = Math.ceil((taskDateStart - todayStart) / MS_PER_DAY);

        // Aufgaben bleiben überfällig sichtbar (todayStart >= stichtag), Nicht-Aufgaben folgen der Mitternachtsregel
        const isPendingDue = !t.reminderSentAt && !!t.reminderSenderUserId && (
          isTask ? (todayStart >= stichtag) : (todayStart >= stichtag && todayStart <= taskDateStart)
        );
        const isHistory = !!t.reminderSentAt && t.reminderSentAt >= historyCutoff;

        if (!isPendingDue && !isHistory) return;

        const targets: { name: string, phone?: string, isGroup: boolean }[] = [];
        
        t.assigneeGroupIds?.forEach(id => { const g = groups.find(x => x.id === id); if (g) targets.push({ name: g.name, isGroup: true }); });
        t.assigneeTeamIds?.forEach(id => { const tm = teams.find(x => x.id === id); if (tm) targets.push({ name: tm.name, isGroup: true }); });
        t.assigneeUserIds?.forEach(id => { const u = users.find(x => x.id === id); if (u) targets.push({ name: u.name, phone: u.telefon, isGroup: false }); });
        t.assigneeHelperIds?.forEach(id => { const h = helpers.find(x => x.id === id); if (h) targets.push({ name: h.alias || h.name, phone: h.telefon, isGroup: false }); });

        const isDirectRecipient = t.assigneeUserIds?.includes(user.id);
        const isGroupRecipient = t.assigneeGroupIds?.some(id => userGroupIds.includes(id));
        const isTeamRecipient = t.assigneeTeamIds?.some(id => myTeamIds.includes(id));
        const isHelperRecipient = myHelperId && t.assigneeHelperIds?.includes(myHelperId);

        const targetsNames = targets.map(x => x.name).join(', ') || 'Manuelle Auswahl';
        const isDirect = targets.length === 1 && !targets[0].isGroup && !!targets[0].phone;
        const phone = isDirect ? (targets[0].phone || '') : '';
        const isRecipient = !!(isDirectRecipient || isGroupRecipient || isTeamRecipient || isHelperRecipient);

        let displayType = 'Aufgabe';
        if (t.type === 'AGENDA') displayType = 'Agenda';
        else if (t.type === 'INFO') displayType = 'Info';
        else if (t.type === 'BESCHLUSS') displayType = 'Beschluss';

        const fullText = formatReminderText(displayType, t);
        const { effectiveId, senderName } = resolveSender(t.reminderSenderUserId || '', t.assigneeUserIds);

        const itemObj: PendingReminderItem = {
          id: t.id,
          type: displayType,
          title: t.title,
          date: t.dueDate,
          text: fullText,
          targetsNames,
          isDirect,
          phone,
          rawItem: t,
          diffDays,
          senderUserId: effectiveId,
          senderName,
          isRecipient,
          model: 'task',
          sentAt: t.reminderSentAt,
          sentBy: t.reminderSentBy || 'Unbekannt (Altbestand)',
          action: t.reminderAction || 'SENT'
        };

        if (isHistory) {
          historyItems.push(itemObj);
        } else if (isPendingDue) {
          pendingItems.push(itemObj);
        }
      });
    }

    // 3. SITZUNGEN & EVENTS (Strikte Mitternachtsregel)
    if (events) {
      events.forEach(ev => {
        if (!ev.plannedStartTime) return;
        if (!ev.reminderSenderUserId && !ev.reminderSentAt) return;

        const isReadyForReminder = ev.status !== 'PLANUNG' || ev.isPublished === true;
        const leadDays = Number(ev.reminderLeadDays) || 0;
        const eventStart = new Date(ev.plannedStartTime);
        const eventDateStart = new Date(eventStart.getFullYear(), eventStart.getMonth(), eventStart.getDate()).getTime();
        const stichtag = eventDateStart - (leadDays * MS_PER_DAY);
        const diffDays = Math.ceil((eventDateStart - todayStart) / MS_PER_DAY);

        const isPendingDue = !ev.reminderSentAt && !!ev.reminderSenderUserId && isReadyForReminder && ev.status !== 'ABGESCHLOSSEN' && todayStart >= stichtag && todayStart <= eventDateStart;
        const isHistory = !!ev.reminderSentAt && ev.reminderSentAt >= historyCutoff;

        if (!isPendingDue && !isHistory) return;

        const targets: { name: string, phone?: string, isGroup: boolean }[] = [];
        
        ev.participantGroupIds?.forEach(id => { const g = groups.find(x => x.id === id); if (g) targets.push({ name: g.name, isGroup: true }); });
        ev.participantTeamIds?.forEach(id => { const t = teams.find(x => x.id === id); if (t) targets.push({ name: t.name, isGroup: true }); });
        ev.participantUserIds?.forEach(id => { const u = users.find(x => x.id === id); if (u) targets.push({ name: u.name, phone: u.telefon, isGroup: false }); });
        ev.participantHelperIds?.forEach(id => { const h = helpers.find(x => x.id === id); if (h) targets.push({ name: h.alias || h.name, phone: h.telefon, isGroup: false }); });

        const isDirectRecipient = ev.participantUserIds?.includes(user.id);
        const isGroupRecipient = ev.participantGroupIds?.some(id => userGroupIds.includes(id));
        const isTeamRecipient = ev.participantTeamIds?.some(id => myTeamIds.includes(id));
        const isHelperRecipient = myHelperId && ev.participantHelperIds?.includes(myHelperId);

        const targetsNames = targets.map(x => x.name).join(', ') || 'Keine Teilnehmer';
        const isDirect = targets.length === 1 && !targets[0].isGroup && !!targets[0].phone;
        const phone = isDirect ? (targets[0].phone || '') : '';
        const isRecipient = !!(isDirectRecipient || isGroupRecipient || isTeamRecipient || isHelperRecipient);

        const fullText = formatReminderText('Sitzung', ev, ev.reminderCustomText);
        const { effectiveId, senderName } = resolveSender(ev.reminderSenderUserId || '', ev.participantUserIds);

        const itemObj: PendingReminderItem = {
          id: ev.id,
          type: 'Sitzung',
          title: ev.title,
          date: ev.plannedStartTime,
          text: fullText,
          targetsNames,
          isDirect,
          phone,
          rawItem: ev,
          diffDays,
          senderUserId: effectiveId,
          senderName,
          isRecipient,
          model: 'event',
          sentAt: ev.reminderSentAt,
          sentBy: ev.reminderSentBy || 'Unbekannt (Altbestand)',
          action: ev.reminderAction || 'SENT'
        };

        if (isHistory) {
          historyItems.push(itemObj);
        } else if (isPendingDue) {
          pendingItems.push(itemObj);
        }
      });
    }

    // 4. KALENDER-ABOS / ICS (Strikte Mitternachtsregel)
    if (calendarSubscriptions) {
      calendarSubscriptions.forEach(sub => {
        if (sub.isActive && sub.cachedEvents) {
          const leadDays = Number(sub.reminderLeadDays) || 0;
          
          sub.cachedEvents.forEach((cachedEv, index) => {
            if (!sub.reminderSenderUserId && !cachedEv.reminderSentAt) return;

            const eventStart = new Date(cachedEv.startTime);
            const eventDateStart = new Date(eventStart.getFullYear(), eventStart.getMonth(), eventStart.getDate()).getTime();
            const stichtag = eventDateStart - (leadDays * MS_PER_DAY);
            const diffDays = Math.ceil((eventDateStart - todayStart) / MS_PER_DAY);

            const isPendingDue = !cachedEv.reminderSentAt && !!sub.reminderSenderUserId && todayStart >= stichtag && todayStart <= eventDateStart;
            const isHistory = !!cachedEv.reminderSentAt && cachedEv.reminderSentAt >= historyCutoff;

            if (!isPendingDue && !isHistory) return;

            const targets: { name: string, phone?: string, isGroup: boolean }[] = [];
            
            sub.reminderRecipientGroupIds?.forEach(id => { const g = groups.find(x => x.id === id); if (g) targets.push({ name: g.name, isGroup: true }); });
            sub.reminderRecipientTeamIds?.forEach(id => { const t = teams.find(x => x.id === id); if (t) targets.push({ name: t.name, isGroup: true }); });
            sub.reminderRecipientUserIds?.forEach(id => { const u = users.find(x => x.id === id); if (u) targets.push({ name: u.name, phone: u.telefon, isGroup: false }); });
            sub.reminderRecipientHelperIds?.forEach(id => { const h = helpers.find(x => x.id === id); if (h) targets.push({ name: h.alias || h.name, phone: h.telefon, isGroup: false }); });

            const isDirectRecipient = sub.reminderRecipientUserIds?.includes(user.id);
            const isGroupRecipient = sub.reminderRecipientGroupIds?.some(id => userGroupIds.includes(id));
            const isTeamRecipient = sub.reminderRecipientTeamIds?.some(id => myTeamIds.includes(id));
            const isHelperRecipient = myHelperId && sub.reminderRecipientHelperIds?.includes(myHelperId);

            const targetsNames = targets.map(x => x.name).join(', ') || 'Manuelle Auswahl';
            const isDirect = targets.length === 1 && !targets[0].isGroup && !!targets[0].phone;
            const phone = isDirect ? (targets[0].phone || '') : '';
            const isRecipient = !!(isDirectRecipient || isGroupRecipient || isTeamRecipient || isHelperRecipient);

            // --- LINEUP BERECHNUNG (Base & Override Kader an Text hängen) ---
            const teamId = sub.reminderRecipientTeamIds?.[0];
            const teamContext = teamId ? teams.find(t => t.id === teamId) : null;
            
            let lineupText = '';
            if (teamContext) {
              const safeEventId = sanitizeId(cachedEv.uid);
              const storeLineup = (matchLineups || []).find(m => m.id === safeEventId);
              const activePlayerIds = storeLineup ? storeLineup.lineupHelperIds : (teamContext.defaultLineupHelperIds || []);
              const activePlayers = helpers
                .filter(h => activePlayerIds.includes(h.id))
                .sort((a, b) => (a.name || '').localeCompare(b.name || ''));

              if (activePlayers.length > 0) {
                lineupText = `\n\n👟 *Kader (${activePlayers.length}):*\n${activePlayers.map(p => p.alias || p.name.split(' ')[0]).join(', ')}\n\n(Bitte sagt rechtzeitig ab, falls sich etwas ändert!)`;
              } else {
                lineupText = `\n\n👟 *Kader (0):*\nKeine Spieler eingeteilt.\n\n(Bitte sagt rechtzeitig ab, falls sich etwas ändert!)`;
              }
            }

            const baseText = formatReminderText('Abo', cachedEv, sub.reminderCustomText);
            const fullText = baseText + lineupText;
            // ----------------------------------------------------------------

            const { effectiveId, senderName } = resolveSender(sub.reminderSenderUserId || '', sub.reminderRecipientUserIds);

            const itemObj: PendingReminderItem = {
              id: `sub-${sub.id}-ev-${cachedEv.uid}-${index}`, 
              type: 'Abo',
              title: `${sub.name}: ${cachedEv.title}`, 
              date: cachedEv.startTime,
              text: fullText,
              targetsNames, 
              isDirect,
              phone,
              rawItem: { ...cachedEv, subId: sub.id }, 
              diffDays,
              senderUserId: effectiveId,
              senderName,
              isRecipient,
              model: 'subscription',
              sentAt: cachedEv.reminderSentAt,
              sentBy: cachedEv.reminderSentBy || 'Unbekannt (Altbestand)',
              action: cachedEv.reminderAction || 'SENT'
            };

            if (isHistory) {
              historyItems.push(itemObj);
            } else if (isPendingDue) {
              pendingItems.push(itemObj);
            }
          });
        }
      });
    }

    return {
      allPendingReminders: pendingItems.sort((a, b) => a.date - b.date),
      allHistoryReminders: historyItems.sort((a, b) => (b.sentAt || 0) - (a.sentAt || 0))
    };
  }, [user, calendarEvents, allAgendaItems, events, calendarSubscriptions, groups, helpers, users, teams, matchLineups, historyLookbackDays]);

  const myReminders = useMemo(() => {
    return allPendingReminders.filter(r => r.senderUserId === user?.id || r.isRecipient);
  }, [allPendingReminders, user?.id]);

  const myHistoryReminders = useMemo(() => {
    return allHistoryReminders.filter(r => r.senderUserId === user?.id || r.isRecipient);
  }, [allHistoryReminders, user?.id]);

  const displayedReminders = showAll && canViewAll ? allPendingReminders : myReminders;
  const displayedHistoryReminders = showAll && canViewAll ? allHistoryReminders : myHistoryReminders;

  const openWhatsApp = (isDirect: boolean, phoneStr: string, text: string) => {
    let url = '';
    if (isDirect && phoneStr) {
      let phone = String(phoneStr).trim().replace(/[^0-9+]/g, '');
      if (phone.startsWith('00')) phone = '+' + phone.substring(2);
      else if (phone.startsWith('0') && !phone.startsWith('00')) phone = '+49' + phone.substring(1);
      url = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
    } else {
      url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    }
    window.open(url, '_blank');
  };

  const handleSendReminder = async (rem: PendingReminderItem) => {
    if (rem.senderUserId !== user?.id && !canViewAll) return; 
    openWhatsApp(rem.isDirect, rem.phone, rem.text);
    const nowTs = Date.now();
    const actorName = user?.name || 'Unbekannt';

    try {
      if (rem.model === 'calendarEvent') {
        await updateCalendarEvent({ ...rem.rawItem, reminderSentAt: nowTs, reminderSentBy: actorName, reminderAction: 'SENT' });
      } else if (rem.model === 'task') {
        await saveAgendaItem({ ...rem.rawItem, reminderSentAt: nowTs, reminderSentBy: actorName, reminderAction: 'SENT' });
      } else if (rem.model === 'event') {
        await updateEvent({ ...rem.rawItem, reminderSentAt: nowTs, reminderSentBy: actorName, reminderAction: 'SENT' });
      } else if (rem.model === 'subscription') {
        const sub = calendarSubscriptions.find(s => s.id === rem.rawItem.subId);
        if (sub && sub.cachedEvents) {
          const updatedEvents = sub.cachedEvents.map(e => 
            e.uid === rem.rawItem.uid && e.startTime === rem.rawItem.startTime 
              ? { ...e, reminderSentAt: nowTs, reminderSentBy: actorName, reminderAction: 'SENT' as const } 
              : e
          );
          await updateCalendarSubscription({ ...sub, cachedEvents: updatedEvents });
        }
      }
    } catch (err) {
      console.error("Fehler beim Speichern:", err);
    }
  };

  const handleSnoozeReminder = async (rem: PendingReminderItem) => {
    if (rem.senderUserId !== user?.id && !canViewAll) return; 
    if (rem.model === 'subscription') {
      alert('Die "Erneut erinnern"-Funktion ist für Termine aus Datei-Abos (ICS) derzeit nicht verfügbar.');
      return;
    }

    openWhatsApp(rem.isDirect, rem.phone, rem.text);
    const defaultX = Math.max(1, Math.floor(Math.max(0, rem.diffDays) / 2));
    const xDays = snoozeDays[rem.id] !== undefined ? snoozeDays[rem.id] : defaultX;
    const newLeadDays = Math.max(0, rem.diffDays - xDays);

    try {
      if (rem.model === 'calendarEvent') {
        await updateCalendarEvent({ ...rem.rawItem, reminderLeadDays: newLeadDays, reminderSentAt: null as any, reminderSentBy: null as any, reminderAction: null as any });
      } else if (rem.model === 'task') {
        await saveAgendaItem({ ...rem.rawItem, reminderLeadDays: newLeadDays, reminderSentAt: null as any, reminderSentBy: null as any, reminderAction: null as any });
      } else if (rem.model === 'event') {
        await updateEvent({ ...rem.rawItem, reminderLeadDays: newLeadDays, reminderSentAt: null as any, reminderSentBy: null as any, reminderAction: null as any });
      }
    } catch (err) {
      console.error("Fehler beim Snoozen:", err);
    }
  };

  const handleDismissReminder = async (rem: PendingReminderItem) => {
    if (rem.senderUserId !== user?.id && !canViewAll) return; 
    if (!window.confirm('Möchtest du diese Erinnerung verwerfen? Sie wird im Verlauf als "Verworfen" protokolliert.')) return;
    const nowTs = Date.now();
    const actorName = user?.name || 'Unbekannt';

    try {
      if (rem.model === 'calendarEvent') {
        await updateCalendarEvent({ ...rem.rawItem, reminderSentAt: nowTs, reminderSentBy: actorName, reminderAction: 'DISMISSED' });
      } else if (rem.model === 'task') {
        await saveAgendaItem({ ...rem.rawItem, reminderSentAt: nowTs, reminderSentBy: actorName, reminderAction: 'DISMISSED' });
      } else if (rem.model === 'event') {
        await updateEvent({ ...rem.rawItem, reminderSentAt: nowTs, reminderSentBy: actorName, reminderAction: 'DISMISSED' });
      } else if (rem.model === 'subscription') {
        const sub = calendarSubscriptions.find(s => s.id === rem.rawItem.subId);
        if (sub && sub.cachedEvents) {
          const updatedEvents = sub.cachedEvents.map(e => 
            e.uid === rem.rawItem.uid && e.startTime === rem.rawItem.startTime 
              ? { ...e, reminderSentAt: nowTs, reminderSentBy: actorName, reminderAction: 'DISMISSED' as const } 
              : e
          );
          await updateCalendarSubscription({ ...sub, cachedEvents: updatedEvents });
        }
      }
    } catch (err) {
      console.error("Fehler beim Verwerfen:", err);
    }
  };

  const handleRestoreReminder = async (rem: PendingReminderItem) => {
    if (rem.senderUserId !== user?.id && !canViewAll) return;
    try {
      if (rem.model === 'calendarEvent') {
        await updateCalendarEvent({ ...rem.rawItem, reminderSentAt: null as any, reminderSentBy: null as any, reminderAction: null as any });
      } else if (rem.model === 'task') {
        await saveAgendaItem({ ...rem.rawItem, reminderSentAt: null as any, reminderSentBy: null as any, reminderAction: null as any });
      } else if (rem.model === 'event') {
        await updateEvent({ ...rem.rawItem, reminderSentAt: null as any, reminderSentBy: null as any, reminderAction: null as any });
      } else if (rem.model === 'subscription') {
        const sub = calendarSubscriptions.find(s => s.id === rem.rawItem.subId);
        if (sub && sub.cachedEvents) {
          const updatedEvents = sub.cachedEvents.map(e => {
            if (e.uid === rem.rawItem.uid && e.startTime === rem.rawItem.startTime) {
              const { reminderSentAt, reminderSentBy, reminderAction, ...rest } = e;
              return rest;
            }
            return e;
          });
          await updateCalendarSubscription({ ...sub, cachedEvents: updatedEvents });
        }
      }
    } catch (err) {
      console.error("Fehler beim Wiederherstellen:", err);
    }
  };

  return {
    user,
    calendarSubscriptions,
    saveAgendaItem,
    fetchTasks,
    isDataLoading,
    canViewAll,
    showAll,
    setShowAll,
    activeTab,
    setActiveTab,
    historyLookbackDays,
    setHistoryLookbackDays,
    snoozeDays,
    setSnoozeDays,
    allPendingReminders,
    myReminders,
    displayedReminders,
    allHistoryReminders,
    myHistoryReminders,
    displayedHistoryReminders,
    handleSendReminder,
    handleSnoozeReminder,
    handleDismissReminder,
    handleRestoreReminder
  };
};
// --- END OF FILE ---
