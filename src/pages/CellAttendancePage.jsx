import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import apiService from "../apiService";
import { useAuth } from "../context/AuthContext";
import { logUserAction } from "../utils/securityLogger";
import nameHelper from "../services/nameHelper";
import CellAttendanceStatsModal from "../components/CellAttendanceStatsModal";
import CellGroupOverviewModal from "../components/CellGroupOverviewModal";
import CreateAttendanceEventModal from "../components/CreateAttendanceEventModal";
import { generateAttendancePDF } from "../services/attendancePdfGenerator";
import {
  Users,
  Calendar,
  MapPin,
  TrendingUp,
  CheckCircle2,
  X,
  Plus,
  Download,
  RefreshCw,
  Inbox,
  Search,
  Zap,
  BookOpen,
  MessageSquare,
  AlertCircle,
  ShieldCheck,
  ChevronDown,
  Filter,
  Clock,
  UserCheck,
  UserX,
  UserStar,
  ShieldUser,
  CircleUserRound,
  User,
  Home,
} from "lucide-react";

const { getDisplayName } = nameHelper;

// ── Constants ─────────────────────────────────────────────────────────────────
const ALLOWED_DAYS = [0, 3, 4];
const LEADER_TYPE_MAP = {
  LEADER_12: { label: "Líder 12", icon: ShieldUser, color: "indigo" },
  LEADER_144: { label: "Líder Rama", icon: CircleUserRound, color: "blue" },
  SERVANT: { label: "Servidor", icon: UserStar, color: "emerald" },
  LEADER_GROUP: { label: "Líder Grupo", icon: Home, color: "amber" },
};

const resolveLeaderLabel = (attendance) => {
  if (!attendance?.leaderType) return null;

  const roleMap = {
    GROUP_LEADER: { label: "Líder de Grupo", icon: UserStar, color: "amber" },
    HOST: { label: "Anfitrión", icon: Home, color: "emerald" },
    TIMOTEO: { label: "Timoteo", icon: BookOpen, color: "emerald" },
    BRANCH_LEADER: {
      label: "Líder de Rama",
      icon: CircleUserRound,
      color: "blue",
    },
    MAIN_LEADER: { label: "Líder 12", icon: ShieldUser, color: "indigo" },
  };

  return (
    roleMap[attendance.roleInCell] ||
    LEADER_TYPE_MAP[attendance.leaderType] || {
      label: attendance.leaderType,
      icon: User,
      color: "slate",
    }
  );
};

const formatDateShort = (dateStr) => {
  if (!dateStr) return {};
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(year, month - 1, day, 12, 0, 0);
  const days = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  return { dayName: days[d.getDay()], dayNum: d.getDate() };
};

// ── Sub-components ────────────────────────────────────────────────────────────

