// [2026-10-18] - UX: Historie als An/Aus-Modus-Schalter mit konfigurierbarem Tage-Rückblick (analog zum WelcomeDashboard) und Farbwechsel (Blau = Offen, Amber = Historie) für "Meine | Verein" umgesetzt.
// [2026-10-18] - UX: Zwei getrennte Schalter-Leisten zu einer einzigen, intuitiven 3er-Leiste ("Meine" | "Verein" | "Historie") zusammengeführt.
// [2026-10-18] - FEAT: Umschalter "Offen" | "Verlauf" (Audit-Log für gesendete und verworfene Erinnerungen inkl. Wiederherstellen-Funktion) in RemindersView integriert.
// [2026-10-18] - REFACTOR: RemindersView massiv verschlankt (Separation of Concerns). Berechnungs- und Versandlogik in useRemindersData ausgelagert, Karten-Darstellung in ReminderCard gekapselt.
// [2026-10-01] - BUGFIX: Vergangenheits-Filter (todayStart <= eventDateStart) in alle vier Erinnerungs-Schleifen eingebaut. Verhindert Zombie-Erinnerungen für Termine, die bereits in der Vergangenheit liegen.
// [2026-09-28] - FEATURE: Lineup-Integration (Aufstellung) in die automatisierte Erinnerungs-Schleife (RemindersView) integriert. Abos mit Team-Verknüpfung berechnen nun live den Kader (Base & Overrides) und hängen ihn automatisch an den WhatsApp-Text an.
// [2026-06-12] - BUGFIX: Mehrtägige und monatsübergreifende Termine (inkl. ganztägig) werden im WhatsApp-Text jetzt korrekt mit Start- und Enddatum ("Datum A bis Datum B") formatiert.
// [2026-06-11] - UX-FIX: Poka-Yoke (Narrensicherung) für Browser-Benachrichtigungen integriert. Wenn der Browser die Anfrage stumm blockiert (Notification.permission === 'denied'), wirft die App nun explizit einen Alert mit der Lösungsanweisung (Klick auf das Schloss-Symbol), anstatt ohne Reaktion zu verbleiben.
// [2026-05-23] - ARCHITEKTUR-FIX: Projekt-Schutzschild & Unterpunkt-Schutzschild in Reminder-Schleife eingebaut. Verhindert Phantom-Erinnerungen für erledigte Oberpunkte und abgeschlossene/archivierte Projekte.
// [2026-05-17] - BUGFIX: Erinnerungs-Zentrale vollständig auf Omni-Channel harmonisiert (inklusive Teams). SSOT Architektur (dueDate) beibehalten.
// [2026-05-16] - ARCHITEKTUR-FIX: Rückkehr zur SSOT-Logik. Keine Spaghetti-Fallbacks für Daten. dueDate ist das Gesetz!
// [2026-05-16] - BUGFIX: 'teams' zum useClubStore Destructuring hinzugefügt. Importe vervollständigt.
// src/features/Reminders/RemindersView.tsx
import React, { useState, useEffect } from 'react';
import { MessageCircle, CheckCircle2, Bell, BellOff, History } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ItemFormModal } from '../Shared/ItemFormModal';
import { CalendarEventFormModal } from '../Events/CalendarEventFormModal';
import { CalendarBulkEventModal } from '../Events/CalendarBulkEventModal';
import { CalendarIcsDetailModal } from '../Events/CalendarIcsDetailModal'; 
import type { Task, CalendarEvent } from '../../core/types/models';
import { useRemindersData } from './hooks/useRemindersData';
import type { PendingReminderItem } from './hooks/useRemindersData';
import { ReminderCard } from './components/ReminderCard';

