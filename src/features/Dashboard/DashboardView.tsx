// 2026-04-13 22:30 - FIX: Wiederherstellung der detaillierten WhatsApp-Erinnerungen + Verwerfen
// src/features/Dashboard/DashboardView.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { useClubStore } from '../../store/useClubStore';
import { Calendar, CheckSquare, Clock, ArrowRight, MessageCircle, Send, Trash2 } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { ItemCard } from '../Shared/ItemCard';
import { ItemFormModal } from '../Shared/ItemFormModal';
import type { Task } from '../../core/types/models';

// CHIRURGISCHER EINGRIFF: Die gerettete Hilfsfunktion für vollständige Details (Titel, Termin, Zeit, Ort)
const formatReminderText = (type: 'Event' | 'Task', item: any, customText?: string) => {
  const baseText = customText ? customText : 'Hallo, hier ist eine kurze Erinnerung für dich:';
  const details: string[] = [];

  if (type === 'Event') {
    const start = new Date(item.startTime);
    const dateStr = start.toLocaleDateString('de-DE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    
    let timeStr = 'Ganztägig';
    if (!item.isAllDay) {
      timeStr = start.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) + ' Uhr';
      if (item.endTime) {
        const end = new Date(item.endTime);
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

export const DashboardView: React.FC = () => {
  const { 
    events, 
    tasks, 
    calendarEvents, 
    groups, 
    helpers, 
    user, 
    fetchEvents, 
    fetchTasks, 
    isEventsLoading, 
    saveAgendaItem,
    updateCalendarEvent 
  } = useClubStore();
  
  const navigate = useNavigate();
  
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Task | null>(null);

  useEffect(() => {
    fetchEvents();
    fetchTasks();
  }, [fetchEvents, fetchTasks]);

  const pendingReminders = useMemo(() => {
    if (!user) return [];
    
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const MS_PER_DAY = 1000 * 60 * 60 * 24;

    const items: any[] = [];

    if (calendarEvents) {
      calendarEvents.forEach(ce => {
        if (ce.reminderSenderUserId === user.id && !ce.reminderSentAt && ce.reminderLeadDays !== undefined) {
          const eventStart = new Date(ce.startTime);
          const eventDateStart = new Date(eventStart.getFullYear(), eventStart.getMonth(), eventStart.getDate()).getTime();
          const stichtag = eventDateStart - (ce.reminderLeadDays * MS_PER_DAY);
          
          if (todayStart >= stichtag) {
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
              model: 'calendarEvent'
            });
          }
        }
      });
    }

    if (tasks) {
      tasks.forEach(t => {
        if (t.reminderSenderUserId === user.id && !t.reminderSentAt && t.reminderLeadDays !== undefined && t.dueDate) {
          const taskDue = new Date(t.dueDate);
          const taskDateStart = new Date(taskDue.getFullYear(), taskDue.getMonth(), taskDue.getDate()).getTime();
          const stichtag = taskDateStart - (t.reminderLeadDays * MS_PER_DAY);
          
          if (todayStart >= stichtag) {
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
              model: 'task'
            });
          }
        }
      });
    }

    return items.sort((a, b) => a.date - b.date);
  }, [user, calendarEvents, tasks, groups, helpers]);

  const handleSendReminder = async (rem: any) => {
    let url = '';
    const text = rem.text;

    if (rem.isDirect && rem.phone) {
      let phone = String(rem.phone).trim().replace(/[^0-9+]/g, '');
      if (phone.startsWith('00')) {
        phone = '+' + phone.substring(2);
      } else if (phone.startsWith('0') && !phone.startsWith('00')) {
        phone = '+49' + phone.substring(1);
      }
      
      url = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
    } else {
      url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    }

    window.open(url, '_blank');

    try {
      if (rem.model === 'calendarEvent') {
        await updateCalendarEvent({ ...rem.rawItem, reminderSentAt: Date.now() });
      } else if (rem.model === 'task') {
        await saveAgendaItem({ ...rem.rawItem, reminderSentAt: Date.now() });
      }
    } catch (err) {
      console.error("Fehler beim Speichern des Zeitstempels:", err);
    }
  };

  const handleDismissReminder = async (rem: any) => {
    if (!window.confirm('Möchtest du diese Erinnerung verwerfen (ohne zu senden)?')) return;
    try {
      if (rem.model === 'calendarEvent') {
        await updateCalendarEvent({ ...rem.rawItem, reminderSentAt: Date.now() });
      } else if (rem.model === 'task') {
        await saveAgendaItem({ ...rem.rawItem, reminderSentAt: Date.now() });
      }
    } catch (err) {
      console.error("Fehler beim Verwerfen:", err);
    }
  };

  const upcomingEvents = useMemo(() => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    return events
      .filter((e) => e.status !== 'ABGESCHLOSSEN' && !e.isArchived)
      .filter((e) => e.startDate ? new Date(e.startDate).getTime() >= startOfToday.getTime() : true)
      .sort((a, b) => (a.startDate || 0) - (b.startDate || 0))
      .slice(0, 3);
  }, [events]);

  const openTasks = useMemo(() => {
    let filtered = tasks.filter((t) => t.status !== 'ERLEDIGT');
    
    filtered = filtered.filter((t) => {
      if (!t.eventId) return true; 
      const ev = events.find(e => e.id === t.eventId);
      if (!ev) return false; 
      
      if (ev.status === 'ABGESCHLOSSEN' || ev.isArchived) return false;
      
      if (ev.status === 'PLANUNG') {
        if (!ev.isPublished && !t.baseItemId) return false;
      }
      return true; 
    });
    
    if (user) {
      filtered = filtered.filter((t) => {
        const isUserDirectlyAssigned = t.assigneeUserIds && t.assigneeUserIds.includes(user.id);
        const isUserGroupAssigned = t.assigneeGroupIds && user.groupIds && t.assigneeGroupIds.some(groupId => user.groupIds.includes(groupId));
        return isUserDirectlyAssigned || isUserGroupAssigned;
      });
    }
    
    return filtered.sort((a, b) => (a.dueDate || 0) - (b.dueDate || 0));
  }, [tasks, events, user]);

  const handleEditTask = (task: Task) => {
    setEditingItem(task);
    setIsItemModalOpen(true);
  };

  return (
    <div className="h-full flex flex-col space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Willkommen zurück{user ? `, ${user.name}` : ''}!</h1>
          <p className="text-sm text-gray-500 mt-1">Hier ist der Überblick über deine Aufgaben und anstehenden Termine.</p>
        </div>
      </div>

      {pendingReminders.length > 0 && (
        <div className="bg-green-50 rounded-xl shadow-sm border border-green-200 overflow-hidden flex flex-col animate-fade-in">
          <div className="p-4 border-b border-green-200 bg-green-100 flex items-center justify-between">
            <h2 className="text-lg font-bold text-green-900 flex items-center">
              <MessageCircle className="w-5 h-5 mr-2 text-green-700" />
              Fällige WhatsApp Erinnerungen
            </h2>
            <span className="bg-green-600 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-sm">
              {pendingReminders.length} anstehend
            </span>
          </div>
          <div className="p-4">
            <div className="space-y-3">
              {pendingReminders.map(rem => (
                <div key={rem.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white border border-green-200 rounded-lg shadow-sm">
                  <div className="mb-3 sm:mb-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-green-700 bg-green-100 px-2 py-0.5 rounded">
                        {rem.type}
                      </span>
                      <span className="text-sm font-bold text-gray-900">{rem.title}</span>
                    </div>
                    <p className="text-xs text-gray-600 font-medium">
                      Fällig: {new Date(rem.date).toLocaleDateString('de-DE')} 
                      {rem.targetsNames ? ` • Empfänger: ${rem.targetsNames}` : ''}
                    </p>
                    <p className="text-xs text-gray-500 mt-1.5 italic bg-gray-50 p-2 rounded border border-gray-100 whitespace-pre-wrap">
                      "{rem.text}"
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2 mt-3 sm:mt-0">
                    <button
                      onClick={() => handleDismissReminder(rem)}
                      title="Erinnerung verwerfen"
                      className="flex items-center justify-center p-2.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleSendReminder(rem)}
                      className="flex items-center justify-center px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold text-sm transition-colors shadow-sm whitespace-nowrap"
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Senden & Erledigt
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-800 flex items-center">
              <Calendar className="w-5 h-5 mr-2 text-blue-600" />
              Nächste Termine
            </h2>
            <NavLink to="/events" className="text-sm text-blue-600 hover:underline flex items-center font-medium">
              Alle ansehen <ArrowRight className="w-4 h-4 ml-1" />
            </NavLink>
          </div>
          <div className="p-4 flex-1 overflow-y-auto">
            {isEventsLoading ? (
              <div className="animate-pulse text-gray-400 text-center py-4">Lade Termine...</div>
            ) : upcomingEvents.length === 0 ? (
              <div className="text-center text-gray-500 py-8">Keine anstehenden Termine in nächster Zeit.</div>
            ) : (
              <div className="space-y-4">
                {upcomingEvents.map((ev) => (
                  <div 
                    key={ev.id} 
                    onClick={() => navigate(`/events/${ev.id}`)}
                    className="flex items-start p-3 bg-blue-50/50 border border-blue-100 rounded-lg cursor-pointer hover:bg-blue-100 hover:shadow-md transition-all"
                  >
                    <div className="bg-blue-100 p-2 rounded-md text-blue-700 mr-3 mt-0.5">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{ev.title}</h3>
                      <p className="text-sm text-gray-600">{ev.startDate ? new Date(ev.startDate).toLocaleString() : 'Kein Datum'}</p>
                      {ev.location && <p className="text-xs text-gray-500 mt-1">📍 {ev.location}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-800 flex items-center">
              <CheckSquare className="w-5 h-5 mr-2 text-green-600" />
              Aktuelle Aufgaben
            </h2>
            <NavLink to="/todos" className="text-sm text-blue-600 hover:underline flex items-center font-medium">
              Meinem Board <ArrowRight className="w-4 h-4 ml-1" />
            </NavLink>
          </div>
          <div className="p-4 flex-1 overflow-y-auto bg-gray-50/50">
            {openTasks.length === 0 ? (
              <div className="text-center text-gray-500 py-8">Super! Keine offenen Aufgaben.</div>
            ) : (
              <div className="space-y-3">
                {openTasks.map((task) => (
                  <ItemCard key={task.id} item={task} onEdit={handleEditTask} className="!mb-0" />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {editingItem && (
        <ItemFormModal
          key={editingItem.id}
          isOpen={isItemModalOpen}
          existingItem={editingItem}
          isFixedType={true}
          onClose={() => setIsItemModalOpen(false)}
          onSave={async (data) => {
            const result = await saveAgendaItem(data);
            if (!result || (result && !result.success)) {
              throw new Error(result?.error?.message || "Fehler beim Speichern in Firebase.");
            }
            await fetchTasks();
            setIsItemModalOpen(false);
          }}
        />
      )}
    </div>
  );
};
// --- END OF FILE 373 Zeilen ---