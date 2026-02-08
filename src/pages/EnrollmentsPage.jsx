// ============================================
// EnrollmentsPage.jsx - SEGURIDAD MEJORADA
// Gestión de cohortes con validaciones de seguridad
// ✅ IMPLEMENTADO: nameHelper para transformar nombres de pastores solo en vista
// ============================================

import React, { useState, useEffect, useCallback } from 'react';
import apiService from '../apiService';
import { logSecurityEvent } from '../utils/securityLogger';
import { throttle } from 'lodash';
import ModalCreateLesson from '../components/ModalCreateLesson';
import ModalRecordAttendance from '../components/ModalRecordAttendance';
import ModalLessonAttendanceDetail from '../components/ModalLessonAttendanceDetail';
import nameHelper from '../services/nameHelper'; // ✅ Importar el helper
import '../css/EnrollmentsPage.css';

// Extraer funciones del helper
const { getDisplayName } = nameHelper;

// 🔐 Debug condicional
const DEBUG = process.env.REACT_APP_DEBUG === "true";

const log = (message, data) => {
  if (DEBUG) {
    console.log(`[EnrollmentsPage] ${message}`, data || '');
  }
};

const logError = (message, error) => {
  console.error(`[EnrollmentsPage] ${message}`, error);
};

// ✅ Sanitización de HTML (manteniendo nombres originales para seguridad)
const escapeHtml = (text) => {
  if (!text || typeof text !== 'string') return '';
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
};

// ✅ Validaciones
const isValidLevel = (level, LEVELS) => LEVELS.some(l => l.value === level);
const isValidStatus = (status, STATUSES) => STATUSES.some(s => s.value === status);
const validateDates = (startDate, endDate) => {
  if (!startDate || !endDate) return false;
  const start = new Date(startDate);
  const end = new Date(endDate);
  return !isNaN(start.getTime()) && !isNaN(end.getTime()) && start < end;
};
const isValidMaxStudents = (max) => {
  const num = parseInt(max);
  return !isNaN(num) && num >= 1 && num <= 500;
};
const isValidPercentage = (value) => {
  const num = parseFloat(value);
  return !isNaN(num) && num >= 0 && num <= 100;
};
const isValidScore = (score) => {
  const num = parseFloat(score);
  return !isNaN(num) && num >= 0 && num <= 5;
};

// ✅ Constantes fuera del componente para evitar problemas de dependencias
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

const ERROR_MESSAGES = {
  FETCH_ENROLLMENTS: 'Error al cargar cohortes',
  FETCH_TEACHERS: 'Error al cargar maestros',
  FETCH_LESSONS: 'Error al cargar lecciones',
  FETCH_STUDENTS: 'Error al cargar estudiantes',
  FETCH_ATTENDANCE: 'Error al cargar asistencias',
  CREATE_ENROLLMENT: 'Error al crear cohorte',
  UPDATE_STATUS: 'Error al actualizar estado',
  EDIT_ENROLLMENT: 'Error al editar cohorte',
  VALIDATION_ERROR: 'Datos inválidos. Por favor verifica los campos',
  UNAUTHORIZED: 'No tienes permiso para realizar esta acción',
  GENERIC: 'Error al procesar la solicitud. Intenta más tarde',
  INVALID_ENROLLMENT: 'Cohorte no válida'
};

