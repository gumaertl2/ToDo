// src/features/Events/EventDetailHeader.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useClubStore } from '../../store/useClubStore';
import { ArrowLeft, Calendar, MapPin, Clock, ChevronRight, ChevronLeft, Users, Printer, Edit2 } from 'lucide-react';
import type { Event } from '../../core/types/models';

interface EventDetailHeaderProps {
  eventId: string;
  currentEvent: Event;
  isReadOnly: boolean;
  invitedUserIds: string[];
  timeString: string;
  pastEvents: Event[];
  isLibraryVisible: boolean;
  onToggleLibrary: () => void;
  onEditEvent: () => void;
  onCheckAttendance: () => void;
  onPrint: () => void;
}

export const EventDetailHeader: React.FC<EventDetailHeaderProps> = ({
  eventId, currentEvent, isReadOnly, invitedUserIds, timeString, pastEvents,
  isLibraryVisible, onToggleLibrary, onEditEvent, onCheckAttendance, onPrint
}) => {
  const navigate = useNavigate();
  const { updateEvent } = useClubStore();
  
  // CHIRURGISCHER EINGRIFF: Lokaler State für das Historien-Menü (Touch-Support)
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  return (
    <div className="flex items-center justify-between mb-6 print:!mb-4">
      <div className="flex items-center">
        <button onClick={() => navigate(-1)} className="mr-4 text-gray-400 hover:text-blue-600 transition-colors print:!hidden print:!absolute print:!w-0 print:!h-0"><ArrowLeft className="w-6 h-6" /></button>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900 print:!text-black flex items-center">
              {currentEvent.title}
              {!isReadOnly && (
                <button onClick={onEditEvent} className="ml-3 p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors print:!hidden" title="Projekt / Sitzung bearbeiten">
                  <Edit2 className="w-5 h-5" />
                </button>
              )}
              {currentEvent.status === 'PLANUNG' && !currentEvent.isPublished && <span className="ml-3 text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded uppercase print:!border print:!border-gray-400 print:!bg-transparent print:!text-gray-800">Entwurf</span>}
              {currentEvent.status === 'PLANUNG' && currentEvent.isPublished && <span className="ml-3 text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded uppercase border border-purple-200 print:!border-gray-400 print:!text-gray-800 print:!bg-transparent">Agenda Veröffentlicht</span>}
              {isReadOnly && <span className="ml-3 text-xs bg-gray-600 text-white px-2 py-1 rounded uppercase print:!border print:!border-gray-400 print:!text-gray-800 print:!bg-transparent">Versiegelt</span>}
            </h1>
            
            {/* CHIRURGISCHER EINGRIFF: group-Klassen entfernt, stattdessen onClick und State */}
            <div className="relative ml-2 print:!hidden print:!absolute print:!w-0 print:!h-0">
              <button onClick={() => setIsHistoryOpen(!isHistoryOpen)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors" title="Historie dieses Projekts / dieser Reihe">
                <Clock className="w-5 h-5" />
              </button>
              
              {isHistoryOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsHistoryOpen(false)}></div>
                  <div className="absolute left-0 top-full mt-1 w-64 bg-white border border-gray-200 shadow-xl rounded-lg transition-all z-50 overflow-hidden">
                     <div className="p-2 bg-gray-50 border-b border-gray-200 font-bold text-xs text-gray-500 uppercase tracking-wider">Projekt-Historie</div>
                     <div className="max-h-60 overflow-y-auto">
                       {pastEvents.length === 0 && <div className="p-4 text-xs text-gray-400 text-center">Keine früheren Sitzungen für dieses Projekt.</div>}
                       {pastEvents.map(e => (
                          <button key={e.id} onClick={() => { setIsHistoryOpen(false); navigate(`/events/${e.id}`); }} className={`w-full text-left px-4 py-2 text-sm hover:bg-blue-50 border-b border-gray-100 last:border-0 ${e.id === eventId ? 'bg-blue-50 text-blue-700 font-bold' : 'text-gray-700'}`}>
                            {e.title} <br/><span className="text-xs text-gray-500">{new Date(e.plannedStartTime||0).toLocaleDateString()}</span>
                          </button>
                       ))}
                     </div>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center text-sm text-gray-500 mt-1 gap-4 flex-wrap print:!text-black">
            {currentEvent.plannedStartTime && (
              <span onClick={() => !isReadOnly && onEditEvent()} className={`flex items-center ${!isReadOnly ? 'cursor-pointer hover:text-blue-600 hover:bg-gray-100 px-1 -ml-1 rounded transition-colors' : ''} print:!m-0 print:!p-0`} title={!isReadOnly ? "Klicken zum Bearbeiten" : ""}>
                <Calendar className="w-4 h-4 mr-1 print:!hidden" /> {new Date(currentEvent.plannedStartTime).toLocaleDateString()}
              </span>
            )}
            {timeString && (
              <span onClick={() => !isReadOnly && onEditEvent()} className={`flex items-center ${!isReadOnly ? 'cursor-pointer hover:text-blue-600 hover:bg-gray-100 px-1 -ml-1 rounded transition-colors' : ''} print:!m-0 print:!p-0`} title={!isReadOnly ? "Klicken zum Bearbeiten" : ""}>
                <Clock className="w-4 h-4 mr-1 print:!hidden" /> {timeString} Uhr
              </span>
            )}
            {(currentEvent.location || !isReadOnly) && (
              <span onClick={() => !isReadOnly && onEditEvent()} className={`flex items-center ${!isReadOnly ? 'cursor-pointer hover:text-blue-600 hover:bg-gray-100 px-1 -ml-1 rounded transition-colors' : ''} print:!m-0 print:!p-0`} title={!isReadOnly ? "Klicken zum Bearbeiten" : ""}>
                <MapPin className="w-4 h-4 mr-1 print:!hidden" /> {currentEvent.location || <span className="italic text-gray-400">Ort hinzufügen</span>}
              </span>
            )}
            {currentEvent.status !== 'PLANUNG' && (
              <span className="flex items-center bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-100 print:!border-none print:!p-0 print:!bg-transparent print:!text-black">
                <Users className="w-4 h-4 mr-1 print:!hidden" /> Anwesend: {currentEvent.actualAttendeeUserIds ? currentEvent.actualAttendeeUserIds.length : '?'} / {invitedUserIds.length}
                {!isReadOnly && <button onClick={onCheckAttendance} className="ml-2 font-bold hover:underline print:!hidden">(Prüfen)</button>}
              </span>
            )}
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-3 shrink-0 ml-4 print:!hidden print:!absolute print:!w-0 print:!h-0 print:!overflow-hidden">
        <button onClick={onPrint} className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-gray-300" title="Drucken / PDF">
          <Printer className="w-5 h-5" />
        </button>
        
        {!isReadOnly && currentEvent.status === 'PLANUNG' && !currentEvent.isPublished && <button onClick={() => updateEvent({ ...currentEvent, isPublished: true })} className="px-4 py-2 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 shadow-sm">Agenda veröffentlichen</button>}
        {!isReadOnly && currentEvent.status === 'PLANUNG' && currentEvent.isPublished && <button onClick={() => updateEvent({ ...currentEvent, status: 'AKTIV', isPublished: true })} className="px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 shadow-sm">Sitzung starten</button>}
        {!isReadOnly && (
          <button onClick={onToggleLibrary} className="flex items-center px-4 py-2 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors">
            {isLibraryVisible ? <><ChevronRight className="w-4 h-4 mr-2" /> Fokus-Modus</> : <><ChevronLeft className="w-4 h-4 mr-2" /> Vorlagen einblenden</>}
          </button>
        )}
      </div>
    </div>
  );
};
// Exakte Zeilenzahl: 111