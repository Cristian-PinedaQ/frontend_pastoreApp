// ============================================
// CellGroupOverviewModal.jsx  ·  v3 — iOS Bottom Sheet
// FIX: scroll vs drag conflict resolved
// - onPointerDown stopPropagation en scroll div
// - onDrag bloquea cuando scrollTop > 0
// - dragListener deshabilitado en zona de contenido
// ============================================

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import {
  motion,
  useMotionValue,
  useTransform,
  useSpring,
  useAnimation,
  AnimatePresence,
} from "framer-motion";
import {
  LayoutDashboard,
  RotateCw,
  FileText,
  X,
  UserCheck,
  Users,
  BarChart3,
  TrendingUp,
  UserPlus,
  Calendar,
  ArrowUpDown,
  ChevronDown,
  Activity,
  Search,
  AlertCircle,
  Home,
} from "lucide-react";
import { generateOverviewPDF } from "../services/Cellgroupoverviewpdfgenerator";
import { useDragControls } from "framer-motion";

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

const SNAP_HEIGHTS = {
  peek: 0.32,
  half: 0.62,
  full: 0.93,
};

// ─── Haptic helper ────────────────────────────────────────────────────────────
const haptic = (pattern = [10]) => {
  if ("vibrate" in navigator) navigator.vibrate(pattern);
};

// ─── Spring presets ───────────────────────────────────────────────────────────
const SPRING_SNAP = { type: "spring", stiffness: 400, damping: 38, mass: 1 };
const SPRING_CLOSE = { type: "spring", stiffness: 320, damping: 30, mass: 0.9 };
const SPRING_HANDLE = { type: "spring", stiffness: 600, damping: 25 };

