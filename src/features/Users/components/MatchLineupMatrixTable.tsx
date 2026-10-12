// [2026-10-12] - REFACTOR: Tabellen-Struktur aus MatchLineupMatrixModal in eigene Komponente ausgelagert.
// src/features/Users/components/MatchLineupMatrixTable.tsx
import React from 'react';
import { Lock, Unlock, CheckSquare, Square, Users } from 'lucide-react';
import type { Team, MatchLineup, Helper } from '../../../core/types/models';
import { sanitizeId, type PlayerCategory } from '../hooks/useMatchLineupMatrix';
import { MatchLineupLogisticsRow } from './MatchLineupLogisticsRow';

interface MatchLineupMatrixTableProps {
  team: Team;
  events: any[];
  displayMembers: { helper: Helper; category: PlayerCategory }[];
  playerGameCounts: Record<string, number>;
  myHelperId?: string | null;
  focusedEventId?: string;
  isReadOnly?: boolean;
  matchLineups: MatchLineup[];
  
  // States & Overrides
  localOverrides: Record<string, string[]>;
  localAvailOverrides: Record<string, Record<string, 'AVAILABLE' | 'UNAVAILABLE' | 'UNKNOWN'>>;
  localLockOverrides: Record<string, boolean>;
  localSetByMFOverrides: Record<string, Record<string, boolean>>;
  localLogisticsOverrides: Record<string, { fahrerHelperIds?: string[], betreuerHelperIds?: string[], departureTime?: string }>;
  
  openLogisticsPicker: string | null;
  setOpenLogisticsPicker: (val: string | null) => void;
  logisticsSearchTerm: string;
  setLogisticsSearchTerm: (val: string) => void;
  sortedAllHelpers: Helper[];
  filteredLogisticsHelpers: Helper[];

  // Handlers
  onTogglePlayer: (eventId: string, helperId: string, currentActiveIds: string[]) => void;
  onToggleAvailability: (eventId: string, helperId: string, isPlaying: boolean, isFrozenLocal: boolean) => void;
  onToggleLock: (eventId: string, newState: boolean) => void;
  onLogisticsAction: (eventId: string, type: 'fahrerHelperIds' | 'betreuerHelperIds', action: 'add' | 'remove' | 'takeover', targetHelperId: string, oldHelperId?: string) => void;
  onDepartureTimeChange: (eventId: string, newTime: string) => void;
}

