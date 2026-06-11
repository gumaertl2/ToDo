// [2026-06-11] - UX-FIX: Poka-Yoke (Narrensicherung) für Browser-Benachrichtigungen integriert. Wenn der Browser die Anfrage stumm blockiert (Notification.permission === 'denied'), wirft die App nun explizit einen Alert mit der Lösungsanweisung (Klick auf das Schloss-Symbol), anstatt ohne Reaktion zu verbleiben.
// [2026-05-23] - ARCHITEKTUR-FIX: Projekt-Schutzschild & Unterpunkt-Schutzschild in Reminder-Schleife eingebaut. Verhindert Phantom-Erinnerungen für erledigte Oberpunkte und abgeschlossene/archivierte Projekte.
// [2026-05-17] - BUGFIX: Erinnerungs-Zentrale vollständig auf Omni-Channel harmonisiert (inklusive Teams). SSOT Architektur (dueDate) beibehalten.
// [2026-05-16] - ARCHITEKTUR-FIX: Rückkehr zur SSOT-Logik. Keine Spaghetti-Fallbacks für Daten. dueDate ist das Gesetz!
// [2026-05-16] - BUGFIX: 'teams' zum useClubStore Destructuring hinzugefügt. Importe vervollständigt.
// src/features/Reminders/RemindersView.tsx
import React, { useMemo, useState, useEffect } from 'react';
import { useClubStore } from '../../store/useClubStore';
import { MessageCircle, Send, Trash2, CheckCircle2, Clock, Info, Bell, BellOff, Check, Users, FileText, Calendar as CalendarIcon, Smartphone, AlertTriangle, AlertCircle, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ItemFormModal } from '../Shared/ItemFormModal';
import { CalendarEventFormModal } from '../Events/CalendarEventFormModal';
import { CalendarBulkEventModal } from '../Events/CalendarBulkEventModal';
import { CalendarIcsDetailModal } from '../Events/CalendarIcsDetailModal'; 
import type { Task, CalendarEvent } from '../../core/types/models';

