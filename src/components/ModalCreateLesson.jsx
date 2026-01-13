// 📚 ModalCreateLesson.jsx - Modal para crear lecciones con Plan de Lecciones
// ⚠️ Importante: Las lecciones NO crean asistencias automáticamente
// Se debe inicializar manualmente después

import React, { useState } from 'react';
import apiService from '../apiService';

const ModalCreateLesson = ({ isOpen, onClose, enrollmentId, onLessonCreated }) => {
  const [mode, setMode] = useState('individual'); // 'individual' o 'default-plan'
  const [formData, setFormData] = useState({
    lessonName: '',
    lessonNumber: '',
    lessonDate: '',
    durationMinutes: 120,
    description: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showInitializeAttendance, setShowInitializeAttendance] = useState(false);
  const [createdLessonId, setCreatedLessonId] = useState(null);
  const [createdLessons, setCreatedLessons] = useState([]);
  const [initializingAttendance, setInitializingAttendance] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'durationMinutes' ? parseInt(value) || 0 : value,
    }));
  };

  const validateForm = () => {
    if (!formData.lessonName?.trim()) {
      setError('El nombre de la lección es requerido');
      return false;
    }
    if (!formData.lessonNumber) {
      setError('El número de lección es requerido');
      return false;
    }
    if (!formData.lessonDate) {
      setError('La fecha de la lección es requerida');
      return false;
    }
    if (formData.durationMinutes <= 0) {
      setError('La duración debe ser mayor a 0');
      return false;
    }
    return true;
  };

  // ========== CREAR LECCIÓN INDIVIDUAL ==========
  const handleCreateIndividualLesson = async (e) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) return;

    setLoading(true);

    try {
      const dateTime = formData.lessonDate.includes('T') 
        ? formData.lessonDate 
        : `${formData.lessonDate}T09:00:00`;

      const lessonData = {
        enrollmentId,
        lessonName: formData.lessonName,
        lessonNumber: parseInt(formData.lessonNumber),
        lessonDate: dateTime,
        durationMinutes: formData.durationMinutes,
        description: formData.description,
      };

      console.log('📝 Creando lección individual:', lessonData);

      const response = await apiService.createLesson(lessonData);

      console.log('✅ Lección creada:', response);

      setCreatedLessonId(response.lessonId);
      setShowInitializeAttendance(true);

      // Resetear formulario
      setFormData({
        lessonName: '',
        lessonNumber: '',
        lessonDate: '',
        durationMinutes: 120,
        description: '',
      });

      if (onLessonCreated) {
        onLessonCreated(response);
      }
    } catch (err) {
      console.error('❌ Error al crear lección:', err);
      setError(err.message || 'Error al crear la lección');
    } finally {
      setLoading(false);
    }
  };

  // ========== CREAR PLAN DE LECCIONES POR DEFECTO ==========
  const handleCreateDefaultPlan = async () => {
    setError('');
    setLoading(true);

    try {
      console.log('📚 Creando plan de lecciones por defecto para cohorte:', enrollmentId);

      const response = await apiService.createDefaultLessonPlan(enrollmentId);

      console.log('✅ Plan de lecciones creado:', response);

      // response contiene: message, lessonCount, lessons
      setCreatedLessons(response.lessons || []);
      setShowInitializeAttendance(true);

      if (onLessonCreated) {
        onLessonCreated(response);
      }
    } catch (err) {
      console.error('❌ Error al crear plan de lecciones:', err);
      setError(err.message || 'Error al crear el plan de lecciones');
    } finally {
      setLoading(false);
    }
  };

  // ========== INICIALIZAR ASISTENCIAS ==========
  const handleInitializeAttendance = async () => {
    if (!createdLessonId && createdLessons.length === 0) return;

    setInitializingAttendance(true);

    try {
      if (createdLessonId) {
        // Lección individual
        console.log('📊 Inicializando asistencias para lección:', createdLessonId);
        await apiService.initializeLessonAttendance(createdLessonId);
        console.log('✅ Asistencias inicializadas');
      } else if (createdLessons.length > 0) {
        // Plan de lecciones - inicializar para cada lección
        console.log('📊 Inicializando asistencias para', createdLessons.length, 'lecciones');
        
        for (const lesson of createdLessons) {
          try {
            await apiService.initializeLessonAttendance(lesson.id);
          } catch (err) {
            console.warn(`⚠️ Error inicializando lección ${lesson.id}:`, err);
          }
        }
        
        console.log('✅ Asistencias inicializadas para todas las lecciones');
      }

      alert('✅ Lecciones creadas y asistencias inicializadas correctamente');
      setShowInitializeAttendance(false);
      setCreatedLessonId(null);
      setCreatedLessons([]);
      handleClose();
    } catch (err) {
      console.error('❌ Error al inicializar asistencias:', err);
      setError(err.message || 'Error al inicializar asistencias');
    } finally {
      setInitializingAttendance(false);
    }
  };

  const handleSkipAttendance = () => {
    if (createdLessonId) {
      alert('✅ Lección creada. Puedes inicializar asistencias después desde la pestaña de Asistencias');
    } else if (createdLessons.length > 0) {
      alert(`✅ Plan de ${createdLessons.length} lecciones creado. Puedes inicializar asistencias después`);
    }
    setShowInitializeAttendance(false);
    setCreatedLessonId(null);
    setCreatedLessons([]);
    handleClose();
  };

  const handleClose = () => {
    setFormData({
      lessonName: '',
      lessonNumber: '',
      lessonDate: '',
      durationMinutes: 120,
      description: '',
    });
    setError('');
    setMode('individual');
    setShowInitializeAttendance(false);
    setCreatedLessonId(null);
    setCreatedLessons([]);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <h2 className="modal-title">📚 Crear Lecciones</h2>
          <button
            className="modal-close-btn"
            onClick={handleClose}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="modal-body">
          {!showInitializeAttendance ? (
            <>
              {error && (
                <div className="error-message">
                  ❌ {error}
                </div>
              )}

              {/* SELECTOR DE MODO */}
              <div className="mode-selector">
                <button
                  className={`mode-btn ${mode === 'individual' ? 'active' : ''}`}
                  onClick={() => setMode('individual')}
                  disabled={loading}
                >
                  ✏️ Lección Individual
                </button>
                <button
                  className={`mode-btn ${mode === 'default-plan' ? 'active' : ''}`}
                  onClick={() => setMode('default-plan')}
                  disabled={loading}
                >
                  📚 Plan Predeterminado
                </button>
              </div>

              {/* MODO: LECCIÓN INDIVIDUAL */}
              {mode === 'individual' && (
                <form onSubmit={handleCreateIndividualLesson} className="form-create-lesson">
                  <div className="form-group">
                    <label className="form-label">Nombre de Lección *</label>
                    <input
                      type="text"
                      name="lessonName"
                      value={formData.lessonName}
                      onChange={handleChange}
                      placeholder="Ej: Introducción al tema"
                      className="form-input"
                      disabled={loading}
                    />
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Número de Lección *</label>
                      <input
                        type="number"
                        name="lessonNumber"
                        value={formData.lessonNumber}
                        onChange={handleChange}
                        placeholder="Ej: 1"
                        min="1"
                        max="200"
                        className="form-input"
                        disabled={loading}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Duración (minutos) *</label>
                      <input
                        type="number"
                        name="durationMinutes"
                        value={formData.durationMinutes}
                        onChange={handleChange}
                        placeholder="120"
                        min="1"
                        max="480"
                        className="form-input"
                        disabled={loading}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Fecha de Lección *</label>
                    <input
                      type="datetime-local"
                      name="lessonDate"
                      value={formData.lessonDate}
                      onChange={handleChange}
                      className="form-input"
                      disabled={loading}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Descripción</label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      placeholder="Descripción de la lección..."
                      rows="3"
                      className="form-input form-textarea"
                      disabled={loading}
                    />
                  </div>

                  <div className="info-box">
                    ⚠️ <strong>Nota:</strong> Las asistencias se crean de forma independiente.
                    Después de crear la lección, podrás inicializar los registros de asistencia.
                  </div>

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
                      {loading ? '⏳ Creando...' : '✅ Crear Lección'}
                    </button>
                  </div>
                </form>
              )}

              {/* MODO: PLAN PREDETERMINADO */}
              {mode === 'default-plan' && (
                <div className="plan-mode-content">
                  <div className="info-box large">
                    📚 <strong>Plan de Lecciones Predeterminado</strong>
                    <p>Se crearán automáticamente todas las lecciones según el nivel de la cohorte.</p>
                    <p>Las lecciones se distribuirán semanalmente desde la fecha de inicio.</p>
                  </div>

                  <div className="warning-box">
                    ⚠️ <strong>Importante:</strong>
                    <ul>
                      <li>✅ Solo PASTORES y AREAS pueden crear planes</li>
                      <li>✅ Se crearán todas las lecciones del nivel automáticamente</li>
                      <li>❌ No se puede deshacer una vez creado</li>
                      <li>✅ Después puedes inicializar asistencias para cada lección</li>
                    </ul>
                  </div>

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
                      type="button"
                      className="btn-primary btn-large"
                      onClick={handleCreateDefaultPlan}
                      disabled={loading}
                    >
                      {loading ? '⏳ Creando plan...' : '📚 Crear Plan Completo'}
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              {/* Dialog para inicializar asistencias */}
              <div className="success-dialog">
                <div className="success-icon">✅</div>
                <h3>¡{createdLessonId ? 'Lección' : 'Plan de lecciones'} creado exitosamente!</h3>
                
                {createdLessons.length > 0 && (
                  <div className="created-lessons-list">
                    <p><strong>Lecciones creadas: {createdLessons.length}</strong></p>
                    <div className="lessons-preview">
                      {createdLessons.map((lesson, idx) => (
                        <div key={lesson.id} className="lesson-preview-item">
                          <span className="lesson-number">{idx + 1}.</span>
                          <span className="lesson-name">{lesson.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <p>¿Deseas inicializar los registros de asistencia ahora?</p>
                
                <div className="info-box">
                  📊 Se crearán registros de asistencia para todos los estudiantes 
                  inscritos en la cohorte.
                </div>

                <div className="form-actions">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={handleSkipAttendance}
                    disabled={initializingAttendance}
                  >
                    Hacerlo Después
                  </button>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={handleInitializeAttendance}
                    disabled={initializingAttendance}
                  >
                    {initializingAttendance ? '⏳ Inicializando...' : '📊 Inicializar Asistencias'}
                  </button>
                </div>
              </div>
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

        /* ========== MODE SELECTOR ========== */
        .mode-selector {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 24px;
        }

        .mode-btn {
          padding: 12px 16px;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          background: white;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          color: #374151;
        }

        .mode-btn:hover:not(:disabled) {
          border-color: #2563eb;
          background-color: #f0f9ff;
        }

        .mode-btn.active {
          border-color: #2563eb;
          background: linear-gradient(135deg, #2563eb 0%, #10b981 100%);
          color: white;
        }

        .mode-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        /* ========== FORM STYLES ========== */
        .error-message {
          background-color: #fee2e2;
          color: #991b1b;
          padding: 12px 16px;
          border-radius: 8px;
          margin-bottom: 16px;
          border-left: 4px solid #ef4444;
        }

        .form-create-lesson {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .form-label {
          font-size: 14px;
          font-weight: 600;
          color: #374151;
        }

        .form-input {
          padding: 10px 12px;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          font-size: 14px;
          font-family: inherit;
          transition: all 0.2s;
        }

        .form-input:focus {
          outline: none;
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }

        .form-input:disabled {
          background-color: #f3f4f6;
          color: #9ca3af;
          cursor: not-allowed;
        }

        .form-textarea {
          resize: vertical;
          min-height: 80px;
        }

        .info-box {
          background-color: #fef3c7;
          color: #92400e;
          padding: 12px 16px;
          border-radius: 8px;
          font-size: 13px;
          border-left: 4px solid #f59e0b;
        }

        .info-box.large {
          padding: 16px;
          font-size: 14px;
          background-color: #e0f2fe;
          color: #0c4a6e;
          border-left-color: #0284c7;
        }

        .info-box p {
          margin: 8px 0 0 0;
          line-height: 1.5;
        }

        .warning-box {
          background-color: #fee2e2;
          color: #991b1b;
          padding: 16px;
          border-radius: 8px;
          border-left: 4px solid #ef4444;
          margin: 16px 0;
        }

        .warning-box strong {
          display: block;
          margin-bottom: 8px;
        }

        .warning-box ul {
          margin: 0;
          padding-left: 20px;
          list-style: none;
        }

        .warning-box li {
          margin: 4px 0;
          padding-left: 20px;
          position: relative;
        }

        .warning-box li:before {
          content: attr(data-content);
          position: absolute;
          left: 0;
        }

        /* ========== PLAN MODE ========== */
        .plan-mode-content {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        /* ========== CREATED LESSONS LIST ========== */
        .created-lessons-list {
          margin: 16px 0;
          padding: 12px;
          background-color: #f3f4f6;
          border-radius: 8px;
        }

        .created-lessons-list p {
          margin: 0 0 12px 0;
          font-weight: 600;
          color: #374151;
        }

        .lessons-preview {
          max-height: 300px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .lesson-preview-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px;
          background: white;
          border-radius: 6px;
          font-size: 13px;
          color: #374151;
          border-left: 3px solid #2563eb;
        }

        .lesson-number {
          font-weight: 700;
          color: #2563eb;
          min-width: 30px;
        }

        .lesson-name {
          flex: 1;
        }

        /* ========== BUTTONS ========== */
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

        .btn-primary.btn-large {
          padding: 12px 28px;
          font-size: 15px;
          width: 100%;
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

        /* ========== SUCCESS DIALOG ========== */
        .success-dialog {
          text-align: center;
          padding: 20px 0;
        }

        .success-icon {
          font-size: 64px;
          margin-bottom: 16px;
        }

        .success-dialog h3 {
          font-size: 20px;
          font-weight: 700;
          color: #10b981;
          margin: 0 0 8px 0;
        }

        .success-dialog p {
          color: #6b7280;
          margin: 0 0 16px 0;
        }

        /* ========== ANIMATIONS ========== */
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

          .form-row {
            grid-template-columns: 1fr;
          }

          .mode-selector {
            grid-template-columns: 1fr;
          }

          .modal-header {
            padding: 16px;
          }

          .modal-body {
            padding: 16px;
          }
        }
      `}</style>
    </div>
  );
};

export default ModalCreateLesson;
