// ============================================
// CellAttendancePage.jsx — Versión completa
// ============================================

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import apiService from "../apiService";
import { logUserAction } from "../utils/securityLogger";
import nameHelper from "../services/nameHelper";
import CellAttendanceStatsModal from "../components/CellAttendanceStatsModal";
import CreateAttendanceEventModal from "../components/CreateAttendanceEventModal";
import CellGroupOverviewModal from "../components/CellGroupOverviewModal";
import "../css/CellAttendancePage.css";

const { getDisplayName } = nameHelper;

const DEBUG = process.env.REACT_APP_DEBUG === "true";
const log = (msg, d) =>
  DEBUG && console.log(`[CellAttendancePage] ${msg}`, d || "");
const logError = (msg, e) => console.error(`[CellAttendancePage] ${msg}`, e);

// ── Constantes ────────────────────────────────────────────────────────────────
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

const DAY_LABELS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const DAY_LABELS_SHORT = ["DO", "LU", "MA", "MI", "JU", "VI", "SA"];
const DAY_NAMES_FULL = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];

const ALLOWED_DAYS = [0, 3, 4];
const ALLOWED_DAYS_NAMES = ["Domingo", "Miércoles", "Jueves"];

const LEADER_TYPE_MAP = {
  LEADER_12: { label: "Líder 12", icon: "👑", color: "#8b5cf6" },
  LEADER_144: { label: "Líder de Rama", icon: "🌿", color: "#3b82f6" },
  SERVANT: { label: "Servidor", icon: "🤝", color: "#10b981" },
  LEADER_GROUP: { label: "Líder de Grupo", icon: "🏠", color: "#f59e0b" },
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const isAllowedDay = (date) => {
  if (!date) return false;
  try {
    const [year, month, day] = date.split("-").map(Number);
    const d = new Date(year, month - 1, day, 12, 0, 0);
    return ALLOWED_DAYS.includes(d.getDay());
  } catch {
    return false;
  }
};

const isCurrentMonth = (dateStr) => {
  if (!dateStr) return false;
  try {
    const now = new Date();
    const [year, month, day] = dateStr.split("-").map(Number);
    const d = new Date(year, month - 1, day, 12, 0, 0);
    return (
      d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    );
  } catch {
    return false;
  }
};

const formatDate = (dateStr) => {
  if (!dateStr) return "";
  try {
    const [year, month, day] = dateStr.split("-").map(Number);
    const d = new Date(year, month - 1, day, 12, 0, 0);
    return d.toLocaleDateString("es-CO", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  } catch {
    return dateStr;
  }
};

const formatDateShort = (dateStr) => {
  if (!dateStr) return "";
  try {
    const [year, month, day] = dateStr.split("-").map(Number);
    const d = new Date(year, month - 1, day, 12, 0, 0);
    return `${DAY_LABELS[d.getDay()]} ${d.getDate()}`;
  } catch {
    return dateStr;
  }
};

const formatDateShortParts = (dateStr) => {
  if (!dateStr)
    return {
      dayShort: "",
      dayNum: "",
      dayFull: "",
      dayIndex: -1,
      dayName: "",
      isAllowed: false,
    };
  try {
    const [year, month, day] = dateStr.split("-").map(Number);
    const d = new Date(year, month - 1, day, 12, 0, 0);
    const dayIndex = d.getDay();
    return {
      dayShort: DAY_LABELS_SHORT[dayIndex],
      dayFull: DAY_LABELS[dayIndex],
      dayName: DAY_NAMES_FULL[dayIndex],
      dayNum: d.getDate().toString(),
      dayIndex,
      full: `${DAY_LABELS[dayIndex]} ${d.getDate()}`,
      month: d.getMonth(),
      year: d.getFullYear(),
      isAllowed: ALLOWED_DAYS.includes(dayIndex),
    };
  } catch {
    return {
      dayShort: "",
      dayNum: "",
      dayFull: "",
      dayIndex: -1,
      dayName: "",
      isAllowed: false,
    };
  }
};

const getAvailableDatesForCurrentMonth = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const dates = [];
  const lastDay = new Date(year, month + 1, 0).getDate();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  for (let day = 1; day <= lastDay; day++) {
    const d = new Date(year, month, day, 12, 0, 0);
    const dow = d.getDay();
    if (ALLOWED_DAYS.includes(dow)) {
      const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const parts = formatDateShortParts(iso);
      dates.push({
        value: iso,
        label: formatDateShort(iso),
        fullLabel: formatDate(iso),
        isPast: d < today,
        isToday: d.toDateString() === today.toDateString(),
        isFuture: d > today,
        dayShort: parts.dayShort,
        dayNum: parts.dayNum,
        dayName: parts.dayName,
        dayIndex: dow,
        isEvent: false,
      });
    }
  }
  return dates;
};

const escapeHtml = (text) => {
  if (!text || typeof text !== "string") return "";
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
};

const resolveLeaderLabel = (attendance) => {
  if (!attendance || !attendance.leaderType) return null;
  if (attendance.roleInCell) {
    const roleMap = {
      GROUP_LEADER: { label: "Líder de Grupo", icon: "🏠", color: "#f59e0b" },
      HOST: { label: "Anfitrión", icon: "🏡", color: "#10b981" },
      TIMOTEO: { label: "Timoteo", icon: "📖", color: "#10b981" },
      BRANCH_LEADER: { label: "Líder de Rama", icon: "🌿", color: "#3b82f6" },
      MAIN_LEADER: { label: "Líder 12", icon: "👑", color: "#8b5cf6" },
    };
    return (
      roleMap[attendance.roleInCell] ||
      LEADER_TYPE_MAP[attendance.leaderType] ||
      null
    );
  }
  return (
    LEADER_TYPE_MAP[attendance.leaderType] || {
      label: attendance.leaderType,
      icon: "👤",
      color: "#6b7280",
    }
  );
};

// ── Componente Principal ──────────────────────────────────────────────────────
const CellAttendancePage = () => {
  // ── State ──────────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [toastMessage, setToastMessage] = useState("");
  const [config, setConfig] = useState(null);
  const [userCells, setUserCells] = useState([]);
  const [monthAttendances, setMonthAttendances] = useState({});
  const [selectedCellId, setSelectedCellId] = useState(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [attendances, setAttendances] = useState([]);
  const [editedAttendances, setEditedAttendances] = useState({});
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [summary, setSummary] = useState(null);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showOverviewModal, setShowOverviewModal] = useState(false);
  const [activeTab, setActiveTab] = useState("register");
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 480);
  const [userRole, setUserRole] = useState('');

  // ── NUEVO: Eventos especiales y datos de sesión ────────────────────────────
  const [eventDates, setEventDates] = useState(new Set()); // Set de strings "yyyy-MM-dd"
  const [sessionData, setSessionData] = useState(null);    // datos guardados en BD
  const [sessionForm, setSessionForm] = useState({
    newParticipants: 0,
    totalAttendees: "",
    notes: "",
  });
  const [savingSession, setSavingSession] = useState(false);

  const quickActionRef = useRef(null);
  const operationRef = useRef(false);

  // ── availableDates: preset + fechas de eventos del mes actual ─────────────
  const availableDates = useMemo(() => {
    const preset = getAvailableDatesForCurrentMonth();
    const presetSet = new Set(preset.map((d) => d.value));
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const extras = [];

    eventDates.forEach((dateStr) => {
      if (!presetSet.has(dateStr) && isCurrentMonth(dateStr)) {
        const parts = formatDateShortParts(dateStr);
        const [year, month, day] = dateStr.split("-").map(Number);
        const d = new Date(year, month - 1, day, 12, 0, 0);
        extras.push({
          value: dateStr,
          label: formatDateShort(dateStr),
          fullLabel: formatDate(dateStr),
          isPast: d < today,
          isToday: d.toDateString() === today.toDateString(),
          isFuture: d > today,
          dayShort: parts.dayShort,
          dayNum: parts.dayNum,
          dayName: parts.dayName,
          dayIndex: parts.dayIndex,
          isEvent: true,
        });
      }
    });

    return [...preset, ...extras].sort((a, b) =>
      a.value.localeCompare(b.value),
    );
  }, [eventDates]);

  // ── Resize ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 480);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // ── Dark mode ──────────────────────────────────────────────────────────────
  useEffect(() => {
    try {
      const prefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)",
      ).matches;
      const savedMode = localStorage.getItem("darkMode");
      const htmlDark =
        document.documentElement.classList.contains("dark-mode") ||
        document.documentElement.classList.contains("dark");
      setIsDarkMode(savedMode === "true" || htmlDark || prefersDark);

      const observer = new MutationObserver(() => {
        setIsDarkMode(
          document.documentElement.classList.contains("dark-mode") ||
            document.documentElement.classList.contains("dark"),
        );
      });
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["class"],
      });

      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = (e) => {
        if (!localStorage.getItem("darkMode")) setIsDarkMode(e.matches);
      };
      mq.addEventListener("change", handler);
      return () => {
        observer.disconnect();
        mq.removeEventListener("change", handler);
      };
    } catch (e) {
      logError("Error detectando dark mode:", e);
    }
  }, []);

  const theme = {
    bg: isDarkMode ? "#0f172a" : "#f9fafb",
    bgSecondary: isDarkMode ? "#1e293b" : "#ffffff",
    bgTertiary: isDarkMode ? "#0f172a" : "#f1f5f9",
    text: isDarkMode ? "#f3f4f6" : "#1f2937",
    textSecondary: isDarkMode ? "#9ca3af" : "#6b7280",
    border: isDarkMode ? "#334155" : "#e5e7eb",
    errorBg: isDarkMode ? "#7f1d1d" : "#fee2e2",
    errorText: isDarkMode ? "#fecaca" : "#991b1b",
    successBg: isDarkMode ? "#14532d" : "#d1fae5",
    successText: isDarkMode ? "#a7f3d0" : "#065f46",
    accentBlue: isDarkMode ? "#60a5fa" : "#3b82f6",
    accentGreen: isDarkMode ? "#34d399" : "#10b981",
    accentAmber: isDarkMode ? "#fbbf24" : "#f59e0b",
    accentPurple: isDarkMode ? "#a78bfa" : "#8b5cf6",
  };

  // ── Auto-clear messages ────────────────────────────────────────────────────
  useEffect(() => {
    if (successMessage) {
      const t = setTimeout(() => setSuccessMessage(""), 5000);
      return () => clearTimeout(t);
    }
  }, [successMessage]);
  useEffect(() => {
    if (error) {
      const t = setTimeout(() => setError(""), 8000);
      return () => clearTimeout(t);
    }
  }, [error]);
  useEffect(() => {
    if (toastMessage) {
      const t = setTimeout(() => setToastMessage(""), 2000);
      return () => clearTimeout(t);
    }
  }, [toastMessage]);

  // ── Obtener rol del usuario ────────────────────────────────────────────────
  const getUserRole = useCallback(() => {
    try {
      const user = apiService.getCurrentUser?.();
      if (user?.roles?.length > 0) {
        setUserRole(user.roles[0].replace('ROLE_', ''));
      }
    } catch (e) {
      logError('Error obteniendo rol:', e);
    }
  }, []);

  // ── Cargar datos iniciales ─────────────────────────────────────────────────
  const loadInitialData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      getUserRole();
      const cfgRes = await apiService.getAttendanceConfig();
      setConfig(cfgRes);

      let cellsList = [];
      try {
        cellsList = await apiService.getAccessibleCells();
        log("Células cargadas:", cellsList?.length || 0);
      } catch (cellErr) {
        logError("Error cargando células:", cellErr);
        cellsList = [];
      }
      setUserCells(Array.isArray(cellsList) ? cellsList : []);

      let attendancesMap = {};
      try {
        const monthRes = await apiService.getCellAttendancesCurrentMonth();
        attendancesMap = monthRes?.attendances || {};
      } catch (attErr) {
        logError("Error cargando asistencias del mes:", attErr);
      }
      setMonthAttendances(attendancesMap);

      // ── NUEVO: Cargar eventos activos para obtener fechas especiales del mes ──
      try {
        const eventsRes = await apiService.getActiveAttendanceEvents();
        const events = eventsRes?.events || [];
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth(); // 0-indexed
        const dates = new Set();
        events.forEach((event) => {
          (event.eventDates || []).forEach((dateStr) => {
            const [y, m] = dateStr.split("-").map(Number);
            if (y === currentYear && m - 1 === currentMonth) {
              dates.add(dateStr);
            }
          });
        });
        setEventDates(dates);
        log("Fechas de eventos del mes:", dates.size);
      } catch (evErr) {
        logError("Error cargando eventos:", evErr);
        // No-op: el sistema funciona con los días preestablecidos
      }

      const finalCells = Array.isArray(cellsList) ? cellsList : [];
      if (finalCells.length === 1) setSelectedCellId(String(finalCells[0].id));

      logUserAction("load_cell_attendances", {
        totalCells: finalCells.length,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      logError("Error cargando datos:", err);
      setError(err.message || "Error al cargar los datos de asistencia");
    } finally {
      setLoading(false);
    }
  }, [getUserRole]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // ── Cargar asistencias para fecha seleccionada ─────────────────────────────
  const loadAttendancesForDate = useCallback(async () => {
    if (!selectedCellId || !selectedDate) {
      setAttendances([]);
      setSummary(null);
      // Limpiar datos de sesión al deseleccionar
      setSessionData(null);
      setSessionForm({ newParticipants: 0, totalAttendees: "", notes: "" });
      return;
    }

    setLoading(true);
    setError("");
    try {
      const res = await apiService.getCellAttendancesByDate(
        selectedCellId,
        selectedDate,
      );

      const rawAttendances = res?.attendances || {};
      const flatList = Array.isArray(rawAttendances)
        ? rawAttendances
        : Object.values(rawAttendances).flat();

      const list = flatList.filter((a) => a.attendanceDate === selectedDate);

      log("Asistencias cargadas para", selectedDate, ":", list.length);
      setAttendances(list);

      const edited = {};
      list.forEach((a) => {
        edited[a.memberId] = {
          present: a.present ?? false,
          justifiedAbsence: a.justifiedAbsence ?? false,
          justificationReason: a.justificationReason || "",
        };
      });
      setEditedAttendances(edited);

      try {
        const summaryRes = await apiService.getCellAttendanceSummary(
          selectedCellId,
          selectedDate,
        );
        setSummary(summaryRes);
      } catch {
        setSummary(null);
      }

      // ── NUEVO: Cargar datos de sesión (newParticipants / totalAttendees) ────
      try {
        const sdRes = await apiService.getSessionData(
          selectedCellId,
          selectedDate,
        );
        if (sdRes?.hasData && sdRes?.sessionData) {
          setSessionData(sdRes.sessionData);
          setSessionForm({
            newParticipants: sdRes.sessionData.newParticipants ?? 0,
            totalAttendees: sdRes.sessionData.totalAttendees ?? "",
            notes: sdRes.sessionData.notes ?? "",
          });
        } else {
          setSessionData(null);
          setSessionForm({ newParticipants: 0, totalAttendees: "", notes: "" });
        }
      } catch {
        setSessionData(null);
        setSessionForm({ newParticipants: 0, totalAttendees: "", notes: "" });
      }
    } catch (err) {
      logError("Error cargando asistencias:", err);
      if (
        err.message?.includes("No encontrado") ||
        err.message?.includes("404")
      ) {
        setAttendances([]);
        setEditedAttendances({});
        setSummary(null);
        setSessionData(null);
        setSessionForm({ newParticipants: 0, totalAttendees: "", notes: "" });
      } else if (
        err.message?.includes("Acceso denegado") ||
        err.message?.includes("403") ||
        err.message?.includes("permiso")
      ) {
        setAttendances([]);
        setEditedAttendances({});
        setSummary(null);
        setSessionData(null);
        setSessionForm({ newParticipants: 0, totalAttendees: "", notes: "" });
        setError("No tienes permiso para acceder a esta célula.");
      } else {
        setError(err.message || "Error al cargar asistencias");
      }
    } finally {
      setLoading(false);
    }
  }, [selectedCellId, selectedDate]);

  useEffect(() => {
    loadAttendancesForDate();
  }, [loadAttendancesForDate]);

  // ── Computed values ────────────────────────────────────────────────────────
  const hasUnsavedChanges = useMemo(() => {
    return attendances.some((a) => {
      const edited = editedAttendances[a.memberId];
      if (!edited) return false;
      return (
        a.present !== edited.present ||
        (a.justifiedAbsence ?? false) !== edited.justifiedAbsence ||
        (a.justificationReason || "") !== edited.justificationReason
      );
    });
  }, [attendances, editedAttendances]);

  const liveStats = useMemo(() => {
    const total = Object.keys(editedAttendances).length;
    const presentCount = Object.values(editedAttendances).filter(
      (a) => a.present,
    ).length;
    const absentCount = total - presentCount;
    const justifiedCount = Object.values(editedAttendances).filter(
      (a) => !a.present && a.justifiedAbsence,
    ).length;
    const percentage = total > 0 ? Math.round((presentCount / total) * 100) : 0;
    return { total, presentCount, absentCount, justifiedCount, percentage };
  }, [editedAttendances]);

  const { leaders, members } = useMemo(() => {
    const l = attendances.filter((a) => a.leaderType && a.leaderType !== "");
    const m = attendances.filter((a) => !a.leaderType || a.leaderType === "");
    return { leaders: l, members: m };
  }, [attendances]);

  // ── MODIFICADO: isEditable también acepta fechas de eventos activos ────────
  const isEditable = useMemo(() => {
    if (!selectedDate) return false;
    const inCurrentMonth = isCurrentMonth(selectedDate);
    const isPresetDay = inCurrentMonth && isAllowedDay(selectedDate);
    const isEventDay = inCurrentMonth && eventDates.has(selectedDate);
    return isPresetDay || isEventDay;
  }, [selectedDate, eventDates]);

  const cellNames = useMemo(() => {
    const names = {};
    userCells.forEach((c) => {
      names[String(c.id)] = c.name || `Célula #${c.id}`;
    });
    return names;
  }, [userCells]);

  const cellHasMonthAttendances = useCallback(
    (cellId) => {
      const key = String(cellId);
      return monthAttendances[key] && monthAttendances[key].length > 0;
    },
    [monthAttendances],
  );

  const selectedDateParts = useMemo(
    () => formatDateShortParts(selectedDate),
    [selectedDate],
  );

  const handleOpenStats = useCallback(() => {
    if (!selectedCellId) return;
    setShowStatsModal(true);
  }, [selectedCellId]);

  // ── Crear evento especial ──────────────────────────────────────────────────
  const handleCreateEvent = useCallback(async (eventData) => {
    try {
      const response = await apiService.createAttendanceEvent(eventData);
      // Recargar fechas de eventos
      const eventsRes = await apiService.getActiveAttendanceEvents().catch(() => null);
      if (eventsRes) {
        const now = new Date();
        const dates = new Set();
        (eventsRes?.events || []).forEach((event) => {
          (event.eventDates || []).forEach((dateStr) => {
            const [y, m] = dateStr.split('-').map(Number);
            if (y === now.getFullYear() && m - 1 === now.getMonth()) dates.add(dateStr);
          });
        });
        setEventDates(dates);
      }
      setSuccessMessage('✅ Evento creado exitosamente');
      logUserAction('create_attendance_event', {
        eventName: eventData.name,
        datesCount: eventData.eventDates.length,
        timestamp: new Date().toISOString(),
      });
      return response;
    } catch (err) {
      logError('Error creando evento:', err);
      throw err;
    }
  }, []);

  // ── Generar asistencias ────────────────────────────────────────────────────
  const handleGenerate = useCallback(async () => {
    if (!selectedCellId || !selectedDate) return;

    if (operationRef.current) {
      log("Generación ya en progreso, ignorando doble clic");
      return;
    }

    // ── MODIFICADO: permitir días de eventos además de los preestablecidos ──
    if (!isAllowedDay(selectedDate) && !eventDates.has(selectedDate)) {
      setError(
        "La fecha seleccionada no es un día de reunión (Domingo, Miércoles, Jueves) ni corresponde a un evento activo",
      );
      return;
    }

    operationRef.current = true;
    setGenerating(true);
    setError("");

    try {
      await apiService.generateCellAttendances(selectedCellId, selectedDate);
      setSuccessMessage("Asistencias generadas exitosamente");
      await loadAttendancesForDate();
      try {
        const monthRes = await apiService.getCellAttendancesCurrentMonth();
        setMonthAttendances(monthRes?.attendances || {});
      } catch {
        /* no-op */
      }
      logUserAction("generate_cell_attendances", {
        cellId: selectedCellId,
        date: selectedDate,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      logError("Error generando asistencias:", err);
      setError(err.message || "Error al generar asistencias");
    } finally {
      setGenerating(false);
      operationRef.current = false;
    }
  }, [selectedCellId, selectedDate, eventDates, loadAttendancesForDate]);

  // ── Handlers de asistencia ─────────────────────────────────────────────────
  const handleTogglePresent = useCallback((memberId) => {
    setEditedAttendances((prev) => {
      const current = prev[memberId] || {};
      const newPresent = !current.present;
      return {
        ...prev,
        [memberId]: {
          ...current,
          present: newPresent,
          justifiedAbsence: newPresent ? false : current.justifiedAbsence,
          justificationReason: newPresent ? "" : current.justificationReason,
        },
      };
    });
  }, []);

  const handleToggleJustified = useCallback((memberId) => {
    setEditedAttendances((prev) => {
      const current = prev[memberId] || {};
      return {
        ...prev,
        [memberId]: {
          ...current,
          justifiedAbsence: !current.justifiedAbsence,
          justificationReason: !current.justifiedAbsence
            ? current.justificationReason
            : "",
        },
      };
    });
  }, []);

  const handleJustificationChange = useCallback((memberId, reason) => {
    setEditedAttendances((prev) => ({
      ...prev,
      [memberId]: { ...prev[memberId], justificationReason: reason },
    }));
  }, []);

  const handleMarkAll = useCallback((present) => {
    setEditedAttendances((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((memberId) => {
        updated[memberId] = {
          ...updated[memberId],
          present,
          justifiedAbsence: present
            ? false
            : updated[memberId]?.justifiedAbsence,
          justificationReason: present
            ? ""
            : updated[memberId]?.justificationReason,
        };
      });
      return updated;
    });
    setToastMessage(
      present
        ? "✅ Todos marcados como presentes"
        : "❌ Todos marcados como ausentes",
    );
    if (quickActionRef.current) {
      quickActionRef.current.style.animation = "none";
      void quickActionRef.current.offsetHeight;
      quickActionRef.current.style.animation =
        "caQuickActionFlash 0.2s ease-out";
    }
  }, []);

  const handleSave = useCallback(async () => {
    if (!selectedCellId || !selectedDate) return;

    if (operationRef.current) {
      log("Guardado ya en progreso, ignorando doble clic");
      return;
    }

    operationRef.current = true;
    setSaving(true);
    setError("");

    try {
      const requests = Object.entries(editedAttendances).map(
        ([memberId, data]) => ({
          memberId: Number(memberId),
          present: data.present,
          justifiedAbsence: !data.present ? data.justifiedAbsence : null,
          justificationReason:
            !data.present && data.justifiedAbsence
              ? data.justificationReason
              : null,
        }),
      );

      await apiService.updateBulkCellAttendances(
        selectedCellId,
        selectedDate,
        requests,
      );
      setSuccessMessage("Asistencias guardadas exitosamente");
      await loadAttendancesForDate();

      logUserAction("save_cell_attendances", {
        cellId: selectedCellId,
        date: selectedDate,
        totalRecords: requests.length,
        presentCount: requests.filter((r) => r.present).length,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      logError("Error guardando asistencias:", err);
      setError(err.message || "Error al guardar asistencias");
    } finally {
      setSaving(false);
      operationRef.current = false;
    }
  }, [selectedCellId, selectedDate, editedAttendances, loadAttendancesForDate]);

  // ── NUEVO: Guardar datos de sesión ─────────────────────────────────────────
  const handleSaveSession = useCallback(async () => {
    if (!selectedCellId || !selectedDate) return;
    setSavingSession(true);
    try {
      const payload = {
        newParticipants: parseInt(sessionForm.newParticipants, 10) || 0,
        totalAttendees:
          sessionForm.totalAttendees !== ""
            ? parseInt(sessionForm.totalAttendees, 10)
            : null,
        notes: sessionForm.notes || null,
      };
      const res = await apiService.saveSessionData(
        selectedCellId,
        selectedDate,
        payload,
      );
      setSessionData(res?.sessionData || null);
      setToastMessage("✅ Datos de sesión guardados");
      logUserAction("save_session_data", {
        cellId: selectedCellId,
        date: selectedDate,
        ...payload,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      logError("Error guardando datos de sesión:", err);
      setError(err.message || "Error al guardar datos de sesión");
    } finally {
      setSavingSession(false);
    }
  }, [selectedCellId, selectedDate, sessionForm]);

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  // ── Stats bar ─────────────────────────────────────────────────────────────
  const renderLiveStats = () => {
    if (!attendances.length) return null;

    const pct = liveStats.percentage;
    const barColor =
      pct >= 80 ? theme.accentGreen : pct >= 50 ? theme.accentAmber : "#ef4444";

    return (
      <div
        style={{
          backgroundColor: theme.bgSecondary,
          border: `1px solid ${theme.border}`,
          borderRadius: "14px",
          padding: "14px 18px",
          marginBottom: "14px",
          position: "relative",
          top: "auto",
          zIndex: 1,
        }}
      >
        {/* Barra de progreso */}
        <div style={{ marginBottom: "12px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "4px",
            }}
          >
            <span
              style={{
                fontSize: "0.8rem",
                color: theme.textSecondary,
                fontWeight: 600,
              }}
            >
              Asistencia del día
            </span>
            <span
              style={{ fontSize: "0.8rem", fontWeight: 700, color: barColor }}
            >
              {pct}%
            </span>
          </div>
          <div
            style={{
              height: "8px",
              backgroundColor: theme.bgTertiary,
              borderRadius: "4px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${pct}%`,
                backgroundColor: barColor,
                borderRadius: "4px",
                transition: "width 0.4s ease",
              }}
            />
          </div>
        </div>

        {/* Contadores */}
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {[
            { label: "Total", value: liveStats.total, color: theme.accentBlue },
            {
              label: "Presentes",
              value: liveStats.presentCount,
              color: theme.accentGreen,
            },
            {
              label: "Ausentes",
              value: liveStats.absentCount,
              color: "#ef4444",
            },
            {
              label: "Justificados",
              value: liveStats.justifiedCount,
              color: theme.accentAmber,
            },
          ].map((item) => (
            <div
              key={item.label}
              style={{
                flex: "1 1 60px",
                textAlign: "center",
                backgroundColor: theme.bgTertiary,
                borderRadius: "10px",
                padding: "8px 4px",
              }}
            >
              <div
                style={{
                  fontSize: "1.3rem",
                  fontWeight: 700,
                  color: item.color,
                }}
              >
                {item.value}
              </div>
              <div
                style={{
                  fontSize: "0.68rem",
                  color: theme.textSecondary,
                  marginTop: "2px",
                }}
              >
                {item.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ── NUEVO: Formulario de datos de sesión ──────────────────────────────────
  const renderSessionDataForm = () => {
    // Mostrar si hay asistencias cargadas, o si ya hay datos de sesión guardados
    if (!attendances.length && !sessionData) return null;

    const totalAttendeesCalc =
      liveStats.presentCount + (parseInt(sessionForm.newParticipants, 10) || 0);

    return (
      <div
        style={{
          backgroundColor: theme.bgSecondary,
          border: `1px solid ${theme.border}`,
          borderRadius: "14px",
          padding: "14px 18px",
          marginBottom: "14px",
        }}
      >
        {/* Encabezado */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "12px",
          }}
        >
          <span
            style={{ fontSize: "0.82rem", fontWeight: 700, color: theme.text }}
          >
            👥 Datos de Sesión
          </span>
          {sessionData && (
            <span
              style={{
                fontSize: "0.7rem",
                color: theme.accentGreen,
                fontWeight: 600,
              }}
            >
              ✅ Guardado
            </span>
          )}
        </div>

        {/* Campos */}
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          {/* Nuevas visitas */}
          <div style={{ flex: "1 1 100px", minWidth: "90px" }}>
            <label
              style={{
                fontSize: "0.7rem",
                color: theme.textSecondary,
                display: "block",
                marginBottom: "4px",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.3px",
              }}
            >
              Nuevas visitas
            </label>
            <input
              type="number"
              min="0"
              value={sessionForm.newParticipants}
              onChange={(e) =>
                setSessionForm((prev) => ({
                  ...prev,
                  newParticipants: e.target.value,
                }))
              }
              disabled={!isEditable}
              style={{
                width: "100%",
                padding: "6px 10px",
                borderRadius: "8px",
                border: `1px solid ${theme.border}`,
                backgroundColor: theme.bgTertiary,
                color: theme.text,
                fontSize: "0.85rem",
                outline: "none",
                opacity: isEditable ? 1 : 0.7,
              }}
            />
          </div>

          {/* Total asistentes */}
          <div style={{ flex: "1 1 100px", minWidth: "90px" }}>
            <label
              style={{
                fontSize: "0.7rem",
                color: theme.textSecondary,
                display: "block",
                marginBottom: "4px",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.3px",
              }}
            >
              Total asistentes
            </label>
            <input
              type="number"
              min="0"
              placeholder={`Auto (${totalAttendeesCalc})`}
              value={sessionForm.totalAttendees}
              onChange={(e) =>
                setSessionForm((prev) => ({
                  ...prev,
                  totalAttendees: e.target.value,
                }))
              }
              disabled={!isEditable}
              style={{
                width: "100%",
                padding: "6px 10px",
                borderRadius: "8px",
                border: `1px solid ${theme.border}`,
                backgroundColor: theme.bgTertiary,
                color: theme.text,
                fontSize: "0.85rem",
                outline: "none",
                opacity: isEditable ? 1 : 0.7,
              }}
            />
          </div>

          {/* Botón guardar (solo si editable) */}
          {isEditable && (
            <div style={{ display: "flex", alignItems: "flex-end" }}>
              <button
                onClick={handleSaveSession}
                disabled={savingSession}
                style={{
                  padding: "6px 16px",
                  borderRadius: "8px",
                  border: "none",
                  backgroundColor: theme.accentGreen,
                  color: "white",
                  fontWeight: 600,
                  fontSize: "0.78rem",
                  cursor: savingSession ? "not-allowed" : "pointer",
                  opacity: savingSession ? 0.6 : 1,
                  transition: "opacity 0.2s",
                  whiteSpace: "nowrap",
                }}
              >
                {savingSession ? "⏳" : "💾 Guardar"}
              </button>
            </div>
          )}
        </div>

        {/* Resumen calculado */}
        {(parseInt(sessionForm.newParticipants, 10) > 0 ||
          sessionData?.newParticipants > 0) && (
          <div
            style={{
              marginTop: "10px",
              fontSize: "0.74rem",
              color: theme.textSecondary,
              backgroundColor: theme.bgTertiary,
              borderRadius: "8px",
              padding: "6px 10px",
            }}
          >
            🧮 Total calculado:{" "}
            <strong style={{ color: theme.accentBlue }}>
              {sessionForm.totalAttendees !== ""
                ? sessionForm.totalAttendees
                : totalAttendeesCalc}
            </strong>{" "}
            ({liveStats.presentCount} miembros presentes +{" "}
            {parseInt(sessionForm.newParticipants, 10) || 0} visitas)
          </div>
        )}
      </div>
    );
  };

  // ── Tarjeta de participante ────────────────────────────────────────────────
  const renderParticipantCard = (attendance, isLeader = false) => {
    const memberId = attendance.memberId;
    const edited = editedAttendances[memberId] || {};
    const isPresent = edited.present ?? false;
    const isJustified = edited.justifiedAbsence ?? false;
    const leaderInfo = isLeader ? resolveLeaderLabel(attendance) : null;
    const name = getDisplayName
      ? getDisplayName(attendance.memberName || "Sin nombre")
      : attendance.memberName || "Sin nombre";

    const cardBg = isPresent
      ? isDarkMode
        ? "rgba(20,83,45,0.35)"
        : "#f0fdf4"
      : isDarkMode
        ? "rgba(127,29,29,0.25)"
        : "#fff1f2";
    const cardBorder = isPresent
      ? isDarkMode
        ? "#16a34a55"
        : "#bbf7d0"
      : isDarkMode
        ? "#dc262655"
        : "#fecdd3";

    return (
      <div
        key={`${memberId}-${attendance.attendanceDate}`}
        style={{
          backgroundColor: cardBg,
          border: `1.5px solid ${cardBorder}`,
          borderRadius: "12px",
          padding: "12px 14px",
          marginBottom: "8px",
          transition: "all 0.15s ease",
        }}
      >
        {/* Fila principal */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {/* Avatar */}
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              flexShrink: 0,
              backgroundColor: isLeader
                ? leaderInfo?.color || theme.accentPurple
                : theme.accentBlue,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontWeight: 700,
              fontSize: isLeader ? "1.1rem" : "1rem",
            }}
          >
            {isLeader ? leaderInfo?.icon || "👤" : name.charAt(0).toUpperCase()}
          </div>

          {/* Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontWeight: 600,
                fontSize: "0.88rem",
                color: theme.text,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {escapeHtml(name)}
            </div>

            {isLeader && leaderInfo && (
              <div
                style={{
                  fontSize: "0.74rem",
                  color: leaderInfo.color,
                  fontWeight: 500,
                }}
              >
                {leaderInfo.icon} {leaderInfo.label}
              </div>
            )}

            {attendance.displayRole && !isLeader && (
              <div style={{ fontSize: "0.72rem", color: theme.textSecondary }}>
                {attendance.displayRole}
              </div>
            )}

            {attendance.memberPhone && (
              <div
                style={{
                  fontSize: "0.7rem",
                  color: theme.textSecondary,
                  marginTop: "1px",
                }}
              >
                📞 {attendance.memberPhone}
              </div>
            )}
          </div>

          {/* Botón presente/ausente */}
          <button
            onClick={() => isEditable && handleTogglePresent(memberId)}
            disabled={!isEditable}
            style={{
              padding: "6px 14px",
              borderRadius: "20px",
              border: "none",
              fontWeight: 600,
              fontSize: "0.8rem",
              cursor: isEditable ? "pointer" : "default",
              backgroundColor: isPresent ? "#16a34a" : "#dc2626",
              color: "white",
              transition: "all 0.15s ease",
              opacity: isEditable ? 1 : 0.7,
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            {isPresent ? "✅ Presente" : "❌ Ausente"}
          </button>
        </div>

        {/* Justificación — solo si ausente */}
        {!isPresent && isEditable && (
          <div
            style={{
              paddingLeft: "50px",
              marginTop: "8px",
              display: "flex",
              flexDirection: "column",
              gap: "6px",
            }}
          >
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "0.78rem",
                color: theme.textSecondary,
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={isJustified}
                onChange={() => handleToggleJustified(memberId)}
                style={{ cursor: "pointer" }}
              />
              Ausencia justificada
            </label>

            {isJustified && (
              <input
                type="text"
                placeholder="Motivo de justificación..."
                value={edited.justificationReason || ""}
                onChange={(e) =>
                  handleJustificationChange(memberId, e.target.value)
                }
                maxLength={200}
                style={{
                  padding: "6px 10px",
                  borderRadius: "8px",
                  fontSize: "0.78rem",
                  border: `1px solid ${theme.border}`,
                  backgroundColor: theme.bgTertiary,
                  color: theme.text,
                  outline: "none",
                  width: "100%",
                  boxSizing: "border-box",
                }}
              />
            )}
          </div>
        )}

        {/* Justificación solo lectura */}
        {!isPresent && !isEditable && isJustified && (
          <div
            style={{
              paddingLeft: "50px",
              marginTop: "6px",
              fontSize: "0.76rem",
              color: theme.accentAmber,
            }}
          >
            📝 Justificado
            {edited.justificationReason
              ? `: ${edited.justificationReason}`
              : ""}
          </div>
        )}
      </div>
    );
  };

  // ── Tab Resumen ───────────────────────────────────────────────────────────
  const renderSummaryTab = () => {
    if (!summary && !attendances.length) return null;

    const present = attendances.filter(
      (a) => editedAttendances[a.memberId]?.present ?? a.present,
    );
    const absent = attendances.filter(
      (a) => !(editedAttendances[a.memberId]?.present ?? a.present),
    );
    const justified = absent.filter(
      (a) =>
        editedAttendances[a.memberId]?.justifiedAbsence ?? a.justifiedAbsence,
    );

    // Calcular totalAttendees para el resumen
    const newParticipantsVal = parseInt(sessionForm.newParticipants, 10) || 0;
    const totalAttendeesVal =
      sessionForm.totalAttendees !== ""
        ? parseInt(sessionForm.totalAttendees, 10)
        : present.length + newParticipantsVal;

    return (
      <div style={{ padding: "4px 0" }}>
        {/* Tarjetas de resumen */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
            gap: "10px",
            marginBottom: "20px",
          }}
        >
          {[
            {
              label: "Total",
              value: attendances.length,
              icon: "👥",
              color: theme.accentBlue,
            },
            {
              label: "Presentes",
              value: present.length,
              icon: "✅",
              color: theme.accentGreen,
            },
            {
              label: "Ausentes",
              value: absent.length,
              icon: "❌",
              color: "#ef4444",
            },
            {
              label: "Justificados",
              value: justified.length,
              icon: "📝",
              color: theme.accentAmber,
            },
          ].map((item) => (
            <div
              key={item.label}
              style={{
                backgroundColor: theme.bgSecondary,
                border: `1px solid ${theme.border}`,
                borderRadius: "12px",
                padding: "16px",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: "1.6rem", marginBottom: "4px" }}>
                {item.icon}
              </div>
              <div
                style={{
                  fontSize: "1.8rem",
                  fontWeight: 700,
                  color: item.color,
                }}
              >
                {item.value}
              </div>
              <div style={{ fontSize: "0.75rem", color: theme.textSecondary }}>
                {item.label}
              </div>
            </div>
          ))}
        </div>

        {/* ── NUEVO: Bloque de datos de sesión en el resumen ─────────────────── */}
        {(newParticipantsVal > 0 || sessionData) && (
          <div
            style={{
              backgroundColor: theme.bgSecondary,
              border: `1px solid ${theme.border}`,
              borderRadius: "12px",
              padding: "14px 16px",
              marginBottom: "16px",
              display: "flex",
              gap: "16px",
              flexWrap: "wrap",
            }}
          >
            <div style={{ textAlign: "center", flex: "1 1 80px" }}>
              <div
                style={{
                  fontSize: "1.5rem",
                  fontWeight: 700,
                  color: theme.accentPurple,
                }}
              >
                {newParticipantsVal}
              </div>
              <div style={{ fontSize: "0.72rem", color: theme.textSecondary }}>
                🌟 Nuevas visitas
              </div>
            </div>
            <div style={{ textAlign: "center", flex: "1 1 80px" }}>
              <div
                style={{
                  fontSize: "1.5rem",
                  fontWeight: 700,
                  color: theme.accentBlue,
                }}
              >
                {totalAttendeesVal}
              </div>
              <div style={{ fontSize: "0.72rem", color: theme.textSecondary }}>
                🏠 Total en el lugar
              </div>
            </div>
          </div>
        )}

        {/* Lista presentes */}
        {present.length > 0 && (
          <div style={{ marginBottom: "16px" }}>
            <h3
              style={{
                color: theme.accentGreen,
                marginBottom: "10px",
                fontSize: "0.95rem",
              }}
            >
              ✅ Presentes ({present.length})
            </h3>
            {present.map((a) => {
              const name = getDisplayName
                ? getDisplayName(a.memberName || "Sin nombre")
                : a.memberName || "Sin nombre";
              return (
                <div
                  key={a.memberId}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "8px 12px",
                    backgroundColor: theme.bgSecondary,
                    borderRadius: "8px",
                    marginBottom: "4px",
                    border: `1px solid ${theme.border}`,
                  }}
                >
                  <span
                    style={{
                      width: "28px",
                      height: "28px",
                      borderRadius: "50%",
                      backgroundColor: theme.accentGreen,
                      color: "white",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {name.charAt(0).toUpperCase()}
                  </span>
                  <span style={{ fontSize: "0.85rem", color: theme.text }}>
                    {escapeHtml(name)}
                  </span>
                  {a.leaderType && resolveLeaderLabel(a) && (
                    <span
                      style={{
                        fontSize: "0.7rem",
                        color: resolveLeaderLabel(a).color,
                        marginLeft: "auto",
                      }}
                    >
                      {resolveLeaderLabel(a).icon} {resolveLeaderLabel(a).label}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Lista ausentes */}
        {absent.length > 0 && (
          <div>
            <h3
              style={{
                color: "#ef4444",
                marginBottom: "10px",
                fontSize: "0.95rem",
              }}
            >
              ❌ Ausentes ({absent.length})
            </h3>
            {absent.map((a) => {
              const name = getDisplayName
                ? getDisplayName(a.memberName || "Sin nombre")
                : a.memberName || "Sin nombre";
              const isJust =
                editedAttendances[a.memberId]?.justifiedAbsence ??
                a.justifiedAbsence;
              const reason =
                editedAttendances[a.memberId]?.justificationReason ??
                a.justificationReason;
              return (
                <div
                  key={a.memberId}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "8px",
                    padding: "8px 12px",
                    backgroundColor: theme.bgSecondary,
                    borderRadius: "8px",
                    marginBottom: "4px",
                    border: `1px solid ${theme.border}`,
                  }}
                >
                  <span
                    style={{
                      width: "28px",
                      height: "28px",
                      borderRadius: "50%",
                      backgroundColor: isJust ? theme.accentAmber : "#ef4444",
                      color: "white",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {name.charAt(0).toUpperCase()}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "0.85rem", color: theme.text }}>
                      {escapeHtml(name)}
                    </div>
                    {isJust && (
                      <div
                        style={{
                          fontSize: "0.72rem",
                          color: theme.accentAmber,
                          marginTop: "2px",
                        }}
                      >
                        📝 Justificado{reason ? `: ${reason}` : ""}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // MAIN RENDER
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div
      className="ca-page"
      style={{ backgroundColor: theme.bg, color: theme.text }}
    >
      <div className="ca-page-container">
        {/* Header */}
        <div className="ca-page__header">
          <div className="ca-page__header-content">
            <h1>📋 Asistencias de Altares vida</h1>
            <p>
              {config?.currentMonth || MONTH_NAMES[new Date().getMonth()]}{" "}
              {config?.currentYear || new Date().getFullYear()}
              {" · "} Días permitidos: {ALLOWED_DAYS_NAMES.join(", ")}
              {eventDates.size > 0 && (
                <span style={{ marginLeft: "6px", opacity: 0.85 }}>
                  · {eventDates.size} evento{eventDates.size !== 1 ? "s" : ""}{" "}
                  🎯
                </span>
              )}
            </p>
          </div>

          {/* Acciones del header */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", alignItems: "flex-end" }}>
            {/* Botón Vista General — visible para todos */}
            {userCells.length > 1 && (
              <button
                onClick={() => setShowOverviewModal(true)}
                style={{
                  background: "rgba(255,255,255,0.2)",
                  border: "none",
                  borderRadius: "30px",
                  padding: isMobile ? "6px 12px" : "8px 16px",
                  color: "white",
                  fontWeight: 600,
                  fontSize: isMobile ? "0.7rem" : "0.8rem",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  backdropFilter: "blur(5px)",
                  whiteSpace: "nowrap",
                }}
                title="Ver resumen de todos los altares"
              >
                🏘️ Vista General
              </button>
            )}
            {/* Botón Crear Evento — solo PASTORES/CONEXION */}
            {(userRole === "PASTORES" || userRole === "CONEXION") && (
              <button
                onClick={() => setShowEventModal(true)}
                style={{
                  background: "rgba(255,255,255,0.15)",
                  border: "none",
                  borderRadius: "30px",
                  padding: isMobile ? "6px 12px" : "8px 16px",
                  color: "white",
                  fontWeight: 600,
                  fontSize: isMobile ? "0.7rem" : "0.8rem",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  backdropFilter: "blur(5px)",
                  whiteSpace: "nowrap",
                }}
                title="Crear evento especial"
              >
                🎯 Crear Evento
              </button>
            )}

            <div className="ca-page__header-badge">
              <span className="ca-page__cells-count">{userCells.length}</span>
              <span>Altar de vida{userCells.length !== 1 ? "s" : ""}</span>
            </div>
          </div>
        </div>

        {/* Selectores */}
        <div
          className="ca-page__selectors"
          style={{
            backgroundColor: theme.bgSecondary,
            borderColor: theme.border,
          }}
        >
          <div className="ca-page__selectors-grid">
            <div className="ca-page__selector-item">
              <label>🏡 Altar de vida</label>
              {isMobile && selectedCellId ? (
                <div
                  className="ca-page__cell-chip"
                  style={{ backgroundColor: theme.accentBlue }}
                >
                  <span>{cellNames[selectedCellId]}</span>
                  <button
                    onClick={() => setSelectedCellId(null)}
                    title="Cambiar célula"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <select
                  value={selectedCellId || ""}
                  onChange={(e) => {
                    setSelectedCellId(e.target.value || null);
                    setActiveTab("register");
                  }}
                  style={{
                    backgroundColor: theme.bgTertiary,
                    color: theme.text,
                    borderColor: theme.border,
                  }}
                >
                  <option value="">
                    — Seleccionar célula ({userCells.length}) —
                  </option>
                  {userCells.map((cell) => (
                    <option key={cell.id} value={String(cell.id)}>
                      {cell.name || `Célula #${cell.id}`}
                      {cellHasMonthAttendances(cell.id) ? " ✅" : " 📋"}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="ca-page__selector-item">
              <label>📅 Fecha</label>
              <select
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                disabled={!selectedCellId}
                style={{
                  backgroundColor: theme.bgTertiary,
                  color: theme.text,
                  borderColor: theme.border,
                }}
              >
                <option value="">— Seleccionar fecha —</option>
                {availableDates.map((d) => (
                  <option key={d.value} value={d.value}>
                    {/* ── NUEVO: indicador 🎯 para fechas de eventos ── */}
                    {d.isEvent ? "🎯 " : ""}
                    {d.dayShort} {d.dayNum} {d.isToday ? "(Hoy)" : ""}{" "}
                    {d.isFuture ? "📌" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="ca-page__selector-actions">
              {selectedCellId && selectedDate && attendances.length === 0 && (
                <button
                  className="ca-page__btn ca-page__btn--generate"
                  onClick={handleGenerate}
                  disabled={generating || loading}
                >
                  {generating ? "⏳ Generando..." : "⚡ Generar Asistencias"}
                </button>
              )}
              <button
                className="ca-page__btn ca-page__btn--refresh"
                onClick={loadInitialData}
                disabled={loading}
                title="Recargar datos"
              >
                🔄
              </button>
            </div>
          </div>

          {selectedDate && (
            <div className="ca-page__date-info">
              <span className="ca-page__date-full">
                <span className="ca-page__date-day-highlight">
                  {/* ── NUEVO: indicador de evento en el date-info ── */}
                  {eventDates.has(selectedDate) && !isAllowedDay(selectedDate)
                    ? "🎯"
                    : selectedDateParts.dayShort}
                </span>
                {formatDate(selectedDate)}
                {eventDates.has(selectedDate) && !isAllowedDay(selectedDate) && (
                  <span
                    style={{
                      marginLeft: "6px",
                      fontSize: "0.7rem",
                      backgroundColor: theme.accentPurple,
                      color: "white",
                      padding: "1px 6px",
                      borderRadius: "20px",
                      fontWeight: 700,
                    }}
                  >
                    Evento especial
                  </span>
                )}
              </span>
              {isEditable ? (
                <span className="ca-page__date-editable">✏️ Editable</span>
              ) : (
                <span className="ca-page__date-readonly">🔒 Solo lectura</span>
              )}
            </div>
          )}
        </div>

        {/* Toast */}
        {toastMessage && (
          <div
            className="ca-page__toast"
            style={{
              position: "fixed",
              bottom: "20px",
              left: "50%",
              transform: "translateX(-50%)",
              backgroundColor: theme.accentBlue,
              color: "white",
              padding: "8px 16px",
              borderRadius: "20px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
              zIndex: 1000,
              animation: "caFadeIn 0.2s ease",
            }}
          >
            {toastMessage}
          </div>
        )}

        {/* Mensajes */}
        {error && (
          <div
            className="ca-page__message ca-page__message--error"
            style={{ backgroundColor: theme.errorBg, color: theme.errorText }}
          >
            ❌ {error}
          </div>
        )}
        {successMessage && (
          <div
            className="ca-page__message ca-page__message--success"
            style={{
              backgroundColor: theme.successBg,
              color: theme.successText,
            }}
          >
            ✅ {successMessage}
          </div>
        )}

        {/* Tabs */}
        {selectedCellId && (
          <div className="ca-page__tabs" style={{ borderColor: theme.border }}>
            <button
              className={`ca-page__tab ${activeTab === "register" ? "ca-page__tab--active" : ""}`}
              onClick={() => setActiveTab("register")}
            >
              📝 Registro
            </button>
            {attendances.length > 0 && (
              <button
                className={`ca-page__tab ${activeTab === "summary" ? "ca-page__tab--active" : ""}`}
                onClick={() => setActiveTab("summary")}
              >
                📊 Resumen
              </button>
            )}
            <button
              className="ca-page__tab"
              onClick={handleOpenStats}
              style={{ marginLeft: "auto" }}
            >
              📈 Estadísticas
            </button>
          </div>
        )}

        {/* Contenido principal */}
        {loading && !attendances.length ? (
          <div
            className="ca-page__loading"
            style={{ backgroundColor: theme.bgSecondary }}
          >
            <div className="ca-page__spinner" />
            <p>Cargando asistencias...</p>
          </div>
        ) : !selectedCellId ? (
          <div
            className="ca-page__empty-state"
            style={{
              backgroundColor: theme.bgSecondary,
              borderColor: theme.border,
            }}
          >
            <div className="ca-page__empty-icon">🏘️</div>
            <h2>Selecciona un Altar de vida</h2>
            <p style={{ color: theme.textSecondary }}>
              {userCells.length === 0
                ? "No tienes altar de vida asignado. Contacta al administrador."
                : `Tienes ${userCells.length} altar${userCells.length !== 1 ? "es de vida" : " de vida"} disponible${userCells.length !== 1 ? "s" : ""}. Selecciona una y elige una fecha para registrar asistencia.`}
            </p>
          </div>
        ) : !selectedDate ? (
          <div
            className="ca-page__empty-state"
            style={{
              backgroundColor: theme.bgSecondary,
              borderColor: theme.border,
            }}
          >
            <div className="ca-page__empty-icon">📅</div>
            <h2>Selecciona una fecha</h2>
            <p style={{ color: theme.textSecondary }}>
              Elige un día de reunión ({ALLOWED_DAYS_NAMES.join(", ")}) o un
              evento especial 🎯 para registrar la asistencia.
            </p>
          </div>
        ) : attendances.length === 0 ? (
          <div
            className="ca-page__empty-state"
            style={{
              backgroundColor: theme.bgSecondary,
              borderColor: theme.border,
            }}
          >
            <div className="ca-page__empty-icon">📋</div>
            <h2>Sin asistencias generadas</h2>
            <p style={{ color: theme.textSecondary }}>
              No se han generado asistencias para esta fecha. Usa el botón
              "Generar Asistencias" para crear los registros.
            </p>
          </div>
        ) : activeTab === "summary" ? (
          renderSummaryTab()
        ) : (
          <div className="ca-page__register-content">
            {/* Stats */}
            <div style={{ width: "100%" }}>{renderLiveStats()}</div>

            {/* ── NUEVO: Datos de sesión (newParticipants / totalAttendees) ── */}
            {renderSessionDataForm()}

            {/* Acciones rápidas */}
            {isEditable && (
              <div
                className="ca-page__quick-actions"
                style={{
                  backgroundColor: theme.bgSecondary,
                  borderColor: theme.border,
                }}
              >
                <button
                  ref={quickActionRef}
                  className="ca-page__btn ca-page__btn--mark-all-present"
                  onClick={() => handleMarkAll(true)}
                >
                  ✅ Todos Presentes
                </button>
                <button
                  className="ca-page__btn ca-page__btn--mark-all-absent"
                  onClick={() => handleMarkAll(false)}
                >
                  ❌ Todos Ausentes
                </button>
                <div className="ca-page__quick-actions-spacer" />
                <button
                  className={`ca-page__btn ca-page__btn--save ${hasUnsavedChanges ? "ca-page__btn--save-pulse" : ""}`}
                  onClick={handleSave}
                  disabled={saving || !hasUnsavedChanges}
                >
                  {saving
                    ? "⏳ Guardando..."
                    : hasUnsavedChanges
                      ? "💾 Guardar Cambios"
                      : "✓ Sin cambios"}
                </button>
              </div>
            )}

            {/* Líderes */}
            {leaders.length > 0 && (
              <div className="ca-page__section">
                <div className="ca-page__section-header">
                  <h2>🧩 Equipo de Liderazgo</h2>
                  <span
                    className="ca-page__section-count"
                    style={{ color: theme.textSecondary }}
                  >
                    {leaders.length} participante
                    {leaders.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="ca-page__participants-list">
                  {leaders.map((a) => renderParticipantCard(a, true))}
                </div>
              </div>
            )}

            {/* Miembros regulares */}
            {members.length > 0 && (
              <div className="ca-page__section">
                <div className="ca-page__section-header">
                  <h2>👥 Miembros</h2>
                  <span
                    className="ca-page__section-count"
                    style={{ color: theme.textSecondary }}
                  >
                    {members.length} participante
                    {members.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="ca-page__participants-list">
                  {members.map((a) => renderParticipantCard(a, false))}
                </div>
              </div>
            )}

            {/* Botón guardar sticky */}
            {isEditable && hasUnsavedChanges && (
              <div className="ca-page__sticky-save">
                <button
                  className="ca-page__btn ca-page__btn--save-sticky"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving
                    ? "⏳ Guardando..."
                    : `💾 Guardar Cambios (${liveStats.presentCount}/${liveStats.total} presentes)`}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Reglas */}
        {config?.rules && (
          <div
            className="ca-page__rules"
            style={{
              backgroundColor: theme.bgSecondary,
              borderColor: theme.border,
            }}
          >
            <details>
              <summary>📖 Reglas de Asistencia</summary>
              <ul>
                {config.rules.map((rule, i) => (
                  <li key={i} style={{ color: theme.textSecondary }}>
                    {rule}
                  </li>
                ))}
              </ul>
            </details>
          </div>
        )}
      </div>

      {/* Modal de Estadísticas */}
      <CellAttendanceStatsModal
        isOpen={showStatsModal}
        onClose={() => setShowStatsModal(false)}
        cellId={selectedCellId}
        cellName={cellNames[selectedCellId]}
        apiService={apiService}
        theme={theme}
        isMobile={isMobile}
        onRefresh={() => setShowStatsModal(false)}
        logUserAction={logUserAction}
      />

      {/* Modal para crear eventos especiales */}
      <CreateAttendanceEventModal
        isOpen={showEventModal}
        onClose={() => setShowEventModal(false)}
        onCreate={handleCreateEvent}
        theme={theme}
        isMobile={isMobile}
        userRole={userRole}
      />

      {/* Modal Vista General de todas las células */}
      <CellGroupOverviewModal
        isOpen={showOverviewModal}
        onClose={() => setShowOverviewModal(false)}
        userCells={userCells}
        apiService={apiService}
        isDarkMode={isDarkMode}
        isMobile={isMobile}
        logUserAction={logUserAction}
        onSelectCell={(cellId) => {
          setShowOverviewModal(false);
          setSelectedCellId(cellId);
          setShowStatsModal(true);
        }}
      />
    </div>
  );
};

export default CellAttendancePage;