// [2026-10-12] - REFACTOR: "Nächste Sitzungen" Kachel inkl. Historien-Logik aus dem WelcomeDashboard in eigene Komponente ausgelagert.
// src/features/Dashboard/components/DashboardSessionsWidget.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, ArrowRight, Clock } from 'lucide-react';
import type { Event } from '../../../core/types/models';

interface DashboardSessionsWidgetProps {
  upcomingSessions: any[];
  events: Event[] | null;
}

export const DashboardSessionsWidget: React.FC<DashboardSessionsWidgetProps> = ({
  upcomingSessions,
  events
}) => {
  const navigate = useNavigate();
  const [openHistoryId, setOpenHistoryId] = useState<string | null>(null);

  return (
    <section className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col relative z-20">
      <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between rounded-t-xl">
        <h2 className="text-lg font-bold text-gray-800 flex items-center">
          <Calendar className="w-5 h-5 mr-2 text-blue-600" />
          Nächste Sitzungen
        </h2>
        <button onClick={() => navigate('/events')} className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center">
          Alle zeigen <ArrowRight className="w-4 h-4 ml-1" />
        </button>
      </div>
      <div className="p-4 flex-1">
        {upcomingSessions.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-500 py-6">
            <Calendar className="w-10 h-10 mb-3 text-gray-300" />
            <p>Keine anstehenden Termine.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {upcomingSessions.map((ev) => {
              const seriesId = ev.seriesId || ev.id;
              const pastEvents = events
                ? events
                    .filter(e => e.seriesId === seriesId && e.status === 'ABGESCHLOSSEN' && e.id !== ev.id)
                    .sort((a, b) => (b.plannedStartTime || 0) - (a.plannedStartTime || 0))
                : [];

              return (
              <div 
                key={ev.id} 
                className={`flex flex-col bg-blue-50/50 border border-blue-100 rounded-lg hover:shadow-md transition-all relative ${openHistoryId === ev.id ? 'z-50 shadow-md ring-2 ring-blue-200' : 'z-10'}`}
              >
                <div 
                  onClick={() => navigate(`/events/${ev.id}`)}
                  className="flex items-start p-3 cursor-pointer hover:bg-blue-100/50 rounded-t-lg"
                >
                  <div className="bg-blue-100 p-2 rounded-md text-blue-700 mr-3 mt-0.5">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">{ev.title}</h3>
                    <p className="text-sm text-gray-600">{(ev.plannedStartTime || ev.startDate) ? new Date(ev.plannedStartTime || ev.startDate || 0).toLocaleString() : 'Kein Datum'}</p>
                    {ev.description && (
                      <p className="text-xs text-gray-500 mt-1 italic line-clamp-2 pr-2">
                        {ev.description}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="bg-white border-t border-blue-100 grid grid-cols-2 rounded-b-lg overflow-hidden relative z-30">
                  <button 
                    onClick={() => setOpenHistoryId(openHistoryId === ev.id ? null : ev.id)} 
                    className={`flex items-center justify-center py-2 text-xs font-bold transition-colors border-r border-blue-100 ${openHistoryId === ev.id ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}
                  >
                    📜 Protokolle
                  </button>
                  <button 
                    onClick={() => navigate(`/events/${ev.id}`)}
                    className="flex items-center justify-center py-2 text-xs font-bold text-blue-600 hover:bg-blue-50 transition-colors"
                  >
                    Sitzung <ArrowRight className="w-3 h-3 ml-1" />
                  </button>
                </div>

                {openHistoryId === ev.id && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setOpenHistoryId(null)}></div>
                    <div className="absolute left-0 top-full mt-1 w-full bg-white border border-gray-200 shadow-xl rounded-lg transition-all z-50 overflow-hidden">
                       <div className="p-2 bg-gray-50 border-b border-gray-200 font-bold text-xs text-gray-500 uppercase tracking-wider flex justify-between items-center">
                         Projekt-Historie
                         <span className="text-[10px] bg-gray-200 text-gray-600 px-1.5 rounded">{pastEvents.length}</span>
                       </div>
                       <div className="max-h-48 overflow-y-auto">
                         {pastEvents.length === 0 && <div className="p-4 text-xs text-gray-400 text-center">Keine früheren Sitzungen für dieses Projekt.</div>}
                         {pastEvents.map(e => (
                           <button key={e.id} onClick={() => { setOpenHistoryId(null); navigate(`/events/${e.id}`); }} className="w-full text-left px-4 py-2 text-sm hover:bg-blue-50 border-b border-gray-100 last:border-0 text-gray-700">
                             <div className="font-bold text-blue-800">{e.plannedStartTime ? new Date(e.plannedStartTime).toLocaleDateString() : 'Unbekannt'}</div>
                             <div className="text-xs text-gray-500 truncate">{e.title}</div>
                           </button>
                         ))}
                       </div>
                    </div>
                  </>
                )}
              </div>
            )})}
          </div>
        )}
      </div>
    </section>
  );
};
// --- END OF FILE ---