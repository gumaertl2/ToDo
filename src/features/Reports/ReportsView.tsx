// [2026-06-04] - FEATURE: "Copy to Clipboard"-Funktion in Data Explorer integriert. Generiert TSV (Tab-Separated Values) für verlustfreies Copy&Paste direkt in den KI-Chat oder nach Excel.
// [2026-06-04] - FEATURE: Data-Explorer (Phase 2) massiv aufgerüstet. Dropdown auf alle 11 Haupt-Kollektionen erweitert (inkl. Helfer, Teams, Profile). Spaltenköpfe bieten nun direkte In-App Filter (Textsuche) und Sortierung (ASC/DESC). Der CSV-Export exportiert nun exakt die gefilterte und sortierte Ansicht.
// [2026-06-04] - FEATURE: Data-Explorer (Phase 1) integriert. Flache, unmaskierte Tabellenansicht für alle Hauptkollektionen (Tasks, Events, Users) mit CSV/Excel-Exportfunktion zur Identifikation von Datenbank-Anomalien (Legacy-Daten).
// [2026-05-28] - BUGFIX: Workload-Statistik nutzt nun das korrekte Feld 'u.amt' (Amt im Verein) anstatt des veralteten Feldes 'u.rolle', um Änderungen wie "Abteilungsleiter" korrekt in Echtzeit anzuzeigen.
// 2026-04-17 11:30 - OPTIMIERUNG: Jubiläen in UsersView verschoben, Reports fokussiert sich auf Projekte
// 2026-04-24 21:00 - BUGFIX: Fristen-Radar ignoriert abgeschlossene/archivierte Projekte
// 2026-04-24 21:30 - BUGFIX: Fristen-Radar zu 100% mit der ToDo-Liste synchronisiert (Mitternachts-Logik & 7-Tage-Fenster)
// 2026-04-24 22:15 - BUGFIX: 'isTemplate' Flag berücksichtigt - Vorlagen werden nun korrekt aus allen Statistiken gefiltert
// src/features/Reports/ReportsView.tsx
import React, { useMemo, useState, useEffect } from 'react';
import { useClubStore } from '../../store/useClubStore';
import { BarChart2, Clock, CheckCircle, AlertTriangle, Target, Users, FolderSearch, Database, Download, Settings2, ArrowUp, ArrowDown, ArrowUpDown, Copy, Check } from 'lucide-react';

