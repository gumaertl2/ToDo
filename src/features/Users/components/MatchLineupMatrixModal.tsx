// [2026-09-28] - UX-FEATURE: 'isReadOnly' Prop hinzugefügt. Erlaubt einfachen Team-Mitgliedern die Ansicht der Matrix, ohne Schreibrechte zu gewähren.
// [2026-09-28] - UX-FEATURE: 'focusedEventId' Prop hinzugefügt. Zieht ein bestimmtes Spiel an die Spitze der Matrix und hebt es farblich hervor.
// [2026-09-28] - SEC-FIX: ID-Sanitizer hinzugefügt, um iCal-Sonderzeichen (wie '/') für Firestore-Pfade unschädlich zu machen.
// [2026-09-28] - BUGFIX: Strikte Auswertung von result.success beim Speichern (verhindert unsichtbare Firebase-Permission-Fehler).
// [2026-09-28] - BUGFIX: Optimistic UI (lokaler State) implementiert, damit Checkboxen sofort reagieren.
// src/features/Users/components/MatchLineupMatrixModal.tsx
import React, { useMemo, useState } from 'react';
import { useClubStore } from '../../../store/useClubStore';
import { X, Calendar as CalendarIcon, Lock, CheckSquare, Square, UserPlus, Search, Users } from 'lucide-react';
import type { Team, MatchLineup, Helper } from '../../../core/types/models';

interface MatchLineupMatrixModalProps {
  team: Team;
  focusedEventId?: string;
  isReadOnly?: boolean; // <-- NEU: Steuert den Ansichts-Modus
  onClose: () => void;
}

type PlayerCategory = 'STAMM' | 'KADER' | 'EXTERN';

