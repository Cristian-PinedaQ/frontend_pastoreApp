// 📋 EnrollmentHistoryModal.jsx - Modal estilizado para historial de inscripciones
import React from 'react';

export const EnrollmentHistoryModal = ({ 
  isOpen = false, 
  history = [], 
  memberName = "",
  onClose = () => {} 
}) => {
  if (!isOpen) return null;

  // ✅ Función para obtener color de estado
  const getStatusColor = (status) => {
    switch (status?.toUpperCase()) {
      case 'ACTIVE':
        return { bg: 'bg-green-100', text: 'text-green-800', badge: '🟢' };
      case 'COMPLETED':
        return { bg: 'bg-blue-100', text: 'text-blue-800', badge: '✅' };
      case 'CANCELLED':
        return { bg: 'bg-red-100', text: 'text-red-800', badge: '❌' };
      case 'PENDING':
        return { bg: 'bg-yellow-100', text: 'text-yellow-800', badge: '⏳' };
      default:
        return { bg: 'bg-gray-100', text: 'text-gray-800', badge: '❓' };
    }
  };

  return (
    <>
      {/* Overlay oscuro */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40 animate-fade-in"
        onClick={onClose}
      ></div>

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-scale-in">
        <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          {/* Encabezado */}
          <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-800 text-white p-6 flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">📋 Historial de Inscripciones</h2>
              <p className="text-blue-100 mt-1">{memberName}</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition text-2xl"
              title="Cerrar"
            >
              ✕
            </button>
          </div>

          {/* Contenido */}
          <div className="p-6">
            {history.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 text-lg">📭 No hay inscripciones registradas</p>
              </div>
            ) : (
              <div className="space-y-4">
                {history.map((enrollment, index) => {
                  const statusColor = getStatusColor(enrollment.status);
                  const attendancePercentage = enrollment.attendancePercentage 
                    ? (typeof enrollment.attendancePercentage === 'string' 
                      ? enrollment.attendancePercentage 
                      : `${Math.round(enrollment.attendancePercentage * 100/100)}%`)
                    : 'En curso';

                  return (
                    <div
                      key={index}
                      className="border-l-4 border-blue-500 bg-gradient-to-r from-blue-50 to-white rounded-lg p-5 hover:shadow-md transition"
                    >
                      {/* Encabezado de la tarjeta */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-bold text-gray-900">
                              📚 Nivel: {enrollment.level || 'N/A'}
                            </h3>
                            <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${statusColor.bg} ${statusColor.text}`}>
                              {statusColor.badge} {enrollment.status || 'Desconocido'}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600">
                            🗂️ Cohorte: <span className="font-semibold text-gray-900">{enrollment.cohort || 'N/A'}</span>
                          </p>
                        </div>
                      </div>

                      {/* Detalles */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-200">
                        {/* Fecha de Inscripción */}
                        <div className="flex items-center gap-2">
                          <span className="text-xl">📅</span>
                          <div>
                            <p className="text-xs text-gray-600">Fecha de Inscripción</p>
                            <p className="text-sm font-semibold text-gray-900">
                              {enrollment.enrollmentDate 
                                ? new Date(enrollment.enrollmentDate).toLocaleDateString('es-ES', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                  })
                                : 'N/A'
                              }
                            </p>
                          </div>
                        </div>

                        {/* Asistencia */}
                        <div className="flex items-center gap-2">
                          <span className="text-xl">✅</span>
                          <div>
                            <p className="text-xs text-gray-600">Asistencia</p>
                            <p className="text-sm font-semibold text-gray-900">
                              {attendancePercentage}
                            </p>
                          </div>
                        </div>

                        {/* Resultado */}
                        <div className="flex items-center gap-2">
                          <span className="text-xl">
                            {enrollment.passed === true ? '🏆' : enrollment.passed === false ? '📚' : '❓'}
                          </span>
                          <div>
                            <p className="text-xs text-gray-600">Resultado</p>
                            <p className="text-sm font-semibold text-gray-900">
                              {enrollment.passed === true 
                                ? '✅ Aprobado'
                                : enrollment.passed === false 
                                ? '🔄 Pendiente'
                                : 'Sin calificar'
                              }
                            </p>
                          </div>
                        </div>

                        {/* Estado Actual */}
                        <div className="flex items-center gap-2">
                          <span className="text-xl">📊</span>
                          <div>
                            <p className="text-xs text-gray-600">Duración</p>
                            <p className="text-sm font-semibold text-gray-900">
                              {enrollment.status === 'COMPLETED' ? 'Completado' : 'En progreso'}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Barra de Progreso de Asistencia */}
                      {attendancePercentage !== 'En curso' && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs font-semibold text-gray-700">Progreso de Asistencia</span>
                            <span className="text-xs font-bold text-blue-600">{attendancePercentage}</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all ${
                                attendancePercentage.includes('100')
                                  ? 'bg-green-500'
                                  : attendancePercentage.includes('75')
                                  ? 'bg-blue-500'
                                  : attendancePercentage.includes('50')
                                  ? 'bg-yellow-500'
                                  : 'bg-red-500'
                              }`}
                              style={{
                                width: attendancePercentage.replace('%', '') || '0',
                              }}
                            ></div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 border-t flex justify-between items-center">
            <p className="text-sm text-gray-600">
              Total de inscripciones: <span className="font-bold text-gray-900">{history.length}</span>
            </p>
            <button
              onClick={onClose}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition font-semibold"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default EnrollmentHistoryModal;
