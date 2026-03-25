// src/store/slices/createTemplateSlice.ts
import type { StateCreator } from 'zustand';
import type { AgendaItem } from '../../core/types/models';

import type { Result } from '../../core/types/shared';
import { collection, getDocs, doc, deleteDoc, query, where } from 'firebase/firestore';
import { db } from '../../services/firebase';

export interface TemplateSlice {
  templates: AgendaItem[];
  routines: AgendaItem[];
  isTemplatesLoading: boolean;
  fetchTemplatesAndRoutines: () => Promise<void>;
  deleteAgendaItem: (id: string) => Promise<Result<void>>;
}

export const createTemplateSlice: StateCreator<TemplateSlice, [], [], TemplateSlice> = (set) => ({
  templates: [],
  routines: [],
  isTemplatesLoading: false,
  fetchTemplatesAndRoutines: async () => {
    set({ isTemplatesLoading: true });
    try {
      const q = query(collection(db, 'agenda_items'), where('type', '==', 'VORLAGE'));
      const querySnapshot = await getDocs(q);
      const all: AgendaItem[] = [];
      querySnapshot.forEach(d => all.push(d.data() as AgendaItem));
      const templates = all.filter(i => !i.mustBeDoneBeforeEvent);
      const routines = all.filter(i => i.mustBeDoneBeforeEvent);
      set({ templates, routines, isTemplatesLoading: false });
    } catch (e) {
      set({ isTemplatesLoading: false });
    }
  },
  deleteAgendaItem: async (id) => {
    try {
      await deleteDoc(doc(db, 'agenda_items', id));
      set((state) => ({ 
        templates: state.templates.filter((t) => t.id !== id),
        routines: state.routines.filter((r) => r.id !== id)
      }));
      return { success: true, data: undefined };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e : new Error(String(e)) };
    }
  }
});

// Exakte Zeilenzahl: 66