// Hilfsfunktion: Macht iCal-UIDs sicher für Firestore Dokument-Pfade
const sanitizeId = (id: string) => id.replace(/[\/\\.#$\[\]]/g, '_');

export const MatchLineupMatrixModal: React.FC<MatchLineupMatrixModalProps> = ({ team, focusedEventId, isReadOnly, onClose }) => {
  const { helpers, calendarSubscriptions, matchLineups, saveMatchLineup } = useClubStore();
  const [tempJokers, setTempJokers] = useState<string[]>([]);
  const [isJokerMenuOpen, setIsJokerMenuOpen] = useState(false);
  const [jokerSearchTerm, setJokerSearchTerm] = useState('');
  
  const [localOverrides, setLocalOverrides] = useState<Record<string, string[]>>({});

  const displayMembers = useMemo(() => {
    const defaultIds = new Set(team.defaultLineupHelperIds || []);
    const teamMemberIds = new Set(helpers.filter(h => h.teamIds?.includes(team.id)).map(h => h.id));
    
    const usedExternalJokerIds = new Set<string>();
    matchLineups.filter(m => m.teamId === team.id).forEach(lineup => {
      lineup.lineupHelperIds.forEach(id => {
        if (!teamMemberIds.has(id)) usedExternalJokerIds.add(id);
      });
    });
    tempJokers.forEach(id => {
      if (!teamMemberIds.has(id)) usedExternalJokerIds.add(id);
    });

    const sortFn = (a: Helper, b: Helper) => (a.name || '').localeCompare(b.name || '');

    const stamm = helpers.filter(h => defaultIds.has(h.id)).sort(sortFn);
    const kader = helpers.filter(h => teamMemberIds.has(h.id) && !defaultIds.has(h.id)).sort(sortFn);
    const extern = helpers.filter(h => usedExternalJokerIds.has(h.id)).sort(sortFn);

    const combined: { helper: Helper; category: PlayerCategory }[] = [];
    stamm.forEach(h => combined.push({ helper: h, category: 'STAMM' }));
    kader.forEach(h => combined.push({ helper: h, category: 'KADER' }));
    extern.forEach(h => combined.push({ helper: h, category: 'EXTERN' }));

    return combined;
  }, [helpers, team, matchLineups, tempJokers]);

  const availableJokers = useMemo(() => {
    const currentDisplayIds = new Set(displayMembers.map(item => item.helper.id));
    const term = jokerSearchTerm.toLowerCase().trim();
    
    return helpers
      .filter(h => !currentDisplayIds.has(h.id))
      .filter(h => !term || (h.name || '').toLowerCase().includes(term) || (h.alias || '').toLowerCase().includes(term))
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [helpers, displayMembers, jokerSearchTerm]);

  const linkedSubscription = useMemo(() => {
    return calendarSubscriptions.find(sub => sub.reminderRecipientTeamIds?.includes(team.id));
  }, [calendarSubscriptions, team.id]);

  const events = useMemo(() => {
    if (!linkedSubscription || !linkedSubscription.cachedEvents) return [];
    const sorted = [...linkedSubscription.cachedEvents].sort((a, b) => a.startTime - b.startTime);
    
    if (focusedEventId) {
      const focusIndex = sorted.findIndex(e => sanitizeId(e.uid) === focusedEventId);
      if (focusIndex > -1) {
        const [focusedEvent] = sorted.splice(focusIndex, 1);
        sorted.unshift(focusedEvent);
      }
    }
    
    return sorted;
  }, [linkedSubscription, focusedEventId]);

  const handleTogglePlayer = async (rawEventId: string, helperId: string, currentActiveIds: string[]) => {
    if (isReadOnly) return; // Doppelter Schutz

    const safeEventId = sanitizeId(rawEventId);
    
    const newActiveIds = currentActiveIds.includes(helperId)
      ? currentActiveIds.filter(id => id !== helperId)
      : [...currentActiveIds, helperId];

    setLocalOverrides(prev => ({ ...prev, [safeEventId]: newActiveIds }));

    const newLineup: MatchLineup = {
      id: safeEventId,
      schemaVersion: '1.0',
      teamId: team.id,
      lineupHelperIds: newActiveIds,
      updatedAt: Date.now()
    };

    const result = await saveMatchLineup(newLineup);
    
    if (!result.success) {
      console.error("Datenbank-Fehler beim Speichern der Matrix:", result.error);
      alert(`SPEICHERN FEHLGESCHLAGEN!\n\nFirebase meldet: ${result.error?.message || 'Unbekannter Fehler'}`);
      
      setLocalOverrides(prev => {
        const next = { ...prev };
        delete next[safeEventId];
        return next;
      });
    }
  };

  const handleAddJoker = (helperId: string) => {
    setTempJokers(prev => [...prev, helperId]);
    setIsJokerMenuOpen(false);
    setJokerSearchTerm('');
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[110] flex items-center justify-center p-0 md:p-4">
      <div className="bg-white rounded-none md:rounded-xl shadow-2xl w-full max-w-7xl overflow-hidden flex flex-col h-full md:max-h-[90vh]">
        
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between bg-gray-50 shrink-0 gap-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900 flex items-center">
              <CalendarIcon className="w-5 h-5 mr-2 text-blue-600" />
              {focusedEventId 
                ? (isReadOnly ? 'Kader-Übersicht' : 'Aufstellung ändern') 
                : (isReadOnly ? `Saison-Übersicht: ${team.name}` : `Saison-Planung: ${team.name}`)}
            </h2>
            {linkedSubscription && (
              <p className="text-xs text-gray-500 mt-1">Team: {team.name} | Abo: {linkedSubscription.name}</p>
            )}
          </div>
          
          <div className="flex items-center gap-3 w-full sm:w-auto">
            {/* Joker Button nur für Captains sichtbar */}
            {!isReadOnly && linkedSubscription && (
              <div className="relative">
                <button 
                  onClick={() => setIsJokerMenuOpen(!isJokerMenuOpen)}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-bold text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
                >
                  <UserPlus className="w-4 h-4 text-blue-600" />
                  + Weiterer Spieler
                </button>
                
                {isJokerMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsJokerMenuOpen(false)}></div>
                    <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 overflow-hidden flex flex-col">
                      <div className="p-3 border-b border-gray-100 bg-gray-50 flex items-center relative">
                        <Search className="w-4 h-4 text-gray-400 absolute left-5" />
                        <input 
                          autoFocus
                          type="text"
                          placeholder="Name suchen..."
                          value={jokerSearchTerm}
                          onChange={(e) => setJokerSearchTerm(e.target.value)}
                          className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      <div className="max-h-60 overflow-y-auto p-1">
                        {availableJokers.length === 0 ? (
                          <div className="p-4 text-center text-sm text-gray-500">Keine Spieler gefunden.</div>
                        ) : (
                          availableJokers.map(j => (
                            <button
                              key={j.id}
                              onClick={() => handleAddJoker(j.id)}
                              className="w-full text-left px-3 py-2 text-sm text-gray-800 hover:bg-blue-50 hover:text-blue-700 rounded-lg transition-colors flex items-center justify-between"
                            >
                              <span className="font-medium">{j.name}</span>
                              {j.alias && <span className="text-xs text-gray-400">{j.alias}</span>}
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 bg-white p-1.5 rounded-full shadow-sm border border-gray-200 shrink-0 hidden md:block">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body Container */}
        <div className="flex-1 overflow-auto bg-gray-50 relative">
          {!linkedSubscription ? (
            <div className="p-10 text-center text-gray-500 flex flex-col items-center justify-center h-full">
              <CalendarIcon className="w-12 h-12 text-gray-300 mb-3" />
              <h3 className="text-lg font-bold text-gray-900 mb-2">Kein Kalender-Abo gefunden</h3>
              <p className="text-sm max-w-md mx-auto">
                Um die Saison planen zu können, muss unter "Einstellungen & Kalender" bei einem Kalender-Abo 
                das Team "{team.name}" als Erinnerungs-Empfänger hinterlegt sein.
              </p>
            </div>
          ) : events.length === 0 ? (
            <div className="p-10 text-center text-gray-500 flex flex-col items-center justify-center h-full">
              Keine Termine im verknüpften Kalender gefunden.
            </div>
          ) : (
            <table className="w-full border-separate border-spacing-0 bg-white">
              <thead>
                <tr>
                  <th className="sticky top-0 left-0 z-30 bg-gray-100 border-b-2 border-r-2 border-gray-200 px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider w-[240px] sm:w-[280px] shadow-[1px_1px_0px_0px_#e5e7eb]">
                    Termin / Spiel
                  </th>
                  {displayMembers.map(({ helper: m, category }) => (
                    <th key={m.id} className="sticky top-0 z-20 bg-gray-100 border-b-2 border-b-gray-200 border-r border-gray-100 px-2 py-3 text-center text-[10px] font-bold text-gray-600 uppercase tracking-wider min-w-[75px] shadow-[0px_1px_0px_0px_#e5e7eb]">
                      <div className="truncate px-1" title={m.name}>{m.alias || m.name.split(' ')[0]}</div>
                      {category === 'STAMM' && <div className="text-[8px] text-green-600 font-extrabold mt-0.5">Stamm</div>}
                      {category === 'KADER' && <div className="text-[8px] text-blue-600 font-extrabold mt-0.5">Bank</div>}
                      {category === 'EXTERN' && <div className="text-[8px] text-orange-500 font-extrabold mt-0.5">Extern</div>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {events.map((event) => {
                  const eventDate = new Date(event.startTime);
                  const isPast = event.startTime < Date.now();
                  
                  const safeEventId = sanitizeId(event.uid);
                  const isFocusedRow = focusedEventId === safeEventId;
                  
                  const storeLineup = matchLineups.find(m => m.id === safeEventId);
                  const hasLocalOverride = localOverrides[safeEventId] !== undefined;
                  
                  let activePlayers: string[] = [];
                  let isOverride = false;

                  if (hasLocalOverride) {
                    activePlayers = localOverrides[safeEventId];
                    isOverride = true; 
                  } else if (storeLineup) {
                    activePlayers = storeLineup.lineupHelperIds;
                    isOverride = true; 
                  } else {
                    activePlayers = team.defaultLineupHelperIds || [];
                  }
                  
                  const rowBg = isFocusedRow ? 'bg-blue-50/80' : (isPast ? 'bg-gray-100' : 'bg-white');
                  const borderClasses = isFocusedRow ? 'border-b-4 border-t-4 border-blue-500 z-10 relative' : 'border-b border-gray-200';
                  
                  const shortDate = eventDate.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
                  const shortTime = eventDate.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });

                  return (
                    <tr key={event.uid} className={`group ${isFocusedRow ? 'bg-blue-50' : (isPast ? 'hover:bg-gray-200' : 'hover:bg-blue-50/40')} transition-colors`}>
                      
                      <td className={`sticky left-0 z-10 ${rowBg} group-hover:bg-inherit ${borderClasses} border-r-2 px-4 py-3 w-[240px] sm:w-[280px] align-middle shadow-[1px_0px_0px_0px_#e5e7eb]`}>
                        <div className="flex flex-col whitespace-normal">
                          {isFocusedRow && (
                            <span className="text-[9px] font-bold text-blue-700 bg-blue-100 border border-blue-200 px-1.5 py-0.5 rounded uppercase tracking-wider mb-1.5 w-max">
                              Ausgewähltes Spiel
                            </span>
                          )}
                          <span className={`font-bold text-sm line-clamp-2 leading-snug ${isPast ? 'text-gray-500' : 'text-gray-900'}`} title={event.title}>
                            {isPast && !isFocusedRow && <Lock className="w-3 h-3 text-gray-400 inline-block shrink-0 mr-1.5 -mt-0.5" />}
                            {event.title}
                          </span>
                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            <span className="text-[11px] font-medium text-gray-500">
                              {shortDate} • {shortTime} Uhr
                            </span>
                            <span className={`flex items-center gap-1 text-[11px] font-bold px-1.5 py-0.5 rounded border ${isOverride ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`} title={`${activePlayers.length} Spieler eingeteilt`}>
                              <Users className="w-3 h-3" /> {activePlayers.length}
                            </span>
                          </div>
                        </div>
                      </td>
                      
                      {displayMembers.map(({ helper: m, category }) => {
                        const isPlaying = activePlayers.includes(m.id);
                        let checkColor = 'text-blue-600';
                        if (isOverride) checkColor = 'text-orange-500';
                        else if (category === 'STAMM') checkColor = 'text-green-600';

                        return (
                          <td 
                            key={m.id} 
                            onClick={() => {
                              if (!isReadOnly && (!isPast || isFocusedRow)) handleTogglePlayer(event.uid, m.id, activePlayers);
                            }}
                            className={`p-0 align-middle ${borderClasses} border-r border-gray-100 ${rowBg} transition-colors ${
                              isReadOnly
                                ? 'cursor-default opacity-80 hover:bg-gray-50'
                                : ((isPast && !isFocusedRow)
                                  ? 'cursor-not-allowed opacity-50' 
                                  : 'cursor-pointer group-hover:bg-blue-100/60 hover:bg-blue-200/80')
                            }`}
                            title={isReadOnly ? 'Nur Ansicht' : (isPast && !isFocusedRow ? 'Vergangenheit (Gesperrt)' : 'Aufstellung umschalten')}
                          >
                            <div className="w-full h-full min-h-[60px] flex flex-col items-center justify-center">
                              {isPlaying ? (
                                <CheckSquare className={`w-5 h-5 pointer-events-none ${checkColor}`} />
                              ) : (
                                <Square className="w-5 h-5 pointer-events-none text-gray-300 group-hover:text-gray-400" />
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        
        {/* Footer: Schließen vs. Speichern */}
        <div className="p-4 border-t border-gray-200 bg-white flex justify-end shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] relative z-40">
          <button 
            onClick={onClose} 
            className={`w-full sm:w-auto px-6 py-2.5 text-white rounded-lg font-bold shadow-sm transition-colors text-sm ${isReadOnly ? 'bg-gray-600 hover:bg-gray-700' : 'bg-blue-600 hover:bg-blue-700'}`}
          >
            {isReadOnly ? 'Ansicht schließen' : 'Speichern & Schließen'}
          </button>
        </div>
      </div>
    </div>
  );
};
// --- END OF FILE ---