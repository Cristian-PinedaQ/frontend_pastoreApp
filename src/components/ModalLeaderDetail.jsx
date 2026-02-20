// ============================================
// ModalLeaderDetail.jsx - Detalle de Líder con acciones en header
// ============================================

import React, { useEffect, useState } from 'react';
import '../css/ModalLeaderDetail.css';

const LEADER_TYPE_MAP = {
  SERVANT: { label: 'Servidor', color: '#3b82f6', icon: '🛠️' },
  LEADER_144: { label: 'Líder 144', color: '#8b5cf6', icon: '🌿' },
  LEADER_12: { label: 'Líder 12', color: '#10b981', icon: '👥' },
};

const LEADER_STATUS_MAP = {
  ACTIVE: { label: 'Activo', color: '#10b981', icon: '✅' },
  SUSPENDED: { label: 'Suspendido', color: '#f59e0b', icon: '⏸️' },
  INACTIVE: { label: 'Inactivo', color: '#6b7280', icon: '⏹️' },
};

const LEADER_TYPE_OPTIONS = [
  { value: 'SERVANT', label: '🛠️ Servidor' },
  { value: 'LEADER_144', label: '🌿 Líder 144' },
  { value: 'LEADER_12', label: '👥 Líder 12' },
];

const ModalLeaderDetail = ({
  isOpen,
  onClose,
  leader,
  isDarkMode,
  loading,
  onVerify,
  onSuspend,
  onUnsuspend,
  onDeactivate,
  onReactivate,
  onEdit,   // (id, { leaderType, cellGroupCode, notes }) => Promise
  onDelete, // (id, memberName) => Promise
}) => {
  const [activeTab, setActiveTab] = useState('detail'); // 'detail' | 'edit'
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editForm, setEditForm] = useState({
    leaderType: '',
    cellGroupCode: '',
    notes: '',
  });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

  // Sincronizar form al abrir / cambiar líder
  useEffect(() => {
    if (leader) {
      setEditForm({
        leaderType: leader.leaderType || '',
        cellGroupCode: leader.cellGroupCode || '',
        notes: leader.notes || '',
      });
      setEditError('');
    }
  }, [leader]);

  // Resetear estado al cerrar
  useEffect(() => {
    if (!isOpen) {
      setActiveTab('detail');
      setShowDeleteConfirm(false);
      setEditError('');
    }
  }, [isOpen]);

  // Cerrar con Escape y bloquear scroll del body
  useEffect(() => {
    if (!isOpen) return;

    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        if (showDeleteConfirm) {
          setShowDeleteConfirm(false);
        } else {
          onClose();
        }
      }
    };

    document.addEventListener('keydown', handleEsc);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose, showDeleteConfirm]);

  if (!isOpen || !leader) return null;

  const typeInfo = LEADER_TYPE_MAP[leader.leaderType] || { label: leader.leaderType, icon: '👤', color: '#3b82f6' };
  const statusInfo = LEADER_STATUS_MAP[leader.status] || { label: leader.status, icon: '•', color: '#6b7280' };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      if (showDeleteConfirm) {
        setShowDeleteConfirm(false);
      } else {
        onClose();
      }
    }
  };

  // ── Edición ──────────────────────────────────────────
  const handleEditChange = (field, value) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
    setEditError('');
  };

  const handleEditSubmit = async () => {
    setEditLoading(true);
    setEditError('');
    try {
      await onEdit(leader.id, {
        leaderType: editForm.leaderType || undefined,
        cellGroupCode: editForm.cellGroupCode || undefined,
        notes: editForm.notes || undefined,
      });
      onClose(); // Cerrar modal al guardar exitosamente
    } catch (err) {
      setEditError(err?.message || 'Error al actualizar el líder');
    } finally {
      setEditLoading(false);
    }
  };

  // ── Eliminación ───────────────────────────────────────
  const handleDeleteConfirmed = async () => {
    try {
      await onDelete(leader.id, leader.memberName);
      onClose();
    } catch (err) {
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="leader-detail-overlay" onClick={handleOverlayClick}>
      <div className={`leader-detail-modal ${isDarkMode ? 'leader-detail-modal--dark' : ''}`}>

        {/* ========== HEADER CON ACCIONES ========== */}
        <div className="leader-detail__header">
          {/* Fila superior: cerrar + botones de acción */}
          <div className="leader-detail__header-top">
            <button
              className="leader-detail__close-btn"
              onClick={onClose}
              title="Cerrar"
              aria-label="Cerrar modal"
            >
              ✕
            </button>

            <div className="leader-detail__header-actions">
              <button
                className="leader-detail__action-btn leader-detail__action-btn--verify"
                onClick={() => onVerify(leader.id, leader.memberName)}
                disabled={loading}
                title="Verificar requisitos"
              >
                🔍 <span className="leader-detail__action-label">Verificar</span>
              </button>

              {/* Botón Editar */}
              <button
                className={`leader-detail__action-btn leader-detail__action-btn--edit ${activeTab === 'edit' ? 'leader-detail__action-btn--active' : ''}`}
                onClick={() => setActiveTab(activeTab === 'edit' ? 'detail' : 'edit')}
                disabled={loading}
                title="Editar líder"
              >
                ✏️ <span className="leader-detail__action-label">Editar</span>
              </button>

              {/* Botón Eliminar */}
              <button
                className="leader-detail__action-btn leader-detail__action-btn--delete"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={loading}
                title="Eliminar líder"
              >
                🗑️ <span className="leader-detail__action-label">Eliminar</span>
              </button>

              {leader.status === 'ACTIVE' && (
                <>
                  <button
                    className="leader-detail__action-btn leader-detail__action-btn--suspend"
                    onClick={() => onSuspend(leader.id, leader.memberName)}
                    disabled={loading}
                    title="Suspender líder"
                  >
                    ⏸️ <span className="leader-detail__action-label">Suspender</span>
                  </button>
                  <button
                    className="leader-detail__action-btn leader-detail__action-btn--deactivate"
                    onClick={() => onDeactivate(leader.id, leader.memberName)}
                    disabled={loading}
                    title="Desactivar permanentemente"
                  >
                    ⏹️ <span className="leader-detail__action-label">Desactivar</span>
                  </button>
                </>
              )}

              {leader.status === 'SUSPENDED' && (
                <button
                  className="leader-detail__action-btn leader-detail__action-btn--reactivate"
                  onClick={() => onUnsuspend(leader.id, leader.memberName)}
                  disabled={loading}
                  title="Reactivar líder"
                >
                  ▶️ <span className="leader-detail__action-label">Reactivar</span>
                </button>
              )}

              {leader.status === 'INACTIVE' && (
                <button
                  className="leader-detail__action-btn leader-detail__action-btn--reactivate"
                  onClick={() => onReactivate(leader.id, leader.memberName)}
                  disabled={loading}
                  title="Reactivar líder"
                >
                  🔄 <span className="leader-detail__action-label">Reactivar</span>
                </button>
              )}
            </div>
          </div>

          {/* Identidad: avatar + nombre + badges */}
          <div className="leader-detail__identity">
            <div className="leader-detail__avatar-lg">👤</div>
            <div className="leader-detail__identity-info">
              <h2 className="leader-detail__name">{leader.memberName}</h2>
              <div className="leader-detail__badges">
                <span
                  className="leader-detail__badge"
                  style={{
                    backgroundColor: `${typeInfo.color}25`,
                    color: '#fff',
                    borderColor: `${typeInfo.color}60`,
                  }}
                >
                  {typeInfo.icon} {typeInfo.label}
                </span>
                <span
                  className="leader-detail__badge"
                  style={{
                    backgroundColor: `${statusInfo.color}25`,
                    color: '#fff',
                    borderColor: `${statusInfo.color}60`,
                  }}
                >
                  {statusInfo.icon} {statusInfo.label}
                </span>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="leader-detail__tabs">
            <button
              className={`leader-detail__tab ${activeTab === 'detail' ? 'leader-detail__tab--active' : ''}`}
              onClick={() => setActiveTab('detail')}
            >
              📋 Detalle
            </button>
            <button
              className={`leader-detail__tab ${activeTab === 'edit' ? 'leader-detail__tab--active' : ''}`}
              onClick={() => setActiveTab('edit')}
            >
              ✏️ Editar
            </button>
          </div>
        </div>

        {/* ========== BODY ========== */}
        <div className="leader-detail__body">

          {/* ── PESTAÑA DETALLE ── */}
          {activeTab === 'detail' && (
            <>
              {/* Contacto */}
              <div className="leader-detail__section">
                <h3 className="leader-detail__section-title">📋 Información de Contacto</h3>
                <div className="leader-detail__grid">
                  <div className="leader-detail__field">
                    <span className="leader-detail__label">🆔 Documento</span>
                    <span className="leader-detail__value">{leader.memberDocument || 'No registrado'}</span>
                  </div>
                  <div className="leader-detail__field">
                    <span className="leader-detail__label">📧 Email</span>
                    <span className="leader-detail__value">{leader.memberEmail || 'No registrado'}</span>
                  </div>
                  <div className="leader-detail__field">
                    <span className="leader-detail__label">📞 Teléfono</span>
                    <span className="leader-detail__value">{leader.memberPhone || 'No registrado'}</span>
                  </div>
                  <div className="leader-detail__field">
                    <span className="leader-detail__label">🏷️ Célula</span>
                    <span className="leader-detail__value">{leader.cellGroupCode || 'No asignado'}</span>
                  </div>
                </div>
              </div>

              {/* Historial */}
              <div className="leader-detail__section">
                <h3 className="leader-detail__section-title">📅 Historial</h3>
                <div className="leader-detail__grid">
                  <div className="leader-detail__field">
                    <span className="leader-detail__label">🌟 Fecha de promoción</span>
                    <span className="leader-detail__value">{leader.promotionDateFormatted}</span>
                  </div>
                  <div className="leader-detail__field">
                    <span className="leader-detail__label">🔄 Última verificación</span>
                    <span className="leader-detail__value">
                      {leader.lastVerificationDate
                        ? `✅ ${leader.lastVerificationFormatted}`
                        : '⏳ Nunca verificado'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Suspensión (condicional) */}
              {leader.suspensionReason && (
                <div className="leader-detail__section leader-detail__section--warning">
                  <h3 className="leader-detail__section-title">⏸️ Suspensión</h3>
                  <div className="leader-detail__grid">
                    <div className="leader-detail__field leader-detail__field--full">
                      <span className="leader-detail__label">Motivo</span>
                      <span className="leader-detail__value">{leader.suspensionReason}</span>
                    </div>
                    {leader.suspensionDateFormatted && (
                      <div className="leader-detail__field">
                        <span className="leader-detail__label">Fecha</span>
                        <span className="leader-detail__value">{leader.suspensionDateFormatted}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Desactivación (condicional) */}
              {leader.deactivationReason && (
                <div className="leader-detail__section leader-detail__section--danger">
                  <h3 className="leader-detail__section-title">⏹️ Desactivación</h3>
                  <div className="leader-detail__grid">
                    <div className="leader-detail__field leader-detail__field--full">
                      <span className="leader-detail__label">Motivo</span>
                      <span className="leader-detail__value">{leader.deactivationReason}</span>
                    </div>
                    {leader.deactivationDate && (
                      <div className="leader-detail__field">
                        <span className="leader-detail__label">Fecha</span>
                        <span className="leader-detail__value">
                          {new Date(leader.deactivationDate).toLocaleDateString('es-CO')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Notas (condicional) */}
              {leader.notes && (
                <div className="leader-detail__section">
                  <h3 className="leader-detail__section-title">📝 Notas</h3>
                  <p className="leader-detail__notes">{leader.notes}</p>
                </div>
              )}
            </>
          )}

          {/* ── PESTAÑA EDITAR ── */}
          {activeTab === 'edit' && (
            <div className="leader-detail__edit-panel">
              <div className="leader-detail__section">
                <h3 className="leader-detail__section-title">✏️ Editar Información del Líder</h3>
                <p className="leader-detail__edit-hint">
                  Solo se actualizarán los campos que modifiques. Cambiar el tipo de líder requiere que el miembro cumpla los nuevos requisitos.
                </p>

                <div className="leader-detail__edit-form">
                  {/* Tipo de líder */}
                  <div className="leader-detail__form-group">
                    <label className="leader-detail__form-label">
                      🏅 Tipo de Líder
                    </label>
                    <select
                      className="leader-detail__form-select"
                      value={editForm.leaderType}
                      onChange={(e) => handleEditChange('leaderType', e.target.value)}
                      disabled={editLoading}
                    >
                      <option value="">— Sin cambio —</option>
                      {LEADER_TYPE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Código de célula */}
                  <div className="leader-detail__form-group">
                    <label className="leader-detail__form-label">
                      🏷️ Código de Célula
                    </label>
                    <input
                      type="text"
                      className="leader-detail__form-input"
                      placeholder={leader.cellGroupCode || 'Ej: CEL-001'}
                      value={editForm.cellGroupCode}
                      onChange={(e) => handleEditChange('cellGroupCode', e.target.value)}
                      disabled={editLoading}
                    />
                  </div>

                  {/* Notas */}
                  <div className="leader-detail__form-group">
                    <label className="leader-detail__form-label">
                      📝 Notas
                    </label>
                    <textarea
                      className="leader-detail__form-textarea"
                      placeholder="Observaciones sobre el líder..."
                      value={editForm.notes}
                      onChange={(e) => handleEditChange('notes', e.target.value)}
                      disabled={editLoading}
                      rows={3}
                    />
                  </div>

                  {/* Error */}
                  {editError && (
                    <div className="leader-detail__edit-error">
                      ⚠️ {editError}
                    </div>
                  )}

                  {/* Botones */}
                  <div className="leader-detail__edit-actions">
                    <button
                      className="leader-detail__edit-btn leader-detail__edit-btn--cancel"
                      onClick={() => {
                        setActiveTab('detail');
                        setEditError('');
                      }}
                      disabled={editLoading}
                    >
                      Cancelar
                    </button>
                    <button
                      className="leader-detail__edit-btn leader-detail__edit-btn--save"
                      onClick={handleEditSubmit}
                      disabled={editLoading}
                    >
                      {editLoading ? '⏳ Guardando...' : '💾 Guardar cambios'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ========== ALERT DE CONFIRMACIÓN ELIMINAR ========== */}
      {showDeleteConfirm && (
        <div className="leader-detail__confirm-overlay" onClick={(e) => e.stopPropagation()}>
          <div className={`leader-detail__confirm-dialog ${isDarkMode ? 'leader-detail__confirm-dialog--dark' : ''}`}>
            <div className="leader-detail__confirm-icon">🗑️</div>
            <h3 className="leader-detail__confirm-title">¿Eliminar este líder?</h3>
            <p className="leader-detail__confirm-message">
              Estás a punto de eliminar a <strong>{leader.memberName}</strong> del registro de líderes.
              Esta acción <strong>no se puede deshacer</strong>.
            </p>
            <div className="leader-detail__confirm-actions">
              <button
                className="leader-detail__confirm-btn leader-detail__confirm-btn--cancel"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                className="leader-detail__confirm-btn leader-detail__confirm-btn--confirm"
                onClick={handleDeleteConfirmed}
                disabled={loading}
              >
                {loading ? '⏳ Eliminando...' : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModalLeaderDetail;