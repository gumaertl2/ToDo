// src/store/slices/createTaskSlice.ts
import type { StateCreator } from 'zustand';
import type { Task, AgendaItem } from '../../core/types/models';
import { DataProcessor } from '../../services/DataProcessor';
import type { Result } from '../../core/types/shared';
import { collection, getDocs, deleteDoc, doc, query, where } from 'firebase/firestore';
import { db } from '../../services/firebase';

export interface TaskSlice {
  tasks: Task[];
  isTasksLoading: boolean;
  fetchTasks: () => Promise<Result<Task[]>>;
  addTask: (task: Task) => Promise<Result<void>>;
  updateTask: (task: Task) => Promise<Result<void>>;
  deleteTask: (taskId: string) => Promise<Result<void>>;
  saveAgendaItem: (itemData: Partial<AgendaItem>) => Promise<Result<void>>;
}

export const createTaskSlice: StateCreator<TaskSlice, [], [], TaskSlice> = (set, get) => ({
  tasks: [],
  isTasksLoading: false,
  fetchTasks: async () => {
    set({ isTasksLoading: true });
    try {
      const q = query(collection(db, 'agenda_items'), where('type', '==', 'AUFGABE'));
      const querySnapshot = await getDocs(q);
      const tasks: Task[] = [];
      querySnapshot.forEach((docSnap) => {
        const data = { ...docSnap.data(), id: docSnap.id } as Task;
        if (data.schemaVersion === '1.0') {
          tasks.push(data);
        }
      });
      set({ tasks, isTasksLoading: false });
      return { success: true, data: tasks };
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
      try { await deleteDoc(doc(db, 'tasks', taskId)); } catch (e) {} // Legacy Cleanup
      try { await deleteDoc(doc(db, 'agenda_items', taskId)); } catch (e) {}
      
      set((state) => ({
        tasks: state.tasks.filter((t) => t.id !== taskId),
      }));
      return { success: true, data: undefined };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e : new Error(String(e)) };
    }
  },
  saveAgendaItem: async (itemData) => {
    try {
      // CHIRURGISCHER EINGRIFF: Automatischer Fortschritt bei Status-Wechsel
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
      
      // CHIRURGISCHER EINGRIFF: Der fehlerhafte Sofort-Klon-Motor wurde hier restlos entfernt.
      // Routinen werden jetzt AUSSCHLIESSLICH beim Beenden einer Sitzung in EventDetailView mitgeführt!

      get().fetchTasks(); 
      if (itemData.eventId) {
        const store = get() as any;
        if (store.fetchEventAgenda) store.fetchEventAgenda(itemData.eventId);
      }

      return { success: true, data: undefined };
    } catch (error: any) {
      return { success: false, error: new Error(error.message) };
    }
  },
});
// Exakte Zeilenzahl: 91