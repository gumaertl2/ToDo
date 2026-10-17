// [2026-10-17] - BUGFIX: Scanner kontextsensitiv gemacht (erhält nun explorerCollection als Parameter), damit 'eventId' bei Umfragen korrekt auf 'calendarEvents' gemappt wird statt auf 'events'.
// [2026-10-17] - REFACTOR: Auslagerung des Data Explorers aus der überladenen ReportsView.tsx. Enthält die hybride Smart-Mapping Logik, CSV/TSV Exporte und Tabellen-Filter.
// [2026-10-17] - BUGFIX: Smart-Mapping Scanner (getTargetCollectionForColumn) case-insensitive gemacht.
// src/features/Reports/DataExplorerTab.tsx
import React, { useMemo, useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useClubStore } from '../../store/useClubStore';
import type { EventPollResponse } from '../../core/types/models';
import { Settings2, ArrowUp, ArrowDown, ArrowUpDown, Copy, Check, Download, Link } from 'lucide-react';
import { ColumnMappingPopover } from './ColumnMappingPopover';

// CHIRURGISCHER EINGRIFF: Kontextsensitiver Hybrid-Scanner
const getTargetCollectionForColumn = (col: string, currentView: string): string | null => {
  // 0. Kontext-Overrides (z.B. Umfragen hängen an Kalender-Terminen, nicht an Vorstands-Sitzungen)
  if (col === 'eventId' && currentView === 'eventPollResponses') {
    return 'calendarEvents';
  }

  // 1. Exakte Ausnahmen (für historische/spezielle Felder)
  const exactMatches: Record<string, string> = {
    eventId: 'events',
    parentItemId: 'allAgendaItems',
    baseItemId: 'allAgendaItems',
    roleProfileId: 'roleProfiles',
    subscriptionId: 'calendarSubscriptions'
  };
  if (exactMatches[col]) return exactMatches[col];

  // 2. Dynamisches Pattern-Matching (Case-Insensitive für Endungen)
  const lowerCol = col.toLowerCase();
  if (lowerCol.endsWith('helperids') || lowerCol.endsWith('helperid')) return 'helpers';
  if (lowerCol.endsWith('userids') || lowerCol.endsWith('userid')) return 'users';
  if (lowerCol.endsWith('teamids') || lowerCol.endsWith('teamid')) return 'teams';
  if (lowerCol.endsWith('groupids') || lowerCol.endsWith('groupid')) return 'groups';

  return null;
};

