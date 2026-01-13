// 📋 EnrollmentsPage.jsx - Versión v3 con Modal de Detalle de Asistencia
// Gestión de cohortes con vistas modales independientes + Modal de asistencia por lección

import React, { useState, useEffect } from 'react';
import apiService from '../apiService';
import ModalCreateLesson from '../components/ModalCreateLesson';
import ModalRecordAttendance from '../components/ModalRecordAttendance';
import ModalLessonAttendanceDetail from '../components/ModalLessonAttendanceDetail';
import '../css/EnrollmentsPage.css';

const EnrollmentsPage = () => {
  // ========== ESTADO PRINCIPAL ==========
  const [enrollments, setEnrollments] = useState([]);
  const [filteredEnrollments, setFilteredEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterLevel, setFilterLevel] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

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

  // ========== ESTADO DEL FORMULARIO DE CREAR COHORTE ==========
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    level: 'PREENCUENTRO',
    startDate: '',
    endDate: '',
    maxStudents: 30,
    minAttendancePercentage: 80,
    minAverageScore: 3.0,
  });

  // ========== DATOS CARGADOS DINÁMICAMENTE ==========
  const [lessons, setLessons] = useState([]);
  const [students, setStudents] = useState([]);
  const [attendanceSummary, setAttendanceSummary] = useState([]);

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

  // ========== EFECTOS ==========
  useEffect(() => {
    fetchEnrollments();
  }, []);

  useEffect(() => {
    if (showEnrollmentModal && selectedEnrollment) {
      loadTabData(activeTab);
    }
  }, [activeTab, selectedEnrollment]);

  // ========== FUNCIONES PRINCIPALES ==========
  const fetchEnrollments = async () => {
    try {
      setLoading(true);
      const data = await apiService.getEnrollments();
      console.log('📥 Cohortes obtenidas:', data);

      const sorted = data.sort((a, b) => {
        return new Date(b.startDate) - new Date(a.startDate);
      });

      setEnrollments(sorted);
      applyFilters(sorted, filterLevel, filterStatus);
    } catch (err) {
      alert('❌ Error al cargar cohortes: ' + err.message);
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadTabData = async (tab) => {
    if (!selectedEnrollment) return;

    try {
      switch (tab) {
        case 'lessons':
          console.log('📚 Cargando lecciones...');
          const lessonsData = await apiService.getLessonsByEnrollment(selectedEnrollment.id);
          setLessons(lessonsData || []);
          break;

        case 'students':
          console.log('👥 Cargando estudiantes...');
          const studentsData = await apiService.getStudentEnrollmentsByEnrollment(selectedEnrollment.id);
          setStudents(studentsData || []);
          break;

        case 'attendance':
          console.log('📊 Cargando resumen de asistencias...');
          // Cargar lecciones para mostrar resumen
          const lessonsForAttendance = await apiService.getLessonsByEnrollment(selectedEnrollment.id);
          setAttendanceSummary(lessonsForAttendance || []);
          break;

        default:
          break;
      }
    } catch (err) {
      console.error(`Error cargando ${tab}:`, err);
      alert(`Error al cargar ${tab}: ${err.message}`);
    }
  };

  const applyFilters = (data, level, status) => {
    console.log('🔍 Aplicando filtros:', { level, status });

    let filtered = data;

    if (level && level.trim() !== '') {
      filtered = filtered.filter(e => {
        const enrollmentLevel = e.levelEnrollment || e.level;
        return enrollmentLevel === level;
      });
    }

    if (status && status.trim() !== '') {
      filtered = filtered.filter(e => e.status === status);
    }

    console.log(`✅ Resultado: ${filtered.length} cohortes`);
    setFilteredEnrollments(filtered);
  };

  const handleFilterChange = (type, value) => {
    if (type === 'level') {
      setFilterLevel(value);
      applyFilters(enrollments, value, filterStatus);
    } else if (type === 'status') {
      setFilterStatus(value);
      applyFilters(enrollments, filterLevel, value);
    }
  };

  const handleOpenEnrollmentModal = (enrollment) => {
    setSelectedEnrollment(enrollment);
    setActiveTab('details');
    setShowEnrollmentModal(true);
  };

  const handleCloseEnrollmentModal = () => {
    setSelectedEnrollment(null);
    setShowEnrollmentModal(false);
    setActiveTab('details');
    setLessons([]);
    setStudents([]);
    setAttendanceSummary([]);
  };

  const handleStatusChange = async (enrollmentId, newStatus) => {
    try {
      await apiService.updateEnrollmentStatus(enrollmentId, newStatus);
      alert('✅ Estado actualizado exitosamente');
      fetchEnrollments();
      handleCloseEnrollmentModal();
    } catch (err) {
      alert('❌ Error al actualizar estado: ' + err.message);
    }
  };

  const handleCreateLesson = async () => {
    setShowCreateLessonModal(true);
  };

  const handleLessonCreated = async () => {
    // Recargar lecciones
    if (selectedEnrollment) {
      await loadTabData('lessons');
    }
  };

  const handleRecordAttendance = async () => {
    setShowRecordAttendanceModal(true);
  };

  const handleAttendanceRecorded = async () => {
    // Recargar asistencias
    if (selectedEnrollment) {
      await loadTabData('attendance');
    }
  };

  // ========== FUNCIONES DEL MODAL DE DETALLE DE ASISTENCIA ==========
  const handleOpenLessonAttendanceDetail = (lesson) => {
    console.log('📖 Abriendo detalle de asistencia para lección:', lesson.lessonName);
    setSelectedLesson(lesson);
    setShowLessonAttendanceDetailModal(true);
  };

  const handleCloseLessonAttendanceDetail = () => {
    console.log('📖 Cerrando detalle de asistencia');
    setSelectedLesson(null);
    setShowLessonAttendanceDetailModal(false);
  };

  const handleLessonAttendanceRecorded = async () => {
    console.log('✅ Asistencia registrada, recargando datos...');
    // Recargar el resumen de asistencias
    if (selectedEnrollment) {
      await loadTabData('attendance');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (!formData.level || !formData.startDate || !formData.endDate) {
        alert('Por favor completa todos los campos requeridos');
        return;
      }

      if (new Date(formData.startDate) >= new Date(formData.endDate)) {
        alert('La fecha de inicio debe ser anterior a la fecha de fin');
        return;
      }

      const enrollmentData = {
        level: formData.level,
        startDate: formData.startDate,
        endDate: formData.endDate,
        maxStudents: parseInt(formData.maxStudents),
        minAttendancePercentage: parseFloat(formData.minAttendancePercentage),
        minAverageScore: parseFloat(formData.minAverageScore),
      };

      console.log('📤 Creando cohorte:', enrollmentData);
      await apiService.createEnrollment(enrollmentData);
      alert('✅ Cohorte creada exitosamente');
      setShowForm(false);
      resetForm();
      fetchEnrollments();
    } catch (err) {
      alert('❌ Error: ' + err.message);
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
    });
  };

  const getLevelLabel = (levelValue) => {
    return LEVELS.find(l => l.value === levelValue)?.label || levelValue;
  };

  const getStatusLabel = (statusValue) => {
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
                  onChange={handleInputChange}
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
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-field">
                <label>Fecha Fin *</label>
                <input
                  type="date"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-field">
                <label>Máx. Estudiantes *</label>
                <input
                  type="number"
                  name="maxStudents"
                  value={formData.maxStudents}
                  onChange={handleInputChange}
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
                  onChange={handleInputChange}
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
                  onChange={handleInputChange}
                  min="0"
                  max="5"
                  step="0.1"
                  required
                />
              </div>

              <button type="submit" className="btn-primary">
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
              >
                <div className="card-header">
                  <h3>{enrollment.cohortName || getLevelLabel(enrollment.levelEnrollment || enrollment.level)}</h3>
                  <span className={`status-badge ${getStatusColor(enrollment.status)}`}>
                    {getStatusLabel(enrollment.status)}
                  </span>
                </div>
                <div className="card-body">
                  <p><strong>Nivel:</strong> {getLevelLabel(enrollment.levelEnrollment || enrollment.level)}</p>
                  <p><strong>Inicio:</strong> {new Date(enrollment.startDate).toLocaleDateString('es-CO')}</p>
                  <p><strong>Fin:</strong> {new Date(enrollment.endDate).toLocaleDateString('es-CO')}</p>
                  <p><strong>Estudiantes:</strong> {enrollment.maxStudents} máx</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ========== MODAL DE COHORTE (PRINCIPAL) ========== */}
      {showEnrollmentModal && selectedEnrollment && (
        <div className="modal-overlay" onClick={handleCloseEnrollmentModal}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="modal-header">
              <h2>{selectedEnrollment.cohortName || getLevelLabel(selectedEnrollment.levelEnrollment)}</h2>
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

            {/* Contenido de pestañas */}
            <div className="modal-body">
              {/* PESTAÑA: Detalles */}
              {activeTab === 'details' && (
                <div className="tab-content">
                  <div className="details-grid">
                    <div>
                      <p className="detail-label">ID</p>
                      <p className="detail-value">{selectedEnrollment.id}</p>
                    </div>
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
                      <p className="detail-value">{selectedEnrollment.minAttendancePercentage}%</p>
                    </div>
                    <div>
                      <p className="detail-label">Calificación Min.</p>
                      <p className="detail-value">{selectedEnrollment.minAverageScore}</p>
                    </div>
                  </div>

                  {/* Acciones de estado */}
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

              {/* PESTAÑA: Lecciones */}
              {activeTab === 'lessons' && (
                <div className="tab-content">
                  <div className="tab-actions">
                    <button
                      onClick={handleCreateLesson}
                      className="btn-primary"
                    >
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

              {/* PESTAÑA: Estudiantes */}
              {activeTab === 'students' && (
                <div className="tab-content">
                  {students.length === 0 ? (
                    <p className="empty-message">No hay estudiantes inscritos</p>
                  ) : (
                    <div className="students-list">
                      {students.map(student => (
                        <div key={student.id} className="student-item">
                          <div className="student-header">
                            <h4>👤 {student.memberName || `Estudiante ${student.memberId}`}</h4>
                            <span className={`status-badge ${getStatusColor(student.status)}`}>
                              {getStatusLabel(student.status)}
                            </span>
                          </div>
                          <div className="student-info">
                            <p>📅 Inscrito: {new Date(student.enrollmentDate).toLocaleDateString('es-CO')}</p>
                            {student.finalAttendancePercentage && (
                              <p>📊 Asistencia: {student.finalAttendancePercentage.toFixed(1)}%</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* PESTAÑA: Asistencias - MEJORADA CON CLICK EN LECCIONES */}
              {activeTab === 'attendance' && (
                <div className="tab-content">
                  <div className="tab-actions">
                    <button
                      onClick={handleRecordAttendance}
                      className="btn-primary"
                    >
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
                          title="Click para ver detalles de asistencia"
                        >
                          <div className="attendance-header">
                            <h4>📖 {lesson.lessonNumber}. {lesson.lessonName}</h4>
                            <span className="view-details-badge">👁️ Ver detalles</span>
                          </div>
                          <div className="attendance-info">
                            <p>📅 {new Date(lesson.lessonDate).toLocaleDateString('es-CO')}</p>
                            <p>✅ {lesson.attendanceCount || 0} registros de asistencia</p>
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

      {/* ========== MODAL DE DETALLE DE ASISTENCIA POR LECCIÓN ========== */}
      {selectedLesson && selectedEnrollment && (
        <ModalLessonAttendanceDetail
          isOpen={showLessonAttendanceDetailModal}
          onClose={handleCloseLessonAttendanceDetail}
          lesson={selectedLesson}
          enrollment={selectedEnrollment}
          onAttendanceRecorded={handleLessonAttendanceRecorded}
        />
      )}

      {/* ========== MODALES SECUNDARIOS ========== */}
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
        .attendance-item.clickable {
          cursor: pointer;
          transition: all 0.2s ease;
          position: relative;
        }

        .attendance-item.clickable:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 16px rgba(37, 99, 235, 0.15);
          background-color: #f0f9ff;
        }

        .view-details-badge {
          display: inline-block;
          background: linear-gradient(135deg, #2563eb 0%, #10b981 100%);
          color: white;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 600;
          animation: fadeIn 0.3s ease;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};

export default EnrollmentsPage;
