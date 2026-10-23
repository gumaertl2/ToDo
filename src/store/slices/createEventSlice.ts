// [2026-10-23] - HIERARCHIE & MOVE-FIX: moveAgendaItem und repairEventAgendaOrder synchronisieren die sichtbare Hierarchie (ohne TRASH/isHistorical, inkl. rekursiver Unterpunkt-Gruppierung), sodass das Verschieben von Haupt- und Unterpunkten präzise arbeitet und alle Unterpunkte geschlossen unter ihrem Oberpunkt bleiben.
// [2026-10-17] - OPTIMIZATION: Firebase onSnapshot Listener-Zerstörung in fetchEvents verhindert (Early Return), um Free-Tier Lese-Quoten zu sparen.
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

const compareAgendaOrder = (a: AgendaItem, b: AgendaItem) => {
  const idxA = a.protocolIndex !== undefined ? a.protocolIndex : (a.createdAt || 0);
  const idxB = b.protocolIndex !== undefined ? b.protocolIndex : (b.createdAt || 0);
  if (idxA !== idxB) return idxA - idxB;
  return (a.createdAt || 0) - (b.createdAt || 0);
};

const buildHierarchicalOrder = (items: AgendaItem[]): AgendaItem[] => {
  const ordered: AgendaItem[] = [];
  const placedIds = new Set<string>();

  const appendWithChildren = (parent: AgendaItem) => {
    if (placedIds.has(parent.id)) return;
    placedIds.add(parent.id);
    ordered.push(parent);
    const children = items
      .filter(i => i.isSubItem && i.parentItemId === parent.id)
      .sort(compareAgendaOrder);
    children.forEach(child => appendWithChildren(child));
  };

  const parents = items.filter(i => !i.isSubItem).sort(compareAgendaOrder);
  parents.forEach(parent => appendWithChildren(parent));

  const orphans = items.filter(i => !placedIds.has(i.id)).sort(compareAgendaOrder);
  orphans.forEach(orphan => appendWithChildren(orphan));

  return ordered;
};

const collectSubtreeIds = (rootId: string, items: AgendaItem[]): string[] => {
  const ids: string[] = [rootId];
  const visited = new Set<string>([rootId]);
  const queue: string[] = [rootId];

  while (queue.length > 0) {
    const curr = queue.shift()!;
    const children = items.filter(i => i.isSubItem && i.parentItemId === curr).sort(compareAgendaOrder);
    for (const child of children) {
      if (!visited.has(child.id)) {
        visited.add(child.id);
        ids.push(child.id);
        queue.push(child.id);
      }
    }
  }
  return ids;
};

