// 📊 ModalFinanceStatistics.jsx - Estadísticas financieras CON DARK MODE
// ✅ Gráficos de ingresos por concepto y método
// ✅ Estadísticas de verificación
// ✅ Totalmente legible en modo oscuro

import React, { useState, useMemo, useEffect } from 'react';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const ModalFinanceStatistics = ({ isOpen, onClose, data, onExportPDF }) => {
  const [viewType, setViewType] = useState('bar');
  const [isDarkMode, setIsDarkMode] = useState(false);

  // ========== DARK MODE ==========
  useEffect(() => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const savedMode = localStorage.getItem('darkMode');
    const htmlHasDarkClass = document.documentElement.classList.contains('dark-mode');

    setIsDarkMode(
      savedMode === 'true' || htmlHasDarkClass || prefersDark
    );

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

  // Tema
  const theme = {
    bg: isDarkMode ? '#0f172a' : '#ffffff',
    bgSecondary: isDarkMode ? '#1e293b' : '#f9fafb',
    bgLight: isDarkMode ? '#1a2332' : '#fafafa',
    text: isDarkMode ? '#f1f5f9' : '#111827',
    textSecondary: isDarkMode ? '#cbd5e1' : '#666666',
    textTertiary: isDarkMode ? '#94a3b8' : '#999999',
    border: isDarkMode ? '#334155' : '#e0e0e0',
    header: isDarkMode
      ? 'linear-gradient(135deg, #1e40af 0%, #0891b2 100%)'
      : 'linear-gradient(135deg, #2563eb 0%, #0891b2 100%)',
    card: isDarkMode ? '#1e293b' : '#ffffff',
    gridColor: isDarkMode ? '#334155' : '#e0e0e0',
  };

  // Colores de gráficos
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
      'CELL_GROUP_OFFERING': '🏘️ Ofrenda grupo celular',
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
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.7)' : 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px',
        animation: 'fadeIn 0.3s ease-in-out',
        transition: 'background-color 300ms ease-in-out',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: theme.bg,
          color: theme.text,
          borderRadius: '12px',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
          width: '100%',
          maxWidth: '1100px',
          maxHeight: '90vh',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          animation: 'slideInUp 0.3s ease-in-out',
          transition: 'all 300ms ease-in-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            background: theme.header,
            color: 'white',
            padding: '24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderRadius: '12px 12px 0 0',
            position: 'sticky',
            top: 0,
            zIndex: 10,
          }}
        >
          <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>
            📊 Estadísticas Financieras
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'white',
              fontSize: '24px',
              cursor: 'pointer',
              padding: 0,
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '6px',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'}
            onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
          >
            ✕
          </button>
        </div>

        {/* Controls */}
        <div
          style={{
            padding: '16px 24px',
            backgroundColor: theme.bgLight,
            borderBottom: `1px solid ${theme.border}`,
            display: 'flex',
            gap: '20px',
            alignItems: 'flex-end',
            flexWrap: 'wrap',
            transition: 'all 300ms ease-in-out',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{
              fontSize: '12px',
              fontWeight: 600,
              color: theme.textSecondary,
            }}>
              📈 Tipo de Visualización
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {['bar', 'pie', 'combined'].map(type => (
                <button
                  key={type}
                  onClick={() => setViewType(type)}
                  style={{
                    padding: '8px 16px',
                    border: `1.5px solid ${viewType === type ? 'transparent' : theme.border}`,
                    backgroundColor: viewType === type ? '#2563eb' : theme.card,
                    color: viewType === type ? 'white' : theme.text,
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: 600,
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    if (viewType !== type) {
                      e.target.style.backgroundColor = theme.bgSecondary;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (viewType !== type) {
                      e.target.style.backgroundColor = theme.card;
                    }
                  }}
                >
                  {type === 'bar' && '📊 Barras'}
                  {type === 'pie' && '🥧 Pastel'}
                  {type === 'combined' && '📈 Combinado'}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={onExportPDF}
            style={{
              padding: '8px 16px',
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 600,
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => e.target.style.boxShadow = '0 4px 12px rgba(245, 158, 11, 0.3)'}
            onMouseLeave={(e) => e.target.style.boxShadow = 'none'}
          >
            📄 Exportar PDF
          </button>
        </div>

        {/* Stats Summary */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '12px',
            padding: '16px 24px',
            backgroundColor: theme.bgLight,
            transition: 'all 300ms ease-in-out',
          }}
        >
          {[
            { icon: '💰', label: 'Total de Registros', value: data.totalRecords, color: theme.text },
            {
              icon: '💵',
              label: 'Monto Total',
              value: `$ ${(data.totalAmount || 0).toLocaleString('es-CO', { maximumFractionDigits: 2 })}`,
              color: theme.text,
            },
            {
              icon: '✅',
              label: 'Verificados',
              value: `${data.verifiedCount} - $ ${(data.verifiedAmount || 0).toLocaleString('es-CO', { maximumFractionDigits: 2 })}`,
              color: COLORS.verified,
            },
            {
              icon: '⏳',
              label: 'Pendientes de Verificar',
              value: `${data.unverifiedCount} - $ ${(data.unverifiedAmount || 0).toLocaleString('es-CO', { maximumFractionDigits: 2 })}`,
              color: COLORS.unverified,
            },
          ].map((stat, idx) => (
            <div
              key={idx}
              style={{
                backgroundColor: theme.card,
                padding: '12px',
                borderRadius: '8px',
                border: `1px solid ${theme.border}`,
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                transition: 'all 300ms ease-in-out',
              }}
            >
              <div style={{ fontSize: '24px' }}>{stat.icon}</div>
              <div>
                <p style={{
                  margin: 0,
                  fontSize: '11px',
                  fontWeight: 600,
                  color: theme.textSecondary,
                }}>
                  {stat.label}
                </p>
                <p style={{
                  margin: '2px 0 0 0',
                  fontSize: '14px',
                  fontWeight: 700,
                  color: stat.color,
                }}>
                  {stat.value}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Body - Gráficos */}
        <div
          style={{
            flex: 1,
            padding: '24px',
            overflowY: 'auto',
          }}
        >
          {viewType === 'bar' && (
            <div>
              <div
                style={{
                  backgroundColor: theme.card,
                  padding: '20px',
                  borderRadius: '8px',
                  border: `1px solid ${theme.border}`,
                  marginBottom: '20px',
                }}
              >
                <h3 style={{
                  margin: '0 0 16px',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: theme.text,
                }}>
                  Ingresos por Concepto
                </h3>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={conceptChartData} margin={{ top: 20, right: 30, left: 0, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme.gridColor} />
                    <XAxis
                      dataKey="name"
                      angle={-45}
                      textAnchor="end"
                      height={100}
                      tick={{ fontSize: 12, fill: theme.text }}
                    />
                    <YAxis tick={{ fontSize: 12, fill: theme.text }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: theme.card,
                        border: `1px solid ${theme.border}`,
                        borderRadius: '8px',
                        color: theme.text,
                      }}
                      formatter={(value) => `$ ${value.toLocaleString()}`}
                    />
                    <Legend wrapperStyle={{ color: theme.text }} />
                    <Bar dataKey="monto" fill="#3b82f6" name="Monto (Miles)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div
                style={{
                  backgroundColor: theme.card,
                  padding: '20px',
                  borderRadius: '8px',
                  border: `1px solid ${theme.border}`,
                }}
              >
                <h3 style={{
                  margin: '0 0 16px',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: theme.text,
                }}>
                  Ingresos por Método de Pago
                </h3>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={methodChartData} margin={{ top: 20, right: 30, left: 0, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme.gridColor} />
                    <XAxis
                      dataKey="name"
                      angle={-45}
                      textAnchor="end"
                      height={100}
                      tick={{ fontSize: 12, fill: theme.text }}
                    />
                    <YAxis tick={{ fontSize: 12, fill: theme.text }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: theme.card,
                        border: `1px solid ${theme.border}`,
                        borderRadius: '8px',
                        color: theme.text,
                      }}
                      formatter={(value) => `$ ${value.toLocaleString()}`}
                    />
                    <Legend wrapperStyle={{ color: theme.text }} />
                    <Bar dataKey="monto" fill="#0891b2" name="Monto (Miles)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {viewType === 'pie' && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))',
                gap: '20px',
              }}
            >
              <div
                style={{
                  backgroundColor: theme.card,
                  padding: '20px',
                  borderRadius: '8px',
                  border: `1px solid ${theme.border}`,
                }}
              >
                <h3 style={{
                  margin: '0 0 16px',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: theme.text,
                }}>
                  Distribución por Concepto
                </h3>
                <ResponsiveContainer width="100%" height={350}>
                  <PieChart>
                    <Pie
                      data={conceptChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      label={({ name, value }) => `${name} (${value})`}
                      outerRadius={100}
                      dataKey="cantidad"
                    >
                      {conceptChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => `${value} registros`}
                      contentStyle={{
                        backgroundColor: theme.card,
                        border: `1px solid ${theme.border}`,
                        color: theme.text,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div
                style={{
                  backgroundColor: theme.card,
                  padding: '20px',
                  borderRadius: '8px',
                  border: `1px solid ${theme.border}`,
                }}
              >
                <h3 style={{
                  margin: '0 0 16px',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: theme.text,
                }}>
                  Estado de Verificación
                </h3>
                <ResponsiveContainer width="100%" height={350}>
                  <PieChart>
                    <Pie
                      data={verificationData}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      label={({ name, value }) => `${name} (${value})`}
                      outerRadius={100}
                      dataKey="value"
                    >
                      {verificationData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => `${value} registros`}
                      contentStyle={{
                        backgroundColor: theme.card,
                        border: `1px solid ${theme.border}`,
                        color: theme.text,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {viewType === 'combined' && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))',
                gap: '20px',
                marginBottom: '20px',
              }}
            >
              <div
                style={{
                  backgroundColor: theme.card,
                  padding: '20px',
                  borderRadius: '8px',
                  border: `1px solid ${theme.border}`,
                }}
              >
                <h3 style={{
                  margin: '0 0 16px',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: theme.text,
                }}>
                  Ingresos por Concepto
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={conceptChartData} margin={{ top: 20, right: 20, left: 0, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme.gridColor} />
                    <XAxis
                      dataKey="name"
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      tick={{ fontSize: 11, fill: theme.text }}
                    />
                    <YAxis tick={{ fontSize: 11, fill: theme.text }} />
                    <Tooltip
                      formatter={(value) => `$ ${value.toLocaleString()}`}
                      contentStyle={{
                        backgroundColor: theme.card,
                        border: `1px solid ${theme.border}`,
                        color: theme.text,
                      }}
                    />
                    <Bar dataKey="monto" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div
                style={{
                  backgroundColor: theme.card,
                  padding: '20px',
                  borderRadius: '8px',
                  border: `1px solid ${theme.border}`,
                }}
              >
                <h3 style={{
                  margin: '0 0 16px',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: theme.text,
                }}>
                  Verificación
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={verificationData}
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      dataKey="value"
                      label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                    >
                      {verificationData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => `${value}`}
                      contentStyle={{
                        backgroundColor: theme.card,
                        border: `1px solid ${theme.border}`,
                        color: theme.text,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Tables */}
          <div style={{ marginTop: '20px' }}>
            <h3 style={{
              margin: '0 0 12px',
              fontSize: '14px',
              fontWeight: 600,
              color: theme.text,
            }}>
              📋 Detalle por Concepto
            </h3>
            <div style={{ overflowX: 'auto', marginBottom: '30px' }}>
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '12px',
                  border: `1px solid ${theme.border}`,
                  borderRadius: '8px',
                  overflow: 'hidden',
                  backgroundColor: theme.card,
                }}
              >
                <thead style={{ backgroundColor: theme.bgSecondary }}>
                  <tr>
                    {['Concepto', 'Registros', 'Monto Total', 'Promedio'].map(header => (
                      <th
                        key={header}
                        style={{
                          padding: '12px',
                          textAlign: header === 'Concepto' ? 'left' : 'center',
                          color: theme.text,
                          fontWeight: 600,
                          borderBottom: `2px solid ${theme.border}`,
                        }}
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {conceptChartData.map((item, index) => (
                    <tr
                      key={index}
                      style={{
                        backgroundColor: index % 2 === 0 ? theme.card : theme.bgSecondary,
                        borderBottom: `1px solid ${theme.border}`,
                      }}
                    >
                      <td style={{
                        padding: '12px',
                        color: theme.text,
                        fontWeight: 500,
                      }}>
                        {item.name}
                      </td>
                      <td style={{
                        padding: '12px',
                        textAlign: 'center',
                        color: theme.text,
                      }}>
                        {item.cantidad}
                      </td>
                      <td style={{
                        padding: '12px',
                        textAlign: 'center',
                        color: theme.text,
                      }}>
                        $ {(item.monto * 1000).toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                      </td>
                      <td style={{
                        padding: '12px',
                        textAlign: 'center',
                        color: theme.text,
                      }}>
                        $ {((item.monto * 1000) / item.cantidad).toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h3 style={{
              margin: '0 0 12px',
              fontSize: '14px',
              fontWeight: 600,
              color: theme.text,
            }}>
              📋 Detalle por Método de Pago
            </h3>
            <div style={{ overflowX: 'auto' }}>
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '12px',
                  border: `1px solid ${theme.border}`,
                  borderRadius: '8px',
                  overflow: 'hidden',
                  backgroundColor: theme.card,
                }}
              >
                <thead style={{ backgroundColor: theme.bgSecondary }}>
                  <tr>
                    {['Método', 'Registros', 'Monto Total', 'Promedio'].map(header => (
                      <th
                        key={header}
                        style={{
                          padding: '12px',
                          textAlign: header === 'Método' ? 'left' : 'center',
                          color: theme.text,
                          fontWeight: 600,
                          borderBottom: `2px solid ${theme.border}`,
                        }}
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {methodChartData.map((item, index) => (
                    <tr
                      key={index}
                      style={{
                        backgroundColor: index % 2 === 0 ? theme.card : theme.bgSecondary,
                        borderBottom: `1px solid ${theme.border}`,
                      }}
                    >
                      <td style={{
                        padding: '12px',
                        color: theme.text,
                        fontWeight: 500,
                      }}>
                        {item.name}
                      </td>
                      <td style={{
                        padding: '12px',
                        textAlign: 'center',
                        color: theme.text,
                      }}>
                        {item.cantidad}
                      </td>
                      <td style={{
                        padding: '12px',
                        textAlign: 'center',
                        color: theme.text,
                      }}>
                        $ {(item.monto * 1000).toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                      </td>
                      <td style={{
                        padding: '12px',
                        textAlign: 'center',
                        color: theme.text,
                      }}>
                        $ {((item.monto * 1000) / item.cantidad).toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'flex-end',
            padding: '16px 24px',
            borderTop: `1px solid ${theme.border}`,
            backgroundColor: theme.bgLight,
            borderRadius: '0 0 12px 12px',
            position: 'sticky',
            bottom: 0,
            transition: 'all 300ms ease-in-out',
          }}
        >
          <button
            onClick={onClose}
            style={{
              backgroundColor: theme.bgSecondary,
              color: theme.text,
              border: `1px solid ${theme.border}`,
              padding: '10px 20px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => e.target.style.opacity = '0.8'}
            onMouseLeave={(e) => e.target.style.opacity = '1'}
          >
            ✕ Cerrar
          </button>
          <button
            onClick={onExportPDF}
            style={{
              background: 'linear-gradient(135deg, #2563eb 0%, #0891b2 100%)',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.target.style.boxShadow = '0 4px 12px rgba(37, 99, 235, 0.4)';
              e.target.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.target.style.boxShadow = 'none';
              e.target.style.transform = 'translateY(0)';
            }}
          >
            📄 Descargar PDF
          </button>
        </div>

        <style>{`
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes slideInUp {
            from { transform: translateY(20px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
        `}</style>
      </div>
    </div>
  );
};

export default ModalFinanceStatistics;