// [2026-10-17] - BUGFIX: Ungenutzte Joker-Props (TS6133 Build Error) aus Interface und Signatur entfernt, da der Button nun zentral im Modal-Header lebt.
// [2026-10-17] - UX-FIX: Redundanten Joker-Button ("+ Weiterer Spieler") und zugehörigen State (openJokerCardKey) aus der Spielkarte restlos entfernt.
// [2026-10-16] - UX-REFACTOR: Aufgeräumtes 3-Zonen-Kartenlayout (Datum/Gegner oben, Logistik-Zellen im Header, sauber getrennte Spieler-Pillen im Body).
// [2026-10-14] - UX-REFACTOR: Lineares Layout von links nach rechts: Datum -> Betreuer -> Fahrer -> Uhrzeit -> Google-Icon Platzhalter -> Status.
// src/features/Users/components/MatchLineupCardsView.tsx
import React, { useEffect, useRef } from 'react';
import { format } from 'date-fns/format';
import { startOfDay } from 'date-fns/startOfDay';
import { de } from 'date-fns/locale/de';
import { Lock, Unlock, CheckSquare, Square, Users, BarChart3 } from 'lucide-react';
import type { Team, MatchLineup, Helper } from '../../../core/types/models';
import { generateStableEventId, type PlayerCategory } from '../hooks/useMatchLineupMatrix';
import { MatchLineupLogisticsRow } from './MatchLineupLogisticsRow';

export interface MatchLineupCardsViewProps {
  team: Team;
  subscriptionColor?: string;
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

export const MatchLineupCardsView: React.FC<MatchLineupCardsViewProps> = ({
  team, subscriptionColor, events, displayMembers, playerGameCounts, myHelperId, focusedEventId, isReadOnly, matchLineups,
  localOverrides, localAvailOverrides, localLockOverrides, localSetByMFOverrides, localLogisticsOverrides,
  openLogisticsPicker, setOpenLogisticsPicker, logisticsSearchTerm, setLogisticsSearchTerm,
  sortedAllHelpers, filteredLogisticsHelpers,
  onTogglePlayer, onToggleAvailability, onToggleLock, onLogisticsAction, onDepartureTimeChange
}) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const today = startOfDay(new Date());

