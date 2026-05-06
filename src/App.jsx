import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ConfirmationProvider } from './context/ConfirmationContext';

import ErrorBoundary from './components/ErrorBoundary';
import PageLoader from './components/PageLoader';

// ── Páginas públicas (eager — punto de entrada, poco peso) ────────────
import LoginPage from './LoginPage';
import { RegisterPage } from './RegisterPage';
import ProtectedRoute, { UnauthorizedPage } from './ProtectedRoute';

// ── Layout (eager — estructura base) ──────────────────────────────────
import { DashboardLayout } from './DashboardLayout';

// ── Páginas del dashboard (lazy — code splitting por ruta) ────────────
const DashboardHome     = React.lazy(() => import('./pages/DashboardHome'));
const MembersPage       = React.lazy(() => import('./pages/MembersPage'));
const EnrollmentsPage   = React.lazy(() => import('./pages/EnrollmentsPage'));
const StudentsPage      = React.lazy(() => import('./pages/StudentsPage'));
const UsersPage         = React.lazy(() => import('./pages/UsersPage'));
const FinancesPage      = React.lazy(() => import('./pages/FinancesPage'));
const ActivityPage      = React.lazy(() => import('./pages/ActivityPage'));
const LeadersPage       = React.lazy(() => import('./pages/LeadersPage'));
const CellGroupsPage    = React.lazy(() => import('./pages/CellGroupsPage'));
const CellAttendancePage= React.lazy(() => import('./pages/CellAttendancePage.jsx'));
const ChurchFinancePage = React.lazy(() => import('./pages/ChurchFinancePage.jsx'));
const CounselingPage    = React.lazy(() => import('./pages/CounselingPage.jsx'));
const ManualRaizViva    = React.lazy(() => import('./pages/ManualRaizViva.jsx'));
const LevelsConfigPage  = React.lazy(() => import('./pages/LevelsConfigPage.jsx'));
const WorshipPage       = React.lazy(() => import('./pages/WorshipPage.jsx'));
const MinisteriesPage   = React.lazy(() => import('./pages/MinisteriesPage.jsx'));
const G12DashboardPage  = React.lazy(() => import('./pages/G12DashboardPage'));

