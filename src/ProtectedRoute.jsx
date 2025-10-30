// 🛡️ ProtectedRoute - Valida permisos antes de mostrar componentes
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

/**
 * @param {JSX.Element} element - Componente a renderizar
 * @param {string|string[]} requiredRoles - Rol o roles necesarios
 * @param {boolean} requireAll - Si true, necesita TODOS los roles; si false, necesita AL MENOS uno
 */
export const ProtectedRoute = ({
  element,
  requiredRoles = null,
  requireAll = false,
}) => {
  const { isAuthenticated, hasRole, hasAnyRole, loading } = useAuth();

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Cargando...</div>;
  }

  // Si no está autenticado, redirigir a login
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  // Si se especifican roles requeridos, validar
  if (requiredRoles) {
    const rolesArray = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];

    const hasPermission = requireAll
      ? rolesArray.every(role => hasRole(role))
      : hasAnyRole(rolesArray);

    if (!hasPermission) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return element;
};

// Página de acceso denegado
export const UnauthorizedPage = () => (
  <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
    <div className="text-center">
      <h1 className="text-4xl font-bold text-red-600 mb-4">403</h1>
      <p className="text-2xl font-semibold text-gray-700 mb-4">Acceso Denegado</p>
      <p className="text-gray-600 mb-8">
        No tienes permisos para acceder a esta página.
      </p>
      <a
        href="/dashboard"
        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      >
        Volver al Dashboard
      </a>
    </div>
  </div>
);
