// src/App.tsx
import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthGuard } from './features/Auth/AuthGuard';
import { LoginView } from './features/Auth/LoginView';
import { AppLayout } from './features/Layout/AppLayout';
import { useClubStore } from './store/useClubStore';

const UsersPlaceholder = () => <div className="bg-white p-6 rounded-lg shadow"><h2 className="text-xl font-bold">User & Gruppen Modul</h2></div>;
const EventsPlaceholder = () => <div className="bg-white p-6 rounded-lg shadow"><h2 className="text-xl font-bold">Events & Sitzungen Modul</h2></div>;
const TemplatesPlaceholder = () => <div className="bg-white p-6 rounded-lg shadow"><h2 className="text-xl font-bold">Vorlagen & Routinen Modul</h2></div>;
const TodosPlaceholder = () => <div className="bg-white p-6 rounded-lg shadow"><h2 className="text-xl font-bold">Meine ToDos (Kanban) Modul</h2></div>;

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
          <Route index element={<Navigate to="/todos" replace />} />
          <Route path="users" element={<UsersPlaceholder />} />
          <Route path="events" element={<EventsPlaceholder />} />
          <Route path="templates" element={<TemplatesPlaceholder />} />
          <Route path="todos" element={<TodosPlaceholder />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

// Exakte Zeilenzahl: 45
