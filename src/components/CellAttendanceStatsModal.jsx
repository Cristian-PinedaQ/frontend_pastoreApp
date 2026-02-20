// ============================================
// CellAttendanceStatsModal.jsx — v5 Profesional
// Dark mode: T theme object + inline styles
// Supports: Monthly + Annual views
// Dynamic selectors: only available years/months
// ============================================

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { generateAttendancePDF } from '../services/attendancePdfGenerator';
import '../css/CellAttendanceStatsModal.css';

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const MONTH_NAMES_SHORT = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
];

const formatDateShort = (dateStr) => {
  if (!dateStr) return '';
  try {
    const [year, month, day] = dateStr.split('-').map(Number);
    const d = new Date(year, month - 1, day, 12, 0, 0);
    return d.toLocaleDateString('es-CO', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    });
  } catch {
    return dateStr;
  }
};

const formatDateLong = (dateStr) => {
  if (!dateStr) return '';
  try {
    const [year, month, day] = dateStr.split('-').map(Number);
    const d = new Date(year, month - 1, day, 12, 0, 0);
    return d.toLocaleDateString('es-CO', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    });
  } catch {
    return dateStr;
  }
};

const CellAttendanceStatsModal = ({
  isOpen,
  onClose,
  cellId,
  cellName,
  initialMonth = new Date().getMonth() + 1,
  initialYear = new Date().getFullYear(),
  apiService,
  theme = 'light',
  isMobile,
  onRefresh,
  logUserAction
}) => {

  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');
  const [generatingPDF, setGeneratingPDF] = useState(false);

  // selectedMonth: 1-12 = mes específico, 0 = todo el año
  const [selectedMonth, setSelectedMonth] = useState(initialMonth);
  const [selectedYear, setSelectedYear] = useState(initialYear);

  // Annual aggregated data
  const [annualData, setAnnualData] = useState(null);

  const [animatedPct, setAnimatedPct] = useState(0);

  const statsScrollRef = useRef(null);

  const isAnnualView = selectedMonth === 0;

  // ══════════════════════════════════════════════════════════════════════════
  // AVAILABLE PERIODS — dynamic selectors from database
  // ══════════════════════════════════════════════════════════════════════════
  //
  // Expected API response format from getCellAttendanceAvailablePeriods(cellId):
  // {
  //   years: [2024, 2025, 2026],          // sorted asc
  //   months: {                            // months with data per year
  //     2024: [9, 10, 11, 12],
  //     2025: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  //     2026: [1, 2]
  //   }
  // }
  //
  // If the endpoint does not exist, the component falls back to showing
  // all months and a ±10 year range (same as before).
  // ══════════════════════════════════════════════════════════════════════════

  const [availablePeriods, setAvailablePeriods] = useState(null);
  const [periodsLoading, setPeriodsLoading] = useState(false);
  const [periodsLoaded, setPeriodsLoaded]   = useState(false);

  const loadAvailablePeriods = useCallback(async () => {
    if (!cellId || periodsLoaded) return;
    setPeriodsLoading(true);

    try {
      // ── Strategy 1: dedicated endpoint ──
      if (typeof apiService.getCellAttendanceAvailablePeriods === 'function') {
        const data = await apiService.getCellAttendanceAvailablePeriods(cellId);

        if (data && Array.isArray(data.years) && data.months) {
          setAvailablePeriods({
            years:  data.years.sort((a, b) => b - a),       // desc for selector
            months: data.months,                              // { year: [months] }
          });
          setPeriodsLoaded(true);
          setPeriodsLoading(false);
          return;
        }
      }

      // ── Strategy 2: derive from attendance records endpoint ──
      // Some backends expose getCellAttendanceRecords or similar that returns
      // all attendance records with dates; we extract unique year-month pairs.
      if (typeof apiService.getCellAttendanceRecords === 'function') {
        const records = await apiService.getCellAttendanceRecords(cellId);

        if (Array.isArray(records) && records.length > 0) {
          const periodsMap = {};

          records.forEach(r => {
            const dateStr = r.date || r.meetingDate || r.createdAt;
            if (!dateStr) return;
            const [y, m] = dateStr.split('-').map(Number);
            if (!y || !m) return;
            if (!periodsMap[y]) periodsMap[y] = new Set();
            periodsMap[y].add(m);
          });

          const years = Object.keys(periodsMap).map(Number).sort((a, b) => b - a);
          const months = {};
          years.forEach(y => {
            months[y] = Array.from(periodsMap[y]).sort((a, b) => a - b);
          });

          setAvailablePeriods({ years, months });
          setPeriodsLoaded(true);
          setPeriodsLoading(false);
          return;
        }
      }

      // ── Strategy 3 (fallback): lightweight probe of recent years ──
      // Fetch stats for each month of a reasonable range and check which return data.
      // Only probes current year ± 2 to avoid too many requests.
      const currentYear = new Date().getFullYear();
      const probeYears  = [currentYear, currentYear - 1, currentYear - 2];
      const periodsMap  = {};

      await Promise.all(
        probeYears.map(async (year) => {
          const monthPromises = Array.from({ length: 12 }, (_, i) =>
            apiService.getCellAttendanceMonthlyStats(cellId, year, i + 1)
              .then(data => {
                const has = data && (data.totalMeetings > 0 || data.totalRegistered > 0 ||
                            (Array.isArray(data.dailyStats) && data.dailyStats.length > 0));
                return has ? i + 1 : null;
              })
              .catch(() => null)
          );

          const results = await Promise.all(monthPromises);
          const validMonths = results.filter(Boolean);
          if (validMonths.length > 0) {
            periodsMap[year] = validMonths.sort((a, b) => a - b);
          }
        })
      );

      const years = Object.keys(periodsMap).map(Number).sort((a, b) => b - a);
      if (years.length > 0) {
        setAvailablePeriods({ years, months: periodsMap });
      } else {
        // No data found at all — leave null so fallback UI shows
        setAvailablePeriods(null);
      }
    } catch (err) {
      console.warn('[CellAttendanceStats] Could not load available periods:', err);
      setAvailablePeriods(null);
    } finally {
      setPeriodsLoaded(true);
      setPeriodsLoading(false);
    }
  }, [cellId, periodsLoaded, apiService]);

  // ── Computed: available years & months for selectors ────────────────────────
  const displayYears = useMemo(() => {
    if (availablePeriods?.years?.length) {
      return availablePeriods.years; // already sorted desc
    }
    // Fallback: ±10 range
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 13 }, (_, i) => currentYear + 2 - i);
  }, [availablePeriods]);

  const displayMonths = useMemo(() => {
    if (availablePeriods?.months?.[selectedYear]) {
      return availablePeriods.months[selectedYear]; // array of month numbers with data
    }
    // Fallback: all 12
    return Array.from({ length: 12 }, (_, i) => i + 1);
  }, [availablePeriods, selectedYear]);

  // ── Auto-select valid month when year changes ──────────────────────────────
  useEffect(() => {
    if (!availablePeriods || selectedMonth === 0) return;

    const monthsForYear = availablePeriods.months?.[selectedYear];
    if (!monthsForYear) return;

    // If the current selectedMonth is not available in the new year, pick the latest available
    if (!monthsForYear.includes(selectedMonth)) {
      const latest = monthsForYear[monthsForYear.length - 1];
      setSelectedMonth(latest || 0);
    }
  }, [selectedYear, availablePeriods]);

  // ── Dark mode detection ────────────────────────────────────────────────────
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    try {
      const savedMode = localStorage.getItem('darkMode');
      const htmlDark = document.documentElement.classList.contains('dark-mode') ||
                       document.documentElement.classList.contains('dark');
      const mediaDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setIsDarkMode(savedMode === 'true' || htmlDark || mediaDark);
    } catch (_) {}
  }, []);

  // ── Theme object ───────────────────────────────────────────────────────────
  const T = {
    bg:          isDarkMode ? '#1e293b' : '#ffffff',
    bgSecondary: isDarkMode ? '#0f172a' : '#f8fafc',
    text:        isDarkMode ? '#f3f4f6' : '#1f2937',
    textSub:     isDarkMode ? '#9ca3af' : '#6b7280',
    border:      isDarkMode ? '#334155' : '#e5e7eb',
    rowAlt:      isDarkMode ? '#1a2332' : '#f8fafc',
    cardBg:      isDarkMode ? '#1e293b' : '#f1f5f9',
    cardBgAlt:   isDarkMode ? '#273548' : '#ffffff',
    errorBg:     isDarkMode ? '#7f1d1d30' : '#fef2f2',
    errorText:   isDarkMode ? '#fecaca'  : '#ef4444',
    successBg:   isDarkMode ? '#14532d30' : '#ecfdf5',
    successText: isDarkMode ? '#a7f3d0'  : '#065f46',
    warningBg:   isDarkMode ? '#78350f20' : '#fffbeb',
    warningText: isDarkMode ? '#fbbf24'  : '#d97706',
    trackBg:     isDarkMode ? '#334155'  : '#e2e8f0',
    handleBg:    isDarkMode ? '#475569'  : '#cbd5e1',
    hoverBg:     isDarkMode ? 'rgba(59,130,246,0.06)' : 'rgba(59,130,246,0.04)',
    badgeGreenBg:   isDarkMode ? 'rgba(16,185,129,0.15)'  : 'rgba(16,185,129,0.1)',
    badgeGreenTxt:  isDarkMode ? '#34d399' : '#059669',
    badgeRedBg:     isDarkMode ? 'rgba(239,68,68,0.15)'   : 'rgba(239,68,68,0.1)',
    badgeRedTxt:    isDarkMode ? '#f87171' : '#dc2626',
    badgeYellowBg:  isDarkMode ? 'rgba(245,158,11,0.15)'  : 'rgba(245,158,11,0.1)',
    badgeYellowTxt: isDarkMode ? '#fbbf24' : '#d97706',
    badgeBlueBg:    isDarkMode ? 'rgba(59,130,246,0.15)'   : 'rgba(59,130,246,0.1)',
    badgeBlueTxt:   isDarkMode ? '#60a5fa' : '#1e40af',
    badgePurpleBg:  isDarkMode ? 'rgba(99,102,241,0.15)'  : 'rgba(99,102,241,0.1)',
    badgePurpleTxt: isDarkMode ? '#a5b4fc' : '#4f46e5',
    highlightGreenBg:   isDarkMode ? 'rgba(16,185,129,0.08)'  : 'rgba(16,185,129,0.06)',
    highlightGreenBdr:  isDarkMode ? 'rgba(16,185,129,0.25)'  : 'rgba(16,185,129,0.2)',
    highlightYellowBg:  isDarkMode ? 'rgba(245,158,11,0.08)'  : 'rgba(245,158,11,0.06)',
    highlightYellowBdr: isDarkMode ? 'rgba(245,158,11,0.25)'  : 'rgba(245,158,11,0.2)',
    annualBadgeBg:  isDarkMode ? 'rgba(99,102,241,0.12)' : 'rgba(99,102,241,0.08)',
    annualBadgeTxt: isDarkMode ? '#a5b4fc' : '#4f46e5',
    emptyIcon:      isDarkMode ? '#475569' : '#d1d5db',
  };

  // ── Load stats: single month ───────────────────────────────────────────────
  const loadStats = async (month, year) => {
    if (!cellId) return;
    setLoading(true);
    setError('');
    setStats(null);
    setAnnualData(null);

    try {
      const data = await apiService.getCellAttendanceMonthlyStats(cellId, year, month);
      setStats(data);
      logUserAction?.('view_cell_stats', { cellId, month, year });
    } catch (err) {
      setError(err.message || 'Error al cargar estadísticas');
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  // ── Load stats: full year ──────────────────────────────────────────────────
  // If we know the available months, only fetch those (saves API calls)
  const loadAnnualStats = async (year) => {
    if (!cellId) return;
    setLoading(true);
    setError('');
    setStats(null);
    setAnnualData(null);

    try {
      const monthsToFetch = availablePeriods?.months?.[year]
        ? availablePeriods.months[year]
        : Array.from({ length: 12 }, (_, i) => i + 1);

      const promises = monthsToFetch.map(m =>
        apiService.getCellAttendanceMonthlyStats(cellId, year, m)
          .then(data => ({ month: m, data }))
          .catch(() => ({ month: m, data: null }))
      );

      const results = await Promise.all(promises);

      const monthlySummary = [];
      let aggMeetings = 0;
      let aggPresent = 0;
      let aggRegistered = 0;
      let aggJustified = 0;
      let aggDailyStats = [];
      let monthsWithData = 0;
      let sumAvgAttendance = 0;

      results.forEach(({ month, data }) => {
        if (!data) return;

        const {
          totalMeetings = 0,
          totalPresent = 0,
          totalRegistered = 0,
          totalJustified = 0,
          averageAttendance = 0,
          dailyStats = []
        } = data;

        if (totalMeetings === 0 && totalRegistered === 0) return;

        monthsWithData++;
        aggMeetings    += totalMeetings;
        aggPresent     += totalPresent;
        aggRegistered  += totalRegistered;
        aggJustified   += totalJustified;
        sumAvgAttendance += averageAttendance;

        aggDailyStats = aggDailyStats.concat(dailyStats);

        const monthPct = totalRegistered > 0
          ? Math.round((totalPresent / totalRegistered) * 100)
          : 0;

        monthlySummary.push({
          month,
          monthName: MONTH_NAMES[month - 1],
          monthShort: MONTH_NAMES_SHORT[month - 1],
          totalMeetings,
          totalPresent,
          totalAbsent: totalRegistered - totalPresent,
          totalRegistered,
          totalJustified,
          averageAttendance: Math.round(averageAttendance),
          percentage: monthPct,
        });
      });

      // Sort monthly summary by month number
      monthlySummary.sort((a, b) => a.month - b.month);

      const aggregated = {
        totalMeetings:     aggMeetings,
        totalPresent:      aggPresent,
        totalRegistered:   aggRegistered,
        totalJustified:    aggJustified,
        averageAttendance: monthsWithData > 0 ? Math.round(sumAvgAttendance / monthsWithData) : 0,
        dailyStats:        aggDailyStats,
        monthsWithData,
      };

      setStats(aggregated);
      setAnnualData({ monthlySummary, year });
      logUserAction?.('view_cell_stats_annual', { cellId, year });
    } catch (err) {
      setError(err.message || 'Error al cargar estadísticas anuales');
      setStats(null);
      setAnnualData(null);
    } finally {
      setLoading(false);
    }
  };

  // ── Load available periods when modal opens ────────────────────────────────
  useEffect(() => {
    if (isOpen && cellId) {
      loadAvailablePeriods();
    }
  }, [isOpen, cellId, loadAvailablePeriods]);

  // ── Reset when modal closes ────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) {
      setPeriodsLoaded(false);
      setAvailablePeriods(null);
      setStats(null);
      setAnnualData(null);
      setError('');
    }
  }, [isOpen]);

  // ── Trigger stats load on filter change (after periods are loaded) ─────────
  useEffect(() => {
    if (isOpen && cellId && periodsLoaded) {
      setAnimatedPct(0);
      if (selectedMonth === 0) {
        loadAnnualStats(selectedYear);
      } else {
        loadStats(selectedMonth, selectedYear);
      }
    }
  }, [isOpen, cellId, selectedMonth, selectedYear, periodsLoaded]);

  // ── Derived data from stats ────────────────────────────────────────────────
  const {
    totalMeetings = 0,
    totalPresent = 0,
    totalRegistered = 0,
    totalJustified = 0,
    averageAttendance = 0,
    dailyStats = []
  } = stats || {};

  const totalAbsent = totalRegistered - totalPresent;
  const overallPct = totalRegistered > 0
    ? Math.round((totalPresent / totalRegistered) * 100)
    : 0;

  const bestSession = useMemo(() => {
    if (!dailyStats.length) return null;
    return dailyStats.reduce((best, d) =>
      (d.percentage > best.percentage) ? d : best, dailyStats[0]);
  }, [dailyStats]);

  const worstSession = useMemo(() => {
    if (!dailyStats.length) return null;
    return dailyStats.reduce((worst, d) =>
      (d.percentage < worst.percentage) ? d : worst, dailyStats[0]);
  }, [dailyStats]);

  const bestMonth = useMemo(() => {
    if (!annualData?.monthlySummary?.length) return null;
    return annualData.monthlySummary.reduce((best, m) =>
      (m.percentage > best.percentage) ? m : best, annualData.monthlySummary[0]);
  }, [annualData]);

  const worstMonth = useMemo(() => {
    if (!annualData?.monthlySummary?.length) return null;
    return annualData.monthlySummary.reduce((worst, m) =>
      (m.percentage < worst.percentage) ? m : worst, annualData.monthlySummary[0]);
  }, [annualData]);

  useEffect(() => {
    if (!stats) return;
    const t = setTimeout(() => setAnimatedPct(overallPct), 200);
    return () => clearTimeout(t);
  }, [overallPct, stats]);

  const statusLabel =
    overallPct >= 75 ? 'Saludable'
      : overallPct >= 50 ? 'Moderado'
        : 'En riesgo';

  const statusColor = overallPct >= 75
    ? { text: T.badgeGreenTxt, bg: T.badgeGreenBg, gradient: 'linear-gradient(90deg, #10b981, #34d399)' }
    : overallPct >= 50
      ? { text: T.badgeYellowTxt, bg: T.badgeYellowBg, gradient: 'linear-gradient(90deg, #f59e0b, #fbbf24)' }
      : { text: T.badgeRedTxt, bg: T.badgeRedBg, gradient: 'linear-gradient(90deg, #ef4444, #f87171)' };

  const handleGeneratePDF = async () => {
    if (!stats) return;
    setGeneratingPDF(true);
    try {
      await generateAttendancePDF(stats, cellName);
      logUserAction?.('generate_pdf', { cellId, month: selectedMonth, year: selectedYear });
    } catch (err) {
      console.error('Error generating PDF:', err);
    } finally {
      setGeneratingPDF(false);
    }
  };

  const handleReload = () => {
    if (selectedMonth === 0) {
      loadAnnualStats(selectedYear);
    } else {
      loadStats(selectedMonth, selectedYear);
    }
  };

  const getRowStatusColor = (pct) => {
    if (pct >= 75) return { text: T.badgeGreenTxt, bg: T.badgeGreenBg };
    if (pct >= 50) return { text: T.badgeYellowTxt, bg: T.badgeYellowBg };
    return { text: T.badgeRedTxt, bg: T.badgeRedBg };
  };

  const subtitleLabel = isAnnualView
    ? `Resumen anual — ${selectedYear}`
    : `${MONTH_NAMES[selectedMonth - 1]} ${selectedYear}`;

  if (!isOpen) return null;

  const selectStyle = {
    backgroundColor: T.bgSecondary,
    color: T.text,
    borderColor: T.border,
  };

  const inputFocusColor = '#3b82f6';

  const renderMiniBar = (pct) => {
    const color = pct >= 75 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444';
    return (
      <div className="cas-mini-bar" style={{ background: T.trackBg }}>
        <div
          className="cas-mini-bar__fill"
          style={{ width: `${Math.min(pct, 100)}%`, background: color }}
        />
      </div>
    );
  };

  // ── Is the whole modal still loading initial data? ─────────────────────────
  const isInitialLoading = periodsLoading && !periodsLoaded;

  return (
    <>
      <div className="cas-overlay" onClick={onClose} />

      <div className="cas-modal">
        <div
          className="cas-modal__container"
          style={{ backgroundColor: T.bg, color: T.text }}
        >

          {isMobile && (
            <div className="cas-modal__handle" style={{ background: T.handleBg }} />
          )}

          {/* ── HEADER ── */}
          <div className="cas-modal__header" style={{ borderBottomColor: T.border }}>
            <div className="cas-modal__header-left">
              <h2 className="cas-modal__title" style={{ color: T.text }}>
                📊 Estadísticas — {cellName}
              </h2>
              <div className="cas-modal__subtitle-row">
                <span className="cas-modal__subtitle" style={{ color: T.textSub }}>
                  {subtitleLabel}
                </span>
                {isAnnualView && (
                  <span
                    className="cas-annual-badge"
                    style={{ backgroundColor: T.annualBadgeBg, color: T.annualBadgeTxt }}
                  >
                    📅 Anual
                  </span>
                )}
              </div>
            </div>

            <div className="cas-modal__actions">
              <button
                className="cas-btn-icon"
                onClick={handleReload}
                title="Recargar"
                disabled={loading || isInitialLoading}
                style={{ color: T.text }}
              >
                <span className={loading ? 'cas-spin' : ''}>🔄</span>
              </button>
              <button
                className="cas-btn-icon"
                disabled={!stats || generatingPDF}
                onClick={handleGeneratePDF}
                title="Descargar PDF"
                style={{ color: T.text }}
              >
                📄
              </button>
              <button
                className="cas-btn-icon cas-btn-close"
                onClick={onClose}
                style={{ color: T.textSub }}
              >
                ✕
              </button>
            </div>
          </div>

          {/* ── CONTENT ── */}
          <div className="cas-modal__content" ref={statsScrollRef}>

            {/* ── Filters ── */}
            <div className="cas-filters">
              <div className="cas-filter-group">
                <label style={{ color: T.textSub }}>Mes</label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="cas-select"
                  style={selectStyle}
                  disabled={isInitialLoading}
                >
                  <option value={0}>📅 Todo el año</option>
                  {displayMonths.map(m => (
                    <option key={m} value={m}>{MONTH_NAMES[m - 1]}</option>
                  ))}
                </select>
              </div>
              <div className="cas-filter-group">
                <label style={{ color: T.textSub }}>Año</label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="cas-select"
                  style={selectStyle}
                  disabled={isInitialLoading}
                >
                  {displayYears.map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* ── Available periods info ── */}
            {availablePeriods && !loading && !isInitialLoading && (
              <div className="cas-periods-info" style={{ color: T.textSub }}>
                📊 {availablePeriods.years.length} {availablePeriods.years.length === 1 ? 'año' : 'años'} con datos
                {displayMonths.length < 12 && selectedMonth !== 0 && (
                  <> · {displayMonths.length} {displayMonths.length === 1 ? 'mes' : 'meses'} en {selectedYear}</>
                )}
              </div>
            )}

            {/* ── Loading ── */}
            {(loading || isInitialLoading) && (
              <div className="cas-loading" style={{ color: T.textSub }}>
                <div
                  className="cas-loading__spinner"
                  style={{ borderColor: T.border, borderTopColor: inputFocusColor }}
                />
                <span>
                  {isInitialLoading
                    ? 'Consultando periodos disponibles…'
                    : isAnnualView
                      ? 'Cargando resumen anual…'
                      : 'Cargando estadísticas…'
                  }
                </span>
              </div>
            )}

            {/* ── Error ── */}
            {error && (
              <div
                className="cas-error"
                style={{ backgroundColor: T.errorBg, color: T.errorText }}
              >
                <span>⚠️</span> {error}
              </div>
            )}

            {/* ── No data for this period ── */}
            {!loading && !isInitialLoading && !error && periodsLoaded && !stats && (
              <div className="cas-empty" style={{ color: T.textSub }}>
                <span style={{ fontSize: '2.5rem' }}>📭</span>
                <p style={{ fontWeight: 600, color: T.text }}>Sin datos</p>
                <p>
                  No se encontraron registros de asistencia
                  {isAnnualView
                    ? ` para el año ${selectedYear}`
                    : ` en ${MONTH_NAMES[selectedMonth - 1]} ${selectedYear}`
                  }.
                </p>
              </div>
            )}

            {!loading && !isInitialLoading && stats && (
              <>
                {/* ── KPI GRID ── */}
                <div className="cas-kpi-grid">
                  {[
                    { icon: '📅', value: totalMeetings,                 label: isAnnualView ? 'Sesiones/Año' : 'Sesiones',     iconBg: T.badgeBlueBg },
                    { icon: '✅', value: totalPresent,                  label: 'Presentes',     iconBg: T.badgeGreenBg },
                    { icon: '❌', value: totalAbsent,                   label: 'Ausentes',      iconBg: T.badgeRedBg },
                    { icon: '📋', value: totalJustified,                label: 'Justificados',  iconBg: T.badgeYellowBg },
                    { icon: '👥', value: Math.round(averageAttendance), label: 'Promedio/Ses.', iconBg: T.badgePurpleBg },
                    { icon: '📊', value: `${overallPct}%`,             label: '% Global',      iconBg: T.badgeGreenBg },
                  ].map((kpi, i) => (
                    <div
                      key={i}
                      className="cas-kpi-card"
                      style={{ backgroundColor: T.cardBg }}
                    >
                      <div className="cas-kpi-card__icon" style={{ background: kpi.iconBg }}>
                        {kpi.icon}
                      </div>
                      <span className="cas-kpi-card__value" style={{ color: T.text }}>
                        {kpi.value}
                      </span>
                      <small className="cas-kpi-card__label" style={{ color: T.textSub }}>
                        {kpi.label}
                      </small>
                    </div>
                  ))}
                </div>

                {/* ── PROGRESS BAR ── */}
                <div
                  className="cas-progress-section"
                  style={{ backgroundColor: T.cardBg, borderColor: T.border }}
                >
                  <div className="cas-progress-header">
                    <span className="cas-progress-title" style={{ color: T.text }}>
                      {isAnnualView ? 'Asistencia global del año' : 'Asistencia global del mes'}
                    </span>
                    <span className="cas-progress-pct" style={{ color: statusColor.text }}>
                      {animatedPct}%
                    </span>
                  </div>
                  <div className="cas-progress-bar" style={{ background: T.trackBg }}>
                    <div
                      className="cas-progress-bar__fill"
                      style={{ width: `${animatedPct}%`, background: statusColor.gradient }}
                    />
                  </div>
                  <span className="cas-progress-detail" style={{ color: T.textSub }}>
                    {totalPresent} presentes de {totalRegistered} registros en {totalMeetings} sesiones
                    {isAnnualView && annualData?.monthsWithData > 0 && (
                      <> ({annualData.monthsWithData} {annualData.monthsWithData === 1 ? 'mes' : 'meses'} con datos)</>
                    )}
                  </span>
                  <span
                    className="cas-progress-badge"
                    style={{ backgroundColor: statusColor.bg, color: statusColor.text }}
                  >
                    {statusLabel}
                  </span>
                </div>

                {/* ── BEST / WORST MONTHS (annual) ── */}
                {isAnnualView && annualData?.monthlySummary?.length > 1 && bestMonth && worstMonth && (
                  <div className="cas-highlights">
                    <div
                      className="cas-highlight-card"
                      style={{ backgroundColor: T.highlightGreenBg, borderColor: T.highlightGreenBdr }}
                    >
                      <div className="cas-highlight-card__header">
                        <span className="cas-highlight-card__icon">🏆</span>
                        <span className="cas-highlight-card__title" style={{ color: T.badgeGreenTxt }}>
                          Mejor mes
                        </span>
                      </div>
                      <div className="cas-highlight-card__date" style={{ color: T.textSub }}>
                        {bestMonth.monthName} {selectedYear}
                      </div>
                      <div className="cas-highlight-card__stat" style={{ color: T.text }}>
                        {bestMonth.totalPresent}/{bestMonth.totalRegistered}
                        <span className="cas-highlight-card__pct">({bestMonth.percentage}%)</span>
                      </div>
                      <div className="cas-highlight-card__meta" style={{ color: T.textSub }}>
                        {bestMonth.totalMeetings} {bestMonth.totalMeetings === 1 ? 'sesión' : 'sesiones'}
                      </div>
                    </div>

                    <div
                      className="cas-highlight-card"
                      style={{ backgroundColor: T.highlightYellowBg, borderColor: T.highlightYellowBdr }}
                    >
                      <div className="cas-highlight-card__header">
                        <span className="cas-highlight-card__icon">⚠️</span>
                        <span className="cas-highlight-card__title" style={{ color: T.badgeYellowTxt }}>
                          Mes más bajo
                        </span>
                      </div>
                      <div className="cas-highlight-card__date" style={{ color: T.textSub }}>
                        {worstMonth.monthName} {selectedYear}
                      </div>
                      <div className="cas-highlight-card__stat" style={{ color: T.text }}>
                        {worstMonth.totalPresent}/{worstMonth.totalRegistered}
                        <span className="cas-highlight-card__pct">({worstMonth.percentage}%)</span>
                      </div>
                      <div className="cas-highlight-card__meta" style={{ color: T.textSub }}>
                        {worstMonth.totalMeetings} {worstMonth.totalMeetings === 1 ? 'sesión' : 'sesiones'}
                      </div>
                    </div>
                  </div>
                )}

                {/* ── BEST / WORST SESSIONS (monthly) ── */}
                {!isAnnualView && dailyStats.length > 1 && bestSession && worstSession && (
                  <div className="cas-highlights">
                    <div
                      className="cas-highlight-card"
                      style={{ backgroundColor: T.highlightGreenBg, borderColor: T.highlightGreenBdr }}
                    >
                      <div className="cas-highlight-card__header">
                        <span className="cas-highlight-card__icon">🏆</span>
                        <span className="cas-highlight-card__title" style={{ color: T.badgeGreenTxt }}>
                          Mejor sesión
                        </span>
                      </div>
                      <div className="cas-highlight-card__date" style={{ color: T.textSub }}>
                        {formatDateLong(bestSession.date)}
                      </div>
                      <div className="cas-highlight-card__stat" style={{ color: T.text }}>
                        {bestSession.present}/{bestSession.total}
                        <span className="cas-highlight-card__pct">({Math.round(bestSession.percentage)}%)</span>
                      </div>
                    </div>

                    <div
                      className="cas-highlight-card"
                      style={{ backgroundColor: T.highlightYellowBg, borderColor: T.highlightYellowBdr }}
                    >
                      <div className="cas-highlight-card__header">
                        <span className="cas-highlight-card__icon">⚠️</span>
                        <span className="cas-highlight-card__title" style={{ color: T.badgeYellowTxt }}>
                          Sesión más baja
                        </span>
                      </div>
                      <div className="cas-highlight-card__date" style={{ color: T.textSub }}>
                        {formatDateLong(worstSession.date)}
                      </div>
                      <div className="cas-highlight-card__stat" style={{ color: T.text }}>
                        {worstSession.present}/{worstSession.total}
                        <span className="cas-highlight-card__pct">({Math.round(worstSession.percentage)}%)</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── ANNUAL: Monthly breakdown table ── */}
                {isAnnualView && annualData?.monthlySummary?.length > 0 && (
                  <div className="cas-detail-section">
                    <h3 className="cas-detail-title" style={{ color: T.text }}>
                      📅 Desglose por mes
                    </h3>
                    <div className="cas-detail-table-wrap" style={{ borderColor: T.border }}>
                      <table className="cas-detail-table">
                        <thead>
                          <tr style={{ backgroundColor: T.bgSecondary }}>
                            {['Mes', 'Ses.', 'Pres.', 'Aus.', 'Just.', '%', ''].map((h, hi) => (
                              <th key={hi} style={{ color: T.textSub, borderBottomColor: T.border }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {annualData.monthlySummary.map((m, i) => {
                            const rowColor = getRowStatusColor(m.percentage);
                            return (
                              <tr
                                key={m.month}
                                className="cas-annual-row"
                                style={{
                                  backgroundColor: i % 2 === 0 ? T.cardBgAlt : T.bgSecondary,
                                  cursor: 'pointer',
                                }}
                                onClick={() => setSelectedMonth(m.month)}
                                title={`Ver detalle de ${m.monthName}`}
                              >
                                <td className="cas-detail-table__date" style={{ color: T.text, borderBottomColor: T.border, fontWeight: 600 }}>
                                  {m.monthShort}
                                </td>
                                <td style={{ color: T.textSub, borderBottomColor: T.border }}>{m.totalMeetings}</td>
                                <td style={{ borderBottomColor: T.border }}>
                                  <span className="cas-badge" style={{ backgroundColor: T.badgeGreenBg, color: T.badgeGreenTxt }}>{m.totalPresent}</span>
                                </td>
                                <td style={{ borderBottomColor: T.border }}>
                                  <span className="cas-badge" style={{ backgroundColor: T.badgeRedBg, color: T.badgeRedTxt }}>{m.totalAbsent}</span>
                                </td>
                                <td style={{ borderBottomColor: T.border }}>
                                  <span className="cas-badge" style={{ backgroundColor: T.badgeYellowBg, color: T.badgeYellowTxt }}>{m.totalJustified}</span>
                                </td>
                                <td style={{ borderBottomColor: T.border }}>
                                  <span className="cas-pct-pill" style={{ backgroundColor: rowColor.bg, color: rowColor.text }}>{m.percentage}%</span>
                                </td>
                                <td style={{ borderBottomColor: T.border, width: '60px' }}>
                                  {renderMiniBar(m.percentage)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <p className="cas-annual-hint" style={{ color: T.textSub }}>
                      Toca un mes para ver su detalle por sesión
                    </p>
                  </div>
                )}

                {isAnnualView && annualData && annualData.monthlySummary?.length === 0 && (
                  <div className="cas-empty" style={{ color: T.textSub }}>
                    <span style={{ fontSize: '2rem' }}>📭</span>
                    <p>No se encontraron datos para el año {selectedYear}</p>
                  </div>
                )}

                {/* ── MONTHLY: Session detail table ── */}
                {!isAnnualView && dailyStats.length > 0 && (
                  <div className="cas-detail-section">
                    <h3 className="cas-detail-title" style={{ color: T.text }}>
                      📋 Detalle por sesión
                    </h3>
                    <div className="cas-detail-table-wrap" style={{ borderColor: T.border }}>
                      <table className="cas-detail-table">
                        <thead>
                          <tr style={{ backgroundColor: T.bgSecondary }}>
                            {['Fecha', 'Pres.', 'Aus.', 'Just.', 'Total', '%'].map(h => (
                              <th key={h} style={{ color: T.textSub, borderBottomColor: T.border }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {dailyStats.map((d, i) => {
                            const pct = Math.round(d.percentage);
                            const rowColor = getRowStatusColor(pct);
                            return (
                              <tr key={i} style={{ backgroundColor: i % 2 === 0 ? T.cardBgAlt : T.bgSecondary }}>
                                <td className="cas-detail-table__date" style={{ color: T.text, borderBottomColor: T.border }}>
                                  {formatDateShort(d.date)}
                                </td>
                                <td style={{ borderBottomColor: T.border }}>
                                  <span className="cas-badge" style={{ backgroundColor: T.badgeGreenBg, color: T.badgeGreenTxt }}>{d.present ?? '—'}</span>
                                </td>
                                <td style={{ borderBottomColor: T.border }}>
                                  <span className="cas-badge" style={{ backgroundColor: T.badgeRedBg, color: T.badgeRedTxt }}>{d.absent ?? '—'}</span>
                                </td>
                                <td style={{ borderBottomColor: T.border }}>
                                  <span className="cas-badge" style={{ backgroundColor: T.badgeYellowBg, color: T.badgeYellowTxt }}>{d.justified ?? '—'}</span>
                                </td>
                                <td style={{ color: T.text, borderBottomColor: T.border }}>{d.total ?? '—'}</td>
                                <td style={{ borderBottomColor: T.border }}>
                                  <span className="cas-pct-pill" style={{ backgroundColor: rowColor.bg, color: rowColor.text }}>{pct}%</span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* ── FOOTER ── */}
          {!isMobile && (
            <div className="cas-modal__footer" style={{ borderTopColor: T.border }}>
              {!isAnnualView && (
                <button
                  className="cas-btn-secondary"
                  onClick={() => setSelectedMonth(0)}
                  style={{ borderColor: T.border, color: T.badgeBlueTxt, backgroundColor: T.badgeBlueBg, marginRight: 'auto' }}
                >
                  📅 Ver año completo
                </button>
              )}
              <button
                className="cas-btn-secondary"
                onClick={onClose}
                style={{ borderColor: T.border, color: T.text, backgroundColor: T.bgSecondary }}
              >
                Cerrar
              </button>
            </div>
          )}

          {isMobile && !isAnnualView && (
            <div className="cas-mobile-annual-btn-wrap">
              <button
                className="cas-mobile-annual-btn"
                onClick={() => setSelectedMonth(0)}
                style={{ backgroundColor: T.badgeBlueBg, color: T.badgeBlueTxt, borderColor: T.border }}
              >
                📅 Ver año completo
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default CellAttendanceStatsModal;