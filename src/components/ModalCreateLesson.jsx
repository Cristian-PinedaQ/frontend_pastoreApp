// 📚 ModalCreateLesson.jsx - Modal para crear lecciones CON DARK MODE
// Soporta creación individual y plan predeterminado
// ✅ COMPLETAMENTE LEGIBLE EN MODO OSCURO

import React, { useState, useEffect } from 'react';
import apiService from '../apiService';

const ModalCreateLesson = ({ isOpen, onClose, enrollmentId, onLessonCreated }) => {
  const [mode, setMode] = useState('individual');
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
  const [isDarkMode, setIsDarkMode] = useState(false);

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
    bgLight: isDarkMode ? '#1a2332' : '#f3f4f6',
    text: isDarkMode ? '#f1f5f9' : '#374151',
    textSecondary: isDarkMode ? '#cbd5e1' : '#6b7280',
    textTertiary: isDarkMode ? '#94a3b8' : '#9ca3af',
    border: isDarkMode ? '#334155' : '#e5e7eb',
    borderLight: isDarkMode ? '#475569' : '#f0f0f0',
    header: isDarkMode
      ? 'linear-gradient(135deg, #1e40af 0%, #059669 100%)'
      : 'linear-gradient(135deg, #2563eb 0%, #10b981 100%)',
    input: isDarkMode ? '#1e293b' : '#ffffff',
    inputBorder: isDarkMode ? '#334155' : '#e5e7eb',
    inputBorderFocus: '#2563eb',
    inputFocusShadow: 'rgba(37, 99, 235, 0.1)',
    button: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
    buttonHover: '0 4px 12px rgba(37, 99, 235, 0.4)',
    info: isDarkMode ? '#0c4a6e' : '#0c4a6e',
    infoBg: isDarkMode ? '#082f49' : '#e0f2fe',
    infoBorder: '#0284c7',
    warning: isDarkMode ? '#92400e' : '#92400e',
    warningBg: isDarkMode ? '#78350f' : '#fef3c7',
    warningBorder: '#f59e0b',
    error: isDarkMode ? '#991b1b' : '#991b1b',
    errorBg: isDarkMode ? '#7f1d1d' : '#fee2e2',
    errorBorder: '#ef4444',
    success: isDarkMode ? '#059669' : '#10b981',
    successBg: isDarkMode ? '#064e3b' : '#d1fae5',
    successText: isDarkMode ? '#86efac' : '#065f46',
    card: isDarkMode ? '#1e293b' : '#ffffff',
  };

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

  const handleCreateDefaultPlan = async () => {
    setError('');
    setLoading(true);

    try {
      console.log('📚 Creando plan de lecciones por defecto para cohorte:', enrollmentId);

      const response = await apiService.createDefaultLessonPlan(enrollmentId);

      console.log('✅ Plan de lecciones creado:', response);

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

  const handleInitializeAttendance = async () => {
    if (!createdLessonId && createdLessons.length === 0) return;

    setInitializingAttendance(true);

    try {
      if (createdLessonId) {
        console.log('📊 Inicializando asistencias para lección:', createdLessonId);
        await apiService.initializeLessonAttendance(createdLessonId);
        console.log('✅ Asistencias inicializadas');
      } else if (createdLessons.length > 0) {
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
        animation: 'fadeIn 0.3s ease-in-out',
        transition: 'background-color 300ms ease-in-out',
      }}
      onClick={handleClose}
    >
      <div
        style={{
          backgroundColor: theme.bg,
          borderRadius: '12px',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
          maxWidth: '600px',
          width: '90%',
          maxHeight: '90vh',
          overflowY: 'auto',
          animation: 'slideInUp 0.3s ease-in-out',
          display: 'flex',
          flexDirection: 'column',
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
            alignItems: 'center',
            borderRadius: '12px 12px 0 0',
            position: 'sticky',
            top: 0,
            zIndex: 10,
          }}
        >
          <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>
            📚 Crear Lecciones
          </h2>
          <button
            onClick={handleClose}
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

        {/* Body */}
        <div
          style={{
            padding: '24px',
            overflowY: 'auto',
            flex: 1,
            color: theme.text,
          }}
        >
          {!showInitializeAttendance ? (
            <>
              {error && (
                <div
                  style={{
                    backgroundColor: theme.errorBg,
                    color: theme.error,
                    padding: '12px 16px',
                    borderRadius: '8px',
                    marginBottom: '16px',
                    borderLeft: `4px solid ${theme.errorBorder}`,
                    fontSize: '14px',
                  }}
                >
                  ❌ {error}
                </div>
              )}

              {/* MODE SELECTOR */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '12px',
                  marginBottom: '24px',
                }}
              >
                {['individual', 'default-plan'].map(modeOption => (
                  <button
                    key={modeOption}
                    onClick={() => setMode(modeOption)}
                    disabled={loading}
                    style={{
                      padding: '12px 16px',
                      border: `2px solid ${mode === modeOption ? '#2563eb' : theme.border}`,
                      borderRadius: '8px',
                      backgroundColor: mode === modeOption
                        ? 'linear-gradient(135deg, #2563eb 0%, #10b981 100%)'
                        : theme.card,
                      background: mode === modeOption
                        ? 'linear-gradient(135deg, #2563eb 0%, #10b981 100%)'
                        : theme.card,
                      fontSize: '14px',
                      fontWeight: 600,
                      cursor: loading ? 'not-allowed' : 'pointer',
                      color: mode === modeOption ? 'white' : theme.text,
                      transition: 'all 0.2s',
                      opacity: loading && mode !== modeOption ? 0.6 : 1,
                    }}
                    onMouseEnter={(e) => {
                      if (mode !== modeOption && !loading) {
                        e.target.style.borderColor = '#2563eb';
                        e.target.style.backgroundColor = isDarkMode ? '#1a2332' : '#f0f9ff';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (mode !== modeOption) {
                        e.target.style.borderColor = theme.border;
                        e.target.style.backgroundColor = theme.card;
                      }
                    }}
                  >
                    {modeOption === 'individual' ? '✏️ Lección Individual' : '📚 Plan Predeterminado'}
                  </button>
                ))}
              </div>

              {/* INDIVIDUAL MODE */}
              {mode === 'individual' && (
                <form
                  onSubmit={handleCreateIndividualLesson}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{
                      fontSize: '14px',
                      fontWeight: 600,
                      color: theme.text,
                    }}>
                      Nombre de Lección *
                    </label>
                    <input
                      type="text"
                      name="lessonName"
                      value={formData.lessonName}
                      onChange={handleChange}
                      placeholder="Ej: Introducción al tema"
                      disabled={loading}
                      style={{
                        padding: '10px 12px',
                        border: `2px solid ${theme.inputBorder}`,
                        borderRadius: '8px',
                        fontSize: '14px',
                        backgroundColor: theme.input,
                        color: theme.text,
                        fontFamily: 'inherit',
                        transition: 'all 0.2s',
                        cursor: loading ? 'not-allowed' : 'text',
                      }}
                      onFocus={(e) => {
                        if (!loading) {
                          e.target.style.borderColor = theme.inputBorderFocus;
                          e.target.style.boxShadow = `0 0 0 3px ${theme.inputFocusShadow}`;
                        }
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = theme.inputBorder;
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{
                        fontSize: '14px',
                        fontWeight: 600,
                        color: theme.text,
                      }}>
                        Número de Lección *
                      </label>
                      <input
                        type="number"
                        name="lessonNumber"
                        value={formData.lessonNumber}
                        onChange={handleChange}
                        placeholder="Ej: 1"
                        min="1"
                        max="200"
                        disabled={loading}
                        style={{
                          padding: '10px 12px',
                          border: `2px solid ${theme.inputBorder}`,
                          borderRadius: '8px',
                          fontSize: '14px',
                          backgroundColor: theme.input,
                          color: theme.text,
                          fontFamily: 'inherit',
                          transition: 'all 0.2s',
                        }}
                        onFocus={(e) => {
                          if (!loading) {
                            e.target.style.borderColor = theme.inputBorderFocus;
                            e.target.style.boxShadow = `0 0 0 3px ${theme.inputFocusShadow}`;
                          }
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = theme.inputBorder;
                          e.target.style.boxShadow = 'none';
                        }}
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{
                        fontSize: '14px',
                        fontWeight: 600,
                        color: theme.text,
                      }}>
                        Duración (minutos) *
                      </label>
                      <input
                        type="number"
                        name="durationMinutes"
                        value={formData.durationMinutes}
                        onChange={handleChange}
                        placeholder="120"
                        min="1"
                        max="480"
                        disabled={loading}
                        style={{
                          padding: '10px 12px',
                          border: `2px solid ${theme.inputBorder}`,
                          borderRadius: '8px',
                          fontSize: '14px',
                          backgroundColor: theme.input,
                          color: theme.text,
                          fontFamily: 'inherit',
                          transition: 'all 0.2s',
                        }}
                        onFocus={(e) => {
                          if (!loading) {
                            e.target.style.borderColor = theme.inputBorderFocus;
                            e.target.style.boxShadow = `0 0 0 3px ${theme.inputFocusShadow}`;
                          }
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = theme.inputBorder;
                          e.target.style.boxShadow = 'none';
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{
                      fontSize: '14px',
                      fontWeight: 600,
                      color: theme.text,
                    }}>
                      Fecha de Lección *
                    </label>
                    <input
                      type="datetime-local"
                      name="lessonDate"
                      value={formData.lessonDate}
                      onChange={handleChange}
                      disabled={loading}
                      style={{
                        padding: '10px 12px',
                        border: `2px solid ${theme.inputBorder}`,
                        borderRadius: '8px',
                        fontSize: '14px',
                        backgroundColor: theme.input,
                        color: theme.text,
                        fontFamily: 'inherit',
                        transition: 'all 0.2s',
                      }}
                      onFocus={(e) => {
                        if (!loading) {
                          e.target.style.borderColor = theme.inputBorderFocus;
                          e.target.style.boxShadow = `0 0 0 3px ${theme.inputFocusShadow}`;
                        }
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = theme.inputBorder;
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{
                      fontSize: '14px',
                      fontWeight: 600,
                      color: theme.text,
                    }}>
                      Descripción
                    </label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      placeholder="Descripción de la lección..."
                      rows="3"
                      disabled={loading}
                      style={{
                        padding: '10px 12px',
                        border: `2px solid ${theme.inputBorder}`,
                        borderRadius: '8px',
                        fontSize: '14px',
                        backgroundColor: theme.input,
                        color: theme.text,
                        fontFamily: 'inherit',
                        resize: 'vertical',
                        transition: 'all 0.2s',
                      }}
                      onFocus={(e) => {
                        if (!loading) {
                          e.target.style.borderColor = theme.inputBorderFocus;
                          e.target.style.boxShadow = `0 0 0 3px ${theme.inputFocusShadow}`;
                        }
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = theme.inputBorder;
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                  </div>

                  <div
                    style={{
                      backgroundColor: isDarkMode ? '#78350f' : '#fef3c7',
                      color: isDarkMode ? '#fcd34d' : '#92400e',
                      padding: '12px 16px',
                      borderRadius: '8px',
                      fontSize: '13px',
                      borderLeft: `4px solid ${isDarkMode ? '#f59e0b' : '#f59e0b'}`,
                    }}
                  >
                    ⚠️ <strong>Nota:</strong> Las asistencias se crean de forma independiente.
                    Después de crear la lección, podrás inicializar los registros de asistencia.
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      gap: '12px',
                      justifyContent: 'flex-end',
                      marginTop: '8px',
                    }}
                  >
                    <button
                      type="button"
                      onClick={handleClose}
                      disabled={loading}
                      style={{
                        padding: '10px 20px',
                        backgroundColor: theme.bgSecondary,
                        color: theme.text,
                        border: `1px solid ${theme.border}`,
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: 600,
                        cursor: loading ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s',
                        opacity: loading ? 0.6 : 1,
                      }}
                      onMouseEnter={(e) => {
                        if (!loading) e.target.style.opacity = '0.8';
                      }}
                      onMouseLeave={(e) => {
                        if (!loading) e.target.style.opacity = '1';
                      }}
                    >Cancelar
                    </button>
                    <button
                      type="submit"
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
                          e.target.style.boxShadow = theme.buttonHover;
                          e.target.style.transform = 'translateY(-2px)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.boxShadow = 'none';
                        e.target.style.transform = 'translateY(0)';
                      }}
                    >
                      {loading ? '⏳ Creando...' : '✅ Crear Lección'}
                    </button>
                  </div>
                </form>
              )}

              {/* PLAN MODE */}
              {mode === 'default-plan' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div
                    style={{
                      backgroundColor: theme.infoBg,
                      color: theme.info,
                      padding: '16px',
                      borderRadius: '8px',
                      borderLeft: `4px solid ${theme.infoBorder}`,
                    }}
                  >
                    <p style={{
                      margin: 0,
                      fontSize: '14px',
                      fontWeight: 600,
                      marginBottom: '8px',
                    }}>
                      📚 Plan de Lecciones Predeterminado
                    </p>
                    <p style={{ margin: '4px 0 0 0', fontSize: '13px', lineHeight: 1.5 }}>
                      Se crearán automáticamente todas las lecciones según el nivel de la cohorte.
                      Las lecciones se distribuirán semanalmente desde la fecha de inicio.
                    </p>
                  </div>

                  <div
                    style={{
                      backgroundColor: isDarkMode ? '#78350f' : '#fef3c7',
                      color: isDarkMode ? '#fcd34d' : '#92400e',
                      padding: '16px',
                      borderRadius: '8px',
                      borderLeft: `4px solid ${isDarkMode ? '#f59e0b' : '#f59e0b'}`,
                    }}
                  >
                    <p style={{
                      margin: 0,
                      fontSize: '14px',
                      fontWeight: 600,
                      marginBottom: '8px',
                    }}>
                      ⚠️ Importante:
                    </p>
                    <ul style={{ margin: '4px 0 0 0', paddingLeft: '20px', fontSize: '13px' }}>
                      <li>✅ Solo PASTORES y AREAS pueden crear planes</li>
                      <li>✅ Se crearán todas las lecciones del nivel automáticamente</li>
                      <li>❌ No se puede deshacer una vez creado</li>
                      <li>✅ Después puedes inicializar asistencias para cada lección</li>
                    </ul>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      gap: '12px',
                      justifyContent: 'flex-end',
                    }}
                  >
                    <button
                      onClick={handleClose}
                      disabled={loading}
                      style={{
                        padding: '10px 20px',
                        backgroundColor: theme.bgSecondary,
                        color: theme.text,
                        border: `1px solid ${theme.border}`,
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: 600,
                        cursor: loading ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s',
                        opacity: loading ? 0.6 : 1,
                      }}
                      onMouseEnter={(e) => {
                        if (!loading) e.target.style.opacity = '0.8';
                      }}
                      onMouseLeave={(e) => {
                        if (!loading) e.target.style.opacity = '1';
                      }}
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleCreateDefaultPlan}
                      disabled={loading}
                      style={{
                        padding: '12px 28px',
                        background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '15px',
                        fontWeight: 600,
                        cursor: loading ? 'not-allowed' : 'pointer',
                        width: '100%',
                        transition: 'all 0.2s',
                        opacity: loading ? 0.6 : 1,
                      }}
                      onMouseEnter={(e) => {
                        if (!loading) {
                          e.target.style.boxShadow = theme.buttonHover;
                          e.target.style.transform = 'translateY(-2px)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.boxShadow = 'none';
                        e.target.style.transform = 'translateY(0)';
                      }}
                    >
                      {loading ? '⏳ Creando plan...' : '📚 Crear Plan Completo'}
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              {/* SUCCESS DIALOG */}
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: '64px', marginBottom: '16px' }}>✅</div>
                <h3 style={{
                  fontSize: '20px',
                  fontWeight: 700,
                  color: theme.success,
                  margin: '0 0 8px 0',
                }}>
                  ¡{createdLessonId ? 'Lección' : 'Plan de lecciones'} creado exitosamente!
                </h3>

                {createdLessons.length > 0 && (
                  <div style={{ margin: '16px 0', padding: '12px', backgroundColor: theme.bgLight, borderRadius: '8px' }}>
                    <p style={{
                      margin: '0 0 12px 0',
                      fontWeight: 600,
                      color: theme.text,
                    }}>
                      Lecciones creadas: {createdLessons.length}
                    </p>
                    <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {createdLessons.map((lesson, idx) => (
                        <div
                          key={lesson.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '8px',
                            backgroundColor: theme.card,
                            borderRadius: '6px',
                            fontSize: '13px',
                            color: theme.text,
                            borderLeft: `3px solid #2563eb`,
                          }}
                        >
                          <span style={{ fontWeight: 700, color: '#2563eb', minWidth: '30px' }}>
                            {idx + 1}.
                          </span>
                          <span style={{ flex: 1 }}>{lesson.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <p style={{ color: theme.text, margin: '16px 0' }}>
                  ¿Deseas inicializar los registros de asistencia ahora?
                </p>

                <div
                  style={{
                    backgroundColor: theme.infoBg,
                    color: theme.info,
                    padding: '12px 16px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    borderLeft: `4px solid ${theme.infoBorder}`,
                    marginBottom: '16px',
                  }}
                >
                  📊 Se crearán registros de asistencia para todos los estudiantes inscritos en la cohorte.
                </div>

                <div
                  style={{
                    display: 'flex',
                    gap: '12px',
                    justifyContent: 'flex-end',
                  }}
                >
                  <button
                    onClick={handleSkipAttendance}
                    disabled={initializingAttendance}
                    style={{
                      padding: '10px 20px',
                      backgroundColor: theme.bgSecondary,
                      color: theme.text,
                      border: `1px solid ${theme.border}`,
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: 600,
                      cursor: initializingAttendance ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s',
                      opacity: initializingAttendance ? 0.6 : 1,
                    }}
                    onMouseEnter={(e) => {
                      if (!initializingAttendance) e.target.style.opacity = '0.8';
                    }}
                    onMouseLeave={(e) => {
                      if (!initializingAttendance) e.target.style.opacity = '1';
                    }}
                  >
                    Hacerlo Después
                  </button>
                  <button
                    onClick={handleInitializeAttendance}
                    disabled={initializingAttendance}
                    style={{
                      padding: '10px 20px',
                      background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: 600,
                      cursor: initializingAttendance ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s',
                      opacity: initializingAttendance ? 0.6 : 1,
                    }}
                    onMouseEnter={(e) => {
                      if (!initializingAttendance) {
                        e.target.style.boxShadow = theme.buttonHover;
                        e.target.style.transform = 'translateY(-2px)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.boxShadow = 'none';
                      e.target.style.transform = 'translateY(0)';
                    }}
                  >
                    {initializingAttendance ? '⏳ Inicializando...' : '📊 Inicializar Asistencias'}
                  </button>
                </div>
              </div>
            </>
          )}
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

export default ModalCreateLesson;