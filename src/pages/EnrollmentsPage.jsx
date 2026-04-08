// ============================================
// EnrollmentsPage.jsx - VERSIÓN ACTUALIZADA
// ============================================

import React, { useState, useEffect, useCallback, useMemo } from "react";
import apiService from "../apiService";
import { logSecurityEvent } from "../utils/securityLogger";
import { throttle } from "lodash";
import ModalCreateLesson from "../components/ModalCreateLesson";
import ModalRecordAttendance from "../components/ModalRecordAttendance";
import ModalLessonAttendanceDetail from "../components/ModalLessonAttendanceDetail";
import nameHelper from "../services/nameHelper";
import "../css/EnrollmentsPage.css";
import { useAuth } from "../context/AuthContext";
import { generateCohortPDF } from "../services/generateCohortPDF";
import { generateAttendancePDF } from "../services/attendanceCohortsPdfGenerator";
import { generateCohortAttendanceFullPDF } from "../services/generateCohortAttendanceFullPDF";

// Extraer funciones del helper
const { getDisplayName } = nameHelper;

// 🔐 Debug condicional
const DEBUG = process.env.REACT_APP_DEBUG === "true";

const log = (message, data) => {
  if (DEBUG) {
    console.log(`[EnrollmentsPage] ${message}`, data || "");
  }
};

const logError = (message, error) => {
  console.error(`[EnrollmentsPage] ${message}`, error);
};

// ✅ Función auxiliar para asegurar que siempre manejamos un array
const toArray = (val) => (Array.isArray(val) ? val : []);

// ✅ Sanitización de HTML
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

// ── CAMBIO v5: helper para obtener el nombre del maestro desde Leader o Member ──
// CAMBIO v5b: soporta tanto DTO plano { memberName } como objeto anidado { member.name }
const getTeacherName = (teacher) => {
  if (!teacher) return null;
  if (teacher.member?.name) return teacher.member.name; // objeto anidado
  if (teacher.memberName) return teacher.memberName; // DTO plano del backend
  if (teacher.name) return teacher.name; // fallback transitorio
  return null;
};

// ✅ Validaciones
const isValidLevel = (level, LEVELS) => LEVELS.some((l) => l.code === level);
const isValidStatus = (status, STATUSES) =>
  STATUSES.some((s) => s.value === status);
const validateDates = (startDate, endDate) => {
  if (!startDate || !endDate) return false;
  const start = new Date(startDate);
  const end = new Date(endDate);
  return !isNaN(start.getTime()) && !isNaN(end.getTime()) && start < end;
};
const isValidMaxStudents = (max) => {
  const num = parseInt(max);
  return !isNaN(num) && num >= 1 && num <= 500;
};
const isValidPercentage = (value) => {
  const num = parseFloat(value);
  return !isNaN(num) && num >= 0 && num <= 100;
};
const isValidScore = (score) => {
  const num = parseFloat(score);
  return !isNaN(num) && num >= 0 && num <= 5;
};

// ✅ Constantes fuera del componente
const STATUSES = [
  { value: "ACTIVE", label: "Activa" },
  { value: "SUSPENDED", label: "Inactiva" },
  { value: "PENDING", label: "Programada" },
  { value: "COMPLETED", label: "Completada" },
  { value: "CANCELLED", label: "Cancelada" },
];

// ============================================
// 🔐 CONTROL DE ACCESO POR ROL
// ============================================
const FULL_ACCESS_ROLES = ["ROLE_PASTORES", "ROLE_ECONOMICO"];

