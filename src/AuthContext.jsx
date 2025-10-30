// 🔐 AuthContext - Maneja toda la lógica de autenticación
import React, { createContext, useContext, useEffect, useState } from 'react';
import apiService from './apiService';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ✅ Inicializar sesión desde localStorage
  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    
    if (token && savedUser) {
      try {
        setUser(JSON.parse(savedUser));
        apiService.setToken(token);
      } catch (err) {
        console.error('Error al recuperar sesión:', err);
        logout();
      }
    }
    setLoading(false);
  }, []);

  // 🔓 Login - ✅ ACTUALIZADO para usar username
  const login = async (username, password) => {
    setError(null);
    setLoading(true);
    
    try {
      const response = await apiService.login(username, password); // ✅ Cambiado
      
      // Guardar usuario y token
      const userData = {
        id: response.id,
        username: response.username, // ✅ Cambiado de email a username
        name: response.name,
        roles: response.roles || [], // Array de roles
      };
      
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('token', response.token);
      
      return response;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // 📝 Register
  const register = async (userData) => {
    setError(null);
    setLoading(true);
    
    try {
      const response = await apiService.register(userData);
      return response;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // 🚪 Logout
  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    apiService.logout();
  };

  // ✅ Verificar si el usuario tiene un rol específico
  const hasRole = (requiredRole) => {
    if (!user) return false;
    if (!Array.isArray(user.roles)) return false;
    return user.roles.some(role => 
      role.name === requiredRole || role === requiredRole
    );
  };

  // ✅ Verificar si el usuario tiene ALGUNO de los roles
  const hasAnyRole = (roles) => {
    if (!user) return false;
    if (!Array.isArray(user.roles)) return false;
    return user.roles.some(userRole =>
      roles.includes(userRole.name || userRole)
    );
  };

  // ✅ Verificar si el usuario está autenticado
  const isAuthenticated = () => !!user && !!localStorage.getItem('token');

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
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook para usar el contexto
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de AuthProvider');
  }
  return context;
};