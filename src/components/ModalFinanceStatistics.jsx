// 📊 ModalFinanceStatistics.jsx - v3 CON FILTROS DE MES Y AÑO
// ✅ Filtros: Ver estadísticas por mes o comparativo anual
// ✅ Gráficas dinámicas según filtro seleccionado
// ✅ Genera PDF con información del filtro
// ✅ Totalmente legible en modo oscuro
// ✅ Números en millones correctamente formateados en gráficas

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { generateFilteredFinancePDF } from '../services/financepdfgenerator';

// ========== CONSTANTES GLOBALES ==========
const MONTH_NAMES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

const COLORS_PALETTE = {
  concept: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'],
  method: ['#2563eb', '#0891b2', '#059669', '#d97706', '#7c3aed'],
  verified: '#10b981',
  unverified: '#f59e0b',
};

// ========== FORMATTERS ==========
const formatCurrency = (value) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

const formatYAxis = (value) => {
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(1)}M`;
  }
  if (value >= 1) {
    return `$${value}K`;
  }
  return `$${value}`;
};

const ModalFinanceStatistics = ({ isOpen, onClose, data, onExportPDF, allFinances = [] }) => {
  const [viewType, setViewType] = useState('bar');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [filterType, setFilterType] = useState('all'); // 'all', 'month', 'year'
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

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

  // ========== FILTRAR DATOS SEGÚN FILTRO SELECCIONADO ==========
  const getFilteredFinances = useMemo(() => {
    if (!allFinances || allFinances.length === 0) return [];

    let filtered = [...allFinances];

    if (filterType === 'month') {
      filtered = filtered.filter(finance => {
        const date = new Date(finance.registrationDate);
        return date.getFullYear() === selectedYear && (date.getMonth() + 1) === selectedMonth;
      });
    } else if (filterType === 'year') {
      filtered = filtered.filter(finance => {
        const date = new Date(finance.registrationDate);
        return date.getFullYear() === selectedYear;
      });
    }

    return filtered;
  }, [allFinances, filterType, selectedYear, selectedMonth]);

  // ========== CALCULAR ESTADÍSTICAS FILTRADAS ==========
  const getFilteredStatistics = useMemo(() => {
    const filteredData = getFilteredFinances;
    const stats = {
      totalRecords: filteredData.length,
      totalAmount: 0,
      verifiedAmount: 0,
      unverifiedAmount: 0,
      verifiedCount: 0,
      unverifiedCount: 0,
      byConcept: {},
      byMethod: {},
    };

    filteredData.forEach(finance => {
      stats.totalAmount += finance.amount || 0;

      if (finance.isVerified) {
        stats.verifiedAmount += finance.amount || 0;
        stats.verifiedCount += 1;
      } else {
        stats.unverifiedAmount += finance.amount || 0;
        stats.unverifiedCount += 1;
      }

      if (!stats.byConcept[finance.concept]) {
        stats.byConcept[finance.concept] = { count: 0, total: 0 };
      }
      stats.byConcept[finance.concept].count += 1;
      stats.byConcept[finance.concept].total += finance.amount || 0;

      if (!stats.byMethod[finance.method]) {
        stats.byMethod[finance.method] = { count: 0, total: 0 };
      }
      stats.byMethod[finance.method].count += 1;
      stats.byMethod[finance.method].total += finance.amount || 0;
    });

    return stats;
  }, [getFilteredFinances]);

  // ========== COMPARATIVA MES A MES DEL AÑO ==========
  const monthlyComparisonData = useMemo(() => {
    if (filterType !== 'year' || !allFinances) return [];

    const monthData = {};

    // Inicializar todos los meses
    for (let m = 1; m <= 12; m++) {
      monthData[m] = { month: MONTH_NAMES[m - 1], count: 0, total: 0 };
    }

    // Llenar datos
    allFinances.forEach(finance => {
      const date = new Date(finance.registrationDate);
      if (date.getFullYear() === selectedYear) {
        const month = date.getMonth() + 1;
        if (monthData[month]) {
          monthData[month].count += 1;
          monthData[month].total += finance.amount || 0;
        }
      }
    });

    return Object.values(monthData);
  }, [allFinances, selectedYear, filterType]);

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

  // Datos para gráficas
  const conceptChartData = useMemo(() => {
    const stats = getFilteredStatistics;
    if (!stats || !stats.byConcept) return [];

    const conceptMap = {
      'TITHE': '💵 Diezmo',
      'OFFERING': '🎁 Ofrenda',
      'SEED_OFFERING': '🌱 Ofrenda de Semilla',
      'BUILDING_FUND': '🏗️ Fondo de Construcción',
      'FIRST_FRUITS': '🍇 Primicias',
      'CELL_GROUP_OFFERING': '🏘️ Ofrenda grupo celular',
    };

    return Object.entries(stats.byConcept).map(([key, value], index) => ({
      name: conceptMap[key] || key,
      cantidad: value.count,
      monto: parseFloat((value.total / 1000).toFixed(2)), // Mantenemos en miles para la gráfica
      montoReal: value.total, // Guardamos el valor real para el tooltip
      fill: COLORS_PALETTE.concept[index % COLORS_PALETTE.concept.length],
    }));
  }, [getFilteredStatistics]);

  const methodChartData = useMemo(() => {
    const stats = getFilteredStatistics;
    if (!stats || !stats.byMethod) return [];

    const methodMap = {
      'CASH': '💵 Efectivo',
      'BANK_TRANSFER': '🏦 Transferencia Bancaria',
    };

    return Object.entries(stats.byMethod).map(([key, value], index) => ({
      name: methodMap[key] || key,
      cantidad: value.count,
      monto: parseFloat((value.total / 1000).toFixed(2)), // Mantenemos en miles para la gráfica
      montoReal: value.total, // Guardamos el valor real para el tooltip
      fill: COLORS_PALETTE.method[index % COLORS_PALETTE.method.length],
    }));
  }, [getFilteredStatistics]);

  const verificationData = useMemo(() => {
    const stats = getFilteredStatistics;
    if (!stats) return [];

    return [
      {
        name: '✅ Verificados',
        value: stats.verifiedCount,
        monto: stats.verifiedAmount,
        fill: COLORS_PALETTE.verified,
      },
      {
        name: '⏳ Pendientes',
        value: stats.unverifiedCount,
        monto: stats.unverifiedAmount,
        fill: COLORS_PALETTE.unverified,
      },
    ];
  }, [getFilteredStatistics]);

  const handleExportFilteredPDF = useCallback(() => {
    try {
      const filterInfo = {
        filterType: filterType,
        selectedMonth: selectedMonth,
        selectedYear: selectedYear,
        filteredFinances: getFilteredFinances,
        totalStats: getFilteredStatistics,
        conceptChartData: conceptChartData,
        methodChartData: methodChartData,
        verificationData: verificationData,
        monthlyComparison: filterType === 'year' ? monthlyComparisonData : [],
      };

      generateFilteredFinancePDF(filterInfo);
    } catch (err) {
      console.error('Error generando PDF:', err);
      alert('Error al generar PDF: ' + err.message);
    }
  }, [
    filterType,
    selectedMonth,
    selectedYear,
    getFilteredFinances,
    getFilteredStatistics,
    conceptChartData,
    methodChartData,
    verificationData,
    monthlyComparisonData,
  ]);

  if (!isOpen) return null;

  const displayStats = getFilteredStatistics;

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
          maxWidth: '1200px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          animation: 'slideInUp 0.3s ease-in-out',
          transition: 'all 300ms ease-in-out',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER - Sticky */}
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
            flexShrink: 0,
          }}
        >
          <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>
            📊 Estadísticas Financieras
            {filterType === 'month' && ` - ${MONTH_NAMES[selectedMonth - 1]} ${selectedYear}`}
            {filterType === 'year' && ` - Año ${selectedYear}`}
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
              flexShrink: 0,
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'}
            onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
          >
            ✕
          </button>
        </div>

        {/* FILTROS - Sticky */}
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
            flexShrink: 0,
          }}
        >
          {/* Filtro de Tipo */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{
              fontSize: '12px',
              fontWeight: 600,
              color: theme.textSecondary,
            }}>
              📅 Filtro
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {['all', 'month', 'year'].map(type => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  style={{
                    padding: '8px 16px',
                    border: `1.5px solid ${filterType === type ? 'transparent' : theme.border}`,
                    backgroundColor: filterType === type ? '#2563eb' : theme.card,
                    color: filterType === type ? 'white' : theme.text,
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: 600,
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    if (filterType !== type) e.target.style.backgroundColor = theme.bgSecondary;
                  }}
                  onMouseLeave={(e) => {
                    if (filterType !== type) e.target.style.backgroundColor = theme.card;
                  }}
                >
                  {type === 'all' && 'Todos'}
                  {type === 'month' && 'Por Mes'}
                  {type === 'year' && 'Por Año'}
                </button>
              ))}
            </div>
          </div>

          {/* Selector de Año */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{
              fontSize: '12px',
              fontWeight: 600,
              color: theme.textSecondary,
            }}>
              📆 Año
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                border: `1px solid ${theme.border}`,
                backgroundColor: theme.card,
                color: theme.text,
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {years.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>

          {/* Selector de Mes */}
          {filterType === 'month' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{
                fontSize: '12px',
                fontWeight: 600,
                color: theme.textSecondary,
              }}>
                📅 Mes
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: `1px solid ${theme.border}`,
                  backgroundColor: theme.card,
                  color: theme.text,
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {MONTH_NAMES.map((month, idx) => (
                  <option key={idx + 1} value={idx + 1}>{month}</option>
                ))}
              </select>
            </div>
          )}

          {/* Selector de Visualización */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{
              fontSize: '12px',
              fontWeight: 600,
              color: theme.textSecondary,
            }}>
              📈 Visualización
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {['bar', 'pie', 'combined'].map(type => (
                <button
                  key={type}
                  onClick={() => setViewType(type)}
                  style={{
                    padding: '8px 12px',
                    border: `1.5px solid ${viewType === type ? 'transparent' : theme.border}`,
                    backgroundColor: viewType === type ? '#2563eb' : theme.card,
                    color: viewType === type ? 'white' : theme.text,
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '11px',
                    fontWeight: 600,
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    if (viewType !== type) e.target.style.backgroundColor = theme.bgSecondary;
                  }}
                  onMouseLeave={(e) => {
                    if (viewType !== type) e.target.style.backgroundColor = theme.card;
                  }}
                >
                  {type === 'bar' && '📊'}
                  {type === 'pie' && '🥧'}
                  {type === 'combined' && '📈'}
                </button>
              ))}
            </div>
          </div>

          {/* Botón PDF */}
          <button
            onClick={handleExportFilteredPDF}
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
            📄 PDF
          </button>
        </div>

        {/* SCROLLABLE CONTENT */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Stats Summary */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '12px',
              padding: '16px 24px',
              backgroundColor: theme.bgLight,
              transition: 'all 300ms ease-in-out',
              flexShrink: 0,
            }}
          >
            {[
              { icon: '💰', label: 'Total de Registros', value: displayStats.totalRecords, color: theme.text },
              {
                icon: '💵',
                label: 'Monto Total',
                value: formatCurrency(displayStats.totalAmount || 0),
                color: theme.text,
              },
              {
                icon: '✅',
                label: 'Verificados',
                value: `${displayStats.verifiedCount} - ${formatCurrency(displayStats.verifiedAmount || 0)}`,
                color: COLORS_PALETTE.verified,
              },
              {
                icon: '⏳',
                label: 'Pendientes de Verificar',
                value: `${displayStats.unverifiedCount} - ${formatCurrency(displayStats.unverifiedAmount || 0)}`,
                color: COLORS_PALETTE.unverified,
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

          {/* Body Content */}
          <div style={{ padding: '24px' }}>
            {/* Comparativa Mensual (solo cuando año está seleccionado) */}
            {filterType === 'year' && monthlyComparisonData.length > 0 && (
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
                  Comparativa Mensual - {selectedYear}
                </h3>
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={monthlyComparisonData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme.gridColor} />
                    <XAxis
                      dataKey="month"
                      angle={-45}
                      textAnchor="end"
                      height={100}
                      tick={{ fontSize: 12, fill: theme.text }}
                    />
                    <YAxis 
                      tick={{ fontSize: 12, fill: theme.text }}
                      tickFormatter={formatYAxis}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: theme.card,
                        border: `1px solid ${theme.border}`,
                        borderRadius: '8px',
                        color: theme.text,
                      }}
                      formatter={(value) => [formatCurrency(value), 'Total Mensual']}
                      labelFormatter={(label) => `Mes: ${label}`}
                    />
                    <Legend wrapperStyle={{ color: theme.text }} />
                    <Line
                      type="monotone"
                      dataKey="total"
                      stroke="#2563eb"
                      strokeWidth={2}
                      name="Total Mensual"
                      dot={{ fill: '#2563eb', r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Gráficas según vista seleccionada */}
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
                  {conceptChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={conceptChartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={theme.gridColor} />
                        <XAxis
                          dataKey="name"
                          angle={-45}
                          textAnchor="end"
                          height={100}
                          tick={{ fontSize: 12, fill: theme.text }}
                        />
                        <YAxis 
                          tick={{ fontSize: 12, fill: theme.text }}
                          tickFormatter={formatYAxis}
                          label={{ 
                            value: 'Valores en Miles', 
                            angle: -90, 
                            position: 'insideLeft',
                            style: { fill: theme.textSecondary, fontSize: 11 }
                          }}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: theme.card,
                            border: `1px solid ${theme.border}`,
                            borderRadius: '8px',
                            color: theme.text,
                          }}
                          formatter={(value, name, props) => {
                            if (name === "Monto (Miles)") {
                              const realValue = props.payload.montoReal;
                              return [formatCurrency(realValue), "Monto Total"];
                            }
                            return [formatCurrency(value), name];
                          }}
                          labelFormatter={(label) => `Concepto: ${label}`}
                        />
                        <Legend wrapperStyle={{ color: theme.text }} />
                        <Bar dataKey="monto" fill="#3b82f6" name="Monto (Miles)" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p style={{ color: theme.textSecondary, textAlign: 'center', padding: '20px' }}>
                      No hay datos para este período
                    </p>
                  )}
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
                  {methodChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={methodChartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={theme.gridColor} />
                        <XAxis
                          dataKey="name"
                          angle={-45}
                          textAnchor="end"
                          height={100}
                          tick={{ fontSize: 12, fill: theme.text }}
                        />
                        <YAxis 
                          tick={{ fontSize: 12, fill: theme.text }}
                          tickFormatter={formatYAxis}
                          label={{ 
                            value: 'Valores en Miles', 
                            angle: -90, 
                            position: 'insideLeft',
                            style: { fill: theme.textSecondary, fontSize: 11 }
                          }}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: theme.card,
                            border: `1px solid ${theme.border}`,
                            borderRadius: '8px',
                            color: theme.text,
                          }}
                          formatter={(value, name, props) => {
                            if (name === "Monto (Miles)") {
                              const realValue = props.payload.montoReal;
                              return [formatCurrency(realValue), "Monto Total"];
                            }
                            return [formatCurrency(value), name];
                          }}
                          labelFormatter={(label) => `Método: ${label}`}
                        />
                        <Legend wrapperStyle={{ color: theme.text }} />
                        <Bar dataKey="monto" fill="#0891b2" name="Monto (Miles)" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p style={{ color: theme.textSecondary, textAlign: 'center', padding: '20px' }}>
                      No hay datos para este período
                    </p>
                  )}
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
                  {conceptChartData.length > 0 ? (
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
                          formatter={(value, name, props) => {
                            if (name === "cantidad") {
                              return [`${value} registros`, 'Cantidad'];
                            }
                            return [value, name];
                          }}
                          contentStyle={{
                            backgroundColor: theme.card,
                            border: `1px solid ${theme.border}`,
                            color: theme.text,
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <p style={{ color: theme.textSecondary, textAlign: 'center', padding: '20px' }}>
                      No hay datos para este período
                    </p>
                  )}
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
                  {verificationData.some(v => v.value > 0) ? (
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
                          formatter={(value) => [`${value} registros`, 'Cantidad']}
                          contentStyle={{
                            backgroundColor: theme.card,
                            border: `1px solid ${theme.border}`,
                            color: theme.text,
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <p style={{ color: theme.textSecondary, textAlign: 'center', padding: '20px' }}>
                      No hay datos para este período
                    </p>
                  )}
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
                  {conceptChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={conceptChartData} margin={{ top: 20, right: 20, left: 20, bottom: 40 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={theme.gridColor} />
                        <XAxis
                          dataKey="name"
                          angle={-45}
                          textAnchor="end"
                          height={80}
                          tick={{ fontSize: 11, fill: theme.text }}
                        />
                        <YAxis 
                          tick={{ fontSize: 11, fill: theme.text }}
                          tickFormatter={formatYAxis}
                        />
                        <Tooltip
                          formatter={(value, name, props) => {
                            const realValue = props.payload.montoReal;
                            return [formatCurrency(realValue), "Monto Total"];
                          }}
                          contentStyle={{
                            backgroundColor: theme.card,
                            border: `1px solid ${theme.border}`,
                            color: theme.text,
                          }}
                        />
                        <Bar dataKey="monto" fill="#3b82f6" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p style={{ color: theme.textSecondary, textAlign: 'center', padding: '20px' }}>
                      No hay datos para este período
                    </p>
                  )}
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
                  {verificationData.some(v => v.value > 0) ? (
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
                          formatter={(value) => [`${value} registros`, 'Cantidad']}
                          contentStyle={{
                            backgroundColor: theme.card,
                            border: `1px solid ${theme.border}`,
                            color: theme.text,
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <p style={{ color: theme.textSecondary, textAlign: 'center', padding: '20px' }}>
                      No hay datos para este período
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Tables */}
            {displayStats.totalRecords > 0 && (
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
                            {formatCurrency(item.montoReal)}
                          </td>
                          <td style={{
                            padding: '12px',
                            textAlign: 'center',
                            color: theme.text,
                          }}>
                            {formatCurrency(item.montoReal / item.cantidad)}
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
                <div style={{ overflowX: 'auto', marginBottom: '20px' }}>
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
                            {formatCurrency(item.montoReal)}
                          </td>
                          <td style={{
                            padding: '12px',
                            textAlign: 'center',
                            color: theme.text,
                          }}>
                            {formatCurrency(item.montoReal / item.cantidad)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* FOOTER - Sticky */}
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
            flexShrink: 0,
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
            onClick={handleExportFilteredPDF}
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