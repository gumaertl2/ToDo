// 2026-04-15 19:40 - FEATURE: Echtzeit-Sync (onSnapshot) für Vorlagen implementiert
// 2026-04-24 22:00 - BUGFIX: Filter erweitert - erlaubt nun beliebige ItemTypes (Aufgaben etc.) in der Vorlagen-Liste via isTemplate Flag
// 2026-05-12 12:05 - BUGFIX: Originale Funktionen (fetchTemplatesAndRoutines, deleteAgendaItem) wiederhergestellt, saveItemAsTemplateWithChildren sicher hinzugefügt.
// src/store/slices/createTemplateSlice.ts
import type { StateCreator } from 'zustand';
import type { AgendaItem } from '../../core/types/models';
import type { Result } from '../../core/types/shared';
// CHIRURGISCHER EINGRIFF: 'or' Operator für flexible Vorlagen-Abfrage
import { collection, onSnapshot, doc, deleteDoc, query, where, or, writeBatch } from 'firebase/firestore';
import { db } from '../../services/firebase';

export interface TemplateSlice {
  templates: AgendaItem[];
  isTemplatesLoading: boolean;
  unsubTemplates: (() => void) | null;
  fetchTemplatesAndRoutines: () => Promise<void>;
  deleteAgendaItem: (id: string) => Promise<Result<void>>;
  saveItemAsTemplateWithChildren: (parentItem: AgendaItem, children: AgendaItem[]) => Promise<Result<void>>;
}

export const createTemplateSlice: StateCreator<TemplateSlice, [], [], TemplateSlice> = (set, get) => ({
  templates: [],
  isTemplatesLoading: false,
  unsubTemplates: null,

  fetchTemplatesAndRoutines: async () => {
    if (get().unsubTemplates) get().unsubTemplates!();
    set({ isTemplatesLoading: true });
    
    // CHIRURGISCHER EINGRIFF: Lädt alte Typ-'VORLAGE' Items ODER neue Items mit 'isTemplate: true'
    const q = query(
      collection(db, 'agenda_items'), 
      or(
        where('type', '==', 'VORLAGE'),
        where('isTemplate', '==', true)
      )
    );

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
  },

  saveItemAsTemplateWithChildren: async (parentItem, children) => {
    try {
      const batch = writeBatch(db);
      const newParentId = doc(collection(db, 'agenda_items')).id;
      const baseTime = Date.now();

      const parentTemplate: Partial<AgendaItem> = {
        ...parentItem,
        id: newParentId,
        type: 'VORLAGE',
        isTemplate: true,
        eventId: undefined, 
        createdAt: baseTime,
        protocolIndex: 0,
        isSubItem: false,
        parentItemId: null as any
      };
      
      // Bereinige undefined Felder
      Object.keys(parentTemplate).forEach(key => {
        if ((parentTemplate as any)[key] === undefined) delete (parentTemplate as any)[key];
      });

      const parentRef = doc(db, 'agenda_items', newParentId);
      batch.set(parentRef, parentTemplate);

      // Kinder nach ihrem bisherigen protocolIndex sortieren, um die Reihenfolge beizubehalten
      const sortedChildren = [...children].sort((a,b) => (a.protocolIndex ?? 0) - (b.protocolIndex ?? 0));

      sortedChildren.forEach((child, index) => {
        const newChildId = doc(collection(db, 'agenda_items')).id;
        const childTemplate: Partial<AgendaItem> = {
          ...child,
          id: newChildId,
          type: 'VORLAGE',
          isTemplate: true,
          eventId: undefined,
          createdAt: baseTime + 100 + index,
          protocolIndex: index + 1,
          isSubItem: true,
          parentItemId: newParentId
        };

        Object.keys(childTemplate).forEach(key => {
          if ((childTemplate as any)[key] === undefined) delete (childTemplate as any)[key];
        });

        const childRef = doc(db, 'agenda_items', newChildId);
        batch.set(childRef, childTemplate);
      });

      await batch.commit();
      return { success: true, data: undefined };
    } catch (e: any) {
      return { success: false, error: new Error(e.message) };
    }
  }
});
// --- END OF FILE 108 Zeilen ---