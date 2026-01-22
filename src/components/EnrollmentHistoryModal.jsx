// 📋 EnrollmentHistoryModal.jsx - v2 CON MODO OSCURO COMPLETO
// Modal estilizado para historial de inscripciones con soporte automático de dark mode

import React, { useEffect, useState } from 'react';

export const EnrollmentHistoryModal = ({
  isOpen = false,
  history = [],
  memberName = "",
  onClose = () => { }
}) => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Detectar modo oscuro al montar el componente
  useEffect(() => {
    // Verificar preferencia del sistema
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    // Verificar si hay un toggle manual
    const savedMode = localStorage.getItem('darkMode');
    const htmlHasDarkClass = document.documentElement.classList.contains('dark-mode');
    
    setIsDarkMode(
      savedMode === 'true' || htmlHasDarkClass || prefersDark
    );

    // Escuchar cambios en el HTML
    const observer = new MutationObserver(() => {
      setIsDarkMode(document.documentElement.classList.contains('dark-mode'));
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    // Escuchar cambios de preferencia del sistema
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

  if (!isOpen) return null;

  // ✅ Función para obtener color de estado
  const getStatusColor = (status) => {
    const baseClasses = {
      active: {
        bg: isDarkMode ? 'bg-green-900/30' : 'bg-green-100',
        text: isDarkMode ? 'text-green-400' : 'text-green-800',
        badge: '🟢',
        border: isDarkMode ? 'border-green-500/50' : 'border-green-300'
      },
      completed: {
        bg: isDarkMode ? 'bg-blue-900/30' : 'bg-blue-100',
        text: isDarkMode ? 'text-blue-400' : 'text-blue-800',
        badge: '✅',
        border: isDarkMode ? 'border-blue-500/50' : 'border-blue-300'
      },
      cancelled: {
        bg: isDarkMode ? 'bg-red-900/30' : 'bg-red-100',
        text: isDarkMode ? 'text-red-400' : 'text-red-800',
        badge: '❌',
        border: isDarkMode ? 'border-red-500/50' : 'border-red-300'
      },
      pending: {
        bg: isDarkMode ? 'bg-yellow-900/30' : 'bg-yellow-100',
        text: isDarkMode ? 'text-yellow-400' : 'text-yellow-800',
        badge: '⏳',
        border: isDarkMode ? 'border-yellow-500/50' : 'border-yellow-300'
      },
      default: {
        bg: isDarkMode ? 'bg-gray-700/30' : 'bg-gray-100',
        text: isDarkMode ? 'text-gray-400' : 'text-gray-800',
        badge: '❓',
        border: isDarkMode ? 'border-gray-500/50' : 'border-gray-300'
      }
    };

    switch (status?.toUpperCase()) {
      case 'ACTIVE':
        return baseClasses.active;
      case 'COMPLETED':
        return baseClasses.completed;
      case 'CANCELLED':
        return baseClasses.cancelled;
      case 'PENDING':
        return baseClasses.pending;
      default:
        return baseClasses.default;
    }
  };

  // Clases dinámicas basadas en modo oscuro
  const bgModal = isDarkMode ? 'bg-slate-900' : 'bg-white';
  const bgOverlay = isDarkMode ? 'bg-gray-950/70' : 'bg-black';
  const textPrimary = isDarkMode ? 'text-slate-100' : 'text-gray-900';
  const textSecondary = isDarkMode ? 'text-slate-400' : 'text-gray-600';
  const borderColor = isDarkMode ? 'border-slate-700' : 'border-gray-200';
  const bgGradient = isDarkMode
    ? 'bg-gradient-to-r from-blue-900 to-blue-950'
    : 'bg-gradient-to-r from-blue-600 to-blue-800';
  const bgCard = isDarkMode
    ? 'bg-gradient-to-r from-slate-800 to-slate-900'
    : 'bg-gradient-to-r from-blue-50 to-white';
  const bgCardHover = isDarkMode ? 'hover:shadow-lg hover:shadow-blue-500/20' : 'hover:shadow-md';
  const bgFooter = isDarkMode ? 'bg-slate-800' : 'bg-gray-50';
  const bgEmptyState = isDarkMode ? 'bg-slate-800/50' : 'bg-gray-50';
  const textEmpty = isDarkMode ? 'text-slate-400' : 'text-gray-500';
  const bgButton = isDarkMode ? 'bg-blue-700 hover:bg-blue-600' : 'bg-blue-600 hover:bg-blue-700';
  const bgButtonSecondary = isDarkMode ? 'bg-slate-700 hover:bg-slate-600' : 'bg-gray-200 hover:bg-gray-300';
  const textButtonSecondary = isDarkMode ? 'text-slate-100' : 'text-gray-700';

  return (
    <>
      {/* Overlay oscuro */}
      <div
        className={`fixed inset-0 ${bgOverlay} z-40 animate-fade-in transition-colors duration-300`}
        onClick={onClose}
      ></div>

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-scale-in">
        <div className={`${bgModal} rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto transition-colors duration-300`}>
          {/* Encabezado */}
          <div className={`sticky top-0 ${bgGradient} text-white p-6 flex justify-between items-center transition-all duration-300`}>
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
          <div className={`p-6 transition-colors duration-300`}>
            {history.length === 0 ? (
              <div className={`${bgEmptyState} text-center py-8 rounded-lg transition-colors duration-300`}>
                <p className={`${textEmpty} text-lg transition-colors duration-300`}>📭 No hay inscripciones registradas</p>
              </div>
            ) : (
              <div className="space-y-4">
                {history.map((enrollment, index) => {
                  const statusColor = getStatusColor(enrollment.status);
                  const attendancePercentage = enrollment.attendancePercentage
                    ? (typeof enrollment.attendancePercentage === 'string'
                      ? enrollment.attendancePercentage
                      : `${Math.round(enrollment.attendancePercentage * 100 / 100)}%`)
                    : 'En curso';

                  return (
                    <div
                      key={index}
                      className={`border-l-4 ${statusColor.border} ${bgCard} rounded-lg p-5 ${bgCardHover} transition-all duration-300`}
                    >
                      {/* Encabezado de la tarjeta */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2 flex-wrap">
                            <h3 className={`text-lg font-bold ${textPrimary} transition-colors duration-300`}>
                              📚 Nivel: {enrollment.level || 'N/A'}
                            </h3>
                            <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${statusColor.bg} ${statusColor.text} border transition-all duration-300`}>
                              {statusColor.badge} {enrollment.status || 'Desconocido'}
                            </span>
                          </div>
                          <p className={`text-sm ${textSecondary} transition-colors duration-300`}>
                            🗂️ Cohorte: <span className={`font-semibold ${textPrimary} transition-colors duration-300`}>{enrollment.cohort || 'N/A'}</span>
                          </p>
                        </div>
                      </div>

                      {/* Detalles */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-4 border-t border-opacity-20 transition-colors duration-300" style={{ borderColor: isDarkMode ? '#334155' : '#e5e7eb' }}>
                        {/* Fecha de Inscripción */}
                        <div className="flex items-center gap-2">
                          <span className="text-xl">📅</span>
                          <div>
                            <p className={`text-xs ${textSecondary} transition-colors duration-300`}>Fecha de Inscripción</p>
                            <p className={`text-sm font-semibold ${textPrimary} transition-colors duration-300`}>
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
                            <p className={`text-xs ${textSecondary} transition-colors duration-300`}>Asistencia</p>
                            <p className={`text-sm font-semibold ${textPrimary} transition-colors duration-300`}>
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
                            <p className={`text-xs ${textSecondary} transition-colors duration-300`}>Resultado</p>
                            <p className={`text-sm font-semibold ${textPrimary} transition-colors duration-300`}>
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
                            <p className={`text-xs ${textSecondary} transition-colors duration-300`}>Duración</p>
                            <p className={`text-sm font-semibold ${textPrimary} transition-colors duration-300`}>
                              {enrollment.status === 'COMPLETED' ? 'Completado' : 'En progreso'}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Barra de Progreso de Asistencia */}
                      {attendancePercentage !== 'En curso' && (
                        <div className="mt-4 pt-4 border-t border-opacity-20 transition-colors duration-300" style={{ borderColor: isDarkMode ? '#334155' : '#e5e7eb' }}>
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`text-xs font-semibold ${isDarkMode ? 'text-slate-400' : 'text-gray-700'} transition-colors duration-300`}>Progreso de Asistencia</span>
                            <span className={`text-xs font-bold ${isDarkMode ? 'text-blue-400' : 'text-blue-600'} transition-colors duration-300`}>{attendancePercentage}</span>
                          </div>
                          <div className={`w-full ${isDarkMode ? 'bg-slate-700' : 'bg-gray-200'} rounded-full h-2 transition-colors duration-300`}>
                            <div
                              className={`h-2 rounded-full transition-all ${attendancePercentage.includes('100')
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
          <div className={`${bgFooter} px-6 py-4 border-t ${borderColor} flex justify-between items-center transition-colors duration-300`}>
            <p className={`text-sm ${textSecondary} transition-colors duration-300`}>
              Total de inscripciones: <span className={`font-bold ${textPrimary} transition-colors duration-300`}>{history.length}</span>
            </p>
            <button
              onClick={onClose}
              className={`${bgButton} text-white px-6 py-2 rounded-lg transition-all duration-300 font-semibold`}
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