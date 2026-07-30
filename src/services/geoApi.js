// 📡 Servicio de API para Geolocalización
const API_BASE_URL = process.env.REACT_APP_API_URL || '/api/v1';

const getHeaders = () => {
  const token = sessionStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

/**
 * Helper genérico para peticiones HTTP fetch con soporte para AbortController.
 */
async function fetchJson(endpoint, options = {}) {
  const { query, signal, ...init } = options;
  
  let url = `${API_BASE_URL}${endpoint}`;
  if (query) {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        if (Array.isArray(val)) {
          val.forEach(item => params.append(key, item));
        } else {
          params.append(key, val);
        }
      }
    });
    const queryString = params.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
  }

  const response = await fetch(url, {
    ...init,
    headers: {
      ...getHeaders(),
      ...init.headers,
    },
    signal,
  });

  if (response.status === 401) {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    window.location.href = '/login';
    throw new Error('Sesión expirada. Por favor inicie sesión nuevamente.');
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || errorData.error || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

export const geoApi = {
  /**
   * Obtiene miembros filtrados (soporta bounds para lazy loading por viewport).
   */
  getMembers: (filters = {}, signal) => {
    return fetchJson('/geo/members', { query: filters, signal });
  },

  /**
   * Obtiene células filtradas.
   */
  getCells: (filters = {}, signal) => {
    return fetchJson('/geo/cells', { query: filters, signal });
  },

  /**
   * Obtiene ambos de manera unificada.
   */
  getAll: (filters = {}, signal) => {
    return fetchJson('/geo/all', { query: filters, signal });
  },

  /**
   * Obtiene estadísticas de geocodificación.
   */
  getStats: (signal) => {
    return fetchJson('/geo/stats', { signal });
  },

  /**
   * Obtiene marcadores dentro de un área visible (viewport-driven lazy loading).
   */
  getBounds: (bounds, signal) => {
    return fetchJson('/geo/bounds', { query: bounds, signal });
  },

  /**
   * Obtiene entidades cercanas a un punto geográfico.
   */
  getNear: (lat, lng, radiusKm = 2.0, signal) => {
    return fetchJson('/geo/near', { query: { lat, lng, radiusKm }, signal });
  },

  /**
   * Actualiza la ubicación manual de un miembro (PATCH location).
   */
  updateMemberLocation: (id, locationData) => {
    return fetchJson(`/geo/member/${id}/location`, {
      method: 'PATCH',
      body: JSON.stringify(locationData),
    });
  },

  /**
   * Actualiza la dirección física de un miembro (PATCH address).
   */
  updateMemberAddress: (id, addressData) => {
    return fetchJson(`/geo/member/${id}/address`, {
      method: 'PATCH',
      body: JSON.stringify(addressData),
    });
  },

  /**
   * Actualiza la ubicación manual de una célula (PATCH location).
   */
  updateCellLocation: (id, locationData) => {
    return fetchJson(`/geo/cell/${id}/location`, {
      method: 'PATCH',
      body: JSON.stringify(locationData),
    });
  },

  /**
   * Actualiza la dirección física de una célula (PATCH address).
   */
  updateCellAddress: (id, addressData) => {
    return fetchJson(`/geo/cellGroup/${id}/address`, {
      method: 'PATCH',
      body: JSON.stringify(addressData),
    });
  },

  /**
   * Ejecuta la migración por lotes (batch one-shot).
   */
  batchMigrate: (type, triggeredBy = 'ADMIN') => {
    return fetchJson(`/geo/batch-migrate`, {
      method: 'POST',
      query: { type, triggeredBy },
    });
  },

  /**
   * Obtiene el historial de auditoría de migraciones en lote.
   */
  getMigrationLogs: (signal) => {
    return fetchJson('/geo/migration-logs', { signal });
  },

  /**
   * Obtiene miembros SIN geolocalización.
   */
  getMembersMissing: (signal) => {
    return fetchJson('/geo/members/missing', { signal });
  },

  /**
   * Obtiene miembros con geocodificación FALLIDA.
   */
  getMembersFailed: (signal) => {
    return fetchJson('/geo/members/failed', { signal });
  },

  /**
   * Obtiene células SIN geolocalización.
   */
  getCellsMissing: (signal) => {
    return fetchJson('/geo/cells/missing', { signal });
  },

  /**
   * Obtiene células con geocodificación FALLIDA.
   */
  getCellsFailed: (signal) => {
    return fetchJson('/geo/cells/failed', { signal });
  },

  /**
   * Re-geocodifica una selección de miembros y células.
   */
  batchRetry: (memberIds = [], cellIds = []) => {
    return fetchJson('/geo/batch-retry', {
      method: 'POST',
      body: JSON.stringify({ memberIds, cellIds }),
    });
  },

  /**
   * Autocomplete de ciudades usando Nominatim.
   */
  autocompleteCities: (query) => {
    return fetchJson('/geo/cities', { query: { q: query } });
  },
};
