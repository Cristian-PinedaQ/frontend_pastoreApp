// ============================================
// ModalLeaderStatistics.jsx - Estadísticas de Liderazgo
// Basado en datos de GET /api/v1/leaders/statistics
// ============================================

import React, { useEffect } from 'react';
import '../css/ModalLeaderStatistics.css';

const ModalLeaderStatistics = ({ isOpen, onClose, data, isDarkMode }) => {
  // Cerrar con Escape y bloquear scroll
  useEffect(() => {
    if (!isOpen) return;

    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleEsc);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen || !data) return null;

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  // ===== Datos del backend =====
  const total = data.totalLeaders || 0;
  const active = data.activeLeaders || 0;
  const suspended = data.suspendedLeaders || 0;
  const inactive = data.inactiveLeaders || 0;
  const promotionsLastMonth = data.promotionsLastMonth || 0;
  const byType = data.byType || {};

  // Porcentajes (evitar NaN)
  const pctActive = total > 0 ? Math.round((active / total) * 100) : 0;
  const pctSuspended = total > 0 ? Math.round((suspended / total) * 100) : 0;
  const pctInactive = total > 0 ? Math.round((inactive / total) * 100) : 0;

  // Info de tipos con iconos y colores
  const typeConfig = {
    SERVANT: { icon: '🌱', color: '#3b82f6', label: 'Servidores' },
    LEADER_144: { icon: '🌿', color: '#8b5cf6', label: 'Líderes 144' },
    LEADER_12: { icon: '🌳', color: '#10b981', label: 'Líderes 12' },
  };

  // Filtros activos (del contexto que agrega LeadersPage)
  const hasFilters = data.hasFilters || false;
  const filtersInfo = data.filtersInfo || {};

  return (
    <div className="leader-stats-overlay" onClick={handleOverlayClick}>
      <div className={`leader-stats-modal ${isDarkMode ? 'leader-stats-modal--dark' : ''}`}>

        {/* ========== HEADER ========== */}
        <div className="leader-stats__header">
          <div className="leader-stats__header-content">
            <h2 className="leader-stats__title">📊 Estadísticas de Liderazgo</h2>
            {hasFilters && (
              <span className="leader-stats__filter-tag">
                🔍 Con filtros
              </span>
            )}
          </div>
          <button
            className="leader-stats__close-btn"
            onClick={onClose}
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        {/* ========== BODY ========== */}
        <div className="leader-stats__body">

          {/* === Tarjetas resumen === */}
          <div className="leader-stats__summary-cards">
            <div className="leader-stats__card leader-stats__card--total">
              <span className="leader-stats__card-icon">👥</span>
              <div className="leader-stats__card-data">
                <span className="leader-stats__card-number">{total}</span>
                <span className="leader-stats__card-label">Total Líderes</span>
              </div>
            </div>

            <div className="leader-stats__card leader-stats__card--active">
              <span className="leader-stats__card-icon">✅</span>
              <div className="leader-stats__card-data">
                <span className="leader-stats__card-number">{active}</span>
                <span className="leader-stats__card-label">Activos</span>
              </div>
            </div>

            <div className="leader-stats__card leader-stats__card--suspended">
              <span className="leader-stats__card-icon">⏸️</span>
              <div className="leader-stats__card-data">
                <span className="leader-stats__card-number">{suspended}</span>
                <span className="leader-stats__card-label">Suspendidos</span>
              </div>
            </div>

            <div className="leader-stats__card leader-stats__card--inactive">
              <span className="leader-stats__card-icon">⏹️</span>
              <div className="leader-stats__card-data">
                <span className="leader-stats__card-number">{inactive}</span>
                <span className="leader-stats__card-label">Inactivos</span>
              </div>
            </div>
          </div>

          {/* === Barras de distribución por estado === */}
          <div className="leader-stats__section">
            <h3 className="leader-stats__section-title">📌 Distribución por Estado</h3>

            {total === 0 ? (
              <p className="leader-stats__empty-text">No hay líderes registrados</p>
            ) : (
              <>
                {/* Barra visual compuesta */}
                <div className="leader-stats__stacked-bar">
                  {pctActive > 0 && (
                    <div
                      className="leader-stats__stacked-segment"
                      style={{ width: `${pctActive}%`, backgroundColor: '#10b981' }}
                      title={`Activos: ${pctActive}%`}
                    />
                  )}
                  {pctSuspended > 0 && (
                    <div
                      className="leader-stats__stacked-segment"
                      style={{ width: `${pctSuspended}%`, backgroundColor: '#f59e0b' }}
                      title={`Suspendidos: ${pctSuspended}%`}
                    />
                  )}
                  {pctInactive > 0 && (
                    <div
                      className="leader-stats__stacked-segment"
                      style={{ width: `${pctInactive}%`, backgroundColor: '#6b7280' }}
                      title={`Inactivos: ${pctInactive}%`}
                    />
                  )}
                </div>

                {/* Leyenda */}
                <div className="leader-stats__legend">
                  <div className="leader-stats__legend-item">
                    <span className="leader-stats__legend-dot" style={{ backgroundColor: '#10b981' }} />
                    <span>Activos {pctActive}%</span>
                  </div>
                  <div className="leader-stats__legend-item">
                    <span className="leader-stats__legend-dot" style={{ backgroundColor: '#f59e0b' }} />
                    <span>Suspendidos {pctSuspended}%</span>
                  </div>
                  <div className="leader-stats__legend-item">
                    <span className="leader-stats__legend-dot" style={{ backgroundColor: '#6b7280' }} />
                    <span>Inactivos {pctInactive}%</span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* === Desglose por tipo de líder === */}
          <div className="leader-stats__section">
            <h3 className="leader-stats__section-title">🏷️ Líderes Activos por Tipo</h3>

            <div className="leader-stats__type-list">
              {Object.entries(byType).map(([typeKey, typeData]) => {
                const config = typeConfig[typeKey] || { icon: '👤', color: '#6b7280', label: typeKey };
                const count = typeData?.count || 0;
                const displayName = typeData?.displayName || config.label;
                const requiredLevel = typeData?.requiredLevel || '';
                const barWidth = active > 0 ? Math.round((count / active) * 100) : 0;

                return (
                  <div key={typeKey} className="leader-stats__type-item">
                    <div className="leader-stats__type-header">
                      <div className="leader-stats__type-info">
                        <span className="leader-stats__type-icon">{config.icon}</span>
                        <div className="leader-stats__type-text">
                          <span className="leader-stats__type-name">{displayName}</span>
                          {requiredLevel && (
                            <span className="leader-stats__type-req">Requisito: {requiredLevel}</span>
                          )}
                        </div>
                      </div>
                      <span
                        className="leader-stats__type-count"
                        style={{ color: config.color }}
                      >
                        {count}
                      </span>
                    </div>
                    <div className="leader-stats__type-bar-bg">
                      <div
                        className="leader-stats__type-bar-fill"
                        style={{
                          width: `${barWidth}%`,
                          backgroundColor: config.color,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* === Promociones recientes === */}
          <div className="leader-stats__section leader-stats__section--highlight">
            <div className="leader-stats__promo-card">
              <span className="leader-stats__promo-icon">🌟</span>
              <div className="leader-stats__promo-info">
                <span className="leader-stats__promo-number">{promotionsLastMonth}</span>
                <span className="leader-stats__promo-label">Promociones en el último mes</span>
              </div>
            </div>
          </div>

          {/* === Info de filtros (si aplica) === */}
          {hasFilters && (
            <div className="leader-stats__section leader-stats__section--filter-info">
              <h3 className="leader-stats__section-title">🔍 Filtros Aplicados en Vista</h3>
              <div className="leader-stats__filter-details">
                {filtersInfo.status && (
                  <span className="leader-stats__filter-chip">Estado: {filtersInfo.status}</span>
                )}
                {filtersInfo.type && (
                  <span className="leader-stats__filter-chip">Tipo: {filtersInfo.type}</span>
                )}
                {filtersInfo.search && (
                  <span className="leader-stats__filter-chip">Búsqueda: "{filtersInfo.search}"</span>
                )}
                <p className="leader-stats__filter-note">
                  Vista filtrada: {data.currentViewCount || 0} de {data.totalCount || 0} líderes.
                  Las estadísticas muestran datos globales del sistema.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ========== FOOTER ========== */}
        <div className="leader-stats__footer">
          <button className="leader-stats__close-footer-btn" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalLeaderStatistics;