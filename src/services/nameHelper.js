// src/utils/nameHelper.js

/**
 * Helper para manejar transformaciones de nombres en la aplicación
 * Mantiene los nombres originales en el backend, transforma solo en el frontend
 */

// ========== CONFIGURACIÓN DE REEMPLAZOS ==========
const NAME_REPLACEMENTS = {
  'RUBEN FRANCISCO CABEZAS QUIÑONES': 'PASTOR',
  'YAMILETH PEREZ ESCOBAR': 'PASTORA',
  // Agregar más reemplazos aquí según sea necesario
  // Formato: 'NOMBRE ORIGINAL': 'NOMBRE A MOSTRAR'
};

// ========== FUNCIONES PRINCIPALES ==========

/**
 * Obtiene el nombre a mostrar en el frontend
 * @param {string} originalName - Nombre original de la base de datos
 * @returns {string} - Nombre transformado para mostrar
 */
export const getDisplayName = (originalName) => {
  if (!originalName || typeof originalName !== 'string') {
    return originalName || '';
  }

  const upperName = originalName.toUpperCase().trim();
  
  // Buscar reemplazo exacto
  if (NAME_REPLACEMENTS[upperName]) {
    return NAME_REPLACEMENTS[upperName];
  }

  // También podemos manejar búsquedas parciales si es necesario
  // Ejemplo: si contiene "RUBEN" y "CABEZAS"
  // if (upperName.includes('RUBEN') && upperName.includes('CABEZAS')) {
  //   return 'PASTOR';
  // }

  return originalName; // Devolver original si no hay reemplazo
};

/**
 * Prepara un objeto para enviar al backend manteniendo nombres originales
 * @param {Object} data - Datos que contienen nombres a transformar
 * @param {Array<string>} nameFields - Campos que contienen nombres a mantener originales
 * @returns {Object} - Datos listos para enviar al backend
 */
export const prepareForBackend = (data, nameFields = ['name', 'teacher.name']) => {
  if (!data || typeof data !== 'object') {
    return data;
  }

  // Crear copia profunda para no modificar el original
  const result = JSON.parse(JSON.stringify(data));
  
  // Para cada campo que debe mantener el nombre original
  nameFields.forEach(field => {
    // Manejar campos anidados (ej: 'teacher.name')
    if (field.includes('.')) {
      const parts = field.split('.');
      let current = result;
      
      // Navegar hasta el último objeto antes del campo final
      for (let i = 0; i < parts.length - 1; i++) {
        if (current[parts[i]] && typeof current[parts[i]] === 'object') {
          current = current[parts[i]];
        } else {
          return; // Campo no existe
        }
      }
      
      const lastPart = parts[parts.length - 1];
      // Si el campo existe, asegurarse de que tenga el valor original
      // (esto es útil si el frontend ya transformó el nombre)
      if (current[lastPart] !== undefined) {
        // Nota: Aquí asumimos que el valor ya es el original
        // En caso de necesitar reversión, se podría implementar una función getOriginalName()
      }
    } else {
      // Campo simple
      if (result[field] !== undefined) {
        // Mantener el valor como está (asumiendo que es el original)
      }
    }
  });

  return result;
};

/**
 * Transforma nombres en un objeto para mostrar en el frontend
 * @param {Object} data - Datos que contienen nombres originales
 * @param {Array<string>} nameFields - Campos que contienen nombres a transformar
 * @returns {Object} - Datos con nombres transformados para vista
 */
export const transformForDisplay = (data, nameFields = ['name', 'teacher.name']) => {
  if (!data || typeof data !== 'object') {
    return data;
  }

  // Crear copia para no modificar el original
  const result = JSON.parse(JSON.stringify(data));
  
  nameFields.forEach(field => {
    if (field.includes('.')) {
      const parts = field.split('.');
      let current = result;
      
      for (let i = 0; i < parts.length - 1; i++) {
        if (current[parts[i]] && typeof current[parts[i]] === 'object') {
          current = current[parts[i]];
        } else {
          return;
        }
      }
      
      const lastPart = parts[parts.length - 1];
      if (current[lastPart] && typeof current[lastPart] === 'string') {
        current[lastPart] = getDisplayName(current[lastPart]);
      }
    } else {
      if (result[field] && typeof result[field] === 'string') {
        result[field] = getDisplayName(result[field]);
      }
    }
  });

  return result;
};

/**
 * Transforma un array de objetos para mostrar en el frontend
 * @param {Array<Object>} array - Array de objetos con nombres originales
 * @param {Array<string>} nameFields - Campos que contienen nombres a transformar
 * @returns {Array<Object>} - Array con nombres transformados
 */
export const transformArrayForDisplay = (array, nameFields = ['name', 'teacher.name']) => {
  if (!Array.isArray(array)) {
    return array || [];
  }

  return array.map(item => transformForDisplay(item, nameFields));
};

/**
 * Obtiene todos los reemplazos configurados
 * @returns {Object} - Objeto con todos los reemplazos
 */
export const getNameReplacements = () => {
  return { ...NAME_REPLACEMENTS };
};

/**
 * Agrega un nuevo reemplazo de nombre
 * @param {string} originalName - Nombre original (en mayúsculas)
 * @param {string} displayName - Nombre a mostrar
 */
export const addNameReplacement = (originalName, displayName) => {
  if (originalName && displayName) {
    NAME_REPLACEMENTS[originalName.toUpperCase().trim()] = displayName;
  }
};

/**
 * Verifica si un nombre tiene un reemplazo configurado
 * @param {string} name - Nombre a verificar
 * @returns {boolean} - True si tiene reemplazo
 */
export const hasNameReplacement = (name) => {
  if (!name || typeof name !== 'string') return false;
  return NAME_REPLACEMENTS[name.toUpperCase().trim()] !== undefined;
};

/**
 * Hook para usar en componentes React
 * @returns {Object} - Funciones del helper
 */
export const useNameHelper = () => {
  return {
    getDisplayName,
    prepareForBackend,
    transformForDisplay,
    transformArrayForDisplay,
    getNameReplacements,
    addNameReplacement,
    hasNameReplacement
  };
};

// Exportación por defecto - Asignar a variable antes de exportar
const nameHelper = {
  getDisplayName,
  prepareForBackend,
  transformForDisplay,
  transformArrayForDisplay,
  getNameReplacements,
  addNameReplacement,
  hasNameReplacement,
  useNameHelper
};

export default nameHelper;