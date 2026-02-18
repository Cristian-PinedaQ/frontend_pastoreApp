// ✅ App.jsx - VERSIÓN DEFINITIVA PARA TU PROYECTO
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';

// ✅ CORRECCIÓN 1: RegisterPage es NAMED EXPORT (con {})
import LoginPage from './LoginPage';
import { RegisterPage } from './RegisterPage';  // ← Con {}

// ✅ ProtectedRoute con UnauthorizedPage
import ProtectedRoute, { UnauthorizedPage } from './ProtectedRoute';

// Layouts
import { DashboardLayout } from './DashboardLayout';

// Páginas del dashboard
import { DashboardHome } from './pages/DashboardHome';
import { MembersPage } from './pages/MembersPage';
import EnrollmentsPage from './pages/EnrollmentsPage';
import StudentsPage from './pages/StudentsPage';
import UsersPage from './pages/UsersPage';
import FinancesPage from './pages/FinancesPage';
import { LessonsPage, AttendancePage } from './pages/index';
import ActivityPage from './pages/ActivityPage';
import LeadersPage from './pages/LeadersPage';
import CellGroupsPage from './pages/CellGroupsPage';

function App() {
  return (
    <BrowserRouter
      future={{
        v7_relativeSplatPath: true,
        v7_startTransition: true,
      }}
    >
      <AuthProvider>
        <Routes>
          {/* ========== RUTAS PÚBLICAS ========== */}

          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />  {/* ← RegisterPage */}
          <Route path="/unauthorized" element={<UnauthorizedPage />} />

          {/* ========== DASHBOARD PROTEGIDO ========== */}

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute element={<DashboardLayout />} />
            }
          >
            {/* Dashboard Home */}
            <Route index element={<DashboardHome />} />

            {/* Miembros */}
            <Route
              path="members"
              element={
                <ProtectedRoute element={<MembersPage />} />
              }
            />

            {/* Inscripciones */}
            <Route
              path="enrollments"
              element={
                <ProtectedRoute
                  element={<EnrollmentsPage />}
                  requiredRoles={[
                    'ROLE_PASTORES',
                    'ROLE_GANANDO',
                    'ROLE_AREAS',
                    'ROLE_PROFESORES',
                  ]}
                />
              }
            />

            {/* Estudiantes */}
            <Route
              path="students"
              element={
                <ProtectedRoute
                  element={<StudentsPage />}
                  requiredRoles={[
                    'ROLE_PASTORES',
                    'ROLE_GANANDO',
                    'ROLE_AREAS',
                  ]}
                />
              }
            />

            {/* Lecciones */}
            <Route
              path="lessons"
              element={
                <ProtectedRoute
                  element={<LessonsPage />}
                  requiredRoles={['ROLE_PASTORES', 'ROLE_AREAS']}
                />
              }
            />

            {/* Asistencias */}
            <Route
              path="attendance"
              element={
                <ProtectedRoute
                  element={<AttendancePage />}
                  requiredRoles={[
                    'ROLE_PASTORES',
                    'ROLE_AREAS',
                    'ROLE_PROFESORES',
                  ]}
                />
              }
            />

            {/* Liderazgo */}
            <Route
              path="leadership"
              element={
                <ProtectedRoute
                  element={<LeadersPage />}
                  requiredRoles={['ROLE_PASTORES', 'ROLE_AREAS']}
                />
              }
            />

            {/* celulas */}
            <Route
              path="cellgroups"
              element={
                <ProtectedRoute
                  element={<CellGroupsPage />}
                  requiredRoles={['ROLE_PASTORES', 'ROLE_AREAS']}
                />
              }
            />

            {/* Finanzas */}
            <Route
              path="finances"
              element={
                <ProtectedRoute
                  element={<FinancesPage />}
                  requiredRoles={['ROLE_PASTORES', 'ROLE_ECONOMICO']}
                />
              }
            />

            {/* Finanzas */}
            <Route
              path="Activity"
              element={
                <ProtectedRoute
                  element={<ActivityPage />}
                  requiredRoles={['ROLE_PASTORES', 'ROLE_ECONOMICO']}
                />
              }
            />

            {/* Usuarios */}
            <Route
              path="users"
              element={
                <ProtectedRoute
                  element={<UsersPage />}
                  requiredRoles={['ROLE_PASTORES']}
                  requireAll={true}
                />
              }
            />
          </Route>

          {/* ========== REDIRECCIONES ========== */}

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;