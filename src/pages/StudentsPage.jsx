// 📚 StudentsPage.jsx - Gestión de Estudiantes por Niveles
// Versión limpia con estilos en archivo CSS separado
// CORREGIDA: Permite seleccionar "Todos los niveles"

import React, { useState, useEffect } from 'react';
import apiService from '../apiService';
import ModalEnrollStudent from '../components/Modalenrollstudent';
import ModalStatistics from '../components/ModalStatistics';
import { generatePDF } from '../services/Pdfgenerator';
import '../css/Studentspage.css';

const StudentsPage = () => {
  // ========== ESTADO PRINCIPAL ==========
  const [allStudents, setAllStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [availableLevels, setAvailableLevels] = useState([]);

  // ========== FILTROS ==========
  const [selectedLevel, setSelectedLevel] = useState('ALL');
  const [showOnlyFailed, setShowOnlyFailed] = useState(false);
  const [searchText, setSearchText] = useState('');

  // ========== MODALES ==========
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [showStatisticsModal, setShowStatisticsModal] = useState(false);

  // ========== DATOS PARA ESTADÍSTICAS ==========
  const [statisticsData, setStatisticsData] = useState(null);

  // Cargar datos al montar
  useEffect(() => {
    loadStudents();
  }, []);

  // Aplicar filtros cuando cambian
  useEffect(() => {
    applyFilters();
  }, [allStudents, selectedLevel, showOnlyFailed, searchText]);

  // ========== CARGAR ESTUDIANTES ==========
  const loadStudents = async () => {
    setLoading(true);
    setError('');

    try {
      console.log('📚 Cargando todos los estudiantes...');

      const enrollments = await apiService.getStudentEnrollments();

      console.log('✅ Datos brutos del API:', enrollments);

      if (!enrollments || enrollments.length === 0) {
        console.warn('⚠️ No hay estudiantes disponibles');
        setAllStudents([]);
        setAvailableLevels([]);
        return;
      }

      // Procesar estudiantes
      const processedStudents = enrollments.map(enrollment => {
        const levelValue = extractLevel(enrollment);

        return {
          id: enrollment.id,
          memberId: enrollment.memberId,
          studentName: enrollment.memberName || 'Sin nombre',
          level: enrollment.cohortName || 'Sin cohorte',
          levelEnrollment: levelValue,
          cohortName: enrollment.cohortName,
          status: enrollment.status,
          enrollmentDate: enrollment.enrollmentDate,
          completionDate: enrollment.completionDate,
          finalAttendancePercentage: enrollment.finalAttendancePercentage,
          passed: enrollment.passed,
          attendancePercentage: enrollment.finalAttendancePercentage || 0,
        };
      });

      console.log('✅ Estudiantes procesados:', processedStudents);
      setAllStudents(processedStudents);

      // Extraer niveles únicos disponibles
      const uniqueLevels = [...new Set(processedStudents.map(s => s.levelEnrollment).filter(Boolean))];
      console.log('📌 Niveles únicos encontrados:', uniqueLevels);
      setAvailableLevels(uniqueLevels);

    } catch (err) {
      console.error('❌ Error cargando estudiantes:', err);
      setError('Error al cargar la lista de estudiantes: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // ========== EXTRAER NIVEL ==========
  const extractLevel = (enrollment) => {
    if (enrollment.level) return enrollment.level;

    if (enrollment.cohortName) {
      const cohortName = enrollment.cohortName;

      const match1 = cohortName.match(/^(\d{4})-([A-Z_]+)-/);
      if (match1) return match1[2];

      const match2 = cohortName.match(/^([A-Z_]+)-/);
      if (match2) return match2[1];

      if (cohortName.includes('PREENCUENTRO')) return 'PREENCUENTRO';
      if (cohortName.includes('ENCUENTRO')) return 'ENCUENTRO';
      if (cohortName.includes('POST_ENCUENTRO')) return 'POST_ENCUENTRO';
      if (cohortName.includes('BAUTIZOS')) return 'BAUTIZOS';
      if (cohortName.includes('EDIRD_1')) return 'EDIRD_1';
      if (cohortName.includes('EDIRD_2')) return 'EDIRD_2';
      if (cohortName.includes('EDIRD_3')) return 'EDIRD_3';
      if (cohortName.includes('EDIRD_4')) return 'EDIRD_4';
      if (cohortName.includes('ADIESTRAMIENTO')) return 'ADIESTRAMIENTO';
      if (cohortName.includes('SANIDAD')) return 'SANIDAD_INTEGRAL_RAICES';
      if (cohortName.includes('GRADUACION')) return 'GRADUACION';
    }

    return null;
  };

  // ========== APLICAR FILTROS ==========
  const applyFilters = () => {
    let filtered = [...allStudents];

    // ✅ CORREGIDO: Filtrar por nivel (si no es "ALL")
    if (selectedLevel !== 'ALL') {
      console.log('🔍 Filtrando por nivel:', selectedLevel);
      filtered = filtered.filter(student => student.levelEnrollment === selectedLevel);
      console.log(`✅ Después de filtro nivel: ${filtered.length} estudiantes`);
    } else {
      console.log('✅ Mostrando TODOS los estudiantes');
    }

    // Filtrar solo reprobados
    if (showOnlyFailed) {
      filtered = filtered.filter(student => student.passed === false || student.passed === null);
    }

    // Filtrar por búsqueda
    if (searchText.trim()) {
      const search = searchText.toLowerCase();
      filtered = filtered.filter(student =>
        student.studentName.toLowerCase().includes(search)
      );
    }

    console.log('📊 Resultado final del filtro:', filtered.length, 'estudiantes');
    setFilteredStudents(filtered);
  };

  // ========== CANCELAR INSCRIPCIÓN ==========
  const handleCancelEnrollment = async (studentId) => {
    if (!window.confirm('¿Estás seguro de que deseas cancelar esta inscripción?')) {
      return;
    }

    try {
      console.log('🚫 Cancelando inscripción:', studentId);
      await apiService.withdrawStudentFromCohort(studentId);
      console.log('✅ Inscripción cancelada exitosamente');
      alert('Inscripción cancelada exitosamente');
      loadStudents();
    } catch (err) {
      console.error('❌ Error cancelando inscripción:', err);
      alert('Error al cancelar la inscripción: ' + err.message);
    }
  };

  // ========== GENERAR ESTADÍSTICAS ==========
  const handleShowStatistics = async () => {
    try {
      console.log('📊 Generando estadísticas...');
      const stats = calculateStatistics();
      setStatisticsData(stats);
      setShowStatisticsModal(true);
      console.log('✅ Estadísticas generadas:', stats);
    } catch (err) {
      console.error('❌ Error generando estadísticas:', err);
      alert('Error al generar estadísticas: ' + err.message);
    }
  };

  // ========== CALCULAR ESTADÍSTICAS ==========
  const calculateStatistics = () => {
    const stats = {};

    availableLevels.forEach(level => {
      const levelStudents = allStudents.filter(s => s.levelEnrollment === level);
      const passed = levelStudents.filter(s => s.passed === true).length;
      const failed = levelStudents.filter(s => s.passed === false || s.passed === null).length;
      const total = levelStudents.length;

      stats[level] = {
        label: getLevelLabel(level),
        total,
        passed,
        failed,
        passPercentage: total > 0 ? ((passed / total) * 100).toFixed(1) : 0,
      };
    });

    return stats;
  };

  // ========== EXPORTAR A PDF ==========
  const handleExportPDF = async () => {
    try {
      console.log('📄 Generando PDF...');

      const data = {
        title: showOnlyFailed ? 'Estudiantes Reprobados' : 'Listado de Estudiantes',
        level: selectedLevel === 'ALL' ? 'Todos los Niveles' : getLevelLabel(selectedLevel),
        date: new Date().toLocaleDateString('es-CO'),
        students: filteredStudents,
        statistics: calculateStatistics(),
      };

      generatePDF(data, 'students-report');
      console.log('✅ PDF generado exitosamente');
    } catch (err) {
      console.error('❌ Error generando PDF:', err);
      alert('Error al generar PDF: ' + err.message);
    }
  };

  // ========== OBTENER ETIQUETA DE NIVEL ==========
  const getLevelLabel = (levelValue) => {
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
    return levelMap[levelValue] || levelValue;
  };

  // ========== RENDER ==========
  return (
    <div className="students-page">
      <div className="students-page-container">
        {/* Header */}
        <div className="students-page__header">
          <h1>👥 Gestión de Estudiantes</h1>
          <p>Visualiza y gestiona estudiantes por niveles de formación</p>
        </div>

        {/* Controles */}
        <div className="students-page__controls">
          <div className="students-page__controls-grid">
            {/* Filtro de Nivel */}
            <div className="students-page__filter-item">
              <label>📌 Filtrar por Nivel</label>
              <select
                value={selectedLevel}
                onChange={(e) => {
                  console.log('🔄 Cambiando a nivel:', e.target.value);
                  setSelectedLevel(e.target.value);
                }}
              >
                <option value="ALL">Todos los Niveles ({allStudents.length})</option>
                {availableLevels.map(level => {
                  const count = allStudents.filter(s => s.levelEnrollment === level).length;
                  return (
                    <option key={level} value={level}>
                      {getLevelLabel(level)} ({count})
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Búsqueda */}
            <div className="students-page__filter-item">
              <label>🔍 Buscar Estudiante</label>
              <input
                type="text"
                placeholder="Nombre del estudiante..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
            </div>

            {/* Checkbox Reprobados */}
            <div className="students-page__filter-item">
              <label className="students-page__checkbox">
                <input
                  type="checkbox"
                  checked={showOnlyFailed}
                  onChange={(e) => setShowOnlyFailed(e.target.checked)}
                />
                ❌ Solo Reprobados
              </label>
            </div>
          </div>

          {/* Botones de Acción */}
          <div className="students-page__actions">
            <button
              className="students-page__btn students-page__btn--primary"
              onClick={() => setShowEnrollModal(true)}
              title="Inscribir nuevo estudiante"
            >
              ➕ Inscribir
            </button>

            <button
              className="students-page__btn students-page__btn--secondary"
              onClick={handleShowStatistics}
              title="Ver estadísticas y gráficos"
            >
              📊 Estadísticas
            </button>

            <button
              className="students-page__btn students-page__btn--export"
              onClick={handleExportPDF}
              title="Descargar PDF"
            >
              📄 PDF
            </button>

            <button
              className="students-page__btn students-page__btn--refresh"
              onClick={loadStudents}
              disabled={loading}
              title="Recargar datos"
            >
              🔄 Recargar
            </button>
          </div>
        </div>

        {/* Información de Filtros */}
        <div className="students-page__filter-info">
          <p>
            Mostrando <strong>{filteredStudents.length}</strong> de{' '}
            <strong>{allStudents.length}</strong> estudiantes
            {selectedLevel !== 'ALL' && ` · Nivel: ${getLevelLabel(selectedLevel)}`}
            {showOnlyFailed && ' · Solo Reprobados'}
          </p>
        </div>

        {/* Mensaje de Error */}
        {error && (
          <div className="students-page__error">
            ❌ {error}
          </div>
        )}

        {/* Estado de Carga */}
        {loading ? (
          <div className="students-page__loading">
            ⏳ Cargando estudiantes...
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="students-page__empty">
            <p>👤 No hay estudiantes que coincidan con los filtros</p>
            {availableLevels.length === 0 && (
              <p className="students-page__empty-hint">
                💡 Carga los datos para ver estudiantes disponibles
              </p>
            )}
          </div>
        ) : (
          /* Tabla de Estudiantes */
          <div className="students-page__table-container">
            <table className="students-page__table">
              <thead>
                <tr>
                  <th className="students-page__col-name">Estudiante</th>
                  <th className="students-page__col-level">Nivel</th>
                  <th className="students-page__col-cohort">Cohorte</th>
                  <th className="students-page__col-status">Estado</th>
                  <th className="students-page__col-attendance">Asistencia</th>
                  <th className="students-page__col-result">Resultado</th>
                  <th className="students-page__col-date">Fecha</th>
                  <th className="students-page__col-actions">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map(student => (
                  <tr
                    key={student.id}
                    className={
                      student.passed === false
                        ? 'failed'
                        : student.passed === true
                        ? 'passed'
                        : 'active'
                    }
                  >
                    {/* Nombre */}
                    <td className="students-page__col-name">
                      <div className="students-page__student-info">
                        <span className="students-page__avatar">👤</span>
                        <span className="students-page__student-name">{student.studentName}</span>
                      </div>
                    </td>

                    {/* Nivel */}
                    <td className="students-page__col-level">
                      <span className="students-page__badge">
                        {getLevelLabel(student.levelEnrollment) || 'Sin nivel'}
                      </span>
                    </td>

                    {/* Cohorte */}
                    <td className="students-page__col-cohort">
                      {student.cohortName}
                    </td>

                    {/* Estado */}
                    <td className="students-page__col-status">
                      <span className={`students-page__status-badge students-page__status-badge--${student.status?.toLowerCase()}`}>
                        {getStatusLabel(student.status)}
                      </span>
                    </td>

                    {/* Asistencia */}
                    <td className="students-page__col-attendance">
                      <div className="students-page__attendance-bar">
                        <div
                          className="students-page__attendance-fill"
                          style={{ width: `${student.attendancePercentage || 0}%` }}
                        ></div>
                      </div>
                      <span className="students-page__attendance-text">
                        {(student.attendancePercentage || 0).toFixed(1)}%
                      </span>
                    </td>

                    {/* Resultado */}
                    <td className="students-page__col-result">
                      {student.passed === true && (
                        <span className="students-page__badge--passed">✅ Aprobado</span>
                      )}
                      {student.passed === false && (
                        <span className="students-page__badge--failed">❌ Reprobado</span>
                      )}
                      {student.passed === null && (
                        <span className="students-page__badge--pending">⏳ Pendiente</span>
                      )}
                    </td>

                    {/* Fecha */}
                    <td className="students-page__col-date">
                      {student.enrollmentDate
                        ? new Date(student.enrollmentDate).toLocaleDateString('es-CO')
                        : '-'}
                    </td>

                    {/* Acciones */}
                    <td className="students-page__col-actions">
                      <button
                        className="students-page__btn-cancel"
                        onClick={() => handleCancelEnrollment(student.id)}
                        title="Cancelar inscripción"
                      >
                        🚫
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modales */}
      <ModalEnrollStudent
        isOpen={showEnrollModal}
        onClose={() => setShowEnrollModal(false)}
        onEnrollmentSuccess={() => {
          setShowEnrollModal(false);
          loadStudents();
        }}
      />

      <ModalStatistics
        isOpen={showStatisticsModal}
        onClose={() => setShowStatisticsModal(false)}
        data={statisticsData}
        onExportPDF={() => {
          const stats = calculateStatistics();
          generatePDF({ statistics: stats, title: 'Estadísticas de Estudiantes' }, 'statistics-report');
        }}
      />
    </div>
  );
};

// Helper para obtener etiqueta de estado
const getStatusLabel = (status) => {
  const statusMap = {
    ACTIVE: 'Activo',
    COMPLETED: 'Completado',
    FAILED: 'Reprobado',
    CANCELLED: 'Cancelado',
    PENDING: 'Pendiente',
    SUSPENDED: 'Suspendido',
  };

  return statusMap[status] || status;
};

export default StudentsPage;