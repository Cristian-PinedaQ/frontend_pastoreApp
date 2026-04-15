// ============================================
// StudentsPage.jsx - ELITE MODERN EDITION
// ============================================

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import apiService from '../apiService';
import { useConfirmation } from '../context/ConfirmationContext';
import ModalEnrollStudent from '../components/Modalenrollstudent';
import ModalStatistics from '../components/ModalStatistics';
import { generatePDF } from '../services/Pdfgenerator';
import { logUserAction } from '../utils/securityLogger';
import nameHelper from '../services/nameHelper';
import { 
  Users,
  Calendar, 
  GraduationCap, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Ban, 
  BarChart3, 
  RefreshCw,
  ChevronDown, 
  UserPlus,
  Download,
  Activity,
  Layers,
  Award
} from "lucide-react";

const { getDisplayName } = nameHelper;

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
const LEGACY_MAP = {
  EDIRD_1: 'ESENCIA_1',
  EDIRD_2: 'ESENCIA_2',
  EDIRD_3: 'ESENCIA_3',
  EDIRD_4: 'ESENCIA_4',
};

const applyLegacyMap = (value) => {
  if (!value || typeof value !== 'string') return value;

  const upper = value.toUpperCase().trim();
  return LEGACY_MAP[upper] ?? value;
};

const COHORT_LEVEL_RULES = [
  { match: ['SANIDAD_INTEGRAL_RAICES', 'SANIDAD'], level: 'SANIDAD_INTEGRAL_RAICES' },
  { match: ['PREENCUENTRO'],                        level: 'PREENCUENTRO'            },
  { match: ['POST_ENCUENTRO'],                      level: 'POST_ENCUENTRO'          },
  { match: ['ENCUENTRO'],                           level: 'ENCUENTRO'               },
  { match: ['BAUTIZOS'],                            level: 'BAUTIZOS'                },
  { match: ['ADIESTRAMIENTO'],                      level: 'ADIESTRAMIENTO'          },
  { match: ['GRADUACION'],                          level: 'GRADUACION'              },
  { match: ['ESENCIA_4', 'EDIRD_4'],                level: 'ESENCIA_4'               },
  { match: ['ESENCIA_3', 'EDIRD_3'],                level: 'ESENCIA_3'               },
  { match: ['ESENCIA_2', 'EDIRD_2'],                level: 'ESENCIA_2'               },
  { match: ['ESENCIA_1', 'EDIRD_1'],                level: 'ESENCIA_1'               },
];

const extractLevel = (enrollment) => {
  try {
    if (enrollment.level) return applyLegacyMap(enrollment.level);
    if (enrollment.cohortName && typeof enrollment.cohortName === 'string') {
      const upper = enrollment.cohortName.toUpperCase();
      for (const rule of COHORT_LEVEL_RULES) {
        if (rule.match.some((kw) => upper.includes(kw))) return rule.level;
      }
    }
    return null;
  } catch (err) {
    logError('Error extrayendo nivel:', err);
    return null;
  }
};

const ALL_LEVEL_ENROLLMENTS = [
  { value: 'PREENCUENTRO',            label: 'Pre-encuentro',            color: 'blue'   },
  { value: 'ENCUENTRO',               label: 'Encuentro',                 color: 'violet' },
  { value: 'POST_ENCUENTRO',          label: 'Post-encuentro',            color: 'indigo' },
  { value: 'BAUTIZOS',                label: 'Bautizos',                  color: 'cyan'   },
  { value: 'ESENCIA_1',               label: 'ESENCIA 1',                 color: 'emerald' },
  { value: 'ESENCIA_2',               label: 'ESENCIA 2',                 color: 'emerald' },
  { value: 'ESENCIA_3',               label: 'ESENCIA 3',                 color: 'emerald' },
  { value: 'SANIDAD_INTEGRAL_RAICES', label: 'Sanidad Integral Raíces',   color: 'rose'    },
  { value: 'ESENCIA_4',               label: 'ESENCIA 4',                 color: 'emerald' },
  { value: 'ADIESTRAMIENTO',          label: 'Adiestramiento',            color: 'amber'   },
  { value: 'GRADUACION',              label: 'Graduación',                color: 'purple'  },
];

