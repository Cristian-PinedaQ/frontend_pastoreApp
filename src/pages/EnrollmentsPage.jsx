// ============================================
// EnrollmentsPage.jsx - TAILWIND EDITION
// Lógica completa del original + diseño moderno Tailwind
// ============================================

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useConfirmation } from "../context/ConfirmationContext";
import apiService from "../apiService";
import { logSecurityEvent } from "../utils/securityLogger";
import { throttle } from "lodash";
import ModalCreateLesson from "../components/ModalCreateLesson";
import ModalRecordAttendance from "../components/ModalRecordAttendance";
import ModalLessonAttendanceDetail from "../components/ModalLessonAttendanceDetail";
import nameHelper from "../services/nameHelper";
import { useAuth } from "../context/AuthContext";
import { generateCohortPDF } from "../services/generateCohortPDF";
import { generateAttendancePDF } from "../services/attendanceCohortsPdfGenerator";
import { generateCohortAttendanceFullPDF } from "../services/generateCohortAttendanceFullPDF";
import { generateApprovedStudentsPDF } from "../services/generateApprovedStudentsPDF"; // <-- Agrega esta ruta
import {
  BookOpen,
  Users,
  Calendar,
  Plus,
  Search,
  UserCircle2,
  GraduationCap,
  ClipboardCheck,
  FileDown,
  Clock,
  CheckCircle2,
  AlertCircle,
  MoreVertical,
  LayoutGrid,
  List,
  RefreshCw,
  Trophy,
  ShieldCheck,
  X,
  Pencil,
  FileText,
  Printer,
  ChevronDown,
  RotateCcw,
  Award,
} from "lucide-react";

const { getDisplayName } = nameHelper;

// ─── Debug condicional ───────────────────────────────────────────────────────

const logError = (msg, err) => console.error(`[EnrollmentsPage] ${msg}`, err);


// ─── Helpers ────────────────────────────────────────────────────────────────

const escapeHtml = (text) => {
  if (!text || typeof text !== "string") return "";
  const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
  return text.replace(/[&<>"']/g, (m) => map[m]);
};

const getTeacherName = (teacher) => {
  if (!teacher) return null;
  if (teacher.member?.name) return teacher.member.name;
  if (teacher.memberName) return teacher.memberName;
  if (teacher.name) return teacher.name;
  return null;
};

const parseLocalDate = (dateString) => {
  if (!dateString) return null;
  const [year, month, day] = String(dateString).split("T")[0].split("-").map(Number);
  return new Date(year, month - 1, day);
};

const formatLocalDate = (dateString) => {
  const date = parseLocalDate(dateString);
  if (!date || isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("es-CO", { year: "numeric", month: "short", day: "numeric" });
};

const isRecoverable = (enrollment) => {
  if (enrollment.status !== "CANCELLED") return false;
  const end = parseLocalDate(enrollment.endDate);
  if (!end || isNaN(end.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = (today - end) / (1000 * 60 * 60 * 24);
  return diffDays >= 0 && diffDays <= 30;
};

// ─── Motor Inteligente G12 para Reportes ─────────────────────────────────────
const extractG12Hierarchy = (m) => {
  const rawDl = m.leaderName || m.leader?.name || m.cell?.groupLeaderName || m.cell?.groupLeader?.name || "Sin Líder Directo";
  const rawMl = m.mainLeaderName || m.leader?.leaderName || m.cell?.mainLeaderName || m.cell?.mainLeader?.name || "Ministerio General";

  const isPastor = (name) => {
    if (!name) return false;
    const n = name.toUpperCase();
    return n.includes("RUBEN") || n.includes("YAMILETH") || n.includes("CABEZAS") || n.includes("PEREZ ESCOBAR");
  };

  // Deducimos el pastor por el género del estudiante (G12 puro: mujeres con mujeres, hombres con hombres)
  const genderStr = (m.gender || m.sex || m.genero || m.sexo || "M").toUpperCase();
  const defaultPastor = genderStr.startsWith("F") ? "YAMILETH PEREZ ESCOBAR" : "RUBEN FRANCISCO CABEZAS QUIÑONES";

  let pastor = "Ministerio General";
  let networkLeader = "Sin Líder de Red";
  let directLeader = "Sin Líder Directo";

  if (isPastor(rawMl)) {
    pastor = rawMl;
    networkLeader = rawDl;
    directLeader = "Sin Líder Directo"; // Se imprime como "Discípulos Directos" en el PDF
  } else if (isPastor(rawDl)) {
    pastor = rawDl;
    networkLeader = "Red Pastoral Directa";
    directLeader = "Sin Líder Directo";
  } else {
    // Si el Main Leader no es el pastor, entonces el Main Leader es el 12, y el Direct es el 144
    pastor = defaultPastor;
    networkLeader = rawMl;
    directLeader = rawDl;
  }

  if (networkLeader === directLeader) directLeader = "Sin Líder Directo";

  return { pastor, networkLeader, directLeader };
};

// ─── Validaciones ────────────────────────────────────────────────────────────
const isValidLevel = (level, LEVELS) => LEVELS.some((l) => l.code === level);
const isValidStatus = (status, STATUSES) => STATUSES.some((s) => s.value === status);
const validateDates = (startDate, endDate) => {
  if (!startDate || !endDate) return false;
  const start = new Date(startDate);
  const end = new Date(endDate);
  return !isNaN(start.getTime()) && !isNaN(end.getTime()) && start < end;
};
const isValidMaxStudents = (max) => { const n = parseInt(max); return !isNaN(n) && n >= 1 && n <= 500; };
const isValidPercentage = (val) => { const n = parseFloat(val); return !isNaN(n) && n >= 0 && n <= 100; };
const isValidScore = (score) => { const n = parseFloat(score); return !isNaN(n) && n >= 0 && n <= 5; };

// ─── Constantes ──────────────────────────────────────────────────────────────
const STATUSES = [
  { value: "ACTIVE", label: "Activa" },
  { value: "SUSPENDED", label: "Inactiva" },
  { value: "PENDING", label: "Programada" },
  { value: "COMPLETED", label: "Completada" },
  { value: "CANCELLED", label: "Cancelada" },
];

const STATUS_CONFIG = {
  ACTIVE:    { label: "Activa",     color: "from-emerald-600 to-teal-500",  shadow: "shadow-emerald-500/20", icon: <CheckCircle2 size={12} /> },
  PENDING:   { label: "Programada", color: "from-amber-500 to-orange-400",  shadow: "shadow-amber-500/20",   icon: <Clock size={12} /> },
  COMPLETED: { label: "Finalizada", color: "from-indigo-600 to-violet-500", shadow: "shadow-indigo-500/20",  icon: <Trophy size={12} /> },
  CANCELLED: { label: "Cancelada",  color: "from-rose-600 to-pink-500",     shadow: "shadow-rose-500/20",    icon: <AlertCircle size={12} /> },
  SUSPENDED: { label: "Inactiva",   color: "from-slate-600 to-slate-400",   shadow: "shadow-slate-500/20",   icon: <MoreVertical size={12} /> },
};

const FULL_ACCESS_ROLES = ["ROLE_PASTORES", "ROLE_ECONOMICO"];
const ROLE_LEVEL_MAP = {
  ROLE_CONEXION: ["PREENCUENTRO"],
  ROLE_CIMIENTO: ["ENCUENTRO", "POST_ENCUENTRO", "BAUTIZOS"],
  ROLE_ESENCIA: ["ESENCIA_1","ESENCIA_2","ESENCIA_3","SANIDAD_INTEGRAL_RAICES","ESENCIA_4","ADIESTRAMIENTO","GRADUACION"],
};

const ERROR_MESSAGES = {
  FETCH_ENROLLMENTS: "Error al cargar cohortes",
  FETCH_TEACHERS: "Error al cargar maestros",
  FETCH_LESSONS: "Error al cargar lecciones",
  FETCH_STUDENTS: "Error al cargar estudiantes",
  FETCH_ATTENDANCE: "Error al cargar asistencias",
  FETCH_LEVELS: "Error al cargar niveles",
  CREATE_ENROLLMENT: "Error al crear cohorte",
  UPDATE_STATUS: "Error al actualizar estado",
  EDIT_ENROLLMENT: "Error al editar cohorte",
  VALIDATION_ERROR: "Datos inválidos. Por favor verifica los campos",
  UNAUTHORIZED: "No tienes permiso para realizar esta acción",
  GENERIC: "Error al procesar la solicitud. Intenta más tarde",
  INVALID_ENROLLMENT: "Cohorte no válida",
};

// ─── Componente Principal ─────────────────────────────────────────────────────
const EnrollmentsPage = () => {
  const confirm = useConfirmation();
  const { user } = useAuth();

  // ── Niveles ──────────────────────────────────────────────────────────────
  const [levels, setLevels] = useState([]);
  const [levelsLoading, setLevelsLoading] = useState(true);

  useEffect(() => {
    const loadLevels = async () => {
      try {
        setLevelsLoading(true);
        const data = await apiService.getActiveLevels();
        setLevels(data);
      } catch (error) {
        logError("Error cargando niveles:", error);
        setLevels(apiService.getDefaultLevels());
      } finally {
        setLevelsLoading(false);
      }
    };
    loadLevels();
  }, []);

  const getAllowedLevels = useCallback((userRoles = [], allLevels) => {
    const normalized = userRoles.map((r) =>
      typeof r === "object" && r.name ? r.name.toUpperCase() : String(r).toUpperCase()
    );
    if (normalized.some((r) => FULL_ACCESS_ROLES.includes(r))) return allLevels;
    const allowedCodes = new Set();
    normalized.forEach((role) => {
      const mapped = ROLE_LEVEL_MAP[role];
      if (mapped) mapped.forEach((v) => allowedCodes.add(v));
    });
    return allLevels.filter((level) => allowedCodes.has(level.code));
  }, []);

  const allowedLevels = useMemo(
    () => getAllowedLevels(user?.roles ?? [], levels),
    [user?.roles, levels, getAllowedLevels]
  );

  // ── Estado principal ──────────────────────────────────────────────────────
  const [formData, setFormData] = useState({
    level: allowedLevels[0]?.code ?? "",
    startDate: "",
    endDate: "",
    maxStudents: 30,
    minAttendancePercentage: 80,
    minAverageScore: 3.0,
    teacher: null,
  });

  const [enrollments, setEnrollments] = useState([]);
  const [filteredEnrollments, setFilteredEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterLevel, setFilterLevel] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState("");
  const [viewMode, setViewMode] = useState("grid");
  const [showForm, setShowForm] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);
  const [recoveringId, setRecoveringId] = useState(null);

  // ── Estado modal de detalles ──────────────────────────────────────────────
  const [selectedEnrollment, setSelectedEnrollment] = useState(null);
  const [showEnrollmentModal, setShowEnrollmentModal] = useState(false);
  const [activeTab, setActiveTab] = useState("details");

  // ── Estado modales de acciones ────────────────────────────────────────────
  const [showCreateLessonModal, setShowCreateLessonModal] = useState(false);
  const [showRecordAttendanceModal, setShowRecordAttendanceModal] = useState(false);
  const [showLessonAttendanceDetailModal, setShowLessonAttendanceDetailModal] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState(null);

  // ── Estado de edición ─────────────────────────────────────────────────────
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState({
    cohortName: "", startDate: "", endDate: "",
    maxStudents: 30, minAttendancePercentage: 80, minAverageScore: 3.0, teacher: null,
  });
  const [editTeacherSearchTerm, setEditTeacherSearchTerm] = useState("");
  const [editFilteredTeachers, setEditFilteredTeachers] = useState([]);
  const [editShowTeacherDropdown, setEditShowTeacherDropdown] = useState(false);

  // ── Estado de datos de tabs ───────────────────────────────────────────────
  const [lessons, setLessons] = useState([]);
  const [students, setStudents] = useState([]);
  const [attendanceSummary, setAttendanceSummary] = useState([]);

  // ── Maestros ──────────────────────────────────────────────────────────────
  const [availableTeachers, setAvailableTeachers] = useState([]);
  const [filteredTeachers, setFilteredTeachers] = useState([]);
  const [showTeacherDropdown, setShowTeacherDropdown] = useState(false);
  const [teacherSearchTerm, setTeacherSearchTerm] = useState("");

  // ── Handlers de error ─────────────────────────────────────────────────────
  const handleError = useCallback((errorKey, context = "") => {
    const errorMessage = ERROR_MESSAGES[errorKey] || ERROR_MESSAGES.GENERIC;
    setError(errorMessage);
    logSecurityEvent("error_event", { errorKey, context, timestamp: new Date().toISOString() });
  }, []);

  // ── Carga de maestros ────────────────────────────────────────────────────
  const loadTeachers = useCallback(async () => {
    try {
      const members = await apiService.getActiveLeaders();
      setAvailableTeachers(members || []);
    } catch (err) {
      handleError("FETCH_TEACHERS", "loadTeachers");
      logError("Error cargando maestros:", err);
    }
  }, [handleError]);

  // ── Helpers de label ─────────────────────────────────────────────────────
  const getLevelLabel = (levelCode) => {
    if (!levelCode) return "—";
    return levels.find((l) => l.code === levelCode)?.displayName || levelCode;
  };

  const getStatusLabel = (statusValue) => {
    if (!statusValue) return "—";
    return STATUSES.find((s) => s.value === statusValue)?.label || statusValue;
  };

  // ── Exportación PDF ───────────────────────────────────────────────────────
  const exportCohortPDF = async () => {
    if (!selectedEnrollment) return;
    setExportingPDF(true);
    setError("");
    try {
      let exportStudents = students.filter((s) => s.status !== "CANCELLED");
      if (exportStudents.length === 0) {
        const raw = await apiService.getStudentEnrollmentsByEnrollment(selectedEnrollment.id);
        exportStudents = (raw || []).filter((s) => s.status !== "CANCELLED");
      }
      const memberResults = await Promise.allSettled(
        exportStudents.map((s) => apiService.getMemberById(s.memberId))
      );
      const enriched = exportStudents.map((student, i) => {
        const m = memberResults[i].status === "fulfilled" ? memberResults[i].value || {} : {};
        return {
          ...student,
          memberName: student.memberName || m.name || `Miembro ${student.memberId}`,
          gender: m.gender ?? m.sex ?? m.genero ?? m.sexo ?? "",
          leader: m.leaderName ?? m.leader?.name ?? m.cell?.groupLeader?.memberName ?? m.cell?.groupLeader?.name ?? m.cell?.groupLeaderName ?? m.groupLeaderName ?? "—",
          district: m.district ?? m.distrito ?? m.cell?.district ?? m.barrio ?? "—",
        };
      });
      generateCohortPDF(selectedEnrollment, enriched, { getLevelLabel, getStatusLabel, getTeacherName, getDisplayName });
    } catch (err) {
      logError("Error exportando PDF:", err);
      setError("Error al generar el PDF. Inténtalo de nuevo.");
    } finally {
      setExportingPDF(false);
    }
  };

  const exportApprovedPDF = async () => {
    if (!selectedEnrollment) return;
    setExportingPDF(true);
    setError("");
    try {
      const rawStudents = await apiService.getStudentEnrollmentsByEnrollment(selectedEnrollment.id);
      const allStudents = Array.isArray(rawStudents) ? rawStudents : (rawStudents?.data || []);

      const approvedStudents = allStudents.filter(s => s.status === "COMPLETED" || s.passed === true);

      if (approvedStudents.length === 0) {
        await confirm({ title: "Sin Aprobados", message: "Esta cohorte no tiene estudiantes aprobados.", type: "info", confirmLabel: "Entendido" });
        return;
      }

      const enrichedStudents = await Promise.all(
        approvedStudents.map(async (student) => {
          try {
            const mId = student.memberId || student.member?.id;
            if (!mId) return { ...student, directLeader: "Sin Líder Directo", networkLeader: "Sin Líder de Red", pastor: "Ministerio General" };

            const res = await apiService.getMemberById(mId);
            const m = res?.data || res || {};

            console.log(`Datos crudos de Java para el miembro ${mId}:`, m);

            // 1. Intentamos leer las variables exactas que configuraste en Member.java
            let directLeader = m.directLeaderName;
            let networkLeader = m.networkLeaderName;
            let pastor = m.pastorName;

            // 2. Si Java ocultó la información por culpa de un DTO, el Frontend asume el control:
            if (!networkLeader || networkLeader === "Ministerio General") {
              // Obtenemos el líder que Java SÍ envió
              const rawLeader = m.leaderName || m.leader?.name || m.cell?.groupLeaderName || "Sin Líder Directo";
              
              // Deducimos el Pastor por el género (Regla de Oro G12)
              const gender = (m.gender || m.sex || "M").toUpperCase();
              pastor = gender.startsWith("F") ? "YAMILETH PEREZ ESCOBAR" : "RUBEN FRANCISCO CABEZAS QUIÑONES";

              const isPastorObj = (name) => name && (name.includes("RUBEN") || name.includes("YAMILETH"));

              if (isPastorObj(rawLeader)) {
                networkLeader = "Red Pastoral Directa";
                directLeader = "Sin Líder Directo"; 
              } else {
                // Si el líder no es el pastor, asumimos que el líder directo es un 144 y su red está arriba
                // Como Java no lo mandó, forzamos la estructura
                networkLeader = rawLeader;
                directLeader = rawLeader; 
              }
            }

            return {
              ...student,
              memberName: student.memberName || m.name || student.member?.name || `Miembro ${mId}`,
              directLeader,
              networkLeader,
              pastor,
              averageScore: student.averageScore || 0.0
            };
          } catch (err) {
            return { ...student, directLeader: "Sin Líder Directo", networkLeader: "Ministerio General", pastor: "Ministerio General", averageScore: student.averageScore || 0.0 };
          }
        })
      );

      // Pasamos getDisplayName para que el PDF oculte el nombre legal
      generateApprovedStudentsPDF(selectedEnrollment, enrichedStudents, { getDisplayName });
    } catch (err) {
      console.error("Error exportando Acta:", err);
      setError("Error al generar el acta.");
    } finally {
      setExportingPDF(false);
    }
  };

  const handlePrintLessonAttendance = async (lesson, currentStudents, attendedEnrollmentIds) => {
    try {
      const enrichedStudents = await Promise.all(
        currentStudents.map(async (student) => {
          const hasAttended = attendedEnrollmentIds.has(Number(student.id));
          try {
            const mId = student.memberId || student.member?.id;
            const res = await apiService.getMemberById(mId);
            const m = res?.data || res || {};

            const { pastor, networkLeader, directLeader } = extractG12Hierarchy(m);

            return {
              ...student,
              memberName: student.memberName || m.name || `Miembro ${mId}`,
              isActuallyPresent: hasAttended,
              directLeader,
              networkLeader,
              pastor
            };
          } catch (e) {
            return { ...student, isActuallyPresent: hasAttended, directLeader: "Sin Líder Directo", networkLeader: "Ministerio General", pastor: "Ministerio General" };
          }
        })
      );
      generateAttendancePDF(selectedEnrollment, lesson, enrichedStudents, Array.from(attendedEnrollmentIds));
    } catch (error) {
      console.error(error);
    }
  };

  const handlePrintCohortAttendance = async () => {
    if (!selectedEnrollment || lessons.length === 0) return;
    setExportingPDF(true);
    try {
      const enrichedStudents = await Promise.all(
        students.map(async (student) => {
          try {
            const mId = student.memberId || student.member?.id;
            const res = await apiService.getMemberById(mId);
            const m = res?.data || res || {};

            const { pastor, networkLeader, directLeader } = extractG12Hierarchy(m);

            return {
              ...student,
              memberName: student.memberName || m.name || student.member?.name || `Miembro ${mId}`,
              directLeader,
              networkLeader,
              pastor,
              averageScore: student.averageScore || 0.0
            };
          } catch (e) {
            return { ...student, directLeader: "Sin Líder Directo", networkLeader: "Ministerio General", pastor: "Ministerio General" };
          }
        })
      );
      generateCohortAttendanceFullPDF(selectedEnrollment, lessons, enrichedStudents, attendanceSummary);
    } catch (error) {
      console.error(error);
    } finally {
      setExportingPDF(false);
    }
  };

  // ── Fetch y filtrado de cohortes ──────────────────────────────────────────
  const applyFilters = useCallback((data, level, status, search) => {
    try {
      let filtered = data;
      if (level && level.trim() !== "") {
        if (!isValidLevel(level, levels)) { handleError("VALIDATION_ERROR", "invalid_level"); setFilteredEnrollments([]); return; }
        filtered = filtered.filter((e) => e.levelCode === level);
      }
      if (status && status.trim() !== "") {
        if (!isValidStatus(status, STATUSES)) { handleError("VALIDATION_ERROR", "invalid_status"); setFilteredEnrollments([]); return; }
        filtered = filtered.filter((e) => e.status === status);
      }
      if (search && search.trim() !== "") {
        const q = search.toLowerCase().trim();
        filtered = filtered.filter((e) =>
          (e.cohortName || "").toLowerCase().includes(q) ||
          (e.levelDisplayName || "").toLowerCase().includes(q)
        );
      }
      setFilteredEnrollments(filtered);
    } catch (error) {
      logError("Error aplicando filtros:", error);
      setFilteredEnrollments(data);
    }
  }, [levels, handleError]);

  const fetchEnrollments = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const data = await apiService.getEnrollments();
      const enrollmentsArray = Array.isArray(data) ? data : data.content || [];
      if (!Array.isArray(enrollmentsArray)) throw new Error("Formato de respuesta inválido");

      const sorted = enrollmentsArray.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));

      const normalized = sorted.map((enrollment) => {
        let levelCode = null;
        let levelObject = null;

        if (enrollment.levelEnrollment && typeof enrollment.levelEnrollment === "object") {
          levelObject = enrollment.levelEnrollment;
          levelCode = enrollment.levelEnrollment.code;
        } else if (typeof enrollment.levelEnrollment === "string") {
          levelCode = enrollment.levelEnrollment;
        } else if (enrollment.level?.code) {
          levelCode = enrollment.level.code;
          levelObject = enrollment.level;
        } else if (enrollment.level && typeof enrollment.level === "string") {
          levelCode = enrollment.level;
        }

        const levelObj = levels.find((l) => l.code === levelCode);
        const levelDisplayName = levelObj?.displayName || levelObject?.displayName || levelCode;
        const cohortName = enrollment.cohortName || (levelDisplayName ? `${levelDisplayName} ${new Date(enrollment.startDate).getFullYear()}` : `Cohorte ${enrollment.id}`);
        const activeStudents = (enrollment.studentEnrollments || []).filter((se) => se.status !== "CANCELLED");

        return {
          ...enrollment,
          id: enrollment.id,
          cohortName,
          levelCode,
          levelDisplayName,
          levelObject,
          startDate: enrollment.startDate,
          endDate: enrollment.endDate,
          maxStudents: enrollment.maxStudents,
          currentStudentCount: activeStudents.length || 0,
          minAttendancePercentage: enrollment.minAttendancePercentage,
          minAverageScore: enrollment.minAverageScore,
          status: enrollment.status,
          teacher: enrollment.teacher,
          studentEnrollments: enrollment.studentEnrollments || [],
          lessons: enrollment.lessons || [],
        };
      });

      const allowedCodes = allowedLevels.map((l) => l.code);
      const roleFiltered = allowedCodes.length > 0
        ? normalized.filter((e) => allowedCodes.includes(e.levelCode))
        : normalized;

      setEnrollments(roleFiltered);
      applyFilters(roleFiltered, filterLevel, filterStatus, searchTerm);
    } catch (err) {
      handleError("FETCH_ENROLLMENTS", "fetchEnrollments");
      logError("Error obteniendo cohortes:", err);
    } finally {
      setLoading(false);
    }
  }, [filterLevel, filterStatus, searchTerm, handleError, allowedLevels, levels, applyFilters]);

  useEffect(() => {
    if (!levelsLoading) {
      fetchEnrollments();
      loadTeachers();
    }
  }, [fetchEnrollments, loadTeachers, levelsLoading]);

  useEffect(() => {
    if (allowedLevels.length > 0 && !formData.level) {
      setFormData((prev) => ({ ...prev, level: allowedLevels[0].code }));
    }
  }, [allowedLevels, formData.level]);

  // ── Búsqueda de maestros ──────────────────────────────────────────────────
  const handleTeacherSearch = (value) => {
    if (typeof value !== "string" || value.length > 100) return;
    setTeacherSearchTerm(value);
    setShowTeacherDropdown(true);
    if (value.trim() === "") { setFilteredTeachers([]); return; }
    const sv = value.toLowerCase().trim();
    const filtered = availableTeachers.filter((t) => {
      const name = t.member?.name || t.memberName || "";
      const email = t.member?.email || t.memberEmail || "";
      return name.toLowerCase().includes(sv) || email.toLowerCase().includes(sv);
    });
    setFilteredTeachers(filtered.slice(0, 5));
  };

  const handleSelectTeacher = (teacher) => {
    if (!teacher || !teacher.id || typeof teacher.id !== "number") { handleError("VALIDATION_ERROR", "invalid_teacher_id"); return; }
    setFormData((prev) => ({ ...prev, teacher }));
    setTeacherSearchTerm(getDisplayName(getTeacherName(teacher)));
    setShowTeacherDropdown(false);
    setFilteredTeachers([]);
  };

  const handleClearTeacher = () => { setFormData((prev) => ({ ...prev, teacher: null })); setTeacherSearchTerm(""); setFilteredTeachers([]); };

  const handleEditTeacherSearch = (value) => {
    if (typeof value !== "string" || value.length > 100) return;
    setEditTeacherSearchTerm(value);
    setEditShowTeacherDropdown(true);
    if (value.trim() === "") { setEditFilteredTeachers([]); return; }
    const sv = value.toLowerCase().trim();
    const filtered = availableTeachers.filter((t) => {
      const name = t.member?.name || t.memberName || "";
      const email = t.member?.email || t.memberEmail || "";
      return name.toLowerCase().includes(sv) || email.toLowerCase().includes(sv);
    });
    setEditFilteredTeachers(filtered.slice(0, 5));
  };

  const handleEditSelectTeacher = (teacher) => {
    if (!teacher || !teacher.id || typeof teacher.id !== "number") { handleError("VALIDATION_ERROR", "invalid_teacher_id"); return; }
    setEditFormData((prev) => ({ ...prev, teacher }));
    setEditTeacherSearchTerm(getDisplayName(getTeacherName(teacher)));
    setEditShowTeacherDropdown(false);
    setFilteredTeachers([]);
  };

  const handleEditClearTeacher = () => { setEditFormData((prev) => ({ ...prev, teacher: null })); setEditTeacherSearchTerm(""); setEditFilteredTeachers([]); };

  // ── Carga de tabs ─────────────────────────────────────────────────────────
  const loadTabData = useCallback(async (tab) => {
    if (!selectedEnrollment?.id) return;
    try {
      setError("");
      switch (tab) {
        case "lessons": {
          const data = await apiService.getLessonsByEnrollment(selectedEnrollment.id);
          setLessons((data || []).map((l) => ({ ...l, lessonName: escapeHtml(l.lessonName), description: escapeHtml(l.description || "") })));
          break;
        }
        case "students": {
          const data = await apiService.getStudentEnrollmentsByEnrollment(selectedEnrollment.id);
          setStudents((data || []).filter((s) => s.status !== "CANCELLED").map((s) => ({ ...s, memberName: escapeHtml(s.memberName) })));
          break;
        }
        case "attendance": {
          const data = await apiService.getLessonsByEnrollment(selectedEnrollment.id);
          setAttendanceSummary((data || []).map((l) => ({ ...l, lessonName: escapeHtml(l.lessonName) })));
          break;
        }
        default: break;
      }
    } catch (err) {
      const errorKey = tab === "lessons" ? "FETCH_LESSONS" : tab === "students" ? "FETCH_STUDENTS" : tab === "attendance" ? "FETCH_ATTENDANCE" : "GENERIC";
      handleError(errorKey, `loadTabData:${tab}`);
      logError(`Error cargando tab ${tab}:`, err);
    }
  }, [selectedEnrollment, handleError]);

  useEffect(() => {
    if (showEnrollmentModal && selectedEnrollment) loadTabData(activeTab);
  }, [activeTab, showEnrollmentModal, selectedEnrollment, loadTabData]);

  // ── Handlers de filtros ───────────────────────────────────────────────────
  const handleFilterChange = (type, value) => {
    setError("");
    if (type === "level") { setFilterLevel(value); applyFilters(enrollments, value, filterStatus, searchTerm); }
    else if (type === "status") { setFilterStatus(value); applyFilters(enrollments, filterLevel, value, searchTerm); }
    else if (type === "search") { setSearchTerm(value); applyFilters(enrollments, filterLevel, filterStatus, value); }
  };

  const clearFilters = () => {
    setFilterLevel(""); setFilterStatus(""); setSearchTerm("");
    applyFilters(enrollments, "", "", "");
  };

  // ── Handlers de modal principal ───────────────────────────────────────────
  const handleOpenEnrollmentModal = (enrollment) => {
    if (!enrollment?.id || typeof enrollment.id !== "number") { handleError("INVALID_ENROLLMENT"); return; }
    setSelectedEnrollment(enrollment);
    setActiveTab("details");
    setShowEnrollmentModal(true);
    setError("");
  };

  const handleCloseEnrollmentModal = useCallback(() => {
    setSelectedEnrollment(null);
    setShowEnrollmentModal(false);
    setActiveTab("details");
    setLessons([]); setStudents([]); setAttendanceSummary([]);
    setError("");
  }, []);

  const handleRecover = useCallback(async (enrollment) => {
    const confirmed = await confirm({
      title: "¿Recuperar cohorte?",
      message: `Se evaluará a los estudiantes de "${enrollment.cohortName}" y la cohorte pasará a estado COMPLETADA. Esta acción no se puede deshacer.`,
      type: "warning",
      confirmLabel: "Sí, recuperar",
      cancelLabel: "Cancelar",
    });
    if (!confirmed) return;

    setRecoveringId(enrollment.id);
    setError("");
    try {
      const result = await apiService.recoverCancelledCohort(enrollment.id);

      const warningMsg = result?.warning
        ? `\n\n⚠️ ${result.warning}`
        : "";

      await confirm({
        title: "¡Cohorte Recuperada!",
        message:
          `"${result?.cohortName ?? enrollment.cohortName}" fue marcada como COMPLETADA.\n` +
          `✅ Aprobados: ${result?.passed ?? "—"}   ❌ Reprobados: ${result?.failed ?? "—"}` +
          warningMsg,
        type: "success",
        confirmLabel: "Excelente",
      });

      await fetchEnrollments();
      if (showEnrollmentModal && selectedEnrollment?.id === enrollment.id) {
        handleCloseEnrollmentModal();
      }
    } catch (err) {
      const msg =
        err?.response?.data?.error ||
        err?.message ||
        "Error al recuperar la cohorte. Inténtalo de nuevo.";
      setError(msg);
      logError("Error recuperando cohorte:", err);
    } finally {
      setRecoveringId(null);
    }
  }, [confirm, fetchEnrollments, showEnrollmentModal, selectedEnrollment, handleCloseEnrollmentModal]);

  // ── Handlers de edición ───────────────────────────────────────────────────
  const handleOpenEditModal = () => {
    if (!selectedEnrollment) return;
    if (selectedEnrollment.status === "COMPLETED" || selectedEnrollment.status === "CANCELLED") {
      setError(selectedEnrollment.status === "COMPLETED" ? "No se puede editar una cohorte completada" : "No se puede editar una cohorte cancelada");
      logSecurityEvent("unauthorized_edit_attempt", { enrollmentId: selectedEnrollment.id, status: selectedEnrollment.status, timestamp: new Date().toISOString() });
      return;
    }
    setEditFormData({
      cohortName: selectedEnrollment.cohortName || "",
      startDate: selectedEnrollment.startDate || "",
      endDate: selectedEnrollment.endDate || "",
      maxStudents: selectedEnrollment.maxStudents || 30,
      minAttendancePercentage: selectedEnrollment.minAttendancePercentage || 80,
      minAverageScore: selectedEnrollment.minAverageScore || 3.0,
      teacher: selectedEnrollment.teacher || null,
    });
    const _teacherName = getTeacherName(selectedEnrollment.teacher);
    if (_teacherName) setEditTeacherSearchTerm(getDisplayName(_teacherName));
    setShowEditModal(true);
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setEditFormData({ cohortName: "", startDate: "", endDate: "", maxStudents: 30, minAttendancePercentage: 80, minAverageScore: 3.0, teacher: null });
    setEditTeacherSearchTerm(""); setEditFilteredTeachers([]);
    setError("");
  };

  // ── Cambio de estado (throttled) ──────────────────────────────────────────
  const throttledStatusChange = throttle(async (enrollmentId, newStatus) => {
    try {
      if (!enrollmentId || typeof enrollmentId !== "number") { handleError("VALIDATION_ERROR", "invalid_enrollment_id"); return; }
      if (!isValidStatus(newStatus, STATUSES)) { handleError("VALIDATION_ERROR", "invalid_status_change"); return; }
      setError("");
      await apiService.updateEnrollmentStatus(enrollmentId, newStatus);
      logSecurityEvent("status_changed", { enrollmentId, newStatus, timestamp: new Date().toISOString() });
      fetchEnrollments();
      handleCloseEnrollmentModal();
    } catch (err) {
      handleError("UPDATE_STATUS", "handleStatusChange");
      logError("Error cambiando estado:", err);
    }
  }, 1000);

  const handleStatusChange = (enrollmentId, newStatus) => {
    if (!selectedEnrollment) return;
    if (selectedEnrollment.status === "COMPLETED" || selectedEnrollment.status === "CANCELLED") {
      setError(selectedEnrollment.status === "COMPLETED" ? "No se puede cambiar el estado de una cohorte completada" : "No se puede cambiar el estado de una cohorte cancelada");
      logSecurityEvent("unauthorized_status_change_attempt", { enrollmentId, status: selectedEnrollment.status, timestamp: new Date().toISOString() });
      return;
    }
    throttledStatusChange(enrollmentId, newStatus);
  };

  // ── Handlers de lecciones y asistencia ───────────────────────────────────
  const handleLessonCreated = useCallback(async () => {
    if (selectedEnrollment) await loadTabData("lessons");
  }, [selectedEnrollment, loadTabData]);

  const handleAttendanceRecorded = useCallback(async () => {
    if (selectedEnrollment) await loadTabData("attendance");
  }, [selectedEnrollment, loadTabData]);

  const handleOpenLessonAttendanceDetail = (lesson) => {
    if (!lesson?.id || typeof lesson.id !== "number") { handleError("VALIDATION_ERROR", "invalid_lesson"); return; }
    setSelectedLesson(lesson);
    setShowLessonAttendanceDetailModal(true);
  };

  const handleLessonAttendanceRecorded = useCallback(async () => {
    if (selectedEnrollment) await loadTabData("attendance");
  }, [selectedEnrollment, loadTabData]);

  // ── Validación y envío de formularios ────────────────────────────────────
  const validateForm = () => {
    const errors = [];
    if (!formData.level || !isValidLevel(formData.level, levels)) errors.push("Nivel inválido");
    if (!formData.startDate) errors.push("Fecha de inicio requerida");
    if (!formData.endDate) errors.push("Fecha de fin requerida");
    if (formData.startDate && formData.endDate && !validateDates(formData.startDate, formData.endDate)) errors.push("Fecha de inicio debe ser anterior a fecha de fin");
    if (!formData.teacher?.id || typeof formData.teacher.id !== "number") errors.push("Maestro requerido");
    if (!isValidMaxStudents(formData.maxStudents)) errors.push("Máximo de estudiantes debe estar entre 1 y 500");
    if (!isValidPercentage(formData.minAttendancePercentage)) errors.push("Porcentaje de asistencia debe estar entre 0 y 100");
    if (!isValidScore(formData.minAverageScore)) errors.push("Calificación mínima debe estar entre 0 y 5");
    return errors;
  };

  const validateEditForm = () => {
    const errors = [];
    if (editFormData.startDate && editFormData.endDate && !validateDates(editFormData.startDate, editFormData.endDate)) errors.push("Fecha de inicio debe ser anterior a fecha de fin");
    if (editFormData.maxStudents && !isValidMaxStudents(editFormData.maxStudents)) errors.push("Máximo de estudiantes debe estar entre 1 y 500");
    if (editFormData.minAttendancePercentage !== "" && !isValidPercentage(editFormData.minAttendancePercentage)) errors.push("Porcentaje de asistencia debe estar entre 0 y 100");
    if (editFormData.minAverageScore !== "" && !isValidScore(editFormData.minAverageScore)) errors.push("Calificación mínima debe estar entre 0 y 5");
    return errors;
  };

  const resetForm = () => {
    setFormData({ level: allowedLevels[0]?.code ?? "", startDate: "", endDate: "", maxStudents: 30, minAttendancePercentage: 80, minAverageScore: 3.0, teacher: null });
    setTeacherSearchTerm(""); setFilteredTeachers([]);
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const validationErrors = validateForm();
    if (validationErrors.length > 0) { setError(validationErrors.join(". ")); return; }
    try {
      const enrollmentData = {
        level: formData.level,
        startDate: formData.startDate,
        endDate: formData.endDate,
        maxStudents: parseInt(formData.maxStudents),
        minAttendancePercentage: parseFloat(formData.minAttendancePercentage),
        minAverageScore: parseFloat(formData.minAverageScore),
        teacher: formData.teacher ? { id: formData.teacher.id } : null,
      };
      const response = await apiService.createEnrollment(enrollmentData);
      logSecurityEvent("enrollment_created", { level: formData.level, cohortId: response?.cohortId, timestamp: new Date().toISOString() });
      await confirm({
        title: "¡Cohorte Creada!",
        message: "La nueva cohorte ha sido registrada exitosamente en el sistema académico.",
        type: "success",
        confirmLabel: "Excelente"
      });
      setShowForm(false);
      resetForm();
      await fetchEnrollments();
    } catch (err) {
      handleError("CREATE_ENROLLMENT", "handleSubmit");
      logError("Error creando cohorte:", err);
      const errorMsg = err.response?.data?.message || err.message || "Error desconocido";
      await confirm({
        title: "Error en Registro",
        message: `No se pudo crear la cohorte: ${errorMsg}`,
        type: "error",
        confirmLabel: "Cerrar"
      });
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const validationErrors = validateEditForm();
    if (validationErrors.length > 0) { setError(validationErrors.join(". ")); return; }
    const updateData = {};
    if (editFormData.cohortName?.trim()) updateData.cohortName = editFormData.cohortName.trim();
    if (editFormData.startDate) updateData.startDate = editFormData.startDate;
    if (editFormData.endDate) updateData.endDate = editFormData.endDate;
    if (editFormData.maxStudents) updateData.maxStudents = parseInt(editFormData.maxStudents);
    if (editFormData.minAttendancePercentage !== "") updateData.minAttendancePercentage = parseFloat(editFormData.minAttendancePercentage);
    if (editFormData.minAverageScore !== "") updateData.minAverageScore = parseFloat(editFormData.minAverageScore);
    if (editFormData.teacher?.id && typeof editFormData.teacher.id === "number") updateData.teacher = { id: editFormData.teacher.id };
    if (Object.keys(updateData).length === 0) { setError("Debes hacer al menos un cambio"); return; }
    try {
      await apiService.editEnrollment(selectedEnrollment.id, updateData);
      logSecurityEvent("enrollment_edited", { enrollmentId: selectedEnrollment.id, timestamp: new Date().toISOString() });
      handleCloseEditModal();
      fetchEnrollments();
      handleCloseEnrollmentModal();
    } catch (err) {
      handleError("EDIT_ENROLLMENT", "handleEditSubmit");
      logError("Error editando cohorte:", err);
    }
  };

  // ── Estadísticas para el header ───────────────────────────────────────────
  const stats = useMemo(() => {
    const active = enrollments.filter((e) => e.status === "ACTIVE").length;
    const totalStudents = enrollments.reduce((acc, e) => acc + (e.currentStudentCount || 0), 0);
    return { active, totalStudents };
  }, [enrollments]);

  // ── Renderizado de carga ──────────────────────────────────────────────────
  if (levelsLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Cargando niveles...</p>
        </div>
      </div>
    );
  }

  // ═════════════════════════════════════════════════════════════════════════
  // RENDER PRINCIPAL
  // ═════════════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8 pt-20 transition-colors duration-300">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* ── ERROR GLOBAL ── */}
        {error && (
          <div className="flex items-center gap-3 p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-2xl text-rose-700 dark:text-rose-400">
            <AlertCircle size={18} className="shrink-0" />
            <p className="text-sm font-semibold">{error}</p>
            <button onClick={() => setError("")} className="ml-auto p-1 hover:bg-rose-100 dark:hover:bg-rose-800/40 rounded-lg transition-colors">
              <X size={16} />
            </button>
          </div>
        )}

        {/* ── HEADER ── */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
              <GraduationCap size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                Gestión de <span className="text-indigo-600">Cohortes</span>
              </h1>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">Academia de Obreros</p>
            </div>
          </div>
          <div className="flex items-center gap-6 w-full md:w-auto">
            <div className="hidden lg:flex items-center gap-6 pr-6 border-r border-slate-100 dark:border-slate-800">
              <div className="text-center">
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Estudiantes</p>
                <p className="text-2xl font-black text-slate-900 dark:text-white">{stats.totalStudents}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Activas</p>
                <p className="text-2xl font-black text-emerald-500">{stats.active}</p>
              </div>
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-slate-900 dark:bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg"
            >
              {showForm ? <X size={16} strokeWidth={3} /> : <Plus size={16} strokeWidth={3} />}
              {showForm ? "Cerrar" : "Nueva Cohorte"}
            </button>
          </div>
        </div>

        {/* ── FORMULARIO CREACIÓN ── */}
        {showForm && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 md:p-8 shadow-sm">
            <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight mb-6 flex items-center gap-3">
              <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900/40 rounded-xl flex items-center justify-center">
                <Plus size={16} className="text-indigo-600" />
              </div>
              Crear Nueva Cohorte
            </h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FieldGroup label="Nivel *">
                <select
                  value={formData.level}
                  onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                  className="tw-select"
                  required
                >
                  {allowedLevels.map((level) => (
                    <option key={level.code} value={level.code}>{level.displayName}</option>
                  ))}
                </select>
              </FieldGroup>
              <FieldGroup label="Fecha Inicio *">
                <input type="date" value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} className="tw-input" required />
              </FieldGroup>
              <FieldGroup label="Fecha Fin *">
                <input type="date" value={formData.endDate} onChange={(e) => setFormData({ ...formData, endDate: e.target.value })} className="tw-input" required />
              </FieldGroup>
              <FieldGroup label="Máx. Estudiantes *">
                <input type="number" value={formData.maxStudents} onChange={(e) => setFormData({ ...formData, maxStudents: e.target.value })} min="1" max="500" className="tw-input" required />
              </FieldGroup>
              <FieldGroup label="% Asistencia Mín. *">
                <input type="number" value={formData.minAttendancePercentage} onChange={(e) => setFormData({ ...formData, minAttendancePercentage: e.target.value })} min="0" max="100" step="0.1" className="tw-input" required />
              </FieldGroup>
              <FieldGroup label="Calificación Mín. *">
                <input type="number" value={formData.minAverageScore} onChange={(e) => setFormData({ ...formData, minAverageScore: e.target.value })} min="0" max="5" step="0.1" className="tw-input" required />
              </FieldGroup>
              {/* Maestro — ocupa columna completa */}
              <div className="md:col-span-2">
                <FieldGroup label="Maestro / Profesor *">
                  <TeacherSearchInput
                    value={teacherSearchTerm}
                    selectedTeacher={formData.teacher}
                    filteredTeachers={filteredTeachers}
                    showDropdown={showTeacherDropdown}
                    onSearch={handleTeacherSearch}
                    onSelect={handleSelectTeacher}
                    onClear={handleClearTeacher}
                    onFocus={() => teacherSearchTerm && setShowTeacherDropdown(true)}
                  />
                </FieldGroup>
              </div>
              <div className="md:col-span-2">
                <button type="submit" className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-lg shadow-indigo-600/20 active:scale-95">
                  ✅ Crear Cohorte
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── FILTROS ── */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
          <div className="flex flex-col lg:flex-row items-center gap-4">
            <div className="relative flex-1 group w-full">
              <input
                type="text"
                placeholder="Buscar cohortes..."
                value={searchTerm}
                onChange={(e) => handleFilterChange("search", e.target.value)}
                className="w-full h-12 pl-12 pr-4 bg-slate-50 dark:bg-slate-800 rounded-2xl text-sm font-semibold text-slate-900 dark:text-white outline-none border-2 border-transparent focus:border-indigo-500/30 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
            </div>
            <div className="flex items-center gap-3 w-full lg:w-auto">
              <SelectFilter value={filterStatus} onChange={(e) => handleFilterChange("status", e.target.value)} placeholder="Todos los estados">
                {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </SelectFilter>
              <SelectFilter value={filterLevel} onChange={(e) => handleFilterChange("level", e.target.value)} placeholder="Todos los niveles">
                {allowedLevels.map((l) => <option key={l.code} value={l.code}>{l.displayName}</option>)}
              </SelectFilter>
              <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl gap-1">
                <ViewModeBtn active={viewMode === "grid"} onClick={() => setViewMode("grid")}><LayoutGrid size={16} /></ViewModeBtn>
                <ViewModeBtn active={viewMode === "list"} onClick={() => setViewMode("list")}><List size={16} /></ViewModeBtn>
              </div>
              <button onClick={fetchEnrollments} className="w-11 h-11 flex items-center justify-center bg-slate-50 dark:bg-slate-800 text-slate-500 hover:text-indigo-600 rounded-xl border-2 border-transparent hover:border-indigo-500/30 transition-all active:rotate-180">
                <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
              </button>
              {(filterLevel || filterStatus || searchTerm) && (
                <button onClick={clearFilters} className="w-11 h-11 flex items-center justify-center bg-rose-50 dark:bg-rose-900/20 text-rose-500 rounded-xl hover:bg-rose-100 transition-all">
                  <X size={16} />
                </button>
              )}
            </div>
          </div>
          <p className="text-xs text-slate-400 font-semibold mt-3">
            Mostrando <strong className="text-slate-700 dark:text-slate-300">{filteredEnrollments.length}</strong> de{" "}
            <strong className="text-slate-700 dark:text-slate-300">{enrollments.length}</strong> cohortes
          </p>
        </div>

        {/* ── CONTENIDO ── */}
        {loading ? (
          <div className="h-64 flex flex-col items-center justify-center bg-white dark:bg-slate-900/50 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
            <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-4" />
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Cargando cohortes...</p>
          </div>
        ) : filteredEnrollments.length === 0 ? (
          <div className="py-24 text-center bg-white dark:bg-slate-900 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800">
            <GraduationCap size={48} className="mx-auto text-slate-200 dark:text-slate-700 mb-4" />
            <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">No se encontraron cohortes</h2>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-2">Ajusta los filtros o crea una nueva cohorte</p>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filteredEnrollments.map((enrollment) => (
              <EnrollmentCard
                key={enrollment.id}
                enrollment={enrollment}
                onClick={() => handleOpenEnrollmentModal(enrollment)}
                onRecordAttendance={() => { setSelectedEnrollment(enrollment); setShowRecordAttendanceModal(true); }}
                onViewDetail={() => handleOpenEnrollmentModal(enrollment)}
                onExportPDF={() => { setSelectedEnrollment(enrollment); exportCohortPDF(); }}
                onExportApproved={(e) => { e.stopPropagation(); setSelectedEnrollment(enrollment); exportApprovedPDF(); }}
                onRecover={() => handleRecover(enrollment)}
                recovering={recoveringId === enrollment.id}
              />
            ))}
          </div>
        ) : (
          <EnrollmentTable
            enrollments={filteredEnrollments}
            onOpen={handleOpenEnrollmentModal}
            onRecordAttendance={(e) => { setSelectedEnrollment(e); setShowRecordAttendanceModal(true); }}
            onExportPDF={(e) => { setSelectedEnrollment(e); exportCohortPDF(); }}
          />
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          MODAL DE DETALLES DE COHORTE
      ═══════════════════════════════════════════════════════════════════ */}
      {showEnrollmentModal && selectedEnrollment && (
        <ModalOverlay onClose={handleCloseEnrollmentModal}>
          <div className="w-full max-w-3xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
            {/* Header */}
            <div className="p-6 bg-gradient-to-br from-indigo-600 to-violet-600 text-white flex justify-between items-start shrink-0">
              <div>
                <p className="text-xs font-black uppercase tracking-widest opacity-70 mb-1">Cohorte #{selectedEnrollment.id}</p>
                <h2 className="text-2xl font-black tracking-tight">
                  {escapeHtml(selectedEnrollment.cohortName || getLevelLabel(selectedEnrollment.levelCode))}
                </h2>
                <StatusBadge status={selectedEnrollment.status} className="mt-2" />
              </div>
              <button onClick={handleCloseEnrollmentModal} className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-all">
                <X size={20} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 shrink-0 overflow-x-auto">
              {[
                { id: "details", label: "Detalles", icon: <FileText size={14} /> },
                { id: "lessons", label: "Lecciones", icon: <BookOpen size={14} /> },
                { id: "students", label: "Estudiantes", icon: <Users size={14} /> },
                { id: "attendance", label: "Asistencias", icon: <ClipboardCheck size={14} /> },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-5 py-4 text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all border-b-2
                    ${activeTab === tab.id ? "border-indigo-600 text-indigo-600 bg-white dark:bg-slate-900" : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"}`}
                >
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6">
              {error && (
                <div className="flex items-center gap-2 p-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-600 dark:text-rose-400 text-xs font-semibold mb-4">
                  <AlertCircle size={14} /> {error}
                </div>
              )}

              {/* ── TAB DETALLES ── */}
              {activeTab === "details" && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <DetailItem label="Nivel" value={getLevelLabel(selectedEnrollment.levelCode)} />
                    {getTeacherName(selectedEnrollment.teacher) && (
                      <DetailItem label="Maestro" value={getDisplayName(getTeacherName(selectedEnrollment.teacher))} />
                    )}
                    <DetailItem label="Inicio" value={formatLocalDate(selectedEnrollment.startDate)} />
                    <DetailItem label="Fin" value={formatLocalDate(selectedEnrollment.endDate)} />
                    <DetailItem
                      label="Duración"
                      value={`${Math.ceil((parseLocalDate(selectedEnrollment.endDate) - parseLocalDate(selectedEnrollment.startDate)) / (1000 * 60 * 60 * 24))} días`}
                    />
                    <DetailItem label="Cupos" value={`${selectedEnrollment.currentStudentCount || 0} / ${selectedEnrollment.maxStudents}`} />
                    <DetailItem label="% Asist. Mín." value={`${selectedEnrollment.minAttendancePercentage}%`} />
                    <DetailItem label="Calif. Mín." value={(selectedEnrollment.minAverageScore || 0).toFixed(2)} />
                  </div>

                  {/* Cambiar estado */}
                  <div>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Cambiar Estado</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedEnrollment.status !== "ACTIVE" && <ActionBtn color="emerald" onClick={() => handleStatusChange(selectedEnrollment.id, "ACTIVE")}>▶️ Activar</ActionBtn>}
                      {selectedEnrollment.status !== "SUSPENDED" && <ActionBtn color="amber" onClick={() => handleStatusChange(selectedEnrollment.id, "SUSPENDED")}>⏸️ Pausar</ActionBtn>}
                      {selectedEnrollment.status !== "COMPLETED" && <ActionBtn color="indigo" onClick={() => handleStatusChange(selectedEnrollment.id, "COMPLETED")}>✅ Completar</ActionBtn>}
                      {selectedEnrollment.status !== "CANCELLED" && <ActionBtn color="rose" onClick={() => handleStatusChange(selectedEnrollment.id, "CANCELLED")}>❌ Cancelar</ActionBtn>}
                    </div>
                    {/* Recuperar cohorte cancelada (solo si aplica) */}
                  {isRecoverable(selectedEnrollment) && (
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                      <p className="text-xs font-black text-amber-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                        <RotateCcw size={11} /> Recuperación disponible
                      </p>
                      <button
                        onClick={() => handleRecover(selectedEnrollment)}
                        disabled={recoveringId === selectedEnrollment.id}
                        className="flex items-center justify-center gap-2 w-full py-3
                          bg-gradient-to-r from-amber-500 to-orange-500
                          hover:from-amber-600 hover:to-orange-600
                          disabled:from-amber-300 disabled:to-orange-300
                          text-white rounded-2xl font-black text-xs uppercase tracking-widest
                          transition-all shadow-lg shadow-amber-500/25 active:scale-95"
                      >
                        {recoveringId === selectedEnrollment.id ? (
                          <><RefreshCw size={14} className="animate-spin" /> Recuperando...</>
                        ) : (
                          <><RotateCcw size={14} /> Recuperar y Completar</>
                        )}
                      </button>
                      <p className="text-[10px] text-slate-400 font-semibold text-center mt-1.5">
                        Disponible hasta el {formatLocalDate(
                          new Date(parseLocalDate(selectedEnrollment.endDate).getTime() + 30 * 24 * 60 * 60 * 1000)
                            .toISOString().split("T")[0]
                        )}
                      </p>
                    </div>
                  )}

                  </div>

                  {/* Acciones de documentos */}
                  <div className="flex flex-col gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <button onClick={handleOpenEditModal} className="flex items-center justify-center gap-2 w-full py-3 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-all border border-amber-200 dark:border-amber-800">
                      <Pencil size={12} /> Editar Cohorte
                    </button>
                    <button onClick={exportCohortPDF} disabled={exportingPDF} className="flex items-center justify-center gap-2 w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-indigo-600/20">
                      {exportingPDF ? <><RefreshCw size={14} className="animate-spin" /> Preparando...</> : <><FileDown size={14} /> Exportar PDF de Cohorte</>}
                    </button>
                  </div>
                </div>
              )}

              {/* ── TAB LECCIONES ── */}
              {activeTab === "lessons" && (
                <div className="space-y-4">
                  <button onClick={() => setShowCreateLessonModal(true)} className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-sm">
                    <Plus size={14} strokeWidth={3} /> Nueva Lección
                  </button>
                  {lessons.length === 0 ? (
                    <EmptyState icon={<BookOpen size={32} />} title="No hay lecciones" subtitle="Crea la primera lección para esta cohorte" />
                  ) : (
                    <div className="space-y-3">
                      {lessons.map((lesson) => (
                        <div key={lesson.id} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-black text-sm text-slate-900 dark:text-white">
                                📖 {lesson.lessonNumber}. {lesson.lessonName}
                              </p>
                              {lesson.isMandatory && <span className="inline-block mt-1 px-2 py-0.5 bg-rose-100 text-rose-700 rounded-full text-xs font-bold">🔴 Obligatoria</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-4 mt-2 text-xs text-slate-500 dark:text-slate-400 font-semibold">
                            <span>📅 {formatLocalDate(lesson.lessonDate)}</span>
                            <span>⏱️ {lesson.durationMinutes} min</span>
                            <span>✅ {lesson.attendanceCount || 0} asistencias</span>
                          </div>
                          {lesson.description && <p className="mt-2 text-xs text-slate-400 italic">{lesson.description}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── TAB ESTUDIANTES ── */}
              {activeTab === "students" && (
                <div className="space-y-3">
                  {students.length === 0 ? (
                    <EmptyState icon={<Users size={32} />} title="No hay estudiantes" subtitle="Aún no hay estudiantes inscritos en esta cohorte" />
                  ) : students.map((student) => (
                    <div key={student.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-600 font-black text-sm">
                          {(student.memberName || "E")[0]}
                        </div>
                        <div>
                          <p className="font-black text-sm text-slate-900 dark:text-white">{escapeHtml(student.memberName || `Estudiante ${student.memberId}`)}</p>
                          <p className="text-xs text-slate-400 font-semibold">Inscrito: {formatLocalDate(student.enrollmentDate)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {student.finalAttendancePercentage !== undefined && student.finalAttendancePercentage !== null && (
                          <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">{student.finalAttendancePercentage.toFixed(1)}%</span>
                        )}
                        <StatusBadge status={student.status} small />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ── TAB ASISTENCIAS ── */}
              {activeTab === "attendance" && (
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => setShowRecordAttendanceModal(true)} className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-sm">
                      <Plus size={14} strokeWidth={3} /> Registrar Asistencia
                    </button>
                    <button
                      onClick={handlePrintCohortAttendance}
                      disabled={exportingPDF}
                      className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-sm"
                    >
                      {exportingPDF ? <RefreshCw size={14} className="animate-spin" /> : <Printer size={14} />}
                      Asistencias Generales
                    </button>
                  </div>
                  {attendanceSummary.length === 0 ? (
                    <EmptyState icon={<ClipboardCheck size={32} />} title="No hay lecciones" subtitle="Crea lecciones para poder registrar asistencias" />
                  ) : (
                    <div className="space-y-3">
                      {attendanceSummary.map((lesson) => (
                        <div
                          key={lesson.id}
                          className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700 cursor-pointer hover:border-indigo-300 dark:hover:border-indigo-600 hover:shadow-md transition-all group"
                          onClick={() => handleOpenLessonAttendanceDetail(lesson)}
                          role="button" tabIndex={0}
                        >
                          <div className="flex items-center justify-between">
                            <p className="font-black text-sm text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors">
                              📖 {lesson.lessonNumber}. {lesson.lessonName}
                            </p>
                            <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1 rounded-full">
                              Ver detalles 👁️
                            </span>
                          </div>
                          <div className="flex items-center justify-between mt-2">
                            <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 font-semibold">
                              <span>📅 {formatLocalDate(lesson.lessonDate)}</span>
                              <span>✅ {lesson.attendanceCount || 0} registros</span>
                            </div>
                            <button
                              onClick={(e) => { e.stopPropagation(); handlePrintLessonAttendance(lesson); }}
                              disabled={exportingPDF}
                              className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-lg text-xs font-black transition-all"
                            >
                              <Printer size={12} /> Informe
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          MODAL DE EDICIÓN
      ═══════════════════════════════════════════════════════════════════ */}
      {showEditModal && selectedEnrollment && (
        <ModalOverlay onClose={handleCloseEditModal}>
          <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
            <div className="p-6 bg-gradient-to-br from-amber-500 to-orange-500 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <Pencil size={20} />
                <h2 className="text-xl font-black tracking-tight">Editar Cohorte</h2>
              </div>
              <button onClick={handleCloseEditModal} className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-all"><X size={18} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {error && (
                <div className="flex items-center gap-2 p-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-600 dark:text-rose-400 text-xs font-semibold mb-4">
                  <AlertCircle size={14} /> {error}
                </div>
              )}
              <form onSubmit={handleEditSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <FieldGroup label="Nombre de Cohorte">
                    <input type="text" value={editFormData.cohortName} onChange={(e) => setEditFormData({ ...editFormData, cohortName: e.target.value })} placeholder="Dejar en blanco para no cambiar" maxLength="100" className="tw-input" />
                  </FieldGroup>
                </div>
                <FieldGroup label="Fecha Inicio">
                  <input type="date" value={editFormData.startDate} onChange={(e) => setEditFormData({ ...editFormData, startDate: e.target.value })} className="tw-input" />
                </FieldGroup>
                <FieldGroup label="Fecha Fin">
                  <input type="date" value={editFormData.endDate} onChange={(e) => setEditFormData({ ...editFormData, endDate: e.target.value })} className="tw-input" />
                </FieldGroup>
                <FieldGroup label="Máx. Estudiantes">
                  <input type="number" value={editFormData.maxStudents} onChange={(e) => setEditFormData({ ...editFormData, maxStudents: e.target.value })} min="1" max="500" className="tw-input" />
                </FieldGroup>
                <FieldGroup label="% Asistencia Mín.">
                  <input type="number" value={editFormData.minAttendancePercentage} onChange={(e) => setEditFormData({ ...editFormData, minAttendancePercentage: e.target.value })} min="0" max="100" step="0.1" className="tw-input" />
                </FieldGroup>
                <FieldGroup label="Calificación Mín.">
                  <input type="number" value={editFormData.minAverageScore} onChange={(e) => setEditFormData({ ...editFormData, minAverageScore: e.target.value })} min="0" max="5" step="0.1" className="tw-input" />
                </FieldGroup>
                <div className="md:col-span-2">
                  <FieldGroup label="Maestro / Profesor">
                    <TeacherSearchInput
                      value={editTeacherSearchTerm}
                      selectedTeacher={editFormData.teacher}
                      filteredTeachers={editFilteredTeachers}
                      showDropdown={editShowTeacherDropdown}
                      onSearch={handleEditTeacherSearch}
                      onSelect={handleEditSelectTeacher}
                      onClear={handleEditClearTeacher}
                      onFocus={() => editTeacherSearchTerm && setEditShowTeacherDropdown(true)}
                    />
                  </FieldGroup>
                </div>
                <div className="md:col-span-2 flex gap-3 pt-2">
                  <button type="submit" className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-indigo-600/20">
                    ✅ Guardar Cambios
                  </button>
                  <button type="button" onClick={handleCloseEditModal} className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl font-black text-xs uppercase tracking-widest transition-all">
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          MODALES SECUNDARIOS
      ═══════════════════════════════════════════════════════════════════ */}
      {selectedLesson && selectedEnrollment && (
        <ModalLessonAttendanceDetail
          isOpen={showLessonAttendanceDetailModal}
          onClose={() => { setSelectedLesson(null); setShowLessonAttendanceDetailModal(false); }}
          lesson={selectedLesson}
          enrollment={selectedEnrollment}
          onAttendanceRecorded={handleLessonAttendanceRecorded}
        />
      )}

      {selectedEnrollment && (
        <>
          <ModalCreateLesson
            isOpen={showCreateLessonModal}
            onClose={() => setShowCreateLessonModal(false)}
            enrollmentId={selectedEnrollment.id}
            onLessonCreated={handleLessonCreated}
          />
          <ModalRecordAttendance
            isOpen={showRecordAttendanceModal}
            onClose={() => setShowRecordAttendanceModal(false)}
            enrollmentId={selectedEnrollment.id}
            onAttendanceRecorded={handleAttendanceRecorded}
          />
        </>
      )}

      {/* Estilos globales de utilidades tw- */}
      <style>{`
        .tw-input {
          width: 100%;
          padding: 10px 14px;
          background-color: rgb(248 250 252);
          border: 2px solid rgb(226 232 240);
          border-radius: 12px;
          font-size: 14px;
          font-weight: 500;
          color: rgb(15 23 42);
          outline: none;
          transition: border-color 0.2s;
          font-family: inherit;
        }
        .tw-input:focus { border-color: rgb(99 102 241 / 0.5); box-shadow: 0 0 0 3px rgb(99 102 241 / 0.1); }
        .tw-select {
          width: 100%;
          padding: 10px 14px;
          background-color: rgb(248 250 252);
          border: 2px solid rgb(226 232 240);
          border-radius: 12px;
          font-size: 14px;
          font-weight: 500;
          color: rgb(15 23 42);
          outline: none;
          transition: border-color 0.2s;
          font-family: inherit;
          appearance: none;
        }
        .tw-select:focus { border-color: rgb(99 102 241 / 0.5); box-shadow: 0 0 0 3px rgb(99 102 241 / 0.1); }
        @media (prefers-color-scheme: dark) {
          .tw-input, .tw-select { background-color: rgb(30 41 59); border-color: rgb(51 65 85); color: rgb(241 245 249); }
        }
        :root.dark .tw-input, :root.dark .tw-select { background-color: rgb(30 41 59); border-color: rgb(51 65 85); color: rgb(241 245 249); }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// COMPONENTES AUXILIARES
// ═════════════════════════════════════════════════════════════════════════════

const ModalOverlay = ({ onClose, children }) => (
  <div
    className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm"
    onClick={onClose}
    style={{ animation: "fadeIn 0.2s ease" }}
  >
    <div onClick={(e) => e.stopPropagation()} style={{ animation: "slideUp 0.25s ease", width: "100%" }} className="flex justify-center">
      {children}
    </div>
  </div>
);

const FieldGroup = ({ label, children }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{label}</label>
    {children}
  </div>
);

const TeacherSearchInput = ({ value, selectedTeacher, filteredTeachers, showDropdown, onSearch, onSelect, onClear, onFocus }) => (
  <div className="relative">
    <input
      type="text"
      placeholder="Busca un maestro por nombre..."
      value={value}
      onChange={(e) => onSearch(e.target.value)}
      onFocus={onFocus}
      className="tw-input pr-10"
      maxLength="100"
    />
    {selectedTeacher && (
      <button type="button" onClick={onClear} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1">
        <X size={14} />
      </button>
    )}
    {showDropdown && filteredTeachers.length > 0 && (
      <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-20 overflow-hidden">
        {filteredTeachers.map((teacher) => (
          <button
            key={teacher.id}
            type="button"
            onClick={() => onSelect(teacher)}
            className="w-full px-4 py-3 text-left text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 border-b border-slate-100 dark:border-slate-700 last:border-0 transition-colors"
          >
            {getDisplayName(getTeacherName(teacher))}
          </button>
        ))}
      </div>
    )}
    {selectedTeacher && (
      <div className="mt-2 px-3 py-2 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl">
        <p className="text-xs font-black text-indigo-700 dark:text-indigo-400">
          ✅ {getDisplayName(getTeacherName(selectedTeacher))}
        </p>
      </div>
    )}
  </div>
);

const StatusBadge = ({ status, small = false, className = "" }) => {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.SUSPENDED;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-black uppercase tracking-widest bg-gradient-to-r ${config.color} text-white shadow-sm ${config.shadow} ${small ? "text-[8px]" : "text-[9px]"} ${className}`}>
      {config.icon} {config.label}
    </span>
  );
};

const DetailItem = ({ label, value }) => (
  <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700">
    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
    <p className="text-sm font-black text-slate-900 dark:text-white">{value}</p>
  </div>
);

const ActionBtn = ({ onClick, children, color = "slate" }) => {
  const colors = {
    emerald: "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100",
    amber:   "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800 hover:bg-amber-100",
    indigo:  "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100",
    rose:    "bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800 hover:bg-rose-100",
  };
  return (
    <button onClick={onClick} className={`px-4 py-2 rounded-xl border font-black text-xs uppercase tracking-widest transition-all active:scale-95 ${colors[color] || colors.slate}`}>
      {children}
    </button>
  );
};

const EmptyState = ({ icon, title, subtitle }) => (
  <div className="py-16 flex flex-col items-center gap-3 text-center">
    <div className="text-slate-200 dark:text-slate-700">{icon}</div>
    <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">{title}</p>
    <p className="text-xs text-slate-400 font-semibold">{subtitle}</p>
  </div>
);

const SelectFilter = ({ value, onChange, placeholder, children }) => (
  <div className="relative">
    <select
      value={value}
      onChange={onChange}
      className="bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500/30 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 outline-none appearance-none cursor-pointer transition-all"
    >
      <option value="">{placeholder}</option>
      {children}
    </select>
    <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
  </div>
);

const ViewModeBtn = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    className={`p-2 rounded-lg transition-all ${active ? "bg-white dark:bg-slate-700 shadow-sm text-indigo-600" : "text-slate-400 hover:text-slate-600"}`}
  >
    {children}
  </button>
);

const EnrollmentCard = ({ enrollment, onClick, onRecordAttendance, onViewDetail, onExportPDF, onExportApproved, onRecover, recovering}) => {
  const occupancy = Math.round(((enrollment.currentStudentCount || 0) / (enrollment.maxStudents || 30)) * 100);

  return (
    <div
      className="group bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col cursor-pointer"
      onClick={onClick}
    >
      <div className="p-6 space-y-4 flex-1">
        <div className="flex items-center justify-between">
          <StatusBadge status={enrollment.status} />
          <span className="text-xs font-black text-slate-300 dark:text-slate-600">#{enrollment.id}</span>
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-black tracking-tight text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors truncate uppercase leading-tight">
            {enrollment.cohortName || enrollment.levelDisplayName}
          </h3>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
            <UserCircle2 size={14} className="text-indigo-400" />
            <span className="truncate italic">{getDisplayName(getTeacherName(enrollment.teacher) || "Docente no asignado")}</span>
          </div>
        </div>
        <div className="space-y-2 pt-3 border-t border-slate-50 dark:border-slate-800">
          <div className="flex justify-between text-xs font-black">
            <span className="text-slate-400 uppercase tracking-wider">Capacidad</span>
            <span className="text-indigo-600 dark:text-indigo-400">{enrollment.currentStudentCount || 0} / {enrollment.maxStudents}</span>
          </div>
          <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-indigo-600 to-violet-500 transition-all duration-700" style={{ width: `${Math.min(occupancy, 100)}%` }} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-slate-300 dark:text-slate-600 font-black uppercase tracking-wider">Inicio</p>
            <div className="flex items-center gap-1 text-xs font-black text-slate-700 dark:text-slate-300 mt-0.5">
              <Calendar size={12} className="text-indigo-400" />
              {new Date(enrollment.startDate).toLocaleDateString()}
            </div>
          </div>
          <div>
            <p className="text-xs text-slate-300 dark:text-slate-600 font-black uppercase tracking-wider">Asist. Mín.</p>
            <div className="flex items-center gap-1 text-xs font-black text-slate-700 dark:text-slate-300 mt-0.5">
              <ShieldCheck size={12} className="text-emerald-400" />
              {enrollment.minAttendancePercentage}%
            </div>
          </div>
        </div>
      </div>
       <div className="p-3 bg-slate-50 dark:bg-slate-950/40 space-y-2" onClick={(e) => e.stopPropagation()}>
        
        {/* 🚀 MODIFICADO: Grid dinámico (4 columnas si está completado, 3 si no) */}
        <div className={`grid ${enrollment.status === 'COMPLETED' ? 'grid-cols-4' : 'grid-cols-3'} gap-2`}>
          <CardActionBtn icon={<ClipboardCheck size={13} />} label="Asis."   onClick={onRecordAttendance} hoverClass="hover:bg-slate-900 hover:text-white dark:hover:bg-indigo-600" />
          <CardActionBtn icon={<Search size={13} />}         label="Detalle" onClick={onViewDetail}       hoverClass="hover:bg-violet-600 hover:text-white" />
          <CardActionBtn icon={<FileDown size={13} />}       label="PDF"     onClick={onExportPDF}        hoverClass="hover:bg-indigo-600 hover:text-white" />
          
          {/* NUEVO BOTÓN: Acta de aprobados (solo visible en COMPLETED) */}
          {enrollment.status === 'COMPLETED' && (
            <CardActionBtn 
              icon={<Award size={13} />} 
              label="Acta" 
              onClick={onExportApproved} 
              hoverClass="hover:bg-amber-500 hover:text-white dark:hover:bg-amber-600 text-amber-600 dark:text-amber-500 bg-amber-50 dark:bg-amber-900/20" 
            />
          )}
        </div>
 
        {/* Botón de recuperación: solo para cohortes canceladas dentro del plazo */}
        {isRecoverable(enrollment) && (
          <button
            onClick={onRecover}
            disabled={recovering}
            className="w-full flex items-center justify-center gap-2 py-2.5
              bg-gradient-to-r from-amber-500 to-orange-500
              hover:from-amber-600 hover:to-orange-600
              disabled:from-amber-300 disabled:to-orange-300
              text-white rounded-xl font-black text-[10px] uppercase tracking-widest
              transition-all shadow-md shadow-amber-500/20 active:scale-95"
          >
            {recovering ? (
              <><RefreshCw size={12} className="animate-spin" /> Recuperando...</>
            ) : (
              <><RotateCcw size={12} /> Recuperar cohorte</>
            )}
          </button>
        )}
      </div>
    </div>
  );
};

const CardActionBtn = ({ icon, label, onClick, hoverClass }) => (
  <button
    onClick={onClick}
    className={`flex items-center justify-center gap-1.5 py-3 bg-white dark:bg-slate-800 rounded-xl text-slate-500 text-xs font-black uppercase tracking-widest transition-all shadow-sm active:scale-95 ${hoverClass}`}
  >
    {icon} {label}
  </button>
);

const EnrollmentTable = ({ enrollments, onOpen, onRecordAttendance, onExportPDF }) => (
  <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="bg-slate-50 dark:bg-slate-950/40 border-b border-slate-100 dark:border-slate-800">
            {["Cohorte", "Maestro", "Estado", "Inicio", "Alumnos", "Gestión"].map((h) => (
              <th key={h} className="px-6 py-5 text-left text-xs font-black uppercase text-slate-400 tracking-widest">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
          {enrollments.map((e) => (
            <tr key={e.id} className="hover:bg-indigo-50/20 dark:hover:bg-indigo-500/5 transition-all group cursor-pointer" onClick={() => onOpen(e)}>
              <td className="px-6 py-5">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-800 text-indigo-500 flex items-center justify-center font-black text-lg group-hover:bg-indigo-600 group-hover:text-white transition-all">
                    {(e.cohortName || "C")[0]}
                  </div>
                  <div>
                    <p className="font-black text-sm uppercase tracking-tight text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors">{e.cohortName || e.levelDisplayName}</p>
                    <p className="text-xs font-black text-slate-300 dark:text-slate-600">#{e.id}</p>
                  </div>
                </div>
              </td>
              <td className="px-6 py-5">
                <div className="flex items-center gap-2">
                  <UserCircle2 size={14} className="text-slate-400" />
                  <p className="text-xs font-bold text-slate-600 dark:text-slate-400 italic truncate max-w-32">{getDisplayName(getTeacherName(e.teacher) || "Sin asignar")}</p>
                </div>
              </td>
              <td className="px-6 py-5"><StatusBadge status={e.status} /></td>
              <td className="px-6 py-5 text-xs font-black text-slate-500 dark:text-slate-400 tabular-nums">
                {new Date(e.startDate).toLocaleDateString()}
              </td>
              <td className="px-6 py-5">
                <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-black text-base">
                  <Users size={16} /> {e.currentStudentCount || 0}
                </div>
              </td>
              <td className="px-6 py-5" onClick={(ev) => ev.stopPropagation()}>
                <div className="flex items-center gap-2">
                  <TableActionBtn icon={<ClipboardCheck size={15} />} onClick={() => onRecordAttendance(e)} hoverClass="hover:bg-slate-900 hover:text-white dark:hover:bg-indigo-600" title="Asistencia" />
                  <TableActionBtn icon={<Search size={15} />} onClick={() => onOpen(e)} hoverClass="hover:bg-violet-600 hover:text-white" title="Detalle" />
                  <TableActionBtn icon={<FileDown size={15} />} onClick={() => onExportPDF(e)} hoverClass="hover:bg-indigo-600 hover:text-white" title="PDF" />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

const TableActionBtn = ({ icon, onClick, hoverClass, title }) => (
  <button onClick={onClick} title={title} className={`p-2.5 bg-slate-50 dark:bg-slate-800 text-slate-400 rounded-xl transition-all ${hoverClass}`}>
    {icon}
  </button>
);

export default EnrollmentsPage;