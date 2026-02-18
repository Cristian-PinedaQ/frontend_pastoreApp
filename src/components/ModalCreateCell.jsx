// ============================================
// ModalCreateCell.jsx - VERSIÓN CON JERARQUÍA COMPLETA
// Incluye: Líder de Red (LEADER_12) → Líder de Rama (LEADER_144) → Líder de Grupo
// ============================================

import React, { useState, useEffect } from 'react';
import apiService from '../apiService';
import { logUserAction, logSecurityEvent } from '../utils/securityLogger';
import '../css/ModalCreateCell.css';

const DEBUG = process.env.REACT_APP_DEBUG === "true";

const log = (message, data) => {
  if (DEBUG) {
    console.log(`[ModalCreateCell] ${message}`, data || '');
  }
};

const logError = (message, error) => {
  console.error(`[ModalCreateCell] ${message}`, error);
};

const MEETING_DAYS = [
  'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'
];

const DISTRICTS = [
  { value: 'PASTORES', label: 'Pastores' },
  { value: 'D1', label: 'Distrito 1' },
  { value: 'D2', label: 'Distrito 2' },
  { value: 'D3', label: 'Distrito 3' },
];

const ModalCreateCell = ({ isOpen, onClose, onCreateSuccess }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [leaders, setLeaders] = useState([]);
  const [loadingLeaders, setLoadingLeaders] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    mainLeaderId: '',      // Líder de Red (LEADER_12)
    branchLeaderId: '',    // Líder de Rama (LEADER_144) - OPCIONAL
    groupLeaderId: '',     // Líder de Grupo (cualquier tipo activo)
    hostId: '',            // Anfitrión (SERVANT)
    timoteoId: '',         // Timoteo (SERVANT)
    meetingDay: '',
    meetingTime: '',
    meetingAddress: '',
    maxCapacity: '15',
    district: '',
    notes: ''
  });

  const [errors, setErrors] = useState({});
  const [createResult, setCreateResult] = useState(null);
  const [error, setError] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Detectar dark mode
  useEffect(() => {
    const checkDarkMode = () => {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const savedMode = localStorage.getItem('darkMode');
      const htmlHasDarkClass = document.documentElement.classList.contains('dark-mode') ||
        document.documentElement.classList.contains('dark');
      const bodyHasDarkClass = document.body.classList.contains('dark-mode') ||
        document.body.classList.contains('dark');

      setIsDarkMode(
        savedMode === 'true' || htmlHasDarkClass || bodyHasDarkClass || prefersDark
      );
    };

    checkDarkMode();

    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (isOpen && step === 2) {
      loadLeaders();
    }
  }, [isOpen, step]);

  const loadLeaders = async () => {
    setLoadingLeaders(true);
    try {
      log('Cargando líderes disponibles');
      const activeLeaders = await apiService.getActiveLeaders();
      
      const leadersList = activeLeaders.map(leader => ({
        id: leader.id,
        name: leader.memberName || `Líder ID: ${leader.id}`,
        type: leader.leaderType,
        typeDisplay: leader.leaderTypeDisplay,
        isLeader12: leader.leaderType === 'LEADER_12',
        isLeader144: leader.leaderType === 'LEADER_144',
        isServant: leader.leaderType === 'SERVANT',
        memberId: leader.memberId
      }));

      // Ordenar: LEADER_12 primero, luego LEADER_144, luego SERVANT
      leadersList.sort((a, b) => {
        if (a.isLeader12 && !b.isLeader12) return -1;
        if (!a.isLeader12 && b.isLeader12) return 1;
        if (a.isLeader144 && !b.isLeader144) return -1;
        if (!a.isLeader144 && b.isLeader144) return 1;
        return a.name.localeCompare(b.name);
      });

      setLeaders(leadersList);
      log('Líderes cargados', { count: leadersList.length });
    } catch (err) {
      logError('Error cargando líderes:', err);
      setError('Error al cargar la lista de líderes');
    } finally {
      setLoadingLeaders(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const validateStep1 = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'El nombre de la célula es requerido';
    } else if (formData.name.length < 3) {
      newErrors.name = 'El nombre debe tener al menos 3 caracteres';
    } else if (formData.name.length > 200) {
      newErrors.name = 'El nombre no puede exceder 200 caracteres';
    }

    if (formData.maxCapacity) {
      const capacity = parseInt(formData.maxCapacity);
      if (isNaN(capacity) || capacity < 1 || capacity > 1000) {
        newErrors.maxCapacity = 'La capacidad debe ser un número entre 1 y 1000';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors = {};

    // 1. Validar Líder de Red (REQUERIDO, debe ser LEADER_12)
    if (!formData.mainLeaderId) {
      newErrors.mainLeaderId = 'El líder de red es requerido';
    } else {
      const selectedLeader = leaders.find(l => l.id === parseInt(formData.mainLeaderId));
      if (selectedLeader && !selectedLeader.isLeader12) {
        newErrors.mainLeaderId = 'El líder de red debe ser de tipo LÍDER 12';
      }
    }

    // 2. Validar Líder de Rama (OPCIONAL, pero si existe debe ser LEADER_144)
    if (formData.branchLeaderId) {
      const selectedBranchLeader = leaders.find(l => l.id === parseInt(formData.branchLeaderId));
      if (selectedBranchLeader && !selectedBranchLeader.isLeader144) {
        newErrors.branchLeaderId = 'El líder de rama debe ser de tipo LÍDER 144';
      }
    }

    // 3. Validar Líder de Grupo (REQUERIDO, cualquier tipo activo)
    if (!formData.groupLeaderId) {
      newErrors.groupLeaderId = 'El líder de grupo es requerido';
    }

    // 4. Validar Anfitrión (REQUERIDO, debe ser SERVANT)
    if (!formData.hostId) {
      newErrors.hostId = 'El anfitrión es requerido';
    } else {
      const selectedHost = leaders.find(l => l.id === parseInt(formData.hostId));
      if (selectedHost && !selectedHost.isServant) {
        newErrors.hostId = 'El anfitrión debe ser de tipo SERVIDOR';
      }
    }

    // 5. Validar Timoteo (REQUERIDO, debe ser SERVANT)
    if (!formData.timoteoId) {
      newErrors.timoteoId = 'El timoteo es requerido';
    } else {
      const selectedTimoteo = leaders.find(l => l.id === parseInt(formData.timoteoId));
      if (selectedTimoteo && !selectedTimoteo.isServant) {
        newErrors.timoteoId = 'El timoteo debe ser de tipo SERVIDOR';
      }
    }

    // 6. Validar que anfitrión y timoteo no sean la misma persona
    if (formData.hostId && formData.timoteoId && formData.hostId === formData.timoteoId) {
      newErrors.duplicateHostTimoteo = 'El anfitrión y el timoteo no pueden ser la misma persona';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
    } else if (step === 2 && validateStep2()) {
      setStep(3);
    }
  };

  const handleBack = () => {
    setStep(step - 1);
    setErrors({});
  };

  const handleCreate = async () => {
    setLoading(true);
    setError('');

    try {
      log('Creando célula con datos:', formData);

      const cellData = {
        name: formData.name.trim(),
        mainLeaderId: parseInt(formData.mainLeaderId),
        branchLeaderId: formData.branchLeaderId ? parseInt(formData.branchLeaderId) : null,
        groupLeaderId: parseInt(formData.groupLeaderId),
        hostId: parseInt(formData.hostId),
        timoteoId: parseInt(formData.timoteoId),
        meetingDay: formData.meetingDay || null,
        meetingTime: formData.meetingTime || null,
        meetingAddress: formData.meetingAddress.trim() || null,
        maxCapacity: formData.maxCapacity ? parseInt(formData.maxCapacity) : null,
        district: formData.district || null,
        notes: formData.notes.trim() || null
      };

      const result = await apiService.createCell(cellData);

      log('Resultado de creación:', result);
      setCreateResult(result);

      logUserAction('create_cell', {
        cellName: cellData.name,
        cellId: result?.cell?.id,
        hierarchyType: result?.hierarchyType,
        district: cellData.district,
        timestamp: new Date().toISOString()
      });

    } catch (err) {
      logError('Error creando célula:', err);
      setError(err.message || 'Error al crear la célula');

      logSecurityEvent('create_cell_error', {
        error: err.message,
        timestamp: new Date().toISOString()
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFinalize = () => {
    if (onCreateSuccess) {
      onCreateSuccess(createResult);
    }
    resetModal();
    onClose();
  };

  const resetModal = () => {
    setStep(1);
    setFormData({
      name: '',
      mainLeaderId: '',
      branchLeaderId: '',
      groupLeaderId: '',
      hostId: '',
      timoteoId: '',
      meetingDay: '',
      meetingTime: '',
      meetingAddress: '',
      maxCapacity: '15',
      district: '',
      notes: ''
    });
    setErrors({});
    setCreateResult(null);
    setError('');
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  const renderStep1 = () => (
    <div className="modal-cell__step">
      <h3>📋 Paso 1: Información básica</h3>
      <p className="modal-cell__step-description">
        Ingresa los datos generales de la nueva célula
      </p>

      <div className="modal-cell__form-group">
        <label>Nombre de la Célula <span className="required">*</span></label>
        <input
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="Ej: Célula de Fe - Norte"
          className={`modal-cell__input ${errors.name ? 'error' : ''}`}
        />
        {errors.name && <span className="modal-cell__error-text">{errors.name}</span>}
      </div>

      <div className="modal-cell__form-row">
        <div className="modal-cell__form-group">
          <label>Día de Reunión</label>
          <select
            name="meetingDay"
            value={formData.meetingDay}
            onChange={handleChange}
            className="modal-cell__select"
          >
            <option value="">Seleccionar día</option>
            {MEETING_DAYS.map(day => (
              <option key={day} value={day}>{day}</option>
            ))}
          </select>
        </div>

        <div className="modal-cell__form-group">
          <label>Hora de Reunión</label>
          <input
            type="time"
            name="meetingTime"
            value={formData.meetingTime}
            onChange={handleChange}
            className="modal-cell__input"
          />
        </div>
      </div>

      <div className="modal-cell__form-group">
        <label>Dirección</label>
        <input
          type="text"
          name="meetingAddress"
          value={formData.meetingAddress}
          onChange={handleChange}
          placeholder="Calle 123 #45-67, Barrio..."
          className="modal-cell__input"
        />
      </div>

      <div className="modal-cell__form-row">
        <div className="modal-cell__form-group">
          <label>Capacidad Máxima</label>
          <input
            type="number"
            name="maxCapacity"
            value={formData.maxCapacity}
            onChange={handleChange}
            min="1"
            max="1000"
            className={`modal-cell__input ${errors.maxCapacity ? 'error' : ''}`}
          />
          {errors.maxCapacity && <span className="modal-cell__error-text">{errors.maxCapacity}</span>}
        </div>

        <div className="modal-cell__form-group">
          <label>Distrito</label>
          <select
            name="district"
            value={formData.district}
            onChange={handleChange}
            className="modal-cell__select"
          >
            <option value="">Seleccionar distrito</option>
            {DISTRICTS.map(d => (
              <option key={d.value} value={d.value}>{d.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="modal-cell__form-group">
        <label>Notas (opcional)</label>
        <textarea
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          placeholder="Información adicional sobre la célula..."
          rows="3"
          className="modal-cell__textarea"
        />
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="modal-cell__step">
      <h3>👥 Paso 2: Estructura de Liderazgo</h3>
      <p className="modal-cell__step-description">
        Configura la jerarquía de líderes para la célula
      </p>

      {loadingLeaders ? (
        <div className="modal-cell__loading">Cargando líderes...</div>
      ) : (
        <>
          {errors.duplicateHostTimoteo && (
            <div className="modal-cell__error-banner">
              ⚠️ {errors.duplicateHostTimoteo}
            </div>
          )}

          <div className="modal-cell__leaders-grid">
            {/* Líder de Red - LEADER_12 */}
            <div className="modal-cell__leader-field">
              <label>🌿 Líder de Red <span className="required">*</span></label>
              <small className="modal-cell__field-hint">Debe ser LÍDER 12</small>
              <select
                name="mainLeaderId"
                value={formData.mainLeaderId}
                onChange={handleChange}
                className={`modal-cell__select ${errors.mainLeaderId ? 'error' : ''}`}
              >
                <option value="">Seleccionar líder de red</option>
                {leaders.filter(l => l.isLeader12).map(leader => (
                  <option key={leader.id} value={leader.id}>
                    {leader.name} ({leader.typeDisplay})
                  </option>
                ))}
              </select>
              {errors.mainLeaderId && <span className="modal-cell__error-text">{errors.mainLeaderId}</span>}
            </div>

            {/* Líder de Rama - LEADER_144 (OPCIONAL) */}
            <div className="modal-cell__leader-field">
              <label>🌳 Líder de Rama <span className="optional">(opcional)</span></label>
              <small className="modal-cell__field-hint">Debe ser LÍDER 144 (nivel intermedio)</small>
              <select
                name="branchLeaderId"
                value={formData.branchLeaderId}
                onChange={handleChange}
                className={`modal-cell__select ${errors.branchLeaderId ? 'error' : ''}`}
              >
                <option value="">Sin líder de rama (estructura directa)</option>
                {leaders.filter(l => l.isLeader144).map(leader => (
                  <option key={leader.id} value={leader.id}>
                    {leader.name} ({leader.typeDisplay})
                  </option>
                ))}
              </select>
              {errors.branchLeaderId && <span className="modal-cell__error-text">{errors.branchLeaderId}</span>}
              {!formData.branchLeaderId && (
                <small className="modal-cell__info-text">
                  ℹ️ Sin líder de rama: Líder de Red → Líder de Grupo (directo)
                </small>
              )}
              {formData.branchLeaderId && (
                <small className="modal-cell__info-text">
                  ℹ️ Con líder de rama: Líder de Red → Líder de Rama → Líder de Grupo
                </small>
              )}
            </div>

            {/* Líder de Grupo - Cualquier tipo activo */}
            <div className="modal-cell__leader-field">
              <label>🌱 Líder de Grupo <span className="required">*</span></label>
              <small className="modal-cell__field-hint">Cualquier tipo de líder activo</small>
              <select
                name="groupLeaderId"
                value={formData.groupLeaderId}
                onChange={handleChange}
                className={`modal-cell__select ${errors.groupLeaderId ? 'error' : ''}`}
              >
                <option value="">Seleccionar líder de grupo</option>
                {leaders.map(leader => (
                  <option key={leader.id} value={leader.id}>
                    {leader.name} ({leader.typeDisplay})
                  </option>
                ))}
              </select>
              {errors.groupLeaderId && <span className="modal-cell__error-text">{errors.groupLeaderId}</span>}
            </div>

            {/* Anfitrión - SERVANT */}
            <div className="modal-cell__leader-field">
              <label>🏠 Anfitrión <span className="required">*</span></label>
              <small className="modal-cell__field-hint">Debe ser SERVIDOR (exclusivo)</small>
              <select
                name="hostId"
                value={formData.hostId}
                onChange={handleChange}
                className={`modal-cell__select ${errors.hostId ? 'error' : ''}`}
              >
                <option value="">Seleccionar anfitrión</option>
                {leaders.filter(l => l.isServant).map(leader => (
                  <option key={leader.id} value={leader.id}>
                    {leader.name} ({leader.typeDisplay})
                  </option>
                ))}
              </select>
              {errors.hostId && <span className="modal-cell__error-text">{errors.hostId}</span>}
            </div>

            {/* Timoteo - SERVANT */}
            <div className="modal-cell__leader-field">
              <label>🦺 Timoteo <span className="required">*</span></label>
              <small className="modal-cell__field-hint">Debe ser SERVIDOR (exclusivo)</small>
              <select
                name="timoteoId"
                value={formData.timoteoId}
                onChange={handleChange}
                className={`modal-cell__select ${errors.timoteoId ? 'error' : ''}`}
              >
                <option value="">Seleccionar timoteo</option>
                {leaders.filter(l => l.isServant).map(leader => (
                  <option key={leader.id} value={leader.id}>
                    {leader.name} ({leader.typeDisplay})
                  </option>
                ))}
              </select>
              {errors.timoteoId && <span className="modal-cell__error-text">{errors.timoteoId}</span>}
            </div>
          </div>

          <div className="modal-cell__info-box">
            <p><strong>📌 Estructura Jerárquica:</strong></p>
            <ul>
              <li>🌿 <strong>Líder de Red (LÍDER 12):</strong> Nivel superior, puede tener hasta 12 líderes de rama</li>
              <li>🌳 <strong>Líder de Rama (LÍDER 144):</strong> Nivel intermedio opcional, puede tener hasta 12 grupos celulares</li>
              <li>🌱 <strong>Líder de Grupo:</strong> Puede ser cualquier tipo de líder activo</li>
              <li>🏠 <strong>Anfitrión</strong> y 🦺 <strong>Timoteo:</strong> Deben ser SERVIDORES y son exclusivos (no se repiten)</li>
            </ul>
          </div>
        </>
      )}
    </div>
  );

  const renderStep3 = () => {
    const mainLeader = leaders.find(l => l.id === parseInt(formData.mainLeaderId));
    const branchLeader = formData.branchLeaderId ? leaders.find(l => l.id === parseInt(formData.branchLeaderId)) : null;
    const groupLeader = leaders.find(l => l.id === parseInt(formData.groupLeaderId));
    const host = leaders.find(l => l.id === parseInt(formData.hostId));
    const timoteo = leaders.find(l => l.id === parseInt(formData.timoteoId));
    const selectedDistrict = DISTRICTS.find(d => d.value === formData.district);

    const hierarchyType = branchLeader ? 'JERÁRQUICA' : 'DIRECTA';

    return (
      <div className="modal-cell__step">
        <h3>✅ Paso 3: Confirmar</h3>
        <p className="modal-cell__step-description">
          Revisa la información antes de crear
        </p>

        <div className="modal-cell__summary">
          <div className="modal-cell__summary-section">
            <h4>📋 Información General</h4>
            <div className="modal-cell__summary-row">
              <span>Nombre:</span>
              <strong>{formData.name}</strong>
            </div>
            <div className="modal-cell__summary-row">
              <span>Día:</span>
              <strong>{formData.meetingDay || 'No definido'}</strong>
            </div>
            <div className="modal-cell__summary-row">
              <span>Hora:</span>
              <strong>{formData.meetingTime || 'No definida'}</strong>
            </div>
            <div className="modal-cell__summary-row">
              <span>Dirección:</span>
              <strong>{formData.meetingAddress || 'No definida'}</strong>
            </div>
            <div className="modal-cell__summary-row">
              <span>Capacidad:</span>
              <strong>{formData.maxCapacity} personas</strong>
            </div>
            <div className="modal-cell__summary-row">
              <span>Distrito:</span>
              <strong>{selectedDistrict?.label || 'No asignado'}</strong>
            </div>
          </div>

          <div className="modal-cell__summary-section">
            <h4>👥 Estructura de Liderazgo</h4>
            <div className="modal-cell__summary-row">
              <span>Tipo de Estructura:</span>
              <strong className={hierarchyType === 'JERÁRQUICA' ? 'text-success' : 'text-info'}>
                {hierarchyType}
              </strong>
            </div>
            <div className="modal-cell__summary-row">
              <span>🌿 Líder de Red:</span>
              <strong>{mainLeader?.name}</strong>
            </div>
            {branchLeader && (
              <div className="modal-cell__summary-row">
                <span>🌳 Líder de Rama:</span>
                <strong>{branchLeader.name}</strong>
              </div>
            )}
            <div className="modal-cell__summary-row">
              <span>🌱 Líder de Grupo:</span>
              <strong>{groupLeader?.name}</strong>
            </div>
            <div className="modal-cell__summary-row">
              <span>🏠 Anfitrión:</span>
              <strong>{host?.name}</strong>
            </div>
            <div className="modal-cell__summary-row">
              <span>🦺 Timoteo:</span>
              <strong>{timoteo?.name}</strong>
            </div>
          </div>

          {formData.notes && (
            <div className="modal-cell__summary-section">
              <h4>📝 Notas</h4>
              <p className="modal-cell__summary-notes">{formData.notes}</p>
            </div>
          )}
        </div>

        {createResult && (
          <div className="modal-cell__success-result">
            <h4>✅ ¡Célula creada exitosamente!</h4>
            <p><strong>ID:</strong> {createResult.cell?.id}</p>
            <p><strong>Tipo de Estructura:</strong> {createResult.hierarchyType}</p>
          </div>
        )}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="modal-cell__overlay" onClick={handleClose}>
      <div 
        className="modal-cell__container" 
        onClick={(e) => e.stopPropagation()}
        data-theme={isDarkMode ? 'dark' : 'light'}
      >
        <div className="modal-cell__header">
          <h2>🏠 Crear Nueva Célula</h2>
          <button className="modal-cell__close" onClick={handleClose}>✕</button>
        </div>

        <div className="modal-cell__progress">
          <div className={`modal-cell__progress-step ${step >= 1 ? 'active' : ''} ${step > 1 ? 'completed' : ''}`}>
            <span className="modal-cell__step-number">1</span>
            <span className="modal-cell__step-label">Información</span>
          </div>
          <div className={`modal-cell__progress-line ${step > 1 ? 'active' : ''}`}></div>
          <div className={`modal-cell__progress-step ${step >= 2 ? 'active' : ''} ${step > 2 ? 'completed' : ''}`}>
            <span className="modal-cell__step-number">2</span>
            <span className="modal-cell__step-label">Liderazgo</span>
          </div>
          <div className={`modal-cell__progress-line ${step > 2 ? 'active' : ''}`}></div>
          <div className={`modal-cell__progress-step ${step >= 3 ? 'active' : ''}`}>
            <span className="modal-cell__step-number">3</span>
            <span className="modal-cell__step-label">Confirmar</span>
          </div>
        </div>

        <div className="modal-cell__content">
          {error && <div className="modal-cell__error">❌ {error}</div>}
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
        </div>

        <div className="modal-cell__footer">
          {step < 3 && (
            <>
              {step > 1 && (
                <button onClick={handleBack} className="modal-cell__btn modal-cell__btn--secondary" disabled={loading}>
                  ← Atrás
                </button>
              )}
              <button onClick={handleNext} className="modal-cell__btn modal-cell__btn--primary" disabled={loading || (step === 2 && loadingLeaders)}>
                {step === 2 ? 'Siguiente →' : 'Continuar →'}
              </button>
            </>
          )}

          {step === 3 && !createResult && (
            <>
              <button onClick={handleBack} className="modal-cell__btn modal-cell__btn--secondary" disabled={loading}>
                ← Atrás
              </button>
              <button onClick={handleCreate} disabled={loading} className="modal-cell__btn modal-cell__btn--success">
                {loading ? 'Creando...' : '✅ Crear Célula'}
              </button>
            </>
          )}

          {step === 3 && createResult && (
            <button onClick={handleFinalize} className="modal-cell__btn modal-cell__btn--primary">
              Finalizar
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ModalCreateCell;