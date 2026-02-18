// ============================================
// ModalLeaderStatistics.jsx - Estadísticas de liderazgo
// ============================================

import React, { useEffect, useRef } from 'react';
import '../css/ModalLeaderStatistics.css';

const ModalLeaderStatistics = ({ isOpen, onClose, data, isDarkMode }) => {
  const chartRefs = useRef({});

  // ========== THEME COLORS ==========
  const theme = {
    bg: isDarkMode ? '#1e293b' : '#ffffff',
    bgSecondary: isDarkMode ? '#0f172a' : '#f9fafb',
    text: isDarkMode ? '#f3f4f6' : '#1f2937',
    textSecondary: isDarkMode ? '#9ca3af' : '#6b7280',
    border: isDarkMode ? '#334155' : '#e5e7eb',
    cardBg: isDarkMode ? '#0f172a' : '#f9fafb',
  };

  // ========== FORMAT NUMBERS ==========
  const formatNumber = (num) => {
    return new Intl.NumberFormat('es-CO').format(num || 0);
  };

  // ========== CALCULATE PERCENTAGE ==========
  const calculatePercentage = (value, total) => {
    if (!total || total === 0) return 0;
    return ((value / total) * 100).toFixed(1);
  };

  // ========== RENDER STATS CARDS ==========
  const renderStatsCards = () => {
    if (!data) return null;

    const cards = [
      {
        title: 'Total Líderes',
        value: formatNumber(data.totalLeaders || 0),
        icon: '👥',
        color: '#3b82f6',
        bgColor: isDarkMode ? '#3b82f620' : '#dbeafe',
      },
      {
        title: 'Activos',
        value: formatNumber(data.activeLeaders || 0),
        icon: '✅',
        color: '#10b981',
        bgColor: isDarkMode ? '#10b98120' : '#d1fae5',
        percentage: calculatePercentage(data.activeLeaders, data.totalLeaders),
      },
      {
        title: 'Suspendidos',
        value: formatNumber(data.suspendedLeaders || 0),
        icon: '⏸️',
        color: '#f59e0b',
        bgColor: isDarkMode ? '#f59e0b20' : '#fed7aa',
        percentage: calculatePercentage(data.suspendedLeaders, data.totalLeaders),
      },
      {
        title: 'Inactivos',
        value: formatNumber(data.inactiveLeaders || 0),
        icon: '⏹️',
        color: '#6b7280',
        bgColor: isDarkMode ? '#6b728020' : '#e5e7eb',
        percentage: calculatePercentage(data.inactiveLeaders, data.totalLeaders),
      },
    ];

    return (
      <div className="modal-stats__cards">
        {cards.map((card, index) => (
          <div
            key={index}
            className="modal-stats__card"
            style={{
              backgroundColor: card.bgColor,
              borderColor: theme.border,
            }}
          >
            <div className="modal-stats__card-icon">{card.icon}</div>
            <div className="modal-stats__card-content">
              <div className="modal-stats__card-title">{card.title}</div>
              <div className="modal-stats__card-value" style={{ color: card.color }}>
                {card.value}
              </div>
              {card.percentage && (
                <div className="modal-stats__card-percentage">
                  {card.percentage}% del total
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // ========== RENDER STATS BY TYPE ==========
  const renderStatsByType = () => {
    if (!data || !data.byType) return null;

    const types = [
      { key: 'SERVANT', label: 'Servidores', icon: '🛠️', color: '#3b82f6' },
      { key: 'LEADER_12', label: 'Líderes 12', icon: '👥', color: '#10b981' },
    ];

    return (
      <div className="modal-stats__section">
        <h3>📊 Distribución por Tipo</h3>
        <div className="modal-stats__type-grid">
          {types.map(type => {
            const typeData = data.byType[type.key] || { count: 0, displayName: type.label, requiredLevel: '' };
            
            return (
              <div
                key={type.key}
                className="modal-stats__type-card"
                style={{
                  backgroundColor: theme.cardBg,
                  borderColor: theme.border,
                  borderLeftColor: type.color,
                }}
              >
                <div className="modal-stats__type-header">
                  <span className="modal-stats__type-icon">{type.icon}</span>
                  <span className="modal-stats__type-name">{typeData.displayName}</span>
                </div>
                <div className="modal-stats__type-count" style={{ color: type.color }}>
                  {formatNumber(typeData.count)}
                </div>
                <div className="modal-stats__type-level">
                  Nivel: {typeData.requiredLevel}
                </div>
                <div className="modal-stats__type-percentage">
                  {calculatePercentage(typeData.count, data.activeLeaders)}% de activos
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ========== RENDER PROMOTIONS ==========
  const renderPromotions = () => {
    if (!data) return null;

    return (
      <div className="modal-stats__section">
        <h3>📈 Promociones Recientes</h3>
        <div 
          className="modal-stats__promo-card"
          style={{
            backgroundColor: theme.cardBg,
            borderColor: theme.border,
          }}
        >
          <div className="modal-stats__promo-icon">📅</div>
          <div className="modal-stats__promo-content">
            <div className="modal-stats__promo-value">
              {formatNumber(data.promotionsLastMonth || 0)}
            </div>
            <div className="modal-stats__promo-label">
              Nuevos líderes en el último mes
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ========== RENDER FILTER INFO ==========
  const renderFilterInfo = () => {
    if (!data || !data.hasFilters) return null;

    return (
      <div 
        className="modal-stats__filter-info"
        style={{
          backgroundColor: theme.bgSecondary,
          borderColor: theme.border,
        }}
      >
        <h4>🔍 Vista filtrada</h4>
        <p>
          Mostrando estadísticas de <strong>{data.currentViewCount}</strong> líderes 
          (de <strong>{data.totalCount}</strong> totales)
        </p>
        {data.filtersInfo && Object.entries(data.filtersInfo).length > 0 && (
          <div className="modal-stats__filter-tags">
            {Object.entries(data.filtersInfo).map(([key, value]) => (
              <span 
                key={key}
                className="modal-stats__filter-tag"
                style={{
                  backgroundColor: isDarkMode ? '#3b82f620' : '#dbeafe',
                  color: isDarkMode ? '#93c5fd' : '#1e40af',
                }}
              >
                {key === 'status' && '📌 '}
                {key === 'type' && '🛠️ '}
                {key === 'search' && '🔍 '}
                {value}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  };

  // ========== RENDER QUICK ACTIONS ==========
  const renderQuickActions = () => {
    return (
      <div className="modal-stats__section">
        <h3>⚡ Acciones rápidas</h3>
        <div className="modal-stats__actions-grid">
          <button
            className="modal-stats__action-btn"
            onClick={() => {
              onClose();
              // Aquí puedes navegar a la vista de activos
            }}
            style={{
              backgroundColor: isDarkMode ? '#10b98120' : '#d1fae5',
              color: isDarkMode ? '#34d399' : '#047857',
            }}
          >
            ✅ Ver Activos
          </button>
          <button
            className="modal-stats__action-btn"
            onClick={() => {
              onClose();
              // Aquí puedes navegar a la vista de suspendidos
            }}
            style={{
              backgroundColor: isDarkMode ? '#f59e0b20' : '#fed7aa',
              color: isDarkMode ? '#fbbf24' : '#b45309',
            }}
          >
            ⏸️ Ver Suspendidos
          </button>
          <button
            className="modal-stats__action-btn"
            onClick={() => {
              onClose();
              // Aquí puedes navegar a la vista de inactivos
            }}
            style={{
              backgroundColor: isDarkMode ? '#6b728020' : '#e5e7eb',
              color: isDarkMode ? '#9ca3af' : '#4b5563',
            }}
          >
            ⏹️ Ver Inactivos
          </button>
          <button
            className="modal-stats__action-btn"
            onClick={() => {
              // Aquí puedes implementar exportación rápida
              window.print();
            }}
            style={{
              backgroundColor: isDarkMode ? '#8b5cf620' : '#ede9fe',
              color: isDarkMode ? '#a78bfa' : '#6d28d9',
            }}
          >
            📄 Exportar PDF
          </button>
        </div>
      </div>
    );
  };

  // ========== RENDER ==========
  if (!isOpen || !data) return null;

  return (
    <div className="modal-stats__overlay" onClick={onClose}>
      <div 
        className="modal-stats__container" 
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: theme.bg,
          color: theme.text,
          borderColor: theme.border,
        }}
      >
        {/* HEADER */}
        <div className="modal-stats__header">
          <h2>📊 Estadísticas de Liderazgo</h2>
          <button 
            className="modal-stats__close" 
            onClick={onClose}
            style={{ color: theme.text }}
          >
            ✕
          </button>
        </div>

        {/* CONTENT */}
        <div className="modal-stats__content">
          {renderFilterInfo()}
          {renderStatsCards()}
          {renderStatsByType()}
          {renderPromotions()}
          {renderQuickActions()}

          {/* FOOTER INFO */}
          <div 
            className="modal-stats__footer"
            style={{
              borderTopColor: theme.border,
              color: theme.textSecondary,
            }}
          >
            <span>📅 Actualizado: {new Date().toLocaleString('es-CO')}</span>
            <span>🔄 Los datos se actualizan automáticamente</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModalLeaderStatistics;