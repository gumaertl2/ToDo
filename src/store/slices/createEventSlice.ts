// 2026-04-24 14:00 - FEATURE: Paket-Import (importTemplateToEvent) kopiert Vorlage inkl. aller Unterpunkte
// 2026-04-24 14:30 - BUGFIX: Firebase 'undefined' Error beim Importieren der Hauptvorlage behoben
// 2026-04-24 22:00 - FEATURE: Entfernt 'isTemplate' Flag beim Import, damit Punkt zur echten Aufgabe wird
// 2026-04-25 08:00 - BUGFIX: 'Block-Move' implementiert - Verschieben eines Hauptpunktes nimmt nun alle Unterpunkte mit
// 2026-05-02 10:45 - FIX: Typen-Check ('days_before' etc.) in der Kaskaden-Aktualisierung (updateEvent) gefixt
// 2026-05-12 11:00 - BUGFIX: importTemplateToEvent nutzt nun Math.max() für den Start-Index, um Überlappungen beim Einfügen zu verhindern.
// 2026-05-12 11:05 - FEATURE: repairEventAgendaOrder Funktion hinzugefügt, um zerschossene Hierarchie-Indizes zu reparieren.
// 2026-05-12 11:30 - BUGFIX: TypeScript-Fehler (TS6133) behoben, eventId wird nun zur expliziten Filterung genutzt.
// 2026-05-12 11:35 - BUGFIX: Race-Condition in repairEventAgendaOrder und moveAgendaItem durch Umstellung auf writeBatch(db) behoben.
// 2026-05-12 16:00 - BUGFIX: moveAgendaItem übersetzt nun den UI-Index via visibleAgenda in den echten Store-Index, um Fehlplatzierungen zu verhindern.
// 2026-05-15 10:35 - ARCHITEKTUR: Datums-Injektion für Vorlagen-Import und Kaskaden-Updates (SSOT Denormalisierung) hinzugefügt.
// src/store/slices/createEventSlice.ts
import type { StateCreator } from 'zustand';
import type { Event, AgendaItem } from '../../core/types/models';
import { DataProcessor } from '../../services/DataProcessor';
import type { Result } from '../../core/types/shared';
import { collection, onSnapshot, doc, deleteDoc, query, where, writeBatch } from 'firebase/firestore';
import { db } from '../../services/firebase';

export interface EventSlice {
  events: Event[];
  currentEvent: Event | null;
  eventAgenda: AgendaItem[];
  isEventsLoading: boolean;
  unsubEvents: (() => void) | null;
  unsubEventDetails: (() => void) | null;
  unsubEventAgenda: (() => void) | null;
  fetchEvents: () => Promise<void>;
  fetchEventDetails: (eventId: string) => Promise<void>;
  fetchEventAgenda: (eventId: string) => Promise<void>;
  importTemplateToEvent: (template: AgendaItem, eventId: string) => Promise<Result<void>>;
  moveAgendaItem: (itemId: string, newIndex: number) => Promise<Result<void>>;
  repairEventAgendaOrder: (eventId: string) => Promise<Result<void>>;
  addEvent: (event: Event) => Promise<Result<void>>;
  updateEvent: (event: Event) => Promise<Result<void>>;
  deleteEvent: (eventId: string) => Promise<Result<void>>;
  toggleArchiveEvent: (eventId: string, isArchived: boolean) => Promise<Result<void>>;
}

