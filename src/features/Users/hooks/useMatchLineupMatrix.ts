// [2026-10-13] - REFACTOR: Umstellung auf Stable Event ID (Natural Key: TeamID + Saison + Titel + Description), um Datenverlust durch wechselnde Verbands-UIDs zu verhindern.
// [2026-10-12] - REFACTOR: Komplette Daten- und State-Logik aus MatchLineupMatrixModal in diesen Hook ausgelagert.
// src/features/Users/hooks/useMatchLineupMatrix.ts
import { useState, useMemo } from 'react';
import { useClubStore } from '../../../store/useClubStore';
import type { Team, MatchLineup, Helper } from '../../../core/types/models';

export type PlayerCategory = 'STAMM' | 'KADER' | 'EXTERN';

// NEU: Deterministische ID-Generierung, immun gegen Kalender-UID-Wechsel
export const generateStableEventId = (teamId: string, event: any) => {
  const date = new Date(event.startTime);
  const month = date.getMonth(); // 0 = Jan, 6 = Jul
  const year = date.getFullYear();
  
  // Tischtennis Saisonwechsel ist im Juli (Monat 6)
  const season = month >= 6 ? `${year}-${year + 1}` : `${year - 1}-${year}`;

  const normalize = (str: string) => {
     return (str || '').toLowerCase()
       .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
       .replace(/[^a-z0-9]/g, '_')
       .replace(/_+/g, '_')
       .replace(/^_|_$/g, '');
  };

  const title = normalize(event.title);
  const desc = normalize(event.description);

  const rawId = `${teamId}_${season}_${title}_${desc}`;
  return rawId.replace(/_+/g, '_').replace(/^_|_$/g, '');
};