const STATUS_MAP = {
  ACTIVE:    { label: 'Activo',     color: 'emerald',  icon: Activity },
  COMPLETED: { label: 'Completado', color: 'blue',     icon: CheckCircle2 },
  FAILED:    { label: 'Reprobado',  color: 'rose',     icon: XCircle },
  CANCELLED: { label: 'Cancelado',  color: 'slate',    icon: Ban },
  PENDING:   { label: 'Pendiente',  color: 'amber',    icon: Clock },
  SUSPENDED: { label: 'Suspendido', color: 'orange',   icon: Ban },
};

const RESULT_FILTER_MAP = {
  ALL:       '',
  PASSED:    'Aprobados',
  FAILED:    'Reprobados',
  PENDING:   'Pendientes',
  CANCELLED: 'Cancelados',
};

const StudentsPage = () => {
  const confirm = useConfirmation();
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

  // ─── Dark mode detection ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const checkDark = () => {
      setIsDarkMode(
        document.documentElement.classList.contains('dark') || 
        localStorage.getItem('theme') === 'dark' ||
        window.matchMedia('(prefers-color-scheme: dark)').matches
      );
    };
    checkDark();
    const observer = new MutationObserver(checkDark);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // ─── Load students ──────────────────────────────────────────────────────
  const loadStudents = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const enrollments = await apiService.getStudentEnrollments(0, 1000);
      if (!enrollments || enrollments.length === 0) {
        setAllStudents([]);
        return;
      }

      const processedStudents = enrollments.map((enrollment) => {
        const levelValue = extractLevel(enrollment);
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

      setAllStudents(processedStudents);
      logUserAction('load_students', { studentCount: processedStudents.length });
    } catch (err) {
      logError('Error cargando estudiantes:', err);
      setError('Error al cargar la lista de estudiantes');
    } finally {
      setLoading(false);
    }
  }, []);

  // ─── Helpers ────────────────────────────────────────────────────────
  const availableYears = useMemo(() => {
    const yearsSet = new Set();
    allStudents.forEach((s) => {
      if (s.enrollmentDate) {
        const y = new Date(s.enrollmentDate).getFullYear();
        if (!isNaN(y) && y > 1900 && y < 2100) yearsSet.add(y.toString());
      }
    });
    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [allStudents]);

  const availableLevels = useMemo(() => {
    const base = selectedYear === 'ALL'
      ? allStudents
      : allStudents.filter((s) => new Date(s.enrollmentDate).getFullYear().toString() === selectedYear);
    const found = new Set(base.map((s) => s.levelEnrollment).filter(Boolean));
    return ALL_LEVEL_ENROLLMENTS.filter((l) => found.has(l.value));
  }, [allStudents, selectedYear]);

  // ─── Filtering ─────────────────────────────────────────────────────────
  const applyFilters = useCallback(() => {
    let filtered = [...allStudents].sort((a, b) => 
      new Date(b.enrollmentDate || 0) - new Date(a.enrollmentDate || 0)
    );

    if (selectedYear !== 'ALL') {
      filtered = filtered.filter((s) => new Date(s.enrollmentDate).getFullYear().toString() === selectedYear);
    }

    if (selectedLevel !== 'ALL') {
      filtered = filtered.filter((s) => s.levelEnrollment === selectedLevel);
    }

    if (selectedResultFilter === 'PASSED')    filtered = filtered.filter((s) => s.passed === true);
    else if (selectedResultFilter === 'FAILED')    filtered = filtered.filter((s) => s.passed === false);
    else if (selectedResultFilter === 'PENDING')   filtered = filtered.filter((s) => s.passed === null && s.status !== 'CANCELLED');
    else if (selectedResultFilter === 'CANCELLED') filtered = filtered.filter((s) => s.status === 'CANCELLED');

    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      filtered = filtered.filter((s) => s.studentName.toLowerCase().includes(q));
    }

    setFilteredStudents(filtered);
  }, [allStudents, selectedYear, selectedLevel, selectedResultFilter, searchText]);

  useEffect(() => { loadStudents(); }, [loadStudents]);
  useEffect(() => { applyFilters(); }, [applyFilters]);

  useEffect(() => {
    const active = selectedYear !== 'ALL' || selectedLevel !== 'ALL' || selectedResultFilter !== 'ALL' || searchText.trim() !== '';
    setHasFiltersApplied(active);
    if (active) {
      const info = {};
      if (selectedYear !== 'ALL') info.year = selectedYear;
      if (selectedLevel !== 'ALL') info.level = ALL_LEVEL_ENROLLMENTS.find(l => l.value === selectedLevel)?.label;
      if (selectedResultFilter !== 'ALL') info.result = RESULT_FILTER_MAP[selectedResultFilter];
      if (searchText.trim()) info.search = searchText.trim();
      setActiveFiltersInfo(info);
    } else {
      setActiveFiltersInfo({});
    }
  }, [selectedYear, selectedLevel, selectedResultFilter, searchText]);

  // ─── Actions ────────────────────────────────────────────────────
  const handleCancelEnrollment = useCallback(async (studentId) => {
    const isConfirmed = await confirm({
      title: '¿Cancelar Inscripción?',
      message: 'Esta acción anulará el proceso académico actual para este estudiante.',
      type: 'danger',
      confirmLabel: 'Cancelar permanentemente',
      onConfirm: async () => {
        await apiService.withdrawStudentFromCohort(studentId);
      }
    });
    if (isConfirmed) loadStudents();
  }, [confirm, loadStudents]);

  const calculateStatistics = useCallback((data) => {
    const stats = {};
    ALL_LEVEL_ENROLLMENTS.forEach((lvl) => {
      const ls = data.filter((s) => s.levelEnrollment === lvl.value);
      const passed = ls.filter((s) => s.passed === true).length;
      const failed = ls.filter((s) => s.passed === false).length;
      const pending = ls.filter((s) => s.passed === null).length;
      const cancelled = ls.filter((s) => s.status === 'CANCELLED').length;
      const total = ls.length;
      stats[lvl.value] = {
        label: lvl.label, total, passed, failed, pending, cancelled,
        passPercentage: total > 0 ? ((passed / total) * 100).toFixed(1) : 0,
      };
    });
    return stats;
  }, []);

  const handleShowStatistics = useCallback(() => {
    const data = hasFiltersApplied ? filteredStudents : allStudents;
    const stats = calculateStatistics(data);
    setStatisticsData({ statistics: stats, hasFilters: hasFiltersApplied, filtersInfo: activeFiltersInfo, dataCount: data.length });
    setShowStatisticsModal(true);
  }, [hasFiltersApplied, filteredStudents, allStudents, calculateStatistics, activeFiltersInfo]);

  const handleExportPDF = useCallback(() => {
    const data = hasFiltersApplied ? filteredStudents : allStudents;
    const stats = calculateStatistics(data);
    const titles = { PASSED: 'Estudiantes Aprobados', FAILED: 'Estudiantes Reprobados', PENDING: 'Estudiantes Pendientes', CANCELLED: 'Estudiantes Cancelados' };
    generatePDF({
      title: titles[selectedResultFilter] || 'Listado de Estudiantes',
      level: selectedLevel === 'ALL' ? 'Todos los Niveles' : ALL_LEVEL_ENROLLMENTS.find(l => l.value === selectedLevel)?.label,
      year: selectedYear === 'ALL' ? 'Todos los Años' : selectedYear,
      date: new Date().toLocaleDateString('es-CO'),
      students: data,
      statistics: stats,
      hasFilters: hasFiltersApplied,
      filtersInfo: activeFiltersInfo,
      filterYear: selectedYear === 'ALL' ? null : selectedYear,
      filterLevel: selectedLevel === 'ALL' ? null : selectedLevel,
    }, 'students-report');
  }, [hasFiltersApplied, filteredStudents, allStudents, selectedResultFilter, selectedLevel, selectedYear, calculateStatistics, activeFiltersInfo]);

  // ─── Stats Counts ────────────────────────────────────────────────────────────
  const totalStats = useMemo(() => {
    return {
      total: allStudents.length,
      passed: allStudents.filter(s => s.passed === true).length,
      failed: allStudents.filter(s => s.passed === false).length,
      pending: allStudents.filter(s => s.passed === null && s.status !== 'CANCELLED').length,
    }
  }, [allStudents]);

  // ─── Render Components ────────────────────────────────────────────────────────────
  const StatCard = ({ icon: Icon, label, value, color }) => (
    <div className="p-4 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 shadow-sm flex items-center gap-4 transition-all hover:scale-105">
      <div className={`p-3 rounded-2xl bg-${color}-500/10 text-${color}-600 dark:text-${color}-400`}>
        <Icon size={24} />
      </div>
      <div>
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</p>
        <p className="text-2xl font-bold text-slate-900 dark:text-white leading-tight">{value}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8 transition-colors duration-300">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
              <Users className="text-indigo-600" size={40} />
              Gestión de Estudiantes
            </h1>
            <p className="text-slate-500 dark:text-slate-400 font-medium">
              Control académico, niveles de formación y cohortes activas
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button 
              onClick={() => setShowEnrollModal(true)}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-indigo-500/25 active:scale-95"
            >
              <UserPlus size={20} />
              Nueva Inscripción
            </button>
            <button 
              onClick={loadStudents}
              className={`p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all ${loading ? 'animate-spin' : ''}`}
            >
              <RefreshCw size={20} />
            </button>
          </div>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Users} label="Total Estudiantes" value={totalStats.total} color="indigo" />
          <StatCard icon={CheckCircle2} label="Aprobados" value={totalStats.passed} color="emerald" />
          <StatCard icon={XCircle} label="Reprobados" value={totalStats.failed} color="rose" />
          <StatCard icon={Clock} label="En Proceso" value={totalStats.pending} color="amber" />
        </div>

        {/* Filters Panel */}
        <section className="bg-white dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl">
          <div className="flex flex-col lg:flex-row gap-6">
            
            {/* Search */}
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-400">
              </div>
              <input
                type="text"
                placeholder="Buscar por nombre, documento o nivel..."
                className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-950 border-none rounded-2xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500/50 transition-all font-medium"
                value={searchText}
                onChange={(e) => setSearchText(validateSearchText(e.target.value))}
              />
            </div>

            {/* Selects */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:w-[60%]">
              <div className="relative group">
                <div className="absolute left-4 inset-y-0 flex items-center text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                  <Calendar size={18} />
                </div>
                <select 
                  className="w-full pl-12 pr-10 py-4 bg-slate-50 dark:bg-slate-950 appearance-none rounded-2xl border-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-700 dark:text-slate-200"
                  value={selectedYear}
                  onChange={(e) => { setSelectedYear(e.target.value); setSelectedLevel('ALL'); }}
                >
                  <option value="ALL">Todos los Años</option>
                  {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                <ChevronDown className="absolute right-4 inset-y-0 my-auto text-slate-400 pointer-events-none" size={18} />
              </div>

              <div className="relative group">
                <div className="absolute left-4 inset-y-0 flex items-center text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                  <Layers size={18} />
                </div>
                <select 
                  className="w-full pl-12 pr-10 py-4 bg-slate-50 dark:bg-slate-950 appearance-none rounded-2xl border-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-700 dark:text-slate-200"
                  value={selectedLevel}
                  onChange={(e) => setSelectedLevel(e.target.value)}
                >
                  <option value="ALL">Todos los Niveles</option>
                  {availableLevels.map(lvl => <option key={lvl.value} value={lvl.value}>{lvl.label}</option>)}
                </select>
                <ChevronDown className="absolute right-4 inset-y-0 my-auto text-slate-400 pointer-events-none" size={18} />
              </div>

              <div className="relative group">
                <div className="absolute left-4 inset-y-0 flex items-center text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                  <Award size={18} />
                </div>
                <select 
                  className="w-full pl-12 pr-10 py-4 bg-slate-50 dark:bg-slate-950 appearance-none rounded-2xl border-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-700 dark:text-slate-200"
                  value={selectedResultFilter}
                  onChange={(e) => setSelectedResultFilter(e.target.value)}
                >
                  <option value="ALL">Todos los Estados</option>
                  <option value="PASSED">Aprobados</option>
                  <option value="FAILED">Reprobados</option>
                  <option value="PENDING">Pendientes</option>
                  <option value="CANCELLED">Cancelados</option>
                </select>
                <ChevronDown className="absolute right-4 inset-y-0 my-auto text-slate-400 pointer-events-none" size={18} />
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 dark:border-slate-800 pt-6">
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 font-medium">
              <span className="flex items-center justify-center w-6 h-6 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-lg text-xs font-bold">
                {filteredStudents.length}
              </span>
              Estudiantes encontrados
              {hasFiltersApplied && (
                <span className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full text-xs animate-pulse">
                  Filtros activos
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <button 
                onClick={handleShowStatistics}
                className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all active:scale-95"
              >
                <BarChart3 size={16} />
                Estadísticas
              </button>
              <button 
                onClick={handleExportPDF}
                className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all active:scale-95"
              >
                <Download size={16} />
                Exportar PDF
              </button>
            </div>
          </div>
        </section>

        {/* Info/Error */}
        {error && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 p-4 rounded-2xl flex items-center gap-3 animate-head-shake">
            <XCircle size={20} />
            <span className="font-semibold text-sm">{error}</span>
          </div>
        )}

        {/* Table/Content */}
        <div className="overflow-x-auto rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-950/50 border-b border-slate-200 dark:border-slate-800">
                <th className="px-6 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest italic">Estudiante</th>
                <th className="px-6 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest italic">Nivel / Cohorte</th>
                <th className="px-6 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest italic">Desempeño</th>
                <th className="px-6 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest italic">Estado</th>
                <th className="px-6 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest italic">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-6 py-20 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-600 rounded-full animate-spin"></div>
                      <span className="font-bold tracking-tight">Sincronizando información académica...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-32 text-center">
                    <div className="flex flex-col items-center gap-4 text-slate-300 dark:text-slate-700">
                      <GraduationCap size={80} strokeWidth={1} />
                      <div className="space-y-1">
                        <p className="text-xl font-bold dark:text-slate-400">No hay registros académicos</p>
                        <p className="text-sm">Ajusta los filtros o realiza una nueva inscripción para comenzar</p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => {
                  const statusInfo = STATUS_MAP[student.status] || STATUS_MAP.PENDING;
                  const levelColor = ALL_LEVEL_ENROLLMENTS.find(l => l.value === student.levelEnrollment)?.color || 'slate';
                  const StatusIcon = statusInfo.icon;

                  return (
                    <tr 
                      key={student.id} 
                      className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-all duration-200"
                    >
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-indigo-500/20 group-hover:scale-110 transition-transform">
                            {student.studentName.charAt(0)}
                          </div>
                          <div className="space-y-0.5">
                            <p className="font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors uppercase text-sm tracking-tight">
                              {student.studentName}
                            </p>
                            <p className="text-xs text-slate-500 font-medium">
                              Inscrito: {student.enrollmentDate ? new Date(student.enrollmentDate).toLocaleDateString('es-CO') : '-'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="space-y-2">
                          <div className={`inline-flex items-center px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest bg-${levelColor}-500/10 text-${levelColor}-600 dark:text-${levelColor}-400 border border-${levelColor}-500/20`}>
                            {ALL_LEVEL_ENROLLMENTS.find(l => l.value === student.levelEnrollment)?.label || 'Sin Nivel'}
                          </div>
                          <p className="text-xs font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1.5 italic">
                            <Layers size={14} className="text-slate-400" />
                            {student.cohortName}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="w-full max-w-[120px] space-y-2 text-right">
                          <div className="flex items-center justify-between text-[11px] font-bold">
                            <span className="text-slate-400 tracking-tighter uppercase italic">Asistencia</span>
                            <span className="text-slate-900 dark:text-slate-200">{(student.attendancePercentage || 0).toFixed(1)}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700">
                            <div 
                              className="h-full bg-indigo-500 rounded-full transition-all duration-1000" 
                              style={{ width: `${student.attendancePercentage || 0}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-col gap-2">
                          <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-${statusInfo.color}-500/10 text-${statusInfo.color}-600 dark:text-${statusInfo.color}-400 self-start`}>
                            <StatusIcon size={14} />
                            {statusInfo.label}
                          </div>
                          {student.passed === true && (
                            <span className="flex items-center gap-1 text-[10px] font-black text-emerald-600 italic tracking-widest uppercase">
                              <Award size={12} strokeWidth={3} /> Aprobado
                            </span>
                          )}
                          {student.passed === false && (
                            <span className="flex items-center gap-1 text-[10px] font-black text-rose-500 italic tracking-widest uppercase">
                              <Ban size={12} strokeWidth={3} /> Reprobado
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <button
                          onClick={() => handleCancelEnrollment(student.id)}
                          className="p-2.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-all active:scale-95"
                          title="Cancelar Inscripción"
                        >
                          <Ban size={20} />
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
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