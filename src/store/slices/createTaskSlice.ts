// [2026-06-11] - ARCHITEKTUR-FIX: Fate-Binding ('isHistorical') in fetchTasks integriert. Sanfter Fallback für Legacy-Daten (isHistorical === undefined) implementiert, damit alte Protokolle nicht explodieren. Live-Versiegelung beim Klonen in processRoutineRespawn eingebaut (Szenario B & C).
// [2026-06-10] - BUGFIX: Routine-Klon-Engine (processRoutineRespawn) ignoriert nun strikt Unterpunkte mit dem Status 'TRASH'. Soft-gelöschte Unterpunkte werden nicht mehr in den neuen Sitzungs-Zyklus kopiert.
// [2026-06-08] - BUGFIX: Routine-Respawn berücksichtigt nun das 'routineEndDate'. Überschreitet der nächste errechnete Klon dieses Datum, wird die Endlos-Schleife gestoppt und kein neuer Klon mehr angelegt.
// [2026-06-03] - ARCHITEKTUR-FIX (Container-Swap-Prinzip): Wenn ein Routine-Oberpunkt auf 100% gesetzt wird, wird der neue Klon inkl. aller Unterpunkte nahtlos in die AKTUELLE Sitzung (eventId bleibt erhalten!) eingebunden.
// [2026-06-03] - BUGFIX: fetchTasks blendet nun alte Container (alte Routine-Hauptpunkte PLUS deren alte Unterpunkte!) vollständig aus den aktiven Views (Agenda, Dashboard) aus.
// [2026-06-03] - BUGFIX: Routine-Respawn berechnet nun auch die relativen Fälligkeitsdaten (Tage DAVOR / DANACH) für alle geklonten Unterpunkte mathematisch neu, basierend auf dem neuen Datum des Oberpunktes.
// [2026-05-31] - UX-FEATURE: Automatische Erfassung des echten Erledigungsdatums ('completedAt') hinzugefügt. Zieht man den Slider auf 100%, wird der aktuelle Zeitstempel gespeichert.
// [2026-05-28] - ARCHITEKTUR-REFACTORING: Routine-Respawn und Kindkaskadierung in separate asynchrone Helper-Funktionen ausgelagert.
// [2026-05-27] - BUGFIX: ID-Generierung vereinheitlicht. Nutzt wieder doc(collection(db, 'agenda_items')).id für 100% homogene Firebase-IDs.
// [2026-05-25] - BUGFIX: Sub-Item Sterilisation. Unterpunkte werden beim Speichern nun brutal von jeglichen Routine-Flags (isRoutine, routinePattern) befreit. Verhindert das isolierte, fehlerhafte Respawnen von Unterpunkten (Ghost-Clones) und erzwingt das Container-Prinzip.
// src/store/slices/createTaskSlice.ts
import type { StateCreator } from 'zustand';
import type { Task, AgendaItem } from '../../core/types/models';
import { DataProcessor } from '../../services/DataProcessor';
import type { Result } from '../../core/types/shared';
import { collection, onSnapshot, deleteDoc, doc, query } from 'firebase/firestore'; 
import { db } from '../../services/firebase';

export interface TaskSlice {
  tasks: Task[];
  allAgendaItems: Task[];
  isTasksLoading: boolean;
  unsubTasks: (() => void) | null;
  fetchTasks: () => Promise<Result<Task[]>>;
  addTask: (task: Task) => Promise<Result<void>>;
  updateTask: (task: Task) => Promise<Result<void>>;
  deleteTask: (taskId: string) => Promise<Result<void>>;
  moveToTrash: (taskId: string) => Promise<Result<void>>;
  restoreFromTrash: (taskId: string) => Promise<Result<void>>;
  saveAgendaItem: (itemData: Partial<AgendaItem>) => Promise<Result<void>>;
}

// --- PURE HELPER FUNCTIONS FÜR SAVE_AGENDA_ITEM ---

