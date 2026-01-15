// ============================================
// utils/securityLogger.js
// ============================================

/**
 * Logger seguro que envía logs al servidor
 * sin exponer información sensible en DevTools
 */

const logToServer = async (event, context = {}, severity = 'info') => {
  try {
    // NO loguear al servidor detalles sensibles
    const safeLog = {
      timestamp: new Date().toISOString(),
      event,
      severity,
      userAgent: navigator.userAgent,
      url: window.location.pathname,
      // Contexto limitado
      ...context,
      // NUNCA incluir:
      // - passwords
      // - tokens
      // - PII (información personal)
      // - errores detallados del servidor
    };

    // Enviar al servidor de logging
    await fetch('/api/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(safeLog),
      // No esperar respuesta (fire and forget)
      keepalive: true
    });
  } catch (err) {
    // Si falla el logging, silenciar (no romper la app)
    // En desarrollo, solo en consola:
    if (process.env.NODE_ENV === 'development') {
      console.warn('[LogError]', event);
    }
  }
};

export const logError = (context) => {
  logToServer('frontend_error', context, 'error');
};

export const logSecurityEvent = (event, context) => {
  logToServer(event, context, 'warning');
};

export const logUserAction = (action, context) => {
  logToServer(`user_action_${action}`, context, 'info');
};


// ============================================
// utils/validators.js
// ============================================

/**
 * Validadores de entrada seguros
 */

export const validators = {
  /**
   * Validar username
   */
  username: (value) => {
    const errors = [];
    
    if (!value || value.length < 3) {
      errors.push('Mínimo 3 caracteres');
    }
    if (value.length > 50) {
      errors.push('Máximo 50 caracteres');
    }
    if (!/^[a-zA-Z0-9._-]+$/.test(value)) {
      errors.push('Solo letras, números, puntos, guiones');
    }
    
    return { valid: errors.length === 0, errors };
  },

  /**
   * Validar email
   */
  email: (value) => {
    const errors = [];
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!value) {
      errors.push('Email requerido');
    } else if (!emailRegex.test(value)) {
      errors.push('Email inválido');
    } else if (value.length > 150) {
      errors.push('Email muy largo');
    }
    
    return { valid: errors.length === 0, errors };
  },

  /**
   * Validar contraseña fuerte
   */
  password: (value) => {
    const errors = [];
    
    if (!value) {
      errors.push('Contraseña requerida');
    } else {
      if (value.length < 12) {
        errors.push('Mínimo 12 caracteres');
      }
      if (!/[A-Z]/.test(value)) {
        errors.push('Debe contener mayúscula (A-Z)');
      }
      if (!/[a-z]/.test(value)) {
        errors.push('Debe contener minúscula (a-z)');
      }
      if (!/[0-9]/.test(value)) {
        errors.push('Debe contener número (0-9)');
      }
      if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(value)) {
        errors.push('Debe contener carácter especial (!@#$%...)');
      }
      if (value.length > 100) {
        errors.push('Máximo 100 caracteres');
      }
    }
    
    return { valid: errors.length === 0, errors };
  },

  /**
   * Validar rol
   */
  role: (value) => {
    const validRoles = ['PASTORES', 'PROFESORES', 'AREAS', 'GANANDO'];
    const valid = validRoles.includes(value);
    
    return {
      valid,
      errors: valid ? [] : ['Rol inválido']
    };
  }
};


// ============================================
// utils/sanitizers.js
// ============================================

/**
 * Sanitizadores de datos
 */

