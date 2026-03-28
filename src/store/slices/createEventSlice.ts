// src/store/slices/createEventSlice.ts
import type { StateCreator } from 'zustand';
import type { Event, AgendaItem } from '../../core/types/models';
import { DataProcessor } from '../../services/DataProcessor';
import type { Result } from '../../core/types/shared';
import { collection, getDocs, doc, deleteDoc, query, where } from 'firebase/firestore';
import { db } from '../../services/firebase';

export interface EventSlice {
  events: Event[];
  currentEvent: Event | null;
  eventAgenda: AgendaItem[];
  isEventsLoading: boolean;
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

  fetchEvents: async () => {
    set({ isEventsLoading: true });
    try {
      const snap = await getDocs(collection(db, 'events'));
      const events: Event[] = [];
      snap.forEach((d) => events.push({ ...d.data(), id: d.id } as Event));
      set({ events, isEventsLoading: false });
    } catch (e) {
      set({ isEventsLoading: false });
    }
  },

  fetchEventDetails: async (eventId) => {
    set({ isEventsLoading: true });
    try {
      const result = await DataProcessor.getDocument<Event>('events', eventId);
      if (result.success && result.data) {
        set({ currentEvent: { ...result.data, id: eventId } });
      }
    } catch (e) {
    } finally {
      set({ isEventsLoading: false });
    }
  },

  fetchEventAgenda: async (eventId) => {
    try {
      const q = query(collection(db, 'agenda_items'), where('eventId', '==', eventId));
      const snap = await getDocs(q);
      const agenda: AgendaItem[] = [];
      snap.forEach((d) => agenda.push({ ...d.data(), id: d.id } as AgendaItem));
      set({ eventAgenda: agenda.sort((a,b) => (a.createdAt || Date.now()) - (b.createdAt || Date.now())) });
    } catch (e) {
    }
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

      set((state) => ({ eventAgenda: [...state.eventAgenda, newItem] }));

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
    const result = await DataProcessor.saveDocument<Event>('events', event.id, event);
    if (result.success) set((state) => ({ events: [...state.events, event] }));
    return result;
  },
  
  updateEvent: async (event) => {
    const result = await DataProcessor.saveDocument<Event>('events', event.id, event);
    if (result.success) {
      set((state) => ({
        events: state.events.map(e => e.id === event.id ? event : e),
        currentEvent: state.currentEvent?.id === event.id ? event : state.currentEvent
      }));
    }
    return result;
  },

  // CHIRURGISCHER EINGRIFF: Archiviert nun die komplette Reihe (Projekt), nicht nur das einzelne Meeting!
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

      set((state) => ({
        events: state.events.map(e => (e.seriesId || e.id) === targetSeriesId ? { ...e, isArchived } : e),
        currentEvent: state.currentEvent && (state.currentEvent.seriesId || state.currentEvent.id) === targetSeriesId 
                        ? { ...state.currentEvent, isArchived } 
                        : state.currentEvent
      }));
      return { success: true, data: undefined };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e : new Error(String(e)) };
    }
  },

  // CHIRURGISCHER EINGRIFF: Löscht radikal alle Sitzungen, Protokolle und ToDos einer Reihe (Projekt)!
  deleteEvent: async (eventId) => {
    try {
      const targetEvent = get().events.find(e => e.id === eventId);
      if (!targetEvent) return { success: false, error: new Error('Event not found') };

      const targetSeriesId = targetEvent.seriesId || targetEvent.id;
      const eventsInSeries = get().events.filter(e => (e.seriesId || e.id) === targetSeriesId);

      const deletePromises = [];
      for (const ev of eventsInSeries) {
        const q = query(collection(db, 'agenda_items'), where('eventId', '==', ev.id));
        const snap = await getDocs(q);
        snap.docs.forEach(d => deletePromises.push(deleteDoc(doc(db, 'agenda_items', d.id))));
        deletePromises.push(deleteDoc(doc(db, 'events', ev.id)));
      }

      await Promise.all(deletePromises);

      set((state) => ({ events: state.events.filter(e => (e.seriesId || e.id) !== targetSeriesId) }));
      return { success: true, data: undefined };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e : new Error(String(e)) };
    }
  }
});
// Exakte Zeilenzahl: 172