const normalizeItemStatus = (itemData: Partial<AgendaItem>, existingTask?: Partial<AgendaItem>): Partial<AgendaItem> => {
  const updatedData = { ...existingTask, ...itemData };
  if (updatedData.progress === 100) {
      updatedData.status = 'ERLEDIGT';
  }
  if (updatedData.status && (!existingTask || existingTask.status !== updatedData.status)) {
    if (updatedData.status === 'OFFEN') {
      updatedData.progress = 0;
    } else if (updatedData.status === 'IN_ARBEIT') {
      const currentProgress = updatedData.progress !== undefined ? updatedData.progress : (existingTask?.progress || 0);
      if (currentProgress === 0) {
        updatedData.progress = 25;
      }
    } else if (updatedData.status === 'ERLEDIGT') {
      updatedData.progress = 100;
    }
  }

  // Echtes Erledigungsdatum (completedAt) Automatik
  if (updatedData.progress === 100 || updatedData.status === 'ERLEDIGT') {
     if (!existingTask?.completedAt && !itemData.completedAt) {
         updatedData.completedAt = Date.now();
     }
  } else {
     // Fällt der Status unter 100%, löschen wir das echte Erledigungsdatum wieder restlos
     updatedData.completedAt = null as any;
  }

  return updatedData;
};

const sterilizeSubItem = (payload: any): any => {
  const result = { ...payload };
  if (result.isSubItem === true || String(result.isSubItem) === 'true') {
    result.isRoutine = false;
    delete result.routinePattern;
    delete result.routineEndDate;
  }
  return result;
};

const syncDueDateFromEvent = (payload: any, globalState: any): any => {
  const result = { ...payload };
  if (['AGENDA', 'INFO', 'BESCHLUSS'].includes(result.type) && result.eventId) {
    if (globalState.events) {
      const parentEvent = globalState.events.find((e: any) => e.id === result.eventId);
      if (parentEvent && parentEvent.plannedStartTime) {
         result.dueDate = parentEvent.plannedStartTime;
      } else {
         result.dueDate = null; 
      }
    }
  }
  return result;
};

const cleansePayload = (payload: any): any => {
  const result = { ...payload };
  const fieldsToRemove = ['originalIndex', 'calculatedStartTimeStr', 'calculatedIsOvertime', 'effectiveDuration', 'displayIndexStr'];
  fieldsToRemove.forEach(f => delete result[f]);
  return result;
};