export const MatchLineupMatrixTable: React.FC<MatchLineupMatrixTableProps> = ({
  team, events, displayMembers, playerGameCounts, myHelperId, focusedEventId, isReadOnly, matchLineups,
  localOverrides, localAvailOverrides, localLockOverrides, localSetByMFOverrides, localLogisticsOverrides,
  openLogisticsPicker, setOpenLogisticsPicker, logisticsSearchTerm, setLogisticsSearchTerm,
  sortedAllHelpers, filteredLogisticsHelpers,
  onTogglePlayer, onToggleAvailability, onToggleLock, onLogisticsAction, onDepartureTimeChange
}) => {

  return (
    <table className="w-full border-separate border-spacing-0 bg-white">
      <thead>
        <tr>
          <th className="sticky top-0 left-0 z-30 bg-gray-100 border-b-2 border-r-2 border-gray-200 px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider w-[240px] sm:w-[280px] shadow-[1px_1px_0px_0px_#e5e7eb]">
            Termin / Spiel
          </th>
          {displayMembers.map(({ helper: m, category }) => {
            const gameCount = playerGameCounts[m.id] || 0;
            return (
            <th key={m.id} className={`sticky top-0 z-20 bg-gray-100 border-b-2 border-b-gray-200 border-r border-gray-100 px-2 py-3 text-center text-[10px] font-bold uppercase tracking-wider min-w-[75px] shadow-[0px_1px_0px_0px_#e5e7eb] ${m.id === myHelperId ? 'text-blue-700 bg-blue-50/50' : 'text-gray-600'}`}>
              <div className="truncate px-1" title={m.name}>{m.alias || m.name.split(' ')[0]}</div>
              <div className="mt-1 flex flex-col items-center gap-0.5">
                <span className="text-[9px] bg-gray-200/80 text-gray-600 px-1.5 py-0.5 rounded-full lowercase font-medium tracking-normal" title={`${gameCount} Nominierungen`}>
                  {gameCount} sp.
                </span>
                {category === 'STAMM' && <div className="text-[8px] text-green-600 font-extrabold mt-0.5">Stamm</div>}
                {category === 'KADER' && <div className="text-[8px] text-blue-600 font-extrabold mt-0.5">Bank</div>}
                {category === 'EXTERN' && <div className="text-[8px] text-orange-500 font-extrabold mt-0.5">Extern</div>}
              </div>
            </th>
          )})}
        </tr>
      </thead>
      <tbody>
        {events.map((event) => {
          const eventDate = new Date(event.startTime);
          const isPast = event.startTime < Date.now();
          
          const safeEventId = sanitizeId(event.uid);
          const isFocusedRow = focusedEventId === safeEventId;
          const isPickerOpenInThisRow = openLogisticsPicker?.startsWith(safeEventId);
          
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

          const leadDays = team.lineupFreezeLeadDays !== undefined ? team.lineupFreezeLeadDays : 7;
          const msPerDay = 1000 * 60 * 60 * 24;
          const daysUntil = (event.startTime - Date.now()) / msPerDay;
          const isAutoFrozen = leadDays > 0 && daysUntil <= leadDays && daysUntil >= -1;
          
          const isManuallyLocked = localLockOverrides[safeEventId] !== undefined ? localLockOverrides[safeEventId] : (storeLineup?.isLocked === true);
          const isFrozen = isManuallyLocked || isAutoFrozen;
          
          const rowBg = isFocusedRow ? 'bg-blue-50/80' : (isPast ? 'bg-gray-100' : 'bg-white');
          const borderClasses = isFocusedRow ? 'border-b-4 border-t-4 border-blue-500 z-10 relative' : 'border-b border-gray-200';
          
          const shortDate = eventDate.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' });
          const shortTime = eventDate.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', hour12: false });

          return (
            <tr key={event.uid} className={`group ${isFocusedRow ? 'bg-blue-50' : (isPast ? 'hover:bg-gray-200' : 'hover:bg-blue-50/40')} transition-colors`}>
              
              <td className={`sticky left-0 ${isPickerOpenInThisRow ? 'z-50' : 'z-10'} ${rowBg} group-hover:bg-inherit ${borderClasses} border-r-2 px-4 py-3 w-[240px] sm:w-[280px] align-middle shadow-[1px_0px_0px_0px_#e5e7eb]`}>
                <div className="flex flex-col whitespace-normal h-full">
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
                    
                    {!isReadOnly && (!isPast || isFocusedRow) ? (
                      <button 
                        onClick={(e) => { e.stopPropagation(); onToggleLock(event.uid, !isManuallyLocked); }}
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

                  {/* LOGISTIK-BLOCK */}
                  {(team.requiresFahrer || team.requiresBetreuer) && (
                    <div className="mt-3 pt-2.5 border-t border-gray-200/60 flex flex-col gap-2">
                      {team.requiresBetreuer && (
                        <MatchLineupLogisticsRow 
                          type="betreuerHelperIds" label="🧑‍🏫 Betreuer" event={event} team={team} isReadOnly={isReadOnly}
                          myHelperId={myHelperId} sortedAllHelpers={sortedAllHelpers} filteredLogisticsHelpers={filteredLogisticsHelpers}
                          openLogisticsPicker={openLogisticsPicker} setOpenLogisticsPicker={setOpenLogisticsPicker}
                          logisticsSearchTerm={logisticsSearchTerm} setLogisticsSearchTerm={setLogisticsSearchTerm}
                          localLogisticsOverrides={localLogisticsOverrides} matchLineups={matchLineups}
                          onLogisticsAction={onLogisticsAction} onDepartureTimeChange={onDepartureTimeChange}
                        />
                      )}
                      {team.requiresFahrer && (
                        <MatchLineupLogisticsRow 
                          type="fahrerHelperIds" label="🚗 Fahrer" event={event} team={team} isReadOnly={isReadOnly}
                          myHelperId={myHelperId} sortedAllHelpers={sortedAllHelpers} filteredLogisticsHelpers={filteredLogisticsHelpers}
                          openLogisticsPicker={openLogisticsPicker} setOpenLogisticsPicker={setOpenLogisticsPicker}
                          logisticsSearchTerm={logisticsSearchTerm} setLogisticsSearchTerm={setLogisticsSearchTerm}
                          localLogisticsOverrides={localLogisticsOverrides} matchLineups={matchLineups}
                          onLogisticsAction={onLogisticsAction} onDepartureTimeChange={onDepartureTimeChange}
                        />
                      )}
                    </div>
                  )}

                </div>
              </td>
              
              {displayMembers.map(({ helper: m, category }) => {
                const isPlaying = activePlayers.includes(m.id);
                const isMyColumn = m.id === myHelperId;
                
                let checkColor = 'text-blue-600';
                if (isOverride) checkColor = 'text-orange-500';
                else if (category === 'STAMM') checkColor = 'text-green-600';

                const avail = localAvailOverrides[safeEventId]?.[m.id] || storeLineup?.availabilities?.[m.id] || 'UNKNOWN';
                const isSetByMF = localSetByMFOverrides[safeEventId]?.[m.id] !== undefined 
                    ? localSetByMFOverrides[safeEventId]?.[m.id] 
                    : (storeLineup?.isSetByMF?.[m.id] || false);

                let availBgClass = isFocusedRow ? 'bg-blue-50/50' : (isPast ? 'bg-gray-100' : 'bg-white');
                if (avail === 'AVAILABLE') availBgClass = 'bg-green-100/60';
                if (avail === 'UNAVAILABLE') availBgClass = 'bg-red-100/60';

                const stripedStyle = (isSetByMF && avail !== 'UNKNOWN') ? {
                    backgroundImage: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.6), rgba(255,255,255,0.6) 6px, transparent 6px, transparent 12px)'
                } : undefined;

                const canEditAvail = (isMyColumn || !isReadOnly) && (!isPast || isFocusedRow);
                
                let tooltipText = "";
                if (canEditAvail) tooltipText = isMyColumn ? "Klicken, um deine eigene Verfügbarkeit zu ändern (Da / Weg / ?)" : "Klicken, um die Verfügbarkeit als Mannschaftsführer zu überschreiben";
                else if (isSetByMF) tooltipText = "Status wurde manuell vom Mannschaftsführer gesetzt";

                return (
                  <td 
                    key={m.id} 
                    className={`relative p-0 align-middle ${borderClasses} border-r border-gray-100 transition-colors ${availBgClass} ${
                      canEditAvail ? 'cursor-pointer hover:brightness-95 shadow-[inset_0_0_0_1px_rgba(59,130,246,0.1)]' : ''
                    }`}
                    style={stripedStyle}
                    onClick={() => {
                      if (canEditAvail) {
                        onToggleAvailability(event.uid, m.id, isPlaying, isFrozen);
                      }
                    }}
                    title={tooltipText}
                  >
                    <div className="w-full h-full min-h-[60px] flex flex-col items-center justify-center relative pt-2 pb-4">
                      <button
                        type="button"
                        disabled={isReadOnly || (isPast && !isFocusedRow)}
                        onClick={(e) => {
                          e.stopPropagation(); 
                          if (!isReadOnly && (!isPast || isFocusedRow)) {
                            onTogglePlayer(event.uid, m.id, activePlayers);
                          }
                        }}
                        className={`p-1.5 rounded-md z-10 ${!isReadOnly && (!isPast || isFocusedRow) ? 'cursor-pointer hover:bg-black/5' : 'cursor-default'}`}
                        title={!isReadOnly ? "Kader-Nominierung setzen/entfernen" : ""}
                      >
                        {isPlaying ? (
                          <CheckSquare className={`w-5 h-5 pointer-events-none ${checkColor}`} />
                        ) : (
                          <Square className={`w-5 h-5 pointer-events-none ${isReadOnly ? 'text-gray-200' : 'text-gray-300 group-hover:text-gray-400'}`} />
                        )}
                      </button>

                      <div className="absolute bottom-1 w-full text-center pointer-events-none">
                        {avail === 'AVAILABLE' && <span className="text-[9px] font-extrabold text-green-800">DA</span>}
                        {avail === 'UNAVAILABLE' && <span className="text-[9px] font-extrabold text-red-800">WEG</span>}
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
  );
};
// --- END OF FILE ---