// ============================================
// CellAttendanceStatsModal.jsx — v7 MERGED
// v6 completo + UI moderna + soporte global
// ============================================

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  BarChart3,
  Calendar,
  Users,
  AlertCircle,
  RefreshCw,
  X,
  Activity,
  Star,
  Home,
  CheckCircle,
  XCircle,
  Clock,
  Award,
  FileText,
  Zap,
} from "lucide-react";
import { generateAttendancePDF } from "../services/attendancePdfGenerator";

// ─── Constants ────────────────────────────────────────────────────────────────
const MONTH_NAMES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];
const MONTH_NAMES_SHORT = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
];

const SCROLLBAR_STYLES = `
  .custom-scrollbar::-webkit-scrollbar {
    width: 6px;
  }
  .custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: #e2e8f0;
    border-radius: 10px;
  }
  .dark .custom-scrollbar::-webkit-scrollbar-thumb {
    background: #334155;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: #cbd5e1;
  }
  .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: #475569;
  }
  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }
  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
`;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatDateShort = (dateStr) => {
  if (!dateStr) return "";
  try {
    const [year, month, day] = dateStr.split("-").map(Number);
    return new Date(year, month - 1, day, 12).toLocaleDateString("es-CO", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  } catch {
    return dateStr;
  }
};

const formatDateLong = (dateStr) => {
  if (!dateStr) return "";
  try {
    const [year, month, day] = dateStr.split("-").map(Number);
    return new Date(year, month - 1, day, 12).toLocaleDateString("es-CO", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  } catch {
    return dateStr;
  }
};

const getStatusConfig = (pct) => {
  if (pct >= 75)
    return {
      label: "Saludable",
      tw: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10",
      bar: "from-emerald-500 to-teal-400",
      dot: "bg-emerald-500",
    };
  if (pct >= 50)
    return {
      label: "Moderado",
      tw: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10",
      bar: "from-amber-500 to-yellow-400",
      dot: "bg-amber-500",
    };
  return {
    label: "En riesgo",
    tw: "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10",
    bar: "from-rose-500 to-pink-400",
    dot: "bg-rose-500",
  };
};

// ─── Sub-components ───────────────────────────────────────────────────────────
const KPICard = ({ icon, label, value, colorClass, iconBgClass }) => (
  <div className="group flex flex-col gap-3 bg-white/70 dark:bg-slate-800/40 backdrop-blur-md rounded-2xl p-5 border border-slate-100 dark:border-white/5 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300">
    <div className="flex items-center justify-between">
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconBgClass} shadow-inner`}
      >
        {icon}
      </div>
      <div className="flex h-1.5 w-1.5 rounded-full bg-slate-200 dark:bg-slate-700 group-hover:bg-indigo-500 transition-colors" />
    </div>
    <div className="space-y-1">
      <div className="text-2xl font-black text-slate-800 dark:text-white tracking-tight leading-none">
        {value}
      </div>
      <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none">
        {label}
      </div>
    </div>
  </div>
);

const HighlightCard = ({
  icon,
  title,
  titleColor,
  date,
  stat,
  pct,
  meta,
  accentBg,
  accentBorder,
}) => (
  <div
    className={`flex-1 min-w-[160px] rounded-2xl p-5 border shadow-sm ${accentBg} ${accentBorder} space-y-3 hover:shadow-md transition-all`}
  >
    <div className="flex items-center gap-2">
      <div className="p-1.5 rounded-lg bg-white/50 dark:bg-black/20">
        {icon}
      </div>
      <span
        className={`text-[11px] font-black uppercase tracking-wider ${titleColor}`}
      >
        {title}
      </span>
    </div>
    <div>
      <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mb-1">
        {date}
      </div>
      <div className="text-xl font-black text-slate-800 dark:text-white flex items-baseline gap-1">
        {stat}
        <span className={`text-xs font-bold ${titleColor}`}>({pct}%)</span>
      </div>
      {meta && (
        <div className="text-[10px] text-slate-400 mt-1 italic font-medium">
          {meta}
        </div>
      )}
    </div>
  </div>
);

const MiniBar = ({ pct }) => {
  const color =
    pct >= 75 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-rose-500";
  return (
    <div className="w-14 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
      <div
        className={`h-full rounded-full ${color}`}
        style={{ width: `${Math.min(pct, 100)}%` }}
      />
    </div>
  );
};

const Badge = ({ value, colorClass }) => (
  <span
    className={`inline-flex items-center justify-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-tight shadow-sm ${colorClass}`}
  >
    {value}
  </span>
);

// ─── Main Component ───────────────────────────────────────────────────────────
const CellAttendanceStatsModal = ({
  isOpen,
  onClose,
  cellId,
  cellName,
  initialMonth = new Date().getMonth() + 1,
  initialYear = new Date().getFullYear(),
  apiService,
  theme = "light",
  isMobile,
  onRefresh,
  logUserAction,
  onOpenOverview,
}) => {
  // ── State ──────────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(initialMonth);
  const [selectedYear, setSelectedYear] = useState(initialYear);
  const [annualData, setAnnualData] = useState(null);
  const [animatedPct, setAnimatedPct] = useState(0);
  const [selectedSession, setSelectedSession] = useState(null); // fecha ISO string | null
  const [sessionBreakdown, setSessionBreakdown] = useState([]); // por célula
  const [loadingBreakdown, setLoadingBreakdown] = useState(false);

  const [availablePeriods, setAvailablePeriods] = useState(null);
  const [periodsLoading, setPeriodsLoading] = useState(false);
  const [periodsLoaded, setPeriodsLoaded] = useState(false);

  // Bloqueo de scroll del body al abrir el modal
  useEffect(() => {
    if (isOpen) {
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [isOpen]);

  const isAnnualView = selectedMonth === 0;
  const isGlobal = !cellId || cellId === "" || cellId === "global";

  // ── Available periods ──────────────────────────────────────────────────────
  const loadAvailablePeriods = useCallback(async () => {
    if (!cellId || isGlobal || periodsLoaded) return;
    setPeriodsLoading(true);
    try {
      if (typeof apiService.getCellAttendanceAvailablePeriods === "function") {
        const data = await apiService.getCellAttendanceAvailablePeriods(cellId);
        if (data?.years && data?.months) {
          setAvailablePeriods({
            years: data.years.sort((a, b) => b - a),
            months: data.months,
          });
          setPeriodsLoaded(true);
          setPeriodsLoading(false);
          return;
        }
      }

      if (typeof apiService.getCellAttendanceRecords === "function") {
        const records = await apiService.getCellAttendanceRecords(cellId);
        if (Array.isArray(records) && records.length > 0) {
          const periodsMap = {};
          records.forEach((r) => {
            const dateStr = r.date || r.meetingDate || r.createdAt;
            if (!dateStr) return;
            const [y, m] = dateStr.split("-").map(Number);
            if (!y || !m) return;
            if (!periodsMap[y]) periodsMap[y] = new Set();
            periodsMap[y].add(m);
          });
          const years = Object.keys(periodsMap)
            .map(Number)
            .sort((a, b) => b - a);
          const months = {};
          years.forEach((y) => {
            months[y] = Array.from(periodsMap[y]).sort((a, b) => a - b);
          });
          setAvailablePeriods({ years, months });
          setPeriodsLoaded(true);
          setPeriodsLoading(false);
          return;
        }
      }

      const currentYear = new Date().getFullYear();
      const periodsMap = {};
      await Promise.all(
        [currentYear, currentYear - 1, currentYear - 2].map(async (year) => {
          const results = await Promise.all(
            Array.from({ length: 12 }, (_, i) =>
              apiService
                .getCellAttendanceMonthlyStats(cellId, year, i + 1)
                .then((d) => {
                  const has =
                    d &&
                    (d.totalMeetings > 0 ||
                      d.totalRegistered > 0 ||
                      (Array.isArray(d.dailyStats) && d.dailyStats.length > 0));
                  return has ? i + 1 : null;
                })
                .catch(() => null),
            ),
          );
          const valid = results.filter(Boolean);
          if (valid.length > 0) periodsMap[year] = valid.sort((a, b) => a - b);
        }),
      );
      const years = Object.keys(periodsMap)
        .map(Number)
        .sort((a, b) => b - a);
      setAvailablePeriods(
        years.length > 0 ? { years, months: periodsMap } : null,
      );
    } catch (err) {
      console.warn("[CellAttendanceStats] Could not load periods:", err);
      setAvailablePeriods(null);
    } finally {
      setPeriodsLoaded(true);
      setPeriodsLoading(false);
    }
  }, [cellId, isGlobal, periodsLoaded, apiService]);

  const displayYears = useMemo(() => {
    if (availablePeriods?.years?.length) return availablePeriods.years;
    const cy = new Date().getFullYear();
    return Array.from({ length: 13 }, (_, i) => cy + 2 - i);
  }, [availablePeriods]);

  const displayMonths = useMemo(() => {
    if (availablePeriods?.months?.[selectedYear])
      return availablePeriods.months[selectedYear];
    return Array.from({ length: 12 }, (_, i) => i + 1);
  }, [availablePeriods, selectedYear]);

  useEffect(() => {
    if (!availablePeriods || selectedMonth === 0) return;
    const monthsForYear = availablePeriods.months?.[selectedYear];
    if (!monthsForYear) return;
    if (!monthsForYear.includes(selectedMonth))
      setSelectedMonth(monthsForYear[monthsForYear.length - 1] || 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYear, availablePeriods]);

  // ── Load stats: single month ───────────────────────────────────────────────
  const loadStats = useCallback(
    async (month, year) => {
      if (!cellId && !isGlobal) return;
      setLoading(true);
      setError("");
      setStats(null);
      setAnnualData(null);
      try {
        if (isGlobal) {
          const globalTotals = await apiService.getCellAttendanceGlobalStats();
          const monthlyData = await apiService.getMonthAttendances(year, month);
          const dateMap = {};
          if (monthlyData?.cells) {
            Object.values(monthlyData.cells).forEach((attendances) => {
              if (!Array.isArray(attendances)) return;
              attendances.forEach((att) => {
                const date = att.attendanceDate;
                if (!dateMap[date]) {
                  dateMap[date] = {
                    date,
                    present: 0,
                    total: 0,
                    justified: 0,
                    newParticipants: 0,
                    totalAttendees: 0,
                  };
                }
                const reg = att.totalRegistered ?? att.total ?? 1;
                const pre =
                  typeof att.totalPresent === "number"
                    ? att.totalPresent
                    : typeof att.present === "number"
                      ? att.present
                      : att.present
                        ? 1
                        : 0;
                // DESPUÉS — agregar justifiedAbsence como fallback
                const jus =
                  typeof att.totalJustified === "number"
                    ? att.totalJustified
                    : typeof att.justified === "number"
                      ? att.justified
                      : att.justifiedAbsence
                        ? 1
                        : att.justified
                          ? 1
                          : 0;
                dateMap[date].total += reg;
                dateMap[date].present += pre;
                dateMap[date].justified += jus;
              });
            });
          }

          let dailyStats = Object.values(dateMap)
            .sort((a, b) => a.date.localeCompare(b.date))
            .map((d) => ({
              ...d,
              percentage: d.total > 0 ? (d.present * 100) / d.total : 0,
              absent: Math.max(0, d.total - d.present - d.justified),
            }));

          // ── ENRIQUECER newParticipants y totalAttendees por fecha ──────────────
          // getGlobalSummaryByDate ya existe y devuelve datos de AttendanceSessionData
          if (dailyStats.length > 0) {
            const sessionResults = await Promise.allSettled(
              dailyStats.map((d) => apiService.getGlobalSummaryByDate(d.date)),
            );
            sessionResults.forEach((result, idx) => {
              if (
                result.status === "fulfilled" &&
                Array.isArray(result.value)
              ) {
                const rows = result.value;
                dailyStats[idx].newParticipants = rows.reduce(
                  (sum, r) => sum + (r.newParticipants ?? 0),
                  0,
                );
                dailyStats[idx].totalAttendees =
                  rows.reduce((sum, r) => sum + (r.totalAttendees ?? 0), 0) ||
                  dailyStats[idx].present + dailyStats[idx].newParticipants; // fallback si no hay sessionData
              }
            });
          }
          // ─────────────────────────────────────────────────────────────────────

          // Calcular totales reales desde dailyStats (después del enriquecimiento)
          const totalJustifiedCalc = dailyStats.reduce(
            (sum, d) => sum + (d.justified || 0),
            0,
          );

          // Promedio de presentes por sesión (solo sesiones con datos reales)
          const sessionsWithData = dailyStats.filter((d) => d.total > 0);
          const avgAttendanceCalc =
            sessionsWithData.length > 0
              ? Math.round(
                  sessionsWithData.reduce(
                    (sum, d) => sum + (d.present || 0),
                    0,
                  ) / sessionsWithData.length,
                )
              : 0;

          setStats({
            ...globalTotals,
            totalRegistered: globalTotals.totalMembers || 0,
            totalPresent: globalTotals.monthlyPresent || 0,
            totalMeetings: dailyStats.length,
            totalJustified: totalJustifiedCalc,
            averageAttendance: avgAttendanceCalc,
            totalNewParticipants: dailyStats.reduce(
              (acc, d) => acc + (d.newParticipants || 0),
              0,
            ),
            dailyStats,
            isAggregated: true,
          });
        } else {
          const data = await apiService.getCellAttendanceMonthlyStats(
            cellId,
            year,
            month,
          );
          if (data?.dailyStats) {
            data.dailyStats = data.dailyStats.map((d) => ({
              ...d,
              totalAttendees:
                d.totalAttendees ?? (d.present || 0) + (d.newParticipants || 0),
            }));
          }
          setStats(data);
        }
        logUserAction?.(
          isGlobal ? "view_global_aggregated" : "view_cell_stats",
          { cellId, month, year },
        );
      } catch (err) {
        setError(err.message || "Error al cargar estadísticas");
      } finally {
        setLoading(false);
      }
    },
    [cellId, isGlobal, apiService, logUserAction],
  );

  // ── Load stats: full year ──────────────────────────────────────────────────
  const loadAnnualStats = useCallback(
    async (year) => {
      if (!cellId) return;
      setLoading(true);
      setError("");
      setStats(null);
      setAnnualData(null);
      try {
        const monthsToFetch = availablePeriods?.months?.[year]
          ? availablePeriods.months[year]
          : Array.from({ length: 12 }, (_, i) => i + 1);

        const results = await Promise.all(
          monthsToFetch.map((m) =>
            apiService
              .getCellAttendanceMonthlyStats(cellId, year, m)
              .then((data) => ({ month: m, data }))
              .catch(() => ({ month: m, data: null })),
          ),
        );

        const monthlySummary = [];
        let aggMeetings = 0,
          aggPresent = 0,
          aggRegistered = 0,
          aggJustified = 0;
        let aggNewParticipants = 0,
          monthsWithData = 0,
          sumAvgAttendance = 0;

        results.forEach(({ month, data }) => {
          if (!data || (data.totalMeetings === 0 && data.totalRegistered === 0))
            return;
          const {
            totalMeetings = 0,
            totalPresent = 0,
            totalRegistered = 0,
            totalJustified = 0,
            averageAttendance = 0,
            totalNewParticipants = 0,
          } = data;
          monthsWithData++;
          aggMeetings += totalMeetings;
          aggPresent += totalPresent;
          aggRegistered += totalRegistered;
          aggJustified += totalJustified;
          aggNewParticipants += totalNewParticipants;
          sumAvgAttendance += averageAttendance;
          const pct =
            totalRegistered > 0
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
            percentage: pct,
            totalNewParticipants,
            totalAttendees: (totalPresent || 0) + (totalNewParticipants || 0),
          });
        });
        monthlySummary.sort((a, b) => a.month - b.month);

        setStats({
          totalMeetings: aggMeetings,
          totalPresent: aggPresent,
          totalRegistered: aggRegistered,
          totalJustified: aggJustified,
          averageAttendance:
            monthsWithData > 0
              ? Math.round(sumAvgAttendance / monthsWithData)
              : 0,
          dailyStats: results.flatMap((r) => r.data?.dailyStats || []),
          monthsWithData,
          totalNewParticipants: aggNewParticipants,
        });
        setAnnualData({ monthlySummary, year });
        logUserAction?.("view_cell_stats_annual", { cellId, year });
      } catch (err) {
        setError(err.message || "Error al cargar estadísticas anuales");
      } finally {
        setLoading(false);
      }
    },
    [cellId, availablePeriods, apiService, logUserAction],
  );

  // ── Effects ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (isOpen && cellId) loadAvailablePeriods();
  }, [isOpen, cellId, loadAvailablePeriods]);

  useEffect(() => {
    if (!isOpen) {
      setPeriodsLoaded(false);
      setAvailablePeriods(null);
      setStats(null);
      setAnnualData(null);
      setError("");
      setSelectedSession(null);
      setSessionBreakdown([]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    setSelectedSession(null); // limpiar sesión al cambiar periodo
    setSessionBreakdown([]);
    if (isGlobal || periodsLoaded) {
      setAnimatedPct(0);
      if (selectedMonth === 0) loadAnnualStats(selectedYear);
      else loadStats(selectedMonth, selectedYear);
    }
  }, [
    isOpen,
    cellId,
    selectedMonth,
    selectedYear,
    periodsLoaded,
    isGlobal,
    loadStats,
    loadAnnualStats,
  ]);

  // ── Cargar desglose por célula al seleccionar una fecha (solo vista global) ──
  useEffect(() => {
    if (!isGlobal || !selectedSession) {
      setSessionBreakdown([]);
      return;
    }
    let cancelled = false;
    const fetchBreakdown = async () => {
      setLoadingBreakdown(true);
      try {
        // GET /api/v1/attendance-cell-group/summary/all-cells/date/{date}
        // Devuelve: [{ cellId, cellName, totalRegistered, totalPresent, totalJustified, totalAbsent, newParticipants }]
        const data = await apiService.getGlobalSummaryByDate(selectedSession);
        if (!cancelled) {
          const rows = Array.isArray(data) ? data : [];
          // Calcular % y ordenar de mayor a menor asistencia
          const enriched = rows
            .map((r) => ({
              ...r,
              totalAttendees:
                r.totalAttendees ??
                (r.totalPresent || 0) + (r.newParticipants || 0),
              percentage:
                r.totalRegistered > 0
                  ? Math.round((r.totalPresent / r.totalRegistered) * 100)
                  : 0,
            }))
            .sort((a, b) => b.percentage - a.percentage);
          setSessionBreakdown(enriched);
        }
      } catch (err) {
        console.error("❌ getGlobalSummaryByDate:", err);
        if (!cancelled) setSessionBreakdown([]);
      } finally {
        if (!cancelled) setLoadingBreakdown(false);
      }
    };
    fetchBreakdown();
    return () => {
      cancelled = true;
    };
  }, [isGlobal, selectedSession, apiService]);

  // ── Derived data ───────────────────────────────────────────────────────────
  const {
    totalMeetings = 0,
    totalPresent = 0,
    totalRegistered = 0,
    totalJustified = 0,
    averageAttendance = 0,
    dailyStats = [],
    totalNewParticipants = 0,
    totalAttendees: statsTotalAttendees = 0,
    totalCells = 0,
    monthlyAttendancePercentage = 0,
  } = stats || {};

  const totalAbsent = totalRegistered - totalPresent;
  const overallPct = isGlobal
    ? monthlyAttendancePercentage ||
      (totalRegistered > 0
        ? Math.round((totalPresent / totalRegistered) * 100)
        : 0)
    : totalRegistered > 0
      ? Math.round((totalPresent / totalRegistered) * 100)
      : 0;

  const safeDailyStats = useMemo(
    () => (Array.isArray(dailyStats) ? dailyStats : []),
    [dailyStats],
  );

  const monthlyNewParticipants = useMemo(() => {
    if (isAnnualView) return totalNewParticipants;
    return safeDailyStats.reduce((sum, d) => sum + (d.newParticipants || 0), 0);
  }, [safeDailyStats, isAnnualView, totalNewParticipants]);

  const monthlyTotalAttendees = useMemo(() => {
    if (isAnnualView) return statsTotalAttendees || 0;
    return safeDailyStats.reduce((sum, d) => sum + (d.totalAttendees || 0), 0);
  }, [safeDailyStats, isAnnualView, statsTotalAttendees]);

  const hasSessionData = useMemo(() => {
    if (isAnnualView) return totalNewParticipants > 0;
    return safeDailyStats.some(
      (d) => d.hasSessionData || d.newParticipants > 0,
    );
  }, [safeDailyStats, isAnnualView, totalNewParticipants]);

  const bestSession = useMemo(() => {
    if (!safeDailyStats.length) return null;
    return safeDailyStats.reduce(
      (b, d) => (d.percentage > b.percentage ? d : b),
      safeDailyStats[0],
    );
  }, [safeDailyStats]);

  const worstSession = useMemo(() => {
    if (!safeDailyStats.length) return null;
    return safeDailyStats.reduce(
      (w, d) => (d.percentage < w.percentage ? d : w),
      safeDailyStats[0],
    );
  }, [safeDailyStats]);

  const bestMonth = useMemo(
    () =>
      annualData?.monthlySummary?.length
        ? annualData.monthlySummary.reduce(
            (b, m) => (m.percentage > b.percentage ? m : b),
            annualData.monthlySummary[0],
          )
        : null,
    [annualData],
  );
  const worstMonth = useMemo(
    () =>
      annualData?.monthlySummary?.length
        ? annualData.monthlySummary.reduce(
            (w, m) => (m.percentage < w.percentage ? m : w),
            annualData.monthlySummary[0],
          )
        : null,
    [annualData],
  );

  // ── Sesión seleccionada ────────────────────────────────────────────────────
  // Si hay sesión activa, la tabla muestra solo esa fila;
  // los KPIs del encabezado reflejan esa sesión en lugar del mes completo.
  const visibleDailyStats = useMemo(() => {
    if (!selectedSession) return safeDailyStats;
    return safeDailyStats.filter((d) => d.date === selectedSession);
  }, [safeDailyStats, selectedSession]);

  const sessionStat = useMemo(() => {
    if (!selectedSession) return null;
    return safeDailyStats.find((d) => d.date === selectedSession) || null;
  }, [safeDailyStats, selectedSession]);

  useEffect(() => {
    if (!stats) return;
    const t = setTimeout(() => setAnimatedPct(overallPct), 200);
    return () => clearTimeout(t);
  }, [overallPct, stats]);

  const status = getStatusConfig(overallPct);
  const isInitialLoad = periodsLoading && !periodsLoaded;
  const subtitleLabel = isAnnualView
    ? `Resumen anual — ${selectedYear}`
    : `${MONTH_NAMES[selectedMonth - 1]} ${selectedYear}`;

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleGeneratePDF = async () => {
    if (!stats) return;
    setGeneratingPDF(true);
    try {
      await generateAttendancePDF(stats, cellName);
      logUserAction?.("generate_pdf", {
        cellId,
        month: selectedMonth,
        year: selectedYear,
      });
    } catch (err) {
      console.error("PDF error:", err);
    } finally {
      setGeneratingPDF(false);
    }
  };

  const handleGenerateOverviewPDF = () => {
    if (onOpenOverview) onOpenOverview();
  };

  const handleReload = () => {
    if (selectedMonth === 0) loadAnnualStats(selectedYear);
    else loadStats(selectedMonth, selectedYear);
  };

  if (!isOpen) return null;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{SCROLLBAR_STYLES}</style>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-[1000] bg-slate-900/60 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={`fixed z-[1100] bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-100 dark:border-white/10 shadow-2xl flex flex-col overflow-hidden transition-all duration-300
          ${
            isMobile
              ? "inset-x-0 bottom-0 rounded-t-[2.5rem] max-h-[94dvh]"
              : "inset-x-4 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 top-1/2 -translate-y-1/2 sm:w-full sm:max-w-4xl rounded-[2.5rem] max-h-[92vh]"
          }`}
      >
        {/* Mobile drag handle */}
        {isMobile && (
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
          </div>
        )}

        {/* ── HEADER ── */}
        <div className="flex items-start justify-between gap-4 px-8 pt-6 pb-4 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02]">
          <div className="space-y-1 min-w-0">
            <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-3 leading-tight">
              <span className="shrink-0 w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/25">
                <BarChart3 size={20} />
              </span>
              <span className="truncate tracking-tight">
                {isGlobal
                  ? "Estadísticas Globales"
                  : `Estadísticas — ${cellName}`}
              </span>
            </h2>
            <div className="flex items-center gap-2 pl-12">
              <span className="text-xs font-bold text-slate-400 dark:text-slate-500">
                {subtitleLabel}
              </span>
              {isAnnualView && (
                <span className="flex text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-500/20">
                  <Calendar size={16} /> Anual
                </span>
              )}
              {isGlobal && (
                <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-lg bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-100 dark:border-purple-500/20">
                  Agregado
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleReload}
              disabled={loading || isInitialLoad}
              title="Recargar"
              className="rounded-2xl flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 hover:shadow-sm border border-transparent hover:border-slate-200 dark:hover:border-white/10 transition-all disabled:opacity-40"
            >
              <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
            </button>
            <button
              onClick={handleGenerateOverviewPDF}
              disabled={!stats || generatingPDF || isAnnualView}
              title="Reporte Comparativo (PDF)"
              className="rounded-2xl flex items-center justify-center text-indigo-500 dark:text-indigo-400 hover:bg-white dark:hover:bg-slate-800 hover:shadow-sm border border-transparent hover:border-slate-200 dark:hover:border-white/10 transition-all disabled:opacity-40"
            >
              <Zap size={18} />
            </button>
            <button
              onClick={handleGeneratePDF}
              disabled={!stats || generatingPDF}
              title="Descargar PDF"
              className="rounded-2xl flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 hover:shadow-sm border border-transparent hover:border-slate-200 dark:hover:border-white/10 transition-all disabled:opacity-40"
            >
              <FileText size={18} />
            </button>
            <button
              onClick={onClose}
              className="rounded-2xl flex items-center justify-center text-slate-400 dark:text-slate-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 hover:text-rose-500 transition-all"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-x-6 gap-y-4 px-8 py-5 border-b border-slate-100 dark:border-white/5 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
          <div className="flex flex-col gap-1 shrink-0">
            <label className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
              <Calendar size={16} />
              Período de consulta
            </label>
            <div className="flex items-center gap-2">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                disabled={isInitialLoad}
                className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-[0.8rem] px-4 py-2 text-sm font-black outline-none border-2 border-transparent focus:border-indigo-500 transition-all cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700"
              >
                {!isGlobal && <option value={0}> Todo el año</option>}
                {displayMonths.map((m) => (
                  <option key={m} value={m}>
                    {MONTH_NAMES[m - 1]}
                  </option>
                ))}
              </select>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                disabled={isInitialLoad}
                className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-[0.8rem] px-4 py-2 text-sm font-black outline-none border-2 border-transparent focus:border-indigo-500 transition-all cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700"
              >
                {displayYears.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {!loading && !isInitialLoad && (
            <div className="flex flex-1 items-center justify-between sm:justify-end gap-6 min-w-full sm:min-w-0">
              <div className="text-left">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                  Historial
                </p>
                <p className="text-xs font-bold text-slate-600 dark:text-slate-400">
                  {availablePeriods?.years.length || 0} años registrados
                </p>
              </div>
              {isGlobal && totalCells > 0 && (
                <div className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 px-4 py-2 rounded-2xl shadow-sm">
                  <Users size={14} className="text-indigo-500" />
                  <span className="text-xs font-black text-indigo-700 dark:text-indigo-400 uppercase tracking-tight">
                    {totalCells} Células
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── CONTENT ── */}
        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6 custom-scrollbar">
          {/* Loading */}
          {(loading || isInitialLoad) && (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-400">
              <div className="w-10 h-10 border-4 border-slate-200 dark:border-slate-700 border-t-indigo-500 rounded-full animate-spin" />
              <p className="text-xs font-bold uppercase tracking-widest animate-pulse">
                {isInitialLoad
                  ? "Consultando periodos…"
                  : isAnnualView
                    ? "Cargando resumen anual…"
                    : "Cargando estadísticas…"}
              </p>
            </div>
          )}

          {/* Error */}
          {error && !loading && (
            <div className="flex items-start gap-3 bg-rose-50 dark:bg-rose-500/5 border border-rose-100 dark:border-rose-500/20 rounded-2xl p-4">
              <AlertCircle
                size={18}
                className="text-rose-500 shrink-0 mt-0.5"
              />
              <p className="text-sm text-rose-700 dark:text-rose-400">
                {error}
              </p>
            </div>
          )}

          {/* Empty */}
          {!loading &&
            !isInitialLoad &&
            !error &&
            periodsLoaded &&
            !isGlobal &&
            !stats && (
              <div className="flex flex-col items-center gap-4 py-16 text-center text-slate-400">
                <div className="w-20 h-20 rounded-full bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center">
                  <BarChart3
                    size={40}
                    className="text-slate-200 dark:text-slate-700"
                  />
                </div>
                <div className="space-y-1">
                  <p className="font-black uppercase tracking-widest text-slate-600 dark:text-slate-300">
                    Sin registros
                  </p>
                  <p className="text-sm text-slate-400 max-w-[240px]">
                    No se encontraron datos estadísticos
                    {isAnnualView
                      ? ` para el año ${selectedYear}`
                      : ` para el periodo de ${MONTH_NAMES[selectedMonth - 1]} ${selectedYear}`}
                  </p>
                </div>
              </div>
            )}

          {/* ── STATS CONTENT ── */}
          {!loading && !isInitialLoad && stats && (
            <>
              {/* KPI GRID — 6 tarjetas principales */}
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                <KPICard
                  icon={<Calendar size={16} />}
                  label={isAnnualView ? "Ses./Año" : "Sesiones"}
                  value={totalMeetings}
                  iconBgClass="bg-blue-50 dark:bg-blue-500/10 text-blue-500"
                />
                <KPICard
                  icon={<CheckCircle size={16} />}
                  label="Presentes"
                  value={totalPresent}
                  iconBgClass="bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500"
                />
                <KPICard
                  icon={<XCircle size={16} />}
                  label="Ausentes"
                  value={totalAbsent}
                  iconBgClass="bg-rose-50 dark:bg-rose-500/10 text-rose-500"
                />
                <KPICard
                  icon={<Clock size={16} />}
                  label="Justificados"
                  value={totalJustified}
                  iconBgClass="bg-amber-50 dark:bg-amber-500/10 text-amber-500"
                />
                <KPICard
                  icon={<Users size={16} />}
                  label="Prom./Ses."
                  value={Math.round(averageAttendance)}
                  iconBgClass="bg-purple-50 dark:bg-purple-500/10 text-purple-500"
                />
                <KPICard
                  icon={<Activity size={16} />}
                  label="% Global"
                  value={`${overallPct}%`}
                  iconBgClass="bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500"
                />
              </div>

              {/* KPIs de Visitas y Asistentes Totales */}
              {hasSessionData && (
                <div className="flex flex-wrap gap-3">
                  <KPICard
                    icon={<Star size={16} />}
                    label={
                      isAnnualView
                        ? "Nuevas visitas / año"
                        : "Nuevas visitas / mes"
                    }
                    value={monthlyNewParticipants}
                    iconBgClass="bg-teal-50 dark:bg-teal-500/10 text-teal-500"
                  />
                  {(!isAnnualView || isGlobal) &&
                    (monthlyTotalAttendees > 0 || isGlobal) && (
                      <KPICard
                        icon={<Home size={16} />}
                        label="Total en el lugar"
                        value={
                          isGlobal
                            ? statsTotalAttendees ||
                              totalPresent + monthlyNewParticipants
                            : monthlyTotalAttendees
                        }
                        iconBgClass="bg-purple-50 dark:bg-purple-500/10 text-purple-500"
                      />
                    )}
                </div>
              )}

              {/* PROGRESS BAR */}
              <div className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-5 border border-slate-100 dark:border-white/5 space-y-3">
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500 dark:text-indigo-400 leading-none">
                      {isAnnualView
                        ? "Asistencia global del año"
                        : "Asistencia global del mes"}
                    </p>
                    <p className="text-sm text-slate-400 mt-0.5">
                      {totalPresent} presentes de {totalRegistered} en{" "}
                      {totalMeetings} sesiones
                      {isAnnualView && annualData?.monthsWithData > 0 && (
                        <>
                          {" "}
                          · {annualData.monthsWithData}{" "}
                          {annualData.monthsWithData === 1 ? "mes" : "meses"}{" "}
                          con datos
                        </>
                      )}
                    </p>
                  </div>
                  <span className="text-4xl font-black text-indigo-600 dark:text-indigo-400 tracking-tighter">
                    {animatedPct}%
                  </span>
                </div>
                <div className="h-4 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${status.bar} transition-all duration-700 ease-out`}
                    style={{ width: `${animatedPct}%` }}
                  />
                </div>
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest ${status.tw}`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full mr-1.5 ${status.dot}`}
                  />
                  {status.label}
                </span>
              </div>

              {/* HIGHLIGHTS — Mejor / Peor mes (anual) */}
              {isAnnualView &&
                annualData?.monthlySummary?.length > 1 &&
                bestMonth &&
                worstMonth && (
                  <div className="flex flex-wrap gap-3">
                    <HighlightCard
                      icon="🏆"
                      title="Mejor mes"
                      titleColor="text-emerald-600 dark:text-emerald-400"
                      date={`${bestMonth.monthName} ${selectedYear}`}
                      stat={`${bestMonth.totalPresent}/${bestMonth.totalRegistered}`}
                      pct={bestMonth.percentage}
                      meta={`${bestMonth.totalMeetings} ${bestMonth.totalMeetings === 1 ? "sesión" : "sesiones"}${bestMonth.totalNewParticipants > 0 ? ` · 🌟 ${bestMonth.totalNewParticipants} visitas` : ""}`}
                      accentBg="bg-emerald-50 dark:bg-emerald-500/5"
                      accentBorder="border-emerald-200 dark:border-emerald-500/20"
                    />
                    <HighlightCard
                      icon="⚠️"
                      title="Mes más bajo"
                      titleColor="text-amber-600 dark:text-amber-400"
                      date={`${worstMonth.monthName} ${selectedYear}`}
                      stat={`${worstMonth.totalPresent}/${worstMonth.totalRegistered}`}
                      pct={worstMonth.percentage}
                      meta={`${worstMonth.totalMeetings} ${worstMonth.totalMeetings === 1 ? "sesión" : "sesiones"}`}
                      accentBg="bg-amber-50 dark:bg-amber-500/5"
                      accentBorder="border-amber-200 dark:border-amber-500/20"
                    />
                  </div>
                )}

              {/* HIGHLIGHTS — Mejor / Peor sesión (mensual) */}
              {!isAnnualView &&
                safeDailyStats.length > 1 &&
                bestSession &&
                worstSession && (
                  <div className="flex flex-wrap gap-3">
                    <HighlightCard
                      icon={<Award size={18} className="text-emerald-500" />}
                      title="Mejor sesión"
                      titleColor="text-emerald-600 dark:text-emerald-400"
                      date={formatDateLong(bestSession.date)}
                      stat={`${bestSession.present}/${bestSession.total}`}
                      pct={Math.round(bestSession.percentage)}
                      accentBg="bg-emerald-50 dark:bg-emerald-500/5"
                      accentBorder="border-emerald-200 dark:border-emerald-500/20"
                    />
                    <HighlightCard
                      icon={
                        <AlertCircle size={18} className="text-amber-500" />
                      }
                      title="Sesión más baja"
                      titleColor="text-amber-600 dark:text-amber-400"
                      date={formatDateLong(worstSession.date)}
                      stat={`${worstSession.present}/${worstSession.total}`}
                      pct={Math.round(worstSession.percentage)}
                      accentBg="bg-amber-50 dark:bg-amber-500/5"
                      accentBorder="border-amber-200 dark:border-amber-500/20"
                    />
                  </div>
                )}

              {/* ── ANNUAL: Desglose por mes ── */}
              {isAnnualView && annualData?.monthlySummary?.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-black text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <Calendar size={15} className="text-indigo-500" />
                    Desglose por mes
                  </h3>
                  <div className="rounded-2xl border border-slate-100 dark:border-white/5 overflow-hidden bg-white dark:bg-slate-800/50 overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm min-w-[500px]">
                      <thead className="bg-slate-50 dark:bg-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 dark:border-white/5">
                        <tr>
                          <th className="px-4 py-3 text-indigo-500">
                            <div className="flex items-center gap-1">
                              <Calendar size={12} /> Mes
                            </div>
                          </th>
                          <th className="px-3 py-3 text-center text-slate-400">
                            <div className="flex items-center justify-center gap-1">
                              <Zap size={12} /> Ses.
                            </div>
                          </th>
                          <th className="px-3 py-3 text-center text-emerald-500">
                            <div className="flex items-center justify-center gap-1">
                              <Users size={12} /> Pres.
                            </div>
                          </th>
                          <th className="px-3 py-3 text-center text-rose-400">
                            <div className="flex items-center justify-center gap-1">
                              <XCircle size={12} /> Aus.
                            </div>
                          </th>
                          <th className="px-3 py-3 text-center text-amber-500">
                            <div className="flex items-center justify-center gap-1">
                              <AlertCircle size={12} /> Just.
                            </div>
                          </th>
                          <th className="px-3 py-3 text-center text-teal-500">
                            <div className="flex items-center justify-center gap-1">
                              <Star size={12} /> Visitas
                            </div>
                          </th>
                          <th className="px-3 py-3 text-center text-purple-500">
                            <div className="flex items-center justify-center gap-1">
                              <Home size={12} /> Asis.
                            </div>
                          </th>
                          <th className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Activity size={12} /> %
                            </div>
                          </th>
                          <th className="px-4 py-3" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 dark:divide-white/5">
                        {annualData.monthlySummary.map((m, i) => {
                          const s = getStatusConfig(m.percentage);
                          return (
                            <tr
                              key={m.month}
                              onClick={() => setSelectedMonth(m.month)}
                              title={`Ver detalle de ${m.monthName}`}
                              className={`cursor-pointer hover:bg-indigo-50/50 dark:hover:bg-indigo-500/5 transition-colors ${i % 2 === 0 ? "" : "bg-slate-50/40 dark:bg-slate-800/20"}`}
                            >
                              <td className="px-4 py-2.5 font-bold text-slate-700 dark:text-slate-300">
                                {m.monthShort}
                              </td>
                              <td className="px-3 py-2.5 text-center text-slate-400 text-xs">
                                {m.totalMeetings}
                              </td>
                              <td className="px-3 py-2.5 text-center">
                                <Badge
                                  value={m.totalPresent}
                                  colorClass="bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                />
                              </td>
                              <td className="px-3 py-2.5 text-center">
                                <Badge
                                  value={m.totalAbsent}
                                  colorClass="bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400"
                                />
                              </td>
                              <td className="px-3 py-2.5 text-center">
                                <Badge
                                  value={m.totalJustified}
                                  colorClass="bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                />
                              </td>
                              <td className="px-3 py-2.5 text-center">
                                {m.totalNewParticipants > 0 ? (
                                  <Badge
                                    value={m.totalNewParticipants}
                                    colorClass="bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400"
                                  />
                                ) : (
                                  <span className="text-slate-300 dark:text-slate-600 text-xs">
                                    —
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-2.5 text-center">
                                {m.totalAttendees > 0 ? (
                                  <Badge
                                    value={m.totalAttendees}
                                    colorClass="bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400"
                                  />
                                ) : (
                                  <span className="text-slate-300 dark:text-slate-600 text-xs">
                                    —
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-2.5 text-center">
                                <Badge
                                  value={`${m.percentage}%`}
                                  colorClass={`${s.tw}`}
                                />
                              </td>
                              <td className="px-4 py-2.5">
                                <MiniBar pct={m.percentage} />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-[11px] text-slate-400 pl-1">
                    Toca un mes para ver su detalle por sesión
                  </p>
                </div>
              )}

              {/* Annual sin datos */}
              {isAnnualView &&
                annualData &&
                annualData.monthlySummary?.length === 0 && (
                  <div className="flex flex-col items-center gap-3 py-10 text-center text-slate-400">
                    <div className="p-4 rounded-full bg-slate-50 dark:bg-slate-800/50">
                      <FileText
                        size={40}
                        className="text-slate-300 dark:text-slate-600"
                      />
                    </div>
                    <p className="text-sm font-medium">
                      No se encontraron datos para el año {selectedYear}
                    </p>
                  </div>
                )}

              {/* ── MONTHLY: Detalle por sesión ── */}
              {!isAnnualView && safeDailyStats.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-black text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <Calendar size={15} className="text-indigo-500" />
                    {isGlobal
                      ? "Desglose diario de la red"
                      : "Detalle por sesión"}
                  </h3>
                  {/* ── Selector de sesión ── */}
                  {safeDailyStats.length > 1 && (
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                          Sesión
                        </label>
                        <div className="relative">
                          <select
                            value={selectedSession ?? ""}
                            onChange={(e) =>
                              setSelectedSession(e.target.value || null)
                            }
                            className={`w-full appearance-none bg-slate-100 dark:bg-slate-800 rounded-xl px-3 py-2 pr-8 text-sm font-bold outline-none border-2 transition-all cursor-pointer
                              ${
                                selectedSession
                                  ? "border-indigo-500 text-indigo-600 dark:text-indigo-400"
                                  : "border-transparent text-slate-700 dark:text-slate-300 focus:border-indigo-500"
                              }`}
                          >
                            <option value="">Todas las sesiones</option>
                            {safeDailyStats.map((d) => {
                              const pct = Math.round(d.percentage);
                              const isEvent =
                                d.isEvent || d.dayType === "EVENTO";
                              return (
                                <option key={d.date} value={d.date}>
                                  {isEvent ? "🎯 " : ""}{" "}
                                  {formatDateShort(d.date)} — {pct}%
                                </option>
                              );
                            })}
                          </select>
                          {/* flecha decorativa */}
                          <div className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center">
                            <svg
                              className="w-3.5 h-3.5 text-slate-400"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2.5}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M19 9l-7 7-7-7"
                              />
                            </svg>
                          </div>
                        </div>
                      </div>
                      {/* Botón limpiar — solo visible cuando hay selección */}
                      {selectedSession && (
                        <button
                          onClick={() => setSelectedSession(null)}
                          title="Ver todas las sesiones"
                          className="mt-4 shrink-0 w-8 h-8 rounded-xl flex items-center justify-center bg-indigo-50 dark:bg-indigo-500/10 text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 hover:text-indigo-600 border border-indigo-100 dark:border-indigo-500/20 transition-colors"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  )}
                  {/* ── KPI panel de la sesión seleccionada ── */}
                  {sessionStat && (
                    <div className="bg-indigo-50 dark:bg-indigo-500/5 border border-indigo-100 dark:border-indigo-500/15 rounded-2xl p-4 space-y-3">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500">
                          Detalle de sesión
                        </p>
                        <p className="text-sm font-bold text-slate-700 dark:text-slate-200 capitalize mt-0.5">
                          {sessionStat.isEvent ||
                          sessionStat.dayType === "EVENTO" ? (
                            <Zap
                              size={14}
                              className="inline mr-1 text-amber-500"
                            />
                          ) : null}
                          {formatDateLong(sessionStat.date)}
                        </p>
                      </div>
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                        {[
                          {
                            label: "Presentes",
                            value: sessionStat.present ?? "—",
                            ic: <CheckCircle size={13} />,
                            cls: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500",
                          },
                          {
                            label: "Ausentes",
                            value: sessionStat.absent ?? "—",
                            ic: <XCircle size={13} />,
                            cls: "bg-rose-50 dark:bg-rose-500/10 text-rose-500",
                          },
                          {
                            label: "Justificados",
                            value: sessionStat.justified ?? "—",
                            ic: <Clock size={13} />,
                            cls: "bg-amber-50 dark:bg-amber-500/10 text-amber-500",
                          },
                          {
                            label: "Total",
                            value: sessionStat.total ?? "—",
                            ic: <Users size={13} />,
                            cls: "bg-blue-50 dark:bg-blue-500/10 text-blue-500",
                          },
                          ...(sessionStat.newParticipants > 0
                            ? [
                                {
                                  label: "Visitas",
                                  value: sessionStat.newParticipants,
                                  ic: <Star size={13} />,
                                  cls: "bg-teal-50 dark:bg-teal-500/10 text-teal-500",
                                },
                              ]
                            : []),
                          ...(sessionStat.totalAttendees > 0
                            ? [
                                {
                                  label: "En el lugar",
                                  value: sessionStat.totalAttendees,
                                  ic: <Home size={13} />,
                                  cls: "bg-purple-50 dark:bg-purple-500/10 text-purple-500",
                                },
                              ]
                            : []),
                        ].map(({ label, value, ic, cls }) => (
                          <div
                            key={label}
                            className="flex flex-col gap-1 bg-white dark:bg-slate-800/60 rounded-xl p-2.5 border border-white dark:border-white/5"
                          >
                            <div
                              className={`w-6 h-6 rounded-lg flex items-center justify-center ${cls}`}
                            >
                              {ic}
                            </div>
                            <span className="text-lg font-black text-slate-800 dark:text-white leading-none">
                              {value}
                            </span>
                            <small className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                              {label}
                            </small>
                          </div>
                        ))}
                      </div>
                      {/* Mini barra de la sesión */}
                      {(() => {
                        const pct = Math.round(sessionStat.percentage);
                        const s = getStatusConfig(pct);
                        return (
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-slate-500 dark:text-slate-400">
                                Asistencia de esta sesión
                              </span>
                              <span
                                className={`text-xs font-black ${s.tw.split(" ")[0]}`}
                              >
                                {pct}%
                              </span>
                            </div>
                            <div className="h-2 w-full bg-indigo-100 dark:bg-slate-700 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full bg-gradient-to-r ${s.bar} transition-all duration-500`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                  {/* ── DESGLOSE POR CÉLULA (global + sesión seleccionada) ── */}
                  {isGlobal && selectedSession && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                          <Users size={13} className="text-indigo-500" />
                          Reporte por célula
                        </h4>
                        {loadingBreakdown && (
                          <div className="w-4 h-4 border-2 border-slate-200 dark:border-slate-700 border-t-indigo-500 rounded-full animate-spin" />
                        )}
                      </div>

                      {!loadingBreakdown && sessionBreakdown.length === 0 && (
                        <div className="flex flex-col items-center gap-2 text-sm text-slate-400 py-8 justify-center">
                          <AlertCircle size={30} className="text-slate-200" />
                          <p>Sin datos reportados para esta fecha</p>
                        </div>
                      )}

                      {sessionBreakdown.length > 0 && (
                        <div className="rounded-2xl border border-slate-100 dark:border-white/5 overflow-hidden bg-white dark:bg-slate-800/50 overflow-x-auto">
                          <table className="w-full text-left border-collapse text-sm min-w-[480px]">
                            <thead className="bg-slate-50 dark:bg-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 dark:border-white/5">
                              <tr>
                                <th className="px-4 py-3 text-indigo-500">
                                  <div className="flex items-center gap-1">
                                    <Home size={12} /> Célula
                                  </div>
                                </th>
                                <th className="px-3 py-3 text-center text-emerald-500">
                                  <div className="flex items-center justify-center gap-1">
                                    <Users size={12} /> Pres.
                                  </div>
                                </th>
                                <th className="px-3 py-3 text-center text-rose-400">
                                  <div className="flex items-center justify-center gap-1">
                                    <XCircle size={12} /> Aus.
                                  </div>
                                </th>
                                <th className="px-3 py-3 text-center text-amber-500">
                                  <div className="flex items-center justify-center gap-1">
                                    <AlertCircle size={12} /> Just.
                                  </div>
                                </th>
                                <th className="px-3 py-3 text-center text-slate-400">
                                  <div className="flex items-center justify-center gap-1">
                                    <Users size={12} /> Censo
                                  </div>
                                </th>
                                <th className="px-3 py-3 text-center text-teal-500">
                                  <div className="flex items-center justify-center gap-1">
                                    <Star size={12} /> Visitas
                                  </div>
                                </th>
                                <th className="px-3 py-3 text-center text-purple-500">
                                  <div className="flex items-center justify-center gap-1">
                                    <Home size={12} /> Asis.
                                  </div>
                                </th>
                                <th className="px-4 py-3 text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    <Activity size={12} /> %
                                  </div>
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 dark:divide-white/5">
                              {sessionBreakdown.map((row, i) => {
                                const s = getStatusConfig(row.percentage);
                                return (
                                  <tr
                                    key={row.cellId ?? i}
                                    className={`${i % 2 === 0 ? "" : "bg-slate-50/40 dark:bg-slate-800/20"} hover:bg-indigo-50/40 dark:hover:bg-indigo-500/5 transition-colors`}
                                  >
                                    <td className="px-4 py-2.5 font-semibold text-slate-700 dark:text-slate-300 text-xs max-w-[160px] truncate">
                                      {row.cellName ?? `Célula ${row.cellId}`}
                                    </td>
                                    <td className="px-3 py-2.5 text-center">
                                      <Badge
                                        value={row.totalPresent ?? "—"}
                                        colorClass="bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                      />
                                    </td>
                                    <td className="px-3 py-2.5 text-center">
                                      <Badge
                                        value={row.totalAbsent ?? "—"}
                                        colorClass="bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400"
                                      />
                                    </td>
                                    <td className="px-3 py-2.5 text-center">
                                      <Badge
                                        value={row.totalJustified ?? "—"}
                                        colorClass="bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                      />
                                    </td>
                                    <td className="px-3 py-2.5 text-center text-slate-500 dark:text-slate-400 text-xs font-medium">
                                      {row.totalRegistered ?? "—"}
                                    </td>
                                    <td className="px-3 py-2.5 text-center">
                                      {(row.newParticipants ?? 0) > 0 ? (
                                        <Badge
                                          value={row.newParticipants}
                                          colorClass="bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400"
                                        />
                                      ) : (
                                        <span className="text-slate-300 dark:text-slate-600 text-xs">
                                          —
                                        </span>
                                      )}
                                    </td>
                                    <td className="px-3 py-2.5 text-center">
                                      {(row.totalAttendees ?? 0) > 0 ? (
                                        <Badge
                                          value={row.totalAttendees}
                                          colorClass="bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400"
                                        />
                                      ) : (
                                        <span className="text-slate-300 dark:text-slate-600 text-xs">
                                          —
                                        </span>
                                      )}
                                    </td>
                                    <td className="px-4 py-2.5 text-right">
                                      <div className="flex items-center justify-end gap-2">
                                        <div className="w-12 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden hidden sm:block">
                                          <div
                                            className={`h-full rounded-full bg-gradient-to-r ${s.bar}`}
                                            style={{
                                              width: `${Math.min(row.percentage, 100)}%`,
                                            }}
                                          />
                                        </div>
                                        <Badge
                                          value={`${row.percentage}%`}
                                          colorClass={s.tw}
                                        />
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                            {/* Fila de totales */}
                            <tfoot>
                              <tr className="border-t-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60">
                                <td className="px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                  {sessionBreakdown.length} células
                                </td>
                                <td className="px-3 py-2.5 text-center">
                                  <Badge
                                    value={sessionBreakdown.reduce(
                                      (s, r) => s + (r.totalPresent ?? 0),
                                      0,
                                    )}
                                    colorClass="bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                                  />
                                </td>
                                <td className="px-3 py-2.5 text-center">
                                  <Badge
                                    value={sessionBreakdown.reduce(
                                      (s, r) => s + (r.totalAbsent ?? 0),
                                      0,
                                    )}
                                    colorClass="bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300"
                                  />
                                </td>
                                <td className="px-3 py-2.5 text-center">
                                  <Badge
                                    value={sessionBreakdown.reduce(
                                      (s, r) => s + (r.totalJustified ?? 0),
                                      0,
                                    )}
                                    colorClass="bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300"
                                  />
                                </td>
                                <td className="px-3 py-2.5 text-center text-xs font-black text-slate-500 dark:text-slate-400">
                                  {sessionBreakdown.reduce(
                                    (s, r) => s + (r.totalRegistered ?? 0),
                                    0,
                                  )}
                                </td>
                                <td className="px-3 py-2.5 text-center">
                                  {(() => {
                                    const totVis = sessionBreakdown.reduce(
                                      (s, r) => s + (r.newParticipants ?? 0),
                                      0,
                                    );
                                    return totVis > 0 ? (
                                      <Badge
                                        value={totVis}
                                        colorClass="bg-teal-100 dark:bg-teal-500/20 text-teal-700 dark:text-teal-300"
                                      />
                                    ) : (
                                      <span />
                                    );
                                  })()}
                                </td>
                                <td className="px-3 py-2.5 text-center">
                                  {(() => {
                                    const totAtt = sessionBreakdown.reduce(
                                      (s, r) => s + (r.totalAttendees ?? 0),
                                      0,
                                    );
                                    return totAtt > 0 ? (
                                      <Badge
                                        value={totAtt}
                                        colorClass="bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300"
                                      />
                                    ) : (
                                      <span />
                                    );
                                  })()}
                                </td>
                                <td className="px-4 py-2.5 text-right">
                                  {(() => {
                                    const totP = sessionBreakdown.reduce(
                                      (s, r) => s + (r.totalPresent ?? 0),
                                      0,
                                    );
                                    const totR = sessionBreakdown.reduce(
                                      (s, r) => s + (r.totalRegistered ?? 0),
                                      0,
                                    );
                                    const pct =
                                      totR > 0
                                        ? Math.round((totP / totR) * 100)
                                        : 0;
                                    return (
                                      <Badge
                                        value={`${pct}%`}
                                        colorClass={`${getStatusConfig(pct).tw} font-black`}
                                      />
                                    );
                                  })()}
                                </td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                  {/* Tabla de fechas del mes — oculta en global cuando hay sesión seleccionada */}
                  {(!isGlobal || !selectedSession) && (
                    <div className="rounded-2xl border border-slate-100 dark:border-white/5 overflow-hidden bg-white dark:bg-slate-800/50 overflow-x-auto">
                      <table className="w-full text-left border-collapse text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 dark:border-white/5">
                          <tr>
                            <th className="px-4 py-3 text-indigo-500">Fecha</th>
                            <th className="px-3 py-3 text-center text-emerald-500">
                              Pres.
                            </th>
                            <th className="px-3 py-3 text-center text-rose-400">
                              Aus.
                            </th>
                            <th className="px-3 py-3 text-center text-amber-500">
                              Just.
                            </th>
                            <th className="px-3 py-3 text-center">Total</th>
                            <th className="px-3 py-3 text-center text-teal-500">
                              Visitas
                            </th>
                            <th className="px-3 py-3 text-center text-purple-500">
                              Asis.
                            </th>
                            <th className="px-4 py-3 text-right">%</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-white/5">
                          {visibleDailyStats.map((d, i) => {
                            const pct = Math.round(d.percentage);
                            const s = getStatusConfig(pct);
                            const isEvent = d.isEvent || d.dayType === "EVENTO";
                            return (
                              <tr
                                key={i}
                                className={`${i % 2 === 0 ? "" : "bg-slate-50/40 dark:bg-slate-800/20"} hover:bg-indigo-50/40 dark:hover:bg-indigo-500/5 transition-colors`}
                              >
                                <td className="px-4 py-2.5 text-slate-700 dark:text-slate-300 font-medium text-xs">
                                  {isEvent && (
                                    <span className="mr-1 text-[10px]">🎯</span>
                                  )}
                                  {formatDateShort(d.date)}
                                </td>
                                <td className="px-3 py-2.5 text-center">
                                  <Badge
                                    value={d.present ?? "—"}
                                    colorClass="bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                  />
                                </td>
                                <td className="px-3 py-2.5 text-center">
                                  <Badge
                                    value={d.absent ?? "—"}
                                    colorClass="bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400"
                                  />
                                </td>
                                <td className="px-3 py-2.5 text-center">
                                  <Badge
                                    value={d.justified ?? "—"}
                                    colorClass="bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                  />
                                </td>
                                <td className="px-3 py-2.5 text-center text-slate-500 dark:text-slate-400 text-xs font-medium">
                                  {d.total ?? "—"}
                                </td>
                                <td className="px-3 py-2.5 text-center">
                                  {d.newParticipants > 0 ? (
                                    <Badge
                                      value={d.newParticipants}
                                      colorClass="bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400"
                                    />
                                  ) : (
                                    <span className="text-slate-300 dark:text-slate-600 text-xs">
                                      —
                                    </span>
                                  )}
                                </td>
                                <td className="px-3 py-2.5 text-center">
                                  {(d.totalAttendees ?? 0) > 0 ? (
                                    <Badge
                                      value={d.totalAttendees}
                                      colorClass="bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400"
                                    />
                                  ) : d.present > 0 ? (
                                    <Badge
                                      value={d.present}
                                      colorClass="bg-purple-50/60 dark:bg-purple-500/5 text-purple-400 dark:text-purple-500"
                                    />
                                  ) : (
                                    <span className="text-slate-300 dark:text-slate-600 text-xs">
                                      —
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-2.5 text-right">
                                  <Badge value={`${pct}%`} colorClass={s.tw} />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>

                        {/* Fila de totales — solo cuando se ven todas las sesiones */}
                        {!selectedSession && (
                          <tfoot>
                            <tr className="border-t-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 font-black text-xs">
                              <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400 uppercase tracking-widest text-[10px]">
                                Total mes
                              </td>
                              <td className="px-3 py-2.5 text-center">
                                <Badge
                                  value={totalPresent}
                                  colorClass="bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                                />
                              </td>
                              <td className="px-3 py-2.5 text-center">
                                <Badge
                                  value={totalAbsent}
                                  colorClass="bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300"
                                />
                              </td>
                              <td className="px-3 py-2.5 text-center">
                                <Badge
                                  value={safeDailyStats.reduce(
                                    (sum, d) => sum + (d.justified || 0),
                                    0,
                                  )}
                                  colorClass="bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300"
                                />
                              </td>
                              <td className="px-3 py-2.5 text-center text-slate-500 dark:text-slate-400">
                                {safeDailyStats.reduce(
                                  (sum, d) => sum + (d.total || 0),
                                  0,
                                )}
                              </td>
                              <td className="px-3 py-2.5 text-center">
                                {monthlyNewParticipants > 0 ? (
                                  <Badge
                                    value={monthlyNewParticipants}
                                    colorClass="bg-teal-100 dark:bg-teal-500/20 text-teal-700 dark:text-teal-300"
                                  />
                                ) : (
                                  <span className="text-slate-300 dark:text-slate-600">
                                    —
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-2.5 text-center">
                                <Badge
                                  value={
                                    monthlyTotalAttendees > 0
                                      ? monthlyTotalAttendees
                                      : totalPresent + monthlyNewParticipants
                                  }
                                  colorClass="bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300"
                                />
                              </td>
                              <td className="px-4 py-2.5 text-right">
                                <Badge
                                  value={`${overallPct}%`}
                                  colorClass={`${status.tw} font-black`}
                                />
                              </td>
                            </tr>
                          </tfoot>
                        )}
                      </table>
                    </div>
                  )}{" "}
                  {/* fin (!isGlobal || !selectedSession) */}
                </div>
              )}
            </>
          )}
        </div>

        {/* ── FOOTER ── */}
        <div className="flex items-center gap-3 px-6 py-4 border-t border-slate-100 dark:border-slate-800">
          {!isAnnualView && !isGlobal && (
            <button
              onClick={() => setSelectedMonth(0)}
              className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 px-4 py-2 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors mr-auto"
            >
              <Calendar size={13} />
              Ver año completo
            </button>
          )}
          <button
            onClick={onClose}
            className="ml-auto text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </>
  );
};

export default CellAttendanceStatsModal;
