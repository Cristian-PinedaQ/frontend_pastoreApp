import apiClient from "./apiClient";

const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://pastoreapp.cloud/api/v1';
//desarrollo
//const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api/v1';

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
const validateUsername = (username) => {
  if (!username || typeof username !== 'string') {
    throw new Error('Usuario inválido');
  }
  if (username.trim().length < 3 || username.trim().length > 50) {
    throw new Error('Usuario debe tener entre 3 y 50 caracteres');
  }
};

// ✅ CORREGIDO: Alineado con UsersPage.jsx
const validatePassword = (password) => {
  if (!password || typeof password !== 'string') {
    throw new Error('Contraseña inválida');
  }
  if (password.length < 12 || password.length > 128) {
    throw new Error('Contraseña debe tener entre 12 y 128 caracteres');
  }
  // ✅ Validación de complejidad
  if (!/[A-Z]/.test(password)) {
    throw new Error('Contraseña debe contener al menos una mayúscula');
  }
  if (!/[a-z]/.test(password)) {
    throw new Error('Contraseña debe contener al menos una minúscula');
  }
  if (!/[0-9]/.test(password)) {
    throw new Error('Contraseña debe contener al menos un número');
  }
  if (!/[!@#$%^&*()_+=\-[\]{};':"\\|,.<>/?]/.test(password)) {
    throw new Error('Contraseña debe contener al menos un carácter especial');
  }
};

const validateEmail = (email) => {
  if (!email || typeof email !== 'string') {
    throw new Error('Email inválido');
  }
  // Validación básica de email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new Error('Email no válido');
  }
};

const validateUserId = (userId) => {
  if (!userId || isNaN(userId) || parseInt(userId) <= 0) {
    throw new Error('ID de usuario inválido');
  }
};

class authService {
  constructor() {
    this.baseURL = `${API_BASE_URL}/auth`;
  }

  // ============ AUTENTICACIÓN ============

  // ✅ Obtener token guardado
  getToken() {
    return sessionStorage.getItem('token');
  }

