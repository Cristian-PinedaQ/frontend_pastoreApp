const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api/v1';

class authService {
  constructor() {
    this.baseURL = `${API_BASE_URL}/auth`;
  }

  // ============ AUTENTICACIÓN ============

  // ✅ ACTUALIZADO: Obtener token guardado (ahora usa sessionStorage)
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

  // ✅ ACTUALIZADO: Login (guarda en sessionStorage)
  async login(username, password) {
    try {
      const response = await fetch(`${this.baseURL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al iniciar sesión');
      }

      const data = await response.json();
      
      // ✅ Guardar en sessionStorage (se limpia automáticamente al cerrar la pestaña)
      sessionStorage.setItem('token', data.token);
      sessionStorage.setItem('user', JSON.stringify({
        username: data.username,
        email: data.email,
        roles: data.roles
      }));

      return {
        token: data.token,
        user: {
          username: data.username,
          email: data.email,
          roles: data.roles
        }
      };
    } catch (error) {
      throw new Error(error.message || 'Error de conexión');
    }
  }

  // Registro de nuevo usuario
  async register(username, email, password, roleName) {
    try {
      console.log("📨 Enviando datos al backend:", { username, email, roleName });

      // ✅ CORRECCIÓN: Usar this.baseURL y estructura correcta
      const res = await fetch(`${this.baseURL}/register`, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify({
          username,
          email,
          password,
          roleName: roleName.toUpperCase() // ✅ Asegurar que sea mayúscula
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Error registrando usuario');
      }

      const data = await res.json();
      console.log("⬅️ Respuesta backend al registrar:", data);

      // NO guardar token ni user en register
      return data; 
    } catch (error) {
      console.error("❌ Error al registrar usuario:", error);
      throw error;
    }
  }

  // Verificar si el token es válido
  isTokenValid() {
    const token = this.getToken();
    if (!token) return false;

    try {
      // Decodificar payload del JWT
      const payload = JSON.parse(atob(token.split('.')[1]));
      // Verificar si ha expirado
      return payload.exp * 1000 > Date.now();
    } catch (error) {
      return false;
    }
  }

  // ✅ ACTUALIZADO: Logout (limpia sessionStorage)
  logout() {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
  }

  // ============ GESTIÓN DE USUARIOS ============

  /**
   * Obtener todos los usuarios
   * @returns {Promise<Array>} Lista de usuarios
   */
  async getAllUsers() {
    try {
      const response = await fetch(`${this.baseURL}/users`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('No autenticado. Por favor inicia sesión nuevamente.');
        }
        if (response.status === 403) {
          throw new Error('No tienes permisos para ver usuarios. Solo PASTORES pueden hacerlo.');
        }
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al obtener usuarios');
      }

      return await response.json();
    } catch (error) {
      throw new Error(error.message || 'Error al obtener usuarios');
    }
  }

  /**
   * Obtener un usuario específico por ID
   * @param {number} userId - ID del usuario
   * @returns {Promise<Object>} Datos del usuario
   */
  async getUserById(userId) {
    try {
      const response = await fetch(`${this.baseURL}/users/${userId}`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`Usuario con ID ${userId} no encontrado`);
        }
        if (response.status === 401) {
          throw new Error('No autenticado');
        }
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al obtener usuario');
      }

      return await response.json();
    } catch (error) {
      throw new Error(error.message || 'Error al obtener usuario');
    }
  }

  /**
   * Actualizar un usuario existente
   * @param {number} userId - ID del usuario
   * @param {string} username - Nuevo username (opcional)
   * @param {string} email - Nuevo email (opcional)
   * @param {string} password - Nueva contraseña (opcional)
   * @returns {Promise<Object>} Datos del usuario actualizado
   */
  async updateUser(userId, username, email, password) {
    try {
      const body = {};
      
      if (username) body.username = username;
      if (email) body.email = email;
      if (password) body.password = password;

      const response = await fetch(`${this.baseURL}/users/${userId}`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`Usuario con ID ${userId} no encontrado`);
        }
        if (response.status === 403) {
          throw new Error('No tienes permisos para actualizar este usuario');
        }
        if (response.status === 400) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Datos inválidos. El email o username ya están en uso.');
        }
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al actualizar usuario');
      }

      return await response.json();
    } catch (error) {
      throw new Error(error.message || 'Error al actualizar usuario');
    }
  }

  /**
   * Eliminar un usuario
   * @param {number} userId - ID del usuario a eliminar
   * @returns {Promise<void>}
   */
  async deleteUser(userId) {
    try {
      const response = await fetch(`${this.baseURL}/users/${userId}`, {
        method: 'DELETE',
        headers: this.getHeaders()
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`Usuario con ID ${userId} no encontrado`);
        }
        if (response.status === 403) {
          throw new Error('No tienes permisos para eliminar usuarios');
        }
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al eliminar usuario');
      }

      return response.ok;
    } catch (error) {
      throw new Error(error.message || 'Error al eliminar usuario');
    }
  }

  /**
   * ✅ ACTUALIZADO: Obtener datos del usuario actual de sessionStorage
   * @returns {Object|null} Datos del usuario o null
   */
  getCurrentUser() {
    const user = sessionStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  }

  /**
   * ✅ CORREGIDO: Verifica si el usuario tiene un rol específico
   * Soporta roles con y sin prefijo ROLE_
   * 
   * Ejemplos:
   * - hasRole('PASTORES') - funciona si el rol es "PASTORES" o "ROLE_PASTORES"
   * - hasRole('PROFESORES') - funciona si el rol es "PROFESORES" o "ROLE_PROFESORES"
   * 
   * @param {string} role - Nombre del rol
   * @returns {boolean} True si el usuario tiene el rol
   */
  hasRole(role) {
    const user = this.getCurrentUser();
    if (!user || !user.roles) {
      return false;
    }

    // ✅ Soportar ambos formatos: PASTORES y ROLE_PASTORES
    const roleWithPrefix = `ROLE_${role}`;
    const roleWithoutPrefix = role;
    
    const hasRoleWithPrefix = user.roles.includes(roleWithPrefix);
    const hasRoleWithoutPrefix = user.roles.includes(roleWithoutPrefix);
    
    return hasRoleWithPrefix || hasRoleWithoutPrefix;
  }
}

export default new authService();