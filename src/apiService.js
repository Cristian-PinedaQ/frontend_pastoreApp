// 🔌 Servicio API centralizado - SEGURIDAD MEJORADA
// ✅ Debug condicional (no expone datos en producción)
// ✅ Validación de entrada
// ✅ Mensajes de error genéricos
// ✅ Export con nombre (ESLint compliance)

//Produccion
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
const validateId = (id, fieldName = 'ID') => {
  if (!id || isNaN(id) || parseInt(id) <= 0) {
    throw new Error(`${fieldName} inválido`);
  }
};

const validatePageParams = (page, limit) => {
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);

  if (isNaN(pageNum) || pageNum < 0 || isNaN(limitNum) || limitNum <= 0) {
    throw new Error('Parámetros de paginación inválidos');
  }
};

const validateString = (value, fieldName, minLength = 1, maxLength = 255) => {
  if (!value || typeof value !== 'string') {
    throw new Error(`${fieldName} requerido`);
  }
  if (value.trim().length < minLength || value.trim().length > maxLength) {
    throw new Error(`${fieldName} inválido`);
  }
};

const validateNumber = (value, fieldName, min = 0, max = null) => {
  const num = parseFloat(value);
  if (isNaN(num) || num < min) {
    throw new Error(`${fieldName} inválido`);
  }
  if (max !== null && num > max) {
    throw new Error(`${fieldName} excede el máximo permitido`);
  }
  return num;
};

class ApiService {

  // ✅ Obtener usuario actual del sessionStorage
  getCurrentUser() {
    try {
      const user = sessionStorage.getItem('user');
      return user ? JSON.parse(user) : null;
    } catch (error) {
      logError('❌ [getCurrentUser] Error parseando usuario:', error.message);
      return null;
    }
  }

  // ✅ Obtener headers con autenticación DINÁMICAMENTE
  getHeaders() {
    const token = sessionStorage.getItem('token');
    const headers = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      log('🔑 [ApiService] Token incluido en headers');
    } else {
      log('⚠️ [ApiService] Sin token en sessionStorage');
    }

