// ✅ ModalLessonAttendanceDetail.jsx - CON DARK MODE Y SELECTOR DE PARTICIPACIÓN
// Modal para ver asistencias por lección con tabla intuitiva

import React, { useState, useEffect } from 'react';
import apiService from '../apiService';

const ModalLessonAttendanceDetail = ({ 
  isOpen, 
  onClose, 
  lesson, 
  enrollment,
  onAttendanceRecorded 
}) => {
  const [attendances, setAttendances] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [recordingId, setRecordingId] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  // Estados para participación
  const [participationScores, setParticipationScores] = useState({});
  const [showParticipationSelect, setShowParticipationSelect] = useState({});

  // ========== DARK MODE ==========
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
  const theme = {
    bg: isDarkMode ? '#0f172a' : '#ffffff',
    bgSecondary: isDarkMode ? '#1e293b' : '#f9fafb',
    bgLight: isDarkMode ? '#1a2332' : '#f8f9fa',
    text: isDarkMode ? '#f1f5f9' : '#1f2937',
    textSecondary: isDarkMode ? '#cbd5e1' : '#6b7280',
    textTertiary: isDarkMode ? '#94a3b8' : '#9ca3af',
    border: isDarkMode ? '#334155' : '#e5e7eb',
    header: isDarkMode
      ? 'linear-gradient(135deg, #1e40af 0%, #059669 100%)'
      : 'linear-gradient(135deg, #2563eb 0%, #10b981 100%)',
    hover: isDarkMode ? '#334155' : '#f9fafb',
    success: isDarkMode ? '#064e3b' : '#d1fae5',
    successText: isDarkMode ? '#86efac' : '#065f46',
    warning: isDarkMode ? '#78350f' : '#fef3c7',
    warningText: isDarkMode ? '#fcd34d' : '#92400e',
    error: isDarkMode ? '#7f1d1d' : '#fee2e2',
    errorText: isDarkMode ? '#fca5a5' : '#991b1b',
    info: isDarkMode ? '#1e3a8a' : '#e0e7ff',
    infoText: isDarkMode ? '#93c5fd' : '#3730a3',
  };

  const PARTICIPATION_OPTIONS = [
    { value: 'NO_PARTICIPA', label: '🤐 No participa' },
    { value: 'POCA_PARTICIPACION', label: '👌 Poca participación' },
    { value: 'EXCELENTE_PARTICIPACION', label: '🌟 Excelente participación' },
  ];

  useEffect(() => {
    if (isOpen && lesson?.id && enrollment?.id) {
      loadData();
    }
  }, [isOpen, lesson?.id, enrollment?.id]);

  const loadData = async () => {
    setLoading(true);
    setError('');
    setParticipationScores({});
    setShowParticipationSelect({});

    try {
      let studentsData = [];
      try {
        studentsData = await apiService.getStudentEnrollmentsByEnrollment(enrollment.id);
      } catch (err) {
        try {
          const enrollmentData = await apiService.getEnrollmentById(enrollment.id);
          studentsData = enrollmentData?.studentEnrollments || [];
        } catch (err2) {
          setError('No se pudo cargar la lista de estudiantes');
        }
      }

      let attendancesData = [];
      try {
        attendancesData = await apiService.getAttendancesByLesson(lesson.id);
      } catch (err) {
        attendancesData = [];
      }

      setStudents(studentsData || []);
      setAttendances(attendancesData || []);

      if (studentsData?.length === 0) {
        setError('No hay estudiantes inscritos en esta cohorte');
      }
    } catch (err) {
      setError('Error al cargar la información de la lección: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStudentAttendance = (studentEnrollmentId) => {
    return attendances.find(a => a.studentEnrollmentId === studentEnrollmentId);
  };

  const handleParticipationChange = (studentEnrollmentId, value) => {
    setParticipationScores(prev => ({
      ...prev,
      [studentEnrollmentId]: value
    }));
  };

  const toggleParticipationSelect = (studentEnrollmentId) => {
    setShowParticipationSelect(prev => ({
      ...prev,
      [studentEnrollmentId]: !prev[studentEnrollmentId]
    }));
  };

  const handleQuickAttendance = async (studentEnrollmentId, studentName, present = true) => {
    try {
      setRecordingId(studentEnrollmentId);

      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      const recordedBy = userData.name || userData.username || 'Admin';

      const selectedScore = participationScores[studentEnrollmentId] || 'POCA_PARTICIPACION';

      const attendanceData = {
        studentEnrollmentId,
        lessonId: lesson.id,
        present,
        recordedBy,
        score: selectedScore
      };

      await apiService.recordAttendance(attendanceData);
      
      await loadData();
      
      if (onAttendanceRecorded) {
        onAttendanceRecorded();
      }
    } catch (err) {
      setError('Error al registrar la asistencia: ' + err.message);
    } finally {
      setRecordingId(null);
    }
  };

  if (!isOpen) return null;

  const presentCount = attendances.filter(a => a.present).length;
  const totalStudents = students.length;
  const attendancePercentage = totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : 0;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.7)' : 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px',
        animation: 'fadeIn 0.3s ease-in-out',
        transition: 'background-color 300ms ease-in-out',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: theme.bg,
          color: theme.text,
          borderRadius: '12px',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
          maxWidth: '1000px',
          width: '95%',
          maxHeight: '90vh',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          animation: 'slideInUp 0.3s ease-in-out',
          transition: 'all 300ms ease-in-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            background: theme.header,
            color: 'white',
            padding: '24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            borderRadius: '12px 12px 0 0',
            position: 'sticky',
            top: 0,
            zIndex: 10,
          }}
        >
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: '22px', fontWeight: 700, margin: 0 }}>
              📖 {lesson?.lessonName || 'Lección'}
            </h2>
            <p style={{
              fontSize: '13px',
              color: 'rgba(255, 255, 255, 0.9)',
              margin: '6px 0 0 0',
            }}>
              {lesson?.lessonDate && new Date(lesson.lessonDate).toLocaleDateString('es-CO')}
              {' • '}
              Cohorte: {enrollment?.cohortName || 'Sin cohorte'}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'white',
              fontSize: '24px',
              cursor: 'pointer',
              padding: 0,
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '6px',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'}
            onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
          >
            ✕
          </button>
        </div>

        {/* Stats */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '12px',
            padding: '16px 24px',
            backgroundColor: theme.bgLight,
            borderBottom: `1px solid ${theme.border}`,
            transition: 'all 300ms ease-in-out',
          }}
        >
          {[
            { label: 'Presentes', value: presentCount, color: '#10b981' },
            { label: 'Total', value: totalStudents, color: theme.text },
            { label: 'Porcentaje', value: `${attendancePercentage}%`, color: theme.text },
          ].map((stat, idx) => (
            <div
              key={idx}
              style={{
                backgroundColor: theme.bg,
                padding: '12px',
                borderRadius: '8px',
                border: `2px solid ${theme.border}`,
                textAlign: 'center',
                transition: 'all 300ms ease-in-out',
              }}
            >
              <p style={{
                margin: 0,
                fontSize: '12px',
                color: theme.textSecondary,
                fontWeight: 600,
              }}>
                {stat.label}
              </p>
              <p style={{
                margin: '4px 0 0 0',
                fontSize: '24px',
                fontWeight: 700,
                color: stat.color,
              }}>
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        {/* Progress Bar */}
        <div style={{ padding: '0 24px 16px', backgroundColor: theme.bg }}>
          <div
            style={{
              height: '8px',
              backgroundColor: theme.border,
              borderRadius: '4px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                background: 'linear-gradient(90deg, #2563eb, #10b981)',
                width: `${attendancePercentage}%`,
                transition: 'width 0.3s ease',
              }}
            />
          </div>
        </div>

        {/* Body */}
        <div
          style={{
            flex: 1,
            padding: 0,
            overflowY: 'auto',
            backgroundColor: theme.bg,
          }}
        >
          {error && (
            <div
              style={{
                backgroundColor: theme.error,
                color: theme.errorText,
                padding: '12px 24px',
                margin: '16px 24px',
                borderRadius: '8px',
                borderLeft: `4px solid ${isDarkMode ? '#dc2626' : '#ef4444'}`,
                fontSize: '14px',
              }}
            >
              ❌ {error}
            </div>
          )}

          {loading ? (
            <div
              style={{
                padding: '40px 24px',
                textAlign: 'center',
                color: theme.textSecondary,
              }}
            >
              ⏳ Cargando estudiantes y asistencias...
            </div>
          ) : students.length === 0 ? (
            <div
              style={{
                padding: '40px 24px',
                textAlign: 'center',
                color: theme.textSecondary,
              }}
            >
              <p>📚 No hay estudiantes inscritos en esta cohorte</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '14px',
                }}
              >
                <thead
                  style={{
                    backgroundColor: theme.bgSecondary,
                    position: 'sticky',
                    top: 0,
                    zIndex: 5,
                  }}
                >
                  <tr>
                    {['Estudiante', 'Estado', 'Participación', 'Acción'].map((header, idx) => (
                      <th
                        key={idx}
                        style={{
                          padding: '14px',
                          textAlign: 'left',
                          fontWeight: 600,
                          color: theme.text,
                          borderBottom: `2px solid ${theme.border}`,
                          transition: 'all 300ms ease-in-out',
                        }}
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => {
                    const att = getStudentAttendance(student.id);
                    const isRecording = recordingId === student.id;
                    const studentName = student.memberName || student.name || `Estudiante ${student.memberId || student.id}`;
                    const showParticipation = showParticipationSelect[student.id];
                    const selectedParticipation = participationScores[student.id];

                    return (
                      <tr
                        key={student.id}
                        style={{
                          backgroundColor: att
                            ? theme.success
                            : showParticipation
                            ? theme.warning
                            : 'transparent',
                          transition: 'background-color 200ms',
                          borderBottom: `1px solid ${theme.border}`,
                        }}
                        onMouseEnter={(e) => {
                          if (!att && !showParticipation) {
                            e.currentTarget.style.backgroundColor = theme.hover;
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!att && !showParticipation) {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          } else if (att) {
                            e.currentTarget.style.backgroundColor = theme.success;
                          } else if (showParticipation) {
                            e.currentTarget.style.backgroundColor = theme.warning;
                          }
                        }}
                      >
                        {/* Estudiante */}
                        <td
                          style={{
                            padding: '14px',
                            color: theme.text,
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '18px' }}>👤</span>
                            <span style={{ fontWeight: 500 }}>{studentName}</span>
                          </div>
                        </td>

                        {/* Estado */}
                        <td style={{ padding: '14px' }}>
                          {att ? (
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '6px 12px',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: 600,
                                backgroundColor: theme.successText === '#065f46' ? '#065f46' : '#d1fae5',
                                color: theme.successText === '#065f46' ? '#86efac' : '#065f46',
                              }}
                            >
                              {att.present ? '✅ Presente' : '❌ Ausente'}
                            </span>
                          ) : (
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '6px 12px',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: 600,
                                backgroundColor: theme.warningText === '#fcd34d' ? '#78350f' : '#fef3c7',
                                color: theme.warningText === '#fcd34d' ? '#fcd34d' : '#92400e',
                              }}
                            >
                              ⏳ Sin registrar
                            </span>
                          )}
                        </td>

                        {/* Participación */}
                        <td style={{ padding: '14px' }}>
                          {att ? (
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '6px 12px',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: 600,
                                backgroundColor: theme.info,
                                color: theme.infoText,
                              }}
                            >
                              {att.score === 'NO_PARTICIPA' && '🤐 No participa'}
                              {att.score === 'POCA_PARTICIPACION' && '👌 Poca'}
                              {att.score === 'EXCELENTE_PARTICIPACION' && '🌟 Excelente'}
                            </span>
                          ) : showParticipation ? (
                            <select
                              value={selectedParticipation || ''}
                              onChange={(e) => handleParticipationChange(student.id, e.target.value)}
                              style={{
                                padding: '6px 8px',
                                border: `1.5px solid #2563eb`,
                                borderRadius: '6px',
                                fontSize: '12px',
                                backgroundColor: theme.bg,
                                color: theme.text,
                                fontWeight: 500,
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                              }}
                              autoFocus
                            >
                              <option value="">Seleccionar...</option>
                              {PARTICIPATION_OPTIONS.map(opt => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span style={{ color: theme.textTertiary }}>-</span>
                          )}
                        </td>

                        {/* Acción */}
                        <td
                          style={{
                            padding: '14px',
                            textAlign: 'right',
                          }}
                        >
                          {att ? (
                            <span
                              style={{
                                fontSize: '12px',
                                color: '#059669',
                                fontWeight: 500,
                              }}
                            >
                              ✅ {att.recordedBy || 'Registrado'}
                            </span>
                          ) : showParticipation ? (
                            <button
                              onClick={() => handleQuickAttendance(student.id, studentName, true)}
                              disabled={isRecording || !selectedParticipation}
                              style={{
                                padding: '8px 12px',
                                background: selectedParticipation
                                  ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                                  : 'linear-gradient(135deg, #d1d5db 0%, #9ca3af 100%)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: 600,
                                cursor: isRecording || !selectedParticipation ? 'not-allowed' : 'pointer',
                                transition: 'all 0.2s',
                                opacity: isRecording || !selectedParticipation ? 0.6 : 1,
                                whiteSpace: 'nowrap',
                              }}
                              onMouseEnter={(e) => {
                                if (!isRecording && selectedParticipation) {
                                  e.target.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.4)';
                                  e.target.style.transform = 'translateY(-2px)';
                                }
                              }}
                              onMouseLeave={(e) => {
                                e.target.style.boxShadow = 'none';
                                e.target.style.transform = 'translateY(0)';
                              }}
                              title={selectedParticipation ? "Registrar asistencia" : "Selecciona participación"}
                            >
                              {isRecording ? '⏳' : '✅ Registrar'}
                            </button>
                          ) : (
                            <button
                              onClick={() => toggleParticipationSelect(student.id)}
                              disabled={isRecording}
                              style={{
                                padding: '8px 12px',
                                background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: 600,
                                cursor: isRecording ? 'not-allowed' : 'pointer',
                                transition: 'all 0.2s',
                                opacity: isRecording ? 0.6 : 1,
                                whiteSpace: 'nowrap',
                              }}
                              onMouseEnter={(e) => {
                                if (!isRecording) {
                                  e.target.style.boxShadow = '0 4px 12px rgba(37, 99, 235, 0.4)';
                                  e.target.style.transform = 'translateY(-2px)';
                                }
                              }}
                              onMouseLeave={(e) => {
                                e.target.style.boxShadow = 'none';
                                e.target.style.transform = 'translateY(0)';
                              }}
                            >
                              {isRecording ? '⏳' : '➕ Registrar'}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'flex-end',
            padding: '16px 24px',
            borderTop: `1px solid ${theme.border}`,
            backgroundColor: theme.bgLight,
            borderRadius: '0 0 12px 12px',
            position: 'sticky',
            bottom: 0,
            zIndex: 10,
            transition: 'all 300ms ease-in-out',
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              backgroundColor: theme.bgSecondary,
              color: theme.text,
              border: `1px solid ${theme.border}`,
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => e.target.style.opacity = '0.8'}
            onMouseLeave={(e) => e.target.style.opacity = '1'}
          >
            Cerrar
          </button>
          <button
            onClick={loadData}
            disabled={loading}
            style={{
              padding: '10px 20px',
              background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              opacity: loading ? 0.6 : 1,
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.target.style.boxShadow = '0 4px 12px rgba(37, 99, 235, 0.4)';
                e.target.style.transform = 'translateY(-2px)';
              }
            }}
            onMouseLeave={(e) => {
              e.target.style.boxShadow = 'none';
              e.target.style.transform = 'translateY(0)';
            }}
          >
            🔄 Recargar
          </button>
        </div>

        <style>{`
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes slideInUp {
            from { transform: translateY(20px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
        `}</style>
      </div>
    </div>
  );
};

export default ModalLessonAttendanceDetail;