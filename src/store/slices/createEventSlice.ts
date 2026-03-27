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
    // CHIRURGISCHER EINGRIFF: Wir erzeugen die Geburtsstunde der Sitzungsreihe (seriesId)
    const finalEvent = { ...event, seriesId: event.seriesId || event.id };
    
    const result = await DataProcessor.saveDocument<Event>('events', finalEvent.id, finalEvent);
    if (result.success) set((state) => ({ events: [...state.events, finalEvent] }));
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

  deleteEvent: async (eventId) => {
    try {
      // CHIRURGISCHER EINGRIFF: Lösch-Kaskade für zugehörige Agenda-Punkte
      const q = query(collection(db, 'agenda_items'), where('eventId', '==', eventId));
      const snap = await getDocs(q);
      const deletePromises = snap.docs.map(d => deleteDoc(doc(db, 'agenda_items', d.id)));
      await Promise.all(deletePromises);

      await deleteDoc(doc(db, 'events', eventId));
      set((state) => ({ events: state.events.filter((e) => e.id !== eventId) }));
      return { success: true, data: undefined };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e : new Error(String(e)) };
    }
  }
});
// Exakte Zeilenzahl: 144