// [2026-10-12] - BUGFIX: e.stopPropagation() beim Google Maps Link ergänzt, um unbeabsichtigtes Schließen/Zurückspringen des Modals zu verhindern.
// [2026-10-12] - REFACTOR: Logistik-Reihe (Fahrer/Betreuer) aus MatchLineupMatrixModal in eigene Komponente ausgelagert.
// src/features/Users/components/MatchLineupLogisticsRow.tsx
import React from 'react';
import { Search, Clock, Map } from 'lucide-react';
import type { Team, MatchLineup, Helper } from '../../../core/types/models';
import { sanitizeId } from '../hooks/useMatchLineupMatrix';

interface MatchLineupLogisticsRowProps {
  type: 'fahrerHelperIds' | 'betreuerHelperIds';
  label: string;
  event: any;
  team: Team;
  isReadOnly?: boolean;
  myHelperId?: string | null;
  sortedAllHelpers: Helper[];
  filteredLogisticsHelpers: Helper[];
  openLogisticsPicker: string | null;
  setOpenLogisticsPicker: (val: string | null) => void;
  logisticsSearchTerm: string;
  setLogisticsSearchTerm: (val: string) => void;
  localLogisticsOverrides: Record<string, { fahrerHelperIds?: string[], betreuerHelperIds?: string[], departureTime?: string }>;
  matchLineups: MatchLineup[];
  onLogisticsAction: (eventId: string, type: 'fahrerHelperIds' | 'betreuerHelperIds', action: 'add' | 'remove' | 'takeover', targetHelperId: string, oldHelperId?: string) => void;
  onDepartureTimeChange: (eventId: string, newTime: string) => void;
}

