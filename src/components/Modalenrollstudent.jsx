// 📝 ModalEnrollStudent.jsx - Modal para inscribir estudiantes a cohortes
// Permite seleccionar estudiante, nivel y cohorte disponible

import React, { useState, useEffect } from 'react';
import apiService from '../apiService';

const ModalEnrollStudent = ({ isOpen, onClose, onEnrollmentSuccess }) => {
  // ========== ESTADO ==========
  const [step, setStep] = useState(1); // 1: Seleccionar estudiante, 2: Seleccionar nivel, 3: Seleccionar cohorte
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

  // Cargar cohortes disponibles cuando se selecciona nivel
  useEffect(() => {
    if (selectedLevel && step === 3) {
      loadAvailableCohorts();
    }
  }, [selectedLevel, step]);

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
  const loadAvailableCohorts = async () => {
    setLoading(true);
    setError('');

    try {
      console.log('📚 Cargando cohortes disponibles para nivel:', selectedLevel);
      const data = await apiService.getAvailableCohortsByLevel(selectedLevel);
      setAvailableCohorts(data || []);
      console.log('✅ Cohortes cargadas:', data?.length || 0);
    } catch (err) {
      console.error('❌ Error cargando cohortes:', err);
      setError('Error al cargar cohortes: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

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
      console.log('  Estudiante:', selectedMember.id);
      console.log('  Cohorte:', selectedCohort.cohortId);

      await apiService.createStudentEnrollment(selectedMember.id, selectedCohort.cohortId);

      console.log('✅ Estudiante inscrito exitosamente');
      alert('Estudiante inscrito exitosamente en la cohorte');

      // Resetear y cerrar modal
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
    member.name?.toLowerCase().includes(searchMember.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleReset}>
      <div className="modal-container enroll-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <h2 className="modal-title">
            {step === 1 && '👤 Seleccionar Estudiante'}
            {step === 2 && '📚 Seleccionar Nivel'}
            {step === 3 && '🎓 Seleccionar Cohorte'}
          </h2>
          <button className="modal-close-btn" onClick={handleReset}>✕</button>
        </div>

        {/* Progress Bar */}
        <div className="progress-container">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${(step / 3) * 100}%` }}></div>
          </div>
          <p className="progress-text">Paso {step} de 3</p>
        </div>

        {/* Body */}
        <div className="modal-body">
          {error && (
            <div className="error-message">
              ❌ {error}
            </div>
          )}

          {loading ? (
            <div className="loading-state">
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
                    />
                  </div>

                  <div className="options-list">
                    {filteredMembers.length === 0 ? (
                      <p className="no-options">No hay estudiantes disponibles</p>
                    ) : (
                      filteredMembers.map(member => (
                        <div
                          key={member.id}
                          className={`option-item ${selectedMember?.id === member.id ? 'selected' : ''}`}
                          onClick={() => setSelectedMember(member)}
                        >
                          <input
                            type="radio"
                            checked={selectedMember?.id === member.id}
                            onChange={() => setSelectedMember(member)}
                          />
                          <span className="option-text">
                            <strong>{member.name}</strong>
                            <small>{member.email}</small>
                          </span>
                        </div>
                      ))
                    )}
                  </div>

                  {selectedMember && (
                    <div className="selection-summary">
                      <p>✅ Estudiante seleccionado: <strong>{selectedMember.name}</strong></p>
                    </div>
                  )}
                </div>
              )}

              {/* PASO 2: Seleccionar Nivel */}
              {step === 2 && (
                <div className="step-content">
                  <p className="step-info">
                    Estudiante: <strong>{selectedMember?.name}</strong>
                  </p>

                  <div className="options-grid">
                    {LEVELS.map(level => (
                      <div
                        key={level.value}
                        className={`option-card ${selectedLevel === level.value ? 'selected' : ''}`}
                        onClick={() => setSelectedLevel(level.value)}
                      >
                        <input
                          type="radio"
                          checked={selectedLevel === level.value}
                          onChange={() => setSelectedLevel(level.value)}
                        />
                        <span className="card-label">{level.label}</span>
                      </div>
                    ))}
                  </div>

                  {selectedLevel && (
                    <div className="selection-summary">
                      <p>✅ Nivel seleccionado: <strong>{LEVELS.find(l => l.value === selectedLevel)?.label}</strong></p>
                    </div>
                  )}
                </div>
              )}

              {/* PASO 3: Seleccionar Cohorte */}
              {step === 3 && (
                <div className="step-content">
                  <p className="step-info">
                    Estudiante: <strong>{selectedMember?.name}</strong><br />
                    Nivel: <strong>{LEVELS.find(l => l.value === selectedLevel)?.label}</strong>
                  </p>

                  <div className="cohorts-list">
                    {availableCohorts.length === 0 ? (
                      <p className="no-options">
                        No hay cohortes disponibles para este nivel
                      </p>
                    ) : (
                      availableCohorts.map(cohort => (
                        <div
                          key={cohort.cohortId}
                          className={`cohort-item ${selectedCohort?.cohortId === cohort.cohortId ? 'selected' : ''}`}
                          onClick={() => setSelectedCohort(cohort)}
                        >
                          <input
                            type="radio"
                            checked={selectedCohort?.cohortId === cohort.cohortId}
                            onChange={() => setSelectedCohort(cohort)}
                          />
                          <div className="cohort-info">
                            <strong>{cohort.cohortName}</strong>
                            <p>
                              Maestro: {cohort.maestro?.name || 'No asignado'} | 
                              Estudiantes: {cohort.currentStudents}/{cohort.maxStudents} |
                              Espacios: {cohort.availableSpots}
                            </p>
                            <span className={`status-badge ${cohort.available ? 'available' : 'full'}`}>
                              {cohort.available ? '✅ Disponible' : '❌ Llena'}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {selectedCohort && (
                    <div className="selection-summary">
                      <p>✅ Cohorte seleccionada: <strong>{selectedCohort.cohortName}</strong></p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button
            className="btn-secondary"
            onClick={handlePrevious}
            disabled={step === 1 || loading}
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
          max-width: 700px;
          width: 95%;
          max-height: 90vh;
          overflow-y: auto;
          animation: slideInUp 0.3s ease-in-out;
          display: flex;
          flex-direction: column;
        }

        .modal-header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-radius: 12px 12px 0 0;
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
          background: #f5f7fa;
          border-bottom: 1px solid #e0e0e0;
        }

        .progress-bar {
          height: 6px;
          background: #e0e0e0;
          border-radius: 3px;
          overflow: hidden;
          margin-bottom: 8px;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
          transition: width 0.3s ease;
        }

        .progress-text {
          margin: 0;
          font-size: 12px;
          color: #666;
          font-weight: 500;
        }

        .modal-body {
          flex: 1;
          padding: 24px;
          overflow-y: auto;
        }

        .error-message {
          background: #fee2e2;
          color: #991b1b;
          padding: 12px 16px;
          border-radius: 8px;
          margin-bottom: 16px;
          border-left: 4px solid #ef4444;
        }

        .loading-state {
          text-align: center;
          padding: 40px 20px;
          color: #666;
        }

        .step-content {
          animation: fadeIn 0.3s ease-in-out;
        }

        .step-info {
          margin: 0 0 20px;
          padding: 12px 16px;
          background: #f0f9ff;
          border-left: 4px solid #0284c7;
          border-radius: 6px;
          color: #0c4a6e;
          font-size: 13px;
        }

        .step-info strong {
          color: #075985;
        }

        .search-box {
          margin-bottom: 16px;
        }

        .search-input {
          width: 100%;
          padding: 10px 12px;
          border: 1.5px solid #e0e0e0;
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
          border: 1.5px solid #e0e0e0;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: flex-start;
          gap: 12px;
        }

        .option-item:hover,
        .cohort-item:hover {
          background: #f9fafb;
          border-color: #667eea;
        }

        .option-item.selected,
        .cohort-item.selected {
          background: #e0e7ff;
          border-color: #667eea;
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
          color: #333;
        }

        .option-text small {
          color: #999;
          font-size: 12px;
        }

        .cohort-info {
          flex: 1;
        }

        .cohort-info strong {
          display: block;
          color: #333;
          margin-bottom: 4px;
        }

        .cohort-info p {
          margin: 0 0 8px;
          color: #666;
          font-size: 12px;
        }

        .status-badge {
          display: inline-block;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 600;
        }

        .status-badge.available {
          background: #d1fae5;
          color: #065f46;
        }

        .status-badge.full {
          background: #fee2e2;
          color: #991b1b;
        }

        .options-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
          gap: 12px;
          margin-bottom: 20px;
        }

        .option-card {
          padding: 16px 12px;
          border: 1.5px solid #e0e0e0;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
          text-align: center;
        }

        .option-card:hover {
          background: #f9fafb;
          border-color: #667eea;
        }

        .option-card.selected {
          background: #e0e7ff;
          border-color: #667eea;
        }

        .option-card input {
          margin-bottom: 8px;
          cursor: pointer;
        }

        .card-label {
          display: block;
          font-weight: 500;
          color: #333;
          font-size: 13px;
        }

        .no-options {
          text-align: center;
          color: #999;
          padding: 20px;
        }

        .selection-summary {
          margin-top: 20px;
          padding: 12px 16px;
          background: #f0fdf4;
          border-left: 4px solid #10b981;
          border-radius: 6px;
          color: #065f46;
          font-size: 13px;
        }

        .modal-footer {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
          padding: 16px 24px;
          border-top: 1px solid #e0e0e0;
          background: #f9fafb;
          border-radius: 0 0 12px 12px;
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
          background: #e0e0e0;
          color: #333;
        }

        .btn-secondary:hover:not(:disabled) {
          background: #d0d0d0;
        }

        .btn-tertiary {
          background: none;
          color: #666;
          border: 1px solid #e0e0e0;
        }

        .btn-tertiary:hover:not(:disabled) {
          background: #f9fafb;
          border-color: #999;
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