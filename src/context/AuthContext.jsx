// 🔐 AuthContext - Maneja autenticación, roles y expiración JWT
import React, { createContext, useContext, useEffect, useState } from "react";
import { jwtDecode } from "jwt-decode";
import apiService from "../apiService";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  let tokenRefreshTimer = null;

  // ⚡ Verificar expiración del token
  const isTokenExpired = (token) => {
    try {
      const decoded = jwtDecode(token);
      const now = Date.now() / 1000;
      return decoded.exp - now < 60;
    } catch {
      return true;
    }
  };

  // ⚡ Cargar sesión desde localStorage
  useEffect(() => {
    const token = localStorage.getItem("token");
    const savedUser = localStorage.getItem("user");

    if (token && savedUser) {
      try {
        if (isTokenExpired(token)) {
          logout();
          return;
        }

        const userParsed = JSON.parse(savedUser);
        setUser({
          ...userParsed,
          roles: Array.isArray(userParsed.roles) ? userParsed.roles : [],
        });

        apiService.setToken(token);
      } catch {
        logout();
      }
    }

    setLoading(false);
  }, []);

  // 🔓 Login
  const login = async (username, password) => {
    setError(null);
    setLoading(true);

    try {
      const response = await apiService.login(username, password);

      const userData = {
        id: response.id,
        username: response.username,
        name: response.name,
        email: response.email,
        roles: Array.isArray(response.roles)
          ? response.roles
          : response.roles
          ? [response.roles]
          : [],
      };

      if (isTokenExpired(response.token)) {
        throw new Error("El token está expirado");
      }

      setUser(userData);
      localStorage.setItem("user", JSON.stringify(userData));
      localStorage.setItem("token", response.token);

      setupTokenRefreshTimer(response.token);

      return response;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // 📝 Registro
  const register = async (userData) => {
    setError(null);
    setLoading(true);
    try {
      return await apiService.register(userData);
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // 🚪 Cerrar sesión
  const logout = () => {
    setUser(null);
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    apiService.logout();
    clearTokenRefreshTimer();
  };

  // ⏳ Timer para cierre automático
  const setupTokenRefreshTimer = (token) => {
    clearTokenRefreshTimer();
    try {
      const decoded = jwtDecode(token);
      const expiration = decoded.exp * 1000;
      const now = Date.now();

      const logoutIn = expiration - now - 60000;

      if (logoutIn > 0) {
        tokenRefreshTimer = setTimeout(() => {
          logout();
          setError("Tu sesión ha expirado. Inicia sesión nuevamente.");
        }, logoutIn);
      } else {
        logout();
      }
    } catch {}
  };

  const clearTokenRefreshTimer = () => {
    if (tokenRefreshTimer) clearTimeout(tokenRefreshTimer);
  };

  // 🔐 Verificar si el usuario tiene un rol
  const hasRole = (requiredRole) => {
    if (!user || !user.roles) return false;

    const normalizedRequired = requiredRole.includes("ROLE_")
      ? requiredRole
      : `ROLE_${requiredRole.toUpperCase()}`;

    return user.roles.some((role) => {
      if (typeof role === "string") {
        const normalizedRole = role.includes("ROLE_")
          ? role
          : `ROLE_${role.toUpperCase()}`;
        return normalizedRole === normalizedRequired;
      }

      if (typeof role === "object" && role.name) {
        const normalizedName = role.name.includes("ROLE_")
          ? role.name
          : `ROLE_${role.name.toUpperCase()}`;
        return normalizedName === normalizedRequired;
      }

      return false;
    });
  };

  // 🔐 Verificar si tiene alguno de varios roles
  const hasAnyRole = (roles) => {
    if (!Array.isArray(roles)) return hasRole(roles);
    return roles.some((r) => hasRole(r));
  };

  // 🔐 Verifica si está autenticado
  const isAuthenticated = () => {
    const token = localStorage.getItem("token");
    if (!token || !user) return false;

    if (isTokenExpired(token)) {
      logout();
      return false;
    }

    return true;
  };

  const value = {
    user,
    loading,
    error,
    login,
    register,
    logout,
    hasRole,
    hasAnyRole,
    isAuthenticated,
    isTokenExpired,
  };

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
