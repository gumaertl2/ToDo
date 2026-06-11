// [2026-06-11] - ARCHITEKTUR-FIX: Fate-Binding (isHistorical) Filter integriert. Abgelaufene Daueraufgaben (Enddatum überschritten und zu 100% erledigt) verschwinden nun sauber und automatisch aus dem RollenTab, bleiben aber in der Historie (Zähler) erhalten.
// [2026-05-26] - BUGFIX: Vercel-Build-Fehler (TS6133) behoben. Ungenutzte Variable 'bId' in Phase 3 entfernt.
// [2026-05-26] - BUGFIX: Globale Historie (completedCount) integriert. Zähler stimmen nun 1:1 mit den Kanban-Boards überein.
// [2026-05-26] - BUGFIX: Oberpunkte werden nun zwingend als Kontext geladen, auch wenn die Rolle NUR für einen Unterpunkt zuständig ist.
// [2026-05-26] - BUGFIX: Geister-Zuweisungen entfernt. Zuständigkeit wird strikt am aktuellsten Erben (latestItem) validiert.
// [2026-05-26] - FEATURE: "+/-" Schalter pro Oberpunkt für fremde Unterpunkte ist integriert.
// [2026-05-25] - UX-FEATURE: Hierarchische Darstellung (Baumstruktur) für Daueraufgaben implementiert.
// src/features/Users/tabs/RollenTab.tsx
import React, { useState } from 'react';
import { Tag, Clock, Edit2, Trash2, Calendar, RefreshCw, CheckCircle2 } from 'lucide-react';
import { useClubStore } from '../../../store/useClubStore';
import type { Group, AgendaItem } from '../../../core/types/models';
import { RichTextRenderer } from '../../Shared/RichText';

interface RollenTabProps {
  isAdmin: boolean;
  expandedGroups: Set<string>;
  toggleGroupExpanded: (id: string) => void;
  openGroupEditor: (g?: Group) => void;
  openTaskEditor: (t: AgendaItem) => void;
}

