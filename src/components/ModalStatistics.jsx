// ============================================
// ModalStatistics.jsx - ELITE MODERN EDITION
// ============================================

import React, { useMemo } from 'react';
import { generatePDF } from '../services/Pdfgenerator';
import { 
  BarChart3, 
  X, 
  Download, 
  Users, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Ban, 
  TrendingUp,
  Filter,
  Calendar,
  Layers,
  Search,
} from 'lucide-react';

const ModalStatistics = ({ isOpen, onClose, data, isDarkMode }) => {
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

  if (!isOpen || !data) return null;

  const {
    statistics = {},
    hasFilters = false,
    filtersInfo = {},
    dataCount = 0,
  } = data;

  const handleExportPDF = () => {
    try {
      const title = hasFilters 
        ? `Estadísticas ${Object.keys(filtersInfo).length > 0 ? '(Con Filtros)' : ''}`
        : 'Estadísticas Generales';
      const filename = hasFilters ? 'estadisticas-filtradas' : 'estadisticas-generales';
      generatePDF({
        title: title,
        statistics: statistics,
        totals: totals,
        hasFilters: hasFilters,
        filtersInfo: filtersInfo,
        dataCount: dataCount,
        date: new Date().toLocaleDateString('es-CO'),
      }, filename);
    } catch (err) {
      console.error('Error al exportar PDF:', err);
    }
  };

  const StatItem = ({ label, value, icon: Icon, color }) => (
    <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
      <div className={`p-2.5 rounded-xl bg-${color}-500/10 text-${color}-600 dark:text-${color}-400`}>
        <Icon size={20} />
      </div>
      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
        <p className="text-xl font-black text-slate-900 dark:text-white leading-none mt-1">{value}</p>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={onClose}
      />
      
      <div className="relative bg-white dark:bg-slate-900 w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <BarChart3 size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-none">Estadísticas Académicas</h2>
              <p className="text-sm text-slate-500 font-medium mt-1">Análisis de rendimiento y progresión</p>
            </div>
            {hasFilters && (
              <span className="ml-4 px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-black uppercase tracking-widest border border-amber-500/20 animate-pulse">
                Filtros Activos
              </span>
            )}
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-all"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          {/* Active Filters Summary */}
          {hasFilters && Object.keys(filtersInfo).length > 0 && (
            <div className="p-6 rounded-3xl bg-indigo-500/5 border border-indigo-500/20">
              <div className="flex items-center gap-2 mb-4 text-indigo-600 dark:text-indigo-400">
                <Filter size={18} />
                <span className="font-bold text-sm uppercase tracking-wider">Criterios de Análisis</span>
              </div>
              <div className="flex flex-wrap gap-3">
                {Object.entries(filtersInfo).map(([key, value]) => (
                  <div key={key} className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
                    {key === 'year' && <Calendar size={14} className="text-indigo-500" />}
                    {key === 'level' && <Layers size={14} className="text-indigo-500" />}
                    {key === 'result' && <CheckCircle2 size={14} className="text-indigo-500" />}
                    {key === 'search' && <Search size={14} className="text-indigo-500" />}
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <StatItem icon={Users} label="Total Estudiantes" value={totals.total} color="indigo" />
            <StatItem icon={CheckCircle2} label="Aprobados" value={totals.passed} color="emerald" />
            <StatItem icon={XCircle} label="Reprobados" value={totals.failed} color="rose" />
            <StatItem icon={Clock} label="Pendientes" value={totals.pending} color="amber" />
            <StatItem icon={Ban} label="Cancelados" value={totals.cancelled} color="slate" />
            <StatItem icon={TrendingUp} label="Tasa de Aprobación" value={`${totals.passPercentage}%`} color="violet" />
          </div>

          {/* Breakdown Table */}
          <section className="space-y-4">
            <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
              <Layers size={20} className="text-indigo-500" />
              Rendimiento por Nivel
            </h3>
            <div className="overflow-hidden rounded-3xl border border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-950/30">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800">
                    <th className="px-6 py-4 text-[10px] font-black italic text-slate-400 uppercase tracking-widest leading-none">Nivel</th>
                    <th className="px-6 py-4 text-[10px] font-black italic text-slate-400 uppercase tracking-widest leading-none">Total</th>
                    <th className="px-6 py-4 text-[10px] font-black italic text-emerald-500 uppercase tracking-widest leading-none">Aprobados</th>
                    <th className="px-6 py-4 text-[10px] font-black italic text-rose-500 uppercase tracking-widest leading-none">Reprobados</th>
                    <th className="px-6 py-4 text-[10px] font-black italic text-indigo-500 uppercase tracking-widest leading-none text-right">Eficacia</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {Object.entries(statistics).map(([key, stat]) => stat.total > 0 && (
                    <tr key={key} className="group hover:bg-white dark:hover:bg-slate-900 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-800 dark:text-slate-200 text-sm tracking-tight">{stat.label}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-black text-slate-500 dark:text-slate-400">{stat.total}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">{stat.passed}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-black text-rose-500 dark:text-rose-400">{stat.failed}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-3 text-sm font-black text-indigo-600 dark:text-indigo-400 tracking-tighter">
                          {stat.passPercentage}%
                          <div className="w-16 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-200/50 dark:border-slate-700/50">
                            <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${stat.passPercentage}%` }} />
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="px-8 py-6 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 bg-slate-50/50 dark:bg-slate-950/50">
          <button 
            onClick={onClose}
            className="px-6 py-3 rounded-2xl font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all active:scale-95 text-sm"
          >
            Cerrar Reporte
          </button>
          <button 
            onClick={handleExportPDF}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-indigo-500/25 transition-all active:scale-95 text-sm"
          >
            <Download size={18} />
            Descargar Informe Completo
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalStatistics;