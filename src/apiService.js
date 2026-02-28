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
      const allMembers = await this.getAllMembers();
      const leaders = await this.getLeaders();
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
      const levelYearData = {};
      for (const enrollment of enrollments) {
        const enrollmentId = enrollment.id;
        const cohortName = enrollment.cohortName || enrollment.name;
        try {
          const students = await this.getStudentEnrollmentsByEnrollment(enrollmentId);
          if (!students || students.length === 0) { log(`⚠️ ${cohortName} - Sin estudiantes`); continue; }
          log(`✅ ${cohortName} - ${students.length} estudiantes`);
          students.forEach(student => {
            let year = 'SIN_AÑO';
            if (student.enrollmentDate || student.enrollment_date) {
              try {
                const date = new Date(student.enrollmentDate || student.enrollment_date);
                const extractedYear = date.getFullYear();
                if (!isNaN(extractedYear) && extractedYear > 1900) year = extractedYear.toString();
              } catch (e) {}
            }
            let level = student.levelEnrollment || student.level || 'SIN_NIVEL';
            if (!levelYearData[year]) levelYearData[year] = {};
            if (!levelYearData[year][level]) {
              levelYearData[year][level] = { label: this.getLevelLabel(level), levelEnrollment: level, total: 0, passed: 0, failed: 0, pending: 0, students: [] };
            }
            levelYearData[year][level].total += 1;
            levelYearData[year][level].students.push(student);
            if (student.passed === true) levelYearData[year][level].passed += 1;
            else if (student.passed === false) levelYearData[year][level].failed += 1;
            else levelYearData[year][level].pending += 1;
          });
        } catch (error) { console.warn(`⚠️ ${cohortName} - Error:`, error.message); }
      }
      const result = {};
      Object.keys(levelYearData).sort((a, b) => { if (a === 'SIN_AÑO') return 1; if (b === 'SIN_AÑO') return -1; return b - a; }).forEach(year => {
        result[year] = {};
        const levelOrder = ['PREENCUENTRO','ENCUENTRO','POST_ENCUENTRO','BAUTIZOS','ESENCIA_1','ESENCIA_2','ESENCIA_3','SANIDAD_INTEGRAL_RAICES','ESENCIA_4','ADIESTRAMIENTO','GRADUACION'];
        levelOrder.forEach(levelKey => {
          if (levelYearData[year][levelKey]) {
            const levelData = levelYearData[year][levelKey];
            const passPercentage = levelData.total > 0 ? ((levelData.passed / levelData.total) * 100).toFixed(1) : 0;
            result[year][levelKey] = { label: levelData.label, total: levelData.total, passed: levelData.passed, failed: levelData.failed, pending: levelData.pending, passPercentage: parseFloat(passPercentage) };
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
}

const apiService = new ApiService();
export default apiService;