const EnrollmentsPage = () => {

  const [enrollments, setEnrollments] = useState([]);
  const [filteredEnrollments, setFilteredEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterLevel, setFilterLevel] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [error, setError] = useState('');

  const [selectedEnrollment, setSelectedEnrollment] = useState(null);
  const [showEnrollmentModal, setShowEnrollmentModal] = useState(false);
  const [activeTab, setActiveTab] = useState('details');

  const [showCreateLessonModal, setShowCreateLessonModal] = useState(false);
  const [showRecordAttendanceModal, setShowRecordAttendanceModal] = useState(false);

  const [showLessonAttendanceDetailModal, setShowLessonAttendanceDetailModal] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState(null);

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

  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState({
    cohortName: '',
    startDate: '',
    endDate: '',
    maxStudents: 30,
    minAttendancePercentage: 80,
    minAverageScore: 3.0,
    teacher: null,
  });
  const [editTeacherSearchTerm, setEditTeacherSearchTerm] = useState('');
  const [editFilteredTeachers, setEditFilteredTeachers] = useState([]);
  const [editShowTeacherDropdown, setEditShowTeacherDropdown] = useState(false);

  const [lessons, setLessons] = useState([]);
  const [students, setStudents] = useState([]);
  const [attendanceSummary, setAttendanceSummary] = useState([]);
  const [availableTeachers, setAvailableTeachers] = useState([]);
  const [filteredTeachers, setFilteredTeachers] = useState([]);
  const [showTeacherDropdown, setShowTeacherDropdown] = useState(false);
  const [teacherSearchTerm, setTeacherSearchTerm] = useState('');

  const handleError = useCallback((errorKey, context = '') => {
    const errorMessage = ERROR_MESSAGES[errorKey] || ERROR_MESSAGES.GENERIC;
    setError(errorMessage);
    
    logSecurityEvent('error_event', {
      errorKey,
      context,
      timestamp: new Date().toISOString()
    });
  }, []);

  const loadTeachers = useCallback(async () => {
    try {
      log('Cargando maestros');
      const members = await apiService.getAllMembers();
      setAvailableTeachers(members || []);
    } catch (err) {
      handleError('FETCH_TEACHERS', 'loadTeachers');
      logError('Error cargando maestros:', err);
    }
  }, [handleError]);

  const fetchEnrollments = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      log('Obteniendo cohortes');

      const data = await apiService.getEnrollments();
      const enrollmentsArray = Array.isArray(data) ? data : (data.content || []);

      if (!Array.isArray(enrollmentsArray)) {
        throw new Error('Formato de respuesta inválido');
      }

      const sorted = enrollmentsArray.sort((a, b) => {
        const dateA = new Date(a.startDate);
        const dateB = new Date(b.startDate);
        return dateB - dateA;
      });

      setEnrollments(sorted);
      
      // Aplicar filtros inline
      let filtered = sorted;

      if (filterLevel && filterLevel.trim() !== '') {
        if (!isValidLevel(filterLevel, LEVELS)) {
          handleError('VALIDATION_ERROR', 'invalid_level');
          setFilteredEnrollments([]);
          return;
        }
        filtered = filtered.filter(e => {
          const enrollmentLevel = e.levelEnrollment || e.level;
          return enrollmentLevel === filterLevel;
        });
      }

      if (filterStatus && filterStatus.trim() !== '') {
        if (!isValidStatus(filterStatus, STATUSES)) {
          handleError('VALIDATION_ERROR', 'invalid_status');
          setFilteredEnrollments([]);
          return;
        }
        filtered = filtered.filter(e => e.status === filterStatus);
      }

      setFilteredEnrollments(filtered);
    } catch (err) {
      handleError('FETCH_ENROLLMENTS', 'fetchEnrollments');
      logError('Error obteniendo cohortes:', err);
    } finally {
      setLoading(false);
    }
  }, [filterLevel, filterStatus, handleError]);

  useEffect(() => {
    fetchEnrollments();
    loadTeachers();
  }, [fetchEnrollments, loadTeachers]);

  const handleTeacherSearch = (value) => {
    try {
      if (typeof value !== 'string' || value.length > 100) {
        return;
      }

      setTeacherSearchTerm(value);
      setShowTeacherDropdown(true);

      if (value.trim() === '') {
        setFilteredTeachers([]);
        return;
      }

      const sanitizedValue = value.toLowerCase().trim();
      const filtered = availableTeachers.filter(
        (teacher) =>
          teacher.name?.toLowerCase().includes(sanitizedValue) ||
          teacher.email?.toLowerCase().includes(sanitizedValue)
      );
      setFilteredTeachers(filtered.slice(0, 5));
    } catch (error) {
      logError('Error en búsqueda de maestro:', error);
    }
  };

  // ✅ ACTUALIZADO: Usar getDisplayName para mostrar, pero guardar nombre original
  const handleSelectTeacher = (teacher) => {
    try {
      if (!teacher || !teacher.id || typeof teacher.id !== 'number') {
        handleError('VALIDATION_ERROR', 'invalid_teacher_id');
        return;
      }

      // Guardar nombre ORIGINAL para el backend
      setFormData((prev) => ({
        ...prev,
        teacher: { id: teacher.id, name: teacher.name }, // Nombre ORIGINAL
      }));
      
      // Mostrar nombre transformado en el input
      setTeacherSearchTerm(getDisplayName(teacher.name));
      setShowTeacherDropdown(false);
      setFilteredTeachers([]);
      
      log('Maestro seleccionado', { teacherId: teacher.id });
    } catch (error) {
      logError('Error seleccionando maestro:', error);
      handleError('VALIDATION_ERROR');
    }
  };

  const handleClearTeacher = () => {
    setFormData((prev) => ({
      ...prev,
      teacher: null,
    }));
    setTeacherSearchTerm('');
    setFilteredTeachers([]);
  };

  const handleEditTeacherSearch = (value) => {
    try {
      if (typeof value !== 'string' || value.length > 100) {
        return;
      }

      setEditTeacherSearchTerm(value);
      setEditShowTeacherDropdown(true);

      if (value.trim() === '') {
        setEditFilteredTeachers([]);
        return;
      }

      const sanitizedValue = value.toLowerCase().trim();
      const filtered = availableTeachers.filter(
        (teacher) =>
          teacher.name?.toLowerCase().includes(sanitizedValue) ||
          teacher.email?.toLowerCase().includes(sanitizedValue)
      );
      setEditFilteredTeachers(filtered.slice(0, 5));
    } catch (error) {
      logError('Error en búsqueda de maestro (editar):', error);
    }
  };

  // ✅ ACTUALIZADO: Usar getDisplayName para mostrar, pero guardar nombre original
  const handleEditSelectTeacher = (teacher) => {
    try {
      if (!teacher || !teacher.id || typeof teacher.id !== 'number') {
        handleError('VALIDATION_ERROR', 'invalid_teacher_id');
        return;
      }

      // Guardar nombre ORIGINAL para el backend
      setEditFormData((prev) => ({
        ...prev,
        teacher: { id: teacher.id, name: teacher.name }, // Nombre ORIGINAL
      }));
      
      // Mostrar nombre transformado en el input
      setEditTeacherSearchTerm(getDisplayName(teacher.name));
      setEditShowTeacherDropdown(false);
      setEditFilteredTeachers([]);
    } catch (error) {
      logError('Error seleccionando maestro (editar):', error);
      handleError('VALIDATION_ERROR');
    }
  };

  const handleEditClearTeacher = () => {
    setEditFormData((prev) => ({
      ...prev,
      teacher: null,
    }));
    setEditTeacherSearchTerm('');
    setEditFilteredTeachers([]);
  };

  const loadTabData = useCallback(async (tab) => {
    if (!selectedEnrollment || !selectedEnrollment.id) return;

    try {
      setError('');
      log('Cargando tab:', tab);

      switch (tab) {
        case 'lessons':
          const lessonsData = await apiService.getLessonsByEnrollment(selectedEnrollment.id);
          const sanitizedLessons = (lessonsData || []).map(l => ({
            ...l,
            lessonName: escapeHtml(l.lessonName),
            description: escapeHtml(l.description || '')
          }));
          setLessons(sanitizedLessons);
          break;

        case 'students':
          const studentsData = await apiService.getStudentEnrollmentsByEnrollment(selectedEnrollment.id);
          const sanitizedStudents = (studentsData || []).map(s => ({
            ...s,
            memberName: escapeHtml(s.memberName)
          }));
          setStudents(sanitizedStudents);
          break;

        case 'attendance':
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
      const errorKey =
        tab === 'lessons' ? 'FETCH_LESSONS' :
        tab === 'students' ? 'FETCH_STUDENTS' :
        tab === 'attendance' ? 'FETCH_ATTENDANCE' :
        'GENERIC';

      handleError(errorKey, `loadTabData:${tab}`);
      logError(`Error cargando tab ${tab}:`, err);
    }
  }, [selectedEnrollment, handleError]);

  useEffect(() => {
    if (showEnrollmentModal && selectedEnrollment) {
      loadTabData(activeTab);
    }
  }, [activeTab, showEnrollmentModal, selectedEnrollment, loadTabData]);

  const applyFilters = (data, level, status) => {
    try {
      log('Aplicando filtros', { level, status });

      let filtered = data;

      if (level && level.trim() !== '') {
        if (!isValidLevel(level, LEVELS)) {
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
        if (!isValidStatus(status, STATUSES)) {
          handleError('VALIDATION_ERROR', 'invalid_status');
          setFilteredEnrollments([]);
          return;
        }

        filtered = filtered.filter(e => e.status === status);
      }

      setFilteredEnrollments(filtered);
    } catch (error) {
      logError('Error aplicando filtros:', error);
      setFilteredEnrollments(data);
    }
  };

  const handleFilterChange = (type, value) => {
    try {
      setError('');

      if (type === 'level') {
        setFilterLevel(value);
        applyFilters(enrollments, value, filterStatus);
      } else if (type === 'status') {
        setFilterStatus(value);
        applyFilters(enrollments, filterLevel, value);
      }
    } catch (error) {
      logError('Error en cambio de filtro:', error);
    }
  };

  const handleOpenEnrollmentModal = (enrollment) => {
    try {
      if (!enrollment || !enrollment.id || typeof enrollment.id !== 'number') {
        handleError('INVALID_ENROLLMENT');
        return;
      }

      setSelectedEnrollment(enrollment);
      setActiveTab('details');
      setShowEnrollmentModal(true);
      setError('');
    } catch (error) {
      logError('Error abriendo modal de cohorte:', error);
      handleError('GENERIC');
    }
  };

  const handleCloseEnrollmentModal = () => {
    setSelectedEnrollment(null);
    setShowEnrollmentModal(false);
    setActiveTab('details');
    setLessons([]);
    setStudents([]);
    setAttendanceSummary([]);
    setError('');
  };

  const handleOpenEditModal = () => {
    try {
      if (!selectedEnrollment) return;

      // 🔒 No permitir editar cohortes en estado terminal
      if (selectedEnrollment.status === 'COMPLETED' || selectedEnrollment.status === 'CANCELLED') {
        const message = selectedEnrollment.status === 'COMPLETED'
          ? 'No se puede editar una cohorte completada'
          : 'No se puede editar una cohorte cancelada';

        setError(message);
        logSecurityEvent('unauthorized_edit_attempt', {
          enrollmentId: selectedEnrollment.id,
          status: selectedEnrollment.status,
          timestamp: new Date().toISOString()
        });
        return;
      }

      setEditFormData({
        cohortName: selectedEnrollment.cohortName || '',
        startDate: selectedEnrollment.startDate || '',
        endDate: selectedEnrollment.endDate || '',
        maxStudents: selectedEnrollment.maxStudents || 30,
        minAttendancePercentage: selectedEnrollment.minAttendancePercentage || 80,
        minAverageScore: selectedEnrollment.minAverageScore || 3.0,
        teacher: selectedEnrollment.teacher || null,
      });

      if (selectedEnrollment.teacher?.name) {
        // Mostrar nombre transformado en el input
        setEditTeacherSearchTerm(getDisplayName(selectedEnrollment.teacher.name));
      }

      setShowEditModal(true);
      log('Modal de edición abierto', { enrollmentId: selectedEnrollment.id });
    } catch (error) {
      logError('Error abriendo modal de edición:', error);
      handleError('GENERIC');
    }
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setEditFormData({
      cohortName: '',
      startDate: '',
      endDate: '',
      maxStudents: 30,
      minAttendancePercentage: 80,
      minAverageScore: 3.0,
      teacher: null,
    });
    setEditTeacherSearchTerm('');
    setEditFilteredTeachers([]);
    setError('');
  };

  const throttledStatusChange = throttle(
    async (enrollmentId, newStatus) => {
      try {
        if (!enrollmentId || typeof enrollmentId !== 'number') {
          handleError('VALIDATION_ERROR', 'invalid_enrollment_id');
          return;
        }

        if (!isValidStatus(newStatus, STATUSES)) {
          handleError('VALIDATION_ERROR', 'invalid_status_change');
          return;
        }

        setError('');
        log('Cambiando estado', { enrollmentId, newStatus });

        await apiService.updateEnrollmentStatus(enrollmentId, newStatus);

        logSecurityEvent('status_changed', {
          enrollmentId,
          newStatus,
          timestamp: new Date().toISOString()
        });

        fetchEnrollments();
        handleCloseEnrollmentModal();
      } catch (err) {
        handleError('UPDATE_STATUS', 'handleStatusChange');
        logError('Error cambiando estado:', err);
      }
    },
    1000
  );

  const handleStatusChange = (enrollmentId, newStatus) => {
    try {
      if (!selectedEnrollment) return;

      // 🔒 No permitir cambiar estado de cohortes en estado terminal
      if (selectedEnrollment.status === 'COMPLETED' || selectedEnrollment.status === 'CANCELLED') {
        const message = selectedEnrollment.status === 'COMPLETED'
          ? 'No se puede cambiar el estado de una cohorte completada'
          : 'No se puede cambiar el estado de una cohorte cancelada';

        setError(message);
        logSecurityEvent('unauthorized_status_change_attempt', {
          enrollmentId,
          status: selectedEnrollment.status,
          timestamp: new Date().toISOString()
        });
        return;
      }

      throttledStatusChange(enrollmentId, newStatus);
    } catch (error) {
      logError('Error en cambio de estado:', error);
      handleError('GENERIC');
    }
  };

  const handleCreateLesson = async () => {
    try {
      setShowCreateLessonModal(true);
    } catch (error) {
      logError('Error abriendo modal de lección:', error);
      handleError('GENERIC');
    }
  };

  const handleLessonCreated = useCallback(async () => {
    try {
      if (selectedEnrollment) {
        await loadTabData('lessons');
      }
    } catch (error) {
      logError('Error después de crear lección:', error);
    }
  }, [selectedEnrollment, loadTabData]);

  const handleRecordAttendance = async () => {
    try {
      setShowRecordAttendanceModal(true);
    } catch (error) {
      logError('Error abriendo modal de asistencia:', error);
      handleError('GENERIC');
    }
  };

  const handleAttendanceRecorded = useCallback(async () => {
    try {
      if (selectedEnrollment) {
        await loadTabData('attendance');
      }
    } catch (error) {
      logError('Error después de registrar asistencia:', error);
    }
  }, [selectedEnrollment, loadTabData]);

  const handleOpenLessonAttendanceDetail = (lesson) => {
    try {
      if (!lesson || !lesson.id || typeof lesson.id !== 'number') {
        handleError('VALIDATION_ERROR', 'invalid_lesson');
        return;
      }

      log('Abriendo detalles de asistencia de lección', { lessonId: lesson.id });
      setSelectedLesson(lesson);
      setShowLessonAttendanceDetailModal(true);
    } catch (error) {
      logError('Error abriendo detalles de lección:', error);
      handleError('GENERIC');
    }
  };

  const handleCloseLessonAttendanceDetail = () => {
    setSelectedLesson(null);
    setShowLessonAttendanceDetailModal(false);
  };

  const handleLessonAttendanceRecorded = useCallback(async () => {
    try {
      if (selectedEnrollment) {
        await loadTabData('attendance');
      }
    } catch (error) {
      logError('Error después de registrar asistencia de lección:', error);
    }
  }, [selectedEnrollment, loadTabData]);

  const validateForm = () => {
    const errors = [];

    if (!formData.level || !isValidLevel(formData.level, LEVELS)) {
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

    if (!formData.teacher || !formData.teacher.id || typeof formData.teacher.id !== 'number') {
      errors.push('Maestro requerido');
    }

    if (!isValidMaxStudents(formData.maxStudents)) {
      errors.push('Máximo de estudiantes debe estar entre 1 y 500');
    }

    if (!isValidPercentage(formData.minAttendancePercentage)) {
      errors.push('Porcentaje de asistencia debe estar entre 0 y 100');
    }

    if (!isValidScore(formData.minAverageScore)) {
      errors.push('Calificación mínima debe estar entre 0 y 5');
    }

    return errors;
  };

  const validateEditForm = () => {
    const errors = [];

    if (editFormData.startDate && editFormData.endDate) {
      if (!validateDates(editFormData.startDate, editFormData.endDate)) {
        errors.push('Fecha de inicio debe ser anterior a fecha de fin');
      }
    }

    if (editFormData.maxStudents && !isValidMaxStudents(editFormData.maxStudents)) {
      errors.push('Máximo de estudiantes debe estar entre 1 y 500');
    }

    if (editFormData.minAttendancePercentage !== '' && !isValidPercentage(editFormData.minAttendancePercentage)) {
      errors.push('Porcentaje de asistencia debe estar entre 0 y 100');
    }

    if (editFormData.minAverageScore !== '' && !isValidScore(editFormData.minAverageScore)) {
      errors.push('Calificación mínima debe estar entre 0 y 5');
    }

    return errors;
  };

  // ✅ IMPORTANTE: El formulario envía nombres ORIGINALES al backend
  // ========== FORM SUBMIT HANDLER (Versión mejorada) ==========
const handleSubmit = async (e) => {
  e.preventDefault();

  try {
    setError('');

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

    log('Creando cohorte', { level: formData.level });

    await apiService.createEnrollment(enrollmentData);

    logSecurityEvent('enrollment_created', {
      level: formData.level,
      timestamp: new Date().toISOString()
    });

    // ✅ Mostrar alert inmediatamente
    alert("✅ Cohorte creada exitosamente");
    
    setShowForm(false);
    resetForm();
    
    // ✅ Luego actualizar datos en segundo plano
    await fetchEnrollments();
    
  } catch (err) {
    handleError('CREATE_ENROLLMENT', 'handleSubmit');
    logError('Error creando cohorte:', err);
    alert("❌ Error al crear la cohorte: " + err.message);
  }
};

  // ✅ IMPORTANTE: El formulario de edición envía nombres ORIGINALES al backend
  const handleEditSubmit = async (e) => {
    e.preventDefault();

    try {
      setError('');

      const validationErrors = validateEditForm();
      if (validationErrors.length > 0) {
        setError(validationErrors.join('. '));
        return;
      }

      const updateData = {};

      if (editFormData.cohortName && editFormData.cohortName.trim() !== '') {
        updateData.cohortName = editFormData.cohortName.trim();
      }
      if (editFormData.startDate) {
        updateData.startDate = editFormData.startDate;
      }
      if (editFormData.endDate) {
        updateData.endDate = editFormData.endDate;
      }
      if (editFormData.maxStudents) {
        updateData.maxStudents = parseInt(editFormData.maxStudents);
      }
      if (editFormData.minAttendancePercentage !== '') {
        updateData.minAttendancePercentage = parseFloat(editFormData.minAttendancePercentage);
      }
      if (editFormData.minAverageScore !== '') {
        updateData.minAverageScore = parseFloat(editFormData.minAverageScore);
      }
      if (editFormData.teacher?.id && typeof editFormData.teacher.id === 'number') {
        updateData.teacher = editFormData.teacher; // Contiene nombre ORIGINAL
      }

      if (Object.keys(updateData).length === 0) {
        setError('Debes hacer al menos un cambio');
        return;
      }

      log('Editando cohorte', { enrollmentId: selectedEnrollment.id });

      await apiService.editEnrollment(selectedEnrollment.id, updateData);

      logSecurityEvent('enrollment_edited', {
        enrollmentId: selectedEnrollment.id,
        timestamp: new Date().toISOString()
      });

      handleCloseEditModal();
      fetchEnrollments();
      handleCloseEnrollmentModal();

    } catch (err) {
      handleError('EDIT_ENROLLMENT', 'handleEditSubmit');
      logError('Error editando cohorte:', err);
    }
  };

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

  return (
    <div className="enrollments-page">
      <div className="page-container">
        <div className="page-header">
          <h1>📋 Gestión de Cohortes</h1>
          <p>Crea y gestiona cohortes de formación</p>
        </div>

        {error && (
          <div className="alert alert-danger" role="alert">
            <strong>⚠️ Error:</strong> {error}
          </div>
        )}

        <div className="button-group">
          <button
            onClick={() => setShowForm(!showForm)}
            className="btn-primary"
          >
            {showForm ? '✖️ Cerrar' : '➕ Nueva Cohorte'}
          </button>
        </div>

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

              <div className="form-field form-field-full">
                <label>Maestro / Profesor *</label>
                <div className="teacher-search-container">
                  <input
                    type="text"
                    placeholder="Busca un maestro por nombre..."
                    value={teacherSearchTerm} // ✅ Mostrar nombre TRANSFORMADO
                    onChange={(e) => handleTeacherSearch(e.target.value)}
                    onFocus={() => teacherSearchTerm && setShowTeacherDropdown(true)}
                    className="teacher-search-input"
                    maxLength="100"
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
                          <div className="teacher-name">{getDisplayName(teacher.name)}</div> {/* ✅ Mostrar transformado */}
                        </button>
                      ))}
                    </div>
                  )}

                  {formData.teacher && (
                    <div className="teacher-selected">
                      <p className="teacher-selected-name">✅ {getDisplayName(formData.teacher.name)}</p> {/* ✅ Mostrar transformado */}
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
                  {enrollment.teacher?.name && (
                    <p><strong>👨‍🏫 Maestro:</strong> {getDisplayName(enrollment.teacher.name)}</p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

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

            <div className="modal-body">
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
                    {selectedEnrollment.teacher?.name && (
                      <div>
                        <p className="detail-label">👨‍🏫 Maestro</p>
                        <p className="detail-value">{getDisplayName(selectedEnrollment.teacher.name)}</p>
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
                      <p className="detail-value">{selectedEnrollment.minAttendancePercentage ? (selectedEnrollment.minAttendancePercentage * 100 / 100) : 0}%</p>
                    </div>
                    <div>
                      <p className="detail-label">Calificación Min.</p>
                      <p className="detail-value">{(selectedEnrollment.minAverageScore || 0).toFixed(2)}</p>
                    </div>
                  </div>

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

                  <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #e5e7eb' }}>
                    <button
                      onClick={handleOpenEditModal}
                      className="action-btn btn-warning"
                      style={{ width: '100%' }}
                    >
                      ✏️ Editar Cohorte
                    </button>
                  </div>
                </div>
              )}

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

      {showEditModal && selectedEnrollment && (
        <div className="modal-overlay" onClick={handleCloseEditModal}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2>✏️ Editar Cohorte</h2>
              <button
                className="modal-close-btn"
                onClick={handleCloseEditModal}
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              {error && (
                <div className="alert alert-danger" role="alert">
                  <strong>⚠️ Error:</strong> {error}
                </div>
              )}

              <form onSubmit={handleEditSubmit} className="form-grid">
                <div className="form-field form-field-full">
                  <label>Nombre de Cohorte</label>
                  <input
                    type="text"
                    value={editFormData.cohortName}
                    onChange={(e) => setEditFormData({ ...editFormData, cohortName: e.target.value })}
                    placeholder="Dejar en blanco para no cambiar"
                    maxLength="100"
                  />
                </div>

                <div className="form-field">
                  <label>Fecha Inicio</label>
                  <input
                    type="date"
                    value={editFormData.startDate}
                    onChange={(e) => setEditFormData({ ...editFormData, startDate: e.target.value })}
                  />
                </div>

                <div className="form-field">
                  <label>Fecha Fin</label>
                  <input
                    type="date"
                    value={editFormData.endDate}
                    onChange={(e) => setEditFormData({ ...editFormData, endDate: e.target.value })}
                  />
                </div>

                <div className="form-field form-field-full">
                  <label>Maestro / Profesor</label>
                  <div className="teacher-search-container">
                    <input
                      type="text"
                      placeholder="Busca un maestro por nombre..."
                      value={editTeacherSearchTerm} // ✅ Mostrar nombre TRANSFORMADO
                      onChange={(e) => handleEditTeacherSearch(e.target.value)}
                      onFocus={() => editTeacherSearchTerm && setEditShowTeacherDropdown(true)}
                      className="teacher-search-input"
                      maxLength="100"
                    />

                    {editFormData.teacher && (
                      <button
                        type="button"
                        onClick={handleEditClearTeacher}
                        className="teacher-clear-btn"
                        title="Limpiar selección"
                      >
                        ✕
                      </button>
                    )}

                    {editShowTeacherDropdown && editFilteredTeachers.length > 0 && (
                      <div className="teacher-dropdown">
                        {editFilteredTeachers.map((teacher) => (
                          <button
                            key={teacher.id}
                            type="button"
                            onClick={() => handleEditSelectTeacher(teacher)}
                            className="teacher-option"
                          >
                            <div className="teacher-name">{getDisplayName(teacher.name)}</div> {/* ✅ Mostrar transformado */}
                          </button>
                        ))}
                      </div>
                    )}

                    {editFormData.teacher && (
                      <div className="teacher-selected">
                        <p className="teacher-selected-name">✅ {getDisplayName(editFormData.teacher.name)}</p> {/* ✅ Mostrar transformado */}
                      </div>
                    )}
                  </div>
                </div>

                <div className="form-field">
                  <label>Máx. Estudiantes</label>
                  <input
                    type="number"
                    value={editFormData.maxStudents}
                    onChange={(e) => setEditFormData({ ...editFormData, maxStudents: e.target.value })}
                    min="1"
                    max="500"
                  />
                </div>

                <div className="form-field">
                  <label>% Asistencia Mín.</label>
                  <input
                    type="number"
                    value={editFormData.minAttendancePercentage}
                    onChange={(e) => setEditFormData({ ...editFormData, minAttendancePercentage: e.target.value })}
                    min="0"
                    max="100"
                    step="0.1"
                  />
                </div>

                <div className="form-field">
                  <label>Calificación Mín.</label>
                  <input
                    type="number"
                    value={editFormData.minAverageScore}
                    onChange={(e) => setEditFormData({ ...editFormData, minAverageScore: e.target.value })}
                    min="0"
                    max="5"
                    step="0.1"
                  />
                </div>

                <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '10px', marginTop: '10px' }}>
                  <button type="submit" className="btn-primary" style={{ flex: 1 }}>
                    ✅ Guardar Cambios
                  </button>
                  <button
                    type="button"
                    onClick={handleCloseEditModal}
                    className="btn-secondary"
                    style={{ flex: 1 }}
                  >
                    ❌ Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

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

      <style>{`
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