  useEffect(() => {
    if (wrapperRef.current && !focusedEventId) {
      const timeoutId = setTimeout(() => {
        const wrapper = wrapperRef.current;
        if (!wrapper) return;
        const scrollContainer = wrapper.closest('.overflow-auto') || wrapper.closest('.overflow-y-auto');
        if (!scrollContainer) return;

        const targetEl = wrapper.querySelector('[data-is-future="true"]') as HTMLElement;
        if (targetEl) {
          scrollContainer.scrollTo({
            top: Math.max(0, targetEl.offsetTop - 16),
            behavior: 'smooth'
          });
        }
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [events, focusedEventId]);

  return (
    <div ref={wrapperRef} className="p-2 sm:p-4 space-y-4">
      
      {/* KOPF-LEISTE: EINSATZ-BILANZ */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
        <div className="flex items-center gap-1.5 text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
          <BarChart3 className="w-4 h-4 text-blue-600 shrink-0" />
          <span>Einsatz-Bilanz (Gesamte Saison)</span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {displayMembers.map(({ helper: m, category }) => {
            const gameCount = playerGameCounts[m.id] || 0;
            const isMe = m.id === myHelperId;
            return (
              <div
                key={m.id}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border ${
                  isMe ? 'bg-blue-50 border-blue-200 text-blue-900 font-bold' : 'bg-gray-50 border-gray-200 text-gray-700 font-medium'
                }`}
                title={`${m.name}: ${gameCount} Nominierungen (${category})`}
              >
                <span className="truncate max-w-[120px]">{m.alias || m.name.split(' ')[0]}</span>
                <span className="text-[10px] font-bold bg-white border border-gray-200 text-gray-700 px-1.5 py-0.2 rounded-full shadow-2xs">
                  {gameCount} Sp.
                </span>
                {category === 'STAMM' && <span className="text-[9px] text-green-600 font-extrabold uppercase">Stamm</span>}
                {category === 'KADER' && <span className="text-[9px] text-blue-600 font-extrabold uppercase">Bank</span>}
                {category === 'EXTERN' && <span className="text-[9px] text-orange-500 font-extrabold uppercase">Ext.</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* SPIELPLAN KARTEN */}
      {events.map((event) => {
        const eventDate = new Date(event.startTime);
        const eventDay = startOfDay(eventDate);
        const isToday = eventDay.getTime() === today.getTime();
        const isFutureOrToday = eventDay.getTime() >= today.getTime();
        const isPast = event.startTime < Date.now();

        const safeEventId = generateStableEventId(team.id, event);
        const uiKey = event.uid;

        const isFocusedRow = focusedEventId === safeEventId;
        const isPickerOpenInThisCard = openLogisticsPicker?.startsWith(uiKey);

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

        const isHeim = event.location?.toLowerCase().includes('maisach');
        const isAuswaerts = event.location && !isHeim;
        const matchPrefix = isHeim ? '🏠 ' : (isAuswaerts ? '🚌 ' : '');
        const rawTitle = String(event.title || '');
        const displayTitle = (rawTitle.startsWith('🏠') || rawTitle.startsWith('🚌')) ? rawTitle : `${matchPrefix}${rawTitle}`;

        const timeStr = event.isAllDay ? 'Ganztägig' : `${format(eventDate, 'HH:mm')} Uhr`;
        const shortDateStr = format(eventDate, 'eee, dd. MMM.', { locale: de });

        return (
          <div
            key={uiKey}
            data-is-future={isFutureOrToday ? "true" : "false"}
            className={`bg-white rounded-lg shadow-sm border transition-all ${
              isFocusedRow ? 'border-blue-500 ring-2 ring-blue-200' :
              isToday ? 'border-blue-300 ring-2 ring-blue-100' : 'border-gray-200'
            } ${isPast && !isFocusedRow ? 'opacity-75 bg-gray-50/40' : ''} ${isPickerOpenInThisCard ? 'relative z-50' : 'relative z-10'}`}
          >
            {/* KARTEN-HEADER: LINEARES FLIEẞEN VON LINKS NACH RECHTS */}
            <div className={`px-4 py-2 border-b rounded-t-lg flex flex-wrap items-center justify-between gap-3 ${
              isToday || isFocusedRow ? 'bg-blue-50 border-blue-100' : 'bg-gray-50 border-gray-100'
            }`}>
              
              {/* LINKE SEITE: Datum direkt gefolgt von Betreuer und Fahrer */}
              <div className="flex items-center flex-wrap gap-4">
                
                {/* 1. Datum */}
                <div className="flex items-center gap-2">
                  <h3 className={`text-sm font-bold ${isToday || isFocusedRow ? 'text-blue-800' : 'text-gray-700'}`}>
                    {shortDateStr}
                  </h3>
                  {isToday && (
                    <span className="text-[10px] uppercase tracking-wider font-bold bg-blue-600 text-white px-2 py-0.5 rounded-full">
                      Heute
                    </span>
                  )}
                  {isFocusedRow && (
                    <span className="text-[10px] uppercase tracking-wider font-bold bg-blue-100 text-blue-800 border border-blue-200 px-2 py-0.5 rounded-full">
                      Ausgewählt
                    </span>
                  )}
                </div>

                {/* 2. Betreuer (Platz für bis zu 2 Personen) */}
                {team.requiresBetreuer && (
                  <div className="flex items-center gap-1.5 bg-white border border-gray-200 px-2.5 py-1 rounded-md shadow-2xs min-w-[150px] max-w-[220px]">
                    <span className="text-xs shrink-0 select-none" title="Betreuer">🧑‍🏫</span>
                    <div className="flex-1 min-w-0">
                      <MatchLineupLogisticsRow
                        type="betreuerHelperIds"
                        label="🧑‍🏫 Betreuer"
                        event={event}
                        team={team}
                        isReadOnly={isReadOnly}
                        myHelperId={myHelperId}
                        hideIcon={true}
                        sortedAllHelpers={sortedAllHelpers}
                        filteredLogisticsHelpers={filteredLogisticsHelpers}
                        openLogisticsPicker={openLogisticsPicker}
                        setOpenLogisticsPicker={setOpenLogisticsPicker}
                        logisticsSearchTerm={logisticsSearchTerm}
                        setLogisticsSearchTerm={setLogisticsSearchTerm}
                        localLogisticsOverrides={localLogisticsOverrides}
                        matchLineups={matchLineups}
                        onLogisticsAction={onLogisticsAction}
                        onDepartureTimeChange={onDepartureTimeChange}
                      />
                    </div>
                  </div>
                )}

                {/* 3. Fahrer (Platz für bis zu 2 Fahrer, Abfahrtszeit und fixierter Platz für Google-Maps Icon) */}
                {team.requiresFahrer && (
                  <div className="flex items-center gap-1.5 bg-white border border-gray-200 px-2.5 py-1 rounded-md shadow-2xs min-w-[230px] max-w-[320px]">
                    <span className="text-xs shrink-0 select-none" title="Fahrer">🚗</span>
                    <div className="flex-1 min-w-0">
                      <MatchLineupLogisticsRow
                        type="fahrerHelperIds"
                        label="🚗 Fahrer"
                        event={event}
                        team={team}
                        isReadOnly={isReadOnly}
                        myHelperId={myHelperId}
                        hideIcon={true}
                        sortedAllHelpers={sortedAllHelpers}
                        filteredLogisticsHelpers={filteredLogisticsHelpers}
                        openLogisticsPicker={openLogisticsPicker}
                        setOpenLogisticsPicker={setOpenLogisticsPicker}
                        logisticsSearchTerm={logisticsSearchTerm}
                        setLogisticsSearchTerm={setLogisticsSearchTerm}
                        localLogisticsOverrides={localLogisticsOverrides}
                        matchLineups={matchLineups}
                        onLogisticsAction={onLogisticsAction}
                        onDepartureTimeChange={onDepartureTimeChange}
                      />
                    </div>
                    {/* Fester Platzhalter für Google-Maps Button, damit die Breite absolut identisch bleibt */}
                    {(isHeim || !event.location) && (
                      <div className="w-6 h-6 shrink-0 opacity-0 pointer-events-none" aria-hidden="true" />
                    )}
                  </div>
                )}

              </div>

              {/* RECHTE SEITE: Status & Siegel */}
              <div className="flex items-center gap-2">
                <span
                  className={`flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded border ${
                    isOverride ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-blue-50 text-blue-700 border-blue-200'
                  }`}
                  title={`${activePlayers.length} Spieler eingeteilt`}
                >
                  <Users className="w-3 h-3" /> {activePlayers.length}
                </span>

                {!isReadOnly && (!isPast || isFocusedRow) ? (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onToggleLock(safeEventId, !isManuallyLocked); }}
                    className={`flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded border transition-colors ${
                      isManuallyLocked ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100' :
                      isAutoFrozen ? 'bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-200' :
                      'bg-white text-gray-500 border-gray-200 hover:bg-gray-100 hover:text-gray-700'
                    }`}
                    title={isAutoFrozen ? `Auto-Freeze aktiv (${leadDays} Tage). Klick für manuelles Siegel.` : 'Kader manuell versiegeln (Sperre)'}
                  >
                    {isFrozen ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                    {isFrozen ? 'Versiegelt' : 'Offen'}
                  </button>
                ) : (
                  isFrozen && (
                    <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded border bg-gray-100 text-gray-600">
                      <Lock className="w-3 h-3" /> Versiegelt
                    </span>
                  )
                )}
              </div>

            </div>

            {/* KARTEN-BODY: Uhrzeit & Spieltitel */}
            <div className="p-2">
              <div
                className="flex flex-col sm:flex-row sm:items-center p-2 rounded transition"
                style={{ borderLeftWidth: '4px', borderLeftColor: subscriptionColor || '#3b82f6' }}
              >
                <div className="w-20 shrink-0 text-xs font-bold text-gray-500 mb-1 sm:mb-0">
                  {timeStr}
                </div>
                <div className="flex-1 min-w-0 pr-4">
                  <div className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
                    {isPast && !isFocusedRow && <Lock className="w-3.5 h-3.5 text-gray-400 shrink-0" />}
                    <span>{displayTitle}</span>
                  </div>
                </div>
              </div>

              {/* SPIELER-PILLEN */}
              <div className="mt-2 pt-2 border-t border-gray-100">
                <div className="flex flex-wrap items-center gap-2">
                  {displayMembers.map(({ helper: m, category }) => {
                    const isPlaying = activePlayers.includes(m.id);
                    const isMyColumn = m.id === myHelperId;
                    const gameCount = playerGameCounts[m.id] || 0;

                    let checkColor = 'text-blue-600';
                    if (isOverride) checkColor = 'text-orange-500';
                    else if (category === 'STAMM') checkColor = 'text-green-600';

                    const avail = localAvailOverrides[safeEventId]?.[m.id] || storeLineup?.availabilities?.[m.id] || 'UNKNOWN';
                    const isSetByMF = localSetByMFOverrides[safeEventId]?.[m.id] !== undefined
                      ? localSetByMFOverrides[safeEventId]?.[m.id]
                      : (storeLineup?.isSetByMF?.[m.id] || false);

                    let pillBgClass = 'bg-white border-gray-200 text-gray-700';
                    if (avail === 'AVAILABLE') pillBgClass = 'bg-green-100/70 border-green-300 text-gray-900';
                    else if (avail === 'UNAVAILABLE') pillBgClass = 'bg-red-100/70 border-red-300 text-gray-900';
                    else if (isPlaying) pillBgClass = 'bg-blue-50/40 border-blue-200 text-gray-900';

                    const stripedStyle = (isSetByMF && avail !== 'UNKNOWN') ? {
                      backgroundImage: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.6), rgba(255,255,255,0.6) 6px, transparent 6px, transparent 12px)'
                    } : undefined;

                    const canEditAvail = (isMyColumn || !isReadOnly) && (!isPast || isFocusedRow);
                    const canTogglePlay = !isReadOnly && (!isPast || isFocusedRow);

                    let tooltipText = `${m.name} (${gameCount} Sp.)`;
                    if (canEditAvail) {
                      tooltipText = isMyColumn
                        ? "Auf Namen klicken, um deine Verfügbarkeit zu ändern (Da / Weg / ?)"
                        : "Auf Namen klicken, um Verfügbarkeit als MF zu überschreiben (Da / Weg / ?)";
                    } else if (isSetByMF) {
                      tooltipText = "Status wurde manuell vom Mannschaftsführer gesetzt";
                    }

                    return (
                      <div
                        key={m.id}
                        style={stripedStyle}
                        className={`inline-flex items-center rounded-lg border shadow-2xs transition-all select-none ${pillBgClass} ${
                          isMyColumn ? 'ring-1 ring-blue-400' : ''
                        }`}
                      >
                        <button
                          type="button"
                          disabled={!canTogglePlay}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (canTogglePlay) {
                              onTogglePlayer(safeEventId, m.id, activePlayers);
                            }
                          }}
                          className={`pl-2 pr-1.5 py-1.5 flex items-center justify-center rounded-l-lg transition-colors ${
                            canTogglePlay ? 'cursor-pointer hover:bg-black/5' : 'cursor-default'
                          }`}
                          title={canTogglePlay ? "Kader-Nominierung setzen/entfernen" : (isPlaying ? "Aufgestellt" : "Nicht aufgestellt")}
                        >
                          {isPlaying ? (
                            <CheckSquare className={`w-4 h-4 pointer-events-none ${checkColor}`} />
                          ) : (
                            <Square className={`w-4 h-4 pointer-events-none ${isReadOnly ? 'text-gray-300' : 'text-gray-400'}`} />
                          )}
                        </button>

                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            if (canEditAvail) {
                              onToggleAvailability(safeEventId, m.id, isPlaying, isFrozen);
                            }
                          }}
                          title={tooltipText}
                          className={`pr-2.5 pl-1 py-1 flex items-center gap-1.5 rounded-r-lg ${
                            canEditAvail ? 'cursor-pointer hover:bg-black/5' : 'cursor-default'
                          }`}
                        >
                          <span className={`text-xs ${isPlaying ? 'font-bold text-gray-900' : 'font-medium text-gray-600'} ${avail === 'UNAVAILABLE' && !isPlaying ? 'line-through opacity-75' : ''}`}>
                            {m.alias || m.name.split(' ')[0]}
                          </span>

                          <span className="text-[10px] text-gray-400 font-medium" title={`${gameCount} Spiele in dieser Saison`}>
                            ({gameCount})
                          </span>

                          {avail === 'AVAILABLE' && (
                            <span className="text-[9px] font-extrabold bg-green-200/80 text-green-900 px-1.5 py-0.2 rounded uppercase">
                              DA
                            </span>
                          )}
                          {avail === 'UNAVAILABLE' && (
                            <span className="text-[9px] font-extrabold bg-red-200/80 text-red-900 px-1.5 py-0.2 rounded uppercase">
                              WEG
                            </span>
                          )}
                          {avail === 'UNKNOWN' && isMyColumn && (
                            <span className="text-[9px] font-bold bg-gray-200 text-gray-600 px-1.5 py-0.2 rounded">
                              ?
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
// --- END OF FILE ---