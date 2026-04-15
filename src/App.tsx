// 2026-04-15 19:15 - FEATURE: Kalender als neue Standard-Startseite gesetzt
// src/App.tsx
import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthGuard } from './features/Auth/AuthGuard';
import { LoginView } from './features/Auth/LoginView';
import { AppLayout } from './features/Layout/AppLayout';
import { useClubStore } from './store/useClubStore';

import { DashboardView } from './features/Dashboard/DashboardView';
import { CalendarView } from './features/Events/CalendarView'; 
import { PublicCalendarEmbed } from './features/Events/PublicCalendarEmbed';
import { EventsView } from './features/Events/EventsView';
import { EventDetailView } from './features/Events/EventDetailView';
import { TasksView } from './features/Tasks/TasksView';
import { TemplatesView } from './features/Templates/TemplatesView';
import { UsersView } from './features/Users/UsersView';
import { HelpView } from './features/Help/HelpView';
import { RemindersView } from './features/Reminders/RemindersView';
import { ReportsView } from './features/Reports/ReportsView';

export default function App() {
  const { initializeAuth } = useClubStore();

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginView />} />
        
        <Route path="/embed/kalender" element={<PublicCalendarEmbed />} />
        
        <Route
          path="/"
          element={
            <AuthGuard>
              <AppLayout />
            </AuthGuard>
          }
        >
          {/* CHIRURGISCHER EINGRIFF: Umleitung auf Kalender als Default */}
          <Route index element={<Navigate to="/calendar" replace />} />
          <Route path="dashboard" element={<DashboardView />} />
          <Route path="calendar" element={<CalendarView />} /> 
          <Route path="users" element={<UsersView />} />
          <Route path="events" element={<EventsView />} />
          <Route path="events/:eventId" element={<EventDetailView />} />
          <Route path="templates" element={<TemplatesView />} />
          <Route path="todos" element={<TasksView />} />
          <Route path="reports" element={<ReportsView />} />
          <Route path="reminders" element={<RemindersView />} />
          <Route path="help" element={<HelpView />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
// --- END OF FILE ---