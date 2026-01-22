// 📊 DashboardLayout.jsx - Layout principal CON DARK MODE
// Sidebar y navegación legibles en ambos modos
// ✅ COMPLETAMENTE LEGIBLE EN MODO OSCURO

import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

export const DashboardLayout = () => {
  // ========== DARK MODE ==========
  const [isDarkMode, setIsDarkMode] = useState(false);

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

  // Tema
  const theme = {
    // Sidebar
    sidebarBg: isDarkMode ? '#0f172a' : '#1f2937',
    sidebarBorder: isDarkMode ? '#334155' : '#374151',
    sidebarText: isDarkMode ? '#f1f5f9' : '#ffffff',
    sidebarHover: isDarkMode ? '#1e293b' : '#374151',
    sidebarActive: isDarkMode ? '#1e40af' : '#2563eb',

    // Top Bar
    topBarBg: isDarkMode ? '#1e293b' : '#ffffff',
    topBarText: isDarkMode ? '#f1f5f9' : '#1f2937',
    topBarBorder: isDarkMode ? '#334155' : '#e5e7eb',

    // Contenido
    contentBg: isDarkMode ? '#0f172a' : '#f3f4f6',
    contentText: isDarkMode ? '#f1f5f9' : '#111827',
    contentTextSecondary: isDarkMode ? '#cbd5e1' : '#6b7280',

    // Elementos
    textSecondary: isDarkMode ? '#cbd5e1' : '#9ca3af',
    logoutBg: '#dc2626',
    logoutBgHover: '#b91c1c',
  };

  const { user, logout, hasRole, hasAnyRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleLogout = () => {
    if (window.confirm('¿Estás seguro de que quieres cerrar sesión?')) {
      logout();
      navigate('/login');
    }
  };

  // Determinar menú según roles
  const menuItems = [
    {
      label: 'Inicio',
      path: '/dashboard',
      icon: '🏠',
      visible: true,
    },
    {
      label: 'Miembros',
      path: '/dashboard/members',
      icon: '👥',
      visible: true,
    },
    {
      label: 'Formación',
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
      label: 'LIDERAZGO',
      path: '/dashboard/lessons',
      icon: '🦺',
      visible: hasAnyRole(['ROLE_PASTORES', 'ROLE_AREAS']),
    },
    {
      label: 'CBI',
      path: '/dashboard/attendance',
      icon: '🏘️',
      visible: hasAnyRole(['ROLE_PASTORES', 'ROLE_AREAS']),
    },
    {
      label: 'Finanzas',
      path: '/dashboard/finances',
      icon: '🏦',
      visible: hasAnyRole(['ROLE_PASTORES', 'ROLE_ECONOMICO']),
    },
    {
      label: 'Usuarios',
      path: '/dashboard/users',
      icon: '👤',
      visible: hasRole('ROLE_PASTORES'),
    },
  ];

  const filteredMenu = menuItems.filter(item => item.visible);

  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        backgroundColor: theme.contentBg,
        transition: 'all 300ms ease-in-out',
      }}
    >
      {/* Sidebar */}
      <div
        style={{
          width: sidebarOpen ? '16rem' : '5rem',
          backgroundColor: theme.sidebarBg,
          color: theme.sidebarText,
          transition: 'all 300ms ease-in-out',
          display: 'flex',
          flexDirection: 'column',
          borderRight: `1px solid ${theme.sidebarBorder}`,
          overflow: 'hidden',
        }}
      >
        {/* Logo/Header */}
        <div
          style={{
            padding: '1rem',
            borderBottom: `1px solid ${theme.sidebarBorder}`,
          }}
        >
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{
              fontSize: '1.5rem',
              backgroundColor: 'transparent',
              color: theme.sidebarText,
              border: 'none',
              padding: '0.5rem',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              width: '100%',
              textAlign: 'left',
              transition: 'background-color 300ms ease-in-out',
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = theme.sidebarHover}
            onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
            title="Toggle Sidebar"
          >
            ☰
          </button>
          {sidebarOpen && (
            <h1
              style={{
                fontSize: '1.25rem',
                fontWeight: 'bold',
                marginTop: '0.75rem',
                marginBottom: 0,
                color: theme.sidebarText,
              }}
            >
              PastoreApp
            </h1>
          )}
        </div>

        {/* Menú */}
        <nav
          style={{
            flex: 1,
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            overflow: 'hidden',
          }}
        >
          {filteredMenu.map(item => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem 1rem',
                  borderRadius: '0.5rem',
                  border: 'none',
                  backgroundColor: isActive ? theme.sidebarActive : 'transparent',
                  color: theme.sidebarText,
                  cursor: 'pointer',
                  transition: 'background-color 300ms ease-in-out',
                  fontSize: '1rem',
                  fontWeight: isActive ? '600' : '500',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.target.style.backgroundColor = theme.sidebarHover;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.target.style.backgroundColor = 'transparent';
                  }
                }}
                title={!sidebarOpen ? item.label : ''}
              >
                <span style={{ fontSize: '1.25rem', minWidth: '1.5rem' }}>{item.icon}</span>
                {sidebarOpen && (
                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.label}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Usuario y Logout */}
        <div
          style={{
            padding: '1rem',
            borderTop: `1px solid ${theme.sidebarBorder}`,
          }}
        >
          {sidebarOpen && (
            <div
              style={{
                marginBottom: '1rem',
                fontSize: '0.875rem',
                overflow: 'hidden',
              }}
            >
              <p
                style={{
                  fontWeight: '600',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  color: theme.sidebarText,
                  margin: 0,
                }}
              >
                {user?.name}
              </p>
              <p
                style={{
                  color: theme.textSecondary,
                  fontSize: '0.75rem',
                  margin: '0.25rem 0 0 0',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {user?.roles?.map(r => r.name || r).join(', ')}
              </p>
            </div>
          )}
          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              backgroundColor: theme.logoutBg,
              color: 'white',
              padding: '0.5rem 1rem',
              borderRadius: '0.5rem',
              border: 'none',
              cursor: 'pointer',
              transition: 'background-color 300ms ease-in-out',
              display: 'flex',
              alignItems: 'center',
              justifyContent: sidebarOpen ? 'flex-start' : 'center',
              gap: '0.5rem',
              fontSize: '1rem',
              fontWeight: '500',
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = theme.logoutBgHover}
            onMouseLeave={(e) => e.target.style.backgroundColor = theme.logoutBg}
            title="Cerrar Sesión"
          >
            <span style={{ fontSize: '1.25rem' }}>🚪</span>
            {sidebarOpen && <span>Cerrar Sesión</span>}
          </button>
        </div>
      </div>

      {/* Contenido Principal */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: theme.contentBg,
        }}
      >
        {/* Top Bar */}
        <div
          style={{
            backgroundColor: theme.topBarBg,
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
            padding: '1rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: `1px solid ${theme.topBarBorder}`,
            transition: 'all 300ms ease-in-out',
          }}
        >
          <h2
            style={{
              fontSize: '1.5rem',
              fontWeight: 'bold',
              color: theme.topBarText,
              margin: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {user?.name || 'IGLESIA RAIZ DE DAVID'}
          </h2>
          <div
            style={{
              fontSize: '0.875rem',
              color: theme.contentTextSecondary,
              whiteSpace: 'nowrap',
              marginLeft: '1rem',
            }}
          >
            Bienvenido, {user?.username?.split(' ')[0]}
          </div>
        </div>

        {/* Contenido */}
        <div
          style={{
            flex: 1,
            padding: '1.5rem',
            overflowY: 'auto',
            backgroundColor: theme.contentBg,
            color: theme.contentText,
            transition: 'all 300ms ease-in-out',
          }}
        >
          <Outlet />
        </div>
      </div>

      <style>{`
        * {
          scrollbar-color: ${isDarkMode ? '#334155 #1e293b' : '#cbd5e1 #f3f4f6'};
          scrollbar-width: thin;
        }
        
        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        
        ::-webkit-scrollbar-track {
          background: ${isDarkMode ? '#1e293b' : '#f3f4f6'};
        }
        
        ::-webkit-scrollbar-thumb {
          background: ${isDarkMode ? '#334155' : '#cbd5e1'};
          border-radius: 4px;
        }
        
        ::-webkit-scrollbar-thumb:hover {
          background: ${isDarkMode ? '#475569' : '#9ca3af'};
        }
      `}</style>
    </div>
  );
};