export const RollenTab: React.FC<RollenTabProps> = ({ isAdmin, expandedGroups, toggleGroupExpanded, openGroupEditor, openTaskEditor }) => {
  const { groups, allAgendaItems, events, deleteGroup, users } = useClubStore();
  
  // Zustand für den lokalen +/- Toggle pro Oberpunkt
  const [expandedForeignTasks, setExpandedForeignTasks] = useState<Set<string>>(new Set());

  const toggleForeignTasks = (clusterKey: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedForeignTasks(prev => {
      const next = new Set(prev);
      if (next.has(clusterKey)) next.delete(clusterKey);
      else next.add(clusterKey);
      return next;
    });
  };

  const getPatternLabel = (pattern?: string) => {
    switch (pattern) {
      case 'every_meeting': return 'bei jeder Sitzung';
      case 'weekly': return 'wöchentlich';
      case 'monthly': return 'monatlich';
      case 'quarterly': return 'quartalsweise';
      case 'yearly': return 'jährlich';
      default: return 'einmalig';
    }
  };

  const getOwnerBadge = (task: AgendaItem | null, isAssignedToCurrentGroup: boolean) => {
    if (isAssignedToCurrentGroup || !task) return null;
    const uNames = (task.assigneeUserIds || []).map(id => users.find(u => u.id === id)?.name).filter(Boolean);
    const gNames = (task.assigneeGroupIds || []).map(id => groups.find(g => g.id === id)?.name).filter(Boolean);
    const ownerStr = [...uNames, ...gNames].join(', ');
    return ownerStr ? (
      <span className="ml-2 text-[10px] bg-orange-50 text-orange-700 border border-orange-200 px-1.5 py-0.5 rounded-full whitespace-nowrap" title="Zuständigkeit">
        👤 {ownerStr}
      </span>
    ) : null;
  };

  const getGroupRoutines = (gId: string) => {
    const routineClusters = new Map<string, any>();
    const now = Date.now();
    const groupUserIds = users.filter(u => u.groupIds?.includes(gId)).map(u => u.id);

    // --- PHASE 1: GLOBALE HISTORIE ZÄHLEN ---
    // Unabhängig vom aktuellen Event schauen wir in die GESAMTE Datenbank.
    const globalCompletedCounts = new Map<string, number>();
    allAgendaItems.forEach(t => {
      if (t.status === 'ERLEDIGT' || t.progress === 100) {
        const bloodlineId = t.baseItemId || t.id;
        globalCompletedCounts.set(bloodlineId, (globalCompletedCounts.get(bloodlineId) || 0) + 1);
      }
    });

    // --- PHASE 2: AKTUELLE DOMINANZ FINDEN ---
    const validItems = allAgendaItems.filter(t => {
      if (t.status === 'TRASH') return false;

      // ---> CHIRURGISCHER EINGRIFF: FATE-BINDING FILTER <---
      // Wenn eine Routine ihr Enddatum erreicht hat und erledigt wird, 
      // erhält sie isHistorical: true, ABER es wird kein Klon erzeugt.
      // Durch diesen Filter verschwindet die abgelaufene Aufgabe automatisch!
      if (t.isHistorical === true) return false;

      if (!t.eventId) return false;
      const parentEvent = events.find(e => e.id === t.eventId);
      if (!parentEvent || !parentEvent.isPublished) return false;

      const isRoutine = t.isRoutine === true || String(t.isRoutine) === 'true';
      const isSubOfRoutine = t.isSubItem && t.parentItemId && allAgendaItems.find(p => p.id === t.parentItemId)?.isRoutine;
      if (!isRoutine && !isSubOfRoutine) return false;

      // FALLBACK für alte DB-Einträge (Graceful Degradation)
      if (t.isHistorical === undefined) {
        if (parentEvent.status === 'ABGESCHLOSSEN') return false;
        
        const routineRef = isSubOfRoutine ? allAgendaItems.find(p => p.id === t.parentItemId) : t;
        const isCompleted = t.status === 'ERLEDIGT' || t.progress === 100;
        if (routineRef?.routineEndDate && routineRef.routineEndDate < now && isCompleted) return false;
      }

      return true;
    });

    // 2b. Den aktuellsten/offenen Erben pro Blutlinie finden (um Geister zu vermeiden)
    const latestItems = new Map<string, AgendaItem>();
    validItems.forEach(t => {
      const bId = t.baseItemId || t.id;
      const existing = latestItems.get(bId);
      
      const isNewer = (t.createdAt || 0) > (existing?.createdAt || 0);
      const isCurrentOpen = t.status !== 'ERLEDIGT' && t.progress !== 100;
      const isExistingOpen = existing && existing.status !== 'ERLEDIGT' && existing.progress !== 100;

      if (!existing) {
        latestItems.set(bId, t);
      } else if (isCurrentOpen && !isExistingOpen) {
        latestItems.set(bId, t); // Offen gewinnt immer
      } else if (isCurrentOpen === isExistingOpen && isNewer) {
        latestItems.set(bId, t); // Bei Gleichstand gewinnt das neuere
      }
    });

    // 2c. Prüfen, für welche Blutlinien diese Gruppe JETZT zuständig ist
    const activeBloodlinesForGroup = new Set<string>();
    const parentContextNeeded = new Set<string>(); // Oberpunkte, die wir laden müssen, weil uns der Unterpunkt gehört

    latestItems.forEach((t, bId) => {
      const isDirect = t.assigneeGroupIds?.includes(gId) || t.assigneeUserIds?.some(uid => groupUserIds.includes(uid));
      if (isDirect) {
        activeBloodlinesForGroup.add(bId);
        
        // Wenn wir für einen Unterpunkt zuständig sind, erzwingen wir das Laden des Oberpunkts als Kontext!
        if (t.isSubItem && t.parentItemId) {
          const pTask = allAgendaItems.find(x => x.id === t.parentItemId);
          if (pTask) {
            parentContextNeeded.add(pTask.baseItemId || pTask.id);
          }
        }
      }
    });

    // --- PHASE 3: CLUSTER BAUEN ---
    latestItems.forEach((t) => {
      let isSub = !!(t.isSubItem && t.parentItemId);
      let pTask = isSub ? allAgendaItems.find(x => x.id === t.parentItemId) : t;
      if (!pTask) return;

      const parentBloodline = pTask.baseItemId || pTask.id;
      
      // Das Cluster wird nur gebaut, wenn uns der Oberpunkt gehört ODER wir es als Kontext brauchen (wg. Unterpunkt)
      const isParentOurs = activeBloodlinesForGroup.has(parentBloodline);
      const isContextNeeded = parentContextNeeded.has(parentBloodline);

      if (!isParentOurs && !isContextNeeded) return;

      // Baue den Container (falls noch nicht existent)
      if (!routineClusters.has(parentBloodline)) {
        // Versuche den aktuellsten Parent aus latestItems zu holen, sonst Fallback
        const latestParent = latestItems.get(parentBloodline) || pTask;
        
        routineClusters.set(parentBloodline, {
          key: parentBloodline,
          title: latestParent.title || 'Unbekannt',
          parentEvent: events.find(e => e.id === latestParent.eventId),
          pattern: latestParent.routinePattern,
          endDate: latestParent.routineEndDate,
          completedCount: globalCompletedCounts.get(parentBloodline) || 0, // GLOBALE HISTORIE
          displayTask: latestParent,
          subItems: new Map<string, any>(),
          isAssignedToGroup: isParentOurs // Wahr, wenn der Parent uns gehört
        });
      }
    });

    // Jetzt füllen wir die gebauten Cluster mit ALLEN dazugehörigen Unterpunkten (für den +/- Button)
    latestItems.forEach((t, bId) => {
      if (!t.isSubItem || !t.parentItemId) return;
      const pTask = allAgendaItems.find(x => x.id === t.parentItemId);
      if (!pTask) return;
      
      const parentBloodline = pTask.baseItemId || pTask.id;
      
      // Nur in Cluster einfügen, die wir oben als relevant erachtet haben
      if (routineClusters.has(parentBloodline)) {
        const cluster = routineClusters.get(parentBloodline);
        const isSubAssignedToUs = t.assigneeGroupIds?.includes(gId) || t.assigneeUserIds?.some(uid => groupUserIds.includes(uid));
        
        cluster.subItems.set(bId, {
          key: bId,
          title: t.title || 'Unbekannt',
          completedCount: globalCompletedCounts.get(bId) || 0, // GLOBALE HISTORIE
          displayTask: t,
          isAssignedToGroup: isSubAssignedToUs
        });
      }
    });

    const patternWeight: Record<string, number> = {
      'every_meeting': 1, 'weekly': 2, 'monthly': 3, 'quarterly': 4, 'yearly': 5
    };

    const finalClusters = Array.from(routineClusters.values()).filter(c => c.displayTask !== null);

    return finalClusters.sort((a, b) => {
      const projA = a.parentEvent?.title || '\uFFFF'; 
      const projB = b.parentEvent?.title || '\uFFFF';
      const projCompare = projA.localeCompare(projB);
      if (projCompare !== 0) return projCompare;

      const weightA = patternWeight[a.pattern] || 99;
      const weightB = patternWeight[b.pattern] || 99;
      if (weightA !== weightB) return weightA - weightB;

      return (a.title || '').localeCompare(b.title || '');
    });
  };

  const handleSafeDeleteGroup = async (g: Group) => {
    if (window.confirm(`Möchtest du die Rolle "${g.name}" wirklich löschen?`)) {
      if (g.id) await deleteGroup(g.id);
    }
  };

  if (groups.length === 0) {
    return <div className="p-8 text-center text-gray-500">Keine Rollen gefunden.</div>;
  }

  return (
    <>
      {[...groups].sort((a, b) => a.name.localeCompare(b.name)).map((g) => {
        const groupRoutines = getGroupRoutines(g.id);
        const isExpanded = expandedGroups.has(g.id);
        const assignedUsers = users.filter(u => u.groupIds?.includes(g.id)).map(u => u.name).join(', ');

        return (
          <div key={g.id} className="p-4 hover:bg-gray-50 flex flex-col justify-center transition-colors border-b border-gray-100 last:border-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="bg-purple-100 p-3 rounded-lg text-purple-600 mr-4"><Tag className="w-6 h-6" /></div>
                <div>
                  <h3 className="font-bold text-gray-900 flex items-center flex-wrap gap-2">
                    {g.name}
                    {assignedUsers && (
                      <span className="text-xs font-normal text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200" title="Zugeordnete Nutzer">
                        👤 {assignedUsers}
                      </span>
                    )}
                  </h3>
                  {g.description && <p className="text-sm text-gray-500">{g.description}</p>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {groupRoutines.length > 0 && <button onClick={() => toggleGroupExpanded(g.id)} className="w-8 h-8 flex items-center justify-center text-gray-500 hover:bg-gray-200 rounded text-lg font-mono font-bold leading-none transition-colors">{isExpanded ? '-' : '+'}</button>}
                {isAdmin && (
                  <div className="flex items-center gap-2 ml-2 border-l border-gray-200 pl-2">
                    <button onClick={() => openGroupEditor(g)} className="text-gray-400 hover:text-blue-600 p-2"><Edit2 className="w-5 h-5" /></button>
                    <button onClick={() => handleSafeDeleteGroup(g)} className="text-red-400 hover:text-red-600 p-2"><Trash2 className="w-5 h-5" /></button>
                  </div>
                )}
              </div>
            </div>
            {isExpanded && groupRoutines.length > 0 && (
              <div className="mt-4 ml-[60px] pl-4 border-l-2 border-purple-200">
                <h4 className="text-xs font-bold text-purple-800 uppercase tracking-wider mb-3">Stellenbeschreibung: Daueraufgaben</h4>
                <div className="space-y-3">
                  {groupRoutines.map((cluster, i) => {
                    const projectColor = cluster.parentEvent ? (cluster.parentEvent as any).color : undefined;
                    const parentDateStr = cluster.parentEvent?.plannedStartTime ? new Date(cluster.parentEvent.plannedStartTime).toLocaleDateString() : '';
                    
                    // Lokale Toggle-Logik für Unterpunkte
                    const allSubItems = Array.from(cluster.subItems.values());
                    const hasForeignSubs = allSubItems.some((sub: any) => !sub.isAssignedToGroup);
                    const isForeignExpanded = expandedForeignTasks.has(cluster.key);
                    
                    const visibleSubItems = isForeignExpanded 
                        ? allSubItems 
                        : allSubItems.filter((sub: any) => sub.isAssignedToGroup);

                    const isClusterCompleted = cluster.displayTask?.status === 'ERLEDIGT' || cluster.displayTask?.progress === 100;

                    return (
                      <div key={i} className={`bg-white border ${cluster.isAssignedToGroup ? 'border-blue-200 shadow-sm' : 'border-dashed border-gray-300 opacity-90'} p-3 rounded-lg flex flex-col`}>
                        
                        {/* MAIN PARENT ROW */}
                        <div 
                          onClick={() => { if (cluster.displayTask) openTaskEditor(cluster.displayTask); }} 
                          className={`flex justify-between items-start gap-4 ${cluster.displayTask ? 'cursor-pointer hover:text-blue-600 transition-colors' : ''}`}
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            {isClusterCompleted && <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />}
                            <span className={`font-bold text-sm ${cluster.isAssignedToGroup ? (isClusterCompleted ? 'text-green-700 line-through opacity-80' : 'text-gray-800') : 'text-gray-500'}`}>
                              {cluster.title}
                            </span>
                            {getOwnerBadge(cluster.displayTask, cluster.isAssignedToGroup)}
                            {cluster.completedCount > (isClusterCompleted ? 1 : 0) && (
                              <span className="flex items-center text-[10px] text-gray-500 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100 shrink-0" title="Historische Wiederholungen">
                                <Clock className="w-3 h-3 mr-1" /> {isClusterCompleted ? cluster.completedCount - 1 : cluster.completedCount}
                              </span>
                            )}
                          </div>

                          {cluster.parentEvent && (
                            <div 
                              className="flex items-center text-[10px] font-bold px-2 py-0.5 rounded border transition-colors shrink-0 whitespace-nowrap"
                              style={{ 
                                backgroundColor: projectColor ? `${projectColor}15` : '#eef2ff',
                                color: projectColor || '#4338ca',
                                borderColor: projectColor ? `${projectColor}30` : '#e0e7ff'
                              }}
                            >
                              <Calendar className="w-3 h-3 mr-1" />
                              {cluster.parentEvent.title} {parentDateStr ? `(${parentDateStr})` : ''}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-3 mt-1 mb-2 text-[10px] font-medium text-gray-400">
                          <div className="flex items-center bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded border border-indigo-100">
                            <RefreshCw className="w-2.5 h-2.5 mr-1" />
                            {getPatternLabel(cluster.pattern)}
                          </div>
                          {cluster.endDate && (
                            <div className="flex items-center">
                              <Calendar className="w-2.5 h-2.5 mr-1" />
                              bis {new Date(cluster.endDate).toLocaleDateString()}
                            </div>
                          )}
                        </div>

                        {/* SUB ITEMS */}
                        {visibleSubItems.length > 0 && (
                          <div className="mt-1.5 pl-3 border-l-2 border-gray-100 space-y-1.5">
                            {visibleSubItems.map((sub: any, sIdx: number) => {
                              const isSubCompleted = sub.displayTask?.status === 'ERLEDIGT' || sub.displayTask?.progress === 100;
                              
                              return (
                                <div 
                                  key={sIdx} 
                                  onClick={(e) => { e.stopPropagation(); if (sub.displayTask) openTaskEditor(sub.displayTask); }}
                                  className={`flex flex-col ${sub.displayTask ? 'cursor-pointer hover:bg-gray-50 rounded p-1 -ml-1 transition-colors' : ''}`}
                                >
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-gray-300 font-mono text-xs">↳</span>
                                    {isSubCompleted && <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />}
                                    <span className={`text-sm ${sub.isAssignedToGroup ? (isSubCompleted ? 'font-semibold text-green-700 line-through opacity-80' : 'font-semibold text-gray-700') : 'text-gray-500'}`}>
                                      {sub.title}
                                    </span>
                                    {getOwnerBadge(sub.displayTask, sub.isAssignedToGroup)}
                                    {sub.completedCount > (isSubCompleted ? 1 : 0) && (
                                      <span className="flex items-center text-[10px] text-gray-400" title="Historische Wiederholungen">
                                        <Clock className="w-3 h-3 mr-1" /> {isSubCompleted ? sub.completedCount - 1 : sub.completedCount}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Der lokale +/- Toggle Button für fremde Unterpunkte */}
                        {hasForeignSubs && (
                          <div className="mt-2 pl-3">
                            <button 
                              onClick={(e) => toggleForeignTasks(cluster.key, e)}
                              className="flex items-center text-[10px] font-bold text-gray-500 hover:text-blue-600 bg-gray-50 hover:bg-blue-50 px-2 py-1 rounded transition-colors"
                            >
                              {isForeignExpanded ? '- Fremde Unterpunkte ausblenden' : '+ Weitere Unterpunkte anzeigen'}
                            </button>
                          </div>
                        )}

                        {cluster.displayTask?.description && visibleSubItems.length === 0 && (
                          <div className="mt-2 text-gray-600 border-l-2 border-gray-100 pl-2">
                            <RichTextRenderer text={cluster.displayTask.description} className="text-xs italic" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </>
  );
};
// --- END OF FILE ---