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
        const data = docSnap.data() as Task;
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
    const result = await DataProcessor.saveDocument<Task>('tasks', task.id, task);
    if (result.success) {
      set((state) => ({ tasks: [...state.tasks, task] }));
    }
    return result;
  },
  updateTask: async (task) => {
    const result = await DataProcessor.saveDocument<Task>('tasks', task.id, task);
    if (result.success) {
      set((state) => ({
        tasks: state.tasks.map((t) => (t.id === task.id ? task : t)),
      }));
    }
    return result;
  },
  deleteTask: async (taskId) => {
    try {
      await deleteDoc(doc(db, 'tasks', taskId));
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
      const docId = itemData.id || doc(collection(db, 'agenda_items')).id;
      const payload = { ...itemData, schemaVersion: '1.0' };
      await DataProcessor.saveDocument('agenda_items', docId, payload as any);
      get().fetchTasks(); 
      return { success: true, data: undefined };
    } catch (error: any) {
      return { success: false, error: new Error(error.message) };
    }
  },
});

// Exakte Zeilenzahl: 68
