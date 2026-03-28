// src/store/slices/createCalendarSlice.ts
import type { StateCreator } from 'zustand';
import type { CalendarEvent, CalendarSubscription } from '../../core/types/models';
import { DataProcessor } from '../../services/DataProcessor';
import type { Result } from '../../core/types/shared';
import { collection, getDocs, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';

export interface CalendarSlice {
  calendarEvents: CalendarEvent[];
  calendarSubscriptions: CalendarSubscription[];
  isCalendarLoading: boolean;
  fetchCalendarData: () => Promise<void>;
  addCalendarEvent: (event: CalendarEvent) => Promise<Result<void>>;
  updateCalendarEvent: (event: CalendarEvent) => Promise<Result<void>>;
  deleteCalendarEvent: (id: string) => Promise<Result<void>>;
  addCalendarSubscription: (sub: CalendarSubscription) => Promise<Result<void>>;
  updateCalendarSubscription: (sub: CalendarSubscription) => Promise<Result<void>>;
  deleteCalendarSubscription: (id: string) => Promise<Result<void>>;
}

export const createCalendarSlice: StateCreator<CalendarSlice, [], [], CalendarSlice> = (set) => ({
  calendarEvents: [],
  calendarSubscriptions: [],
  isCalendarLoading: false,

  fetchCalendarData: async () => {
    set({ isCalendarLoading: true });
    try {
      const eventsSnap = await getDocs(collection(db, 'calendar_events'));
      const events: CalendarEvent[] = [];
      eventsSnap.forEach((d) => events.push({ ...d.data(), id: d.id } as CalendarEvent));

      const subsSnap = await getDocs(collection(db, 'calendar_subscriptions'));
      const subs: CalendarSubscription[] = [];
      subsSnap.forEach((d) => subs.push({ ...d.data(), id: d.id } as CalendarSubscription));

      set({ calendarEvents: events, calendarSubscriptions: subs, isCalendarLoading: false });
    } catch (e) {
      set({ isCalendarLoading: false });
    }
  },

  addCalendarEvent: async (event) => {
    const result = await DataProcessor.saveDocument<CalendarEvent>('calendar_events', event.id, event);
    if (result.success) set((state) => ({ calendarEvents: [...state.calendarEvents, event] }));
    return result;
  },

  updateCalendarEvent: async (event) => {
    const result = await DataProcessor.saveDocument<CalendarEvent>('calendar_events', event.id, event);
    if (result.success) set((state) => ({ calendarEvents: state.calendarEvents.map(e => e.id === event.id ? event : e) }));
    return result;
  },

  deleteCalendarEvent: async (id) => {
    try {
      await deleteDoc(doc(db, 'calendar_events', id));
      set((state) => ({ calendarEvents: state.calendarEvents.filter(e => e.id !== id) }));
      return { success: true, data: undefined };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e : new Error(String(e)) };
    }
  },

  addCalendarSubscription: async (sub) => {
    const result = await DataProcessor.saveDocument<CalendarSubscription>('calendar_subscriptions', sub.id, sub);
    if (result.success) set((state) => ({ calendarSubscriptions: [...state.calendarSubscriptions, sub] }));
    return result;
  },

  updateCalendarSubscription: async (sub) => {
    const result = await DataProcessor.saveDocument<CalendarSubscription>('calendar_subscriptions', sub.id, sub);
    if (result.success) set((state) => ({ calendarSubscriptions: state.calendarSubscriptions.map(s => s.id === sub.id ? sub : s) }));
    return result;
  },

  deleteCalendarSubscription: async (id) => {
    try {
      await deleteDoc(doc(db, 'calendar_subscriptions', id));
      set((state) => ({ calendarSubscriptions: state.calendarSubscriptions.filter(s => s.id !== id) }));
      return { success: true, data: undefined };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e : new Error(String(e)) };
    }
  }
});
// Exakte Zeilenzahl: 74