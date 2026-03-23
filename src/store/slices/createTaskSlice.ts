// src/store/slices/createTaskSlice.ts
import { StateCreator } from 'zustand';
import { Task } from '../../core/types/models';
import { DataProcessor } from '../../services/DataProcessor';
import { Result } from '../../core/types/shared';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../services/firebase';

export interface TaskSlice {
  tasks: Task[];
  isTasksLoading: boolean;
  fetchTasks: () => Promise<Result<Task[]>>;
  addTask: (task: Task) => Promise<Result<void>>;
  updateTask: (task: Task) => Promise<Result<void>>;
  deleteTask: (taskId: string) => Promise<Result<void>>;
}

export const createTaskSlice: StateCreator<TaskSlice, [], [], TaskSlice> = (set) => ({
  tasks: [],
  isTasksLoading: false,
  fetchTasks: async () => {
    set({ isTasksLoading: true });
    try {
      const querySnapshot = await getDocs(collection(db, 'tasks'));
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
});

// Exakte Zeilenzahl: 68
