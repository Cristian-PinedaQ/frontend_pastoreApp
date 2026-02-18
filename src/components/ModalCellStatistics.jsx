// ============================================
// ModalCellStatistics.jsx
// Dashboard de estadísticas de células
// Props: isOpen, onClose, data, isDarkMode
// ============================================

import React, { useEffect } from 'react';
import '../css/ModalCellStatistics.css';

const ModalCellStatistics = ({ isOpen, onClose, data, isDarkMode }) => {

  // ── Theme ──────────────────────────────────────────────────────────────────
  const T = {
    bg:          isDarkMode ? '#1e293b' : '#ffffff',
    bgSecondary: isDarkMode ? '#0f172a' : '#f8fafc',
    text:        isDarkMode ? '#f3f4f6' : '#1f2937',
    textSub:     isDarkMode ? '#9ca3af' : '#6b7280',
    border:      isDarkMode ? '#334155' : '#e5e7eb',
    cardBg:      isDarkMode ? '#0f172a' : '#ffffff',
  };

  // ── Prevent body scroll when open ──────────────────────────────────────────
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen || !data) return null;

  // ── Derive stats safely ────────────────────────────────────────────────────
  const total       = data.total       ?? data.totalCount     ?? 0;
  const activas     = data.activas     ?? data.active         ?? 0;
  const incompletas = data.incompletas ?? data.incomplete     ?? 0;
  const suspendidas = data.suspendidas ?? data.suspended      ?? 0;
  const inactivas   = data.inactivas   ?? data.inactive       ?? 0;
  const multiplicando = data.multiplicando ?? data.multiplying ?? 0;

  const currentView = data.currentViewCount ?? total;
  const totalCount  = data.totalCount       ?? total;
  const hasFilters  = data.hasFilters       ?? false;
  const filtersInfo = data.filtersInfo      ?? {};

  // ── Percentage helper ──────────────────────────────────────────────────────
  const pct = (value) => total > 0 ? Math.round((value / total) * 100) : 0;

  // ── Status cards config ────────────────────────────────────────────────────
  const statusCards = [
    {
      key: 'activas',
      label: 'Activas',
      value: activas,
      icon: '✅',
      color: '#10b981',
      bg: isDarkMode ? '#064e3b' : '#d1fae5',
      accent: isDarkMode ? '#34d399' : '#059669',
    },
    {
      key: 'incompletas',
      label: 'Liderazgo Incompleto',
      value: incompletas,
      icon: '⚠️',
      color: '#f59e0b',
      bg: isDarkMode ? '#78350f' : '#fef3c7',
      accent: isDarkMode ? '#fbbf24' : '#d97706',
    },
    {
      key: 'suspendidas',
      label: 'Suspendidas',
      value: suspendidas,
      icon: '⏸️',
      color: '#ef4444',
      bg: isDarkMode ? '#7f1d1d' : '#fee2e2',
      accent: isDarkMode ? '#f87171' : '#dc2626',
    },
    {
      key: 'inactivas',
      label: 'Inactivas',
      value: inactivas,
      icon: '⏹️',
      color: '#6b7280',
      bg: isDarkMode ? '#1f2937' : '#f3f4f6',
      accent: isDarkMode ? '#9ca3af' : '#4b5563',
    },
  ];

  // ── Donut chart via CSS conic-gradient ─────────────────────────────────────
  const buildDonutGradient = () => {
    if (total === 0) return `conic-gradient(${isDarkMode ? '#334155' : '#e5e7eb'} 0deg 360deg)`;

    const segments = [
      { value: activas,     color: '#10b981' },
      { value: incompletas, color: '#f59e0b' },
      { value: suspendidas, color: '#ef4444' },
      { value: inactivas,   color: '#6b7280' },
    ].filter(s => s.value > 0);

    let angle = 0;
    const parts = segments.map(s => {
      const start = angle;
      const end   = angle + (s.value / total) * 360;
      angle = end;
      return `${s.color} ${start}deg ${end}deg`;
    });

    return `conic-gradient(${parts.join(', ')})`;
  };

  // ── Active filters display ─────────────────────────────────────────────────
  const filterEntries = Object.entries(filtersInfo);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="mcs-overlay" onClick={onClose}>
      <div
        className="mcs-container"
        style={{ backgroundColor: T.bg, color: T.text }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="mcs-header">
          <div className="mcs-header-info">
            <span className="mcs-header-icon">📊</span>
            <div>
              <h2 className="mcs-header-title" style={{ color: '#ffffff' }}>
                Estadísticas de Células
              </h2>
              <p className="mcs-header-subtitle">
                Resumen general del estado de todas las células
              </p>
            </div>
          </div>
          <button className="mcs-close-btn" onClick={onClose} title="Cerrar">✕</button>
        </div>

        {/* ── Body ── */}
        <div className="mcs-body">

          {/* Filtro activo banner */}
          {hasFilters && filterEntries.length > 0 && (
            <div
              className="mcs-filter-banner"
              style={{
                backgroundColor: isDarkMode ? '#1e3a5f' : '#eff6ff',
                borderColor: isDarkMode ? '#2563eb' : '#bfdbfe',
              }}
            >
              <span className="mcs-filter-banner-icon">🔍</span>
              <div className="mcs-filter-banner-content">
                <span style={{ fontWeight: 700, color: T.text, fontSize: '12px' }}>
                  Filtros aplicados — mostrando {currentView} de {totalCount} células
                </span>
                <div className="mcs-filter-tags">
                  {filterEntries.map(([key, val]) => (
                    <span
                      key={key}
                      className="mcs-filter-tag"
                      style={{
                        backgroundColor: isDarkMode ? '#334155' : '#dbeafe',
                        color: isDarkMode ? '#93c5fd' : '#1e40af',
                      }}
                    >
                      {val}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Total hero ── */}
          <div className="mcs-hero-section">
            <div className="mcs-donut-wrapper">
              <div
                className="mcs-donut"
                style={{ background: buildDonutGradient() }}
              >
                <div
                  className="mcs-donut-center"
                  style={{ backgroundColor: T.bg }}
                >
                  <span className="mcs-donut-number" style={{ color: T.text }}>{total}</span>
                  <span className="mcs-donut-label" style={{ color: T.textSub }}>Total</span>
                </div>
              </div>
              {/* Legend */}
              <div className="mcs-donut-legend">
                {statusCards.filter(s => s.value > 0).map(s => (
                  <div key={s.key} className="mcs-legend-item">
                    <span className="mcs-legend-dot" style={{ backgroundColor: s.color }} />
                    <span style={{ color: T.textSub, fontSize: '11px' }}>{s.label}</span>
                    <span style={{ color: T.text, fontSize: '11px', fontWeight: 700, marginLeft: 'auto' }}>
                      {s.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Multiplicación highlight */}
            {multiplicando > 0 && (
              <div
                className="mcs-multiply-banner"
                style={{
                  backgroundColor: isDarkMode ? '#064e3b' : '#ecfdf5',
                  borderColor: isDarkMode ? '#10b981' : '#a7f3d0',
                }}
              >
                <span style={{ fontSize: '22px' }}>🌱</span>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '20px', color: isDarkMode ? '#34d399' : '#059669' }}>
                    {multiplicando}
                  </div>
                  <div style={{ fontSize: '11px', color: T.textSub }}>En multiplicación</div>
                </div>
              </div>
            )}
          </div>

          {/* ── Status cards grid ── */}
          <div className="mcs-cards-grid">
            {statusCards.map((card, index) => (
              <div
                key={card.key}
                className="mcs-stat-card"
                style={{
                  backgroundColor: card.bg,
                  borderColor: `${card.color}30`,
                  animationDelay: `${index * 0.06}s`,
                }}
              >
                <div className="mcs-stat-card-top">
                  <span className="mcs-stat-icon">{card.icon}</span>
                  <span
                    className="mcs-stat-pct"
                    style={{ color: card.accent }}
                  >
                    {pct(card.value)}%
                  </span>
                </div>
                <div
                  className="mcs-stat-value"
                  style={{ color: card.accent }}
                >
                  {card.value}
                </div>
                <div className="mcs-stat-label" style={{ color: card.accent, opacity: 0.8 }}>
                  {card.label}
                </div>
                {/* Mini bar */}
                <div className="mcs-stat-bar-track" style={{ backgroundColor: `${card.color}20` }}>
                  <div
                    className="mcs-stat-bar-fill"
                    style={{
                      width: `${pct(card.value)}%`,
                      backgroundColor: card.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* ── Quick insights ── */}
          {total > 0 && (
            <div
              className="mcs-insights"
              style={{ backgroundColor: T.bgSecondary, borderColor: T.border }}
            >
              <h4 className="mcs-insights-title" style={{ color: T.text }}>
                💡 Resumen Rápido
              </h4>
              <div className="mcs-insights-list">
                {activas > 0 && (
                  <div className="mcs-insight-item">
                    <span className="mcs-insight-dot" style={{ backgroundColor: '#10b981' }} />
                    <span style={{ color: T.textSub, fontSize: '12px' }}>
                      <strong style={{ color: T.text }}>{pct(activas)}%</strong> de las células están completamente activas
                    </span>
                  </div>
                )}
                {incompletas > 0 && (
                  <div className="mcs-insight-item">
                    <span className="mcs-insight-dot" style={{ backgroundColor: '#f59e0b' }} />
                    <span style={{ color: T.textSub, fontSize: '12px' }}>
                      <strong style={{ color: T.text }}>{incompletas}</strong> célula{incompletas !== 1 ? 's' : ''} necesita{incompletas === 1 ? '' : 'n'} atención en su liderazgo
                    </span>
                  </div>
                )}
                {suspendidas > 0 && (
                  <div className="mcs-insight-item">
                    <span className="mcs-insight-dot" style={{ backgroundColor: '#ef4444' }} />
                    <span style={{ color: T.textSub, fontSize: '12px' }}>
                      <strong style={{ color: T.text }}>{suspendidas}</strong> célula{suspendidas !== 1 ? 's' : ''} suspendida{suspendidas !== 1 ? 's' : ''} temporalmente
                    </span>
                  </div>
                )}
                {inactivas > 0 && (
                  <div className="mcs-insight-item">
                    <span className="mcs-insight-dot" style={{ backgroundColor: '#6b7280' }} />
                    <span style={{ color: T.textSub, fontSize: '12px' }}>
                      <strong style={{ color: T.text }}>{inactivas}</strong> célula{inactivas !== 1 ? 's' : ''} inactiva{inactivas !== 1 ? 's' : ''}
                    </span>
                  </div>
                )}
                {multiplicando > 0 && (
                  <div className="mcs-insight-item">
                    <span className="mcs-insight-dot" style={{ backgroundColor: '#0d9488' }} />
                    <span style={{ color: T.textSub, fontSize: '12px' }}>
                      <strong style={{ color: T.text }}>{multiplicando}</strong> en proceso de multiplicación 🌱
                    </span>
                  </div>
                )}
                {activas === total && total > 0 && (
                  <div className="mcs-insight-item mcs-insight-item--highlight">
                    <span style={{ fontSize: '14px' }}>🎉</span>
                    <span style={{ color: '#059669', fontSize: '12px', fontWeight: 600 }}>
                      ¡Todas las células están activas! Excelente trabajo.
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Empty state */}
          {total === 0 && (
            <div className="mcs-empty" style={{ color: T.textSub }}>
              <span style={{ fontSize: '40px' }}>📭</span>
              <p>No hay datos estadísticos disponibles.</p>
              <p style={{ fontSize: '12px' }}>Crea tu primera célula para comenzar a ver estadísticas.</p>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="mcs-footer" style={{ borderTopColor: T.border }}>
          <span style={{ color: T.textSub, fontSize: '11px' }}>
            📅 Datos al {new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
          </span>
          <button className="mcs-footer-btn" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalCellStatistics;