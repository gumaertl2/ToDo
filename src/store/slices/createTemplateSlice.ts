// src/store/slices/createTemplateSlice.ts
import type { StateCreator } from 'zustand';
import type { AgendaItem } from '../../core/types/models';
import type { Result } from '../../core/types/shared';
import { collection, getDocs, doc, deleteDoc, query, where } from 'firebase/firestore';
import { db } from '../../services/firebase';

export interface TemplateSlice {
  templates: AgendaItem[];
  isTemplatesLoading: boolean;
  fetchTemplatesAndRoutines: () => Promise<void>;
  deleteAgendaItem: (id: string) => Promise<Result<void>>;
}

export const createTemplateSlice: StateCreator<TemplateSlice, [], [], TemplateSlice> = (set) => ({
  templates: [],
  isTemplatesLoading: false,
  fetchTemplatesAndRoutines: async () => {
    set({ isTemplatesLoading: true });
    try {
      const q = query(collection(db, 'agenda_items'), where('type', '==', 'VORLAGE'));
      const querySnapshot = await getDocs(q);
      const templates: AgendaItem[] = [];
      
      querySnapshot.forEach((docSnap) => {
        const data = { ...docSnap.data(), id: docSnap.id } as AgendaItem;
        templates.push(data);
      });
      
      set({ templates, isTemplatesLoading: false });
    } catch (e) {
      set({ isTemplatesLoading: false });
    }
  },
  deleteAgendaItem: async (id: string) => {
    // CHIRURGISCHER EINGRIFF: Optimistic UI - Element wird SOFORT auf allen Ansichten restlos entfernt
    set((state: any) => ({ 
      templates: state.templates ? state.templates.filter((t: any) => t.id !== id) : [],
      eventAgenda: state.eventAgenda ? state.eventAgenda.filter((t: any) => t.id !== id) : [],
      tasks: state.tasks ? state.tasks.filter((t: any) => t.id !== id) : []
    }));

    try {
      await deleteDoc(doc(db, 'agenda_items', id));
      return { success: true, data: undefined };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e : new Error(String(e)) };
    }
  }
});
// Exakte Zeilenzahl: 48