// 2026-04-15 19:40 - FEATURE: Echtzeit-Sync (onSnapshot) für Vorlagen implementiert
// src/store/slices/createTemplateSlice.ts
import type { StateCreator } from 'zustand';
import type { AgendaItem } from '../../core/types/models';
import type { Result } from '../../core/types/shared';
import { collection, onSnapshot, doc, deleteDoc, query, where } from 'firebase/firestore';
import { db } from '../../services/firebase';

export interface TemplateSlice {
  templates: AgendaItem[];
  isTemplatesLoading: boolean;
  unsubTemplates: (() => void) | null;
  fetchTemplatesAndRoutines: () => Promise<void>;
  deleteAgendaItem: (id: string) => Promise<Result<void>>;
}

export const createTemplateSlice: StateCreator<TemplateSlice, [], [], TemplateSlice> = (set, get) => ({
  templates: [],
  isTemplatesLoading: false,
  unsubTemplates: null,

  fetchTemplatesAndRoutines: async () => {
    if (get().unsubTemplates) get().unsubTemplates!();
    set({ isTemplatesLoading: true });
    
    const q = query(collection(db, 'agenda_items'), where('type', '==', 'VORLAGE'));
    const unsub = onSnapshot(q, (snap) => {
      const templates: AgendaItem[] = [];
      snap.forEach((docSnap) => templates.push({ ...docSnap.data(), id: docSnap.id } as AgendaItem));
      set({ templates, isTemplatesLoading: false });
    }, () => set({ isTemplatesLoading: false }));

    set({ unsubTemplates: unsub });
  },

  deleteAgendaItem: async (id: string) => {
    try {
      await deleteDoc(doc(db, 'agenda_items', id));
      return { success: true, data: undefined };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e : new Error(String(e)) };
    }
  }
});
// --- END OF FILE ---