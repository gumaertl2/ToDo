// [2026-05-31] - UX-FIX: Suchfeld ("Volltext / Ähnlichkeitssuche") in die Event-Detailansicht (Agenda/Protokoll) zurückgebaut.
// [2026-05-29] - UX-FIX: 'Protokolle' Button verschoben. Der Button wurde aus der Titel-Zeile entfernt (da er bei langen Titeln das Layout zerschoss) und als gleichberechtigter Punkt in die primäre Aktionsleiste ("Agenda veröffentlichen", "Vorlagen") integriert.
// [2026-05-29] - UX-FIX: Responsives Desktop-Layout für den Header. Auf Notebooks (md+) werden Titel/Beschreibung nun über die volle Breite angezeigt (dezentere Schriftgröße) und die Aktions-Buttons in einer symmetrischen Reihe darunter angeordnet.
// [2026-05-28] - UX-FIX: 'Protokolle' Button. Die schwer verständliche kleine Uhr im Header wurde durch einen prominenten '📜 Protokolle' Button ersetzt, um das Dropdown mit den alten Sitzungen intuitiver zu machen.
// 2026-04-20 09:15 - FIX: Print-Media-Queries ergänzt, damit Buttons beim Drucken verschwinden
// 2026-04-20 09:40 - FIX: ArrowLeft Button beim Drucken über CSS (print:!hidden) ebenfalls komplett ausgeblendet
// 2026-05-02 11:30 - FIX: "Anwesenheit prüfen" Button wird nun im ReadOnly Modus ausgeblendet.
// 2026-05-10 11:15 - BUGFIX: actualAttendeeUserIds Zählung repariert, da length undefined war, wenn Array leer.
// 2026-05-12 11:20 - FEATURE: Reparatur-Button (Schraubenschlüssel) für die Event-Agenda-Hierarchie hinzugefügt.
// 2026-05-13 11:00 - SECURITY: Participation-First Schutz. Bearbeiten-Funktionen (Stift) für Nicht-Admins komplett ausgeblendet.
// src/features/Events/EventDetailHeader.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useClubStore } from '../../store/useClubStore';
import { ArrowLeft, Calendar, MapPin, Clock, ChevronRight, ChevronLeft, Users, Printer, Edit2, Wrench, Search, X } from 'lucide-react'; // CHIRURGISCHER EINGRIFF: Search und X importiert
import type { Event } from '../../core/types/models';

interface EventDetailHeaderProps {
  eventId: string;
  currentEvent: Event;
  isReadOnly: boolean;
  invitedUserIds: string[];
  timeString: string;
  pastEvents: Event[];
  isLibraryVisible: boolean;
  searchTerm: string; // CHIRURGISCHER EINGRIFF: Suchbegriff Prop hinzugefügt
  onSearchChange: (term: string) => void; // CHIRURGISCHER EINGRIFF: Suchfunktion Prop hinzugefügt
  onToggleLibrary: () => void;
  onEditEvent: () => void;
  onCheckAttendance: () => void;
  onPrint: () => void;
}

