// [2026-10-09] - UX-FEATURE: Interaktive Logistik (Self-Service) auch direkt im Kalender-Detail-Modal verfügbar gemacht (+ Ich und Tausch-Logik).
// [2026-10-09] - FEATURE: Logistik-Integration (Fahrer/Betreuer). Helfer sehen eingeteilte Logistik direkt in den Termindetails und können über den neuen Button in den Matrix-Self-Service (Tauschbörse) abspringen.
// [2026-10-08] - FEATURE: EventPollWidget (WhatsApp-Style RSVP/Umfrage) im Termin-Detail eingebunden.
// [2026-10-06] - FEATURE: nuScore Scanner eingebaut. Extrahiert Spiel-Codes und Unterschriften-PINs dynamisch per Mustererkennung aus dem Wettkampf-Tresor und zeigt sie mit Copy-Button im Termin-Detail an.
// [2026-09-28] - UX-FEATURE: Read-Only Modus der Aufstellungs-Matrix auch im Kalender-Detail für reguläre Teammitglieder freigeschaltet.
// [2026-09-28] - BUGFIX: Titel-Abgleich repariert. (Emojis wie 🏠/🚌 aus dem Kalender verhinderten den exakten Titel-Match, wodurch die Schatten-Akte nicht gefunden wurde).
// [2026-09-28] - UX-FIX: Das vollständige Datum wird nun wieder prominent direkt unter dem Titel angezeigt.
// [2026-09-28] - FEATURE: Lineup-Integration (Aufstellung) implementiert. Zeigt nun für Matches den Kader (Base & Overrides) an.
// [2026-09-28] - FEATURE: WhatsApp-Share Funktion (inklusive berechnetem Kader) hinzugefügt.
// src/features/Events/CalendarIcsDetailModal.tsx
import React, { useState } from 'react';
import { useClubStore } from '../../store/useClubStore';
import { X, MapPin, AlignLeft, Calendar as CalIcon, Clock, Info, Edit3, UserPlus, Users, MessageCircle, Key, Copy, Check, Truck } from 'lucide-react';
import { MatchLineupMatrixModal } from '../Users/components/MatchLineupMatrixModal';
import { EventPollWidget } from './components/EventPollWidget';
import type { MatchLineup } from '../../core/types/models';

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
  const { user, teams, helpers, calendarSubscriptions, matchLineups, teamPins, saveMatchLineup } = useClubStore();
  const [isMatrixOpen, setIsMatrixOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

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
  
  const hasLogistics = !!(teamContext?.requiresBetreuer || teamContext?.requiresFahrer);
  const showMatrixButton = canManageLineup || isTeamMember || hasLogistics;

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

  // --- LOGISTIK ENGINE (INTERAKTIV) ---
  const handleLogisticsAction = async (type: 'fahrerHelperIds' | 'betreuerHelperIds', action: 'add' | 'remove' | 'takeover', targetHelperId: string, oldHelperId?: string) => {
    if (!safeEventId || !teamContext) return;

    const currentLineup = matchLineups.find(m => m.id === safeEventId);
    const currentIds = currentLineup?.[type] || [];
    let newIds = [...currentIds];

    if (action === 'add') {
      if (!newIds.includes(targetHelperId)) newIds.push(targetHelperId);
    } else if (action === 'remove') {
      newIds = newIds.filter(id => id !== targetHelperId);
    } else if (action === 'takeover' && oldHelperId) {
      newIds = newIds.filter(id => id !== oldHelperId);
      if (!newIds.includes(targetHelperId)) newIds.push(targetHelperId);
    }

    const newLineup: MatchLineup = {
      id: safeEventId,
      schemaVersion: '1.0',
      teamId: teamContext.id,
      lineupHelperIds: currentLineup?.lineupHelperIds || teamContext.defaultLineupHelperIds || [],
      availabilities: currentLineup?.availabilities || {},
      isSetByMF: currentLineup?.isSetByMF || {},
      isLocked: currentLineup?.isLocked,
      betreuerHelperIds: type === 'betreuerHelperIds' ? newIds : (currentLineup?.betreuerHelperIds || []),
      fahrerHelperIds: type === 'fahrerHelperIds' ? newIds : (currentLineup?.fahrerHelperIds || []),
      updatedAt: Date.now()
    };

    await saveMatchLineup(newLineup);
  };

  const renderLogistics = (type: 'fahrerHelperIds' | 'betreuerHelperIds', label: string) => {
    const ids = storeLineup?.[type] || [];
    const isPast = event.start.getTime() < Date.now();

    return (
      <div>
        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5">{label}</span>
        <div className="flex flex-wrap items-center gap-1.5">
          {ids.map(id => {
            const h = helpers.find(x => x.id === id);
            if (!h) return null;
            const isMe = id === myHelperId;

            return (
              <button
                key={id}
                onClick={(e) => {
                  e.stopPropagation();
                  if (isPast) return;
                  if (canManageLineup) {
                    if (window.confirm(`Möchtest du ${h.name} als ${label.split(' ')[1]} entfernen?`)) {
                      handleLogisticsAction(type, 'remove', id);
                    }
                  } else if (!isMe) {
                    if (window.confirm(`Möchtest du den Dienst von ${h.name} wirklich übernehmen?`)) {
                      if (myHelperId) handleLogisticsAction(type, 'takeover', myHelperId, id);
                    }
                  }
                }}
                disabled={isPast || (!canManageLineup && isMe)}
                className={`inline-block px-2 py-1.5 rounded text-xs font-bold shadow-sm transition-colors ${isMe ? 'bg-purple-100 text-purple-800 border border-purple-200' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'}`}
                title={canManageLineup ? "Klicken zum Entfernen" : (!isMe ? "Klicken zum Übernehmen (Tauschen)" : "Du bist fest eingeteilt")}
              >
                {h.alias || h.name.split(' ')[0]}
              </button>
            );
          })}

          {/* Action-Button: Hinzufügen / Ich */}
          {!isPast && myHelperId && !ids.includes(myHelperId) && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (window.confirm(`Möchtest du dich verbindlich als ${label.split(' ')[1]} eintragen?`)) {
                  handleLogisticsAction(type, 'add', myHelperId);
                }
              }}
              className="text-[11px] font-bold bg-white border border-dashed border-gray-300 text-gray-500 rounded px-2.5 py-1.5 hover:bg-gray-50 hover:border-gray-400 transition-colors shadow-sm"
              title="Dienst verbindlich übernehmen"
            >
              + Ich
            </button>
          )}

          {ids.length === 0 && (!myHelperId || ids.includes(myHelperId)) && (
            <span className="text-xs text-gray-500 italic py-1">Noch offen</span>
          )}
        </div>
      </div>
    );
  };
  // ---------------------

  // --- NUSCORE SCANNER LOGIC ---
  const pad = (n: number) => String(n).padStart(2, '0');
  const searchDate = `${pad(event.start.getDate())}.${pad(event.start.getMonth() + 1)}.${event.start.getFullYear()}`;
  const searchTime = !event.allDay ? `${pad(event.start.getHours())}:${pad(event.start.getMinutes())}` : undefined;

  const teamPin = teamContext ? teamPins.find(p => p.teamName === teamContext.name) : null;

  const extractCode = (text: string | undefined, dateStr: string, timeStr?: string) => {
    if (!text) return null;
    const lines = text.split('\n');
    let match = timeStr ? lines.find(line => line.includes(dateStr) && line.includes(timeStr)) : undefined;
    if (!match) match = lines.find(line => line.includes(dateStr));
    
    if (match) {
      const words = match.trim().split(/\s+/);
      return words[words.length - 1]; // Letztes Wort schnappen
    }
    return null;
  };

  const gameCode = teamPin ? extractCode(teamPin.gameEntryPinsText, searchDate, searchTime) : null;
  const signaturePin = teamPin ? extractCode(teamPin.signaturePinsText, searchDate, searchTime) : null;
  
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };
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
              <>
                {/* CHIRURGISCHER EINGRIFF: nuScore Wettkampf-Codes Scanner */}
                {(gameCode || signaturePin) && (
                  <div className="flex items-start text-gray-700 pt-6 border-t border-gray-200">
                    <Key className="w-5 h-5 mr-3 mt-0.5 text-gray-400 shrink-0" />
                    <div className="flex-1">
                      <p className="font-medium text-sm mb-2">Wettkampf-Codes (nuScore)</p>
                      <div className="flex flex-wrap gap-2">
                        {gameCode && (
                          <button 
                            onClick={() => handleCopy(gameCode, 'game')}
                            className="flex items-center bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-1.5 rounded-lg text-sm font-mono font-bold transition-colors border border-gray-300"
                            title="Spiel-Code kopieren"
                          >
                            <span className="text-gray-500 mr-2 font-sans text-xs uppercase tracking-wider">Spiel:</span>
                            {gameCode}
                            {copiedId === 'game' ? <Check className="w-3.5 h-3.5 ml-2 text-green-600" /> : <Copy className="w-3.5 h-3.5 ml-2 text-gray-400" />}
                          </button>
                        )}
                        {signaturePin && (
                          <button 
                            onClick={() => handleCopy(signaturePin, 'sig')}
                            className="flex items-center bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-1.5 rounded-lg text-sm font-mono font-bold transition-colors border border-gray-300"
                            title="Unterschriften-PIN kopieren"
                          >
                            <span className="text-gray-500 mr-2 font-sans text-xs uppercase tracking-wider">PIN:</span>
                            {signaturePin}
                            {copiedId === 'sig' ? <Check className="w-3.5 h-3.5 ml-2 text-green-600" /> : <Copy className="w-3.5 h-3.5 ml-2 text-gray-400" />}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="flex items-start text-gray-700 pt-6 border-t border-gray-200">
                  <Users className="w-5 h-5 mr-3 mt-0.5 text-gray-400 shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium text-sm">Aufstellung / Kader ({activePlayers.length})</p>
                      <div className="flex gap-2">
                        <button onClick={handleWhatsAppShare} className="text-green-600 hover:text-green-700 hover:bg-green-50 p-1.5 rounded-lg transition-colors flex items-center" title="Über WhatsApp in der Mannschaftsgruppe teilen">
                          <MessageCircle className="w-4 h-4" />
                        </button>
                        
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

                {/* NEU: LOGISTIK & BETREUUNG (INTERAKTIV) */}
                {hasLogistics && (
                  <div className="flex items-start text-gray-700 pt-6 border-t border-gray-200">
                    <Truck className="w-5 h-5 mr-3 mt-0.5 text-gray-400 shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-3">
                        <p className="font-medium text-sm">Logistik & Betreuung</p>
                      </div>
                      
                      <div className="flex flex-col gap-3">
                        {teamContext.requiresBetreuer && renderLogistics('betreuerHelperIds', '🧑‍🏫 Betreuer')}
                        {teamContext.requiresFahrer && renderLogistics('fahrerHelperIds', '🚗 Fahrer')}
                      </div>
                      
                      <button 
                        onClick={() => setIsMatrixOpen(true)}
                        className="mt-4 w-full py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-sm font-bold rounded-lg transition-colors border border-blue-200 flex justify-center items-center shadow-sm"
                      >
                        Vollständigen Saison-Fahrplan öffnen
                      </button>
                    </div>
                  </div>
                )}
              </>
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
            
            {/* --- NEU: RSVP / UMFRAGE WIDGET --- */}
            {event.sourceEvent?.pollConfig?.isActive && (
              <EventPollWidget 
                eventId={event.sourceEvent.id} 
                pollConfig={event.sourceEvent.pollConfig} 
              />
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

      {/* MATRIX MODAL RENDERER */}
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