// ============================================
// AuthContext.js - SEGURIDAD MEJORADA
// ============================================

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import authService from "../services/authService";
import { logSecurityEvent } from "../utils/securityLogger";
import { jwtDecode } from "jwt-decode";

const AuthContext = createContext(null);

// 🔐 Variable para habilitar/deshabilitar logs de debug
const DEBUG = process.env.REACT_APP_DEBUG === "true";

const log = (message, data) => {
  if (DEBUG) {
    console.log(message, data);
  }
};

const logError = (message, error) => {
  console.error(message, error);
};

// ✅ Validación de entrada
const validateLoginInput = (username, password) => {
  if (!username || typeof username !== "string") {
    throw new Error("Usuario requerido");
  }

  if (username.trim().length < 3 || username.trim().length > 50) {
    throw new Error("Usuario inválido");
  }

  if (!password || typeof password !== "string") {
    throw new Error("Contraseña requerida");
  }

  if (password.length < 8 || password.length > 128) {
    throw new Error("Contraseña inválida");
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const tokenRefreshTimer = useRef(null);

  const isTokenExpired = useCallback((token) => {
    try {
      if (!token) return true;
      const decoded = jwtDecode(token);
      const now = Date.now() / 1000;
      const expiresIn = decoded.exp - now;
      return expiresIn < 60;
    } catch (error) {
      logError("❌ Error decodificando token:", error.message);
      return true;
    }
  }, []);

  const clearTokenRefreshTimer = useCallback(() => {
    if (tokenRefreshTimer.current) {
      clearTimeout(tokenRefreshTimer.current);
      tokenRefreshTimer.current = null;
    }
  }, []);

  const logout = useCallback(() => {
    log("👋 [AuthContext] Cerrando sesión...");

    setUser(null);
    setError(null);

    // ✅ Limpiar sessionStorage (no localStorage)
    sessionStorage.removeItem("user");
    sessionStorage.removeItem("token");

    authService.logout();

    clearTokenRefreshTimer();

    logSecurityEvent("logout", {
      timestamp: new Date().toISOString(),
    });
  }, [clearTokenRefreshTimer]);

  const setupTokenRefreshTimer = useCallback(
    (token) => {
      clearTokenRefreshTimer();

      try {
        const decoded = jwtDecode(token);
        const expiration = decoded.exp * 1000;
        const now = Date.now();

        const logoutIn = expiration - now - 60 * 1000;

        if (logoutIn > 0) {
          tokenRefreshTimer.current = setTimeout(() => {
            logout();
            setError(
              "Tu sesión ha expirado. Por favor inicia sesión nuevamente.",
            );

            logSecurityEvent("session_expired", {
              timestamp: new Date().toISOString(),
            });
          }, logoutIn);
        } else {
          logout();
        }
      } catch (error) {
        logError("❌ Error configurando timer:", error);
      }
    },
    [clearTokenRefreshTimer, logout],
  );

  useEffect(() => {
    const initAuth = async () => {
      try {
        // ✅ Solo sessionStorage (sin fallback a localStorage)
        const token = sessionStorage.getItem("token");
        const storedUser = sessionStorage.getItem("user");

        if (storedUser && token) {
          if (isTokenExpired(token)) {
            logSecurityEvent("token_expired", {
              timestamp: new Date().toISOString(),
            });

            sessionStorage.removeItem("user");
            sessionStorage.removeItem("token");
            authService.logout();
            setUser(null);
          } else {
            try {
              const userParsed = JSON.parse(storedUser);

              const roles = Array.isArray(userParsed.roles)
                ? userParsed.roles
                : userParsed.roles
                  ? [userParsed.roles]
                  : [];

              const userData = {
                ...userParsed,
                roles,
              };

              setUser(userData);
              setupTokenRefreshTimer(token);

              logSecurityEvent("session_restored", {
                timestamp: new Date().toISOString(),
              });
            } catch (parseError) {
              logError("❌ Error parseando usuario:", parseError);
              authService.logout();
              setUser(null);
            }
          }
        } else {
          setUser(null);
        }
      } catch (error) {
        logError("❌ Error inicializando autenticación:", error);
        setError(error.message);
        setUser(null);
        authService.logout();
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    return () => {
      clearTokenRefreshTimer();
    };
  }, [setupTokenRefreshTimer, clearTokenRefreshTimer, isTokenExpired]);

  // ✅ Login CON SEGURIDAD MEJORADA
  const login = async (username, password) => {
    setError(null);
    setLoading(true);

    try {
      // ✅ Validación de entrada
      validateLoginInput(username, password);

      log("🔐 [AuthContext] Iniciando login", { username });

      const response = await authService.login(username, password);

      if (!response || !response.token) {
        throw new Error("Respuesta inválida del servidor");
      }

      if (isTokenExpired(response.token)) {
        throw new Error("Token recibido está expirado");
      }

      // 🔍 LOG SEGURO: Solo en modo DEBUG
      if (DEBUG) {
        log("📍 ANÁLISIS DE RESPONSE (DEBUG):", {
          hasToken: !!response.token,
          hasUser: !!response.user,
          passwordChangeRequired: response.passwordChangeRequired,
        });
      }

      // ✅ Preparar datos del usuario
      const pwdChangeRequired =
        response.passwordChangeRequired !== undefined
          ? response.passwordChangeRequired
          : response.user?.passwordChangeRequired || false;

      const pwdChangedAtLeastOnce =
        response.passwordChangedAtLeastOnce !== undefined
          ? response.passwordChangedAtLeastOnce
          : response.user?.passwordChangedAtLeastOnce || false;

      const userData = {
        id: response.id || response.user?.id,
        username: response.username || response.user?.username,
        name: response.name || response.user?.name,
        email: response.email || response.user?.email,
        roles: Array.isArray(response.roles)
          ? response.roles
          : response.roles
            ? [response.roles]
            : response.user?.roles || [],
        passwordChangeRequired: pwdChangeRequired,
        passwordChangedAtLeastOnce: pwdChangedAtLeastOnce,
      };

      if (DEBUG) {
        log("📦 [AuthContext] userData FINAL:", userData);
      }

      // ✅ Guardar en sessionStorage (solo sessionStorage, no localStorage)
      setUser(userData);
      const userJSON = JSON.stringify(userData);
      sessionStorage.setItem("user", userJSON);
      sessionStorage.setItem("token", response.token);

      if (DEBUG) {
        const verificacion = JSON.parse(sessionStorage.getItem("user"));
        log("✅ [AuthContext] Verificación en sessionStorage:", verificacion);
      }

      setupTokenRefreshTimer(response.token);

      logSecurityEvent("login_success", {
        timestamp: new Date().toISOString(),
        username: userData.username,
      });

      return response;
    } catch (err) {
      // ✅ Mensaje de error genérico en seguridad (no exponer detalles)
      const genericErrorMsg = "Credenciales inválidas";
      const detailedErrorMsg = err.message || "Error al iniciar sesión";

      setError(genericErrorMsg);

      logError("❌ [AuthContext] Error en login:", detailedErrorMsg);

      // ✅ Log seguro: sin exponer detalles específicos
      logSecurityEvent("login_failure", {
        timestamp: new Date().toISOString(),
        // NO incluir: reason, errorMsg, detalles específicos
      });

      throw err;
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    setError(null);
    setLoading(true);

    try {
      // ✅ Validación básica
      if (!userData || typeof userData !== "object") {
        throw new Error("Datos de registro inválidos");
      }

      const response = await authService.register(userData);

      logSecurityEvent("registration_success", {
        timestamp: new Date().toISOString(),
      });

      return response;
    } catch (err) {
      const errorMsg = err.message || "Error al registrarse";
      setError(errorMsg);

      logSecurityEvent("registration_failure", {
        timestamp: new Date().toISOString(),
      });

      throw err;
    } finally {
      setLoading(false);
    }
  };





  const isAuthenticated = useCallback(() => {
    const token = sessionStorage.getItem("token");

    if (!token || !user) {
      return false;
    }

    if (isTokenExpired(token)) {
      logout();
      return false;
    }

    return true;
  }, [user, isTokenExpired, logout]);

  const hasRole = useCallback((requiredRole) => {
    if (!user || !user.roles || user.roles.length === 0) {
      return false;
    }

    const normalizedRequired = requiredRole.includes("ROLE_")
      ? requiredRole.toUpperCase()
      : `ROLE_${requiredRole.toUpperCase()}`;

    return user.roles.some((role) => {
      let normalizedRole = role;

      if (typeof role === "object" && role.name) {
        normalizedRole = role.name;
      }

      if (typeof normalizedRole === "string") {
        normalizedRole = normalizedRole.includes("ROLE_")
          ? normalizedRole.toUpperCase()
          : `ROLE_${normalizedRole.toUpperCase()}`;

        return normalizedRole === normalizedRequired;
      }

      return false;
    });
  }, [user]);

  const hasAnyRole = useCallback((requiredRoles) => {
    if (!Array.isArray(requiredRoles)) {
      return hasRole(requiredRoles);
    }

    return requiredRoles.some((role) => hasRole(role));
  }, [hasRole]);

  const hasAllRoles = useCallback((requiredRoles) => {
    if (!Array.isArray(requiredRoles)) {
      return hasRole(requiredRoles);
    }

    return requiredRoles.every((role) => hasRole(role));
  }, [hasRole]);

  const getToken = useCallback(() => {
    return sessionStorage.getItem("token");
  }, []);

  const value = {
    user,
    loading,
    error,
    login,
    register,
    logout,
    isAuthenticated,
    hasRole,
    hasAnyRole,
    hasAllRoles,
    isTokenExpired,
    getToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("❌ useAuth debe ser usado dentro de AuthProvider");
  }

  return context;
};

export default AuthContext;