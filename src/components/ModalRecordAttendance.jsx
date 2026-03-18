// ✅ ModalRecordAttendance.jsx - v4 Full
// Header compacto con gradiente + stats bar + wizard 2 pasos
// Dark mode nativo · Mobile-first REAL (pantalla completa, campos táctiles)
// Plus Jakarta Sans · Sin compresión de código

import React, { useState, useEffect, useCallback } from "react";
import apiService from "../apiService";

// ─────────────────────────────────────────────
// Constantes
// ─────────────────────────────────────────────
const PARTICIPATION_SCORES = [
  {
    value: "NO_PARTICIPA",
    label: "No participa",
    emoji: "🤐",
    colorActive: "#f87171",
    bgActive: "rgba(239,68,68,.12)",
    borderActive: "rgba(239,68,68,.35)",
  },
  {
    value: "POCA_PARTICIPACION",
    label: "Poca partic.",
    emoji: "👌",
    colorActive: "#fbbf24",
    bgActive: "rgba(245,158,11,.12)",
    borderActive: "rgba(245,158,11,.35)",
  },
  {
    value: "EXCELENTE_PARTICIPACION",
    label: "Excelente",
    emoji: "🌟",
    colorActive: "#34d399",
    bgActive: "rgba(16,185,129,.12)",
    borderActive: "rgba(16,185,129,.35)",
  },
];

// ─────────────────────────────────────────────
// Hook: detectar si es móvil (< 640px)
// ─────────────────────────────────────────────
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < 640 : false,
  );

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const handler = (e) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return isMobile;
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
function parseJwt(token) {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join(""),
    );
    return JSON.parse(jsonPayload);
  } catch (err) {
    throw new Error("Token inválido");
  }
}

// ─────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────
const ModalRecordAttendance = ({
  isOpen,
  onClose,
  enrollmentId,
  onAttendanceRecorded,
  // Props opcionales del encabezado (vienen del componente padre)
  lessonTitle = "",
  lessonDate = "",
  cohortName = "",
  statsPresent = null,
  statsTotal = null,
}) => {
  const isMobile = useIsMobile();

  // ── Estado del formulario ──
  const [lessons, setLessons] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedLesson, setSelectedLesson] = useState("");
  const [selectedStudent, setSelectedStudent] = useState("");
  const [recordedBy, setRecordedBy] = useState("");
  const [present, setPresent] = useState(true);
  const [score, setScore] = useState("POCA_PARTICIPACION");

  // ── Estado UI ──
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [step, setStep] = useState(1);
  const [touched, setTouched] = useState({});

  // ─────────────────────────────────────────────
  // Obtener usuario autenticado desde storage/JWT
  // ─────────────────────────────────────────────
  const getUserAuthenticated = useCallback(() => {
    try {
      // 1. Intentar desde localStorage "user"
      const userData = localStorage.getItem("user");
      if (userData) {
        const user = JSON.parse(userData);
        return user.name || user.username || user.email || "Usuario";
      }

      // 2. Intentar desde sessionStorage "currentUser"
      const sessionUser = sessionStorage.getItem("currentUser");
      if (sessionUser) {
        const user = JSON.parse(sessionUser);
        return user.name || user.username || user.email || "Usuario";
      }

      // 3. Intentar desde JWT token
      const token = localStorage.getItem("token");
      if (token) {
        try {
          const decoded = parseJwt(token);
          return decoded.sub || decoded.username || decoded.name || "Usuario";
        } catch (jwtErr) {
          console.warn(
            "⚠️ No se pudo decodificar el token JWT:",
            jwtErr.message,
          );
        }
      }

      return "Usuario";
    } catch (err) {
      console.error("❌ Error obteniendo usuario autenticado:", err);
      return "Usuario";
    }
  }, []);

  // ─────────────────────────────────────────────
  // Cargar lecciones y estudiantes de la API
  // ─────────────────────────────────────────────
  // En ModalRecordAttendance.jsx, en la función loadData:

// En ModalRecordAttendance.jsx - Reemplaza la función loadData

// En ModalRecordAttendance.jsx - Reemplaza la función loadData

// Alternativa: Obtener estudiantes desde el enrollment

// En ModalRecordAttendance.jsx - Reemplaza la función loadData