export const sanitize = {
  /**
   * Escapar HTML para prevenir XSS
   */
  html: (text) => {
    if (!text) return '';
    
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    
    return String(text).replace(/[&<>"']/g, m => map[m]);
  },

  /**
   * Enmascarar email (muestra solo parte del usuario)
   */
  maskEmail: (email) => {
    if (!email || !email.includes('@')) return '***';
    
    const [name, domain] = email.split('@');
    const visibleChars = Math.max(1, Math.floor(name.length / 2));
    const masked = name.substring(0, visibleChars) + 
                   '*'.repeat(Math.max(1, name.length - visibleChars));
    
    return `${masked}@${domain}`;
  },

  /**
   * Enmascarar teléfono
   */
  maskPhone: (phone) => {
    if (!phone) return '***';
    const last4 = phone.slice(-4);
    return `****${last4}`;
  },

  /**
   * Enmascarar nombre completo
   */
  maskFullName: (fullName) => {
    if (!fullName) return '***';
    const parts = fullName.split(' ');
    if (parts.length === 0) return '***';
    
    return parts.map((part, i) => {
      if (i === 0) return part.charAt(0) + '*'.repeat(part.length - 1);
      return part.charAt(0) + '*'.repeat(part.length - 1);
    }).join(' ');
  },

  /**
   * Remover caracteres peligrosos
   */
  removeSpecialChars: (text, allowedChars = '') => {
    if (!text) return '';
    const regex = new RegExp(`[^a-zA-Z0-9${allowedChars}]`, 'g');
    return text.replace(regex, '');
  }
};


// ============================================
// utils/apiClient.js
// ============================================

/**
 * Cliente HTTP seguro con manejo de errores
 */

export class SecureApiClient {
  constructor(baseURL) {
    this.baseURL = baseURL;
    this.csrfToken = null;
  }

  /**
   * Obtener CSRF token del servidor
   */
  async getCsrfToken() {
    try {
      const response = await fetch(`${this.baseURL}/csrf-token`);
      if (!response.ok) throw new Error('Failed to get CSRF token');
      
      const data = await response.json();
      this.csrfToken = data.csrfToken;
      return this.csrfToken;
    } catch (err) {
      logError({ code: 'csrf_token_error', message: 'Falló obtención de token' });
      throw new Error('Security error');
    }
  }

  /**
   * Request seguro con CSRF protection
   */
  async request(endpoint, options = {}) {
    try {
      // Asegurar CSRF token para POST/PUT/DELETE
      if (['POST', 'PUT', 'DELETE'].includes(options.method)) {
        if (!this.csrfToken) {
          await this.getCsrfToken();
        }
        
        options.headers = options.headers || {};
        options.headers['X-CSRF-Token'] = this.csrfToken;
      }

      const response = await fetch(`${this.baseURL}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        }
      });

      // ✅ SEGURIDAD: Manejo seguro de errores
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        // Mapear código de error a mensaje seguro
        const errorCode = response.status;
        const errorMessage = this.getErrorMessage(errorCode, errorData.error);
        
        const error = new Error(errorMessage);
        error.code = errorCode;
        error.originalMessage = errorData.error; // Para debugging en dev
        
        logSecurityEvent('api_error', {
          endpoint,
          statusCode: errorCode,
          // NO incluir detalles del servidor
        });
        
        throw error;
      }

      return await response.json();
    } catch (err) {
      // ✅ SEGURIDAD: No revelar detalles de error
      if (err.message === 'Failed to fetch') {
        throw new Error('Error de conexión');
      }
      throw err;
    }
  }

  /**
   * GET request
   */
  get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  }

  /**
   * POST request
   */
  post(endpoint, data) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  /**
   * PUT request
   */
  put(endpoint, data) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  /**
   * DELETE request
   */
  delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }

  /**
   * Mapear códigos de error a mensajes seguros
   */
  getErrorMessage(code, defaultMessage) {
    const messages = {
      400: 'Datos inválidos',
      401: 'No autorizado',
      403: 'No tienes permisos',
      404: 'Recurso no encontrado',
      409: 'El registro ya existe',
      429: 'Demasiadas solicitudes. Intenta más tarde',
      500: 'Error del servidor',
      503: 'Servicio no disponible'
    };

    return messages[code] || 'Error al procesar la solicitud';
  }
}

// Uso:
// const apiClient = new SecureApiClient('/api');
// const users = await apiClient.get('/users');
// await apiClient.post('/users', userData);


// ============================================
// utils/contentSecurityPolicy.js
// ============================================

/**
 * Verificar y enforcar CSP (Content Security Policy)
 */

export const initCSP = () => {
  // Verificar que CSP esté configurado en el servidor
  // En desarrollo, solo warnings:
  
  if (process.env.NODE_ENV === 'development') {
    console.log('CSP Status:');
    const meta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
    if (meta) {
      console.log('✅ CSP Configured:', meta.content);
    } else {
      console.warn('⚠️ CSP not configured in this document');
    }
  }
};


// ============================================
// utils/throttle.js
// ============================================

/**
 * Throttle para prevenir múltiples requests
 */

export const throttle = (func, limit) => {
  let inThrottle;
  
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
};

/**
 * Debounce para campos de búsqueda
 */
export const debounce = (func, delay) => {
  let timeoutId;
  
  return function(...args) {
    if (timeoutId) clearTimeout(timeoutId);
    
    timeoutId = setTimeout(() => {
      func.apply(this, args);
    }, delay);
  };
};


// ============================================
// Usage Example
// ============================================

/**
 * 
 * import { validators, sanitize, SecureApiClient, throttle } from './utils';
 * 
 * // Validar entrada
 * const validation = validators.email('user@example.com');
 * if (!validation.valid) {
 *   setError(validation.errors.join(', '));
 * }
 * 
 * // Sanitizar para mostrar
 * const displayEmail = sanitize.maskEmail(email);
 * 
 * // Request seguro
 * const api = new SecureApiClient('/api');
 * const users = await api.get('/users');
 * 
 * // Throttle para evitar spam
 * const throttledDelete = throttle(() => handleDelete(id), 2000);
 * 
 */