// 📋 EnrollmentsPage.jsx - Versión SEGURA
// Gestión de cohortes con validaciones y protecciones de seguridad

import React, { useState, useEffect } from 'react';
import apiService from '../apiService';
import { logError, logSecurityEvent } from '../utils/securityLogger';
import { throttle } from 'lodash';
import ModalCreateLesson from '../components/ModalCreateLesson';
import ModalRecordAttendance from '../components/ModalRecordAttendance';
import ModalLessonAttendanceDetail from '../components/ModalLessonAttendanceDetail';
import '../css/EnrollmentsPage.css';

const EnrollmentsPage = () => {
  // ========== MENSAJES DE ERROR SEGUROS ==========
  const ERROR_MESSAGES = {
    FETCH_ENROLLMENTS: 'Error al cargar cohortes',
    FETCH_TEACHERS: 'Error al cargar maestros',
    FETCH_LESSONS: 'Error al cargar lecciones',
    FETCH_STUDENTS: 'Error al cargar estudiantes',
    FETCH_ATTENDANCE: 'Error al cargar asistencias',
    CREATE_ENROLLMENT: 'Error al crear cohorte',
    UPDATE_STATUS: 'Error al actualizar estado',
    VALIDATION_ERROR: 'Datos inválidos. Por favor verifica los campos',
    UNAUTHORIZED: 'No tienes permiso para realizar esta acción',
    GENERIC: 'Error al procesar la solicitud. Intenta más tarde'
  };

  // ========== ESTADO PRINCIPAL ==========
  const [enrollments, setEnrollments] = useState([]);
  const [filteredEnrollments, setFilteredEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterLevel, setFilterLevel] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [error, setError] = useState('');

  // ========== ESTADO DEL MODAL DE COHORTE ==========
  const [selectedEnrollment, setSelectedEnrollment] = useState(null);
  const [showEnrollmentModal, setShowEnrollmentModal] = useState(false);
  const [activeTab, setActiveTab] = useState('details');

  // ========== ESTADO DE MODALES SECUNDARIOS ==========
  const [showCreateLessonModal, setShowCreateLessonModal] = useState(false);
  const [showRecordAttendanceModal, setShowRecordAttendanceModal] = useState(false);

  // ========== ESTADO DEL MODAL DE DETALLE DE ASISTENCIA ==========
  const [showLessonAttendanceDetailModal, setShowLessonAttendanceDetailModal] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState(null);

  // ========== ESTADO DEL FORMULARIO ==========
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    level: 'PREENCUENTRO',
    startDate: '',
    endDate: '',
    maxStudents: 30,
    minAttendancePercentage: 80,
    minAverageScore: 3.0,
    teacher: null,
  });

  // ========== DATOS CARGADOS DINÁMICAMENTE ==========
  const [lessons, setLessons] = useState([]);
  const [students, setStudents] = useState([]);
  const [attendanceSummary, setAttendanceSummary] = useState([]);
  const [availableTeachers, setAvailableTeachers] = useState([]);
  const [filteredTeachers, setFilteredTeachers] = useState([]);
  const [showTeacherDropdown, setShowTeacherDropdown] = useState(false);
  const [teacherSearchTerm, setTeacherSearchTerm] = useState('');

  const LEVELS = [
    { value: 'PREENCUENTRO', label: 'Pre-encuentro' },
    { value: 'ENCUENTRO', label: 'Encuentro' },
    { value: 'POST_ENCUENTRO', label: 'Post-encuentro' },
    { value: 'BAUTIZOS', label: 'Bautizos' },
    { value: 'EDIRD_1', label: 'EDIRD 1' },
    { value: 'EDIRD_2', label: 'EDIRD 2' },
    { value: 'EDIRD_3', label: 'EDIRD 3' },
    { value: 'SANIDAD_INTEGRAL_RAICES', label: 'Sanidad Integral Raíces' },
    { value: 'EDIRD_4', label: 'EDIRD 4' },
    { value: 'ADIESTRAMIENTO', label: 'Adiestramiento' },
    { value: 'GRADUACION', label: 'Graduación' },
  ];

  const STATUSES = [
    { value: 'ACTIVE', label: 'Activa' },
    { value: 'SUSPENDED', label: 'Inactiva' },
    { value: 'PENDING', label: 'Programada' },
    { value: 'COMPLETED', label: 'Completada' },
    { value: 'CANCELLED', label: 'Cancelada' },
  ];

  // ✅ SEGURIDAD: Logger seguro
  const handleError = (errorKey, context = '') => {
    const errorMessage = ERROR_MESSAGES[errorKey] || ERROR_MESSAGES.GENERIC;
    setError(errorMessage);
    
    logSecurityEvent('error', {
      errorKey,
      context,
      timestamp: new Date().toISOString()
    });
  };

  // ✅ SEGURIDAD: Función de logging centralizada
  const log = (message, data = null) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[EnrollmentsPage] ${message}`);
      if (data) console.log(data); // Solo en dev
    }
    // En producción, enviar al servidor
    logSecurityEvent(message, data);
  };

  // ✅ SEGURIDAD: Sanitizar HTML
  const escapeHtml = (text) => {
    if (!text) return '';
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return String(text).replace(/[&<>"']/g, m => map[m]);
  };

  // ✅ SEGURIDAD: Enmascarar email
  const maskEmail = (email) => {
    if (!email || !email.includes('@')) return '***';
    const [name, domain] = email.split('@');
    const visible = Math.max(1, Math.floor(name.length / 2));
    const masked = name.substring(0, visible) + '*'.repeat(name.length - visible);
    return `${masked}@${domain}`;
  };

  // ✅ SEGURIDAD: Validar nivel
  const isValidLevel = (level) => LEVELS.some(l => l.value === level);

  // ✅ SEGURIDAD: Validar status
  const isValidStatus = (status) => STATUSES.some(s => s.value === status);

  // ✅ SEGURIDAD: Validar fechas
  const validateDates = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return start < end;
  };

  // ✅ SEGURIDAD: Validar maxStudents
  const isValidMaxStudents = (max) => {
    const num = parseInt(max);
    return !isNaN(num) && num >= 1 && num <= 500;
  };

  // ✅ SEGURIDAD: Validar porcentaje
  const isValidPercentage = (value) => {
    const num = parseFloat(value);
    return !isNaN(num) && num >= 0 && num <= 100;
  };

  // ========== EFECTOS ==========
  useEffect(() => {
    fetchEnrollments();
    loadTeachers();
  }, []);

  useEffect(() => {
    if (showEnrollmentModal && selectedEnrollment) {
      loadTabData(activeTab);
    }
  }, [activeTab, selectedEnrollment]);

  // ========== CARGAR MAESTROS ==========
  const loadTeachers = async () => {
    try {
      log('Loading teachers');
      const members = await apiService.getAllMembers();
      setAvailableTeachers(members || []);
    } catch (err) {
      // ✅ SEGURIDAD: No revelar detalles del error
      handleError('FETCH_TEACHERS', 'loadTeachers');
    }
  };

  // ========== BÚSQUEDA DE MAESTRO ==========
  const handleTeacherSearch = (value) => {
    setTeacherSearchTerm(value);
    setShowTeacherDropdown(true);

    if (value.trim() === '') {
      setFilteredTeachers([]);
      return;
    }

    // ✅ SEGURIDAD: Validar y sanitizar entrada
    const sanitizedValue = value.toLowerCase().trim();
    
    const filtered = availableTeachers.filter(
      (teacher) =>
        teacher.name?.toLowerCase().includes(sanitizedValue) ||
        teacher.email?.toLowerCase().includes(sanitizedValue)
    );
    
    setFilteredTeachers(filtered.slice(0, 5)); // Limitar a 5 resultados
  };

  // ========== SELECCIONAR MAESTRO ==========
  const handleSelectTeacher = (teacher) => {
    // ✅ SEGURIDAD: Validar que el teacher tenga ID
    if (!teacher.id) {
      handleError('VALIDATION_ERROR', 'invalid_teacher_id');
      return;
    }

    setFormData((prev) => ({
      ...prev,
      teacher: { id: teacher.id, name: escapeHtml(teacher.name) },
    }));
    setTeacherSearchTerm(escapeHtml(teacher.name));
    setShowTeacherDropdown(false);
    setFilteredTeachers([]);
    log('Teacher selected', { teacherId: teacher.id });
  };

  // ========== LIMPIAR MAESTRO ==========
  const handleClearTeacher = () => {
    setFormData((prev) => ({
      ...prev,
      teacher: null,
    }));
    setTeacherSearchTerm('');
    setFilteredTeachers([]);
  };

  // ========== CARGAR COHORTES ==========
  const fetchEnrollments = async () => {
    try {
      setLoading(true);
      setError('');
      log('Fetching enrollments');

      const data = await apiService.getEnrollments();
      const enrollmentsArray = data.content || data;

      const sorted = enrollmentsArray.sort((a, b) => {
        return new Date(b.startDate) - new Date(a.startDate);
      });

      setEnrollments(sorted);
      applyFilters(sorted, filterLevel, filterStatus);
    } catch (err) {
      // ✅ SEGURIDAD: No revelar detalles del error
      handleError('FETCH_ENROLLMENTS', 'fetchEnrollments');
      logError({
        context: 'fetchEnrollments',
        errorCode: err.code || 'UNKNOWN'
      });
    } finally {
      setLoading(false);
    }
  };

  // ========== CARGAR DATOS DE TABS ==========
  const loadTabData = async (tab) => {
    if (!selectedEnrollment) return;

    try {
      setError('');

      switch (tab) {
        case 'lessons':
          log('Loading lessons');
          const lessonsData = await apiService.getLessonsByEnrollment(selectedEnrollment.id);
          // ✅ SEGURIDAD: Sanitizar datos
          const sanitizedLessons = (lessonsData || []).map(l => ({
            ...l,
            lessonName: escapeHtml(l.lessonName),
            description: escapeHtml(l.description || '')
          }));
          setLessons(sanitizedLessons);
          break;

        case 'students':
          log('Loading students');
          const studentsData = await apiService.getStudentEnrollmentsByEnrollment(selectedEnrollment.id);
          // ✅ SEGURIDAD: Sanitizar datos
          const sanitizedStudents = (studentsData || []).map(s => ({
            ...s,
            memberName: escapeHtml(s.memberName)
          }));
          setStudents(sanitizedStudents);
          break;

        case 'attendance':
          log('Loading attendance');
          const lessonsForAttendance = await apiService.getLessonsByEnrollment(selectedEnrollment.id);
          const sanitizedAttendance = (lessonsForAttendance || []).map(l => ({
            ...l,
            lessonName: escapeHtml(l.lessonName)
          }));
          setAttendanceSummary(sanitizedAttendance);
          break;

        default:
          break;
      }
    } catch (err) {
      // ✅ SEGURIDAD: Mapear a error genérico
      const errorKey = 
        tab === 'lessons' ? 'FETCH_LESSONS' :
        tab === 'students' ? 'FETCH_STUDENTS' :
        tab === 'attendance' ? 'FETCH_ATTENDANCE' :
        'GENERIC';
      
      handleError(errorKey, `loadTabData:${tab}`);
      logError({
        context: `loadTabData_${tab}`,
        errorCode: err.code || 'UNKNOWN'
      });
    }
  };

  // ========== APLICAR FILTROS ==========
  const applyFilters = (data, level, status) => {
    log('Applying filters', { level, status });

    let filtered = data;

    if (level && level.trim() !== '') {
      // ✅ SEGURIDAD: Validar que el nivel es válido
      if (!isValidLevel(level)) {
        handleError('VALIDATION_ERROR', 'invalid_level');
        setFilteredEnrollments([]);
        return;
      }

      filtered = filtered.filter(e => {
        const enrollmentLevel = e.levelEnrollment || e.level;
        return enrollmentLevel === level;
      });
    }

    if (status && status.trim() !== '') {
      // ✅ SEGURIDAD: Validar que el status es válido
      if (!isValidStatus(status)) {
        handleError('VALIDATION_ERROR', 'invalid_status');
        setFilteredEnrollments([]);
        return;
      }

      filtered = filtered.filter(e => e.status === status);
    }

    setFilteredEnrollments(filtered);
  };

  // ========== MANEJO DE FILTROS ==========
  const handleFilterChange = (type, value) => {
    setError('');
    
    if (type === 'level') {
      setFilterLevel(value);
      applyFilters(enrollments, value, filterStatus);
    } else if (type === 'status') {
      setFilterStatus(value);
      applyFilters(enrollments, filterLevel, value);
    }
  };

  // ========== ABRIR MODAL DE COHORTE ==========
  const handleOpenEnrollmentModal = (enrollment) => {
    // ✅ SEGURIDAD: Validar datos antes de abrir modal
    if (!enrollment || !enrollment.id) {
      handleError('VALIDATION_ERROR', 'invalid_enrollment');
      return;
    }

    setSelectedEnrollment(enrollment);
    setActiveTab('details');
    setShowEnrollmentModal(true);
    setError('');
  };

  // ========== CERRAR MODAL DE COHORTE ==========
  const handleCloseEnrollmentModal = () => {
    setSelectedEnrollment(null);
    setShowEnrollmentModal(false);
    setActiveTab('details');
    setLessons([]);
    setStudents([]);
    setAttendanceSummary([]);
    setError('');
  };

  // ========== CAMBIAR ESTADO (THROTTLED) ==========
  const throttledStatusChange = throttle(
    async (enrollmentId, newStatus) => {
      // ✅ SEGURIDAD: Validar status
      if (!isValidStatus(newStatus)) {
        handleError('VALIDATION_ERROR', 'invalid_status_change');
        return;
      }

      try {
        setError('');
        log('Changing status', { enrollmentId, newStatus });

        await apiService.updateEnrollmentStatus(enrollmentId, newStatus);
        
        setError(''); // Limpiar errores previos
        // Mostrar éxito sin usar alert
        logSecurityEvent('status_changed', { enrollmentId, newStatus });
        
        fetchEnrollments();
        handleCloseEnrollmentModal();
      } catch (err) {
        handleError('UPDATE_STATUS', 'handleStatusChange');
        logError({
          context: 'updateEnrollmentStatus',
          enrollmentId,
          errorCode: err.code || 'UNKNOWN'
        });
      }
    },
    1000 // Max 1 request/segundo
  );

  const handleStatusChange = (enrollmentId, newStatus) => {
    throttledStatusChange(enrollmentId, newStatus);
  };

  // ========== CREAR LECCIÓN ==========
  const handleCreateLesson = async () => {
    setShowCreateLessonModal(true);
  };

  const handleLessonCreated = async () => {
    if (selectedEnrollment) {
      await loadTabData('lessons');
    }
  };

  // ========== REGISTRAR ASISTENCIA ==========
  const handleRecordAttendance = async () => {
    setShowRecordAttendanceModal(true);
  };

  const handleAttendanceRecorded = async () => {
    if (selectedEnrollment) {
      await loadTabData('attendance');
    }
  };

  // ========== DETALLE DE ASISTENCIA ==========
  const handleOpenLessonAttendanceDetail = (lesson) => {
    if (!lesson || !lesson.id) {
      handleError('VALIDATION_ERROR', 'invalid_lesson');
      return;
    }

    log('Opening lesson attendance detail', { lessonId: lesson.id });
    setSelectedLesson(lesson);
    setShowLessonAttendanceDetailModal(true);
  };

  const handleCloseLessonAttendanceDetail = () => {
    setSelectedLesson(null);
    setShowLessonAttendanceDetailModal(false);
  };

  const handleLessonAttendanceRecorded = async () => {
    if (selectedEnrollment) {
      await loadTabData('attendance');
    }
  };

  // ========== VALIDAR FORMULARIO ==========
  const validateForm = () => {
    const errors = [];

    if (!formData.level || !isValidLevel(formData.level)) {
      errors.push('Nivel inválido');
    }

    if (!formData.startDate) {
      errors.push('Fecha de inicio requerida');
    }

    if (!formData.endDate) {
      errors.push('Fecha de fin requerida');
    }

    if (formData.startDate && formData.endDate) {
      if (!validateDates(formData.startDate, formData.endDate)) {
        errors.push('Fecha de inicio debe ser anterior a fecha de fin');
      }
    }

    if (!formData.teacher || !formData.teacher.id) {
      errors.push('Maestro requerido');
    }

    if (!isValidMaxStudents(formData.maxStudents)) {
      errors.push('Máximo de estudiantes debe estar entre 1 y 500');
    }

    if (!isValidPercentage(formData.minAttendancePercentage)) {
      errors.push('Porcentaje de asistencia debe estar entre 0 y 100');
    }

    if (formData.minAverageScore < 0 || formData.minAverageScore > 5) {
      errors.push('Calificación mínima debe estar entre 0 y 5');
    }

    return errors;
  };

  // ========== ENVIAR FORMULARIO ==========
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setError('');

      // ✅ SEGURIDAD: Validar en frontend
      const validationErrors = validateForm();
      if (validationErrors.length > 0) {
        setError(validationErrors.join('. '));
        return;
      }

      const enrollmentData = {
        level: formData.level,
        startDate: formData.startDate,
        endDate: formData.endDate,
        maxStudents: parseInt(formData.maxStudents),
        minAttendancePercentage: parseFloat(formData.minAttendancePercentage),
        minAverageScore: parseFloat(formData.minAverageScore),
        teacher: formData.teacher,
      };

      log('Creating enrollment', { level: formData.level });

      await apiService.createEnrollment(enrollmentData);

      // Éxito sin alert
      logSecurityEvent('enrollment_created', { level: formData.level });
      
      setShowForm(false);
      resetForm();
      fetchEnrollments();
    } catch (err) {
      handleError('CREATE_ENROLLMENT', 'handleSubmit');
      logError({
        context: 'createEnrollment',
        errorCode: err.code || 'UNKNOWN'
      });
    }
  };

  // ========== RESETEAR FORMULARIO ==========
  const resetForm = () => {
    setFormData({
      level: 'PREENCUENTRO',
      startDate: '',
      endDate: '',
      maxStudents: 30,
      minAttendancePercentage: 80,
      minAverageScore: 3.0,
      teacher: null,
    });
    setTeacherSearchTerm('');
    setFilteredTeachers([]);
    setError('');
  };

  // ========== UTILIDADES ==========
  const getLevelLabel = (levelValue) => {
    if (!levelValue) return '—';
    return LEVELS.find(l => l.value === levelValue)?.label || levelValue;
  };

  const getStatusLabel = (statusValue) => {
    if (!statusValue) return '—';
    return STATUSES.find(s => s.value === statusValue)?.label || statusValue;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'ACTIVE': return 'status-active';
      case 'SUSPENDED': return 'status-inactive';
      case 'PENDING': return 'status-paused';
      case 'COMPLETED': return 'status-completed';
      case 'CANCELLED': return 'status-cancelled';
      default: return 'bg-gray-100';
    }
  };

  // ========== RENDER ==========
  return (
    <div className="enrollments-page">
      <div className="page-container">
        {/* Header */}
        <div className="page-header">
          <h1>📋 Gestión de Cohortes</h1>
          <p>Crea y gestiona cohortes de formación</p>
        </div>

        {/* ✅ SEGURIDAD: Mostrar errores de manera segura */}
        {error && (
          <div className="alert alert-danger" role="alert">
            <strong>⚠️ Error:</strong> {error}
          </div>
        )}

        {/* Botón crear */}
        <div className="button-group">
          <button
            onClick={() => setShowForm(!showForm)}
            className="btn-primary"
          >
            {showForm ? '✖️ Cerrar' : '➕ Nueva Cohorte'}
          </button>
        </div>

        {/* Formulario */}
        {showForm && (
          <div className="form-section animate-slide-in-up">
            <h2>Crear Nueva Cohorte</h2>
            <form onSubmit={handleSubmit} className="form-grid">
              <div className="form-field">
                <label>Nivel *</label>
                <select
                  name="level"
                  value={formData.level}
                  onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                  required
                >
                  {LEVELS.map(level => (
                    <option key={level.value} value={level.value}>
                      {level.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-field">
                <label>Fecha Inicio *</label>
                <input
                  type="date"
                  name="startDate"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  required
                />
              </div>

              <div className="form-field">
                <label>Fecha Fin *</label>
                <input
                  type="date"
                  name="endDate"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  required
                />
              </div>

              {/* Maestro con búsqueda */}
              <div className="form-field form-field-full">
                <label>Maestro / Profesor *</label>
                <div className="teacher-search-container">
                  <input
                    type="text"
                    placeholder="Busca un maestro por nombre..."
                    value={teacherSearchTerm}
                    onChange={(e) => handleTeacherSearch(e.target.value)}
                    onFocus={() => teacherSearchTerm && setShowTeacherDropdown(true)}
                    className="teacher-search-input"
                    required={!formData.teacher}
                  />

                  {formData.teacher && (
                    <button
                      type="button"
                      onClick={handleClearTeacher}
                      className="teacher-clear-btn"
                      title="Limpiar selección"
                    >
                      ✕
                    </button>
                  )}

                  {showTeacherDropdown && filteredTeachers.length > 0 && (
                    <div className="teacher-dropdown">
                      {filteredTeachers.map((teacher) => (
                        <button
                          key={teacher.id}
                          type="button"
                          onClick={() => handleSelectTeacher(teacher)}
                          className="teacher-option"
                        >
                          <div className="teacher-name">{escapeHtml(teacher.name)}</div>
                        </button>
                      ))}
                    </div>
                  )}

                  {formData.teacher && (
                    <div className="teacher-selected">
                      <p className="teacher-selected-name">✅ {formData.teacher.name}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="form-field">
                <label>Máx. Estudiantes *</label>
                <input
                  type="number"
                  name="maxStudents"
                  value={formData.maxStudents}
                  onChange={(e) => setFormData({ ...formData, maxStudents: e.target.value })}
                  min="1"
                  max="500"
                  required
                />
              </div>

              <div className="form-field">
                <label>% Asistencia *</label>
                <input
                  type="number"
                  name="minAttendancePercentage"
                  value={formData.minAttendancePercentage}
                  onChange={(e) => setFormData({ ...formData, minAttendancePercentage: e.target.value })}
                  min="0"
                  max="100"
                  step="0.1"
                  required
                />
              </div>

              <div className="form-field">
                <label>Calificación Min. *</label>
                <input
                  type="number"
                  name="minAverageScore"
                  value={formData.minAverageScore}
                  onChange={(e) => setFormData({ ...formData, minAverageScore: e.target.value })}
                  min="0"
                  max="5"
                  step="0.1"
                  required
                />
              </div>

              <button type="submit" className="btn-primary form-field-full">
                ✅ Crear Cohorte
              </button>
            </form>
          </div>
        )}

        {/* Filtros */}
        <div className="filters-section">
          <div className="filter-group">
            <label>📌 Filtrar por Nivel</label>
            <select
              value={filterLevel}
              onChange={(e) => handleFilterChange('level', e.target.value)}
            >
              <option value="">Todos los niveles</option>
              {LEVELS.map(level => (
                <option key={level.value} value={level.value}>
                  {level.label}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>⚡ Filtrar por Estado</label>
            <select
              value={filterStatus}
              onChange={(e) => handleFilterChange('status', e.target.value)}
            >
              <option value="">Todos los estados</option>
              {STATUSES.map(status => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => {
              setFilterLevel('');
              setFilterStatus('');
              applyFilters(enrollments, '', '');
            }}
            className="btn-secondary"
          >
            🔄 Limpiar Filtros
          </button>
        </div>

        <p className="filter-info">
          Mostrando <strong>{filteredEnrollments.length}</strong> de <strong>{enrollments.length}</strong> cohortes
        </p>

        {/* Grid de cohortes */}
        <div className="enrollments-grid">
          {loading ? (
            <p className="loading-message">Cargando cohortes...</p>
          ) : filteredEnrollments.length === 0 ? (
            <div className="empty-message">
              <p>No hay cohortes que coincidan</p>
              <p>Intenta cambiar los filtros</p>
            </div>
          ) : (
            filteredEnrollments.map(enrollment => (
              <div
                key={enrollment.id}
                className="enrollment-card"
                onClick={() => handleOpenEnrollmentModal(enrollment)}
                role="button"
                tabIndex={0}
              >
                <div className="card-header">
                  <h3>{escapeHtml(enrollment.cohortName || getLevelLabel(enrollment.levelEnrollment || enrollment.level))}</h3>
                  <span className={`status-badge ${getStatusColor(enrollment.status)}`}>
                    {getStatusLabel(enrollment.status)}
                  </span>
                </div>
                <div className="card-body">
                  <p><strong>Nivel:</strong> {getLevelLabel(enrollment.levelEnrollment || enrollment.level)}</p>
                  <p><strong>Inicio:</strong> {new Date(enrollment.startDate).toLocaleDateString('es-CO')}</p>
                  <p><strong>Fin:</strong> {new Date(enrollment.endDate).toLocaleDateString('es-CO')}</p>
                  <p><strong>Estudiantes:</strong> {enrollment.maxStudents} máx</p>
                  {enrollment.maestro?.name && (
                    <p><strong>👨‍🏫 Maestro:</strong> {escapeHtml(enrollment.maestro.name)}</p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* MODAL DE COHORTE */}
      {showEnrollmentModal && selectedEnrollment && (
        <div className="modal-overlay" onClick={handleCloseEnrollmentModal}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{escapeHtml(selectedEnrollment.cohortName || getLevelLabel(selectedEnrollment.levelEnrollment))}</h2>
              <button
                className="modal-close-btn"
                onClick={handleCloseEnrollmentModal}
              >
                ✕
              </button>
            </div>

            {/* Pestañas */}
            <div className="modal-tabs">
              <button
                className={`tab-btn ${activeTab === 'details' ? 'active' : ''}`}
                onClick={() => setActiveTab('details')}
              >
                📋 Detalles
              </button>
              <button
                className={`tab-btn ${activeTab === 'lessons' ? 'active' : ''}`}
                onClick={() => setActiveTab('lessons')}
              >
                📚 Lecciones
              </button>
              <button
                className={`tab-btn ${activeTab === 'students' ? 'active' : ''}`}
                onClick={() => setActiveTab('students')}
              >
                👥 Estudiantes
              </button>
              <button
                className={`tab-btn ${activeTab === 'attendance' ? 'active' : ''}`}
                onClick={() => setActiveTab('attendance')}
              >
                ✅ Asistencias
              </button>
            </div>

            {/* Contenido */}
            <div className="modal-body">
              {/* DETALLES */}
              {activeTab === 'details' && (
                <div className="tab-content">
                  <div className="details-grid">
                    <div>
                      <p className="detail-label">Nivel</p>
                      <p className="detail-value">{getLevelLabel(selectedEnrollment.levelEnrollment || selectedEnrollment.level)}</p>
                    </div>
                    <div>
                      <p className="detail-label">Estado</p>
                      <p className="detail-value">
                        <span className={`status-badge ${getStatusColor(selectedEnrollment.status)}`}>
                          {getStatusLabel(selectedEnrollment.status)}
                        </span>
                      </p>
                    </div>
                    {selectedEnrollment.maestro?.name && (
                      <div>
                        <p className="detail-label">👨‍🏫 Maestro</p>
                        <p className="detail-value">{escapeHtml(selectedEnrollment.maestro.name)}</p>
                      </div>
                    )}
                    <div>
                      <p className="detail-label">Inicio</p>
                      <p className="detail-value">{new Date(selectedEnrollment.startDate).toLocaleDateString('es-CO')}</p>
                    </div>
                    <div>
                      <p className="detail-label">Fin</p>
                      <p className="detail-value">{new Date(selectedEnrollment.endDate).toLocaleDateString('es-CO')}</p>
                    </div>
                    <div>
                      <p className="detail-label">Duración</p>
                      <p className="detail-value">
                        {Math.ceil((new Date(selectedEnrollment.endDate) - new Date(selectedEnrollment.startDate)) / (1000 * 60 * 60 * 24))} días
                      </p>
                    </div>
                    <div>
                      <p className="detail-label">Máx. Estudiantes</p>
                      <p className="detail-value">{selectedEnrollment.maxStudents}</p>
                    </div>
                    <div>
                      <p className="detail-label">% Asistencia Min.</p>
                      <p className="detail-value">{selectedEnrollment.minAttendancePercentage ? (selectedEnrollment.minAttendancePercentage * 100) : 0}%</p>
                    </div>
                    <div>
                      <p className="detail-label">Calificación Min.</p>
                      <p className="detail-value">{(selectedEnrollment.minAverageScore || 0).toFixed(2)}</p>
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="actions-section">
                    <h3>🎯 Cambiar Estado</h3>
                    <div className="actions-grid">
                      {selectedEnrollment.status !== 'ACTIVE' && (
                        <button
                          onClick={() => handleStatusChange(selectedEnrollment.id, 'ACTIVE')}
                          className="action-btn btn-success"
                        >
                          ▶️ Activar
                        </button>
                      )}
                      {selectedEnrollment.status !== 'SUSPENDED' && (
                        <button
                          onClick={() => handleStatusChange(selectedEnrollment.id, 'SUSPENDED')}
                          className="action-btn btn-warning"
                        >
                          ⏸️ Pausar
                        </button>
                      )}
                      {selectedEnrollment.status !== 'COMPLETED' && (
                        <button
                          onClick={() => handleStatusChange(selectedEnrollment.id, 'COMPLETED')}
                          className="action-btn btn-info"
                        >
                          ✅ Completar
                        </button>
                      )}
                      {selectedEnrollment.status !== 'CANCELLED' && (
                        <button
                          onClick={() => handleStatusChange(selectedEnrollment.id, 'CANCELLED')}
                          className="action-btn btn-danger"
                        >
                          ❌ Cancelar
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* LECCIONES */}
              {activeTab === 'lessons' && (
                <div className="tab-content">
                  <div className="tab-actions">
                    <button onClick={handleCreateLesson} className="btn-primary">
                      ➕ Nueva Lección
                    </button>
                  </div>

                  {lessons.length === 0 ? (
                    <p className="empty-message">No hay lecciones creadas</p>
                  ) : (
                    <div className="lessons-list">
                      {lessons.map(lesson => (
                        <div key={lesson.id} className="lesson-item">
                          <div className="lesson-header">
                            <h4>📖 {lesson.lessonNumber}. {lesson.lessonName}</h4>
                            {lesson.isMandatory && <span className="badge-mandatory">🔴 Obligatoria</span>}
                          </div>
                          <div className="lesson-info">
                            <p>📅 {new Date(lesson.lessonDate).toLocaleDateString('es-CO')}</p>
                            <p>⏱️ {lesson.durationMinutes} min</p>
                            <p>✅ {lesson.attendanceCount || 0} asistencias</p>
                          </div>
                          {lesson.description && <p className="lesson-description">{lesson.description}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ESTUDIANTES */}
              {activeTab === 'students' && (
                <div className="tab-content">
                  {students.length === 0 ? (
                    <p className="empty-message">No hay estudiantes inscritos</p>
                  ) : (
                    <div className="students-list">
                      {students.map(student => (
                        <div key={student.id} className="student-item">
                          <div className="student-header">
                            <h4>👤 {escapeHtml(student.memberName || `Estudiante ${student.memberId}`)}</h4>
                            <span className={`status-badge ${getStatusColor(student.status)}`}>
                              {getStatusLabel(student.status)}
                            </span>
                          </div>
                          <div className="student-info">
                            <p>📅 Inscrito: {new Date(student.enrollmentDate).toLocaleDateString('es-CO')}</p>
                            {student.finalAttendancePercentage !== undefined && student.finalAttendancePercentage !== null && (
                              <p>📊 Asistencia: {student.finalAttendancePercentage.toFixed(1)}%</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ASISTENCIAS */}
              {activeTab === 'attendance' && (
                <div className="tab-content">
                  <div className="tab-actions">
                    <button onClick={handleRecordAttendance} className="btn-primary">
                      ➕ Registrar Asistencia
                    </button>
                  </div>

                  {attendanceSummary.length === 0 ? (
                    <p className="empty-message">No hay lecciones disponibles</p>
                  ) : (
                    <div className="attendance-summary">
                      {attendanceSummary.map(lesson => (
                        <div
                          key={lesson.id}
                          className="attendance-item clickable"
                          onClick={() => handleOpenLessonAttendanceDetail(lesson)}
                          role="button"
                          tabIndex={0}
                          title="Click para ver detalles"
                        >
                          <div className="attendance-header">
                            <h4>📖 {lesson.lessonNumber}. {lesson.lessonName}</h4>
                            <span className="view-details-badge">👁️ Ver detalles</span>
                          </div>
                          <div className="attendance-info">
                            <p>📅 {new Date(lesson.lessonDate).toLocaleDateString('es-CO')}</p>
                            <p>✅ {lesson.attendanceCount || 0} registros</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODALES SECUNDARIOS */}
      {selectedLesson && selectedEnrollment && (
        <ModalLessonAttendanceDetail
          isOpen={showLessonAttendanceDetailModal}
          onClose={handleCloseLessonAttendanceDetail}
          lesson={selectedLesson}
          enrollment={selectedEnrollment}
          onAttendanceRecorded={handleLessonAttendanceRecorded}
        />
      )}

      {selectedEnrollment && (
        <>
          <ModalCreateLesson
            isOpen={showCreateLessonModal}
            onClose={() => setShowCreateLessonModal(false)}
            enrollmentId={selectedEnrollment.id}
            onLessonCreated={handleLessonCreated}
          />

          <ModalRecordAttendance
            isOpen={showRecordAttendanceModal}
            onClose={() => setShowRecordAttendanceModal(false)}
            enrollmentId={selectedEnrollment.id}
            onAttendanceRecorded={handleAttendanceRecorded}
          />
        </>
      )}

      <style jsx>{`
        .alert {
          padding: 12px 16px;
          margin-bottom: 20px;
          border-radius: 4px;
          border: 1px solid;
        }

        .alert-danger {
          background-color: #fee;
          border-color: #fcc;
          color: #c00;
        }

        .form-field-full {
          grid-column: 1 / -1;
        }

        .teacher-search-container {
          position: relative;
        }

        .teacher-search-input {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid #ccc;
          border-radius: 4px;
          font-size: 14px;
        }

        .teacher-search-input:focus {
          outline: none;
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }

        .teacher-clear-btn {
          position: absolute;
          right: 8px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: #999;
          cursor: pointer;
          font-size: 18px;
          padding: 4px 8px;
        }

        .teacher-dropdown {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          background: white;
          border: 1px solid #ccc;
          border-top: none;
          border-radius: 0 0 4px 4px;
          max-height: 200px;
          overflow-y: auto;
          z-index: 10;
        }

        .teacher-option {
          width: 100%;
          padding: 8px 12px;
          text-align: left;
          border: none;
          background: none;
          cursor: pointer;
          border-bottom: 1px solid #eee;
        }

        .teacher-option:hover {
          background-color: #f3f4f6;
        }

        .teacher-name {
          font-weight: 500;
          color: #333;
        }

        .teacher-selected {
          margin-top: 8px;
          padding: 8px 12px;
          background-color: #dbeafe;
          border: 1px solid #93c5fd;
          border-radius: 4px;
        }

        .teacher-selected-name {
          color: #1e40af;
          font-weight: 500;
          margin: 0;
        }

        .attendance-item.clickable {
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .attendance-item.clickable:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 16px rgba(37, 99, 235, 0.15);
        }

        .view-details-badge {
          display: inline-block;
          background: linear-gradient(135deg, #2563eb 0%, #10b981 100%);
          color: white;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 600;
        }
      `}</style>
    </div>
  );
};

export default EnrollmentsPage;