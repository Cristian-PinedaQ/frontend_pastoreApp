// 📊 ModalStatistics.jsx - Modal de Estadísticas Dinámicas (v2.1 - CORREGIDO)
// ✅ Muestra estadísticas generales o filtradas según lo que aplique el usuario
// ✅ Indicador visual de filtros activos
// ✅ Exportación de PDF desde el modal
// ✅ CORREGIDO: useMemo antes del early return (React Hooks Rules)

import React, { useMemo } from 'react';
import { generatePDF } from '../services/Pdfgenerator';
import '../css/ModalStatistics.css';

const ModalStatistics = ({ isOpen, onClose, data, isDarkMode }) => {
  // ========== CALCULAR TOTALES (ANTES del early return - REGLA DE HOOKS) ==========
  // Los hooks SIEMPRE deben llamarse en el mismo orden, nunca condicionalmente
  const totals = useMemo(() => {
    if (!data || !data.statistics) {
      return { total: 0, passed: 0, failed: 0, pending: 0, cancelled: 0, passPercentage: 0 };
    }

    const statistics = data.statistics || {};
    const total = Object.values(statistics).reduce((sum, stat) => sum + (stat.total || 0), 0);
    const passed = Object.values(statistics).reduce((sum, stat) => sum + (stat.passed || 0), 0);
    const failed = Object.values(statistics).reduce((sum, stat) => sum + (stat.failed || 0), 0);
    const pending = Object.values(statistics).reduce((sum, stat) => sum + (stat.pending || 0), 0);
    const cancelled = Object.values(statistics).reduce((sum, stat) => sum + (stat.cancelled || 0), 0);
    const passPercentage = total > 0 ? ((passed / total) * 100).toFixed(1) : 0;

    return { total, passed, failed, pending, cancelled, passPercentage };
  }, [data]);

  // ========== EARLY RETURN (DESPUÉS de los hooks) ==========
  if (!isOpen || !data) return null;

  const {
    statistics = {},
    hasFilters = false,
    filtersInfo = {},
    dataCount = 0,
  } = data;

  // ========== THEME COLORS ==========
  const theme = {
    bg: isDarkMode ? '#0f172a' : '#ffffff',
    bgDark: isDarkMode ? '#1e293b' : '#f9fafb',
    text: isDarkMode ? '#f3f4f6' : '#1f2937',
    textSecondary: isDarkMode ? '#9ca3af' : '#6b7280',
    border: isDarkMode ? '#334155' : '#e5e7eb',
    accent: '#667eea',
    accentLight: '#f0f4ff',
  };

  // ========== EXPORTAR PDF DESDE MODAL ==========
  const handleExportPDF = () => {
    try {
      const title = hasFilters 
        ? `Estadísticas ${Object.keys(filtersInfo).length > 0 ? '(Con Filtros)' : ''}`
        : 'Estadísticas Generales';

      const filename = hasFilters ? 'estadisticas-filtradas' : 'estadisticas-generales';

      const pdfData = {
        title: title,
        statistics: statistics,
        totals: totals,
        hasFilters: hasFilters,
        filtersInfo: filtersInfo,
        dataCount: dataCount,
        date: new Date().toLocaleDateString('es-CO'),
      };

      generatePDF(pdfData, filename);
      alert('PDF de estadísticas descargado exitosamente');
    } catch (err) {
      console.error('Error al exportar PDF:', err);
      alert('Error al generar PDF: ' + err.message);
    }
  };

  return (
    <div className="modal-statistics-overlay" onClick={onClose} style={{ backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.7)' : 'rgba(0, 0, 0, 0.5)' }}>
      <div
        className="modal-statistics"
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: theme.bg,
          color: theme.text,
        }}
      >
        {/* ========== HEADER ========== */}
        <div className="modal-statistics__header" style={{ borderColor: theme.border }}>
          <div className="modal-statistics__title-wrapper">
            <h2 className="modal-statistics__title">📊 Estadísticas de Estudiantes</h2>
            {hasFilters && (
              <span className="modal-statistics__filter-badge">🔍 Con Filtros</span>
            )}
          </div>
          <button
            className="modal-statistics__close"
            onClick={onClose}
            style={{ color: theme.textSecondary }}
          >
            ✕
          </button>
        </div>

        {/* ========== FILTER INFO ==========*/}
        {hasFilters && Object.keys(filtersInfo).length > 0 && (
          <div
            className="modal-statistics__filter-info"
            style={{
              backgroundColor: isDarkMode ? '#1a2f3a' : theme.accentLight,
              borderColor: theme.accent,
              borderLeft: `4px solid ${theme.accent}`,
            }}
          >
            <strong>Filtros Aplicados:</strong>
            <div className="modal-statistics__filters-list">
              {Object.entries(filtersInfo).map(([key, value]) => (
                <span 
                  key={key} 
                  className="modal-statistics__filter-tag"
                  style={{
                    backgroundColor: isDarkMode ? '#334155' : '#ffffff',
                    color: isDarkMode ? '#f3f4f6' : '#1f2937',
                  }}
                >
                  {key === 'year' && `📅 ${value}`}
                  {key === 'level' && `📌 ${value}`}
                  {key === 'result' && `✅ ${value}`}
                  {key === 'search' && `🔍 Búsqueda: ${value}`}
                </span>
              ))}
            </div>
            <p className="modal-statistics__filter-message">
              Mostrando <strong>{dataCount}</strong> estudiante(s) que coinciden con los filtros
            </p>
          </div>
        )}

        {/* ========== CONTENT ==========*/}
        <div className="modal-statistics__content">

          {/* ========== RESUMEN GENERAL ==========*/}
          <div className="modal-statistics__summary">
            <h3 className="modal-statistics__section-title">Resumen General</h3>
            <div className="modal-statistics__summary-grid">
              <div
                className="modal-statistics__summary-card modal-statistics__summary-card--total"
                style={{
                  backgroundColor: isDarkMode ? '#1a2332' : '#f0f4ff',
                  borderColor: theme.accent,
                }}
              >
                <div className="modal-statistics__summary-icon">👥</div>
                <div className="modal-statistics__summary-data">
                  <p className="modal-statistics__summary-label">Total de Estudiantes</p>
                  <p className="modal-statistics__summary-value">{totals.total}</p>
                </div>
              </div>

              <div
                className="modal-statistics__summary-card modal-statistics__summary-card--passed"
                style={{
                  backgroundColor: isDarkMode ? '#1a2f1a' : '#ecfdf5',
                  borderColor: '#10b981',
                }}
              >
                <div className="modal-statistics__summary-icon">✅</div>
                <div className="modal-statistics__summary-data">
                  <p className="modal-statistics__summary-label">Aprobados</p>
                  <p className="modal-statistics__summary-value">{totals.passed}</p>
                </div>
              </div>

              <div
                className="modal-statistics__summary-card modal-statistics__summary-card--failed"
                style={{
                  backgroundColor: isDarkMode ? '#2f1a1a' : '#fef2f2',
                  borderColor: '#ef4444',
                }}
              >
                <div className="modal-statistics__summary-icon">❌</div>
                <div className="modal-statistics__summary-data">
                  <p className="modal-statistics__summary-label">Reprobados</p>
                  <p className="modal-statistics__summary-value">{totals.failed}</p>
                </div>
              </div>

              <div
                className="modal-statistics__summary-card modal-statistics__summary-card--pending"
                style={{
                  backgroundColor: isDarkMode ? '#2f2a1a' : '#fffbeb',
                  borderColor: '#f59e0b',
                }}
              >
                <div className="modal-statistics__summary-icon">⏳</div>
                <div className="modal-statistics__summary-data">
                  <p className="modal-statistics__summary-label">Pendientes</p>
                  <p className="modal-statistics__summary-value">{totals.pending}</p>
                </div>
              </div>

              <div
                className="modal-statistics__summary-card modal-statistics__summary-card--cancelled"
                style={{
                  backgroundColor: isDarkMode ? '#2f2f2f' : '#f3f4f6',
                  borderColor: '#6b7280',
                }}
              >
                <div className="modal-statistics__summary-icon">🚫</div>
                <div className="modal-statistics__summary-data">
                  <p className="modal-statistics__summary-label">Cancelados</p>
                  <p className="modal-statistics__summary-value">{totals.cancelled}</p>
                </div>
              </div>

              <div
                className="modal-statistics__summary-card modal-statistics__summary-card--percentage"
                style={{
                  backgroundColor: isDarkMode ? '#1a232f' : '#f0f9ff',
                  borderColor: '#0ea5e9',
                }}
              >
                <div className="modal-statistics__summary-icon">📈</div>
                <div className="modal-statistics__summary-data">
                  <p className="modal-statistics__summary-label">Tasa de Aprobación</p>
                  <p className="modal-statistics__summary-value">{totals.passPercentage}%</p>
                </div>
              </div>
            </div>
          </div>

          {/* ========== TABLA POR NIVEL ==========*/}
          <div className="modal-statistics__table-section">
            <h3 className="modal-statistics__section-title">Desglose por Nivel</h3>
            <div className="modal-statistics__table-wrapper" style={{ borderColor: theme.border }}>
              <table className="modal-statistics__table">
                <thead>
                  <tr style={{ backgroundColor: theme.bgDark, borderColor: theme.border }}>
                    <th style={{ color: theme.text }}>Nivel</th>
                    <th style={{ color: theme.text }}>Total</th>
                    <th style={{ color: '#10b981' }}>✅ Aprobados</th>
                    <th style={{ color: '#ef4444' }}>❌ Reprobados</th>
                    <th style={{ color: '#f59e0b' }}>⏳ Pendientes</th>
                    <th style={{ color: '#6b7280' }}>🚫 Cancelados</th>
                    <th style={{ color: theme.accent }}>% Aprobación</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(statistics).map(([key, stat]) => (
                    stat.total > 0 && (
                      <tr key={key} style={{ borderColor: theme.border }}>
                        <td style={{ fontWeight: 600, color: theme.text }}>{stat.label}</td>
                        <td style={{ color: theme.text }}>{stat.total}</td>
                        <td style={{ color: '#10b981', fontWeight: 600 }}>{stat.passed}</td>
                        <td style={{ color: '#ef4444', fontWeight: 600 }}>{stat.failed}</td>
                        <td style={{ color: '#f59e0b', fontWeight: 600 }}>{stat.pending}</td>
                        <td style={{ color: '#6b7280', fontWeight: 600 }}>{stat.cancelled}</td>
                        <td style={{ color: theme.accent, fontWeight: 600 }}>{stat.passPercentage}%</td>
                      </tr>
                    )
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ========== FOOTER / ACTIONS ==========*/}
        <div className="modal-statistics__footer" style={{ borderColor: theme.border }}>
          <button
            className="modal-statistics__btn modal-statistics__btn--secondary"
            onClick={onClose}
          >
            Cerrar
          </button>
          <button
            className="modal-statistics__btn modal-statistics__btn--primary"
            onClick={handleExportPDF}
          >
            📄 Descargar PDF
          </button>
        </div>
      </div>

      <style>{`
        .modal-statistics-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          animation: fadeIn 0.3s ease;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        .modal-statistics {
          background: white;
          border-radius: 12px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          max-width: 900px;
          width: 90%;
          max-height: 85vh;
          overflow-y: auto;
          animation: slideUp 0.3s ease;
        }

        @keyframes slideUp {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        .modal-statistics__header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 24px;
          border-bottom: 1px solid #e5e7eb;
          gap: 16px;
        }

        .modal-statistics__title-wrapper {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .modal-statistics__title {
          font-size: 24px;
          font-weight: 700;
          margin: 0;
        }

        .modal-statistics__filter-badge {
          display: inline-block;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
        }

        .modal-statistics__close {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          padding: 0;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
          transition: background-color 0.2s ease;
        }

        .modal-statistics__close:hover {
          background-color: #f3f4f6;
        }

        .modal-statistics__filter-info {
          margin: 16px 24px;
          padding: 16px;
          border-radius: 8px;
          background-color: #f0f4ff;
          border: 2px solid #667eea;
        }

        .modal-statistics__filters-list {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 8px;
        }

        .modal-statistics__filter-tag {
          display: inline-block;
          background: white;
          padding: 6px 10px;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 500;
        }

        .modal-statistics__filter-message {
          margin: 12px 0 0 0;
          font-size: 13px;
          opacity: 0.8;
        }

        .modal-statistics__content {
          padding: 24px;
        }

        .modal-statistics__section-title {
          font-size: 18px;
          font-weight: 700;
          margin: 0 0 16px 0;
          padding-bottom: 12px;
          border-bottom: 2px solid #667eea;
        }

        .modal-statistics__summary-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
          margin-bottom: 32px;
        }

        .modal-statistics__summary-card {
          display: flex;
          gap: 16px;
          padding: 16px;
          border-radius: 8px;
          border: 2px solid;
          align-items: center;
        }

        .modal-statistics__summary-icon {
          font-size: 32px;
          min-width: 40px;
          text-align: center;
        }

        .modal-statistics__summary-data {
          flex: 1;
        }

        .modal-statistics__summary-label {
          font-size: 12px;
          font-weight: 600;
          margin: 0;
          opacity: 0.7;
        }

        .modal-statistics__summary-value {
          font-size: 28px;
          font-weight: 700;
          margin: 4px 0 0 0;
        }

        .modal-statistics__table-section {
          margin-top: 24px;
        }

        .modal-statistics__table-wrapper {
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          overflow: hidden;
        }

        .modal-statistics__table {
          width: 100%;
          border-collapse: collapse;
          font-size: 14px;
        }

        .modal-statistics__table thead tr {
          background-color: #f9fafb;
        }

        .modal-statistics__table th {
          padding: 12px 16px;
          text-align: left;
          font-weight: 600;
          border-bottom: 1px solid #e5e7eb;
        }

        .modal-statistics__table td {
          padding: 12px 16px;
          border-bottom: 1px solid #e5e7eb;
        }

        .modal-statistics__table tbody tr:hover {
          background-color: #f9fafb;
        }

        .modal-statistics__footer {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          padding: 16px 24px;
          border-top: 1px solid #e5e7eb;
        }

        .modal-statistics__btn {
          padding: 10px 20px;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
          border: none;
          transition: all 0.3s ease;
          font-size: 14px;
        }

        .modal-statistics__btn--primary {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }

        .modal-statistics__btn--primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(102, 126, 234, 0.3);
        }

        .modal-statistics__btn--secondary {
          background: #f3f4f6;
          color: #1f2937;
        }

        .modal-statistics__btn--secondary:hover {
          background: #e5e7eb;
        }

        @media (max-width: 768px) {
          .modal-statistics {
            width: 95%;
            max-height: 90vh;
          }

          .modal-statistics__summary-grid {
            grid-template-columns: 1fr;
          }

          .modal-statistics__table {
            font-size: 12px;
          }

          .modal-statistics__table th,
          .modal-statistics__table td {
            padding: 8px 12px;
          }
        }
      `}</style>
    </div>
  );
};

export default ModalStatistics;