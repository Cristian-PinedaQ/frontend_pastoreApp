// ✅ App.jsx - Configuración de rutas y providers
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';  // ✅ CORRECTO
import { ProtectedRoute, UnauthorizedPage } from './ProtectedRoute';
import { LoginPage } from './LoginPage';
import { RegisterPage } from './RegisterPage';
import { DashboardLayout } from './DashboardLayout';
import { DashboardHome } from './pages/DashboardHome';
import { MembersPage } from './pages/MembersPage';
import  EnrollmentsPage  from './pages/EnrollmentsPage';
import  StudentsPage  from './pages/StudentsPage';
import  UsersPage  from './pages/UsersPage';
import {
  LessonsPage,
  AttendancePage,
} from './pages/index';

function App() {
  return (
    <BrowserRouter
      future={{
        v7_relativeSplatPath: true,
        v7_startTransition: true
      }}
    >
      <AuthProvider>
        <Routes>
          {/* 🔓 Rutas Públicas */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/unauthorized" element={<UnauthorizedPage />} />

          {/* 🛡️ Rutas Protegidas - Dashboard */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute
                element={<DashboardLayout />}
              />
            }
          >
            <Route index element={<DashboardHome />} />

            {/* Miembros - Todos autenticados */}
            <Route
              path="members"
              element={
                <ProtectedRoute
                  element={<MembersPage />}
                />
              }
            />

            {/* Inscripciones - PASTORES, AREAS */}
            <Route
              path="enrollments"
              element={
                <ProtectedRoute
                  element={<EnrollmentsPage />}
                  requiredRoles={['ROLE_PASTORES', 'ROLE_GANANDO', 'ROLE_AREAS', 'ROLE_PROFESORES']}
                />
              }
            />

            {/* Estudiantes - PASTORES, AREAS */}
            <Route
              path="students"
              element={
                <ProtectedRoute
                  element={<StudentsPage />}
                  requiredRoles={['ROLE_PASTORES', 'ROLE_GANANDO', 'ROLE_AREAS']}
                />
              }
            />

            {/* Lecciones - PASTORES, AREAS */}
            <Route
              path="lessons"
              element={
                <ProtectedRoute
                  element={<LessonsPage />}
                  requiredRoles={['ROLE_PASTORES', 'ROLE_AREAS']}
                />
              }
            />

            {/* Asistencias - PASTORES, AREAS, PROFESORES */}
            <Route
              path="attendance"
              element={
                <ProtectedRoute
                  element={<AttendancePage />}
                  requiredRoles={['ROLE_PASTORES', 'ROLE_AREAS', 'ROLE_PROFESORES']}
                />
              }
            />

            {/* Usuarios - PASTORES solo */}
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

          {/* 🏠 Redirecciones */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