  // Headers con autenticación
  getHeaders() {
    const token = this.getToken();
    const headers = {
      'Content-Type': 'application/json'
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  // ✅ Login CON SEGURIDAD MEJORADA
  async login(username, password) {
    try {
      // ✅ Validación de entrada
      validateUsername(username);
      // ✅ NOTA: Login usa validación más permisiva (8 caracteres) 
      // para permitir login con contraseñas antiguas
      if (!password || password.length < 8) {
        throw new Error('Contraseña debe tener al menos 8 caracteres');
      }

      log('🔐 [login] Iniciando login', { username });

      const response = await fetch(`${this.baseURL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Credenciales inválidas');
        }
        if (response.status === 403) {
          throw new Error('Cuenta deshabilitada');
        }
        throw new Error('Error de autenticación');
      }

      const data = await response.json();

      if (!data.token) {
        throw new Error('Token no recibido del servidor');
      }

      // ✅ Guardar en sessionStorage (se limpia automáticamente al cerrar la pestaña)
      sessionStorage.setItem('token', data.token);
      sessionStorage.setItem('user', JSON.stringify({
        id: data.id,
        username: data.username,
        email: data.email,
        name: data.name,
        roles: data.roles,
        passwordChangeRequired: data.passwordChangeRequired || false,
        passwordChangedAtLeastOnce: data.passwordChangedAtLeastOnce || false
      }));

      log('✅ [login] Login exitoso');

      return {
        token: data.token,
        id: data.id,
        username: data.username,
        email: data.email,
        name: data.name,
        roles: data.roles,
        passwordChangeRequired: data.passwordChangeRequired || false,
        passwordChangedAtLeastOnce: data.passwordChangedAtLeastOnce || false
      };
    } catch (error) {
      logError('❌ [login] Error:', error.message);
      throw error;
    }
  }

  // ✅ CORREGIDO: Registro de nuevo usuario
  // ✅ CORREGIDO: Registro de nuevo usuario usando apiClient
async register(username, email, password, role) {
  try {

    // mantener tus validaciones
    validateUsername(username);
    validateEmail(email);
    validatePassword(password);

    if (!role || typeof role !== "string") {
      throw new Error("Rol inválido");
    }

    log("📨 [register] Registrando usuario:", { username, email });

    const response = await apiClient.post("/auth/register", {
      username,
      email,
      password,
      roleName: role.toUpperCase()
    });

    log("✅ [register] Usuario registrado correctamente");

    return response.data;

  } catch (err) {

    const status = err?.response?.status;
    const data = err?.response?.data;

    let message = "Error al registrar usuario";

    // ✅ errores de validación enviados por Spring
    if (data?.fieldErrors) {
      message = Object.values(data.fieldErrors).join(". ");
    }
    else if (data?.message) {
      message = data.message;
    }
    else if (data?.error) {
      message = data.error;
    }
    else if (err.message) {
      message = err.message;
    }

    logError("❌ [register] Error:", message);

    const error = new Error(message);
    error.status = status;
    error.data = data;

    throw error;
  }
}

  // ✅ Verificar si el token es válido (sin exponer detalles)
  isTokenValid() {
    try {
      const token = this.getToken();
      if (!token) return false;

      // ⚠️ Solo decodifica - no valida firma (el backend lo hace)
      const payload = JSON.parse(atob(token.split('.')[1]));

      // Verificar si ha expirado
      if (!payload.exp) return false;

      return payload.exp * 1000 > Date.now();
    } catch (error) {
      logError('❌ [isTokenValid] Error validando token:', error.message);
      return false;
    }
  }

  // ✅ Logout (limpia sessionStorage)
  logout() {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    log('👋 [logout] Sesión cerrada');
  }

  // ============ GESTIÓN DE CONTRASEÑA ============

  /**
   * ✅ Cambiar contraseña del usuario actual
   * POST /api/v1/auth/change-password
   * @param {string} oldPassword - Contraseña actual
   * @param {string} newPassword - Nueva contraseña
   * @returns {Promise<Object>} Respuesta del servidor
   */
  async changePassword(oldPassword, newPassword) {
    try {
      // ✅ Validación de entrada
      if (!oldPassword || oldPassword.length < 8) {
        throw new Error('Contraseña actual inválida');
      }
      validatePassword(newPassword);

      if (oldPassword === newPassword) {
        throw new Error('La nueva contraseña debe ser diferente');
      }

      log('🔐 [changePassword] Cambiando contraseña');

      const response = await fetch(`${this.baseURL}/change-password`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          oldPassword,
          newPassword,
          confirmPassword: newPassword
        })
      });

      if (!response.ok) {
        if (response.status === 400) {
          throw new Error('Contraseña actual incorrecta');
        }
        if (response.status === 401) {
          throw new Error('Sesión expirada');
        }
        throw new Error('Error al cambiar contraseña');
      }

      const data = await response.json();
      log('✅ [changePassword] Contraseña cambiada exitosamente');

      return data;
    } catch (error) {
      logError('❌ [changePassword] Error:', error.message);
      throw error;
    }
  }

  /**
   * ✅ Verificar si el usuario necesita cambiar contraseña
   * GET /api/v1/auth/check-password-change-required
   * @returns {Promise<Object>} { changeRequired: boolean }
   */
  async checkPasswordChangeRequired() {
    try {
      log('🔍 [checkPasswordChangeRequired] Verificando cambio de contraseña');

      const response = await fetch(`${this.baseURL}/check-password-change-required`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      if (!response.ok) {
        // Si retorna 401, el usuario no está autenticado
        if (response.status === 401) {
          return { changeRequired: false };
        }
        throw new Error('Error al verificar cambio de contraseña');
      }

      const data = await response.json();
      log('✅ [checkPasswordChangeRequired] Resultado:', data);

      return data;
    } catch (error) {
      logError('❌ [checkPasswordChangeRequired] Error:', error.message);
      return { changeRequired: false };
    }
  }

  // ============ GESTIÓN DE USUARIOS ============

  /**
   * Obtener todos los usuarios
   * @returns {Promise<Array>} Lista de usuarios
   */
  async getAllUsers() {
    try {
      log('📋 [getAllUsers] Obteniendo usuarios');

      const response = await fetch(`${this.baseURL}/users`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('No autenticado');
        }
        if (response.status === 403) {
          throw new Error('Sin permisos');
        }
        throw new Error('Error al obtener usuarios');
      }

      const data = await response.json();
      log('✅ [getAllUsers] Usuarios obtenidos:', data.length);
      return data;
    } catch (error) {
      logError('❌ [getAllUsers] Error:', error.message);
      throw error;
    }
  }

  /**
   * Obtener un usuario específico por ID
   * @param {number} userId - ID del usuario
   * @returns {Promise<Object>} Datos del usuario
   */
  async getUserById(userId) {
    try {
      // ✅ Validación de entrada
      validateUserId(userId);

      log('👤 [getUserById] Obteniendo usuario:', { userId });

      const response = await fetch(`${this.baseURL}/users/${userId}`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Usuario no encontrado');
        }
        if (response.status === 401) {
          throw new Error('No autenticado');
        }
        if (response.status === 403) {
          throw new Error('Sin permisos');
        }
        throw new Error('Error al obtener usuario');
      }

      const data = await response.json();
      log('✅ [getUserById] Usuario obtenido');
      return data;
    } catch (error) {
      logError('❌ [getUserById] Error:', error.message);
      throw error;
    }
  }

  /**
   * ✅ MEJORADO: Actualizar un usuario existente
   * @param {number} userId - ID del usuario
   * @param {string} username - Nuevo username (opcional)
   * @param {string} email - Nuevo email (opcional)
   * @param {string} password - Nueva contraseña (opcional)
   * @returns {Promise<Object>} Datos del usuario actualizado
   */
  async updateUser(userId, username, email, password) {
    try {
      // ✅ Validación de entrada
      validateUserId(userId);

      const body = {};

      if (username) {
        validateUsername(username);
        body.username = username;
      }
      if (email) {
        validateEmail(email);
        body.email = email;
      }
      if (password) {
        validatePassword(password);
        body.password = password;
      }

      if (Object.keys(body).length === 0) {
        throw new Error('Debe proporcionar al menos un campo para actualizar');
      }

      log('✏️ [updateUser] Actualizando usuario:', { userId });

      const response = await fetch(`${this.baseURL}/users/${userId}`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Usuario no encontrado');
        }
        if (response.status === 403) {
          throw new Error('Sin permisos');
        }
        if (response.status === 400) {
          throw new Error('Datos inválidos');
        }
        if (response.status === 409) {
          throw new Error('El usuario ya existe');
        }
        throw new Error('Error al actualizar usuario');
      }

      const data = await response.json();
      log('✅ [updateUser] Usuario actualizado');
      return data;
    } catch (error) {
      logError('❌ [updateUser] Error:', error.message);
      throw error;
    }
  }

  /**
   * Eliminar un usuario
   * @param {number} userId - ID del usuario a eliminar
   * @returns {Promise<boolean>}
   */
  async deleteUser(userId) {
    try {
      // ✅ Validación de entrada
      validateUserId(userId);

      log('🗑️ [deleteUser] Eliminando usuario:', { userId });

      const response = await fetch(`${this.baseURL}/users/${userId}`, {
        method: 'DELETE',
        headers: this.getHeaders()
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Usuario no encontrado');
        }
        if (response.status === 403) {
          throw new Error('Sin permisos');
        }
        throw new Error('Error al eliminar usuario');
      }

      log('✅ [deleteUser] Usuario eliminado');
      return true;
    } catch (error) {
      logError('❌ [deleteUser] Error:', error.message);
      throw error;
    }
  }

  /**
   * ✅ Obtener datos del usuario actual de sessionStorage
   * @returns {Object|null} Datos del usuario o null
   */
  getCurrentUser() {
    try {
      const user = sessionStorage.getItem('user');
      return user ? JSON.parse(user) : null;
    } catch (error) {
      logError('❌ [getCurrentUser] Error parseando usuario:', error.message);
      return null;
    }
  }

  /**
   * ✅ Verifica si el usuario tiene un rol específico
   * Soporta roles con y sin prefijo ROLE_
   * 
   * @param {string} role - Nombre del rol
   * @returns {boolean} True si el usuario tiene el rol
   */
  hasRole(role) {
    try {
      const user = this.getCurrentUser();

      if (!user || !user.roles || !Array.isArray(user.roles)) {
        return false;
      }

      if (!role || typeof role !== 'string') {
        return false;
      }

      // ✅ Soportar ambos formatos: PASTORES y ROLE_PASTORES
      const roleWithPrefix = `ROLE_${role.toUpperCase()}`;
      const roleWithoutPrefix = role.toUpperCase();

      return user.roles.some((r) => {
        if (typeof r === 'string') {
          return r.toUpperCase() === roleWithPrefix || r.toUpperCase() === roleWithoutPrefix;
        }
        if (typeof r === 'object' && r.name) {
          return r.name.toUpperCase() === roleWithPrefix || r.name.toUpperCase() === roleWithoutPrefix;
        }
        return false;
      });
    } catch (error) {
      logError('❌ [hasRole] Error verificando rol:', error.message);
      return false;
    }
  }

  /**
   * ✅ Verifica si el usuario está autenticado
   * @returns {boolean}
   */
  isAuthenticated() {
    const token = this.getToken();
    const user = this.getCurrentUser();

    if (!token || !user) {
      return false;
    }

    return this.isTokenValid();
  }
}

const authServiceInstance = new authService();
export default authServiceInstance;
