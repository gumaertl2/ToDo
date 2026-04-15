// 2026-04-15 19:40 - FEATURE: Echtzeit-Sync (onSnapshot) für Projekte & Sitzungen
// src/store/slices/createEventSlice.ts
import type { StateCreator } from 'zustand';
import type { Event, AgendaItem } from '../../core/types/models';
import { DataProcessor } from '../../services/DataProcessor';
import type { Result } from '../../core/types/shared';
import { collection, onSnapshot, doc, deleteDoc, query, where } from 'firebase/firestore';
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
      set({ eventAgenda: agenda.sort((a,b) => (a.createdAt || Date.now()) - (b.createdAt || Date.now())) });
    });
    
    set({ unsubEventAgenda: unsub });
  },

  importTemplateToEvent: async (template, eventId) => {
    try {
      const newId = doc(collection(db, 'agenda_items')).id;
      const newItem: AgendaItem = {
        ...template,
        id: newId,
        eventId: eventId,
        type: template.type === 'VORLAGE' ? 'AGENDA' : template.type,
        status: 'OFFEN',
        progress: 0,
        schemaVersion: '1.0',
        createdAt: Date.now()
      };
      await DataProcessor.saveDocument('agenda_items', newId, newItem);
      return { success: true, data: undefined };
    } catch (error: any) {
      return { success: false, error: new Error(error.message) };
    }
  },

  moveAgendaItem: async (itemId, newIndex) => {
    const agenda = [...get().eventAgenda];
    const oldIndex = agenda.findIndex(i => i.id === itemId);
    if (oldIndex < 0 || oldIndex === newIndex) return { success: true, data: undefined };

    const [movedItem] = agenda.splice(oldIndex, 1);
    agenda.splice(newIndex, 0, movedItem);

    // Wir optimieren hier einmal kurz lokal, damit die Animation beim Verschieben nicht stottert
    set({ eventAgenda: agenda });

    const baseTime = Date.now();
    const updatePromises = agenda.map((item, index) => {
      item.createdAt = baseTime + (index * 1000); 
      return DataProcessor.saveDocument('agenda_items', item.id, item);
    });

    await Promise.all(updatePromises);
    return { success: true, data: undefined };
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
          if (task.type === 'AUFGABE' && task.mustBeDoneBeforeEvent && task.leadTimeValue) {
            const leadMs = task.leadTimeUnit === 'days' ? task.leadTimeValue * 24 * 60 * 60 * 1000 : task.leadTimeValue * 60 * 60 * 1000;
            const newDueDate = event.plannedStartTime! - leadMs;
            if (task.dueDate !== newDueDate) {
              const updatedTask = { ...task, dueDate: newDueDate };
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
        // Die Agenda-Items lassen wir hier per API löschen (Serverless), onSnapshot räumt UI auf
        await deleteDoc(doc(db, 'events', ev.id));
      }
      return { success: true, data: undefined };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e : new Error(String(e)) };
    }
  }
});
// --- END OF FILE ---