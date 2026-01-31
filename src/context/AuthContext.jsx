// ============================================
// AuthContext.js - CON LOGGING EXPANDIDO
// ============================================

import React, { createContext, useContext, useState, useEffect } from "react";
import authService from "../services/authService";
import { logSecurityEvent } from "../utils/securityLogger";
import { jwtDecode } from "jwt-decode";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  let tokenRefreshTimer = null;

  const isTokenExpired = (token) => {
    try {
      if (!token) return true;
      const decoded = jwtDecode(token);
      const now = Date.now() / 1000;
      const expiresIn = decoded.exp - now;
      return expiresIn < 60;
    } catch (error) {
      console.error("❌ Error decodificando token:", error.message);
      return true;
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      try {
        let token = sessionStorage.getItem("token");
        let storedUser = sessionStorage.getItem("user");

        if (!token) {
          token = localStorage.getItem("token");
          storedUser = localStorage.getItem("user");
        }

        if (storedUser && token) {
          if (isTokenExpired(token)) {
            logSecurityEvent("token_expired", {
              timestamp: new Date().toISOString(),
            });

            sessionStorage.removeItem("user");
            sessionStorage.removeItem("token");
            localStorage.removeItem("user");
            localStorage.removeItem("token");
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
              console.error("❌ Error parseando usuario:", parseError);
              authService.logout();
              setUser(null);
            }
          }
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error("❌ Error inicializando autenticación:", error);
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
  }, []);

  // ✅ Login CON LOGGING COMPLETO Y EXPANDIDO
  const login = async (username, password) => {
    setError(null);
    setLoading(true);

    try {
      console.log("🔐 [AuthContext] Iniciando login para:", username);

      const response = await authService.login(username, password);

      console.log("📥 [AuthContext] Response JSON completo:");
      console.log(JSON.stringify(response, null, 2));

      if (!response || !response.token) {
        throw new Error("Respuesta inválida del servidor");
      }

      if (isTokenExpired(response.token)) {
        throw new Error("Token recibido está expirado");
      }

      // 🔍 LOG EXPANDIDO: Ver EXACTAMENTE qué hay en response
      console.log("🔍 [AuthContext] ===== ANÁLISIS DE RESPONSE =====");

      console.log("📍 NIVEL RAÍZ (response.*):");
      console.log(
        "   response.passwordChangeRequired:",
        response.passwordChangeRequired,
      );
      console.log(
        "   response.passwordChangedAtLeastOnce:",
        response.passwordChangedAtLeastOnce,
      );

      console.log("📍 NIVEL ANIDADO (response.user.*):");
      if (response.user) {
        console.log(
          "   response.user.passwordChangeRequired:",
          response.user.passwordChangeRequired,
        );
        console.log(
          "   response.user.passwordChangedAtLeastOnce:",
          response.user.passwordChangedAtLeastOnce,
        );
        console.log("   TODO response.user:");
        console.log(response.user);
      } else {
        console.log("   ⚠️ response.user es undefined/null");
      }

      // ✅ Preparar datos del usuario
      // Buscar en AMBOS lugares (nivel raíz Y nivel anidado)
      const pwdChangeRequired =
        response.passwordChangeRequired !== undefined
          ? response.passwordChangeRequired
          : response.user?.passwordChangeRequired || false;

      const pwdChangedAtLeastOnce =
        response.passwordChangedAtLeastOnce !== undefined
          ? response.passwordChangedAtLeastOnce
          : response.user?.passwordChangedAtLeastOnce || false;

      console.log("📦 [AuthContext] Valores FINALES calculados:");
      console.log("   pwdChangeRequired:", pwdChangeRequired);
      console.log("   pwdChangedAtLeastOnce:", pwdChangedAtLeastOnce);

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

      console.log("📦 [AuthContext] userData FINAL ANTES de guardar:");
      console.log(userData);

      // Guardar en sessionStorage
      setUser(userData);
      const userJSON = JSON.stringify(userData);
      console.log("💾 [AuthContext] Guardando en sessionStorage:", userJSON);
      sessionStorage.setItem("user", userJSON);
      sessionStorage.setItem("token", response.token);

      // ✅ VERIFICACIÓN: Leer lo que se guardó
      const verificacion = JSON.parse(sessionStorage.getItem("user"));
      console.log("✅ [AuthContext] Verificación final en sessionStorage:");
      console.log(verificacion);

      setupTokenRefreshTimer(response.token);

      logSecurityEvent("login_success", {
        timestamp: new Date().toISOString(),
        username: userData.username,
      });

      return response;
    } catch (err) {
      const errorMsg = err.message || "Error al iniciar sesión";
      setError(errorMsg);

      console.error("❌ [AuthContext] Error en login:", errorMsg);

      logSecurityEvent("login_failure", {
        timestamp: new Date().toISOString(),
        reason: errorMsg,
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
        reason: errorMsg,
      });

      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    console.log("👋 [AuthContext] Cerrando sesión...");

    setUser(null);
    setError(null);

    sessionStorage.removeItem("user");
    sessionStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("token");

    authService.logout();

    clearTokenRefreshTimer();

    logSecurityEvent("logout", {
      timestamp: new Date().toISOString(),
    });
  };

  const setupTokenRefreshTimer = (token) => {
    clearTokenRefreshTimer();

    try {
      const decoded = jwtDecode(token);
      const expiration = decoded.exp * 1000;
      const now = Date.now();

      const logoutIn = expiration - now - 60 * 1000;

      if (logoutIn > 0) {
        tokenRefreshTimer = setTimeout(() => {
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
      console.error("❌ Error configurando timer:", error);
    }
  };

  const clearTokenRefreshTimer = () => {
    if (tokenRefreshTimer) {
      clearTimeout(tokenRefreshTimer);
      tokenRefreshTimer = null;
    }
  };

  const isAuthenticated = () => {
    const token =
      sessionStorage.getItem("token") || localStorage.getItem("token");

    if (!token || !user) {
      return false;
    }

    if (isTokenExpired(token)) {
      logout();
      return false;
    }

    return true;
  };

  const hasRole = (requiredRole) => {
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
  };

  const hasAnyRole = (requiredRoles) => {
    if (!Array.isArray(requiredRoles)) {
      return hasRole(requiredRoles);
    }

    return requiredRoles.some((role) => hasRole(role));
  };

  const hasAllRoles = (requiredRoles) => {
    if (!Array.isArray(requiredRoles)) {
      return hasRole(requiredRoles);
    }

    return requiredRoles.every((role) => hasRole(role));
  };

  const getToken = () => {
    return sessionStorage.getItem("token") || localStorage.getItem("token");
  };

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
