// ============================================
// ModalDailyReportOptions.jsx - ELITE MODERN
// Modal para opciones de reporte + Dark Mode nativo
// ============================================

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { 
  X, Calendar, DollarSign, BarChart3, List, Users, 
  FileText, Check, LayoutGrid
} from 'lucide-react';

// 🔐 Debug condicional
const DEBUG = process.env.REACT_APP_DEBUG === "true";

const log = (message, data) => {
  if (DEBUG) {
    console.log(`[ModalDailyReportOptions] ${message}`, data || '');
  }
};

const logError = (message, error) => {
  console.error(`[ModalDailyReportOptions] ${message}`, error);
};

// ✅ Sanitización de HTML
const escapeHtml = (text) => {
  if (!text || typeof text !== 'string') return '';
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
};

// ✅ Validación de cantidad
const validateAmount = (amount) => {
  const num = parseFloat(amount);
  if (isNaN(num)) return 0;
  if (num < 0) return 0;
  if (num > 999999999) return 999999999;
  return num;
};

// ========== CONSTANTES FUERA DEL COMPONENTE ==========
const CONCEPT_MAP = {
  'TITHE': '💵 Diezmo',
  'OFFERING': '🎁 Ofrenda',
  'SEED_OFFERING': '🌱 Ofrenda de Semilla',
  'BUILDING_FUND': '🏗️ Fondo de Construcción',
  'FIRST_FRUITS': '🍇 Primicias',
  'CELL_GROUP_OFFERING': '🏘️ Ofrenda Grupo de Célula',
};

