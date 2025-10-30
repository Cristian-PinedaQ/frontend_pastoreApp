// 🎣 Custom Hooks - Utilidades reutilizables

import { useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import apiService from './apiService';

/**
 * 📡 Hook para manejar requests a la API
 * Maneja loading, error y data automáticamente
 */
export const useFetch = (fetchFn) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const execute = useCallback(async (...args) => {
    try {
      setLoading(true);
      setError(null);
      const result = await fetchFn(...args);
      setData(result);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchFn]);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
  }, []);

  return { data, loading, error, execute, reset };
};

/**
 * ✅ Hook para CRUD simplificado
 * Maneja lista, crear, editar, eliminar
 */
export const useCrud = (apiMethods) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);

  // Cargar todos
  const fetch = useCallback(async (params) => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiMethods.getAll(params);
      setItems(response.data || []);
      return response;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [apiMethods]);

  // Crear
  const create = useCallback(async (data) => {
    try {
      setLoading(true);
      const response = await apiMethods.create(data);
      setItems(prev => [...prev, response.data || response]);
      return response;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [apiMethods]);

  // Actualizar
  const update = useCallback(async (id, data) => {
    try {
      setLoading(true);
      const response = await apiMethods.update(id, data);
      setItems(prev =>
        prev.map(item => (item.id === id ? { ...item, ...data } : item))
      );
      setEditingId(null);
      return response;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [apiMethods]);

  // Eliminar
  const remove = useCallback(async (id) => {
    if (!window.confirm('¿Estás seguro?')) return;
    try {
      setLoading(true);
      await apiMethods.delete(id);
      setItems(prev => prev.filter(item => item.id !== id));
      return true;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [apiMethods]);

  return {
    items,
    loading,
    error,
    editingId,
    setEditingId,
    fetch,
    create,
    update,
    remove,
  };
};

/**
 * 🔒 Hook para verificar permisos
 */
export const usePermissions = () => {
  const { hasRole, hasAnyRole } = useAuth();

  return {
    isPastor: () => hasRole('PASTORES'),
    isArea: () => hasRole('AREAS'),
    isTeacher: () => hasRole('PROFESORES'),
    isWinning: () => hasRole('GANANDO'),
    canManageMembers: () => hasAnyRole(['PASTORES', 'GANANDO']),
    canManageEnrollments: () => hasAnyRole(['PASTORES', 'AREAS']),
    canManageUsers: () => hasRole('PASTORES'),
    canMarkAttendance: () => hasAnyRole(['PASTORES', 'AREAS', 'PROFESORES']),
  };
};

/**
 * 💾 Hook para guardar datos en localStorage
 */
export const useLocalStorage = (key, initialValue) => {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  const setValue = useCallback((value) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(error);
    }
  }, [key, storedValue]);

  return [storedValue, setValue];
};

/**
 * 🔔 Hook para notificaciones
 */
export const useNotification = () => {
  const [notifications, setNotifications] = useState([]);

  const add = useCallback((message, type = 'info', duration = 3000) => {
    const id = Date.now();
    const notification = { id, message, type };
    setNotifications(prev => [...prev, notification]);

    if (duration > 0) {
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== id));
      }, duration);
    }

    return id;
  }, []);

  const remove = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const success = useCallback((message) => add(message, 'success'), [add]);
  const error = useCallback((message) => add(message, 'error'), [add]);
  const warning = useCallback((message) => add(message, 'warning'), [add]);
  const info = useCallback((message) => add(message, 'info'), [add]);

  return { notifications, add, remove, success, error, warning, info };
};

// ============================================
// 📚 EJEMPLOS DE USO
// ============================================

/*
// En un componente:

import { useCrud, usePermissions } from './hooks';

export function MiComponente() {
  const permissions = usePermissions();
  const { items, loading, fetch, create, update, remove } = useCrud({
    getAll: apiService.getMembers,
    create: apiService.createMember,
    update: apiService.updateMember,
    delete: apiService.deleteMember,
  });

  useEffect(() => {
    fetch();
  }, [fetch]);

  return (
    <div>
      {loading && <p>Cargando...</p>}
      
      {permissions.canManageMembers() && (
        <button onClick={() => create({ name: 'Juan' })}>
          Crear Miembro
        </button>
      )}

      {items.map(item => (
        <div key={item.id}>
          {item.name}
          {permissions.canManageMembers() && (
            <>
              <button onClick={() => update(item.id, { name: 'Nuevo' })}>
                Editar
              </button>
              <button onClick={() => remove(item.id)}>
                Eliminar
              </button>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
*/