export const useMatchLineupMatrix = (team: Team, focusedEventId?: string, isReadOnly?: boolean) => {
  const { user, helpers, calendarSubscriptions, matchLineups, saveMatchLineup } = useClubStore();
  
  const [tempJokers, setTempJokers] = useState<string[]>([]);
  const [isJokerMenuOpen, setIsJokerMenuOpen] = useState(false);
  const [jokerSearchTerm, setJokerSearchTerm] = useState('');
  
  // Optimistische UI-States für verzögerungsfreies Klicken
  const [localOverrides, setLocalOverrides] = useState<Record<string, string[]>>({});
  const [localAvailOverrides, setLocalAvailOverrides] = useState<Record<string, Record<string, 'AVAILABLE' | 'UNAVAILABLE' | 'UNKNOWN'>>>({});
  const [localLockOverrides, setLocalLockOverrides] = useState<Record<string, boolean>>({});
  const [localSetByMFOverrides, setLocalSetByMFOverrides] = useState<Record<string, Record<string, boolean>>>({});
  
  // Lokaler State für die blitzschnelle Logistik-Anzeige
  const [localLogisticsOverrides, setLocalLogisticsOverrides] = useState<Record<string, { fahrerHelperIds?: string[], betreuerHelperIds?: string[], departureTime?: string }>>({});

  // States für den Logistik Such-Picker
  const [openLogisticsPicker, setOpenLogisticsPicker] = useState<string | null>(null);
  const [logisticsSearchTerm, setLogisticsSearchTerm] = useState('');

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

  const sortedAllHelpers = useMemo(() => {
    return [...helpers].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [helpers]);

  const filteredLogisticsHelpers = useMemo(() => {
    const term = logisticsSearchTerm.toLowerCase().trim();
    if (!term) return sortedAllHelpers;
    return sortedAllHelpers.filter(h => 
      (h.name || '').toLowerCase().includes(term) || 
      (h.alias || '').toLowerCase().includes(term)
    );
  }, [sortedAllHelpers, logisticsSearchTerm]);

  const linkedSubscription = useMemo(() => {
    return calendarSubscriptions.find(sub => sub.reminderRecipientTeamIds?.includes(team.id));
  }, [calendarSubscriptions, team.id]);

  const events = useMemo(() => {
    if (!linkedSubscription || !linkedSubscription.cachedEvents) return [];
    const sorted = [...linkedSubscription.cachedEvents].sort((a, b) => a.startTime - b.startTime);
    
    if (focusedEventId) {
      const focusIndex = sorted.findIndex(e => generateStableEventId(team.id, e) === focusedEventId);
      if (focusIndex > -1) {
        const [focusedEvent] = sorted.splice(focusIndex, 1);
        sorted.unshift(focusedEvent);
      }
    }
    
    return sorted;
  }, [linkedSubscription, focusedEventId, team.id]);

  // --- SPIELE-ZÄHLER ENGINE ---
  const playerGameCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    
    // Initialisiere mit 0
    displayMembers.forEach(m => { counts[m.helper.id] = 0; });
    
    events.forEach(event => {
      const stableEventId = generateStableEventId(team.id, event);
      const storeLineup = matchLineups.find(m => m.id === stableEventId);
      const hasLocalOverride = localOverrides[stableEventId] !== undefined;
      
      let activeIds: string[] = [];
      if (hasLocalOverride) activeIds = localOverrides[stableEventId];
      else if (storeLineup) activeIds = storeLineup.lineupHelperIds;
      else activeIds = team.defaultLineupHelperIds || [];
      
      activeIds.forEach(id => {
        if (counts[id] !== undefined) counts[id]++;
      });
    });
    return counts;
  }, [events, matchLineups, localOverrides, team, displayMembers]);

  // --- KADER NOMINIERUNG (Nur Captain) ---
  const handleTogglePlayer = async (stableEventId: string, helperId: string, currentActiveIds: string[]) => {
    if (isReadOnly) return;

    const storeLineup = matchLineups.find(m => m.id === stableEventId);
    
    const newActiveIds = currentActiveIds.includes(helperId)
      ? currentActiveIds.filter(id => id !== helperId)
      : [...currentActiveIds, helperId];

    setLocalOverrides(prev => ({ ...prev, [stableEventId]: newActiveIds }));

    const newLineup: MatchLineup = {
      id: stableEventId,
      schemaVersion: '1.0',
      teamId: team.id,
      lineupHelperIds: newActiveIds,
      availabilities: storeLineup?.availabilities || {},
      isSetByMF: storeLineup?.isSetByMF || {},
      isLocked: storeLineup?.isLocked,
      betreuerHelperIds: storeLineup?.betreuerHelperIds || [],
      fahrerHelperIds: storeLineup?.fahrerHelperIds || [],
      departureTime: storeLineup?.departureTime,
      updatedAt: Date.now()
    };

    const result = await saveMatchLineup(newLineup);
    if (!result.success) {
      alert(`SPEICHERN FEHLGESCHLAGEN!\n\nFirebase meldet: ${result.error?.message || 'Unbekannter Fehler'}`);
      setLocalOverrides(prev => { const next = { ...prev }; delete next[stableEventId]; return next; });
    }
  };

  // --- VERFÜGBARKEIT ÄNDERN (Da / Weg / ?) ---
  const handleToggleAvailability = async (stableEventId: string, helperId: string, isPlaying: boolean, isFrozenLocal: boolean) => {
    const isMyColumn = helperId === myHelperId;
    const isCaptainAction = !isReadOnly;

    if (!isMyColumn && !isCaptainAction) return;

    const storeLineup = matchLineups.find(m => m.id === stableEventId);
    
    const currentAvail = localAvailOverrides[stableEventId]?.[helperId] || storeLineup?.availabilities?.[helperId] || 'UNKNOWN';
    
    let nextAvail: 'AVAILABLE' | 'UNAVAILABLE' | 'UNKNOWN' = 'UNKNOWN';
    if (currentAvail === 'UNKNOWN') nextAvail = 'AVAILABLE';
    else if (currentAvail === 'AVAILABLE') nextAvail = 'UNAVAILABLE';
    else nextAvail = 'UNKNOWN';

    if (isFrozenLocal && isPlaying && nextAvail === 'UNAVAILABLE') {
       const defaultMsg = "🔒 Du bist für dieses Spiel fest aufgestellt und die Planung ist bereits versiegelt! Bei kurzfristigen Ausfällen kontaktiere bitte sofort deinen Mannschaftsführer.";
       alert(team.lineupLockMessage || defaultMsg);
       return;
    }

    const newIsSetByMF = !isMyColumn;

    setLocalAvailOverrides(prev => ({
       ...prev,
       [stableEventId]: {
          ...(prev[stableEventId] || {}),
          [helperId]: nextAvail
       }
    }));
    
    setLocalSetByMFOverrides(prev => ({
      ...prev,
      [stableEventId]: {
        ...(prev[stableEventId] || {}),
        [helperId]: newIsSetByMF
      }
    }));

    const newLineup: MatchLineup = {
      id: stableEventId,
      schemaVersion: '1.0',
      teamId: team.id,
      lineupHelperIds: storeLineup?.lineupHelperIds || team.defaultLineupHelperIds || [],
      availabilities: {
        ...(storeLineup?.availabilities || {}),
        [helperId]: nextAvail
      },
      isSetByMF: {
        ...(storeLineup?.isSetByMF || {}),
        [helperId]: newIsSetByMF
      },
      isLocked: storeLineup?.isLocked,
      betreuerHelperIds: storeLineup?.betreuerHelperIds || [],
      fahrerHelperIds: storeLineup?.fahrerHelperIds || [],
      departureTime: storeLineup?.departureTime,
      updatedAt: Date.now()
    };
    
    await saveMatchLineup(newLineup);
  };

  // --- MANUELLE VERSIEGELUNG (Nur Captain) ---
  const handleToggleLock = async (stableEventId: string, newState: boolean) => {
    const storeLineup = matchLineups.find(m => m.id === stableEventId);
    setLocalLockOverrides(prev => ({ ...prev, [stableEventId]: newState }));
    
    const newLineup: MatchLineup = {
      id: stableEventId,
      schemaVersion: '1.0',
      teamId: team.id,
      lineupHelperIds: storeLineup?.lineupHelperIds || team.defaultLineupHelperIds || [],
      availabilities: storeLineup?.availabilities || {},
      isSetByMF: storeLineup?.isSetByMF || {},
      isLocked: newState,
      betreuerHelperIds: storeLineup?.betreuerHelperIds || [],
      fahrerHelperIds: storeLineup?.fahrerHelperIds || [],
      departureTime: storeLineup?.departureTime,
      updatedAt: Date.now()
    };
    await saveMatchLineup(newLineup);
  };

  // --- LOGISTIK ENGINE (Fahrer & Betreuer) ---
  const handleLogisticsAction = async (
    stableEventId: string,
    type: 'fahrerHelperIds' | 'betreuerHelperIds',
    action: 'add' | 'remove' | 'takeover',
    targetHelperId: string,
    oldHelperId?: string
  ) => {
    const storeLineup = matchLineups.find(m => m.id === stableEventId);
    
    const currentIds = localLogisticsOverrides[stableEventId]?.[type] !== undefined 
      ? localLogisticsOverrides[stableEventId][type]! 
      : (storeLineup?.[type] || []);

    let newIds = [...currentIds];

    if (action === 'add') {
      if (!newIds.includes(targetHelperId)) newIds.push(targetHelperId);
    } else if (action === 'remove') {
      newIds = newIds.filter(id => id !== targetHelperId);
    } else if (action === 'takeover' && oldHelperId) {
      newIds = newIds.filter(id => id !== oldHelperId);
      if (!newIds.includes(targetHelperId)) newIds.push(targetHelperId);
    }

    setLocalLogisticsOverrides(prev => ({
      ...prev,
      [stableEventId]: {
        ...(prev[stableEventId] || {}),
        [type]: newIds
      }
    }));

    const newLineup: MatchLineup = {
      id: stableEventId,
      schemaVersion: '1.0',
      teamId: team.id,
      lineupHelperIds: storeLineup?.lineupHelperIds || team.defaultLineupHelperIds || [],
      availabilities: storeLineup?.availabilities || {},
      isSetByMF: storeLineup?.isSetByMF || {},
      isLocked: storeLineup?.isLocked,
      betreuerHelperIds: type === 'betreuerHelperIds' ? newIds : (storeLineup?.betreuerHelperIds || []),
      fahrerHelperIds: type === 'fahrerHelperIds' ? newIds : (storeLineup?.fahrerHelperIds || []),
      departureTime: storeLineup?.departureTime,
      updatedAt: Date.now()
    };
    
    await saveMatchLineup(newLineup);
  };

  // --- ABFAHRTSZEIT ENGINE ---
  const handleDepartureTimeChange = async (stableEventId: string, newTime: string) => {
    const storeLineup = matchLineups.find(m => m.id === stableEventId);

    setLocalLogisticsOverrides(prev => ({
      ...prev,
      [stableEventId]: {
        ...(prev[stableEventId] || {}),
        departureTime: newTime
      }
    }));

    const newLineup: MatchLineup = {
      id: stableEventId,
      schemaVersion: '1.0',
      teamId: team.id,
      lineupHelperIds: storeLineup?.lineupHelperIds || team.defaultLineupHelperIds || [],
      availabilities: storeLineup?.availabilities || {},
      isSetByMF: storeLineup?.isSetByMF || {},
      isLocked: storeLineup?.isLocked,
      betreuerHelperIds: storeLineup?.betreuerHelperIds || [],
      fahrerHelperIds: storeLineup?.fahrerHelperIds || [],
      departureTime: newTime,
      updatedAt: Date.now()
    };

    await saveMatchLineup(newLineup);
  };

  const handleAddJoker = (helperId: string) => {
    setTempJokers(prev => [...prev, helperId]);
    setIsJokerMenuOpen(false);
    setJokerSearchTerm('');
  };

  return {
    // States & Setters
    tempJokers, setTempJokers,
    isJokerMenuOpen, setIsJokerMenuOpen,
    jokerSearchTerm, setJokerSearchTerm,
    openLogisticsPicker, setOpenLogisticsPicker,
    logisticsSearchTerm, setLogisticsSearchTerm,
    
    // Lokale Optimistische Daten
    localOverrides, localAvailOverrides, localLockOverrides, localSetByMFOverrides, localLogisticsOverrides,
    
    // Computed Data
    myHelperId, displayMembers, availableJokers, sortedAllHelpers,
    filteredLogisticsHelpers, linkedSubscription, events, playerGameCounts, matchLineups,
    
    // Handlers
    handleTogglePlayer, handleToggleAvailability, handleToggleLock,
    handleLogisticsAction, handleDepartureTimeChange, handleAddJoker
  };
};
// --- END OF FILE ---