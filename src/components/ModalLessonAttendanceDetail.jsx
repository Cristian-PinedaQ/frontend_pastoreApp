// ✅ ModalLessonAttendanceDetail.jsx - VERSIÓN MEJORADA CON SELECTOR DE PARTICIPACIÓN
// Modal para ver asistencias por lección con tabla intuitiva y selector de participación

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
  
  // ========== NUEVO: ESTADO PARA PARTICIPACIÓN ==========
  const [participationScores, setParticipationScores] = useState({});
  const [showParticipationSelect, setShowParticipationSelect] = useState({});

  console.log('🔍 ModalLessonAttendanceDetail - Props recibidos:', {
    lessonId: lesson?.id,
    lessonName: lesson?.lessonName,
    enrollmentId: enrollment?.id,
    enrollmentName: enrollment?.cohortName
  });

  // Opciones de participación
  const PARTICIPATION_OPTIONS = [
    { value: 'NO_PARTICIPA', label: '🤐 No participa', emoji: '🤐' },
    { value: 'POCA_PARTICIPACION', label: '👌 Poca participación', emoji: '👌' },
    { value: 'EXCELENTE_PARTICIPACION', label: '🌟 Excelente participación', emoji: '🌟' },
  ];

  // Cargar datos al abrir
  useEffect(() => {
    if (isOpen && lesson?.id && enrollment?.id) {
      console.log('📂 Iniciando carga de datos...');
      loadData();
    } else {
      console.warn('⚠️ Datos incompletos:', { 
        isOpen, 
        lessonId: lesson?.id, 
        enrollmentId: enrollment?.id 
      });
    }
  }, [isOpen, lesson?.id, enrollment?.id]);

  const loadData = async () => {
    setLoading(true);
    setError('');
    // Limpiar estados de participación al recargar
    setParticipationScores({});
    setShowParticipationSelect({});

    try {
      console.log('📡 Obteniendo estudiantes de la cohorte ID:', enrollment.id);

      let studentsData = [];
      try {
        studentsData = await apiService.getStudentEnrollmentsByEnrollment(enrollment.id);
        console.log('✅ Estudiantes obtenidos:', studentsData?.length || 0);
      } catch (err) {
        console.warn('⚠️ Método getStudentEnrollmentsByEnrollment no disponible, intentando alternativa');
        
        try {
          const enrollmentData = await apiService.getEnrollmentById(enrollment.id);
          studentsData = enrollmentData?.studentEnrollments || [];
          console.log('✅ Estudiantes obtenidos (alternativa):', studentsData?.length || 0);
        } catch (err2) {
          console.error('❌ Error obteniendo estudiantes:', err2);
          setError('No se pudo cargar la lista de estudiantes');
        }
      }

      console.log('📡 Obteniendo asistencias de la lección ID:', lesson.id);

      let attendancesData = [];
      try {
        attendancesData = await apiService.getAttendancesByLesson(lesson.id);
        console.log('✅ Asistencias obtenidas:', attendancesData?.length || 0);
      } catch (err) {
        console.warn('⚠️ Error obteniendo asistencias:', err);
        attendancesData = [];
      }

      setStudents(studentsData || []);
      setAttendances(attendancesData || []);

      if (studentsData?.length === 0) {
        console.warn('⚠️ No hay estudiantes en esta cohorte');
        setError('No hay estudiantes inscritos en esta cohorte');
      }

      console.log('✅ Datos cargados correctamente');
    } catch (err) {
      console.error('❌ Error cargando datos:', err);
      setError('Error al cargar la información de la lección: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Verificar si un estudiante tiene asistencia registrada
  const getStudentAttendance = (studentEnrollmentId) => {
    return attendances.find(a => a.studentEnrollmentId === studentEnrollmentId);
  };

  // ========== NUEVO: MANEJAR CAMBIO DE PARTICIPACIÓN ==========
  const handleParticipationChange = (studentEnrollmentId, value) => {
    console.log(`📊 Participación seleccionada para estudiante ${studentEnrollmentId}: ${value}`);
    setParticipationScores(prev => ({
      ...prev,
      [studentEnrollmentId]: value
    }));
  };

  // ========== NUEVO: TOGGLE DEL SELECTOR DE PARTICIPACIÓN ==========
  const toggleParticipationSelect = (studentEnrollmentId) => {
    setShowParticipationSelect(prev => ({
      ...prev,
      [studentEnrollmentId]: !prev[studentEnrollmentId]
    }));
  };

  // Registrar asistencia con participación seleccionada
  const handleQuickAttendance = async (studentEnrollmentId, studentName, present = true) => {
    try {
      setRecordingId(studentEnrollmentId);
      console.log(`📝 Registrando asistencia para ${studentName}...`);

      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      const recordedBy = userData.name || userData.username || 'Admin';

      // ========== NUEVO: USAR LA PARTICIPACIÓN SELECCIONADA ==========
      const selectedScore = participationScores[studentEnrollmentId] || 'POCA_PARTICIPACION';
      console.log(`   Participación seleccionada: ${selectedScore}`);

      const attendanceData = {
        studentEnrollmentId,
        lessonId: lesson.id,
        present,
        recordedBy,
        score: selectedScore  // ✅ AHORA USA LA SELECCIONADA
      };

      console.log('📤 Datos a enviar:', attendanceData);

      await apiService.recordAttendance(attendanceData);

      console.log('✅ Asistencia registrada exitosamente');
      
      // Recargar datos
      await loadData();
      
      if (onAttendanceRecorded) {
        onAttendanceRecorded();
      }
    } catch (err) {
      console.error('❌ Error registrando asistencia:', err);
      setError('Error al registrar la asistencia: ' + err.message);
    } finally {
      setRecordingId(null);
    }
  };

  if (!isOpen) return null;

  // Contar asistencias
  const presentCount = attendances.filter(a => a.present).length;
  const totalStudents = students.length;
  const attendancePercentage = totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container attendance-detail-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="header-content">
            <h2 className="modal-title">📖 {lesson?.lessonName || 'Lección'}</h2>
            <p className="lesson-meta">
              {lesson?.lessonDate && new Date(lesson.lessonDate).toLocaleDateString('es-CO')}
              {' • '}
              Cohorte: {enrollment?.cohortName || 'Sin cohorte'}
            </p>
          </div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        {/* Stats */}
        <div className="attendance-stats">
          <div className="stat-box">
            <span className="stat-label">Presentes</span>
            <span className="stat-value present">{presentCount}</span>
          </div>
          <div className="stat-box">
            <span className="stat-label">Total</span>
            <span className="stat-value">{totalStudents}</span>
          </div>
          <div className="stat-box">
            <span className="stat-label">Porcentaje</span>
            <span className="stat-value">{attendancePercentage}%</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="progress-bar-container">
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${attendancePercentage}%` }}
            ></div>
          </div>
        </div>

        {/* Body */}
        <div className="modal-body attendance-body">
          {error && (
            <div className="error-message">
              ❌ {error}
            </div>
          )}

          {loading ? (
            <div className="loading-state">
              ⏳ Cargando estudiantes y asistencias...
            </div>
          ) : students.length === 0 ? (
            <div className="empty-state">
              <p>📚 No hay estudiantes inscritos en esta cohorte</p>
            </div>
          ) : (
            <div className="attendance-table-container">
              <table className="attendance-table">
                <thead>
                  <tr>
                    <th className="col-student">Estudiante</th>
                    <th className="col-status">Estado</th>
                    <th className="col-score">Participación</th>
                    <th className="col-action">Acción</th>
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
                      <tr key={student.id} className={att ? 'row-with-attendance' : 'row-no-attendance'}>
                        {/* Estudiante */}
                        <td className="col-student">
                          <div className="student-info">
                            <span className="student-avatar">👤</span>
                            <span className="student-name">
                              {studentName}
                            </span>
                          </div>
                        </td>

                        {/* Estado */}
                        <td className="col-status">
                          {att ? (
                            <div className={`status-badge ${att.present ? 'present' : 'absent'}`}>
                              {att.present ? '✅ Presente' : '❌ Ausente'}
                            </div>
                          ) : (
                            <div className="status-badge pending">
                              ⏳ Sin registrar
                            </div>
                          )}
                        </td>

                        {/* Puntuación / Selector */}
                        <td className="col-score">
                          {att ? (
                            // YA TIENE ASISTENCIA - MOSTRAR SCORE
                            <div className="score-badge">
                              {att.score === 'NO_PARTICIPA' && '🤐 No participa'}
                              {att.score === 'POCA_PARTICIPACION' && '👌 Poca'}
                              {att.score === 'EXCELENTE_PARTICIPACION' && '🌟 Excelente'}
                            </div>
                          ) : (
                            // NO TIENE ASISTENCIA - SELECTOR O BOTÓN
                            showParticipation ? (
                              <div className="participation-select">
                                <select 
                                  value={selectedParticipation || ''}
                                  onChange={(e) => handleParticipationChange(student.id, e.target.value)}
                                  className="select-input"
                                  autoFocus
                                >
                                  <option value="">Seleccionar...</option>
                                  {PARTICIPATION_OPTIONS.map(opt => (
                                    <option key={opt.value} value={opt.value}>
                                      {opt.label}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            ) : (
                              <span className="score-empty">-</span>
                            )
                          )}
                        </td>

                        {/* Acción */}
                        <td className="col-action">
                          {att ? (
                            // YA TIENE ASISTENCIA
                            <div className="action-recorded">
                              <span className="recorded-info">
                                ✅ {att.recordedBy || 'Registrado'}
                              </span>
                            </div>
                          ) : (
                            // NO TIENE ASISTENCIA - MOSTRAR BOTÓN O CONFIRMAR
                            showParticipation ? (
                              // MODO: CONFIRMAR REGISTRO
                              <button
                                className={`btn-confirm-attendance ${isRecording ? 'loading' : ''} ${!selectedParticipation ? 'disabled' : ''}`}
                                onClick={() => handleQuickAttendance(student.id, studentName, true)}
                                disabled={isRecording || !selectedParticipation}
                                title={selectedParticipation ? "Registrar asistencia con participación seleccionada" : "Selecciona participación primero"}
                              >
                                {isRecording ? '⏳' : '✅ Registrar'}
                              </button>
                            ) : (
                              // MODO: NORMAL - MOSTRAR BOTÓN PARA SELECCIONAR
                              <button
                                className={`btn-register-quick ${isRecording ? 'loading' : ''}`}
                                onClick={() => toggleParticipationSelect(student.id)}
                                disabled={isRecording}
                                title="Click para seleccionar participación"
                              >
                                {isRecording ? '⏳' : '➕ Registrar'}
                              </button>
                            )
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
        <div className="modal-footer">
          <button
            className="btn-secondary"
            onClick={onClose}
          >
            Cerrar
          </button>
          <button
            className="btn-primary"
            onClick={loadData}
            disabled={loading}
          >
            🔄 Recargar
          </button>
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
          max-width: 1000px;
          width: 95%;
          max-height: 90vh;
          overflow-y: auto;
          animation: slideInUp 0.3s ease-in-out;
          display: flex;
          flex-direction: column;
        }

        .attendance-detail-modal {
          max-width: 1000px;
        }

        .modal-header {
          background: linear-gradient(135deg, #2563eb 0%, #10b981 100%);
          color: white;
          padding: 24px;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-radius: 12px 12px 0 0;
          position: sticky;
          top: 0;
          z-index: 10;
        }

        .header-content {
          flex: 1;
        }

        .modal-title {
          font-size: 22px;
          font-weight: 700;
          margin: 0;
        }

        .lesson-meta {
          font-size: 13px;
          color: rgba(255, 255, 255, 0.9);
          margin: 6px 0 0 0;
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

        /* Stats */
        .attendance-stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          padding: 16px 24px;
          background: linear-gradient(to bottom, #f8f9fa, transparent);
          border-bottom: 1px solid #e5e7eb;
        }

        .stat-box {
          background: white;
          padding: 12px;
          border-radius: 8px;
          text-align: center;
          border: 2px solid #e5e7eb;
        }

        .stat-label {
          display: block;
          font-size: 12px;
          color: #6b7280;
          font-weight: 600;
          margin-bottom: 4px;
        }

        .stat-value {
          display: block;
          font-size: 24px;
          font-weight: 700;
          color: #1f2937;
        }

        .stat-value.present {
          color: #10b981;
        }

        /* Progress Bar */
        .progress-bar-container {
          padding: 0 24px 16px;
        }

        .progress-bar {
          height: 8px;
          background-color: #e5e7eb;
          border-radius: 4px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #2563eb, #10b981);
          transition: width 0.3s ease;
        }

        /* Body */
        .modal-body {
          flex: 1;
          padding: 0;
          overflow-y: auto;
        }

        .attendance-body {
          padding: 0;
        }

        .error-message {
          background-color: #fee2e2;
          color: #991b1b;
          padding: 12px 24px;
          margin: 16px 24px;
          border-radius: 8px;
          border-left: 4px solid #ef4444;
        }

        .loading-state,
        .empty-state {
          padding: 40px 24px;
          text-align: center;
          color: #6b7280;
        }

        /* Tabla */
        .attendance-table-container {
          overflow-x: auto;
          padding: 0;
        }

        .attendance-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 14px;
        }

        .attendance-table thead {
          background-color: #f3f4f6;
          position: sticky;
          top: 0;
          z-index: 5;
        }

        .attendance-table th {
          padding: 14px;
          text-align: left;
          font-weight: 600;
          color: #374151;
          border-bottom: 2px solid #e5e7eb;
        }

        .attendance-table td {
          padding: 14px;
          border-bottom: 1px solid #e5e7eb;
        }

        .attendance-table tbody tr {
          transition: background-color 0.2s;
        }

        .attendance-table tbody tr:hover {
          background-color: #f9fafb;
        }

        .row-with-attendance {
          background-color: #f0fdf4;
        }

        .row-no-attendance {
          background-color: #fffbeb;
        }

        /* Columnas */
        .col-student {
          width: 35%;
        }

        .col-status {
          width: 20%;
        }

        .col-score {
          width: 20%;
        }

        .col-action {
          width: 25%;
          text-align: right;
        }

        .student-info {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .student-avatar {
          font-size: 18px;
        }

        .student-name {
          font-weight: 500;
          color: #1f2937;
        }

        /* Status Badges */
        .status-badge {
          display: inline-block;
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          white-space: nowrap;
        }

        .status-badge.present {
          background-color: #d1fae5;
          color: #065f46;
        }

        .status-badge.absent {
          background-color: #fee2e2;
          color: #991b1b;
        }

        .status-badge.pending {
          background-color: #fef3c7;
          color: #92400e;
        }

        /* Score */
        .score-badge {
          display: inline-block;
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          background-color: #e0e7ff;
          color: #3730a3;
          white-space: nowrap;
        }

        .score-empty {
          color: #9ca3af;
        }

        /* ========== NUEVO: ESTILOS PARA SELECTOR DE PARTICIPACIÓN ========== */
        .participation-select {
          display: inline-block;
        }

        .select-input {
          padding: 6px 8px;
          border: 1.5px solid #2563eb;
          border-radius: 6px;
          font-size: 12px;
          background-color: white;
          color: #1f2937;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .select-input:focus {
          outline: none;
          border-color: #1d4ed8;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }

        .select-input:hover {
          border-color: #1d4ed8;
          background-color: #f0f9ff;
        }

        /* Action */
        .action-recorded {
          font-size: 12px;
          color: #059669;
          font-weight: 500;
        }

        .recorded-info {
          display: block;
        }

        .btn-register-quick {
          padding: 8px 12px;
          background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }

        .btn-register-quick:hover:not(:disabled) {
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.4);
          transform: translateY(-2px);
        }

        .btn-register-quick:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-register-quick.loading {
          opacity: 0.6;
        }

        /* ========== NUEVO: ESTILOS PARA BOTÓN DE CONFIRMACIÓN ========== */
        .btn-confirm-attendance {
          padding: 8px 12px;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }

        .btn-confirm-attendance:hover:not(:disabled) {
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
          transform: translateY(-2px);
        }

        .btn-confirm-attendance:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          background: linear-gradient(135deg, #d1d5db 0%, #9ca3af 100%);
        }

        .btn-confirm-attendance.disabled {
          background: linear-gradient(135deg, #d1d5db 0%, #9ca3af 100%);
          opacity: 0.6;
        }

        .btn-confirm-attendance.loading {
          opacity: 0.6;
        }

        /* Footer */
        .modal-footer {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
          padding: 16px 24px;
          border-top: 1px solid #e5e7eb;
          background-color: #f9fafb;
          border-radius: 0 0 12px 12px;
          position: sticky;
          bottom: 0;
          z-index: 10;
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
            width: 98%;
            max-height: 98vh;
          }

          .attendance-stats {
            grid-template-columns: 1fr;
          }

          .col-student {
            width: 50%;
          }

          .col-status,
          .col-score,
          .col-action {
            width: 16.66%;
            font-size: 12px;
          }

          .modal-header {
            padding: 16px;
          }

          .modal-title {
            font-size: 18px;
          }

          .attendance-table th,
          .attendance-table td {
            padding: 10px 8px;
          }

          .btn-register-quick,
          .btn-confirm-attendance {
            padding: 6px 8px;
            font-size: 11px;
          }

          .student-name {
            font-size: 13px;
          }

          .select-input {
            font-size: 11px;
            padding: 4px 6px;
          }
        }
      `}</style>
    </div>
  );
};

export default ModalLessonAttendanceDetail;
