// [2026-09-28] - UX-FEATURE: Read-Only Modus der Aufstellungs-Matrix auch im Kalender-Detail für reguläre Teammitglieder freigeschaltet.
// [2026-09-28] - BUGFIX: Titel-Abgleich repariert. (Emojis wie 🏠/🚌 aus dem Kalender verhinderten den exakten Titel-Match, wodurch die Schatten-Akte nicht gefunden wurde).
// [2026-09-28] - UX-FIX: Das vollständige Datum wird nun wieder prominent direkt unter dem Titel angezeigt.
// [2026-09-28] - FEATURE: Lineup-Integration (Aufstellung) implementiert. Zeigt nun für Matches den Kader (Base & Overrides) an.
// [2026-09-28] - FEATURE: WhatsApp-Share Funktion (inklusive berechnetem Kader) hinzugefügt.
// src/features/Events/CalendarIcsDetailModal.tsx
import React, { useState } from 'react';
import { useClubStore } from '../../store/useClubStore';
import { X, MapPin, AlignLeft, Calendar as CalIcon, Clock, Info, Edit3, UserPlus, Users, MessageCircle } from 'lucide-react';
import { MatchLineupMatrixModal } from '../Users/components/MatchLineupMatrixModal';

interface Props {
  event: any; // Das AdaptedEvent aus dem Kalender
  onClose: () => void;
  canEdit?: boolean;
  onEdit?: () => void;
  canTakeOver?: boolean;
  onTakeOver?: () => void;
}

