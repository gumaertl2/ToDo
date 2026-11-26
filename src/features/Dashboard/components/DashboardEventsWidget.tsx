// [2026-11-26] - UX-FIX: Auswärts-Symbol einheitlich auf "🚗 " umgestellt.
// [2026-11-26] - UX-FIX: Heim-/Auswärts-Symbol ("🏠 " / "🚗 ") einheitlich wie im Kalender direkt vor den Titel verschoben statt extra Badge in der Kopfzeile.
// [2026-11-26] - UX-UPGRADE: Badges ("🏓 Spiel" / "📅 Termin"), Heim-/Auswärts-Kennzeichnung ("🏠 Heim" / "🚌 Auswärts"), Heute-Highlight und dezenter linker Farbakzent.
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
          upcomingEvents.map(ev => {
            const isMatch = !!ev.showInMatchPlan;
            const locLower = (ev.location || '').toLowerCase();
            const isHome = isMatch && locLower.includes('maisach');
            const isAway = isMatch && !!ev.location && !isHome;
            const isToday = new Date(ev.time).toDateString() === new Date().toDateString();

            return (
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
                className={`w-full text-left bg-white border border-gray-200 border-l-4 ${
                  isMatch ? 'border-l-emerald-500 hover:border-emerald-300' : 'border-l-blue-500 hover:border-blue-300'
                } p-4 rounded-xl shadow-sm hover:shadow-md transition-all group`}
              >
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5 mb-2">
                      {isMatch ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <span>🏓</span> Spiel
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold rounded bg-blue-100 text-blue-800 border border-blue-200">
                          <Calendar className="w-3 h-3" /> Termin
                        </span>
                      )}

                      <span className={`inline-block px-2 py-0.5 text-xs font-bold rounded ${
                        isToday
                          ? 'bg-blue-600 text-white'
                          : ev.type === 'INTERN'
                            ? 'bg-blue-50 text-blue-800'
                            : 'bg-gray-100 text-gray-700'
                      }`}>
                        {isToday ? 'Heute, ' : ''}{formatDate(ev.time)} Uhr
                      </span>
                    </div>

                    <h3 className={`font-bold text-gray-900 transition-colors leading-snug ${
                      isMatch ? 'group-hover:text-emerald-700' : 'group-hover:text-blue-600'
                    }`}>
                      {isHome ? '🏠 ' : isAway ? '🚗 ' : ''}{ev.title}
                    </h3>
                    
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
            );
          })
        )}
      </div>
    </section>
  );
};
// --- END OF FILE ---