/** Toast notification system — fixed top-right, auto-dismiss */
const Toast = ({ toasts, onDismiss }) => (
  <div className="fixed top-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
    {toasts.map((t) => (
      <div
        key={t.id}
        className={`pointer-events-auto flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl border backdrop-blur-xl max-w-sm animate-slide-in
          ${
            t.type === "error"
              ? "bg-rose-950/90 border-rose-500/30 text-rose-300"
              : "bg-emerald-950/90 border-emerald-500/30 text-emerald-300"
          }`}
      >
        <div
          className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${t.type === "error" ? "bg-rose-500/20" : "bg-emerald-500/20"}`}
        >
          {t.type === "error" ? (
            <AlertCircle className="w-4 h-4" />
          ) : (
            <CheckCircle2 className="w-4 h-4" />
          )}
        </div>
        <span className="text-xs font-bold flex-1 leading-relaxed">
          {t.message}
        </span>
        <button
          onClick={() => onDismiss(t.id)}
          className="p-1.5 hover:bg-white/10 rounded-lg transition-colors shrink-0"
        >
          <X className="w-3 h-3 opacity-60" />
        </button>
      </div>
    ))}
  </div>
);

/** Skeleton card for loading state */
const SkeletonCard = () => (
  <div className="p-5 rounded-[2rem] bg-slate-800/40 border-2 border-transparent animate-pulse">
    <div className="flex items-center gap-4">
      <div className="w-12 h-12 rounded-[1rem] bg-slate-700/60 shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3 bg-slate-700/60 rounded-full w-3/4" />
        <div className="h-2 bg-slate-700/40 rounded-full w-1/2" />
      </div>
      <div className="w-10 h-10 rounded-xl bg-slate-700/40 shrink-0" />
    </div>
  </div>
);

/** Date pill for the horizontal scroller */
const DatePill = ({ date, isSelected, hasRecord, onClick }) => {
  const base =
    "flex-shrink-0 w-16 md:w-20 h-20 md:h-24 rounded-[1.5rem] md:rounded-[2rem] flex flex-col items-center justify-center transition-all snap-center relative border-2 select-none";
  const future = date.isFuture
    ? "opacity-30 grayscale pointer-events-none cursor-not-allowed"
    : "cursor-pointer";
  const selected = isSelected
    ? "bg-indigo-600 border-indigo-500 text-white shadow-2xl shadow-indigo-500/40 scale-105 z-20"
    : "bg-slate-50/50 dark:bg-white/5 text-slate-500 border-transparent dark:border-white/5 hover:bg-white dark:hover:bg-white/10 hover:border-slate-200 dark:hover:border-white/10 active:scale-95";

  return (
    <button onClick={onClick} className={`${base} ${future} ${selected}`}>
      <span
        className={`text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] mb-1 ${isSelected ? "opacity-90" : "opacity-60"}`}
      >
        {date.dayName}
      </span>
      <span className="text-xl md:text-2xl font-black tracking-tighter leading-none">
        {date.dayNum}
      </span>

      {/* Event badge */}
      {date.isEvent && (
        <div
          className={`absolute top-2.5 right-2.5 w-2.5 h-2.5 rounded-full border-2 border-white/20 ${isSelected ? "bg-white" : "bg-indigo-500 animate-pulse"}`}
        />
      )}
      {/* Already has record dot */}
      {hasRecord && !date.isEvent && (
        <div
          className={`absolute top-2.5 right-2.5 w-2 h-2 rounded-full ${isSelected ? "bg-white/60" : "bg-emerald-500"}`}
        />
      )}
      {/* Today underline */}
      {date.isToday && !isSelected && (
        <div className="absolute -bottom-1 w-6 h-1 bg-indigo-500 rounded-full" />
      )}
    </button>
  );
};

/** Single member attendance card */
const MemberCard = ({ att, edited, onChange }) => {
  const isLeader = !!att.leaderType;
  const leaderInfo = isLeader ? resolveLeaderLabel(att) : null;
  const isPresent = edited?.present ?? false;

  const handleKeyDown = (e) => {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      onChange("present", !isPresent);
    }
  };

  return (
    <div
      className={`p-5 md:p-6 rounded-[2rem] border-2 transition-all group
        ${
          isPresent
            ? "bg-white dark:bg-[#1a2332] border-emerald-500 dark:border-emerald-500/50 shadow-xl shadow-emerald-500/5"
            : "bg-slate-50 dark:bg-slate-800/30 border-transparent dark:border-transparent"
        }`}
    >
      <div className="flex items-center gap-4 md:gap-5">
        {/* Avatar */}
        <div
          className={`w-12 h-12 md:w-14 md:h-14 rounded-[1rem] md:rounded-[1.2rem] flex items-center justify-center text-white text-lg md:text-xl font-bold transition-all shrink-0
  ${
    isPresent
      ? "bg-emerald-500 scale-105 shadow-lg shadow-emerald-500/30"
      : "bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400"
  }`}
        >
          {isLeader
            ? (() => {
                const Icon = leaderInfo.icon;
                return <Icon className="w-5 h-5" />;
              })()
            : att.memberName.charAt(0).toUpperCase()}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p
            className={`text-xs md:text-sm font-black tracking-tight truncate ${isPresent ? "text-slate-900 dark:text-white" : "text-slate-600 dark:text-slate-300"}`}
          >
            {getDisplayName(att.memberName)}
          </p>
          <div className="flex items-center gap-1.5 md:gap-2 mt-1 flex-wrap">
            {isLeader ? (
              <span
                className={`text-[8px] md:text-[9px] font-black uppercase tracking-widest text-${leaderInfo.color}-500`}
              >
                {leaderInfo.label}
              </span>
            ) : (
              <span className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-slate-400">
                Participante
              </span>
            )}
            {att.memberPhone && (
              <>
                <div
                  className={`w-1 h-1 rounded-full ${isPresent ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"}`}
                />
                <span className="text-[8px] md:text-[9px] font-bold text-slate-400 dark:text-slate-500 truncate">
                  {att.memberPhone}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Toggle button — keyboard accessible */}
        <button
          onClick={() => onChange("present", !isPresent)}
          onKeyDown={handleKeyDown}
          aria-label={isPresent ? "Marcar ausente" : "Marcar presente"}
          aria-pressed={isPresent}
          className={`rounded-xl md:rounded-2xl flex items-center justify-center transition-all shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2
            ${
              isPresent
                ? "bg-emerald-500 text-white active:scale-90 shadow-md shadow-emerald-500/30"
                : "bg-rose-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-white dark:text-slate-500 hover:border-emerald-500 hover:text-emerald-500 active:scale-90"
            }`}
        >
          {isPresent ? (
            <CheckCircle2 size={22} strokeWidth={2.5} />
          ) : (
            <svg
              width={22}
              height={22}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              <circle cx="12" cy="12" r="9" />
            </svg>
          )}
        </button>
      </div>

      {/* Justification — only when absent */}
      {!isPresent && (
        <div className="mt-4 md:mt-5 pt-4 md:pt-5 border-t border-slate-200 dark:border-slate-700/50 space-y-2 md:space-y-3 animate-fade-in">
          <label className="flex items-center gap-2.5 cursor-pointer group/just w-fit">
            <input
              type="checkbox"
              checked={edited?.justifiedAbsence ?? false}
              onChange={() =>
                onChange("justifiedAbsence", !edited?.justifiedAbsence)
              }
              className="hidden"
            />
            <div
              className={`w-4 h-4 md:w-5 md:h-5 rounded-md border-2 transition-all flex items-center justify-center
              ${edited?.justifiedAbsence ? "bg-amber-500 border-amber-500 text-white" : "border-slate-300 dark:border-slate-600 group-hover/just:border-amber-400"}`}
            >
              {edited?.justifiedAbsence && (
                <CheckCircle2 size={14} strokeWidth={2.5} />
              )}
            </div>
            <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 group-hover/just:text-slate-700 dark:group-hover/just:text-slate-300">
              Justificar Inasistencia
            </span>
          </label>
          {edited?.justifiedAbsence && (
            <input
              type="text"
              placeholder="¿Por qué no asistió?"
              value={edited?.justificationReason ?? ""}
              onChange={(e) => onChange("justificationReason", e.target.value)}
              className="w-full px-4 md:px-5 py-2.5 md:py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl md:rounded-2xl text-[10px] md:text-[11px] font-bold text-slate-700 dark:text-slate-300 outline-none focus:border-amber-500 transition-all"
            />
          )}
        </div>
      )}
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────
const CellAttendancePage = () => {
  const [loading, setLoading] = useState(false);
  const [userCells, setUserCells] = useState([]);
  const [monthAttendances, setMonthAttendances] = useState({});
  const [selectedCellId, setSelectedCellId] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTab, setFilterTab] = useState("all"); // "all" | "present" | "absent"
  const [attendances, setAttendances] = useState([]);
  const [editedAttendances, setEditedAttendances] = useState({});
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [summary, setSummary] = useState(null);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [showOverviewModal, setShowOverviewModal] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [eventDates, setEventDates] = useState(new Set());
  const [sessionForm, setSessionForm] = useState({
    newParticipants: 0,
    totalAttendees: "",
    notes: "",
  });
  const [toasts, setToasts] = useState([]);
  const [isDirty, setIsDirty] = useState(false);
  const searchRef = useRef(null);
  const { user, hasAnyRole } = useAuth();
  const isLeaderShip = hasAnyRole(["PASTORES", "CONEXION"]);
  const [datesWithRecords, setDatesWithRecords] = useState(new Set());

  // ── Toast helpers ──────────────────────────────────────────────────────────
  const addToast = useCallback((message, type = "success") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(
      () => setToasts((prev) => prev.filter((t) => t.id !== id)),
      4500,
    );
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // ── Data loading ───────────────────────────────────────────────────────────
  const loadInitialData = useCallback(async () => {
    setLoading(true);
    try {
      const [cellsRes, monthRes, eventsRes] = await Promise.all([
        apiService.getAccessibleCells(),
        apiService.getCellAttendancesCurrentMonth(),
        apiService.getActiveAttendanceEvents(),
      ]);

      setUserCells(Array.isArray(cellsRes) ? cellsRes : []);
      // ✅ CORRECCIÓN: Usar monthRes.cells en lugar de monthRes.attendances
      setMonthAttendances(monthRes?.cells || {});

      const dates = new Set();
      const now = new Date();
      (eventsRes?.events || []).forEach((ev) => {
        (ev.eventDates || []).forEach((d) => {
          const [y, m] = d.split("-").map(Number);
          if (y === now.getFullYear() && m - 1 === now.getMonth()) dates.add(d);
        });
      });
      setEventDates(dates);
      if (cellsRes?.length === 1) setSelectedCellId(String(cellsRes[0].id));
    } catch (err) {
      addToast(err.message || "Error de conexión", "error");
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // ── Keyboard shortcut: Cmd/Ctrl+K focuses search ──────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // ── Available dates ────────────────────────────────────────────────────────
  const availableDates = useMemo(() => {
    const now = new Date();

    // 🔐 Fecha de hoy en formato seguro (YYYY-MM-DD)
    const todayStr = new Date().toLocaleDateString("en-CA");

    const year = now.getFullYear();
    const month = now.getMonth();
    const lastDay = new Date(year, month + 1, 0).getDate();

    const dates = [];

    for (let day = 1; day <= lastDay; day++) {
      const d = new Date(year, month, day);

      const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

      if (ALLOWED_DAYS.includes(d.getDay()) || eventDates.has(iso)) {
        dates.push({
          value: iso,
          ...formatDateShort(iso),

          // ✅ Hoy
          isToday: iso === todayStr,

          // ❌ Futuro bloqueado (comparación segura)
          isFuture: iso > todayStr,

          // 🎯 Evento especial
          isEvent: eventDates.has(iso),
        });
      }
    }

    return dates.sort((a, b) => a.value.localeCompare(b.value));
  }, [eventDates]);

  // ── Load attendances when cell/date changes ────────────────────────────────
  const loadAttendances = useCallback(async () => {
  if (!selectedCellId || !selectedDate) return;
  setLoading(true);
  setIsDirty(false);
  try {
    const [attRes, sumRes, sesRes] = await Promise.all([
      apiService.getCellAttendancesByDate(selectedCellId, selectedDate),
      apiService.getCellAttendanceSummary(selectedCellId, selectedDate),
      apiService.getSessionData(selectedCellId, selectedDate),
    ]);
    const list = (attRes?.attendances || []).filter(
      (a) => a.attendanceDate === selectedDate,
    );
    setAttendances(list);
    setSummary(sumRes);
    
    // Verificar si hay datos significativos en esta fecha
    const hasSignificantData = list.some(a => 
      a.present === true || 
      a.justifiedAbsence === true ||
      (a.lastModifiedBy && a.lastModifiedBy !== "SYSTEM")
    );
    
    if (hasSignificantData) {
      setDatesWithRecords(prev => new Set([...prev, selectedDate]));
    }
    
    const edited = {};
    list.forEach((a) => {
      edited[a.memberId] = {
        present: a.present || false,
        justifiedAbsence: a.justifiedAbsence || false,
        justificationReason: a.justificationReason || "",
      };
    });
    setEditedAttendances(edited);
    setSessionForm(
      sesRes?.hasData
        ? {
            newParticipants: sesRes.sessionData.newParticipants || 0,
            totalAttendees: sesRes.sessionData.totalAttendees || "",
            notes: sesRes.sessionData.notes || "",
          }
        : { newParticipants: 0, totalAttendees: "", notes: "" },
    );
  } catch {
    setAttendances([]);
    setSummary(null);
  } finally {
    setLoading(false);
  }
}, [selectedCellId, selectedDate]);

  useEffect(() => {
    loadAttendances();
  }, [loadAttendances]);

  // ── Live stats ─────────────────────────────────────────────────────────────
  const liveStats = useMemo(() => {
    const total = Object.keys(editedAttendances).length;
    const present = Object.values(editedAttendances).filter(
      (a) => a.present,
    ).length;
    const absent = total - present;
    return {
      total,
      present,
      absent,
      pct: total > 0 ? Math.round((present / total) * 100) : 0,
    };
  }, [editedAttendances]);

  // ── Filtered & sorted list ─────────────────────────────────────────────────
  const filteredAttendances = useMemo(() => {
    let list = [...attendances].sort((a, b) => (b.leaderType ? 1 : -1));
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter((a) => a.memberName.toLowerCase().includes(q));
    }
    if (filterTab === "present")
      list = list.filter((a) => editedAttendances[a.memberId]?.present);
    if (filterTab === "absent")
      list = list.filter((a) => !editedAttendances[a.memberId]?.present);
    return list;
  }, [attendances, searchTerm, filterTab, editedAttendances]);

  // ── Member change handler (marks form dirty) ───────────────────────────────
  const handleMemberChange = useCallback((memberId, field, value) => {
    setEditedAttendances((prev) => ({
      ...prev,
      [memberId]: { ...prev[memberId], [field]: value },
    }));
    setIsDirty(true);
  }, []);

  // ── Bulk actions ───────────────────────────────────────────────────────────
  const markAll = useCallback((value) => {
    setEditedAttendances((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((id) => {
        next[id] = { ...next[id], present: value };
      });
      return next;
    });
    setIsDirty(true);
  }, []);

  // ── Save ───────────────────────────────────────────────────────────────────
  const handleFinalSubmit = async () => {
  if (!selectedDate) return;
  setSaving(true);
  try {
    const attendanceRequests = Object.entries(editedAttendances).map(
      ([id, data]) => ({
        memberId: Number(id),
        present: data.present,
        justifiedAbsence: data.justifiedAbsence,
        justificationReason: data.justificationReason,
      }),
    );
    await Promise.all([
      apiService.updateBulkCellAttendances(
        selectedCellId,
        selectedDate,
        attendanceRequests,
      ),
      apiService.saveSessionData(selectedCellId, selectedDate, {
        newParticipants: Number(sessionForm.newParticipants),
        totalAttendees: sessionForm.totalAttendees
          ? Number(sessionForm.totalAttendees)
          : null,
        notes: sessionForm.notes,
      }),
    ]);
    addToast("¡Reporte consolidado guardado con éxito!");
    
    // Marcar esta fecha como que tiene registros significativos
    setDatesWithRecords(prev => new Set([...prev, selectedDate]));
    
    setIsDirty(false);
    loadAttendances();
  } catch (err) {
    addToast(
      err?.message || "Ocurrió un error al sincronizar el reporte",
      "error",
    );
  } finally {
    setSaving(false);
  }
};

  // ── Generate list ──────────────────────────────────────────────────────────
  const handleGenerateList = async () => {
  setGenerating(true);
  try {
    await apiService.generateCellAttendances(selectedCellId, selectedDate);
    // IMPORTANTE: NO marcar la fecha aquí porque solo es la estructura inicial
    loadAttendances();
  } catch (err) {
    addToast(err.message, "error");
  } finally {
    setGenerating(false);
  }
};

  // ── Monthly PDF ────────────────────────────────────────────────────────────
  const handleMonthlyReport = async () => {
    if (!selectedCellId) {
      addToast("Selecciona una célula primero", "error");
      return;
    }
    setGenerating(true);
    try {
      const now = new Date();
      const stats = await apiService.getCellAttendanceMonthlyStats(
        selectedCellId,
        now.getFullYear(),
        now.getMonth() + 1,
      );
      const cell = userCells.find(
        (c) => String(c.id) === String(selectedCellId),
      );
      const months = [
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
      generateAttendancePDF(
        stats,
        cell?.name || "Célula",
        { mes: months[now.getMonth()], año: String(now.getFullYear()) },
        true,
      );
      addToast("Reporte mensual generado con éxito");
    } catch (err) {
      addToast("Error al generar reporte: " + (err.message || ""), "error");
    } finally {
      setGenerating(false);
    }
  };

  // ── Create event ───────────────────────────────────────────────────────────
  const handleCreateEvent = async (eventData) => {
    setSaving(true);
    try {
      await apiService.createAttendanceEvent(eventData);
      addToast("Evento desplegado con éxito");
      setShowEventModal(false);
      loadInitialData();
    } catch (err) {
      addToast("Falla al crear evento: " + (err.message || ""), "error");
    } finally {
      setSaving(false);
    }
  };

  // ── Computed ───────────────────────────────────────────────────────────────
  const hasAttendances = attendances.length > 0;
  const impactDefault =
    liveStats.present + (Number(sessionForm.newParticipants) || 0);

  // Dates that already have records (from monthAttendances)
  const recordedDates = useMemo(() => {
    if (!selectedCellId || !monthAttendances) return new Set();
    const key = String(selectedCellId);
    const cellAttendanceData = monthAttendances[key];

    if (!Array.isArray(cellAttendanceData)) return datesWithRecords;

    // Crear un mapa de fecha -> si tiene datos significativos
    const dateHasData = new Map();

    cellAttendanceData.forEach((attendance) => {
      const date = attendance.attendanceDate;
      const currentStatus = dateHasData.get(date) || false;

      // Una fecha tiene datos significativos si:
      // 1. Algún miembro está presente (present === true)
      // 2. O hay una justificación de ausencia
      // 3. O fue modificado por un usuario real (no SYSTEM)
      const hasSignificantData =
        currentStatus ||
        attendance.present === true ||
        attendance.justifiedAbsence === true ||
        (attendance.lastModifiedBy && attendance.lastModifiedBy !== "SYSTEM");

      if (hasSignificantData) {
        dateHasData.set(date, true);
      }
    });

    // Devolver solo las fechas que tienen datos significativos
    const result = new Set();
    for (const [date, hasData] of dateHasData.entries()) {
      if (hasData) {
        result.add(date);
      }
    }

    return result.size > 0 ? result : datesWithRecords;
  }, [monthAttendances, selectedCellId, datesWithRecords]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Toast portal */}
      <Toast toasts={toasts} onDismiss={dismissToast} />

      <div className="max-w-[1500px] mx-auto p-4 md:p-6 lg:p-10 space-y-6 md:space-y-8 animate-fade-in relative z-0">
        {/* ── HEADER ── */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 lg:gap-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <div className="w-16 h-16 md:w-20 md:h-20 bg-slate-900 dark:bg-white/5 backdrop-blur-xl rounded-[1.5rem] md:rounded-[2rem] flex items-center justify-center text-indigo-500 shadow-2xl shadow-indigo-500/10 border border-white/5 shrink-0">
              <Users className="w-8 h-8 md:w-10 md:h-10" />
            </div>
            <div>
              <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tighter">
                Agenda Asistencia
              </h1>
              {/* Cell selector */}
              <div className="relative mt-2 flex items-center gap-2 bg-slate-100 dark:bg-white/5 px-4 py-2 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm group focus-within:border-indigo-500 transition-colors">
                <MapPin className="w-4 h-4 text-indigo-500 shrink-0" />
                <select
                  value={selectedCellId || ""}
                  onChange={(e) => {
                    setSelectedCellId(e.target.value);
                    setSelectedDate("");
                  }}
                  className="bg-transparent border-none text-[10px] md:text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 outline-none cursor-pointer focus:text-indigo-600 dark:focus:text-indigo-400 transition-colors w-full min-w-[200px] appearance-none"
                >
                  <option value="">-- Selecciona Altar de Vida --</option>
                  {userCells.map((c) => (
                    <option
                      key={c.id}
                      value={c.id}
                      className="bg-white dark:bg-slate-900"
                    >
                      {c.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2 md:gap-3 w-full lg:w-auto">
            {isLeaderShip && (
              <button
                onClick={() => setShowEventModal(true)}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 md:px-8 py-3.5 md:py-4 bg-gradient-to-br from-indigo-600 to-indigo-700 text-white rounded-[1.5rem] font-black text-[8.5px] md:text-xs uppercase tracking-widest md:tracking-[0.2em] shadow-xl shadow-indigo-600/20 hover:shadow-indigo-600/40 hover:-translate-y-1 active:scale-95 transition-all group"
              >
                <Zap className="w-4 h-4 fill-white animate-pulse group-hover:scale-125 transition-transform" />
                <span className="whitespace-nowrap">Evento Especial</span>
              </button>
            )}
            <button
              onClick={() => setShowStatsModal(true)}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 md:px-8 py-3.5 md:py-4 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-[1.5rem] border border-slate-200 dark:border-slate-700 font-black text-[8.5px] md:text-xs uppercase tracking-widest md:tracking-[0.2em] shadow-lg hover:bg-slate-50 dark:hover:bg-slate-700 hover:-translate-y-1 active:scale-95 transition-all group"
            >
              <TrendingUp className="w-4 h-4 text-indigo-500 group-hover:scale-125 transition-transform" />
              <span className="whitespace-nowrap">
                {selectedCellId ? "Estadísticas" : "Estadísticas Globales"}
              </span>
            </button>
            <button
              onClick={handleMonthlyReport}
              disabled={generating || !selectedCellId}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 md:px-8 py-3.5 md:py-4 bg-gradient-to-br from-slate-800 to-slate-900 dark:from-indigo-900/40 dark:to-slate-800 text-white rounded-[1.5rem] font-black text-[8.5px] md:text-xs uppercase tracking-widest md:tracking-[0.2em] shadow-2xl hover:from-black hover:to-slate-800 transition-all hover:-translate-y-1 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              {generating ? (
                <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
              ) : (
                <Download className="w-4 h-4 text-indigo-400 group-hover:translate-y-0.5 transition-transform" />
              )}
              <span className="whitespace-nowrap">Reporte Mes</span>
            </button>
          </div>
        </div>

        {/* ── DATE SELECTOR ── */}
        <div className="bg-white/80 dark:bg-[#1a2332]/80 backdrop-blur-xl p-3 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-500/5 relative group">
          {/* Fade edges */}
          <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-white dark:from-[#1a2332] to-transparent z-10 rounded-l-[2.5rem] pointer-events-none opacity-60" />
          <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-white dark:from-[#1a2332] to-transparent z-10 rounded-r-[2.5rem] pointer-events-none opacity-60" />

          <div className="flex gap-3 overflow-x-auto no-scrollbar py-2 px-4 snap-x scroll-smooth">
            {availableDates.map((date) => (
              <DatePill
                key={date.value}
                date={date}
                isSelected={selectedDate === date.value}
                hasRecord={recordedDates.has(date.value)}
                onClick={() => setSelectedDate(date.value)}
              />
            ))}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 px-4 pt-1 pb-0.5">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                Con registro
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" />
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                Evento especial
              </span>
            </div>
          </div>
        </div>

        {/* ── MAIN GRID ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 items-start">
          {/* LEFT: ATTENDANCE LIST */}
          <div className="lg:col-span-8 flex flex-col gap-6 md:gap-8">
            {/* Empty — no date selected */}
            {!selectedDate && (
              <div className="py-24 md:py-32 text-center bg-white dark:bg-[#1a2332] rounded-[3rem] border border-slate-200 dark:border-slate-800 group px-6 shadow-xl shadow-slate-500/5 transition-all duration-700 hover:shadow-2xl">
                <div className="w-20 h-20 md:w-24 md:h-24 bg-slate-50 dark:bg-white/5 rounded-[2rem] md:rounded-[2.5rem] flex items-center justify-center text-slate-300 dark:text-slate-500 mx-auto mb-6 md:mb-8 group-hover:scale-110 group-hover:rotate-6 transition-all duration-700 border border-slate-200 dark:border-white/10 shadow-inner">
                  <Calendar className="w-10 h-10 md:w-12 md:h-12" />
                </div>
                <h3 className="text-xl md:text-2xl font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                  Selecciona una fecha
                </h3>
                <p className="text-[10px] md:text-xs font-bold text-slate-300 dark:text-slate-600 uppercase tracking-[0.3em] mt-3">
                  Cronograma Ministerial Altares
                </p>
              </div>
            )}

            {/* Empty — no attendances yet */}
            {selectedDate && !hasAttendances && !loading && (
              <div className="py-24 md:py-32 text-center bg-white dark:bg-[#1a2332] rounded-[3rem] border border-slate-200 dark:border-slate-800 px-6 shadow-2xl shadow-indigo-500/5 relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                <div className="w-20 h-20 md:w-24 md:h-24 bg-indigo-50 dark:bg-white/5 rounded-[2rem] md:rounded-[2.5rem] flex items-center justify-center text-indigo-500 mx-auto mb-6 md:mb-8 transition-all duration-700 group-hover:scale-110 group-hover:-rotate-3 border border-indigo-100 dark:border-white/10 shadow-lg relative z-10">
                  <Inbox className="w-10 h-10 md:w-12 md:h-12" />
                </div>
                <h3 className="text-xl md:text-2xl font-black text-slate-800 dark:text-white uppercase tracking-widest relative z-10">
                  Lista no generada
                </h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-2 relative z-10">
                  No hay miembros registrados para esta fecha
                </p>
                <button
                  onClick={handleGenerateList}
                  disabled={generating || !selectedCellId}
                  className="mt-8 md:mt-10 px-8 md:px-12 py-5 md:py-6 bg-indigo-600 text-white rounded-[2rem] font-black text-[11px] md:text-xs uppercase tracking-[0.2em] shadow-2xl shadow-indigo-600/30 hover:bg-indigo-500 transition-all flex items-center justify-center gap-3 mx-auto active:scale-95 disabled:opacity-70 relative z-10 hover:-translate-y-1"
                >
                  {generating ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <span>Generar Lista del Grupo</span>
                      <Zap className="w-4 h-4 text-amber-300" />
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Loading skeleton */}
            {loading && (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            )}

            {/* Attendance list */}
            {!loading && hasAttendances && (
              <div className="space-y-5 md:space-y-6 animate-fade-in">
                {/* Search + filter bar */}
                <div className="bg-white dark:bg-[#1a2332] p-4 md:p-5 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row gap-3 items-center">
                    {/* Search */}
                    <div className="relative w-full sm:flex-1 group">
                      <input
                        ref={searchRef}
                        type="text"
                        placeholder="Buscar miembro…"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-11 pr-10 py-3 bg-slate-50 dark:bg-black/20 border-2 border-transparent focus:border-indigo-500 rounded-xl text-xs font-bold text-slate-700 dark:text-white outline-none transition-all placeholder:text-slate-400"
                      />
                      {searchTerm && (
                        <button
                          onClick={() => setSearchTerm("")}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-200 dark:hover:bg-white/10 rounded-lg transition-colors"
                        >
                          <X className="w-3 h-3 text-slate-400" />
                        </button>
                      )}
                    </div>
                    {/* Bulk actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => markAll(true)}
                        className="px-4 py-3 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl text-[10px] font-black uppercase tracking-widest border border-emerald-200 dark:border-emerald-800/50 hover:bg-emerald-500 hover:text-white transition-all active:scale-95"
                      >
                        Todos
                      </button>
                      <button
                        onClick={() => markAll(false)}
                        className="px-4 py-3 bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-xl text-[10px] font-black uppercase tracking-widest border border-rose-200 dark:border-rose-800/50 hover:bg-rose-500 hover:text-white transition-all active:scale-95"
                      >
                        Ninguno
                      </button>
                    </div>
                  </div>

                  {/* Filter tabs */}
                  <div className="flex items-center gap-2 border-t border-slate-100 dark:border-slate-800 pt-3">
                    <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    {[
                      {
                        key: "all",
                        label: "Todos",
                        icon: Users,
                        count: liveStats.total,
                      },
                      {
                        key: "present",
                        label: "Presentes",
                        icon: UserCheck,
                        count: liveStats.present,
                      },
                      {
                        key: "absent",
                        label: "Ausentes",
                        icon: UserX,
                        count: liveStats.absent,
                      },
                    ].map(({ key, label, icon: Icon, count }) => (
                      <button
                        key={key}
                        onClick={() => setFilterTab(key)}
                        className={`flex items-center gap-1.5 px-2 md:px-3 py-1.5 rounded-lg text-[8px] md:text-[10px] font-black uppercase tracking-widest transition-all
                          ${
                            filterTab === key
                              ? "bg-indigo-600 text-white shadow-md"
                              : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5"
                          }`}
                      >
                        <Icon className="w-3 h-3" />
                        {label}
                        <span
                          className={`ml-0.5 px-1.5 py-0.5 rounded-md text-[8px] font-black ${filterTab === key ? "bg-white/20" : "bg-slate-100 dark:bg-white/10"}`}
                        >
                          {count}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* No results */}
                {filteredAttendances.length === 0 && (
                  <div className="py-12 text-center bg-slate-50 dark:bg-black/20 rounded-[2rem] border-2 border-dashed border-slate-200 dark:border-slate-800">
                    <Search className="w-10 h-10 text-slate-300 mx-auto mb-3 opacity-20" />
                    <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">
                      {searchTerm
                        ? `Sin resultados para "${searchTerm}"`
                        : `No hay miembros en esta vista`}
                    </p>
                  </div>
                )}

                {/* Member cards grid */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  {filteredAttendances.map((att) => (
                    <MemberCard
                      key={att.memberId}
                      att={att}
                      edited={editedAttendances[att.memberId]}
                      onChange={(field, value) =>
                        handleMemberChange(att.memberId, field, value)
                      }
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT: CONTROL PANEL */}
          <div className="lg:col-span-4 flex flex-col gap-6 lg:sticky lg:top-8">
            {/* KPI card */}
            <div className="bg-gradient-to-br from-indigo-600 to-indigo-900 p-8 rounded-[3rem] text-white shadow-2xl relative overflow-hidden group border border-white/10">
              <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -mr-20 -mt-20 group-hover:scale-150 transition-transform duration-700" />
              <div className="relative z-10 flex flex-col gap-5">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-80">
                    Estado Actual
                  </p>
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-white/20 rounded-lg">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[9px] font-black uppercase tracking-widest">
                      {liveStats.present} Confirmados
                    </span>
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <h2 className="text-6xl font-black tracking-tighter italic">
                    {liveStats.pct}%
                  </h2>
                  <p className="text-xs font-bold opacity-60 uppercase tracking-widest italic">
                    Eficacia
                  </p>
                </div>
                {/* Progress bar */}
                <div className="h-3 bg-black/20 rounded-full border border-white/5 p-0.5 overflow-hidden shadow-inner">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-400 to-teal-300 rounded-full transition-all duration-700 shadow-[0_0_15px_rgba(52,211,153,0.5)]"
                    style={{ width: `${liveStats.pct}%` }}
                  />
                </div>
                {/* Mini stats */}
                <div className="grid grid-cols-3 gap-3 mt-1">
                  {[
                    {
                      label: "Meta Mes",
                      value: `${summary?.avgAttendance?.toFixed(1) || 0}%`,
                    },
                    { label: "Presentes", value: liveStats.present },
                    { label: "Censo", value: liveStats.total },
                  ].map(({ label, value }) => (
                    <div
                      key={label}
                      className="p-3 bg-white/5 rounded-2xl border border-white/10 text-center"
                    >
                      <p className="text-lg font-black tracking-tighter">
                        {value}
                      </p>
                      <p className="text-[7px] font-black text-white/50 uppercase tracking-widest mt-0.5">
                        {label}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Session insights form */}
            <div className="bg-white dark:bg-[#1a2332] p-7 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-500/5 space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-indigo-50 dark:bg-white/5 text-indigo-500 dark:text-indigo-400 rounded-2xl flex items-center justify-center border border-indigo-100 dark:border-white/10 shadow-sm shrink-0">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-[0.2em]">
                    Bitácora Celebración
                  </h3>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                    Visitas y Revelaciones
                  </p>
                </div>
              </div>

              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1 flex items-center gap-1.5">
                      <Plus size={11} className="text-emerald-500" /> Visitas
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={sessionForm.newParticipants}
                      onChange={(e) => {
                        setSessionForm({
                          ...sessionForm,
                          newParticipants: e.target.value,
                        });
                        setIsDirty(true);
                      }}
                      className="w-full h-12 px-4 bg-slate-50 dark:bg-black/40 border-2 border-transparent focus:border-indigo-500 rounded-xl text-sm font-black text-slate-800 dark:text-white outline-none transition-all"
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1 flex items-center gap-1.5">
                      <Users size={11} className="text-indigo-500" /> Impacto
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={sessionForm.totalAttendees}
                      onChange={(e) => {
                        setSessionForm({
                          ...sessionForm,
                          totalAttendees: e.target.value,
                        });
                        setIsDirty(true);
                      }}
                      className="w-full h-12 px-4 bg-slate-50 dark:bg-black/40 border-2 border-transparent focus:border-indigo-500 rounded-xl text-sm font-black text-slate-800 dark:text-white outline-none transition-all"
                      placeholder={String(impactDefault)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1 flex items-center gap-1.5">
                    <BookOpen size={11} className="text-indigo-400" /> Notas u
                    Observaciones
                  </label>
                  <textarea
                    value={sessionForm.notes}
                    onChange={(e) => {
                      setSessionForm({ ...sessionForm, notes: e.target.value });
                      setIsDirty(true);
                    }}
                    rows="3"
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-black/40 border-2 border-transparent focus:border-indigo-500 rounded-2xl text-xs font-bold text-slate-700 dark:text-slate-300 outline-none transition-all resize-none no-scrollbar"
                    placeholder="Nuevos en consolidacion…"
                  />
                </div>
              </div>
            </div>

            {/* Save CTA */}
            <div className="bg-slate-900 p-8 rounded-[2.5rem] border border-white/5 shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700" />
              <div className="relative z-10 space-y-5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center border border-emerald-500/20">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  </div>
                  <p className="text-[9px] font-black text-emerald-400 uppercase tracking-[0.3em]">
                    Guardado Ministerial Consolidado
                  </p>
                </div>

                <h4 className="text-xl font-black text-white tracking-tight leading-tight italic">
                  ¿Listos para sincronizar?
                </h4>

                {/* Dirty indicator */}
                {isDirty && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl animate-fade-in">
                    <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <p className="text-[9px] font-black text-amber-400 uppercase tracking-widest">
                      Cambios sin guardar
                    </p>
                  </div>
                )}

                <button
                  onClick={handleFinalSubmit}
                  disabled={saving || !selectedDate}
                  className="w-full py-5 bg-white text-slate-900 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-xl hover:bg-emerald-50 hover:scale-[1.02] hover:-translate-y-1 transition-all active:scale-95 disabled:bg-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed flex items-center justify-center gap-3 group/btn"
                >
                  {saving ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      Sincronizar Todo{" "}
                      <Zap className="w-4 h-4 text-indigo-600 group-hover/btn:animate-bounce" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── MOBILE FLOATING BAR ── */}
        {hasAttendances && isDirty && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 lg:hidden animate-slide-up">
            <button
              onClick={handleFinalSubmit}
              disabled={saving}
              className="flex items-center gap-3 px-8 py-4 bg-indigo-600 text-white rounded-full font-black text-xs uppercase tracking-widest shadow-2xl shadow-indigo-600/40 hover:bg-indigo-500 active:scale-95 transition-all disabled:opacity-70"
            >
              {saving ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <ShieldCheck className="w-4 h-4" />
              )}
              Sincronizar · {liveStats.present}/{liveStats.total}
            </button>
          </div>
        )}
      </div>

      {/* ── MODALS ── */}
      {showEventModal && (
        <CreateAttendanceEventModal
          isOpen={showEventModal}
          onClose={() => setShowEventModal(false)}
          onCreate={handleCreateEvent}
          userRole={user?.roles?.[0]?.name || user?.roles?.[0]}
        />
      )}
      {showStatsModal && (
        <CellAttendanceStatsModal
          isOpen={showStatsModal}
          onClose={() => setShowStatsModal(false)}
          cellId={selectedCellId || ""}
          cellName={
            selectedCellId
              ? userCells.find((c) => String(c.id) === String(selectedCellId))
                  ?.name || "Célula"
              : "Estadísticas Globales"
          }
          apiService={apiService}
          logUserAction={logUserAction}
          onOpenOverview={() => {
            setShowStatsModal(false);
            setShowOverviewModal(true);
          }}
        />
      )}

      {showOverviewModal && (
        <CellGroupOverviewModal
          isOpen={showOverviewModal}
          onClose={() => setShowOverviewModal(false)}
          userCells={userCells}
          apiService={apiService}
          logUserAction={logUserAction}
          onSelectCell={(cellId) => {
            setSelectedCellId(cellId);
            setShowOverviewModal(false);
            setShowStatsModal(true);
          }}
        />
      )}

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes fadeIn   { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideIn  { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes slideUp  { from { opacity: 0; transform: translate(-50%, 20px); } to { opacity: 1; transform: translate(-50%, 0); } }
        .animate-fade-in   { animation: fadeIn  0.4s ease-out forwards; }
        .animate-slide-in  { animation: slideIn 0.35s cubic-bezier(0.16,1,0.3,1) forwards; }
        .animate-slide-up  { animation: slideUp 0.4s cubic-bezier(0.16,1,0.3,1) forwards; }
        select { -webkit-appearance: none; -moz-appearance: none; appearance: none; }
      `,
        }}
      />
    </>
  );
};

export default CellAttendancePage;
