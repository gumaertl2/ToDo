// 2026-04-15 19:40 - FEATURE: Echtzeit-Sync (onSnapshot) für Aufgaben implementiert
// src/store/slices/createTaskSlice.ts
import type { StateCreator } from 'zustand';
import type { Task, AgendaItem } from '../../core/types/models';
import { DataProcessor } from '../../services/DataProcessor';
import type { Result } from '../../core/types/shared';
import { collection, onSnapshot, deleteDoc, doc, query, where } from 'firebase/firestore';
import { db } from '../../services/firebase';

export interface TaskSlice {
  tasks: Task[];
  isTasksLoading: boolean;
  unsubTasks: (() => void) | null;
  fetchTasks: () => Promise<Result<Task[]>>;
  addTask: (task: Task) => Promise<Result<void>>;
  updateTask: (task: Task) => Promise<Result<void>>;
  deleteTask: (taskId: string) => Promise<Result<void>>;
  saveAgendaItem: (itemData: Partial<AgendaItem>) => Promise<Result<void>>;
}

export const createTaskSlice: StateCreator<TaskSlice, [], [], TaskSlice> = (set, get) => ({
  tasks: [],
  isTasksLoading: false,
  unsubTasks: null,
  fetchTasks: async () => {
    const currentUnsub = get().unsubTasks;
    if (currentUnsub) currentUnsub();

    set({ isTasksLoading: true });
    try {
      const q = query(collection(db, 'agenda_items'), where('type', '==', 'AUFGABE'));
      const unsub = onSnapshot(q, (querySnapshot) => {
        const tasks: Task[] = [];
        querySnapshot.forEach((docSnap) => {
          const data = { ...docSnap.data(), id: docSnap.id } as Task;
          if (data.schemaVersion === '1.0') {
            tasks.push(data);
          }
        });
        set({ tasks, isTasksLoading: false });
      }, (error) => {
        console.error("Fehler beim Live-Sync der Tasks:", error);
        set({ isTasksLoading: false });
      });
      
      set({ unsubTasks: unsub });
      return { success: true, data: [] };
    } catch (e) {
      set({ isTasksLoading: false });
      return { success: false, error: e instanceof Error ? e : new Error(String(e)) };
    }
  },
  addTask: async (task) => {
    return get().saveAgendaItem(task);
  },
  updateTask: async (task) => {
    return get().saveAgendaItem(task);
  },
  deleteTask: async (taskId) => {
    try {
      try { await deleteDoc(doc(db, 'tasks', taskId)); } catch (e) {} 
      try { await deleteDoc(doc(db, 'agenda_items', taskId)); } catch (e) {}
      // CHIRURGISCHER EINGRIFF: Kein lokales set() mehr nötig, onSnapshot triggert sofort
      return { success: true, data: undefined };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e : new Error(String(e)) };
    }
  },
  saveAgendaItem: async (itemData) => {
    try {
      const existingTask = get().tasks.find(t => t.id === itemData.id);
      const updatedData = { ...itemData };
      
      if (updatedData.status && (!existingTask || existingTask.status !== updatedData.status)) {
        if (updatedData.status === 'OFFEN') updatedData.progress = 0;
        else if (updatedData.status === 'IN_ARBEIT') updatedData.progress = 25;
        else if (updatedData.status === 'ERLEDIGT') updatedData.progress = 100;
      }

      const docId = updatedData.id || doc(collection(db, 'agenda_items')).id;
      const payload = { ...updatedData, id: docId, schemaVersion: '1.0' };
      await DataProcessor.saveDocument('agenda_items', docId, payload as any);
      
      // CHIRURGISCHER EINGRIFF: Firebase lokaler Cache reagiert sofort, kein fetchTasks() nötig
      return { success: true, data: undefined };
    } catch (error: any) {
      return { success: false, error: new Error(error.message) };
    }
  },
});
// --- END OF FILE ---