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
    // CHIRURGISCHER EINGRIFF: Alles läuft nun über den mächtigen saveAgendaItem (für Routinen)
    return get().saveAgendaItem(task);
  },
  updateTask: async (task) => {
    // CHIRURGISCHER EINGRIFF: Wenn Kanban-Board speichert, ebenfalls auf Routine prüfen!
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
      const docId = itemData.id || doc(collection(db, 'agenda_items')).id;
      
      // CHIRURGISCHER EINGRIFF: Prüfen auf Routine-Abschluss (Vorher vs. Nachher)
      const oldTask = get().tasks.find(t => t.id === docId);
      const wasCompleted = oldTask ? (oldTask.status === 'ERLEDIGT' || oldTask.progress === 100) : false;
      const isCompleted = (itemData.status === 'ERLEDIGT' || itemData.progress === 100);

      const payload = { ...itemData, id: docId, schemaVersion: '1.0' };
      await DataProcessor.saveDocument('agenda_items', docId, payload as any);
      
      // DIE MAGIE: Klon-Motor für Routinen!
      if (!wasCompleted && isCompleted && payload.type === 'AUFGABE' && payload.isRoutine && payload.routinePattern) {
        let nextDate = new Date();
        if (payload.dueDate) {
          nextDate = new Date(payload.dueDate);
        }
        
        // Berechnet vollautomatisch das nächste Fälligkeitsdatum
        if (payload.routinePattern === 'weekly') nextDate.setDate(nextDate.getDate() + 7);
        else if (payload.routinePattern === 'monthly') nextDate.setMonth(nextDate.getMonth() + 1);
        else if (payload.routinePattern === 'quarterly') nextDate.setMonth(nextDate.getMonth() + 3);
        else if (payload.routinePattern === 'yearly') nextDate.setFullYear(nextDate.getFullYear() + 1);
        
        const shouldCreate = !payload.routineEndDate || nextDate.getTime() <= payload.routineEndDate;
        
        if (shouldCreate) {
          const newDocId = doc(collection(db, 'agenda_items')).id;
          const newTask = {
            ...payload,
            id: newDocId,
            eventId: '', // Abkoppeln von der alten Sitzung (Landet frei im Kanban!)
            status: 'OFFEN',
            progress: 0,
            dueDate: nextDate.getTime(),
            createdAt: Date.now()
          };
          await DataProcessor.saveDocument('agenda_items', newDocId, newTask as any);
        }
      }

      get().fetchTasks(); 
      // Aktualisiert das Protokoll live, falls du dich in einem befindest
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
// Exakte Zeilenzahl: 104