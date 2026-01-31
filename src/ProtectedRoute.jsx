// ============================================
// ProtectedRoute.jsx - VERSIÓN MEJORADA
// Con Logo Pastoreapp + Responsive + Dark Mode
// ============================================

import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import authService from './services/authService';
import logoBlancoImg from './assets/Pastoreapp_blanco.png';
import logoNegroImg from './assets/Pastoreappnegro.png';
import './css/Protectedroute.css';
import RequiredPasswordChange from './components/RequiredPasswordChange';
const ProtectedRoute = ({
  element,
  requiredRoles = null,
  requireAll = false,
}) => {
  const { isAuthenticated, user, hasRole, loading } = useAuth();
  const [passwordChangeRequired, setPasswordChangeRequired] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // ✅ Detectar modo oscuro
  useEffect(() => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const hasDarkClass = document.documentElement.classList.contains('dark-mode');
    setIsDarkMode(prefersDark || hasDarkClass);

    // Listener para cambios en el tema
    const darkModeListener = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => setIsDarkMode(e.matches || document.documentElement.classList.contains('dark-mode'));
    darkModeListener.addEventListener('change', handleChange);

    // Listener para cambios de clase en el documento
    const observer = new MutationObserver(() => {
      const isDark = document.documentElement.classList.contains('dark-mode');
      setIsDarkMode(isDark);
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    return () => {
      darkModeListener.removeEventListener('change', handleChange);
      observer.disconnect();
    };
  }, []);

  // ✅ EFECTO: Verificar passwordChangeRequired desde sessionStorage
  useEffect(() => {
    try {
      const storedUser = sessionStorage.getItem('user');
      if (storedUser) {
        const userObj = JSON.parse(storedUser);
        const needsPasswordChange = userObj.passwordChangeRequired === true;
        
        //console.log('🔐 [ProtectedRoute] Verificación de passwordChangeRequired:');
        //console.log('   Stored User:', userObj);
        //console.log('   passwordChangeRequired:', needsPasswordChange);
        
        setPasswordChangeRequired(needsPasswordChange);
      } else {
        //console.log('⚠️ [ProtectedRoute] No hay user en sessionStorage');
        setPasswordChangeRequired(false);
      }
    } catch (err) {
      console.error('❌ [ProtectedRoute] Error leyendo sessionStorage:', err);
      setPasswordChangeRequired(false);
    }
  }, [user]);

  // ========== CARGANDO ==========
  if (loading || passwordChangeRequired === null) {
    return (
      <div className="protected-route__loading-container">
        <div className="protected-route__loading-content">
          <div className="protected-route__spinner">⏳</div>
          <p className="protected-route__loading-text">Validando acceso...</p>
        </div>
      </div>
    );
  }

  // ========== NO AUTENTICADO ==========
  if (!isAuthenticated()) {
    console.warn('❌ [ProtectedRoute] No autenticado - redirigiendo a login');
    return <Navigate to="/login" replace />;
  }

  // ========== CAMBIO OBLIGATORIO DE CONTRASEÑA ==========
if (passwordChangeRequired === true) {
  //console.log('🔐 [ProtectedRoute] MOSTRANDO MODAL DE CAMBIO OBLIGATORIO');
  
  // ✅ Importar al inicio del archivo:
  // import RequiredPasswordChange from './RequiredPasswordChange';
  
  return (
    <RequiredPasswordChange 
      onPasswordChanged={() => {
        // Actualizar el usuario para que no vuelva a mostrar el modal
        const currentUser = JSON.parse(sessionStorage.getItem('user'));
        const updatedUser = {
          ...currentUser,
          passwordChangeRequired: false,
          passwordChangedAtLeastOnce: true
        };
        sessionStorage.setItem('user', JSON.stringify(updatedUser));
        
        // Redirigir al dashboard
        window.location.href = '/dashboard';
      }}
    />
  );
}

  // ========== VALIDACIÓN: Roles ==========
  if (requiredRoles) {
    const rolesArray = Array.isArray(requiredRoles)
      ? requiredRoles
      : [requiredRoles];

    let hasPermission;

    if (requireAll) {
      hasPermission = rolesArray.every((role) => hasRole(role));
    } else {
      hasPermission = rolesArray.some((role) => hasRole(role));
    }

    if (!hasPermission) {
      console.warn('❌ [ProtectedRoute] Roles insuficientes');
      return <Navigate to="/unauthorized" replace />;
    }
  }

  // ========== ACCESO PERMITIDO ==========
  //console.log('✅ [ProtectedRoute] ACCESO PERMITIDO');
  return element;
};

/**
 * 🚫 UnauthorizedPage - Página 403
 * Mostrada cuando el usuario no tiene permisos suficientes
 */
export const UnauthorizedPage = () => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const hasDarkClass = document.documentElement.classList.contains('dark-mode');
    setIsDarkMode(prefersDark || hasDarkClass);

    const darkModeListener = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => setIsDarkMode(e.matches || document.documentElement.classList.contains('dark-mode'));
    darkModeListener.addEventListener('change', handleChange);

    return () => darkModeListener.removeEventListener('change', handleChange);
  }, []);

  const logoSrc = isDarkMode ? logoBlancoImg : logoNegroImg;

  return (
    <div className="protected-route__modal-overlay">
      <div className="protected-route__modal-container protected-route__modal-container--error">
        
        {/* Logo pequeño */}
        <div className="protected-route__logo-wrapper--small">
          <img 
            src={logoSrc} 
            alt="Pastoreapp Logo" 
            className="protected-route__logo--small"
          />
        </div>

        {/* Código de error */}
        <h1 className="protected-route__error-code">403</h1>

        {/* Título */}
        <h2 className="protected-route__error-title">
          Acceso Denegado
        </h2>

        {/* Descripción */}
        <p className="protected-route__error-description">
          No tienes permisos para acceder a esta página.
        </p>

        {/* Ayuda */}
        <div className="protected-route__help-box">
          <p className="protected-route__help-title">
            ℹ️ ¿Necesitas ayuda?
          </p>
          <p className="protected-route__help-text">
            Contacta con un administrador si crees que esto es un error.
          </p>
        </div>

        {/* Botón de volver */}
        <a
          href="/dashboard"
          className="protected-route__btn-back"
        >
          ← Volver al Dashboard
        </a>
      </div>
    </div>
  );
};

export default ProtectedRoute;