export const createEventSlice: StateCreator<EventSlice, [], [], EventSlice> = (set, get) => ({
  events: [],
  currentEvent: null,
  eventAgenda: [],
  isEventsLoading: false,
  unsubEvents: null,
  unsubEventDetails: null,
  unsubEventAgenda: null,

  fetchEvents: async () => {
    if (get().unsubEvents) get().unsubEvents!();
    set({ isEventsLoading: true });
    
    const unsub = onSnapshot(collection(db, 'events'), (snap) => {
      const events: Event[] = [];
      snap.forEach((d) => events.push({ ...d.data(), id: d.id } as Event));
      set({ events, isEventsLoading: false });
    }, () => set({ isEventsLoading: false }));
    
    set({ unsubEvents: unsub });
  },

  fetchEventDetails: async (eventId) => {
    if (get().unsubEventDetails) get().unsubEventDetails!();
    set({ isEventsLoading: true });
    
    const unsub = onSnapshot(doc(db, 'events', eventId), (docSnap) => {
      if (docSnap.exists()) {
        set({ currentEvent: { ...docSnap.data(), id: docSnap.id } as Event, isEventsLoading: false });
      } else {
        set({ currentEvent: null, isEventsLoading: false });
      }
    }, () => set({ isEventsLoading: false }));
    
    set({ unsubEventDetails: unsub });
  },

  fetchEventAgenda: async (eventId) => {
    if (get().unsubEventAgenda) get().unsubEventAgenda!();
    
    const q = query(collection(db, 'agenda_items'), where('eventId', '==', eventId));
    const unsub = onSnapshot(q, (snap) => {
      const agenda: AgendaItem[] = [];
      snap.forEach((d) => agenda.push({ ...d.data(), id: d.id } as AgendaItem));
      set({ eventAgenda: agenda.sort((a,b) => {
        if (a.protocolIndex !== undefined && b.protocolIndex !== undefined) {
          return a.protocolIndex - b.protocolIndex;
        }
        return (a.createdAt || Date.now()) - (b.createdAt || Date.now())
      })});
    });
    
    set({ unsubEventAgenda: unsub });
  },

  importTemplateToEvent: async (template, eventId) => {
    try {
      const allTemplates = (get() as any).templates as AgendaItem[];
      const children = allTemplates.filter(t => t.isSubItem && t.parentItemId === template.id)
                                   .sort((a,b) => (a.createdAt || 0) - (b.createdAt || 0));

      const newParentId = doc(collection(db, 'agenda_items')).id;
      
      const agendaIndices = get().eventAgenda.map(i => i.protocolIndex ?? 0);
      const baseIndex = agendaIndices.length > 0 ? Math.max(...agendaIndices) + 1 : 0;

      // CHIRURGISCHER EINGRIFF: Ziel-Event Datum ermitteln
      const targetEvent = get().events.find(e => e.id === eventId);
      const eventDate = targetEvent?.plannedStartTime;

      const parentType = template.type === 'VORLAGE' ? 'AGENDA' : template.type;
      
      const parentItem: Partial<AgendaItem> = {
        ...template,
        id: newParentId,
        eventId: eventId,
        type: parentType,
        isTemplate: false,
        status: 'OFFEN',
        progress: 0,
        schemaVersion: '1.0',
        createdAt: Date.now(),
        protocolIndex: baseIndex,
        isSubItem: false,
        parentItemId: null as any 
      };

      // Datum injizieren falls zutreffend
      if (['AGENDA', 'INFO', 'BESCHLUSS'].includes(parentType) && eventDate) {
        parentItem.dueDate = eventDate;
      }

      Object.keys(parentItem).forEach(key => {
        if ((parentItem as any)[key] === undefined) {
          delete (parentItem as any)[key];
        }
      });

      const promises = [DataProcessor.saveDocument('agenda_items', newParentId, parentItem as AgendaItem)];

      children.forEach((child, idx) => {
        const newChildId = doc(collection(db, 'agenda_items')).id;
        const childType = child.type === 'VORLAGE' ? 'AGENDA' : child.type;

        const childItem: Partial<AgendaItem> = {
          ...child,
          id: newChildId,
          eventId: eventId,
          type: childType,
          isTemplate: false,
          status: 'OFFEN',
          progress: 0,
          schemaVersion: '1.0',
          createdAt: Date.now() + 100 + idx, 
          protocolIndex: baseIndex + 1 + idx, 
          isSubItem: true,
          parentItemId: newParentId
        };

        if (['AGENDA', 'INFO', 'BESCHLUSS'].includes(childType) && eventDate) {
          childItem.dueDate = eventDate;
        }

        Object.keys(childItem).forEach(key => {
          if ((childItem as any)[key] === undefined) {
            delete (childItem as any)[key];
          }
        });

        promises.push(DataProcessor.saveDocument('agenda_items', newChildId, childItem as AgendaItem));
      });

      await Promise.all(promises);
      return { success: true, data: undefined };
    } catch (error: any) {
      return { success: false, error: new Error(error.message) };
    }
  },

  repairEventAgendaOrder: async (eventId) => {
    try {
      const agenda = get().eventAgenda.filter(i => i.eventId === eventId);
      if (agenda.length === 0) return { success: true, data: undefined };

      const parents = agenda.filter(i => !i.isSubItem).sort((a, b) => {
        const idxA = a.protocolIndex !== undefined ? a.protocolIndex : a.createdAt || 0;
        const idxB = b.protocolIndex !== undefined ? b.protocolIndex : b.createdAt || 0;
        return idxA - idxB;
      });

      const flattened: AgendaItem[] = [];
      parents.forEach(parent => {
        flattened.push(parent);
        const children = agenda.filter(i => i.isSubItem && i.parentItemId === parent.id).sort((a, b) => {
          const idxA = a.protocolIndex !== undefined ? a.protocolIndex : a.createdAt || 0;
          const idxB = b.protocolIndex !== undefined ? b.protocolIndex : b.createdAt || 0;
          return idxA - idxB;
        });
        flattened.push(...children);
      });

      const validParentIds = new Set(parents.map(p => p.id));
      const orphans = agenda.filter(i => i.isSubItem && (!i.parentItemId || !validParentIds.has(i.parentItemId))).sort((a, b) => {
          const idxA = a.protocolIndex !== undefined ? a.protocolIndex : a.createdAt || 0;
          const idxB = b.protocolIndex !== undefined ? b.protocolIndex : b.createdAt || 0;
          return idxA - idxB;
      });
      flattened.push(...orphans);

      const batch = writeBatch(db);
      const baseTime = Date.now();
      let hasChanges = false;

      flattened.forEach((item, index) => {
        if (item.protocolIndex !== index) {
            const itemRef = doc(db, 'agenda_items', item.id);
            batch.update(itemRef, { 
              protocolIndex: index, 
              createdAt: baseTime + (index * 100) 
            });
            hasChanges = true;
        }
      });

      if (hasChanges) {
        await batch.commit();
      }
      
      return { success: true, data: undefined };
    } catch (e: any) {
      return { success: false, error: new Error(e.message) };
    }
  },

  moveAgendaItem: async (itemId, newIndex) => {
    const agenda = [...get().eventAgenda].sort((a, b) => {
      const idxA = a.protocolIndex !== undefined ? a.protocolIndex : a.createdAt || 0;
      const idxB = b.protocolIndex !== undefined ? b.protocolIndex : b.createdAt || 0;
      return idxA - idxB;
    });

    const visibleAgenda = agenda.filter(item => {
        const isRoutine = item.isRoutine === true || String(item.isRoutine) === 'true';
        const isCompleted = item.progress === 100 || item.status === 'ERLEDIGT';
        
        if (isRoutine && isCompleted) return false;

        if (item.isSubItem && item.parentItemId) {
            const parent = agenda.find(p => p.id === item.parentItemId);
            if (parent) {
                const parentIsRoutine = parent.isRoutine === true || String(parent.isRoutine) === 'true';
                const parentIsCompleted = parent.progress === 100 || parent.status === 'ERLEDIGT';
                if (parentIsRoutine && parentIsCompleted) return false;
            }
        }
        return true;
    });

    const targetItemFromUI = visibleAgenda[newIndex];
    if (!targetItemFromUI) return { success: true, data: undefined };

    const oldIndex = agenda.findIndex(i => i.id === itemId);
    const realNewIndex = agenda.findIndex(i => i.id === targetItemFromUI.id);

    if (oldIndex < 0 || oldIndex === realNewIndex) return { success: true, data: undefined };

    const itemToMove = agenda[oldIndex];
    const targetItemOld = agenda[realNewIndex];

    let blockIds = [itemToMove.id];
    if (!itemToMove.isSubItem) {
        const children = agenda.filter(i => i.isSubItem && i.parentItemId === itemToMove.id);
        blockIds = [...blockIds, ...children.map(c => c.id)];
    }

    const blockToMove = agenda.filter(i => blockIds.includes(i.id));
    const remaining = agenda.filter(i => !blockIds.includes(i.id));

    let insertIndex = remaining.length;
    if (targetItemOld) {
        if (blockIds.includes(targetItemOld.id)) return { success: true, data: undefined };

        const targetIndexInRemaining = remaining.findIndex(i => i.id === targetItemOld.id);
        if (targetIndexInRemaining !== -1) {
            if (realNewIndex > oldIndex && !targetItemOld.isSubItem) {
                let lastChildIdx = targetIndexInRemaining;
                for (let i = targetIndexInRemaining + 1; i < remaining.length; i++) {
                    if (remaining[i].isSubItem && remaining[i].parentItemId === targetItemOld.id) {
                        lastChildIdx = i;
                    } else {
                        break;
                    }
                }
                insertIndex = lastChildIdx + 1;
            } else if (realNewIndex > oldIndex && targetItemOld.isSubItem) {
                insertIndex = targetIndexInRemaining + 1;
            } else {
                insertIndex = targetIndexInRemaining;
            }
        }
    }

    remaining.splice(insertIndex, 0, ...blockToMove);

    try {
      const batch = writeBatch(db);
      const baseTime = Date.now();
      
      remaining.forEach((item, index) => {
        const itemRef = doc(db, 'agenda_items', item.id);
        batch.update(itemRef, {
          protocolIndex: index,
          createdAt: baseTime + (index * 1000)
        });
      });

      await batch.commit();
      return { success: true, data: undefined };
    } catch (e: any) {
      return { success: false, error: new Error(e.message) };
    }
  },

  addEvent: async (event) => {
    return await DataProcessor.saveDocument<Event>('events', event.id, event);
  },
  
  updateEvent: async (event) => {
    const oldEvent = get().events.find(e => e.id === event.id);
    const timeChanged = oldEvent && oldEvent.plannedStartTime !== event.plannedStartTime;

    const result = await DataProcessor.saveDocument<Event>('events', event.id, event);
    
    if (result.success && timeChanged && event.plannedStartTime) {
      try {
        const agenda = get().eventAgenda.filter(t => t.eventId === event.id);
        const updates: Promise<any>[] = [];

        agenda.forEach((task) => {
          // 1. Relative Aufgaben-Termine aktualisieren
          if (task.type === 'AUFGABE' && (task.mustBeDoneBeforeEvent || task.leadTimeUnit) && task.leadTimeValue !== undefined) {
            const baseDate = new Date(event.plannedStartTime!);
            let newDueDate: number | undefined = undefined;
            
            if (task.leadTimeUnit === 'same_day') {
              newDueDate = baseDate.getTime();
            } else if (task.leadTimeUnit === 'days_before') {
              baseDate.setDate(baseDate.getDate() - task.leadTimeValue);
              newDueDate = baseDate.getTime();
            } else if (task.leadTimeUnit === 'days_after') {
              baseDate.setDate(baseDate.getDate() + task.leadTimeValue);
              newDueDate = baseDate.getTime();
            }

            if (newDueDate !== undefined && task.dueDate !== newDueDate) {
              const updatedTask = { ...task, dueDate: newDueDate };
              updates.push(DataProcessor.saveDocument('agenda_items', task.id, updatedTask as any));
            }
          }
          // 2. CHIRURGISCHER EINGRIFF: Agenda, Info und Beschlüsse knallhart nachziehen (SSOT)
          else if (['AGENDA', 'INFO', 'BESCHLUSS'].includes(task.type || '')) {
            if (task.dueDate !== event.plannedStartTime) {
              const updatedTask = { ...task, dueDate: event.plannedStartTime };
              updates.push(DataProcessor.saveDocument('agenda_items', task.id, updatedTask as any));
            }
          }
        });
        if (updates.length > 0) await Promise.all(updates);
      } catch (e) {
        console.error("Fehler beim Aktualisieren der Fälligkeiten:", e);
      }
    }
    return result;
  },

  toggleArchiveEvent: async (eventId, isArchived) => {
    const targetEvent = get().events.find(e => e.id === eventId);
    if (!targetEvent) return { success: false, error: new Error('Event not found') };
    
    const targetSeriesId = targetEvent.seriesId || targetEvent.id;
    const eventsInSeries = get().events.filter(e => (e.seriesId || e.id) === targetSeriesId);

    try {
      const promises = eventsInSeries.map(ev => {
        const updated = { ...ev, isArchived };
        return DataProcessor.saveDocument<Event>('events', ev.id, updated);
      });
      await Promise.all(promises);
      return { success: true, data: undefined };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e : new Error(String(e)) };
    }
  },

  deleteEvent: async (eventId) => {
    try {
      const targetEvent = get().events.find(e => e.id === eventId);
      if (!targetEvent) return { success: false, error: new Error('Event not found') };

      const targetSeriesId = targetEvent.seriesId || targetEvent.id;
      const eventsInSeries = get().events.filter(e => (e.seriesId || e.id) === targetSeriesId);

      for (const ev of eventsInSeries) {
        await deleteDoc(doc(db, 'events', ev.id));
      }
      return { success: true, data: undefined };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e : new Error(String(e)) };
    }
  }
});
// --- END OF FILE ---