export const EventDetailHeader: React.FC<EventDetailHeaderProps> = ({
  eventId, currentEvent, isReadOnly, invitedUserIds, timeString, pastEvents,
  isLibraryVisible, searchTerm, onSearchChange, onToggleLibrary, onEditEvent, onCheckAttendance, onPrint
}) => {
  const navigate = useNavigate();
  const { updateEvent, repairEventAgendaOrder, user, roleProfiles } = useClubStore();
  
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isRepairing, setIsRepairing] = useState(false);

  // RECHTE-CHECK (Participation-First)
  const userRoleProfile = roleProfiles?.find(p => p.id === user?.roleProfileId);
  const canManageEvents = !!userRoleProfile?.permissions?.manageEvents || !!(user?.permissions as any)?.manageEvents;

  const handleRepair = async () => {
    if (confirm('Möchtest du die Sortierung der Agenda-Punkte reparieren? Dies ordnet Unterpunkte wieder korrekt ihren Oberpunkten zu.')) {
      setIsRepairing(true);
      await repairEventAgendaOrder(eventId);
      setIsRepairing(false);
    }
  };

  return (
    <div className="flex items-center justify-between md:flex-col md:items-start md:gap-4 mb-6 print:!mb-4">
      <div className="flex items-start md:w-full">
        <button onClick={() => navigate(-1)} className="mr-4 mt-1 md:mt-0 text-gray-400 hover:text-blue-600 transition-colors print:!hidden print:!absolute print:!w-0 print:!h-0"><ArrowLeft className="w-6 h-6" /></button>
        <div className="md:w-full">
          <div className="flex items-center gap-2 flex-wrap justify-between">
            <h1 className="text-2xl md:text-xl font-bold text-gray-900 print:!text-black flex items-center flex-wrap">
              {currentEvent.title}
              {!isReadOnly && canManageEvents && (
                <button onClick={onEditEvent} className="ml-3 p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors print:!hidden" title="Projekt / Sitzung bearbeiten">
                  <Edit2 className="w-5 h-5" />
                </button>
              )}
              {currentEvent.status === 'PLANUNG' && !currentEvent.isPublished && <span className="ml-3 text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded uppercase print:!border print:!border-gray-400 print:!bg-transparent print:!text-gray-800">Entwurf</span>}
              {currentEvent.status === 'PLANUNG' && currentEvent.isPublished && <span className="ml-3 text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded uppercase border border-purple-200 print:!border-gray-400 print:!text-gray-800 print:!bg-transparent">Agenda Veröffentlicht</span>}
              {isReadOnly && <span className="ml-3 text-xs bg-gray-600 text-white px-2 py-1 rounded uppercase print:!border print:!border-gray-400 print:!text-gray-800 print:!bg-transparent">Versiegelt</span>}
            </h1>
            
             {/* CHIRURGISCHER EINGRIFF: Suchfeld in den Header integriert */}
             <div className="relative w-full md:w-64 mt-2 md:mt-0 print:!hidden">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder="Volltextsuche..."
                  className="w-full pl-8 pr-8 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow bg-white shadow-sm"
                />
                {searchTerm && (
                  <button 
                    onClick={() => onSearchChange('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
            </div>

          </div>

          {currentEvent.description && (
            <p className="text-sm text-gray-600 mt-1 mb-2 italic print:!text-black">
              {currentEvent.description}
            </p>
          )}

          <div className="flex items-center text-sm text-gray-500 mt-1 gap-4 flex-wrap print:!text-black">
            {currentEvent.plannedStartTime && (
              <span onClick={() => !isReadOnly && canManageEvents && onEditEvent()} className={`flex items-center ${!isReadOnly && canManageEvents ? 'cursor-pointer hover:text-blue-600 hover:bg-gray-100 px-1 -ml-1 rounded transition-colors' : ''} print:!m-0 print:!p-0`} title={!isReadOnly && canManageEvents ? "Klicken zum Bearbeiten" : ""}>
                <Calendar className="w-4 h-4 mr-1 print:!hidden" /> {new Date(currentEvent.plannedStartTime).toLocaleDateString()}
              </span>
            )}
            {timeString && (
              <span onClick={() => !isReadOnly && canManageEvents && onEditEvent()} className={`flex items-center ${!isReadOnly && canManageEvents ? 'cursor-pointer hover:text-blue-600 hover:bg-gray-100 px-1 -ml-1 rounded transition-colors' : ''} print:!m-0 print:!p-0`} title={!isReadOnly && canManageEvents ? "Klicken zum Bearbeiten" : ""}>
                <Clock className="w-4 h-4 mr-1 print:!hidden" /> {timeString} Uhr
              </span>
            )}
            {(currentEvent.location || (!isReadOnly && canManageEvents)) && (
              <span onClick={() => !isReadOnly && canManageEvents && onEditEvent()} className={`flex items-center ${!isReadOnly && canManageEvents ? 'cursor-pointer hover:text-blue-600 hover:bg-gray-100 px-1 -ml-1 rounded transition-colors' : ''} print:!m-0 print:!p-0`} title={!isReadOnly && canManageEvents ? "Klicken zum Bearbeiten" : ""}>
                <MapPin className="w-4 h-4 mr-1 print:!hidden" /> {currentEvent.location || <span className="italic text-gray-400">Ort hinzufügen</span>}
              </span>
            )}
            {currentEvent.status !== 'PLANUNG' && (
              <span className={`flex items-center px-2 py-0.5 rounded border print:!border-none print:!p-0 print:!bg-transparent print:!text-black ${currentEvent.attendanceConfirmed ? 'bg-green-50 text-green-700 border-green-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'}`}>
                <Users className="w-4 h-4 mr-1 print:!hidden" /> 
                {currentEvent.attendanceConfirmed ? 'Anwesenheit bestätigt' : 'Anwesenheit offen'} 
                <span className="ml-1 text-xs">({currentEvent.actualAttendeeUserIds?.length || 0} / {invitedUserIds.length} da)</span>
                {!isReadOnly && <button onClick={onCheckAttendance} className="ml-2 font-bold hover:underline print:!hidden">(Prüfen)</button>}
              </span>
            )}
          </div>
        </div>
      </div>
      
      {/* CHIRURGISCHER EINGRIFF: Komplett überarbeitete Aktionsleiste (Umbruch auf Mobile, saubere Reihe auf Desktop) */}
      <div className="flex flex-wrap md:flex-nowrap items-center gap-3 md:w-full mt-4 print:!hidden print:!absolute print:!w-0 print:!h-0 print:!overflow-hidden">
        
        {/* Container für die Icon-Buttons */}
        <div className="flex items-center gap-2">
          {!isReadOnly && canManageEvents && (
            <button 
              onClick={handleRepair} 
              disabled={isRepairing}
              className={`p-2 rounded-lg transition-colors border flex justify-center items-center ${isRepairing ? 'text-gray-400 border-gray-200 bg-gray-50' : 'text-orange-500 hover:text-orange-600 hover:bg-orange-50 border-orange-300'}`} 
              title="Agenda-Sortierung / Indizes reparieren"
            >
              <Wrench className={`w-5 h-5 ${isRepairing ? 'animate-spin' : ''}`} />
            </button>
          )}

          <button onClick={onPrint} className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-gray-300 flex justify-center items-center" title="Drucken / PDF">
            <Printer className="w-5 h-5" />
          </button>
        </div>

        {/* NEU: Der Protokolle-Button zieht um in die Hauptleiste */}
        <div className="relative w-full md:w-auto md:flex-1">
          <button 
            onClick={() => setIsHistoryOpen(!isHistoryOpen)} 
            className={`w-full flex items-center justify-center px-4 py-2 rounded-lg font-bold transition-colors shadow-sm ${isHistoryOpen ? 'bg-blue-100 text-blue-700 border border-blue-200' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'}`}
            title="Historie dieses Projekts / dieser Reihe"
          >
            📜 Protokolle
          </button>
          
          {isHistoryOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsHistoryOpen(false)}></div>
              <div className="absolute left-0 top-full mt-1 w-full min-w-[250px] bg-white border border-gray-200 shadow-xl rounded-lg transition-all z-50 overflow-hidden">
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
        
        {/* Die regulären Aktions-Buttons (gleichberechtigt durch md:flex-1) */}
        {!isReadOnly && canManageEvents && currentEvent.status === 'PLANUNG' && !currentEvent.isPublished && (
          <button onClick={() => updateEvent({ ...currentEvent, isPublished: true })} className="w-full md:w-auto md:flex-1 px-4 py-2 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 shadow-sm flex justify-center items-center">
            Agenda veröffentlichen
          </button>
        )}
        
        {!isReadOnly && canManageEvents && currentEvent.status === 'PLANUNG' && currentEvent.isPublished && (
          <button onClick={() => updateEvent({ ...currentEvent, status: 'AKTIV', isPublished: true })} className="w-full md:w-auto md:flex-1 px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 shadow-sm flex justify-center items-center">
            Sitzung starten
          </button>
        )}
        
        {!isReadOnly && canManageEvents && (
          <button onClick={onToggleLibrary} className="w-full md:w-auto md:flex-1 flex items-center justify-center px-4 py-2 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors">
            {isLibraryVisible ? <><ChevronRight className="w-4 h-4 mr-2" /> Fokus-Modus</> : <><ChevronLeft className="w-4 h-4 mr-2" /> Vorlagen einblenden</>}
          </button>
        )}
      </div>
    </div>
  );
};
// --- END OF FILE ---