export const ReportsView: React.FC = () => {
  const { 
    tasks, users, events, 
    allAgendaItems, helpers, groups, teams, 
    roleProfiles, calendarEvents, calendarSubscriptions, teamPins, templates 
  } = useClubStore();
  
  const [selectedSeriesId, setSelectedSeriesId] = useState<string>('');
  
  // Tabs Navigation
  const [activeTab, setActiveTab] = useState<'reports' | 'explorer'>('reports');

  // Data Explorer State
  const [explorerCollection, setExplorerCollection] = useState<string>('allAgendaItems');
  const [selectedCols, setSelectedCols] = useState<string[]>([]);
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  // Data Explorer Logic
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
      default: return tasks;
    }
  }, [explorerCollection, allAgendaItems, events, users, helpers, groups, teams, roleProfiles, calendarEvents, calendarSubscriptions, teamPins, templates, tasks]);

  const allKeys = useMemo(() => {
    const keys = new Set<string>();
    rawExplorerData.forEach(item => Object.keys(item).forEach(k => keys.add(k)));
    return Array.from(keys).sort();
  }, [rawExplorerData]);

  // Wenn die Kollektion gewechselt wird, initial alle Spalten aktivieren und Filter/Sortierung zurücksetzen
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

  // Verarbeitet die Filter- und Sortierlogik auf dem rawExplorerData Array
  const processedExplorerData = useMemo(() => {
    let data = [...rawExplorerData];

    // 1. Filter anwenden
    Object.entries(columnFilters).forEach(([key, filterValue]) => {
      if (!filterValue) return;
      const lowerFilter = filterValue.toLowerCase();
      data = data.filter(row => {
        let val = (row as any)[key];
        if (val === null || val === undefined) return false;
        if (typeof val === 'object') {
          try { val = JSON.stringify(val); } catch(e) { val = String(val); }
        }
        return String(val).toLowerCase().includes(lowerFilter);
      });
    });

    // 2. Sortierung anwenden
    if (sortConfig) {
      data.sort((a, b) => {
        let valA = (a as any)[sortConfig.key];
        let valB = (b as any)[sortConfig.key];
        
        if (valA === valB) return 0;
        if (valA === null || valA === undefined) return 1; 
        if (valB === null || valB === undefined) return -1;
        
        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
        }
        
        valA = String(valA).toLowerCase();
        valB = String(valB).toLowerCase();
        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return data;
  }, [rawExplorerData, columnFilters, sortConfig]);

  const handleExportCSV = () => {
    if (processedExplorerData.length === 0 || selectedCols.length === 0) return;
    
    const header = selectedCols.join(';');
    const rows = processedExplorerData.map(item => {
      return selectedCols.map(col => {
        let val = (item as any)[col];
        if (val === null || val === undefined) return '';
        if (typeof val === 'object') {
          try { val = JSON.stringify(val); } catch(e) { val = String(val); }
        } else {
          val = String(val);
        }
        // Excel-sicheres Escaping
        val = val.replace(/"/g, '""');
        return `"${val}"`;
      }).join(';');
    });

    const csvContent = [header, ...rows].join('\n');
    // uFEFF erzwingt UTF-8 in Excel
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
        let val = (item as any)[col];
        if (val === null || val === undefined) return '';
        if (typeof val === 'object') {
          try { val = JSON.stringify(val); } catch(e) { val = String(val); }
        } else {
          val = String(val);
        }
        // Tab-sicheres Escaping
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

  // CHIRURGISCHER EINGRIFF: Zentraler Filter für "wirklich aktive" Aufgaben (isTemplate hinzugefügt)
  const trulyActiveTasks = useMemo(() => {
    return tasks.filter(t => {
      if (t.type !== 'AUFGABE') return false;
      
      // NEU: Vorlagen (Baupläne) dürfen niemals in die aktive Statistik einfließen
      if (t.isTemplate) return false;

      if (t.eventId) {
        const ev = events.find(e => e.id === t.eventId);
        if (!ev) return true; 
        if (ev.status === 'ABGESCHLOSSEN' || ev.isArchived) return false;
        if (ev.status === 'PLANUNG' && !ev.isPublished && !t.baseItemId) return false;
      }
      return true;
    });
  }, [tasks, events]);

  const workloadData = useMemo(() => {
    return users.map(u => {
      let open = 0, inProgress = 0, done = 0;
      trulyActiveTasks.forEach(t => {
        if (t.assigneeUserIds?.includes(u.id)) {
          if (t.status === 'ERLEDIGT' || t.progress === 100) done++;
          else if (t.status === 'IN_ARBEIT') inProgress++;
          else open++;
        }
      });
      
      // CHIRURGISCHER EINGRIFF: Wir ziehen primär das echte Amt (z.B. Abteilungsleiter), mit Fallback auf die alte Rolle.
      return { name: u.name, rolle: u.amt || u.rolle || 'Ohne Amt', open, inProgress, done, total: open + inProgress + done };
    }).filter(d => d.total > 0).sort((a, b) => (b.open + b.inProgress) - (a.open + a.inProgress));
  }, [trulyActiveTasks, users]);

  const agingTasks = useMemo(() => {
    return trulyActiveTasks
      .filter(t => t.status !== 'ERLEDIGT' && t.progress !== 100)
      .sort((a, b) => (a.createdAt || Date.now()) - (b.createdAt || Date.now()))
      .slice(0, 5);
  }, [trulyActiveTasks]);

  const projectHealth = useMemo(() => {
    const seriesMap: Record<string, { title: string; total: number; done: number; overdue: number }> = {};
    
    events.forEach(e => {
      const sId = e.seriesId || e.id;
      if (!seriesMap[sId]) {
        seriesMap[sId] = { title: e.title, total: 0, done: 0, overdue: 0 };
      }
    });

    tasks.forEach(t => {
      // Auch hier: Vorlagen ignorieren
      if (t.type !== 'AUFGABE' || !t.eventId || t.isTemplate) return;
      const ev = events.find(e => e.id === t.eventId);
      if (!ev) return;
      const sId = ev.seriesId || ev.id;
      
      if (seriesMap[sId]) {
        seriesMap[sId].total++;
        if (t.status === 'ERLEDIGT' || t.progress === 100) {
          seriesMap[sId].done++;
        } else if (t.dueDate && t.dueDate < Date.now()) {
          seriesMap[sId].overdue++;
        }
      }
    });

    return Object.values(seriesMap)
      .filter(p => p.total > 0)
      .sort((a, b) => (b.total - b.done) - (a.total - a.done));
  }, [tasks, events]);

  const deadlineStats = useMemo(() => {
    let overdue = 0, next7Days = 0, noDate = 0, onTrack = 0;
    
    const now = new Date();
    now.setHours(0, 0, 0, 0); 
    const nowTime = now.getTime();
    const in7Days = nowTime + 7 * 24 * 60 * 60 * 1000;

    trulyActiveTasks.forEach(t => {
      if (t.status === 'ERLEDIGT' || t.progress === 100) return;
      
      if (t.isDueNextMeeting) {
        next7Days++;
      } else if (!t.dueDate) {
        noDate++;
      } else {
        if (t.dueDate < nowTime) overdue++;
        else if (t.dueDate <= in7Days) next7Days++;
        else onTrack++;
      }
    });
    return { overdue, next7Days, noDate, onTrack, totalActive: overdue + next7Days + noDate + onTrack };
  }, [trulyActiveTasks]);

  const projectOptions = useMemo(() => {
    const map = new Map<string, string>();
    [...events].sort((a,b) => (b.plannedStartTime || 0) - (a.plannedStartTime || 0)).forEach(e => {
      const sId = e.seriesId || e.id;
      if (!map.has(sId)) map.set(sId, e.title);
    });
    return Array.from(map.entries()).map(([id, title]) => ({ id, title })).sort((a,b) => a.title.localeCompare(b.title));
  }, [events]);

  const selectedProjectStats = useMemo(() => {
    if (!selectedSeriesId) return null;
    const eventIdsInSeries = events.filter(e => (e.seriesId || e.id) === selectedSeriesId).map(e => e.id);
    // Vorlagen explizit ausschließen
    const projectTasks = tasks.filter(t => t.type === 'AUFGABE' && t.eventId && eventIdsInSeries.includes(t.eventId) && !t.isTemplate);

    let total = 0, done = 0, overdue = 0, open = 0, inProgress = 0;
    const assigneeMap: Record<string, { name: string; total: number; done: number; inProgress: number; open: number }> = {};

    projectTasks.forEach(t => {
      total++;
      const isDone = t.status === 'ERLEDIGT' || t.progress === 100;
      
      if (isDone) done++;
      else if (t.status === 'IN_ARBEIT') inProgress++;
      else open++;

      if (!isDone && t.dueDate && t.dueDate < Date.now()) overdue++;

      if (t.assigneeUserIds && t.assigneeUserIds.length > 0) {
        t.assigneeUserIds.forEach(uid => {
          if (!assigneeMap[uid]) {
            const u = users.find(x => x.id === uid);
            assigneeMap[uid] = { name: u?.name || 'Unbekannt', total: 0, done: 0, inProgress: 0, open: 0 };
          }
          assigneeMap[uid].total++;
          if (isDone) assigneeMap[uid].done++;
          else if (t.status === 'IN_ARBEIT') assigneeMap[uid].inProgress++;
          else assigneeMap[uid].open++;
        });
      } else {
        if (!assigneeMap['unassigned']) assigneeMap['unassigned'] = { name: 'Nicht zugewiesen', total: 0, done: 0, inProgress: 0, open: 0 };
        assigneeMap['unassigned'].total++;
        if (isDone) assigneeMap['unassigned'].done++;
        else if (t.status === 'IN_ARBEIT') assigneeMap['unassigned'].inProgress++;
        else assigneeMap['unassigned'].open++;
      }
    });

    const assigneeStats = Object.values(assigneeMap).sort((a,b) => b.total - a.total);
    return { total, done, open, inProgress, overdue, assigneeStats };
  }, [selectedSeriesId, tasks, events, users]);

  return (
    <div className="h-full flex flex-col w-full max-w-6xl mx-auto pb-safe">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 px-2 md:px-0 gap-4 mt-2">
        <div className="flex items-center">
          <div className="bg-blue-600 p-3 rounded-xl text-white mr-4 shadow-lg shrink-0">
            <BarChart2 className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900">Reports & Statistik</h1>
            <p className="text-base md:text-lg text-gray-500 mt-1">Das Radar für deinen Vorstand</p>
          </div>
        </div>
        
        {/* TAB NAVIGATION */}
        <div className="flex bg-gray-100 p-1 rounded-xl shrink-0 self-start md:self-auto shadow-inner">
          <button 
            onClick={() => setActiveTab('reports')} 
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all duration-200 ${activeTab === 'reports' ? 'bg-white shadow-sm text-blue-700' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Dashboard
          </button>
          <button 
            onClick={() => setActiveTab('explorer')} 
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all duration-200 flex items-center ${activeTab === 'explorer' ? 'bg-white shadow-sm text-indigo-700' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <Database className="w-4 h-4 mr-1.5" /> 
            Data Explorer
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar px-2 md:px-0 pb-10 flex flex-col">
        {activeTab === 'reports' ? (
          <div className="space-y-6">
            <section className="bg-indigo-50/50 p-6 rounded-2xl shadow-sm border border-indigo-100">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div className="flex items-center">
                  <FolderSearch className="w-6 h-6 text-indigo-600 mr-2 shrink-0" />
                  <h2 className="text-lg font-bold text-gray-900">Projekt-Detail-Analyse</h2>
                </div>
                <select 
                  value={selectedSeriesId} 
                  onChange={e => setSelectedSeriesId(e.target.value)}
                  className="p-2.5 bg-white border border-indigo-200 rounded-lg text-sm font-bold text-indigo-900 focus:ring-indigo-500 outline-none shadow-sm min-w-[250px]"
                >
                  <option value="">-- Bitte ein Projekt wählen --</option>
                  {projectOptions.map(p => (
                    <option key={p.id} value={p.id}>{p.title}</option>
                  ))}
                </select>
              </div>

              {selectedSeriesId && selectedProjectStats ? (
                <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-300">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white p-4 rounded-xl border border-indigo-100 shadow-sm flex flex-col justify-center items-center">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Alle Aufgaben</p>
                      <p className="text-3xl font-black text-indigo-900">{selectedProjectStats.total}</p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-xl border border-green-100 shadow-sm flex flex-col justify-center items-center">
                      <p className="text-xs font-bold text-green-800 uppercase tracking-wider mb-1">Erledigt</p>
                      <p className="text-3xl font-black text-green-600">{selectedProjectStats.done}</p>
                    </div>
                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 shadow-sm flex flex-col justify-center items-center">
                      <p className="text-xs font-bold text-blue-800 uppercase tracking-wider mb-1">In Arbeit</p>
                      <p className="text-3xl font-black text-blue-600">{selectedProjectStats.inProgress}</p>
                    </div>
                    <div className="bg-red-50 p-4 rounded-xl border border-red-100 shadow-sm flex flex-col justify-center items-center">
                      <p className="text-xs font-bold text-red-800 uppercase tracking-wider mb-1">Überfällig</p>
                      <p className="text-3xl font-black text-red-600">{selectedProjectStats.overdue}</p>
                    </div>
                  </div>

                  {selectedProjectStats.assigneeStats.length > 0 && (
                    <div className="bg-white p-5 rounded-xl border border-indigo-100 shadow-sm">
                      <h3 className="text-sm font-bold text-indigo-900 mb-4">Team-Auslastung in diesem Projekt</h3>
                      <div className="space-y-4">
                        {selectedProjectStats.assigneeStats.map(ast => {
                          const donePct = (ast.done / ast.total) * 100;
                          const progPct = (ast.inProgress / ast.total) * 100;
                          const openPct = (ast.open / ast.total) * 100;
                          return (
                            <div key={ast.name}>
                              <div className="flex justify-between items-end mb-1">
                                <p className={`font-bold text-sm ${ast.name === 'Nicht zugewiesen' ? 'text-red-500' : 'text-gray-800'}`}>{ast.name}</p>
                                <span className="text-xs font-bold text-gray-500">{ast.total} Tasks</span>
                              </div>
                              <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden flex">
                                <div style={{ width: `${donePct}%` }} className="bg-green-500" title={`${ast.done} Erledigt`} />
                                <div style={{ width: `${progPct}%` }} className="bg-blue-400" title={`${ast.inProgress} In Arbeit`} />
                                <div style={{ width: `${openPct}%` }} className="bg-gray-300" title={`${ast.open} Offen`} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-indigo-400 text-sm font-medium border-2 border-dashed border-indigo-100 rounded-xl">
                  Wähle oben ein Projekt aus, um die Detailauswertung zu starten.
                </div>
              )}
            </section>

            <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
              <div className="flex items-center mb-4">
                <Target className="w-6 h-6 text-purple-600 mr-2" />
                <h2 className="text-lg font-bold text-gray-900">Globales Fristen-Radar (Alle aktiven Aufgaben)</h2>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                  <p className="text-xs font-bold text-red-800 mb-1 uppercase tracking-wider">Überfällig</p>
                  <p className="text-3xl font-black text-red-600">{deadlineStats.overdue}</p>
                </div>
                <div className="bg-orange-50 p-4 rounded-xl border border-orange-100">
                  <p className="text-xs font-bold text-orange-800 mb-1 uppercase tracking-wider">Nächste 7 Tage</p>
                  <p className="text-3xl font-black text-orange-600">{deadlineStats.next7Days}</p>
                </div>
                <div className="bg-green-50 p-4 rounded-xl border border-green-100">
                  <p className="text-xs font-bold text-green-800 mb-1 uppercase tracking-wider">Auf Kurs</p>
                  <p className="text-3xl font-black text-green-600">{deadlineStats.onTrack}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                  <p className="text-xs font-bold text-gray-600 mb-1 uppercase tracking-wider">Kein Datum</p>
                  <p className="text-3xl font-black text-gray-500">{deadlineStats.noDate}</p>
                </div>
              </div>
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                <div className="flex items-center mb-6">
                  <Users className="w-6 h-6 text-blue-600 mr-2" />
                  <h2 className="text-lg font-bold text-gray-900">Globale Workload nach Personen</h2>
                </div>

                <div className="space-y-5">
                  {workloadData.length === 0 ? (
                    <p className="text-gray-500 text-sm italic">Keine Aufgaben zugewiesen.</p>
                  ) : (
                    workloadData.map(w => {
                      const openPct = (w.open / w.total) * 100;
                      const progPct = (w.inProgress / w.total) * 100;
                      const donePct = (w.done / w.total) * 100;

                      return (
                        <div key={w.name}>
                          <div className="flex justify-between items-end mb-1">
                            <div>
                              <p className="font-bold text-gray-800 text-sm">{w.name}</p>
                              <p className="text-[10px] text-gray-400 uppercase tracking-wider">{w.rolle}</p>
                            </div>
                            <span className="text-xs font-bold text-gray-500">{w.total} Aufgaben</span>
                          </div>
                          <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden flex">
                            <div style={{ width: `${donePct}%` }} className="bg-green-500" title={`${w.done} Erledigt`} />
                            <div style={{ width: `${progPct}%` }} className="bg-blue-400" title={`${w.inProgress} In Arbeit`} />
                            <div style={{ width: `${openPct}%` }} className="bg-gray-300" title={`${w.open} Offen`} />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
                <div className="mt-6 flex items-center justify-center gap-4 text-xs text-gray-500 font-medium border-t border-gray-100 pt-4">
                  <span className="flex items-center"><span className="w-3 h-3 rounded-full bg-green-500 mr-1.5"></span>Erledigt</span>
                  <span className="flex items-center"><span className="w-3 h-3 rounded-full bg-blue-400 mr-1.5"></span>In Arbeit</span>
                  <span className="flex items-center"><span className="w-3 h-3 rounded-full bg-gray-300 mr-1.5"></span>Offen</span>
                </div>
              </section>

              <div className="space-y-6">
                
                <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                  <div className="flex items-center mb-6">
                    <CheckCircle className="w-6 h-6 text-teal-600 mr-2" />
                    <h2 className="text-lg font-bold text-gray-900">Projekt-Health (Top 5)</h2>
                  </div>
                  
                  <div className="space-y-4">
                    {projectHealth.slice(0, 5).length === 0 ? (
                      <p className="text-gray-500 text-sm italic">Keine Projekte mit Aufgaben gefunden.</p>
                    ) : (
                      projectHealth.slice(0, 5).map(p => {
                        const pct = Math.round((p.done / p.total) * 100) || 0;
                        return (
                          <div key={p.title} className="border border-gray-100 rounded-xl p-3 bg-gray-50/50">
                            <div className="flex justify-between items-center mb-2">
                              <p className="font-bold text-gray-800 text-sm truncate pr-2">{p.title}</p>
                              <span className="text-xs font-black text-teal-700 bg-teal-100 px-2 py-0.5 rounded-full">{pct}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden mb-2">
                              <div style={{ width: `${pct}%` }} className="h-full bg-teal-500 rounded-full" />
                            </div>
                            <div className="flex justify-between text-[10px] text-gray-500 uppercase tracking-wider font-bold">
                              <span>{p.done} von {p.total} erledigt</span>
                              {p.overdue > 0 && <span className="text-red-500">{p.overdue} überfällig!</span>}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </section>

                <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <Clock className="w-6 h-6 text-gray-400 mr-2" />
                      <h2 className="text-lg font-bold text-gray-900">Die Staubschicht</h2>
                    </div>
                    <span className="bg-gray-100 text-gray-500 text-[10px] uppercase font-bold px-2 py-1 rounded">Älteste Aufgaben</span>
                  </div>
                  
                  <div className="space-y-3">
                    {agingTasks.length === 0 ? (
                      <p className="text-gray-500 text-sm italic">Fantastisch! Keine alten Aufgaben vorhanden.</p>
                    ) : (
                      agingTasks.map((t, idx) => {
                        const daysOld = Math.floor((Date.now() - (t.createdAt || Date.now())) / (1000 * 60 * 60 * 24));
                        return (
                          <div key={t.id} className="flex items-start gap-3 p-3 bg-white border border-gray-100 shadow-sm rounded-lg">
                            <div className="bg-gray-100 text-gray-400 w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0">{idx + 1}</div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-gray-800 truncate">{t.title}</p>
                              <p className="text-[10px] text-gray-400 font-medium flex items-center mt-1">
                                <AlertTriangle className="w-3 h-3 mr-1 text-orange-400" />
                                Seit {daysOld} Tagen offen
                              </p>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </section>

              </div>
            </div>
          </div>
        ) : (
          /* DATA EXPLORER UI */
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

            <div className="flex-1 overflow-auto border border-gray-200 rounded-lg custom-scrollbar">
              <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
                <thead className="bg-gray-100 sticky top-0 z-10 shadow-sm">
                  <tr>
                    {selectedCols.map(col => (
                      <th key={col} className="p-2 border-b border-r border-gray-200 bg-gray-100 align-top">
                        <div 
                          className="flex items-center justify-between cursor-pointer hover:bg-gray-200 p-1.5 rounded transition-colors group"
                          onClick={() => handleSort(col)}
                        >
                          <span className="font-bold text-gray-700 font-mono tracking-tight">{col}</span>
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
                            className="w-full text-[10px] p-1.5 border border-gray-300 rounded outline-none focus:border-indigo-500 font-sans font-normal shadow-sm"
                          />
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {processedExplorerData.map((row, idx) => (
                    <tr key={idx} className="border-b border-gray-100 hover:bg-indigo-50 transition-colors">
                      {selectedCols.map(col => {
                        let val = (row as any)[col];
                        let display = '';
                        
                        if (val === null || val === undefined) {
                          display = '-';
                        } else if (typeof val === 'object') {
                          display = JSON.stringify(val);
                        } else {
                          display = String(val);
                        }

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
        )}
      </div>
    </div>
  );
};
// --- END OF FILE ---