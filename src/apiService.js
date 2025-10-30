// 🔌 Servicio API centralizado
// Este archivo maneja TODAS las comunicaciones con el backend

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api/v1';

class ApiService {
  constructor() {
    this.token = localStorage.getItem('token');
  }

  // ✅ Obtener headers con autenticación
  getHeaders() {
    return {
      'Content-Type': 'application/json',
      ...(this.token && { Authorization: `Bearer ${this.token}` }),
    };
  }

  // ✅ Método genérico para requests
  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const config = {
      ...options,
      headers: this.getHeaders(),
    };

    try {
      const response = await fetch(url, config);

      // Si el token expira (401), limpiar y redirigir al login
      if (response.status === 401) {
        this.logout();
        window.location.href = '/login';
        throw new Error('Token expirado');
      }

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || `Error ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error en API:', error);
      throw error;
    }
  }

  // 🔐 AUTENTICACIÓN - ✅ ACTUALIZADO para usar username
  async login(username, password) { // ✅ Cambiado de email a username
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }), // ✅ Envía username
    });

    if (data.token) {
      this.setToken(data.token);
    }

    return data;
  }

  async register(userData) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  setToken(token) {
    this.token = token;
    localStorage.setItem('token', token);
  }

  logout() {
    this.token = null;
    localStorage.removeItem('token');
  }

  // 👥 MIEMBROS
  async getMembers(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/member${queryString ? '?' + queryString : ''}`);
  }

  async getMemberById(id) {
    return this.request(`/member/${id}`);
  }

  async createMember(memberData) {
    return this.request('/member', {
      method: 'POST',
      body: JSON.stringify(memberData),
    });
  }

  async updateMember(id, memberData) {
    return this.request(`/member/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(memberData),
    });
  }

  async deleteMember(id) {
    return this.request(`/member/${id}`, {
      method: 'DELETE',
    });
  }

  // 📊 COHORTES (Enrollment)
  async getEnrollments(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/enrollment${queryString ? '?' + queryString : ''}`);
  }

  async createEnrollment(enrollmentData) {
    return this.request('/enrollment', {
      method: 'POST',
      body: JSON.stringify(enrollmentData),
    });
  }

  async updateEnrollment(id, enrollmentData) {
    return this.request(`/enrollment/${id}`, {
      method: 'PUT',
      body: JSON.stringify(enrollmentData),
    });
  }

  // 🎓 INSCRIPCIONES DE ESTUDIANTES
  async getStudentEnrollments(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/student-enrollment${queryString ? '?' + queryString : ''}`);
  }

  async createStudentEnrollment(data) {
    return this.request('/student-enrollment', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateStudentEnrollment(id, data) {
    return this.request(`/student-enrollment/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteStudentEnrollment(id) {
    return this.request(`/student-enrollment/${id}`, {
      method: 'DELETE',
    });
  }

  // 📖 LECCIONES
  async getLessons(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/lesson${queryString ? '?' + queryString : ''}`);
  }

  async createLesson(lessonData) {
    return this.request('/lesson', {
      method: 'POST',
      body: JSON.stringify(lessonData),
    });
  }

  // ✅ ASISTENCIAS
  async getAttendance(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/attendance${queryString ? '?' + queryString : ''}`);
  }

  async createAttendance(attendanceData) {
    return this.request('/attendance', {
      method: 'POST',
      body: JSON.stringify(attendanceData),
    });
  }

  async updateAttendance(id, attendanceData) {
    return this.request(`/attendance/${id}`, {
      method: 'PUT',
      body: JSON.stringify(attendanceData),
    });
  }

  // 👤 USUARIOS
  async getUsers() {
    return this.request('/users');
  }

  async updateUser(id, userData) {
    return this.request(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  }

  async deleteUser(id) {
    return this.request(`/users/${id}`, {
      method: 'DELETE',
    });
  }
}

export default new ApiService();