const formatReminderText = (type: string, item: any, customText?: string) => {
  const baseText = customText ? customText : 'Hallo, hier ist eine kurze Erinnerung für dich:';
  const details: string[] = [];

  if (type === 'Event' || type === 'Sitzung' || type === 'Abo' || type === 'Dienst' || type === 'Termin') {
    const start = new Date(item.startTime || item.plannedStartTime);
    const dateStr = start.toLocaleDateString('de-DE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    
    let timeStr = 'Ganztägig';
    if (!item.isAllDay) {
      timeStr = start.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) + ' Uhr';
      if (item.endTime || item.plannedEndTime) {
        const end = new Date(item.endTime || item.plannedEndTime);
        timeStr += ` - ${end.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr`;
      }
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

export const RemindersView: React.FC = () => {
  const navigate = useNavigate();
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

  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission | 'unknown'>('unknown');

  useEffect(() => {
    if ('Notification' in window) {
      setPermissionStatus(Notification.permission);
    }
  }, []);

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      alert('Dein Browser/Gerät unterstützt diese Funktion leider nicht.');
      return;
    }

    // CHIRURGISCHER EINGRIFF: Poka-Yoke (Narrensicherung) für hartnäckige Browser-Blockaden.
    // Falls der Browser bereits auf 'denied' steht, wird der native Dialog gar nicht erst
    // angezeigt. Wir springen sofort ein und liefern dem Nutzer die Problemlösung.
    if (Notification.permission === 'denied') {
      alert('Dein Browser blockiert Benachrichtigungen für diese Seite.\n\nBitte klicke auf das Schloss-Symbol (oder die Einstellungen) oben links neben der Internetadresse (URL), um Benachrichtigungen manuell zu erlauben.');
      setPermissionStatus('denied');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setPermissionStatus(permission);
      
      // Falls der Nutzer im nativen Dialog gerade auf "Blockieren" geklickt hat (oder 
      // der Inkognito-Modus es stumm weggedrückt hat), greift das Poka-Yoke sofort:
      if (permission === 'denied') {
         alert('Du hast die Benachrichtigungen soeben blockiert (oder dein Browser tut dies automatisch).\n\nBitte klicke auf das Schloss-Symbol oben in der Adresszeile, um sie wieder zu erlauben.');
      }
    } catch (error) {
      console.error('Fehler bei der Berechtigungsanfrage:', error);
    }
  };

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
  const [snoozeDays, setSnoozeDays] = useState<Record<string, number>>({});
  
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editingCalendarEvent, setEditingCalendarEvent] = useState<CalendarEvent | null>(null);
  const [editingSeriesId, setEditingSeriesId] = useState<string | null>(null);
  const [editingIcsEvent, setEditingIcsEvent] = useState<any | null>(null); 

  const allPendingReminders = useMemo(() => {
    if (!user) return [];
    
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const MS_PER_DAY = 1000 * 60 * 60 * 24;
    
    // CHIRURGISCHER EINGRIFF: Lückenlose Erfassung der Nutzer-Zugehörigkeiten inkl. Teams
    const userGroupIds = user.groupIds || [];
    const myHelper = helpers.find(h => h.email?.toLowerCase() === user.email?.toLowerCase());
    const myHelperId = myHelper?.id;
    const myTeamIds = myHelper?.teamIds || [];

    const items: any[] = [];

    // --------------------------------------------------------------------------------
    // 1. Kalender-Einträge (Termine & Dienste)
    // --------------------------------------------------------------------------------
    if (calendarEvents) {
      calendarEvents.forEach(ce => {
        if (ce.reminderSenderUserId && !ce.reminderSentAt) {
          const leadDays = Number(ce.reminderLeadDays) || 0;
          const eventStart = new Date(ce.startTime);
          const eventDateStart = new Date(eventStart.getFullYear(), eventStart.getMonth(), eventStart.getDate()).getTime();
          const stichtag = eventDateStart - (leadDays * MS_PER_DAY);
          
          if (todayStart >= stichtag) {
            const diffDays = Math.ceil((eventDateStart - todayStart) / MS_PER_DAY);
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
            const senderName = users.find(u => u.id === ce.reminderSenderUserId)?.name || 'Unbekannt';

            items.push({ id: ce.id, type: ce.eventType === 'DIENST' ? 'Dienst' : 'Termin', title: ce.title, date: ce.startTime, text: fullText, targetsNames, isDirect, phone, rawItem: ce, diffDays, senderUserId: ce.reminderSenderUserId, senderName, isRecipient, model: 'calendarEvent' });
          }
        }
      });
    }

    // --------------------------------------------------------------------------------
    // 2. Aufgaben & Agenda-Punkte
    // --------------------------------------------------------------------------------
    if (allAgendaItems) {
      allAgendaItems.forEach(t => {
        // SSOT Architektur: Wir vertrauen blind auf t.dueDate. Wenn es fehlt, ist es keine fällige Aufgabe.
        if (t.isTemplate || t.reminderSentAt || !t.reminderSenderUserId || !t.dueDate) return;

        // CHIRURGISCHER EINGRIFF: Projekt-Schutzschild
        if (t.eventId) {
          const parentEvent = events.find(e => e.id === t.eventId);
          if (!parentEvent) return; // Projekt gelöscht -> ignorieren
          if (parentEvent.status === 'PLANUNG' && !parentEvent.isPublished) return; // Entwurf -> ignorieren
          if (parentEvent.status === 'ABGESCHLOSSEN' || parentEvent.isArchived) return; // Historisch -> ignorieren
        }

        // CHIRURGISCHER EINGRIFF: Unterpunkt-Schutzschild
        if (t.isSubItem && t.parentItemId) {
          const parentTask = allAgendaItems.find(x => x.id === t.parentItemId);
          if (parentTask && parentTask.status === 'ERLEDIGT') return; // Oberpunkt erledigt -> ignorieren
        }

        const leadDays = Number(t.reminderLeadDays) || 0;
        const taskDue = new Date(t.dueDate);
        const taskDateStart = new Date(taskDue.getFullYear(), taskDue.getMonth(), taskDue.getDate()).getTime();
        const stichtag = taskDateStart - (leadDays * MS_PER_DAY);
        
        if (todayStart >= stichtag) {
          const diffDays = Math.ceil((taskDateStart - todayStart) / MS_PER_DAY);
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
          const senderName = users.find(u => u.id === t.reminderSenderUserId)?.name || 'Unbekannt';

          items.push({ id: t.id, type: displayType, title: t.title, date: t.dueDate, text: fullText, targetsNames, isDirect, phone, rawItem: t, diffDays, senderUserId: t.reminderSenderUserId, senderName, isRecipient, model: 'task' });
        }
      });
    }

    // --------------------------------------------------------------------------------
    // 3. Sitzungen (Events)
    // --------------------------------------------------------------------------------
    if (events) {
      events.forEach(ev => {
        const isReadyForReminder = ev.status !== 'PLANUNG' || ev.isPublished === true;

        if (isReadyForReminder && ev.status !== 'ABGESCHLOSSEN' && ev.reminderSenderUserId && !ev.reminderSentAt && ev.plannedStartTime) {
          const leadDays = Number(ev.reminderLeadDays) || 0;
          const eventStart = new Date(ev.plannedStartTime);
          const eventDateStart = new Date(eventStart.getFullYear(), eventStart.getMonth(), eventStart.getDate()).getTime();
          const stichtag = eventDateStart - (leadDays * MS_PER_DAY);
          
          if (todayStart >= stichtag) {
            const diffDays = Math.ceil((eventDateStart - todayStart) / MS_PER_DAY);
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
            const senderName = users.find(u => u.id === ev.reminderSenderUserId)?.name || 'Unbekannt';

            items.push({ id: ev.id, type: 'Sitzung', title: ev.title, date: ev.plannedStartTime, text: fullText, targetsNames, isDirect, phone, rawItem: ev, diffDays, senderUserId: ev.reminderSenderUserId, senderName, isRecipient, model: 'event' });
          }
        }
      });
    }

    // --------------------------------------------------------------------------------
    // 4. Kalender-Abos (ICS Dateien / Links)
    // --------------------------------------------------------------------------------
    if (calendarSubscriptions) {
      calendarSubscriptions.forEach(sub => {
        if (sub.isActive && sub.reminderSenderUserId && sub.cachedEvents) {
          const leadDays = Number(sub.reminderLeadDays) || 0;
          
          sub.cachedEvents.forEach((cachedEv, index) => {
            if (!cachedEv.reminderSentAt) {
              const eventStart = new Date(cachedEv.startTime);
              const eventDateStart = new Date(eventStart.getFullYear(), eventStart.getMonth(), eventStart.getDate()).getTime();
              const stichtag = eventDateStart - (leadDays * MS_PER_DAY);
              
              if (todayStart >= stichtag) {
                const diffDays = Math.ceil((eventDateStart - todayStart) / MS_PER_DAY);
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

                const fullText = formatReminderText('Abo', cachedEv, sub.reminderCustomText);
                const senderName = users.find(u => u.id === sub.reminderSenderUserId)?.name || 'Unbekannt';

                items.push({
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
                  senderUserId: sub.reminderSenderUserId,
                  senderName,
                  isRecipient,
                  model: 'subscription' 
                });
              }
            }
          });
        }
      });
    }

    return items.sort((a, b) => a.date - b.date);
  }, [user, calendarEvents, allAgendaItems, events, calendarSubscriptions, groups, helpers, users, teams]);

  const myReminders = useMemo(() => {
    return allPendingReminders.filter(r => r.senderUserId === user?.id || r.isRecipient);
  }, [allPendingReminders, user?.id]);

  const displayedReminders = showAll && canViewAll ? allPendingReminders : myReminders;

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

  const handleSendReminder = async (rem: any) => {
    if (rem.senderUserId !== user?.id && !canViewAll) return; 
    openWhatsApp(rem.isDirect, rem.phone, rem.text);
    try {
      if (rem.model === 'calendarEvent') {
        await updateCalendarEvent({ ...rem.rawItem, reminderSentAt: Date.now() });
      } else if (rem.model === 'task') {
        await saveAgendaItem({ ...rem.rawItem, reminderSentAt: Date.now() });
      } else if (rem.model === 'event') {
        await updateEvent({ ...rem.rawItem, reminderSentAt: Date.now() });
      } else if (rem.model === 'subscription') {
        const sub = calendarSubscriptions.find(s => s.id === rem.rawItem.subId);
        if (sub && sub.cachedEvents) {
          const updatedEvents = sub.cachedEvents.map(e => 
            e.uid === rem.rawItem.uid && e.startTime === rem.rawItem.startTime 
              ? { ...e, reminderSentAt: Date.now() } 
              : e
          );
          await updateCalendarSubscription({ ...sub, cachedEvents: updatedEvents });
        }
      }
    } catch (err) {
      console.error("Fehler beim Speichern:", err);
    }
  };

  const handleSnoozeReminder = async (rem: any) => {
    if (rem.senderUserId !== user?.id && !canViewAll) return; 
    if (rem.model === 'subscription') {
      alert('Die "Erneut erinnern"-Funktion ist für Termine aus Datei-Abos (ICS) derzeit nicht verfügbar.');
      return;
    }

    openWhatsApp(rem.isDirect, rem.phone, rem.text);
    const defaultX = Math.max(1, Math.floor(rem.diffDays / 2));
    const xDays = snoozeDays[rem.id] !== undefined ? snoozeDays[rem.id] : defaultX;
    const newLeadDays = Math.max(0, rem.diffDays - xDays);

    try {
      if (rem.model === 'calendarEvent') {
        await updateCalendarEvent({ ...rem.rawItem, reminderLeadDays: newLeadDays, reminderSentAt: null });
      } else if (rem.model === 'task') {
        await saveAgendaItem({ ...rem.rawItem, reminderLeadDays: newLeadDays, reminderSentAt: null });
      } else if (rem.model === 'event') {
        await updateEvent({ ...rem.rawItem, reminderLeadDays: newLeadDays, reminderSentAt: null });
      }
    } catch (err) {
      console.error("Fehler beim Snoozen:", err);
    }
  };

  const handleDismissReminder = async (rem: any) => {
    if (rem.senderUserId !== user?.id && !canViewAll) return; 
    if (!window.confirm('Möchtest du diese Erinnerung verwerfen?')) return;
    try {
      if (rem.model === 'calendarEvent') {
        await updateCalendarEvent({ ...rem.rawItem, reminderSentAt: Date.now() });
      } else if (rem.model === 'task') {
        await saveAgendaItem({ ...rem.rawItem, reminderSentAt: Date.now() });
      } else if (rem.model === 'event') {
         await updateEvent({ ...rem.rawItem, reminderSentAt: Date.now() });
      } else if (rem.model === 'subscription') {
        const sub = calendarSubscriptions.find(s => s.id === rem.rawItem.subId);
        if (sub && sub.cachedEvents) {
          const updatedEvents = sub.cachedEvents.map(e => 
            e.uid === rem.rawItem.uid && e.startTime === rem.rawItem.startTime 
              ? { ...e, reminderSentAt: Date.now() } 
              : e
          );
          await updateCalendarSubscription({ ...sub, cachedEvents: updatedEvents });
        }
      }
    } catch (err) {
      console.error("Fehler beim Verwerfen:", err);
    }
  };

  return (
    <div className="h-full flex flex-col max-w-5xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <MessageCircle className="w-7 h-7 mr-3 text-green-600" /> WhatsApp Erinnerungen
          </h1>
          <p className="text-sm text-gray-500 mt-1">Verwalte deine anstehenden Benachrichtigungen für Aufgaben und Termine.</p>
        </div>
        
        <div className="flex items-center gap-3">
          {canViewAll && (
            <div className="flex items-center bg-gray-100 p-1 rounded-lg border border-gray-200 shadow-inner shrink-0">
              <button 
                onClick={() => setShowAll(false)} 
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all flex items-center ${!showAll ? 'bg-white text-blue-700 shadow-sm border border-gray-200' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Meine 
                <span className={`ml-1.5 px-1.5 py-0.5 rounded text-[10px] ${!showAll ? 'bg-blue-100 text-blue-800' : 'bg-gray-200 text-gray-600'}`}>{myReminders.length}</span>
              </button>
              <button 
                onClick={() => setShowAll(true)} 
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all flex items-center ${showAll ? 'bg-white text-blue-700 shadow-sm border border-gray-200' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Verein
                <span className={`ml-1.5 px-1.5 py-0.5 rounded text-[10px] ${showAll ? 'bg-blue-100 text-blue-800' : 'bg-gray-200 text-gray-600'}`}>{allPendingReminders.length}</span>
              </button>
            </div>
          )}

          {!canViewAll && myReminders.length > 0 && !isDataLoading && (
            <span className="bg-green-100 text-green-800 text-sm font-bold px-3 py-1 rounded-full shadow-sm border border-green-200 whitespace-nowrap">
              {myReminders.length} anstehend
            </span>
          )}
        </div>
      </div>

      {'Notification' in window && permissionStatus !== 'granted' && permissionStatus !== 'unknown' && (
        <div className={`mb-6 p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border shadow-sm ${
          permissionStatus === 'denied' 
            ? 'bg-orange-50 border-orange-200 text-orange-800' 
            : 'bg-blue-50 border-blue-200 text-blue-800'
        }`}>
          <div className="flex items-start sm:items-center gap-3">
            {permissionStatus === 'denied' ? <BellOff className="w-6 h-6 shrink-0 mt-0.5 sm:mt-0 text-orange-500" /> : <Bell className="w-6 h-6 shrink-0 mt-0.5 sm:mt-0 text-blue-500" />}
            <div>
              <h3 className="font-bold text-sm">
                {permissionStatus === 'denied' ? 'Roter Zähler deaktiviert' : 'Roter Zähler am App-Icon (Badge)'}
              </h3>
              <p className="text-xs mt-0.5 opacity-90">
                {permissionStatus === 'denied' 
                  ? 'Du hast Mitteilungen abgelehnt. Um die rote Zahl auf dem iPad/iPhone zu sehen, erlaube Mitteilungen für PapaToDo in den iOS-Einstellungen.' 
                  : 'Erlaube Mitteilungen, damit PapaToDo dir eine rote Zahl am App-Icon auf dem iPad/Handy anzeigen kann.'}
              </p>
            </div>
          </div>
          
          {/* CHIRURGISCHER EINGRIFF: Wir zeigen den Button immer, damit das Poka-Yoke greifen kann, wenn der User Hilfe braucht */}
          <button
            onClick={requestNotificationPermission}
            className={`shrink-0 px-4 py-2 text-white text-xs font-bold rounded-lg shadow-sm transition-colors w-full sm:w-auto ${permissionStatus === 'denied' ? 'bg-orange-500 hover:bg-orange-600' : 'bg-blue-600 hover:bg-blue-700'}`}
          >
            {permissionStatus === 'denied' ? 'Hilfe & Problemlösung' : 'Jetzt erlauben'}
          </button>
        </div>
      )}

      {isDataLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center bg-white border border-gray-200 rounded-xl shadow-sm p-12 text-center animate-pulse">
          <div className="w-12 h-12 bg-gray-200 rounded-full mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-32"></div>
        </div>
      ) : displayedReminders.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center bg-white border border-gray-200 rounded-xl shadow-sm p-12 text-center">
          <CheckCircle2 className="w-16 h-16 text-green-400 mb-4" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">Alles erledigt!</h2>
          <p className="text-gray-500 max-w-md">Aktuell gibt es keine anstehenden WhatsApp-Erinnerungen {showAll ? 'im Verein' : 'für dich'}.</p>
        </div>
      ) : (
        <div className="space-y-4 overflow-y-auto pb-8 custom-scrollbar pr-2">
          {displayedReminders.map(rem => {
            const hasEditRights = rem.senderUserId === user?.id || canViewAll; 
            
            const defaultX = Math.max(1, Math.floor(rem.diffDays / 2));
            const currentX = snoozeDays[rem.id] !== undefined ? snoozeDays[rem.id] : defaultX;

            return (
              <div key={rem.id} className={`bg-white border ${hasEditRights ? 'border-green-200' : 'border-blue-100'} rounded-xl shadow-sm overflow-hidden flex flex-col md:flex-row md:items-stretch transition-all hover:border-blue-300`}>
                <div 
                  onClick={() => {
                    if (!hasEditRights) return; 
                    if (rem.type === 'Sitzung') navigate(`/events/${rem.id}`);
                    else if (rem.model === 'task') setEditingTask(rem.rawItem);
                    else if (rem.type === 'Abo') {
                       const sub = calendarSubscriptions.find(s => s.id === rem.rawItem.subId);
                       setEditingIcsEvent({
                         id: rem.id, title: rem.rawItem.title, start: new Date(rem.rawItem.startTime), 
                         end: new Date(rem.rawItem.endTime), allDay: rem.rawItem.isAllDay, 
                         location: rem.rawItem.location, description: rem.rawItem.description,
                         color: sub?.color || '#10b981'
                       });
                    }
                    else {
                      if (rem.rawItem.seriesId) setEditingSeriesId(rem.rawItem.seriesId);
                      else setEditingCalendarEvent(rem.rawItem);
                    }
                  }}
                  className={`p-5 flex-1 border-b md:border-b-0 md:border-r border-gray-100 transition-colors ${hasEditRights ? 'cursor-pointer hover:bg-gray-50' : 'cursor-default'}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded flex items-center ${
                          rem.type === 'Sitzung' ? 'bg-purple-100 text-purple-700' : 
                          rem.type === 'Abo' ? 'bg-yellow-100 text-yellow-800' : 
                          (rem.type === 'Agenda' || rem.type === 'Info' || rem.type === 'Beschluss') ? 'bg-indigo-100 text-indigo-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {rem.model === 'task' ? <FileText className="w-3 h-3 mr-1" /> : <CalendarIcon className="w-3 h-3 mr-1" />}
                          {rem.type}
                        </span>
                        <span className="text-base font-bold text-gray-900">{rem.title}</span>
                      </div>
                      
                      <div className="flex items-center gap-2 mt-1">
                        <div className="text-[10px] font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">
                          Absender: {rem.senderName}
                        </div>
                        {rem.isRecipient && (
                          <div className="text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 flex items-center">
                            <Info className="w-2.5 h-2.5 mr-1" /> Du bist Empfänger
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end">
                      <span className="text-xs font-bold text-gray-600 bg-gray-100 px-2 py-1 rounded border border-gray-200">
                        Fällig: {new Date(rem.date).toLocaleDateString('de-DE')}
                      </span>
                      <span className={`text-xs font-bold mt-1.5 flex items-center ${rem.diffDays === 0 ? 'text-orange-600' : rem.diffDays < 0 ? 'text-red-600' : 'text-blue-600'}`}>
                        {rem.diffDays < 0 ? <AlertTriangle className="w-3.5 h-3.5 mr-1" /> : null}
                        {rem.diffDays === 0 ? 'Heute fällig' : rem.diffDays > 0 ? `Noch ${rem.diffDays} Tage` : `Überfällig`}
                      </span>
                    </div>
                  </div>
                  
                  <div className="mb-3 flex items-center">
                    <span className="text-sm text-gray-500 mr-2">Ziel:</span>
                    <span className={`text-sm font-bold flex items-center ${rem.isDirect ? 'text-green-700' : 'text-blue-700'}`}>
                      <Users className="w-4 h-4 mr-1.5 opacity-70" />
                      {rem.targetsNames}
                    </span>
                  </div>

                  <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-inner">
                    <p className="text-sm text-gray-700 font-mono whitespace-pre-wrap">
                      {rem.text}
                    </p>
                  </div>
                </div>
                
                <div className="bg-gray-50 p-4 md:w-56 flex flex-col justify-center gap-3 shrink-0">
                  {hasEditRights ? (
                    <>
                      <button
                        onClick={() => handleSendReminder(rem)}
                        className="flex items-center justify-center w-full px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold text-sm shadow-sm"
                      >
                        {rem.isDirect ? <Smartphone className="w-4 h-4 mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                        Senden & Erledigt
                      </button>
                      
                      <div className={`flex flex-col gap-2 border-t border-gray-200 pt-3 ${rem.model === 'subscription' ? 'opacity-30 pointer-events-none' : ''}`}>
                        <div className="flex items-center justify-between text-xs text-gray-600 font-medium px-1">
                          <span>Warten:</span>
                          <div className="flex items-center">
                            <input 
                              type="number" 
                              min="1" 
                              className="w-12 p-1 border border-gray-300 rounded text-center text-xs font-bold"
                              value={currentX}
                              onChange={(e) => setSnoozeDays(prev => ({...prev, [rem.id]: Number(e.target.value)}))}
                            />
                            <span className="ml-1.5 flex items-center"><RefreshCw className="w-3 h-3 mr-1" />Tage</span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleSnoozeReminder(rem)}
                          className="flex items-center justify-center w-full px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg font-bold text-xs shadow-sm"
                        >
                          <Clock className="w-3.5 h-3.5 mr-1.5" />
                          Erneut erinnern
                        </button>
                      </div>

                      <div className="border-t border-gray-200 pt-3">
                        <button
                          onClick={() => handleDismissReminder(rem)}
                          className="flex items-center justify-center w-full px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg font-bold text-xs"
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                          Verwerfen
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center p-2">
                      <div className="bg-blue-100 text-blue-700 p-2 rounded-full mb-2">
                        <Info className="w-5 h-5" />
                      </div>
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-tight flex items-center justify-center">
                        <AlertCircle className="w-3 h-3 mr-1" /> Nur Information
                      </p>
                      <p className="text-[9px] text-gray-400 mt-1 italic">Du erhältst diese Nachricht demnächst via WhatsApp.</p>
                      <div className="hidden">
                        <Check className="w-0 h-0" />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editingTask && (
        <ItemFormModal
          isOpen={true}
          existingItem={editingTask}
          onClose={() => setEditingTask(null)}
          onSave={async (data) => {
            await saveAgendaItem(data);
            if (fetchTasks) fetchTasks();
            setEditingTask(null);
          }}
        />
      )}
      {editingCalendarEvent && (
        <CalendarEventFormModal
          onClose={() => setEditingCalendarEvent(null)}
          existingEvent={editingCalendarEvent}
        />
      )}
      {editingSeriesId && (
        <CalendarBulkEventModal
          onClose={() => setEditingSeriesId(null)}
          existingSeriesId={editingSeriesId}
        />
      )}
      {editingIcsEvent && (
        <CalendarIcsDetailModal
          event={editingIcsEvent}
          onClose={() => setEditingIcsEvent(null)}
        />
      )}
    </div>
  );
};
// --- END OF FILE ---