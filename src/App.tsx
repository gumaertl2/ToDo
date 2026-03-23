// src/App.tsx
import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthGuard } from './features/Auth/AuthGuard';
import { LoginView } from './features/Auth/LoginView';
import { AppLayout } from './features/Layout/AppLayout';
import { useClubStore } from './store/useClubStore';

import { DashboardView } from './features/Dashboard/DashboardView';
import { EventsView } from './features/Events/EventsView';
import { TasksView } from './features/Tasks/TasksView';
import { TemplatesView } from './features/Templates/TemplatesView';
import { UsersView } from './features/Users/UsersView';

export default function App() {
  const { initializeAuth } = useClubStore();

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginView />} />
        
        <Route
          path="/"
          element={
            <AuthGuard>
              <AppLayout />
            </AuthGuard>
          }
        >
          <Route index element={<DashboardView />} />
          <Route path="events" element={<EventsView />} />
          <Route path="tasks" element={<TasksView />} />
          <Route path="templates" element={<TemplatesView />} />
          <Route path="users" element={<UsersView />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

// Exakte Zeilenzahl: 42
