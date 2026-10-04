// [2026-10-04] - LOGIK-FIX: 'lastSyncAttemptAt' eingeführt. Fehlerhafte Syncs überschreiben nun nicht mehr das Datum des letzten ERFOLGREICHEN Syncs (lastSyncedAt). Cronjob-Lock auf Attempt-Datum umgestellt.
// [2026-10-04] - FEATURE: 'lastSyncBy' und 'lastSyncError' beim Sync-Vorgang erfasst, um Fehlschläge und Verursacher transparent zu machen (Hover-Tooltip).
// [2026-10-01] - BUGFIX: 'snap.metadata.fromCache' Filter im Snapshot hinzugefügt. Verhindert, dass veraltete lokale Handy-Caches ununterbrochen den Auto-Sync triggern (Distributed-Sync Überhitzung).
// [2026-10-01] - BUGFIX: 'batch.update' statt 'batch.set' in updateCalendarSubscriptionOrder genutzt. Verhindert die unfreiwillige Wiederbelebung gelöschter Abos (Zombies) durch alte Handys.
// [2026-10-01] - BUGFIX: Zeitzonen-Fehler (UK/Ausland) im ICS-Parser behoben. Nutzt nun 'toUnixTime()' anstelle des lokalen 'new Date()' um die exakte, zeitzonenunabhängige ICS-Zeit zu erzwingen.
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

      // ---> CHIRURGISCHER EINGRIFF 1: CACHE-FILTER <---
      // Wir blockieren den automatischen Sync, wenn die Liste nur aus dem veralteten
      // lokalen Offline-Cache des Handys geladen wurde. Wir warten auf die echten Server-Daten!
      if (snap.metadata.fromCache) return;

      // ---> CHIRURGISCHER EINGRIFF: GAST-SCHUTZ (Endlosschleifen-Blocker) <---
      const currentUser = (get() as any).user;
      
      if (currentUser) {
        const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
        const now = Date.now();
        
        sortedSubs.forEach(sub => {
          if (sub.isActive && sub.url !== 'FILE_IMPORT') {
            // Nutze das Attempt-Datum als Lock, damit Fehler-URLs nicht endlos triggern
            const lastAttempt = sub.lastSyncAttemptAt || sub.lastSyncedAt || 0;
            if (now - lastAttempt > SEVEN_DAYS) {
              updateDoc(doc(db, 'calendar_subscriptions', sub.id), { lastSyncAttemptAt: now }).then(() => {
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
      // ---> CHIRURGISCHER EINGRIFF 2: ZOMBIE-KILLER <---
      // batch.update statt batch.set. So können alte Handys keine 
      // bereits gelöschten Abos mehr aus Versehen neu erschaffen.
      subs.forEach((sub, index) => batch.update(doc(db, 'calendar_subscriptions', sub.id), { sortOrder: index }));
      await batch.commit();
      return { success: true, data: undefined };
    } catch (e) { 
      // Fehler (z.B. Dokument existiert nicht mehr) werden still geschluckt, das ist exakt das Ziel!
      return { success: false, error: e as Error }; 
    }
  },

  deleteCalendarSubscription: async (id) => {
    try {
      await deleteDoc(doc(db, 'calendar_subscriptions', id));
      return { success: true, data: undefined };
    } catch (e) { return { success: false, error: e as Error }; }
  },

  syncSubscription: async (id) => {
    const currentUser = (get() as any).user;
    const syncUserName = currentUser ? (currentUser.name || 'Unbekannt') : 'Auto-Sync';

    try {
      const docRef = doc(db, 'calendar_subscriptions', id);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) return { success: false, error: new Error('Abo nicht in Datenbank gefunden') };
      
      const sub = { ...docSnap.data(), id: docSnap.id } as CalendarSubscription;
      
      let feedUrl = sub.url.trim();
      if (feedUrl === 'FILE_IMPORT') return { success: false, error: new Error('Lokale Dateien werden nicht synchronisiert') };

      if (feedUrl.toLowerCase().startsWith('webcal://')) feedUrl = 'https://' + feedUrl.substring(9);
      
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
      
      if (!textData) {
        const errMsg = 'Download fehlgeschlagen. Bitte Link prüfen.';
        await updateDoc(docRef, { 
          lastSyncAttemptAt: Date.now(), // Nur den Versuch protokollieren, nicht den Erfolg!
          lastSyncBy: syncUserName, 
          lastSyncError: errMsg 
        });
        return { success: false, error: new Error(errMsg) };
      }
      
      const jcalData = ICAL.parse(textData);
      const comp = new ICAL.Component(jcalData);
      const vevents = comp.getAllSubcomponents('vevent');
      const cachedEvents: CachedIcsEvent[] = [];
      
      vevents.forEach((vevent: any) => {
        const event = new ICAL.Event(vevent);
        if (!event.startDate) return; 
        
        const s = event.startDate;
        
        // ---> CHIRURGISCHER EINGRIFF 3: ZEITZONEN-ANKER <---
        // 's.toUnixTime()' berechnet den korrekten UTC-Wert basierend auf der ICS-Datei.
        // Das lokale 'new Date(s.year...)' wurde entfernt, da es die UK-Zeitzone des Handys aufgezwungen hat.
        const startDate = s.toUnixTime() * 1000;
        
        let endDate = startDate;
        if (event.endDate) { 
          const e = event.endDate; 
          endDate = e.toUnixTime() * 1000; 
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
      
      return await DataProcessor.saveDocument<CalendarSubscription>('calendar_subscriptions', sub.id, { 
        ...sub, 
        cachedEvents, 
        lastSyncedAt: Date.now(),         // ERFOLG!
        lastSyncAttemptAt: Date.now(),    // VERSUCH (hier identisch mit Erfolg)
        lastSyncBy: syncUserName,
        lastSyncError: null
      });
    } catch (error) { 
      try {
        await updateDoc(doc(db, 'calendar_subscriptions', id), {
          lastSyncAttemptAt: Date.now(), // Nur den Versuch protokollieren, nicht den Erfolg!
          lastSyncBy: syncUserName,
          lastSyncError: (error as Error).message || 'Unbekannter Fehler'
        });
      } catch (e) { /* ignore fallback errors */ }
      return { success: false, error: error as Error }; 
    }
  }
});
// --- END OF FILE ---