const processRoutineRespawn = async (payload: any, existingTask: Partial<AgendaItem> | undefined, allAgendaItems: Task[]) => {
  const isRoutine = payload.isRoutine === true || String(payload.isRoutine) === 'true';
  const isSubItem = payload.isSubItem === true || String(payload.isSubItem) === 'true';
  const justCompleted = payload.progress === 100 && (existingTask?.progress || 0) < 100;

  if (isRoutine && !isSubItem && justCompleted) {
    // ---> CHIRURGISCHER EINGRIFF: LIVE VERSIEGELUNG (Point of No Return) <---
    try {
        // Boss sofort für die aktive Ansicht versiegeln
        await DataProcessor.saveDocument('agenda_items', payload.id, { isHistorical: true } as any, true);
        
        // Alle seine Kinder sofort live versiegeln (Waisen-Schutz)
        const oldChildren = allAgendaItems.filter(t => t.isSubItem && t.parentItemId === payload.id);
        const sealPromises = oldChildren.map(child =>
            DataProcessor.saveDocument('agenda_items', child.id, { isHistorical: true } as any, true)
        );
        if (sealPromises.length > 0) await Promise.all(sealPromises);
    } catch (err) {
        console.error("Fehler bei der Versiegelung der historischen Container:", err);
    }

    let nextDueDate = payload.dueDate;
    if (payload.routinePattern && payload.routinePattern !== 'every_meeting') {
        const nextDate = payload.dueDate ? new Date(payload.dueDate) : new Date();
        nextDate.setHours(0, 0, 0, 0); 

        if (payload.routinePattern === 'weekly') nextDate.setDate(nextDate.getDate() + 7);
        else if (payload.routinePattern === 'monthly') nextDate.setMonth(nextDate.getMonth() + 1);
        else if (payload.routinePattern === 'quarterly') nextDate.setMonth(nextDate.getMonth() + 3);
        else if (payload.routinePattern === 'half_yearly') nextDate.setMonth(nextDate.getMonth() + 6);
        else if (payload.routinePattern === 'yearly') nextDate.setFullYear(nextDate.getFullYear() + 1);
        
        nextDueDate = nextDate.getTime();
    }

    // Enddatum prüfen
    if (payload.routineEndDate) {
        const dateToCheck = nextDueDate || Date.now();
        if (dateToCheck > payload.routineEndDate) {
            return; // Abbruch: Serie beendet!
        }
    }

    const newId = doc(collection(db, 'agenda_items')).id;
    const respawnPayload: any = {
        ...payload,
        id: newId,
        eventId: payload.eventId,
        status: 'OFFEN', 
        progress: 0,
        completedAt: null, 
        createdAt: Date.now() + 50, 
        dueDate: nextDueDate || null,
        baseItemId: payload.baseItemId || payload.id,
        isHistorical: false // WICHTIG: Der neue Klon ist aktiv!
    };
    
    await DataProcessor.saveDocument('agenda_items', newId, respawnPayload, false);

    // Kinder Klonen (ohne TRASH)
    const childrenToClone = allAgendaItems.filter(t => t.isSubItem && t.parentItemId === payload.id && t.status !== 'TRASH');
    
    const childPromises = childrenToClone.map((child, idx) => {
        const newChildId = doc(collection(db, 'agenda_items')).id;
        
        let newChildDueDate = child.dueDate;
        if (nextDueDate && child.leadTimeUnit && child.leadTimeValue !== undefined) {
            const baseDate = new Date(nextDueDate);
            if (child.leadTimeUnit === 'same_day') {
                newChildDueDate = baseDate.getTime();
            } else if (child.leadTimeUnit === 'days_before') {
                baseDate.setDate(baseDate.getDate() - child.leadTimeValue);
                newChildDueDate = baseDate.getTime();
            } else if (child.leadTimeUnit === 'days_after') {
                baseDate.setDate(baseDate.getDate() + child.leadTimeValue);
                newChildDueDate = baseDate.getTime();
            }
        }

        const childRespawn: any = {
            ...child,
            id: newChildId,
            eventId: payload.eventId,
            parentItemId: newId, 
            status: 'OFFEN', 
            progress: 0,
            completedAt: null, 
            createdAt: Date.now() + 100 + idx,
            dueDate: newChildDueDate,
            baseItemId: child.baseItemId || child.id,
            isHistorical: false // WICHTIG: Die Klon-Kinder sind aktiv!
        };
        
        const cleanChild = cleansePayload(childRespawn);
        return DataProcessor.saveDocument('agenda_items', newChildId, cleanChild, false);
    });
    if (childPromises.length > 0) await Promise.all(childPromises);
  }
};

const cascadeChildDueDates = async (payload: any, allAgendaItems: Task[], events: any[]) => {
  const children = allAgendaItems.filter(t => t.isSubItem && t.parentItemId === payload.id);
  if (children.length > 0) {
    let baseDateMs: number | undefined = payload.dueDate;
    
    if (!baseDateMs && payload.eventId) {
       const parentEvent = events.find((e: any) => e.id === payload.eventId);
       if (parentEvent?.plannedStartTime) {
         baseDateMs = parentEvent.plannedStartTime;
       }
    }
    
    for (const child of children) {
      if (child.leadTimeUnit && child.leadTimeValue !== undefined) {
        let newChildDueDate: number | null = null;
        
        if (baseDateMs) {
          const baseDate = new Date(baseDateMs);
          if (child.leadTimeUnit === 'same_day') {
            newChildDueDate = baseDate.getTime();
          } else if (child.leadTimeUnit === 'days_before') {
            baseDate.setDate(baseDate.getDate() - child.leadTimeValue);
            newChildDueDate = baseDate.getTime();
          } else if (child.leadTimeUnit === 'days_after') { 
            baseDate.setDate(baseDate.getDate() + child.leadTimeValue);
            newChildDueDate = baseDate.getTime();
          }
        }
        
        if (child.dueDate !== newChildDueDate) {
          const updatedChildPayload: any = { ...child, dueDate: newChildDueDate };
          const cleanChild = cleansePayload(updatedChildPayload);
          await DataProcessor.saveDocument('agenda_items', child.id, cleanChild, false);
        }
      }
    }
  }
};

