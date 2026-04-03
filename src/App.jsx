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
import ActivityPage from './pages/ActivityPage';
import LeadersPage from './pages/LeadersPage';
import CellGroupsPage from './pages/CellGroupsPage';
import CellAttendancePage from './pages/CellAttendancePage.jsx';
import ChurchFinancePage from './pages/ChurchFinancePage.jsx';
import CounselingPage from './pages/CounselingPage.jsx';
import ManualRaizViva from './pages/ManualRaizViva.jsx';
import LevelsConfigPage from './pages/LevelsConfigPage.jsx';
import WorshipPage from './pages/WorshipPage.jsx';

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
                  requiredRoles={['ROLE_PASTORES', 'ROLE_ECONOMICO', 'ROLE_CONEXION', 'ROLE_CIMIENTO', 'ROLE_ESENCIA', 'ROLE_DESPLIEGUE', 'ROLE_PROFESORES']}
                />
              }
            />

            {/* Estudiantes */}
            <Route
              path="students"
              element={
                <ProtectedRoute
                  element={<StudentsPage />}
                  requiredRoles={['ROLE_PASTORES', 'ROLE_CONEXION', 'ROLE_CIMIENTO', 'ROLE_ESENCIA', 'ROLE_DESPLIEGUE']}
                />
              }
            />
            {/* Liderazgo */}
            <Route
              path="leadership"
              element={
                <ProtectedRoute
                  element={<LeadersPage />}
                  requiredRoles={['ROLE_PASTORES', 'ROLE_CONEXION', 'ROLE_CIMIENTO', 'ROLE_ESENCIA','ROLE_DESPLIEGUE']}
                />
              }
            />

            {/* celulas */}
            <Route
              path="cellgroups"
              element={
                <ProtectedRoute
                  element={<CellGroupsPage />}
                  requiredRoles={['ROLE_PASTORES', 'ROLE_CONEXION','ROLE_DESPLIEGUE']}
                />
              }
            />

            <Route
              path="cellgroups-atendance"
              element={
                <ProtectedRoute
                  element={<CellAttendancePage />}
                  requiredRoles={['ROLE_PASTORES', 'ROLE_CONEXION', 'ROLE_LIDER']}
                />
              }
            />

            {/* ALABANZA */}

            <Route
              path="worshipPage"
              element={
                <ProtectedRoute
                  element={<WorshipPage />}
                  requiredRoles={['ROLE_PASTORES', 'ROLE_ALABANZA']}
                />
              }
            />

            {/* Concejeria */}
            <Route
              path="Counseling"
              element={
                <ProtectedRoute
                  element={<CounselingPage />}
                  requiredRoles={['ROLE_PASTORES']}
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

            <Route
              path="financesChurch"
              element={
                <ProtectedRoute
                  element={<ChurchFinancePage />}
                  requiredRoles={['ROLE_PASTORES']}
                />
              }
            />

            {/* Finanzas */}
            <Route
              path="Activity"
              element={
                <ProtectedRoute
                  element={<ActivityPage />}
                  requiredRoles={['ROLE_PASTORES', 'ROLE_ECONOMICO', 'ROLE_CONEXION', 'ROLE_CIMIENTO', 'ROLE_ESENCIA', 'ROLE_DESPLIEGUE']}
                />
              }
            />

            {/* Configuracion niveles y lecciones */}
            <Route
              path="LevelsConfig"
              element={
                <ProtectedRoute
                  element={<LevelsConfigPage />}
                  requiredRoles={['ROLE_PASTORES']}
                />
              }
            />

            {/* ManualRaizViva */}
            <Route
              path="ManualRaizViva"
              element={
                <ProtectedRoute
                  element={<ManualRaizViva />}
                  requiredRoles={['ROLE_PASTORES', 'ROLE_ECONOMICO', 'ROLE_CONEXION', 'ROLE_CIMIENTO', 'ROLE_ESENCIA', 'ROLE_DESPLIEGUE', 'ROLE_LIDER']}
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