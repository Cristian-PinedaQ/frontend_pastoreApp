// 📚 StudentsPage.jsx - CON DARK MODE COMPLETO
// ✅ Cambio: Agregado filtro para "Cancelados" en el select de resultado
// ✅ Cambio: Agregada lógica para filtrar por passed === null Y status === 'CANCELLED' separadamente
// ✅ DARK MODE: Detección automática + tema dinámico

import React, { useState, useEffect } from 'react';
import apiService from '../apiService';
import ModalEnrollStudent from '../components/Modalenrollstudent';
import ModalStatistics from '../components/ModalStatistics';
import { generatePDF } from '../services/Pdfgenerator';
import { logSecurityEvent, logUserAction } from '../utils/securityLogger';
import '../css/Studentspage.css';

const devLog = (message, data = null) => {
  if (process.env.NODE_ENV === 'development') {
    if (data) {
      console.log(message, data);
    } else {
      console.log(message);
    }
  }
};

const devWarn = (message, data = null) => {
  if (process.env.NODE_ENV === 'development') {
    if (data) {
      console.warn(message, data);
    } else {
      console.warn(message);
    }
  }
};

const StudentsPage = () => {
  const [allStudents, setAllStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [selectedLevel, setSelectedLevel] = useState('ALL');
  const [selectedResultFilter, setSelectedResultFilter] = useState('ALL'); // ✅ Filtro de resultado
  const [searchText, setSearchText] = useState('');

  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [showStatisticsModal, setShowStatisticsModal] = useState(false);

  const [statisticsData, setStatisticsData] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // ========== DARK MODE DETECTION ==========
  useEffect(() => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const savedMode = localStorage.getItem('darkMode');
    const htmlHasDarkClass = document.documentElement.classList.contains('dark-mode') || 
                             document.documentElement.classList.contains('dark');

    setIsDarkMode(
      savedMode === 'true' || htmlHasDarkClass || prefersDark
    );

    const observer = new MutationObserver(() => {
      setIsDarkMode(
        document.documentElement.classList.contains('dark-mode') ||
        document.documentElement.classList.contains('dark')
      );
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => {
      if (localStorage.getItem('darkMode') === null) {
        setIsDarkMode(e.matches);
      }
    };
    mediaQuery.addEventListener('change', handleChange);

    return () => {
      observer.disconnect();
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  // ========== THEME COLORS ==========
  const theme = {
    bg: isDarkMode ? '#0f172a' : '#f9fafb',
    bgSecondary: isDarkMode ? '#1e293b' : '#ffffff',
    text: isDarkMode ? '#f3f4f6' : '#1f2937',
    textSecondary: isDarkMode ? '#9ca3af' : '#6b7280',
    border: isDarkMode ? '#334155' : '#e5e7eb',
    errorBg: isDarkMode ? '#7f1d1d' : '#fee2e2',
    errorBorder: '#ef4444',
    errorText: isDarkMode ? '#fecaca' : '#991b1b',
  };

  useEffect(() => {
    loadStudents();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [allStudents, selectedLevel, selectedResultFilter, searchText]);

  const loadStudents = async () => {
    setLoading(true);
    setError('');

    try {
      devLog('📚 Cargando estudiantes...');

      const enrollments = await apiService.getStudentEnrollments();
      devLog('✅ Enrollments cargados - Cantidad:', enrollments?.length || 0);

      if (!enrollments || enrollments.length === 0) {
        devWarn('⚠️ No hay estudiantes disponibles');
        setAllStudents([]);
        return;
      }

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

      devLog('✅ Estudiantes procesados - Cantidad:', processedStudents.length);
      setAllStudents(processedStudents);

      logUserAction('load_students', {
        studentCount: processedStudents.length,
        timestamp: new Date().toISOString()
      });

    } catch (err) {
      devWarn('❌ Error cargando estudiantes:', err.message);
      setError('Error al cargar la lista de estudiantes: ' + err.message);
      
      logSecurityEvent('student_load_error', {
        errorType: 'api_error',
        timestamp: new Date().toISOString()
      });
    } finally {
      setLoading(false);
    }
  };

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

    // ✅ ORDENAR POR FECHA (más recientes primero)
    filtered.sort((a, b) => {
      const dateA = new Date(a.enrollmentDate || 0).getTime();
      const dateB = new Date(b.enrollmentDate || 0).getTime();
      return dateB - dateA; // Descendente: más recientes primero
    });

    if (selectedLevel !== 'ALL') {
      devLog('🔍 Filtrando por nivel');
      filtered = filtered.filter(student => student.levelEnrollment === selectedLevel);
      devLog(`✅ Después de filtro de nivel: ${filtered.length} estudiantes`);
    } else {
      devLog('✅ Mostrando todos los niveles');
    }

    // ✅ Filtrar por resultado (Aprobado, Reprobado, Pendiente, Cancelado)
    if (selectedResultFilter !== 'ALL') {
      devLog(`🔍 Filtrando por resultado: ${selectedResultFilter}`);
      if (selectedResultFilter === 'PASSED') {
        filtered = filtered.filter(student => student.passed === true);
      } else if (selectedResultFilter === 'FAILED') {
        filtered = filtered.filter(student => student.passed === false);
      } else if (selectedResultFilter === 'PENDING') {
        // ✅ CORRECCIÓN: Excluir cancelados - mostrar solo passed === null Y status !== 'CANCELLED'
        filtered = filtered.filter(student => student.passed === null && student.status !== 'CANCELLED');
      } else if (selectedResultFilter === 'CANCELLED') {
        // ✅ NUEVO: Filtrar por status === 'CANCELLED'
        filtered = filtered.filter(student => student.status === 'CANCELLED');
      }
      devLog(`✅ Después de filtro de resultado: ${filtered.length} estudiantes`);
    }

    if (searchText.trim()) {
      const search = searchText.toLowerCase();
      filtered = filtered.filter(student =>
        student.studentName.toLowerCase().includes(search)
      );
    }

    devLog('📊 Resultado final de filtros:', `${filtered.length} estudiantes`);
    setFilteredStudents(filtered);
  };

  const handleCancelEnrollment = async (studentId) => {
    if (!window.confirm('¿Estás seguro de que deseas cancelar esta inscripción?')) {
      return;
    }

    try {
      devLog('🚫 Cancelando inscripción');
      
      await apiService.withdrawStudentFromCohort(studentId);
      
      devLog('✅ Inscripción cancelada');
      
      logUserAction('cancel_enrollment', {
        timestamp: new Date().toISOString()
      });
      
      alert('Inscripción cancelada exitosamente');
      loadStudents();
    } catch (err) {
      devWarn('❌ Error cancelando inscripción:', err.message);
      alert('Error al cancelar la inscripción: ' + err.message);
      
      logSecurityEvent('enrollment_cancel_error', {
        errorType: 'api_error',
        timestamp: new Date().toISOString()
      });
    }
  };

  const handleShowStatistics = async () => {
    try {
      devLog('📊 Generando estadísticas');
      const stats = calculateStatistics();
      setStatisticsData(stats);
      setShowStatisticsModal(true);
      
      logUserAction('view_statistics', {
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      devWarn('❌ Error generando estadísticas:', err.message);
      alert('Error al generar estadísticas: ' + err.message);
    }
  };

  // ✅ Estadísticas separan Pendiente, Reprobado y Cancelado
  const calculateStatistics = () => {
    const stats = {};

    ALL_LEVELS.forEach(level => {
      const levelStudents = allStudents.filter(s => s.levelEnrollment === level);
      const passed = levelStudents.filter(s => s.passed === true).length;
      const failed = levelStudents.filter(s => s.passed === false).length;
      const pending = levelStudents.filter(s => s.passed === null).length;
      const cancelled = levelStudents.filter(s => s.status === 'CANCELLED').length;
      const total = levelStudents.length;

      stats[level] = {
        label: getLevelLabel(level),
        total,
        passed,
        failed,
        pending,
        cancelled, // ✅ NUEVO: Campo para Cancelados
        passPercentage: total > 0 ? ((passed / total) * 100).toFixed(1) : 0,
      };
    });

    return stats;
  };

  const handleExportPDF = async () => {
    try {
      devLog('📄 Generando PDF');

      // ✅ Generar título dinámico basado en filtro de resultado
      let title = 'Listado de Estudiantes';
      if (selectedResultFilter === 'PASSED') {
        title = 'Estudiantes Aprobados';
      } else if (selectedResultFilter === 'FAILED') {
        title = 'Estudiantes Reprobados';
      } else if (selectedResultFilter === 'PENDING') {
        title = 'Estudiantes Pendientes';
      } else if (selectedResultFilter === 'CANCELLED') {
        title = 'Estudiantes Cancelados';
      }

      const data = {
        title: title,
        level: selectedLevel === 'ALL' ? 'Todos los Niveles' : getLevelLabel(selectedLevel),
        date: new Date().toLocaleDateString('es-CO'),
        students: filteredStudents,
        statistics: calculateStatistics(),
      };

      generatePDF(data, 'students-report');
      
      devLog('✅ PDF generado');
      
      logUserAction('export_pdf', {
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      devWarn('❌ Error generando PDF:', err.message);
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

  // ✅ Todos los 11 niveles posibles
  const ALL_LEVELS = [
    'PREENCUENTRO',
    'ENCUENTRO',
    'POST_ENCUENTRO',
    'BAUTIZOS',
    'EDIRD_1',
    'EDIRD_2',
    'EDIRD_3',
    'EDIRD_4',
    'ADIESTRAMIENTO',
    'SANIDAD_INTEGRAL_RAICES',
    'GRADUACION',
  ];

  // ========== OBTENER ETIQUETA DE FILTRO DE RESULTADO ==========
  const getResultFilterLabel = (filterValue) => {
    const filterMap = {
      'ALL': '',
      'PASSED': ' · Mostrando: Aprobados',
      'FAILED': ' · Mostrando: Reprobados',
      'PENDING': ' · Mostrando: Pendientes',
      'CANCELLED': ' · Mostrando: Cancelados', // ✅ NUEVO
    };
    return filterMap[filterValue] || '';
  };

  return (
    <div className="students-page" style={{ backgroundColor: theme.bg, color: theme.text, transition: 'all 0.3s ease' }}>
      <div className="students-page-container">
        <div className="students-page__header">
          <h1>👥 Gestión de Estudiantes</h1>
          <p>Visualiza y gestiona estudiantes por niveles de formación</p>
        </div>

        <div className="students-page__controls">
          <div className="students-page__controls-grid">

            <div className="students-page__filter-item">
              <label>🔍 Buscar Estudiante</label>
              <input
                type="text"
                placeholder="Nombre del estudiante..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                style={{
                  backgroundColor: theme.bgSecondary,
                  color: theme.text,
                  borderColor: theme.border,
                  transition: 'all 0.3s ease',
                }}
              />
            </div>

            <div className="students-page__filter-item">
              <label>📌 Filtrar por Nivel</label>
              <select
                value={selectedLevel}
                onChange={(e) => {
                  devLog('🔄 Cambiando filtro de nivel');
                  setSelectedLevel(e.target.value);
                }}
                style={{
                  backgroundColor: theme.bgSecondary,
                  color: theme.text,
                  borderColor: theme.border,
                  transition: 'all 0.3s ease',
                }}
              >
                <option value="ALL">Todos los Niveles ({allStudents.length})</option>
                {ALL_LEVELS.map(level => {
                  const count = allStudents.filter(s => s.levelEnrollment === level).length;
                  return (
                    <option key={level} value={level}>
                      {getLevelLabel(level)} ({count})
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="students-page__filter-item">
              <label>📊 Filtrar por Resultado</label>
              <select
                value={selectedResultFilter}
                onChange={(e) => {
                  devLog('🔄 Cambiando filtro de resultado');
                  setSelectedResultFilter(e.target.value);
                }}
                style={{
                  backgroundColor: theme.bgSecondary,
                  color: theme.text,
                  borderColor: theme.border,
                  transition: 'all 0.3s ease',
                }}
              >
                <option value="ALL">Todos los Estados</option>
                <option value="PASSED">✅ Aprobados</option>
                <option value="FAILED">❌ Reprobados</option>
                <option value="PENDING">⏳ Pendientes</option>
                <option value="CANCELLED">🚫 Cancelados</option>
              </select>
            </div>
          </div>

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

        <div className="students-page__filter-info" style={{ color: theme.text, transition: 'color 0.3s ease' }}>
          <p>
            Mostrando <strong>{filteredStudents.length}</strong> de{' '}
            <strong>{allStudents.length}</strong> estudiantes
            {selectedLevel !== 'ALL' && ` · Nivel: ${getLevelLabel(selectedLevel)}`}
            {getResultFilterLabel(selectedResultFilter)}
          </p>
        </div>

        {error && (
          <div
            className="students-page__error"
            style={{
              backgroundColor: theme.errorBg,
              borderColor: theme.errorBorder,
              color: theme.errorText,
              transition: 'all 0.3s ease',
            }}
          >
            ❌ {error}
          </div>
        )}

        {loading ? (
          <div className="students-page__loading" style={{ color: theme.text }}>
            ⏳ Cargando estudiantes...
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="students-page__empty" style={{ color: theme.textSecondary }}>
            <p>👤 No hay estudiantes que coincidan con los filtros</p>
            {allStudents.length === 0 && (
              <p className="students-page__empty-hint">
                💡 Carga los datos para ver estudiantes disponibles
              </p>
            )}
          </div>
        ) : (
          <div className="students-page__table-container">
            <table className="students-page__table">
              <thead>
                <tr style={{ backgroundColor: theme.bgSecondary, borderColor: theme.border }}>
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
                      student.status === 'CANCELLED'
                        ? 'cancelled'
                        : student.passed === false
                        ? 'failed'
                        : student.passed === true
                        ? 'passed'
                        : 'active'
                    }
                    style={{
                      backgroundColor: isDarkMode ? '#1a2332' : '#fff',
                      borderColor: theme.border,
                      color: theme.text,
                      transition: 'all 0.3s ease',
                    }}
                  >
                    <td className="students-page__col-name">
                      <div className="students-page__student-info">
                        <span className="students-page__avatar">👤</span>
                        <span className="students-page__student-name">{student.studentName}</span>
                      </div>
                    </td>

                    <td className="students-page__col-level">
                      <span className="students-page__badge">
                        {getLevelLabel(student.levelEnrollment) || 'Sin nivel'}
                      </span>
                    </td>

                    <td className="students-page__col-cohort">
                      {student.cohortName}
                    </td>

                    <td className="students-page__col-status">
                      <span className={`students-page__status-badge students-page__status-badge--${student.status?.toLowerCase()}`}>
                        {getStatusLabel(student.status)}
                      </span>
                    </td>

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

                    <td className="students-page__col-result">
                      {student.passed === true && (
                        <span className="students-page__badge--passed">✅ Aprobado</span>
                      )}
                      {student.passed === false && (
                        <span className="students-page__badge--failed">❌ Reprobado</span>
                      )}
                      {student.passed === null && student.status !== 'CANCELLED' && (
                        <span className="students-page__badge--pending">⏳ Pendiente</span>
                      )}
                      {student.status === 'CANCELLED' && (
                        <span className="students-page__badge--cancelled">🚫 Cancelado</span>
                      )}
                    </td>

                    <td className="students-page__col-date">
                      {student.enrollmentDate
                        ? new Date(student.enrollmentDate).toLocaleDateString('es-CO')
                        : '-'}
                    </td>

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

      <style>{`
        .students-page {
          transition: background-color 0.3s ease, color 0.3s ease;
        }

        .students-page__filter-item input,
        .students-page__filter-item select {
          transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease;
        }

        .students-page__table tbody tr {
          transition: all 0.3s ease;
        }
      `}</style>
    </div>
  );
};

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