export const createTaskSlice: StateCreator<TaskSlice, [], [], TaskSlice> = (set, get) => ({
  tasks: [],
  allAgendaItems: [],
  isTasksLoading: false,
  unsubTasks: null,
  
  fetchTasks: async () => {
    const currentUnsub = get().unsubTasks;
    if (currentUnsub) currentUnsub();

    set({ isTasksLoading: true });
    try {
      const q = query(collection(db, 'agenda_items'));
      const unsub = onSnapshot(q, (querySnapshot) => {
        const allAgendaItems: Task[] = [];
        
        querySnapshot.forEach((docSnap) => {
          const data = { ...docSnap.data(), id: docSnap.id } as Task;
          if (data.schemaVersion === '1.0') {
            allAgendaItems.push(data);
          }
        });

        const tasks: Task[] = [];
        const globalState = get() as any;
        const events = globalState.events || [];

        allAgendaItems.forEach((data) => {
          if (data.type === 'AUFGABE' || data.status === 'TRASH') {
            
            // ---> CHIRURGISCHER EINGRIFF: FATE-BINDING FILTER <---
            // Alle korrekt versiegelten Items (aus abgeschlossenen Meetings oder alten Routinen) fliegen hier sofort raus.
            if (data.isHistorical) return;

            // --- SCHUTZSCHILDE & FALLBACK FÜR ALTDATEN (Graceful Degradation) ---
            let isProjectDead = false;
            let isDraftAndNew = false;

            if (data.eventId) {
              const parentEvent = events.find((e: any) => e.id === data.eventId);
              if (!parentEvent) {
                isProjectDead = true; 
              } else if (parentEvent.status === 'ABGESCHLOSSEN' || parentEvent.isArchived) {
                isProjectDead = true; 
              } else if (parentEvent.status === 'PLANUNG') {
                if (!data.baseItemId) {
                  isDraftAndNew = true; // Entwürfe
                }
              }
            }

            if (isDraftAndNew) return; // Entwürfe bleiben immer unsichtbar für das Board

            // FALLBACK: Wenn das Item noch kein 'isHistorical' Feld hat (alte Datenbank-Einträge), 
            // greift die alte Container-Logik, damit die App nicht crasht, bis die Migration durchgelaufen ist.
            if (data.isHistorical === undefined) {
                const isRoutine = data.isRoutine === true || String(data.isRoutine) === 'true';
                const isCompleted = data.status === 'ERLEDIGT' || data.progress === 100;
                
                // 1. Erledigte Routinen ausblenden
                if (isRoutine && isCompleted) return; 

                // 2. Unterpunkte von erledigten Routinen ausblenden
                if (data.isSubItem && data.parentItemId) {
                  const parentTask = allAgendaItems.find(t => t.id === data.parentItemId);
                  if (parentTask) {
                     const parentIsRoutine = parentTask.isRoutine === true || String(parentTask.isRoutine) === 'true';
                     const parentIsCompleted = parentTask.status === 'ERLEDIGT' || parentTask.progress === 100;
                     if (parentIsRoutine && parentIsCompleted) return;
                  }
                }

                // 3. Freie, erledigte Aufgaben ausblenden
                if (data.status === 'ERLEDIGT' && !data.eventId) return;

                // 4. Abgeschlossene Projekte ausblenden
                if (isProjectDead) return;

                // 5. Erledigte Oberpunkte blenden Unterpunkte aus
                let isParentDone = false;
                if (data.isSubItem && data.parentItemId) {
                  const parentTask = allAgendaItems.find(t => t.id === data.parentItemId);
                  if (parentTask && parentTask.status === 'ERLEDIGT') {
                    isParentDone = true; 
                  }
                }
                if (isParentDone) return;
            }

            // Punkt ist live und aktiv!
            tasks.push(data);
          }
        });

        set({ tasks, allAgendaItems, isTasksLoading: false });
      }, (error) => {
        console.error("Fehler beim Live-Sync der Tasks:", error);
        set({ isTasksLoading: false });
      });
      
      set({ unsubTasks: unsub });
      return { success: true, data: [] };
    } catch (e) {
      set({ isTasksLoading: false });
      return { success: false, error: e instanceof Error ? e : new Error(String(e)) };
    }
  },
  
  addTask: async (task) => {
    return get().saveAgendaItem(task);
  },
  
  updateTask: async (task) => {
    return get().saveAgendaItem(task);
  },
  
  deleteTask: async (taskId) => {
    try {
      const children = get().allAgendaItems.filter(t => t.isSubItem && t.parentItemId === taskId);
      
      try { await deleteDoc(doc(db, 'tasks', taskId)); } catch (e) {} 
      try { await deleteDoc(doc(db, 'agenda_items', taskId)); } catch (e) {}

      if (children.length > 0) {
        const childPromises = children.map(async (child) => {
           try { await deleteDoc(doc(db, 'tasks', child.id)); } catch (e) {}
           try { await deleteDoc(doc(db, 'agenda_items', child.id)); } catch (e) {}
        });
        await Promise.all(childPromises);
      }

      return { success: true, data: undefined };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e : new Error(String(e)) };
    }
  },
  
  moveToTrash: async (taskId) => {
    try {
      const task = get().allAgendaItems.find(t => t.id === taskId) || get().tasks.find(t => t.id === taskId);
      if (!task) return { success: false, error: new Error('Task/AgendaItem nicht gefunden') };
      
      const globalState = get() as any;
      const currentUserId = globalState.user?.id || globalState.currentUser?.id || 'unknown';
      
      const result = await get().saveAgendaItem({
        ...task,
        status: 'TRASH',
        deletedAt: Date.now(),
        deletedBy: currentUserId
      });

      if (result.success && !task.isSubItem) {
        const children = get().allAgendaItems.filter(t => t.isSubItem && t.parentItemId === task.id);
        if (children.length > 0) {
          const childPromises = children.map(child => {
            if (child.status !== 'TRASH') {
              return get().saveAgendaItem({
                ...child,
                status: 'TRASH',
                deletedAt: Date.now(),
                deletedBy: currentUserId
              });
            }
            return Promise.resolve({ success: true });
          });
          await Promise.all(childPromises);
        }
      }
      
      return result;
    } catch (e) {
      return { success: false, error: e instanceof Error ? e : new Error(String(e)) };
    }
  },
  
  restoreFromTrash: async (taskId) => {
    try {
      const task = get().allAgendaItems.find(t => t.id === taskId) || get().tasks.find(t => t.id === taskId);
      if (!task) return { success: false, error: new Error('Task/AgendaItem nicht gefunden') };
      
      const result = await get().saveAgendaItem({
        ...task,
        status: 'OFFEN',
        deletedAt: null as any,
        deletedBy: null as any
      });

      if (result.success && !task.isSubItem) {
        const children = get().allAgendaItems.filter(t => t.isSubItem && t.parentItemId === task.id);
        if (children.length > 0) {
          const childPromises = children.map(child => {
            if (child.status === 'TRASH') {
              return get().saveAgendaItem({
                ...child,
                status: 'OFFEN',
                deletedAt: null as any,
                deletedBy: null as any
              });
            }
            return Promise.resolve({ success: true });
          });
          await Promise.all(childPromises);
        }
      }

      return result;
    } catch (e) {
      return { success: false, error: e instanceof Error ? e : new Error(String(e)) };
    }
  },
  
  saveAgendaItem: async (itemData) => {
    try {
      const globalState = get() as any;
      const existingTask = get().allAgendaItems.find(t => t.id === itemData.id) || globalState.eventAgenda?.find((t: any) => t.id === itemData.id);
      
      let payload = normalizeItemStatus(itemData, existingTask);
      payload.id = payload.id || doc(collection(db, 'agenda_items')).id;
      payload.schemaVersion = '1.0';
      
      payload = sterilizeSubItem(payload);
      payload = syncDueDateFromEvent(payload, globalState);
      payload = cleansePayload(payload);
      
      await DataProcessor.saveDocument('agenda_items', payload.id as string, payload as any, false);

      await processRoutineRespawn(payload, existingTask, get().allAgendaItems);
      await cascadeChildDueDates(payload, get().allAgendaItems, globalState.events || []);
      
      return { success: true, data: undefined };
    } catch (error: any) {
      return { success: false, error: new Error(error.message) };
    }
  },
});
// --- END OF FILE ---