const sanitizeId = (id: string) => id.replace(/[\/\\.#$\[\]]/g, '_');

export const CalendarIcsDetailModal: React.FC<Props> = ({ 
  event, 
  onClose, 
  canEdit, 
  onEdit, 
  canTakeOver, 
  onTakeOver 
}) => {
  const { user, teams, helpers, calendarSubscriptions, matchLineups } = useClubStore();
  const [isMatrixOpen, setIsMatrixOpen] = useState(false);

  if (!event) return null;

  // --- LINEUP LOGIC ---
  const sub = calendarSubscriptions.find(s => s.id === event.sourceId);
  const teamId = sub?.reminderRecipientTeamIds?.[0];
  const teamContext = teamId ? teams.find(t => t.id === teamId) : null;
  
  const myHelper = helpers.find(h => h.email?.toLowerCase() === user?.email?.toLowerCase());
  const myHelperId = myHelper?.id;
  
  const isAdmin = user?.roleProfileId === 'pro-admin';
  const isCaptain = teamContext?.captainHelperIds?.includes(myHelperId || '');
  const canManageLineup = isAdmin || isCaptain;
  const isTeamMember = myHelperId && teamContext ? myHelper?.teamIds?.includes(teamContext.id) : false;
  
  // Darf der Nutzer den Matrix-Button überhaupt sehen? (Captain oder Mitglied)
  const showMatrixButton = canManageLineup || isTeamMember;

  // FIX: Wir nutzen 'includes' anstelle von '===', da der angezeigte Event-Titel evtl. 🏠/🚌 Emojis enthält
  const cachedEvent = sub?.cachedEvents?.find(ce => 
    ce.startTime === event.start.getTime() && 
    event.title.includes(ce.title)
  );
  
  const safeEventId = cachedEvent ? sanitizeId(cachedEvent.uid) : null;

  const storeLineup = matchLineups.find(m => m.id === safeEventId);
  const activePlayerIds = storeLineup ? storeLineup.lineupHelperIds : (teamContext?.defaultLineupHelperIds || []);
  
  const activePlayers = helpers
    .filter(h => activePlayerIds.includes(h.id))
    .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  // ---------------------

  const formatDateTime = (date: Date, allDay: boolean) => {
    const dateStr = date.toLocaleDateString('de-DE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    if (allDay) return dateStr;
    const timeStr = date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    return `${dateStr}, ${timeStr} Uhr`;
  };

  const renderTimeDetails = () => {
    const startStr = formatDateTime(event.start, event.allDay);
    
    if (event.end && event.end.getTime() > event.start.getTime()) {
      let visualEnd = event.end;
      if (event.allDay && event.end.getHours() === 0 && event.end.getMinutes() === 0) {
        visualEnd = new Date(event.end.getTime() - 1000); 
      }
      
      const startDayStr = event.start.toLocaleDateString('de-DE');
      const endDayStr = visualEnd.toLocaleDateString('de-DE');
      
      if (startDayStr !== endDayStr) {
        return (
          <>
            <p className="text-sm mt-0.5">{startStr}</p>
            <p className="text-sm text-gray-500">bis {formatDateTime(visualEnd, event.allDay)}</p>
          </>
        );
      } else if (!event.allDay) {
        return (
          <p className="text-sm mt-0.5">
            {startStr.split(',')[0]}, {event.start.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} - {event.end.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr
          </p>
        );
      }
    }
    return <p className="text-sm mt-0.5">{startStr}</p>;
  };

  const handleWhatsAppShare = () => {
    let timeStr = formatDateTime(event.start, event.allDay);
    if (!event.allDay && event.end && event.end.getTime() > event.start.getTime()) {
       timeStr += ` - ${event.end.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr`;
    }

    const text = `📅 *${event.title.replace(/\s\([^)]+\)$/, '')}*\n⏰ ${timeStr}\n📍 ${event.location || 'Kein Ort angegeben'}\n\n👟 *Kader (${activePlayers.length}):*\n${activePlayers.map(p => p.alias || p.name.split(' ')[0]).join(', ')}\n\n(Bitte sagt rechtzeitig ab, falls sich etwas ändert!)`;
    
    window.open(`whatsapp://send?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
          
          <div className="p-4 border-b border-gray-200 flex items-center justify-between" style={{ backgroundColor: event.color || '#10b981', color: 'white' }}>
            <h2 className="text-lg font-bold flex items-center">
              <Info className="w-5 h-5 mr-2" />
              Termin-Details
            </h2>
            <div className="flex items-center gap-2">
              {canEdit && (
                <button onClick={onEdit} className="p-1.5 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-colors" title="Termin bearbeiten">
                  <Edit3 className="w-5 h-5" />
                </button>
              )}
              <button onClick={onClose} className="p-1.5 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>
          
          <div className="p-6 overflow-y-auto space-y-6 bg-gray-50/50">
            
            {/* Header: Titel & Datum */}
            <div>
              <h3 className="text-xl font-bold text-gray-900 leading-tight">
                {event.title.replace(/\s\([^)]+\)$/, '')}
              </h3>
              
              <p className="text-xs font-bold text-gray-500 mt-1.5 uppercase tracking-wider">
                {event.start.toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
              </p>
              
              <span className="inline-block mt-3 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-gray-200 text-gray-700">
                {event.title.match(/\(([^)]+)\)$/)?.[1] || 'Abonnierter Kalender'}
              </span>
            </div>

            <div className="flex items-start text-gray-700">
              {event.allDay ? <CalIcon className="w-5 h-5 mr-3 mt-0.5 text-gray-400 shrink-0" /> : <Clock className="w-5 h-5 mr-3 mt-0.5 text-gray-400 shrink-0" />}
              <div>
                <p className="font-medium text-sm">Zeitpunkt</p>
                {renderTimeDetails()}
              </div>
            </div>

            {event.location && (
              <div className="flex items-start text-gray-700">
                <MapPin className="w-5 h-5 mr-3 mt-0.5 text-gray-400 shrink-0" />
                <div>
                  <p className="font-medium text-sm">Ort / Halle</p>
                  <p className="text-sm mt-0.5 whitespace-pre-wrap">{event.location}</p>
                  <a 
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-bold rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    <MapPin className="w-3.5 h-3.5 mr-1.5" />
                    In Google Maps öffnen
                  </a>
                </div>
              </div>
            )}

            {/* Die integrierte Spielerliste (Nur intern sichtbar, wenn Team verknüpft) */}
            {teamContext && (
              <div className="flex items-start text-gray-700 pt-6 border-t border-gray-200">
                <Users className="w-5 h-5 mr-3 mt-0.5 text-gray-400 shrink-0" />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium text-sm">Aufstellung / Kader ({activePlayers.length})</p>
                    <div className="flex gap-2">
                      <button onClick={handleWhatsAppShare} className="text-green-600 hover:text-green-700 hover:bg-green-50 p-1.5 rounded-lg transition-colors flex items-center" title="Über WhatsApp in der Mannschaftsgruppe teilen">
                        <MessageCircle className="w-4 h-4" />
                      </button>
                      
                      {/* CHIRURGISCHER EINGRIFF: Dynamischer Matrix-Button (Ansicht vs. Ändern) */}
                      {showMatrixButton && (
                        <button 
                          onClick={() => setIsMatrixOpen(true)} 
                          className={`p-1.5 rounded-lg transition-colors flex items-center ${canManageLineup ? 'text-blue-600 hover:text-blue-700 hover:bg-blue-50' : 'text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50'}`} 
                          title={canManageLineup ? "Aufstellung ändern (Matrix öffnen)" : "Saison-Übersicht ansehen"}
                        >
                          {canManageLineup ? <Edit3 className="w-4 h-4 mr-1.5" /> : <CalIcon className="w-4 h-4 mr-1.5" />}
                          <span className="text-xs font-bold">{canManageLineup ? 'Ändern' : 'Ansicht'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {activePlayers.length === 0 ? (
                      <span className="text-sm text-gray-500 italic">Keine Spieler eingeteilt.</span>
                    ) : (
                      activePlayers.map(p => (
                        <span key={p.id} className="inline-block bg-blue-50 text-blue-700 border border-blue-200 px-2 py-1 rounded text-xs font-bold shadow-sm">
                          {p.alias || p.name.split(' ')[0]}
                        </span>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {event.description && (
              <div className="flex items-start text-gray-700 pt-6 border-t border-gray-200">
                <AlignLeft className="w-5 h-5 mr-3 mt-0.5 text-gray-400 shrink-0" />
                <div className="flex-1">
                  <p className="font-medium text-sm">Details</p>
                  <div className="text-sm mt-1.5 bg-white p-3 border border-gray-200 rounded-lg whitespace-pre-wrap leading-relaxed shadow-sm">
                    {event.description}
                  </div>
                </div>
              </div>
            )}
            
          </div>

          <div className="p-4 border-t border-gray-200 bg-gray-50 flex flex-wrap-reverse justify-end gap-3">
            <button onClick={onClose} className="px-5 py-2 bg-gray-200 text-gray-800 hover:bg-gray-300 rounded-lg font-medium transition-colors">
              Schließen
            </button>
            {canTakeOver && (
              <button onClick={onTakeOver} className="px-5 py-2 bg-purple-600 text-white hover:bg-purple-700 rounded-lg font-bold flex items-center transition-colors shadow-sm">
                <UserPlus className="w-4 h-4 mr-2" />
                Dienst übernehmen
              </button>
            )}
          </div>
        </div>
      </div>

      {/* MATRIX MODAL RENDERER (Read-Only Status wird live durchgereicht) */}
      {isMatrixOpen && teamContext && (
        <MatchLineupMatrixModal 
          team={teamContext} 
          focusedEventId={safeEventId || undefined} 
          isReadOnly={!canManageLineup}
          onClose={() => setIsMatrixOpen(false)} 
        />
      )}
    </>
  );
};
// --- END OF FILE ---