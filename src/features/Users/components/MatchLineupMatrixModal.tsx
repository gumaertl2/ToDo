// [2026-10-01] - UX-FIX: Safari AutoFill für die Joker-Suche deaktiviert (autoComplete, autoCorrect, spellCheck).
// [2026-09-30] - FEATURE: Base & Override V2 (Bottom-Up). Spieler können ihre eigene Zelle anklicken (Verfügbarkeit: Da/Weg).
// [2026-09-30] - FEATURE: Auto-Freeze und manuelles Siegel (🔒) in die Matrix integriert. Notfall-Alert bei verspäteten Absagen eingebaut.
// [2026-09-28] - UX-FEATURE: 'isReadOnly' Prop hinzugefügt. Erlaubt einfachen Team-Mitgliedern die Ansicht der Matrix, ohne Schreibrechte zu gewähren.
// [2026-09-28] - UX-FEATURE: 'focusedEventId' Prop hinzugefügt. Zieht ein bestimmtes Spiel an die Spitze der Matrix und hebt es farblich hervor.
// src/features/Users/components/MatchLineupMatrixModal.tsx
import React, { useMemo, useState } from 'react';
import { useClubStore } from '../../../store/useClubStore';
import { X, Calendar as CalendarIcon, Lock, Unlock, CheckSquare, Square, UserPlus, Search, Users } from 'lucide-react';
import type { Team, MatchLineup, Helper } from '../../../core/types/models';

interface MatchLineupMatrixModalProps {
  team: Team;
  focusedEventId?: string;
  isReadOnly?: boolean;
  onClose: () => void;
}

type PlayerCategory = 'STAMM' | 'KADER' | 'EXTERN';

