// ============================================
// StudentsPage.jsx
// ✅ Compatibilidad legacy: EDIRD_1/2/3 → ESENCIA_1/2/3 (solo datos antiguos)
// ✅ Trae todos los estudiantes (limit 1000)
// ============================================

import React, { useState, useEffect, useCallback } from 'react';
import apiService from '../apiService';
import ModalEnrollStudent from '../components/Modalenrollstudent';
import ModalStatistics from '../components/ModalStatistics';
import { generatePDF } from '../services/Pdfgenerator';
import { logSecurityEvent, logUserAction } from '../utils/securityLogger';
import nameHelper from '../services/nameHelper';
import '../css/Studentspage.css';

const { getDisplayName } = nameHelper;

const DEBUG = process.env.REACT_APP_DEBUG === "true";

const log = (message, data) => {
  if (DEBUG) console.log(`[StudentsPage] ${message}`, data || '');
};

const logError = (message, error) => {
  console.error(`[StudentsPage] ${message}`, error);
};

const escapeHtml = (text) => {
  if (!text || typeof text !== 'string') return '';
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return text.replace(/[&<>"']/g, m => map[m]);
};

const validateSearchText = (text) => {
  if (!text || typeof text !== 'string') return '';
  if (text.length > 100) return text.substring(0, 100);
  return text.trim();
};

// ─── Compatibilidad legacy ────────────────────────────────────────────────────
// Convierte nombres EDIRD_X (usados antes) a ESENCIA_X (nombre correcto del enum).
// Los registros nuevos ya vienen con ESENCIA_X directamente.
const LEGACY_MAP = {
  EDIRD_1: 'ESENCIA_1',
  EDIRD_2: 'ESENCIA_2',
  EDIRD_3: 'ESENCIA_3',
  EDIRD_4: 'ESENCIA_4',
};

const applyLegacyMap = (value) => {
  if (!value) return value;
  const upper = value.toUpperCase().trim();
  return LEGACY_MAP[upper] ?? value;
};

// ─── Reglas de detección por cohortName ───────────────────────────────────────
// Orden importa: más específicos primero para evitar falsos positivos.
const COHORT_LEVEL_RULES = [
  { match: ['SANIDAD_INTEGRAL_RAICES', 'SANIDAD'], level: 'SANIDAD_INTEGRAL_RAICES' },
  { match: ['PREENCUENTRO'],                        level: 'PREENCUENTRO'            },
  { match: ['POST_ENCUENTRO'],                      level: 'POST_ENCUENTRO'          },
  { match: ['ENCUENTRO'],                           level: 'ENCUENTRO'               },
  { match: ['BAUTIZOS'],                            level: 'BAUTIZOS'                },
  { match: ['ADIESTRAMIENTO'],                      level: 'ADIESTRAMIENTO'          },
  { match: ['GRADUACION'],                          level: 'GRADUACION'              },
  // ESENCIA nuevos + EDIRD legacy — de mayor a menor para evitar que ESENCIA_1 matchee ESENCIA_10
  { match: ['ESENCIA_4', 'EDIRD_4'],                level: 'ESENCIA_4'               },
  { match: ['ESENCIA_3', 'EDIRD_3'],                level: 'ESENCIA_3'               },
  { match: ['ESENCIA_2', 'EDIRD_2'],                level: 'ESENCIA_2'               },
  { match: ['ESENCIA_1', 'EDIRD_1'],                level: 'ESENCIA_1'               },
];

// ─── Extrae y normaliza el nivel de un enrollment ─────────────────────────────
const extractLevel = (enrollment) => {
  try {
    // 1. Campo `level` directo del API → applyLegacyMap por compatibilidad
    if (enrollment.level) {
      return applyLegacyMap(enrollment.level);
    }

    // 2. Inferir desde cohortName usando las reglas de palabras clave
    if (enrollment.cohortName && typeof enrollment.cohortName === 'string') {
      const upper = enrollment.cohortName.toUpperCase();
      for (const rule of COHORT_LEVEL_RULES) {
        if (rule.match.some((kw) => upper.includes(kw))) {
          return rule.level;
        }
      }
    }

    return null;
  } catch (err) {
    logError('Error extrayendo nivel:', err);
    return null;
  }
};

// ========== CONSTANTES ==========
const ALL_LEVEL_ENROLLMENTS = [
  { value: 'PREENCUENTRO',            label: 'Pre-encuentro'           },
  { value: 'ENCUENTRO',               label: 'Encuentro'               },
  { value: 'POST_ENCUENTRO',          label: 'Post-encuentro'          },
  { value: 'BAUTIZOS',                label: 'Bautizos'                },
  { value: 'ESENCIA_1',               label: 'ESENCIA 1'               },
  { value: 'ESENCIA_2',               label: 'ESENCIA 2'               },
  { value: 'ESENCIA_3',               label: 'ESENCIA 3'               },
  { value: 'SANIDAD_INTEGRAL_RAICES', label: 'Sanidad Integral Raíces' },
  { value: 'ESENCIA_4',               label: 'ESENCIA 4'               },
  { value: 'ADIESTRAMIENTO',          label: 'Adiestramiento'          },
  { value: 'GRADUACION',              label: 'Graduación'              },
];

const STATUS_MAP = {
  ACTIVE:    'Activo',
  COMPLETED: 'Completado',
  FAILED:    'Reprobado',
  CANCELLED: 'Cancelado',
  PENDING:   'Pendiente',
  SUSPENDED: 'Suspendido',
};

const RESULT_FILTER_MAP = {
  ALL:       '',
  PASSED:    'Aprobados',
  FAILED:    'Reprobados',
  PENDING:   'Pendientes',
  CANCELLED: 'Cancelados',
};

// ========== COMPONENTE ==========
const StudentsPage = () => {
  const [allStudents,         setAllStudents]         = useState([]);
  const [filteredStudents,    setFilteredStudents]    = useState([]);
  const [loading,             setLoading]             = useState(false);
  const [error,               setError]               = useState('');

  const [selectedYear,          setSelectedYear]          = useState('ALL');
  const [selectedLevel,         setSelectedLevel]         = useState('ALL');
  const [selectedResultFilter,  setSelectedResultFilter]  = useState('ALL');
  const [searchText,            setSearchText]            = useState('');

  const [showEnrollModal,     setShowEnrollModal]     = useState(false);
  const [showStatisticsModal, setShowStatisticsModal] = useState(false);

  const [statisticsData,    setStatisticsData]    = useState(null);
  const [hasFiltersApplied, setHasFiltersApplied] = useState(false);
  const [activeFiltersInfo, setActiveFiltersInfo] = useState({});
  const [isDarkMode,        setIsDarkMode]        = useState(false);

  // ─── Dark mode ──────────────────────────────────────────────────────────────
  useEffect(() => {
    try {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const savedMode   = localStorage.getItem('darkMode');
      const htmlHasDark = document.documentElement.classList.contains('dark-mode') ||
                          document.documentElement.classList.contains('dark');
      setIsDarkMode(savedMode === 'true' || htmlHasDark || prefersDark);

      const observer = new MutationObserver(() => {
        setIsDarkMode(
          document.documentElement.classList.contains('dark-mode') ||
          document.documentElement.classList.contains('dark')
        );
      });
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      const onChange = (e) => { if (!localStorage.getItem('darkMode')) setIsDarkMode(e.matches); };
      mq.addEventListener('change', onChange);

      return () => { observer.disconnect(); mq.removeEventListener('change', onChange); };
    } catch (e) {
      logError('Error detectando dark mode:', e);
    }
  }, []);

  // ─── Theme ──────────────────────────────────────────────────────────────────
  const theme = {
    bg:            isDarkMode ? '#0f172a' : '#f9fafb',
    bgSecondary:   isDarkMode ? '#1e293b' : '#ffffff',
    text:          isDarkMode ? '#f3f4f6' : '#1f2937',
    textSecondary: isDarkMode ? '#9ca3af' : '#6b7280',
    border:        isDarkMode ? '#334155' : '#e5e7eb',
    errorBg:       isDarkMode ? '#7f1d1d' : '#fee2e2',
    errorBorder:   '#ef4444',
    errorText:     isDarkMode ? '#fecaca' : '#991b1b',
  };

  // ─── Cargar estudiantes ──────────────────────────────────────────────────────
  const loadStudents = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      log('Cargando estudiantes');
      const enrollments = await apiService.getStudentEnrollments(0, 1000);
      log('Enrollments cargados', { count: enrollments?.length || 0 });

      if (!enrollments || enrollments.length === 0) {
        setAllStudents([]);
        return;
      }

      const processedStudents = enrollments.map((enrollment) => {
        const levelValue = extractLevel(enrollment);

        log('Procesando estudiante', {
          name:           enrollment.memberName,
          levelRaw:       enrollment.level,
          cohortName:     enrollment.cohortName,
          levelExtracted: levelValue,
        });

        return {
          id:                        enrollment.id,
          memberId:                  enrollment.memberId,
          studentName:               getDisplayName(escapeHtml(enrollment.memberName || 'Sin nombre')),
          level:                     escapeHtml(enrollment.cohortName || 'Sin cohorte'),
          levelEnrollment:           levelValue,
          cohortName:                escapeHtml(enrollment.cohortName || ''),
          status:                    enrollment.status,
          enrollmentDate:            enrollment.enrollmentDate,
          completionDate:            enrollment.completionDate,
          finalAttendancePercentage: parseFloat(enrollment.finalAttendancePercentage) || 0,
          passed:                    enrollment.passed,
          attendancePercentage:      parseFloat(enrollment.finalAttendancePercentage) || 0,
        };
      });

      log('Estudiantes procesados', { count: processedStudents.length });

      if (DEBUG) {
        const levelsFound = [...new Set(processedStudents.map((s) => s.levelEnrollment))];
        log('Niveles encontrados en los datos:', levelsFound);
      }

      setAllStudents(processedStudents);
      logUserAction('load_students', { studentCount: processedStudents.length, timestamp: new Date().toISOString() });
    } catch (err) {
      logError('Error cargando estudiantes:', err);
      setError('Error al cargar la lista de estudiantes');
      logSecurityEvent('student_load_error', { errorType: 'api_error', timestamp: new Date().toISOString() });
    } finally {
      setLoading(false);
    }
  }, []);

  // ─── Años disponibles ────────────────────────────────────────────────────────
  const getAvailableYears = useCallback(() => {
    try {
      const yearsSet = new Set();
      allStudents.forEach((s) => {
        if (s.enrollmentDate) {
          try {
            const y = new Date(s.enrollmentDate).getFullYear();
            if (!isNaN(y) && y > 1900 && y < 2100) yearsSet.add(y.toString());
          } catch (_) {}
        }
      });
      return Array.from(yearsSet).sort((a, b) => b - a);
    } catch (e) {
      logError('Error obteniendo años:', e);
      return [];
    }
  }, [allStudents]);

  // ─── Niveles disponibles ─────────────────────────────────────────────────────
  const getAvailableLevels = useCallback(() => {
    try {
      const base = selectedYear === 'ALL'
        ? allStudents
        : allStudents.filter((s) => {
            try { return new Date(s.enrollmentDate).getFullYear().toString() === selectedYear; }
            catch (_) { return false; }
          });
      const found = new Set(base.map((s) => s.levelEnrollment).filter(Boolean));
      return ALL_LEVEL_ENROLLMENTS.filter((l) => found.has(l.value));
    } catch (e) {
      logError('Error obteniendo niveles:', e);
      return [];
    }
  }, [allStudents, selectedYear]);

  // ─── Aplicar filtros ─────────────────────────────────────────────────────────
  const applyFilters = useCallback(() => {
    try {
      let filtered = [...allStudents].sort((a, b) => {
        try { return new Date(b.enrollmentDate || 0) - new Date(a.enrollmentDate || 0); }
        catch (_) { return 0; }
      });

      if (selectedYear !== 'ALL') {
        filtered = filtered.filter((s) => {
          try { return new Date(s.enrollmentDate).getFullYear().toString() === selectedYear; }
          catch (_) { return false; }
        });
      }

      if (selectedLevel !== 'ALL') {
        filtered = filtered.filter((s) => s.levelEnrollment === selectedLevel);
      }

      if      (selectedResultFilter === 'PASSED')    filtered = filtered.filter((s) => s.passed === true);
      else if (selectedResultFilter === 'FAILED')    filtered = filtered.filter((s) => s.passed === false);
      else if (selectedResultFilter === 'PENDING')   filtered = filtered.filter((s) => s.passed === null && s.status !== 'CANCELLED');
      else if (selectedResultFilter === 'CANCELLED') filtered = filtered.filter((s) => s.status === 'CANCELLED');

      if (searchText.trim()) {
        const q = searchText.toLowerCase();
        filtered = filtered.filter((s) => s.studentName.toLowerCase().includes(q));
      }

      log('Filtros aplicados', { count: filtered.length });
      setFilteredStudents(filtered);
    } catch (e) {
      logError('Error aplicando filtros:', e);
      setFilteredStudents(allStudents);
    }
  }, [allStudents, selectedYear, selectedLevel, selectedResultFilter, searchText]);

  // ─── Effects ─────────────────────────────────────────────────────────────────
  useEffect(() => { loadStudents(); }, [loadStudents]);
  useEffect(() => { applyFilters(); }, [applyFilters]);

  useEffect(() => {
    try {
      const active =
        selectedYear !== 'ALL' || selectedLevel !== 'ALL' ||
        selectedResultFilter !== 'ALL' || searchText.trim() !== '';
      setHasFiltersApplied(active);
      if (active) {
        const info = {};
        if (selectedYear !== 'ALL')         info.year   = selectedYear;
        if (selectedLevel !== 'ALL')        info.level  = getLevelLabel(selectedLevel);
        if (selectedResultFilter !== 'ALL') info.result = RESULT_FILTER_MAP[selectedResultFilter];
        if (searchText.trim())              info.search = validateSearchText(searchText);
        setActiveFiltersInfo(info);
      } else {
        setActiveFiltersInfo({});
      }
    } catch (e) {
      logError('Error detectando filtros activos:', e);
    }
  }, [selectedYear, selectedLevel, selectedResultFilter, searchText]);

  // ─── Cancelar inscripción ────────────────────────────────────────────────────
  const handleCancelEnrollment = useCallback(async (studentId) => {
    try {
      if (!studentId || typeof studentId !== 'number') { setError('ID de estudiante inválido'); return; }
      if (!window.confirm('¿Estás seguro de que deseas cancelar esta inscripción?')) return;
      await apiService.withdrawStudentFromCohort(studentId);
      logUserAction('cancel_enrollment', { timestamp: new Date().toISOString() });
      alert('Inscripción cancelada exitosamente');
      loadStudents();
    } catch (err) {
      logError('Error cancelando inscripción:', err);
      setError('Error al cancelar la inscripción');
    }
  }, [loadStudents]);

  // ─── Estadísticas ────────────────────────────────────────────────────────────
  const calculateStatistics = useCallback((data) => {
    try {
      const stats = {};
      ALL_LEVEL_ENROLLMENTS.forEach((lvl) => {
        const ls        = data.filter((s) => s.levelEnrollment === lvl.value);
        const passed    = ls.filter((s) => s.passed === true).length;
        const failed    = ls.filter((s) => s.passed === false).length;
        const pending   = ls.filter((s) => s.passed === null).length;
        const cancelled = ls.filter((s) => s.status === 'CANCELLED').length;
        const total     = ls.length;
        stats[lvl.value] = {
          label: lvl.label, total, passed, failed, pending, cancelled,
          passPercentage: total > 0 ? ((passed / total) * 100).toFixed(1) : 0,
        };
      });
      return stats;
    } catch (e) {
      logError('Error calculando estadísticas:', e);
      return {};
    }
  }, []);

  const handleShowStatistics = useCallback(() => {
    try {
      const data  = hasFiltersApplied ? filteredStudents : allStudents;
      const stats = calculateStatistics(data);
      setStatisticsData({ statistics: stats, hasFilters: hasFiltersApplied, filtersInfo: activeFiltersInfo, dataCount: data.length });
      setShowStatisticsModal(true);
      logUserAction('view_statistics', { hasFilters: hasFiltersApplied, timestamp: new Date().toISOString() });
    } catch (err) {
      logError('Error mostrando estadísticas:', err);
      setError('Error al generar estadísticas');
    }
  }, [hasFiltersApplied, filteredStudents, allStudents, calculateStatistics, activeFiltersInfo]);

  const handleExportPDF = useCallback(() => {
    try {
      const data   = hasFiltersApplied ? filteredStudents : allStudents;
      const stats  = calculateStatistics(data);
      const titles = { PASSED: 'Estudiantes Aprobados', FAILED: 'Estudiantes Reprobados', PENDING: 'Estudiantes Pendientes', CANCELLED: 'Estudiantes Cancelados' };
      generatePDF({
        title:       titles[selectedResultFilter] || 'Listado de Estudiantes',
        level:       selectedLevel === 'ALL' ? 'Todos los Niveles' : getLevelLabel(selectedLevel),
        year:        selectedYear  === 'ALL' ? 'Todos los Años'    : selectedYear,
        date:        new Date().toLocaleDateString('es-CO'),
        students:    data,
        statistics:  stats,
        hasFilters:  hasFiltersApplied,
        filtersInfo: activeFiltersInfo,
        filterYear:  selectedYear  === 'ALL' ? null : selectedYear,
        filterLevel: selectedLevel === 'ALL' ? null : selectedLevel,
      }, 'students-report');
      logUserAction('export_pdf', { hasFilters: hasFiltersApplied, timestamp: new Date().toISOString() });
    } catch (err) {
      logError('Error generando PDF:', err);
      setError('Error al generar PDF');
    }
  }, [hasFiltersApplied, filteredStudents, allStudents, selectedResultFilter, selectedLevel, selectedYear, calculateStatistics, activeFiltersInfo]);

  // ─── Helpers de etiquetas ────────────────────────────────────────────────────
  const getLevelLabel  = (v) => ALL_LEVEL_ENROLLMENTS.find((l) => l.value === v)?.label ?? v;
  const getStatusLabel = (s) => STATUS_MAP[s] ?? s;

  const countByYear = (year) =>
    allStudents.filter((s) => {
      try { return new Date(s.enrollmentDate).getFullYear().toString() === year; }
      catch (_) { return false; }
    }).length;

  const countByLevelAndYear = (levelValue) =>
    selectedYear === 'ALL'
      ? allStudents.filter((s) => s.levelEnrollment === levelValue).length
      : allStudents.filter((s) => {
          try { return s.levelEnrollment === levelValue && new Date(s.enrollmentDate).getFullYear().toString() === selectedYear; }
          catch (_) { return false; }
        }).length;

  const availableYears  = getAvailableYears();
  const availableLevels = getAvailableLevels();

  // ─── Render ──────────────────────────────────────────────────────────────────
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
                style={{ backgroundColor: theme.bgSecondary, color: theme.text, borderColor: theme.border }}
              />
            </div>

            <div className="students-page__filter-item">
              <label>📅 Filtrar por Año</label>
              <select
                value={selectedYear}
                onChange={(e) => { setSelectedYear(e.target.value); setSelectedLevel('ALL'); }}
                style={{ backgroundColor: theme.bgSecondary, color: theme.text, borderColor: theme.border }}
              >
                <option value="ALL">Todos los Años ({allStudents.length})</option>
                {availableYears.map((y) => (
                  <option key={y} value={y}>{y} ({countByYear(y)})</option>
                ))}
              </select>
            </div>

            <div className="students-page__filter-item">
              <label>📌 Filtrar por Nivel</label>
              <select
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(e.target.value)}
                style={{ backgroundColor: theme.bgSecondary, color: theme.text, borderColor: theme.border }}
              >
                <option value="ALL">
                  Todos los Niveles ({selectedYear === 'ALL' ? allStudents.length : countByYear(selectedYear)})
                </option>
                {availableLevels.map((lvl) => (
                  <option key={lvl.value} value={lvl.value}>
                    {lvl.label} ({countByLevelAndYear(lvl.value)})
                  </option>
                ))}
              </select>
            </div>

            <div className="students-page__filter-item">
              <label>📊 Filtrar por Resultado</label>
              <select
                value={selectedResultFilter}
                onChange={(e) => setSelectedResultFilter(e.target.value)}
                style={{ backgroundColor: theme.bgSecondary, color: theme.text, borderColor: theme.border }}
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
            <button className="students-page__btn students-page__btn--primary"   onClick={() => setShowEnrollModal(true)}>➕ Inscribir</button>
            <button className="students-page__btn students-page__btn--secondary" onClick={handleShowStatistics}>📊 Estadísticas {hasFiltersApplied && '🔍'}</button>
            <button className="students-page__btn students-page__btn--export"    onClick={handleExportPDF}>📄 PDF {hasFiltersApplied && '🔍'}</button>
            <button className="students-page__btn students-page__btn--refresh"   onClick={loadStudents} disabled={loading}>🔄 Recargar</button>
          </div>
        </div>

        <div className="students-page__filter-info" style={{ color: theme.text }}>
          <p>
            Mostrando <strong>{filteredStudents.length}</strong> de <strong>{allStudents.length}</strong> estudiantes
            {hasFiltersApplied && ' (🔍 Con filtros aplicados)'}
          </p>
        </div>

        {error && (
          <div className="students-page__error" style={{ backgroundColor: theme.errorBg, borderColor: theme.errorBorder, color: theme.errorText }}>
            ❌ {error}
          </div>
        )}

        {loading ? (
          <div className="students-page__loading" style={{ color: theme.text }}>⏳ Cargando estudiantes...</div>
        ) : filteredStudents.length === 0 ? (
          <div className="students-page__empty" style={{ color: theme.textSecondary }}>
            <p>👤 No hay estudiantes que coincidan con los filtros</p>
            {allStudents.length === 0 && (
              <p className="students-page__empty-hint">💡 Carga los datos para ver estudiantes disponibles</p>
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
                {filteredStudents.map((student) => (
                  <tr
                    key={student.id}
                    className={
                      student.status === 'CANCELLED' ? 'cancelled'
                      : student.passed === false     ? 'failed'
                      : student.passed === true      ? 'passed'
                      : 'active'
                    }
                    style={{ backgroundColor: isDarkMode ? '#1a2332' : '#fff', borderColor: theme.border, color: theme.text }}
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

                    <td className="students-page__col-cohort">{student.cohortName}</td>

                    <td className="students-page__col-status">
                      <span className={`students-page__status-badge students-page__status-badge--${student.status?.toLowerCase()}`}>
                        {getStatusLabel(student.status)}
                      </span>
                    </td>

                    <td className="students-page__col-attendance">
                      <div className="students-page__attendance-bar">
                        <div className="students-page__attendance-fill" style={{ width: `${student.attendancePercentage || 0}%` }} />
                      </div>
                      <span className="students-page__attendance-text">
                        {(student.attendancePercentage || 0).toFixed(1)}%
                      </span>
                    </td>

                    <td className="students-page__col-result">
                      {student.passed === true  && <span className="students-page__badge--passed">✅ Aprobado</span>}
                      {student.passed === false && <span className="students-page__badge--failed">❌ Reprobado</span>}
                      {student.passed === null  && student.status !== 'CANCELLED' && (
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
        onEnrollmentSuccess={() => { setShowEnrollModal(false); loadStudents(); }}
      />

      <ModalStatistics
        isOpen={showStatisticsModal}
        onClose={() => setShowStatisticsModal(false)}
        data={statisticsData}
        isDarkMode={isDarkMode}
      />
    </div>
  );
};

export default StudentsPage;