    return headers;
  }

  // ✅ Método genérico para requests CON SEGURIDAD MEJORADA
  async request(endpoint, options = {}, extraHeaders = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const config = {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...extraHeaders,  // ← permite inyectar headers adicionales por llamada
      },
    };

    try {
      log('📡 [request] Iniciando:', { method: config.method || 'GET', endpoint });

      const response = await fetch(url, config);

      if (response.status === 401) {
        log('⚠️ [request] Token expirado (401)');
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
        window.dispatchEvent(new CustomEvent('authTokenExpired'));
        throw new Error('Sesión expirada');
      }

      if (!response.ok) {
        let errorData = {};
        try {
          errorData = await response.json();
        } catch (e) {
          errorData = { message: `Error ${response.status}` };
        }

        logError('❌ [request] Error del servidor:', JSON.stringify(errorData));

        // ✅ CREAR UN OBJETO DE ERROR ENRIQUECIDO
        const enhancedError = new Error();
        enhancedError.status = response.status;
        enhancedError.statusText = response.statusText;
        enhancedError.data = errorData; // Guardar los datos completos del error
        enhancedError.response = {
          status: response.status,
          statusText: response.statusText,
          data: errorData,
          headers: Object.fromEntries(response.headers.entries())
        };

        // Extraer mensaje para el error estándar
        let errorMessage = '';
        if (errorData.fieldErrors && typeof errorData.fieldErrors === 'object') {
          const fieldErrors = Object.entries(errorData.fieldErrors)
            .map(([field, message]) => `${field}: ${message}`)
            .join(' | ');
          errorMessage = fieldErrors;
        } else if (typeof errorData === 'string') {
          errorMessage = errorData;
        } else if (errorData.message) {
          errorMessage = typeof errorData.message === 'string'
            ? errorData.message
            : JSON.stringify(errorData.message);
        } else if (errorData.error) {
          errorMessage = typeof errorData.error === 'string'
            ? errorData.error
            : JSON.stringify(errorData.error);
        } else {
          errorMessage = DEBUG ? JSON.stringify(errorData) : 'Error en la solicitud';
        }

        enhancedError.message = errorMessage;
        logError('❌ [request] Mensaje:', errorMessage);

        throw enhancedError; // Lanzar el error enriquecido
      }

      const contentType = response.headers.get('content-type');
      const hasBody = contentType && contentType.includes('application/json');
      const data = hasBody ? await response.json() : null;
      log('✅ [request] Exitoso');
      return data;

    } catch (error) {
      logError('🔴 [request] Error:', error.message);
      throw error;
    }
  }

  // ========== 🔐 AUTENTICACIÓN ==========
  async login(username, password) {
    try {
      validateString(username, 'Username', 3, 50);
      validateString(password, 'Password', 8, 128);

      const data = await this.request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });

      if (data.token) {
        this.setToken(data.token);
      }

      return data;
    } catch (error) {
      logError('❌ [login] Error:', error.message);
      throw error;
    }
  }

  async register(userData) {
    try {
      if (!userData || typeof userData !== 'object') {
        throw new Error('Datos de registro inválidos');
      }

      return this.request('/auth/register', {
        method: 'POST',
        body: JSON.stringify(userData),
      });
    } catch (error) {
      logError('❌ [register] Error:', error.message);
      throw error;
    }
  }

  // ✅ Guardar token en sessionStorage
  setToken(token) {
    if (!token || typeof token !== 'string') {
      throw new Error('Token inválido');
    }
    sessionStorage.setItem('token', token);
    log('✅ [setToken] Token guardado');
  }

  // ✅ Logout - limpiar sessionStorage
  logout() {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    log('👋 [logout] Sesión cerrada');
  }

  // ========== 👥 MIEMBROS ==========
  async getMembers(page = 0, limit = 10) {
    try {
      validatePageParams(page, limit);
      return this.request(`/member?page=${page}&limit=${limit}`);
    } catch (error) {
      logError('❌ [getMembers] Error:', error.message);
      throw error;
    }
  }

  async getMemberById(id) {
    try {
      validateId(id, 'memberId');
      return this.request(`/member/find/${id}`);
    } catch (error) {
      logError('❌ [getMemberById] Error:', error.message);
      throw error;
    }
  }

  async getAllMembers() {
    try {
      return this.request('/member/findAll');
    } catch (error) {
      logError('❌ [getAllMembers] Error:', error.message);
      throw error;
    }
  }

  async createMember(memberData) {
    try {
      if (!memberData || typeof memberData !== 'object') {
        throw new Error('Datos de miembro inválidos');
      }
      return this.request('/member/save', {
        method: 'POST',
        body: JSON.stringify(memberData),
      });
    } catch (error) {
      logError('❌ [createMember] Error:', error.message);
      throw error;
    }
  }

  async updateMember(id, memberData) {
    try {
      validateId(id, 'memberId');
      if (!memberData || typeof memberData !== 'object') {
        throw new Error('Datos de miembro inválidos');
      }
      return this.request(`/member/patch/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(memberData),
      });
    } catch (error) {
      logError('❌ [updateMember] Error:', error.message);
      throw error;
    }
  }

  async deleteMember(id) {
    try {
      validateId(id, 'memberId');
      return this.request(`/member/delete/${id}`, {
        method: 'DELETE',
      });
    } catch (error) {
      logError('❌ [deleteMember] Error:', error.message);
      throw error;
    }
  }

  async enrollMemberInNextLevel(id) {
    try {
      validateId(id, 'memberId');
      return this.request(`/member/enroll-next-level/${id}`, {
        method: 'POST',
      });
    } catch (error) {
      logError('❌ [enrollMemberInNextLevel] Error:', error.message);
      throw error;
    }
  }

  async getMemberEnrollmentHistory(id) {
    try {
      validateId(id, 'memberId');
      return this.request(`/member/enrollment-history/${id}`);
    } catch (error) {
      logError('❌ [getMemberEnrollmentHistory] Error:', error.message);
      throw error;
    }
  }

  // ========== 📋 COHORTES (ENROLLMENTS) ==========

  async getEnrollments() {
    try {
      return this.request('/enrollment/cohorts/findAll');
    } catch (error) {
      logError('❌ [getEnrollments] Error:', error.message);
      throw error;
    }
  }

  async getEnrollmentsCard() {
    try {
      return this.request('/enrollment');
    } catch (error) {
      logError('❌ [getEnrollmentsCard] Error:', error.message);
      throw error;
    }
  }

  async getEnrollmentsPaginated(page = 0, limit = 10) {
    try {
      validatePageParams(page, limit);
      return this.request(`/enrollment?page=${page}&limit=${limit}`);
    } catch (error) {
      logError('❌ [getEnrollmentsPaginated] Error:', error.message);
      throw error;
    }
  }

  async getEnrollmentById(id) {
    try {
      validateId(id, 'enrollmentId');
      return this.request(`/enrollment/cohorts/find/${id}`);
    } catch (error) {
      logError('❌ [getEnrollmentById] Error:', error.message);
      throw error;
    }
  }

  async getAvailableCohortsByLevel(level) {
    try {
      validateString(level, 'Level', 1, 50);
      return this.request(`/enrollment/available-cohorts/${level}`);
    } catch (error) {
      logError('❌ [getAvailableCohortsByLevel] Error:', error.message);
      throw error;
    }
  }

  async createEnrollment(enrollmentData) {
    try {
      if (!enrollmentData || typeof enrollmentData !== 'object') {
        throw new Error('Datos de cohorte inválidos');
      }
      return this.request('/enrollment/create-cohort', {
        method: 'POST',
        body: JSON.stringify(enrollmentData),
      });
    } catch (error) {
      logError('❌ [createEnrollment] Error:', error.message);
      throw error;
    }
  }

  async updateEnrollmentStatus(id, status) {
    try {
      validateId(id, 'enrollmentId');
      validateString(status, 'Status', 1, 50);
      return this.request(`/enrollment/cohort/${id}/status?status=${encodeURIComponent(status)}`, {
        method: 'PUT',
      });
    } catch (error) {
      logError('❌ [updateEnrollmentStatus] Error:', error.message);
      throw error;
    }
  }

  async editEnrollment(enrollmentId, updateData) {
    try {
      validateId(enrollmentId, 'enrollmentId');
      if (!updateData || typeof updateData !== 'object') {
        throw new Error('Datos de actualización inválidos');
      }

      log('📝 [editEnrollment] Editando cohorte ID:', enrollmentId);

      const response = await this.request(`/enrollment/cohorts/${enrollmentId}/edit`, {
        method: 'PUT',
        body: JSON.stringify(updateData),
      });

      log('✅ [editEnrollment] Éxito');
      return response;
    } catch (error) {
      logError('❌ [editEnrollment] Error:', error.message);
      throw error;
    }
  }

  async editEnrollmentWithStatus(enrollmentId, updateData, newStatus) {
    try {
      validateId(enrollmentId, 'enrollmentId');
      if (!updateData || typeof updateData !== 'object') {
        throw new Error('Datos de actualización inválidos');
      }
      if (newStatus && typeof newStatus !== 'string') {
        throw new Error('Status inválido');
      }

      log('📝 [editEnrollmentWithStatus] Editando cohorte ID:', enrollmentId);

      const params = newStatus ? `?newStatus=${encodeURIComponent(newStatus)}` : '';

      const response = await this.request(`/enrollment/cohorts/${enrollmentId}/edit-with-status${params}`, {
        method: 'PUT',
        body: JSON.stringify(updateData),
      });

      if (newStatus === 'CANCELLED') {
        console.warn('🚫 ATENCIÓN: Se cancelaron estudiantes inscritos en esta cohorte');
      }

      return response;
    } catch (error) {
      logError('❌ [editEnrollmentWithStatus] Error:', error.message);
      throw error;
    }
  }

  // ========== 📚 NIVELES FORMATIVOS ==========

  /**
   * Obtener todos los niveles activos
   * GET /api/v1/levels
   */
  async getActiveLevels() {
    try {
      log('📚 [getActiveLevels] Obteniendo niveles activos');
      const response = await this.request('/levels');
      log('✅ [getActiveLevels] Éxito -', response?.length || 0, 'niveles');
      return response;
    } catch (error) {
      logError('❌ [getActiveLevels] Error:', error.message);
      // Fallback a niveles por defecto si el endpoint falla
      return this.getDefaultLevels();
    }
  }

  /**
   * Obtener todos los niveles (incluye inactivos)
   * GET /api/v1/levels/all
   */
  async getAllLevels() {
    try {
      log('📚 [getAllLevels] Obteniendo todos los niveles');
      const response = await this.request('/levels/all');
      log('✅ [getAllLevels] Éxito -', response?.length || 0, 'niveles');
      return response;
    } catch (error) {
      logError('❌ [getAllLevels] Error:', error.message);
      return this.getDefaultLevels();
    }
  }

  /**
   * Obtener nivel por código
   * GET /api/v1/levels/code/{code}
   */
  async getLevelByCode(code) {
    try {
      validateString(code, 'code', 1, 50);
      log('🔍 [getLevelByCode] Buscando nivel:', code);
      const response = await this.request(`/levels/code/${code}`);
      return response;
    } catch (error) {
      logError('❌ [getLevelByCode] Error:', error.message);
      throw error;
    }
  }

  /**
   * Niveles por defecto (fallback)
   */
  getDefaultLevels() {
    return [
      { id: 1, code: 'PREENCUENTRO', displayName: 'Pre-encuentro', levelOrder: 1, isActive: true },
      { id: 2, code: 'ENCUENTRO', displayName: 'Encuentro', levelOrder: 2, isActive: true },
      { id: 3, code: 'POST_ENCUENTRO', displayName: 'Post-encuentro', levelOrder: 3, isActive: true },
      { id: 4, code: 'BAUTIZOS', displayName: 'Bautizos', levelOrder: 4, isActive: true },
      { id: 5, code: 'ESENCIA_1', displayName: 'ESENCIA 1', levelOrder: 5, isActive: true },
      { id: 6, code: 'ESENCIA_2', displayName: 'ESENCIA 2', levelOrder: 6, isActive: true },
      { id: 7, code: 'ESENCIA_3', displayName: 'ESENCIA 3', levelOrder: 7, isActive: true },
      { id: 8, code: 'SANIDAD_INTEGRAL_RAICES', displayName: 'Sanidad Integral Raíces', levelOrder: 8, isActive: true },
      { id: 9, code: 'ESENCIA_4', displayName: 'ESENCIA 4', levelOrder: 9, isActive: true },
      { id: 10, code: 'ADIESTRAMIENTO', displayName: 'Adiestramiento', levelOrder: 10, isActive: true },
      { id: 11, code: 'GRADUACION', displayName: 'Graduación', levelOrder: 11, isActive: true }
    ];
  }

  // ========== 🎓 INSCRIPCIONES DE ESTUDIANTES ==========

  async getStudentEnrollments(page = 0, limit = 10) {
    try {
      validatePageParams(page, limit);
      return this.request(`/student-enrollment?page=${page}&limit=${limit}`);
    } catch (error) {
      logError('❌ [getStudentEnrollments] Error:', error.message);
      throw error;
    }
  }

  async getStudentEnrollmentById(id) {
    try {
      validateId(id, 'studentEnrollmentId');
      return this.request(`/student-enrollment/${id}`);
    } catch (error) {
      logError('❌ [getStudentEnrollmentById] Error:', error.message);
      throw error;
    }
  }

  async getStudentEnrollmentsByEnrollment(enrollmentId) {
    try {
      validateId(enrollmentId, 'enrollmentId');

      log('📡 [getStudentEnrollmentsByEnrollment] Obteniendo estudiantes de cohorte:', enrollmentId);

      try {
        const response = await this.request(`/student-enrollment/by-cohort/${enrollmentId}`);
        log('✅ [getStudentEnrollmentsByEnrollment] Exitoso');
        return response;
      } catch (error1) {
        log('⚠️ [getStudentEnrollmentsByEnrollment] Intento 1 falló, intentando alternativa...');

        try {
          const enrollment = await this.request(`/enrollment/${enrollmentId}`);
          const students = enrollment?.studentEnrollments || [];
          log('✅ [getStudentEnrollmentsByEnrollment] Exitoso (alternativa)');
          return students;
        } catch (error2) {
          log('⚠️ [getStudentEnrollmentsByEnrollment] Intento 2 falló, intentando intento 3...');

          try {
            const allStudentEnrollments = await this.request('/student-enrollment');
            const filtered = allStudentEnrollments?.filter(se => se.enrollmentId === enrollmentId) || [];
            log('✅ [getStudentEnrollmentsByEnrollment] Exitoso (alternativa 2)');
            return filtered;
          } catch (error3) {
            logError('❌ [getStudentEnrollmentsByEnrollment] Todos los intentos fallaron');
            return [];
          }
        }
      }
    } catch (error) {
      logError('❌ [getStudentEnrollmentsByEnrollment] Error de validación:', error.message);
      throw error;
    }
  }

  async getStudentEnrollmentsByMember(memberId) {
    try {
      validateId(memberId, 'memberId');
      return this.request(`/student-enrollment/by-member/${memberId}`);
    } catch (error) {
      logError('❌ [getStudentEnrollmentsByMember] Error:', error.message);
      throw error;
    }
  }

  async createStudentEnrollment(memberId, enrollmentId) {
    try {
      validateId(memberId, 'memberId');
      validateId(enrollmentId, 'enrollmentId');
      return this.request(`/student-enrollment?memberId=${memberId}&enrollmentId=${enrollmentId}`, {
        method: 'POST',
      });
    } catch (error) {
      logError('❌ [createStudentEnrollment] Error:', error.message);
      throw error;
    }
  }

  async updateStudentEnrollment(id, updateData) {
    try {
      validateId(id, 'studentEnrollmentId');
      if (!updateData || typeof updateData !== 'object') {
        throw new Error('Datos de actualización inválidos');
      }

      let url = `/student-enrollment/${id}?`;
      const params = [];

      if (updateData.status) params.push(`status=${encodeURIComponent(updateData.status)}`);
      if (updateData.finalAttendancePercentage !== undefined) {
        validateNumber(updateData.finalAttendancePercentage, 'finalAttendancePercentage', 0, 100);
        params.push(`finalAttendancePercentage=${updateData.finalAttendancePercentage}`);
      }
      if (updateData.passed !== undefined) params.push(`passed=${updateData.passed}`);

      url += params.join('&');

      return this.request(url, {
        method: 'PUT',
      });
    } catch (error) {
      logError('❌ [updateStudentEnrollment] Error:', error.message);
      throw error;
    }
  }

  async withdrawStudentFromCohort(id) {
    try {
      validateId(id, 'studentEnrollmentId');
      return this.request(`/student-enrollment/${id}/withdraw`, {
        method: 'POST',
      });
    } catch (error) {
      logError('❌ [withdrawStudentFromCohort] Error:', error.message);
      throw error;
    }
  }

  async deleteStudentEnrollment(id) {
    try {
      validateId(id, 'studentEnrollmentId');
      return this.request(`/student-enrollment/${id}`, {
        method: 'DELETE',
      });
    } catch (error) {
      logError('❌ [deleteStudentEnrollment] Error:', error.message);
      throw error;
    }
  }

  async getStudentDetailedReport(id) {
    try {
      validateId(id, 'studentEnrollmentId');
      return this.request(`/student-enrollment/${id}/detailed-report`);
    } catch (error) {
      logError('❌ [getStudentDetailedReport] Error:', error.message);
      throw error;
    }
  }

  // ========== NUEVO MÉTODO PARA REPORTE POR NIVEL ==========

  /**
   * Obtener reporte detallado de estudiantes por nivel específico
   * GET /student-enrollment/by-level/{level}
   * @param {string} level - Nivel (PREENCUENTRO, ENCUENTRO, etc.)
   * @param {string|null} status - Filtrar por estado (ACTIVE, COMPLETED, FAILED)
   */
  async getLevelStudents(level, status = null) {
    try {
      validateString(level, 'level', 1, 50);

      // Construir URL - EL ENDPOINT CORRECTO ES /by-level/{level}
      let url = `/student-enrollment/by-level/${level}`;
      if (status) {
        url += `?status=${status}`;
      }

      log(`📊 [getLevelStudents] Obteniendo estudiantes del nivel: ${level}`);
      const response = await this.request(url);

      // La respuesta es un StudentsByLevelReportDTO.LevelDetail
      return response;

    } catch (error) {
      logError('❌ [getLevelStudents] Error:', error.message);
      throw error;
    }
  }

  // ========== 📖 LECCIONES ==========

  async getLessons(page = 0, limit = 10) {
    try {
      validatePageParams(page, limit);
      return this.request(`/lesson?page=${page}&limit=${limit}`);
    } catch (error) {
      logError('❌ [getLessons] Error:', error.message);
      throw error;
    }
  }

  async getLessonById(id) {
    try {
      validateId(id, 'lessonId');
      return this.request(`/lesson/${id}`);
    } catch (error) {
      logError('❌ [getLessonById] Error:', error.message);
      throw error;
    }
  }

  async getLessonsByEnrollment(enrollmentId) {
    try {
      validateId(enrollmentId, 'enrollmentId');
      return this.request(`/lesson/enrollment/${enrollmentId}`);
    } catch (error) {
      logError('❌ [getLessonsByEnrollment] Error:', error.message);
      throw error;
    }
  }

  async createLesson(lessonData) {
    try {
      if (!lessonData || typeof lessonData !== 'object') {
        throw new Error('Datos de lección inválidos');
      }
      return this.request('/lesson/create', {
        method: 'POST',
        body: JSON.stringify(lessonData),
      });
    } catch (error) {
      logError('❌ [createLesson] Error:', error.message);
      throw error;
    }
  }

  async createDefaultLessonPlan(enrollmentId) {
    try {
      validateId(enrollmentId, 'enrollmentId');
      return this.request(`/lesson/create-plan/${enrollmentId}`, {
        method: 'POST',
      });
    } catch (error) {
      logError('❌ [createDefaultLessonPlan] Error:', error.message);
      throw error;
    }
  }

  async updateLesson(id, lessonData) {
    try {
      validateId(id, 'lessonId');
      if (!lessonData || typeof lessonData !== 'object') {
        throw new Error('Datos de lección inválidos');
      }
      return this.request(`/lesson/${id}`, {
        method: 'PUT',
        body: JSON.stringify(lessonData),
      });
    } catch (error) {
      logError('❌ [updateLesson] Error:', error.message);
      throw error;
    }
  }

  async deleteLesson(id) {
    try {
      validateId(id, 'lessonId');
      return this.request(`/lesson/${id}`, {
        method: 'DELETE',
      });
    } catch (error) {
      logError('❌ [deleteLesson] Error:', error.message);
      throw error;
    }
  }

  // ========== ✅ ASISTENCIAS ==========

  async recordAttendance(attendanceData) {
    try {
      if (!attendanceData || typeof attendanceData !== 'object') {
        throw new Error('Datos de asistencia inválidos');
      }

      validateId(attendanceData.studentEnrollmentId, 'studentEnrollmentId');
      validateId(attendanceData.lessonId, 'lessonId');
      validateString(attendanceData.recordedBy, 'recordedBy', 1, 100);
      validateString(attendanceData.score, 'score', 1, 50);

      if (attendanceData.present === undefined || attendanceData.present === null) {
        throw new Error('present requerido');
      }

      const bodyData = {
        studentEnrollmentId: Number(attendanceData.studentEnrollmentId),
        lessonId: Number(attendanceData.lessonId),
        present: attendanceData.present === true,
        recordedBy: String(attendanceData.recordedBy),
        score: String(attendanceData.score)
      };

      log('📤 [recordAttendance] Enviando asistencia');

      const response = await this.request('/attendance/record', {
        method: 'POST',
        body: JSON.stringify(bodyData)
      });

      log('✅ [recordAttendance] Éxito');
      return response;

    } catch (error) {
      logError('❌ [recordAttendance] Error:', error.message);
      throw error;
    }
  }

  async getAttendancesByLesson(lessonId) {
    try {
      validateId(lessonId, 'lessonId');
      return this.request(`/attendance/lesson/${lessonId}`);
    } catch (error) {
      logError('❌ [getAttendancesByLesson] Error:', error.message);
      throw error;
    }
  }

  async initializeLessonAttendance(lessonId) {
    try {
      validateId(lessonId, 'lessonId');
      return this.request(`/attendance/lesson/${lessonId}/initialize`, {
        method: 'POST',
      });
    } catch (error) {
      logError('❌ [initializeLessonAttendance] Error:', error.message);
      throw error;
    }
  }

  async getStudentAttendanceReport(studentId) {
    try {
      validateId(studentId, 'studentId');
      return this.request(`/attendance/student/${studentId}/report`);
    } catch (error) {
      logError('❌ [getStudentAttendanceReport] Error:', error.message);
      throw error;
    }
  }

  async updateAttendance(id, attendanceData) {
    try {
      validateId(id, 'attendanceId');
      if (!attendanceData || typeof attendanceData !== 'object') {
        throw new Error('Datos de asistencia inválidos');
      }
      return this.request(`/attendance/${id}`, {
        method: 'PUT',
        body: JSON.stringify(attendanceData),
      });
    } catch (error) {
      logError('❌ [updateAttendance] Error:', error.message);
      throw error;
    }
  }

  // ========== 👤 USUARIOS ==========

  async getUsers() {
    try {
      return this.request('/auth/users');
    } catch (error) {
      logError('❌ [getUsers] Error:', error.message);
      throw error;
    }
  }

  async updateUser(id, userData) {
    try {
      validateId(id, 'userId');
      if (!userData || typeof userData !== 'object') {
        throw new Error('Datos de usuario inválidos');
      }
      return this.request(`/auth/users/${id}`, {
        method: 'PUT',
        body: JSON.stringify(userData),
      });
    } catch (error) {
      logError('❌ [updateUser] Error:', error.message);
      throw error;
    }
  }

  async deleteUser(id) {
    try {
      validateId(id, 'userId');
      return this.request(`/auth/users/${id}`, {
        method: 'DELETE',
      });
    } catch (error) {
      logError('❌ [deleteUser] Error:', error.message);
      throw error;
    }
  }

  // ========== 💰 FINANZAS ==========

  async getFinances(page = 0, limit = 10) {
    try {
      validatePageParams(page, limit);
      log('📊 [getFinances] Obteniendo finanzas');
      return this.request(`/finances?page=${page}&limit=${limit}`);
    } catch (error) {
      logError('❌ [getFinances] Error:', error.message);
      throw error;
    }
  }

  async getFinanceById(id) {
    try {
      validateId(id, 'financeId');
      return this.request(`/finances/${id}`);
    } catch (error) {
      logError('❌ [getFinanceById] Error:', error.message);
      throw error;
    }
  }

  async createFinance(financeData) {
    try {
      if (!financeData || typeof financeData !== 'object') {
        throw new Error('Datos de finanza inválidos');
      }

      let recordedBy = financeData.recordedBy;
      if (!recordedBy) {
        const currentUser = this.getCurrentUser();
        recordedBy = currentUser?.username || 'Sistema';
        log('📝 [createFinance] recordedBy auto-llenado con:', recordedBy);
      }

      const body = {
        memberId: validateNumber(financeData.memberId, 'memberId'),
        memberName: financeData.memberName,
        amount: validateNumber(financeData.amount, 'amount', 0),
        incomeConcept: financeData.incomeConcept,
        incomeMethod: financeData.incomeMethod,
        description: financeData.description || '',
        recordedBy: recordedBy,
        registrationDate: financeData.registrationDate,
        isVerified: financeData.isVerified || false,
      };

      const idempotencyKey = `finance-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      log('📤 [createFinance] Enviando con idempotencyKey:', idempotencyKey);

      const response = await this.request(
        '/finances',
        {
          method: 'POST',
          body: JSON.stringify(body),
        },
        {
          'X-Idempotency-Key': idempotencyKey,
        }
      );

      log('✅ [createFinance] Éxito - ID:', response?.id);
      return response;

    } catch (error) {
      logError('❌ [createFinance] Error:', error.message);
      throw error;
    }
  }


  async updateFinance(id, financeData) {
    try {
      validateId(id, 'financeId');
      if (!financeData || typeof financeData !== 'object') {
        throw new Error('Datos de finanza inválidos');
      }

      let recordedBy = financeData.recordedBy;
      if (!recordedBy) {
        const currentUser = this.getCurrentUser();
        recordedBy = currentUser?.username || 'Sistema';
        log('📝 [updateFinance] recordedBy auto-llenado con:', recordedBy);
      }

      const body = {
        memberId: validateNumber(financeData.memberId, 'memberId'),
        memberName: financeData.memberName,
        amount: validateNumber(financeData.amount, 'amount', 0),
        incomeConcept: financeData.incomeConcept,
        incomeMethod: financeData.incomeMethod,
        description: financeData.description || '',
        recordedBy: recordedBy,
        registrationDate: financeData.registrationDate,
        isVerified: financeData.isVerified || false,
      };

      log('📝 [updateFinance] Actualizando finanza ID:', id);

      const response = await this.request(`/finances/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });

      log('✅ [updateFinance] Éxito');
      return response;
    } catch (error) {
      logError('❌ [updateFinance] Error:', error.message);
      throw error;
    }
  }

  async deleteFinance(id) {
    try {
      validateId(id, 'financeId');
      const response = await this.request(`/finances/${id}`, {
        method: 'DELETE',
      });
      log('✅ [deleteFinance] Éxito');
      return response;
    } catch (error) {
      logError('❌ [deleteFinance] Error:', error.message);
      throw error;
    }
  }

  async getFinancesByMember(memberId, page = 0, limit = 10) {
    try {
      validateId(memberId, 'memberId');
      validatePageParams(page, limit);
      return this.request(`/finances/member/${memberId}?page=${page}&limit=${limit}`);
    } catch (error) {
      logError('❌ [getFinancesByMember] Error:', error.message);
      throw error;
    }
  }

  async getTotalFinancesByMember(memberId) {
    try {
      validateId(memberId, 'memberId');
      return this.request(`/finances/member/${memberId}/total`);
    } catch (error) {
      logError('❌ [getTotalFinancesByMember] Error:', error.message);
      throw error;
    }
  }

  async getFinancesByDateRange(startDate, endDate) {
    try {
      validateString(startDate, 'startDate', 1, 20);
      validateString(endDate, 'endDate', 1, 20);
      return this.request(`/finances/date-range?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`);
    } catch (error) {
      logError('❌ [getFinancesByDateRange] Error:', error.message);
      throw error;
    }
  }

  async getFinancesByMonth(year, month) {
    try {
      validateNumber(year, 'year', 1900);
      validateNumber(month, 'month', 1, 12);
      return this.request(`/finances/month/${year}/${month}`);
    } catch (error) {
      logError('❌ [getFinancesByMonth] Error:', error.message);
      throw error;
    }
  }

  async getFinancesByYear(year) {
    try {
      validateNumber(year, 'year', 1900);
      return this.request(`/finances/year/${year}`);
    } catch (error) {
      logError('❌ [getFinancesByYear] Error:', error.message);
      throw error;
    }
  }

  async getFinancesByConcept(concept) {
    try {
      validateString(concept, 'concept', 1, 100);
      return this.request(`/finances/concept/${encodeURIComponent(concept)}`);
    } catch (error) {
      logError('❌ [getFinancesByConcept] Error:', error.message);
      throw error;
    }
  }

  async getFinancesByMethod(method) {
    try {
      validateString(method, 'method', 1, 100);
      return this.request(`/finances/method/${encodeURIComponent(method)}`);
    } catch (error) {
      logError('❌ [getFinancesByMethod] Error:', error.message);
      throw error;
    }
  }

  async getVerifiedFinances() {
    try {
      return this.request('/finances/verified');
    } catch (error) {
      logError('❌ [getVerifiedFinances] Error:', error.message);
      throw error;
    }
  }

  async getUnverifiedFinances() {
    try {
      return this.request('/finances/unverified');
    } catch (error) {
      logError('❌ [getUnverifiedFinances] Error:', error.message);
      throw error;
    }
  }

  async verifyFinance(id) {
    try {
      validateId(id, 'financeId');
      return this.request(`/finances/${id}/verify`, {
        method: 'PATCH',
      });
    } catch (error) {
      logError('❌ [verifyFinance] Error:', error.message);
      throw error;
    }
  }

  // ========== 👥 LÍDERES ==========

  async getLeaders() {
    try {
      log('📋 [getLeaders] Obteniendo todos los líderes');
      const response = await this.request('/leaders');
      log('✅ [getLeaders] Éxito -', response?.length || 0, 'líderes');
      return response;
    } catch (error) {
      logError('❌ [getLeaders] Error:', error.message);
      throw error;
    }
  }

  async getActiveLeaders() {
    try {
      log('✅ [getActiveLeaders] Obteniendo líderes activos');
      const response = await this.request('/leaders/active');
      return response;
    } catch (error) {
      logError('❌ [getActiveLeaders] Error:', error.message);
      throw error;
    }
  }

  async getSuspendedLeaders() {
    try {
      log('⏸️ [getSuspendedLeaders] Obteniendo líderes suspendidos');
      const response = await this.request('/leaders/suspended');
      return response;
    } catch (error) {
      logError('❌ [getSuspendedLeaders] Error:', error.message);
      throw error;
    }
  }

  async getInactiveLeaders() {
    try {
      log('⏹️ [getInactiveLeaders] Obteniendo líderes inactivos');
      const response = await this.request('/leaders/inactive');
      return response;
    } catch (error) {
      logError('❌ [getInactiveLeaders] Error:', error.message);
      throw error;
    }
  }

  async getLeaderById(id) {
    try {
      validateId(id, 'leaderId');
      log('🔍 [getLeaderById] Buscando líder ID:', id);
      const response = await this.request(`/leaders/${id}`);
      return response;
    } catch (error) {
      logError('❌ [getLeaderById] Error:', error.message);
      throw error;
    }
  }

  async getLeaderByMemberId(memberId) {
    try {
      validateId(memberId, 'memberId');
      log('🔍 [getLeaderByMemberId] Buscando líder del miembro ID:', memberId);
      const response = await this.request(`/leaders/member/${memberId}`);
      return response;
    } catch (error) {
      logError('❌ [getLeaderByMemberId] Error:', error.message);
      throw error;
    }
  }

  async getLeadersByType(leaderType) {
    try {
      validateString(leaderType, 'leaderType', 1, 50);
      if (!['SERVANT', 'LEADER_144', 'LEADER_12'].includes(leaderType)) {
        throw new Error('Tipo de líder inválido');
      }
      log('🔍 [getLeadersByType] Buscando líderes tipo:', leaderType);
      const response = await this.request(`/leaders/type/${leaderType}`);
      return response;
    } catch (error) {
      logError('❌ [getLeadersByType] Error:', error.message);
      throw error;
    }
  }

  async promoteToLeader(memberId, leaderType, cellGroupCode = null, notes = null) {
    try {
      validateId(memberId, 'memberId');
      validateString(leaderType, 'leaderType', 1, 50);
      if (!['SERVANT', 'LEADER_144', 'LEADER_12'].includes(leaderType)) {
        throw new Error('Tipo de líder inválido. Debe ser SERVANT, LEADER_144 o LEADER_12');
      }

      const params = new URLSearchParams();
      params.append('memberId', memberId);
      params.append('leaderType', leaderType);
      if (cellGroupCode) params.append('cellGroupCode', cellGroupCode.trim());
      if (notes) params.append('notes', notes.trim());

      log('🌟 [promoteToLeader] Promoviendo miembro:', { memberId, leaderType });

      const response = await this.request(`/leaders/promote?${params.toString()}`, {
        method: 'POST',
      });

      log('✅ [promoteToLeader] Éxito - Líder ID:', response?.leaderId);
      return response;
    } catch (error) {
      logError('❌ [promoteToLeader] Error:', error.message);
      throw error;
    }
  }

  async checkEligibility(memberId, leaderType) {
    try {
      validateId(memberId, 'memberId');
      validateString(leaderType, 'leaderType', 1, 50);
      if (!['SERVANT', 'LEADER_144', 'LEADER_12'].includes(leaderType)) {
        throw new Error('Tipo de líder inválido. Debe ser SERVANT, LEADER_144 o LEADER_12');
      }

      log('🔍 [checkEligibility] Verificando miembro:', { memberId, leaderType });

      const response = await this.request(`/leaders/eligibility/${memberId}?leaderType=${leaderType}`);

      log('📊 [checkEligibility] Resultado:', {
        isEligible: response?.isEligible,
        passed: response?.passedRequirements?.length || 0,
        failed: response?.failedRequirements?.length || 0
      });

      return response;
    } catch (error) {
      logError('❌ [checkEligibility] Error:', error.message);
      throw error;
    }
  }

  async verifyAllLeaders() {
    try {
      log('🔄 [verifyAllLeaders] Verificando todos los líderes activos');
      const response = await this.request('/leaders/verify-all', { method: 'POST' });
      log('✅ [verifyAllLeaders] Éxito -', { total: response?.totalVerified, suspendidos: response?.suspended, válidos: response?.stillValid });
      return response;
    } catch (error) {
      logError('❌ [verifyAllLeaders] Error:', error.message);
      throw error;
    }
  }

  async verifyLeader(leaderId) {
    try {
      validateId(leaderId, 'leaderId');
      log('🔍 [verifyLeader] Verificando líder ID:', leaderId);
      const response = await this.request(`/leaders/${leaderId}/verify`, { method: 'POST' });
      if (response?.wasSuspended) {
        log('⚠️ [verifyLeader] Líder suspendido automáticamente');
      } else {
        log('✅ [verifyLeader] Líder verificado, cumple requisitos');
      }
      return response;
    } catch (error) {
      logError('❌ [verifyLeader] Error:', error.message);
      throw error;
    }
  }

  async reactivateSuspendedLeaders() {
    try {
      log('▶️ [reactivateSuspendedLeaders] Intentando reactivar suspendidos');
      const response = await this.request('/leaders/reactivate-suspended', { method: 'POST' });
      log('✅ [reactivateSuspendedLeaders] Éxito -', { revisados: response?.totalChecked, reactivados: response?.reactivated, aúnSuspendidos: response?.stillSuspended });
      return response;
    } catch (error) {
      logError('❌ [reactivateSuspendedLeaders] Error:', error.message);
      throw error;
    }
  }

  async suspendLeader(leaderId, reason) {
    try {
      validateId(leaderId, 'leaderId');
      validateString(reason, 'reason', 3, 500);
      log('⏸️ [suspendLeader] Suspendiendo líder ID:', leaderId);
      const params = new URLSearchParams();
      params.append('reason', reason.trim());
      const response = await this.request(`/leaders/${leaderId}/suspend?${params.toString()}`, { method: 'PUT' });
      log('✅ [suspendLeader] Líder suspendido');
      return response;
    } catch (error) {
      logError('❌ [suspendLeader] Error:', error.message);
      throw error;
    }
  }

  async unsuspendLeader(leaderId) {
    try {
      validateId(leaderId, 'leaderId');
      log('▶️ [unsuspendLeader] Reactivando líder suspendido ID:', leaderId);
      const response = await this.request(`/leaders/${leaderId}/unsuspend`, { method: 'PUT' });
      log('✅ [unsuspendLeader] Líder reactivado');
      return response;
    } catch (error) {
      logError('❌ [unsuspendLeader] Error:', error.message);
      throw error;
    }
  }

  async deactivateLeader(leaderId, reason) {
    try {
      validateId(leaderId, 'leaderId');
      validateString(reason, 'reason', 3, 500);
      log('⏹️ [deactivateLeader] Desactivando líder ID:', leaderId);
      const params = new URLSearchParams();
      params.append('reason', reason.trim());
      const response = await this.request(`/leaders/${leaderId}/deactivate?${params.toString()}`, { method: 'PUT' });
      log('✅ [deactivateLeader] Líder desactivado');
      return response;
    } catch (error) {
      logError('❌ [deactivateLeader] Error:', error.message);
      throw error;
    }
  }

  async reactivateLeader(leaderId) {
    try {
      validateId(leaderId, 'leaderId');
      log('▶️ [reactivateLeader] Reactivando líder inactivo ID:', leaderId);
      const response = await this.request(`/leaders/${leaderId}/reactivate`, { method: 'PUT' });
      log('✅ [reactivateLeader] Líder reactivado');
      return response;
    } catch (error) {
      logError('❌ [reactivateLeader] Error:', error.message);
      throw error;
    }
  }

  async updateLeader(leaderId, leaderType = null, cellGroupCode = null, notes = null) {
    try {
      validateId(leaderId, 'leaderId');
      const params = new URLSearchParams();
      if (leaderType) {
        validateString(leaderType, 'leaderType', 1, 50);
        params.append('leaderType', leaderType);
      }
      if (cellGroupCode) params.append('cellGroupCode', cellGroupCode.trim());
      if (notes) params.append('notes', notes.trim());
      log('📝 [updateLeader] Actualizando líder ID:', leaderId);
      const response = await this.request(`/leaders/${leaderId}?${params.toString()}`, { method: 'PUT' });
      log('✅ [updateLeader] Líder actualizado');
      return response;
    } catch (error) {
      logError('❌ [updateLeader] Error:', error.message);
      throw error;
    }
  }

  async getLeaderStatistics() {
    try {
      log('📊 [getLeaderStatistics] Obteniendo estadísticas');
      const response = await this.request('/leaders/statistics');
      log('✅ [getLeaderStatistics] Éxito -', { total: response?.totalLeaders, activos: response?.activeLeaders, suspendidos: response?.suspendedLeaders, inactivos: response?.inactiveLeaders });
      return response;
    } catch (error) {
      logError('❌ [getLeaderStatistics] Error:', error.message);
      throw error;
    }
  }

  async searchMembers(term) {
    try {
      if (!term || term.trim().length < 2) return [];
      validateString(term, 'searchTerm', 2, 100);
      log('🔍 [searchMembers] Buscando:', term);
      const [allMembers, leaders] = await Promise.all([
        this.getAllMembers(),
        this.getLeaders(),
      ]);
      const leaderMemberIds = new Set(leaders.map(l => l.memberId));
      const searchTerm = term.toLowerCase().trim();
      const results = allMembers
        .filter(member => {
          const matches =
            (member.name?.toLowerCase().includes(searchTerm)) ||
            (member.document?.toLowerCase().includes(searchTerm)) ||
            (member.email?.toLowerCase().includes(searchTerm)) ||
            (member.phone?.includes(searchTerm));
          return matches && !leaderMemberIds.has(member.id);
        })
        .map(member => ({ ...member, isLeader: false }))
        .slice(0, 20);
      log('✅ [searchMembers] Encontrados:', results.length);
      return results;
    } catch (error) {
      logError('❌ [searchMembers] Error:', error.message);
      throw error;
    }
  }

  async deleteLeader(leaderId) {
    try {
      validateId(leaderId, 'leaderId');
      log('🗑️ [deleteLeader] Eliminando líder ID:', leaderId);
      const response = await this.request(`/leaders/${leaderId}`, { method: 'DELETE' });
      log('✅ [deleteLeader] Líder eliminado permanentemente');
      return response;
    } catch (error) {
      logError('❌ [deleteLeader] Error:', error.message);
      throw error;
    }
  }

  // ========== 🏠 CÉLULAS ==========

  async createCell(cellData) {
    try {
      if (!cellData || typeof cellData !== 'object') throw new Error('Datos de célula inválidos');
      validateString(cellData.name, 'name', 3, 200);
      validateId(cellData.mainLeaderId, 'mainLeaderId');
      validateId(cellData.groupLeaderId, 'groupLeaderId');
      validateId(cellData.hostId, 'hostId');
      validateId(cellData.timoteoId, 'timoteoId');
      if (cellData.branchLeaderId !== null && cellData.branchLeaderId !== undefined && cellData.branchLeaderId !== '') {
        validateId(cellData.branchLeaderId, 'branchLeaderId');
      }
      if (cellData.maxCapacity !== null && cellData.maxCapacity !== undefined) {
        validateNumber(cellData.maxCapacity, 'maxCapacity', 1, 1000);
      }
      const payload = {
        name: cellData.name.trim(),
        mainLeaderId: Number(cellData.mainLeaderId),
        groupLeaderId: Number(cellData.groupLeaderId),
        hostId: Number(cellData.hostId),
        timoteoId: Number(cellData.timoteoId),
        meetingDay: cellData.meetingDay || null,
        meetingTime: cellData.meetingTime || null,
        meetingAddress: cellData.meetingAddress?.trim() || null,
        maxCapacity: cellData.maxCapacity ? Number(cellData.maxCapacity) : null,
        district: cellData.district?.trim() || null,
        notes: cellData.notes?.trim() || null
      };
      if (cellData.branchLeaderId && cellData.branchLeaderId !== '' && cellData.branchLeaderId !== 'null') {
        payload.branchLeaderId = Number(cellData.branchLeaderId);
      }
      log('🏠 [createCell] Creando célula:', { name: payload.name, mainLeaderId: payload.mainLeaderId });
      const response = await this.request('/cells', { method: 'POST', body: JSON.stringify(payload) });
      log('✅ [createCell] Éxito - ID:', response?.cellId || response?.id);
      return response;
    } catch (error) {
      logError('❌ [createCell] Error:', error.message);
      throw error;
    }
  }

  async getCells(ordered = true) {
    try {
      log('📋 [getCells] Obteniendo todas las células (ordered:', ordered, ')');
      const response = await this.request(`/cells?ordered=${ordered}`);
      log('✅ [getCells] Éxito -', response?.length || 0, 'células');
      return response;
    } catch (error) {
      logError('❌ [getCells] Error:', error.message);
      throw error;
    }
  }

  async getAccessibleCells() {
    try {
      log('📋 [getAccessibleCells] Obteniendo células accesibles para el usuario logueado');
      const response = await this.request('/attendance-cell-group/my-cells');
      log('✅ [getAccessibleCells] Éxito -', response?.length || 0, 'células');
      return response;
    } catch (error) {
      logError('❌ [getAccessibleCells] Error:', error.message);
      throw error;
    }
  }

  async getCellById(id) {
    try {
      validateId(id, 'cellId');
      log('🔍 [getCellById] Buscando célula ID:', id);
      return this.request(`/cells/${id}`);
    } catch (error) {
      logError('❌ [getCellById] Error:', error.message);
      throw error;
    }
  }

  async getCellMembers(cellId) {
    try {
      validateId(cellId, 'cellId');
      log('👥 [getCellMembers] Obteniendo miembros de célula ID:', cellId);
      const response = await this.request(`/cells/${cellId}/members`);
      const members = response?.members ?? [];
      log('✅ [getCellMembers] Miembros recibidos:', members.length);
      return members;
    } catch (error) {
      logError('❌ [getCellMembers] Error:', error.message);
      throw error;
    }
  }

  async getCellsByStatus(status, ordered = false) {
    try {
      validateString(status, 'status', 1, 50);
      log('🔍 [getCellsByStatus] Buscando células con estado:', status);
      return this.request(`/cells/status/${status}?ordered=${ordered}`);
    } catch (error) {
      logError('❌ [getCellsByStatus] Error:', error.message);
      throw error;
    }
  }

  async getCellsByLeader(leaderId) {
    try {
      validateId(leaderId, 'leaderId');
      log('🔍 [getCellsByLeader] Buscando células del líder ID:', leaderId);
      return this.request(`/cells/leader/${leaderId}`);
    } catch (error) {
      logError('❌ [getCellsByLeader] Error:', error.message);
      throw error;
    }
  }

  async getCellsByDistrict(district, status = null) {
    try {
      validateString(district, 'district', 1, 50);
      let url = `/cells/district/${district}`;
      if (status) url += `?status=${status}`;
      log('🔍 [getCellsByDistrict] Buscando células del distrito:', district);
      return this.request(url);
    } catch (error) {
      logError('❌ [getCellsByDistrict] Error:', error.message);
      throw error;
    }
  }

  async getAvailableCells(district = null) {
    try {
      let url = '/cells/available';
      if (district) url += `?district=${district}`;
      log('🔍 [getAvailableCells] Obteniendo células disponibles');
      return this.request(url);
    } catch (error) {
      logError('❌ [getAvailableCells] Error:', error.message);
      throw error;
    }
  }

  async getCellsWithIncompleteLeadership() {
    try {
      log('⚠️ [getCellsWithIncompleteLeadership] Obteniendo células con liderazgo incompleto');
      return this.request('/cells/incomplete-leadership');
    } catch (error) {
      logError('❌ [getCellsWithIncompleteLeadership] Error:', error.message);
      throw error;
    }
  }

  async getCellsWithCompleteLeadership() {
    try {
      log('✅ [getCellsWithCompleteLeadership] Obteniendo células con liderazgo completo');
      return this.request('/cells/complete-leadership');
    } catch (error) {
      logError('❌ [getCellsWithCompleteLeadership] Error:', error.message);
      throw error;
    }
  }

  async getActiveCellsWithAllLeaders() {
    try {
      log('🚀 [getActiveCellsWithAllLeaders] Obteniendo células activas con líderes');
      return this.request('/cells/active-with-leaders');
    } catch (error) {
      logError('❌ [getActiveCellsWithAllLeaders] Error:', error.message);
      throw error;
    }
  }

  async getFullCells() {
    try {
      log('🔍 [getFullCells] Obteniendo células llenas');
      return this.request('/cells/full');
    } catch (error) {
      logError('❌ [getFullCells] Error:', error.message);
      throw error;
    }
  }

  async searchCellsByName(name) {
    try {
      validateString(name, 'name', 2, 200);
      log('🔍 [searchCellsByName] Buscando células con nombre:', name);
      return this.request(`/cells/search?name=${encodeURIComponent(name)}`);
    } catch (error) {
      logError('❌ [searchCellsByName] Error:', error.message);
      throw error;
    }
  }

  async getCellsByMainLeader(leaderId) {
    try {
      validateId(leaderId, 'leaderId');
      log('🔍 [getCellsByMainLeader] Buscando células del líder de red ID:', leaderId);
      return this.request(`/cells/main-leader/${leaderId}`);
    } catch (error) {
      logError('❌ [getCellsByMainLeader] Error:', error.message);
      throw error;
    }
  }

  async getDirectCellsByMainLeader(leaderId) {
    try {
      validateId(leaderId, 'leaderId');
      log('🔍 [getDirectCellsByMainLeader] Buscando células directas del líder ID:', leaderId);
      return this.request(`/cells/main-leader/${leaderId}/direct`);
    } catch (error) {
      logError('❌ [getDirectCellsByMainLeader] Error:', error.message);
      throw error;
    }
  }

  async getHierarchicalCellsByMainLeader(leaderId) {
    try {
      validateId(leaderId, 'leaderId');
      log('🔍 [getHierarchicalCellsByMainLeader] Buscando células jerárquicas del líder ID:', leaderId);
      return this.request(`/cells/main-leader/${leaderId}/hierarchical`);
    } catch (error) {
      logError('❌ [getHierarchicalCellsByMainLeader] Error:', error.message);
      throw error;
    }
  }

  async getNetworkByMainLeader(leaderId) {
    try {
      validateId(leaderId, 'leaderId');
      log('🕸️ [getNetworkByMainLeader] Obteniendo red completa del líder:', leaderId);
      const response = await this.request(`/cells/main-leader/${leaderId}/network`);
      log('✅ [getNetworkByMainLeader] Red obtenida:', { totalCélulas: response?.cells?.length || 0 });
      return response;
    } catch (error) {
      logError('❌ [getNetworkByMainLeader] Error:', error.message);
      throw error;
    }
  }

  async getMainLeaderStatistics(leaderId) {
    try {
      validateId(leaderId, 'leaderId');
      log('📊 [getMainLeaderStatistics] Obteniendo estadísticas del líder ID:', leaderId);
      return this.request(`/cells/main-leader/${leaderId}/statistics`);
    } catch (error) {
      logError('❌ [getMainLeaderStatistics] Error:', error.message);
      throw error;
    }
  }

  async getCellsByBranchLeader(leaderId) {
    try {
      validateId(leaderId, 'leaderId');
      log('🔀 [getCellsByBranchLeader] Obteniendo células del líder de rama:', leaderId);
      const response = await this.request(`/cells/branch-leader/${leaderId}`);
      log('✅ [getCellsByBranchLeader] Éxito -', response?.cells?.length || 0, 'células');
      return response;
    } catch (error) {
      logError('❌ [getCellsByBranchLeader] Error:', error.message);
      throw error;
    }
  }

  async getCellsByMeetingDay(day) {
    try {
      validateString(day, 'day', 1, 20);
      log('🔍 [getCellsByMeetingDay] Buscando células que se reúnen el día:', day);
      return this.request(`/cells/meeting-day/${day}`);
    } catch (error) {
      logError('❌ [getCellsByMeetingDay] Error:', error.message);
      throw error;
    }
  }

  async getMultiplyingCells() {
    try {
      log('🌱 [getMultiplyingCells] Obteniendo células en multiplicación');
      return this.request('/cells/multiplying');
    } catch (error) {
      logError('❌ [getMultiplyingCells] Error:', error.message);
      throw error;
    }
  }

  async getTopMultiplyingCells(limit = 10) {
    try {
      validateNumber(limit, 'limit', 1, 100);
      log('🏆 [getTopMultiplyingCells] Obteniendo top', limit, 'células con más multiplicaciones');
      return this.request(`/cells/top-multiplying?limit=${limit}`);
    } catch (error) {
      logError('❌ [getTopMultiplyingCells] Error:', error.message);
      throw error;
    }
  }

  async getCellHierarchy(cellId) {
    try {
      validateId(cellId, 'cellId');
      log('🏛️ [getCellHierarchy] Obteniendo jerarquía de célula:', cellId);
      return this.request(`/cells/hierarchy/${cellId}`);
    } catch (error) {
      logError('❌ [getCellHierarchy] Error:', error.message);
      throw error;
    }
  }

  async updateCell(id, cellData) {
    try {
      validateId(id, 'cellId');
      if (!cellData || typeof cellData !== 'object') throw new Error('Datos de célula inválidos');
      if (cellData.name) validateString(cellData.name, 'name', 3, 200);
      if (cellData.mainLeaderId) validateId(cellData.mainLeaderId, 'mainLeaderId');
      if (cellData.branchLeaderId) validateId(cellData.branchLeaderId, 'branchLeaderId');
      if (cellData.groupLeaderId) validateId(cellData.groupLeaderId, 'groupLeaderId');
      if (cellData.hostId) validateId(cellData.hostId, 'hostId');
      if (cellData.timoteoId) validateId(cellData.timoteoId, 'timoteoId');
      if (cellData.maxCapacity) validateNumber(cellData.maxCapacity, 'maxCapacity', 1, 1000);
      const payload = {};
      const fields = ['name', 'mainLeaderId', 'branchLeaderId', 'groupLeaderId', 'hostId', 'timoteoId', 'meetingDay', 'meetingTime', 'meetingAddress', 'maxCapacity', 'district', 'notes'];
      fields.forEach(field => {
        if (cellData[field] !== undefined && cellData[field] !== null && cellData[field] !== '') {
          if (typeof cellData[field] === 'string') {
            payload[field] = cellData[field].trim();
          } else if (field.includes('Id') || field === 'maxCapacity') {
            payload[field] = Number(cellData[field]);
          } else {
            payload[field] = cellData[field];
          }
        }
      });
      log('📝 [updateCell] Actualizando célula ID:', id);
      const response = await this.request(`/cells/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
      log('✅ [updateCell] Célula actualizada');
      return response;
    } catch (error) {
      logError('❌ [updateCell] Error:', error.message);
      throw error;
    }
  }

  async changeCellStatus(id, newStatus) {
    try {
      validateId(id, 'cellId');
      validateString(newStatus, 'newStatus', 1, 50);
      log('🔄 [changeCellStatus] Cambiando estado de célula', { id, newStatus });
      const response = await this.request(`/cells/${id}/status`, { method: 'PUT', body: JSON.stringify({ newStatus }) });
      log('✅ [changeCellStatus] Estado cambiado');
      return response;
    } catch (error) {
      logError('❌ [changeCellStatus] Error:', error.message);
      throw error;
    }
  }

  async deleteCell(id) {
    try {
      validateId(id, 'cellId');
      log('🗑️ [deleteCell] Eliminando célula ID:', id);
      const response = await this.request(`/cells/${id}`, { method: 'DELETE' });
      log('✅ [deleteCell] Célula marcada como inactiva');
      return response;
    } catch (error) {
      logError('❌ [deleteCell] Error:', error.message);
      throw error;
    }
  }

  async addMemberToCell(cellId, memberId) {
    try {
      validateId(cellId, 'cellId');
      validateId(memberId, 'memberId');
      log('➕ [addMemberToCell] Agregando miembro', { cellId, memberId });
      const response = await this.request(`/cells/${cellId}/members`, { method: 'POST', body: JSON.stringify({ memberId }) });
      log('✅ [addMemberToCell] Miembro agregado');
      return response;
    } catch (error) {
      logError('❌ [addMemberToCell] Error:', error.message);
      throw error;
    }
  }

  async removeMemberFromCell(cellId, memberId) {
    try {
      validateId(cellId, 'cellId');
      validateId(memberId, 'memberId');
      log('➖ [removeMemberFromCell] Removiendo miembro', { cellId, memberId });
      const response = await this.request(`/cells/${cellId}/members/${memberId}`, { method: 'DELETE' });
      log('✅ [removeMemberFromCell] Miembro removido');
      return response;
    } catch (error) {
      logError('❌ [removeMemberFromCell] Error:', error.message);
      throw error;
    }
  }

  /**
   * Desvincular un líder de una célula manualmente.
   * DELETE /api/v1/cells/{cellId}/leaders/{leaderId}
   *
   * Funciona en cualquier CellStatus. El backend limpia el rol del líder,
   * actualiza su cellGroupCode a null y recalcula el estado de la célula.
   *
   * @param {number} cellId   - ID de la célula
   * @param {number} leaderId - ID del líder a desvincular
   * @returns {Object} Respuesta del backend con newCellStatus, newCellStatusDisplay
   *                   y missingOrInactiveLeaders (si aplica)
   */
  async unlinkLeaderFromCell(cellId, leaderId) {
    try {
      validateId(cellId, 'cellId');
      validateId(leaderId, 'leaderId');
      log('✂️ [unlinkLeaderFromCell] Desvinculando líder', { cellId, leaderId });
      const response = await this.request(`/cells/${cellId}/leaders/${leaderId}`, { method: 'DELETE' });
      log('✅ [unlinkLeaderFromCell] Éxito - Nuevo estado:', response?.newCellStatus);
      return response;
    } catch (error) {
      logError('❌ [unlinkLeaderFromCell] Error:', error.message);
      throw error;
    }
  }

  async startMultiplication(cellId) {
    try {
      validateId(cellId, 'cellId');
      log('🌱 [startMultiplication] Iniciando multiplicación célula ID:', cellId);
      const response = await this.request(`/cells/${cellId}/start-multiplication`, { method: 'POST' });
      log('✅ [startMultiplication] Multiplicación iniciada');
      return response;
    } catch (error) {
      logError('❌ [startMultiplication] Error:', error.message);
      throw error;
    }
  }

  async completeMultiplication(cellId) {
    try {
      validateId(cellId, 'cellId');
      log('✅ [completeMultiplication] Completando multiplicación célula ID:', cellId);
      const response = await this.request(`/cells/${cellId}/complete-multiplication`, { method: 'POST' });
      log('✅ [completeMultiplication] Multiplicación completada');
      return response;
    } catch (error) {
      logError('❌ [completeMultiplication] Error:', error.message);
      throw error;
    }
  }

  async verifyCell(cellId) {
    try {
      validateId(cellId, 'cellId');
      log('🔍 [verifyCell] Verificando célula ID:', cellId);
      const response = await this.request(`/cells/${cellId}/verify`, { method: 'POST' });
      log('✅ [verifyCell] Célula verificada');
      return response;
    } catch (error) {
      logError('❌ [verifyCell] Error:', error.message);
      throw error;
    }
  }

  async verifyAllCells() {
    try {
      log('🔄 [verifyAllCells] Verificando todas las células');
      const response = await this.request('/cells/verify-all', { method: 'POST' });
      log('✅ [verifyAllCells] Éxito -', { total: response?.totalVerified, cambiaron: response?.statusChanged });
      return response;
    } catch (error) {
      logError('❌ [verifyAllCells] Error:', error.message);
      throw error;
    }
  }

  async getCellStatistics() {
    try {
      log('📊 [getCellStatistics] Obteniendo estadísticas de células');
      const response = await this.request('/cells/statistics');
      log('✅ [getCellStatistics] Éxito -', { total: response?.totalCells, activas: response?.activeCells, incompletas: response?.incompleteCells });
      return response;
    } catch (error) {
      logError('❌ [getCellStatistics] Error:', error.message);
      throw error;
    }
  }

  // ========== 📊 ESTADÍSTICAS ==========

  async getStatisticsByLevelAndYear() {
  try {
    log('📊 [getStatisticsByLevelAndYear] Iniciando');
    const enrollments = await this.getEnrollments();
    log(`📋 Cohortes obtenidas: ${enrollments.length}`);

    if (!enrollments.length) return {};

    // ✅ TODAS las cohortes en paralelo en lugar de secuencial
    const results = await Promise.allSettled(
      enrollments.map(enrollment =>
        this.getStudentEnrollmentsByEnrollment(enrollment.id)
          .then(students => ({ enrollment, students: students || [] }))
      )
    );

    const levelYearData = {};

    results.forEach(result => {
      if (result.status === 'rejected') {
        console.warn('⚠️ Cohorte falló:', result.reason?.message);
        return;
      }

      const { enrollment, students } = result.value;
      const cohortName = enrollment.cohortName || enrollment.name;

      if (!students.length) {
        log(`⚠️ ${cohortName} - Sin estudiantes`);
        return;
      }

      log(`✅ ${cohortName} - ${students.length} estudiantes`);

      students.forEach(student => {
        // Extraer año
        let year = 'SIN_AÑO';
        const rawDate = student.enrollmentDate || student.enrollment_date;
        if (rawDate) {
          const extractedYear = new Date(rawDate).getFullYear();
          if (!isNaN(extractedYear) && extractedYear > 1900) {
            year = extractedYear.toString();
          }
        }

        const level = student.levelEnrollment || student.level || 'SIN_NIVEL';

        if (!levelYearData[year]) levelYearData[year] = {};
        if (!levelYearData[year][level]) {
          levelYearData[year][level] = {
            label: this.getLevelLabel(level),
            levelEnrollment: level,
            total: 0, passed: 0, failed: 0, pending: 0,
          };
        }

        const entry = levelYearData[year][level];
        entry.total += 1;
        if (student.passed === true)       entry.passed  += 1;
        else if (student.passed === false) entry.failed  += 1;
        else                               entry.pending += 1;
      });
    });

    // Construir resultado ordenado
    const LEVEL_ORDER = [
      'PREENCUENTRO', 'ENCUENTRO', 'POST_ENCUENTRO', 'BAUTIZOS',
      'ESENCIA_1', 'ESENCIA_2', 'ESENCIA_3', 'SANIDAD_INTEGRAL_RAICES',
      'ESENCIA_4', 'ADIESTRAMIENTO', 'GRADUACION',
    ];

    const result = {};
    Object.keys(levelYearData)
      .sort((a, b) => {
        if (a === 'SIN_AÑO') return 1;
        if (b === 'SIN_AÑO') return -1;
        return b - a; // años descendente
      })
      .forEach(year => {
        result[year] = {};
        LEVEL_ORDER.forEach(levelKey => {
          const levelData = levelYearData[year][levelKey];
          if (!levelData) return;
          result[year][levelKey] = {
            label:         levelData.label,
            total:         levelData.total,
            passed:        levelData.passed,
            failed:        levelData.failed,
            pending:       levelData.pending,
            passPercentage: levelData.total > 0
              ? parseFloat(((levelData.passed / levelData.total) * 100).toFixed(1))
              : 0,
          };
        });
      });

    log('✅ [getStatisticsByLevelAndYear] Completado');
    return result;

  } catch (error) {
    logError('❌ [getStatisticsByLevelAndYear] Error:', error);
    throw error;
  }
}

  getLevelLabel(levelEnrollment) {
    const levelMap = { 'PREENCUENTRO': 'Pre-encuentro', 'ENCUENTRO': 'Encuentro', 'POST_ENCUENTRO': 'Post-encuentro', 'BAUTIZOS': 'Bautizos', 'ESENCIA_1': 'ESENCIA 1', 'ESENCIA_2': 'ESENCIA 2', 'ESENCIA_3': 'ESENCIA 3', 'SANIDAD_INTEGRAL_RAICES': 'Sanidad Integral Raíces', 'ESENCIA_4': 'ESENCIA 4', 'ADIESTRAMIENTO': 'Adiestramiento', 'GRADUACION': 'Graduación' };
    return levelMap[levelEnrollment] || levelEnrollment;
  }

  // ========== 📋 ASISTENCIAS DE CÉLULAS ==========

  async getAttendanceConfig() {
    try {
      log('📋 [getAttendanceConfig] Obteniendo configuración');
      return this.request('/attendance-cell-group/config');
    } catch (error) {
      logError('❌ [getAttendanceConfig] Error:', error.message);
      throw error;
    }
  }

  async generateCellAttendances(cellId, date) {
    try {
      validateId(cellId, 'cellId');
      validateString(date, 'date', 10, 10);
      log('📋 [generateCellAttendances] Generando para célula:', cellId, 'fecha:', date);
      const response = await this.request(`/attendance-cell-group/generate/cell/${cellId}?date=${date}`, { method: 'POST' });
      log('✅ [generateCellAttendances] Éxito -', response?.totalCount || 0, 'registros');
      return response;
    } catch (error) {
      logError('❌ [generateCellAttendances] Error:', error.message);
      throw error;
    }
  }

  async generateMyCellsAttendances(date) {
    try {
      validateString(date, 'date', 10, 10);
      log('📋 [generateMyCellsAttendances] Generando para mis células, fecha:', date);
      const response = await this.request(`/attendance-cell-group/generate/my-cells?date=${date}`, { method: 'POST' });
      log('✅ [generateMyCellsAttendances] Éxito -', response?.totalCells || 0, 'células');
      return response;
    } catch (error) {
      logError('❌ [generateMyCellsAttendances] Error:', error.message);
      throw error;
    }
  }

  async generateCurrentMonthAttendances() {
    try {
      log('🔄 [generateCurrentMonthAttendances] Ejecutando generación manual');
      const response = await this.request('/attendance-cell-group/generate/current-month', { method: 'POST' });
      log('✅ [generateCurrentMonthAttendances] Éxito');
      return response;
    } catch (error) {
      logError('❌ [generateCurrentMonthAttendances] Error:', error.message);
      throw error;
    }
  }

  async getCellAttendancesCurrentMonth() {
    try {
      log('📅 [getCellAttendancesCurrentMonth] Consultando mes actual');
      const response = await this.request('/attendance-cell-group/current-month');
      log('✅ [getCellAttendancesCurrentMonth] Éxito -', response?.totalCells || 0, 'células');
      return response;
    } catch (error) {
      logError('❌ [getCellAttendancesCurrentMonth] Error:', error.message);
      throw error;
    }
  }

  async getCellAttendancesByMonth(year, month) {
    try {
      validateNumber(year, 'year', 2020);
      validateNumber(month, 'month', 1, 12);
      log('📅 [getCellAttendancesByMonth] Consultando:', year, '/', month);
      return this.request(`/attendance-cell-group/month/${year}/${month}`);
    } catch (error) {
      logError('❌ [getCellAttendancesByMonth] Error:', error.message);
      throw error;
    }
  }

  async getCellAttendancesByDate(cellId, date) {
    try {
      validateId(cellId, 'cellId');
      validateString(date, 'date', 10, 10);
      log('🔍 [getCellAttendancesByDate] Célula:', cellId, 'Fecha:', date);
      const response = await this.request(`/attendance-cell-group/cell/${cellId}/date/${date}`);
      log('✅ [getCellAttendancesByDate] Éxito -', response?.totalCount || 0, 'registros');
      return response;
    } catch (error) {
      logError('❌ [getCellAttendancesByDate] Error:', error.message);
      throw error;
    }
  }

  async recordCellAttendance(cellId, date, attendanceData) {
    try {
      validateId(cellId, 'cellId');
      validateString(date, 'date', 10, 10);
      if (!attendanceData || typeof attendanceData !== 'object') throw new Error('Datos de asistencia inválidos');
      log('📝 [recordCellAttendance] Registrando:', { cellId, date, memberId: attendanceData.memberId });
      const response = await this.request(`/attendance-cell-group/cell/${cellId}/date/${date}`, { method: 'POST', body: JSON.stringify(attendanceData) });
      log('✅ [recordCellAttendance] Éxito');
      return response;
    } catch (error) {
      logError('❌ [recordCellAttendance] Error:', error.message);
      throw error;
    }
  }

  async recordBulkCellAttendances(cellId, bulkData) {
    try {
      validateId(cellId, 'cellId');
      if (!bulkData || typeof bulkData !== 'object') throw new Error('Datos de asistencias inválidos');
      log('📦 [recordBulkCellAttendances] Registrando masivo:', { cellId, date: bulkData.attendanceDate, count: bulkData.attendances?.length || 0 });
      const response = await this.request(`/attendance-cell-group/cell/${cellId}/bulk`, { method: 'POST', body: JSON.stringify(bulkData) });
      log('✅ [recordBulkCellAttendances] Éxito -', response?.totalCount || 0, 'registros');
      return response;
    } catch (error) {
      logError('❌ [recordBulkCellAttendances] Error:', error.message);
      throw error;
    }
  }

  async updateBulkCellAttendances(cellId, date, attendances) {
    try {
      validateId(cellId, 'cellId');
      validateString(date, 'date', 10, 10);
      if (!Array.isArray(attendances)) throw new Error('Datos de asistencias inválidos');
      log('📦 [updateBulkCellAttendances] Actualizando:', { cellId, date, count: attendances.length });
      const response = await this.request(`/attendance-cell-group/cell/${cellId}/date/${date}/bulk`, { method: 'PUT', body: JSON.stringify(attendances) });
      log('✅ [updateBulkCellAttendances] Éxito -', response?.totalCount || 0, 'registros');
      return response;
    } catch (error) {
      logError('❌ [updateBulkCellAttendances] Error:', error.message);
      throw error;
    }
  }

  async getCellAttendanceSummary(cellId, date) {
    try {
      validateId(cellId, 'cellId');
      validateString(date, 'date', 10, 10);
      log('📊 [getCellAttendanceSummary] Resumen:', { cellId, date });
      return this.request(`/attendance-cell-group/summary/cell/${cellId}/date/${date}`);
    } catch (error) {
      logError('❌ [getCellAttendanceSummary] Error:', error.message);
      throw error;
    }
  }

  async getCellAttendanceMonthlyStats(cellId, year, month) {
    try {
      validateId(cellId, 'cellId');
      validateNumber(year, 'year', 2020);
      validateNumber(month, 'month', 1, 12);
      log('📊 [getCellAttendanceMonthlyStats] Stats:', { cellId, year, month });
      return this.request(`/attendance-cell-group/statistics/cell/${cellId}/month/${year}/${month}`);
    } catch (error) {
      logError('❌ [getCellAttendanceMonthlyStats] Error:', error.message);
      throw error;
    }
  }

  async getCellAttendanceGlobalStats() {
    try {
      log('📊 [getCellAttendanceGlobalStats] Obteniendo estadísticas globales');
      return this.request('/attendance-cell-group/statistics/global');
    } catch (error) {
      logError('❌ [getCellAttendanceGlobalStats] Error:', error.message);
      throw error;
    }
  }

  // ========== 📅 EVENTOS DE ASISTENCIA ==========

  /**
   * Obtener todos los eventos de asistencia activos
   * GET /api/v1/attendance-cell-group/events
   */
  async getActiveAttendanceEvents() {
    try {
      log('📅 [getActiveAttendanceEvents] Obteniendo eventos activos');
      const response = await this.request('/attendance-cell-group/events');
      log('✅ [getActiveAttendanceEvents] Éxito -', response?.events?.length || 0, 'eventos');
      return response;
    } catch (error) {
      logError('❌ [getActiveAttendanceEvents] Error:', error.message);
      throw error;
    }
  }

  /**
   * Obtener todos los eventos de asistencia (activos e inactivos)
   * GET /api/v1/attendance-cell-group/events/all
   * Solo para PASTORES y CONEXION
   */
  async getAllAttendanceEvents() {
    try {
      log('📅 [getAllAttendanceEvents] Obteniendo todos los eventos');
      const response = await this.request('/attendance-cell-group/events/all');
      log('✅ [getAllAttendanceEvents] Éxito -', response?.events?.length || 0, 'eventos');
      return response;
    } catch (error) {
      logError('❌ [getAllAttendanceEvents] Error:', error.message);
      throw error;
    }
  }

  /**
   * Crear un nuevo evento de asistencia especial
   * POST /api/v1/attendance-cell-group/events
   * Solo para PASTORES y CONEXION
   * 
   * @param {Object} eventData - Datos del evento
   * @param {string} eventData.name - Nombre del evento (obligatorio)
   * @param {string} eventData.description - Descripción (opcional)
   * @param {Array<string>} eventData.eventDates - Lista de fechas en formato YYYY-MM-DD (obligatorio)
   */
  async createAttendanceEvent(eventData) {
    try {
      if (!eventData || typeof eventData !== 'object') {
        throw new Error('Datos del evento inválidos');
      }

      validateString(eventData.name, 'name', 1, 200);

      if (!eventData.eventDates || !Array.isArray(eventData.eventDates) || eventData.eventDates.length === 0) {
        throw new Error('Debe especificar al menos una fecha para el evento');
      }

      // Validar que todas las fechas tengan formato correcto
      eventData.eventDates.forEach(date => {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
          throw new Error(`Formato de fecha inválido: ${date}. Use YYYY-MM-DD`);
        }
      });

      log('📅 [createAttendanceEvent] Creando evento:', { name: eventData.name, fechas: eventData.eventDates.length });

      const payload = {
        name: eventData.name.trim(),
        description: eventData.description?.trim() || null,
        eventDates: eventData.eventDates
      };

      const response = await this.request('/attendance-cell-group/events', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      log('✅ [createAttendanceEvent] Éxito - ID:', response?.event?.id);
      return response;
    } catch (error) {
      logError('❌ [createAttendanceEvent] Error:', error.message);
      throw error;
    }
  }

  /**
   * Desactivar un evento de asistencia
   * DELETE /api/v1/attendance-cell-group/events/{eventId}
   * Solo para PASTORES y CONEXION
   */
  async deactivateAttendanceEvent(eventId) {
    try {
      validateId(eventId, 'eventId');
      log('🚫 [deactivateAttendanceEvent] Desactivando evento ID:', eventId);
      const response = await this.request(`/attendance-cell-group/events/${eventId}`, {
        method: 'DELETE'
      });
      log('✅ [deactivateAttendanceEvent] Evento desactivado');
      return response;
    } catch (error) {
      logError('❌ [deactivateAttendanceEvent] Error:', error.message);
      throw error;
    }
  }

  /**
   * Obtener datos de sesión de una célula en una fecha específica
   * GET /api/v1/attendance-cell-group/cell/{cellId}/date/{date}/session-data
   */
  async getSessionData(cellId, date) {
    try {
      validateId(cellId, 'cellId');
      validateString(date, 'date', 10, 10);
      log('📊 [getSessionData] Obteniendo datos de sesión:', { cellId, date });
      const response = await this.request(`/attendance-cell-group/cell/${cellId}/date/${date}/session-data`);
      log('✅ [getSessionData] Éxito -', response?.hasData ? 'tiene datos' : 'sin datos');
      return response;
    } catch (error) {
      logError('❌ [getSessionData] Error:', error.message);
      throw error;
    }
  }

  /**
   * Guardar o actualizar datos de sesión de una reunión
   * PUT /api/v1/attendance-cell-group/cell/{cellId}/date/{date}/session-data
   * 
   * @param {number} cellId - ID de la célula
   * @param {string} date - Fecha en formato YYYY-MM-DD
   * @param {Object} payload - Datos de sesión
   * @param {number} payload.newParticipants - Nuevas visitas (opcional, default 0)
   * @param {number} payload.totalAttendees - Total asistentes (opcional, se calcula si se omite)
   * @param {string} payload.notes - Notas (opcional, max 500)
   */
  async saveSessionData(cellId, date, payload) {
    try {
      validateId(cellId, 'cellId');
      validateString(date, 'date', 10, 10);

      if (!payload || typeof payload !== 'object') {
        throw new Error('Datos de sesión inválidos');
      }

      // Validar newParticipants
      if (payload.newParticipants !== undefined && payload.newParticipants !== null && payload.newParticipants !== '') {
        const newParts = parseInt(payload.newParticipants, 10);
        if (isNaN(newParts) || newParts < 0) {
          throw new Error('newParticipants debe ser un número no negativo');
        }
      }

      // Validar totalAttendees
      if (payload.totalAttendees !== undefined && payload.totalAttendees !== null && payload.totalAttendees !== '') {
        const total = parseInt(payload.totalAttendees, 10);
        if (isNaN(total) || total < 0) {
          throw new Error('totalAttendees debe ser un número no negativo');
        }
      }

      // Validar notes
      if (payload.notes && payload.notes.length > 500) {
        throw new Error('Las notas no pueden superar 500 caracteres');
      }

      log('📝 [saveSessionData] Guardando datos de sesión:', {
        cellId,
        date,
        newParticipants: payload.newParticipants,
        totalAttendees: payload.totalAttendees
      });

      const response = await this.request(`/attendance-cell-group/cell/${cellId}/date/${date}/session-data`, {
        method: 'PUT',
        body: JSON.stringify({
          newParticipants: payload.newParticipants !== '' ? parseInt(payload.newParticipants, 10) : null,
          totalAttendees: payload.totalAttendees !== '' ? parseInt(payload.totalAttendees, 10) : null,
          notes: payload.notes || null
        })
      });

      log('✅ [saveSessionData] Datos guardados');
      return response;
    } catch (error) {
      logError('❌ [saveSessionData] Error:', error.message);
      throw error;
    }
  }

  // ========== 🔍 HEALTH CHECK ==========

  async healthCheck() {
    try {
      log('🏥 [healthCheck] Verificando estado del servicio');
      return this.request('/attendance-cell-group/health');
    } catch (error) {
      logError('❌ [healthCheck] Error:', error.message);
      throw error;
    }
  }

  // ============================================================
  // PEGA ESTE BLOQUE DENTRO DE LA CLASE ApiService,
  // justo antes de la línea:  }  (cierre de la clase)
  // ============================================================

  // ========== 🔔 NOTIFICACIONES ==========

  /**
   * Conteo de notificaciones sin leer de un usuario.
   * GET /notifications/user/{userId}/unread-count
   * Requiere rol: PASTORES, ESENCIA, CONEXION, DESPLIEGUE, LIDER  (según NotificationController)
   * Retorna: { unreadCount: number }
   */
  async getUnreadNotificationCount(userId) {
    try {
      validateId(userId, 'userId');
      return this.request(`/notifications/user/${userId}/unread-count`);
    } catch (error) {
      logError('❌ [getUnreadNotificationCount] Error:', error.message);
      throw error;
    }
  }

  /**
   * Notificaciones activas (no archivadas) de un usuario.
   * GET /notifications/user/{userId}/active
   * Retorna: NotificationResponse[]
   */
  async getActiveNotifications(userId) {
    try {
      validateId(userId, 'userId');
      return this.request(`/notifications/user/${userId}/active`);
    } catch (error) {
      logError('❌ [getActiveNotifications] Error:', error.message);
      throw error;
    }
  }

  /**
   * Todas las notificaciones de un usuario.
   * GET /notifications/user/{userId}
   * Retorna: NotificationResponse[]
   */
  async getAllNotifications(userId) {
    try {
      validateId(userId, 'userId');
      return this.request(`/notifications/user/${userId}`);
    } catch (error) {
      logError('❌ [getAllNotifications] Error:', error.message);
      throw error;
    }
  }

  /**
   * Notificaciones sin leer de un usuario.
   * GET /notifications/user/{userId}/unread
   * Retorna: NotificationResponse[]
   */
  async getUnreadNotifications(userId) {
    try {
      validateId(userId, 'userId');
      return this.request(`/notifications/user/${userId}/unread`);
    } catch (error) {
      logError('❌ [getUnreadNotifications] Error:', error.message);
      throw error;
    }
  }

  /**
   * Marca una notificación como leída.
   * PUT /notifications/{id}/mark-read
   */
  async markNotificationAsRead(notificationId) {
    try {
      validateId(notificationId, 'notificationId');
      return this.request(`/notifications/${notificationId}/mark-read`, {
        method: 'PUT',
      });
    } catch (error) {
      logError('❌ [markNotificationAsRead] Error:', error.message);
      throw error;
    }
  }

  /**
   * Marca TODAS las notificaciones de un usuario como leídas.
   * PUT /notifications/user/{userId}/mark-all-read
   */
  async markAllNotificationsAsRead(userId) {
    try {
      validateId(userId, 'userId');
      return this.request(`/notifications/user/${userId}/mark-all-read`, {
        method: 'PUT',
      });
    } catch (error) {
      logError('❌ [markAllNotificationsAsRead] Error:', error.message);
      throw error;
    }
  }

  /**
   * Archiva una notificación.
   * PUT /notifications/{id}/archive
   * Solo PASTORES.
   */
  async archiveNotification(notificationId) {
    try {
      validateId(notificationId, 'notificationId');
      return this.request(`/notifications/${notificationId}/archive`, {
        method: 'PUT',
      });
    } catch (error) {
      logError('❌ [archiveNotification] Error:', error.message);
      throw error;
    }
  }

  /**
   * Elimina una notificación permanentemente.
   * DELETE /notifications/{id}
   * Solo PASTORES.
   */
  async deleteNotification(notificationId) {
    try {
      validateId(notificationId, 'notificationId');
      return this.request(`/notifications/${notificationId}`, {
        method: 'DELETE',
      });
    } catch (error) {
      logError('❌ [deleteNotification] Error:', error.message);
      throw error;
    }
  }

  /**
   * Estadísticas de notificaciones de un usuario.
   * GET /notifications/user/{userId}/statistics
   * Solo PASTORES.
   */
  async getNotificationStatistics(userId) {
    try {
      validateId(userId, 'userId');
      return this.request(`/notifications/user/${userId}/statistics`);
    } catch (error) {
      logError('❌ [getNotificationStatistics] Error:', error.message);
      throw error;
    }
  }

  // ============================================================
  // ⛪ MÓDULO FINANCIERO IGLESIA
  // Pega este bloque dentro de la clase ApiService,
  // justo antes del cierre de la clase  }
  // Base URL del módulo: /api/v1/finance
  // ============================================================

  // ========== 📌 GASTOS FIJOS ==========

  /**
   * Crear plantilla de gasto fijo mensual.
   * POST /finance/fixed-expenses
   * @param {Object} dto - FixedExpenseDTO { name, description, defaultAmount, category, isActive, createdBy }
   */
  async createFixedExpense(dto) {
    try {
      if (!dto || typeof dto !== 'object') throw new Error('Datos de gasto fijo inválidos');
      validateString(dto.name, 'name', 3, 150);
      validateNumber(dto.defaultAmount, 'defaultAmount', 0.01);
      validateString(dto.category, 'category', 1, 60);
      validateString(dto.createdBy, 'createdBy', 1, 100);

      log('📌 [createFixedExpense] Creando:', dto.name);
      const response = await this.request('/finance/fixed-expenses', {
        method: 'POST',
        body: JSON.stringify(dto),
      });
      log('✅ [createFixedExpense] Éxito - ID:', response?.id);
      return response;
    } catch (error) {
      logError('❌ [createFixedExpense] Error:', error.message);
      throw error;
    }
  }

  /**
   * Actualizar plantilla de gasto fijo.
   * PUT /finance/fixed-expenses/{id}
   * @param {number} id
   * @param {Object} dto - FixedExpenseDTO
   */
  async updateFixedExpense(id, dto) {
    try {
      validateId(id, 'fixedExpenseId');
      if (!dto || typeof dto !== 'object') throw new Error('Datos de gasto fijo inválidos');

      log('📝 [updateFixedExpense] Actualizando ID:', id);
      const response = await this.request(`/finance/fixed-expenses/${id}`, {
        method: 'PUT',
        body: JSON.stringify(dto),
      });
      log('✅ [updateFixedExpense] Éxito');
      return response;
    } catch (error) {
      logError('❌ [updateFixedExpense] Error:', error.message);
      throw error;
    }
  }

  /**
   * Desactivar gasto fijo (borrado lógico).
   * El gasto deja de generar registros futuros; historial conservado.
   * PATCH /finance/fixed-expenses/{id}/deactivate
   * @param {number} id
   */
  async deactivateFixedExpense(id) {
    try {
      validateId(id, 'fixedExpenseId');
      log('⏹️ [deactivateFixedExpense] Desactivando ID:', id);
      const response = await this.request(`/finance/fixed-expenses/${id}/deactivate`, {
        method: 'PATCH',
      });
      log('✅ [deactivateFixedExpense] Éxito');
      return response;
    } catch (error) {
      logError('❌ [deactivateFixedExpense] Error:', error.message);
      throw error;
    }
  }

  /**
   * Eliminar gasto fijo permanentemente.
   * Solo si NO tiene registros mensuales históricos; preferir deactivateFixedExpense.
   * DELETE /finance/fixed-expenses/{id}
   * @param {number} id
   */
  async deleteFixedExpense(id) {
    try {
      validateId(id, 'fixedExpenseId');
      log('🗑️ [deleteFixedExpense] Eliminando ID:', id);
      const response = await this.request(`/finance/fixed-expenses/${id}`, {
        method: 'DELETE',
      });
      log('✅ [deleteFixedExpense] Éxito');
      return response;
    } catch (error) {
      logError('❌ [deleteFixedExpense] Error:', error.message);
      throw error;
    }
  }

  /**
   * Obtener gasto fijo por ID.
   * GET /finance/fixed-expenses/{id}
   * @param {number} id
   */
  async getFixedExpenseById(id) {
    try {
      validateId(id, 'fixedExpenseId');
      log('🔍 [getFixedExpenseById] Buscando ID:', id);
      return this.request(`/finance/fixed-expenses/${id}`);
    } catch (error) {
      logError('❌ [getFixedExpenseById] Error:', error.message);
      throw error;
    }
  }

  /**
   * Listar todos los gastos fijos.
   * GET /finance/fixed-expenses?activeOnly=false|true
   * @param {boolean} activeOnly - true para solo los activos (default: false)
   */
  async getAllFixedExpenses(activeOnly = false) {
    try {
      log('📋 [getAllFixedExpenses] activeOnly:', activeOnly);
      const response = await this.request(`/finance/fixed-expenses?activeOnly=${activeOnly}`);
      log('✅ [getAllFixedExpenses] Éxito -', response?.length || 0, 'registros');
      return response;
    } catch (error) {
      logError('❌ [getAllFixedExpenses] Error:', error.message);
      throw error;
    }
  }

  /**
   * Listar solo los gastos fijos activos (alias conveniente).
   * GET /finance/fixed-expenses?activeOnly=true
   */
  async getActiveFixedExpenses() {
    return this.getAllFixedExpenses(true);
  }

  // ========== 📋 REGISTROS MENSUALES DE GASTOS FIJOS ==========

  /**
   * Obtener (y auto-generar si es la primera vez) los registros
   * de gastos fijos para un mes/año dado.
   * GET /finance/monthly-records?month={month}&year={year}
   * @param {number} month - 1-12
   * @param {number} year  - ≥ 2000
   */
  async getOrCreateMonthlyRecords(month, year) {
    try {
      validateNumber(month, 'month', 1, 12);
      validateNumber(year, 'year', 2000);
      log('📋 [getOrCreateMonthlyRecords]', { month, year });
      const response = await this.request(`/finance/monthly-records?month=${month}&year=${year}`);
      log('✅ [getOrCreateMonthlyRecords] Éxito -', response?.length || 0, 'registros');
      return response;
    } catch (error) {
      logError('❌ [getOrCreateMonthlyRecords] Error:', error.message);
      throw error;
    }
  }

  /**
   * Actualizar monto, estado de pago y/o notas de un registro mensual.
   * Permite ajustar el valor de un mes sin alterar la plantilla base.
   * PATCH /finance/monthly-records/{id}
   * @param {number}  id
   * @param {number|null}  newAmount - nuevo monto (null = no cambiar)
   * @param {boolean|null} isPaid    - estado de pago (null = no cambiar)
   * @param {string|null}  notes     - notas (null = no cambiar)
   */
  async updateMonthlyRecord(id, newAmount = null, isPaid = null, notes = null) {
    try {
      validateId(id, 'monthlyRecordId');

      const body = {};
      if (newAmount !== null) {
        validateNumber(newAmount, 'amount', 0.01);
        body.amount = newAmount;
      }
      if (isPaid !== null) body.isPaid = isPaid;
      if (notes !== null) body.notes = notes;

      log('📝 [updateMonthlyRecord] Actualizando ID:', id, body);
      const response = await this.request(`/finance/monthly-records/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      log('✅ [updateMonthlyRecord] Éxito');
      return response;
    } catch (error) {
      logError('❌ [updateMonthlyRecord] Error:', error.message);
      throw error;
    }
  }

  // ========== ⚡ GASTOS OCASIONALES ==========

  /**
 * Registrar un gasto no recurrente.
 * POST /finance/occasional-expenses
 */
  async createOccasionalExpense(dto) {
    try {
      if (!dto || typeof dto !== 'object') throw new Error('Datos de gasto ocasional inválidos');
      validateString(dto.name, 'name', 3, 150);

      // ✅ CORREGIDO: Validar y procesar el monto
      const numAmount = Number(dto.amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        throw new Error('El monto debe ser un número válido mayor a 0');
      }
      const validatedAmount = Math.round(numAmount * 100) / 100;

      validateString(dto.category, 'category', 1, 60);
      validateString(dto.expenseDate, 'expenseDate', 10, 10);
      validateString(dto.recordedBy, 'recordedBy', 1, 100);

      const processedDto = {
        ...dto,
        amount: validatedAmount
      };

      log('⚡ [createOccasionalExpense] Creando:', dto.name, 'monto:', validatedAmount);
      const response = await this.request('/finance/occasional-expenses', {
        method: 'POST',
        body: JSON.stringify(processedDto),
      });
      log('✅ [createOccasionalExpense] Éxito - ID:', response?.id);
      return response;
    } catch (error) {
      logError('❌ [createOccasionalExpense] Error:', error.message);
      throw error;
    }
  }

  /**
 * Actualizar gasto ocasional.
 * PUT /finance/occasional-expenses/{id}
 * @param {number} id
 * @param {Object} dto - OccasionalExpenseDTO
 */
  async updateOccasionalExpense(id, dto) {
    try {
      validateId(id, 'occasionalExpenseId');
      if (!dto || typeof dto !== 'object') throw new Error('Datos de gasto ocasional inválidos');

      // ✅ CORREGIDO: Procesar el monto correctamente
      const processedDto = { ...dto };

      // Asegurar que el monto sea un número con 2 decimales
      if (processedDto.amount !== undefined && processedDto.amount !== null) {
        const numAmount = Number(processedDto.amount);
        if (isNaN(numAmount)) {
          throw new Error('El monto debe ser un número válido');
        }
        // Redondear a 2 decimales para evitar problemas de precisión
        processedDto.amount = Math.round(numAmount * 100) / 100;
      }

      log('📝 [updateOccasionalExpense] Actualizando ID:', id, 'monto:', processedDto.amount);
      const response = await this.request(`/finance/occasional-expenses/${id}`, {
        method: 'PUT',
        body: JSON.stringify(processedDto),
      });
      log('✅ [updateOccasionalExpense] Éxito');
      return response;
    } catch (error) {
      logError('❌ [updateOccasionalExpense] Error:', error.message);
      throw error;
    }
  }

  /**
   * Eliminar gasto ocasional.
   * DELETE /finance/occasional-expenses/{id}
   * @param {number} id
   */
  async deleteOccasionalExpense(id) {
    try {
      validateId(id, 'occasionalExpenseId');
      log('🗑️ [deleteOccasionalExpense] Eliminando ID:', id);
      const response = await this.request(`/finance/occasional-expenses/${id}`, {
        method: 'DELETE',
      });
      log('✅ [deleteOccasionalExpense] Éxito');
      return response;
    } catch (error) {
      logError('❌ [deleteOccasionalExpense] Error:', error.message);
      throw error;
    }
  }

  /**
   * Listar gastos ocasionales de un mes/año.
   * GET /finance/occasional-expenses?month={month}&year={year}
   * @param {number} month - 1-12
   * @param {number} year  - ≥ 2000
   */
  async getOccasionalExpensesByMonth(month, year) {
    try {
      validateNumber(month, 'month', 1, 12);
      validateNumber(year, 'year', 2000);
      log('⚡ [getOccasionalExpensesByMonth]', { month, year });
      const response = await this.request(`/finance/occasional-expenses?month=${month}&year=${year}`);
      log('✅ [getOccasionalExpensesByMonth] Éxito -', response?.length || 0, 'registros');
      return response;
    } catch (error) {
      logError('❌ [getOccasionalExpensesByMonth] Error:', error.message);
      throw error;
    }
  }

  // ========== 📊 BALANCE MENSUAL ==========

  /**
   * Obtener el balance mensual completo.
   * Incluye ingresos, egresos, saldo anterior, balance final e indicadores.
   * GET /finance/balance?month={month}&year={year}
   * @param {number} month - 1-12
   * @param {number} year  - ≥ 2000
   * @returns {MonthlyBalanceDTO}
   */
  async getMonthlyBalance(month, year) {
    try {
      validateNumber(month, 'month', 1, 12);
      validateNumber(year, 'year', 2000);
      log('📊 [getMonthlyBalance]', { month, year });
      const response = await this.request(`/finance/balance?month=${month}&year=${year}`);
      log('✅ [getMonthlyBalance] finalBalance:', response?.finalBalance);
      return response;
    } catch (error) {
      logError('❌ [getMonthlyBalance] Error:', error.message);
      throw error;
    }
  }

  /**
   * Indicador en tiempo real de salud financiera del mes.
   * Devuelve semáforo (HEALTHY / WARNING / CRITICAL), barra de cobertura y proyecciones.
   * GET /finance/health?month={month}&year={year}
   * @param {number} month - 1-12
   * @param {number} year  - ≥ 2000
   * @returns {FinancialHealthDTO}
   */
  async getFinancialHealthIndicator(month, year) {
    try {
      validateNumber(month, 'month', 1, 12);
      validateNumber(year, 'year', 2000);
      log('❤️ [getFinancialHealthIndicator]', { month, year });
      const response = await this.request(`/finance/health?month=${month}&year=${year}`);
      log('✅ [getFinancialHealthIndicator] status:', response?.status);
      return response;
    } catch (error) {
      logError('❌ [getFinancialHealthIndicator] Error:', error.message);
      throw error;
    }
  }

  /**
   * Cerrar el mes.
   * Congela el balance; el saldo final se arrastra automáticamente al mes siguiente.
   * POST /finance/balance/close?month={month}&year={year}&closedBy={closedBy}&notes={notes}
   * @param {number} month
   * @param {number} year
   * @param {string} closedBy - username del usuario que cierra
   * @param {string|null} notes - notas opcionales
   * @returns {MonthlyBalanceDTO} balance cerrado
   */
  async closeMonth(month, year, closedBy, notes = null) {
    try {
      validateNumber(month, 'month', 1, 12);
      validateNumber(year, 'year', 2000);
      validateString(closedBy, 'closedBy', 1, 100);

      const params = new URLSearchParams();
      params.append('month', month);
      params.append('year', year);
      params.append('closedBy', closedBy.trim());
      if (notes) params.append('notes', notes.trim());

      log('🔒 [closeMonth] Cerrando mes', { month, year, closedBy });
      const response = await this.request(`/finance/balance/close?${params.toString()}`, {
        method: 'POST',
      });
      log('✅ [closeMonth] Mes cerrado - finalBalance:', response?.finalBalance);
      return response;
    } catch (error) {
      logError('❌ [closeMonth] Error:', error.message);
      throw error;
    }
  }

  // ========== 📄 INFORMES PDF ==========

  /**
   * Descargar informe PDF mensual.
   * GET /finance/reports/monthly?month={month}&year={year}
   * Descarga automáticamente el archivo en el navegador.
   * @param {number} month
   * @param {number} year
   */
  async downloadMonthlyReport(month, year) {
    try {
      validateNumber(month, 'month', 1, 12);
      validateNumber(year, 'year', 2000);

      log('📄 [downloadMonthlyReport]', { month, year });
      const token = sessionStorage.getItem('token');
      const url = `${API_BASE_URL}/finance/reports/monthly?month=${month}&year=${year}`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401) {
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
        window.dispatchEvent(new CustomEvent('authTokenExpired'));
        throw new Error('Sesión expirada');
      }
      if (!res.ok) throw new Error(`Error generando PDF mensual: ${res.status}`);

      const blob = await res.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `informe-mensual-${month}-${year}.pdf`;
      link.click();
      URL.revokeObjectURL(link.href);

      log('✅ [downloadMonthlyReport] Descarga iniciada');
    } catch (error) {
      logError('❌ [downloadMonthlyReport] Error:', error.message);
      throw error;
    }
  }

  /**
   * Descargar informe PDF anual con comparativo mes a mes.
   * GET /finance/reports/yearly?year={year}
   * @param {number} year
   */
  async downloadYearlyReport(year) {
    try {
      validateNumber(year, 'year', 2000);

      log('📅 [downloadYearlyReport]', { year });
      const token = sessionStorage.getItem('token');
      const url = `${API_BASE_URL}/finance/reports/yearly?year=${year}`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401) {
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
        window.dispatchEvent(new CustomEvent('authTokenExpired'));
        throw new Error('Sesión expirada');
      }
      if (!res.ok) throw new Error(`Error generando PDF anual: ${res.status}`);

      const blob = await res.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `informe-anual-${year}.pdf`;
      link.click();
      URL.revokeObjectURL(link.href);

      log('✅ [downloadYearlyReport] Descarga iniciada');
    } catch (error) {
      logError('❌ [downloadYearlyReport] Error:', error.message);
      throw error;
    }
  }

  /**
   * Descargar informe PDF por rango de fechas.
   * GET /finance/reports/period?startDate={YYYY-MM-DD}&endDate={YYYY-MM-DD}
   * @param {string} startDate - formato YYYY-MM-DD
   * @param {string} endDate   - formato YYYY-MM-DD
   */
  async downloadPeriodReport(startDate, endDate) {
    try {
      validateString(startDate, 'startDate', 10, 10);
      validateString(endDate, 'endDate', 10, 10);

      log('📆 [downloadPeriodReport]', { startDate, endDate });
      const token = sessionStorage.getItem('token');
      const url = `${API_BASE_URL}/finance/reports/period?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401) {
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
        window.dispatchEvent(new CustomEvent('authTokenExpired'));
        throw new Error('Sesión expirada');
      }
      if (!res.ok) throw new Error(`Error generando PDF por período: ${res.status}`);

      const blob = await res.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `informe-periodo-${startDate}-${endDate}.pdf`;
      link.click();
      URL.revokeObjectURL(link.href);

      log('✅ [downloadPeriodReport] Descarga iniciada');
    } catch (error) {
      logError('❌ [downloadPeriodReport] Error:', error.message);
      throw error;
    }
  }

  // ============================================================
  // FIN DEL BLOQUE ⛪ MÓDULO FINANCIERO IGLESIA
  // ============================================================
  // ============================================================
  // 🕊️ MÓDULO DE CONSEJERÍAS PASTORALES
  // Pega este bloque dentro de la clase ApiService,
  // justo antes del cierre de la clase  }
  // Base URL del módulo: /api/v1/counseling
  // ============================================================

  // ========== 🕊️ CONSEJERÍAS ==========

  /**
   * Agendar una nueva sesión de consejería.
   * Envía notificación Telegram al pastor y al miembro automáticamente.
   * POST /counseling
   * @param {Object} dto - CounselingSessionRequest
   *   { memberId, scheduledAt (yyyy-MM-dd'T'HH:mm), durationMinutes, location, topic, objectives }
   */
  async scheduleSession(dto) {
    try {
      if (!dto || typeof dto !== 'object') throw new Error('Datos de sesión inválidos');
      validateId(dto.memberId, 'memberId');
      validateString(dto.scheduledAt, 'scheduledAt', 1, 20);

      log('📅 [scheduleSession] Agendando sesión para miembro:', dto.memberId);
      const response = await this.request('/counseling', {
        method: 'POST',
        body: JSON.stringify(dto),
      });
      log('✅ [scheduleSession] Éxito - ID:', response?.id);
      return response;
    } catch (error) {
      logError('❌ [scheduleSession] Error:', error.message);
      throw error;
    }
  }

  /**
   * Listar todas las sesiones del pastor autenticado.
   * GET /counseling
   * Retorna: CounselingSessionResponse[]
   */
  async getMySessions() {
    try {
      log('📋 [getMySessions] Obteniendo sesiones del pastor');
      const response = await this.request('/counseling');
      log('✅ [getMySessions] Éxito -', response?.length || 0, 'sesiones');
      return response;
    } catch (error) {
      logError('❌ [getMySessions] Error:', error.message);
      throw error;
    }
  }

  /**
   * Obtener el detalle de una sesión específica.
   * El backend valida que la sesión pertenezca al pastor autenticado.
   * GET /counseling/{id}
   * @param {number} id - ID de la sesión
   */
  async getCounselingSessionById(id) {
    try {
      validateId(id, 'sessionId');
      log('🔍 [getCounselingSessionById] Buscando sesión ID:', id);
      const response = await this.request(`/counseling/${id}`);
      return response;
    } catch (error) {
      logError('❌ [getCounselingSessionById] Error:', error.message);
      throw error;
    }
  }

  /**
   * Filtrar sesiones del pastor autenticado por estado.
   * GET /counseling/status/{status}
   * @param {string} status - SCHEDULED | COMPLETED | CANCELLED | NO_SHOW | RESCHEDULED
   */
  async getSessionsByStatus(status) {
    try {
      validateString(status, 'status', 1, 30);
      const validStatuses = ['SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW', 'RESCHEDULED'];
      if (!validStatuses.includes(status)) {
        throw new Error(`Estado inválido. Debe ser uno de: ${validStatuses.join(', ')}`);
      }
      log('🔍 [getSessionsByStatus] Filtrando por estado:', status);
      const response = await this.request(`/counseling/status/${status}`);
      log('✅ [getSessionsByStatus] Éxito -', response?.length || 0, 'sesiones');
      return response;
    } catch (error) {
      logError('❌ [getSessionsByStatus] Error:', error.message);
      throw error;
    }
  }

  /**
   * Historial completo de sesiones de un miembro gestionadas por el pastor autenticado.
   * GET /counseling/member/{memberId}/history
   * @param {number} memberId
   */
  async getMemberCounselingHistory(memberId) {
    try {
      validateId(memberId, 'memberId');
      log('📋 [getMemberCounselingHistory] Historial del miembro ID:', memberId);
      const response = await this.request(`/counseling/member/${memberId}/history`);
      log('✅ [getMemberCounselingHistory] Éxito -', response?.length || 0, 'sesiones');
      return response;
    } catch (error) {
      logError('❌ [getMemberCounselingHistory] Error:', error.message);
      throw error;
    }
  }

  /**
   * Actualizar los datos básicos de una sesión SCHEDULED o RESCHEDULED.
   * Si cambia el horario, el backend reinicia los flags de recordatorio.
   * PUT /counseling/{id}
   * @param {number} id - ID de la sesión
   * @param {Object} dto - CounselingSessionRequest (mismos campos que scheduleSession)
   */
  async updateCounselingSession(id, dto) {
    try {
      validateId(id, 'sessionId');
      if (!dto || typeof dto !== 'object') throw new Error('Datos de sesión inválidos');
      validateId(dto.memberId, 'memberId');

      log('📝 [updateCounselingSession] Actualizando sesión ID:', id);
      const response = await this.request(`/counseling/${id}`, {
        method: 'PUT',
        body: JSON.stringify(dto),
      });
      log('✅ [updateCounselingSession] Éxito');
      return response;
    } catch (error) {
      logError('❌ [updateCounselingSession] Error:', error.message);
      throw error;
    }
  }

  /**
   * Marcar la sesión como COMPLETED y registrar las notas del pastor.
   * PATCH /counseling/{id}/complete
   * @param {number} id - ID de la sesión
   * @param {Object} dto - CompleteSessionRequest
   *   { notes, followUpRequired, followUpNotes, followUpDate (yyyy-MM-dd'T'HH:mm) }
   */
  async completeSession(id, dto) {
    try {
      validateId(id, 'sessionId');
      if (!dto || typeof dto !== 'object') throw new Error('Datos de completado inválidos');
      if (!dto.notes || !dto.notes.trim()) throw new Error('Las notas son obligatorias para completar la sesión');

      log('✅ [completeSession] Completando sesión ID:', id);
      const response = await this.request(`/counseling/${id}/complete`, {
        method: 'PATCH',
        body: JSON.stringify(dto),
      });
      log('✅ [completeSession] Éxito');
      return response;
    } catch (error) {
      logError('❌ [completeSession] Error:', error.message);
      throw error;
    }
  }

  /**
   * Cancelar la sesión indicando el motivo.
   * PATCH /counseling/{id}/cancel
   * @param {number} id - ID de la sesión
   * @param {Object} dto - CancelSessionRequest { cancellationReason }
   */
  async cancelSession(id, dto) {
    try {
      validateId(id, 'sessionId');
      if (!dto || typeof dto !== 'object') throw new Error('Datos de cancelación inválidos');
      validateString(dto.cancellationReason, 'cancellationReason', 3, 500);

      log('❌ [cancelSession] Cancelando sesión ID:', id);
      const response = await this.request(`/counseling/${id}/cancel`, {
        method: 'PATCH',
        body: JSON.stringify(dto),
      });
      log('✅ [cancelSession] Éxito');
      return response;
    } catch (error) {
      logError('❌ [cancelSession] Error:', error.message);
      throw error;
    }
  }

  /**
   * Marcar el miembro como NO_SHOW (no asistió a la sesión programada).
   * PATCH /counseling/{id}/no-show
   * @param {number} id - ID de la sesión
   */
  async markSessionNoShow(id) {
    try {
      validateId(id, 'sessionId');
      log('👻 [markSessionNoShow] Marcando no-show sesión ID:', id);
      const response = await this.request(`/counseling/${id}/no-show`, {
        method: 'PATCH',
      });
      log('✅ [markSessionNoShow] Éxito');
      return response;
    } catch (error) {
      logError('❌ [markSessionNoShow] Error:', error.message);
      throw error;
    }
  }

  // ── Agrega este método dentro del bloque 🕊️ MÓDULO DE CONSEJERÍAS,
  // justo después de updateCounselingSession() y antes de completeSession() ──

  /**
   * Inicia una sesión en tiempo real (SCHEDULED/RESCHEDULED → IN_PROGRESS).
   * Devuelve StartSessionResponse con la sesión activa + contexto histórico completo del miembro:
   *   - previousSessions: últimas 5 sesiones completadas con notas y follow-ups
   *   - pendingFollowUps: seguimientos pendientes de sesiones anteriores
   *   - memberStats: estadísticas del miembro con este pastor
   *
   * PATCH /counseling/{id}/start
   * @param {number} id - ID de la sesión a iniciar
   * @returns {StartSessionResponse}
   */
  async startCounselingSession(id) {
    try {
      validateId(id, 'sessionId');
      log('▶️ [startCounselingSession] Iniciando sesión ID:', id);
      const response = await this.request(`/counseling/${id}/start`, {
        method: 'PATCH',
      });
      log('✅ [startCounselingSession] Sesión en curso -',
        response?.activeSession?.id,
        '| Sesiones previas:', response?.totalPreviousSessions || 0,
        '| Follow-ups pendientes:', response?.pendingFollowUps?.length || 0
      );
      return response;
    } catch (error) {
      logError('❌ [startCounselingSession] Error:', error.message);
      throw error;
    }
  }

  // ========== 📄 INFORMES PDF DE CONSEJERÍAS ==========

  /**
   * Genera y descarga el PDF con el historial de consejerías de un miembro.
   * GET /counseling/report/member/{memberId}
   * @param {number} memberId
   * @param {string} memberName - Nombre del miembro (solo para el nombre del archivo)
   */
  async downloadCounselingMemberHistoryPdf(memberId, memberName = '') {
    try {
      validateId(memberId, 'memberId');

      log('📄 [downloadCounselingMemberHistoryPdf] Generando PDF historial miembro:', memberId);
      const token = sessionStorage.getItem('token');
      const url = `${API_BASE_URL}/counseling/report/member/${memberId}`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401) {
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
        window.dispatchEvent(new CustomEvent('authTokenExpired'));
        throw new Error('Sesión expirada');
      }
      if (!res.ok) throw new Error(`Error generando PDF historial: ${res.status}`);

      const blob = await res.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      const safeName = memberName.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '') || memberId;
      link.download = `historial-consejeria-${safeName}.pdf`;
      link.click();
      URL.revokeObjectURL(link.href);

      log('✅ [downloadCounselingMemberHistoryPdf] Descarga iniciada');
    } catch (error) {
      logError('❌ [downloadCounselingMemberHistoryPdf] Error:', error.message);
      throw error;
    }
  }

  /**
   * Genera y descarga el PDF con el informe de gestión del pastor (sesiones por mes/año).
   * GET /counseling/report/management?year={year}
   * @param {number} year - Año del informe (default: año actual)
   */
  async downloadCounselingManagementReportPdf(year = null) {
    try {
      const reportYear = year || new Date().getFullYear();
      validateNumber(reportYear, 'year', 2000);

      log('📊 [downloadCounselingManagementReportPdf] Generando informe gestión año:', reportYear);
      const token = sessionStorage.getItem('token');
      const url = `${API_BASE_URL}/counseling/report/management?year=${reportYear}`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401) {
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
        window.dispatchEvent(new CustomEvent('authTokenExpired'));
        throw new Error('Sesión expirada');
      }
      if (!res.ok) throw new Error(`Error generando PDF de gestión: ${res.status}`);

      const blob = await res.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `informe-gestion-consejerias-${reportYear}.pdf`;
      link.click();
      URL.revokeObjectURL(link.href);

      log('✅ [downloadCounselingManagementReportPdf] Descarga iniciada');
    } catch (error) {
      logError('❌ [downloadCounselingManagementReportPdf] Error:', error.message);
      throw error;
    }
  }

  // ========== 🔔 RECORDATORIOS DE CONSEJERÍAS (admin/test) ==========

  /**
   * Fuerza el envío manual de recordatorios D-1 (día anterior).
   * Útil para pruebas o recuperación de fallos del scheduler.
   * POST /counseling/reminders/trigger-day-before
   * Solo PASTORES.
   */
  async triggerCounselingDayBeforeReminders() {
    try {
      log('🔔 [triggerCounselingDayBeforeReminders] Forzando recordatorios D-1');
      const response = await this.request('/counseling/reminders/trigger-day-before', {
        method: 'POST',
      });
      log('✅ [triggerCounselingDayBeforeReminders] Éxito');
      return response;
    } catch (error) {
      logError('❌ [triggerCounselingDayBeforeReminders] Error:', error.message);
      throw error;
    }
  }

  /**
   * Fuerza el envío manual de recordatorios D-0 (día de la sesión).
   * POST /counseling/reminders/trigger-day-of
   * Solo PASTORES.
   */
  async triggerCounselingDayOfReminders() {
    try {
      log('🔔 [triggerCounselingDayOfReminders] Forzando recordatorios D-0');
      const response = await this.request('/counseling/reminders/trigger-day-of', {
        method: 'POST',
      });
      log('✅ [triggerCounselingDayOfReminders] Éxito');
      return response;
    } catch (error) {
      logError('❌ [triggerCounselingDayOfReminders] Error:', error.message);
      throw error;
    }
  }

  // ============================================================
  // FIN DEL BLOQUE 🕊️ MÓDULO DE CONSEJERÍAS PASTORALES
  // ============================================================

  // ============================================================
  // AGREGAR en apiService.js, dentro de la clase ApiService,
  // justo antes del cierre de la clase (última línea con solo  }  )
  //
  // Cubre:
  //  - Actividades ENROLLMENT disponibles para un miembro
  //  - Actualizar requiresPayment de un nivel
  // ============================================================

  // ========== 🎓 ACTIVIDADES ENROLLMENT DISPONIBLES ==========

  /**
   * Devuelve las actividades ENROLLMENT activas y no vencidas para las que
   * un miembro es elegible según su nivel actual (currentLevel).
   *
   * Solo incluye actividades cuyo nivel tiene requiresPayment = true y para
   * las que el miembro cumple la regla de nivel previo:
   *   - Primer nivel (isFirst) → acceso abierto
   *   - Cualquier otro        → currentLevel.levelOrder == requiredLevel.levelOrder - 1
   *
   * GET /api/v1/activity/enrollment/available/{memberId}
   *
   * Respuesta: AvailableEnrollmentActivityDTO[]
   * {
   *   activityId, activityName, price, endDate,
   *   requiredLevelId, requiredLevelCode, requiredLevelDisplayName, requiredLevelOrder,
   *   linkedEnrollmentId, cohortName,
   *   openAccess,        ← true si es el primer nivel (sin requisito previo)
   *   eligibilityReason  ← mensaje legible para mostrar al miembro
   * }
   *
   * @param {number} memberId - ID del miembro
   */
  async getAvailableEnrollmentActivities(memberId) {
    try {
      validateId(memberId, "memberId");
      log("🎓 [getAvailableEnrollmentActivities] Miembro ID:", memberId);
      const response = await this.request(
        `/activity/enrollment/available/${memberId}`
      );
      log(
        "✅ [getAvailableEnrollmentActivities] Éxito -",
        response?.length || 0,
        "actividades disponibles"
      );
      return response || [];
    } catch (error) {
      logError("❌ [getAvailableEnrollmentActivities] Error:", error.message);
      throw error;
    }
  }

  // ========== ⚙️ NIVELES — ACTUALIZAR requiresPayment ==========

  /**
   * Actualiza los campos de un nivel formativo.
   * Permite cambiar requiresPayment sin tocar código ni migraciones.
   *
   * PUT /api/v1/levels/{id}
   * Body (todos opcionales):
   *   { displayName, description, levelOrder, isActive, requiresPayment }
   *
   * Requiere rol: PASTORES
   *
   * @param {number} levelId   - ID del nivel a actualizar
   * @param {Object} updates   - Campos a cambiar
   * @param {boolean} [updates.requiresPayment] - true/false
   * @param {string}  [updates.displayName]
   * @param {string}  [updates.description]
   * @param {number}  [updates.levelOrder]
   * @param {boolean} [updates.isActive]
   */
  async updateLevel(levelId, updates) {
    try {
      validateId(levelId, "levelId");
      if (!updates || typeof updates !== "object") {
        throw new Error("Datos de actualización inválidos");
      }

      log("⚙️ [updateLevel] Actualizando nivel ID:", levelId, updates);
      const response = await this.request(`/levels/${levelId}`, {
        method: "PUT",
        body: JSON.stringify(updates),
      });
      log(
        "✅ [updateLevel] Nivel actualizado:",
        response?.code,
        "requiresPayment:",
        response?.requiresPayment
      );
      return response;
    } catch (error) {
      logError("❌ [updateLevel] Error:", error.message);
      throw error;
    }
  }

  // En apiService.js, agrega:

  /**
   * Obtiene notificaciones activas por username (NO requiere ID)
   */
  // ✅ CORRECTO - Solo la ruta relativa
  getActiveNotificationsByUsername(username) {
    return this.request(`/notifications/user/by-username/${username}/active`, {  // ← BIEN
      method: 'GET',
      requiresAuth: true
    });
  }

  /**
   * Obtiene conteo de notificaciones sin leer por username
   */
  getUnreadNotificationCountByUsername(username) {
    return this.request(`/notifications/user/by-username/${username}/unread-count`, {
      method: 'GET',
      requiresAuth: true
    }).then(data => data.unreadCount);
  }

  // ============================================================
  // Cubre:
  //  - CRUD completo de LevelEnrollment
  //  - CRUD completo de LessonTemplate
  // ============================================================

  // ========== ⚙️ NIVELES FORMATIVOS — CRUD COMPLETO ==========

  /**
   * Crear nuevo nivel formativo.
   * POST /api/v1/levels
   * Requiere rol: PASTORES
   * @param {Object} levelData - { code, displayName, description, levelOrder, isActive, requiresPayment }
   */
  async createLevel(levelData) {
    try {
      if (!levelData || typeof levelData !== 'object') {
        throw new Error('Datos de nivel inválidos');
      }
      log('✅ [createLevel] Creando nivel:', levelData.code);
      const response = await this.request('/levels', {
        method: 'POST',
        body: JSON.stringify(levelData),
      });
      log('✅ [createLevel] Éxito - ID:', response?.id);
      return response;
    } catch (error) {
      logError('❌ [createLevel] Error:', error.message);
      throw error;
    }
  }

  /**
   * Desactivar nivel (borrado lógico).
   * DELETE /api/v1/levels/{id}
   * Requiere rol: PASTORES
   * @param {number} id
   */
  async deactivateLevel(id) {
    try {
      validateId(id, 'levelId');
      log('🚫 [deactivateLevel] Desactivando nivel ID:', id);
      const response = await this.request(`/levels/${id}`, {
        method: 'DELETE',
      });
      log('✅ [deactivateLevel] Éxito');
      return response;
    } catch (error) {
      logError('❌ [deactivateLevel] Error:', error.message);
      throw error;
    }
  }

  // ========== 📖 LECCIONES PLANTILLA — CRUD COMPLETO ==========

  /**
   * Listar todas las plantillas de lección de un nivel (activas e inactivas).
   * GET /api/v1/lesson-templates/level/{levelCode}
   * @param {string} levelCode - Código del nivel (ej: ESENCIA_1)
   */
  async getLessonTemplatesByLevel(levelCode) {
    try {
      validateString(levelCode, 'levelCode', 1, 50);
      log('📖 [getLessonTemplatesByLevel] Nivel:', levelCode);
      const response = await this.request(`/lesson-templates/level/${levelCode.toUpperCase()}`);
      log('✅ [getLessonTemplatesByLevel] Éxito -', response?.length || 0, 'plantillas');
      return response;
    } catch (error) {
      logError('❌ [getLessonTemplatesByLevel] Error:', error.message);
      throw error;
    }
  }

  /**
   * Crear nueva plantilla de lección.
   * POST /api/v1/lesson-templates
   * Requiere rol: PASTORES
   * Body: { level: { id }, lessonName, lessonOrder, defaultDurationMinutes }
   */
  async createLessonTemplate(templateData) {
    try {
      if (!templateData || typeof templateData !== 'object') {
        throw new Error('Datos de plantilla inválidos');
      }
      log('✅ [createLessonTemplate] Creando:', templateData.lessonName);
      const response = await this.request('/lesson-templates', {
        method: 'POST',
        body: JSON.stringify(templateData),
      });
      log('✅ [createLessonTemplate] Éxito - ID:', response?.id);
      return response;
    } catch (error) {
      logError('❌ [createLessonTemplate] Error:', error.message);
      throw error;
    }
  }

  /**
   * Actualizar plantilla de lección.
   * PUT /api/v1/lesson-templates/{id}
   * Requiere rol: PASTORES
   * @param {number} id
   * @param {Object} updates - { lessonName, lessonOrder, defaultDurationMinutes, isActive }
   */
  async updateLessonTemplate(id, updates) {
    try {
      validateId(id, 'lessonTemplateId');
      if (!updates || typeof updates !== 'object') {
        throw new Error('Datos de actualización inválidos');
      }
      log('📝 [updateLessonTemplate] Actualizando ID:', id);
      const response = await this.request(`/lesson-templates/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
      log('✅ [updateLessonTemplate] Éxito');
      return response;
    } catch (error) {
      logError('❌ [updateLessonTemplate] Error:', error.message);
      throw error;
    }
  }

  /**
   * Desactivar plantilla de lección (borrado lógico).
   * DELETE /api/v1/lesson-templates/{id}
   * Requiere rol: PASTORES
   * @param {number} id
   */
  async deactivateLessonTemplate(id) {
    try {
      validateId(id, 'lessonTemplateId');
      log('🚫 [deactivateLessonTemplate] Desactivando ID:', id);
      const response = await this.request(`/lesson-templates/${id}`, {
        method: 'DELETE',
      });
      log('✅ [deactivateLessonTemplate] Éxito');
      return response;
    } catch (error) {
      logError('❌ [deactivateLessonTemplate] Error:', error.message);
      throw error;
    }
  }

  // ============================================================
  // FIN DEL BLOQUE — CRUD Niveles y Plantillas de Lección
  // ============================================================

}

const apiService = new ApiService();
export default apiService;