const loadData = useCallback(async () => {
  setLoadingData(true);
  setError("");

  try {
    const [lessonsData, enrollmentData] = await Promise.all([
      apiService.getLessonsByEnrollment(enrollmentId),
      apiService.getEnrollmentById(enrollmentId),
    ]);

    setLessons(lessonsData || []);

    // ── LOGS TEMPORALES ──
    console.log("📦 enrollmentData completo:", JSON.stringify(enrollmentData?.studentEnrollments?.slice(0, 2)));
    console.log("📊 Total estudiantes:", enrollmentData?.studentEnrollments?.length);
    console.log("🚫 Cancelados:", enrollmentData?.studentEnrollments?.filter(s => s.status === "CANCELLED").length);
    console.log("✅ Activos:", enrollmentData?.studentEnrollments?.filter(s => s.status !== "CANCELLED").length);
    // ── FIN LOGS ──

    const allStudents = enrollmentData?.studentEnrollments || [];
    const activeStudents = allStudents.filter(s => s.status !== "CANCELLED");
    setStudents(activeStudents);

  } catch (err) {
    console.error("❌ Error cargando datos:", err);
    setError(err.message || "Error al cargar los datos");
  } finally {
    setLoadingData(false);
  }
}, [enrollmentId]);


  // ─────────────────────────────────────────────
  // Effects
  // ─────────────────────────────────────────────

  // Cargar nombre del usuario al montar
  useEffect(() => {
    const userName = getUserAuthenticated();
    setRecordedBy(userName);
  }, [getUserAuthenticated]);

  // Cargar datos cuando el modal se abre
  useEffect(() => {
    if (isOpen && enrollmentId) {
      loadData();
      setStep(1);
    }
  }, [isOpen, enrollmentId, loadData]);

  // Bloquear scroll del body cuando el modal está abierto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // ─────────────────────────────────────────────
  // Handlers
  // ─────────────────────────────────────────────
  const resetForm = () => {
    setSelectedLesson("");
    setSelectedStudent("");
    setRecordedBy(getUserAuthenticated());
    setPresent(true);
    setScore("POCA_PARTICIPACION");
    setError("");
    setSuccessMessage("");
    setStep(1);
    setTouched({});
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleGoToStep2 = () => {
    const newTouched = { lesson: true, student: true };
    setTouched(newTouched);
    if (!selectedLesson || !selectedStudent) return;
    setStep(2);
    setError("");
  };

  const handleGoToStep1 = () => {
    setStep(1);
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    // Validación final
    const newTouched = { lesson: true, student: true, recordedBy: true };
    setTouched(newTouched);

    if (!selectedLesson) {
      setError("Selecciona una lección antes de continuar.");
      return;
    }
    if (!selectedStudent) {
      setError("Selecciona un estudiante antes de continuar.");
      return;
    }
    if (!recordedBy?.trim()) {
      setError("Ingresa el nombre de quien registra la asistencia.");
      return;
    }

    setLoading(true);

    try {
      const attendanceData = {
        studentEnrollmentId: parseInt(selectedStudent),
        lessonId: parseInt(selectedLesson),
        present: present,
        recordedBy: recordedBy.trim(),
        score: score,
      };

      await apiService.recordAttendance(attendanceData);
      setSuccessMessage("¡Asistencia registrada correctamente!");

      // Después de 2 segundos, resetear y recargar
      setTimeout(() => {
        resetForm();
        if (onAttendanceRecorded) {
          onAttendanceRecorded();
        }
        loadData();
      }, 2000);
    } catch (err) {
      console.error("❌ Error al registrar asistencia:", err);

      const errorMsg = err.message || "";

      if (errorMsg.includes("409")) {
        setError(
          "Esta asistencia ya existe. Puedes actualizarla desde la vista de asistencias.",
        );
      } else if (errorMsg.includes("400")) {
        setError(
          "Los datos enviados no son válidos. Verifica que todos los campos sean correctos.",
        );
      } else if (errorMsg.includes("404")) {
        setError(
          "La lección o el estudiante no fueron encontrados. Recarga la página e intenta de nuevo.",
        );
      } else if (errorMsg.includes("500")) {
        setError(
          "Error interno del servidor. Contacta al administrador del sistema.",
        );
      } else {
        setError(
          errorMsg ||
            "Ocurrió un error al registrar la asistencia. Intenta de nuevo.",
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────
  // Datos derivados
  // ─────────────────────────────────────────────
  if (!isOpen) return null;

  const statsPercentage =
    statsTotal && statsPresent !== null
      ? Math.round((statsPresent / statsTotal) * 100)
      : null;

  const selectedLessonObj = lessons.find(
    (l) => String(l.id) === String(selectedLesson),
  );

  const selectedStudentObj = students.find(
    (s) => String(s.id) === String(selectedStudent),
  );

  // Campos táctiles más grandes en móvil
  const fieldFontSize = isMobile ? "14px" : "12px";
  const labelFontSize = isMobile ? "11px" : "10px";
  const btnPadding = isMobile ? "14px" : "10px";
  const btnFontSize = isMobile ? "15px" : "13px";
  const bodyPadding = isMobile ? "14px 14px 32px" : "11px 15px 20px";
  const bodyGap = isMobile ? "15px" : "10px";

  // ─────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────
  return (
    <>
      {/* ── Estilos globales del modal ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

        /* ── Overlay ── */
        .mra-overlay {
          position: fixed;
          inset: 0;
          z-index: 9999;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          background: rgba(0, 0, 0, 0.70);
          backdrop-filter: blur(5px);
          -webkit-backdrop-filter: blur(5px);
          animation: mra-fade-in 0.22s ease forwards;
        }

        /* En desktop: modal centrado, flotante */
        @media (min-width: 640px) {
          .mra-overlay {
            align-items: center;
            padding: 24px;
          }
        }

        /* ── Modal contenedor ── */
        .mra-modal {
          position: relative;
          width: 100%;
          max-width: 500px;
          background: #111118;
          border-radius: 22px 22px 0 0;
          font-family: 'Plus Jakarta Sans', sans-serif;
          color: #e8e8f0;
          overflow: hidden;
          max-height: 100dvh;
          overflow-y: auto;
          scrollbar-width: none;
          /* Animación: sube desde abajo en móvil */
          animation: mra-slide-up 0.38s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }

        .mra-modal::-webkit-scrollbar {
          display: none;
        }

        /* En desktop: pop-in desde el centro */
        @media (min-width: 640px) {
          .mra-modal {
            border-radius: 20px;
            max-height: 90dvh;
            animation: mra-pop-in 0.38s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
          }
        }

        /* ── Animaciones ── */
        @keyframes mra-fade-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }

        @keyframes mra-slide-up {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }

        @keyframes mra-pop-in {
          from { transform: scale(0.90) translateY(20px); opacity: 0; }
          to   { transform: scale(1)    translateY(0);    opacity: 1; }
        }

        @keyframes mra-bounce-in {
          from { transform: scale(0); }
          to   { transform: scale(1); }
        }

        @keyframes mra-spin {
          to { transform: rotate(360deg); }
        }

        @keyframes mra-skeleton-pulse {
          0%, 100% { opacity: 0.35; }
          50%       { opacity: 0.75; }
        }

        /* ── Handle de arrastre — solo móvil ── */
        .mra-drag-handle {
          width: 36px;
          height: 4px;
          border-radius: 99px;
          background: #2a2a38;
          margin: 12px auto 0;
          display: block;
        }

        @media (min-width: 640px) {
          .mra-drag-handle {
            display: none;
          }
        }

        /* ── Header con gradiente (compacto) ── */
        .mra-header {
          background: linear-gradient(135deg, #1a4a6e 0%, #0f7a6e 100%);
          padding: 11px 16px 10px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .mra-header-left {
          display: flex;
          align-items: center;
          gap: 9px;
          flex: 1;
          min-width: 0;
        }

        .mra-header-icon {
          font-size: 16px;
          flex-shrink: 0;
          line-height: 1;
        }

        .mra-header-text {
          min-width: 0;
        }

        .mra-header-title {
          font-size: 13.5px;
          font-weight: 700;
          color: #ffffff;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          line-height: 1.3;
        }

        .mra-header-meta {
          font-size: 10px;
          color: rgba(255, 255, 255, 0.55);
          margin-top: 2px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .mra-header-close {
          width: 28px;
          height: 28px;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.12);
          border: none;
          color: rgba(255, 255, 255, 0.80);
          font-size: 13px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: background 0.2s;
        }

        .mra-header-close:hover {
          background: rgba(255, 255, 255, 0.22);
        }

        /* ── Stats bar ── */
        .mra-stats-bar {
          background: #0d1420;
          display: flex;
          border-bottom: 1px solid #1e1e2e;
        }

        .mra-stat-cell {
          flex: 1;
          padding: 7px 8px;
          text-align: center;
          border-right: 1px solid #1e1e2e;
        }

        .mra-stat-cell:last-child {
          border-right: none;
        }

        .mra-stat-label {
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.07em;
          text-transform: uppercase;
          color: #3a4a6a;
          margin-bottom: 2px;
        }

        .mra-stat-value {
          font-size: 18px;
          font-weight: 800;
          line-height: 1;
        }

        .mra-stat-value--green { color: #34d399; }
        .mra-stat-value--white { color: #e2e8f0; }
        .mra-stat-value--blue  { color: #60a5fa; }

        /* ── Barra de pasos ── */
        .mra-steps-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 16px 8px;
        }

        .mra-step-pills {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .mra-step-pill {
          padding: 3px 11px;
          border-radius: 99px;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          border: 1px solid #2a2a3e;
          background: #161622;
          color: #4a4a6a;
          transition: all 0.25s ease;
        }

        .mra-step-pill--active {
          background: rgba(99, 102, 241, 0.12);
          border-color: rgba(99, 102, 241, 0.40);
          color: #a5a6f6;
        }

        .mra-steps-title {
          font-size: 13px;
          font-weight: 700;
          color: #e8e8f0;
        }

        /* ── Divisor ── */
        .mra-divider {
          height: 1px;
          background: #1e1e2e;
        }

        /* ── Body del formulario ── */
        .mra-body {
          display: flex;
          flex-direction: column;
        }

        /* ── Grupos de campo ── */
        .mra-field-group {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .mra-field-label {
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #4a4a6a;
        }

        /* ── Select ── */
        .mra-select-wrap {
          position: relative;
        }

        .mra-select-wrap::after {
          content: '▾';
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          pointer-events: none;
          font-size: 11px;
          color: #4a4a6a;
        }

        .mra-select {
          width: 100%;
          border-radius: 10px;
          border: 1px solid #2a2a3e;
          background: #161622;
          color: #e8e8f0;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-weight: 500;
          appearance: none;
          -webkit-appearance: none;
          cursor: pointer;
          transition: border-color 0.2s;
          outline: none;
        }

        .mra-select:focus {
          border-color: rgba(99, 102, 241, 0.60);
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.10);
        }

        .mra-select--filled {
          border-color: rgba(99, 102, 241, 0.35);
          color: #a5a6f6;
        }

        .mra-select:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* ── Score cards de participación ── */
        .mra-score-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 6px;
        }

        .mra-score-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 5px;
          border-radius: 10px;
          border: 1px solid #2a2a3e;
          background: #161622;
          cursor: pointer;
          font-weight: 600;
          color: #4a4a6a;
          transition: all 0.2s ease;
          text-align: center;
        }

        .mra-score-card:hover {
          border-color: #3a3a5a;
          transform: translateY(-1px);
        }

        .mra-score-emoji {
          font-size: 20px;
          line-height: 1;
        }

        /* ── Toggle de asistencia ── */
        .mra-toggle-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-radius: 10px;
          border: 1px solid #2a2a3e;
          background: #161622;
          cursor: pointer;
          gap: 12px;
          transition: all 0.25s ease;
          user-select: none;
        }

        .mra-toggle-row--present {
          border-color: rgba(16, 185, 129, 0.30);
          background: rgba(16, 185, 129, 0.06);
        }

        .mra-toggle-row--absent {
          border-color: rgba(239, 68, 68, 0.30);
          background: rgba(239, 68, 68, 0.06);
        }

        .mra-toggle-info {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .mra-toggle-emoji {
          font-size: 17px;
          line-height: 1;
        }

        .mra-toggle-label {
          font-weight: 600;
        }

        .mra-toggle-sublabel {
          font-size: 11px;
          color: #4a4a6a;
          margin-top: 1px;
        }

        /* Switch visual */
        .mra-switch {
          position: relative;
          width: 38px;
          height: 22px;
          border-radius: 99px;
          flex-shrink: 0;
          transition: background 0.25s ease;
        }

        .mra-switch--on  { background: #10b981; }
        .mra-switch--off { background: #2a2a3e; }

        .mra-switch-thumb {
          position: absolute;
          top: 3px;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #ffffff;
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.40);
          transition: transform 0.28s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .mra-switch--on  .mra-switch-thumb { transform: translateX(19px); }
        .mra-switch--off .mra-switch-thumb { transform: translateX(3px);  }

        /* ── Chips de resumen (paso 2) ── */
        .mra-chips-row {
          display: flex;
          gap: 6px;
        }

        .mra-chip {
          display: flex;
          align-items: center;
          gap: 6px;
          flex: 1;
          min-width: 0;
          border-radius: 8px;
          background: #161622;
          border: 1px solid #2a2a3e;
          font-weight: 600;
          color: #a0a0c0;
        }

        .mra-chip-icon {
          font-size: 13px;
          flex-shrink: 0;
        }

        .mra-chip-text {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        /* ── Input de texto ── */
        .mra-input-wrap {
          position: relative;
        }

        .mra-input {
          width: 100%;
          border-radius: 10px;
          border: 1px solid #2a2a3e;
          background: #161622;
          color: #e8e8f0;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-weight: 500;
          transition: border-color 0.2s;
          box-sizing: border-box;
          outline: none;
        }

        .mra-input:focus {
          border-color: rgba(99, 102, 241, 0.60);
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.10);
        }

        .mra-input:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .mra-input-badge {
          position: absolute;
          right: 9px;
          top: 50%;
          transform: translateY(-50%);
          font-size: 10px;
          font-weight: 700;
          padding: 3px 8px;
          border-radius: 6px;
          background: rgba(99, 102, 241, 0.15);
          border: 1px solid rgba(99, 102, 241, 0.35);
          color: #a5a6f6;
          pointer-events: none;
          letter-spacing: 0.02em;
          white-space: nowrap;
        }

        .mra-field-hint {
          font-size: 10.5px;
          color: #4a4a6a;
          font-style: italic;
        }

        /* ── Validación inline ── */
        .mra-field-error {
          font-size: 11px;
          color: #f87171;
          margin-top: 2px;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        /* ── Alerta de error general ── */
        .mra-alert {
          display: flex;
          align-items: flex-start;
          gap: 9px;
          border-radius: 10px;
          font-weight: 500;
          border: 1px solid transparent;
          animation: mra-fade-in 0.2s ease;
        }

        .mra-alert--error {
          background: rgba(239, 68, 68, 0.08);
          color: #f87171;
          border-color: rgba(239, 68, 68, 0.25);
        }

        /* ── Botones de acción ── */
        .mra-actions-row {
          display: flex;
          gap: 8px;
          margin-top: 4px;
        }

        .mra-btn {
          flex: 1;
          border: none;
          border-radius: 12px;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          transition: all 0.2s ease;
          line-height: 1;
        }

        .mra-btn:disabled {
          opacity: 0.50;
          cursor: not-allowed;
          transform: none !important;
          box-shadow: none !important;
        }

        .mra-btn--primary {
          background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
          color: #ffffff;
          box-shadow: 0 3px 14px rgba(99, 102, 241, 0.30);
        }

        .mra-btn--primary:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(99, 102, 241, 0.42);
        }

        .mra-btn--primary:active:not(:disabled) {
          transform: translateY(0);
        }

        .mra-btn--ghost {
          background: #161622;
          border: 1px solid #2a2a3e;
          color: #7c7caa;
          flex: 0 0 auto;
        }

        .mra-btn--ghost:hover:not(:disabled) {
          border-color: #3a3a5a;
          color: #a0a0c0;
        }

        /* ── Spinner de carga ── */
        .mra-spinner {
          display: inline-block;
          border-radius: 50%;
          border-style: solid;
          border-color: rgba(255, 255, 255, 0.25);
          border-top-color: #ffffff;
          animation: mra-spin 0.65s linear infinite;
        }

        /* ── Skeletons de carga ── */
        .mra-skeleton {
          border-radius: 10px;
          background: #1e1e2e;
          animation: mra-skeleton-pulse 1.4s ease-in-out infinite;
        }

        /* ── Estado vacío ── */
        .mra-empty-state {
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }

        .mra-empty-icon {
          font-size: 40px;
          line-height: 1;
        }

        .mra-empty-title {
          font-size: 15px;
          font-weight: 700;
          color: #e8e8f0;
          margin: 0;
        }

        .mra-empty-subtitle {
          font-size: 12.5px;
          color: #4a4a6a;
          margin: 0;
          max-width: 260px;
        }

        /* ── Estado de éxito ── */
        .mra-success-state {
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          animation: mra-pop-in 0.40s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }

        .mra-success-ring {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          background: rgba(16, 185, 129, 0.12);
          border: 2px solid rgba(16, 185, 129, 0.35);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 28px;
          animation: mra-bounce-in 0.50s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }

        .mra-success-title {
          font-size: 19px;
          font-weight: 800;
          color: #e8e8f0;
          margin: 0;
        }

        .mra-success-subtitle {
          font-size: 13px;
          color: #4a4a6a;
          margin: 0;
        }

        /* ── Ajustes específicos para móvil ── */
        @media (max-width: 639px) {
          .mra-score-emoji {
            font-size: 24px;
          }

          .mra-score-card {
            padding: 13px 4px;
          }
        }
      `}</style>

      {/* ── Overlay ── */}
      <div className="mra-overlay" onClick={handleClose}>
        {/* ── Modal ── */}
        <div className="mra-modal" onClick={(e) => e.stopPropagation()}>
          {/* Handle de arrastre (solo móvil) */}
          <div className="mra-drag-handle" />

          {/* ────────────────────────────────
              HEADER — Opción A
              Una sola línea: ícono · título · pills · cerrar
          ──────────────────────────────── */}
          <div
            style={{
              background: "linear-gradient(135deg, #1a4a6e 0%, #0f7a6e 100%)",
              padding: isMobile ? "7px 10px" : "9px 12px",
              display: "flex",
              alignItems: "center",
              gap: isMobile ? 6 : 8,
            }}
          >
            {/* Ícono */}
            <span
              style={{
                fontSize: isMobile ? 11 : 13,
                flexShrink: 0,
                lineHeight: 1,
              }}
            >
              📖
            </span>

            {/* Título — ocupa todo el espacio sobrante, se trunca */}
            <span
              style={{
                fontSize: isMobile ? 10 : 12.5,
                fontWeight: 700,
                color: "#ffffff",
                flex: 1,
                minWidth: 0,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {lessonTitle || "Registrar asistencia"}
            </span>

            {/* Pills de stats — solo si hay datos */}
            {statsTotal !== null && (
              <div
                style={{
                  display: "flex",
                  gap: isMobile ? 4 : 5,
                  flexShrink: 0,
                }}
              >
                <span
                  style={{
                    padding: isMobile ? "1px 5px" : "2px 7px",
                    borderRadius: 99,
                    fontSize: isMobile ? 8.5 : 10,
                    fontWeight: 700,
                    background: "rgba(52,211,153,0.18)",
                    border: "1px solid rgba(52,211,153,0.30)",
                    color: "#6ee7b7",
                    whiteSpace: "nowrap",
                  }}
                >
                  {statsPresent}/{statsTotal}
                </span>
                <span
                  style={{
                    padding: isMobile ? "1px 5px" : "2px 7px",
                    borderRadius: 99,
                    fontSize: isMobile ? 8.5 : 10,
                    fontWeight: 700,
                    background: "rgba(96,165,250,0.18)",
                    border: "1px solid rgba(96,165,250,0.30)",
                    color: "#93c5fd",
                    whiteSpace: "nowrap",
                  }}
                >
                  {statsPercentage}%
                </span>
              </div>
            )}

            {/* Botón cerrar */}
            <button
              onClick={handleClose}
              aria-label="Cerrar modal"
              type="button"
              style={{
                width: 22,
                height: 22,
                borderRadius: 6,
                background: "rgba(255,255,255,0.12)",
                border: "none",
                color: "rgba(255,255,255,0.75)",
                fontSize: 11,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                transition: "background 0.2s",
              }}
            >
              ✕
            </button>
          </div>

          {/* ────────────────────────────────
              BARRA DE PASOS
          ──────────────────────────────── */}
          <div className="mra-steps-bar">
            <div className="mra-step-pills">
              <div className="mra-step-pill mra-step-pill--active">Paso 1</div>
              <div
                className={`mra-step-pill ${step >= 2 ? "mra-step-pill--active" : ""}`}
              >
                Paso 2
              </div>
            </div>
            <span className="mra-steps-title">
              {step === 1 ? "Selección" : "Confirmar"}
            </span>
          </div>

          <div className="mra-divider" />

          {/* ────────────────────────────────
              CONTENIDO PRINCIPAL
          ──────────────────────────────── */}

          {/* Estado: Éxito */}
          {successMessage && (
            <div
              className="mra-body"
              style={{
                padding: isMobile ? "36px 16px 40px" : "28px 16px 32px",
              }}
            >
              <div className="mra-success-state">
                <div className="mra-success-ring">✅</div>
                <p className="mra-success-title">¡Registrado!</p>
                <p className="mra-success-subtitle">
                  Asistencia guardada correctamente.
                </p>
              </div>
            </div>
          )}

          {/* Estado: Cargando datos */}
          {!successMessage && loadingData && (
            <div
              className="mra-body"
              style={{
                padding: bodyPadding,
                gap: bodyGap,
              }}
            >
              <div
                className="mra-skeleton"
                style={{ height: isMobile ? "50px" : "42px" }}
              />
              <div
                className="mra-skeleton"
                style={{ height: isMobile ? "50px" : "42px" }}
              />
              <div
                className="mra-skeleton"
                style={{ height: isMobile ? "50px" : "42px" }}
              />
            </div>
          )}

          {/* Estado: Sin datos disponibles */}
          {!successMessage &&
            !loadingData &&
            (lessons.length === 0 || students.length === 0) && (
              <div
                className="mra-body"
                style={{
                  padding: isMobile ? "40px 16px 48px" : "32px 16px 36px",
                }}
              >
                <div className="mra-empty-state">
                  <span className="mra-empty-icon">📭</span>
                  <p className="mra-empty-title">Sin datos disponibles</p>
                  <p className="mra-empty-subtitle">
                    Asegúrate de tener lecciones creadas y estudiantes inscritos
                    en esta cohorte.
                  </p>
                </div>
              </div>
            )}

          {/* Estado: Formulario activo */}
          {!successMessage &&
            !loadingData &&
            lessons.length > 0 &&
            students.length > 0 && (
              <>
                {/* ──────────────────────────────
                  PASO 1: Selección de lección y estudiante
              ────────────────────────────── */}
                {step === 1 && (
                  <div
                    className="mra-body"
                    style={{
                      padding: bodyPadding,
                      gap: bodyGap,
                    }}
                  >
                    {/* Alerta de error */}
                    {error && (
                      <div
                        className="mra-alert mra-alert--error"
                        style={{
                          padding: isMobile ? "12px 14px" : "10px 12px",
                          fontSize: isMobile ? "13.5px" : "12.5px",
                        }}
                      >
                        <span style={{ fontSize: 15, flexShrink: 0 }}>⚠️</span>
                        <span>{error}</span>
                      </div>
                    )}

                    {/* Campo: Lección */}
                    <div className="mra-field-group">
                      <label
                        className="mra-field-label"
                        style={{ fontSize: labelFontSize }}
                      >
                        Lección *
                      </label>
                      <div className="mra-select-wrap">
                        <select
                          className={`mra-select ${selectedLesson ? "mra-select--filled" : ""}`}
                          value={selectedLesson}
                          onChange={(e) => {
                            setSelectedLesson(e.target.value);
                            setTouched((prev) => ({ ...prev, lesson: true }));
                          }}
                          disabled={loading}
                          style={{
                            padding: isMobile
                              ? "13px 36px 13px 14px"
                              : "9px 32px 9px 12px",
                            fontSize: fieldFontSize,
                          }}
                        >
                          <option value="">Selecciona una lección…</option>
                          {lessons.map((lesson) => (
                            <option key={lesson.id} value={lesson.id}>
                              {lesson.lessonNumber}. {lesson.lessonName}
                              {lesson.lessonDate
                                ? ` — ${new Date(lesson.lessonDate).toLocaleDateString("es-CO")}`
                                : ""}
                            </option>
                          ))}
                        </select>
                      </div>
                      {touched.lesson && !selectedLesson && (
                        <span className="mra-field-error">
                          <span>⚠</span> Selecciona una lección
                        </span>
                      )}
                    </div>

                    {/* Campo: Estudiante */}
                    <div className="mra-field-group">
                      <label
                        className="mra-field-label"
                        style={{ fontSize: labelFontSize }}
                      >
                        Estudiante *
                      </label>
                      <div className="mra-select-wrap">
                        <select
                          className={`mra-select ${selectedStudent ? "mra-select--filled" : ""}`}
                          value={selectedStudent}
                          onChange={(e) => {
                            setSelectedStudent(e.target.value);
                            setTouched((prev) => ({ ...prev, student: true }));
                          }}
                          disabled={loading}
                          style={{
                            padding: isMobile
                              ? "13px 36px 13px 14px"
                              : "9px 32px 9px 12px",
                            fontSize: fieldFontSize,
                          }}
                        >
                          <option value="">Selecciona un estudiante…</option>
                          {students.map((student) => (
                            <option key={student.id} value={student.id}>
                              {student.memberName ||
                                `Estudiante ${student.memberId}`}
                            </option>
                          ))}
                        </select>
                      </div>
                      {touched.student && !selectedStudent && (
                        <span className="mra-field-error">
                          <span>⚠</span> Selecciona un estudiante
                        </span>
                      )}
                    </div>

                    {/* Acciones paso 1 */}
                    <div className="mra-actions-row">
                      <button
                        type="button"
                        className="mra-btn mra-btn--ghost"
                        onClick={handleClose}
                        disabled={loading}
                        style={{
                          padding: isMobile ? "14px 20px" : "10px 16px",
                          fontSize: btnFontSize,
                          borderRadius: isMobile ? "14px" : "12px",
                        }}
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        className="mra-btn mra-btn--primary"
                        onClick={handleGoToStep2}
                        style={{
                          padding: btnPadding,
                          fontSize: btnFontSize,
                          borderRadius: isMobile ? "14px" : "12px",
                        }}
                      >
                        Continuar →
                      </button>
                    </div>
                  </div>
                )}

                {/* ──────────────────────────────
                  PASO 2: Detalles y confirmación
              ────────────────────────────── */}
                {step === 2 && (
                  <form
                    onSubmit={handleSubmit}
                    className="mra-body"
                    style={{
                      padding: bodyPadding,
                      gap: bodyGap,
                    }}
                  >
                    {/* Alerta de error */}
                    {error && (
                      <div
                        className="mra-alert mra-alert--error"
                        style={{
                          padding: isMobile ? "12px 14px" : "10px 12px",
                          fontSize: isMobile ? "13.5px" : "12.5px",
                        }}
                      >
                        <span style={{ fontSize: 15, flexShrink: 0 }}>⚠️</span>
                        <span>{error}</span>
                      </div>
                    )}

                    {/* Chips de resumen: lección + estudiante seleccionados */}
                    <div className="mra-chips-row">
                      <div
                        className="mra-chip"
                        style={{
                          padding: isMobile ? "7px 10px" : "5px 9px",
                          fontSize: isMobile ? "12.5px" : "11.5px",
                        }}
                      >
                        <span className="mra-chip-icon">📖</span>
                        <span className="mra-chip-text">
                          {selectedLessonObj
                            ? `${selectedLessonObj.lessonNumber}. ${selectedLessonObj.lessonName}`
                            : "—"}
                        </span>
                      </div>
                      <div
                        className="mra-chip"
                        style={{
                          padding: isMobile ? "7px 10px" : "5px 9px",
                          fontSize: isMobile ? "12.5px" : "11.5px",
                        }}
                      >
                        <span className="mra-chip-icon">👤</span>
                        <span className="mra-chip-text">
                          {selectedStudentObj
                            ? selectedStudentObj.memberName ||
                              `Estudiante ${selectedStudentObj.memberId}`
                            : "—"}
                        </span>
                      </div>
                    </div>

                    {/* Campo: Participación */}
                    <div className="mra-field-group">
                      <label
                        className="mra-field-label"
                        style={{ fontSize: labelFontSize }}
                      >
                        Participación *
                      </label>
                      <div className="mra-score-grid">
                        {PARTICIPATION_SCORES.map((s) => {
                          const isSelected = score === s.value;
                          return (
                            <div
                              key={s.value}
                              className="mra-score-card"
                              onClick={() => setScore(s.value)}
                              style={{
                                padding: isMobile ? "13px 4px" : "10px 4px",
                                fontSize: isMobile ? "12px" : "10.5px",
                                background: isSelected ? s.bgActive : "#161622",
                                borderColor: isSelected
                                  ? s.borderActive
                                  : "#2a2a3e",
                                color: isSelected ? s.colorActive : "#4a4a6a",
                              }}
                            >
                              <span className="mra-score-emoji">{s.emoji}</span>
                              <span>{s.label}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Campo: Toggle de asistencia */}
                    <div className="mra-field-group">
                      <label
                        className="mra-field-label"
                        style={{ fontSize: labelFontSize }}
                      >
                        Asistencia
                      </label>
                      <div
                        className={`mra-toggle-row ${present ? "mra-toggle-row--present" : "mra-toggle-row--absent"}`}
                        onClick={() => setPresent((p) => !p)}
                        style={{
                          padding: isMobile ? "13px 14px" : "10px 12px",
                        }}
                      >
                        <div className="mra-toggle-info">
                          <span className="mra-toggle-emoji">
                            {present ? "✅" : "❌"}
                          </span>
                          <div>
                            <div
                              className="mra-toggle-label"
                              style={{
                                fontSize: isMobile ? "14.5px" : "13px",
                                color: present ? "#34d399" : "#f87171",
                              }}
                            >
                              {present ? "Presente" : "Ausente"}
                            </div>
                            <div
                              className="mra-toggle-sublabel"
                              style={{ fontSize: isMobile ? "12px" : "11px" }}
                            >
                              {present
                                ? "El estudiante asistió"
                                : "El estudiante no asistió"}
                            </div>
                          </div>
                        </div>
                        <div
                          className={`mra-switch ${present ? "mra-switch--on" : "mra-switch--off"}`}
                        >
                          <div className="mra-switch-thumb" />
                        </div>
                      </div>
                    </div>

                    {/* Campo: Registrado por */}
                    <div className="mra-field-group">
                      <label
                        className="mra-field-label"
                        style={{ fontSize: labelFontSize }}
                      >
                        Registrado por *
                      </label>
                      <div className="mra-input-wrap">
                        <input
                          type="text"
                          className="mra-input"
                          value={recordedBy}
                          onChange={(e) => setRecordedBy(e.target.value)}
                          placeholder="Tu nombre completo"
                          disabled={loading}
                          style={{
                            padding: isMobile
                              ? "13px 100px 13px 14px"
                              : "9px 94px 9px 12px",
                            fontSize: fieldFontSize,
                          }}
                        />
                        <span className="mra-input-badge">🔐 Sesión</span>
                      </div>
                      <span
                        className="mra-field-hint"
                        style={{ fontSize: isMobile ? "11.5px" : "10.5px" }}
                      >
                        Cargado automáticamente desde tu sesión activa.
                      </span>
                      {touched.recordedBy && !recordedBy?.trim() && (
                        <span className="mra-field-error">
                          <span>⚠</span> Ingresa el nombre de quien registra
                        </span>
                      )}
                    </div>

                    {/* Acciones paso 2 */}
                    <div className="mra-actions-row">
                      <button
                        type="button"
                        className="mra-btn mra-btn--ghost"
                        onClick={handleGoToStep1}
                        disabled={loading}
                        style={{
                          padding: isMobile ? "14px 20px" : "10px 16px",
                          fontSize: btnFontSize,
                          borderRadius: isMobile ? "14px" : "12px",
                        }}
                      >
                        ← Atrás
                      </button>
                      <button
                        type="submit"
                        className="mra-btn mra-btn--primary"
                        disabled={loading}
                        style={{
                          padding: btnPadding,
                          fontSize: btnFontSize,
                          borderRadius: isMobile ? "14px" : "12px",
                        }}
                      >
                        {loading ? (
                          <>
                            <span
                              className="mra-spinner"
                              style={{
                                width: isMobile ? 16 : 13,
                                height: isMobile ? 16 : 13,
                                borderWidth: 2,
                              }}
                            />
                            Guardando…
                          </>
                        ) : (
                          "Registrar ✓"
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </>
            )}
        </div>
      </div>
    </>
  );
};

export default ModalRecordAttendance;
