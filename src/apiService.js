// 🔌 Servicio API centralizado - VERSIÓN LIMPIA SIN DUPLICADOS
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

  // ========== 🔐 AUTENTICACIÓN ==========
  async login(username, password) {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
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

  // ========== 👥 MIEMBROS ==========
  /**
   * Obtener miembros con paginación
   * GET /api/v1/member?page=0&limit=10
   */
  async getMembers(page = 0, limit = 10) {
    return this.request(`/member?page=${page}&limit=${limit}`);
  }

  /**
   * Obtener un miembro por ID
   * GET /api/v1/member/find/{id}
   */
  async getMemberById(id) {
    return this.request(`/member/find/${id}`);
  }

  /**
   * Obtener todos los miembros sin paginación
   * GET /api/v1/member/findAll
   */
  async getAllMembers() {
    return this.request('/member/findAll');
  }

  /**
   * Crear nuevo miembro
   * POST /api/v1/member/save
   */
  async createMember(memberData) {
    return this.request('/member/save', {
      method: 'POST',
      body: JSON.stringify(memberData),
    });
  }

  /**
   * Actualizar miembro existente
   * PATCH /api/v1/member/patch/{id}
   */
  async updateMember(id, memberData) {
    return this.request(`/member/patch/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(memberData),
    });
  }

  /**
   * Eliminar miembro
   * DELETE /api/v1/member/delete/{id}
   */
  async deleteMember(id) {
    return this.request(`/member/delete/${id}`, {
      method: 'DELETE',
    });
  }

  /**
   * Inscribir miembro en siguiente nivel
   * POST /api/v1/member/enroll-next-level/{id}
   */
  async enrollMemberInNextLevel(id) {
    return this.request(`/member/enroll-next-level/${id}`, {
      method: 'POST',
    });
  }

  /**
   * Obtener historial de inscripciones de un miembro
   * GET /api/v1/member/enrollment-history/{id}
   */
  async getMemberEnrollmentHistory(id) {
    return this.request(`/member/enrollment-history/${id}`);
  }

  // ========== 📋 COHORTES (ENROLLMENTS) ==========
  /**
   * Obtener cohortes/enrollments con paginación
   * GET /api/v1/enrollment?page=0&limit=10
   */
  async getEnrollments(page = 0, limit = 10) {
    return this.request(`/enrollment?page=${page}&limit=${limit}`);
  }

  /**
   * Obtener una cohorte por ID
   * GET /api/v1/enrollment/cohorts/find/{id}
   */
  async getEnrollmentById(id) {
    return this.request(`/enrollment/cohorts/find/${id}`);
  }

  /**
   * Obtener cohortes disponibles por nivel
   * GET /api/v1/enrollment/available-cohorts/{level}
   */
  async getAvailableCohorts(level) {
    return this.request(`/enrollment/available-cohorts/${level}`);
  }

  /**
   * Crear nueva cohorte
   * POST /api/v1/enrollment
   */
  async createEnrollment(enrollmentData) {
    return this.request('/enrollment', {
      method: 'POST',
      body: JSON.stringify(enrollmentData),
    });
  }

  /**
   * Actualizar cohorte
   * PUT /api/v1/enrollment/{id}
   */
  async updateEnrollment(id, enrollmentData) {
    return this.request(`/enrollment/${id}`, {
      method: 'PUT',
      body: JSON.stringify(enrollmentData),
    });
  }

  // ========== 🎓 INSCRIPCIONES DE ESTUDIANTES ==========
  /**
   * Obtener inscripciones de estudiantes con paginación
   * GET /api/v1/student-enrollment?page=0&limit=10
   */
  async getStudentEnrollments(page = 0, limit = 10) {
    return this.request(`/student-enrollment?page=${page}&limit=${limit}`);
  }

  /**
   * Obtener detalles de una inscripción específica
   * GET /api/v1/student-enrollment/{id}
   */
  async getStudentEnrollmentById(id) {
    return this.request(`/student-enrollment/${id}`);
  }

  /**
   * Obtener inscripciones de un miembro específico
   * GET /api/v1/student-enrollment/by-member/{memberId}
   */
  async getStudentEnrollmentsByMember(memberId) {
    return this.request(`/student-enrollment/by-member/${memberId}`);
  }

  /**
   * Crear nueva inscripción de estudiante en una cohorte
   * POST /api/v1/student-enrollment?memberId=X&enrollmentId=Y
   */
  async createStudentEnrollment(memberId, enrollmentId) {
    return this.request(`/student-enrollment?memberId=${memberId}&enrollmentId=${enrollmentId}`, {
      method: 'POST',
    });
  }

  /**
   * Actualizar inscripción de estudiante
   * PUT /api/v1/student-enrollment/{id}?status=X&finalAttendancePercentage=Y&passed=Z
   */
  async updateStudentEnrollment(id, updateData) {
    let url = `/student-enrollment/${id}?`;
    const params = [];
    if (updateData.status) params.push(`status=${updateData.status}`);
    if (updateData.finalAttendancePercentage !== undefined) 
      params.push(`finalAttendancePercentage=${updateData.finalAttendancePercentage}`);
    if (updateData.passed !== undefined) params.push(`passed=${updateData.passed}`);
    
    url += params.join('&');
    
    return this.request(url, {
      method: 'PUT',
    });
  }

  /**
   * Dar de baja a un estudiante (cambiar estado a CANCELLED)
   * POST /api/v1/student-enrollment/{id}/withdraw
   */
  async withdrawStudentFromCohort(id) {
    return this.request(`/student-enrollment/${id}/withdraw`, {
      method: 'POST',
    });
  }

  /**
   * Eliminar inscripción
   * DELETE /api/v1/student-enrollment/{id}
   */
  async deleteStudentEnrollment(id) {
    return this.request(`/student-enrollment/${id}`, {
      method: 'DELETE',
    });
  }

  /**
   * Obtener reporte detallado de una inscripción
   * GET /api/v1/student-enrollment/{id}/detailed-report
   */
  async getStudentDetailedReport(id) {
    return this.request(`/student-enrollment/${id}/detailed-report`);
  }

  // ========== 📖 LECCIONES ==========
  /**
   * Obtener lecciones con paginación
   * GET /api/v1/lesson?page=0&limit=10
   */
  async getLessons(page = 0, limit = 10) {
    return this.request(`/lesson?page=${page}&limit=${limit}`);
  }

  /**
   * Obtener una lección por ID
   * GET /api/v1/lesson/{id}
   */
  async getLessonById(id) {
    return this.request(`/lesson/${id}`);
  }

  /**
   * Obtener lecciones de una cohorte
   * GET /api/v1/lesson/enrollment/{enrollmentId}
   */
  async getLessonsByEnrollment(enrollmentId) {
    return this.request(`/lesson/enrollment/${enrollmentId}`);
  }

  /**
   * Crear nueva lección
   * POST /api/v1/lesson
   */
  async createLesson(lessonData) {
    return this.request('/lesson', {
      method: 'POST',
      body: JSON.stringify(lessonData),
    });
  }

  /**
   * Actualizar lección
   * PUT /api/v1/lesson/{id}
   */
  async updateLesson(id, lessonData) {
    return this.request(`/lesson/${id}`, {
      method: 'PUT',
      body: JSON.stringify(lessonData),
    });
  }

  /**
   * Eliminar lección
   * DELETE /api/v1/lesson/{id}
   */
  async deleteLesson(id) {
    return this.request(`/lesson/${id}`, {
      method: 'DELETE',
    });
  }

  // ========== ✅ ASISTENCIAS ==========
  /**
   * Registrar asistencia de un estudiante
   * POST /api/v1/attendance/record
   */
  async recordAttendance(attendanceData) {
    return this.request('/attendance/record', {
      method: 'POST',
      body: JSON.stringify(attendanceData),
    });
  }

  /**
   * Inicializar asistencias para una lección
   * POST /api/v1/attendance/lesson/{lessonId}/initialize
   */
  async initializeLessonAttendance(lessonId) {
    return this.request(`/attendance/lesson/${lessonId}/initialize`, {
      method: 'POST',
    });
  }

  /**
   * Obtener asistencias de una lección
   * GET /api/v1/attendance/lesson/{lessonId}
   */
  async getAttendancesByLesson(lessonId) {
    return this.request(`/attendance/lesson/${lessonId}`);
  }

  /**
   * Obtener reporte de asistencia de un estudiante
   * GET /api/v1/attendance/student/{studentId}/report
   */
  async getStudentAttendanceReport(studentId) {
    return this.request(`/attendance/student/${studentId}/report`);
  }

  /**
   * Actualizar asistencia
   * PUT /api/v1/attendance/{id}
   */
  async updateAttendance(id, attendanceData) {
    return this.request(`/attendance/${id}`, {
      method: 'PUT',
      body: JSON.stringify(attendanceData),
    });
  }

  // ========== 👤 USUARIOS ==========
  /**
   * Obtener todos los usuarios
   * GET /api/v1/users
   */
  async getUsers() {
    return this.request('/users');
  }

  /**
   * Actualizar usuario
   * PUT /api/v1/users/{id}
   */
  async updateUser(id, userData) {
    return this.request(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  }

  /**
   * Eliminar usuario
   * DELETE /api/v1/users/{id}
   */
  async deleteUser(id) {
    return this.request(`/users/${id}`, {
      method: 'DELETE',
    });
  }
}

export default new ApiService();
