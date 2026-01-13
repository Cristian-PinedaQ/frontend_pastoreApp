// 📊 ModalStatistics.jsx - Modal con gráficos de estadísticas de estudiantes
// Muestra aprobados/reprobados por nivel, año y distrito

import React, { useState, useMemo } from 'react';
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const ModalStatistics = ({ isOpen, onClose, data, onExportPDF }) => {
  const [viewType, setViewType] = useState('bar'); // 'bar', 'pie', 'combined'
  const [selectedLevel, setSelectedLevel] = useState('ALL');

  // Colores
  const COLORS = {
    passed: '#10b981',
    failed: '#ef4444',
    neutral: '#6b7280',
  };

  // ========== PREPARAR DATOS PARA GRÁFICOS - ANTES DE CUALQUIER RETURN ==========
  
  // Preparar datos para gráficos
  const levelStats = useMemo(() => {
    if (!data) return [];
    
    return Object.entries(data)
      .map(([key, value]) => ({
        name: value.label,
        total: value.total,
        passed: value.passed,
        failed: value.failed,
        passPercentage: parseFloat(value.passPercentage),
      }))
      .filter(item => item.total > 0);
  }, [data]);

  // Datos para gráfico de pastel (si se selecciona nivel)
  const pieData = useMemo(() => {
    if (!data || levelStats.length === 0) return [];
    
    if (selectedLevel === 'ALL') {
      const totals = levelStats.reduce(
        (acc, item) => ({
          passed: acc.passed + item.passed,
          failed: acc.failed + item.failed,
        }),
        { passed: 0, failed: 0 }
      );
      return [
        { name: '✅ Aprobados', value: totals.passed, fill: COLORS.passed },
        { name: '❌ Reprobados', value: totals.failed, fill: COLORS.failed },
      ];
    }

    const selected = levelStats.find(item => item.name === selectedLevel);
    if (!selected) return [];

    return [
      { name: '✅ Aprobados', value: selected.passed, fill: COLORS.passed },
      { name: '❌ Reprobados', value: selected.failed, fill: COLORS.failed },
    ];
  }, [selectedLevel, levelStats, data]);

  // Estadísticas generales
  const totalStudents = useMemo(() => {
    return levelStats.reduce((sum, item) => sum + item.total, 0);
  }, [levelStats]);

  const totalPassed = useMemo(() => {
    return levelStats.reduce((sum, item) => sum + item.passed, 0);
  }, [levelStats]);

  const totalFailed = useMemo(() => {
    return levelStats.reduce((sum, item) => sum + item.failed, 0);
  }, [levelStats]);

  const overallPassPercentage = useMemo(() => {
    return totalStudents > 0 
      ? ((totalPassed / totalStudents) * 100).toFixed(1) 
      : 0;
  }, [totalStudents, totalPassed]);

  // Datos para gráfico de barras
  const barData = levelStats;

  // ========== AHORA SÍ PUEDE HABER RETORNO CONDICIONAL ==========
  
  if (!isOpen || !data) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container statistics-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <h2 className="modal-title">📊 Estadísticas de Estudiantes</h2>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        {/* Controles */}
        <div className="statistics-controls">
          <div className="control-group">
            <label>📈 Tipo de Gráfico</label>
            <div className="button-group">
              <button
                className={`control-btn ${viewType === 'bar' ? 'active' : ''}`}
                onClick={() => setViewType('bar')}
              >
                📊 Barras
              </button>
              <button
                className={`control-btn ${viewType === 'pie' ? 'active' : ''}`}
                onClick={() => setViewType('pie')}
              >
                🥧 Pastel
              </button>
              <button
                className={`control-btn ${viewType === 'combined' ? 'active' : ''}`}
                onClick={() => setViewType('combined')}
              >
                📈 Combinado
              </button>
            </div>
          </div>

          {viewType === 'pie' && (
            <div className="control-group">
              <label>📌 Filtrar por Nivel</label>
              <select
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(e.target.value)}
                className="level-select"
              >
                <option value="ALL">Todos los Niveles</option>
                {levelStats.map(item => (
                  <option key={item.name} value={item.name}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button className="btn-export" onClick={onExportPDF}>
            📄 Exportar PDF
          </button>
        </div>

        {/* Estadísticas Generales */}
        <div className="stats-summary">
          <div className="stat-card">
            <div className="stat-icon">👥</div>
            <div className="stat-content">
              <p className="stat-label">Total de Estudiantes</p>
              <p className="stat-value">{totalStudents}</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">✅</div>
            <div className="stat-content">
              <p className="stat-label">Aprobados</p>
              <p className="stat-value" style={{ color: COLORS.passed }}>{totalPassed}</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">❌</div>
            <div className="stat-content">
              <p className="stat-label">Reprobados</p>
              <p className="stat-value" style={{ color: COLORS.failed }}>{totalFailed}</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">📊</div>
            <div className="stat-content">
              <p className="stat-label">Tasa de Aprobación</p>
              <p className="stat-value">{overallPassPercentage}%</p>
            </div>
          </div>
        </div>

        {/* Body - Gráficos */}
        <div className="modal-body">
          {viewType === 'bar' && (
            <div className="chart-container">
              <h3 className="chart-title">Estudiantes por Nivel</h3>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={barData} margin={{ top: 20, right: 30, left: 0, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                  <XAxis 
                    dataKey="name" 
                    angle={-45} 
                    textAnchor="end" 
                    height={100}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e0e0e0',
                      borderRadius: '8px',
                    }}
                    formatter={(value) => `${value} estudiantes`}
                  />
                  <Legend />
                  <Bar dataKey="passed" fill={COLORS.passed} name="✅ Aprobados" />
                  <Bar dataKey="failed" fill={COLORS.failed} name="❌ Reprobados" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {viewType === 'pie' && (
            <div className="chart-container">
              <h3 className="chart-title">
                {selectedLevel === 'ALL' ? 'Total General' : selectedLevel}
              </h3>
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    label={({ name, value, percent }) => `${name} ${value} (${(percent * 100).toFixed(1)}%)`}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value) => `${value} estudiantes`}
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e0e0e0',
                      borderRadius: '8px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {viewType === 'combined' && (
            <div className="charts-grid">
              <div className="chart-container">
                <h3 className="chart-title">Por Nivel</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={barData} margin={{ top: 20, right: 20, left: 0, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                    <XAxis 
                      dataKey="name" 
                      angle={-45} 
                      textAnchor="end" 
                      height={80}
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(value) => `${value}`} />
                    <Bar dataKey="passed" fill={COLORS.passed} />
                    <Bar dataKey="failed" fill={COLORS.failed} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="chart-container">
                <h3 className="chart-title">Total General</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `${value}`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Tabla de Detalles */}
          <div className="details-section">
            <h3 className="section-title">📋 Detalle por Nivel</h3>
            <div className="table-container">
              <table className="details-table">
                <thead>
                  <tr>
                    <th>Nivel</th>
                    <th className="text-center">Total</th>
                    <th className="text-center">✅ Aprobados</th>
                    <th className="text-center">❌ Reprobados</th>
                    <th className="text-center">% Aprobación</th>
                  </tr>
                </thead>
                <tbody>
                  {levelStats.map((item, index) => (
                    <tr key={index}>
                      <td className="level-name">{item.name}</td>
                      <td className="text-center">{item.total}</td>
                      <td className="text-center" style={{ color: COLORS.passed }}>
                        {item.passed}
                      </td>
                      <td className="text-center" style={{ color: COLORS.failed }}>
                        {item.failed}
                      </td>
                      <td className="text-center">
                        <strong>{item.passPercentage}%</strong>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="footer-row">
                    <td><strong>TOTAL</strong></td>
                    <td className="text-center"><strong>{totalStudents}</strong></td>
                    <td className="text-center" style={{ color: COLORS.passed }}>
                      <strong>{totalPassed}</strong>
                    </td>
                    <td className="text-center" style={{ color: COLORS.failed }}>
                      <strong>{totalFailed}</strong>
                    </td>
                    <td className="text-center">
                      <strong>{overallPassPercentage}%</strong>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>
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
          background-color: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          animation: fadeIn 0.3s ease-in-out;
          padding: 20px;
        }

        .modal-container {
          background: white;
          border-radius: 12px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          width: 100%;
          max-width: 1000px;
          max-height: 90vh;
          overflow-y: auto;
          animation: slideInUp 0.3s ease-in-out;
          display: flex;
          flex-direction: column;
        }

        .modal-header {
          background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
          color: white;
          padding: 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-radius: 12px 12px 0 0;
          position: sticky;
          top: 0;
          z-index: 10;
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

        .statistics-controls {
          padding: 16px 24px;
          background: linear-gradient(to bottom, #fafafa, transparent);
          border-bottom: 1px solid #e0e0e0;
          display: flex;
          gap: 20px;
          align-items: flex-end;
          flex-wrap: wrap;
        }

        .control-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .control-group label {
          font-size: 12px;
          font-weight: 600;
          color: #666;
        }

        .button-group {
          display: flex;
          gap: 8px;
        }

        .control-btn {
          padding: 8px 16px;
          border: 1.5px solid #e0e0e0;
          background: white;
          border-radius: 6px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 600;
          color: #666;
          transition: all 0.2s;
        }

        .control-btn:hover {
          border-color: #f093fb;
          color: #f5576c;
        }

        .control-btn.active {
          background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
          color: white;
          border-color: transparent;
        }

        .level-select {
          padding: 8px 12px;
          border: 1.5px solid #e0e0e0;
          border-radius: 6px;
          font-size: 12px;
          background: white;
          cursor: pointer;
          transition: all 0.2s;
        }

        .level-select:focus {
          outline: none;
          border-color: #f093fb;
          box-shadow: 0 0 0 3px rgba(240, 147, 251, 0.1);
        }

        .btn-export {
          padding: 8px 16px;
          background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 600;
          transition: all 0.2s;
        }

        .btn-export:hover {
          box-shadow: 0 4px 12px rgba(79, 172, 254, 0.3);
        }

        .stats-summary {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 12px;
          padding: 16px 24px;
          background: #f9fafb;
        }

        .stat-card {
          background: white;
          padding: 12px;
          border-radius: 8px;
          border: 1px solid #e0e0e0;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .stat-icon {
          font-size: 24px;
        }

        .stat-content {
          flex: 1;
        }

        .stat-label {
          margin: 0;
          font-size: 11px;
          color: #999;
          font-weight: 600;
        }

        .stat-value {
          margin: 0;
          font-size: 18px;
          font-weight: 700;
          color: #333;
        }

        .modal-body {
          flex: 1;
          padding: 24px;
          overflow-y: auto;
        }

        .chart-container {
          background: white;
          padding: 20px;
          border-radius: 8px;
          border: 1px solid #e0e0e0;
          margin-bottom: 20px;
        }

        .charts-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
          gap: 20px;
          margin-bottom: 20px;
        }

        .chart-title {
          margin: 0 0 16px;
          font-size: 14px;
          font-weight: 600;
          color: #333;
        }

        .details-section {
          margin-top: 20px;
        }

        .section-title {
          margin: 0 0 12px;
          font-size: 14px;
          font-weight: 600;
          color: #333;
        }

        .table-container {
          overflow-x: auto;
        }

        .details-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
          background: white;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          overflow: hidden;
        }

        .details-table thead {
          background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
        }

        .details-table th {
          padding: 12px;
          text-align: left;
          font-weight: 600;
          color: #333;
          border-bottom: 2px solid #e0e0e0;
        }

        .details-table td {
          padding: 12px;
          border-bottom: 1px solid #e8e8e8;
        }

        .details-table tbody tr:hover {
          background: #f9fafb;
        }

        .level-name {
          font-weight: 500;
          color: #333;
        }

        .text-center {
          text-align: center;
        }

        .footer-row {
          background: #f9fafb;
          border-top: 2px solid #e0e0e0;
        }

        .modal-footer {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
          padding: 16px 24px;
          border-top: 1px solid #e0e0e0;
          background: #f9fafb;
          border-radius: 0 0 12px 12px;
          position: sticky;
          bottom: 0;
        }

        .btn-primary,
        .btn-secondary {
          padding: 10px 20px;
          border: none;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
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
          background: #e0e0e0;
          color: #333;
        }

        .btn-secondary:hover {
          background: #d0d0d0;
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
          .charts-grid {
            grid-template-columns: 1fr;
          }

          .statistics-controls {
            flex-direction: column;
            align-items: stretch;
          }

          .button-group {
            flex-direction: column;
          }

          .control-btn {
            width: 100%;
          }

          .level-select {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
};

export default ModalStatistics;