export const RemindersView: React.FC = () => {
  const navigate = useNavigate();
  const {
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
  } = useRemindersData();

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

    if (Notification.permission === 'denied') {
      alert('Dein Browser blockiert Benachrichtigungen für diese Seite.\n\nBitte klicke auf das Schloss-Symbol (oder die Einstellungen) oben links neben der Internetadresse (URL), um Benachrichtigungen manuell zu erlauben.');
      setPermissionStatus('denied');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setPermissionStatus(permission);
      
      if (permission === 'denied') {
        alert('Du hast die Benachrichtigungen soeben blockiert (oder dein Browser tut dies automatisch).\n\nBitte klicke auf das Schloss-Symbol oben in der Adresszeile, um sie wieder zu erlauben.');
      }
    } catch (error) {
      console.error('Fehler bei der Berechtigungsanfrage:', error);
    }
  };

  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editingCalendarEvent, setEditingCalendarEvent] = useState<CalendarEvent | null>(null);
  const [editingSeriesId, setEditingSeriesId] = useState<string | null>(null);
  const [editingIcsEvent, setEditingIcsEvent] = useState<any | null>(null);

  const handleCardClick = (rem: PendingReminderItem) => {
    if (rem.type === 'Sitzung') {
      navigate(`/events/${rem.id}`);
    } else if (rem.model === 'task') {
      setEditingTask(rem.rawItem);
    } else if (rem.type === 'Abo') {
      const sub = calendarSubscriptions.find(s => s.id === rem.rawItem.subId);
      setEditingIcsEvent({
        id: rem.id,
        title: rem.rawItem.title,
        start: new Date(rem.rawItem.startTime),
        end: new Date(rem.rawItem.endTime),
        allDay: rem.rawItem.isAllDay,
        location: rem.rawItem.location,
        description: rem.rawItem.description,
        color: sub?.color || '#10b981'
      });
    } else {
      if (rem.rawItem.seriesId) setEditingSeriesId(rem.rawItem.seriesId);
      else setEditingCalendarEvent(rem.rawItem);
    }
  };

  const isHistoryMode = activeTab === 'history';
  const activeList = isHistoryMode ? displayedHistoryReminders : displayedReminders;
  const myCount = isHistoryMode ? myHistoryReminders.length : myReminders.length;
  const allCount = isHistoryMode ? allHistoryReminders.length : allPendingReminders.length;

  const handleLookbackChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    setHistoryLookbackDays(isNaN(val) ? 0 : val);
    if (!isHistoryMode) {
      setActiveTab('history');
    }
  };

  return (
    <div className="h-full flex flex-col max-w-5xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <MessageCircle className={`w-7 h-7 mr-3 transition-colors ${isHistoryMode ? 'text-amber-500' : 'text-green-600'}`} />
            WhatsApp Erinnerungen
            {isHistoryMode && (
              <span className="ml-3 text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                Historie ({historyLookbackDays} Tage)
              </span>
            )}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {isHistoryMode
              ? `Protokoll der letzten ${historyLookbackDays} Tage (${showAll && canViewAll ? 'Verein gesamt' : 'Meine Erinnerungen'}) – neueste Einträge zuerst.`
              : 'Verwalte deine anstehenden Benachrichtigungen für Aufgaben und Termine.'}
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          {/* FILTER: Meine | Verein (wechselt die Farbe: Blau = Offen, Amber = Historie) */}
          {canViewAll ? (
            <div className={`flex items-center p-1 rounded-lg border shadow-inner shrink-0 transition-colors ${
              isHistoryMode ? 'bg-amber-50/80 border-amber-200' : 'bg-gray-100 border-gray-200'
            }`}>
              <button 
                onClick={() => setShowAll(false)} 
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all flex items-center ${
                  !showAll 
                    ? (isHistoryMode 
                        ? 'bg-amber-500 text-white shadow-sm border border-amber-600' 
                        : 'bg-white text-blue-700 shadow-sm border border-gray-200')
                    : (isHistoryMode ? 'text-amber-800 hover:text-amber-950' : 'text-gray-500 hover:text-gray-700')
                }`}
              >
                Meine 
                <span className={`ml-1.5 px-1.5 py-0.5 rounded text-[10px] ${
                  !showAll 
                    ? (isHistoryMode ? 'bg-amber-700/40 text-white' : 'bg-blue-100 text-blue-800') 
                    : (isHistoryMode ? 'bg-amber-200/70 text-amber-900' : 'bg-gray-200 text-gray-600')
                }`}>
                  {myCount}
                </span>
              </button>

              <button 
                onClick={() => setShowAll(true)} 
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all flex items-center ${
                  showAll 
                    ? (isHistoryMode 
                        ? 'bg-amber-500 text-white shadow-sm border border-amber-600' 
                        : 'bg-white text-blue-700 shadow-sm border border-gray-200')
                    : (isHistoryMode ? 'text-amber-800 hover:text-amber-950' : 'text-gray-500 hover:text-gray-700')
                }`}
              >
                Verein
                <span className={`ml-1.5 px-1.5 py-0.5 rounded text-[10px] ${
                  showAll 
                    ? (isHistoryMode ? 'bg-amber-700/40 text-white' : 'bg-blue-100 text-blue-800') 
                    : (isHistoryMode ? 'bg-amber-200/70 text-amber-900' : 'bg-gray-200 text-gray-600')
                }`}>
                  {allCount}
                </span>
              </button>
            </div>
          ) : (
            <div className={`px-3 py-1.5 rounded-lg border text-xs font-bold flex items-center transition-colors ${
              isHistoryMode 
                ? 'bg-amber-500 text-white border-amber-600 shadow-sm' 
                : 'bg-blue-50 text-blue-800 border-blue-200'
            }`}>
              Meine
              <span className={`ml-1.5 px-1.5 py-0.5 rounded text-[10px] ${
                isHistoryMode ? 'bg-amber-700/40 text-white' : 'bg-blue-200/70 text-blue-900'
              }`}>
                {myCount}
              </span>
            </div>
          )}

          {/* HISTORIE-MODUS-TOGGLE + TAGE-EINGABEFELD (wie im WelcomeDashboard) */}
          <div className={`flex items-center p-1 rounded-lg border shadow-inner shrink-0 transition-colors ${
            isHistoryMode ? 'bg-amber-100/80 border-amber-300' : 'bg-gray-100 border-gray-200'
          }`}>
            <button
              onClick={() => setActiveTab(isHistoryMode ? 'pending' : 'history')}
              title={isHistoryMode ? 'Klicken, um wieder zu den offenen Erinnerungen zu wechseln' : 'Klicken, um die Historie anzuzeigen'}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all flex items-center ${
                isHistoryMode 
                  ? 'bg-amber-500 text-white shadow-sm border border-amber-600' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
              }`}
            >
              <History className="w-3.5 h-3.5 mr-1.5" />
              Historie
            </button>

            <div 
              className={`flex items-center ml-1 bg-white border rounded-md px-2 py-1 shadow-2xs transition-colors ${
                isHistoryMode ? 'border-amber-300' : 'border-gray-200'
              }`} 
              title="Zeitraum der Historie in Tagen (Rückblick)"
            >
              <input 
                type="number" 
                min="1" 
                max="365" 
                value={historyLookbackDays} 
                onChange={handleLookbackChange} 
                className={`w-10 text-center text-xs font-bold outline-none ${
                  isHistoryMode ? 'text-amber-700' : 'text-gray-600'
                }`} 
              />
              <span className="text-[10px] uppercase font-bold text-gray-400 ml-1">Tage</span>
            </div>
          </div>
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
      ) : activeList.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center bg-white border border-gray-200 rounded-xl shadow-sm p-12 text-center">
          {!isHistoryMode ? (
            <>
              <CheckCircle2 className="w-16 h-16 text-green-400 mb-4" />
              <h2 className="text-xl font-bold text-gray-800 mb-2">Alles erledigt!</h2>
              <p className="text-gray-500 max-w-md">Aktuell gibt es keine anstehenden WhatsApp-Erinnerungen {showAll && canViewAll ? 'im Verein' : 'für dich'}.</p>
            </>
          ) : (
            <>
              <History className="w-16 h-16 text-amber-300 mb-4" />
              <h2 className="text-xl font-bold text-gray-800 mb-2">Keine Einträge in den letzten {historyLookbackDays} Tagen</h2>
              <p className="text-gray-500 max-w-md">
                In diesem Zeitraum wurden keine WhatsApp-Erinnerungen {showAll && canViewAll ? 'im Verein' : 'von dir oder an dich'} als gesendet oder verworfen protokolliert. Du kannst oben rechts die Anzahl der Tage erhöhen.
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-4 overflow-y-auto pb-8 custom-scrollbar pr-2">
          {activeList.map(rem => {
            const hasEditRights = rem.senderUserId === user?.id || canViewAll;
            const defaultX = Math.max(1, Math.floor(Math.max(0, rem.diffDays) / 2));
            const currentX = snoozeDays[rem.id] !== undefined ? snoozeDays[rem.id] : defaultX;

            return (
              <ReminderCard
                key={rem.id}
                reminder={rem}
                hasEditRights={hasEditRights}
                isHistory={isHistoryMode}
                snoozeValue={currentX}
                onSnoozeChange={(days) => setSnoozeDays(prev => ({ ...prev, [rem.id]: days }))}
                onCardClick={() => handleCardClick(rem)}
                onSend={() => handleSendReminder(rem)}
                onSnooze={() => handleSnoozeReminder(rem)}
                onDismiss={() => handleDismissReminder(rem)}
                onRestore={() => handleRestoreReminder(rem)}
              />
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