function App() {
  return (
    <BrowserRouter
      future={{
        v7_relativeSplatPath: true,
        v7_startTransition: true,
      }}
    >
      <AuthProvider>
        <ConfirmationProvider>
          <ErrorBoundary>
            <Routes>

              {/* ========== RUTAS PÚBLICAS (eager) ========== */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/unauthorized" element={<UnauthorizedPage />} />

              {/* ========== DASHBOARD PROTEGIDO ========== */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute element={<DashboardLayout />} />
                }
              >
                <Route index element={
                  <Suspense fallback={<PageLoader />}>
                    <DashboardHome />
                  </Suspense>
                } />

                <Route path="members" element={
                  <Suspense fallback={<PageLoader />}>
                    <ProtectedRoute element={<MembersPage />} />
                  </Suspense>
                } />

                <Route path="enrollments" element={
                  <Suspense fallback={<PageLoader />}>
                    <ProtectedRoute
                      element={<EnrollmentsPage />}
                      requiredRoles={['ROLE_PASTORES', 'ROLE_ECONOMICO', 'ROLE_CONEXION', 'ROLE_CIMIENTO', 'ROLE_ESENCIA', 'ROLE_DESPLIEGUE', 'ROLE_PROFESORES']}
                    />
                  </Suspense>
                } />

                <Route path="students" element={
                  <Suspense fallback={<PageLoader />}>
                    <ProtectedRoute
                      element={<StudentsPage />}
                      requiredRoles={['ROLE_PASTORES', 'ROLE_CONEXION', 'ROLE_CIMIENTO', 'ROLE_ESENCIA', 'ROLE_DESPLIEGUE']}
                    />
                  </Suspense>
                } />

                <Route path="leadership" element={
                  <Suspense fallback={<PageLoader />}>
                    <ProtectedRoute
                      element={<LeadersPage />}
                      requiredRoles={['ROLE_PASTORES', 'ROLE_CONEXION', 'ROLE_CIMIENTO', 'ROLE_ESENCIA','ROLE_DESPLIEGUE']}
                    />
                  </Suspense>
                } />

                <Route path="cellgroups" element={
                  <Suspense fallback={<PageLoader />}>
                    <ProtectedRoute
                      element={<CellGroupsPage />}
                      requiredRoles={['ROLE_PASTORES', 'ROLE_CONEXION','ROLE_DESPLIEGUE']}
                    />
                  </Suspense>
                } />

                <Route path="cellgroups-atendance" element={
                  <Suspense fallback={<PageLoader />}>
                    <ProtectedRoute
                      element={<CellAttendancePage />}
                      requiredRoles={['ROLE_PASTORES', 'ROLE_CONEXION', 'ROLE_LIDER']}
                    />
                  </Suspense>
                } />

                <Route path="worshipPage" element={
                  <Suspense fallback={<PageLoader />}>
                    <ProtectedRoute
                      element={<WorshipPage />}
                      requiredRoles={['ROLE_PASTORES', 'ROLE_ALABANZA']}
                    />
                  </Suspense>
                } />

                <Route path="ministeriesPage" element={
                  <Suspense fallback={<PageLoader />}>
                    <ProtectedRoute
                      element={<MinisteriesPage />}
                      requiredRoles={['ROLE_PASTORES', 'ROLE_DESPLIEGUE', 'ROLE_PROTOCOLO', 'ROLE_MINISTERIOS']}
                    />
                  </Suspense>
                } />

                <Route path="Counseling" element={
                  <Suspense fallback={<PageLoader />}>
                    <ProtectedRoute
                      element={<CounselingPage />}
                      requiredRoles={['ROLE_PASTORES']}
                    />
                  </Suspense>
                } />

                <Route path="finances" element={
                  <Suspense fallback={<PageLoader />}>
                    <ProtectedRoute
                      element={<FinancesPage />}
                      requiredRoles={['ROLE_PASTORES', 'ROLE_ECONOMICO']}
                    />
                  </Suspense>
                } />

                <Route path="financesChurch" element={
                  <Suspense fallback={<PageLoader />}>
                    <ProtectedRoute
                      element={<ChurchFinancePage />}
                      requiredRoles={['ROLE_PASTORES']}
                    />
                  </Suspense>
                } />

                <Route path="Activity" element={
                  <Suspense fallback={<PageLoader />}>
                    <ProtectedRoute
                      element={<ActivityPage />}
                      requiredRoles={['ROLE_PASTORES', 'ROLE_ECONOMICO', 'ROLE_CONEXION', 'ROLE_CIMIENTO', 'ROLE_ESENCIA', 'ROLE_DESPLIEGUE']}
                    />
                  </Suspense>
                } />

                <Route path="LevelsConfig" element={
                  <Suspense fallback={<PageLoader />}>
                    <ProtectedRoute
                      element={<LevelsConfigPage />}
                      requiredRoles={['ROLE_PASTORES']}
                    />
                  </Suspense>
                } />

                <Route path="ManualRaizViva" element={
                  <Suspense fallback={<PageLoader />}>
                    <ProtectedRoute
                      element={<ManualRaizViva />}
                      requiredRoles={['ROLE_PASTORES', 'ROLE_ECONOMICO', 'ROLE_CONEXION', 'ROLE_CIMIENTO', 'ROLE_ESENCIA', 'ROLE_DESPLIEGUE', 'ROLE_LIDER']}
                    />
                  </Suspense>
                } />

                <Route path="g12" element={
                  <Suspense fallback={<PageLoader />}>
                    <ProtectedRoute
                      element={<G12DashboardPage />}
                      requiredRoles={['ROLE_PASTORES']}
                    />
                  </Suspense>
                } />

                <Route path="users" element={
                  <Suspense fallback={<PageLoader />}>
                    <ProtectedRoute
                      element={<UsersPage />}
                      requiredRoles={['ROLE_PASTORES']}
                      requireAll={true}
                    />
                  </Suspense>
                } />
              </Route>

              {/* ========== REDIRECCIONES ========== */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </ErrorBoundary>
        </ConfirmationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
