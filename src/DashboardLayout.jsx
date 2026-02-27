// 📊 DashboardLayout.jsx v2 - Refactorizado con CSS Responsive Profesional
// Usa clases CSS en lugar de estilos inline para mejor mantenibilidad y performance

import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import './css/DashboardLayout.css'; // Importar CSS
import DashboardTopbar from './components/DashboardTopbar';


export const DashboardLayout = () => {
  // ========== DARK MODE AUTOMÁTICO ==========
  const [, setIsDarkMode] = useState(false);

  useEffect(() => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const savedMode = localStorage.getItem('darkMode');
    const htmlHasDarkClass = document.documentElement.classList.contains('dark-mode');

    setIsDarkMode(
      savedMode === 'true' || htmlHasDarkClass || prefersDark
    );

    const observer = new MutationObserver(() => {
      setIsDarkMode(document.documentElement.classList.contains('dark-mode'));
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => {
      if (localStorage.getItem('darkMode') === null) {
        setIsDarkMode(e.matches);
      }
    };
    mediaQuery.addEventListener('change', handleChange);

    return () => {
      observer.disconnect();
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  // ========== STATE MANAGEMENT ==========
  const { user, logout, hasRole, hasAnyRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // ========== HANDLERS ==========
  const handleLogout = () => {
    if (window.confirm('¿Estás seguro de que quieres cerrar sesión?')) {
      logout();
      navigate('/login');
    }
  };

  const handleNavClick = (path) => {
    navigate(path);
  };

  // ========== MENU CONFIG ==========
  // Determinar menú según roles
  const menuItems = [
    {
      label: 'Inicio',
      path: '/dashboard',
      icon: '🏠',
      visible: true,
    },
    {
      label: 'Membresia',
      path: '/dashboard/members',
      icon: '👥',
      visible: true,
    },
    {
      label: 'Formaciones',
      path: '/dashboard/enrollments',
      icon: '🌾',
      visible: hasAnyRole(['ROLE_PASTORES', 'ROLE_AREAS', 'ROLE_PROFESORES', 'ROLE_GANANDO']),
    },
    {
      label: 'Estudiantes',
      path: '/dashboard/students',
      icon: '🎓',
      visible: hasAnyRole(['ROLE_PASTORES', 'ROLE_AREAS', 'ROLE_GANANDO']),
    },
    {
      label: 'Servidores',
      path: '/dashboard/leadership',
      icon: '🦺',
      visible: hasAnyRole(['ROLE_PASTORES', 'ROLE_AREAS']),
    },
    {
      label: 'Altares de vida',
      path: '/dashboard/cellgroups',
      icon: '🏘️',
      visible: hasAnyRole(['ROLE_PASTORES', 'ROLE_AREAS']),
    },
    {
      label: 'Asistencias',
      path: '/dashboard/cellgroups-atendance',
      icon: '✅',
      visible: hasAnyRole(['ROLE_PASTORES', 'ROLE_LIDER']),
    },
    {
      label: 'Finanzas',
      path: '/dashboard/finances',
      icon: '🏦',
      visible: hasAnyRole(['ROLE_PASTORES', 'ROLE_ECONOMICO']),
    },
    {
      label: 'Actividades',
      path: '/dashboard/activity',
      icon: '📅',
      visible: hasAnyRole(['ROLE_PASTORES', 'ROLE_ECONOMICO', 'ROLE_CONEXION', 'ROLE_CIMIENTO', 'ROLE_ESENCIA', 'ROLE_DESPLIEGUE']),
    },
    {
      label: 'Usuarios',
      path: '/dashboard/users',
      icon: '👤',
      visible: hasRole('ROLE_PASTORES'),
    },
  ];

  const filteredMenu = menuItems.filter(item => item.visible);

  // ========== RENDER ==========
  return (
    <div className="dashboard-layout">
      {/* ========== SIDEBAR ========== */}
      <aside className={`dashboard-layout__sidebar ${!sidebarOpen ? 'dashboard-layout__sidebar--collapsed' : ''}`}>
        
        {/* Sidebar Header */}
        <div className="dashboard-layout__sidebar-header">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="dashboard-layout__sidebar-toggle"
            title="Toggle Sidebar"
          >
            ☰
          </button>
          {sidebarOpen && (
            <h1 className="dashboard-layout__sidebar-title">
              PastoreApp
            </h1>
          )}
        </div>

        {/* Sidebar Menu */}
        <nav className="dashboard-layout__menu">
          {filteredMenu.map(item => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => handleNavClick(item.path)}
                className={`dashboard-layout__menu-item ${isActive ? 'dashboard-layout__menu-item--active' : ''}`}
                title={!sidebarOpen ? item.label : ''}
              >
                <span className="dashboard-layout__menu-icon">{item.icon}</span>
                {sidebarOpen && (
                  <span className="dashboard-layout__menu-label">
                    {item.label}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Sidebar User Info */}
        <div className="dashboard-layout__sidebar-user">
          {sidebarOpen && (
            <div className="dashboard-layout__user-info">
              <p className="dashboard-layout__user-name">
                {user?.name}
              </p>
              <p className="dashboard-layout__user-roles">
                {user?.roles?.map(r => r.name || r).join(', ')}
              </p>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="dashboard-layout__logout-btn"
            title="Cerrar Sesión"
          >
            <span className="dashboard-layout__logout-icon">🚪</span>
            {sidebarOpen && (
              <span>Cerrar Sesión</span>
            )}
          </button>
        </div>
      </aside>

      {/* ========== MAIN CONTENT ========== */}
      <div className="dashboard-layout__main">
        
        {/* Top Bar */}
        
        <header className="dashboard-layout__topbar">
          
          <div className="dashboard-layout__topbar-left">
          <DashboardTopbar user={user} />
            <h2 className="dashboard-layout__topbar-title">
              {user?.name || 'Iglesia Raiz de David'}
            </h2>
          </div>
          <div className="dashboard-layout__topbar-welcome">
            Bienvenido, {user?.username?.split(' ')[0]}
          </div>
        </header>

        {/* Page Content */}
        <div className="dashboard-layout__content">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default DashboardLayout;