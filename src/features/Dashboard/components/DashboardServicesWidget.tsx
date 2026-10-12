// [2026-10-12] - REFACTOR: "Meine Dienste" Kachel aus dem WelcomeDashboard in eine eigene Komponente ausgelagert.
// src/features/Dashboard/components/DashboardServicesWidget.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Coffee, ArrowRight, ChevronRight } from 'lucide-react';

interface DashboardServicesWidgetProps {
  servicesLookahead: number;
  onLookaheadChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onToggleServicesLookahead: () => void;
  totalServicesCount: number;
  upcomingServices: any[];
  myLogisticsDuties: any[];
  formatDate: (ms: number) => string;
}

export const DashboardServicesWidget: React.FC<DashboardServicesWidgetProps> = ({
  servicesLookahead,
  onLookaheadChange,
  onToggleServicesLookahead,
  totalServicesCount,
  upcomingServices,
  myLogisticsDuties,
  formatDate
}) => {
  const navigate = useNavigate();

  return (
    <section className="relative z-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
        <div className="flex items-center">
          <h2 className="text-xl font-bold text-gray-900 flex items-center">
            <Coffee className="w-5 h-5 mr-2 text-purple-600" /> Meine Dienste
          </h2>
          <div className="flex items-center ml-3 bg-purple-50 border border-purple-200 rounded-lg px-2 py-0.5 shadow-sm" title="Vorschau in Tagen">
             <input 
               type="number" min="1" max="365" 
               value={servicesLookahead} 
               onChange={onLookaheadChange} 
               className="w-10 text-center text-sm font-bold text-purple-600 bg-transparent outline-none" 
             />
             <span className="text-[10px] uppercase font-bold text-purple-400 ml-1">Tage</span>
          </div>
        </div>
        <button 
          onClick={onToggleServicesLookahead} 
          className="text-sm font-medium text-purple-600 hover:text-purple-800 transition-colors flex items-center"
        >
          {servicesLookahead === 365 ? (
            <>Standardansicht <ArrowRight className="w-4 h-4 ml-1" /></>
          ) : (
            <>Alle zeigen <ArrowRight className="w-4 h-4 ml-1" /></>
          )}
        </button>
      </div>
      <div className="space-y-3">
        {totalServicesCount === 0 ? (
          <div className="bg-purple-50/50 border border-purple-100 p-6 rounded-xl text-center text-purple-600/70 text-sm">Keine Dienste im gewählten Zeitraum.</div>
        ) : (
          <>
            {upcomingServices.map(srv => (
              <button key={srv.id} onClick={() => navigate('/calendar', { state: { openEventId: srv.id, targetDate: new Date(srv.startTime).getTime() } })} className="w-full text-left bg-purple-50 border border-purple-200 p-4 rounded-xl shadow-sm hover:shadow-md hover:border-purple-400 transition-all group">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="inline-block px-2 py-1 bg-purple-200 text-purple-900 text-xs font-bold rounded mb-2">{formatDate(new Date(srv.startTime).getTime())}</span>
                    <h3 className="font-bold text-purple-900 leading-snug">{srv.title}</h3>
                  </div>
                  <ChevronRight className="w-5 h-5 text-purple-400 group-hover:text-purple-600 mt-2 shrink-0" />
                </div>
              </button>
            ))}
            {myLogisticsDuties.map(duty => (
              <button 
                key={duty.id} 
                onClick={() => navigate('/calendar', { state: { openEventSubId: duty.subId, openEventUid: duty.uid, targetDate: duty.time } })} 
                className="w-full text-left bg-purple-50 border border-purple-200 p-4 rounded-xl shadow-sm hover:shadow-md hover:border-purple-400 transition-all group"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="inline-block px-2 py-1 bg-purple-200 text-purple-900 text-xs font-bold rounded mb-2">{formatDate(duty.time)} • {duty.role}</span>
                    <h3 className="font-bold text-purple-900 leading-snug">{duty.title}</h3>
                    
                    {/* FAHRER-INFO (Logistik-Dienste) */}
                    {duty.driverNames && (
                      <div className="mt-2 text-xs text-purple-700 flex items-center bg-purple-100/50 border border-purple-200 px-2 py-1 rounded-md w-max shadow-sm">
                        <span className="mr-1.5">🚗</span>
                        {duty.departureTime ? (
                          <span>Abfahrt: <strong className="text-purple-900">{duty.departureTime} Uhr</strong> ({duty.driverNames})</span>
                        ) : (
                          <span>Fahrer: <strong className="text-purple-900">{duty.driverNames}</strong></span>
                        )}
                      </div>
                    )}
                  </div>
                  <ChevronRight className="w-5 h-5 text-purple-400 group-hover:text-purple-600 mt-2 shrink-0" />
                </div>
              </button>
            ))}
          </>
        )}
      </div>
    </section>
  );
};
// --- END OF FILE ---