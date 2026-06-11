// [2026-06-11] - ARCHITEKTUR-FIX: Migrations-Tab für Fate-Binding (isHistorical) hinzugefügt. Erlaubt die rückwirkende Versiegelung von Legacy-Daten (abgeschlossene Events, erledigte alte Routinen), um die aktive Datenbank sauber in das neue Architektur-Zeitalter zu überführen.
// [2026-06-03] - UX-FIX: Beschriftung des Hygiene-Tabs auf Wunsch des PO korrigiert ("Unterpunkte mit Routinen"). Text stellt nun klar: Es ist völlig OK, wenn Unterpunkte bei erledigtem Oberpunkt offen sind. Der Scanner sucht AUSSCHLIESSLICH nach Unterpunkten, die fälschlicherweise ein Routine-Flag (Rhythmus) haben, um den Klon-Mechanismus zu stoppen.
// [2026-06-03] - ARCHITEKTUR-FIX: OrphanCleanupModal zu einem "Deep-Scanner" aufgerüstet. Zieht die Daten nun direkt und roh per getDocs() aus Firestore unter Umgehung des globalen 'schemaVersion' Filters. Findet nun auch uralte Altlasten zuverlässig.
// [2026-06-03] - FEATURE: Massen-Reparatur (Bulk-Fix) für Routine-Fehler hinzugefügt. Sterilisiert mit einem Klick alle alten Unterpunkte in der Datenbank, die fälschlicherweise das Flag "isRoutine: true" tragen.
// [2026-05-31] - ARCHITEKTUR-FIX: Den "Zombies"-Tab komplett entfernt. Durch die neue Container-Logik ist es legitim und ein historischer Fakt, wenn ein Hauptpunkt auf "Erledigt" steht, aber Unterpunkte noch offen sind.
// [2026-05-23] - FEATURE: Geisterjäger-Modul mit 4. Tab (Projekt-Waisen) aufgerüstet.
// src/features/Admin/OrphanCleanupModal.tsx
import React, { useState, useMemo, useEffect } from 'react';
import { useClubStore } from '../../store/useClubStore';
import { X, Trash2, Activity, AlertTriangle, Ghost, Wrench, FolderX, ArchiveRestore, FastForward, Search, Database } from 'lucide-react';
import { doc, deleteDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';
import type { AgendaItem } from '../../core/types/models';

interface OrphanCleanupModalProps {
  onClose: () => void;
}

export const OrphanCleanupModal: React.FC<OrphanCleanupModalProps> = ({ onClose }) => {
  const { templates, events, saveAgendaItem } = useClubStore();
  
  const [activeTab, setActiveTab] = useState<'orphans' | 'routines' | 'project_orphans' | 'migration'>('orphans');
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedEventIds, setSelectedEventIds] = useState<Record<string, string>>({});
  
  // Deep-Scan Logik für rohe, ungefilterte DB-Daten
  const [rawDbItems, setRawDbItems] = useState<AgendaItem[]>([]);
  const [isDeepScanning, setIsDeepScanning] = useState(true);

  const performDeepScan = async () => {
    setIsDeepScanning(true);
    try {
      const snap = await getDocs(collection(db, 'agenda_items'));
      const items: AgendaItem[] = [];
      snap.forEach(d => items.push({ id: d.id, ...d.data() } as AgendaItem));
      setRawDbItems(items);
    } catch(e) {
      console.error("Deep Scan failed:", e);
    } finally {
      setIsDeepScanning(false);
    }
  };

  useEffect(() => {
    performDeepScan();
  }, []);

  // Basis-Datenmenge (Roh-Daten + Templates)
  const allItems = useMemo(() => {
    const map = new Map<string, AgendaItem>();
    [...rawDbItems, ...(templates || [])].forEach(item => {
      if (!map.has(item.id)) map.set(item.id, item as AgendaItem);
    });
    return Array.from(map.values());
  }, [rawDbItems, templates]);

  const validParentIds = useMemo(() => new Set(allItems.map(i => i.id)), [allItems]);
  const validEventIds = useMemo(() => new Set(events.map(e => e.id)), [events]);

  // Tab 1: Echte Geister (Kein Papa mehr da)
  const orphans = useMemo(() => {
    return allItems.filter(item => 
       item.isSubItem && 
       item.parentItemId && 
       !validParentIds.has(item.parentItemId)
    );
  }, [allItems, validParentIds]);

  // Tab 2: Unterpunkte mit Routinen (Hygiene-Filter gegen Zombie-Klone)
  const routineErrors = useMemo(() => {
    return allItems.filter(item => 
       item.isSubItem && 
       (item.isRoutine === true || String(item.isRoutine) === 'true')
    );
  }, [allItems]);

  // Tab 3: Projekt-Waisen (Aufgaben, deren EventId im System nicht mehr existiert)
  const projectOrphans = useMemo(() => {
    return allItems.filter(item => {
      if (!item.eventId) return false;
      return !validEventIds.has(item.eventId);
    });
  }, [allItems, validEventIds]);

  // Tab 4: Fate-Binding Migration (Legacy-Daten versiegeln)
  const migrationCandidates = useMemo(() => {
    return allItems.filter(item => {
      // Bereits versiegelte Items ignorieren
      if (item.isHistorical === true) return false;
      
      // Regel 1: Item gehört zu einem bereits abgeschlossenen (oder archivierten) Event
      let inClosedEvent = false;
      if (item.eventId) {
        const parentEvent = events.find(e => e.id === item.eventId);
        if (parentEvent && (parentEvent.status === 'ABGESCHLOSSEN' || parentEvent.isArchived)) {
          inClosedEvent = true;
        }
      }

      // Regel 2: Item ist eine bereits erledigte Routine (oder ein Unterpunkt einer solchen)
      const isRoutine = item.isRoutine === true || String(item.isRoutine) === 'true';
      const isCompleted = item.status === 'ERLEDIGT' || item.progress === 100;
      
      let isCompletedRoutineChild = false;
      if (item.isSubItem && item.parentItemId) {
        const parent = allItems.find(i => i.id === item.parentItemId);
        if (parent) {
           const pIsRoutine = parent.isRoutine === true || String(parent.isRoutine) === 'true';
           const pIsCompleted = parent.status === 'ERLEDIGT' || parent.progress === 100;
           if (pIsRoutine && pIsCompleted) {
               isCompletedRoutineChild = true;
           }
        }
      }

      return inClosedEvent || (isRoutine && isCompleted) || isCompletedRoutineChild;
    });
  }, [allItems, events]);

  const handleEventSelect = (id: string, eventId: string) => {
    setSelectedEventIds(prev => ({ ...prev, [id]: eventId }));
  };

  const handleHardDelete = async (id: string) => {
    if (!window.confirm("Bist du sicher? Dieser Datensatz wird physisch und unwiderruflich gelöscht.")) return;
    setIsProcessing(true);
    try {
      await deleteDoc(doc(db, 'agenda_items', id));
      await performDeepScan(); // Nach dem Löschen neu scannen
    } catch (error) {
      console.error("Fehler beim Löschen:", error);
      alert("Fehler beim physischen Löschen.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMoveToTrash = async (item: AgendaItem) => {
    setIsProcessing(true);
    try {
      await saveAgendaItem({
        ...item,
        status: 'TRASH',
        deletedAt: Date.now()
      });
      await performDeepScan();
    } catch (error) {
      console.error("Fehler beim Verschieben in den Papierkorb:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReviveOrphan = async (orphan: AgendaItem) => {
    const targetEventId = selectedEventIds[orphan.id];
    if (!targetEventId) {
      alert("Bitte wähle ein Projekt aus.");
      return;
    }
    setIsProcessing(true);
    try {
      await saveAgendaItem({
        ...orphan,
        isSubItem: false,
        parentItemId: null as any,
        eventId: targetEventId,
        status: orphan.status === 'TRASH' ? 'OFFEN' : orphan.status 
       });
       await performDeepScan();
    } catch (error) {
      console.error("Fehler:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFixRoutine = async (item: AgendaItem) => {
    setIsProcessing(true);
    try {
      await saveAgendaItem({
        ...item,
        isRoutine: false,
        routinePattern: null as any,
        routineEndDate: null as any
      });
      await performDeepScan();
    } catch (error) {
      console.error("Fehler:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkFixRoutines = async () => {
    if (!window.confirm(`Bist du sicher? Dies wird bei allen ${routineErrors.length} Unterpunkten das Routine-Flag und den Rhythmus endgültig aus der Datenbank löschen.`)) return;
    setIsProcessing(true);
    try {
      const promises = routineErrors.map(item => saveAgendaItem({
        ...item,
        isRoutine: false,
        routinePattern: null as any,
        routineEndDate: null as any
      }));
      await Promise.all(promises);
      await performDeepScan();
      alert('Erfolgreich! Der Rhythmus wurde bei allen Unterpunkten entfernt.');
    } catch (error) {
      console.error("Fehler beim Bulk-Fix:", error);
      alert("Fehler bei der Massen-Reparatur.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkMigration = async () => {
    if (!window.confirm(`MIGRATION STARTEN?\n\nDies wird bei ${migrationCandidates.length} alten Datensätzen aus abgeschlossenen Protokollen und alten Routinen das neue Feld "isHistorical: true" in die Datenbank schreiben.\n\nBist du sicher?`)) return;
    setIsProcessing(true);
    try {
      const promises = migrationCandidates.map(item => saveAgendaItem({
        ...item,
        isHistorical: true
      }));
      await Promise.all(promises);
      await performDeepScan();
      alert('Migration erfolgreich! Alle Altlasten sind nun sauber versiegelt.');
    } catch (error) {
      console.error("Fehler bei der Migration:", error);
      alert("Fehler bei der Fate-Binding Migration.");
    } finally {
      setIsProcessing(false);
    }
  };

  const getTypeStyle = (type: string, isTemplate: boolean) => {
    if (isTemplate) return 'bg-purple-100 text-purple-800 border-purple-200';
    switch (type) {
      case 'AUFGABE': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'INFO': return 'bg-sky-100 text-sky-800 border-sky-200';
      case 'BESCHLUSS': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'AGENDA': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-gray-700 bg-gray-900 flex items-center justify-between shrink-0">
          <div className="flex items-center text-white">
            <Ghost className="w-6 h-6 mr-3 text-red-400" />
            <h2 className="text-xl font-bold">Datenbank-Reparatur (Cleanup)</h2>
          </div>
          <button onClick={onClose} disabled={isProcessing} className="text-gray-400 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex bg-gray-900 px-6 border-b border-gray-700 shrink-0 overflow-x-auto relative">
          <button 
            onClick={() => setActiveTab('orphans')}
            className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'orphans' ? 'border-red-400 text-red-400' : 'border-transparent text-gray-400 hover:text-gray-200'}`}
          >
            Geister ({isDeepScanning ? '...' : orphans.length})
          </button>
          <button 
            onClick={() => setActiveTab('routines')}
            className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'routines' ? 'border-yellow-400 text-yellow-400' : 'border-transparent text-gray-400 hover:text-gray-200'}`}
          >
            Unterpunkte mit Routinen ({isDeepScanning ? '...' : routineErrors.length})
          </button>
          <button 
            onClick={() => setActiveTab('project_orphans')}
            className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'project_orphans' ? 'border-purple-400 text-purple-400' : 'border-transparent text-gray-400 hover:text-gray-200'}`}
          >
            Projekt-Waisen ({isDeepScanning ? '...' : projectOrphans.length})
          </button>
          <button 
            onClick={() => setActiveTab('migration')}
            className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap flex items-center ${activeTab === 'migration' ? 'border-blue-400 text-blue-400' : 'border-transparent text-gray-400 hover:text-gray-200'}`}
          >
            <Database className="w-4 h-4 mr-1.5" /> Migration ({isDeepScanning ? '...' : migrationCandidates.length})
          </button>
          
          {isDeepScanning && (
            <div className="absolute right-4 top-3 flex items-center text-blue-400 text-xs font-bold animate-pulse">
              <Search className="w-4 h-4 mr-1 animate-spin" /> Deep-Scan läuft...
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 bg-gray-50 custom-scrollbar">
          
          {/* ORPHANS TAB */}
          {activeTab === 'orphans' && !isDeepScanning && (
            <>
              <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start text-red-800 text-sm">
                <AlertTriangle className="w-5 h-5 mr-3 shrink-0 mt-0.5" />
                <div>
                  <strong>Was sind Geister?</strong> Unterpunkte, deren Hauptpunkt gelöscht wurde. Sie hängen unsichtbar fest. Du kannst sie vernichten oder einem neuen Projekt zuweisen.
                </div>
              </div>

              {orphans.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-12 flex flex-col items-center justify-center text-gray-500 shadow-sm">
                  <Activity className="w-12 h-12 text-green-400 mb-4" />
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Sauber!</h3>
                  <p>Keine verwaisten Datensätze gefunden.</p>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-100 text-gray-600 font-bold border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3">Titel</th>
                        <th className="px-4 py-3">Typ</th>
                        <th className="px-4 py-3">Rettung</th>
                        <th className="px-4 py-3 text-right">Aktion</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {orphans.map(orphan => (
                        <tr key={orphan.id} className="hover:bg-red-50/30 transition-colors">
                          <td className="px-4 py-3 font-bold text-gray-900 truncate max-w-[250px]" title={orphan.title || 'Ohne Titel'}>{orphan.title || 'Ohne Titel'}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold border ${getTypeStyle(orphan.type, !!orphan.isTemplate)}`}>
                              {orphan.isTemplate ? 'VORLAGE' : orphan.type}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {!orphan.isTemplate && (
                              <select 
                                value={selectedEventIds[orphan.id] || ''} 
                                onChange={(e) => handleEventSelect(orphan.id, e.target.value)}
                                disabled={isProcessing}
                                className="w-full text-xs p-1.5 border border-gray-300 rounded"
                              >
                                <option value="">-- Projekt wählen --</option>
                                {events.map(ev => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
                              </select>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex justify-end gap-2">
                              {!orphan.isTemplate && (
                                <button onClick={() => handleReviveOrphan(orphan)} disabled={isProcessing || !selectedEventIds[orphan.id]} className="px-3 py-1.5 bg-blue-100 text-blue-700 font-bold rounded text-xs disabled:opacity-50 hover:bg-blue-200 transition-colors">Retten</button>
                              )}
                              <button onClick={() => handleHardDelete(orphan.id)} disabled={isProcessing} className="p-1.5 bg-red-100 text-red-700 rounded disabled:opacity-50 hover:bg-red-200 transition-colors" title="Endgültig löschen"><Trash2 className="w-4 h-4" /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {/* ROUTINES TAB */}
          {activeTab === 'routines' && !isDeepScanning && (
            <>
              <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 text-sm">
                <div className="flex items-start text-yellow-800">
                  <Wrench className="w-5 h-5 mr-3 shrink-0 mt-0.5" />
                  <div>
                    <strong>Hygiene-Funktion:</strong> Es ist völlig okay, wenn Unterpunkte auf 0% stehen, während der Oberpunkt erledigt ist. <strong>ABER:</strong> Unterpunkte dürfen niemals einen eigenen Rhythmus (isRoutine) gespeichert haben. Das erzeugt Zombie-Klone. Sterilisiere sie hier.
                  </div>
                </div>
                {routineErrors.length > 0 && (
                  <button onClick={handleBulkFixRoutines} disabled={isProcessing} className="flex items-center justify-center px-4 py-2 bg-yellow-600 text-white font-bold rounded-lg shadow-sm hover:bg-yellow-700 transition-colors shrink-0">
                    <FastForward className="w-4 h-4 mr-2" /> Alle ({routineErrors.length}) sterilisieren
                  </button>
                )}
              </div>

              {routineErrors.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-12 flex flex-col items-center justify-center text-gray-500 shadow-sm">
                  <Activity className="w-12 h-12 text-green-400 mb-4" />
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Sauber!</h3>
                  <p>Keine Unterpunkte mit Rhythmus gefunden.</p>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-100 text-gray-600 font-bold border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3">Titel</th>
                        <th className="px-4 py-3">Falscher Rhythmus</th>
                        <th className="px-4 py-3 text-right">Aktion</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {routineErrors.map(item => (
                        <tr key={item.id} className="hover:bg-yellow-50/30 transition-colors">
                          <td className="px-4 py-3 font-bold text-gray-900 truncate max-w-[300px]" title={item.title}>{item.title}</td>
                          <td className="px-4 py-3 text-xs text-red-600 font-bold">{item.routinePattern || 'Ja (Ohne festen Rhythmus)'}</td>
                          <td className="px-4 py-3 text-right">
                            <button onClick={() => handleFixRoutine(item)} disabled={isProcessing} className="px-3 py-1.5 bg-yellow-100 text-yellow-800 font-bold rounded text-xs hover:bg-yellow-200 transition-colors">
                              Rhythmus entfernen
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {/* PROJECT ORPHANS TAB */}
          {activeTab === 'project_orphans' && !isDeepScanning && (
            <>
              <div className="mb-6 bg-purple-50 border border-purple-200 rounded-lg p-4 flex items-start text-purple-800 text-sm">
                <FolderX className="w-5 h-5 mr-3 shrink-0 mt-0.5" />
                <div>
                  <strong>Projekt-Waisen:</strong> Diese Aufgaben waren einem Projekt zugeordnet, das aus der Datenbank <strong>physisch gelöscht</strong> wurde. Verschiebe sie in den Papierkorb oder lösche sie komplett.
                </div>
              </div>

              {projectOrphans.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-12 flex flex-col items-center justify-center text-gray-500 shadow-sm">
                  <Activity className="w-12 h-12 text-green-400 mb-4" />
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Sauber!</h3>
                  <p>Keine Projekt-Waisen gefunden.</p>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-100 text-gray-600 font-bold border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3">Titel</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3 text-right">Aktion</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {projectOrphans.map(item => (
                        <tr key={item.id} className="hover:bg-purple-50/30 transition-colors">
                          <td className="px-4 py-3 font-bold text-gray-900 truncate max-w-[300px]" title={item.title}>{item.title}</td>
                          <td className="px-4 py-3">
                            <span className="text-[10px] font-bold text-gray-600 bg-gray-200 px-2 py-0.5 rounded border border-gray-300">{item.status}</span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex justify-end gap-2">
                              <button onClick={() => handleMoveToTrash(item)} disabled={isProcessing} className="flex items-center px-3 py-1.5 bg-gray-100 text-gray-700 font-bold rounded text-xs hover:bg-gray-200 transition-colors" title="In den Papierkorb">
                                <ArchiveRestore className="w-3.5 h-3.5 mr-1" /> Papierkorb
                              </button>
                              <button onClick={() => handleHardDelete(item.id)} disabled={isProcessing} className="p-1.5 bg-red-100 text-red-700 rounded disabled:opacity-50 hover:bg-red-200 transition-colors" title="Endgültig löschen">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {/* MIGRATION TAB */}
          {activeTab === 'migration' && !isDeepScanning && (
            <>
              <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 text-sm">
                <div className="flex items-start text-blue-800">
                  <Database className="w-5 h-5 mr-3 shrink-0 mt-0.5 text-blue-600" />
                  <div>
                    <strong className="block mb-1 text-base">Legacy-Datenbank Migration (Fate-Binding)</strong>
                    Hier kannst du alte Daten, die vor dem <strong>isHistorical</strong> Update erstellt wurden, sicher in das neue Architektur-Zeitalter überführen. Das Skript sucht alle Aufgaben aus bereits <em>abgeschlossenen Projekten</em> sowie alte <em>erledigte Routinen</em> und versiegelt sie nachträglich.
                  </div>
                </div>
                {migrationCandidates.length > 0 && (
                  <button onClick={handleBulkMigration} disabled={isProcessing} className="flex items-center justify-center px-6 py-2 bg-blue-600 text-white font-bold rounded-lg shadow-sm hover:bg-blue-700 transition-colors shrink-0 whitespace-nowrap">
                    <Database className="w-4 h-4 mr-2" /> {migrationCandidates.length} versiegeln
                  </button>
                )}
              </div>

              {migrationCandidates.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-12 flex flex-col items-center justify-center text-gray-500 shadow-sm">
                  <Activity className="w-12 h-12 text-green-400 mb-4" />
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Migration abgeschlossen!</h3>
                  <p>Deine Datenbank ist sauber und nutzt das neue Fate-Binding System.</p>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="p-4 bg-gray-100 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Beispiel-Daten ({migrationCandidates.length} gefunden, zeige max 50)
                  </div>
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-600 font-bold border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3">Titel</th>
                        <th className="px-4 py-3">Grund für Versiegelung</th>
                        <th className="px-4 py-3 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {migrationCandidates.slice(0, 50).map(item => {
                        const inClosedEvent = item.eventId && events.find(e => e.id === item.eventId)?.status === 'ABGESCHLOSSEN';
                        return (
                          <tr key={item.id} className="hover:bg-blue-50/30 transition-colors">
                            <td className="px-4 py-3 font-bold text-gray-900 truncate max-w-[300px]" title={item.title}>{item.title}</td>
                            <td className="px-4 py-3 text-xs text-gray-600">
                              {inClosedEvent ? 'Abgeschlossenes Protokoll' : 'Erledigte Legacy-Routine (oder Unterpunkt)'}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className="text-[10px] font-bold text-gray-600 bg-gray-200 px-2 py-0.5 rounded border border-gray-300">{item.status}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

        </div>
      </div>
    </div>
  );
};
// --- END OF FILE ---