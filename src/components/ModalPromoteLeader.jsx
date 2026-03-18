// ============================================
// ModalPromoteLeader.jsx - VERSIÓN ACTUALIZADA CON LEVELENROLLMENT JPA
// ============================================

import React, { useState, useEffect, useCallback, useRef } from 'react';
import apiService from '../apiService';
import { logUserAction, logSecurityEvent } from '../utils/securityLogger';
import '../css/ModalPromoteLeader.css';

const DEBUG = process.env.REACT_APP_DEBUG === "true";

const log = (message, data) => {
  if (DEBUG) {
    console.log(`[ModalPromoteLeader] ${message}`, data || '');
  }
};

const logError = (message, error) => {
  console.error(`[ModalPromoteLeader] ${message}`, error);
};

// ✅ CONSTANTES ACTUALIZADAS CON 3 TIPOS (estos siguen siendo fijos porque son roles de liderazgo)
const LEADER_TYPES = [
  { 
    value: 'SERVANT', 
    label: '🛠️ Servidor', 
    description: 'Nivel mínimo: ESENCIA 2 o superior',
    requiredLevelCode: 'ESENCIA_2',
    requiredLevelOrder: 6,
    color: '#3b82f6'
  },
  { 
    value: 'LEADER_144', 
    label: '👥 Líder 144', 
    description: 'Nivel mínimo: Graduación (Líder de Rama)',
    requiredLevelCode: 'GRADUACION',
    requiredLevelOrder: 11,
    color: '#f59e0b'
  },
  { 
    value: 'LEADER_12', 
    label: '🌟 Líder 12', 
    description: 'Nivel mínimo: Graduación (Líder de Red)',
    requiredLevelCode: 'GRADUACION',
    requiredLevelOrder: 11,
    color: '#10b981'
  },
];

