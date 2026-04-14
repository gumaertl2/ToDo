// 2026-04-14 13:30 - FIX: Route für RemindersView hinzugefügt
// src/App.tsx
import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
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
// CHIRURGISCHER EINGRIFF: Import der neuen Ansicht
import { RemindersView } from './features/Reminders/RemindersView';

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
          <Route index element={<DashboardView />} />
          <Route path="calendar" element={<CalendarView />} /> 
          <Route path="users" element={<UsersView />} />
          <Route path="events" element={<EventsView />} />
          <Route path="events/:eventId" element={<EventDetailView />} />
          <Route path="templates" element={<TemplatesView />} />
          <Route path="todos" element={<TasksView />} />
          {/* CHIRURGISCHER EINGRIFF: Neue Route */}
          <Route path="reminders" element={<RemindersView />} />
          <Route path="help" element={<HelpView />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
// Exakte Zeilenzahl: 59