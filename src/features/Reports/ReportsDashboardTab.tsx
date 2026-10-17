// [2026-10-17] - REFACTOR: Auslagerung der Dashboard-Statistiken (Workload, Health, Fristen) aus der überladenen ReportsView.tsx zur Einhaltung der Separation of Concerns.
// src/features/Reports/ReportsDashboardTab.tsx
import React, { useMemo } from 'react';
import { useClubStore } from '../../store/useClubStore';
import { CheckCircle, Clock, AlertTriangle, Target, Users, FolderSearch } from 'lucide-react';

interface ReportsDashboardTabProps {
  selectedSeriesId: string;
  setSelectedSeriesId: (id: string) => void;
}

export const ReportsDashboardTab: React.FC<ReportsDashboardTabProps> = ({ 
  selectedSeriesId, 
  setSelectedSeriesId 
}) => {
  const { tasks, users, events } = useClubStore();

  const trulyActiveTasks = useMemo(() => {
    return tasks.filter(t => {
      if (t.type !== 'AUFGABE') return false;
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
  );
};
// --- END OF FILE ---