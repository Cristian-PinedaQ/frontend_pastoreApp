// 📊 ModalStatistics.jsx - v4 OPTIMIZADO PARA MÓVIL
// ✅ Separa Pendiente de Reprobado (3 categorías)
// ✅ Legible en modo oscuro automático
// ✅ SCROLL COMPLETO en todo el contenido
// ✅ MOBILE FIRST - Perfecto en teléfonos

import React, { useState, useMemo, useEffect } from 'react';
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const ModalStatistics = ({ isOpen, onClose, data, onExportPDF }) => {
  const [viewType, setViewType] = useState('bar');
  const [selectedLevel, setSelectedLevel] = useState('ALL');
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Detectar modo oscuro
  useEffect(() => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const savedMode = localStorage.getItem('darkMode');
    const htmlHasDarkClass = document.documentElement.classList.contains('dark-mode');

    setIsDarkMode(
      savedMode === 'true' || htmlHasDarkClass || prefersDark
    );

    // Escuchar cambios
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

  // Colores adaptativos
  const COLORS = {
    passed: '#11cece',
    failed: '#d681e5',
    pending: '#fbbf24',
    neutral: isDarkMode ? '#94a3b8' : '#6b7280',
  };

  // Colores del tema
  const themeColors = {
    bg: isDarkMode ? '#0f172a' : '#ffffff',
    bgSecondary: isDarkMode ? '#1e293b' : '#f9fafb',
    bgLight: isDarkMode ? '#1a2332' : '#fafafa',
    text: isDarkMode ? '#f1f5f9' : '#111827',
    textSecondary: isDarkMode ? '#cbd5e1' : '#666666',
    border: isDarkMode ? '#334155' : '#e0e0e0',
    borderLight: isDarkMode ? '#475569' : '#f0f0f0',
    header: isDarkMode 
      ? 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)' 
      : 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    card: isDarkMode ? '#1e293b' : '#ffffff',
    hover: isDarkMode ? '#334155' : '#f9fafb',
    chartBg: isDarkMode ? '#0f172a' : '#ffffff',
    gridColor: isDarkMode ? '#334155' : '#e0e0e0',
  };

  // ========== PREPARAR DATOS PARA GRÁFICOS ==========

  const levelStats = useMemo(() => {
    if (!data) return [];

    return Object.entries(data)
      .map(([key, value]) => ({
        name: value.label,
        total: value.total,
        passed: value.passed,
        failed: value.failed,
        pending: value.pending || 0,
        passPercentage: parseFloat(value.passPercentage),
      }))
      .filter(item => item.total > 0);
  }, [data]);

  const pieData = useMemo(() => {
    if (!data || levelStats.length === 0) return [];

    if (selectedLevel === 'ALL') {
      const totals = levelStats.reduce(
        (acc, item) => ({
          passed: acc.passed + item.passed,
          failed: acc.failed + item.failed,
          pending: acc.pending + item.pending,
        }),
        { passed: 0, failed: 0, pending: 0 }
      );
      return [
        { name: '✅ Aprobados', value: totals.passed, fill: COLORS.passed },
        { name: '❌ Reprobados', value: totals.failed, fill: COLORS.failed },
        { name: '⏳ Pendientes', value: totals.pending, fill: COLORS.pending },
      ];
    }

    const selected = levelStats.find(item => item.name === selectedLevel);
    if (!selected) return [];

    return [
      { name: '✅ Aprobados', value: selected.passed, fill: COLORS.passed },
      { name: '❌ Reprobados', value: selected.failed, fill: COLORS.failed },
      { name: '⏳ Pendientes', value: selected.pending, fill: COLORS.pending },
    ];
  }, [selectedLevel, levelStats, data, COLORS]);

  const totalStudents = useMemo(() => {
    return levelStats.reduce((sum, item) => sum + item.total, 0);
  }, [levelStats]);

  const totalPassed = useMemo(() => {
    return levelStats.reduce((sum, item) => sum + item.passed, 0);
  }, [levelStats]);

  const totalFailed = useMemo(() => {
    return levelStats.reduce((sum, item) => sum + item.failed, 0);
  }, [levelStats]);

  const totalPending = useMemo(() => {
    return levelStats.reduce((sum, item) => sum + item.pending, 0);
  }, [levelStats]);

  const overallPassPercentage = useMemo(() => {
    return totalStudents > 0
      ? ((totalPassed / totalStudents) * 100).toFixed(1)
      : 0;
  }, [totalStudents, totalPassed]);

  const barData = useMemo(() => {
    if (selectedLevel === 'ALL') {
      return levelStats;
    }
    return levelStats.filter(item => item.name === selectedLevel);
  }, [levelStats, selectedLevel]);

  if (!isOpen || !data) return null;

  return (
    <div
      className="modal-overlay"
      style={{
        backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.7)' : 'rgba(0, 0, 0, 0.5)',
      }}
      onClick={onClose}
    >
      <div
        className="modal-container statistics-modal"
        style={{
          backgroundColor: themeColors.bg,
          color: themeColors.text,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER - Sticky */}
        <div
          className="modal-header"
          style={{
            background: themeColors.header,
          }}
        >
          <h2 className="modal-title">📊 Estadísticas de Estudiantes</h2>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        {/* CONTROLS - Sticky */}
        <div
          className="statistics-controls"
          style={{
            backgroundColor: themeColors.bgLight,
            borderBottomColor: themeColors.border,
          }}
        >
          <div className="control-group">
            <label style={{ color: themeColors.textSecondary }}>📈 Tipo de Gráfico</label>
            <select
              value={viewType}
              onChange={(e) => setViewType(e.target.value)}
              className="chart-type-select"
              style={{
                backgroundColor: themeColors.card,
                color: themeColors.text,
                borderColor: themeColors.border,
              }}
            >
              <option value="bar">📊 Barras</option>
              <option value="pie">🥧 Pastel</option>
              <option value="combined">📈 Combinado</option>
            </select>
          </div>

          <div className="control-group">
            <label style={{ color: themeColors.textSecondary }}>📌 Filtrar por Nivel</label>
            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
              className="level-select"
              style={{
                backgroundColor: themeColors.card,
                color: themeColors.text,
                borderColor: themeColors.border,
              }}
            >
              <option value="ALL">Todos los Niveles</option>
              {levelStats.map(item => (
                <option key={item.name} value={item.name}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>

          <button
            className="btn-export"
            onClick={onExportPDF}
          >
            📄 Exportar PDF
          </button>
        </div>

        {/* SCROLLABLE CONTENT */}
        <div
          className="modal-body-wrapper"
        >
          {/* Estadísticas Generales */}
          <div
            className="stats-summary"
            style={{
              backgroundColor: themeColors.bgLight,
            }}
          >
            <div
              className="stat-card"
              style={{
                backgroundColor: themeColors.card,
                borderColor: themeColors.border,
              }}
            >
              <div className="stat-icon">👥</div>
              <div className="stat-content">
                <p className="stat-label" style={{ color: themeColors.textSecondary }}>Total de Estudiantes</p>
                <p className="stat-value" style={{ color: themeColors.text }}>{totalStudents}</p>
              </div>
            </div>

            <div
              className="stat-card"
              style={{
                backgroundColor: themeColors.card,
                borderColor: themeColors.border,
              }}
            >
              <div className="stat-icon">✅</div>
              <div className="stat-content">
                <p className="stat-label" style={{ color: themeColors.textSecondary }}>Aprobados</p>
                <p className="stat-value" style={{ color: COLORS.passed }}>{totalPassed}</p>
              </div>
            </div>

            <div
              className="stat-card"
              style={{
                backgroundColor: themeColors.card,
                borderColor: themeColors.border,
              }}
            >
              <div className="stat-icon">❌</div>
              <div className="stat-content">
                <p className="stat-label" style={{ color: themeColors.textSecondary }}>Reprobados</p>
                <p className="stat-value" style={{ color: COLORS.failed }}>{totalFailed}</p>
              </div>
            </div>

            <div
              className="stat-card"
              style={{
                backgroundColor: themeColors.card,
                borderColor: themeColors.border,
              }}
            >
              <div className="stat-icon">⏳</div>
              <div className="stat-content">
                <p className="stat-label" style={{ color: themeColors.textSecondary }}>Pendientes</p>
                <p className="stat-value" style={{ color: COLORS.pending }}>{totalPending}</p>
              </div>
            </div>

            <div
              className="stat-card"
              style={{
                backgroundColor: themeColors.card,
                borderColor: themeColors.border,
              }}
            >
              <div className="stat-icon">📊</div>
              <div className="stat-content">
                <p className="stat-label" style={{ color: themeColors.textSecondary }}>Tasa de Aprobación</p>
                <p className="stat-value" style={{ color: themeColors.text }}>{overallPassPercentage}%</p>
              </div>
            </div>
          </div>

          <div
            className="modal-body"
            style={{
              color: themeColors.text,
            }}
          >
            {viewType === 'bar' && (
              <div
                className="chart-container"
                style={{
                  backgroundColor: themeColors.card,
                  borderColor: themeColors.border,
                }}
              >
                <h3 className="chart-title" style={{ color: themeColors.text }}>Estudiantes por Nivel</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={barData} margin={{ top: 15, right: 15, left: -30, bottom: 50 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={themeColors.gridColor} />
                    <XAxis
                      dataKey="name"
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      tick={{ fontSize: 10, fill: themeColors.text }}
                    />
                    <YAxis tick={{ fontSize: 10, fill: themeColors.text }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: themeColors.card,
                        border: `1px solid ${themeColors.border}`,
                        borderRadius: '8px',
                        color: themeColors.text,
                        fontSize: '12px',
                      }}
                      formatter={(value) => `${value}`}
                    />
                    <Legend wrapperStyle={{ color: themeColors.text, fontSize: '12px' }} />
                    <Bar dataKey="passed" fill={COLORS.passed} name="✅ Aprobados" />
                    <Bar dataKey="failed" fill={COLORS.failed} name="❌ Reprobados" />
                    <Bar dataKey="pending" fill={COLORS.pending} name="⏳ Pendientes" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {viewType === 'pie' && (
              <div
                className="chart-container"
                style={{
                  backgroundColor: themeColors.card,
                  borderColor: themeColors.border,
                }}
              >
                <h3 className="chart-title" style={{ color: themeColors.text }}>
                  {selectedLevel === 'ALL' ? 'Total General' : selectedLevel}
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                      outerRadius={90}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => `${value} est.`}
                      contentStyle={{
                        backgroundColor: themeColors.card,
                        border: `1px solid ${themeColors.border}`,
                        borderRadius: '8px',
                        color: themeColors.text,
                        fontSize: '12px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            {viewType === 'combined' && (
              <div className="charts-grid">
                <div
                  className="chart-container"
                  style={{
                    backgroundColor: themeColors.card,
                    borderColor: themeColors.border,
                  }}
                >
                  <h3 className="chart-title" style={{ color: themeColors.text }}>Por Nivel</h3>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={barData} margin={{ top: 15, right: 15, left: -30, bottom: 50 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={themeColors.gridColor} />
                      <XAxis
                        dataKey="name"
                        angle={-45}
                        textAnchor="end"
                        height={70}
                        tick={{ fontSize: 9, fill: themeColors.text }}
                      />
                      <YAxis tick={{ fontSize: 9, fill: themeColors.text }} />
                      <Tooltip
                        formatter={(value) => `${value}`}
                        contentStyle={{
                          backgroundColor: themeColors.card,
                          border: `1px solid ${themeColors.border}`,
                          color: themeColors.text,
                          fontSize: '11px',
                        }}
                      />
                      <Bar dataKey="passed" fill={COLORS.passed} />
                      <Bar dataKey="failed" fill={COLORS.failed} />
                      <Bar dataKey="pending" fill={COLORS.pending} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div
                  className="chart-container"
                  style={{
                    backgroundColor: themeColors.card,
                    borderColor: themeColors.border,
                  }}
                >
                  <h3 className="chart-title" style={{ color: themeColors.text }}>Total General</h3>
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) => `${value}`}
                        contentStyle={{
                          backgroundColor: themeColors.card,
                          border: `1px solid ${themeColors.border}`,
                          color: themeColors.text,
                          fontSize: '11px',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Tabla de Detalles */}
            <div className="details-section">
              <h3 className="section-title" style={{ color: themeColors.text }}>📋 Detalle por Nivel</h3>
              <div className="table-container">
                <table
                  className="details-table"
                  style={{
                    backgroundColor: themeColors.card,
                    borderColor: themeColors.border,
                  }}
                >
                  <thead>
                    <tr style={{ backgroundColor: themeColors.bgSecondary }}>
                      <th style={{ color: themeColors.text, borderBottomColor: themeColors.border }}>Nivel</th>
                      <th className="text-center" style={{ color: themeColors.text, borderBottomColor: themeColors.border }}>Total</th>
                      <th className="text-center" style={{ color: themeColors.text, borderBottomColor: themeColors.border }}>✅</th>
                      <th className="text-center" style={{ color: themeColors.text, borderBottomColor: themeColors.border }}>❌</th>
                      <th className="text-center" style={{ color: themeColors.text, borderBottomColor: themeColors.border }}>⏳</th>
                      <th className="text-center" style={{ color: themeColors.text, borderBottomColor: themeColors.border }}>%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {levelStats.map((item, index) => (
                      <tr key={index} style={{ backgroundColor: index % 2 === 0 ? themeColors.card : themeColors.bgSecondary }}>
                        <td className="level-name" style={{ color: themeColors.text, borderBottomColor: themeColors.border }}>{item.name}</td>
                        <td className="text-center" style={{ color: themeColors.text, borderBottomColor: themeColors.border }}>{item.total}</td>
                        <td className="text-center" style={{ color: COLORS.passed, borderBottomColor: themeColors.border }}>
                          {item.passed}
                        </td>
                        <td className="text-center" style={{ color: COLORS.failed, borderBottomColor: themeColors.border }}>
                          {item.failed}
                        </td>
                        <td className="text-center" style={{ color: COLORS.pending, borderBottomColor: themeColors.border }}>
                          {item.pending}
                        </td>
                        <td className="text-center" style={{ color: themeColors.text, borderBottomColor: themeColors.border }}>
                          <strong>{item.passPercentage}%</strong>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="footer-row" style={{ backgroundColor: themeColors.bgSecondary, borderTopColor: themeColors.border }}>
                      <td style={{ color: themeColors.text, borderBottomColor: themeColors.border }}><strong>TOTAL</strong></td>
                      <td className="text-center" style={{ color: themeColors.text, borderBottomColor: themeColors.border }}><strong>{totalStudents}</strong></td>
                      <td className="text-center" style={{ color: COLORS.passed, borderBottomColor: themeColors.border }}>
                        <strong>{totalPassed}</strong>
                      </td>
                      <td className="text-center" style={{ color: COLORS.failed, borderBottomColor: themeColors.border }}>
                        <strong>{totalFailed}</strong>
                      </td>
                      <td className="text-center" style={{ color: COLORS.pending, borderBottomColor: themeColors.border }}>
                        <strong>{totalPending}</strong>
                      </td>
                      <td className="text-center" style={{ color: themeColors.text, borderBottomColor: themeColors.border }}>
                        <strong>{overallPassPercentage}%</strong>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER - Sticky */}
        <div
          className="modal-footer"
          style={{
            backgroundColor: themeColors.bgLight,
            borderTopColor: themeColors.border,
          }}
        >
          <button
            className="btn-secondary"
            onClick={onClose}
            style={{
              backgroundColor: themeColors.bgSecondary,
              color: themeColors.text,
              borderColor: themeColors.border,
            }}
          >
            ✕ Cerrar
          </button>
          <button className="btn-primary" onClick={onExportPDF}>
            📄 Descargar PDF
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
          padding: 10px;
          transition: background-color 300ms ease-in-out;
        }

        .modal-container {
          border-radius: 12px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          width: 100%;
          max-width: 1000px;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          animation: slideInUp 0.3s ease-in-out;
          transition: all 300ms ease-in-out;
          overflow: hidden;
        }

        .modal-header {
          color: white;
          padding: 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-radius: 12px 12px 0 0;
          z-index: 10;
          transition: background 300ms ease-in-out;
          flex-shrink: 0;
        }

        .modal-title {
          margin: 0;
          font-size: 18px;
          font-weight: 700;
        }

        .modal-close-btn {
          background: none;
          border: none;
          color: white;
          font-size: 24px;
          cursor: pointer;
          padding: 0;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
          transition: background-color 0.2s;
          flex-shrink: 0;
        }

        .modal-close-btn:hover {
          background-color: rgba(255, 255, 255, 0.2);
        }

        .statistics-controls {
          padding: 12px 16px;
          border-bottom: 1px solid;
          display: flex;
          gap: 12px;
          align-items: flex-end;
          flex-wrap: wrap;
          transition: all 300ms ease-in-out;
          flex-shrink: 0;
        }

        .control-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .control-group label {
          font-size: 11px;
          font-weight: 600;
        }

        .button-group {
          display: flex;
          gap: 6px;
        }

        .control-btn {
          padding: 6px 12px;
          border: 1px solid;
          border-radius: 6px;
          cursor: pointer;
          font-size: 11px;
          font-weight: 600;
          transition: all 0.2s;
          white-space: nowrap;
        }

        .control-btn:hover {
          transform: translateY(-1px);
        }

        .level-select {
          padding: 6px 10px;
          border: 1px solid;
          border-radius: 6px;
          font-size: 11px;
          cursor: pointer;
          transition: all 0.2s;
          font-family: inherit;
        }

        .level-select:focus {
          outline: none;
          box-shadow: 0 0 0 3px rgba(240, 147, 251, 0.1);
        }

        .chart-type-select {
          padding: 6px 10px;
          border: 1px solid;
          border-radius: 6px;
          font-size: 11px;
          cursor: pointer;
          transition: all 0.2s;
          font-family: inherit;
        }

        .chart-type-select:focus {
          outline: none;
          box-shadow: 0 0 0 3px rgba(240, 147, 251, 0.1);
        }

        .btn-export {
          padding: 6px 12px;
          background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 11px;
          font-weight: 600;
          transition: all 0.2s;
          white-space: nowrap;
        }

        .btn-export:hover {
          box-shadow: 0 4px 12px rgba(79, 172, 254, 0.3);
        }

        /* ✅ NUEVA ESTRUCTURA: Modal Body Wrapper con Scroll */
        .modal-body-wrapper {
          flex: 1;
          overflow-y: auto;
          overflow-x: hidden;
          display: flex;
          flex-direction: column;
        }

        /* Scrollbar personalizado */
        .modal-body-wrapper::-webkit-scrollbar {
          width: 6px;
        }

        .modal-body-wrapper::-webkit-scrollbar-track {
          background: transparent;
        }

        .modal-body-wrapper::-webkit-scrollbar-thumb {
          background: rgba(100, 116, 139, 0.5);
          border-radius: 3px;
        }

        .modal-body-wrapper::-webkit-scrollbar-thumb:hover {
          background: rgba(100, 116, 139, 0.8);
        }

        .stats-summary {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: 10px;
          padding: 12px 16px;
          transition: all 300ms ease-in-out;
          flex-shrink: 0;
        }

        .stat-card {
          padding: 10px;
          border-radius: 8px;
          border: 1px solid;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 300ms ease-in-out;
        }

        .stat-icon {
          font-size: 20px;
          flex-shrink: 0;
        }

        .stat-content {
          flex: 1;
          min-width: 0;
        }

        .stat-label {
          margin: 0;
          font-size: 10px;
          font-weight: 600;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .stat-value {
          margin: 0;
          font-size: 16px;
          font-weight: 700;
        }

        .modal-body {
          padding: 16px;
          transition: color 300ms ease-in-out;
        }

        .chart-container {
          padding: 16px;
          border-radius: 8px;
          border: 1px solid;
          margin-bottom: 16px;
          transition: all 300ms ease-in-out;
        }

        .charts-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 16px;
          margin-bottom: 16px;
        }

        .chart-title {
          margin: 0 0 12px;
          font-size: 13px;
          font-weight: 600;
        }

        .details-section {
          margin-top: 16px;
        }

        .section-title {
          margin: 0 0 10px;
          font-size: 13px;
          font-weight: 600;
        }

        .table-container {
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          border-radius: 8px;
        }

        .details-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 11px;
          border: 1px solid;
          border-radius: 8px;
          overflow: hidden;
          transition: all 300ms ease-in-out;
        }

        .details-table th {
          padding: 8px;
          text-align: left;
          font-weight: 600;
          border-bottom: 2px solid;
          transition: all 300ms ease-in-out;
        }

        .details-table td {
          padding: 8px;
          border-bottom: 1px solid;
          transition: all 300ms ease-in-out;
        }

        .details-table tbody tr:hover {
          opacity: 0.8;
        }

        .level-name {
          font-weight: 500;
          min-width: 60px;
        }

        .text-center {
          text-align: center;
        }

        .footer-row {
          border-top: 2px solid;
        }

        .modal-footer {
          display: flex;
          gap: 8px;
          justify-content: flex-end;
          padding: 12px 16px;
          border-top: 1px solid;
          border-radius: 0 0 12px 12px;
          transition: all 300ms ease-in-out;
          flex-shrink: 0;
        }

        .btn-primary,
        .btn-secondary {
          padding: 8px 16px;
          border: none;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }

        .btn-primary {
          background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
          color: white;
        }

        .btn-primary:hover {
          box-shadow: 0 4px 12px rgba(245, 87, 108, 0.4);
          transform: translateY(-2px);
        }

        .btn-secondary {
          border: 1px solid;
        }

        .btn-secondary:hover {
          opacity: 0.8;
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

        /* ========== TABLET (768px - 1024px) ========== */
        @media (max-width: 1024px) {
          .modal-container {
            max-height: 92vh;
          }

          .charts-grid {
            grid-template-columns: 1fr;
          }

          .statistics-controls {
            flex-direction: column;
            align-items: stretch;
            gap: 10px;
          }

          .control-group {
            width: 100%;
          }

          .button-group {
            width: 100%;
            flex-wrap: wrap;
          }

          .control-btn {
            flex: 1;
            min-width: 70px;
          }

          .level-select {
            width: 100%;
          }

          .stats-summary {
            grid-template-columns: repeat(3, 1fr);
          }

          .details-table {
            font-size: 10px;
          }

          .details-table th,
          .details-table td {
            padding: 6px;
          }
        }

        /* ========== MOBILE (480px - 768px) ========== */
        @media (max-width: 768px) {
          .modal-overlay {
            padding: 8px;
          }

          .modal-container {
            max-height: 94vh;
            border-radius: 8px;
          }

          .modal-header {
            padding: 12px;
          }

          .modal-title {
            font-size: 16px;
          }

          .modal-close-btn {
            width: 28px;
            height: 28px;
            font-size: 20px;
          }

          .statistics-controls {
            padding: 10px 12px;
            gap: 8px;
          }

          .control-group {
            width: 100%;
          }

          .control-group label {
            font-size: 10px;
          }

          .button-group {
            width: 100%;
            flex-direction: column;
            gap: 6px;
          }

          .control-btn {
            width: 100%;
            padding: 8px 10px;
            font-size: 12px;
          }

          .level-select {
            width: 100%;
            padding: 8px 10px;
            font-size: 12px;
          }

          .btn-export {
            width: 100%;
            padding: 8px 10px;
            font-size: 12px;
          }

          .stats-summary {
            grid-template-columns: repeat(2, 1fr);
            gap: 8px;
            padding: 10px 12px;
          }

          .stat-card {
            padding: 8px;
            gap: 6px;
          }

          .stat-icon {
            font-size: 18px;
          }

          .stat-label {
            font-size: 9px;
          }

          .stat-value {
            font-size: 14px;
          }

          .modal-body {
            padding: 12px;
          }

          .chart-container {
            padding: 12px;
            margin-bottom: 12px;
          }

          .chart-title {
            font-size: 12px;
            margin-bottom: 10px;
          }

          .charts-grid {
            grid-template-columns: 1fr;
            gap: 12px;
          }

          .details-section {
            margin-top: 12px;
          }

          .section-title {
            font-size: 12px;
            margin-bottom: 8px;
          }

          .details-table {
            font-size: 9px;
          }

          .details-table th,
          .details-table td {
            padding: 6px 4px;
          }

          .modal-footer {
            padding: 10px 12px;
            gap: 6px;
          }

          .btn-primary,
          .btn-secondary {
            padding: 7px 12px;
            font-size: 11px;
            flex: 1;
          }
        }

        /* ========== SMALL MOBILE (<480px) ========== */
        @media (max-width: 480px) {
          .modal-overlay {
            padding: 6px;
          }

          .modal-container {
            max-height: 95vh;
            border-radius: 6px;
          }

          .modal-header {
            padding: 10px;
            flex-direction: column;
            align-items: flex-start;
            gap: 8px;
          }

          .modal-title {
            font-size: 14px;
            margin: 0;
          }

          .modal-close-btn {
            position: absolute;
            right: 10px;
            top: 10px;
            width: 24px;
            height: 24px;
            font-size: 18px;
          }

          .statistics-controls {
            padding: 8px 10px;
            gap: 6px;
          }

          .control-group {
            width: 100%;
          }

          .control-group label {
            font-size: 9px;
          }

          .button-group {
            width: 100%;
            flex-direction: column;
            gap: 4px;
          }

          .control-btn {
            width: 100%;
            padding: 7px 8px;
            font-size: 11px;
          }

          .level-select {
            width: 100%;
            padding: 7px 8px;
            font-size: 11px;
          }

          .btn-export {
            width: 100%;
            padding: 7px 8px;
            font-size: 11px;
          }

          .stats-summary {
            grid-template-columns: 1fr;
            gap: 6px;
            padding: 8px 10px;
          }

          .stat-card {
            padding: 8px;
            gap: 8px;
          }

          .stat-icon {
            font-size: 16px;
          }

          .stat-label {
            font-size: 8px;
          }

          .stat-value {
            font-size: 12px;
          }

          .modal-body {
            padding: 10px;
          }

          .chart-container {
            padding: 10px;
            margin-bottom: 10px;
          }

          .chart-title {
            font-size: 11px;
            margin-bottom: 8px;
          }

          .charts-grid {
            grid-template-columns: 1fr;
            gap: 10px;
          }

          .details-section {
            margin-top: 10px;
          }

          .section-title {
            font-size: 11px;
            margin-bottom: 6px;
          }

          .details-table {
            font-size: 8px;
          }

          .details-table th,
          .details-table td {
            padding: 4px 2px;
          }

          .modal-footer {
            padding: 8px 10px;
            gap: 4px;
            flex-direction: column;
          }

          .btn-primary,
          .btn-secondary {
            padding: 6px 10px;
            font-size: 10px;
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
};

export default ModalStatistics;