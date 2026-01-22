// ✅ ModalRecordAttendance.jsx - v2 CON MODO OSCURO
// Modal mejorado para registrar asistencias
// Legible automáticamente en modo oscuro

import React, { useState, useEffect } from "react";
import apiService from "../apiService";

const ModalRecordAttendance = ({
  isOpen,
  onClose,
  enrollmentId,
  onAttendanceRecorded,
}) => {
  // ========== DARK MODE ==========
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const savedMode = localStorage.getItem('darkMode');
    const htmlHasDarkClass = document.documentElement.classList.contains('dark-mode');

    setIsDarkMode(
      savedMode === 'true' || htmlHasDarkClass || prefersDark
    );

    const observer = new MutationObserver(() => {
      setIsDarkMode(document.documentElement.classList.contains('dark-mode'));
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => {
      if (localStorage.getItem('darkMode') === null) {
        setIsDarkMode(e.matches);
      }
    };
    mediaQuery.addEventListener('change', handleChange);

    return () => {
      observer.disconnect();
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  // Tema
  const themeColors = {
    bg: isDarkMode ? '#0f172a' : '#ffffff',
    bgSecondary: isDarkMode ? '#1e293b' : '#f9fafb',
    text: isDarkMode ? '#f1f5f9' : '#111827',
    textSecondary: isDarkMode ? '#cbd5e1' : '#666666',
    textTertiary: isDarkMode ? '#94a3b8' : '#999999',
    border: isDarkMode ? '#334155' : '#e5e7eb',
    header: isDarkMode
      ? 'linear-gradient(135deg, #1e40af 0%, #047857 100%)'
      : 'linear-gradient(135deg, #2563eb 0%, #10b981 100%)',
    card: isDarkMode ? '#1e293b' : '#ffffff',
    input: isDarkMode ? '#1e293b' : '#ffffff',
    error: isDarkMode ? '#7f1d1d' : '#fee2e2',
    errorText: isDarkMode ? '#fca5a5' : '#991b1b',
    errorBorder: isDarkMode ? '#dc2626' : '#ef4444',
    success: isDarkMode ? '#064e3b' : '#d1fae5',
    successText: isDarkMode ? '#86efac' : '#065f46',
    successBorder: isDarkMode ? '#10b981' : '#10b981',
    info: isDarkMode ? '#1e3a8a' : '#e0f2fe',
    infoText: isDarkMode ? '#93c5fd' : '#0c4a6e',
    infoBorder: isDarkMode ? '#0284c7' : '#0284c7',
  };

  // ========== ESTADO ==========
  const [lessons, setLessons] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedLesson, setSelectedLesson] = useState("");
  const [selectedStudent, setSelectedStudent] = useState("");
  const [recordedBy, setRecordedBy] = useState("");
  const [present, setPresent] = useState(true);
  const [score, setScore] = useState("POCA_PARTICIPACION");
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const participationScores = [
    { value: "NO_PARTICIPA", label: "🤐 No participa" },
    { value: "POCA_PARTICIPACION", label: "👌 Poca participación" },
    { value: "EXCELENTE_PARTICIPACION", label: "🌟 Excelente participación" },
  ];

  // ========== OBTENER USUARIO AUTENTICADO ==========
  const getUserAuthenticated = () => {
    try {
      const userData = localStorage.getItem("user");
      if (userData) {
        const user = JSON.parse(userData);
        return user.name || user.username || user.email || "Usuario";
      }

      const sessionUser = sessionStorage.getItem("currentUser");
      if (sessionUser) {
        const user = JSON.parse(sessionUser);
        return user.name || user.username || user.email || "Usuario";
      }

      const token = localStorage.getItem("token");
      if (token) {
        try {
          const decodedToken = parseJwt(token);
          return (
            decodedToken.sub ||
            decodedToken.username ||
            decodedToken.name ||
            "Usuario"
          );
        } catch (err) {
          console.log("⚠️ No se pudo decodificar token");
        }
      }

      return "Usuario";
    } catch (err) {
      console.error("❌ Error obteniendo usuario:", err);
      return "Usuario";
    }
  };

  // Decodificar JWT
  const parseJwt = (token) => {
    try {
      const base64Url = token.split(".")[1];
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split("")
          .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join("")
      );
      return JSON.parse(jsonPayload);
    } catch (err) {
      throw new Error("Token inválido");
    }
  };

  // Cargar usuario al montar componente
  useEffect(() => {
    const userName = getUserAuthenticated();
    setRecordedBy(userName);
  }, []);

  // Cargar lecciones y estudiantes al abrir el modal
  useEffect(() => {
    if (isOpen && enrollmentId) {
      loadData();
    }
  }, [isOpen, enrollmentId]);

  const loadData = async () => {
    setLoadingData(true);
    setError("");

    try {
      const lessonsData = await apiService.getLessonsByEnrollment(enrollmentId);
      setLessons(lessonsData || []);

      const studentsData = await apiService.getStudentEnrollmentsByEnrollment(
        enrollmentId
      );
      setStudents(studentsData || []);

      if (
        (!lessonsData || lessonsData.length === 0) &&
        (!studentsData || studentsData.length === 0)
      ) {
        setError("⚠️ No hay lecciones o estudiantes disponibles");
      }
    } catch (err) {
      console.error("❌ Error cargando datos:", err);
      setError(err.message || "Error al cargar los datos");
    } finally {
      setLoadingData(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    if (!selectedLesson) {
      setError("❌ Selecciona una lección");
      return;
    }
    if (!selectedStudent) {
      setError("❌ Selecciona un estudiante");
      return;
    }
    if (!recordedBy?.trim()) {
      setError("❌ Ingresa tu nombre");
      return;
    }

    setLoading(true);

    try {
      const attendanceData = {
        studentEnrollmentId: parseInt(selectedStudent),
        lessonId: parseInt(selectedLesson),
        present,
        recordedBy: recordedBy.trim(),
        score,
      };

      await apiService.recordAttendance(attendanceData);
      setSuccessMessage("✅ ¡Asistencia registrada correctamente!");

      setTimeout(() => {
        setSelectedLesson("");
        setSelectedStudent("");
        setPresent(true);
        setScore("POCA_PARTICIPACION");
        setSuccessMessage("");

        if (onAttendanceRecorded) {
          onAttendanceRecorded();
        }

        loadData();
      }, 1500);
    } catch (err) {
      console.error("❌ ERROR AL REGISTRAR:", err);

      let errorMsg = err.message || "Error al registrar asistencia";

      if (err.message.includes("409")) {
        errorMsg =
          "⚠️ Esta asistencia ya existe. Intenta actualizarla desde otra vista.";
      } else if (err.message.includes("400")) {
        errorMsg =
          "❌ Los datos enviados no son válidos. Verifica que todos los campos sean correctos.";
      } else if (err.message.includes("404")) {
        errorMsg =
          "❌ La lección o estudiante no fueron encontrados. Recarga la página e intenta de nuevo.";
      } else if (err.message.includes("500")) {
        errorMsg = "❌ Error en el servidor. Contacta al administrador.";
      }

      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedLesson("");
    setSelectedStudent("");
    setRecordedBy(getUserAuthenticated());
    setPresent(true);
    setScore("POCA_PARTICIPACION");
    setError("");
    setSuccessMessage("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay"
      style={{
        backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.7)' : 'rgba(0, 0, 0, 0.5)',
      }}
      onClick={handleClose}
    >
      <div
        className="modal-container"
        style={{
          backgroundColor: themeColors.bg,
          color: themeColors.text,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="modal-header"
          style={{
            background: themeColors.header,
          }}
        >
          <h2 className="modal-title">✅ Registrar Asistencia</h2>
          <button className="modal-close-btn" onClick={handleClose}>
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="modal-body">
          {successMessage && (
            <div
              className="success-message"
              style={{
                backgroundColor: themeColors.success,
                color: themeColors.successText,
                borderLeftColor: themeColors.successBorder,
              }}
            >
              {successMessage}
            </div>
          )}

          {loadingData ? (
            <div className="loading-state" style={{ color: themeColors.textSecondary }}>
              ⏳ Cargando datos...
            </div>
          ) : lessons.length === 0 || students.length === 0 ? (
            <div className="empty-state" style={{ color: themeColors.textSecondary }}>
              <p>📚 No hay lecciones o estudiantes disponibles</p>
              <small style={{ color: themeColors.textTertiary }}>
                Asegúrate de tener lecciones creadas y estudiantes inscritos
              </small>
            </div>
          ) : (
            <>
              {error && (
                <div
                  className="error-message"
                  style={{
                    backgroundColor: themeColors.error,
                    color: themeColors.errorText,
                    borderLeftColor: themeColors.errorBorder,
                  }}
                >
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="form-record-attendance">
                {/* Lección */}
                <div className="form-group">
                  <label className="form-label" style={{ color: themeColors.text }}>
                    Lección *
                  </label>
                  <select
                    value={selectedLesson}
                    onChange={(e) => setSelectedLesson(e.target.value)}
                    className="form-input form-select"
                    style={{
                      backgroundColor: themeColors.input,
                      color: themeColors.text,
                      borderColor: themeColors.border,
                    }}
                    disabled={loading}
                  >
                    <option value="">-- Selecciona una lección --</option>
                    {lessons.map((lesson) => (
                      <option key={lesson.id} value={lesson.id}>
                        📖 {lesson.lessonNumber}. {lesson.lessonName}
                        {lesson.lessonDate &&
                          ` - ${new Date(lesson.lessonDate).toLocaleDateString(
                            "es-CO"
                          )}`}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Estudiante */}
                <div className="form-group">
                  <label className="form-label" style={{ color: themeColors.text }}>
                    Estudiante *
                  </label>
                  <select
                    value={selectedStudent}
                    onChange={(e) => setSelectedStudent(e.target.value)}
                    className="form-input form-select"
                    style={{
                      backgroundColor: themeColors.input,
                      color: themeColors.text,
                      borderColor: themeColors.border,
                    }}
                    disabled={loading}
                  >
                    <option value="">-- Selecciona un estudiante --</option>
                    {students.map((student) => (
                      <option key={student.id} value={student.id}>
                        👤{" "}
                        {student.memberName || `Estudiante ${student.memberId}`}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Puntuación */}
                <div className="form-group">
                  <label className="form-label" style={{ color: themeColors.text }}>
                    Puntuación de Participación *
                  </label>
                  <select
                    value={score}
                    onChange={(e) => setScore(e.target.value)}
                    className="form-input form-select"
                    style={{
                      backgroundColor: themeColors.input,
                      color: themeColors.text,
                      borderColor: themeColors.border,
                    }}
                    disabled={loading}
                  >
                    {participationScores.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Registrado por */}
                <div className="form-group">
                  <label className="form-label" style={{ color: themeColors.text }}>
                    Registrado por (Tu nombre) *
                  </label>
                  <div className="input-with-icon">
                    <input
                      type="text"
                      value={recordedBy}
                      onChange={(e) => setRecordedBy(e.target.value)}
                      placeholder="Tu nombre"
                      className="form-input"
                      style={{
                        backgroundColor: themeColors.input,
                        color: themeColors.text,
                        borderColor: themeColors.border,
                      }}
                      disabled={loading}
                    />
                    <span className="input-icon">🔐 Autenticado</span>
                  </div>
                  <small className="input-hint" style={{ color: themeColors.textSecondary }}>
                    Se cargó automáticamente de tu sesión. Puedes cambiar si es
                    necesario.
                  </small>
                </div>

                {/* Presente */}
                <div className="form-group-checkbox">
                  <label className="checkbox-label" style={{ color: themeColors.text }}>
                    <input
                      type="checkbox"
                      checked={present}
                      onChange={(e) => setPresent(e.target.checked)}
                      disabled={loading}
                    />
                    <span>{present ? "✅ Presente" : "❌ Ausente"}</span>
                  </label>
                </div>

                {/* INFO BOX */}
                <div
                  className="info-box"
                  style={{
                    backgroundColor: themeColors.info,
                    color: themeColors.infoText,
                    borderLeftColor: themeColors.infoBorder,
                  }}
                >
                  💡 <strong>Tip:</strong> Tu nombre se cargó automáticamente.
                  Si ves "Usuario" en lugar de tu nombre, contacta al
                  administrador.
                </div>

                {/* Botones */}
                <div className="form-actions">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={handleClose}
                    disabled={loading}
                    style={{
                      backgroundColor: themeColors.bgSecondary,
                      color: themeColors.text,
                      borderColor: themeColors.border,
                    }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={loading}
                  >
                    {loading ? "⏳ Registrando..." : "✅ Registrar"}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>

      <style jsx>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          animation: fadeIn 0.3s ease-in-out;
          padding: 20px;
          transition: background-color 300ms ease-in-out;
        }

        .modal-container {
          border-radius: 12px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          max-width: 600px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
          animation: slideInUp 0.3s ease-in-out;
          transition: all 300ms ease-in-out;
        }

        .modal-header {
          color: white;
          padding: 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-radius: 12px 12px 0 0;
          transition: background 300ms ease-in-out;
        }

        .modal-title {
          font-size: 20px;
          font-weight: 700;
          margin: 0;
        }

        .modal-close-btn {
          background: none;
          border: none;
          color: white;
          font-size: 24px;
          cursor: pointer;
          padding: 0;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
          transition: background-color 0.2s;
        }

        .modal-close-btn:hover {
          background-color: rgba(255, 255, 255, 0.2);
        }

        .modal-body {
          padding: 24px;
          transition: color 300ms ease-in-out;
        }

        .loading-state {
          text-align: center;
          padding: 40px 20px;
          font-size: 16px;
          transition: color 300ms ease-in-out;
        }

        .empty-state {
          text-align: center;
          padding: 40px 20px;
          transition: color 300ms ease-in-out;
        }

        .empty-state p {
          margin: 0 0 8px 0;
          font-size: 16px;
        }

        .empty-state small {
          transition: color 300ms ease-in-out;
        }

        .error-message {
          padding: 12px 16px;
          border-radius: 8px;
          margin-bottom: 16px;
          border-left: 4px solid;
          transition: all 300ms ease-in-out;
        }

        .success-message {
          padding: 12px 16px;
          border-radius: 8px;
          margin-bottom: 16px;
          border-left: 4px solid;
          font-weight: 600;
          transition: all 300ms ease-in-out;
        }

        .form-record-attendance {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .form-label {
          font-size: 14px;
          font-weight: 600;
          transition: color 300ms ease-in-out;
        }

        .form-input,
        .form-select {
          padding: 10px 12px;
          border: 2px solid;
          border-radius: 8px;
          font-size: 14px;
          font-family: inherit;
          transition: all 0.2s;
        }

        .form-input:focus,
        .form-select:focus {
          outline: none;
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }

        .form-input:disabled,
        .form-select:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .input-with-icon {
          position: relative;
          display: flex;
          align-items: center;
        }

        .input-with-icon .form-input {
          padding-right: 100px;
          width: 100%;
        }

        .input-icon {
          position: absolute;
          right: 12px;
          font-size: 12px;
          background: linear-gradient(135deg, #2563eb 0%, #10b981 100%);
          color: white;
          padding: 4px 8px;
          border-radius: 4px;
          font-weight: 600;
          white-space: nowrap;
          pointer-events: none;
        }

        .input-hint {
          display: block;
          font-size: 12px;
          margin-top: 4px;
          font-style: italic;
          transition: color 300ms ease-in-out;
        }

        .form-group-checkbox {
          display: flex;
          align-items: center;
        }

        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: color 300ms ease-in-out;
        }

        .checkbox-label input[type="checkbox"] {
          width: 18px;
          height: 18px;
          cursor: pointer;
        }

        .info-box {
          padding: 12px 16px;
          border-radius: 8px;
          font-size: 13px;
          border-left: 4px solid;
          transition: all 300ms ease-in-out;
        }

        .info-box strong {
          font-weight: 600;
        }

        .form-actions {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
          margin-top: 8px;
        }

        .btn-primary,
        .btn-secondary {
          padding: 10px 20px;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-primary {
          background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.4);
          transform: translateY(-2px);
        }

        .btn-secondary {
          border: 1px solid;
          transition: all 300ms ease-in-out;
        }

        .btn-secondary:hover:not(:disabled) {
          opacity: 0.8;
        }

        .btn-primary:disabled,
        .btn-secondary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slideInUp {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        @media (max-width: 768px) {
          .modal-container {
            width: 95%;
            max-height: 95vh;
          }

          .modal-header {
            padding: 16px;
          }

          .modal-body {
            padding: 16px;
          }

          .input-icon {
            font-size: 10px;
            padding: 3px 6px;
          }
        }
      `}</style>
    </div>
  );
};

export default ModalRecordAttendance;