const ROLE_LEVEL_MAP = {
  ROLE_CONEXION: ["PREENCUENTRO"],
  ROLE_CIMIENTO: ["ENCUENTRO", "POST_ENCUENTRO", "BAUTIZOS"],
  ROLE_ESENCIA: [
    "ESENCIA_1",
    "ESENCIA_2",
    "ESENCIA_3",
    "SANIDAD_INTEGRAL_RAICES",
    "ESENCIA_4",
    "ADIESTRAMIENTO",
    "GRADUACION",
  ],
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

// ✅ FIX timezone
const parseLocalDate = (dateString) => {
  if (!dateString) return null;
  const [year, month, day] = String(dateString)
    .split("T")[0]
    .split("-")
    .map(Number);
  return new Date(year, month - 1, day);
};

const formatLocalDate = (dateString) => {
  const date = parseLocalDate(dateString);
  if (!date || isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("es-CO", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const EnrollmentsPage = () => {
  const { user } = useAuth();

  // Estado para los niveles
  const [levels, setLevels] = useState([]);
  const [levelsLoading, setLevelsLoading] = useState(true);

  // Cargar niveles al montar el componente
  useEffect(() => {
    const loadLevels = async () => {
      try {
        setLevelsLoading(true);
        const data = await apiService.getActiveLevels();
        setLevels(data);
      } catch (error) {
        logError("Error cargando niveles:", error);
        // Fallback a niveles por defecto
        setLevels(apiService.getDefaultLevels());
      } finally {
        setLevelsLoading(false);
      }
    };
    loadLevels();
  }, []);

  // Obtener niveles permitidos según el rol del usuario
  const getAllowedLevels = useCallback((userRoles = [], allLevels) => {
    const normalized = userRoles.map((r) =>
      typeof r === "object" && r.name
        ? r.name.toUpperCase()
        : String(r).toUpperCase(),
    );

    if (normalized.some((r) => FULL_ACCESS_ROLES.includes(r))) {
      return allLevels;
    }

    const allowedCodes = new Set();
    normalized.forEach((role) => {
      const mapped = ROLE_LEVEL_MAP[role];
      if (mapped) mapped.forEach((v) => allowedCodes.add(v));
    });

    return allLevels.filter((level) => allowedCodes.has(level.code));
  }, []);

  // ✅ useMemo para allowedLevels
  const allowedLevels = useMemo(
    () => getAllowedLevels(user?.roles ?? [], levels),
    [user?.roles, levels, getAllowedLevels], // Cambiar user?.id por user?.roles
  );

  // ✅ Estados — formData
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
  const [error, setError] = useState("");

  const [selectedEnrollment, setSelectedEnrollment] = useState(null);
  const [showEnrollmentModal, setShowEnrollmentModal] = useState(false);
  const [activeTab, setActiveTab] = useState("details");

  const [showCreateLessonModal, setShowCreateLessonModal] = useState(false);
  const [showRecordAttendanceModal, setShowRecordAttendanceModal] =
    useState(false);

  const [showLessonAttendanceDetailModal, setShowLessonAttendanceDetailModal] =
    useState(false);
  const [selectedLesson, setSelectedLesson] = useState(null);

  const [showForm, setShowForm] = useState(false);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState({
    cohortName: "",
    startDate: "",
    endDate: "",
    maxStudents: 30,
    minAttendancePercentage: 80,
    minAverageScore: 3.0,
    teacher: null,
  });
  const [editTeacherSearchTerm, setEditTeacherSearchTerm] = useState("");
  const [editFilteredTeachers, setEditFilteredTeachers] = useState([]);
  const [editShowTeacherDropdown, setEditShowTeacherDropdown] = useState(false);

  const [lessons, setLessons] = useState([]);
  const [students, setStudents] = useState([]);
  const [attendanceSummary, setAttendanceSummary] = useState([]);
  const [availableTeachers, setAvailableTeachers] = useState([]);
  const [filteredTeachers, setFilteredTeachers] = useState([]);
  const [showTeacherDropdown, setShowTeacherDropdown] = useState(false);
  const [teacherSearchTerm, setTeacherSearchTerm] = useState("");
  const [exportingPDF, setExportingPDF] = useState(false);

  const handleError = useCallback((errorKey, context = "") => {
    const errorMessage = ERROR_MESSAGES[errorKey] || ERROR_MESSAGES.GENERIC;
    setError(errorMessage);
    logSecurityEvent("error_event", {
      errorKey,
      context,
      timestamp: new Date().toISOString(),
    });
  }, []);

  const loadTeachers = useCallback(async () => {
    try {
      // CAMBIO v5: carga líderes activos en lugar de todos los miembros
      log("Cargando maestros (líderes activos)");
      const members = await apiService.getActiveLeaders();
      setAvailableTeachers(members || []);
    } catch (err) {
      handleError("FETCH_TEACHERS", "loadTeachers");
      logError("Error cargando maestros:", err);
    }
  }, [handleError]);

  const exportCohortPDF = async () => {
    if (!selectedEnrollment) return;
    setExportingPDF(true);
    setError("");

    try {
      // 1. Obtener estudiantes activos (usa los ya cargados o los pide)
      let exportStudents = students.filter((s) => s.status !== "CANCELLED");

      if (exportStudents.length === 0) {
        const raw = await apiService.getStudentEnrollmentsByEnrollment(
          selectedEnrollment.id,
        );
        exportStudents = (raw || []).filter((s) => s.status !== "CANCELLED");
      }

      // 2. Enriquecer con datos del miembro (género, líder, distrito) — paralelo
      const memberResults = await Promise.allSettled(
        exportStudents.map((s) => apiService.getMemberById(s.memberId)),
      );

      const enriched = exportStudents.map((student, i) => {
        const m =
          memberResults[i].status === "fulfilled"
            ? memberResults[i].value || {}
            : {};

        return {
          ...student,
          memberName:
            student.memberName || m.name || `Miembro ${student.memberId}`,
          gender: m.gender ?? m.sex ?? m.genero ?? m.sexo ?? "",
          leader:
            m.leaderName ??
            m.leader?.name ??
            m.cell?.groupLeader?.memberName ??
            m.cell?.groupLeader?.name ??
            m.cell?.groupLeaderName ??
            m.groupLeaderName ??
            "—",
          district:
            m.district ?? m.distrito ?? m.cell?.district ?? m.barrio ?? "—",
        };
      });

      // 3. Llamar al generador pasando los helpers del componente
      generateCohortPDF(selectedEnrollment, enriched, {
        getLevelLabel,
        getStatusLabel,
        getTeacherName,
        getDisplayName,
      });
    } catch (err) {
      logError("Error exportando PDF:", err);
      setError("Error al generar el PDF. Inténtalo de nuevo.");
    } finally {
      setExportingPDF(false);
    }
  };

  const fetchEnrollments = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      log("Obteniendo cohortes");

      const data = await apiService.getEnrollments();
      const enrollmentsArray = Array.isArray(data) ? data : data.content || [];

      if (!Array.isArray(enrollmentsArray)) {
        throw new Error("Formato de respuesta inválido");
      }

      // LOG PARA VER QUÉ ESTÁ LLEGANDO
      //console.log("📦 Datos crudos de cohortes:", enrollmentsArray);

      const sorted = enrollmentsArray.sort((a, b) => {
        const dateA = new Date(a.startDate);
        const dateB = new Date(b.startDate);
        return dateB - dateA;
      });

      // ✅ CORRECCIÓN: Normalizar los datos de nivel correctamente
      const normalized = sorted.map((enrollment) => {
        // LOG PARA CADA COHORTE
        /*console.log(`🔍 Procesando cohorte ID ${enrollment.id}:`, {
          levelEnrollment: enrollment.levelEnrollment,
          levelType: typeof enrollment.levelEnrollment,
          isObject:
            enrollment.levelEnrollment &&
            typeof enrollment.levelEnrollment === "object",
        });*/

        // Determinar el código del nivel
        let levelCode = null;
        let levelObject = null;

        if (
          enrollment.levelEnrollment &&
          typeof enrollment.levelEnrollment === "object"
        ) {
          // Si es un objeto (como en tus datos)
          levelObject = enrollment.levelEnrollment;
          levelCode = enrollment.levelEnrollment.code;
          //console.log(`✅ Nivel encontrado como objeto: ${levelCode}`);
        } else if (typeof enrollment.levelEnrollment === "string") {
          // Si es string directamente
          levelCode = enrollment.levelEnrollment;
          //console.log(`✅ Nivel encontrado como string: ${levelCode}`);
        } else if (enrollment.level?.code) {
          // Si viene en level.code
          levelCode = enrollment.level.code;
          levelObject = enrollment.level;
          //console.log(`✅ Nivel encontrado en level.code: ${levelCode}`);
        } else if (enrollment.level && typeof enrollment.level === "string") {
          // Si level es string
          levelCode = enrollment.level;
          //console.log(`✅ Nivel encontrado en level string: ${levelCode}`);
        }

        // Buscar el displayName correspondiente en el array de levels
        const levelObj = levels.find((l) => l.code === levelCode);
        const levelDisplayName =
          levelObj?.displayName || levelObject?.displayName || levelCode;

        // Determinar el nombre de la cohorte
        const cohortName =
          enrollment.cohortName ||
          (levelDisplayName
            ? `${levelDisplayName} ${new Date(enrollment.startDate).getFullYear()}`
            : `Cohorte ${enrollment.id}`);

        // Calcular estudiantes activos (no cancelados)
        // DESPUÉS - Ya está bien, pero verifica que se use correctamente
        const activeStudents = (enrollment.studentEnrollments || []).filter(
          (se) => se.status !== "CANCELLED",
        );

        const normalizedEnrollment = {
          id: enrollment.id,
          cohortName: cohortName,
          levelCode: levelCode,
          levelDisplayName: levelDisplayName,
          levelObject: levelObject, // Guardar el objeto original por si acaso
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
          // Mantener datos originales
          ...enrollment,
        };

        /*console.log(`✅ Cohorte normalizada:`, {
          id: normalizedEnrollment.id,
          name: normalizedEnrollment.cohortName,
          levelCode: normalizedEnrollment.levelCode,
          levelDisplayName: normalizedEnrollment.levelDisplayName,
        });*/

        return normalizedEnrollment;
      });

      //console.log("📊 Cohortes normalizadas:", normalized);

      // ✅ Obtener códigos de niveles permitidos
      const allowedCodes = allowedLevels.map((l) => l.code);
      //console.log("🔑 Niveles permitidos:", allowedCodes);

      // Filtrar por niveles permitidos
      const roleFiltered =
        allowedCodes.length > 0
          ? normalized.filter((e) => {
              const hasAccess = allowedCodes.includes(e.levelCode);
              if (!hasAccess) {
                console.log(
                  `🚫 Cohorte ${e.id} (${e.levelCode}) no accesible para este rol`,
                );
              }
              return hasAccess;
            })
          : normalized;

     /* console.log(
        "✅ Cohortes después de filtro por rol:",
        roleFiltered.length,
      );*/

      setEnrollments(roleFiltered);

      // Aplicar filtros de nivel y estado
      let filtered = roleFiltered;

      if (filterLevel && filterLevel.trim() !== "") {
        console.log("🔍 Filtrando por nivel:", filterLevel);
        if (!isValidLevel(filterLevel, levels)) {
          handleError("VALIDATION_ERROR", "invalid_level");
          setFilteredEnrollments([]);
          return;
        }
        filtered = filtered.filter((e) => e.levelCode === filterLevel);
      }

      if (filterStatus && filterStatus.trim() !== "") {
        console.log("🔍 Filtrando por estado:", filterStatus);
        if (!isValidStatus(filterStatus, STATUSES)) {
          handleError("VALIDATION_ERROR", "invalid_status");
          setFilteredEnrollments([]);
          return;
        }
        filtered = filtered.filter((e) => e.status === filterStatus);
      }

      //console.log("✅ Cohortes después de filtros:", filtered.length);
      setFilteredEnrollments(filtered);
    } catch (err) {
      handleError("FETCH_ENROLLMENTS", "fetchEnrollments");
      logError("Error obteniendo cohortes:", err);
      console.error("❌ Error detallado:", err);
    } finally {
      setLoading(false);
    }
  }, [filterLevel, filterStatus, handleError, allowedLevels, levels]);

  useEffect(() => {
    if (!levelsLoading) {
      fetchEnrollments();
      loadTeachers();
    }
  }, [fetchEnrollments, loadTeachers, levelsLoading]);

  // Actualizar formData cuando cambien los niveles permitidos
  useEffect(() => {
    if (allowedLevels.length > 0 && !formData.level) {
      setFormData((prev) => ({ ...prev, level: allowedLevels[0].code }));
    }
  }, [allowedLevels, formData.level]);

  const handleTeacherSearch = (value) => {
    try {
      if (typeof value !== "string" || value.length > 100) {
        return;
      }

      setTeacherSearchTerm(value);
      setShowTeacherDropdown(true);

      if (value.trim() === "") {
        setFilteredTeachers([]);
        return;
      }

      const sanitizedValue = value.toLowerCase().trim();
      // CAMBIO v5b: soporta DTO plano { memberName } y objeto anidado { member.name }
      const filtered = availableTeachers.filter((teacher) => {
        const name = teacher.member?.name || teacher.memberName || "";
        const email = teacher.member?.email || teacher.memberEmail || "";
        return (
          name.toLowerCase().includes(sanitizedValue) ||
          email.toLowerCase().includes(sanitizedValue)
        );
      });
      setFilteredTeachers(filtered.slice(0, 5));
    } catch (error) {
      logError("Error en búsqueda de maestro:", error);
    }
  };

  const handleSelectTeacher = (teacher) => {
    try {
      if (!teacher || !teacher.id || typeof teacher.id !== "number") {
        handleError("VALIDATION_ERROR", "invalid_teacher_id");
        return;
      }

      // CAMBIO v5: guarda el objeto Leader completo
      setFormData((prev) => ({
        ...prev,
        teacher: teacher,
      }));

      setTeacherSearchTerm(getDisplayName(getTeacherName(teacher)));
      setShowTeacherDropdown(false);
      setFilteredTeachers([]);

      log("Maestro seleccionado", { teacherId: teacher.id });
    } catch (error) {
      logError("Error seleccionando maestro:", error);
      handleError("VALIDATION_ERROR");
    }
  };

  const handleClearTeacher = () => {
    setFormData((prev) => ({ ...prev, teacher: null }));
    setTeacherSearchTerm("");
    setFilteredTeachers([]);
  };

  const handleEditTeacherSearch = (value) => {
    try {
      if (typeof value !== "string" || value.length > 100) {
        return;
      }

      setEditTeacherSearchTerm(value);
      setEditShowTeacherDropdown(true);

      if (value.trim() === "") {
        setEditFilteredTeachers([]);
        return;
      }

      const sanitizedValue = value.toLowerCase().trim();
      // CAMBIO v5b: soporta DTO plano { memberName } y objeto anidado { member.name }
      const filtered = availableTeachers.filter((teacher) => {
        const name = teacher.member?.name || teacher.memberName || "";
        const email = teacher.member?.email || teacher.memberEmail || "";
        return (
          name.toLowerCase().includes(sanitizedValue) ||
          email.toLowerCase().includes(sanitizedValue)
        );
      });
      setEditFilteredTeachers(filtered.slice(0, 5));
    } catch (error) {
      logError("Error en búsqueda de maestro (editar):", error);
    }
  };

  const handleEditSelectTeacher = (teacher) => {
    try {
      if (!teacher || !teacher.id || typeof teacher.id !== "number") {
        handleError("VALIDATION_ERROR", "invalid_teacher_id");
        return;
      }

      // CAMBIO v5: guarda el objeto Leader completo
      setEditFormData((prev) => ({
        ...prev,
        teacher: teacher,
      }));

      setEditTeacherSearchTerm(getDisplayName(getTeacherName(teacher)));
      setEditShowTeacherDropdown(false);
      setEditFilteredTeachers([]);
    } catch (error) {
      logError("Error seleccionando maestro (editar):", error);
      handleError("VALIDATION_ERROR");
    }
  };

  const handleEditClearTeacher = () => {
    setEditFormData((prev) => ({ ...prev, teacher: null }));
    setEditTeacherSearchTerm("");
    setEditFilteredTeachers([]);
  };

  const loadTabData = useCallback(
    async (tab) => {
      if (!selectedEnrollment || !selectedEnrollment.id) return;

      try {
        setError("");
        log("Cargando tab:", tab);

        switch (tab) {
          case "lessons":
            const lessonsData = await apiService.getLessonsByEnrollment(
              selectedEnrollment.id,
            );
            const sanitizedLessons = (lessonsData || []).map((l) => ({
              ...l,
              lessonName: escapeHtml(l.lessonName),
              description: escapeHtml(l.description || ""),
            }));
            setLessons(sanitizedLessons);
            break;

          case "students":
            const studentsData =
              await apiService.getStudentEnrollmentsByEnrollment(
                selectedEnrollment.id,
              );

            // ✅ FILTRAR estudiantes cancelados y luego sanitizar
            const activeStudents = (studentsData || []).filter(
              (s) => s.status !== "CANCELLED",
            );

            const sanitizedStudents = activeStudents.map((s) => ({
              ...s,
              memberName: escapeHtml(s.memberName),
            }));

            setStudents(sanitizedStudents);
            break;

          case "attendance":
            const lessonsForAttendance =
              await apiService.getLessonsByEnrollment(selectedEnrollment.id);
            const sanitizedAttendance = (lessonsForAttendance || []).map(
              (l) => ({
                ...l,
                lessonName: escapeHtml(l.lessonName),
              }),
            );
            setAttendanceSummary(sanitizedAttendance);
            break;

          default:
            break;
        }
      } catch (err) {
        const errorKey =
          tab === "lessons"
            ? "FETCH_LESSONS"
            : tab === "students"
              ? "FETCH_STUDENTS"
              : tab === "attendance"
                ? "FETCH_ATTENDANCE"
                : "GENERIC";

        handleError(errorKey, `loadTabData:${tab}`);
        logError(`Error cargando tab ${tab}:`, err);
      }
    },
    [selectedEnrollment, handleError],
  );

  useEffect(() => {
    if (showEnrollmentModal && selectedEnrollment) {
      loadTabData(activeTab);
    }
  }, [activeTab, showEnrollmentModal, selectedEnrollment, loadTabData]);

  const applyFilters = (data, level, status) => {
    try {
      log("Aplicando filtros", { level, status });

      let filtered = data;

      if (level && level.trim() !== "") {
        if (!isValidLevel(level, levels)) {
          handleError("VALIDATION_ERROR", "invalid_level");
          setFilteredEnrollments([]);
          return;
        }
        filtered = filtered.filter((e) => e.levelCode === level);
      }

      if (status && status.trim() !== "") {
        if (!isValidStatus(status, STATUSES)) {
          handleError("VALIDATION_ERROR", "invalid_status");
          setFilteredEnrollments([]);
          return;
        }
        filtered = filtered.filter((e) => e.status === status);
      }

      setFilteredEnrollments(filtered);
    } catch (error) {
      logError("Error aplicando filtros:", error);
      setFilteredEnrollments(data);
    }
  };

  const handlePrintLessonAttendance = async (lesson) => {
    try {
      setExportingPDF(true);

      // 1. Obtener registros de asistencia reales
      const response = await apiService.getAttendanceByLesson(lesson.id);
      const attendanceRecords = toArray(response);

      // 2. Crear un Set con los IDs de INSCRIPCIÓN (studentEnrollmentId) que marcaron "present: true"
      // Esto garantiza que si hay 40 registros en el JSON, solo cuente esos 40.
      const attendedEnrollmentIds = new Set(
        attendanceRecords
          .filter((r) => r.present === true)
          .map((r) => Number(r.studentEnrollmentId)),
      );

      // 3. Asegurar que tenemos la lista de estudiantes completa de la cohorte
      let currentStudents = students;
      if (currentStudents.length === 0) {
        const rawStudents = await apiService.getStudentEnrollmentsByEnrollment(
          selectedEnrollment.id,
        );
        currentStudents = toArray(rawStudents).filter(
          (s) => s.status !== "CANCELLED",
        );
      }

      // 4. Enriquecer datos y determinar asistencia real
      const enrichedStudents = await Promise.all(
        currentStudents.map(async (s) => {
          // Determinamos si asistió comparando su ID de inscripción (s.id) con el Set
          const hasAttended = attendedEnrollmentIds.has(Number(s.id));

          try {
            const memberData = await apiService.getMemberById(s.memberId);
            return {
              ...s,
              isActuallyPresent: hasAttended, // Guardamos el estado real aquí
              leaderName:
                memberData.leaderName || memberData.leader?.name || "—",
            };
          } catch (e) {
            return { ...s, isActuallyPresent: hasAttended, leaderName: "—" };
          }
        }),
      );

      // 5. Lista de memberIds que asistieron para el generador (basada en el cruce anterior)
      const finalAttendanceList = enrichedStudents
        .filter((s) => s.isActuallyPresent)
        .map((s) => s.memberId);

      console.log("✅ Conteo final verificado:", {
        total: enrichedStudents.length,
        asistieron: finalAttendanceList.length, // Debería dar 40
        faltaron: enrichedStudents.length - finalAttendanceList.length, // Debería dar 24
      });

      generateAttendancePDF(
        selectedEnrollment,
        lesson,
        enrichedStudents,
        finalAttendanceList,
      );
    } catch (err) {
      console.error("Error:", err);
      alert("Error al procesar el conteo de asistencia.");
    } finally {
      setExportingPDF(false);
    }
  };

  const handlePrintCohortAttendance = async () => {
    if (!selectedEnrollment) return;
    setExportingPDF(true);
    setError("");

    try {
      // 1. Obtener todas las lecciones de la cohorte
      const lessonsRaw = await apiService.getLessonsByEnrollment(
        selectedEnrollment.id,
      );
      const allLessons = (lessonsRaw || []).sort(
        (a, b) => a.lessonNumber - b.lessonNumber,
      );

      if (allLessons.length === 0) {
        alert("Esta cohorte no tiene lecciones registradas.");
        return;
      }

      // 2. Obtener estudiantes activos
      let currentStudents = students;
      if (currentStudents.length === 0) {
        const rawStudents = await apiService.getStudentEnrollmentsByEnrollment(
          selectedEnrollment.id,
        );
        currentStudents = toArray(rawStudents).filter(
          (s) => s.status !== "CANCELLED",
        );
      }

      // 3. Enriquecer estudiantes con leaderName (en paralelo)
      const memberResults = await Promise.allSettled(
        currentStudents.map((s) => apiService.getMemberById(s.memberId)),
      );
      const enrichedStudents = currentStudents.map((s, i) => {
        const m =
          memberResults[i].status === "fulfilled"
            ? memberResults[i].value || {}
            : {};
        return {
          ...s,
          memberName: s.memberName || m.name || `Miembro ${s.memberId}`,
          leaderName:
            m.leaderName ??
            m.leader?.name ??
            m.cell?.groupLeader?.memberName ??
            m.cell?.groupLeaderName ??
            m.groupLeaderName ??
            "Sin Líder Asignado",
        };
      });

      // 4. Obtener registros de asistencia de TODAS las lecciones (en paralelo)
      //    Solo incluir lecciones que tengan al menos 1 registro de asistencia
      const attendanceResults = await Promise.allSettled(
        allLessons.map((l) => apiService.getAttendanceByLesson(l.id)),
      );

      // 5. Construir attendanceMatrix: Map<lessonId, Set<memberId>>
      //    y filtrar lecciones sin ningún registro
      const attendanceMatrix = new Map();
      const lessonsWithData = [];

      allLessons.forEach((lesson, i) => {
        const records = toArray(
          attendanceResults[i].status === "fulfilled"
            ? attendanceResults[i].value
            : [],
        );
        // Solo incluir lecciones con al menos un registro (present true o false)
        if (records.length === 0) return;

        const presentIds = new Set(
          records
            .filter((r) => r.present === true)
            .map((r) => Number(r.studentEnrollmentId)),
        );

        // Convertir studentEnrollmentId → memberId usando la lista de estudiantes
        const presentMemberIds = new Set();
        enrichedStudents.forEach((s) => {
          if (presentIds.has(Number(s.id))) {
            presentMemberIds.add(Number(s.memberId));
          }
        });

        attendanceMatrix.set(lesson.id, presentMemberIds);
        lessonsWithData.push({
          ...lesson,
          count: presentMemberIds.size,
        });
      });

      if (lessonsWithData.length === 0) {
        alert("No hay registros de asistencia ingresados en ninguna lección.");
        return;
      }

      /*console.log("📊 Generando PDF consolidado:", {
        lecciones: lessonsWithData.length,
        estudiantes: enrichedStudents.length,
      });*/

      // 6. Llamar al generador
      generateCohortAttendanceFullPDF(
        selectedEnrollment,
        lessonsWithData,
        enrichedStudents,
        attendanceMatrix,
      );
    } catch (err) {
      console.error("Error generando PDF consolidado:", err);
      setError(
        "Error al generar el reporte de asistencias. Inténtalo de nuevo.",
      );
    } finally {
      setExportingPDF(false);
    }
  };

  const handleFilterChange = (type, value) => {
    try {
      setError("");

      if (type === "level") {
        setFilterLevel(value);
        applyFilters(enrollments, value, filterStatus);
      } else if (type === "status") {
        setFilterStatus(value);
        applyFilters(enrollments, filterLevel, value);
      }
    } catch (error) {
      logError("Error en cambio de filtro:", error);
    }
  };

  const handleOpenEnrollmentModal = (enrollment) => {
    try {
      if (!enrollment || !enrollment.id || typeof enrollment.id !== "number") {
        handleError("INVALID_ENROLLMENT");
        return;
      }

      setSelectedEnrollment(enrollment);
      setActiveTab("details");
      setShowEnrollmentModal(true);
      setError("");
    } catch (error) {
      logError("Error abriendo modal de cohorte:", error);
      handleError("GENERIC");
    }
  };

  const handleCloseEnrollmentModal = () => {
    setSelectedEnrollment(null);
    setShowEnrollmentModal(false);
    setActiveTab("details");
    setLessons([]);
    setStudents([]);
    setAttendanceSummary([]);
    setError("");
  };

  const handleOpenEditModal = () => {
    try {
      if (!selectedEnrollment) return;

      if (
        selectedEnrollment.status === "COMPLETED" ||
        selectedEnrollment.status === "CANCELLED"
      ) {
        const message =
          selectedEnrollment.status === "COMPLETED"
            ? "No se puede editar una cohorte completada"
            : "No se puede editar una cohorte cancelada";

        setError(message);
        logSecurityEvent("unauthorized_edit_attempt", {
          enrollmentId: selectedEnrollment.id,
          status: selectedEnrollment.status,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      setEditFormData({
        cohortName: selectedEnrollment.cohortName || "",
        startDate: selectedEnrollment.startDate || "",
        endDate: selectedEnrollment.endDate || "",
        maxStudents: selectedEnrollment.maxStudents || 30,
        minAttendancePercentage:
          selectedEnrollment.minAttendancePercentage || 80,
        minAverageScore: selectedEnrollment.minAverageScore || 3.0,
        teacher: selectedEnrollment.teacher || null,
      });

      // CAMBIO v5: pre-llena con leader.member.name
      const _teacherName = getTeacherName(selectedEnrollment.teacher);
      if (_teacherName) {
        setEditTeacherSearchTerm(getDisplayName(_teacherName));
      }

      setShowEditModal(true);
      log("Modal de edición abierto", { enrollmentId: selectedEnrollment.id });
    } catch (error) {
      logError("Error abriendo modal de edición:", error);
      handleError("GENERIC");
    }
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setEditFormData({
      cohortName: "",
      startDate: "",
      endDate: "",
      maxStudents: 30,
      minAttendancePercentage: 80,
      minAverageScore: 3.0,
      teacher: null,
    });
    setEditTeacherSearchTerm("");
    setEditFilteredTeachers([]);
    setError("");
  };

  const throttledStatusChange = throttle(async (enrollmentId, newStatus) => {
    try {
      if (!enrollmentId || typeof enrollmentId !== "number") {
        handleError("VALIDATION_ERROR", "invalid_enrollment_id");
        return;
      }

      if (!isValidStatus(newStatus, STATUSES)) {
        handleError("VALIDATION_ERROR", "invalid_status_change");
        return;
      }

      setError("");
      log("Cambiando estado", { enrollmentId, newStatus });

      await apiService.updateEnrollmentStatus(enrollmentId, newStatus);

      logSecurityEvent("status_changed", {
        enrollmentId,
        newStatus,
        timestamp: new Date().toISOString(),
      });

      fetchEnrollments();
      handleCloseEnrollmentModal();
    } catch (err) {
      handleError("UPDATE_STATUS", "handleStatusChange");
      logError("Error cambiando estado:", err);
    }
  }, 1000);

  const handleStatusChange = (enrollmentId, newStatus) => {
    try {
      if (!selectedEnrollment) return;

      if (
        selectedEnrollment.status === "COMPLETED" ||
        selectedEnrollment.status === "CANCELLED"
      ) {
        const message =
          selectedEnrollment.status === "COMPLETED"
            ? "No se puede cambiar el estado de una cohorte completada"
            : "No se puede cambiar el estado de una cohorte cancelada";

        setError(message);
        logSecurityEvent("unauthorized_status_change_attempt", {
          enrollmentId,
          status: selectedEnrollment.status,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      throttledStatusChange(enrollmentId, newStatus);
    } catch (error) {
      logError("Error en cambio de estado:", error);
      handleError("GENERIC");
    }
  };

  const handleCreateLesson = async () => {
    try {
      setShowCreateLessonModal(true);
    } catch (error) {
      logError("Error abriendo modal de lección:", error);
      handleError("GENERIC");
    }
  };

  const handleLessonCreated = useCallback(async () => {
    try {
      if (selectedEnrollment) {
        await loadTabData("lessons");
      }
    } catch (error) {
      logError("Error después de crear lección:", error);
    }
  }, [selectedEnrollment, loadTabData]);

  const handleRecordAttendance = async () => {
    try {
      setShowRecordAttendanceModal(true);
    } catch (error) {
      logError("Error abriendo modal de asistencia:", error);
      handleError("GENERIC");
    }
  };

  const handleAttendanceRecorded = useCallback(async () => {
    try {
      if (selectedEnrollment) {
        await loadTabData("attendance");
      }
    } catch (error) {
      logError("Error después de registrar asistencia:", error);
    }
  }, [selectedEnrollment, loadTabData]);

  const handleOpenLessonAttendanceDetail = (lesson) => {
    try {
      if (!lesson || !lesson.id || typeof lesson.id !== "number") {
        handleError("VALIDATION_ERROR", "invalid_lesson");
        return;
      }

      log("Abriendo detalles de asistencia de lección", {
        lessonId: lesson.id,
      });
      setSelectedLesson(lesson);
      setShowLessonAttendanceDetailModal(true);
    } catch (error) {
      logError("Error abriendo detalles de lección:", error);
      handleError("GENERIC");
    }
  };

  const handleCloseLessonAttendanceDetail = () => {
    setSelectedLesson(null);
    setShowLessonAttendanceDetailModal(false);
  };

  const handleLessonAttendanceRecorded = useCallback(async () => {
    try {
      if (selectedEnrollment) {
        await loadTabData("attendance");
      }
    } catch (error) {
      logError("Error después de registrar asistencia de lección:", error);
    }
  }, [selectedEnrollment, loadTabData]);

  const validateForm = () => {
    const errors = [];

    if (!formData.level || !isValidLevel(formData.level, levels)) {
      errors.push("Nivel inválido");
    }
    if (!formData.startDate) {
      errors.push("Fecha de inicio requerida");
    }
    if (!formData.endDate) {
      errors.push("Fecha de fin requerida");
    }
    if (formData.startDate && formData.endDate) {
      if (!validateDates(formData.startDate, formData.endDate)) {
        errors.push("Fecha de inicio debe ser anterior a fecha de fin");
      }
    }
    if (
      !formData.teacher ||
      !formData.teacher.id ||
      typeof formData.teacher.id !== "number"
    ) {
      errors.push("Maestro requerido");
    }
    if (!isValidMaxStudents(formData.maxStudents)) {
      errors.push("Máximo de estudiantes debe estar entre 1 y 500");
    }
    if (!isValidPercentage(formData.minAttendancePercentage)) {
      errors.push("Porcentaje de asistencia debe estar entre 0 y 100");
    }
    if (!isValidScore(formData.minAverageScore)) {
      errors.push("Calificación mínima debe estar entre 0 y 5");
    }

    return errors;
  };

  const validateEditForm = () => {
    const errors = [];

    if (editFormData.startDate && editFormData.endDate) {
      if (!validateDates(editFormData.startDate, editFormData.endDate)) {
        errors.push("Fecha de inicio debe ser anterior a fecha de fin");
      }
    }
    if (
      editFormData.maxStudents &&
      !isValidMaxStudents(editFormData.maxStudents)
    ) {
      errors.push("Máximo de estudiantes debe estar entre 1 y 500");
    }
    if (
      editFormData.minAttendancePercentage !== "" &&
      !isValidPercentage(editFormData.minAttendancePercentage)
    ) {
      errors.push("Porcentaje de asistencia debe estar entre 0 y 100");
    }
    if (
      editFormData.minAverageScore !== "" &&
      !isValidScore(editFormData.minAverageScore)
    ) {
      errors.push("Calificación mínima debe estar entre 0 y 5");
    }

    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setError("");

      const validationErrors = validateForm();
      if (validationErrors.length > 0) {
        setError(validationErrors.join(". "));
        return;
      }

      const enrollmentData = {
        level: formData.level, // ✅ Enviamos solo el código del nivel
        startDate: formData.startDate,
        endDate: formData.endDate,
        maxStudents: parseInt(formData.maxStudents),
        minAttendancePercentage: parseFloat(formData.minAttendancePercentage),
        minAverageScore: parseFloat(formData.minAverageScore),
        // CAMBIO v5: envía { id: <lider_id> }
        teacher: formData.teacher ? { id: formData.teacher.id } : null,
      };

      log("Creando cohorte", enrollmentData);

      const response = await apiService.createEnrollment(enrollmentData);

      logSecurityEvent("enrollment_created", {
        level: formData.level,
        cohortId: response?.cohortId,
        timestamp: new Date().toISOString(),
      });

      alert("✅ Cohorte creada exitosamente");

      setShowForm(false);
      resetForm();

      await fetchEnrollments();
    } catch (err) {
      handleError("CREATE_ENROLLMENT", "handleSubmit");
      logError("Error creando cohorte:", err);

      // Mostrar mensaje de error más específico
      const errorMsg =
        err.response?.data?.message || err.message || "Error desconocido";
      alert(`❌ Error al crear la cohorte: ${errorMsg}`);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();

    try {
      setError("");

      const validationErrors = validateEditForm();
      if (validationErrors.length > 0) {
        setError(validationErrors.join(". "));
        return;
      }

      const updateData = {};

      if (editFormData.cohortName && editFormData.cohortName.trim() !== "") {
        updateData.cohortName = editFormData.cohortName.trim();
      }
      if (editFormData.startDate) {
        updateData.startDate = editFormData.startDate; // "2026-03-31" → LocalDate ✅
      }
      if (editFormData.endDate) {
        updateData.endDate = editFormData.endDate;
      }
      if (editFormData.maxStudents) {
        updateData.maxStudents = parseInt(editFormData.maxStudents);
      }
      if (editFormData.minAttendancePercentage !== "") {
        updateData.minAttendancePercentage = parseFloat(
          editFormData.minAttendancePercentage,
        );
      }
      if (editFormData.minAverageScore !== "") {
        updateData.minAverageScore = parseFloat(editFormData.minAverageScore);
      }
      // CAMBIO v5: envía { id: <lider_id> }
      if (
        editFormData.teacher?.id &&
        typeof editFormData.teacher.id === "number"
      ) {
        updateData.teacher = { id: editFormData.teacher.id };
      }

      if (Object.keys(updateData).length === 0) {
        setError("Debes hacer al menos un cambio");
        return;
      }

      log("Editando cohorte", {
        enrollmentId: selectedEnrollment.id,
        updateData,
      });

      await apiService.editEnrollment(selectedEnrollment.id, updateData);

      logSecurityEvent("enrollment_edited", {
        enrollmentId: selectedEnrollment.id,
        timestamp: new Date().toISOString(),
      });

      handleCloseEditModal();
      fetchEnrollments();
      handleCloseEnrollmentModal();
    } catch (err) {
      handleError("EDIT_ENROLLMENT", "handleEditSubmit");
      logError("Error editando cohorte:", err);
    }
  };

  const resetForm = () => {
    setFormData({
      level: allowedLevels[0]?.code ?? "",
      startDate: "",
      endDate: "",
      maxStudents: 30,
      minAttendancePercentage: 80,
      minAverageScore: 3.0,
      teacher: null,
    });
    setTeacherSearchTerm("");
    setFilteredTeachers([]);
    setError("");
  };

  const getLevelLabel = (levelCode) => {
    if (!levelCode) return "—";
    const level = levels.find((l) => l.code === levelCode);
    return level?.displayName || levelCode;
  };

  const getStatusLabel = (statusValue) => {
    if (!statusValue) return "—";
    return STATUSES.find((s) => s.value === statusValue)?.label || statusValue;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "ACTIVE":
        return "status-active";
      case "SUSPENDED":
        return "status-inactive";
      case "PENDING":
        return "status-paused";
      case "COMPLETED":
        return "status-completed";
      case "CANCELLED":
        return "status-cancelled";
      default:
        return "bg-gray-100";
    }
  };

  if (levelsLoading) {
    return <div className="loading-container">Cargando niveles...</div>;
  }

  return (
    <div className="enrollments-page">
      <div className="page-container">
        <div className="page-header">
          <h1>📋 Gestión de Cohortes</h1>
          <p>Crea y gestiona cohortes de formación</p>
        </div>

        {error && (
          <div className="alert alert-danger" role="alert">
            <strong>⚠️ Error:</strong> {error}
          </div>
        )}

        <div className="button-group">
          <button
            onClick={() => setShowForm(!showForm)}
            className="btn-primary"
          >
            {showForm ? "✖️ Cerrar" : "➕ Nueva Cohorte"}
          </button>
        </div>

        {showForm && (
          <div className="form-section animate-slide-in-up">
            <h2>Crear Nueva Cohorte</h2>
            <form onSubmit={handleSubmit} className="form-grid">
              <div className="form-field">
                <label>Nivel *</label>
                <select
                  name="level"
                  value={formData.level}
                  onChange={(e) =>
                    setFormData({ ...formData, level: e.target.value })
                  }
                  required
                >
                  {allowedLevels.map((level) => (
                    <option key={level.code} value={level.code}>
                      {level.displayName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-field">
                <label>Fecha Inicio *</label>
                <input
                  type="date"
                  name="startDate"
                  value={formData.startDate}
                  onChange={(e) =>
                    setFormData({ ...formData, startDate: e.target.value })
                  }
                  required
                />
              </div>

              <div className="form-field">
                <label>Fecha Fin *</label>
                <input
                  type="date"
                  name="endDate"
                  value={formData.endDate}
                  onChange={(e) =>
                    setFormData({ ...formData, endDate: e.target.value })
                  }
                  required
                />
              </div>

              <div className="form-field form-field-full">
                <label>Maestro / Profesor *</label>
                <div className="teacher-search-container">
                  <input
                    type="text"
                    placeholder="Busca un maestro por nombre..."
                    value={teacherSearchTerm}
                    onChange={(e) => handleTeacherSearch(e.target.value)}
                    onFocus={() =>
                      teacherSearchTerm && setShowTeacherDropdown(true)
                    }
                    className="teacher-search-input"
                    maxLength="100"
                    required={!formData.teacher}
                  />

                  {formData.teacher && (
                    <button
                      type="button"
                      onClick={handleClearTeacher}
                      className="teacher-clear-btn"
                      title="Limpiar selección"
                    >
                      ✕
                    </button>
                  )}

                  {showTeacherDropdown && filteredTeachers.length > 0 && (
                    <div className="teacher-dropdown">
                      {/* CAMBIO v5: muestra leader.member.name */}
                      {filteredTeachers.map((teacher) => (
                        <button
                          key={teacher.id}
                          type="button"
                          onClick={() => handleSelectTeacher(teacher)}
                          className="teacher-option"
                        >
                          <div className="teacher-name">
                            {/* CAMBIO v5b: usa helper para ambas formas */}
                            {getDisplayName(getTeacherName(teacher))}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* CAMBIO v5: usa helper para nombre del líder seleccionado */}
                  {formData.teacher && (
                    <div className="teacher-selected">
                      <p className="teacher-selected-name">
                        ✅ {getDisplayName(getTeacherName(formData.teacher))}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="form-field">
                <label>Máx. Estudiantes *</label>
                <input
                  type="number"
                  name="maxStudents"
                  value={formData.maxStudents}
                  onChange={(e) =>
                    setFormData({ ...formData, maxStudents: e.target.value })
                  }
                  min="1"
                  max="500"
                  required
                />
              </div>

              <div className="form-field">
                <label>% Asistencia *</label>
                <input
                  type="number"
                  name="minAttendancePercentage"
                  value={formData.minAttendancePercentage}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      minAttendancePercentage: e.target.value,
                    })
                  }
                  min="0"
                  max="100"
                  step="0.1"
                  required
                />
              </div>

              <div className="form-field">
                <label>Calificación Min. *</label>
                <input
                  type="number"
                  name="minAverageScore"
                  value={formData.minAverageScore}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      minAverageScore: e.target.value,
                    })
                  }
                  min="0"
                  max="5"
                  step="0.1"
                  required
                />
              </div>

              <button type="submit" className="btn-primary form-field-full">
                ✅ Crear Cohorte
              </button>
            </form>
          </div>
        )}

        <div className="filters-section">
          <div className="filter-group">
            <label>📌 Filtrar por Nivel</label>
            <select
              value={filterLevel}
              onChange={(e) => handleFilterChange("level", e.target.value)}
            >
              <option value="">Todos los niveles</option>
              {allowedLevels.map((level) => (
                <option key={level.code} value={level.code}>
                  {level.displayName}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>⚡ Filtrar por Estado</label>
            <select
              value={filterStatus}
              onChange={(e) => handleFilterChange("status", e.target.value)}
            >
              <option value="">Todos los estados</option>
              {STATUSES.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => {
              setFilterLevel("");
              setFilterStatus("");
              applyFilters(enrollments, "", "");
            }}
            className="btn-secondary"
          >
            🔄 Limpiar Filtros
          </button>
        </div>

        <p className="filter-info">
          Mostrando <strong>{filteredEnrollments.length}</strong> de{" "}
          <strong>{enrollments.length}</strong> cohortes
        </p>

        <div className="enrollments-grid">
          {loading ? (
            <p className="loading-message">Cargando cohortes...</p>
          ) : filteredEnrollments.length === 0 ? (
            <div className="empty-message">
              <p>No hay cohortes que coincidan</p>
              <p>Intenta cambiar los filtros</p>
            </div>
          ) : (
            filteredEnrollments.map((enrollment) => (
              <div
                key={enrollment.id}
                className="enrollment-card"
                onClick={() => handleOpenEnrollmentModal(enrollment)}
                role="button"
                tabIndex={0}
              >
                <div className="card-header">
                  <h3>
                    {escapeHtml(
                      enrollment.cohortName ||
                        getLevelLabel(enrollment.levelCode),
                    )}
                  </h3>
                  <span
                    className={`status-badge ${getStatusColor(enrollment.status)}`}
                  >
                    {getStatusLabel(enrollment.status)}
                  </span>
                </div>
                <div className="card-body">
                  <p>
                    <strong>Nivel:</strong>{" "}
                    {getLevelLabel(enrollment.levelCode)}
                  </p>
                  <p>
                    <strong>Inicio:</strong>{" "}
                    {formatLocalDate(enrollment.startDate)}
                  </p>
                  <p>
                    <strong>Fin:</strong> {formatLocalDate(enrollment.endDate)}
                  </p>
                  <p>
                    <strong>Estudiantes:</strong>{" "}
                    {enrollment.studentEnrollments?.filter(
                      (se) => se.status !== "CANCELLED",
                    ).length || 0}{" "}
                    / {enrollment.maxStudents} cupos
                  </p>
                  {/* CAMBIO v5: usa helper para obtener nombre desde Leader */}
                  {getTeacherName(enrollment.teacher) && (
                    <p>
                      <strong>👨‍🏫 Maestro:</strong>{" "}
                      {getDisplayName(getTeacherName(enrollment.teacher))}
                    </p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {showEnrollmentModal && selectedEnrollment && (
        <div className="modal-overlay" onClick={handleCloseEnrollmentModal}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                {escapeHtml(
                  selectedEnrollment.cohortName ||
                    getLevelLabel(selectedEnrollment.levelCode),
                )}
              </h2>
              <button
                className="modal-close-btn"
                onClick={handleCloseEnrollmentModal}
              >
                ✕
              </button>
            </div>

            <div className="modal-tabs">
              <button
                className={`tab-btn ${activeTab === "details" ? "active" : ""}`}
                onClick={() => setActiveTab("details")}
              >
                📋 Detalles
              </button>
              <button
                className={`tab-btn ${activeTab === "lessons" ? "active" : ""}`}
                onClick={() => setActiveTab("lessons")}
              >
                📚 Lecciones
              </button>
              <button
                className={`tab-btn ${activeTab === "students" ? "active" : ""}`}
                onClick={() => setActiveTab("students")}
              >
                👥 Estudiantes
              </button>
              <button
                className={`tab-btn ${activeTab === "attendance" ? "active" : ""}`}
                onClick={() => setActiveTab("attendance")}
              >
                ✅ Asistencias
              </button>
            </div>

            <div className="modal-body">
              {activeTab === "details" && (
                <div className="tab-content">
                  <div className="details-grid">
                    <div>
                      <p className="detail-label">Nivel</p>
                      <p className="detail-value">
                        {getLevelLabel(selectedEnrollment.levelCode)}
                      </p>
                    </div>
                    <div>
                      <p className="detail-label">Estado</p>
                      <p className="detail-value">
                        <span
                          className={`status-badge ${getStatusColor(selectedEnrollment.status)}`}
                        >
                          {getStatusLabel(selectedEnrollment.status)}
                        </span>
                      </p>
                    </div>
                    {/* CAMBIO v5: usa helper para obtener nombre desde Leader */}
                    {getTeacherName(selectedEnrollment.teacher) && (
                      <div>
                        <p className="detail-label">👨‍🏫 Maestro</p>
                        <p className="detail-value">
                          {getDisplayName(
                            getTeacherName(selectedEnrollment.teacher),
                          )}
                        </p>
                      </div>
                    )}
                    <div>
                      <p className="detail-label">Inicio</p>
                      <p className="detail-value">
                        {formatLocalDate(selectedEnrollment.startDate)}
                      </p>
                    </div>
                    <div>
                      <p className="detail-label">Fin</p>
                      <p className="detail-value">
                        {formatLocalDate(selectedEnrollment.endDate)}
                      </p>
                    </div>
                    <div>
                      <p className="detail-label">Duración</p>
                      <p className="detail-value">
                        {Math.ceil(
                          (parseLocalDate(selectedEnrollment.endDate) -
                            parseLocalDate(selectedEnrollment.startDate)) /
                            (1000 * 60 * 60 * 24),
                        )}{" "}
                        días
                      </p>
                    </div>
                    <div>
                      <p className="detail-label">Máx. Estudiantes</p>
                      <p className="detail-value">
                        {selectedEnrollment.maxStudents}
                      </p>
                    </div>
                    <div>
                      <p className="detail-label">Estudiantes Inscritos</p>
                      <p className="detail-value">
                        <strong>
                          {selectedEnrollment.studentEnrollments?.filter(
                            (se) => se.status !== "CANCELLED",
                          ).length || 0}
                        </strong>{" "}
                        de {selectedEnrollment.maxStudents}
                        <span
                          style={{
                            marginLeft: "8px",
                            fontSize: "0.9rem",
                            color:
                              (selectedEnrollment.studentEnrollments?.filter(
                                (se) => se.status !== "CANCELLED",
                              ).length || 0) >= selectedEnrollment.maxStudents
                                ? "#e67e22"
                                : "#10b981",
                          }}
                        >
                          (
                          {Math.round(
                            ((selectedEnrollment.studentEnrollments?.filter(
                              (se) => se.status !== "CANCELLED",
                            ).length || 0) /
                              selectedEnrollment.maxStudents) *
                              100,
                          )}
                          %)
                        </span>
                      </p>
                    </div>
                    <div>
                      <p className="detail-label">% Asistencia Min.</p>
                      <p className="detail-value">
                        {selectedEnrollment.minAttendancePercentage
                          ? (selectedEnrollment.minAttendancePercentage * 100) /
                            100
                          : 0}
                        %
                      </p>
                    </div>
                    <div>
                      <p className="detail-label">Calificación Min.</p>
                      <p className="detail-value">
                        {(selectedEnrollment.minAverageScore || 0).toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <div className="actions-section">
                    <h3>🎯 Cambiar Estado</h3>
                    <div className="actions-grid">
                      {selectedEnrollment.status !== "ACTIVE" && (
                        <button
                          onClick={() =>
                            handleStatusChange(selectedEnrollment.id, "ACTIVE")
                          }
                          className="action-btn btn-success"
                        >
                          ▶️ Activar
                        </button>
                      )}
                      {selectedEnrollment.status !== "SUSPENDED" && (
                        <button
                          onClick={() =>
                            handleStatusChange(
                              selectedEnrollment.id,
                              "SUSPENDED",
                            )
                          }
                          className="action-btn btn-warning"
                        >
                          ⏸️ Pausar
                        </button>
                      )}
                      {selectedEnrollment.status !== "COMPLETED" && (
                        <button
                          onClick={() =>
                            handleStatusChange(
                              selectedEnrollment.id,
                              "COMPLETED",
                            )
                          }
                          className="action-btn btn-info"
                        >
                          ✅ Completar
                        </button>
                      )}
                      {selectedEnrollment.status !== "CANCELLED" && (
                        <button
                          onClick={() =>
                            handleStatusChange(
                              selectedEnrollment.id,
                              "CANCELLED",
                            )
                          }
                          className="action-btn btn-danger"
                        >
                          ❌ Cancelar
                        </button>
                      )}
                    </div>
                  </div>

                  <div
                    style={{
                      marginTop: "20px",
                      paddingTop: "20px",
                      borderTop: "1px solid #e5e7eb",
                      display: "flex",
                      flexDirection: "column",
                      gap: "10px",
                    }}
                  >
                    <button
                      onClick={handleOpenEditModal}
                      className="action-btn btn-warning"
                      style={{ width: "100%" }}
                    >
                      ✏️ Editar Cohorte
                    </button>
                    <button
                      onClick={exportCohortPDF}
                      disabled={exportingPDF}
                      style={{
                        width: "100%",
                        padding: "10px 16px",
                        borderRadius: "6px",
                        border: "none",
                        fontWeight: 700,
                        fontSize: "14px",
                        cursor: exportingPDF ? "not-allowed" : "pointer",
                        background: exportingPDF
                          ? "#93c5fd"
                          : "linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)",
                        color: "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "8px",
                        transition: "opacity 0.2s",
                        opacity: exportingPDF ? 0.7 : 1,
                      }}
                    >
                      {exportingPDF ? (
                        <>
                          <span
                            style={{
                              display: "inline-block",
                              animation: "spin 1s linear infinite",
                            }}
                          >
                            ⏳
                          </span>
                          Preparando informe...
                        </>
                      ) : (
                        <>📄 Exportar PDF de Cohorte</>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {activeTab === "lessons" && (
                <div className="tab-content">
                  <div className="tab-actions">
                    <button
                      onClick={handleCreateLesson}
                      className="btn-primary"
                    >
                      ➕ Nueva Lección
                    </button>
                  </div>

                  {lessons.length === 0 ? (
                    <p className="empty-message">No hay lecciones creadas</p>
                  ) : (
                    <div className="lessons-list">
                      {lessons.map((lesson) => (
                        <div key={lesson.id} className="lesson-item">
                          <div className="lesson-header">
                            <h4>
                              📖 {lesson.lessonNumber}. {lesson.lessonName}
                            </h4>
                            {lesson.isMandatory && (
                              <span className="badge-mandatory">
                                🔴 Obligatoria
                              </span>
                            )}
                          </div>
                          <div className="lesson-info">
                            <p>📅 {formatLocalDate(lesson.lessonDate)}</p>
                            <p>⏱️ {lesson.durationMinutes} min</p>
                            <p>✅ {lesson.attendanceCount || 0} asistencias</p>
                          </div>
                          {lesson.description && (
                            <p className="lesson-description">
                              {lesson.description}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === "students" && (
                <div className="tab-content">
                  {students.length === 0 ? (
                    <p className="empty-message">
                      No hay estudiantes inscritos
                    </p>
                  ) : (
                    <div className="students-list">
                      {students.map((student) => (
                        <div key={student.id} className="student-item">
                          <div className="student-header">
                            <h4>
                              👤{" "}
                              {escapeHtml(
                                student.memberName ||
                                  `Estudiante ${student.memberId}`,
                              )}
                            </h4>
                            <span
                              className={`status-badge ${getStatusColor(student.status)}`}
                            >
                              {getStatusLabel(student.status)}
                            </span>
                          </div>
                          <div className="student-info">
                            <p>
                              📅 Inscrito:{" "}
                              {formatLocalDate(student.enrollmentDate)}
                            </p>
                            {student.finalAttendancePercentage !== undefined &&
                              student.finalAttendancePercentage !== null && (
                                <p>
                                  📊 Asistencia:{" "}
                                  {student.finalAttendancePercentage.toFixed(1)}
                                  %
                                </p>
                              )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === "attendance" && (
                <div className="tab-content">
                  <div className="tab-actions">
                    <div
                      className="tab-actions"
                      style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}
                    >
                      <button
                        onClick={handleRecordAttendance}
                        className="btn-primary"
                      >
                        ➕ Registrar Asistencia
                      </button>
                      <button
                        onClick={handlePrintCohortAttendance}
                        disabled={exportingPDF}
                        style={{
                          padding: "8px 16px",
                          borderRadius: "6px",
                          border: "none",
                          fontWeight: 700,
                          fontSize: "14px",
                          cursor: exportingPDF ? "not-allowed" : "pointer",
                          background: exportingPDF
                            ? "#93c5fd"
                            : "linear-gradient(135deg, #065f46 0%, #10b981 100%)",
                          color: "#fff",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          opacity: exportingPDF ? 0.7 : 1,
                        }}
                      >
                        {exportingPDF ? (
                          <>
                            <span
                              style={{
                                display: "inline-block",
                                animation: "spin 1s linear infinite",
                              }}
                            >
                              ⏳
                            </span>
                            Preparando reporte...
                          </>
                        ) : (
                          <>🖨️ Asistencias Generales</>
                        )}
                      </button>
                    </div>
                  </div>

                  {attendanceSummary.length === 0 ? (
                    <p className="empty-message">
                      No hay lecciones disponibles
                    </p>
                  ) : (
                    <div className="attendance-summary">
                      {attendanceSummary.map((lesson) => (
                        <div
                          key={lesson.id}
                          className="attendance-item clickable"
                          onClick={() =>
                            handleOpenLessonAttendanceDetail(lesson)
                          }
                          role="button"
                          tabIndex={0}
                          title="Click para ver detalles"
                        >
                          <div className="attendance-header">
                            <h4>
                              📖 {lesson.lessonNumber}. {lesson.lessonName}
                            </h4>
                            <span className="view-details-badge">
                              👁️ Ver detalles
                            </span>
                          </div>
                          <div className="attendance-info">
                            <p>📅 {formatLocalDate(lesson.lessonDate)}</p>
                            <p>✅ {lesson.attendanceCount || 0} registros</p>
                            {/* Botón de Impresión con los datos que pediste */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePrintLessonAttendance(lesson);
                              }}
                              className="btn-print-mini"
                              style={{
                                marginTop: "10px",
                                padding: "5px 10px",
                                fontSize: "12px",
                                backgroundColor: "#1e40af",
                                color: "white",
                                border: "none",
                                borderRadius: "4px",
                                cursor: "pointer",
                              }}
                            >
                              🖨️ Generar Informe de Gestión
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
        </div>
      )}

      {showEditModal && selectedEnrollment && (
        <div className="modal-overlay" onClick={handleCloseEditModal}>
          <div
            className="modal-container"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "600px" }}
          >
            <div className="modal-header">
              <h2>✏️ Editar Cohorte</h2>
              <button
                className="modal-close-btn"
                onClick={handleCloseEditModal}
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              {error && (
                <div className="alert alert-danger" role="alert">
                  <strong>⚠️ Error:</strong> {error}
                </div>
              )}

              <form onSubmit={handleEditSubmit} className="form-grid">
                <div className="form-field form-field-full">
                  <label>Nombre de Cohorte</label>
                  <input
                    type="text"
                    value={editFormData.cohortName}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        cohortName: e.target.value,
                      })
                    }
                    placeholder="Dejar en blanco para no cambiar"
                    maxLength="100"
                  />
                </div>

                <div className="form-field">
                  <label>Fecha Inicio</label>
                  <input
                    type="date"
                    value={editFormData.startDate}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        startDate: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="form-field">
                  <label>Fecha Fin</label>
                  <input
                    type="date"
                    value={editFormData.endDate}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        endDate: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="form-field form-field-full">
                  <label>Maestro / Profesor</label>
                  <div className="teacher-search-container">
                    <input
                      type="text"
                      placeholder="Busca un maestro por nombre..."
                      value={editTeacherSearchTerm}
                      onChange={(e) => handleEditTeacherSearch(e.target.value)}
                      onFocus={() =>
                        editTeacherSearchTerm &&
                        setEditShowTeacherDropdown(true)
                      }
                      className="teacher-search-input"
                      maxLength="100"
                    />

                    {editFormData.teacher && (
                      <button
                        type="button"
                        onClick={handleEditClearTeacher}
                        className="teacher-clear-btn"
                        title="Limpiar selección"
                      >
                        ✕
                      </button>
                    )}

                    {editShowTeacherDropdown &&
                      editFilteredTeachers.length > 0 && (
                        <div className="teacher-dropdown">
                          {/* CAMBIO v5: muestra leader.member.name */}
                          {editFilteredTeachers.map((teacher) => (
                            <button
                              key={teacher.id}
                              type="button"
                              onClick={() => handleEditSelectTeacher(teacher)}
                              className="teacher-option"
                            >
                              <div className="teacher-name">
                                {/* CAMBIO v5b: usa helper para ambas formas */}
                                {getDisplayName(getTeacherName(teacher))}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}

                    {/* CAMBIO v5: usa helper para nombre del líder seleccionado */}
                    {editFormData.teacher && (
                      <div className="teacher-selected">
                        <p className="teacher-selected-name">
                          ✅{" "}
                          {getDisplayName(getTeacherName(editFormData.teacher))}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="form-field">
                  <label>Máx. Estudiantes</label>
                  <input
                    type="number"
                    value={editFormData.maxStudents}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        maxStudents: e.target.value,
                      })
                    }
                    min="1"
                    max="500"
                  />
                </div>

                <div className="form-field">
                  <label>% Asistencia Mín.</label>
                  <input
                    type="number"
                    value={editFormData.minAttendancePercentage}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        minAttendancePercentage: e.target.value,
                      })
                    }
                    min="0"
                    max="100"
                    step="0.1"
                  />
                </div>

                <div className="form-field">
                  <label>Calificación Mín.</label>
                  <input
                    type="number"
                    value={editFormData.minAverageScore}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        minAverageScore: e.target.value,
                      })
                    }
                    min="0"
                    max="5"
                    step="0.1"
                  />
                </div>

                <div
                  style={{
                    gridColumn: "1 / -1",
                    display: "flex",
                    gap: "10px",
                    marginTop: "10px",
                  }}
                >
                  <button
                    type="submit"
                    className="btn-primary"
                    style={{ flex: 1 }}
                  >
                    ✅ Guardar Cambios
                  </button>
                  <button
                    type="button"
                    onClick={handleCloseEditModal}
                    className="btn-secondary"
                    style={{ flex: 1 }}
                  >
                    ❌ Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {selectedLesson && selectedEnrollment && (
        <ModalLessonAttendanceDetail
          isOpen={showLessonAttendanceDetailModal}
          onClose={handleCloseLessonAttendanceDetail}
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

      <style>{`
        .alert {
          padding: 12px 16px;
          margin-bottom: 20px;
          border-radius: 4px;
          border: 1px solid;
        }
        .alert-danger {
          background-color: #fee;
          border-color: #fcc;
          color: #c00;
        }
        .form-field-full {
          grid-column: 1 / -1;
        }
        .teacher-search-container {
          position: relative;
        }
        .teacher-search-input {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid #ccc;
          border-radius: 4px;
          font-size: 14px;
        }
        .teacher-search-input:focus {
          outline: none;
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }
        .teacher-clear-btn {
          position: absolute;
          right: 8px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: #999;
          cursor: pointer;
          font-size: 18px;
          padding: 4px 8px;
        }
        .teacher-dropdown {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          background: white;
          border: 1px solid #ccc;
          border-top: none;
          border-radius: 0 0 4px 4px;
          max-height: 200px;
          overflow-y: auto;
          z-index: 10;
        }
        .teacher-option {
          width: 100%;
          padding: 8px 12px;
          text-align: left;
          border: none;
          background: none;
          cursor: pointer;
          border-bottom: 1px solid #eee;
        }
        .teacher-option:hover {
          background-color: #f3f4f6;
        }
        .teacher-name {
          font-weight: 500;
          color: #333;
        }
        .teacher-selected {
          margin-top: 8px;
          padding: 8px 12px;
          background-color: #dbeafe;
          border: 1px solid #93c5fd;
          border-radius: 4px;
        }
        .teacher-selected-name {
          color: #1e40af;
          font-weight: 500;
          margin: 0;
        }
        .attendance-item.clickable {
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .attendance-item.clickable:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 16px rgba(37, 99, 235, 0.15);
        }
        .view-details-badge {
          display: inline-block;
          background: linear-gradient(135deg, #2563eb 0%, #10b981 100%);
          color: white;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 600;
        }
        .loading-container {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 300px;
          font-size: 1.2rem;
          color: #666;
        }

        @keyframes spin {
        from { transform: rotate(0deg); }
        to   { transform: rotate(360deg); }
        }

      `}</style>
    </div>
  );
};

export default EnrollmentsPage;
