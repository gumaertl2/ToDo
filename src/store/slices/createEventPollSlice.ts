// [2026-10-08] - BUGFIX: 'DataProcessor' entfernt und durch nativen Firebase 'setDoc' Aufruf ersetzt, um Abstürze (White Screen) beim Speichern der Umfrage zu verhindern.
// [2026-10-08] - FEATURE: Slice für EventPollResponses (Schatten-Akte für Umfragen) mit gezielten Subscriptions (eventId) erstellt.
// src/store/slices/createEventPollSlice.ts
import type { StateCreator } from 'zustand';
import type { EventPollResponse } from '../../core/types/models';
import type { Result } from '../../core/types/shared';
import { collection, onSnapshot, query, where, doc, deleteDoc, setDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';

export interface EventPollSlice {
  pollResponsesByEvent: Record<string, EventPollResponse[]>;
  pollSubscriptions: Record<string, () => void>;
  
  subscribeToEventPoll: (eventId: string) => void;
  unsubscribeFromEventPoll: (eventId: string) => void;
  savePollResponse: (response: EventPollResponse) => Promise<Result<void>>;
  deletePollResponse: (responseId: string, eventId: string) => Promise<Result<void>>;
}

export const createEventPollSlice: StateCreator<EventPollSlice, [], [], EventPollSlice> = (set, get) => ({
  pollResponsesByEvent: {},
  pollSubscriptions: {},

  subscribeToEventPoll: (eventId) => {
    // Verhindere doppelte Subscriptions für denselben Termin
    if (get().pollSubscriptions[eventId]) return;

    const q = query(collection(db, 'event_poll_responses'), where('eventId', '==', eventId));
    
    const unsub = onSnapshot(q, (snap) => {
      const responses: EventPollResponse[] = [];
      snap.forEach((d) => {
        responses.push({ ...d.data(), id: d.id } as EventPollResponse);
      });
      
      set((state) => ({
        pollResponsesByEvent: {
          ...state.pollResponsesByEvent,
          [eventId]: responses
        }
      }));
    }, (error) => {
      console.error(`Firebase Sync Fehler (EventPollResponses für ${eventId}):`, error);
    });

    set((state) => ({
      pollSubscriptions: {
        ...state.pollSubscriptions,
        [eventId]: unsub
      }
    }));
  },

  unsubscribeFromEventPoll: (eventId) => {
    const unsub = get().pollSubscriptions[eventId];
    if (unsub) {
      unsub(); // Listener beenden
      set((state) => {
        const newSubs = { ...state.pollSubscriptions };
        delete newSubs[eventId];
        
        // Daten aus dem Cache werfen, um RAM zu sparen
        const newResponses = { ...state.pollResponsesByEvent };
        delete newResponses[eventId];
        
        return {
          pollSubscriptions: newSubs,
          pollResponsesByEvent: newResponses
        };
      });
    }
  },

  savePollResponse: async (response) => {
    const dataToSave = {
      ...response,
      updatedAt: Date.now()
    };

    // Optimistic Update: Sofort in die UI schreiben, ohne auf Firebase zu warten
    set((state) => {
      const currentResponses = state.pollResponsesByEvent[response.eventId] || [];
      const filtered = currentResponses.filter(r => r.id !== response.id);
      
      return {
        pollResponsesByEvent: {
          ...state.pollResponsesByEvent,
          [response.eventId]: [...filtered, dataToSave as EventPollResponse]
        }
      };
    });

    // Im Hintergrund in Firestore speichern
    try {
      await setDoc(doc(db, 'event_poll_responses', response.id), dataToSave);
      return { success: true, data: undefined };
    } catch (error) {
      console.error("Fehler beim Speichern in Firestore:", error);
      return { success: false, error: error as Error };
    }
  },
  
  deletePollResponse: async (responseId, eventId) => {
    try {
      // Optimistic Update: Sofort aus der UI entfernen
      set((state) => {
        const currentResponses = state.pollResponsesByEvent[eventId] || [];
        return {
          pollResponsesByEvent: {
            ...state.pollResponsesByEvent,
            [eventId]: currentResponses.filter(r => r.id !== responseId)
          }
        };
      });
      
      await deleteDoc(doc(db, 'event_poll_responses', responseId));
      return { success: true, data: undefined };
    } catch (e) {
      return { success: false, error: e as Error };
    }
  }
});
// --- END OF FILE ---