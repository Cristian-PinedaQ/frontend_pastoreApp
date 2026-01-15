// 📋 MemberDetailModal.jsx - Vista detallada de miembro e inscripciones
// ✅ Versión mejorada y más robusta
import React, { useState, useEffect } from "react";
import apiService from "../apiService";

export const MemberDetailModal = ({ member, onClose, onUpdated }) => {
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
        return "bg-green-100 text-green-800";
      case "COMPLETED":
        return "bg-blue-100 text-blue-800";
      case "CANCELLED":
        return "bg-red-100 text-red-800";
      case "PENDING":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // ✅ IMPORTANTE: Modal debe estar dentro del DOM
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-3xl my-8">
        {/* Encabezado */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 flex justify-between items-center rounded-t-lg">
          <div>
            <h1 className="text-2xl font-bold">{member.name}</h1>
            <p className="text-blue-50 text-sm mt-1">
              {member.isActive == true ? "🟢 Activo" : "🔴 inactivo"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-blue-800 px-4 py-2 rounded-lg transition text-2xl leading-none"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b bg-gray-50">
          <button
            onClick={() => setActiveTab("info")}
            className={`flex-1 px-6 py-3 font-semibold transition ${
              activeTab === "info"
                ? "border-b-2 border-blue-600 text-blue-600 bg-white"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            👤 Información
          </button>
          <button
            onClick={() => setActiveTab("enrollments")}
            className={`flex-1 px-6 py-3 font-semibold transition ${
              activeTab === "enrollments"
                ? "border-b-2 border-blue-600 text-blue-600 bg-white"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            📋 Inscripciones ({enrollments.length})
          </button>
        </div>

        {/* Contenido */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {/* TAB: Información Personal */}
          {activeTab === "info" && (
            <div>
              <div className="grid grid-cols-2 gap-6">
                <div className="border-l-4 border-blue-600 pl-4">
                  <label className="text-gray-600 text-sm font-semibold">
                    Nombre
                  </label>
                  <p className="text-lg font-semibold text-gray-900">
                    {member.name}
                  </p>
                </div>
                <div className="border-l-4 border-blue-600 pl-4">
                  <label className="text-gray-600 text-sm font-semibold">
                    Email
                  </label>
                  <p className="text-lg font-semibold text-gray-900">
                    {member.email}
                  </p>
                </div>
                <div className="border-l-4 border-green-600 pl-4">
                  <label className="text-gray-600 text-sm font-semibold">
                    Teléfono
                  </label>
                  <p className="text-lg font-semibold text-gray-900">
                    {member.phone || "—"}
                  </p>
                </div>
                <div className="border-l-4 border-green-600 pl-4">
                  <label className="text-gray-600 text-sm font-semibold">
                    Dirección
                  </label>
                  <p className="text-lg font-semibold text-gray-900">
                    {member.address || "—"}
                  </p>
                </div>
                <div className="border-l-4 border-yellow-600 pl-4">
                  <label className="text-gray-600 text-sm font-semibold">
                    Lider
                  </label>
                  <p className="text-lg font-semibold text-gray-900">
                    {member.leader?.name || "—"}
                  </p>
                </div>
                <div className="border-l-4 border-yellow-600 pl-4">
                  <label className="text-gray-600 text-sm font-semibold">
                    Distrito
                  </label>
                  <p className="text-lg font-semibold text-gray-900">
                    {member.district || "—"}
                  </p>
                </div>
                <div className="border-l-4 border-orange-600 pl-4">
                  <label className="text-gray-600 text-sm font-semibold">
                    Estado Laboral
                  </label>
                  <p className="text-lg font-semibold text-gray-900">
                    {member.employmentStatus || "—"}
                  </p>
                </div>
                <div className="border-l-4 border-orange-600 pl-4">
                  <label className="text-gray-600 text-sm font-semibold">
                    Profesion
                  </label>
                  <p className="text-lg font-semibold text-gray-900">
                    {member.profession || "—"}
                  </p>
                </div>
                <div className="border-l-4 border-pink-600 pl-4">
                  <label className="text-gray-600 text-sm font-semibold">
                    Estado Civil
                  </label>
                  <p className="text-lg font-semibold text-gray-900">
                    {member.maritalStatus || "—"}
                  </p>
                </div>
                <div className="border-l-4 border-pink-600 pl-4">
                  <label className="text-gray-600 text-sm font-semibold">
                    fecha de nacimiento
                  </label>
                  <p className="text-lg font-semibold text-gray-900">
                    {member.birthdate || "—"}
                  </p>
                </div>
                <div className="border-l-4 border-purple-600 pl-4">
                  <label className="text-gray-600 text-sm font-semibold">
                    Nivel Actual
                  </label>
                  <p className="text-lg font-semibold">
                    <span className="inline-block bg-blue-100 text-blue-800 px-4 py-2 rounded-full mt-1">
                      {member.currentLevel || "Sin nivel asignado"}
                    </span>
                  </p>
                </div>
                <div className="border-l-4 border-purple-600 pl-4">
                  <label className="text-gray-600 text-sm font-semibold">
                    Fecha de registro
                  </label>
                  <p className="text-lg font-semibold">
                    <span className="inline-block bg-blue-100 text-blue-800 px-4 py-2 rounded-full mt-1">
                      {member.registrationDate || "Sin nivel asignado"}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB: Inscripciones */}
          {activeTab === "enrollments" && (
            <div>
              {/* Lista de inscripciones */}
              {loading ? (
                <div className="text-center py-8">
                  ⏳ Cargando inscripciones...
                </div>
              ) : enrollments.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <p className="text-gray-500">📭 Sin inscripciones actuales</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {enrollments.map((enrollment) => (
                    <div
                      key={enrollment.id}
                      className="border-2 rounded-lg p-4 hover:shadow-lg transition"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-bold text-lg">
                            {enrollment?.cohortName ||
                              "Cohorte sin nombre"}
                          </h4>
                          <p className="text-gray-600 text-sm">
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

                      <div className="grid grid-cols-3 gap-4 text-sm mb-4 bg-gray-50 p-3 rounded">
                        <div>
                          <p className="text-gray-600 font-semibold">
                            Asistencia
                          </p>
                          <p className="text-lg font-bold text-blue-600">
                            {enrollment.finalAttendancePercentage
                              ? `${(
                                  (enrollment.finalAttendancePercentage * 100) /
                                  100
                                ).toFixed(1)}%`
                              : "En curso"}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600 font-semibold">
                            Aprobado
                          </p>
                          <p className="text-lg font-bold">
                            {enrollment.passed === null
                              ? "—"
                              : enrollment.passed
                              ? "✅"
                              : "❌"}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600 font-semibold">
                            Inscripción
                          </p>
                          <p className="text-xs">
                            {new Date(
                              enrollment.enrollmentDate
                            ).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleViewEnrollmentDetail(enrollment)}
                          className="flex-1 bg-blue-500 text-white px-3 py-2 rounded text-sm hover:bg-blue-600 transition font-semibold"
                        >
                          📊 Ver Detalle
                        </button>

                        {enrollment.status !== "COMPLETED" &&
                          enrollment.status !== "CANCELLED" && (
                            <button
                              onClick={() => handleWithdraw(enrollment.id)}
                              className="flex-1 bg-red-500 text-white px-3 py-2 rounded text-sm hover:bg-red-600 transition font-semibold"
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
                className="mb-4 text-blue-600 hover:text-blue-800 font-semibold text-sm"
              >
                ← Volver a Inscripciones
              </button>

              <div className="space-y-6">
                {/* Resumen */}
                <div className="bg-blue-50 rounded-lg p-6 border-l-4 border-blue-600">
                  <h3 className="text-xl font-bold mb-4">
                    📊 Resumen del Curso
                  </h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-gray-600 text-sm font-semibold">
                        Cohorte
                      </p>
                      <p className="font-semibold">
                        {enrollmentDetail.cohortName}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600 text-sm font-semibold">
                        Nivel Actual
                      </p>
                      <p className="font-semibold">
                        {enrollmentDetail.currentLevel}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600 text-sm font-semibold">
                        Asistencia
                      </p>
                      <p className="font-semibold text-green-600">
                        {enrollmentDetail.attendancePercentage?.toFixed(1) || 0}
                        %
                      </p>
                    </div>
                  </div>
                </div>

                {/* Lecciones */}
                {!enrollmentDetail.lessons ||
                enrollmentDetail.lessons.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                    <p className="text-gray-500">
                      📭 Sin lecciones registradas
                    </p>
                  </div>
                ) : (
                  <div>
                    <h3 className="text-lg font-bold mb-4">
                      📚 Lecciones ({enrollmentDetail.lessons.length})
                    </h3>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {enrollmentDetail.lessons.map((lesson, idx) => (
                        <div
                          key={idx}
                          className="border rounded-lg p-3 flex justify-between items-center hover:bg-gray-50"
                        >
                          <div>
                            <p className="font-semibold">
                              Lección {lesson.lessonNumber || idx + 1}:{" "}
                              {lesson.lessonName ||
                                lesson.title ||
                                "Sin nombre"}
                            </p>
                            <p className="text-sm text-gray-600">
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
                              className={`px-3 py-1 rounded font-semibold ${
                                lesson.attended
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {lesson.attended ? "✅ Asistió" : "❌ Ausente"}
                            </span>
                            {lesson.score && (
                              <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded font-semibold">
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
            <div className="mt-4 bg-red-100 border-l-4 border-red-600 text-red-700 px-4 py-3 rounded">
              ❌ {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MemberDetailModal;
