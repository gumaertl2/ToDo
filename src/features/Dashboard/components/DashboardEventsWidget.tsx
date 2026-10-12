// [2026-10-12] - REFACTOR: Vereinstermine (Events) Kachel aus dem WelcomeDashboard in eine eigene Komponente ausgelagert.
// src/features/Dashboard/components/DashboardEventsWidget.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, ChevronRight } from 'lucide-react';

interface DashboardEventsWidgetProps {
  eventsLookahead: number;
  onLookaheadChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  upcomingEvents: any[];
  formatDate: (ms: number) => string;
}

export const DashboardEventsWidget: React.FC<DashboardEventsWidgetProps> = ({
  eventsLookahead,
  onLookaheadChange,
  upcomingEvents,
  formatDate
}) => {
  const navigate = useNavigate();

  return (
    <section className="relative z-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
        <div className="flex items-center">
          <h2 className="text-xl font-bold text-gray-900 flex items-center">
            <Calendar className="w-5 h-5 mr-2 text-blue-600" /> Vereinstermine
          </h2>
          <div className="flex items-center ml-3 bg-white border border-gray-200 rounded-lg px-2 py-0.5 shadow-sm" title="Vorschau in Tagen">
             <input 
               type="number" min="1" max="365" 
               value={eventsLookahead} 
               onChange={onLookaheadChange} 
               className="w-10 text-center text-sm font-bold text-blue-600 outline-none" 
             />
             <span className="text-[10px] uppercase font-bold text-gray-400 ml-1">Tage</span>
          </div>
        </div>
        <button onClick={() => navigate('/calendar')} className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors">Zum Vereinskalender</button>
      </div>
      <div className="space-y-3">
        {upcomingEvents.length === 0 ? (
          <div className="bg-white border border-gray-200 p-6 rounded-xl text-center text-gray-500">Keine relevanten Termine im gewählten Zeitraum.</div>
        ) : (
          upcomingEvents.map(ev => (
            <button 
              key={ev.id} 
              onClick={() => {
                if (ev.type === 'INTERN') {
                  navigate(`/events/${ev.id}`);
                } else if (ev.type === 'ABO_CALENDAR') {
                  navigate('/calendar', { state: { openEventSubId: ev.subId, openEventUid: ev.uid, targetDate: ev.time } });
                } else {
                  navigate('/calendar', { state: { openEventId: ev.id, targetDate: ev.time } });
                }
              }} 
              className="w-full text-left bg-white border border-gray-200 p-4 rounded-xl shadow-sm hover:shadow-md hover:border-blue-300 transition-all group"
            >
              <div className="flex justify-between items-start">
                <div>
                  <span className={`inline-block px-2 py-1 text-xs font-bold rounded mb-2 ${ev.type === 'INTERN' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                    {formatDate(ev.time)} Uhr
                  </span>
                  <h3 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors leading-snug">{ev.title}</h3>
                  
                  {/* FAHRER-INFO (Vereinstermine) */}
                  {(ev as any).driverNames && (
                    <div className="mt-2 text-xs text-gray-600 flex items-center bg-gray-50 border border-gray-200 px-2 py-1 rounded-md w-max shadow-sm">
                      <span className="mr-1.5">🚗</span>
                      {(ev as any).departureTime ? (
                        <span>Abfahrt: <strong className="text-gray-900">{(ev as any).departureTime} Uhr</strong> ({(ev as any).driverNames})</span>
                      ) : (
                        <span>Fahrer: <strong className="text-gray-900">{(ev as any).driverNames}</strong></span>
                      )}
                    </div>
                  )}
                </div>
                <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-blue-500 mt-2 shrink-0" />
              </div>
            </button>
          ))
        )}
      </div>
    </section>
  );
};
// --- END OF FILE ---