const ModalDailyReportOptions = ({ isOpen, onClose, onConfirm, selectedDate, financesData, dateRange }) => {
  const [reportType, setReportType] = useState('summary');

  // ========== VALIDAR PROPS ==========
  useEffect(() => {
    try {
      if (!isOpen) return;

      if (!onClose || typeof onClose !== 'function') {
        logError('onClose inválido:', typeof onClose);
      }
      if (!onConfirm || typeof onConfirm !== 'function') {
        logError('onConfirm inválido:', typeof onConfirm);
      }
      if (financesData && !Array.isArray(financesData)) {
        logError('financesData debe ser un array');
      }

      log('Modal abierto con props válidos');
    } catch (error) {
      logError('Error validando props:', error);
    }
  }, [isOpen, onClose, onConfirm, financesData]);

  // ========== CALCULATE DAILY STATS ==========
  const dailyStats = useMemo(() => {
    try {
      if (!financesData || !Array.isArray(financesData) || financesData.length === 0) {
        return {
          totalAmount: 0,
          byConcept: {},
          totalRecords: 0,
          finances: [],
        };
      }

      const stats = {
        totalAmount: 0,
        byConcept: {},
        totalRecords: financesData.length,
        finances: financesData,
      };

      financesData.forEach(finance => {
        try {
          const amount = validateAmount(finance.amount);
          stats.totalAmount += amount;

          const concept = finance.concept || 'OTRO';
          if (!stats.byConcept[concept]) {
            stats.byConcept[concept] = { count: 0, total: 0 };
          }
          stats.byConcept[concept].count += 1;
          stats.byConcept[concept].total += amount;
        } catch (error) {
          logError('Error procesando finance:', error);
        }
      });

      return stats;
    } catch (error) {
      logError('Error calculando stats:', error);
      return {
        totalAmount: 0,
        byConcept: {},
        totalRecords: 0,
        finances: [],
      };
    }
  }, [financesData]);

  // ========== HANDLE CONFIRM ==========
  const handleConfirm = useCallback(() => {
    try {
      if (!onConfirm || typeof onConfirm !== 'function') {
        logError('onConfirm no es una función válida');
        return;
      }
      if (!reportType || typeof reportType !== 'string') {
        logError('reportType inválido:', reportType);
        return;
      }

      log('Generando PDF con tipo:', reportType);
      onConfirm(reportType);
      setReportType('summary');
    } catch (error) {
      logError('Error en handleConfirm:', error);
    }
  }, [onConfirm, reportType]);

  // ========== DETERMINE REPORT TITLE AND DATE ==========
  if (!isOpen) return null;

  const isRangeReport = !!(dateRange && typeof dateRange === 'string');
  const reportTitle = isRangeReport ? 'Reporte de Ingresos' : 'Reporte Diario de Ingresos';

  let displayDate = 'Sin fecha';
  try {
    if (dateRange && typeof dateRange === 'string') {
      displayDate = dateRange;
    } else if (selectedDate && typeof selectedDate === 'string') {
      displayDate = new Date(selectedDate).toLocaleDateString('es-CO');
    }
  } catch (error) {
    logError('Error formateando fecha:', error);
  }

  let selectedDateFormatted = '';
  try {
    if (selectedDate && typeof selectedDate === 'string') {
      const [year, month, day] = selectedDate.split('T')[0].split('-').map(Number);
      const dateObj = new Date(year, month - 1, day);
      if (!isNaN(dateObj.getTime())) {
        selectedDateFormatted = dateObj.toLocaleDateString('es-CO', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      }
    }
  } catch (error) {
    logError('Error formateando selectedDate:', error);
    selectedDateFormatted = selectedDate || 'Sin fecha';
  }

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-300" onClick={onClose}>
      <div 
        className="bg-slate-50 dark:bg-slate-900 rounded-[2rem] w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300 border border-slate-200 dark:border-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700/50 p-6 z-10 shrink-0 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <FileText className="w-5 h-5" />
            </div>
            {reportTitle}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:text-slate-300 dark:hover:bg-slate-700 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          
          {/* FECHA INFO */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-start gap-4">
               <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <Calendar className="w-5 h-5" />
               </div>
               <div>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Período del reporte</p>
                  <p className="font-medium text-slate-800 dark:text-white text-sm">
                    {escapeHtml(displayDate)}
                  </p>
                  {selectedDateFormatted && (
                    <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mt-1 capitalize">
                      {escapeHtml(selectedDateFormatted)}
                    </p>
                  )}
               </div>
            </div>
          </div>

          {/* RESUMEN RÁPIDO */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
               <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                     <DollarSign className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Recaudado</span>
               </div>
               <div className="text-3xl font-bold text-slate-800 dark:text-white mt-1">
                 ${(dailyStats.totalAmount || 0).toLocaleString('es-CO')}
               </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
               <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                     <BarChart3 className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Registros</span>
               </div>
               <div className="text-3xl font-bold text-slate-800 dark:text-white mt-1">
                 {dailyStats.totalRecords}
               </div>
            </div>
          </div>

          {/* DESGLOSE POR CONCEPTO */}
          {Object.keys(dailyStats.byConcept).length > 0 && (
            <div className="mb-8">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-3 uppercase tracking-wider pl-1">Desglose por Concepto</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {Object.entries(dailyStats.byConcept).map(([key, value]) => (
                  <div key={key} className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 leading-tight">
                        {CONCEPT_MAP[key] || key}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {value.count} registros
                      </p>
                    </div>
                    <p className="font-bold text-indigo-600 dark:text-indigo-400 mt-2 text-base">
                      ${(value.total || 0).toLocaleString('es-CO')}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* OPCIONES DE REPORTE */}
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-1 uppercase tracking-wider pl-1">Tipo de Reporte a Generar</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 pl-1">Selecciona el nivel de detalle que deseas ver en el PDF.</p>
            
            <div className="space-y-3">
              {/* OPCIÓN 1: SOLO RESUMEN */}
              <label 
                className={`flex gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                  reportType === 'summary' 
                    ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-500/10 dark:border-indigo-500' 
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700'
                }`}
              >
                <div className="shrink-0 pt-1">
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                    reportType === 'summary' ? 'border-indigo-500 bg-indigo-500' : 'border-slate-300 dark:border-slate-600'
                  }`}>
                    {reportType === 'summary' && <Check className="w-3.5 h-3.5 text-white" />}
                  </div>
                  <input
                    type="radio"
                    name="reportType"
                    value="summary"
                    checked={reportType === 'summary'}
                    onChange={(e) => setReportType(e.target.value)}
                    className="sr-only"
                  />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <LayoutGrid className={`w-5 h-5 ${reportType === 'summary' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
                    <span className={`font-semibold ${reportType === 'summary' ? 'text-indigo-900 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-300'}`}>Solo Resumen</span>
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Muestra únicamente los totales agrupados por categoría. Ideal para una vista rápida y ejecutiva.
                  </p>
                </div>
              </label>

              {/* OPCIÓN 2: CON MIEMBROS */}
              <label 
                className={`flex gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                  reportType === 'members' 
                    ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-500/10 dark:border-indigo-500' 
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700'
                }`}
              >
                <div className="shrink-0 pt-1">
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                    reportType === 'members' ? 'border-indigo-500 bg-indigo-500' : 'border-slate-300 dark:border-slate-600'
                  }`}>
                    {reportType === 'members' && <Check className="w-3.5 h-3.5 text-white" />}
                  </div>
                  <input
                    type="radio"
                    name="reportType"
                    value="members"
                    checked={reportType === 'members'}
                    onChange={(e) => setReportType(e.target.value)}
                    className="sr-only"
                  />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <List className={`w-5 h-5 ${reportType === 'members' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
                    <span className={`font-semibold ${reportType === 'members' ? 'text-indigo-900 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-300'}`}>Reporte Detallado</span>
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Incluye el resumen y una tabla detallada con cada aportante individualmente.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* PREVISUALIZACIÓN DE TABLA */}
          {reportType === 'members' && dailyStats.finances && dailyStats.finances.length > 0 && (
            <div className="mt-6 animate-in slide-in-from-top-4 duration-300">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-3 uppercase tracking-wider pl-1 flex items-center gap-2">
                <Users className="w-4 h-4 text-slate-500" />
                Previsualización ({dailyStats.finances.length} registros)
              </h3>
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                <div className="overflow-x-auto max-h-[300px]">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10 backdrop-blur-sm">
                      <tr>
                        <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Miembro</th>
                        <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Concepto</th>
                        <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300 text-right">Monto</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                      {dailyStats.finances.map((finance, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors">
                          <td className="px-4 py-3 text-slate-800 dark:text-slate-300 font-medium">
                            {escapeHtml(finance.memberName || 'Sin nombre')}
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600">
                               {CONCEPT_MAP[finance.concept] || escapeHtml(finance.concept)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-indigo-600 dark:text-indigo-400">
                            ${(validateAmount(finance.amount) || 0).toLocaleString('es-CO')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* FOOTER */}
        <div className="p-4 md:p-6 bg-slate-50 border-t border-slate-200 dark:bg-slate-900 dark:border-slate-800 flex flex-col-reverse sm:flex-row justify-end gap-3 shrink-0 rounded-b-[2rem]">
          <button
            onClick={onClose}
            className="px-6 py-3 rounded-xl font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700 transition-all text-sm w-full sm:w-auto text-center"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            className="px-8 py-3 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-500/30 transition-all text-sm w-full sm:w-auto text-center flex items-center justify-center gap-2"
          >
            <FileText className="w-4 h-4" />
            Generar PDF ({reportType === 'summary' ? 'Resumen' : 'Detallado'})
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalDailyReportOptions;