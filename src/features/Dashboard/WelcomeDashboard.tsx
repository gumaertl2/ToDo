// [2026-10-18] - UX-FEATURE: Kompass-Zähler ("Termine", "Dienste", "fällige Aufgaben") im WelcomeDashboard als klickbare Smooth-Scroll-Sprungmarken zu den jeweiligen Kacheln ausgebaut (ideal für Mobile).
// [2026-10-12] - REFACTOR: WelcomeDashboard massiv verschlankt. Komplette Daten-Logik (useDashboardData) und UI-Blöcke in eigenständige Dateien/Widgets ausgelagert.
// [2026-10-11] - UX-FEATURE: Fahrer und Abfahrtszeit (departureTime) direkt in den Termin-Karten des Dashboards integriert. Bei fehlender Zeit wird bewusst keine Platzhalterzeit angezeigt.
// [2026-10-09] - BUGFIX: Deep-Link Architektur repariert. Dashboard sendet nun saubere Datenpakete (openEventSubId, openEventUid) für Abos und Logistik an den Kalender, um Race Conditions beim String-Parsing zu vermeiden.
// [2026-10-09] - UX-FIX: "Alle zeigen" Button bei Diensten als intelligenter Toggle (merkt sich den vorherigen Zeitraum und springt über "Standardansicht" wieder dorthin zurück).
// [2026-10-09] - UX-FIX: "Alle zeigen" Button für Dienste ergänzt (setzt Lookahead auf 365 Tage). Deep-Link ID für Logistik-Dienste repariert, damit sich das Kalender-Modal öffnet.
// [2026-10-09] - FEATURE: Logistik-Engine im Dashboard ergänzt. Das Dashboard scannt nun alle MatchLineup-Schattenakten und blendet zugewiesene Fahrer/Betreuer-Dienste vollautomatisch unter "Meine Dienste" als Action-Card ein.
// [2026-06-11] - ARCHITEKTUR-UPGRADE: WelcomeDashboard zur Kommandozentrale ausgebaut. "Nächste Sitzungen" und WhatsApp-Erinnerungen integriert. 
// src/features/Dashboard/WelcomeDashboard.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import { useClubStore } from '../../store/useClubStore';
import { ItemFormModal } from '../Shared/ItemFormModal';
import type { Task } from '../../core/types/models';

// Import der neuen Hooks und Widgets
import { useDashboardData } from './hooks/useDashboardData';
import { DashboardEventsWidget } from './components/DashboardEventsWidget';
import { DashboardServicesWidget } from './components/DashboardServicesWidget';
import { DashboardSessionsWidget } from './components/DashboardSessionsWidget';
import { DashboardTasksWidget } from './components/DashboardTasksWidget';

export const WelcomeDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, saveAgendaItem, fetchTasks, events } = useClubStore();

  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Task | null>(null);

  const eventsSectionRef = useRef<HTMLDivElement>(null);
  const servicesSectionRef = useRef<HTMLDivElement>(null);
  const tasksSectionRef = useRef<HTMLDivElement>(null);

  const scrollToSection = (ref: React.RefObject<HTMLDivElement | null>) => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // --- DYNAMISCHE LOOKAHEAD STATES (mit LocalStorage Persistenz) ---
  const [eventsLookahead, setEventsLookahead] = useState<number>(() => {
    const saved = localStorage.getItem('dashboard_events_lookahead');
    return saved !== null ? parseInt(saved, 10) : 14;
  });

  const [servicesLookahead, setServicesLookahead] = useState<number>(() => {
    const saved = localStorage.getItem('dashboard_services_lookahead');
    return saved !== null ? parseInt(saved, 10) : 14;
  });
  
  const [previousServicesLookahead, setPreviousServicesLookahead] = useState<number>(14);

  const [tasksLookahead, setTasksLookahead] = useState<number>(() => {
    const saved = localStorage.getItem('dashboard_tasks_lookahead');
    return saved !== null ? parseInt(saved, 10) : 14;
  });

  useEffect(() => { localStorage.setItem('dashboard_events_lookahead', eventsLookahead.toString()); }, [eventsLookahead]);
  useEffect(() => { localStorage.setItem('dashboard_services_lookahead', servicesLookahead.toString()); }, [servicesLookahead]);
  useEffect(() => { localStorage.setItem('dashboard_tasks_lookahead', tasksLookahead.toString()); }, [tasksLookahead]);

  const handleLookaheadChange = (setter: React.Dispatch<React.SetStateAction<number>>) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    setter(isNaN(val) ? 0 : val);
  };
  
  const handleToggleServicesLookahead = () => {
    if (servicesLookahead === 365) {
      setServicesLookahead(previousServicesLookahead);
    } else {
      setPreviousServicesLookahead(servicesLookahead);
      setServicesLookahead(365);
    }
  };

  const formatDate = (ms: number) => {
    const d = new Date(ms);
    return d.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  // --- GEHIRN (DATEN-LOGIK) ---
  const {
    isAppUser,
    myTasks,
    totalOpenTasksCount,
    upcomingEvents,
    upcomingServices,
    myLogisticsDuties,
    totalServicesCount,
    upcomingSessions,
    pendingWhatsAppReminders,
    todayStart
  } = useDashboardData(eventsLookahead, servicesLookahead, tasksLookahead);

  const handleEditTask = (task: Task) => {
    setEditingItem(task);
    setIsItemModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">Hallo {user?.name.split(' ')[0] || 'Gast'}! 👋</h1>
          <p className="text-lg text-gray-600 mt-2">
            Hier ist dein Kompass. In deinem eingestellten Zeitraum stehen{' '}
            <button
              type="button"
              onClick={() => scrollToSection(eventsSectionRef)}
              className="font-bold text-blue-600 underline decoration-blue-300 underline-offset-4 hover:text-blue-800 hover:decoration-blue-600 transition-colors cursor-pointer"
            >
              {upcomingEvents.length} Termine
            </button>
            {isAppUser ? (
              <>
                ,{' '}
                <button
                  type="button"
                  onClick={() => scrollToSection(servicesSectionRef)}
                  className="font-bold text-purple-600 underline decoration-purple-300 underline-offset-4 hover:text-purple-800 hover:decoration-purple-600 transition-colors cursor-pointer"
                >
                  {totalServicesCount} Dienste
                </button>{' '}
                und{' '}
                <button
                  type="button"
                  onClick={() => scrollToSection(tasksSectionRef)}
                  className="font-bold text-red-600 underline decoration-red-300 underline-offset-4 hover:text-red-800 hover:decoration-red-600 transition-colors cursor-pointer"
                >
                  {myTasks.length} fällige Aufgaben
                </button>{' '}
                für dich an.
              </>
            ) : (
              <>
                {' '}und{' '}
                <button
                  type="button"
                  onClick={() => scrollToSection(servicesSectionRef)}
                  className="font-bold text-purple-600 underline decoration-purple-300 underline-offset-4 hover:text-purple-800 hover:decoration-purple-600 transition-colors cursor-pointer"
                >
                  {totalServicesCount} Dienste
                </button>{' '}
                für dich an.
              </>
            )}
          </p>
        </div>

        {/* WhatsApp Reminder Alert */}
        {isAppUser && pendingWhatsAppReminders > 0 && (
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl shadow-md p-4 sm:p-5 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex items-center">
              <div className="bg-white/20 p-3 rounded-full mr-4 shrink-0">
                <MessageCircle className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold">Erinnerungen versenden</h2>
                <p className="text-green-50 text-sm mt-0.5 max-w-md">Es gibt anstehende Termine oder Aufgaben, für die du eine WhatsApp-Benachrichtigung an die Verantwortlichen schicken musst.</p>
              </div>
            </div>
            <button 
              onClick={() => navigate('/reminders')}
              className="w-full sm:w-auto px-5 py-2.5 bg-white text-green-700 font-bold rounded-lg shadow-sm hover:bg-green-50 transition-colors flex items-center justify-center shrink-0"
            >
              <span className="bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded-full mr-2">{pendingWhatsAppReminders}</span>
              Jetzt erledigen
            </button>
          </div>
        )}

        {/* DASHBOARD GRID */}
        <div className={`grid grid-cols-1 ${isAppUser ? 'lg:grid-cols-12' : ''} gap-6 lg:gap-8`}>
          
          {/* LINKE SPALTE */}
          <div className={`${isAppUser ? 'lg:col-span-7' : 'w-full max-w-3xl'} space-y-8`}>
            
            <div ref={eventsSectionRef} className="scroll-mt-4">
              <DashboardEventsWidget 
                eventsLookahead={eventsLookahead}
                onLookaheadChange={handleLookaheadChange(setEventsLookahead)}
                upcomingEvents={upcomingEvents}
                formatDate={formatDate}
              />
            </div>

            <div ref={servicesSectionRef} className="scroll-mt-4">
              <DashboardServicesWidget 
                servicesLookahead={servicesLookahead}
                onLookaheadChange={handleLookaheadChange(setServicesLookahead)}
                onToggleServicesLookahead={handleToggleServicesLookahead}
                totalServicesCount={totalServicesCount}
                upcomingServices={upcomingServices}
                myLogisticsDuties={myLogisticsDuties}
                formatDate={formatDate}
              />
            </div>
            
            {isAppUser && (
              <DashboardSessionsWidget 
                upcomingSessions={upcomingSessions}
                events={events}
              />
            )}
          </div>

          {/* RECHTE SPALTE (ToDos) */}
          {isAppUser && (
            <div ref={tasksSectionRef} className="lg:col-span-5 scroll-mt-4">
              <DashboardTasksWidget 
                tasksLookahead={tasksLookahead}
                onLookaheadChange={handleLookaheadChange(setTasksLookahead)}
                totalOpenTasksCount={totalOpenTasksCount}
                myTasks={myTasks}
                onEditTask={handleEditTask}
                user={user}
                todayStart={todayStart}
              />
            </div>
          )}
        </div>
      </div>

      {/* MODALS */}
      {isAppUser && editingItem && (
        <ItemFormModal
          key={editingItem.id}
          isOpen={isItemModalOpen}
          existingItem={editingItem}
          isFixedType={true}
          onClose={() => { setIsItemModalOpen(false); setEditingItem(null); }}
          onSave={async (data) => {
            const result = await saveAgendaItem(data);
            if (!result || (result && !result.success)) {
              throw new Error(result?.error?.message || "Fehler beim Speichern in Firebase.");
            }
            if (typeof fetchTasks === 'function') {
               await fetchTasks();
            }
            setIsItemModalOpen(false);
            setEditingItem(null);
          }}
        />
      )}
    </div>
  );
};
// --- END OF FILE ---