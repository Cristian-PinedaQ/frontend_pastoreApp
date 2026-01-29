// 🔌 Servicio API centralizado - ACTUALIZADO PARA USAR sessionStorage
// ✅ Ahora usa sessionStorage para el token (se limpia al cerrar la pestaña)
// ✅ Rutas de endpoint corregidas
// ✅ MEJORADO: Extrae errores de validación específicos del backend
// ✅ NUEVO: Métodos para editar cohortes
// ✅ FIXED: createFinance y updateFinance ahora incluyen recordedBy y registrationDate
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api/v1';

class ApiService {
  constructor() {
    // ✅ ACTUALIZADO: Usar sessionStorage en lugar de localStorage
    this.token = sessionStorage.getItem('token');
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

      if (response.status === 401) {
        this.logout();
        window.location.href = '/login';
        throw new Error('Token expirado');
      }

      if (!response.ok) {
        let errorData = {};
        try {
          errorData = await response.json();
        } catch (e) {
          errorData = { message: `Error ${response.status}` };
        }

        console.error('❌ ERROR DEL SERVIDOR:', JSON.stringify(errorData, null, 2));

        // 🔴 MEJORADO: Extraer errores de validación específicos por campo
        let errorMessage = '';
        
        // Si hay fieldErrors (errores de validación), priorizar esos
        if (errorData.fieldErrors && typeof errorData.fieldErrors === 'object') {
          const fieldErrorsArray = Object.entries(errorData.fieldErrors)
            .map(([field, message]) => `${field}: ${message}`)
            .join(' | ');
          errorMessage = fieldErrorsArray;
        } 
        // Sino, usar el mensaje general
        else if (typeof errorData === 'string') {
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
          errorMessage = `Error ${response.status}: ${JSON.stringify(errorData)}`;
        }

        console.error('❌ MENSAJE DE ERROR:', errorMessage);
        throw new Error(errorMessage);
      }

      return await response.json();
    } catch (error) {
      console.error('🔴 Error en API:', error.message);
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

  // ✅ ACTUALIZADO: Guardar token en sessionStorage
  setToken(token) {
    this.token = token;
    sessionStorage.setItem('token', token);
  }

  // ✅ ACTUALIZADO: Logout - limpiar sessionStorage
  logout() {
    this.token = null;
    sessionStorage.removeItem('token');
  }

  // ========== 👥 MIEMBROS ==========
  async getMembers(page = 0, limit = 10) {
    return this.request(`/member?page=${page}&limit=${limit}`);
  }

  async getMemberById(id) {
    return this.request(`/member/find/${id}`);
  }

  async getAllMembers() {
    return this.request('/member/findAll');
  }

  async createMember(memberData) {
    return this.request('/member/save', {
      method: 'POST',
      body: JSON.stringify(memberData),
    });
  }

  async updateMember(id, memberData) {
    return this.request(`/member/patch/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(memberData),
    });
  }

  async deleteMember(id) {
    return this.request(`/member/delete/${id}`, {
      method: 'DELETE',
    });
  }

  async enrollMemberInNextLevel(id) {
    return this.request(`/member/enroll-next-level/${id}`, {
      method: 'POST',
    });
  }

  async getMemberEnrollmentHistory(id) {
    return this.request(`/member/enrollment-history/${id}`);
  }

  // ========== 📋 COHORTES (ENROLLMENTS) ==========
  /**
   * ✅ Obtener TODAS las cohortes
   */
  async getEnrollments() {
    return this.request('/enrollment/cohorts/findAll');
  }
  async getEnrollmentsCard() {
    return this.request('/enrollment');
  }

  /**
   * Obtener cohortes con paginación
   */
  async getEnrollmentsPaginated(page = 0, limit = 10) {
    return this.request(`/enrollment?page=${page}&limit=${limit}`);
  }

  /**
   * ✅ Obtener una cohorte específica por ID
   */
  async getEnrollmentById(id) {
    return this.request(`/enrollment/cohorts/find/${id}`);
  }

  /**
   * Obtener cohortes disponibles por nivel
   */
  async getAvailableCohortsByLevel(level) {
    return this.request(`/enrollment/available-cohorts/${level}`);
  }

  /**
   * ✅ Crear nueva cohorte
   */
  async createEnrollment(enrollmentData) {
    return this.request('/enrollment/create-cohort', {
      method: 'POST',
      body: JSON.stringify(enrollmentData),
    });
  }

  /**
   * ✅ Actualizar ESTADO de una cohorte
   */
  async updateEnrollmentStatus(id, status) {
    return this.request(`/enrollment/cohort/${id}/status?status=${status}`, {
      method: 'PUT',
    });
  }

  /**
   * ✅ NUEVO: Editar una cohorte existente
   * PUT /api/v1/enrollment/cohorts/{id}/edit
   * 
   * Permite editar: cohortName, level, startDate, endDate, maxStudents,
   * minAttendancePercentage, minAverageScore, teacher
   */
  async editEnrollment(enrollmentId, updateData) {
    try {
      console.log('📝 [editEnrollment] Editando cohorte ID:', enrollmentId);
      console.log('   Datos a actualizar:', updateData);

      const response = await this.request(`/enrollment/cohorts/${enrollmentId}/edit`, {
        method: 'PUT',
        body: JSON.stringify(updateData),
      });

      console.log('✅ [editEnrollment] Éxito:', response);
      return response;
    } catch (error) {
      console.error('❌ [editEnrollment] Error:', error.message);
      throw error;
    }
  }

  /**
   * ✅ NUEVO: Editar cohorte y cambiar estado (con cancelación cascada si aplica)
   * PUT /api/v1/enrollment/cohorts/{id}/edit-with-status?newStatus=X
   * 
   * 🔴 IMPORTANTE: Si newStatus = CANCELLED, automáticamente cancela todos los estudiantes inscritos
   * 
   * @param {number} enrollmentId - ID de la cohorte
   * @param {object} updateData - Datos a actualizar (mismo formato que editEnrollment)
   * @param {string} newStatus - Nuevo estado (PENDING, ACTIVE, SUSPENDED, CANCELLED, COMPLETED)
   * @returns {Promise} Respuesta del servidor
   */
  async editEnrollmentWithStatus(enrollmentId, updateData, newStatus) {
    try {
      console.log('📝 [editEnrollmentWithStatus] Editando cohorte ID:', enrollmentId);
      console.log('   Datos a actualizar:', updateData);
      console.log('   Nuevo estado:', newStatus);

      const params = newStatus ? `?newStatus=${newStatus}` : '';
      
      const response = await this.request(`/enrollment/cohorts/${enrollmentId}/edit-with-status${params}`, {
        method: 'PUT',
        body: JSON.stringify(updateData),
      });

      console.log('✅ [editEnrollmentWithStatus] Éxito:', response);
      
      // Si la cohorte fue cancelada, advertencia especial
      if (newStatus === 'CANCELLED') {
        console.warn('🚫 ATENCIÓN: Se cancelaron todos los estudiantes inscritos en esta cohorte');
      }

      return response;
    } catch (error) {
      console.error('❌ [editEnrollmentWithStatus] Error:', error.message);
      throw error;
    }
  }

  // ========== 🎓 INSCRIPCIONES DE ESTUDIANTES ==========
  /**
   * ✅ Obtener todas las inscripciones
   */
  async getStudentEnrollments(page = 0, limit = 10) {
    return this.request(`/student-enrollment?page=${page}&limit=${limit}`);
  }

  /**
   * Obtener inscripción por ID
   */
  async getStudentEnrollmentById(id) {
    return this.request(`/student-enrollment/${id}`);
  }

  /**
   * ✅ CORREGIDO: Obtener estudiantes de una cohorte específica
   * Ruta correcta: /api/v1/student-enrollment/by-cohort/{enrollmentId}
   */
  async getStudentEnrollmentsByEnrollment(enrollmentId) {
    try {
      console.log('📡 [Intento 1] Obteniendo estudiantes de cohorte ID:', enrollmentId);

      // ✅ RUTA CORRECTA: /student-enrollment/by-cohort/{id}
      const response = await this.request(`/student-enrollment/by-cohort/${enrollmentId}`);

      console.log('✅ [Intento 1] Estudiantes obtenidos:', response?.length || 0);
      console.log('   Datos:', response);

      return response;
    } catch (error) {
      console.warn('⚠️ [Intento 1] Error:', error.message);

      // Alternativa 2: Si el endpoint anterior no existe, intentar obtener desde enrollment
      try {
        console.log('📡 [Intento 2] Intentando obtener estudiantes desde enrollment...');
        const enrollment = await this.request(`/enrollment/${enrollmentId}`);
        const students = enrollment?.studentEnrollments || [];
        console.log('✅ [Intento 2] Estudiantes obtenidos (alternativa):', students.length);
        return students;
      } catch (err2) {
        console.error('❌ [Intento 2] Error:', err2.message);

        // Alternativa 3: Obtener todos los student enrollments y filtrar
        try {
          console.log('📡 [Intento 3] Intentando obtener todos los student enrollments...');
          const allStudentEnrollments = await this.request('/student-enrollment');
          const filtered = allStudentEnrollments?.filter(se => se.enrollmentId === enrollmentId) || [];
          console.log('✅ [Intento 3] Estudiantes obtenidos (alternativa 2):', filtered.length);
          return filtered;
        } catch (err3) {
          console.error('❌ [Intento 3] Error:', err3.message);
          console.error('❌ NO SE PUDO OBTENER ESTUDIANTES DE NINGUNA FORMA');
          return [];
        }
      }
    }
  }

  /**
   * Obtener inscripciones de un miembro específico
   */
  async getStudentEnrollmentsByMember(memberId) {
    return this.request(`/student-enrollment/by-member/${memberId}`);
  }

  /**
   * Crear nueva inscripción de estudiante
   */
  async createStudentEnrollment(memberId, enrollmentId) {
    return this.request(`/student-enrollment?memberId=${memberId}&enrollmentId=${enrollmentId}`, {
      method: 'POST',
    });
  }

  /**
   * Actualizar inscripción de estudiante
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
   * Dar de baja a un estudiante
   */
  async withdrawStudentFromCohort(id) {
    return this.request(`/student-enrollment/${id}/withdraw`, {
      method: 'POST',
    });
  }

  /**
   * Eliminar inscripción
   */
  async deleteStudentEnrollment(id) {
    return this.request(`/student-enrollment/${id}`, {
      method: 'DELETE',
    });
  }

  /**
   * Obtener reporte detallado de una inscripción
   */
  async getStudentDetailedReport(id) {
    return this.request(`/student-enrollment/${id}/detailed-report`);
  }

  // ========== 📖 LECCIONES ==========
  /**
   * ✅ Obtener lecciones con paginación
   */
  async getLessons(page = 0, limit = 10) {
    return this.request(`/lesson?page=${page}&limit=${limit}`);
  }

  /**
   * Obtener una lección por ID
   */
  async getLessonById(id) {
    return this.request(`/lesson/${id}`);
  }

  /**
   * ✅ Obtener lecciones de una cohorte específica
   */
  async getLessonsByEnrollment(enrollmentId) {
    return this.request(`/lesson/enrollment/${enrollmentId}`);
  }

  /**
   * ✅ Crear nueva lección
   */
  async createLesson(lessonData) {
    return this.request('/lesson', {
      method: 'POST',
      body: JSON.stringify(lessonData),
    });
  }

  /**
   * ✅ Crear plan de lecciones predeterminado por nivel
   * Solo PASTORES y AREAS pueden crear
   */
  async createDefaultLessonPlan(enrollmentId) {
    return this.request(`/lesson/create-plan/${enrollmentId}`, {
      method: 'POST',
    });
  }

  /**
   * Actualizar lección
   */
  async updateLesson(id, lessonData) {
    return this.request(`/lesson/${id}`, {
      method: 'PUT',
      body: JSON.stringify(lessonData),
    });
  }

  /**
   * Eliminar lección
   */
  async deleteLesson(id) {
    return this.request(`/lesson/${id}`, {
      method: 'DELETE',
    });
  }

  // ========== ✅ ASISTENCIAS ==========
  /**
   * ✅ Registrar asistencia de un estudiante
   * 🔴 IMPORTANTE: El backend espera JSON en el body (@RequestBody)
   * NO parámetros en la URL
   * 
   * Formato esperado por el backend:
   * {
   *   "studentEnrollmentId": 15,
   *   "lessonId": 17,
   *   "present": true,
   *   "recordedBy": "admin",
   *   "score": "POCA_PARTICIPACION"
   * }
   */
  async recordAttendance(attendanceData) {
    console.log('📤 [recordAttendance] INICIANDO');
    console.log('  📋 Datos recibidos:', attendanceData);

    try {
      // Validaciones
      if (!attendanceData.studentEnrollmentId) throw new Error('studentEnrollmentId requerido');
      if (!attendanceData.lessonId) throw new Error('lessonId requerido');
      if (!attendanceData.recordedBy) throw new Error('recordedBy requerido');
      if (attendanceData.present === undefined && attendanceData.present === null) throw new Error('present requerido');
      if (!attendanceData.score) throw new Error('score requerido');

      // Construir el body JSON exactamente como espera el backend
      const bodyData = {
        studentEnrollmentId: Number(attendanceData.studentEnrollmentId),
        lessonId: Number(attendanceData.lessonId),
        present: attendanceData.present === true,  // boolean true/false
        recordedBy: String(attendanceData.recordedBy),
        score: String(attendanceData.score)  // Nombre del enum: POCA_PARTICIPACION, etc
      };

      console.log('📋 JSON a enviar en el body:');
      console.log(JSON.stringify(bodyData, null, 2));

      console.log('📤 Enviando POST request con JSON en el body...');

      // Enviar como JSON en el body (NO parámetros URL)
      const response = await this.request('/attendance/record', {
        method: 'POST',
        body: JSON.stringify(bodyData)  // ✅ JSON en el body
      });

      console.log('✅ [recordAttendance] EXITOSA');
      console.log('   Respuesta:', response);
      return response;

    } catch (error) {
      console.error('❌ [recordAttendance] ERROR:');
      console.error('   Mensaje:', error.message);
      console.error('   Datos intentados:', {
        studentEnrollmentId: attendanceData.studentEnrollmentId,
        lessonId: attendanceData.lessonId,
        present: attendanceData.present,
        recordedBy: attendanceData.recordedBy,
        score: attendanceData.score
      });
      throw error;
    }
  }

  /**
   * ✅ Obtener asistencias de una lección
   */
  async getAttendancesByLesson(lessonId) {
    return this.request(`/attendance/lesson/${lessonId}`);
  }

  /**
   * Inicializar asistencias para una lección
   */
  async initializeLessonAttendance(lessonId) {
    return this.request(`/attendance/lesson/${lessonId}/initialize`, {
      method: 'POST',
    });
  }

  /**
   * Obtener reporte de asistencia de un estudiante
   */
  async getStudentAttendanceReport(studentId) {
    return this.request(`/attendance/student/${studentId}/report`);
  }

  /**
   * Actualizar asistencia
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
   */
  async getUsers() {
    return this.request('/users');
  }

  /**
   * Actualizar usuario
   */
  async updateUser(id, userData) {
    return this.request(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  }

  /**
   * Eliminar usuario
   */
  async deleteUser(id) {
    return this.request(`/users/${id}`, {
      method: 'DELETE',
    });
  }

  // ========== 💰 FINANZAS ==========

  /**
   * ✅ Obtener todas las finanzas paginado
   */
  async getFinances(page = 0, limit = 10) {
    try {
      console.log('📡 [getFinances] Obteniendo finanzas - Página:', page);

      const response = await this.request(`/finances?page=${page}&limit=${limit}`);

      console.log('✅ [getFinances] Finanzas obtenidas:', response?.content?.length || 0);
      return response;
    } catch (error) {
      console.error('❌ [getFinances] Error:', error.message);
      throw error;
    }
  }

  /**
   * ✅ Obtener una finanza por ID
   */
  async getFinanceById(id) {
    try {
      console.log('📡 [getFinanceById] Obteniendo finanza ID:', id);

      const response = await this.request(`/finances/${id}`);

      console.log('✅ [getFinanceById] Finanza obtenida');
      return response;
    } catch (error) {
      console.error('❌ [getFinanceById] Error:', error.message);
      throw error;
    }
  }

  /**
   * ✅ Crear nueva finanza
   * 🔧 FIXED: Ahora incluye recordedBy, registrationDate e isVerified
   */
  async createFinance(financeData) {
    try {
      console.log('📤 [createFinance] Creando nueva finanza');
      console.log('   Datos:', financeData);

      const body = {
        memberId: financeData.memberId,
        memberName: financeData.memberName,
        amount: financeData.amount,
        incomeConcept: financeData.incomeConcept,
        incomeMethod: financeData.incomeMethod,
        description: financeData.description || '',
        recordedBy: financeData.recordedBy,  // ✅ INCLUIDO
        registrationDate: financeData.registrationDate,  // ✅ INCLUIDO
        isVerified: financeData.isVerified,  // ✅ AHORA INCLUIDO
      };

      console.log('📋 Body a enviar:', JSON.stringify(body, null, 2));

      const response = await this.request('/finances', {
        method: 'POST',
        body: JSON.stringify(body),
      });

      console.log('✅ [createFinance] Finanza creada - ID:', response?.id);
      return response;
    } catch (error) {
      console.error('❌ [createFinance] Error:', error.message);
      throw error;
    }
  }

  /**
   * ✅ Actualizar finanza
   * 🔧 FIXED: Ahora incluye recordedBy, registrationDate e isVerified
   */
  async updateFinance(id, financeData) {
    try {
      console.log('📝 [updateFinance] Actualizando finanza ID:', id);
      console.log('   Datos:', financeData);

      const body = {
        memberId: financeData.memberId,
        memberName: financeData.memberName,
        amount: financeData.amount,
        incomeConcept: financeData.incomeConcept,
        incomeMethod: financeData.incomeMethod,
        description: financeData.description || '',
        recordedBy: financeData.recordedBy,  // ✅ INCLUIDO
        registrationDate: financeData.registrationDate,  // ✅ INCLUIDO
        isVerified: financeData.isVerified,  // ✅ AHORA INCLUIDO
      };

      console.log('📋 Body a enviar:', JSON.stringify(body, null, 2));

      const response = await this.request(`/finances/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });

      console.log('✅ [updateFinance] Finanza actualizada');
      return response;
    } catch (error) {
      console.error('❌ [updateFinance] Error:', error.message);
      throw error;
    }
  }

  /**
   * ✅ Eliminar finanza
   */
  async deleteFinance(id) {
    try {
      console.log('🗑️ [deleteFinance] Eliminando finanza ID:', id);

      const response = await this.request(`/finances/${id}`, {
        method: 'DELETE',
      });

      console.log('✅ [deleteFinance] Finanza eliminada');
      return response;
    } catch (error) {
      console.error('❌ [deleteFinance] Error:', error.message);
      throw error;
    }
  }

  /**
   * ✅ Obtener finanzas por miembro
   */
  async getFinancesByMember(memberId, page = 0, limit = 10) {
    try {
      console.log('📡 [getFinancesByMember] Obteniendo finanzas del miembro ID:', memberId);

      const response = await this.request(`/finances/member/${memberId}?page=${page}&limit=${limit}`);

      console.log('✅ [getFinancesByMember] Finanzas obtenidas:', response?.content?.length || 0);
      return response;
    } catch (error) {
      console.error('❌ [getFinancesByMember] Error:', error.message);
      throw error;
    }
  }

  /**
   * ✅ Obtener total de finanzas por miembro
   */
  async getTotalFinancesByMember(memberId) {
    try {
      console.log('📡 [getTotalFinancesByMember] Obteniendo total del miembro ID:', memberId);

      const response = await this.request(`/finances/member/${memberId}/total`);

      console.log('✅ [getTotalFinancesByMember] Total obtenido:', response?.totalAmount);
      return response;
    } catch (error) {
      console.error('❌ [getTotalFinancesByMember] Error:', error.message);
      throw error;
    }
  }

  /**
   * ✅ Obtener finanzas por rango de fechas
   */
  async getFinancesByDateRange(startDate, endDate) {
    try {
      console.log('📡 [getFinancesByDateRange] Obteniendo finanzas entre:', startDate, '-', endDate);

      const response = await this.request(
        `/finances/date-range?startDate=${startDate}&endDate=${endDate}`
      );

      console.log('✅ [getFinancesByDateRange] Finanzas obtenidas:', response?.length || 0);
      return response;
    } catch (error) {
      console.error('❌ [getFinancesByDateRange] Error:', error.message);
      throw error;
    }
  }

  /**
   * ✅ Obtener finanzas por mes
   */
  async getFinancesByMonth(year, month) {
    try {
      console.log('📡 [getFinancesByMonth] Obteniendo finanzas - Mes:', month, 'Año:', year);

      const response = await this.request(`/finances/month/${year}/${month}`);

      console.log('✅ [getFinancesByMonth] Finanzas obtenidas:', response?.total || 0);
      return response;
    } catch (error) {
      console.error('❌ [getFinancesByMonth] Error:', error.message);
      throw error;
    }
  }

  /**
   * ✅ Obtener finanzas por año
   */
  async getFinancesByYear(year) {
    try {
      console.log('📡 [getFinancesByYear] Obteniendo finanzas - Año:', year);

      const response = await this.request(`/finances/year/${year}`);

      console.log('✅ [getFinancesByYear] Finanzas obtenidas:', response?.total || 0);
      return response;
    } catch (error) {
      console.error('❌ [getFinancesByYear] Error:', error.message);
      throw error;
    }
  }

  /**
   * ✅ Obtener finanzas por concepto
   */
  async getFinancesByConcept(concept) {
    try {
      console.log('📡 [getFinancesByConcept] Obteniendo finanzas - Concepto:', concept);

      const response = await this.request(`/finances/concept/${concept}`);

      console.log('✅ [getFinancesByConcept] Finanzas obtenidas:', response?.total || 0);
      return response;
    } catch (error) {
      console.error('❌ [getFinancesByConcept] Error:', error.message);
      throw error;
    }
  }

  /**
   * ✅ Obtener finanzas por método de pago
   */
  async getFinancesByMethod(method) {
    try {
      console.log('📡 [getFinancesByMethod] Obteniendo finanzas - Método:', method);

      const response = await this.request(`/finances/method/${method}`);

      console.log('✅ [getFinancesByMethod] Finanzas obtenidas:', response?.total || 0);
      return response;
    } catch (error) {
      console.error('❌ [getFinancesByMethod] Error:', error.message);
      throw error;
    }
  }

  /**
   * ✅ Obtener finanzas verificadas
   */
  async getVerifiedFinances() {
    try {
      console.log('📡 [getVerifiedFinances] Obteniendo finanzas verificadas');

      const response = await this.request('/finances/verified');

      console.log('✅ [getVerifiedFinances] Finanzas obtenidas:', response?.total || 0);
      return response;
    } catch (error) {
      console.error('❌ [getVerifiedFinances] Error:', error.message);
      throw error;
    }
  }

  /**
   * ✅ Obtener finanzas no verificadas
   */
  async getUnverifiedFinances() {
    try {
      console.log('📡 [getUnverifiedFinances] Obteniendo finanzas pendientes');

      const response = await this.request('/finances/unverified');

      console.log('✅ [getUnverifiedFinances] Finanzas obtenidas:', response?.total || 0);
      return response;
    } catch (error) {
      console.error('❌ [getUnverifiedFinances] Error:', error.message);
      throw error;
    }
  }

  /**
   * ✅ Verificar una finanza
   */
  async verifyFinance(id) {
    try {
      console.log('✅ [verifyFinance] Verificando finanza ID:', id);

      const response = await this.request(`/finances/${id}/verify`, {
        method: 'PATCH',
      });

      console.log('✅ [verifyFinance] Finanza verificada');
      return response;
    } catch (error) {
      console.error('❌ [verifyFinance] Error:', error.message);
      throw error;
    }
  }
}

const apiService = new ApiService();
export default apiService;