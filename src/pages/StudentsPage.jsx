// ============================================
// StudentsPage.jsx - SEGURIDAD MEJORADA
// ============================================

import React, { useState, useEffect, useCallback } from 'react';
import apiService from '../apiService';
import ModalEnrollStudent from '../components/Modalenrollstudent';
import ModalStatistics from '../components/ModalStatistics';
import { generatePDF } from '../services/Pdfgenerator';
import { logSecurityEvent, logUserAction } from '../utils/securityLogger';
import '../css/Studentspage.css';

// 🔐 Debug condicional
const DEBUG = process.env.REACT_APP_DEBUG === "true";

const log = (message, data) => {
  if (DEBUG) {
    console.log(`[StudentsPage] ${message}`, data || '');
  }
};

const logError = (message, error) => {
  console.error(`[StudentsPage] ${message}`, error);
};

// ✅ Sanitización de HTML
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

// ✅ Validación de búsqueda
const validateSearchText = (text) => {
  if (!text || typeof text !== 'string') return '';
  if (text.length > 100) return text.substring(0, 100);
  return text.trim();
};

// ✅ Extraer nivel de la matrícula
const extractLevel = (enrollment) => {
  try {
    if (enrollment.level) return enrollment.level;

    if (enrollment.cohortName && typeof enrollment.cohortName === 'string') {
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
  } catch (error) {
    logError('Error extrayendo nivel:', error);
    return null;
  }
};

// ========== CONSTANTES FUERA DEL COMPONENTE ==========
const ALL_LEVEL_ENROLLMENTS = [
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

const STATUS_MAP = {
  ACTIVE: 'Activo',
  COMPLETED: 'Completado',
  FAILED: 'Reprobado',
  CANCELLED: 'Cancelado',
  PENDING: 'Pendiente',
  SUSPENDED: 'Suspendido',
};

const RESULT_FILTER_MAP = {
  'ALL': '',
  'PASSED': 'Aprobados',
  'FAILED': 'Reprobados',
  'PENDING': 'Pendientes',
  'CANCELLED': 'Cancelados',
};

const StudentsPage = () => {
  const [allStudents, setAllStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [selectedYear, setSelectedYear] = useState('ALL');
  const [selectedLevel, setSelectedLevel] = useState('ALL');
  const [selectedResultFilter, setSelectedResultFilter] = useState('ALL');
  const [searchText, setSearchText] = useState('');

  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [showStatisticsModal, setShowStatisticsModal] = useState(false);

  const [statisticsData, setStatisticsData] = useState(null);
  const [hasFiltersApplied, setHasFiltersApplied] = useState(false);
  const [activeFiltersInfo, setActiveFiltersInfo] = useState({});
  const [isDarkMode, setIsDarkMode] = useState(false);

  // ========== DARK MODE DETECTION ==========
  useEffect(() => {
    try {
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
    } catch (error) {
      logError('Error detectando dark mode:', error);
    }
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

  // ========== LOAD STUDENTS ==========
  const loadStudents = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      log('Cargando estudiantes');

      const enrollments = await apiService.getStudentEnrollments();
      log('Enrollments cargados', { count: enrollments?.length || 0 });

      if (!enrollments || enrollments.length === 0) {
        log('No hay estudiantes disponibles');
        setAllStudents([]);
        return;
      }

      const processedStudents = enrollments.map(enrollment => {
        const levelValue = enrollment.level || extractLevel(enrollment);

        return {
          id: enrollment.id,
          memberId: enrollment.memberId,
          studentName: escapeHtml(enrollment.memberName || 'Sin nombre'),
          level: escapeHtml(enrollment.cohortName || 'Sin cohorte'),
          levelEnrollment: levelValue,
          cohortName: escapeHtml(enrollment.cohortName || ''),
          status: enrollment.status,
          enrollmentDate: enrollment.enrollmentDate,
          completionDate: enrollment.completionDate,
          finalAttendancePercentage: parseFloat(enrollment.finalAttendancePercentage) || 0,
          passed: enrollment.passed,
          attendancePercentage: parseFloat(enrollment.finalAttendancePercentage) || 0,
        };
      });

      log('Estudiantes procesados', { count: processedStudents.length });
      setAllStudents(processedStudents);

      logUserAction('load_students', {
        studentCount: processedStudents.length,
        timestamp: new Date().toISOString()
      });

    } catch (err) {
      logError('Error cargando estudiantes:', err);
      setError('Error al cargar la lista de estudiantes');

      logSecurityEvent('student_load_error', {
        errorType: 'api_error',
        timestamp: new Date().toISOString()
      });
    } finally {
      setLoading(false);
    }
  }, []);

  // ========== GET AVAILABLE YEARS ==========
  const getAvailableYears = useCallback(() => {
    try {
      const yearsSet = new Set();

      allStudents.forEach(student => {
        if (student.enrollmentDate) {
          try {
            const year = new Date(student.enrollmentDate).getFullYear();
            if (!isNaN(year) && year > 1900 && year < 2100) {
              yearsSet.add(year.toString());
            }
          } catch (e) {
            // Ignorar fechas inválidas
          }
        }
      });

      return Array.from(yearsSet).sort((a, b) => b - a);
    } catch (error) {
      logError('Error obteniendo años:', error);
      return [];
    }
  }, [allStudents]);

  // ========== GET AVAILABLE LEVELS ==========
  const getAvailableLevels = useCallback(() => {
    try {
      let studentsToCheck = allStudents;

      if (selectedYear !== 'ALL') {
        studentsToCheck = studentsToCheck.filter(student => {
          if (student.enrollmentDate) {
            try {
              const year = new Date(student.enrollmentDate).getFullYear();
              return year.toString() === selectedYear;
            } catch (e) {
              return false;
            }
          }
          return false;
        });
      }

      const levelsSet = new Set();
      studentsToCheck.forEach(student => {
        if (student.levelEnrollment) {
          levelsSet.add(student.levelEnrollment);
        }
      });

      return ALL_LEVEL_ENROLLMENTS.filter(level => levelsSet.has(level.value));
    } catch (error) {
      logError('Error obteniendo niveles:', error);
      return [];
    }
  }, [allStudents, selectedYear]);

  // ========== APPLY FILTERS ==========
  const applyFilters = useCallback(() => {
    try {
      let filtered = [...allStudents];

      // Ordenar por fecha (más recientes primero)
      filtered.sort((a, b) => {
        try {
          const dateA = new Date(a.enrollmentDate || 0).getTime();
          const dateB = new Date(b.enrollmentDate || 0).getTime();
          return dateB - dateA;
        } catch (e) {
          return 0;
        }
      });

      // Filtrar por AÑO
      if (selectedYear !== 'ALL') {
        filtered = filtered.filter(student => {
          if (student.enrollmentDate) {
            try {
              const year = new Date(student.enrollmentDate).getFullYear();
              return year.toString() === selectedYear;
            } catch (e) {
              return false;
            }
          }
          return false;
        });
      }

      // Filtrar por NIVEL
      if (selectedLevel !== 'ALL') {
        filtered = filtered.filter(student => student.levelEnrollment === selectedLevel);
      }

      // Filtrar por resultado
      if (selectedResultFilter !== 'ALL') {
        if (selectedResultFilter === 'PASSED') {
          filtered = filtered.filter(student => student.passed === true);
        } else if (selectedResultFilter === 'FAILED') {
          filtered = filtered.filter(student => student.passed === false);
        } else if (selectedResultFilter === 'PENDING') {
          filtered = filtered.filter(student => student.passed === null && student.status !== 'CANCELLED');
        } else if (selectedResultFilter === 'CANCELLED') {
          filtered = filtered.filter(student => student.status === 'CANCELLED');
        }
      }

      // Filtrar por búsqueda
      if (searchText.trim()) {
        const search = searchText.toLowerCase();
        filtered = filtered.filter(student =>
          student.studentName.toLowerCase().includes(search)
        );
      }

      log('Filtros aplicados', { count: filtered.length });
      setFilteredStudents(filtered);
    } catch (error) {
      logError('Error aplicando filtros:', error);
      setFilteredStudents(allStudents);
    }
  }, [allStudents, selectedYear, selectedLevel, selectedResultFilter, searchText]);

  // ========== INIT LOAD ==========
  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  // ========== APPLY FILTERS ON CHANGE ==========
  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  // ========== DETECT ACTIVE FILTERS ==========
  useEffect(() => {
    try {
      const filtersActive = selectedYear !== 'ALL' || selectedLevel !== 'ALL' || selectedResultFilter !== 'ALL' || searchText.trim() !== '';

      setHasFiltersApplied(filtersActive);

      if (filtersActive) {
        const info = {};
        if (selectedYear !== 'ALL') info.year = selectedYear;
        if (selectedLevel !== 'ALL') info.level = getLevelLabel(selectedLevel);
        if (selectedResultFilter !== 'ALL') info.result = RESULT_FILTER_MAP[selectedResultFilter];
        if (searchText.trim()) info.search = validateSearchText(searchText);

        setActiveFiltersInfo(info);
        log('Filtros activos detectados');
      } else {
        setActiveFiltersInfo({});
      }
    } catch (error) {
      logError('Error detectando filtros activos:', error);
    }
  }, [selectedYear, selectedLevel, selectedResultFilter, searchText]);

  // ========== CANCEL ENROLLMENT ==========
  const handleCancelEnrollment = useCallback(async (studentId) => {
    try {
      if (!studentId || typeof studentId !== 'number') {
        setError('ID de estudiante inválido');
        return;
      }

      if (!window.confirm('¿Estás seguro de que deseas cancelar esta inscripción?')) {
        return;
      }

      log('Cancelando inscripción', { studentId });

      await apiService.withdrawStudentFromCohort(studentId);

      log('Inscripción cancelada exitosamente');

      logUserAction('cancel_enrollment', {
        timestamp: new Date().toISOString()
      });

      alert('Inscripción cancelada exitosamente');
      loadStudents();
    } catch (err) {
      logError('Error cancelando inscripción:', err);
      setError('Error al cancelar la inscripción');

      logSecurityEvent('enrollment_cancel_error', {
        errorType: 'api_error',
        timestamp: new Date().toISOString()
      });
    }
  }, [loadStudents]);

  // ========== CALCULATE STATISTICS ==========
  const calculateStatistics = useCallback((studentsArray) => {
    try {
      const stats = {};

      ALL_LEVEL_ENROLLMENTS.forEach(levelObj => {
        const levelStudents = studentsArray.filter(s => s.levelEnrollment === levelObj.value);
        const passed = levelStudents.filter(s => s.passed === true).length;
        const failed = levelStudents.filter(s => s.passed === false).length;
        const pending = levelStudents.filter(s => s.passed === null).length;
        const cancelled = levelStudents.filter(s => s.status === 'CANCELLED').length;
        const total = levelStudents.length;

        stats[levelObj.value] = {
          label: levelObj.label,
          total,
          passed,
          failed,
          pending,
          cancelled,
          passPercentage: total > 0 ? ((passed / total) * 100).toFixed(1) : 0,
        };
      });

      return stats;
    } catch (error) {
      logError('Error calculando estadísticas:', error);
      return {};
    }
  }, []);

  // ========== SHOW STATISTICS ==========
  const handleShowStatistics = useCallback(() => {
    try {
      log('Mostrando estadísticas');

      const dataForStats = hasFiltersApplied ? filteredStudents : allStudents;
      const stats = calculateStatistics(dataForStats);

      setStatisticsData({
        statistics: stats,
        hasFilters: hasFiltersApplied,
        filtersInfo: activeFiltersInfo,
        dataCount: dataForStats.length,
      });
      setShowStatisticsModal(true);

      logUserAction('view_statistics', {
        hasFilters: hasFiltersApplied,
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      logError('Error mostrando estadísticas:', err);
      setError('Error al generar estadísticas');
    }
  }, [hasFiltersApplied, filteredStudents, allStudents, calculateStatistics, activeFiltersInfo]);

  // ========== EXPORT PDF ==========
  const handleExportPDF = useCallback(() => {
    try {
      log('Generando PDF con filtros');

      const dataForPDF = hasFiltersApplied ? filteredStudents : allStudents;
      const statsForPDF = calculateStatistics(dataForPDF);

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
        year: selectedYear === 'ALL' ? 'Todos los Años' : selectedYear,
        date: new Date().toLocaleDateString('es-CO'),
        students: dataForPDF,
        statistics: statsForPDF,
        hasFilters: hasFiltersApplied,
        filtersInfo: activeFiltersInfo,
        filterYear: selectedYear === 'ALL' ? null : selectedYear,
        filterLevel: selectedLevel === 'ALL' ? null : selectedLevel,
      };

      generatePDF(data, 'students-report');

      log('PDF generado exitosamente');

      logUserAction('export_pdf', {
        hasFilters: hasFiltersApplied,
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      logError('Error generando PDF:', err);
      setError('Error al generar PDF');
    }
  }, [hasFiltersApplied, filteredStudents, allStudents, selectedResultFilter, selectedLevel, selectedYear, calculateStatistics, activeFiltersInfo]);

  // ========== HELPER FUNCTIONS ==========
  const getLevelLabel = (levelValue) => {
    if (!levelValue || typeof levelValue !== 'string') return levelValue;
    const level = ALL_LEVEL_ENROLLMENTS.find(l => l.value === levelValue);
    return level ? level.label : levelValue;
  };

  const getStatusLabel = (status) => {
    if (!status || typeof status !== 'string') return status;
    return STATUS_MAP[status] || status;
  };

  const availableYears = getAvailableYears();
  const availableLevels = getAvailableLevels();

  return (
    <div className="students-page" style={{ backgroundColor: theme.bg, color: theme.text, transition: 'all 0.3s ease' }}>
      <div className="students-page-container">
        <div className="students-page__header">
          <h1>👥 Gestión de Estudiantes</h1>
          <p>Visualiza y gestiona estudiantes por niveles de formación y años</p>
        </div>

        <div className="students-page__controls">
          <div className="students-page__controls-grid">

            <div className="students-page__filter-item">
              <label>🔍 Buscar Estudiante</label>
              <input
                type="text"
                placeholder="Nombre del estudiante..."
                value={searchText}
                onChange={(e) => setSearchText(validateSearchText(e.target.value))}
                maxLength="100"
                style={{
                  backgroundColor: theme.bgSecondary,
                  color: theme.text,
                  borderColor: theme.border,
                  transition: 'all 0.3s ease',
                }}
              />
            </div>

            <div className="students-page__filter-item">
              <label>📅 Filtrar por Año</label>
              <select
                value={selectedYear}
                onChange={(e) => {
                  setSelectedYear(e.target.value);
                  setSelectedLevel('ALL');
                }}
                style={{
                  backgroundColor: theme.bgSecondary,
                  color: theme.text,
                  borderColor: theme.border,
                  transition: 'all 0.3s ease',
                }}
              >
                <option value="ALL">Todos los Años ({allStudents.length})</option>
                {availableYears.map(year => {
                  const count = allStudents.filter(s => {
                    if (s.enrollmentDate) {
                      try {
                        return new Date(s.enrollmentDate).getFullYear().toString() === year;
                      } catch (e) {
                        return false;
                      }
                    }
                    return false;
                  }).length;
                  return (
                    <option key={year} value={year}>
                      {year} ({count})
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="students-page__filter-item">
              <label>📌 Filtrar por Nivel</label>
              <select
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(e.target.value)}
                style={{
                  backgroundColor: theme.bgSecondary,
                  color: theme.text,
                  borderColor: theme.border,
                  transition: 'all 0.3s ease',
                }}
              >
                <option value="ALL">Todos los Niveles ({
                  selectedYear === 'ALL'
                    ? allStudents.length
                    : allStudents.filter(s => {
                      if (s.enrollmentDate) {
                        try {
                          return new Date(s.enrollmentDate).getFullYear().toString() === selectedYear;
                        } catch (e) {
                          return false;
                        }
                      }
                      return false;
                    }).length
                })</option>
                {availableLevels.map(level => {
                  let count = 0;

                  if (selectedYear === 'ALL') {
                    count = allStudents.filter(s => s.levelEnrollment === level.value).length;
                  } else {
                    count = allStudents.filter(s => {
                      if (s.enrollmentDate && s.levelEnrollment === level.value) {
                        try {
                          return new Date(s.enrollmentDate).getFullYear().toString() === selectedYear;
                        } catch (e) {
                          return false;
                        }
                      }
                      return false;
                    }).length;
                  }

                  return (
                    <option key={level.value} value={level.value}>
                      {level.label} ({count})
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="students-page__filter-item">
              <label>📊 Filtrar por Resultado</label>
              <select
                value={selectedResultFilter}
                onChange={(e) => setSelectedResultFilter(e.target.value)}
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
              📊 Estadísticas {hasFiltersApplied && '🔍'}
            </button>

            <button
              className="students-page__btn students-page__btn--export"
              onClick={handleExportPDF}
              title="Descargar PDF"
            >
              📄 PDF {hasFiltersApplied && '🔍'}
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
            {hasFiltersApplied && ' (🔍 Con filtros aplicados)'}
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
        isDarkMode={isDarkMode}
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

export default StudentsPage;