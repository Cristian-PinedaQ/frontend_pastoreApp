// ✅ ModalRecordAttendance.jsx - Modal mejorado para registrar asistencias
// - Usuario autenticado por defecto en "recordedBy"
// - Fix completo de guardado de asistencias

import React, { useState, useEffect } from "react";
import apiService from "../apiService";

const ModalRecordAttendance = ({
  isOpen,
  onClose,
  enrollmentId,
  onAttendanceRecorded,
}) => {
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
      // Opción 1: Desde localStorage (si guardas usuario)
      const userData = localStorage.getItem("user");
      if (userData) {
        const user = JSON.parse(userData);
        console.log("👤 Usuario desde localStorage:", user);
        return user.name || user.username || user.email || "Usuario";
      }

      // Opción 2: Desde sessionStorage
      const sessionUser = sessionStorage.getItem("currentUser");
      if (sessionUser) {
        const user = JSON.parse(sessionUser);
        console.log("👤 Usuario desde sessionStorage:", user);
        return user.name || user.username || user.email || "Usuario";
      }

      // Opción 3: Desde token JWT decodificado
      const token = localStorage.getItem("token");
      if (token) {
        try {
          const decodedToken = parseJwt(token);
          console.log("👤 Token decodificado:", decodedToken);
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
    console.log("🔐 Usuario autenticado establecido:", userName);
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
      console.log("📚 Cargando lecciones para cohorte:", enrollmentId);
      const lessonsData = await apiService.getLessonsByEnrollment(enrollmentId);
      console.log("✅ Lecciones cargadas:", lessonsData);
      setLessons(lessonsData || []);

      console.log("👥 Cargando estudiantes para cohorte:", enrollmentId);
      const studentsData = await apiService.getStudentEnrollmentsByEnrollment(
        enrollmentId
      );
      console.log("✅ Estudiantes cargados:", studentsData);
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

    // Validaciones
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
      // Preparar datos
      const attendanceData = {
        studentEnrollmentId: parseInt(selectedStudent),
        lessonId: parseInt(selectedLesson),
        present,
        recordedBy: recordedBy.trim(),
        score,
      };

      console.log(
        "📊 DATOS A ENVIAR:",
        JSON.stringify(attendanceData, null, 2)
      );

      // Realizar request
      const response = await apiService.recordAttendance(attendanceData);

      console.log("✅ RESPUESTA DEL SERVIDOR:", response);

      // Mostrar éxito
      setSuccessMessage("✅ ¡Asistencia registrada correctamente!");

      // Limpiar formulario
      setTimeout(() => {
        setSelectedLesson("");
        setSelectedStudent("");
        setPresent(true);
        setScore("POCA_PARTICIPACION");
        setSuccessMessage("");

        // Notificar cambios
        if (onAttendanceRecorded) {
          onAttendanceRecorded();
        }

        // Recargar datos
        loadData();
      }, 1500);
    } catch (err) {
      console.error("❌ ERROR AL REGISTRAR:", err);

      // Mensaje de error mejorado
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
    setRecordedBy(getUserAuthenticated()); // Reiniciar con usuario autenticado
    setPresent(true);
    setScore("POCA_PARTICIPACION");
    setError("");
    setSuccessMessage("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <h2 className="modal-title">✅ Registrar Asistencia</h2>
          <button className="modal-close-btn" onClick={handleClose}>
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="modal-body">
          {successMessage && (
            <div className="success-message">{successMessage}</div>
          )}

          {loadingData ? (
            <div className="loading-state">⏳ Cargando datos...</div>
          ) : lessons.length === 0 || students.length === 0 ? (
            <div className="empty-state">
              <p>📚 No hay lecciones o estudiantes disponibles</p>
              <small>
                Asegúrate de tener lecciones creadas y estudiantes inscritos
              </small>
            </div>
          ) : (
            <>
              {error && <div className="error-message">{error}</div>}

              <form onSubmit={handleSubmit} className="form-record-attendance">
                {/* Lección */}
                <div className="form-group">
                  <label className="form-label">Lección *</label>
                  <select
                    value={selectedLesson}
                    onChange={(e) => setSelectedLesson(e.target.value)}
                    className="form-input form-select"
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
                  <label className="form-label">Estudiante *</label>
                  <select
                    value={selectedStudent}
                    onChange={(e) => setSelectedStudent(e.target.value)}
                    className="form-input form-select"
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
                  <label className="form-label">
                    Puntuación de Participación *
                  </label>
                  <select
                    value={score}
                    onChange={(e) => setScore(e.target.value)}
                    className="form-input form-select"
                    disabled={loading}
                  >
                    {participationScores.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Registrado por - CON USUARIO AUTENTICADO */}
                <div className="form-group">
                  <label className="form-label">
                    Registrado por (Tu nombre) *
                  </label>
                  <div className="input-with-icon">
                    <input
                      type="text"
                      value={recordedBy}
                      onChange={(e) => setRecordedBy(e.target.value)}
                      placeholder="Tu nombre"
                      className="form-input"
                      disabled={loading}
                    />
                    <span className="input-icon">🔐 Autenticado</span>
                  </div>
                  <small className="input-hint">
                    Se cargó automáticamente de tu sesión. Puedes cambiar si es
                    necesario.
                  </small>
                </div>

                {/* Presente */}
                <div className="form-group-checkbox">
                  <label className="checkbox-label">
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
                <div className="info-box">
                  💡 <strong>Tip:</strong> Tu nombre se cargó automáticamente.
                  Si ves "Usuario" en lugar de tu nombre, contáctale al
                  administrador.
                </div>

                {/* Botones */}
                <div className="form-actions">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={handleClose}
                    disabled={loading}
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
          background-color: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          animation: fadeIn 0.3s ease-in-out;
        }

        .modal-container {
          background: white;
          border-radius: 12px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          max-width: 600px;
          width: 90%;
          max-height: 90vh;
          overflow-y: auto;
          animation: slideInUp 0.3s ease-in-out;
        }

        .modal-header {
          background: linear-gradient(135deg, #2563eb 0%, #10b981 100%);
          color: white;
          padding: 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-radius: 12px 12px 0 0;
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
        }

        .loading-state {
          text-align: center;
          padding: 40px 20px;
          color: #6b7280;
          font-size: 16px;
        }

        .empty-state {
          text-align: center;
          padding: 40px 20px;
          color: #6b7280;
        }

        .empty-state p {
          margin: 0 0 8px 0;
          font-size: 16px;
        }

        .empty-state small {
          color: #9ca3af;
        }

        .error-message {
          background-color: #fee2e2;
          color: #991b1b;
          padding: 12px 16px;
          border-radius: 8px;
          margin-bottom: 16px;
          border-left: 4px solid #ef4444;
        }

        .success-message {
          background-color: #d1fae5;
          color: #065f46;
          padding: 12px 16px;
          border-radius: 8px;
          margin-bottom: 16px;
          border-left: 4px solid #10b981;
          font-weight: 600;
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
          color: #374151;
        }

        .form-input,
        .form-select {
          padding: 10px 12px;
          border: 2px solid #e5e7eb;
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
          background-color: #f3f4f6;
          color: #9ca3af;
          cursor: not-allowed;
        }

        /* INPUT CON ICONO */
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
          color: #6b7280;
          margin-top: 4px;
          font-style: italic;
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
          color: #374151;
        }

        .checkbox-label input[type="checkbox"] {
          width: 18px;
          height: 18px;
          cursor: pointer;
        }

        .info-box {
          background-color: #e0f2fe;
          color: #0c4a6e;
          padding: 12px 16px;
          border-radius: 8px;
          font-size: 13px;
          border-left: 4px solid #0284c7;
        }

        .info-box strong {
          color: #0c4a6e;
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
          background-color: #e5e7eb;
          color: #374151;
        }

        .btn-secondary:hover:not(:disabled) {
          background-color: #d1d5db;
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
