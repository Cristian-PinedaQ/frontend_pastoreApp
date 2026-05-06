// ============================================
// ProtectedRoute.jsx - SEGURIDAD MEJORADA
// ============================================

import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import logoBlancoImg from './assets/Pastoreapp_blanco.webp';
import logoNegroImg from './assets/Pastoreappnegro.webp';
import './css/Protectedroute.css';
import RequiredPasswordChange from './components/RequiredPasswordChange';

// 🔐 Debug condicional
const DEBUG = process.env.REACT_APP_DEBUG === "true";

const log = (message, data) => {
  if (DEBUG) {
    console.log(message, data);
  }
};

const logError = (message, error) => {
  console.error(message, error);
};

// ✅ Validar datos del usuario parseados
const validateStoredUser = (userObj) => {
  if (!userObj || typeof userObj !== 'object') {
    return null;
  }

  // Validar campos críticos
  if (!userObj.username || typeof userObj.username !== 'string') {
    return null;
  }

  // Retornar user validado
  return {
    ...userObj,
    passwordChangeRequired: userObj.passwordChangeRequired === true,
    passwordChangedAtLeastOnce: userObj.passwordChangedAtLeastOnce === true,
  };
};

const ProtectedRoute = ({
  element,
  requiredRoles = null,
  requireAll = false,
}) => {
  const { isAuthenticated, user, hasRole, loading } = useAuth();
  const [passwordChangeRequired, setPasswordChangeRequired] = useState(null);

  // ✅ Verificar passwordChangeRequired desde sessionStorage Y contexto
  useEffect(() => {
    try {
      // Priorizar datos del contexto
      if (user && typeof user === 'object') {
        const needsPasswordChange = user.passwordChangeRequired === true;
        log('🔐 [ProtectedRoute] passwordChangeRequired (contexto):', needsPasswordChange);
        setPasswordChangeRequired(needsPasswordChange);
        return;
      }

      // Fallback: leer de sessionStorage
      const storedUser = sessionStorage.getItem('user');
      if (storedUser) {
        try {
          const userObj = JSON.parse(storedUser);
          const validatedUser = validateStoredUser(userObj);

          if (!validatedUser) {
            log('⚠️ [ProtectedRoute] User en sessionStorage es inválido');
            setPasswordChangeRequired(false);
            return;
          }

          const needsPasswordChange = validatedUser.passwordChangeRequired === true;
          log('🔐 [ProtectedRoute] passwordChangeRequired (sessionStorage):', needsPasswordChange);
          setPasswordChangeRequired(needsPasswordChange);
        } catch (parseError) {
          logError('❌ [ProtectedRoute] Error parseando user:', parseError);
          setPasswordChangeRequired(false);
        }
      } else {
        log('⚠️ [ProtectedRoute] No hay user en sessionStorage');
        setPasswordChangeRequired(false);
      }
    } catch (err) {
      logError('❌ [ProtectedRoute] Error crítico leyendo datos:', err);
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
    log('❌ [ProtectedRoute] No autenticado - redirigiendo a login');
    return <Navigate to="/login" replace />;
  }

  // ========== CAMBIO OBLIGATORIO DE CONTRASEÑA ==========
  if (passwordChangeRequired === true) {
    log('🔐 [ProtectedRoute] MOSTRANDO MODAL DE CAMBIO OBLIGATORIO');

    return (
      <RequiredPasswordChange
        onPasswordChanged={() => {
          try {
            log('✅ [ProtectedRoute] Contraseña cambiada correctamente');

            // ✅ Actualizar el usuario de manera segura
            const storedUser = sessionStorage.getItem('user');
            if (storedUser) {
              try {
                const currentUser = JSON.parse(storedUser);
                const validatedUser = validateStoredUser(currentUser);

                if (validatedUser) {
                  const updatedUser = {
                    ...validatedUser,
                    passwordChangeRequired: false,
                    passwordChangedAtLeastOnce: true
                  };
                  sessionStorage.setItem('user', JSON.stringify(updatedUser));
                  log('✅ [ProtectedRoute] User actualizado en sessionStorage');
                }
              } catch (parseError) {
                logError('❌ [ProtectedRoute] Error actualizando user:', parseError);
              }
            }

            // ✅ Actualizar estado local
            setPasswordChangeRequired(false);

            // ✅ Redirigir de manera segura
            window.location.href = '/dashboard';
          } catch (error) {
            logError('❌ [ProtectedRoute] Error en onPasswordChanged:', error);
          }
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
      log('❌ [ProtectedRoute] Roles insuficientes');
      return <Navigate to="/unauthorized" replace />;
    }
  }

  // ========== ACCESO PERMITIDO ==========
  log('✅ [ProtectedRoute] ACCESO PERMITIDO');
  return element;
};

/**
 * 🚫 UnauthorizedPage - Página 403
 * Mostrada cuando el usuario no tiene permisos suficientes
 */
export const UnauthorizedPage = () => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    try {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const hasDarkClass = document.documentElement.classList.contains('dark-mode');
      setIsDarkMode(prefersDark || hasDarkClass);

      const darkModeListener = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = (e) => {
        setIsDarkMode(e.matches || document.documentElement.classList.contains('dark-mode'));
      };
      darkModeListener.addEventListener('change', handleChange);

      return () => darkModeListener.removeEventListener('change', handleChange);
    } catch (error) {
      logError('❌ [UnauthorizedPage] Error detectando dark mode:', error);
    }
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