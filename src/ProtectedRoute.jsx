// 🛡️ ProtectedRoute - Valida permisos antes de mostrar componentes
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

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
  const { isAuthenticated, user, hasRole, hasAnyRole, loading } = useAuth();

  console.log('🛡️ ProtectedRoute - Verificando acceso');
  console.log('👤 Usuario:', user);
  console.log('🔐 Roles requeridos:', requiredRoles);

  if (loading) {
    return <div className="flex items-center justify-center h-screen">⏳ Cargando...</div>;
  }

  // Si no está autenticado, redirigir a login
  if (!isAuthenticated()) {
    console.warn('⚠️ Usuario no autenticado - redirigiendo a login');
    return <Navigate to="/login" replace />;
  }

  // Si se especifican roles requeridos, validar
  if (requiredRoles) {
    const rolesArray = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];

    console.log('🔍 Validando roles requeridos:');
    
    let hasPermission;

    if (requireAll) {
      // Necesita TODOS los roles
      hasPermission = rolesArray.every(role => {
        const has = hasRole(role);
        console.log(`  ✓ "${role}": ${has}`);
        return has;
      });
      console.log(`📋 Modo: TODOS los roles requeridos - Resultado:`, hasPermission);
    } else {
      // Necesita AL MENOS UNO
      hasPermission = rolesArray.some(role => {
        const has = hasRole(role);
        console.log(`  ✓ "${role}": ${has}`);
        return has;
      });
      console.log(`📋 Modo: AL MENOS UNO - Resultado:`, hasPermission);
    }

    if (!hasPermission) {
      console.warn('❌ Acceso denegado - roles insuficientes');
      console.warn('🔐 Roles del usuario:', user?.roles);
      console.warn('🔐 Roles requeridos:', rolesArray);
      return <Navigate to="/unauthorized" replace />;
    }

    console.log('✅ Acceso permitido');
  }

  return element;
};

// Página de acceso denegado
export const UnauthorizedPage = () => {
  const { user } = useAuth();
  
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
      <div className="text-center bg-white p-8 rounded-lg shadow-lg">
        <h1 className="text-4xl font-bold text-red-600 mb-4">403</h1>
        <p className="text-2xl font-semibold text-gray-700 mb-4">Acceso Denegado</p>
        <p className="text-gray-600 mb-6">
          No tienes permisos para acceder a esta página.
        </p>
        
        {user && (
          <div className="mb-6 p-4 bg-gray-50 rounded">
            <p className="text-gray-700 font-semibold">Tu información:</p>
            <p className="text-gray-800">👤 Usuario: <strong>{user.username}</strong></p>
            <p className="text-gray-800">🔐 Roles: <strong>{user.roles?.join(', ') || 'Sin roles'}</strong></p>
          </div>
        )}
        
        <a
          href="/dashboard"
          className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          ← Volver al Dashboard
        </a>
      </div>
    </div>
  );
};