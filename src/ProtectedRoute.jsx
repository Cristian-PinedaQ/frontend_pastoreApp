/**
 * 🛡️ ProtectedRoute - Protección de rutas y validación de roles
 * 
 * ℹ️ VERSIÓN OPTIMIZADA PARA PRODUCCIÓN:
 * - Todos los console.log están comentados para mejor rendimiento
 * - Si necesitas debuggear, busca las líneas con "// 🔧 DEBUG" y descomenta
 * - Valida autenticación y permisos de forma segura sin exponer datos sensibles
 */

import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
// ✅ CORREGIDO: Import relativo correcto
import { logSecurityEvent } from './utils/securityLogger';

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
  const { isAuthenticated, user, hasRole, loading } = useAuth();

  // ✅ SEGURIDAD: Log seguro (sin exponer datos sensibles)
  if (process.env.NODE_ENV === 'development') {
    // 🔧 DEBUG (descomentar solo en desarrollo):
    // console.log('🛡️ ProtectedRoute - Verificando acceso');
    // console.log('🔐 Roles requeridos:', requiredRoles);
    // NO loguear user completo - potencialmente sensible
  }

  if (loading) {
    return <div className="flex items-center justify-center h-screen">⏳ Cargando...</div>;
  }

  // Si no está autenticado, redirigir a login
  if (!isAuthenticated()) {
    if (process.env.NODE_ENV === 'development') {
      // 🔧 DEBUG (descomentar solo en desarrollo):
      // console.warn('⚠️ Usuario no autenticado - redirigiendo a login');
    }
    
    // Log seguro de evento de seguridad
    logSecurityEvent('unauthorized_access_attempt', {
      timestamp: new Date().toISOString(),
      reason: 'not_authenticated'
    });
    
    return <Navigate to="/login" replace />;
  }

  // Si se especifican roles requeridos, validar
  if (requiredRoles) {
    const rolesArray = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
    let hasPermission;

    if (requireAll) {
      // Necesita TODOS los roles
      hasPermission = rolesArray.every(role => hasRole(role));
    } else {
      // Necesita AL MENOS UNO
      hasPermission = rolesArray.some(role => hasRole(role));
    }

    // ✅ SEGURIDAD: Si acceso denegado, registrar evento seguro (sin exponer datos)
    if (!hasPermission) {
      if (process.env.NODE_ENV === 'development') {
        // 🔧 DEBUG (descomentar solo en desarrollo):
        // console.warn('❌ Acceso denegado - roles insuficientes');
      }

      logSecurityEvent('unauthorized_access_attempt', {
        timestamp: new Date().toISOString(),
        reason: 'insufficient_roles',
        requiredRoles: rolesArray,
        // NO incluir roles reales del usuario
      });

      return <Navigate to="/unauthorized" replace />;
    }

    if (process.env.NODE_ENV === 'development') {
      // 🔧 DEBUG (descomentar solo en desarrollo):
      // console.log('✅ Acceso permitido');
    }
  }

  return element;
};

/**
 * 🚫 UnauthorizedPage - Página de acceso denegado
 * Mostrada cuando un usuario intenta acceder a una ruta sin permisos suficientes
 */
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
        
        {/* ✅ SEGURIDAD: Sin exponer datos sensibles del usuario */}
        <div className="mb-6 p-4 bg-gray-50 rounded">
          <p className="text-gray-700 font-semibold">¿Necesitas ayuda?</p>
          <p className="text-gray-600 text-sm">
            Contacta con un administrador si crees que esto es un error.
          </p>
        </div>
        
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

export default ProtectedRoute;