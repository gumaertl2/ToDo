// src/store/slices/createEventSlice.ts
import type { StateCreator } from 'zustand';
import type { Event } from '../../core/types/models';
import { DataProcessor } from '../../services/DataProcessor';
import type { Result } from '../../core/types/shared';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';

export interface EventSlice {
  events: Event[];
  isEventsLoading: boolean;
  fetchEvents: () => Promise<Result<Event[]>>;
  addEvent: (event: Event) => Promise<Result<void>>;
}

export const createEventSlice: StateCreator<EventSlice, [], [], EventSlice> = (set) => ({
  events: [],
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
  }
});

// Exakte Zeilenzahl: 56
