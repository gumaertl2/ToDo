// 2026-04-14 18:30 - FEATURE: WhatsApp Reminder für ICS Abos / Dateien integriert
// src/features/Reminders/RemindersView.tsx
import React, { useMemo, useState } from 'react';
import { useClubStore } from '../../store/useClubStore';
import { MessageCircle, Send, Trash2, CheckCircle2, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ItemFormModal } from '../Shared/ItemFormModal';
import { CalendarEventFormModal } from '../Events/CalendarEventFormModal';
import { CalendarBulkEventModal } from '../Events/CalendarBulkEventModal';
import { CalendarIcsDetailModal } from '../Events/CalendarIcsDetailModal'; // CHIRURGISCHER EINGRIFF: Abo Details
import type { Task, CalendarEvent } from '../../core/types/models';

const formatReminderText = (type: 'Event' | 'Task' | 'Sitzung' | 'Abo', item: any, customText?: string) => {
  const baseText = customText ? customText : 'Hallo, hier ist eine kurze Erinnerung für dich:';
  const details: string[] = [];

  // CHIRURGISCHER EINGRIFF: Formatierer für Abo-Termine erweitert
  if (type === 'Event' || type === 'Sitzung' || type === 'Abo') {
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
    calendarSubscriptions, // CHIRURGISCHER EINGRIFF: Abos aus dem Store importiert
    groups, 
    helpers,
    users, 
    user, 
    saveAgendaItem,
    updateCalendarEvent,
    updateEvent,
    updateCalendarSubscription, // CHIRURGISCHER EINGRIFF: Speicherfunktion für Abos
    isEventsLoading,
    isUsersLoading,
    fetchTasks
  } = useClubStore();

  const isDataLoading = isEventsLoading || isUsersLoading;

  const [snoozeDays, setSnoozeDays] = useState<Record<string, number>>({});
  
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editingCalendarEvent, setEditingCalendarEvent] = useState<CalendarEvent | null>(null);
  const [editingSeriesId, setEditingSeriesId] = useState<string | null>(null);
  const [editingIcsEvent, setEditingIcsEvent] = useState<any | null>(null); // Für Abo-Detail

  const pendingReminders = useMemo(() => {
    if (!user) return [];
    
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const MS_PER_DAY = 1000 * 60 * 60 * 24;

    const items: any[] = [];

    // 1. Kalender-Einträge
    if (calendarEvents) {
      calendarEvents.forEach(ce => {
        if (ce.reminderSenderUserId === user.id && !ce.reminderSentAt && ce.reminderLeadDays !== undefined) {
          const eventStart = new Date(ce.startTime);
          const eventDateStart = new Date(eventStart.getFullYear(), eventStart.getMonth(), eventStart.getDate()).getTime();
          const stichtag = eventDateStart - (ce.reminderLeadDays * MS_PER_DAY);
          
          if (todayStart >= stichtag) {
            const diffDays = Math.ceil((eventDateStart - todayStart) / MS_PER_DAY);
            let targetsNames = 'Manuelle Gruppenwahl';
            let isDirect = false;
            let phone = '';

            if (ce.eventType === 'DIENST' && ce.title.includes(':')) {
              const parts = ce.title.split(':');
              const alias = parts[parts.length - 1].trim(); 
              
              if (alias) {
                const helper = helpers.find(h => 
                  (h.alias || '').toLowerCase() === alias.toLowerCase() || 
                  h.name.toLowerCase() === alias.toLowerCase()
                );

                if (helper && helper.telefon) {
                  targetsNames = helper.alias || helper.name;
                  isDirect = true;
                  phone = helper.telefon;
                } else {
                  targetsNames = `${alias} (Keine Nummer hinterlegt)`;
                }
              }
            }

            const fullText = formatReminderText('Event', ce, ce.reminderCustomText);

            items.push({
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
              model: 'calendarEvent'
            });
          }
        }
      });
    }

    // 2. Aufgaben
    if (tasks) {
      tasks.forEach(t => {
        if (t.reminderSenderUserId === user.id && !t.reminderSentAt && t.reminderLeadDays !== undefined && t.dueDate) {
          const taskDue = new Date(t.dueDate);
          const taskDateStart = new Date(taskDue.getFullYear(), taskDue.getMonth(), taskDue.getDate()).getTime();
          const stichtag = taskDateStart - (t.reminderLeadDays * MS_PER_DAY);
          
          if (todayStart >= stichtag) {
            const diffDays = Math.ceil((taskDateStart - todayStart) / MS_PER_DAY);
            const targets: { name: string, phone?: string, isGroup: boolean }[] = [];
            
            t.assigneeGroupIds?.forEach(gId => {
               const g = groups.find(x => x.id === gId);
               if (g) targets.push({ name: g.name, isGroup: true });
            });
            t.assigneeHelperIds?.forEach(hId => {
               const h = helpers.find(x => x.id === hId);
               if (h) targets.push({ name: h.alias || h.name, phone: h.telefon, isGroup: false });
            });

            const targetsNames = targets.map(x => x.name).join(', ') || 'Manuelle Auswahl';
            const isDirect = targets.length === 1 && !targets[0].isGroup && !!targets[0].phone;
            const phone = isDirect ? targets[0].phone : '';

            const fullText = formatReminderText('Task', t);

            items.push({
              id: t.id,
              type: 'Aufgabe',
              title: t.title,
              date: t.dueDate,
              text: fullText,
              targetsNames,
              isDirect,
              phone,
              rawItem: t,
              diffDays,
              model: 'task'
            });
          }
        }
      });
    }

    // 3. Sitzungen
    if (events) {
      events.forEach(ev => {
        if (ev.status !== 'ABGESCHLOSSEN' && ev.reminderSenderUserId === user.id && !ev.reminderSentAt && ev.reminderLeadDays !== undefined && ev.plannedStartTime) {
          const eventStart = new Date(ev.plannedStartTime);
          const eventDateStart = new Date(eventStart.getFullYear(), eventStart.getMonth(), eventStart.getDate()).getTime();
          const stichtag = eventDateStart - (ev.reminderLeadDays * MS_PER_DAY);
          
          if (todayStart >= stichtag) {
            const diffDays = Math.ceil((eventDateStart - todayStart) / MS_PER_DAY);
            const targets: { name: string, phone?: string, isGroup: boolean }[] = [];
            
            ev.participantGroupIds?.forEach(gId => {
               const g = groups.find(x => x.id === gId);
               if (g) targets.push({ name: g.name, isGroup: true });
            });
            ev.participantUserIds?.forEach(uId => {
               const u = users.find(x => x.id === uId);
               if (u) targets.push({ name: u.name, phone: u.telefon, isGroup: false });
            });

            const targetsNames = targets.map(x => x.name).join(', ') || 'Manuelle Auswahl';
            const isDirect = targets.length === 1 && !targets[0].isGroup && !!targets[0].phone;
            const phone = isDirect ? targets[0].phone : '';

            const fullText = formatReminderText('Sitzung', ev, ev.reminderCustomText);

            items.push({
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
              model: 'event' 
            });
          }
        }
      });
    }

    // CHIRURGISCHER EINGRIFF: 4. Kalender-Abos (ICS Dateien / Links)
    if (calendarSubscriptions) {
      calendarSubscriptions.forEach(sub => {
        // Prüfen, ob für dieses Abo überhaupt ein Sender konfiguriert wurde und dieser der aktuelle User ist
        if (sub.isActive && sub.reminderSenderUserId === user.id && sub.reminderLeadDays !== undefined && sub.cachedEvents) {
          
          sub.cachedEvents.forEach((cachedEv, index) => {
            // Nur Events verarbeiten, die noch nicht gesendet wurden
            if (!cachedEv.reminderSentAt) {
              const eventStart = new Date(cachedEv.startTime);
              const eventDateStart = new Date(eventStart.getFullYear(), eventStart.getMonth(), eventStart.getDate()).getTime();
              const stichtag = eventDateStart - (sub.reminderLeadDays! * MS_PER_DAY);
              
              if (todayStart >= stichtag) {
                const diffDays = Math.ceil((eventDateStart - todayStart) / MS_PER_DAY);
                const fullText = formatReminderText('Abo', cachedEv, sub.reminderCustomText);

                items.push({
                  id: `sub-${sub.id}-ev-${cachedEv.uid}-${index}`, // Eindeutige ID
                  type: 'Abo',
                  title: `${sub.name}: ${cachedEv.title}`, // Zeigt z.B. "Müllkalender: Papiertonne"
                  date: cachedEv.startTime,
                  text: fullText,
                  targetsNames: 'Manuelle Auswahl', // Abos haben keine direkten Empfänger
                  isDirect: false,
                  phone: '',
                  rawItem: { ...cachedEv, subId: sub.id }, // Abo-ID mitgeben zum Speichern
                  diffDays,
                  model: 'subscription' 
                });
              }
            }
          });
        }
      });
    }

    return items.sort((a, b) => a.date - b.date);
  }, [user, calendarEvents, tasks, events, calendarSubscriptions, groups, helpers, users]);

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
    openWhatsApp(rem.isDirect, rem.phone, rem.text);
    try {
      if (rem.model === 'calendarEvent') {
        await updateCalendarEvent({ ...rem.rawItem, reminderSentAt: Date.now() });
      } else if (rem.model === 'task') {
        await saveAgendaItem({ ...rem.rawItem, reminderSentAt: Date.now() });
      } else if (rem.model === 'event') {
        await updateEvent({ ...rem.rawItem, reminderSentAt: Date.now() });
      } else if (rem.model === 'subscription') {
        // CHIRURGISCHER EINGRIFF: Abo Speicherung
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
    if (rem.model === 'subscription') {
      alert('Die "Erneut erinnern"-Funktion ist für Termine aus Datei-Abos (ICS) derzeit nicht verfügbar. Bitte "Senden & Erledigt" oder "Verwerfen" wählen.');
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
    if (!window.confirm('Möchtest du diese Erinnerung verwerfen (ohne zu senden)?')) return;
    try {
      if (rem.model === 'calendarEvent') {
        await updateCalendarEvent({ ...rem.rawItem, reminderSentAt: Date.now() });
      } else if (rem.model === 'task') {
        await saveAgendaItem({ ...rem.rawItem, reminderSentAt: Date.now() });
      } else if (rem.model === 'event') {
         await updateEvent({ ...rem.rawItem, reminderSentAt: Date.now() });
      } else if (rem.model === 'subscription') {
        // CHIRURGISCHER EINGRIFF: Abo Verwerfen
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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <MessageCircle className="w-7 h-7 mr-3 text-green-600" /> WhatsApp Erinnerungen
          </h1>
          <p className="text-sm text-gray-500 mt-1">Verwalte deine anstehenden Benachrichtigungen für Aufgaben und Termine.</p>
        </div>
        {pendingReminders.length > 0 && !isDataLoading && (
          <span className="bg-green-100 text-green-800 text-sm font-bold px-3 py-1 rounded-full shadow-sm border border-green-200">
            {pendingReminders.length} anstehend
          </span>
        )}
      </div>

      {isDataLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center bg-white border border-gray-200 rounded-xl shadow-sm p-12 text-center">
          <div className="animate-pulse flex flex-col items-center">
            <div className="w-12 h-12 bg-gray-200 rounded-full mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-32"></div>
          </div>
        </div>
      ) : pendingReminders.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center bg-white border border-gray-200 rounded-xl shadow-sm p-12 text-center">
          <CheckCircle2 className="w-16 h-16 text-green-400 mb-4" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">Alles erledigt!</h2>
          <p className="text-gray-500 max-w-md">Aktuell gibt es keine anstehenden WhatsApp-Erinnerungen für dich. Lehne dich zurück und genieße den Tag.</p>
        </div>
      ) : (
        <div className="space-y-4 overflow-y-auto pb-8">
          {pendingReminders.map(rem => {
            const defaultX = Math.max(1, Math.floor(rem.diffDays / 2));
            const currentX = snoozeDays[rem.id] !== undefined ? snoozeDays[rem.id] : defaultX;

            return (
              <div key={rem.id} className="bg-white border border-green-200 rounded-xl shadow-sm overflow-hidden flex flex-col md:flex-row md:items-stretch transition-all hover:border-green-300">
                <div 
                  onClick={() => {
                    if (rem.type === 'Sitzung') navigate(`/events/${rem.id}`);
                    else if (rem.type === 'Aufgabe') setEditingTask(rem.rawItem);
                    else if (rem.type === 'Abo') {
                       // Ein fiktives AdaptedEvent Objekt für das Detail-Modal bauen
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
                  className="p-5 flex-1 border-b md:border-b-0 md:border-r border-gray-100 cursor-pointer hover:bg-green-50/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${rem.type === 'Sitzung' ? 'bg-purple-100 text-purple-700' : rem.type === 'Abo' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-700'}`}>
                        {rem.type}
                      </span>
                      <span className="text-base font-bold text-gray-900 group-hover:text-green-700 transition-colors">{rem.title}</span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-xs font-bold text-gray-600 bg-gray-100 px-2 py-1 rounded border border-gray-200">
                        Fällig: {new Date(rem.date).toLocaleDateString('de-DE')}
                      </span>
                      <span className={`text-xs font-bold mt-1.5 ${rem.diffDays === 0 ? 'text-orange-600' : rem.diffDays < 0 ? 'text-red-600' : 'text-blue-600'}`}>
                        {rem.diffDays === 0 ? 'Heute fällig' : rem.diffDays > 0 ? `Noch ${rem.diffDays} Tage` : `Seit ${Math.abs(rem.diffDays)} Tagen überfällig`}
                      </span>
                    </div>
                  </div>
                  
                  <div className="mb-3 flex items-center">
                    <span className="text-sm text-gray-500 mr-2">Empfänger:</span>
                    <span className={`text-sm font-bold ${rem.isDirect ? 'text-green-700' : 'text-blue-700'}`}>
                      {rem.targetsNames}
                    </span>
                  </div>

                  <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)]">
                    <p className="text-sm text-gray-700 font-mono whitespace-pre-wrap">
                      {rem.text}
                    </p>
                  </div>
                </div>
                
                <div className="bg-gray-50 p-4 md:w-56 flex flex-col justify-center gap-3 shrink-0">
                  <button
                    onClick={() => handleSendReminder(rem)}
                    className="flex items-center justify-center w-full px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold text-sm transition-colors shadow-sm"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Senden & Erledigt
                  </button>
                  
                  <div className={`flex flex-col gap-2 border-t border-gray-200 pt-3 ${rem.model === 'subscription' ? 'opacity-30 pointer-events-none' : ''}`}>
                    <div className="flex items-center justify-between text-xs text-gray-600 font-medium px-1">
                      <span>Erneut erinnern in:</span>
                      <div className="flex items-center">
                        <input 
                          type="number" 
                          min="1" 
                          className="w-12 p-1 border border-gray-300 rounded text-center text-xs font-bold focus:ring-blue-500 disabled:bg-gray-100"
                          value={currentX}
                          onChange={(e) => setSnoozeDays(prev => ({...prev, [rem.id]: Number(e.target.value)}))}
                          disabled={rem.model === 'subscription'}
                        />
                        <span className="ml-1.5">Tagen</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleSnoozeReminder(rem)}
                      disabled={rem.model === 'subscription'}
                      className="flex items-center justify-center w-full px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg font-bold text-xs transition-colors shadow-sm disabled:cursor-not-allowed"
                    >
                      <Clock className="w-3.5 h-3.5 mr-1.5" />
                      Senden & Erinnern
                    </button>
                  </div>

                  <div className="border-t border-gray-200 pt-3">
                    <button
                      onClick={() => handleDismissReminder(rem)}
                      className="flex items-center justify-center w-full px-4 py-2 text-red-600 hover:bg-red-50 border border-transparent hover:border-red-100 rounded-lg font-bold text-xs transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                      Nur Verwerfen
                    </button>
                  </div>
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
// --- END OF FILE 485 Zeilen ---