// ─────────────────────────────────────────────────────────────────────────────
// BOTTOM SHEET WRAPPER
// ─────────────────────────────────────────────────────────────────────────────
const BottomSheet = ({ isOpen, onClose, children }) => {
  const controls = useAnimation();
  const dragControls = useDragControls();

  const scrollRef = useRef(null);
  const isDragging = useRef(false);
  const currentSnap = useRef("full");

  const lockDrag = useRef(false); // 👈 FIX CLAVE

  const y = useMotionValue(0);

  const overlayOpacity = useTransform(
    y,
    [0, window.innerHeight * 0.5],
    [1, 0],
  );

  const [scrollBlur, setScrollBlur] = useState(false);

  const snapToPx = useCallback(
    (snapKey) => Math.round(window.innerHeight * SNAP_HEIGHTS[snapKey]),
    [],
  );

  const snapTo = useCallback(
    async (snapKey, withHaptic = true) => {
      await controls.start({
        y: 0,
        height: snapToPx(snapKey),
        transition: SPRING_SNAP,
      });
      currentSnap.current = snapKey;
      if (withHaptic) haptic([8]);
    },
    [controls, snapToPx],
  );

  useEffect(() => {
    if (isOpen) {
      controls.set({ y: window.innerHeight, height: snapToPx("full") });
      controls.start({
        y: 0,
        height: snapToPx("full"),
        transition: { ...SPRING_SNAP, delay: 0.05 },
      });
      currentSnap.current = "full";
      haptic([12, 30, 8]);
    }
  }, [isOpen, controls, snapToPx]);

  // ─────────────────────────────────────────────
  // DRAG HANDLER (FIXED)
  // ─────────────────────────────────────────────
  const onDrag = useCallback(
    (_, info) => {
      // 🚫 bloqueo real si el scroll está activo
      if (lockDrag.current) return;

      if (scrollRef.current?.scrollTop > 0) return;

      if (info.offset.y < 0) {
        y.set(info.offset.y * 0.2);
      } else {
        y.set(info.offset.y);
      }
    },
    [y],
  );

  const onDragEnd = useCallback(
    (_, info) => {
      const offset = info.offset.y;
      const velocity = info.velocity.y;
      const vh = window.innerHeight;

      lockDrag.current = false;

      if (velocity > 600 || offset > vh * 0.45) {
        haptic([10, 40]);
        controls.start({ y: vh, transition: SPRING_CLOSE }).then(onClose);
        return;
      }

      const snapKeys = Object.keys(SNAP_HEIGHTS);
      const snapValues = snapKeys.map((k) => SNAP_HEIGHTS[k]);

      const currentH = snapToPx(currentSnap.current);
      const newPct = (currentH - offset) / vh;

      let bestSnap = "full";
      let bestDist = Infinity;

      snapKeys.forEach((k, i) => {
        const dist = Math.abs(snapValues[i] - newPct);
        if (dist < bestDist) {
          bestDist = dist;
          bestSnap = k;
        }
      });

      if (bestSnap === "peek" && offset < 0) bestSnap = "half";

      y.set(0);
      snapTo(bestSnap);
    },
    [controls, onClose, snapTo, snapToPx, y],
  );

  const handleScroll = useCallback((e) => {
    setScrollBlur(e.target.scrollTop > 12);
  }, []);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {/* BACKDROP */}
      <motion.div
        className="fixed inset-0 z-[1000]"
        style={{
          backgroundColor: "rgba(2,6,23,0.6)",
          backdropFilter: "blur(6px)",
          opacity: overlayOpacity,
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => {
          haptic([8, 30]);
          controls
            .start({ y: window.innerHeight, transition: SPRING_CLOSE })
            .then(onClose);
        }}
      />

      {/* SHEET */}
      <motion.div
        animate={controls}
        drag="y"
        dragControls={dragControls}
        dragListener={false} // 👈 IMPORTANTE: SOLO HANDLE controla drag
        onDrag={onDrag}
        onDragEnd={onDragEnd}
        style={{
          y,
          bottom: 0,
          left: 0,
          right: 0,
          position: "fixed",
        }}
        className="z-[1001] flex flex-col bg-white dark:bg-slate-900 rounded-t-[2rem] shadow-2xl overflow-hidden"
      >
        {/* HANDLE */}
        <DragHandle
          dragControls={dragControls}
          onSnapCycle={() => {
            const order = ["peek", "half", "full"];
            const next =
              order[(order.indexOf(currentSnap.current) + 1) % order.length];
            snapTo(next);
          }}
        />

        {/* SCROLL AREA (FIX REAL) */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          onPointerDown={(e) => {
            e.stopPropagation(); // 👈 EVITA QUE FRAMER MOTION INTERCEPTE
            lockDrag.current = true;
          }}
          onPointerUp={() => {
            lockDrag.current = false;
          }}
          onTouchStart={(e) => {
            e.stopPropagation(); // 👈 EVITA QUE FRAMER MOTION INTERCEPTE
            lockDrag.current = true;
          }}
          onTouchEnd={() => {
            lockDrag.current = false;
          }}
          className="flex-1 overflow-y-auto overscroll-contain"
          style={{
            WebkitOverflowScrolling: "touch",
            touchAction: "pan-y",
          }}
        >
          {children({ scrollBlur, snapTo, currentSnap: currentSnap.current })}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// DRAG HANDLE — tap para ciclar snap points
// ─────────────────────────────────────────────────────────────────────────────
const DragHandle = ({ onSnapCycle, dragControls }) => {
  const scale = useSpring(1, SPRING_HANDLE);
  return (
    <motion.button
       onPointerDown={(e) => dragControls.start(e)}
      className="w-full flex flex-col items-center pt-3 pb-2 touch-none select-none cursor-grab active:cursor-grabbing"
      onHoverStart={() => scale.set(1.3)}
      onHoverEnd={() => scale.set(1)}
      onTapStart={() => {
        scale.set(0.85);
        haptic([6]);
      }}
      onTap={() => {
        scale.set(1);
        onSnapCycle();
      }}
      aria-label="Arrastrar para ajustar tamaño"
    >
      <motion.div
        style={{ scaleX: scale }}
        className="w-10 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 transition-colors"
      />
      <div className="flex gap-1 mt-1.5">
        {["peek", "half", "full"].map((s) => (
          <motion.div
            key={s}
            className="w-1 h-1 rounded-full bg-slate-200 dark:bg-slate-700"
          />
        ))}
      </div>
    </motion.button>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// DESKTOP MODAL (≥768px)
// ─────────────────────────────────────────────────────────────────────────────
const DesktopModal = ({ onClose, children }) => (
  <AnimatePresence>
    <motion.div
      key="desktop-backdrop"
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[1000]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    />
    <motion.div
      key="desktop-sheet"
      className="fixed inset-0 z-[1001] flex items-center justify-center pointer-events-none p-4 sm:p-6"
      initial={{ opacity: 0, scale: 0.96, y: 24 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, y: 16 }}
      transition={SPRING_SNAP}
    >
      <div
        className="w-full max-w-4xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl flex flex-col overflow-y-auto pointer-events-auto border border-slate-200 dark:border-slate-800"
        onPointerDown={(e) => e.stopPropagation()} // Opcional pero recomendado para consistencia
      >
        {children({ scrollBlur: false, snapTo: () => {}, currentSnap: "full" })}
      </div>
    </motion.div>
  </AnimatePresence>
);

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const CellGroupOverviewModal = ({
  isOpen,
  onClose,
  userCells = [],
  apiService,
  isDarkMode = false,
  isMobile = false,
  logUserAction,
  onSelectCell,
}) => {
  const [loading, setLoading] = useState(false);
  const [cellStats, setCellStats] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedDate, setSelectedDate] = useState("");
  const [availableDates, setAvailableDates] = useState([]);
  const [sortBy, setSortBy] = useState("percentage");
  const [sortDir, setSortDir] = useState("desc");
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // ── Fechas disponibles ───────────────────────────────────────────────────
  useEffect(() => {
    const fetchDates = async () => {
      if (!isOpen || !userCells.length) return;
      try {
        const response = await apiService.getCellAttendancesByMonth(
          selectedYear,
          selectedMonth,
        );
        const allRecords = [];
        if (response?.cells)
          Object.values(response.cells).forEach(
            (c) => Array.isArray(c) && allRecords.push(...c),
          );
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dates = [...new Set(allRecords.map((r) => r.attendanceDate))]
          .filter(Boolean)
          .filter((d) => {
            const s = new Date(d + "T00:00:00");
            s.setHours(0, 0, 0, 0);
            return s <= today;
          })
          .sort()
          .reverse();
        setAvailableDates(dates);
        setSelectedDate("");
      } catch (e) {
        console.error(e);
      }
    };
    fetchDates();
  }, [selectedMonth, selectedYear, apiService, isOpen, userCells.length]);

  // ── Stats ────────────────────────────────────────────────────────────────
  const loadAllStats = useCallback(async () => {
    if (!userCells.length) return;
    setLoading(true);
    setCellStats([]);
    try {
      if (selectedDate) {
        const globalData =
          await apiService.getGlobalSummaryByDate(selectedDate);
        setCellStats(
          userCells.map((cell) => {
            const d = globalData.find(
              (x) => Number(x.cellId) === Number(cell.id),
            );
            return {
              cellId: cell.id,
              cellName: cell.name,
              stats: d
                ? {
                    totalPresent: d.totalPresent || 0,
                    totalRegistered: d.totalRegistered || 0,
                    totalMeetings: 1,
                    totalJustified: d.totalJustified || 0,
                    totalNewParticipants: d.newParticipants || 0,
                  }
                : null,
              error: d ? null : "No hay datos para esta sesión",
            };
          }),
        );
      } else {
        const results = await Promise.all(
          userCells.map((cell) =>
            apiService
              .getCellAttendanceMonthlyStats(
                cell.id,
                selectedYear,
                selectedMonth,
              )
              .then((data) => ({
                cellId: cell.id,
                cellName: cell.name,
                stats: data,
                error: null,
              }))
              .catch((err) => ({
                cellId: cell.id,
                cellName: cell.name,
                stats: null,
                error: err.message,
              })),
          ),
        );
        setCellStats(results);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [userCells, selectedMonth, selectedYear, selectedDate, apiService]);

  useEffect(() => {
    if (isOpen) loadAllStats();
  }, [isOpen, loadAllStats]);
  useEffect(() => {
    if (!isOpen) {
      setCellStats([]);
      setSelectedDate("");
    }
  }, [isOpen]);

  // ── Aggregated ───────────────────────────────────────────────────────────
  const aggregated = useMemo(() => {
    const w = cellStats.filter((c) => c.stats?.totalRegistered > 0);
    if (!w.length) return null;
    const totalPresent = w.reduce((s, c) => s + (c.stats.totalPresent || 0), 0);
    const totalJustified = w.reduce(
      (s, c) => s + (c.stats.totalJustified || 0),
      0,
    );
    const totalNew = w.reduce(
      (s, c) => s + (c.stats.totalNewParticipants || 0),
      0,
    );
    const totalRegistered = w.reduce(
      (s, c) => s + (c.stats.totalRegistered || 0),
      0,
    );
    const overallPct =
      totalRegistered > 0
        ? Math.round((totalPresent / totalRegistered) * 100)
        : 0;
    const avgPct =
      w.length > 0
        ? Math.round(
            w.reduce((s, c) => {
              const p =
                c.stats.totalRegistered > 0
                  ? (c.stats.totalPresent / c.stats.totalRegistered) * 100
                  : 0;
              return s + p;
            }, 0) / w.length,
          )
        : 0;
    return {
      totalPresent,
      totalRegistered,
      totalJustified,
      totalNew,
      totalCelebracion: totalPresent + totalNew,
      overallPct,
      avgPct,
      cellsWithData: w.length,
    };
  }, [cellStats]);

  // ── Sort & filter ────────────────────────────────────────────────────────
  const filteredAndSortedCells = useMemo(() => {
    let list = [...cellStats];
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter((c) => c.cellName.toLowerCase().includes(q));
    }
    list.sort((a, b) => {
      let va, vb;
      if (sortBy === "percentage") {
        va =
          a.stats?.totalRegistered > 0
            ? (a.stats.totalPresent / a.stats.totalRegistered) * 100
            : -1;
        vb =
          b.stats?.totalRegistered > 0
            ? (b.stats.totalPresent / b.stats.totalRegistered) * 100
            : -1;
      } else if (sortBy === "present") {
        va = a.stats?.totalPresent || -1;
        vb = b.stats?.totalPresent || -1;
      } else {
        va = a.cellName.toLowerCase();
        vb = b.cellName.toLowerCase();
        return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
      }
      return sortDir === "asc" ? va - vb : vb - va;
    });
    return list;
  }, [cellStats, sortBy, sortDir, searchTerm]);

  const handleSort = (field) => {
    if (sortBy === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortBy(field);
      setSortDir("desc");
    }
    haptic([6]);
  };

  const handleGeneratePDF = async () => {
    if (!cellStats.length) return;
    setGeneratingPDF(true);
    try {
      await generateOverviewPDF(
        cellStats,
        selectedMonth,
        selectedYear,
        aggregated,
        selectedDate,
      );
      logUserAction?.("generate_overview_pdf", {
        month: selectedMonth,
        year: selectedYear,
        date: selectedDate,
      });
    } catch (e) {
      console.error(e);
    } finally {
      setGeneratingPDF(false);
    }
  };

  const yearOptions = useMemo(() => {
    const y = new Date().getFullYear();
    return [y, y - 1, y - 2];
  }, []);

  if (!isOpen) return null;

  // ── Contenido compartido ─────────────────────────────────────────────────
  const renderContent = ({ scrollBlur }) => (
    <>
      {/* ── HEADER ─────────────────────────────────────────────────────── */}
      <div
        className={`px-5 md:px-8 py-4 md:py-6 flex justify-between items-start gap-4 border-b border-slate-100 dark:border-slate-800/50 transition-all duration-300 sticky top-0 z-10 bg-white/95 dark:bg-slate-900/95
          ${scrollBlur ? "shadow-lg shadow-slate-900/5 dark:shadow-slate-900/40 backdrop-blur-xl" : ""}`}
      >
        <div className="flex gap-3 md:gap-6 items-center">
          <motion.div
            whileTap={{ scale: 0.9 }}
            className="w-11 h-11 md:w-16 md:h-16 bg-indigo-500/10 rounded-2xl md:rounded-[1.5rem] flex items-center justify-center text-indigo-600 shrink-0 border border-indigo-500/20"
          >
            <LayoutDashboard className="w-5 h-5 md:w-8 md:h-8" />
          </motion.div>
          <div>
            <h2 className="text-lg md:text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase italic">
              Resumen de Altares
            </h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[9px] md:text-xs font-black uppercase tracking-widest text-indigo-500 bg-indigo-500/10 px-2 py-0.5 rounded-md">
                {selectedDate ? "Vista por Sesión" : "Vista Acumulada"}
              </span>
              <span className="text-[9px] md:text-xs font-bold text-slate-400 uppercase tracking-widest">
                · {userCells.length} Altares
              </span>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <motion.button
            whileTap={{ scale: 0.88, rotate: 180 }}
            transition={SPRING_HANDLE}
            onClick={() => {
              loadAllStats();
              haptic([8]);
            }}
            disabled={loading}
            className="bg-emerald-100 dark:bg-slate-800 hover:bg-slate-100 rounded-xl md:rounded-2xl flex items-center justify-center text-slate-500 border border-slate-200 dark:border-slate-700"
            title="Recargar"
          >
            <RotateCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.88 }}
            transition={SPRING_HANDLE}
            onClick={() => {
              handleGeneratePDF();
              haptic([8, 20, 8]);
            }}
            disabled={!cellStats.length || generatingPDF || loading}
            className="bg-slate-900 dark:bg-indigo-600 rounded-xl md:rounded-2xl flex items-center justify-center text-white shadow-lg disabled:opacity-30"
            title="PDF"
          >
            <FileText className="w-4 h-4" />
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.88 }}
            transition={SPRING_HANDLE}
            onClick={() => {
              haptic([10, 30]);
              onClose();
            }}
            className="bg-rose-200 dark:bg-slate-800 hover:bg-rose-50 rounded-xl md:rounded-2xl flex items-center justify-center text-slate-400 hover:text-rose-500 border border-slate-200 dark:border-slate-700"
          >
            <X className="w-4 h-4" />
          </motion.button>
        </div>
      </div>

      {/* ── FILTERS ────────────────────────────────────────────────────── */}
      <div className="px-5 md:px-8 py-4 md:py-6 bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800/30 space-y-3 md:space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          {/* Periodo + Sesión */}
          <div className="flex-1 min-w-[260px] flex gap-3">
            <div className="flex-1 space-y-1.5">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">
                Periodo
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <select
                    value={selectedMonth}
                    onChange={(e) => {
                      setSelectedMonth(Number(e.target.value));
                      haptic([5]);
                    }}
                    className="bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 outline-none focus:border-indigo-500 appearance-none cursor-pointer"
                  >
                    {MONTH_NAMES.map((m, i) => (
                      <option key={i + 1} value={i + 1}>
                        {m}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                </div>
                <div className="relative w-24">
                  <select
                    value={selectedYear}
                    onChange={(e) => {
                      setSelectedYear(Number(e.target.value));
                      haptic([5]);
                    }}
                    className="bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 outline-none focus:border-indigo-500 appearance-none cursor-pointer"
                  >
                    {yearOptions.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>

            <div className="flex-1 space-y-1.5">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">
                Sesión
              </label>
              <div className="relative">
                <select
                  value={selectedDate}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    haptic([5]);
                  }}
                  className="pl-9 pr-8 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 outline-none focus:border-indigo-500 appearance-none cursor-pointer"
                >
                  <option value="">Acumulado ({availableDates.length})</option>
                  {availableDates.map((d) => (
                    <option key={d} value={d}>
                      {new Date(d + "T00:00:00").toLocaleDateString("es-CO", {
                        day: "2-digit",
                        month: "short",
                      })}
                    </option>
                  ))}
                </select>
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-indigo-500 pointer-events-none" />
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Búsqueda */}
          <div className="flex-1 min-w-[180px] space-y-1.5">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1">
              <Search className="w-3 h-3" />
              Buscar
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Nombre o zona…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-10 pl-9 pr-4 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 outline-none focus:border-indigo-500 transition-all"
              />
            </div>
          </div>
        </div>

        {/* Chips de ordenamiento */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
          <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] whitespace-nowrap shrink-0">
            Ordenar:
          </span>
          {[
            { id: "percentage", label: "% Asist.", icon: TrendingUp },
            { id: "present", label: "Presentes", icon: UserCheck },
            { id: "name", label: "Nombre", icon: LayoutDashboard },
          ].map((sort) => (
            <motion.button
              key={sort.id}
              whileTap={{ scale: 0.92 }}
              onClick={() => handleSort(sort.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border-2 text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap
                ${
                  sortBy === sort.id
                    ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                    : "bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-500 dark:text-slate-400"
                }`}
            >
              <sort.icon className="w-3 h-3" />
              {sort.label}
              {sortBy === sort.id && (
                <ArrowUpDown
                  className={`w-2.5 h-2.5 ${sortDir === "asc" ? "rotate-180" : ""}`}
                />
              )}
            </motion.button>
          ))}
        </div>
      </div>

      {/* ── KPI STRIP ──────────────────────────────────────────────────── */}
      <AnimatePresence>
        {aggregated && !loading && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="px-5 md:px-8 py-4 md:py-6 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800/50"
          >
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 md:gap-3">
              {[
                {
                  label: "Altares",
                  value: aggregated.cellsWithData,
                  icon: Home,
                  bg: "bg-blue-500/10",
                  text: "text-blue-600",
                },
                {
                  label: "Presentes",
                  value: aggregated.totalPresent,
                  icon: UserCheck,
                  bg: "bg-emerald-500/10",
                  text: "text-emerald-600",
                },
                {
                  label: "Impacto",
                  value: aggregated.totalCelebracion,
                  icon: Users,
                  bg: "bg-indigo-500/10",
                  text: "text-indigo-600",
                },
                {
                  label: "Nuevos",
                  value: aggregated.totalNew,
                  icon: UserPlus,
                  bg: "bg-amber-500/10",
                  text: "text-amber-500",
                },
                {
                  label: "% Global",
                  value: `${aggregated.overallPct}%`,
                  icon: BarChart3,
                  bg: "bg-slate-500/10",
                  text:
                    aggregated.overallPct >= 70
                      ? "text-emerald-500"
                      : aggregated.overallPct >= 40
                        ? "text-amber-500"
                        : "text-rose-500",
                },
                {
                  label: "% Prom.",
                  value: `${aggregated.avgPct}%`,
                  icon: Activity,
                  bg: "bg-slate-500/10",
                  text:
                    aggregated.avgPct >= 70
                      ? "text-emerald-500"
                      : aggregated.avgPct >= 40
                        ? "text-amber-500"
                        : "text-blue-400",
                },
              ].map((kpi, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.04, ...SPRING_SNAP }}
                  className="flex flex-col items-center justify-center p-2.5 md:p-3 rounded-xl md:rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm"
                >
                  <div
                    className={`w-7 h-7 md:w-8 md:h-8 ${kpi.bg} ${kpi.text} rounded-lg flex items-center justify-center mb-1.5`}
                  >
                    <kpi.icon className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  </div>
                  <span
                    className={`text-base md:text-lg font-black tracking-tight ${kpi.text}`}
                  >
                    {kpi.value}
                  </span>
                  <span className="text-[7px] md:text-[8px] font-black text-slate-400 uppercase tracking-widest mt-0.5">
                    {kpi.label}
                  </span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── LISTA DE ALTARES ────────────────────────────────────────────── */}
      <div className="p-5 md:p-8 space-y-2.5 pb-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-11 h-11 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
            <div className="text-center">
              <p className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">
                Escaneando Altares…
              </p>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">
                Sincronizando base de datos ministerial
              </p>
            </div>
          </div>
        ) : filteredAndSortedCells.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-300">
              <Search className="w-8 h-8" />
            </div>
            <p className="text-xs font-black text-slate-500 uppercase tracking-widest">
              No se encontraron altares
            </p>
          </div>
        ) : (
          filteredAndSortedCells.map(
            ({ cellId, cellName, stats, error }, idx) => {
              const hasData = stats && stats.totalRegistered > 0;
              const pct = hasData
                ? Math.round((stats.totalPresent / stats.totalRegistered) * 100)
                : 0;
              const newVisits = stats?.totalNewParticipants || 0;
              const barColor =
                pct >= 70
                  ? "bg-emerald-500"
                  : pct >= 40
                    ? "bg-amber-500"
                    : "bg-rose-500";
              const accentColor = !hasData
                ? "bg-slate-200 dark:bg-slate-700"
                : pct >= 70
                  ? "bg-emerald-500"
                  : pct >= 40
                    ? "bg-amber-500"
                    : "bg-rose-500";

              return (
                <motion.button
                  key={cellId}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    delay: Math.min(idx * 0.03, 0.3),
                    ...SPRING_SNAP,
                  }}
                  whileTap={{ scale: hasData ? 0.975 : 1 }}
                  onClick={() => {
                    if (hasData) {
                      haptic([8, 20]);
                      onSelectCell?.(String(cellId));
                    }
                  }}
                  disabled={!hasData}
                  className={`group relative w-full text-left p-4 rounded-2xl border-2 transition-colors flex items-center gap-3.5 overflow-hidden
                  ${
                    hasData
                      ? "bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 active:border-indigo-400/50"
                      : "bg-slate-50/50 dark:bg-slate-800/30 border-transparent opacity-75"
                  }`}
                >
                  {/* Acento izquierdo */}
                  <div
                    className={`absolute top-0 left-0 bottom-0 w-1 rounded-l-2xl transition-colors ${accentColor}`}
                  />

                  {/* Avatar */}
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black shrink-0
                  ${!hasData ? "bg-slate-100 dark:bg-slate-700 text-slate-400" : "bg-indigo-500/10 text-indigo-600"}`}
                  >
                    {cellName.charAt(0).toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-tight truncate flex items-center gap-1.5">
                      {cellName}
                      {hasData && pct >= 90 && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                      )}
                    </h4>
                    <div className="flex items-center gap-2 mt-0.5 text-[8px] font-black uppercase tracking-widest text-slate-400">
                      {hasData ? (
                        <>
                          <span className="flex items-center gap-0.5">
                            <UserCheck className="w-2.5 h-2.5 text-emerald-500" />{" "}
                            {stats.totalPresent}
                          </span>
                          {newVisits > 0 && (
                            <span className="flex items-center gap-0.5">
                              <UserPlus className="w-2.5 h-2.5 text-amber-500" />{" "}
                              {newVisits}
                            </span>
                          )}
                          <span className="text-slate-200 dark:text-slate-700">
                            |
                          </span>
                          <span>{stats.totalRegistered} miembros</span>
                        </>
                      ) : (
                        <span className="flex items-center gap-1 text-rose-400">
                          <AlertCircle className="w-2.5 h-2.5" /> Sin registros
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Porcentaje + barra */}
                  {hasData && (
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span
                        className={`text-base font-black tracking-tighter
                      ${pct >= 70 ? "text-emerald-500" : pct >= 40 ? "text-amber-500" : "text-rose-500"}`}
                      >
                        {pct}%
                      </span>
                      <div className="w-20 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <motion.div
                          className={`h-full rounded-full ${barColor}`}
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{
                            delay: idx * 0.03 + 0.1,
                            duration: 0.7,
                            ease: [0.34, 1.56, 0.64, 1],
                          }}
                        />
                      </div>
                    </div>
                  )}
                </motion.button>
              );
            },
          )
        )}
      </div>

      {/* ── FOOTER ─────────────────────────────────────────────────────── */}
      <div className="px-5 py-3 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800/50 flex flex-col sm:flex-row justify-between items-center gap-2">
        <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.3em]">
          Altares de Vida · RAÍZ DE DAVID
        </p>
        {aggregated && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-lg">
            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
            <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">
              Tiempo real
            </span>
          </div>
        )}
      </div>
    </>
  );

  // ── Render ──────────────────────────────────────────────────────────────
  return isMobile ? (
    <BottomSheet isOpen={isOpen} onClose={onClose}>
      {renderContent}
    </BottomSheet>
  ) : (
    <DesktopModal onClose={onClose}>{renderContent}</DesktopModal>
  );
};

export default CellGroupOverviewModal;
