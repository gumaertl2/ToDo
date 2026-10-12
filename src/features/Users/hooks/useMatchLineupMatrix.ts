// [2026-10-12] - REFACTOR: Komplette Daten- und State-Logik aus MatchLineupMatrixModal in diesen Hook ausgelagert.
// src/features/Users/hooks/useMatchLineupMatrix.ts
import { useState, useMemo } from 'react';
import { useClubStore } from '../../../store/useClubStore';
import type { Team, MatchLineup, Helper } from '../../../core/types/models';

export type PlayerCategory = 'STAMM' | 'KADER' | 'EXTERN';

export const sanitizeId = (id: string) => id.replace(/[\/\\.#$\[\]]/g, '_');

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
      const focusIndex = sorted.findIndex(e => sanitizeId(e.uid) === focusedEventId);
      if (focusIndex > -1) {
        const [focusedEvent] = sorted.splice(focusIndex, 1);
        sorted.unshift(focusedEvent);
      }
    }
    
    return sorted;
  }, [linkedSubscription, focusedEventId]);

  // --- SPIELE-ZÄHLER ENGINE ---
  const playerGameCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    
    // Initialisiere mit 0
    displayMembers.forEach(m => { counts[m.helper.id] = 0; });
    
    events.forEach(event => {
      const safeEventId = sanitizeId(event.uid);
      const storeLineup = matchLineups.find(m => m.id === safeEventId);
      const hasLocalOverride = localOverrides[safeEventId] !== undefined;
      
      let activeIds: string[] = [];
      if (hasLocalOverride) activeIds = localOverrides[safeEventId];
      else if (storeLineup) activeIds = storeLineup.lineupHelperIds;
      else activeIds = team.defaultLineupHelperIds || [];
      
      activeIds.forEach(id => {
        if (counts[id] !== undefined) counts[id]++;
      });
    });
    return counts;
  }, [events, matchLineups, localOverrides, team.defaultLineupHelperIds, displayMembers]);

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
      setLocalOverrides(prev => { const next = { ...prev }; delete next[safeEventId]; return next; });
    }
  };

  // --- VERFÜGBARKEIT ÄNDERN (Da / Weg / ?) ---
  const handleToggleAvailability = async (rawEventId: string, helperId: string, isPlaying: boolean, isFrozenLocal: boolean) => {
    const isMyColumn = helperId === myHelperId;
    const isCaptainAction = !isReadOnly;

    if (!isMyColumn && !isCaptainAction) return;

    const safeEventId = sanitizeId(rawEventId);
    const storeLineup = matchLineups.find(m => m.id === safeEventId);
    
    const currentAvail = localAvailOverrides[safeEventId]?.[helperId] || storeLineup?.availabilities?.[helperId] || 'UNKNOWN';
    
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
       [safeEventId]: {
          ...(prev[safeEventId] || {}),
          [helperId]: nextAvail
       }
    }));
    
    setLocalSetByMFOverrides(prev => ({
      ...prev,
      [safeEventId]: {
        ...(prev[safeEventId] || {}),
        [helperId]: newIsSetByMF
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
    rawEventId: string,
    type: 'fahrerHelperIds' | 'betreuerHelperIds',
    action: 'add' | 'remove' | 'takeover',
    targetHelperId: string,
    oldHelperId?: string
  ) => {
    const safeEventId = sanitizeId(rawEventId);
    const storeLineup = matchLineups.find(m => m.id === safeEventId);
    
    const currentIds = localLogisticsOverrides[safeEventId]?.[type] !== undefined 
      ? localLogisticsOverrides[safeEventId][type]! 
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
      [safeEventId]: {
        ...(prev[safeEventId] || {}),
        [type]: newIds
      }
    }));

    const newLineup: MatchLineup = {
      id: safeEventId,
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
  const handleDepartureTimeChange = async (rawEventId: string, newTime: string) => {
    const safeEventId = sanitizeId(rawEventId);
    const storeLineup = matchLineups.find(m => m.id === safeEventId);

    setLocalLogisticsOverrides(prev => ({
      ...prev,
      [safeEventId]: {
        ...(prev[safeEventId] || {}),
        departureTime: newTime
      }
    }));

    const newLineup: MatchLineup = {
      id: safeEventId,
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