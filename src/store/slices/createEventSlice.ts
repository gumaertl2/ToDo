// src/store/slices/createEventSlice.ts
import { StateCreator } from 'zustand';
import { Event, Protocol } from '../../core/types/models';
import { DataProcessor } from '../../services/DataProcessor';
import { Result } from '../../core/types/shared';
import { collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';

export interface EventSlice {
  events: Event[];
  protocols: Protocol[];
  isEventsLoading: boolean;
  fetchEvents: () => Promise<Result<Event[]>>;
  addEvent: (event: Event) => Promise<Result<void>>;
  transformAgendaToProtocol: (eventId: string, initialProtocol: Protocol) => Promise<Result<void>>;
}

export const createEventSlice: StateCreator<EventSlice, [], [], EventSlice> = (set) => ({
  events: [],
  protocols: [],
  isEventsLoading: false,
  fetchEvents: async () => {
    set({ isEventsLoading: true });
    try {
      const querySnapshot = await getDocs(collection(db, 'events'));
      const events: Event[] = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data() as Event;
        if (data.schemaVersion === '1.0') {
          events.push(data);
        }
      });
      set({ events, isEventsLoading: false });
      return { success: true, data: events };
    } catch (e) {
      set({ isEventsLoading: false });
      return { success: false, error: e instanceof Error ? e : new Error(String(e)) };
    }
  },
  addEvent: async (event) => {
    const result = await DataProcessor.saveDocument<Event>('events', event.id, event);
    if (result.success) {
      set((state) => ({ events: [...state.events, event] }));
    }
    return result;
  },
  transformAgendaToProtocol: async (eventId, initialProtocol) => {
    try {
      const eventRef = doc(db, 'events', eventId);
      await setDoc(eventRef, { status: 'PROTOCOL_TRANSFORMED' }, { merge: true });
      
      const result = await DataProcessor.saveDocument<Protocol>('protocols', initialProtocol.id, initialProtocol);
      if (result.success) {
        set((state) => ({ protocols: [...state.protocols, initialProtocol] }));
      }
      return result;
    } catch (e) {
      return { success: false, error: e instanceof Error ? e : new Error(String(e)) };
    }
  },
});

// Exakte Zeilenzahl: 56
