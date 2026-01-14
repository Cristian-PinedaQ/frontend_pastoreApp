// 📊 DashboardLayout - Layout principal con sidebar y navegación
import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

export const DashboardLayout = () => {
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
      visible: true, // Todos pueden ver
    },
    {
      label: 'Formación',
      path: '/dashboard/enrollments',
      icon: '🌾 ',
      visible: hasAnyRole(['ROLE_PASTORES', 'ROLE_AREAS', 'ROLE_PROFESORES', 'ROLE_GANANDO']),
    },
    {
      label: 'Estudiantes',
      path: '/dashboard/students',
      icon: '🎓',
      visible: hasAnyRole(['ROLE_PASTORES', 'ROLE_AREAS', 'ROLE_GANANDO' ]),
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
      label: 'Usuarios',
      path: '/dashboard/users',
      icon: '👤',
      visible: hasRole('ROLE_PASTORES'),
    },
  ];

  const filteredMenu = menuItems.filter(item => item.visible);

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div
        className={`${
          sidebarOpen ? 'w-64' : 'w-20'
        } bg-gray-900 text-white transition-all duration-300 flex flex-col`}
      >
        {/* Logo/Header */}
        <div className="p-4 border-b border-gray-700">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-2xl hover:bg-gray-800 p-2 rounded w-full text-left"
          >
            ☰
          </button>
          {sidebarOpen && (
            <h1 className="text-xl font-bold mt-3">PastoreApp</h1>
          )}
        </div>

        {/* Menú */}
        <nav className="flex-1 p-4 space-y-2">
          {filteredMenu.map(item => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                location.pathname === item.path
                  ? 'bg-blue-600'
                  : 'hover:bg-gray-800'
              }`}
              title={!sidebarOpen ? item.label : ''}
            >
              <span className="text-xl">{item.icon}</span>
              {sidebarOpen && <span>{item.label}</span>}
            </button>
          ))}
        </nav>

        {/* Usuario y Logout */}
        <div className="p-4 border-t border-gray-700">
          {sidebarOpen && (
            <div className="mb-4 text-sm">
              <p className="font-semibold truncate">{user?.name}</p>
              <p className="text-gray-400 text-xs">
                {user?.roles?.map(r => r.name || r).join(', ')}
              </p>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="w-full bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg transition flex items-center justify-center gap-2"
          >
            <span className="text-xl">🗝️</span>
            {sidebarOpen && <span>Cerrar Sesión</span>}
          </button>
        </div>
      </div>

      {/* Contenido Principal */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <div className="bg-white shadow-sm p-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800">
            {user?.name || 'IGLESIA RAIZ DE DAVID'}
          </h2>
          <div className="text-sm text-gray-600">
            Bienvenido, {user?.username?.split(' ')[0]}
          </div>
        </div>

        {/* Contenido */}
        <div className="flex-1 p-6 overflow-auto">
          <Outlet />
        </div>
      </div>
    </div>
  );
};
