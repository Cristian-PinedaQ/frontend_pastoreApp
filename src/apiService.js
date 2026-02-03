// 🔌 Servicio API centralizado - SEGURIDAD MEJORADA
// ✅ Debug condicional (no expone datos en producción)
// ✅ Validación de entrada
// ✅ Mensajes de error genéricos
// ✅ Export con nombre (ESLint compliance)
//Produccion
//const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://pastoreapp.cloud/api/v1';
//desarrollo
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api/v1';

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

const validateNumber = (value, fieldName, min = 0) => {
  const num = parseFloat(value);
  if (isNaN(num) || num < min) {
    throw new Error(`${fieldName} inválido`);
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
  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const config = {
      ...options,
      headers: this.getHeaders(),
    };

    try {
      log('📡 [request] Iniciando:', { method: config.method || 'GET', endpoint });

      const response = await fetch(url, config);

      // ✅ Manejo de token expirado
      if (response.status === 401) {
        log('⚠️ [request] Token expirado (401)');
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
        
        // Notificar al AuthContext sin hacer redirección forzada
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

        // ✅ Extraer errores de validación específicos
        let errorMessage = '';

        if (errorData.fieldErrors && typeof errorData.fieldErrors === 'object') {
          // Errores de validación por campo
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
          // ✅ Mensaje genérico en producción
          errorMessage = DEBUG ? JSON.stringify(errorData) : 'Error en la solicitud';
        }

        logError('❌ [request] Mensaje:', errorMessage);
        throw new Error(errorMessage);
      }

      const data = await response.json();
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
        validateNumber(updateData.finalAttendancePercentage, 'finalAttendancePercentage', 0);
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
      // ✅ Validaciones
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
      return this.request('/users');
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
      return this.request(`/users/${id}`, {
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
      return this.request(`/users/${id}`, {
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

      // ✅ Auto-llenar recordedBy con username del usuario actual
      let recordedBy = financeData.recordedBy;
      if (!recordedBy) {
        const currentUser = this.getCurrentUser();
        recordedBy = currentUser?.username || 'Sistema';
        log('📝 [createFinance] recordedBy auto-llenado con:', recordedBy);
      }

      const body = {
        memberId: validateNumber(financeData.memberId, 'memberId'),
        memberName: financeData.memberName,
        amount: validateNumber(financeData.amount, 'amount'),
        incomeConcept: financeData.incomeConcept,
        incomeMethod: financeData.incomeMethod,
        description: financeData.description || '',
        recordedBy: recordedBy,
        registrationDate: financeData.registrationDate,
        isVerified: financeData.isVerified || false,
      };

      log('📤 [createFinance] Creando finanza');

      const response = await this.request('/finances', {
        method: 'POST',
        body: JSON.stringify(body),
      });

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

      // ✅ Auto-llenar recordedBy con username del usuario actual
      let recordedBy = financeData.recordedBy;
      if (!recordedBy) {
        const currentUser = this.getCurrentUser();
        recordedBy = currentUser?.username || 'Sistema';
        log('📝 [updateFinance] recordedBy auto-llenado con:', recordedBy);
      }

      const body = {
        memberId: validateNumber(financeData.memberId, 'memberId'),
        memberName: financeData.memberName,
        amount: validateNumber(financeData.amount, 'amount'),
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

  // ========== 📊 ESTADÍSTICAS ==========

  async getStatisticsByLevelAndYear() {
    try {
      log('📊 [getStatisticsByLevelAndYear] Iniciando');

      const enrollments = await this.getEnrollments();
      log(`📋 Cohortes obtenidas: ${enrollments.length}`);

      const levelYearData = {};

      for (const enrollment of enrollments) {
        const enrollmentId = enrollment.id;
        const cohortName = enrollment.cohortName || enrollment.name;

        try {
          const students = await this.getStudentEnrollmentsByEnrollment(enrollmentId);

          if (!students || students.length === 0) {
            log(`⚠️ ${cohortName} - Sin estudiantes`);
            continue;
          }

          log(`✅ ${cohortName} - ${students.length} estudiantes`);

          students.forEach(student => {
            let year = 'SIN_AÑO';
            if (student.enrollmentDate || student.enrollment_date) {
              try {
                const date = new Date(student.enrollmentDate || student.enrollment_date);
                const extractedYear = date.getFullYear();
                if (!isNaN(extractedYear) && extractedYear > 1900) {
                  year = extractedYear.toString();
                }
              } catch (e) {
                // Mantener SIN_AÑO
              }
            }

            let level = student.levelEnrollment || student.level || 'SIN_NIVEL';

            if (!levelYearData[year]) {
              levelYearData[year] = {};
            }
            if (!levelYearData[year][level]) {
              levelYearData[year][level] = {
                label: this.getLevelLabel(level),
                levelEnrollment: level,
                total: 0,
                passed: 0,
                failed: 0,
                pending: 0,
                students: []
              };
            }

            levelYearData[year][level].total += 1;
            levelYearData[year][level].students.push(student);

            if (student.passed === true) {
              levelYearData[year][level].passed += 1;
            } else if (student.passed === false) {
              levelYearData[year][level].failed += 1;
            } else {
              levelYearData[year][level].pending += 1;
            }
          });

        } catch (error) {
          console.warn(`⚠️ ${cohortName} - Error:`, error.message);
        }
      }

      const result = {};

      Object.keys(levelYearData)
        .sort((a, b) => {
          if (a === 'SIN_AÑO') return 1;
          if (b === 'SIN_AÑO') return -1;
          return b - a;
        })
        .forEach(year => {
          result[year] = {};

          const levelOrder = [
            'PREENCUENTRO', 'ENCUENTRO', 'POST_ENCUENTRO', 'BAUTIZOS',
            'EDIRD_1', 'EDIRD_2', 'EDIRD_3', 'SANIDAD_INTEGRAL_RAICES', 'EDIRD_4',
            'ADIESTRAMIENTO', 'GRADUACION'
          ];

          levelOrder.forEach(levelKey => {
            if (levelYearData[year][levelKey]) {
              const levelData = levelYearData[year][levelKey];
              const passPercentage = levelData.total > 0
                ? ((levelData.passed / levelData.total) * 100).toFixed(1)
                : 0;

              result[year][levelKey] = {
                label: levelData.label,
                total: levelData.total,
                passed: levelData.passed,
                failed: levelData.failed,
                pending: levelData.pending,
                passPercentage: parseFloat(passPercentage),
              };

              log(`📊 ${year} - ${levelData.label}: ${levelData.total} estudiantes, ${levelData.passed} aprobados`);
            }
          });
        });

      log('✅ [getStatisticsByLevelAndYear] Completado');
      return result;

    } catch (error) {
      logError('❌ [getStatisticsByLevelAndYear] Error:', error);
      throw error;
    }
  }

  /**
   * ✅ Helper: Traducir nombre del nivel
   */
  getLevelLabel(levelEnrollment) {
    const levelMap = {
      'PREENCUENTRO': 'Pre-encuentro',
      'ENCUENTRO': 'Encuentro',
      'POST_ENCUENTRO': 'Post-encuentro',
      'BAUTIZOS': 'Bautizos',
      'EDIRD_1': 'EDIRD 1',
      'EDIRD_2': 'EDIRD 2',
      'EDIRD_3': 'EDIRD 3',
      'SANIDAD_INTEGRAL_RAICES': 'Sanidad Integral Raíces',
      'EDIRD_4': 'EDIRD 4',
      'ADIESTRAMIENTO': 'Adiestramiento',
      'GRADUACION': 'Graduación',
    };
    return levelMap[levelEnrollment] || levelEnrollment;
  }
}

const apiService = new ApiService();
export default apiService;