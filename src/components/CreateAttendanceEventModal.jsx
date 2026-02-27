// ============================================
// CreateAttendanceEventModal.jsx
// Modal para crear eventos de asistencia especiales
// ============================================

import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

const CreateAttendanceEventModal = ({ 
  isOpen, 
  onClose, 
  onCreate, 
  theme, 
  isMobile,
  userRole
}) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    eventDates: []
  });
  const [dateInput, setDateInput] = useState('');
  const [tempDates, setTempDates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Resetear formulario al cerrar
  useEffect(() => {
    if (!isOpen) {
      setFormData({ name: '', description: '', eventDates: [] });
      setDateInput('');
      setTempDates([]);
      setError('');
      setSuccess('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Verificar permisos
  const canCreate = userRole === 'PASTORES' || userRole === 'CONEXION';

  // Agregar fecha a la lista temporal
  const handleAddDate = () => {
    if (!dateInput) {
      setError('Selecciona una fecha');
      return;
    }

    // Validar que no sea fecha pasada
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDate = new Date(dateInput);
    selectedDate.setHours(0, 0, 0, 0);

    if (selectedDate < today) {
      setError('No se pueden agregar fechas pasadas');
      return;
    }

    // Validar que no esté duplicada
    if (tempDates.includes(dateInput)) {
      setError('Esta fecha ya fue agregada');
      return;
    }

    setTempDates([...tempDates, dateInput].sort());
    setDateInput('');
    setError('');
  };

  // Eliminar fecha de la lista temporal
  const handleRemoveDate = (dateToRemove) => {
    setTempDates(tempDates.filter(d => d !== dateToRemove));
  };

  // Manejar envío del formulario
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!canCreate) {
      setError('No tienes permisos para crear eventos');
      return;
    }

    if (!formData.name.trim()) {
      setError('El nombre del evento es obligatorio');
      return;
    }

    if (tempDates.length === 0) {
      setError('Debes agregar al menos una fecha');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        eventDates: tempDates
      };

      await onCreate(payload);
      setSuccess('✅ Evento creado exitosamente');
      
      // Cerrar después de 1.5 segundos
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setError(err.message || 'Error al crear el evento');
    } finally {
      setLoading(false);
    }
  };

  // Obtener el próximo mes para el input date (evitar fechas pasadas)
  const getMinDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Formatear fecha para mostrar
  const formatDateForDisplay = (dateStr) => {
    const [year, month, day] = dateStr.split('-');
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('es-CO', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    });
  };

  return (
    <div
      className="ca-stats-modal-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(4px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: isMobile ? '12px' : '20px'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          backgroundColor: theme.bgSecondary,
          borderRadius: isMobile ? '20px' : '24px',
          width: '100%',
          maxWidth: '600px',
          maxHeight: '90vh',
          overflow: 'hidden',
          boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
          border: `1px solid ${theme.border}`
        }}
      >
        {/* Header */}
        <div
          className="ca-stats-modal-header"
          style={{
            padding: isMobile ? '16px 18px' : '20px 24px',
            borderBottom: `1px solid ${theme.border}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            cursor: 'pointer'
          }}
          onClick={onClose}
        >
          <h2 style={{ margin: 0, fontSize: isMobile ? '1.1rem' : '1.3rem', color: theme.text }}>
            📅 Crear Evento Especial
          </h2>
          <div className="ca-stats-modal-header-buttons">
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                fontSize: '1.5rem',
                cursor: 'pointer',
                color: theme.textSecondary,
                padding: '0 8px'
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Contenido con scroll */}
        <div
          className="ca-stats-modal-scroll"
          style={{
            padding: isMobile ? '18px' : '24px',
            overflowY: 'auto',
            maxHeight: 'calc(90vh - 140px)'
          }}
        >
          {!canCreate ? (
            <div
              style={{
                padding: '40px 20px',
                textAlign: 'center',
                backgroundColor: theme.errorBg,
                color: theme.errorText,
                borderRadius: '12px'
              }}
            >
              <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🚫</div>
              <h3 style={{ margin: '0 0 8px' }}>Acceso denegado</h3>
              <p>Solo PASTORES y CONEXION pueden crear eventos especiales.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {/* Mensajes */}
              {error && (
                <div
                  style={{
                    backgroundColor: theme.errorBg,
                    color: theme.errorText,
                    padding: '12px 16px',
                    borderRadius: '10px',
                    marginBottom: '16px',
                    fontSize: '0.9rem'
                  }}
                >
                  ❌ {error}
                </div>
              )}
              
              {success && (
                <div
                  style={{
                    backgroundColor: theme.successBg,
                    color: theme.successText,
                    padding: '12px 16px',
                    borderRadius: '10px',
                    marginBottom: '16px',
                    fontSize: '0.9rem'
                  }}
                >
                  ✅ {success}
                </div>
              )}

              {/* Nombre del evento */}
              <div style={{ marginBottom: '20px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: theme.textSecondary,
                    marginBottom: '6px'
                  }}
                >
                  Nombre del evento <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ej: Reunión especial de avivamiento"
                  maxLength={200}
                  required
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    border: `1.5px solid ${theme.border}`,
                    backgroundColor: theme.bgTertiary,
                    color: theme.text,
                    fontSize: '1rem',
                    outline: 'none'
                  }}
                />
                <div
                  style={{
                    fontSize: '0.7rem',
                    color: theme.textSecondary,
                    marginTop: '4px',
                    textAlign: 'right'
                  }}
                >
                  {formData.name.length}/200
                </div>
              </div>

              {/* Descripción */}
              <div style={{ marginBottom: '20px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: theme.textSecondary,
                    marginBottom: '6px'
                  }}
                >
                  Descripción (opcional)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Breve descripción del evento..."
                  maxLength={500}
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    border: `1.5px solid ${theme.border}`,
                    backgroundColor: theme.bgTertiary,
                    color: theme.text,
                    fontSize: '0.95rem',
                    outline: 'none',
                    resize: 'vertical',
                    fontFamily: 'inherit'
                  }}
                />
                <div
                  style={{
                    fontSize: '0.7rem',
                    color: theme.textSecondary,
                    marginTop: '4px',
                    textAlign: 'right'
                  }}
                >
                  {formData.description.length}/500
                </div>
              </div>

              {/* Selector de fechas */}
              <div style={{ marginBottom: '20px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: theme.textSecondary,
                    marginBottom: '6px'
                  }}
                >
                  Fechas del evento <span style={{ color: '#ef4444' }}>*</span>
                </label>
                
                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                  <input
                    type="date"
                    value={dateInput}
                    onChange={(e) => setDateInput(e.target.value)}
                    min={getMinDate()}
                    style={{
                      flex: 1,
                      padding: '10px 12px',
                      borderRadius: '12px',
                      border: `1.5px solid ${theme.border}`,
                      backgroundColor: theme.bgTertiary,
                      color: theme.text,
                      fontSize: '0.95rem',
                      outline: 'none'
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddDate}
                    style={{
                      padding: '10px 18px',
                      borderRadius: '12px',
                      border: 'none',
                      backgroundColor: theme.accentBlue,
                      color: 'white',
                      fontWeight: 600,
                      fontSize: '0.9rem',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    + Agregar
                  </button>
                </div>

                {/* Lista de fechas agregadas */}
                {tempDates.length > 0 && (
                  <div
                    style={{
                      backgroundColor: theme.bgTertiary,
                      borderRadius: '12px',
                      padding: '12px',
                      marginTop: '8px'
                    }}
                  >
                    <div style={{ fontSize: '0.8rem', color: theme.textSecondary, marginBottom: '8px' }}>
                      📅 {tempDates.length} fecha{tempDates.length !== 1 ? 's' : ''} seleccionada{tempDates.length !== 1 ? 's' : ''}:
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {tempDates.map((date) => (
                        <div
                          key={date}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '8px 12px',
                            backgroundColor: theme.bgSecondary,
                            borderRadius: '8px',
                            border: `1px solid ${theme.border}`
                          }}
                        >
                          <span style={{ fontSize: '0.9rem', color: theme.text }}>
                            📌 {formatDateForDisplay(date)}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveDate(date)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#ef4444',
                              fontSize: '1rem',
                              cursor: 'pointer',
                              padding: '4px 8px'
                            }}
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Información de reglas */}
              <div
                style={{
                  backgroundColor: 'rgba(59, 130, 246, 0.08)',
                  borderRadius: '12px',
                  padding: '12px 16px',
                  marginBottom: '24px',
                  fontSize: '0.85rem',
                  color: theme.textSecondary,
                  border: `1px dashed ${theme.accentBlue}`
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: '6px', color: theme.accentBlue }}>
                  📋 Reglas para eventos:
                </div>
                <ul style={{ margin: 0, paddingLeft: '18px', lineHeight: 1.6 }}>
                  <li>Deben programarse <strong>ANTES</strong> del inicio del mes del evento</li>
                  <li>Las fechas deben ser futuras (a partir de hoy)</li>
                  <li>Las asistencias se generarán automáticamente el primer día del mes</li>
                  <li>Puedes agregar múltiples fechas para un mismo evento</li>
                </ul>
              </div>

              {/* Botones de acción */}
              <div
                style={{
                  display: 'flex',
                  gap: '12px',
                  justifyContent: 'flex-end',
                  marginTop: '24px'
                }}
              >
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  style={{
                    padding: '12px 20px',
                    borderRadius: '30px',
                    border: `1.5px solid ${theme.border}`,
                    backgroundColor: 'transparent',
                    color: theme.text,
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    opacity: loading ? 0.5 : 1
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading || tempDates.length === 0}
                  style={{
                    padding: '12px 28px',
                    borderRadius: '30px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #3b82f6, #1e40af)',
                    color: 'white',
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    cursor: loading || tempDates.length === 0 ? 'not-allowed' : 'pointer',
                    opacity: loading || tempDates.length === 0 ? 0.6 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  {loading ? '⏳ Creando...' : '🎯 Crear Evento'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

CreateAttendanceEventModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onCreate: PropTypes.func.isRequired,
  theme: PropTypes.object.isRequired,
  isMobile: PropTypes.bool,
  userRole: PropTypes.string
};

CreateAttendanceEventModal.defaultProps = {
  isMobile: false,
  userRole: ''
};

export default CreateAttendanceEventModal;