// 📝 ModalEnrollStudent.jsx - v2 CON MODO OSCURO
// Modal para inscribir estudiantes a cohortes
// Legible automáticamente en modo oscuro
// ✅ ARREGLADO: loadAvailableCohorts envuelto en useCallback
// ✅ IMPLEMENTADO: nameHelper para transformar nombres de pastores solo en vista

import React, { useState, useEffect, useCallback } from 'react';
import apiService from '../apiService';
import nameHelper from '../services/nameHelper'; // ✅ Importar el helper

// Extraer función del helper
const { getDisplayName } = nameHelper;

const ModalEnrollStudent = ({ isOpen, onClose, onEnrollmentSuccess }) => {
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
    bgLight: isDarkMode ? '#1a2332' : '#f5f7fa',
    text: isDarkMode ? '#f1f5f9' : '#111827',
    textSecondary: isDarkMode ? '#cbd5e1' : '#666666',
    textTertiary: isDarkMode ? '#94a3b8' : '#999999',
    border: isDarkMode ? '#334155' : '#e0e0e0',
    borderLight: isDarkMode ? '#475569' : '#f0f0f0',
    header: isDarkMode
      ? 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)'
      : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    card: isDarkMode ? '#1e293b' : '#ffffff',
    hover: isDarkMode ? '#334155' : '#f9fafb',
    selected: isDarkMode ? '#334155' : '#e0e7ff',
    selectedBorder: isDarkMode ? '#6366f1' : '#667eea',
    infoBox: isDarkMode ? '#1e3a8a' : '#f0f9ff',
    infoBorder: isDarkMode ? '#3b82f6' : '#0284c7',
    infoText: isDarkMode ? '#93c5fd' : '#0c4a6e',
  };

  // ========== ESTADO ==========
  const [step, setStep] = useState(1);
  const [members, setMembers] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [selectedLevel, setSelectedLevel] = useState(null);
  const [availableCohorts, setAvailableCohorts] = useState([]);
  const [selectedCohort, setSelectedCohort] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchMember, setSearchMember] = useState('');

  const LEVELS = [
    { value: 'PREENCUENTRO', label: 'Pre-encuentro' },
    { value: 'ENCUENTRO', label: 'Encuentro' },
    { value: 'POST_ENCUENTRO', label: 'Post-encuentro' },
    { value: 'BAUTIZOS', label: 'Bautizos' },
    { value: 'EDIRD_1', label: 'EDIRD 1' },
    { value: 'EDIRD_2', label: 'EDIRD 2' },
    { value: 'EDIRD_3', label: 'EDIRD 3' },
    { value: 'SANIDAD_INTEGRAL_RAICES', label: 'Sanidad Integral Raíces' },
    { value: 'EDIRD_4', label: 'EDIRD 4' },
    { value: 'ADIESTRAMIENTO', label: 'Adiestramiento' },
    { value: 'GRADUACION', label: 'Graduación' },
  ];

  // Cargar miembros al abrir modal
  useEffect(() => {
    if (isOpen && step === 1) {
      loadMembers();
    }
  }, [isOpen, step]);

  // ========== CARGAR MIEMBROS ==========
  const loadMembers = async () => {
    setLoading(true);
    setError('');

    try {
      console.log('📚 Cargando miembros...');
      const data = await apiService.getAllMembers();
      setMembers(data || []);
      console.log('✅ Miembros cargados:', data?.length || 0);
    } catch (err) {
      console.error('❌ Error cargando miembros:', err);
      setError('Error al cargar miembros: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // ========== CARGAR COHORTES DISPONIBLES ==========
  // ✅ ARREGLADO: Envuelto en useCallback
  const loadAvailableCohorts = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      console.log('📚 Cargando cohortes disponibles para nivel:', selectedLevel);
      const data = await apiService.getAvailableCohortsByLevel(selectedLevel);
      
      // ✅ Transformar nombres de maestros para visualización
      const transformedCohorts = (data || []).map(cohort => ({
        ...cohort,
        maestro: cohort.maestro ? {
          ...cohort.maestro,
          displayName: getDisplayName(cohort.maestro.name) // ✅ Nombre transformado para mostrar
        } : null
      }));
      
      setAvailableCohorts(transformedCohorts);
      console.log('✅ Cohortes cargadas:', data?.length || 0);
    } catch (err) {
      console.error('❌ Error cargando cohortes:', err);
      setError('Error al cargar cohortes: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [selectedLevel]);

  // Cargar cohortes disponibles cuando se selecciona nivel
  useEffect(() => {
    if (selectedLevel && step === 3) {
      loadAvailableCohorts();
    }
  }, [selectedLevel, step, loadAvailableCohorts]);

  // ========== MANEJAR SIGUIENTE PASO ==========
  const handleNext = () => {
    if (step === 1 && !selectedMember) {
      setError('Debes seleccionar un estudiante');
      return;
    }
    if (step === 2 && !selectedLevel) {
      setError('Debes seleccionar un nivel');
      return;
    }
    if (step === 1) {
      setStep(2);
      setError('');
    } else if (step === 2) {
      setStep(3);
      setError('');
    }
  };

  // ========== MANEJAR PASO ANTERIOR ==========
  const handlePrevious = () => {
    if (step > 1) {
      setStep(step - 1);
      setError('');
    }
  };

  // ========== INSCRIBIR ESTUDIANTE ==========
  const handleEnroll = async () => {
  if (!selectedMember || !selectedCohort) {
    setError('Falta seleccionar información');
    return;
  }

  setLoading(true);
  setError('');

  try {
    console.log('📝 Inscribiendo estudiante...');
    
    // Crear la inscripción
    await apiService.createStudentEnrollment(selectedMember.id, selectedCohort.cohortId);

    console.log('✅ Estudiante inscrito exitosamente');
    
    // ✅ Mostrar alert inmediatamente
    alert('Estudiante inscrito exitosamente en la cohorte');
    
    // ✅ Luego ejecutar otras operaciones
    handleReset();
    onEnrollmentSuccess();
    
  } catch (err) {
    console.error('❌ Error inscribiendo estudiante:', err);
    setError('Error al inscribir: ' + err.message);
  } finally {
    setLoading(false);
  }
};

  // ========== RESETEAR MODAL ==========
  const handleReset = () => {
    setStep(1);
    setSelectedMember(null);
    setSelectedLevel(null);
    setSelectedCohort(null);
    setSearchMember('');
    setError('');
    onClose();
  };

  // Filtrar miembros por búsqueda
  const filteredMembers = members.filter(member =>
    member.name?.toLowerCase().includes(searchMember.toLowerCase()) ||
    getDisplayName(member.name)?.toLowerCase().includes(searchMember.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay"
      style={{
        backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.7)' : 'rgba(0, 0, 0, 0.5)',
      }}
      onClick={handleReset}
    >
      <div
        className="modal-container enroll-modal"
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
          <h2 className="modal-title">
            {step === 1 && '👤 Seleccionar Estudiante'}
            {step === 2 && '📚 Seleccionar Nivel'}
            {step === 3 && '🎓 Seleccionar Cohorte'}
          </h2>
          <button className="modal-close-btn" onClick={handleReset}>✕</button>
        </div>

        {/* Progress Bar */}
        <div
          className="progress-container"
          style={{
            backgroundColor: themeColors.bgLight,
            borderBottomColor: themeColors.border,
          }}
        >
          <div className="progress-bar" style={{ backgroundColor: themeColors.border }}>
            <div className="progress-fill" style={{ width: `${(step / 3) * 100}%` }}></div>
          </div>
          <p className="progress-text" style={{ color: themeColors.textSecondary }}>Paso {step} de 3</p>
        </div>

        {/* Body */}
        <div className="modal-body">
          {error && (
            <div
              className="error-message"
              style={{
                backgroundColor: isDarkMode ? '#7f1d1d' : '#fee2e2',
                color: isDarkMode ? '#fca5a5' : '#991b1b',
                borderLeftColor: isDarkMode ? '#dc2626' : '#ef4444',
              }}
            >
              ❌ {error}
            </div>
          )}

          {loading ? (
            <div className="loading-state" style={{ color: themeColors.textSecondary }}>
              ⏳ Cargando información...
            </div>
          ) : (
            <>
              {/* PASO 1: Seleccionar Estudiante */}
              {step === 1 && (
                <div className="step-content">
                  <div className="search-box">
                    <input
                      type="text"
                      placeholder="🔍 Buscar estudiante por nombre..."
                      value={searchMember}
                      onChange={(e) => setSearchMember(e.target.value)}
                      className="search-input"
                      style={{
                        backgroundColor: themeColors.card,
                        color: themeColors.text,
                        borderColor: themeColors.border,
                      }}
                    />
                  </div>

                  <div className="options-list">
                    {filteredMembers.length === 0 ? (
                      <p className="no-options" style={{ color: themeColors.textTertiary }}>
                        No hay estudiantes disponibles
                      </p>
                    ) : (
                      filteredMembers.map(member => (
                        <div
                          key={member.id}
                          className={`option-item ${selectedMember?.id === member.id ? 'selected' : ''}`}
                          style={{
                            borderColor: selectedMember?.id === member.id ? themeColors.selectedBorder : themeColors.border,
                            backgroundColor: selectedMember?.id === member.id ? themeColors.selected : themeColors.card,
                          }}
                          onClick={() => setSelectedMember(member)}
                        >
                          <input
                            type="radio"
                            checked={selectedMember?.id === member.id}
                            onChange={() => setSelectedMember(member)}
                          />
                          <span className="option-text">
                            {/* ✅ Mostrar nombre transformado */}
                            <strong style={{ color: themeColors.text }}>
                              {getDisplayName(member.name)}
                            </strong>
                            <small style={{ color: themeColors.textSecondary }}>{member.email}</small>
                          </span>
                        </div>
                      ))
                    )}
                  </div>

                  {selectedMember && (
                    <div
                      className="selection-summary"
                      style={{
                        backgroundColor: isDarkMode ? '#064e3b' : '#f0fdf4',
                        borderLeftColor: isDarkMode ? '#10b981' : '#10b981',
                        color: isDarkMode ? '#86efac' : '#065f46',
                      }}
                    >
                      {/* ✅ Mostrar nombre transformado */}
                      <p>✅ Estudiante seleccionado: <strong>{getDisplayName(selectedMember.name)}</strong></p>
                    </div>
                  )}
                </div>
              )}

              {/* PASO 2: Seleccionar Nivel */}
              {step === 2 && (
                <div className="step-content">
                  <p
                    className="step-info"
                    style={{
                      backgroundColor: themeColors.infoBox,
                      borderLeftColor: themeColors.infoBorder,
                      color: themeColors.infoText,
                    }}
                  >
                    {/* ✅ Mostrar nombre transformado */}
                    Estudiante: <strong>{getDisplayName(selectedMember?.name)}</strong>
                  </p>

                  <div className="options-grid">
                    {LEVELS.map(level => (
                      <div
                        key={level.value}
                        className={`option-card ${selectedLevel === level.value ? 'selected' : ''}`}
                        style={{
                          borderColor: selectedLevel === level.value ? themeColors.selectedBorder : themeColors.border,
                          backgroundColor: selectedLevel === level.value ? themeColors.selected : themeColors.card,
                        }}
                        onClick={() => setSelectedLevel(level.value)}
                      >
                        <input
                          type="radio"
                          checked={selectedLevel === level.value}
                          onChange={() => setSelectedLevel(level.value)}
                        />
                        <span className="card-label" style={{ color: themeColors.text }}>{level.label}</span>
                      </div>
                    ))}
                  </div>

                  {selectedLevel && (
                    <div
                      className="selection-summary"
                      style={{
                        backgroundColor: isDarkMode ? '#064e3b' : '#f0fdf4',
                        borderLeftColor: isDarkMode ? '#10b981' : '#10b981',
                        color: isDarkMode ? '#86efac' : '#065f46',
                      }}
                    >
                      <p>✅ Nivel seleccionado: <strong>{LEVELS.find(l => l.value === selectedLevel)?.label}</strong></p>
                    </div>
                  )}
                </div>
              )}

              {/* PASO 3: Seleccionar Cohorte */}
              {step === 3 && (
                <div className="step-content">
                  <p
                    className="step-info"
                    style={{
                      backgroundColor: themeColors.infoBox,
                      borderLeftColor: themeColors.infoBorder,
                      color: themeColors.infoText,
                    }}
                  >
                    {/* ✅ Mostrar nombre transformado */}
                    Estudiante: <strong>{getDisplayName(selectedMember?.name)}</strong><br />
                    Nivel: <strong>{LEVELS.find(l => l.value === selectedLevel)?.label}</strong>
                  </p>

                  <div className="cohorts-list">
                    {availableCohorts.length === 0 ? (
                      <p className="no-options" style={{ color: themeColors.textTertiary }}>
                        No hay cohortes disponibles para este nivel
                      </p>
                    ) : (
                      availableCohorts.map(cohort => (
                        <div
                          key={cohort.cohortId}
                          className={`cohort-item ${selectedCohort?.cohortId === cohort.cohortId ? 'selected' : ''}`}
                          style={{
                            borderColor: selectedCohort?.cohortId === cohort.cohortId ? themeColors.selectedBorder : themeColors.border,
                            backgroundColor: selectedCohort?.cohortId === cohort.cohortId ? themeColors.selected : themeColors.card,
                          }}
                          onClick={() => setSelectedCohort(cohort)}
                        >
                          <input
                            type="radio"
                            checked={selectedCohort?.cohortId === cohort.cohortId}
                            onChange={() => setSelectedCohort(cohort)}
                          />
                          <div className="cohort-info">
                            <strong style={{ color: themeColors.text }}>{cohort.cohortName}</strong>
                            <p style={{ color: themeColors.textSecondary }}>
                              {/* ✅ Mostrar nombre transformado del maestro */}
                              Maestro: {cohort.maestro?.displayName || getDisplayName(cohort.maestro?.name) || 'No asignado'} |
                              Estudiantes: {cohort.currentStudents}/{cohort.maxStudents} |
                              Espacios: {cohort.availableSpots}
                            </p>
                            <span
                              className={`status-badge ${cohort.available ? 'available' : 'full'}`}
                              style={{
                                backgroundColor: cohort.available
                                  ? isDarkMode ? '#064e3b' : '#d1fae5'
                                  : isDarkMode ? '#7f1d1d' : '#fee2e2',
                                color: cohort.available
                                  ? isDarkMode ? '#86efac' : '#065f46'
                                  : isDarkMode ? '#fca5a5' : '#991b1b',
                              }}
                            >
                              {cohort.available ? '✅ Disponible' : '❌ Llena'}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {selectedCohort && (
                    <div
                      className="selection-summary"
                      style={{
                        backgroundColor: isDarkMode ? '#064e3b' : '#f0fdf4',
                        borderLeftColor: isDarkMode ? '#10b981' : '#10b981',
                        color: isDarkMode ? '#86efac' : '#065f46',
                      }}
                    >
                      <p>✅ Cohorte seleccionada: <strong>{selectedCohort.cohortName}</strong></p>
                      {selectedCohort.maestro && (
                        <p>Maestro: <strong>{selectedCohort.maestro.displayName || getDisplayName(selectedCohort.maestro.name)}</strong></p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div
          className="modal-footer"
          style={{
            backgroundColor: themeColors.bgLight,
            borderTopColor: themeColors.border,
          }}
        >
          <button
            className="btn-secondary"
            onClick={handlePrevious}
            disabled={step === 1 || loading}
            style={{
              backgroundColor: themeColors.bgSecondary,
              color: themeColors.text,
              borderColor: themeColors.border,
            }}
          >
            ← Anterior
          </button>

          {step < 3 ? (
            <button
              className="btn-primary"
              onClick={handleNext}
              disabled={loading || (step === 1 && !selectedMember) || (step === 2 && !selectedLevel)}
            >
              Siguiente →
            </button>
          ) : (
            <button
              className="btn-primary"
              onClick={handleEnroll}
              disabled={loading || !selectedCohort}
            >
              ✅ Inscribir
            </button>
          )}

          <button
            className="btn-tertiary"
            onClick={handleReset}
            style={{
              color: themeColors.textSecondary,
              borderColor: themeColors.border,
            }}
          >
            ✕ Cancelar
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
          max-width: 700px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
          animation: slideInUp 0.3s ease-in-out;
          display: flex;
          flex-direction: column;
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
          margin: 0;
          font-size: 20px;
          font-weight: 700;
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

        .progress-container {
          padding: 16px 24px;
          border-bottom: 1px solid;
          transition: all 300ms ease-in-out;
        }

        .progress-bar {
          height: 6px;
          border-radius: 3px;
          overflow: hidden;
          margin-bottom: 8px;
          transition: background 300ms ease-in-out;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
          transition: width 0.3s ease;
        }

        .progress-text {
          margin: 0;
          font-size: 12px;
          font-weight: 500;
          transition: color 300ms ease-in-out;
        }

        .modal-body {
          flex: 1;
          padding: 24px;
          overflow-y: auto;
          transition: color 300ms ease-in-out;
        }

        .error-message {
          padding: 12px 16px;
          border-radius: 8px;
          margin-bottom: 16px;
          border-left: 4px solid;
          transition: all 300ms ease-in-out;
        }

        .loading-state {
          text-align: center;
          padding: 40px 20px;
          transition: color 300ms ease-in-out;
        }

        .step-content {
          animation: fadeIn 0.3s ease-in-out;
        }

        .step-info {
          margin: 0 0 20px;
          padding: 12px 16px;
          border-left: 4px solid;
          border-radius: 6px;
          font-size: 13px;
          transition: all 300ms ease-in-out;
        }

        .step-info strong {
          font-weight: 600;
        }

        .search-box {
          margin-bottom: 16px;
        }

        .search-input {
          width: 100%;
          padding: 10px 12px;
          border: 1.5px solid;
          border-radius: 8px;
          font-size: 14px;
          font-family: inherit;
          transition: all 0.2s;
        }

        .search-input:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        .options-list,
        .cohorts-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
          max-height: 400px;
          overflow-y: auto;
        }

        .option-item,
        .cohort-item {
          padding: 12px 16px;
          border: 1.5px solid;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: flex-start;
          gap: 12px;
        }

        .option-item:hover,
        .cohort-item:hover {
          transform: translateX(4px);
        }

        .option-item input,
        .cohort-item input {
          margin-top: 2px;
          cursor: pointer;
        }

        .option-text {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .option-text strong {
          font-weight: 600;
        }

        .option-text small {
          font-size: 12px;
        }

        .cohort-info {
          flex: 1;
        }

        .cohort-info strong {
          display: block;
          margin-bottom: 4px;
        }

        .cohort-info p {
          margin: 0 0 8px;
          font-size: 12px;
        }

        .status-badge {
          display: inline-block;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 600;
          transition: all 300ms ease-in-out;
        }

        .options-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
          gap: 12px;
          margin-bottom: 20px;
        }

        .option-card {
          padding: 16px 12px;
          border: 1.5px solid;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
          text-align: center;
        }

        .option-card:hover {
          transform: translateY(-2px);
        }

        .option-card input {
          margin-bottom: 8px;
          cursor: pointer;
        }

        .card-label {
          display: block;
          font-weight: 500;
          font-size: 13px;
          transition: color 300ms ease-in-out;
        }

        .no-options {
          text-align: center;
          padding: 20px;
          transition: color 300ms ease-in-out;
        }

        .selection-summary {
          margin-top: 20px;
          padding: 12px 16px;
          border-left: 4px solid;
          border-radius: 6px;
          font-size: 13px;
          transition: all 300ms ease-in-out;
        }

        .modal-footer {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
          padding: 16px 24px;
          border-top: 1px solid;
          border-radius: 0 0 12px 12px;
          transition: all 300ms ease-in-out;
        }

        .btn-primary,
        .btn-secondary,
        .btn-tertiary {
          padding: 10px 20px;
          border: none;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-primary {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
          transform: translateY(-2px);
        }

        .btn-secondary {
          border: 1px solid;
          transition: all 300ms ease-in-out;
        }

        .btn-secondary:hover:not(:disabled) {
          opacity: 0.8;
        }

        .btn-tertiary {
          background: none;
          border: 1px solid;
          transition: all 300ms ease-in-out;
        }

        .btn-tertiary:hover:not(:disabled) {
          opacity: 0.8;
        }

        .btn-primary:disabled,
        .btn-secondary:disabled,
        .btn-tertiary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
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

          .options-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .modal-footer {
            flex-direction: column;
          }

          .btn-primary,
          .btn-secondary,
          .btn-tertiary {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
};

export default ModalEnrollStudent;