const ModalPromoteLeader = ({ isOpen, onClose, onPromoteSuccess }) => {
  // ========== STATE ==========
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [eligibilityDetails, setEligibilityDetails] = useState(null);
  
  // ✅ NUEVO: Estado para niveles dinámicos
  const [levels, setLevels] = useState([]);
  const [loadingLevels, setLoadingLevels] = useState(false);
  
  const [selectedMember, setSelectedMember] = useState(null);
  const [selectedType, setSelectedType] = useState('');
  const [cellGroupCode, setCellGroupCode] = useState('');
  const [notes, setNotes] = useState('');
  
  const [eligibilityResult, setEligibilityResult] = useState(null);
  const [promotionResult, setPromotionResult] = useState(null);
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Refs para debounce
  const searchTimeoutRef = useRef(null);
  const abortControllerRef = useRef(null);

  // ========== DARK MODE DETECTION ==========
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

  // ========== CARGAR NIVELES ==========
  const loadLevels = useCallback(async () => {
    setLoadingLevels(true);
    try {
      const data = await apiService.getActiveLevels();
      setLevels(data || []);
      log('Niveles cargados', { count: data?.length });
    } catch (error) {
      logError('Error cargando niveles:', error);
      // Fallback a niveles por defecto
      setLevels(apiService.getDefaultLevels());
    } finally {
      setLoadingLevels(false);
    }
  }, []);

  // Cargar niveles al abrir el modal
  useEffect(() => {
    if (isOpen) {
      loadLevels();
    }
  }, [isOpen, loadLevels]);

  // ========== FUNCIONES AUXILIARES PARA NIVELES ==========
  const getLevelDisplayName = useCallback((level) => {
    if (!level) return 'No definido';
    
    // Si es un objeto LevelEnrollment
    if (typeof level === 'object') {
      return level.displayName || level.code || 'No definido';
    }
    
    // Si es un string (código)
    const foundLevel = levels.find(l => l.code === level);
    return foundLevel?.displayName || level;
  }, [levels]);

  const getLevelOrder = useCallback((level) => {
    if (!level) return 0;
    
    // Si es un objeto LevelEnrollment
    if (typeof level === 'object') {
      return level.levelOrder || 0;
    }
    
    // Si es un string (código)
    const foundLevel = levels.find(l => l.code === level);
    return foundLevel?.levelOrder || 0;
  }, [levels]);

  // ========== VERIFICAR ELEGIBILIDAD BÁSICA ==========
  const checkBasicEligibility = useCallback((member, leaderType) => {
    const typeConfig = LEADER_TYPES.find(t => t.value === leaderType);
    if (!typeConfig) return null;

    const requiredLevelOrder = typeConfig.requiredLevelOrder;
    
    // Obtener el nivel actual del miembro (puede ser objeto o string)
    const memberLevelObj = member.currentLevel || member.levelEnrollment;
    const memberLevelOrder = getLevelOrder(memberLevelObj);
    
    // ✅ Acepta nivel igual o superior
    const hasRequiredLevel = memberLevelOrder >= requiredLevelOrder;
    
    let levelMessage = '';
    if (!hasRequiredLevel) {
      const requiredLevelName = getLevelDisplayName(typeConfig.requiredLevelCode);
      const currentLevelName = getLevelDisplayName(memberLevelObj);
      
      levelMessage = `❌ Nivel insuficiente: El miembro está en ${currentLevelName}. Se requiere mínimo ${requiredLevelName} o superior.`;
    }

    const hasMaritalStatus = !!member.maritalStatus;
    const hasTitheLastThreeMonths = member.hasTitheLastThreeMonths || false;

    const requirements = {
      hasRequiredLevel,
      hasMaritalStatus,
      hasTitheLastThreeMonths,
      memberLevel: memberLevelObj,
      memberLevelOrder,
      requiredLevelCode: typeConfig.requiredLevelCode,
      requiredLevelOrder,
      levelMessage,
      maritalStatus: member.maritalStatus || 'No registrado',
      isEligible: hasRequiredLevel && hasMaritalStatus && hasTitheLastThreeMonths
    };

    return requirements;
  }, [getLevelOrder, getLevelDisplayName]);

  // ========== BÚSQUEDA EN TIEMPO REAL CON DEBOUNCE ==========
  const performSearch = useCallback(async (term) => {
    if (!term || term.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    setSearching(true);
    setError('');

    try {
      log('Buscando miembros en tiempo real', { searchTerm: term });

      const members = await apiService.searchMembers(term);
      const nonLeaderMembers = members.filter(m => !m.isLeader);
      
      // Enriquecer resultados con información de elegibilidad
      const enhancedResults = nonLeaderMembers.map(member => {
        const servantEligibility = checkBasicEligibility(member, 'SERVANT');
        const leader144Eligibility = checkBasicEligibility(member, 'LEADER_144');
        const leader12Eligibility = checkBasicEligibility(member, 'LEADER_12');
        
        return {
          ...member,
          eligibility: {
            SERVANT: servantEligibility,
            LEADER_144: leader144Eligibility,
            LEADER_12: leader12Eligibility
          },
          currentLevelDisplay: getLevelDisplayName(member.currentLevel || member.levelEnrollment)
        };
      });
      
      log('Resultados de búsqueda enriquecidos', { count: enhancedResults.length });
      setSearchResults(enhancedResults);

    } catch (err) {
      if (err.name === 'AbortError' || err.code === 20) {
        log('Búsqueda cancelada');
        return;
      }
      
      logError('Error buscando miembros:', err);
      setError('Error al buscar miembros');
      
      logSecurityEvent('member_search_error', {
        errorType: 'api_error',
        timestamp: new Date().toISOString()
      });
    } finally {
      setSearching(false);
      abortControllerRef.current = null;
    }
  }, [checkBasicEligibility, getLevelDisplayName]);

  // Efecto para búsqueda con debounce
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!searchTerm || searchTerm.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    searchTimeoutRef.current = setTimeout(() => {
      performSearch(searchTerm);
    }, 500);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [searchTerm, performSearch]);

  // ========== RESET MODAL ==========
  const resetModal = () => {
    setStep(1);
    setSearchTerm('');
    setSearchResults([]);
    setSelectedMember(null);
    setSelectedType('');
    setCellGroupCode('');
    setNotes('');
    setEligibilityResult(null);
    setPromotionResult(null);
    setEligibilityDetails(null);
    setError('');
    setSuccess('');

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
  };

  // ========== CLOSE HANDLER ==========
  const handleClose = () => {
    resetModal();
    onClose();
  };

  // ========== SELECT MEMBER ==========
  const handleSelectMember = (member) => {
    setSelectedMember(member);
    setEligibilityDetails(member.eligibility);
    setStep(2);
    setError('');
  };

  // ========== CHECK ELIGIBILITY ==========
  const handleCheckEligibility = async () => {
    if (!selectedType) {
      setError('Seleccione un tipo de líder');
      return;
    }

    setLoading(true);
    setError('');
    setEligibilityResult(null);

    try {
      log('Verificando elegibilidad', {
        memberId: selectedMember.id,
        leaderType: selectedType
      });

      const result = await apiService.checkEligibility(selectedMember.id, selectedType);
      
      log('Resultado de elegibilidad', result);
      setEligibilityResult(result);
      setStep(3);

    } catch (err) {
      logError('Error verificando elegibilidad:', err);
      setError(err.message || 'Error al verificar elegibilidad');
    } finally {
      setLoading(false);
    }
  };

  // ========== PROMOTE TO LEADER ==========
  const handlePromote = async () => {
    setLoading(true);
    setError('');

    try {
      log('Promoviendo a líder', {
        memberId: selectedMember.id,
        leaderType: selectedType,
        cellGroupCode,
        notes
      });

      const result = await apiService.promoteToLeader(
        selectedMember.id,
        selectedType,
        cellGroupCode || null,
        notes || null
      );

      log('Resultado de promoción', result);
      setPromotionResult(result);
      setStep(4);

      logUserAction('promote_to_leader', {
        memberId: selectedMember.id,
        memberName: selectedMember.name,
        leaderType: selectedType,
        timestamp: new Date().toISOString()
      });

    } catch (err) {
      logError('Error promoviendo a líder:', err);
      setError(err.message || 'Error al promover a líder');
    } finally {
      setLoading(false);
    }
  };

  // ========== FINALIZE ==========
  const handleFinalize = () => {
    if (onPromoteSuccess) {
      onPromoteSuccess(promotionResult);
    }
    handleClose();
  };

  // ========== RENDER STEP 1: BUSCAR MIEMBRO ==========
  const renderStep1 = () => (
    <div className="modal-promote__step">
      <h3>🔍 Paso 1: Buscar miembro</h3>
      <p className="modal-promote__step-description">
        Busca el miembro que deseas promover a líder. Solo se mostrarán miembros que aún no son líderes.
        La búsqueda es automática mientras escribes.
      </p>

      <div className="modal-promote__search-container">
        <input
          type="text"
          placeholder="Nombre, documento o email (mínimo 2 caracteres)..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="modal-promote__input"
          disabled={searching || loadingLevels}
          autoFocus
        />
        {(searching || loadingLevels) && <span className="modal-promote__search-spinner">⏳</span>}
      </div>

      {loadingLevels && (
        <div className="modal-promote__info">
          Cargando niveles formativos...
        </div>
      )}

      {searchTerm && searchTerm.trim().length < 2 && (
        <div className="modal-promote__search-hint">
          Escribe al menos 2 caracteres para buscar
        </div>
      )}

      {searchResults.length > 0 && (
        <div className="modal-promote__results">
          <h4>Resultados ({searchResults.length})</h4>
          <div className="modal-promote__results-list">
            {searchResults.map(member => {
              const isEligibleForServant = member.eligibility?.SERVANT?.isEligible;
              const notEligibleReason = !isEligibleForServant ? member.eligibility?.SERVANT?.levelMessage : null;
              
              return (
                <div
                  key={member.id}
                  className="modal-promote__result-item"
                  onClick={() => handleSelectMember(member)}
                >
                  <div className="modal-promote__result-avatar">👤</div>
                  <div className="modal-promote__result-info">
                    <div className="modal-promote__result-name">{member.name}</div>
                    <div className="modal-promote__result-details">
                      <span>📧 {member.email || 'Sin email'}</span>
                      <span>📞 {member.phone || 'Sin teléfono'}</span>
                      <span>🆔 {member.document || 'Sin documento'}</span>
                    </div>
                    <div className="modal-promote__result-level">
                      <span className="modal-promote__level-badge">
                        Nivel actual: <strong>{member.currentLevelDisplay}</strong>
                      </span>
                    </div>
                    {!isEligibleForServant && notEligibleReason && (
                      <div className="modal-promote__result-warning">
                        ⚠️ {notEligibleReason}
                      </div>
                    )}
                  </div>
                  <div className="modal-promote__result-select">Seleccionar →</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {searchTerm && searchTerm.trim().length >= 2 && !searching && searchResults.length === 0 && (
        <div className="modal-promote__no-results">
          No se encontraron miembros disponibles para promover
        </div>
      )}
    </div>
  );

  // ========== RENDER STEP 2: SELECCIONAR TIPO ==========
  const renderStep2 = () => (
    <div className="modal-promote__step">
      <h3>📋 Paso 2: Configurar liderazgo</h3>
      
      <div className="modal-promote__selected-member">
        <span className="modal-promote__selected-label">Miembro seleccionado:</span>
        <div className="modal-promote__selected-value">
          <strong>{selectedMember.name}</strong>
          <button 
            className="modal-promote__change-btn"
            onClick={() => setStep(1)}
          >
            Cambiar
          </button>
        </div>
      </div>

      <div className="modal-promote__current-level-info">
        <strong>📊 Nivel actual del miembro:</strong>{' '}
        <span style={{ fontWeight: 'bold', color: '#3b82f6' }}>
          {getLevelDisplayName(selectedMember.currentLevel || selectedMember.levelEnrollment)}
        </span>
      </div>

      <div className="modal-promote__form-group">
        <label>Tipo de Líder <span className="required">*</span></label>
        <div className="modal-promote__type-grid">
          {LEADER_TYPES.map(type => {
            const eligibility = eligibilityDetails?.[type.value];
            const isEligible = eligibility?.isEligible;
            const levelMessage = eligibility?.levelMessage;

            return (
              <div
                key={type.value}
                className={`modal-promote__type-card ${selectedType === type.value ? 'selected' : ''} ${!isEligible ? 'not-eligible' : ''}`}
                onClick={() => setSelectedType(type.value)}
                style={{
                  borderColor: selectedType === type.value ? type.color : undefined,
                  backgroundColor: selectedType === type.value ? `${type.color}10` : undefined,
                }}
              >
                <div className="modal-promote__type-icon">{type.label.split(' ')[0]}</div>
                <div className="modal-promote__type-label">{type.label}</div>
                <div className="modal-promote__type-desc">{type.description}</div>
                <div className="modal-promote__type-req">
                  Nivel mínimo: {getLevelDisplayName(type.requiredLevelCode)}
                </div>
                {!isEligible && levelMessage && (
                  <div className="modal-promote__type-warning">
                    ⚠️ {levelMessage}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="modal-promote__form-group">
        <label>Código de Célula (opcional)</label>
        <input
          type="text"
          placeholder="Ej: CEL-001"
          value={cellGroupCode}
          onChange={(e) => setCellGroupCode(e.target.value)}
          className="modal-promote__input"
        />
        <small className="modal-promote__hint">
          Código del grupo celular que liderará
        </small>
      </div>

      <div className="modal-promote__form-group">
        <label>Notas (opcional)</label>
        <textarea
          placeholder="Información adicional sobre la promoción..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows="3"
          className="modal-promote__textarea"
        />
      </div>

      <div className="modal-promote__actions">
        <button
          onClick={() => setStep(1)}
          className="modal-promote__btn modal-promote__btn--secondary"
        >
          ← Atrás
        </button>
        <button
          onClick={handleCheckEligibility}
          disabled={!selectedType || loading}
          className="modal-promote__btn modal-promote__btn--primary"
        >
          {loading ? 'Verificando...' : 'Verificar Requisitos →'}
        </button>
      </div>
    </div>
  );

  // ========== RENDER STEP 3: VERIFICAR ELEGIBILIDAD ==========
  const renderStep3 = () => {
    if (!eligibilityResult) return null;

    const isEligible = eligibilityResult.isEligible;
    const passed = eligibilityResult.passedRequirements || [];
    const failed = eligibilityResult.failedRequirements || [];
    
    const memberCurrentLevel = eligibilityResult.memberCurrentLevel;

    return (
      <div className="modal-promote__step">
        <h3>✅ Paso 3: Verificación de requisitos</h3>

        <div className="modal-promote__eligibility-header">
          <div 
            className={`modal-promote__eligibility-badge ${isEligible ? 'eligible' : 'not-eligible'}`}
          >
            {isEligible ? '✅ CUMPLE REQUISITOS' : '❌ NO CUMPLE REQUISITOS'}
          </div>
        </div>

        <div className="modal-promote__requirements">
          <div className="modal-promote__requirements-section">
            <h4>✅ Requisitos cumplidos ({passed.length})</h4>
            {passed.length > 0 ? (
              <ul className="modal-promote__requirements-list passed">
                {passed.map((req, idx) => (
                  <li key={idx}>✅ {req}</li>
                ))}
              </ul>
            ) : (
              <p className="modal-promote__no-items">No hay requisitos cumplidos</p>
            )}
          </div>

          {failed.length > 0 && (
            <div className="modal-promote__requirements-section">
              <h4>❌ Requisitos faltantes ({failed.length})</h4>
              <ul className="modal-promote__requirements-list failed">
                {failed.map((req, idx) => (
                  <li key={idx}>❌ {req}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="modal-promote__eligibility-details">
          <div className="modal-promote__detail-item">
            <span className="modal-promote__detail-label">Miembro:</span>
            <span className="modal-promote__detail-value">{eligibilityResult.memberName}</span>
          </div>
          {memberCurrentLevel && (
            <div className="modal-promote__detail-item">
              <span className="modal-promote__detail-label">Nivel actual:</span>
              <span className="modal-promote__detail-value">{getLevelDisplayName(memberCurrentLevel)}</span>
            </div>
          )}
          <div className="modal-promote__detail-item">
            <span className="modal-promote__detail-label">Tipo solicitado:</span>
            <span className="modal-promote__detail-value">{eligibilityResult.leaderTypeDisplay}</span>
          </div>
          <div className="modal-promote__detail-item">
            <span className="modal-promote__detail-label">Nivel mínimo requerido:</span>
            <span className="modal-promote__detail-value">{getLevelDisplayName(eligibilityResult.requiredLevel)}</span>
          </div>
          <div className="modal-promote__detail-item">
            <span className="modal-promote__detail-label">Estado civil:</span>
            <span className="modal-promote__detail-value">{eligibilityResult.maritalStatus || 'No registrado'}</span>
          </div>
          <div className="modal-promote__detail-item">
            <span className="modal-promote__detail-label">Diezmo (3 meses):</span>
            <span className="modal-promote__detail-value">
              {eligibilityResult.hasTitheLastThreeMonths ? '✅ Sí' : '❌ No'}
            </span>
          </div>
        </div>

        <div className="modal-promote__actions">
          <button
            onClick={() => setStep(2)}
            className="modal-promote__btn modal-promote__btn--secondary"
          >
            ← Atrás
          </button>
          {isEligible ? (
            <button
              onClick={handlePromote}
              disabled={loading}
              className="modal-promote__btn modal-promote__btn--primary"
            >
              {loading ? 'Promoviendo...' : '🌟 Promover a Líder'}
            </button>
          ) : (
            <button
              onClick={() => setStep(2)}
              className="modal-promote__btn modal-promote__btn--disabled"
              disabled
            >
              No cumple requisitos
            </button>
          )}
        </div>
      </div>
    );
  };

  // ========== RENDER STEP 4: CONFIRMACIÓN ==========
  const renderStep4 = () => {
    if (!promotionResult) return null;

    return (
      <div className="modal-promote__step modal-promote__step--success">
        <div className="modal-promote__success-icon">🌟</div>
        <h3>¡Promoción Exitosa!</h3>
        
        <div className="modal-promote__success-details">
          <p>
            <strong>{promotionResult.memberName}</strong> ha sido promovido a{' '}
            <strong>{promotionResult.leaderTypeDisplay}</strong> exitosamente.
          </p>
          
          <div className="modal-promote__success-card">
            <div className="modal-promote__success-row">
              <span>ID del Líder:</span>
              <strong>{promotionResult.leaderId}</strong>
            </div>
            <div className="modal-promote__success-row">
              <span>Tipo:</span>
              <strong>{promotionResult.leaderTypeDisplay}</strong>
            </div>
            <div className="modal-promote__success-row">
              <span>Estado:</span>
              <strong style={{ color: '#10b981' }}>{promotionResult.status}</strong>
            </div>
            <div className="modal-promote__success-row">
              <span>Fecha de promoción:</span>
              <strong>{new Date(promotionResult.promotionDate).toLocaleDateString('es-CO')}</strong>
            </div>
          </div>
        </div>

        <div className="modal-promote__actions">
          <button
            onClick={handleFinalize}
            className="modal-promote__btn modal-promote__btn--primary"
          >
            Finalizar
          </button>
        </div>
      </div>
    );
  };

  // ========== RENDER ==========
  if (!isOpen) return null;

  return (
    <div className="modal-promote__overlay" onClick={handleClose}>
      <div 
        className="modal-promote__container" 
        onClick={(e) => e.stopPropagation()}
        data-theme={isDarkMode ? 'dark' : 'light'}
      >
        {/* HEADER */}
        <div className="modal-promote__header">
          <h2>🌟 Promover a Líder</h2>
          <button className="modal-promote__close" onClick={handleClose}>✕</button>
        </div>

        {/* PROGRESS BAR */}
        <div className="modal-promote__progress">
          <div className={`modal-promote__progress-step ${step >= 1 ? 'active' : ''} ${step > 1 ? 'completed' : ''}`}>
            <span className="modal-promote__step-number">1</span>
            <span className="modal-promote__step-label">Buscar</span>
          </div>
          <div className={`modal-promote__progress-line ${step > 1 ? 'active' : ''}`}></div>
          <div className={`modal-promote__progress-step ${step >= 2 ? 'active' : ''} ${step > 2 ? 'completed' : ''}`}>
            <span className="modal-promote__step-number">2</span>
            <span className="modal-promote__step-label">Configurar</span>
          </div>
          <div className={`modal-promote__progress-line ${step > 2 ? 'active' : ''}`}></div>
          <div className={`modal-promote__progress-step ${step >= 3 ? 'active' : ''} ${step > 3 ? 'completed' : ''}`}>
            <span className="modal-promote__step-number">3</span>
            <span className="modal-promote__step-label">Verificar</span>
          </div>
          <div className={`modal-promote__progress-line ${step > 3 ? 'active' : ''}`}></div>
          <div className={`modal-promote__progress-step ${step >= 4 ? 'active' : ''}`}>
            <span className="modal-promote__step-number">4</span>
            <span className="modal-promote__step-label">Confirmar</span>
          </div>
        </div>

        {/* CONTENT */}
        <div className="modal-promote__content">
          {error && (
            <div className="modal-promote__error">
              ❌ {error}
            </div>
          )}

          {success && (
            <div className="modal-promote__success">
              ✅ {success}
            </div>
          )}

          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
          {step === 4 && renderStep4()}
        </div>
      </div>
    </div>
  );
};

export default ModalPromoteLeader;