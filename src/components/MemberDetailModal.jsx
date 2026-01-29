// 📋 MemberDetailModal.jsx - Vista detallada de miembro e inscripciones
// ✅ MEJORADO: Soporte completo para Dark Mode
// ✅ ACTUALIZADO: Botones de acciones integrados en el modal
import React, { useState, useEffect } from "react";
import apiService from "../apiService";

export const MemberDetailModal = ({
  member,
  onClose,
  onUpdated,
  onEdit,
  onDelete,
  onViewEnrollment,
  canEdit,
}) => {
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("info");
  const [selectedEnrollment, setSelectedEnrollment] = useState(null);
  const [enrollmentDetail, setEnrollmentDetail] = useState(null);

  useEffect(() => {
    console.log("✅ Modal abierto para:", member.name);
    loadEnrollments();
  }, [member]);

  const loadEnrollments = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log("📥 Cargando inscripciones para memberId:", member.id);
      const response = await apiService.getStudentEnrollmentsByMember(
        member.id
      );
      console.log("✅ Inscripciones cargadas:", response);
      setEnrollments(response || []);
    } catch (err) {
      console.error("❌ Error al cargar inscripciones:", err);
      setError(err.message || "Error al cargar inscripciones");
    } finally {
      setLoading(false);
    }
  };

  const handleViewEnrollmentDetail = async (enrollment) => {
    try {
      setLoading(true);

      // 1️⃣ Obtener detalle de inscripción
      const response = await apiService.getStudentDetailedReport(enrollment.id);
      console.log("✅ RESPUESTA:", response);

      // 2️⃣ Cargar lecciones si no están en la respuesta
      let lessons = response.lessons || [];

      if (!lessons || lessons.length === 0) {
        try {
          if (enrollment.enrollment?.id) {
            const lessonsResponse = await apiService.getLessonsByEnrollment(
              enrollment.enrollment.id
            );
            console.log("✅ Lecciones cargadas:", lessonsResponse);
            lessons = lessonsResponse || [];
          }
        } catch (err) {
          console.warn("⚠️ Error cargando lecciones:", err);
        }
      }

      // 3️⃣ Combinar detalle + lecciones
      setEnrollmentDetail({
        ...response,
        lessons: lessons,
      });

      setSelectedEnrollment(enrollment);
      setActiveTab("enrollmentDetail");
    } catch (err) {
      console.error("❌ Error:", err);
      alert("❌ Error: " + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async (enrollmentId) => {
    if (!window.confirm("¿Estás seguro de dar de baja al estudiante?")) return;

    try {
      console.log("🗑️ Dando de baja inscripción:", enrollmentId);
      await apiService.withdrawStudentFromCohort(enrollmentId);
      alert("✅ Estudiante dado de baja");
      loadEnrollments();
      if (onUpdated) onUpdated();
    } catch (err) {
      console.error("❌ Error al dar de baja:", err);
      alert("❌ Error: " + (err.message || err));
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "ACTIVE":
        return "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border border-green-300 dark:border-green-600";
      case "COMPLETED":
        return "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-600";
      case "CANCELLED":
        return "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border border-red-300 dark:border-red-600";
      case "PENDING":
        return "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border border-yellow-300 dark:border-yellow-600";
      default:
        return "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 border border-gray-300 dark:border-gray-600";
    }
  };

  // ✅ IMPORTANTE: Modal debe estar dentro del DOM
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl w-full max-w-3xl my-8">
        {/* Encabezado */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-800 dark:to-blue-900 text-white p-6 flex justify-between items-center rounded-t-lg">
          <div>
            <h1 className="text-2xl font-bold">{member.name}</h1>
            <p className="text-blue-50 text-sm mt-1">
              {member.isActive == true ? "🟢 Activo" : "🔴 Inactivo"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-blue-800 dark:hover:bg-blue-700 px-4 py-2 rounded-lg transition text-2xl leading-none"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <button
            onClick={() => setActiveTab("info")}
            className={`flex-1 px-6 py-3 font-semibold transition ${
              activeTab === "info"
                ? "border-b-2 border-blue-600 text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-900"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300"
            }`}
          >
            👤 Información
          </button>
          <button
            onClick={() => setActiveTab("enrollments")}
            className={`flex-1 px-6 py-3 font-semibold transition ${
              activeTab === "enrollments"
                ? "border-b-2 border-blue-600 text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-900"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300"
            }`}
          >
            📋 Inscripciones ({enrollments.length})
          </button>
        </div>

        {/* Contenido */}
        <div className="p-6 max-h-[60vh] overflow-y-auto dark:text-gray-100">
          {/* TAB: Información Personal */}
          {activeTab === "info" && (
            <div>
              <div className="grid grid-cols-2 gap-6">
                {/* Nombre */}
                <div className="border-l-4 border-blue-600 pl-4">
                  <label className="text-gray-600 dark:text-gray-400 text-sm font-semibold">
                    Nombre
                  </label>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {member.name}
                  </p>
                </div>

                {/* Email */}
                <div className="border-l-4 border-blue-600 pl-4">
                  <label className="text-gray-600 dark:text-gray-400 text-sm font-semibold">
                    Email
                  </label>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {member.email}
                  </p>
                </div>

                {/* Teléfono */}
                <div className="border-l-4 border-green-600 pl-4">
                  <label className="text-gray-600 dark:text-gray-400 text-sm font-semibold">
                    Teléfono
                  </label>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {member.phone || "—"}
                  </p>
                </div>

                {/* Dirección */}
                <div className="border-l-4 border-green-600 pl-4">
                  <label className="text-gray-600 dark:text-gray-400 text-sm font-semibold">
                    Dirección
                  </label>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {member.address || "—"}
                  </p>
                </div>

                {/* Líder */}
                <div className="border-l-4 border-yellow-600 pl-4">
                  <label className="text-gray-600 dark:text-gray-400 text-sm font-semibold">
                    Líder
                  </label>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {member.leader?.name || "—"}
                  </p>
                </div>

                {/* Distrito */}
                <div className="border-l-4 border-yellow-600 pl-4">
                  <label className="text-gray-600 dark:text-gray-400 text-sm font-semibold">
                    Distrito
                  </label>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {member.district || "—"}
                  </p>
                </div>

                {/* Estado Laboral */}
                <div className="border-l-4 border-orange-600 pl-4">
                  <label className="text-gray-600 dark:text-gray-400 text-sm font-semibold">
                    Estado Laboral
                  </label>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {member.employmentStatus || "—"}
                  </p>
                </div>

                {/* Profesión */}
                <div className="border-l-4 border-orange-600 pl-4">
                  <label className="text-gray-600 dark:text-gray-400 text-sm font-semibold">
                    Profesión
                  </label>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {member.profession || "—"}
                  </p>
                </div>

                {/* Estado Civil */}
                <div className="border-l-4 border-pink-600 pl-4">
                  <label className="text-gray-600 dark:text-gray-400 text-sm font-semibold">
                    Estado Civil
                  </label>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {member.maritalStatus || "—"}
                  </p>
                </div>

                {/* Fecha de Nacimiento */}
                <div className="border-l-4 border-pink-600 pl-4">
                  <label className="text-gray-600 dark:text-gray-400 text-sm font-semibold">
                    Fecha de Nacimiento
                  </label>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {member.birthdate || "—"}
                  </p>
                </div>

                {/* Nivel Actual */}
                <div className="border-l-4 border-purple-600 pl-4">
                  <label className="text-gray-600 dark:text-gray-400 text-sm font-semibold">
                    Nivel Actual
                  </label>
                  <p className="text-lg font-semibold">
                    <span className="inline-block bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 px-4 py-2 rounded-full mt-1 border border-blue-300 dark:border-blue-600">
                      {member.currentLevel || "Sin nivel asignado"}
                    </span>
                  </p>
                </div>

                {/* Fecha de Registro */}
                <div className="border-l-4 border-purple-600 pl-4">
                  <label className="text-gray-600 dark:text-gray-400 text-sm font-semibold">
                    Fecha de Registro
                  </label>
                  <p className="text-lg font-semibold">
                    <span className="inline-block bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 px-4 py-2 rounded-full mt-1 border border-blue-300 dark:border-blue-600">
                      {member.registrationDate || "Sin datos"}
                    </span>
                  </p>
                </div>
              </div>

              {/* BOTONES DE ACCIONES - Solo si canEdit es true */}
              {canEdit && (
                <div className="mt-8 pt-6 border-t dark:border-gray-700 flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => {
                      onEdit(member);
                      onClose();
                    }}
                    className="flex-1 bg-yellow-500 hover:bg-yellow-600 dark:bg-yellow-600 dark:hover:bg-yellow-700 text-white px-4 py-3 rounded-lg font-semibold transition flex items-center justify-center gap-2 min-h-10"
                    title="Editar miembro"
                  >
                    ✏️ Editar
                  </button>
                  <button
                    onClick={() => {
                      onViewEnrollment(member.id, member.name);
                      onClose();
                    }}
                    className="flex-1 bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700 text-white px-4 py-3 rounded-lg font-semibold transition flex items-center justify-center gap-2 min-h-10"
                    title="Ver historial de inscripciones"
                  >
                    📋 Historial
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm("¿Estás seguro de eliminar este miembro?")) {
                        onDelete(member.id);
                      }
                    }}
                    className="flex-1 bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 text-white px-4 py-3 rounded-lg font-semibold transition flex items-center justify-center gap-2 min-h-10"
                    title="Eliminar miembro"
                  >
                    ❌ Eliminar
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB: Inscripciones */}
          {activeTab === "enrollments" && (
            <div>
              {/* Lista de inscripciones */}
              {loading ? (
                <div className="text-center py-8 text-gray-600 dark:text-gray-400">
                  ⏳ Cargando inscripciones...
                </div>
              ) : enrollments.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  <p className="text-gray-500 dark:text-gray-400">📭 Sin inscripciones actuales</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {enrollments.map((enrollment) => (
                    <div
                      key={enrollment.id}
                      className="border-2 dark:border-gray-700 rounded-lg p-4 hover:shadow-lg dark:hover:shadow-gray-900/50 transition bg-white dark:bg-gray-800"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-bold text-lg text-gray-900 dark:text-white">
                            {enrollment?.cohortName ||
                              "Cohorte sin nombre"}
                          </h4>
                          <p className="text-gray-600 dark:text-gray-400 text-sm">
                            Nivel:{" "}
                            {enrollment.enrollment?.level?.displayName ||
                              enrollment.enrollment?.level ||
                              "N/A"}
                          </p>
                        </div>
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(
                            enrollment.status
                          )}`}
                        >
                          {enrollment.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-4 text-sm mb-4 bg-gray-50 dark:bg-gray-700/50 p-3 rounded border border-gray-200 dark:border-gray-600">
                        <div>
                          <p className="text-gray-600 dark:text-gray-400 font-semibold">
                            Asistencia
                          </p>
                          <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                            {enrollment.finalAttendancePercentage
                              ? `${(
                                  (enrollment.finalAttendancePercentage * 100) /
                                  100
                                ).toFixed(1)}%`
                              : "En curso"}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600 dark:text-gray-400 font-semibold">
                            Aprobado
                          </p>
                          <p className="text-lg font-bold text-gray-900 dark:text-white">
                            {enrollment.passed === null
                              ? "—"
                              : enrollment.passed
                              ? "✅"
                              : "❌"}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600 dark:text-gray-400 font-semibold">
                            Inscripción
                          </p>
                          <p className="text-xs text-gray-900 dark:text-gray-300">
                            {new Date(
                              enrollment.enrollmentDate
                            ).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleViewEnrollmentDetail(enrollment)}
                          className="flex-1 bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white px-3 py-2 rounded text-sm transition font-semibold"
                        >
                          📊 Ver Detalle
                        </button>

                        {enrollment.status !== "COMPLETED" &&
                          enrollment.status !== "CANCELLED" && (
                            <button
                              onClick={() => handleWithdraw(enrollment.id)}
                              className="flex-1 bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 text-white px-3 py-2 rounded text-sm transition font-semibold"
                            >
                              🗑️ Dar de Baja
                            </button>
                          )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB: Detalle de Inscripción */}
          {activeTab === "enrollmentDetail" && enrollmentDetail && (
            <div>
              <button
                onClick={() => {
                  setActiveTab("enrollments");
                  setEnrollmentDetail(null);
                }}
                className="mb-4 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-semibold text-sm"
              >
                ← Volver a Inscripciones
              </button>

              <div className="space-y-6">
                {/* Resumen */}
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 border-l-4 border-blue-600 dark:border-blue-500 border-r dark:border-r-gray-700 border-t dark:border-t-gray-700 border-b dark:border-b-gray-700">
                  <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
                    📊 Resumen del Curso
                  </h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-gray-600 dark:text-gray-400 text-sm font-semibold">
                        Cohorte
                      </p>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {enrollmentDetail.cohortName}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600 dark:text-gray-400 text-sm font-semibold">
                        Nivel Actual
                      </p>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {enrollmentDetail.currentLevel}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600 dark:text-gray-400 text-sm font-semibold">
                        Asistencia
                      </p>
                      <p className="font-semibold text-green-600 dark:text-green-400">
                        {enrollmentDetail.attendancePercentage?.toFixed(1) || 0}
                        %
                      </p>
                    </div>
                  </div>
                </div>

                {/* Lecciones */}
                {!enrollmentDetail.lessons ||
                enrollmentDetail.lessons.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
                    <p className="text-gray-500 dark:text-gray-400">
                      📭 Sin lecciones registradas
                    </p>
                  </div>
                ) : (
                  <div>
                    <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">
                      📚 Lecciones ({enrollmentDetail.lessons.length})
                    </h3>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {enrollmentDetail.lessons.map((lesson, idx) => (
                        <div
                          key={idx}
                          className="border dark:border-gray-700 rounded-lg p-3 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-700 transition bg-white dark:bg-gray-800"
                        >
                          <div>
                            <p className="font-semibold text-gray-900 dark:text-white">
                              Lección {lesson.lessonNumber || idx + 1}:{" "}
                              {lesson.lessonName ||
                                lesson.title ||
                                "Sin nombre"}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {lesson.lessonDate
                                ? new Date(
                                    lesson.lessonDate
                                  ).toLocaleDateString()
                                : lesson.date
                                ? new Date(lesson.date).toLocaleDateString()
                                : "Fecha desconocida"}
                            </p>
                          </div>
                          <div className="flex gap-4 text-sm">
                            <span
                              className={`px-3 py-1 rounded font-semibold border ${
                                lesson.attended
                                  ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-300 dark:border-green-600"
                                  : "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-300 dark:border-red-600"
                              }`}
                            >
                              {lesson.attended ? "✅ Asistió" : "❌ Ausente"}
                            </span>
                            {lesson.score && (
                              <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-3 py-1 rounded font-semibold border border-blue-300 dark:border-blue-600">
                                {lesson.score}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Mensajes de error */}
          {error && (
            <div className="mt-4 bg-red-100 dark:bg-red-900/30 border-l-4 border-red-600 dark:border-red-500 text-red-700 dark:text-red-300 px-4 py-3 rounded">
              ❌ {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MemberDetailModal;