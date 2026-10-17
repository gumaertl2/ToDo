// [2026-10-17] - OPTIMIZATION: Firebase onSnapshot Listener-Zerstörung in fetchCalendarData verhindert (Early Return), um Free-Tier Lese-Quoten zu sparen und Offline-Starts zu ermöglichen.
// [2026-10-13] - ARCHITECTURE-FIX: Clean Rollback auf stabile Proxy-Basis (AllOrigins, CorsProxyIO, Direkt). Experimentelle Proxies und Header entfernt, da diese zu oft Browser-Sicherheitswarnungen (Load failed) auslösten.
// [2026-10-13] - BUGFIX: Smarter Cache-Buster (_t=...) wird nun exklusiv nur noch für 'mytischtennis.de' verwendet. Starre Kalender (Feiertage) blockieren sonst.
// [2026-10-13] - UX-FIX: Detaillierte Fehlererfassung (X-Ray Scanner) beim Sync beibehalten, um Fehler pro Proxy transparent zu machen.
// [2026-10-04] - LOGIK-FIX: 'lastSyncAttemptAt' eingeführt. Fehlerhafte Syncs überschreiben nun nicht mehr das Datum des letzten ERFOLGREICHEN Syncs.
// [2026-10-04] - FEATURE: 'lastSyncBy' und 'lastSyncError' beim Sync-Vorgang erfasst.
// [2026-10-01] - BUGFIX: 'snap.metadata.fromCache' Filter im Snapshot hinzugefügt. Verhindert Distributed-Sync Überhitzung.
// [2026-10-01] - BUGFIX: 'batch.update' statt 'batch.set' in updateCalendarSubscriptionOrder genutzt.
// [2026-10-01] - BUGFIX: Zeitzonen-Fehler (UK/Ausland) im ICS-Parser behoben. Nutzt nun 'toUnixTime()'.
// [2026-07-23] - BUGFIX: Auto-Sync (Lazy Cronjob) wird nun NUR für eingeloggte User ausgeführt.
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
    // CHIRURGISCHER EINGRIFF: Quoten-Falle geschlossen!
    if (get().unsubCalendarEvents || get().unsubCalendarSubs) {
      return;
    }
    
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

      if (snap.metadata.fromCache) return;

      const currentUser = (get() as any).user;
      
      if (currentUser) {
        const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
        const now = Date.now();
        
        sortedSubs.forEach(sub => {
          if (sub.isActive && sub.url !== 'FILE_IMPORT') {
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
      subs.forEach((sub, index) => batch.update(doc(db, 'calendar_subscriptions', sub.id), { sortOrder: index }));
      await batch.commit();
      return { success: true, data: undefined };
    } catch (e) { 
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
      
      // Die saubere Basis-Kaskade ohne überkomplizierte JSON-Hacks oder exotische Proxies
      const proxyGenerators = [
        { name: 'AllOrigins', build: (u: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}&disableCache=true` },
        { name: 'CorsProxyIO', build: (u: string) => `https://corsproxy.io/?${encodeURIComponent(u)}` },
        { name: 'Direkt', build: (u: string) => u }
      ];
      
      let textData = null;
      let attemptCount = 0;
      let finalErrorMessage = ''; 
      const MAX_RETRIES = 3;

      for (let retry = 0; retry < MAX_RETRIES && !textData; retry++) {
        attemptCount++;
        const currentRoundErrors: string[] = [];
        
        // Cache-Buster NUR für myTischtennis.de (Feiertagskalender hassen unbekannte Parameter)
        let targetUrl = feedUrl;
        if (feedUrl.includes('mytischtennis.de')) {
          targetUrl = feedUrl.includes('?') ? `${feedUrl}&_t=${Date.now()}` : `${feedUrl}?_t=${Date.now()}`;
        }
        
        for (const proxy of proxyGenerators) {
          try {
            const fetchUrl = proxy.build(targetUrl);
            
            // Simpler GET Fetch. Keine Custom-Headers, um Safari's CORS-Preflight Blockade zu verhindern.
            // Kein { cache: 'no-store' }, da dies bei manchen mobilen Browsern sofort zum "Load failed" führt.
            const response = await fetch(fetchUrl);

            if (response.ok) {
              const rawData = await response.text();
              const sanitizedData = rawData.trim();

              if (sanitizedData.includes('BEGIN:VCALENDAR')) { 
                textData = sanitizedData; 
                break; // Erfolg! Sofortiger Ausstieg.
              } else {
                currentRoundErrors.push(`[${proxy.name}]: Kein ICS`);
              }
            } else {
              currentRoundErrors.push(`[${proxy.name}]: HTTP ${response.status}`);
            }
          } catch (e: any) { 
            currentRoundErrors.push(`[${proxy.name}]: Blockiert`);
          }
        }

        if (textData) break; 

        finalErrorMessage = currentRoundErrors.join(' | ');

        if (retry < MAX_RETRIES - 1) {
           await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      if (!textData) {
        const errMsg = `Fehler (Versuch ${attemptCount}): ${finalErrorMessage}`;
        await updateDoc(docRef, { 
          lastSyncAttemptAt: Date.now(), 
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
        lastSyncedAt: Date.now(),
        lastSyncAttemptAt: Date.now(),
        lastSyncBy: syncUserName,
        lastSyncError: null
      });
    } catch (error: any) { 
      try {
        await updateDoc(doc(db, 'calendar_subscriptions', id), {
          lastSyncAttemptAt: Date.now(),
          lastSyncBy: syncUserName,
          lastSyncError: `Interner Parse-Fehler: ${error.message || 'Unbekannt'}`
        });
      } catch (e) { /* ignore fallback errors */ }
      return { success: false, error: error as Error }; 
    }
  }
});
// --- END OF FILE ---