export const createEventSlice: StateCreator<EventSlice, [], [], EventSlice> = (set, get) => ({
  events: [],
  currentEvent: null,
  eventAgenda: [],
  isEventsLoading: false,
  unsubEvents: null,
  unsubEventDetails: null,
  unsubEventAgenda: null,

  fetchEvents: async () => {
    // CHIRURGISCHER EINGRIFF: Quoten-Falle für globale Events geschlossen!
    if (get().unsubEvents) return;
    
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
      const currentEv = get().currentEvent || get().events.find(e => e.id === eventId);
      if (currentEv?.status === 'ABGESCHLOSSEN') {
        return { success: true, data: undefined };
      }

      const agenda = get().eventAgenda.filter(i => i.eventId === eventId && i.status !== 'TRASH' && !i.isHistorical);
      if (agenda.length === 0) return { success: true, data: undefined };

      const flattened = buildHierarchicalOrder(agenda);

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
    const currentEv = get().currentEvent;
    if (currentEv?.status === 'ABGESCHLOSSEN') {
      return { success: true, data: undefined };
    }

    const rawAgenda = [...get().eventAgenda];

    // 1. Blutlinien-Deduplizierung exakt wie in EventDetailView (ohne TRASH)
    const bloodlineMap = new Map<string, AgendaItem[]>();
    rawAgenda.forEach(item => {
      if (item.status === 'TRASH') return;
      const bId = item.baseItemId || item.id;
      if (!bloodlineMap.has(bId)) bloodlineMap.set(bId, []);
      bloodlineMap.get(bId)!.push(item);
    });

    const primaryIds = new Set<string>();
    bloodlineMap.forEach(group => {
      group.sort((a, b) => (b.createdAt || b.updatedAt || 0) - (a.createdAt || a.updatedAt || 0));
      let primary = group.find(t => !t.isHistorical && t.status !== 'ERLEDIGT' && t.progress !== 100);
      if (!primary) primary = group.find(t => !t.isHistorical);
      if (!primary) primary = group.find(t => t.status !== 'ERLEDIGT' && t.progress !== 100);
      if (!primary) primary = group[0];
      primaryIds.add(primary.id);
    });

    // 2. Sichtbare Agenda exakt wie in EventAgendaList (ohne TRASH, ohne isHistorical, mit hierarchischer Gruppierung)
    const filteredVisible = rawAgenda.filter(item => {
      if (item.status === 'TRASH') return false;
      if (!primaryIds.has(item.id)) return false;
      if (item.isHistorical === true) return false;

      if (item.isHistorical === undefined) {
        const isRoutine = item.isRoutine === true || String(item.isRoutine) === 'true';
        const isCompleted = item.progress === 100 || item.status === 'ERLEDIGT';
        if (isRoutine && isCompleted) return false;

        if (item.isSubItem && item.parentItemId) {
          const parent = rawAgenda.find(p => p.id === item.parentItemId);
          if (parent && parent.status !== 'TRASH') {
            const parentIsRoutine = parent.isRoutine === true || String(parent.isRoutine) === 'true';
            const parentIsCompleted = parent.progress === 100 || parent.status === 'ERLEDIGT';
            if (parentIsRoutine && parentIsCompleted) return false;
          }
        }
      }
      return true;
    });

    const visibleAgenda = buildHierarchicalOrder(filteredVisible);

    const oldVisIndex = visibleAgenda.findIndex(i => i.id === itemId);
    if (oldVisIndex < 0 || oldVisIndex === newIndex) return { success: true, data: undefined };

    const itemToMove = visibleAgenda[oldVisIndex];

    // Block-Bildung: Ein Hauptpunkt (oder Unterpunkt mit eigenen Unterpunkten) nimmt immer seinen gesamten Unterbaum mit
    const blockIds = collectSubtreeIds(itemToMove.id, visibleAgenda);
    const blockSet = new Set(blockIds);

    const blockToMove = visibleAgenda.filter(i => blockSet.has(i.id));
    const remaining = visibleAgenda.filter(i => !blockSet.has(i.id));

    let insertIndex = remaining.length;

    if (newIndex < visibleAgenda.length) {
      const targetItemFromUI = visibleAgenda[newIndex];
      if (!targetItemFromUI || blockSet.has(targetItemFromUI.id)) {
        return { success: true, data: undefined };
      }

      const targetIndexInRemaining = remaining.findIndex(i => i.id === targetItemFromUI.id);
      if (targetIndexInRemaining !== -1) {
        if (newIndex > oldVisIndex && !targetItemFromUI.isSubItem) {
          // Beim Nach-unten-Schieben auf einen Hauptpunkt hinter dessen gesamten Unterbaum einfügen
          const targetSubtreeIds = new Set(collectSubtreeIds(targetItemFromUI.id, remaining));
          let lastChildIdx = targetIndexInRemaining;
          for (let i = targetIndexInRemaining + 1; i < remaining.length; i++) {
            if (targetSubtreeIds.has(remaining[i].id)) {
              lastChildIdx = i;
            } else {
              break;
            }
          }
          insertIndex = lastChildIdx + 1;
        } else if (newIndex > oldVisIndex && targetItemFromUI.isSubItem) {
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