export const DataExplorerTab: React.FC = () => {
  const { 
    tasks, users, events, 
    allAgendaItems, helpers, groups, teams, 
    roleProfiles, calendarEvents, calendarSubscriptions, teamPins, templates,
    matchLineups, pollResponsesByEvent
  } = useClubStore();

  const [explorerCollection, setExplorerCollection] = useState<string>('allAgendaItems');
  const [selectedCols, setSelectedCols] = useState<string[]>([]);
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [allPollResponses, setAllPollResponses] = useState<EventPollResponse[]>([]);

  // Smart-Mapping State (mit LocalStorage Persistenz)
  const [columnMappings, setColumnMappings] = useState<Record<string, string>>(() => {
    try { return JSON.parse(localStorage.getItem('papatodo_explorer_mappings') || '{}'); } catch { return {}; }
  });
  const [activeMappingCol, setActiveMappingCol] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem('papatodo_explorer_mappings', JSON.stringify(columnMappings));
  }, [columnMappings]);

  // Lade alle Referenz-Kollektionen für das Mapping
  const storeCollections: Record<string, any[]> = useMemo(() => ({
    events, users, helpers, allAgendaItems, roleProfiles, teams, groups, calendarSubscriptions, calendarEvents
  }), [events, users, helpers, allAgendaItems, roleProfiles, teams, groups, calendarSubscriptions, calendarEvents]);

  const getAvailableKeysForCollection = (colName: string) => {
    const data = storeCollections[colName] || [];
    const keys = new Set<string>();
    data.forEach(item => Object.keys(item).forEach(k => keys.add(k)));
    return Array.from(keys).sort();
  };

  useEffect(() => {
    if (explorerCollection === 'eventPollResponses') {
      getDocs(collection(db, 'event_poll_responses'))
        .then((snap) => {
          const list: EventPollResponse[] = [];
          snap.forEach((d) => list.push({ ...d.data(), id: d.id } as EventPollResponse));
          setAllPollResponses(list);
        })
        .catch((err) => {
          console.error('Fehler beim Laden der EventPollResponses für Data Explorer:', err);
        });
    }
  }, [explorerCollection]);

  const rawExplorerData = useMemo(() => {
    switch (explorerCollection) {
      case 'allAgendaItems': return allAgendaItems;
      case 'events': return events;
      case 'users': return users;
      case 'helpers': return helpers;
      case 'groups': return groups;
      case 'teams': return teams;
      case 'roleProfiles': return roleProfiles;
      case 'calendarEvents': return calendarEvents;
      case 'calendarSubscriptions': return calendarSubscriptions;
      case 'teamPins': return teamPins;
      case 'templates': return templates;
      case 'matchLineups': return matchLineups;
      case 'eventPollResponses': {
        if (allPollResponses.length > 0) return allPollResponses;
        return Object.values(pollResponsesByEvent || {}).flat();
      }
      default: return tasks;
    }
  }, [explorerCollection, allAgendaItems, events, users, helpers, groups, teams, roleProfiles, calendarEvents, calendarSubscriptions, teamPins, templates, matchLineups, allPollResponses, pollResponsesByEvent, tasks]);

  const allKeys = useMemo(() => {
    const keys = new Set<string>();
    rawExplorerData.forEach(item => Object.keys(item).forEach(k => keys.add(k)));
    return Array.from(keys).sort();
  }, [rawExplorerData]);

  useEffect(() => {
    setSelectedCols(allKeys);
    setColumnFilters({});
    setSortConfig(null);
  }, [explorerCollection, allKeys]);

  const handleFilterChange = (col: string, value: string) => {
    setColumnFilters(prev => ({
      ...prev,
      [col]: value
    }));
  };

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // ZENTRALER ÜBERSETZER: Löst IDs in Klarnamen auf (nutzt das Mapping)
  const getDisplayValue = (item: any, col: string) => {
    const val = item[col];
    if (val === null || val === undefined) return '';

    if (columnMappings[col]) {
      const targetColName = getTargetCollectionForColumn(col, explorerCollection);
      if (targetColName) {
        const targetData = storeCollections[targetColName] || [];
        const displayKey = columnMappings[col];

        const translate = (id: string) => {
          const found = targetData.find((d: any) => d.id === id);
          return found && found[displayKey] ? String(found[displayKey]) : `[ID: ${id}]`;
        };

        if (Array.isArray(val)) {
            return val.map(id => translate(id)).join(', ');
        } else {
            return translate(String(val));
        }
      }
    }

    if (typeof val === 'object') {
      try { return JSON.stringify(val); } catch(e) { return String(val); }
    }
    return String(val);
  };

  // Verarbeitet die Filter- und Sortierlogik über die Klarnamen
  const processedExplorerData = useMemo(() => {
    let data = [...rawExplorerData];

    Object.entries(columnFilters).forEach(([key, filterValue]) => {
      if (!filterValue) return;
      const lowerFilter = filterValue.toLowerCase();
      data = data.filter(row => {
        const displayVal = getDisplayValue(row, key);
        return displayVal.toLowerCase().includes(lowerFilter);
      });
    });

    if (sortConfig) {
      data.sort((a, b) => {
        let valA = getDisplayValue(a, sortConfig.key);
        let valB = getDisplayValue(b, sortConfig.key);
        
        if (valA === valB) return 0;
        if (!valA) return 1; 
        if (!valB) return -1;
        
        valA = valA.toLowerCase();
        valB = valB.toLowerCase();
        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return data;
  }, [rawExplorerData, columnFilters, sortConfig, columnMappings, storeCollections, explorerCollection]);

  const handleExportCSV = () => {
    if (processedExplorerData.length === 0 || selectedCols.length === 0) return;
    
    const header = selectedCols.join(';');
    const rows = processedExplorerData.map(item => {
      return selectedCols.map(col => {
        let val = getDisplayValue(item, col);
        val = val.replace(/"/g, '""');
        return `"${val}"`;
      }).join(';');
    });

    const csvContent = [header, ...rows].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `papatodo_export_${explorerCollection}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyToClipboard = () => {
    if (processedExplorerData.length === 0 || selectedCols.length === 0) return;

    const header = selectedCols.join('\t');
    const rows = processedExplorerData.map(item => {
      return selectedCols.map(col => {
        let val = getDisplayValue(item, col);
        val = val.replace(/\t/g, ' ').replace(/\n/g, ' ').replace(/\r/g, '');
        return val;
      }).join('\t');
    });

    const tsvContent = [header, ...rows].join('\n');
    navigator.clipboard.writeText(tsvContent).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }).catch(err => {
      console.error('Fehler beim Kopieren in die Zwischenablage', err);
    });
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 flex flex-col flex-1 min-h-[500px]">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
        <div className="flex items-center gap-3 w-full lg:w-auto">
          <select
            value={explorerCollection}
            onChange={(e) => setExplorerCollection(e.target.value)}
            className="p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold text-indigo-900 focus:ring-indigo-500 outline-none w-full lg:w-auto"
          >
            <option value="allAgendaItems">Alle Agenda-Items & Tasks</option>
            <option value="events">Sitzungen (Events)</option>
            <option value="users">App-Nutzer (Users)</option>
            <option value="helpers">Mitglieder & Helfer</option>
            <option value="groups">Ämter & Rollen (Groups)</option>
            <option value="teams">Teams & Kader</option>
            <option value="roleProfiles">Rechte-Profile</option>
            <option value="calendarEvents">Kalender-Termine</option>
            <option value="calendarSubscriptions">Kalender-Abos</option>
            <option value="matchLineups">Aufstellungen (MatchLineups)</option>
            <option value="eventPollResponses">Umfrage-Antworten (Polls)</option>
            <option value="teamPins">Team-PINs</option>
            <option value="templates">Vorlagen</option>
          </select>
          <div className="text-xs font-bold text-gray-400 bg-gray-100 px-3 py-2 rounded-lg shrink-0">
            {processedExplorerData.length} Treffer
          </div>
        </div>
        
        <div className="flex gap-2 w-full lg:w-auto">
          <button 
            onClick={handleCopyToClipboard} 
            disabled={processedExplorerData.length === 0 || selectedCols.length === 0}
            className="flex-1 lg:flex-none flex justify-center items-center px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-bold text-sm shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-gray-300"
          >
            {isCopied ? <Check className="w-4 h-4 mr-2 text-green-600" /> : <Copy className="w-4 h-4 mr-2" />}
            Kopieren
          </button>
          <button 
            onClick={handleExportCSV} 
            disabled={processedExplorerData.length === 0 || selectedCols.length === 0}
            className="flex-1 lg:flex-none flex justify-center items-center px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold text-sm shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4 mr-2" />
            CSV Export
          </button>
        </div>
      </div>
      
      <div className="mb-4">
        <details className="group bg-gray-50 rounded-lg border border-gray-200">
          <summary className="cursor-pointer text-sm font-bold text-indigo-700 flex items-center p-3 select-none">
            <Settings2 className="w-4 h-4 mr-2" />
            Spalten konfigurieren ({selectedCols.length} von {allKeys.length} sichtbar)
          </summary>
          <div className="p-4 border-t border-gray-200 max-h-48 overflow-y-auto flex flex-wrap gap-2">
            {allKeys.map(k => (
              <label key={k} className="flex items-center gap-2 text-xs bg-white border border-gray-200 px-3 py-1.5 rounded shadow-sm cursor-pointer hover:bg-indigo-50 transition-colors">
                <input
                  type="checkbox"
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                  checked={selectedCols.includes(k)}
                  onChange={(e) => {
                    if(e.target.checked) setSelectedCols([...selectedCols, k]);
                    else setSelectedCols(selectedCols.filter(c => c !== k));
                  }}
                />
                <span className="font-mono text-gray-700">{k}</span>
              </label>
            ))}
          </div>
        </details>
      </div>

      <div className="flex-1 overflow-auto border border-gray-200 rounded-lg custom-scrollbar relative">
        <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
          <thead className="bg-gray-100 sticky top-0 z-10 shadow-sm">
            <tr>
              {selectedCols.map(col => {
                const targetCol = getTargetCollectionForColumn(col, explorerCollection);
                return (
                  <th key={col} className="p-2 border-b border-r border-gray-200 bg-gray-100 align-top relative">
                    <div 
                      className="flex items-center justify-between cursor-pointer hover:bg-gray-200 p-1.5 rounded transition-colors group"
                      onClick={() => handleSort(col)}
                    >
                      <div className="flex items-center">
                        <span className="font-bold text-gray-700 font-mono tracking-tight">{col}</span>
                        
                        {targetCol && (
                          <div className="relative inline-block ml-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMappingCol(activeMappingCol === col ? null : col);
                              }}
                              className={`p-1 rounded transition-colors flex items-center justify-center ${columnMappings[col] ? 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100' : 'text-gray-400 hover:text-indigo-500 hover:bg-gray-200'}`}
                              title="Feld-Zuweisung ändern"
                            >
                              {columnMappings[col] ? <Link className="w-3 h-3" /> : <Settings2 className="w-3 h-3" />}
                            </button>
                            {activeMappingCol === col && (
                              <ColumnMappingPopover
                                columnName={col}
                                targetCollection={targetCol}
                                availableKeys={getAvailableKeysForCollection(targetCol)}
                                currentDisplayKey={columnMappings[col] || null}
                                onSave={(key) => {
                                  setColumnMappings(prev => ({...prev, [col]: key}));
                                }}
                                onRemove={() => {
                                  setColumnMappings(prev => { const copy = {...prev}; delete copy[col]; return copy; });
                                }}
                                onClose={() => setActiveMappingCol(null)}
                              />
                            )}
                          </div>
                        )}

                      </div>
                      {sortConfig?.key === col ? (
                        sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 ml-1 text-indigo-600" /> : <ArrowDown className="w-3 h-3 ml-1 text-indigo-600" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 ml-1 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}
                    </div>
                    <div className="mt-1 px-1 pb-1">
                      <input 
                        type="text" 
                        placeholder="Suchen..." 
                        value={columnFilters[col] || ''}
                        onChange={(e) => handleFilterChange(col, e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full text-[10px] p-1.5 border border-gray-300 rounded outline-none focus:border-indigo-500 font-sans font-normal shadow-sm"
                      />
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {processedExplorerData.map((row, idx) => (
              <tr key={idx} className="border-b border-gray-100 hover:bg-indigo-50 transition-colors">
                {selectedCols.map(col => {
                  const display = getDisplayValue(row, col) || '-';

                  return (
                    <td 
                      key={col} 
                      className="p-3 border-r border-gray-100 max-w-[250px] truncate text-gray-600 font-mono" 
                      title={display}
                    >
                      {display}
                    </td>
                  );
                })}
              </tr>
            ))}
            {processedExplorerData.length === 0 && (
              <tr>
                <td colSpan={selectedCols.length} className="p-8 text-center text-gray-400 font-medium">
                  Keine Treffer für diese Filterkriterien.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
// --- END OF FILE ---