export const MatchLineupLogisticsRow: React.FC<MatchLineupLogisticsRowProps> = ({
  type,
  label,
  event,
  team,
  isReadOnly,
  myHelperId,
  sortedAllHelpers,
  filteredLogisticsHelpers,
  openLogisticsPicker,
  setOpenLogisticsPicker,
  logisticsSearchTerm,
  setLogisticsSearchTerm,
  localLogisticsOverrides,
  matchLineups,
  onLogisticsAction,
  onDepartureTimeChange
}) => {
  const safeEventId = sanitizeId(event.uid);
  const pickerKey = `${safeEventId}-${type}`;
  const isPickerOpen = openLogisticsPicker === pickerKey;
  const storeLineup = matchLineups.find(m => m.id === safeEventId);
  const isPast = event.startTime < Date.now();
  
  const ids = localLogisticsOverrides[safeEventId]?.[type] !== undefined 
    ? localLogisticsOverrides[safeEventId][type]! 
    : (storeLineup?.[type] || []);

  const currentDepartureTime = localLogisticsOverrides[safeEventId]?.departureTime !== undefined
    ? localLogisticsOverrides[safeEventId].departureTime!
    : (storeLineup?.departureTime || '');

  const [emoji, ...textParts] = label.split(' ');
  const roleName = textParts.join(' ');
  
  // Maps-Routing Logik (Nur für Auswärtsspiele interessant)
  const isHomeGame = event.location?.toLowerCase().includes('maisach') || false;

  return (
    <div className="flex flex-row items-center gap-1.5">
      <span className="text-base cursor-help shrink-0 w-6 text-center" title={roleName}>{emoji}</span>
      <div className="flex flex-wrap items-center gap-1.5 flex-1 relative">
        {ids.map(id => {
          const h = sortedAllHelpers.find(x => x.id === id);
          if (!h) return null;
          const isMe = id === myHelperId;
          
          return (
            <button
              key={id}
              onClick={(e) => {
                e.stopPropagation();
                if (isPast) return;
                if (!isReadOnly) {
                  if (window.confirm(`Möchtest du ${h.name} als ${roleName} entfernen?`)) {
                     onLogisticsAction(event.uid, type, 'remove', id);
                  }
                } else if (!isMe) {
                  if (window.confirm(`Möchtest du den Dienst von ${h.name} wirklich übernehmen?`)) {
                     if (myHelperId) onLogisticsAction(event.uid, type, 'takeover', myHelperId, id);
                  }
                }
              }}
              disabled={isPast || (isReadOnly && isMe)}
              className={`text-[11px] font-bold px-2 py-0.5 rounded border transition-colors shadow-sm ${isMe ? 'bg-purple-100 text-purple-800 border-purple-200' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
              title={!isReadOnly ? "Klicken zum Entfernen" : (!isMe ? "Klicken zum Übernehmen (Tauschen)" : "Du bist fest eingeteilt")}
            >
              {h.alias || h.name.split(' ')[0]}
            </button>
          );
        })}
        
        {!isPast && (
          !isReadOnly ? (
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenLogisticsPicker(isPickerOpen ? null : pickerKey);
                  setLogisticsSearchTerm('');
                }}
                className="text-[14px] leading-none font-bold bg-white border border-dashed border-gray-300 text-gray-500 rounded w-6 h-6 flex items-center justify-center hover:bg-gray-50 hover:border-gray-400 transition-colors shadow-sm"
                title={`${roleName} zuweisen`}
              >
                +
              </button>

              {isPickerOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setOpenLogisticsPicker(null); }}></div>
                  <div className="absolute left-0 top-full mt-1.5 w-64 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 overflow-hidden flex flex-col">
                    <div className="p-2 border-b border-gray-100 bg-gray-50 flex items-center relative">
                      <Search className="w-3.5 h-3.5 text-gray-400 absolute left-4" />
                      <input
                        autoFocus
                        type="text"
                        placeholder="Name suchen..."
                        value={logisticsSearchTerm}
                        onChange={(e) => setLogisticsSearchTerm(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        autoComplete="new-password"
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck={false}
                        className="w-full pl-7 pr-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div className="max-h-48 overflow-y-auto p-1 custom-scrollbar">
                      {filteredLogisticsHelpers.length === 0 ? (
                        <div className="p-3 text-center text-xs text-gray-500">Keine Spieler gefunden.</div>
                      ) : (
                        filteredLogisticsHelpers.map(h => (
                          <button
                            key={h.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              onLogisticsAction(event.uid, type, 'add', h.id);
                              setOpenLogisticsPicker(null);
                            }}
                            className="w-full text-left px-2 py-1.5 text-xs text-gray-800 hover:bg-blue-50 hover:text-blue-700 rounded transition-colors flex items-center justify-between"
                          >
                            <span className="font-medium truncate">{h.name}</span>
                            {h.alias && <span className="text-[10px] text-gray-400 ml-2 shrink-0">{h.alias}</span>}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            myHelperId && !ids.includes(myHelperId) && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (window.confirm(`Möchtest du dich verbindlich als ${roleName} eintragen?`)) {
                    onLogisticsAction(event.uid, type, 'add', myHelperId);
                  }
                }}
                className="text-[14px] leading-none font-bold bg-white border border-dashed border-gray-300 text-gray-500 rounded w-6 h-6 flex items-center justify-center hover:bg-gray-50 hover:border-gray-400 transition-colors shadow-sm"
                title="Dienst verbindlich übernehmen (Ich)"
              >
                +
              </button>
            )
          )
        )}
        
        {ids.length === 0 && isReadOnly && (!myHelperId || ids.includes(myHelperId)) && (
           <span className="text-[10px] text-gray-400 italic py-0.5">Noch offen</span>
        )}

        {/* Abfahrtszeit Input & Google Maps Link */}
        {type === 'fahrerHelperIds' && (ids.length > 0 || !isReadOnly) && (
          <div className="flex items-center ml-1 border-l border-gray-200/60 pl-1 shrink-0 gap-1">
             <Clock className="w-3 h-3 text-gray-400" />
             <input
               type="time"
               lang="de-DE"
               value={currentDepartureTime}
               onChange={(e) => onDepartureTimeChange(event.uid, e.target.value)}
               disabled={isReadOnly || isPast}
               className={`text-[11px] font-bold p-0.5 rounded border shadow-sm outline-none transition-colors ${isReadOnly || isPast ? 'bg-transparent border-transparent text-gray-600' : 'bg-white border-gray-300 text-gray-900 hover:border-gray-400 focus:border-blue-500 cursor-pointer'}`}
               title="Abfahrtszeit"
             />
             {!isHomeGame && event.location && (
               <a 
                 href={`https://www.google.com/maps/dir/?api=1${team.homeArenaAddress ? `&origin=${encodeURIComponent(team.homeArenaAddress)}` : ''}&destination=${encodeURIComponent(event.location)}`}
                 target="_blank"
                 rel="noopener noreferrer"
                 onClick={(e) => e.stopPropagation()}
                 title="Fahrzeit in Google Maps berechnen (Start: Heimhalle / Treffpunkt)"
                 className="p-1 rounded bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 transition-colors"
               >
                 <Map className="w-3 h-3" />
               </a>
             )}
          </div>
        )}
      </div>
    </div>
  );
};
// --- END OF FILE ---