const sanitizeId = (id: string) => id.replace(/[\/\\.#$\[\]]/g, '_');

export const MatchLineupMatrixModal: React.FC<MatchLineupMatrixModalProps> = ({ team, focusedEventId, isReadOnly, onClose }) => {
  const { user, helpers, calendarSubscriptions, matchLineups, saveMatchLineup } = useClubStore();
  
  const [tempJokers, setTempJokers] = useState<string[]>([]);
  const [isJokerMenuOpen, setIsJokerMenuOpen] = useState(false);
  const [jokerSearchTerm, setJokerSearchTerm] = useState('');
  
  // Optimistische UI-States für verzögerungsfreies Klicken
  const [localOverrides, setLocalOverrides] = useState<Record<string, string[]>>({});
  const [localAvailOverrides, setLocalAvailOverrides] = useState<Record<string, Record<string, 'AVAILABLE' | 'UNAVAILABLE' | 'UNKNOWN'>>>({});
  const [localLockOverrides, setLocalLockOverrides] = useState<Record<string, boolean>>({});

  // Finde heraus, wer gerade eingeloggt ist (um eigene Spalte zu identifizieren)
  const myHelperId = useMemo(() => {
    if (!user || !user.email) return null;
    return helpers.find(h => h.email?.toLowerCase() === user.email?.toLowerCase())?.id;
  }, [user, helpers]);

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

  // --- KADER NOMINIERUNG (Nur Captain) ---
  const handleTogglePlayer = async (rawEventId: string, helperId: string, currentActiveIds: string[]) => {
    if (isReadOnly) return;

    const safeEventId = sanitizeId(rawEventId);
    const storeLineup = matchLineups.find(m => m.id === safeEventId);
    
    const newActiveIds = currentActiveIds.includes(helperId)
      ? currentActiveIds.filter(id => id !== helperId)
      : [...currentActiveIds, helperId];

    setLocalOverrides(prev => ({ ...prev, [safeEventId]: newActiveIds }));

    const newLineup: MatchLineup = {
      id: safeEventId,
      schemaVersion: '1.0',
      teamId: team.id,
      lineupHelperIds: newActiveIds,
      availabilities: storeLineup?.availabilities || {},
      isLocked: storeLineup?.isLocked,
      updatedAt: Date.now()
    };

    const result = await saveMatchLineup(newLineup);
    if (!result.success) {
      alert(`SPEICHERN FEHLGESCHLAGEN!\n\nFirebase meldet: ${result.error?.message || 'Unbekannter Fehler'}`);
      setLocalOverrides(prev => { const next = { ...prev }; delete next[safeEventId]; return next; });
    }
  };

  // --- VERFÜGBARKEIT ÄNDERN (Da / Weg / ?) ---
  const handleToggleAvailability = async (rawEventId: string, helperId: string, isPlaying: boolean, isFrozenLocal: boolean) => {
    // Man darf nur sich selbst ändern!
    if (helperId !== myHelperId) return;

    const safeEventId = sanitizeId(rawEventId);
    const storeLineup = matchLineups.find(m => m.id === safeEventId);
    
    const currentAvail = localAvailOverrides[safeEventId]?.[helperId] || storeLineup?.availabilities?.[helperId] || 'UNKNOWN';
    
    // Ampel weiterschalten
    let nextAvail: 'AVAILABLE' | 'UNAVAILABLE' | 'UNKNOWN' = 'UNKNOWN';
    if (currentAvail === 'UNKNOWN') nextAvail = 'AVAILABLE';
    else if (currentAvail === 'AVAILABLE') nextAvail = 'UNAVAILABLE';
    else nextAvail = 'UNKNOWN';

    // NOTBREMSE: Verhindert stillschweigende Absagen nach der Nominierung!
    if (isFrozenLocal && isPlaying && nextAvail === 'UNAVAILABLE') {
       const defaultMsg = "🔒 Du bist für dieses Spiel fest aufgestellt und die Planung ist bereits versiegelt! Bei kurzfristigen Ausfällen kontaktiere bitte sofort deinen Mannschaftsführer.";
       alert(team.lineupLockMessage || defaultMsg);
       return;
    }

    // Optimistic Update
    setLocalAvailOverrides(prev => ({
       ...prev,
       [safeEventId]: {
          ...(prev[safeEventId] || {}),
          [helperId]: nextAvail
       }
    }));

    const newLineup: MatchLineup = {
      id: safeEventId,
      schemaVersion: '1.0',
      teamId: team.id,
      lineupHelperIds: storeLineup?.lineupHelperIds || team.defaultLineupHelperIds || [],
      availabilities: {
        ...(storeLineup?.availabilities || {}),
        [helperId]: nextAvail
      },
      isLocked: storeLineup?.isLocked,
      updatedAt: Date.now()
    };
    
    await saveMatchLineup(newLineup);
  };

  // --- MANUELLE VERSIEGELUNG (Nur Captain) ---
  const handleToggleLock = async (rawEventId: string, newState: boolean) => {
    const safeEventId = sanitizeId(rawEventId);
    const storeLineup = matchLineups.find(m => m.id === safeEventId);
    setLocalLockOverrides(prev => ({ ...prev, [safeEventId]: newState }));
    
    const newLineup: MatchLineup = {
      id: safeEventId,
      schemaVersion: '1.0',
      teamId: team.id,
      lineupHelperIds: storeLineup?.lineupHelperIds || team.defaultLineupHelperIds || [],
      availabilities: storeLineup?.availabilities || {},
      isLocked: newState,
      updatedAt: Date.now()
    };
    await saveMatchLineup(newLineup);
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
                          autoComplete="off"
                          autoCorrect="off"
                          spellCheck={false}
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
                    <th key={m.id} className={`sticky top-0 z-20 bg-gray-100 border-b-2 border-b-gray-200 border-r border-gray-100 px-2 py-3 text-center text-[10px] font-bold uppercase tracking-wider min-w-[75px] shadow-[0px_1px_0px_0px_#e5e7eb] ${m.id === myHelperId ? 'text-blue-700 bg-blue-50/50' : 'text-gray-600'}`}>
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

                  // AUTO-FREEZE BERECHNUNG
                  const leadDays = team.lineupFreezeLeadDays !== undefined ? team.lineupFreezeLeadDays : 7;
                  const msPerDay = 1000 * 60 * 60 * 24;
                  const daysUntil = (event.startTime - Date.now()) / msPerDay;
                  // Gefroren, wenn in der Frist, aber nur bis 1 Tag nach dem Spiel (danach wieder irrelevant)
                  const isAutoFrozen = leadDays > 0 && daysUntil <= leadDays && daysUntil >= -1;
                  
                  const isManuallyLocked = localLockOverrides[safeEventId] !== undefined ? localLockOverrides[safeEventId] : (storeLineup?.isLocked === true);
                  const isFrozen = isManuallyLocked || isAutoFrozen;
                  
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
                            
                            {/* SIEGEL (Lock) ANZEIGE / BUTTON */}
                            {!isReadOnly && (!isPast || isFocusedRow) ? (
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleToggleLock(event.uid, !isManuallyLocked); }}
                                className={`flex items-center gap-1 text-[11px] font-bold px-1.5 py-0.5 rounded border transition-colors ${
                                  isManuallyLocked ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100' :
                                  isAutoFrozen ? 'bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-200' :
                                  'bg-white text-gray-400 border-gray-200 hover:bg-gray-50 hover:text-gray-600'
                                }`}
                                title={isAutoFrozen ? `Auto-Freeze aktiv (${leadDays} Tage). Klick für manuelles Siegel.` : 'Kader manuell versiegeln (Sperre)'}
                              >
                                {isFrozen ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                                {isFrozen ? 'Versiegelt' : 'Offen'}
                              </button>
                            ) : (
                              isFrozen && (
                                <span className="flex items-center gap-1 text-[11px] font-bold px-1.5 py-0.5 rounded border bg-gray-100 text-gray-600 border-gray-300">
                                  <Lock className="w-3 h-3" /> Versiegelt
                                </span>
                              )
                            )}
                          </div>
                        </div>
                      </td>
                      
                      {displayMembers.map(({ helper: m, category }) => {
                        const isPlaying = activePlayers.includes(m.id);
                        const isMyColumn = m.id === myHelperId;
                        
                        let checkColor = 'text-blue-600';
                        if (isOverride) checkColor = 'text-orange-500';
                        else if (category === 'STAMM') checkColor = 'text-green-600';

                        // Spieler-Verfügbarkeit abrufen
                        const avail = localAvailOverrides[safeEventId]?.[m.id] || storeLineup?.availabilities?.[m.id] || 'UNKNOWN';
                        let availBgClass = isFocusedRow ? 'bg-blue-50/50' : (isPast ? 'bg-gray-100' : 'bg-white');
                        if (avail === 'AVAILABLE') availBgClass = 'bg-green-100/60';
                        if (avail === 'UNAVAILABLE') availBgClass = 'bg-red-100/60';

                        const canEditAvail = isMyColumn && (!isPast || isFocusedRow);

                        return (
                          <td 
                            key={m.id} 
                            className={`relative p-0 align-middle ${borderClasses} border-r border-gray-100 transition-colors ${availBgClass} ${
                              canEditAvail ? 'cursor-pointer hover:brightness-95 shadow-[inset_0_0_0_1px_rgba(59,130,246,0.1)]' : ''
                            }`}
                            onClick={() => {
                              if (canEditAvail) {
                                handleToggleAvailability(event.uid, m.id, isPlaying, isFrozen);
                              }
                            }}
                            title={canEditAvail ? "Klicken, um deine eigene Verfügbarkeit zu ändern (Da / Weg / ?)" : ""}
                          >
                            <div className="w-full h-full min-h-[60px] flex flex-col items-center justify-center relative pt-2 pb-4">
                              {/* Die Checkbox (Lineup-Nominierung durch Captain) */}
                              <button
                                type="button"
                                disabled={isReadOnly || (isPast && !isFocusedRow)}
                                onClick={(e) => {
                                  e.stopPropagation(); // Verhindert, dass der Klick auf die Checkbox auch den Hintergrund (Verfügbarkeit) triggert
                                  if (!isReadOnly && (!isPast || isFocusedRow)) {
                                    handleTogglePlayer(event.uid, m.id, activePlayers);
                                  }
                                }}
                                className={`p-1.5 rounded-md ${!isReadOnly && (!isPast || isFocusedRow) ? 'cursor-pointer hover:bg-black/5' : 'cursor-default'}`}
                                title={!isReadOnly ? "Kader-Nominierung setzen/entfernen" : ""}
                              >
                                {isPlaying ? (
                                  <CheckSquare className={`w-5 h-5 pointer-events-none ${checkColor}`} />
                                ) : (
                                  <Square className={`w-5 h-5 pointer-events-none ${isReadOnly ? 'text-gray-200' : 'text-gray-300 group-hover:text-gray-400'}`} />
                                )}
                              </button>

                              {/* Der Status-Indikator (Verfügbarkeit) */}
                              <div className="absolute bottom-1 w-full text-center pointer-events-none">
                                {avail === 'AVAILABLE' && <span className="text-[9px] font-extrabold text-green-700">DA</span>}
                                {avail === 'UNAVAILABLE' && <span className="text-[9px] font-extrabold text-red-700">WEG</span>}
                                {avail === 'UNKNOWN' && isMyColumn && <span className="text-[9px] font-bold text-gray-400">?</span>}
                              </div>
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
        
        {/* Footer */}
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
