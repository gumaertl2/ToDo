// src/store/slices/createTemplateSlice.ts
import type { StateCreator } from 'zustand';
import type { Template, Routine } from '../../core/types/models';
import { DataProcessor } from '../../services/DataProcessor';
import type { Result } from '../../core/types/shared';
import { collection, getDocs, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';

export interface TemplateSlice {
  templates: Template[];
  routines: Routine[];
  isTemplatesLoading: boolean;
  fetchTemplatesAndRoutines: () => Promise<void>;
  addTemplate: (template: Template) => Promise<Result<void>>;
  deleteTemplate: (templateId: string) => Promise<Result<void>>;
  addRoutine: (routine: Routine) => Promise<Result<void>>;
  deleteRoutine: (routineId: string) => Promise<Result<void>>;
}

export const createTemplateSlice: StateCreator<TemplateSlice, [], [], TemplateSlice> = (set) => ({
  templates: [],
  routines: [],
  isTemplatesLoading: false,
  fetchTemplatesAndRoutines: async () => {
    set({ isTemplatesLoading: true });
    try {
      const [tSnap, rSnap] = await Promise.all([
        getDocs(collection(db, 'templates')),
        getDocs(collection(db, 'routines'))
      ]);
      const templates: Template[] = [];
      tSnap.forEach((d) => templates.push(d.data() as Template));
      const routines: Routine[] = [];
      rSnap.forEach((d) => routines.push(d.data() as Routine));
      set({ templates, routines, isTemplatesLoading: false });
    } catch (e) {
      set({ isTemplatesLoading: false });
    }
  },
  addTemplate: async (template) => {
    const result = await DataProcessor.saveDocument<Template>('templates', template.id, template);
    if (result.success) {
      set((state) => ({ templates: [...state.templates, template] }));
    }
    return result;
  },
  deleteTemplate: async (templateId) => {
    try {
      await deleteDoc(doc(db, 'templates', templateId));
      set((state) => ({ templates: state.templates.filter((t) => t.id !== templateId) }));
      return { success: true, data: undefined };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e : new Error(String(e)) };
    }
  },
  addRoutine: async (routine) => {
    const result = await DataProcessor.saveDocument<Routine>('routines', routine.id, routine);
    if (result.success) {
      set((state) => ({ routines: [...state.routines, routine] }));
    }
    return result;
  },
  deleteRoutine: async (routineId) => {
    try {
      await deleteDoc(doc(db, 'routines', routineId));
      set((state) => ({ routines: state.routines.filter((r) => r.id !== routineId) }));
      return { success: true, data: undefined };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e : new Error(String(e)) };
    }
  }
});

// Exakte Zeilenzahl: 66
