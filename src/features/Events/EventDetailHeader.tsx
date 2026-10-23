// [2026-10-23] - UX-UPGRADE: Reiner, ruhiger Sitzungs-Kopf ohne Button-Überfrachtung. Zurück-Pfeil und Titel bleiben garantiert in einer Linie (kein Umbruch über den Titel mehr); sämtliche Werkzeug- und Steuer-Buttons (Protokolle, Vorlagen, Veröffentlichen, Drucken, Reparatur) ziehen gebündelt in die graue Protokoll-Leiste um.
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
import { ArrowLeft, Calendar, MapPin, Clock, ChevronUp, ChevronDown, Users, Edit2 } from 'lucide-react';
import type { Event } from '../../core/types/models';

interface EventDetailHeaderProps {
  eventId: string;
  currentEvent: Event;
  isReadOnly: boolean;
  invitedUserIds: string[];
  timeString: string;
  pastEvents?: Event[];
  isLibraryVisible?: boolean;
  searchTerm?: string;
  onSearchChange?: (term: string) => void;
  onToggleLibrary?: () => void;
  onEditEvent: () => void;
  onCheckAttendance: () => void;
  onPrint?: () => void;
}

export const EventDetailHeader: React.FC<EventDetailHeaderProps> = ({
  currentEvent, isReadOnly, invitedUserIds, timeString, onEditEvent, onCheckAttendance
}) => {
  const navigate = useNavigate();
  const { user, roleProfiles } = useClubStore();

  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('papa_event_header_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleHeaderCollapsed = () => {
    setIsHeaderCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem('papa_event_header_collapsed', String(next));
      } catch {
        // Ignore storage errors
      }
      return next;
    });
  };

  // RECHTE-CHECK (Participation-First)
  const userRoleProfile = roleProfiles?.find(p => p.id === user?.roleProfileId);
  const canManageEvents = !!userRoleProfile?.permissions?.manageEvents || !!(user?.permissions as any)?.manageEvents;

  return (
    <div className="mb-1.5 print:!mb-4">
      {/* ZEILE 1: Zurück-Pfeil + Voller Sitzungstitel + Status links | Kurz-Metadaten (wenn eingeklappt) + Einklapp-Pfeil rechts */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <button
            onClick={() => navigate(-1)}
            className="p-1 -ml-1 text-gray-400 hover:text-blue-600 hover:bg-gray-100 rounded-lg transition-colors shrink-0 print:!hidden print:!absolute print:!w-0 print:!h-0"
            title="Zurück"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <h1 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 print:!text-black truncate min-w-0" title={currentEvent.title}>
            {currentEvent.title}
          </h1>

          {!isReadOnly && canManageEvents && (
            <button
              onClick={onEditEvent}
              className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors print:!hidden shrink-0"
              title="Projekt / Sitzung bearbeiten"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          )}

          {currentEvent.status === 'PLANUNG' && !currentEvent.isPublished && (
            <span className="text-[11px] font-semibold bg-gray-200 text-gray-700 px-2 py-0.5 rounded uppercase print:!border print:!border-gray-400 print:!bg-transparent print:!text-gray-800 shrink-0">
              Entwurf
            </span>
          )}
          {currentEvent.status === 'PLANUNG' && currentEvent.isPublished && (
            <span className="text-[11px] font-semibold bg-purple-100 text-purple-700 px-2 py-0.5 rounded uppercase border border-purple-200 print:!border-gray-400 print:!text-gray-800 print:!bg-transparent shrink-0">
              Agenda Veröffentlicht
            </span>
          )}
          {isReadOnly && (
            <span className="text-[11px] font-semibold bg-gray-600 text-white px-2 py-0.5 rounded uppercase print:!border print:!border-gray-400 print:!text-gray-800 print:!bg-transparent shrink-0">
              Versiegelt
            </span>
          )}
        </div>

        {/* Rechts: Kompakte Eckdaten (wenn eingeklappt) + Einklapp-Button */}
        <div className="flex items-center gap-2 shrink-0 print:!hidden">
          {isHeaderCollapsed && (
            <div className="hidden md:flex items-center text-xs text-gray-500 gap-2.5 mr-1">
              {currentEvent.plannedStartTime && (
                <span className="flex items-center whitespace-nowrap">
                  <Calendar className="w-3.5 h-3.5 mr-1 text-gray-400" />
                  {new Date(currentEvent.plannedStartTime).toLocaleDateString()}
                </span>
              )}
              {timeString && (
                <span className="flex items-center whitespace-nowrap">
                  <Clock className="w-3.5 h-3.5 mr-1 text-gray-400" />
                  {timeString} Uhr
                </span>
              )}
              {currentEvent.location && (
                <span className="hidden xl:flex items-center whitespace-nowrap truncate max-w-[160px]" title={currentEvent.location}>
                  <MapPin className="w-3.5 h-3.5 mr-1 text-gray-400 shrink-0" />
                  {currentEvent.location}
                </span>
              )}
              {currentEvent.status !== 'PLANUNG' && (
                <span
                  onClick={() => !isReadOnly && onCheckAttendance()}
                  className={`flex items-center px-1.5 py-0.5 rounded border text-[11px] font-medium whitespace-nowrap ${!isReadOnly ? 'cursor-pointer hover:opacity-80' : ''} ${currentEvent.attendanceConfirmed ? 'bg-green-50 text-green-700 border-green-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'}`}
                  title={!isReadOnly ? 'Klicken zum Prüfen der Anwesenheit' : 'Anwesenheit'}
                >
                  <Users className="w-3 h-3 mr-1" />
                  {currentEvent.actualAttendeeUserIds?.length || 0}/{invitedUserIds.length} da
                </span>
              )}
            </div>
          )}

          <button
            onClick={toggleHeaderCollapsed}
            className="p-1 bg-white text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md border border-gray-200 transition-colors flex items-center justify-center"
            title={isHeaderCollapsed ? 'Sitzungs-Details (Datum, Ort, Beschreibung) aufklappen' : 'Sitzungs-Details einklappen'}
          >
            {isHeaderCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* ZEILE 2: Kompakte Metadaten & Beschreibung (ausgeblendet wenn Header eingeklappt, beim Drucken immer sichtbar) */}
      <div className={`${isHeaderCollapsed ? 'hidden print:!block' : 'block'} mt-0.5 pl-0 md:pl-7`}>
        <div className="flex items-center text-xs text-gray-500 gap-x-3 gap-y-1 flex-wrap print:!text-black print:!text-sm">
          {currentEvent.plannedStartTime && (
            <span
              onClick={() => !isReadOnly && canManageEvents && onEditEvent()}
              className={`flex items-center ${!isReadOnly && canManageEvents ? 'cursor-pointer hover:text-blue-600 hover:bg-gray-100 px-1 -ml-1 rounded transition-colors' : ''} print:!m-0 print:!p-0`}
              title={!isReadOnly && canManageEvents ? 'Klicken zum Bearbeiten' : ''}
            >
              <Calendar className="w-3.5 h-3.5 mr-1 text-gray-400 print:!hidden" />
              {new Date(currentEvent.plannedStartTime).toLocaleDateString()}
            </span>
          )}
          {timeString && (
            <span
              onClick={() => !isReadOnly && canManageEvents && onEditEvent()}
              className={`flex items-center ${!isReadOnly && canManageEvents ? 'cursor-pointer hover:text-blue-600 hover:bg-gray-100 px-1 -ml-1 rounded transition-colors' : ''} print:!m-0 print:!p-0`}
              title={!isReadOnly && canManageEvents ? 'Klicken zum Bearbeiten' : ''}
            >
              <Clock className="w-3.5 h-3.5 mr-1 text-gray-400 print:!hidden" />
              {timeString} Uhr
            </span>
          )}
          {(currentEvent.location || (!isReadOnly && canManageEvents)) && (
            <span
              onClick={() => !isReadOnly && canManageEvents && onEditEvent()}
              className={`flex items-center ${!isReadOnly && canManageEvents ? 'cursor-pointer hover:text-blue-600 hover:bg-gray-100 px-1 -ml-1 rounded transition-colors' : ''} print:!m-0 print:!p-0`}
              title={!isReadOnly && canManageEvents ? 'Klicken zum Bearbeiten' : ''}
            >
              <MapPin className="w-3.5 h-3.5 mr-1 text-gray-400 print:!hidden" />
              {currentEvent.location || <span className="italic text-gray-400">Ort hinzufügen</span>}
            </span>
          )}
          {currentEvent.status !== 'PLANUNG' && (
            <span className={`flex items-center px-2 py-0.5 rounded border text-xs print:!border-none print:!p-0 print:!bg-transparent print:!text-black ${currentEvent.attendanceConfirmed ? 'bg-green-50 text-green-700 border-green-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'}`}>
              <Users className="w-3.5 h-3.5 mr-1 print:!hidden" />
              {currentEvent.attendanceConfirmed ? 'Anwesenheit bestätigt' : 'Anwesenheit offen'}
              <span className="ml-1">({currentEvent.actualAttendeeUserIds?.length || 0} / {invitedUserIds.length} da)</span>
              {!isReadOnly && (
                <button onClick={onCheckAttendance} className="ml-1.5 font-bold hover:underline print:!hidden">
                  (Prüfen)
                </button>
              )}
            </span>
          )}

          {currentEvent.description && (
            <span
              onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
              className={`text-xs text-gray-500 italic cursor-pointer hover:text-gray-700 ${isDescriptionExpanded ? 'w-full mt-0.5 whitespace-pre-wrap' : 'truncate max-w-md lg:max-w-2xl'} print:!w-full print:!max-w-none print:!whitespace-normal print:!text-black`}
              title={`${currentEvent.description} (Klicken zum Ein-/Ausklappen)`}
            >
              • {currentEvent.description}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
// --- END OF FILE ---