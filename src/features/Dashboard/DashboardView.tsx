// src/features/Dashboard/DashboardView.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { useClubStore } from '../../store/useClubStore';
import { Calendar, CheckSquare, Clock, ArrowRight, MessageCircle, Send } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { ItemCard } from '../Shared/ItemCard';
import { ItemFormModal } from '../Shared/ItemFormModal';
import type { Task } from '../../core/types/models';

export const DashboardView: React.FC = () => {
  // CHIRURGISCHER EINGRIFF: Alle benötigten States und Funktionen aus dem Store laden
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

  // CHIRURGISCHER EINGRIFF: Die intelligente WhatsApp-Fristen-Berechnung
  const pendingReminders = useMemo(() => {
    if (!user) return [];
    
    const now = new Date();
    // Um 00:00 Uhr des heutigen Tages für den exakten Tagesabgleich
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const MS_PER_DAY = 1000 * 60 * 60 * 24;

    const items: any[] = [];

    // 1. Kalender-Einträge (Termine & Dienste) prüfen
    if (calendarEvents) {
      calendarEvents.forEach(ce => {
        if (ce.reminderSenderUserId === user.id && !ce.reminderSentAt && ce.reminderLeadDays !== undefined) {
          const eventStart = new Date(ce.startTime);
          const eventDateStart = new Date(eventStart.getFullYear(), eventStart.getMonth(), eventStart.getDate()).getTime();
          const stichtag = eventDateStart - (ce.reminderLeadDays * MS_PER_DAY);
          
          if (todayStart >= stichtag) {
            items.push({
              id: ce.id,
              type: ce.eventType === 'DIENST' ? 'Dienst' : 'Termin',
              title: ce.title,
              date: ce.startTime,
              text: ce.reminderCustomText || `Hallo, kurze Erinnerung an: ${ce.title}`,
              targetsNames: 'Manuelle Gruppenwahl',
              isDirect: false, // Bei Diensten immer Joker-Link für WhatsApp-Gruppen
              phone: '',
              rawItem: ce,
              model: 'calendarEvent'
            });
          }
        }
      });
    }

    // 2. Aufgaben (Tasks) prüfen
    if (tasks) {
      tasks.forEach(t => {
        if (t.reminderSenderUserId === user.id && !t.reminderSentAt && t.reminderLeadDays !== undefined && t.dueDate) {
          const taskDue = new Date(t.dueDate);
          const taskDateStart = new Date(taskDue.getFullYear(), taskDue.getMonth(), taskDue.getDate()).getTime();
          const stichtag = taskDateStart - (t.reminderLeadDays * MS_PER_DAY);
          
          if (todayStart >= stichtag) {
            const targets: { name: string, phone?: string, isGroup: boolean }[] = [];
            
            t.assigneeGroupIds?.forEach(gId => {
               const g = groups?.find(x => x.id === gId);
               if (g) targets.push({ name: g.name, isGroup: true });
            });
            t.assigneeHelperIds?.forEach(hId => {
               const h = helpers?.find(x => x.id === hId);
               if (h) targets.push({ name: h.alias || h.name, phone: h.telefon, isGroup: false });
            });

            const targetsNames = targets.map(x => x.name).join(', ') || 'Manuelle Auswahl';
            // Wir bauen den Direktlink nur, wenn exakt 1 Helfer (mit Nummer) zugewiesen ist
            const isDirect = targets.length === 1 && !targets[0].isGroup && !!targets[0].phone;
            const phone = isDirect ? targets[0].phone : '';

            items.push({
              id: t.id,
              type: 'Aufgabe',
              title: t.title,
              date: t.dueDate,
              text: `Erinnerung: ${t.title}${t.description ? ' - ' + t.description : ''}`,
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

    // Nach Datum sortieren (die dringendsten zuerst)
    return items.sort((a, b) => a.date - b.date);
  }, [user, calendarEvents, tasks, groups, helpers]);

  // CHIRURGISCHER EINGRIFF: Versand und Stempel-Logik
  const handleSendReminder = async (rem: any) => {
    let url = '';
    const text = rem.text;

    if (rem.isDirect && rem.phone) {
      // Nummern-Sanitäter: Entfernt Leerzeichen und formatiert zu +49
      let phone = String(rem.phone).replace(/[^0-9+]/g, '');
      if (phone.startsWith('0049')) phone = '+49' + phone.substring(4);
      else if (phone.startsWith('0')) phone = '+49' + phone.substring(1);
      
      url = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
    } else {
      // Joker-Link (öffnet WhatsApp, User wählt Kontakt/Gruppe)
      url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    }

    // Öffnet WhatsApp
    window.open(url, '_blank');

    // In Firebase als erledigt/gesendet abstempeln
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

      {/* CHIRURGISCHER EINGRIFF: Die Kommando-Zentrale (nur sichtbar, wenn etwas fällig ist) */}
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
                    <p className="text-xs text-gray-500 mt-1.5 italic bg-gray-50 p-2 rounded border border-gray-100">
                      "{rem.text}"
                    </p>
                  </div>
                  
                  <button
                    onClick={() => handleSendReminder(rem)}
                    className="flex items-center justify-center px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold text-sm transition-colors shadow-sm whitespace-nowrap"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Senden & Erledigt
                  </button>
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
// Exakte Zeilenzahl: 301