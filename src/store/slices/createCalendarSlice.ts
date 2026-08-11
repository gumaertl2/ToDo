// [2026-08-06] - BUGFIX: Dynamischer Cache-Buster (_t=timestamp) in syncSubscription eingebaut, um aggressive Proxy-Caches zu umgehen.
// [2026-07-23] - BUGFIX: Auto-Sync (Lazy Cronjob) wird nun NUR für eingeloggte User ausgeführt. Verhindert eine tödliche "Optimistic Update Rollback"-Endlosschleife für ungeloggte Gäste.
// [2026-07-23] - BUGFIX: Cache-Buster (nocache) von der Original-URL entfernt und stattdessen Server/Proxy-Caching via Fetch API { cache: 'no-store' } blockiert.
// [2026-07-23] - FEATURE: 7-Tage Auto-Sync (Lazy Cronjob) in den Kalender-Snapshot eingebaut.
// src/store/slices/createCalendarSlice.ts
import type { StateCreator } from 'zustand';
import type { CalendarEvent, CalendarSubscription, CachedIcsEvent } from '../../core/types/models';
import { DataProcessor } from '../../services/DataProcessor';
import type { Result } from '../../core/types/shared';
import { collection, onSnapshot, doc, deleteDoc, writeBatch, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import ICAL from 'ical.js';

export interface CalendarSlice {
  calendarEvents: CalendarEvent[];
  calendarSubscriptions: CalendarSubscription[];
  isCalendarLoading: boolean;
  unsubCalendarEvents: (() => void) | null;
  unsubCalendarSubs: (() => void) | null;
  fetchCalendarData: () => Promise<void>;
  addCalendarEvent: (event: CalendarEvent) => Promise<Result<void>>;
  addCalendarEventsBulk: (events: CalendarEvent[]) => Promise<Result<void>>;
  updateCalendarEvent: (event: CalendarEvent) => Promise<Result<void>>;
  deleteCalendarEvent: (id: string) => Promise<Result<void>>;
  deleteCalendarSeries: (seriesId: string) => Promise<Result<void>>;
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
  unsubCalendarEvents: null,
  unsubCalendarSubs: null,

  fetchCalendarData: async () => {
    if (get().unsubCalendarEvents) get().unsubCalendarEvents!();
    if (get().unsubCalendarSubs) get().unsubCalendarSubs!();
    
    set({ isCalendarLoading: true });
    
    const eSub = onSnapshot(collection(db, 'calendar_events'), (snap) => {
      const events: CalendarEvent[] = [];
      snap.forEach((d) => events.push({ ...d.data(), id: d.id } as CalendarEvent));
      set({ calendarEvents: events });
    }, (error) => {
      console.error("Firebase Sync Fehler (Events):", error);
    });

    const sSub = onSnapshot(collection(db, 'calendar_subscriptions'), (snap) => {
      const subs: CalendarSubscription[] = [];
      snap.forEach((d) => subs.push({ ...d.data(), id: d.id } as CalendarSubscription));
      
      const sortedSubs = subs.sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999));
      set({ calendarSubscriptions: sortedSubs, isCalendarLoading: false });

      // ---> CHIRURGISCHER EINGRIFF: GAST-SCHUTZ (Endlosschleifen-Blocker) <---
      // Wir holen uns den aktuellen User aus dem Store. Nur wenn jemand eingeloggt ist,
      // dürfen wir Schreibbefehle (updateDoc) abfeuern, um Permission-Rollbacks zu vermeiden.
      const currentUser = (get() as any).user;
      
      if (currentUser) {
        const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
        const now = Date.now();
        
        sortedSubs.forEach(sub => {
          if (sub.isActive && sub.url !== 'FILE_IMPORT') {
            if (!sub.lastSyncedAt || (now - sub.lastSyncedAt > SEVEN_DAYS)) {
              updateDoc(doc(db, 'calendar_subscriptions', sub.id), { lastSyncedAt: now }).then(() => {
                get().syncSubscription(sub.id);
              }).catch(err => console.warn("Fehler beim Auto-Sync Lock (wird ignoriert):", err));
            }
          }
        });
      }
    }, (error) => {
      console.error("Firebase Sync Fehler (Subscriptions):", error);
    });

    set({ unsubCalendarEvents: eSub, unsubCalendarSubs: sSub });
  },

  addCalendarEvent: async (event) => await DataProcessor.saveDocument<CalendarEvent>('calendar_events', event.id, event),

  addCalendarEventsBulk: async (events) => {
    try {
      const batch = writeBatch(db);
      events.forEach(event => batch.set(doc(db, 'calendar_events', event.id), event));
      await batch.commit();
      return { success: true, data: undefined };
    } catch (e) { return { success: false, error: e as Error }; }
  },

  updateCalendarEvent: async (event) => await DataProcessor.saveDocument<CalendarEvent>('calendar_events', event.id, event),

  deleteCalendarEvent: async (id) => {
    try {
      await deleteDoc(doc(db, 'calendar_events', id));
      return { success: true, data: undefined };
    } catch (e) { return { success: false, error: e as Error }; }
  },

  deleteCalendarSeries: async (seriesId) => {
    const toDelete = get().calendarEvents.filter(e => e.seriesId === seriesId);
    try {
      const batch = writeBatch(db);
      toDelete.forEach(event => batch.delete(doc(db, 'calendar_events', event.id)));
      await batch.commit();
      return { success: true, data: undefined };
    } catch (e) { return { success: false, error: e as Error }; }
  },

  addCalendarSubscription: async (sub) => {
    const maxOrder = get().calendarSubscriptions.reduce((max, s) => Math.max(max, s.sortOrder ?? 0), 0);
    return await DataProcessor.saveDocument<CalendarSubscription>('calendar_subscriptions', sub.id, { ...sub, sortOrder: maxOrder + 1 });
  },

  updateCalendarSubscription: async (sub) => await DataProcessor.saveDocument<CalendarSubscription>('calendar_subscriptions', sub.id, sub),

  updateCalendarSubscriptionOrder: async (subs) => {
    try {
      const batch = writeBatch(db);
      subs.forEach((sub, index) => batch.set(doc(db, 'calendar_subscriptions', sub.id), { ...sub, sortOrder: index }));
      await batch.commit();
      return { success: true, data: undefined };
    } catch (e) { return { success: false, error: e as Error }; }
  },

  deleteCalendarSubscription: async (id) => {
    try {
      await deleteDoc(doc(db, 'calendar_subscriptions', id));
      return { success: true, data: undefined };
    } catch (e) { return { success: false, error: e as Error }; }
  },

  syncSubscription: async (id) => {
    try {
      const docRef = doc(db, 'calendar_subscriptions', id);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) return { success: false, error: new Error('Abo nicht in Datenbank gefunden') };
      
      const sub = { ...docSnap.data(), id: docSnap.id } as CalendarSubscription;
      
      let feedUrl = sub.url.trim();
      if (feedUrl === 'FILE_IMPORT') return { success: false, error: new Error('Lokale Dateien werden nicht synchronisiert') };

      if (feedUrl.toLowerCase().startsWith('webcal://')) feedUrl = 'https://' + feedUrl.substring(9);
      
      // CHIRURGISCHER EINGRIFF: Dynamischer Cache-Buster an die URL hängen
      const cacheBuster = `_t=${Date.now()}`;
      const cacheBustedUrl = feedUrl.includes('?') 
        ? `${feedUrl}&${cacheBuster}` 
        : `${feedUrl}?${cacheBuster}`;
      
      const proxyUrls = [
        `https://api.allorigins.win/raw?url=${encodeURIComponent(cacheBustedUrl)}&disableCache=true`, 
        `https://corsproxy.io/?${encodeURIComponent(cacheBustedUrl)}` 
      ];
      
      let textData = null;
      for (const proxyUrl of proxyUrls) {
        try {
          const response = await fetch(proxyUrl, { cache: 'no-store' });
          if (response.ok) {
            const data = await response.text();
            if (data.includes('BEGIN:VCALENDAR')) { textData = data; break; }
          }
        } catch (e) { console.warn(`Proxy fail für ${proxyUrl}`); }
      }
      
      if (!textData) return { success: false, error: new Error('Download fehlgeschlagen. Bitte Link prüfen.') };
      
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
        if (event.endDate) { 
          const e = event.endDate; 
          endDate = new Date(e.year, e.month - 1, e.day, e.hour, e.minute).getTime(); 
        }
        cachedEvents.push({ 
          uid: event.uid, 
          title: event.summary || 'Ohne Titel', 
          description: event.description || '', 
          location: event.location || '', 
          startTime: startDate, 
          endTime: endDate, 
          isAllDay: s.isDate 
        });
      });
      
      return await DataProcessor.saveDocument<CalendarSubscription>('calendar_subscriptions', sub.id, { ...sub, cachedEvents, lastSyncedAt: Date.now() });
    } catch (error) { 
      return { success: false, error: error as Error }; 
    }
  }
});
// --- END OF FILE ---