// 📊 ModalFinanceStatistics.jsx - ELITE MODERN
// ✅ Filtros: Ver estadísticas por mes o comparativo anual
// ✅ Gráficas dinámicas según filtro seleccionado
// ✅ Genera PDF con información del filtro
// ✅ Totalmente legible en modo oscuro
// ✅ Números en millones correctamente formateados en gráficas
// ✅ Convertido a Tailwind CSS y Lucide Icons

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { generateFilteredFinancePDF } from '../services/financepdfgenerator';
import {
  X, BarChart3, PieChart as PieChartIcon, LayoutList, Download, 
  Filter, LineChart as LineChartIcon, DollarSign, Activity, CheckCircle, Clock
} from 'lucide-react';

// ========== CONSTANTES GLOBALES ==========
const MONTH_NAMES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

const COLORS_PALETTE = {
  concept: ['#6366f1', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6'],
  method: ['#3b82f6', '#0ea5e9', '#059669', '#d97706', '#7c3aed'],
  verified: '#10b981',
  unverified: '#f59e0b',
  line: '#6366f1'
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
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`;
  }
  return `$${value}`;
};

const ModalFinanceStatistics = ({ isOpen, onClose, data, onExportPDF, allFinances = [] }) => {
  const [viewType, setViewType] = useState('bar');
  const [filterType, setFilterType] = useState('all'); // 'all', 'month', 'year'
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

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
      'CELL_GROUP_OFFERING': '🏘️ Ofrenda Célula',
    };

    return Object.entries(stats.byConcept)
      .map(([key, value]) => ({
        name: conceptMap[key] || key,
        monto: value.total,
        montoReal: value.total, // Para tooltip
        cantidad: value.count,
      }))
      .sort((a, b) => b.monto - a.monto);
  }, [getFilteredStatistics]);

  const methodChartData = useMemo(() => {
    const stats = getFilteredStatistics;
    if (!stats || !stats.byMethod) return [];

    const methodMap = {
      'CASH': '💵 Efectivo',
      'TRANSFER': '📱 Transferencia',
    };

    return Object.entries(stats.byMethod)
      .map(([key, value]) => ({
        name: methodMap[key] || key,
        monto: value.total,
        montoReal: value.total, // Para tooltip
        cantidad: value.count,
      }))
      .sort((a, b) => b.monto - a.monto);
  }, [getFilteredStatistics]);

  const verifiedChartData = useMemo(() => {
    const stats = getFilteredStatistics;
    if (!stats) return [];
    return [
      { name: 'Verificados', value: stats.verifiedAmount, real: stats.verifiedAmount, count: stats.verifiedCount },
      { name: 'Por Verificar', value: stats.unverifiedAmount, real: stats.unverifiedAmount, count: stats.unverifiedCount },
    ];
  }, [getFilteredStatistics]);

  // Handle Export PDF
  const handleExportFilteredPDF = () => {
    const stats = getFilteredStatistics;
    let filterDescription = 'Evolución Histórica (Todos los registros)';

    if (filterType === 'month') {
      filterDescription = `Mes: ${MONTH_NAMES[selectedMonth - 1]} ${selectedYear}`;
    } else if (filterType === 'year') {
      filterDescription = `Año: ${selectedYear} (Resumen anual y comparativa por meses)`;
    }

    generateFilteredFinancePDF(
      stats,
      conceptChartData,
      methodChartData,
      verifiedChartData,
      filterDescription,
      filterType === 'year' ? monthlyComparisonData : []
    );
  };

  // Customs tooltips
  const CustomTooltipBar = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-lg text-sm">
          <p className="font-bold text-slate-800 dark:text-white mb-2 pb-2 border-b border-slate-100 dark:border-slate-700">{label}</p>
          <div className="flex justify-between gap-4 mb-1 text-slate-600 dark:text-slate-300">
             <span>Monto Total:</span>
             <span className="font-semibold">{formatCurrency(payload[0].payload.montoReal)}</span>
          </div>
          <div className="flex justify-between gap-4 text-slate-600 dark:text-slate-300">
             <span>Registros:</span>
             <span className="font-semibold">{payload[0].payload.cantidad}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  const CustomTooltipPie = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-lg text-sm">
          <p className="font-bold text-slate-800 dark:text-white mb-2 pb-2 border-b border-slate-100 dark:border-slate-700">{payload[0].name}</p>
          <div className="flex justify-between gap-4 mb-1 text-slate-600 dark:text-slate-300">
             <span>Monto Total:</span>
             <span className="font-semibold">{formatCurrency(payload[0].payload.real)}</span>
          </div>
          <div className="flex justify-between gap-4 text-slate-600 dark:text-slate-300">
             <span>Registros:</span>
             <span className="font-semibold">{payload[0].payload.count}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  const CustomTooltipLine = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-lg text-sm">
          <p className="font-bold text-slate-800 dark:text-white mb-2 pb-2 border-b border-slate-100 dark:border-slate-700">{label} {selectedYear}</p>
          <div className="flex justify-between gap-4 mb-1 text-slate-600 dark:text-slate-300">
             <span>Recaudo:</span>
             <span className="font-semibold">{formatCurrency(payload[0].value)}</span>
          </div>
          <div className="flex justify-between gap-4 text-slate-600 dark:text-slate-300">
             <span>Aportes:</span>
             <span className="font-semibold">{payload[0].payload.count}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-300" onClick={onClose}>
      <div 
        className="bg-slate-50 dark:bg-slate-900 rounded-[2rem] w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300 border border-slate-200 dark:border-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700/50 p-6 z-10 shrink-0 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <BarChart3 className="w-5 h-5" />
            </div>
            Estadísticas Financieras
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:text-slate-300 dark:hover:bg-slate-700 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CONTENIDO DESLIZABLE */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 space-y-6">
          
          {/* SECCIÓN DE FILTROS */}
          <div className="bg-white dark:bg-slate-800 rounded-[1.5rem] p-5 md:p-6 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
             <div className="flex items-center gap-3 w-full md:w-auto">
               <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-900/50 flex items-center justify-center text-slate-500 dark:text-slate-400 shrink-0">
                  <Filter className="w-5 h-5" />
               </div>
               <div className="flex-1 md:flex-none">
                 <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Período</p>
                 <select
                   value={filterType}
                   onChange={e => setFilterType(e.target.value)}
                   className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500"
                 >
                   <option value="all">Historico (Todo)</option>
                   <option value="year">Anual</option>
                   <option value="month">Mensual</option>
                 </select>
               </div>
             </div>

             <div className="flex items-center gap-3 w-full md:w-auto">
               {filterType !== 'all' && (
                 <div className="flex-1 md:flex-none animate-in fade-in zoom-in-95">
                   <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Año</p>
                   <select
                     value={selectedYear}
                     onChange={e => setSelectedYear(Number(e.target.value))}
                     className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500"
                   >
                     {years.map(y => <option key={y} value={y}>{y}</option>)}
                   </select>
                 </div>
               )}

               {filterType === 'month' && (
                 <div className="flex-1 md:flex-none animate-in fade-in zoom-in-95">
                   <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Mes</p>
                   <select
                     value={selectedMonth}
                     onChange={e => setSelectedMonth(Number(e.target.value))}
                     className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500"
                   >
                     {MONTH_NAMES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                   </select>
                 </div>
               )}
             </div>
          </div>

          {getFilteredStatistics.totalRecords === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-[1.5rem] p-12 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-900 rounded-full flex items-center justify-center mb-4">
                 <Activity className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300">No hay datos para este período</h3>
              <p className="text-slate-500 dark:text-slate-400 mt-2 max-w-sm">
                No se encontraron registros financieros en el rango seleccionado. Intenta cambiar el filtro de fecha.
              </p>
            </div>
          ) : (
            <>
              {/* TARJETAS RESUMEN */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-800 p-5 rounded-[1.5rem] border border-slate-200 dark:border-slate-700 shadow-sm transition-all hover:border-indigo-300 dark:hover:border-indigo-700">
                  <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3">
                    <DollarSign className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Monto Total</p>
                  <p className="text-xl md:text-2xl font-bold text-slate-800 dark:text-white truncate" title={formatCurrency(getFilteredStatistics.totalAmount)}>
                    {formatCurrency(getFilteredStatistics.totalAmount)}
                  </p>
                </div>
                
                <div className="bg-white dark:bg-slate-800 p-5 rounded-[1.5rem] border border-slate-200 dark:border-slate-700 shadow-sm transition-all hover:border-emerald-300 dark:hover:border-emerald-700">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Verificado</p>
                  <p className="text-xl md:text-2xl font-bold text-slate-800 dark:text-white truncate" title={formatCurrency(getFilteredStatistics.verifiedAmount)}>
                    {formatCurrency(getFilteredStatistics.verifiedAmount)}
                  </p>
                </div>
                
                <div className="bg-white dark:bg-slate-800 p-5 rounded-[1.5rem] border border-slate-200 dark:border-slate-700 shadow-sm transition-all hover:border-amber-300 dark:hover:border-amber-700">
                  <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-3">
                    <Clock className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Por Verificar</p>
                  <p className="text-xl md:text-2xl font-bold text-slate-800 dark:text-white truncate" title={formatCurrency(getFilteredStatistics.unverifiedAmount)}>
                    {formatCurrency(getFilteredStatistics.unverifiedAmount)}
                  </p>
                </div>
                
                <div className="bg-white dark:bg-slate-800 p-5 rounded-[1.5rem] border border-slate-200 dark:border-slate-700 shadow-sm transition-all hover:border-slate-300 dark:hover:border-slate-600">
                  <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 flex items-center justify-center mb-3">
                    <Activity className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Registros</p>
                  <p className="text-xl md:text-2xl font-bold text-slate-800 dark:text-white">
                    {getFilteredStatistics.totalRecords}
                  </p>
                </div>
              </div>

              {/* TABS DE VISTA */}
              <div className="flex bg-slate-200/50 dark:bg-slate-800/50 p-1 rounded-xl w-full sm:w-auto self-start border border-slate-200 dark:border-slate-700/50 my-6">
                <button 
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                    viewType === 'bar' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                  onClick={() => setViewType('bar')}
                >
                  <BarChart3 className="w-4 h-4" /> BARRAS
                </button>
                <button 
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                    viewType === 'pie' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                  onClick={() => setViewType('pie')}
                >
                  <PieChartIcon className="w-4 h-4" /> PASTEL
                </button>
                <button 
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                    viewType === 'table' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                  onClick={() => setViewType('table')}
                >
                  <LayoutList className="w-4 h-4" /> TABLA
                </button>
              </div>

              {/* SECCIÓN DE GRÁFICOS */}
              {(viewType === 'bar' || viewType === 'pie') && (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

                  {/* CONCEPTOS */}
                  <div className="bg-white dark:bg-slate-800 p-6 rounded-[1.5rem] border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col">
                    <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-6 uppercase tracking-wider flex items-center gap-2">
                       <BarChart3 className="w-4 h-4 text-indigo-500" />
                       Distribución por Concepto
                    </h3>
                    <div className="h-64 sm:h-80 w-full relative">
                      <ResponsiveContainer width="100%" height="100%">
                        {viewType === 'bar' ? (
                          <BarChart data={conceptChartData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                            <XAxis 
                              dataKey="name" 
                              tickFormatter={(val) => val.split(' ')[1] || val} 
                              fontSize={11} 
                              tick={{fill: '#888888'}} 
                              axisLine={{ stroke: '#888888', strokeOpacity: 0.2 }}
                            />
                            <YAxis 
                              tickFormatter={formatYAxis} 
                              fontSize={11} 
                              tick={{fill: '#888888'}} 
                              axisLine={{ stroke: '#888888', strokeOpacity: 0.2 }}
                            />
                            <Tooltip content={<CustomTooltipBar />} cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
                            <Bar dataKey="monto" radius={[8, 8, 0, 0]}>
                              {conceptChartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS_PALETTE.concept[index % COLORS_PALETTE.concept.length]} />
                              ))}
                            </Bar>
                          </BarChart>
                        ) : (
                          <PieChart>
                            <Tooltip content={<CustomTooltipPie />} />
                            <Legend wrapperStyle={{ fontSize: '12px' }} />
                            <Pie
                              data={conceptChartData}
                              dataKey="monto"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              innerRadius="40%"
                              outerRadius="80%"
                              paddingAngle={2}
                            >
                              {conceptChartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS_PALETTE.concept[index % COLORS_PALETTE.concept.length]} />
                              ))}
                            </Pie>
                          </PieChart>
                        )}
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-6">
                    {/* VERIFICADOS VS NO VERIFICADOS */}
                     <div className="bg-white dark:bg-slate-800 p-6 rounded-[1.5rem] border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col">
                       <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-6 uppercase tracking-wider flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-emerald-500" />
                          Estado de Verificación
                       </h3>
                       <div className="h-48 w-full relative">
                         <ResponsiveContainer width="100%" height="100%">
                           <PieChart>
                             <Tooltip content={<CustomTooltipPie />} />
                             <Legend wrapperStyle={{ fontSize: '12px' }} />
                             <Pie
                               data={verifiedChartData}
                               dataKey="value"
                               nameKey="name"
                               cx="50%"
                               cy="50%"
                               outerRadius="80%"
                             >
                               <Cell fill={COLORS_PALETTE.verified} />
                               <Cell fill={COLORS_PALETTE.unverified} />
                             </Pie>
                           </PieChart>
                         </ResponsiveContainer>
                       </div>
                     </div>

                    {/* METODO DE PAGO */}
                     <div className="bg-white dark:bg-slate-800 p-6 rounded-[1.5rem] border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col">
                       <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-6 uppercase tracking-wider flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-blue-500" />
                          Métodos de Pago
                       </h3>
                       <div className="h-48 w-full relative">
                         <ResponsiveContainer width="100%" height="100%">
                           {viewType === 'bar' ? (
                             <BarChart data={methodChartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }} layout="vertical">
                               <CartesianGrid strokeDasharray="3 3" horizontal={false} strokeOpacity={0.1} />
                               <XAxis type="number" tickFormatter={formatYAxis} fontSize={11} tick={{fill: '#888888'}} />
                               <YAxis dataKey="name" type="category" tickFormatter={(val) => val.split(' ')[1] || val} fontSize={11} width={80} tick={{fill: '#888888'}} />
                               <Tooltip content={<CustomTooltipBar />} cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
                               <Bar dataKey="monto" radius={[0, 8, 8, 0]}>
                                 {methodChartData.map((entry, index) => (
                                   <Cell key={`cell-${index}`} fill={COLORS_PALETTE.method[index % COLORS_PALETTE.method.length]} />
                                 ))}
                               </Bar>
                             </BarChart>
                           ) : (
                             <PieChart>
                               <Tooltip content={<CustomTooltipPie />} />
                               <Legend wrapperStyle={{ fontSize: '12px' }} align="right" verticalAlign="middle" layout="vertical" />
                               <Pie
                                 data={methodChartData}
                                 dataKey="monto"
                                 nameKey="name"
                                 cx="30%"
                                 cy="50%"
                                 innerRadius="40%"
                                 outerRadius="80%"
                                 paddingAngle={2}
                               >
                                 {methodChartData.map((entry, index) => (
                                   <Cell key={`cell-${index}`} fill={COLORS_PALETTE.method[index % COLORS_PALETTE.method.length]} />
                                 ))}
                               </Pie>
                             </PieChart>
                           )}
                         </ResponsiveContainer>
                       </div>
                     </div>
                  </div>

                  {/* GRÁFICA LINEAL ANUAL */}
                  {filterType === 'year' && (
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-[1.5rem] border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col xl:col-span-2">
                       <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-6 uppercase tracking-wider flex items-center gap-2">
                          <LineChartIcon className="w-4 h-4 text-indigo-500" />
                          Evolución Mensual {selectedYear}
                       </h3>
                       <div className="h-72 w-full relative">
                         <ResponsiveContainer width="100%" height="100%">
                           <LineChart data={monthlyComparisonData} margin={{ top: 10, right: 10, left: 20, bottom: 20 }}>
                             <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                             <XAxis dataKey="month" fontSize={11} tick={{fill: '#888888'}} axisLine={{ stroke: '#888888', strokeOpacity: 0.2 }} />
                             <YAxis tickFormatter={formatYAxis} fontSize={11} tick={{fill: '#888888'}} axisLine={{ stroke: '#888888', strokeOpacity: 0.2 }} />
                             <Tooltip content={<CustomTooltipLine />} />
                             <Line 
                               type="monotone" 
                               dataKey="total" 
                               stroke={COLORS_PALETTE.line} 
                               strokeWidth={3} 
                               dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} 
                               activeDot={{ r: 6, strokeWidth: 0 }}
                               animationDuration={1000}
                             />
                           </LineChart>
                         </ResponsiveContainer>
                       </div>
                    </div>
                  )}
                </div>
              )}

              {/* VISTA DE TABLA */}
              {viewType === 'table' && (
                <div className="space-y-6">
                  <div className="bg-white dark:bg-slate-800 rounded-[1.5rem] border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                    <div className="p-5 border-b border-slate-200 dark:border-slate-700">
                       <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
                          <BarChart3 className="w-4 h-4 text-indigo-500" />
                          Detalle por Concepto
                       </h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-slate-50 dark:bg-slate-900/50">
                          <tr>
                            <th className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">Concepto</th>
                            <th className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 text-center">Registros</th>
                            <th className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 text-right">Monto Total</th>
                            <th className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 text-right">Promedio</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                          {conceptChartData.map((item, index) => (
                            <tr key={index} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                              <td className="px-6 py-4 font-medium text-slate-800 dark:text-slate-200">{item.name}</td>
                              <td className="px-6 py-4 text-slate-600 dark:text-slate-400 text-center">{item.cantidad}</td>
                              <td className="px-6 py-4 font-bold text-indigo-600 dark:text-indigo-400 text-right">{formatCurrency(item.montoReal)}</td>
                              <td className="px-6 py-4 text-slate-600 dark:text-slate-400 text-right">{formatCurrency(item.montoReal / item.cantidad)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-800 rounded-[1.5rem] border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                    <div className="p-5 border-b border-slate-200 dark:border-slate-700">
                       <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-blue-500" />
                          Detalle por Método de Pago
                       </h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-slate-50 dark:bg-slate-900/50">
                          <tr>
                            <th className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">Método</th>
                            <th className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 text-center">Registros</th>
                            <th className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 text-right">Monto Total</th>
                            <th className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 text-right">Promedio</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                          {methodChartData.map((item, index) => (
                            <tr key={index} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                              <td className="px-6 py-4 font-medium text-slate-800 dark:text-slate-200">{item.name}</td>
                              <td className="px-6 py-4 text-slate-600 dark:text-slate-400 text-center">{item.cantidad}</td>
                              <td className="px-6 py-4 font-bold text-indigo-600 dark:text-indigo-400 text-right">{formatCurrency(item.montoReal)}</td>
                              <td className="px-6 py-4 text-slate-600 dark:text-slate-400 text-right">{formatCurrency(item.montoReal / item.cantidad)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

        </div>

        {/* FOOTER */}
        <div className="p-4 md:p-6 bg-slate-50 border-t border-slate-200 dark:bg-slate-900 dark:border-slate-800 flex flex-col-reverse sm:flex-row justify-end gap-3 shrink-0 rounded-b-[2rem] absolute bottom-0 inset-x-0">
          <button
            onClick={onClose}
            className="px-6 py-3 rounded-xl font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700 transition-all text-sm w-full sm:w-auto text-center"
          >
            Cerrar
          </button>
          <button
            onClick={handleExportFilteredPDF}
            className="px-8 py-3 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-500/30 transition-all text-sm w-full sm:w-auto text-center flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            Descargar PDF
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalFinanceStatistics;