// src/store/slices/createCalendarSlice.ts
import type { StateCreator } from 'zustand';
import type { CalendarEvent, CalendarSubscription, CachedIcsEvent } from '../../core/types/models';
import { DataProcessor } from '../../services/DataProcessor';
import type { Result } from '../../core/types/shared';
import { collection, getDocs, doc, deleteDoc, writeBatch } from 'firebase/firestore'; // CHIRURGISCHER EINGRIFF: writeBatch für Bulk
import { db } from '../../services/firebase';
import ICAL from 'ical.js';

export interface CalendarSlice {
  calendarEvents: CalendarEvent[];
  calendarSubscriptions: CalendarSubscription[];
  isCalendarLoading: boolean;
  fetchCalendarData: () => Promise<void>;
  addCalendarEvent: (event: CalendarEvent) => Promise<Result<void>>;
  addCalendarEventsBulk: (events: CalendarEvent[]) => Promise<Result<void>>; // NEU
  updateCalendarEvent: (event: CalendarEvent) => Promise<Result<void>>;
  deleteCalendarEvent: (id: string) => Promise<Result<void>>;
  deleteCalendarSeries: (seriesId: string) => Promise<Result<void>>; // NEU
  addCalendarSubscription: (sub: CalendarSubscription) => Promise<Result<void>>;
  updateCalendarSubscription: (sub: CalendarSubscription) => Promise<Result<void>>;
  updateCalendarSubscriptionOrder: (subs: CalendarSubscription[]) => Promise<Result<void>>;
  deleteCalendarSubscription: (id: string) => Promise<Result<void>>;
  syncSubscription: (id: string) => Promise<Result<void>>;
}

export const createCalendarSlice: StateCreator<CalendarSlice, [], [], CalendarSlice> = (set, get) => ({
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

      const sortedSubs = subs.sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999));
      set({ calendarEvents: events, calendarSubscriptions: sortedSubs, isCalendarLoading: false });
    } catch (e) {
      set({ isCalendarLoading: false });
    }
  },

  addCalendarEvent: async (event) => {
    const result = await DataProcessor.saveDocument<CalendarEvent>('calendar_events', event.id, event);
    if (result.success) set((state) => ({ calendarEvents: [...state.calendarEvents, event] }));
    return result;
  },

  // CHIRURGISCHER EINGRIFF: Viele Termine gleichzeitig speichern
  addCalendarEventsBulk: async (events) => {
    try {
      const batch = writeBatch(db);
      events.forEach(event => {
        const ref = doc(db, 'calendar_events', event.id);
        batch.set(ref, event);
      });
      await batch.commit();
      set((state) => ({ calendarEvents: [...state.calendarEvents, ...events] }));
      return { success: true, data: undefined };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e : new Error(String(e)) };
    }
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

  // CHIRURGISCHER EINGRIFF: Eine ganze Serie anhand der ID löschen
  deleteCalendarSeries: async (seriesId) => {
    const state = get();
    const toDelete = state.calendarEvents.filter(e => e.seriesId === seriesId);
    try {
      const batch = writeBatch(db);
      toDelete.forEach(event => {
        batch.delete(doc(db, 'calendar_events', event.id));
      });
      await batch.commit();
      set((state) => ({ calendarEvents: state.calendarEvents.filter(e => e.seriesId !== seriesId) }));
      return { success: true, data: undefined };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e : new Error(String(e)) };
    }
  },

  addCalendarSubscription: async (sub) => {
    const currentSubs = get().calendarSubscriptions;
    const maxOrder = currentSubs.reduce((max, s) => Math.max(max, s.sortOrder ?? 0), 0);
    const subWithOrder = { ...sub, sortOrder: maxOrder + 1 };
    const result = await DataProcessor.saveDocument<CalendarSubscription>('calendar_subscriptions', subWithOrder.id, subWithOrder);
    if (result.success) set((state) => ({ calendarSubscriptions: [...state.calendarSubscriptions, subWithOrder] }));
    return result;
  },

  updateCalendarSubscription: async (sub) => {
    const result = await DataProcessor.saveDocument<CalendarSubscription>('calendar_subscriptions', sub.id, sub);
    if (result.success) {
      set((state) => {
        const newSubs = state.calendarSubscriptions.map(s => s.id === sub.id ? sub : s);
        return { calendarSubscriptions: newSubs.sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999)) };
      });
    }
    return result;
  },

  updateCalendarSubscriptionOrder: async (subs) => {
    try {
      const batch = writeBatch(db);
      subs.forEach((sub, index) => {
        const subWithOrder = { ...sub, sortOrder: index };
        batch.set(doc(db, 'calendar_subscriptions', sub.id), subWithOrder);
      });
      await batch.commit();
      set({ calendarSubscriptions: subs.map((s, i) => ({ ...s, sortOrder: i })) });
      return { success: true, data: undefined };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e : new Error(String(e)) };
    }
  },

  deleteCalendarSubscription: async (id) => {
    try {
      await deleteDoc(doc(db, 'calendar_subscriptions', id));
      set((state) => ({ calendarSubscriptions: state.calendarSubscriptions.filter(s => s.id !== id) }));
      return { success: true, data: undefined };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e : new Error(String(e)) };
    }
  },

  syncSubscription: async (id) => {
    const state = get();
    const sub = state.calendarSubscriptions.find(s => s.id === id);
    if (!sub) return { success: false, error: new Error('Abo nicht gefunden') };
    try {
      let feedUrl = sub.url.trim();
      if (feedUrl.toLowerCase().startsWith('webcal://')) feedUrl = 'https://' + feedUrl.substring(9);
      const proxyUrls = [`https://api.allorigins.win/raw?url=${encodeURIComponent(feedUrl)}`, `https://corsproxy.io/?${encodeURIComponent(feedUrl)}` ];
      let textData = null;
      for (const proxyUrl of proxyUrls) {
        try {
          const response = await fetch(proxyUrl);
          if (response.ok) {
            const data = await response.text();
            if (data.includes('BEGIN:VCALENDAR')) { textData = data; break; }
          }
        } catch (e) { console.warn(`Proxy fail`); }
      }
      if (!textData) return { success: false, error: new Error('Download fehlgeschlagen') };
      const jcalData = ICAL.parse(textData);
      const comp = new ICAL.Component(jcalData);
      const vevents = comp.getAllSubcomponents('vevent');
      const cachedEvents: CachedIcsEvent[] = [];
      vevents.forEach((vevent: any) => {
        const event = new ICAL.Event(vevent);
        if (!event.startDate) return; 
        const s = event.startDate;
        const startDate = new Date(s.year, s.month - 1, s.day, s.hour, s.minute).getTime();
        let endDate = startDate;
        if (event.endDate) { const e = event.endDate; endDate = new Date(e.year, e.month - 1, e.day, e.hour, e.minute).getTime(); }
        cachedEvents.push({ uid: event.uid, title: event.summary || 'Ohne Titel', description: event.description || '', location: event.location || '', startTime: startDate, endTime: endDate, isAllDay: s.isDate });
      });
      const updatedSub: CalendarSubscription = { ...sub, cachedEvents, lastSyncedAt: Date.now() };
      const result = await DataProcessor.saveDocument<CalendarSubscription>('calendar_subscriptions', sub.id, updatedSub);
      if (result.success) set((state) => ({ calendarSubscriptions: state.calendarSubscriptions.map(s => s.id === sub.id ? updatedSub : s) }));
      return result;
    } catch (error) { return { success: false, error: error instanceof Error ? error : new Error(String(error)) }; }
  }
});
// Exakte Zeilenzahl: 161