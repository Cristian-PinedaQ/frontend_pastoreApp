// 📊 ModalFinanceStatistics.jsx - Modal de estadísticas financieras
// ✅ Gráficos de ingresos por concepto y método
// ✅ Estadísticas de verificación
// ✅ Exportación a PDF

import React, { useState, useMemo } from 'react';
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const ModalFinanceStatistics = ({ isOpen, onClose, data, onExportPDF }) => {
  const [viewType, setViewType] = useState('bar');

  const COLORS = {
    concept: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'],
    method: ['#2563eb', '#0891b2', '#059669', '#d97706', '#7c3aed'],
    verified: '#10b981',
    unverified: '#f59e0b',
  };

  const conceptChartData = useMemo(() => {
    if (!data || !data.byConcept) return [];
    
    const conceptMap = {
      'TITHE': '💵 Diezmo',
      'OFFERING': '🎁 Ofrenda',
      'SEED_OFFERING': '🌱 Ofrenda de Semilla',
      'BUILDING_FUND': '🏗️ Fondo de Construcción',
    };

    return Object.entries(data.byConcept).map(([key, value], index) => ({
      name: conceptMap[key] || key,
      cantidad: value.count,
      monto: parseFloat((value.total / 1000).toFixed(2)),
      fill: COLORS.concept[index % COLORS.concept.length],
    }));
  }, [data]);

  const methodChartData = useMemo(() => {
    if (!data || !data.byMethod) return [];
    
    const methodMap = {
      'CASH': '💵 Efectivo',
      'BANK_TRANSFER': '🏦 Transferencia Bancaria',
    };

    return Object.entries(data.byMethod).map(([key, value], index) => ({
      name: methodMap[key] || key,
      cantidad: value.count,
      monto: parseFloat((value.total / 1000).toFixed(2)),
      fill: COLORS.method[index % COLORS.method.length],
    }));
  }, [data]);

  const verificationData = useMemo(() => {
    if (!data) return [];
    
    return [
      {
        name: '✅ Verificados',
        value: data.verifiedCount,
        monto: data.verifiedAmount,
        fill: COLORS.verified,
      },
      {
        name: '⏳ Pendientes',
        value: data.unverifiedCount,
        monto: data.unverifiedAmount,
        fill: COLORS.unverified,
      },
    ];
  }, [data]);

  if (!isOpen || !data) return null;

  return (
    <div className="modal-overlay-statistics" onClick={onClose}>
      <div className="modal-container-statistics" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header-statistics">
          <h2 className="modal-title-statistics">📊 Estadísticas Financieras</h2>
          <button className="modal-close-btn-statistics" onClick={onClose}>✕</button>
        </div>

        <div className="statistics-controls-finance">
          <div className="control-group-finance">
            <label>📈 Tipo de Visualización</label>
            <div className="button-group-finance">
              <button
                className={`control-btn-finance ${viewType === 'bar' ? 'active' : ''}`}
                onClick={() => setViewType('bar')}
              >
                📊 Barras
              </button>
              <button
                className={`control-btn-finance ${viewType === 'pie' ? 'active' : ''}`}
                onClick={() => setViewType('pie')}
              >
                🥧 Pastel
              </button>
              <button
                className={`control-btn-finance ${viewType === 'combined' ? 'active' : ''}`}
                onClick={() => setViewType('combined')}
              >
                📈 Combinado
              </button>
            </div>
          </div>

          <button className="btn-export-finance" onClick={onExportPDF}>
            📄 Exportar PDF
          </button>
        </div>

        {/* Tarjetas de Resumen */}
        <div className="stats-summary-finance">
          <div className="stat-card-finance">
            <div className="stat-icon-finance">💰</div>
            <div className="stat-content-finance">
              <p className="stat-label-finance">Total de Registros</p>
              <p className="stat-value-finance">{data.totalRecords}</p>
            </div>
          </div>

          <div className="stat-card-finance">
            <div className="stat-icon-finance">💵</div>
            <div className="stat-content-finance">
              <p className="stat-label-finance">Monto Total</p>
              <p className="stat-value-finance">
                $ {(data.totalAmount || 0).toLocaleString('es-CO', { maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          <div className="stat-card-finance">
            <div className="stat-icon-finance">✅</div>
            <div className="stat-content-finance">
              <p className="stat-label-finance">Verificados</p>
              <p className="stat-value-finance" style={{ color: COLORS.verified }}>
                {data.verifiedCount} - $ {(data.verifiedAmount || 0).toLocaleString('es-CO', { maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          <div className="stat-card-finance">
            <div className="stat-icon-finance">⏳</div>
            <div className="stat-content-finance">
              <p className="stat-label-finance">Pendientes de Verificar</p>
              <p className="stat-value-finance" style={{ color: COLORS.unverified }}>
                {data.unverifiedCount} - $ {(data.unverifiedAmount || 0).toLocaleString('es-CO', { maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>

        <div className="modal-body-statistics">
          {viewType === 'bar' && (
            <div className="chart-container-finance">
              <h3 className="chart-title-finance">Ingresos por Concepto</h3>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={conceptChartData} margin={{ top: 20, right: 30, left: 0, bottom: 60 }}>
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
                    formatter={(value) => `$ ${value.toLocaleString()}`}
                  />
                  <Legend />
                  <Bar dataKey="monto" fill="#3b82f6" name="Monto (Miles)" />
                </BarChart>
              </ResponsiveContainer>

              <h3 className="chart-title-finance">Ingresos por Método de Pago</h3>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={methodChartData} margin={{ top: 20, right: 30, left: 0, bottom: 60 }}>
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
                    formatter={(value) => `$ ${value.toLocaleString()}`}
                  />
                  <Legend />
                  <Bar dataKey="monto" fill="#0891b2" name="Monto (Miles)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {viewType === 'pie' && (
            <div className="charts-grid-finance">
              <div className="chart-container-finance">
                <h3 className="chart-title-finance">Distribución por Concepto</h3>
                <ResponsiveContainer width="100%" height={350}>
                  <PieChart>
                    <Pie
                      data={conceptChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      label={({ name, value }) => `${name} (${value})`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="cantidad"
                    >
                      {conceptChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `${value} registros`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="chart-container-finance">
                <h3 className="chart-title-finance">Estado de Verificación</h3>
                <ResponsiveContainer width="100%" height={350}>
                  <PieChart>
                    <Pie
                      data={verificationData}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      label={({ name, value }) => `${name} (${value})`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {verificationData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `${value} registros`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {viewType === 'combined' && (
            <div className="charts-grid-finance">
              <div className="chart-container-finance">
                <h3 className="chart-title-finance">Ingresos por Concepto</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={conceptChartData} margin={{ top: 20, right: 20, left: 0, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                    <XAxis
                      dataKey="name"
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(value) => `$ ${value.toLocaleString()}`} />
                    <Bar dataKey="monto" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="chart-container-finance">
                <h3 className="chart-title-finance">Verificación</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={verificationData}
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                    >
                      {verificationData.map((entry, index) => (
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
          <div className="details-section-finance">
            <h3 className="section-title-finance">📋 Detalle por Concepto</h3>
            <div className="table-container-finance">
              <table className="details-table-finance">
                <thead>
                  <tr>
                    <th>Concepto</th>
                    <th className="text-center">Registros</th>
                    <th className="text-center">Monto Total</th>
                    <th className="text-center">Promedio</th>
                  </tr>
                </thead>
                <tbody>
                  {conceptChartData.map((item, index) => (
                    <tr key={index}>
                      <td className="concept-name">{item.name}</td>
                      <td className="text-center">{item.cantidad}</td>
                      <td className="text-center">
                        $ {(item.monto * 1000).toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                      </td>
                      <td className="text-center">
                        $ {((item.monto * 1000) / item.cantidad).toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h3 className="section-title-finance">📋 Detalle por Método de Pago</h3>
            <div className="table-container-finance">
              <table className="details-table-finance">
                <thead>
                  <tr>
                    <th>Método</th>
                    <th className="text-center">Registros</th>
                    <th className="text-center">Monto Total</th>
                    <th className="text-center">Promedio</th>
                  </tr>
                </thead>
                <tbody>
                  {methodChartData.map((item, index) => (
                    <tr key={index}>
                      <td className="method-name">{item.name}</td>
                      <td className="text-center">{item.cantidad}</td>
                      <td className="text-center">
                        $ {(item.monto * 1000).toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                      </td>
                      <td className="text-center">
                        $ {((item.monto * 1000) / item.cantidad).toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="modal-footer-statistics">
          <button className="btn-secondary-statistics" onClick={onClose}>
            ✕ Cerrar
          </button>
          <button className="btn-primary-statistics" onClick={onExportPDF}>
            📄 Descargar PDF
          </button>
        </div>
      </div>

      <style jsx>{`
        .modal-overlay-statistics {
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
          padding: 20px;
          animation: fadeIn 0.3s ease-in-out;
        }

        .modal-container-statistics {
          background: white;
          border-radius: 12px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          width: 100%;
          max-width: 1100px;
          max-height: 90vh;
          overflow-y: auto;
          animation: slideInUp 0.3s ease-in-out;
          display: flex;
          flex-direction: column;
        }

        .modal-header-statistics {
          background: linear-gradient(135deg, #2563eb 0%, #0891b2 100%);
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

        .modal-title-statistics {
          margin: 0;
          font-size: 20px;
          font-weight: 700;
        }

        .modal-close-btn-statistics {
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

        .modal-close-btn-statistics:hover {
          background-color: rgba(255, 255, 255, 0.2);
        }

        .statistics-controls-finance {
          padding: 16px 24px;
          background: linear-gradient(to bottom, #fafafa, transparent);
          border-bottom: 1px solid #e0e0e0;
          display: flex;
          gap: 20px;
          align-items: flex-end;
          flex-wrap: wrap;
        }

        .control-group-finance {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .control-group-finance label {
          font-size: 12px;
          font-weight: 600;
          color: #666;
        }

        .button-group-finance {
          display: flex;
          gap: 8px;
        }

        .control-btn-finance {
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

        .control-btn-finance:hover {
          border-color: #2563eb;
          color: #2563eb;
        }

        .control-btn-finance.active {
          background: linear-gradient(135deg, #2563eb 0%, #0891b2 100%);
          color: white;
          border-color: transparent;
        }

        .btn-export-finance {
          padding: 8px 16px;
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 600;
          transition: all 0.2s;
        }

        .btn-export-finance:hover {
          box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
        }

        .stats-summary-finance {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 12px;
          padding: 16px 24px;
          background: #f9fafb;
        }

        .stat-card-finance {
          background: white;
          padding: 12px;
          border-radius: 8px;
          border: 1px solid #e0e0e0;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .stat-icon-finance {
          font-size: 24px;
        }

        .stat-content-finance {
          flex: 1;
        }

        .stat-label-finance {
          margin: 0;
          font-size: 11px;
          color: #999;
          font-weight: 600;
        }

        .stat-value-finance {
          margin: 0;
          font-size: 14px;
          font-weight: 700;
          color: #333;
        }

        .modal-body-statistics {
          flex: 1;
          padding: 24px;
          overflow-y: auto;
        }

        .chart-container-finance {
          background: white;
          padding: 20px;
          border-radius: 8px;
          border: 1px solid #e0e0e0;
          margin-bottom: 20px;
        }

        .charts-grid-finance {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(450px, 1fr));
          gap: 20px;
          margin-bottom: 20px;
        }

        .chart-title-finance {
          margin: 0 0 16px;
          font-size: 14px;
          font-weight: 600;
          color: #333;
        }

        .details-section-finance {
          margin-top: 20px;
        }

        .section-title-finance {
          margin: 0 0 12px;
          font-size: 14px;
          font-weight: 600;
          color: #333;
        }

        .table-container-finance {
          overflow-x: auto;
          margin-bottom: 30px;
        }

        .details-table-finance {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
          background: white;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          overflow: hidden;
        }

        .details-table-finance thead {
          background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
        }

        .details-table-finance th {
          padding: 12px;
          text-align: left;
          font-weight: 600;
          color: #333;
          border-bottom: 2px solid #e0e0e0;
        }

        .details-table-finance td {
          padding: 12px;
          border-bottom: 1px solid #e8e8e8;
        }

        .details-table-finance tbody tr:hover {
          background: #f9fafb;
        }

        .concept-name,
        .method-name {
          font-weight: 500;
          color: #333;
        }

        .text-center {
          text-align: center;
        }

        .modal-footer-statistics {
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

        .btn-primary-statistics,
        .btn-secondary-statistics {
          padding: 10px 20px;
          border: none;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-primary-statistics {
          background: linear-gradient(135deg, #2563eb 0%, #0891b2 100%);
          color: white;
        }

        .btn-primary-statistics:hover {
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.4);
          transform: translateY(-2px);
        }

        .btn-secondary-statistics {
          background: #e0e0e0;
          color: #333;
        }

        .btn-secondary-statistics:hover {
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

        @media (max-width: 1024px) {
          .charts-grid-finance {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 768px) {
          .modal-container-statistics {
            max-width: 95%;
          }

          .statistics-controls-finance {
            flex-direction: column;
            align-items: stretch;
          }

          .button-group-finance {
            flex-direction: column;
          }

          .control-btn-finance {
            width: 100%;
          }

          .stats-summary-finance {
            grid-template-columns: repeat(2, 1fr);
          }

          .modal-body-statistics {
            padding: 16px;
          }

          .modal-footer-statistics {
            flex-direction: column;
          }

          .btn-primary-statistics,
          .btn-secondary-statistics {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
};

export default ModalFinanceStatistics;