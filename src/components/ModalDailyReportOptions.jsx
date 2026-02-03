// ============================================
// ModalDailyReportOptions.jsx - CON MODO OSCURO
// Modal para opciones de reporte + Dark Mode
// ============================================

import React, { useState, useMemo, useEffect, useCallback } from 'react';

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

// ========== DETECTAR PREFERENCIA DE MODO OSCURO ==========
const detectSystemDarkMode = () => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
};

const ModalDailyReportOptions = ({ isOpen, onClose, onConfirm, selectedDate, financesData, dateRange }) => {
  const [reportType, setReportType] = useState('summary');
  const [darkMode, setDarkMode] = useState(false);

  // ========== INICIALIZAR MODO OSCURO ==========
  useEffect(() => {
    const prefersDark = detectSystemDarkMode();
    setDarkMode(prefersDark);
    log('Sistema prefiere:', prefersDark ? 'OSCURO' : 'CLARO');
  }, []);

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

  // ========== REPORT TYPE CHANGE ==========
  useEffect(() => {
    if (isOpen) {
      log('reportType cambió a:', reportType);
    }
  }, [reportType, isOpen]);

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

      log('Stats calculado', { totalRecords: stats.totalRecords, totalAmount: stats.totalAmount });
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

  // ========== HANDLE CLOSE ==========
  const handleClose = useCallback(() => {
    try {
      if (onClose && typeof onClose === 'function') {
        onClose();
      }
    } catch (error) {
      logError('Error en handleClose:', error);
    }
  }, [onClose]);

  // ========== HANDLE REPORT TYPE CHANGE ==========
  const handleReportTypeChange = useCallback((value) => {
    try {
      if (value === 'summary' || value === 'members') {
        log('Tipo de reporte seleccionado:', value);
        setReportType(value);
      }
    } catch (error) {
      logError('Error cambiando reportType:', error);
    }
  }, []);

  // ========== TOGGLE DARK MODE ==========
  const toggleDarkMode = useCallback(() => {
    setDarkMode(prev => {
      const newMode = !prev;
      log('Modo oscuro toggled a:', newMode);
      return newMode;
    });
  }, []);

  if (!isOpen) return null;

  // ========== DETERMINE REPORT TITLE AND DATE ==========
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
      const dateObj = new Date(selectedDate);
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
    <div 
      className={`modal-overlay-daily-report ${darkMode ? 'dark-mode' : ''}`}
      onClick={handleClose}
    >
      <div 
        className="modal-container-daily-report" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER CON TOGGLE DARK MODE */}
        <div className="modal-header-daily-report">
          <h2>{reportTitle}</h2>
          <div className="header-controls">
            <button 
              className="btn-dark-mode-toggle" 
              onClick={toggleDarkMode}
              aria-label="Cambiar a modo oscuro"
              title={darkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            >
              {darkMode ? '☀️' : '🌙'}
            </button>
            <button 
              className="modal-close-btn-daily" 
              onClick={handleClose} 
              aria-label="Cerrar modal"
            >
              ✕
            </button>
          </div>
        </div>

        {/* BODY */}
        <div className="modal-body-daily-report">
          {/* Fecha del reporte */}
          <div className="modal-date-info-daily-report">
            <h3>📆 Período del Reporte</h3>
            <p>{escapeHtml(displayDate)}</p>
          </div>

          {/* Fecha Seleccionada */}
          {selectedDateFormatted && (
            <div className="date-info-daily">
              <p className="date-selected">
                📆 Fecha Seleccionada: <strong>{escapeHtml(selectedDateFormatted)}</strong>
              </p>
            </div>
          )}

          {/* Resumen Rápido */}
          <div className="quick-summary-daily">
            <div className="summary-card-daily">
              <div className="summary-icon-daily">💰</div>
              <div className="summary-content-daily">
                <p className="summary-label-daily">Total Recaudado</p>
                <p className="summary-value-daily">
                  $ {(dailyStats.totalAmount || 0).toLocaleString('es-CO')}
                </p>
              </div>
            </div>

            <div className="summary-card-daily">
              <div className="summary-icon-daily">📊</div>
              <div className="summary-content-daily">
                <p className="summary-label-daily">Total Registros</p>
                <p className="summary-value-daily">{dailyStats.totalRecords}</p>
              </div>
            </div>
          </div>

          {/* Desglose por Concepto */}
          {Object.keys(dailyStats.byConcept).length > 0 && (
            <div className="concept-breakdown-daily">
              <h3>Desglose por Concepto</h3>
              <div className="concepts-grid-daily">
                {Object.entries(dailyStats.byConcept).map(([key, value]) => (
                  <div key={key} className="concept-item-daily">
                    <p className="concept-name-daily">{CONCEPT_MAP[key] || key}</p>
                    <p className="concept-count-daily">{value.count} registros</p>
                    <p className="concept-amount-daily">
                      $ {(value.total || 0).toLocaleString('es-CO')}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* OPCIONES DE REPORTE */}
          <div className="report-options-section-daily">
            <h3 className="report-options-title-daily">Tipo de Reporte</h3>
            <p className="report-options-subtitle-daily">Selecciona cómo deseas ver los datos en el PDF</p>

            {/* OPCIÓN 1: SOLO RESUMEN */}
            <div className="report-option-wrapper-daily">
              <label className={`report-option-label-daily ${reportType === 'summary' ? 'active-daily' : ''}`}>
                <div className="radio-wrapper-daily">
                  <input
                    type="radio"
                    name="reportType"
                    value="summary"
                    checked={reportType === 'summary'}
                    onChange={(e) => handleReportTypeChange(e.target.value)}
                    className="radio-input-daily"
                  />
                  <span className="radio-checkmark-daily"></span>
                </div>
                <div className="option-info-daily">
                  <h4>📋 Solo Resumen</h4>
                  <p>Mostrar solo totales por categoría</p>
                </div>
              </label>
            </div>

            {/* OPCIÓN 2: CON MIEMBROS */}
            <div className="report-option-wrapper-daily">
              <label className={`report-option-label-daily ${reportType === 'members' ? 'active-daily' : ''}`}>
                <div className="radio-wrapper-daily">
                  <input
                    type="radio"
                    name="reportType"
                    value="members"
                    checked={reportType === 'members'}
                    onChange={(e) => handleReportTypeChange(e.target.value)}
                    className="radio-input-daily"
                  />
                  <span className="radio-checkmark-daily"></span>
                </div>
                <div className="option-info-daily">
                  <h4>👥 Con Lista de Miembros</h4>
                  <p>Incluir tabla detallada de todos los aportes</p>
                </div>
              </label>
            </div>
          </div>

          {/* PREVISUALIZACIÓN SI SELECCIONA CON MIEMBROS */}
          {reportType === 'members' && dailyStats.finances && dailyStats.finances.length > 0 && (
            <div className="preview-section-daily">
              <h3>Previsualización ({dailyStats.finances.length} registros)</h3>
              <div className="table-scroll-daily">
                <table className="members-preview-table">
                  <thead>
                    <tr>
                      <th>Miembro</th>
                      <th>Concepto</th>
                      <th>Monto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dailyStats.finances.map((finance, idx) => (
                      <tr key={idx}>
                        <td>{escapeHtml(finance.memberName || 'Sin nombre')}</td>
                        <td>{CONCEPT_MAP[finance.concept] || escapeHtml(finance.concept)}</td>
                        <td>$ {(validateAmount(finance.amount) || 0).toLocaleString('es-CO')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="modal-footer-daily-report">
          <button className="btn-cancel-daily" onClick={handleClose} aria-label="Cancelar">
            ✕ Cancelar
          </button>
          <button
            className="btn-generate-daily"
            onClick={handleConfirm}
            disabled={false}
            aria-label="Generar PDF"
          >
            📄 Generar PDF ({reportType === 'summary' ? 'Resumen' : 'Con Miembros'})
          </button>
        </div>

        <style>{`
          /* ========== CSS VARIABLES POR TEMA ========== */
          .modal-overlay-daily-report {
            --bg-primary: #ffffff;
            --bg-secondary: #f9fafb;
            --bg-tertiary: #ecfdf5;
            --text-primary: #1f2937;
            --text-secondary: #666666;
            --text-tertiary: #999999;
            --border-color: #e5e7eb;
            --border-light: #a7f3d0;
            --accent-primary: #059669;
            --accent-secondary: #10b981;
            --overlay-bg: rgba(0, 0, 0, 0.5);
            --card-hover-bg: #f0fdf4;
            --header-start: #059669;
            --header-end: #10b981;
            --summary-bg: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
            --summary-border: #a7f3d0;
            --summary-text: #065f46;
          }

          .modal-overlay-daily-report.dark-mode {
            --bg-primary: #1a1a1a;
            --bg-secondary: #2d2d2d;
            --bg-tertiary: #0d4a3b;
            --text-primary: #f5f5f5;
            --text-secondary: #b0b0b0;
            --text-tertiary: #808080;
            --border-color: #404040;
            --border-light: #1a5d4a;
            --accent-primary: #10b981;
            --accent-secondary: #34d399;
            --overlay-bg: rgba(0, 0, 0, 0.8);
            --card-hover-bg: #0f3d2f;
            --header-start: #059669;
            --header-end: #10b981;
            --summary-bg: linear-gradient(135deg, #0d4a3b 0%, #1a5d4a 100%);
            --summary-border: #1a5d4a;
            --summary-text: #86efac;
          }

          /* ========== OVERLAY ========== */
          .modal-overlay-daily-report {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: var(--overlay-bg);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            padding: 20px;
            animation: fadeInDaily 0.3s ease-in-out;
          }

          /* ========== CONTAINER ========== */
          .modal-container-daily-report {
            background: var(--bg-primary);
            border-radius: 12px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            width: 100%;
            max-width: 650px;
            max-height: 90vh;
            overflow-y: auto;
            animation: slideInUpDaily 0.3s ease-in-out;
            display: flex;
            flex-direction: column;
            color: var(--text-primary);
            transition: all 0.3s ease;
          }

          /* ========== HEADER ========== */
          .modal-header-daily-report {
            background: linear-gradient(135deg, var(--header-start) 0%, var(--header-end) 100%);
            color: white;
            padding: 20px 24px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-radius: 12px 12px 0 0;
            position: sticky;
            top: 0;
            z-index: 10;
          }

          .modal-header-daily-report h2 {
            margin: 0;
            font-size: 18px;
            font-weight: 700;
          }

          .header-controls {
            display: flex;
            gap: 8px;
            align-items: center;
          }

          .btn-dark-mode-toggle {
            background: rgba(255, 255, 255, 0.15);
            border: 2px solid rgba(255, 255, 255, 0.3);
            color: white;
            font-size: 18px;
            cursor: pointer;
            padding: 8px 12px;
            width: 36px;
            height: 36px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 6px;
            transition: all 0.2s ease;
          }

          .btn-dark-mode-toggle:hover {
            background-color: rgba(255, 255, 255, 0.25);
            border-color: rgba(255, 255, 255, 0.5);
            transform: scale(1.05);
          }

          .modal-close-btn-daily {
            background: none;
            border: none;
            color: white;
            font-size: 24px;
            cursor: pointer;
            padding: 0;
            width: 36px;
            height: 36px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 6px;
            transition: background-color 0.2s;
          }

          .modal-close-btn-daily:hover {
            background-color: rgba(255, 255, 255, 0.2);
          }

          /* ========== BODY ========== */
          .modal-body-daily-report {
            flex: 1;
            padding: 24px;
            overflow-y: auto;
            background: var(--bg-primary);
          }

          /* ========== FECHA ========== */
          .modal-date-info-daily-report {
            margin-bottom: 20px;
          }

          .modal-date-info-daily-report h3 {
            margin: 0 0 8px;
            font-size: 14px;
            font-weight: 600;
            color: var(--text-primary);
          }

          .modal-date-info-daily-report p {
            margin: 0;
            font-size: 13px;
            color: var(--text-secondary);
          }

          .date-info-daily {
            background: var(--summary-bg);
            border: 1px solid var(--summary-border);
            padding: 16px;
            border-radius: 8px;
            margin-bottom: 20px;
            transition: all 0.2s ease;
          }

          .date-selected {
            margin: 0;
            font-size: 14px;
            color: var(--summary-text);
            font-weight: 500;
          }

          /* ========== RESUMEN RÁPIDO ========== */
          .quick-summary-daily {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
            margin-bottom: 24px;
          }

          .summary-card-daily {
            background: var(--bg-secondary);
            border: 1px solid var(--border-color);
            padding: 16px;
            border-radius: 8px;
            display: flex;
            align-items: center;
            gap: 12px;
            transition: all 0.2s;
          }

          .summary-card-daily:hover {
            border-color: var(--accent-secondary);
            box-shadow: 0 4px 12px rgba(16, 185, 129, 0.1);
            background: var(--card-hover-bg);
          }

          .summary-icon-daily {
            font-size: 28px;
          }

          .summary-content-daily {
            flex: 1;
          }

          .summary-label-daily {
            margin: 0;
            font-size: 11px;
            color: var(--text-tertiary);
            font-weight: 600;
            text-transform: uppercase;
          }

          .summary-value-daily {
            margin: 4px 0 0;
            font-size: 16px;
            font-weight: 700;
            color: var(--accent-primary);
          }

          /* ========== DESGLOSE POR CONCEPTO ========== */
          .concept-breakdown-daily {
            margin-bottom: 24px;
          }

          .concept-breakdown-daily h3 {
            margin: 0 0 12px;
            font-size: 14px;
            font-weight: 600;
            color: var(--text-primary);
          }

          .concepts-grid-daily {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
            gap: 12px;
          }

          .concept-item-daily {
            background: var(--bg-secondary);
            border: 1px solid var(--border-color);
            padding: 12px;
            border-radius: 8px;
            text-align: center;
            transition: all 0.2s;
          }

          .concept-item-daily:hover {
            border-color: var(--accent-secondary);
            background: var(--card-hover-bg);
          }

          .concept-name-daily {
            margin: 0 0 4px;
            font-size: 12px;
            font-weight: 600;
            color: var(--text-primary);
          }

          .concept-count-daily {
            margin: 0;
            font-size: 11px;
            color: var(--text-tertiary);
          }

          .concept-amount-daily {
            margin: 6px 0 0;
            font-size: 13px;
            font-weight: 700;
            color: var(--accent-primary);
          }

          /* ========== OPCIONES DE REPORTE ========== */
          .report-options-section-daily {
            background: var(--bg-secondary);
            border: 2px solid var(--border-color);
            padding: 20px;
            border-radius: 12px;
            margin-bottom: 24px;
            transition: all 0.2s ease;
          }

          .report-options-title-daily {
            margin: 0 0 8px;
            font-size: 16px;
            font-weight: 700;
            color: var(--text-primary);
          }

          .report-options-subtitle-daily {
            margin: 0 0 16px;
            font-size: 12px;
            color: var(--text-secondary);
          }

          /* ========== OPCIÓN INDIVIDUAL ========== */
          .report-option-wrapper-daily {
            margin-bottom: 12px;
          }

          .report-option-label-daily {
            display: flex;
            align-items: center;
            gap: 16px;
            padding: 16px;
            border: 2px solid var(--border-color);
            border-radius: 10px;
            cursor: pointer;
            transition: all 0.3s ease;
            background: var(--bg-primary);
          }

          .report-option-label-daily:hover {
            border-color: var(--accent-secondary);
            background: var(--card-hover-bg);
          }

          .report-option-label-daily.active-daily {
            border-color: var(--accent-primary);
            background: var(--bg-tertiary);
            box-shadow: 0 4px 12px rgba(5, 150, 105, 0.15);
          }

          /* ========== RADIO BUTTON PERSONALIZADO ========== */
          .radio-wrapper-daily {
            position: relative;
            width: 24px;
            height: 24px;
            flex-shrink: 0;
          }

          .radio-input-daily {
            opacity: 0;
            width: 100%;
            height: 100%;
            cursor: pointer;
            margin: 0;
            padding: 0;
          }

          .radio-checkmark-daily {
            position: absolute;
            top: 0;
            left: 0;
            width: 24px;
            height: 24px;
            background-color: var(--bg-primary);
            border: 2px solid var(--border-color);
            border-radius: 50%;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .radio-input-daily:checked + .radio-checkmark-daily {
            border-color: var(--accent-primary);
            background-color: var(--accent-primary);
          }

          .radio-input-daily:checked + .radio-checkmark-daily:after {
            content: '✓';
            color: white;
            font-weight: bold;
            font-size: 14px;
          }

          .option-info-daily {
            flex: 1;
          }

          .option-info-daily h4 {
            margin: 0;
            font-size: 14px;
            font-weight: 600;
            color: var(--text-primary);
          }

          .option-info-daily p {
            margin: 4px 0 0;
            font-size: 12px;
            color: var(--text-secondary);
          }

          /* ========== PREVISUALIZACIÓN ========== */
          .preview-section-daily {
            margin-bottom: 20px;
            background: var(--bg-secondary);
            padding: 16px;
            border-radius: 8px;
            border: 1px solid var(--border-color);
          }

          .preview-section-daily h3 {
            margin: 0 0 12px;
            font-size: 13px;
            font-weight: 600;
            color: var(--text-primary);
          }

          .table-scroll-daily {
            overflow-x: auto;
            max-height: 300px;
            overflow-y: auto;
            border: 1px solid var(--border-color);
            border-radius: 6px;
          }

          .members-preview-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 11px;
            background: var(--bg-primary);
          }

          .members-preview-table thead {
            background: var(--summary-bg);
            position: sticky;
            top: 0;
          }

          .members-preview-table th {
            padding: 8px;
            text-align: left;
            font-weight: 600;
            color: var(--summary-text);
            border-bottom: 1px solid var(--summary-border);
          }

          .members-preview-table td {
            padding: 8px;
            border-bottom: 1px solid var(--border-color);
            color: var(--text-primary);
          }

          .members-preview-table tbody tr:hover {
            background: var(--card-hover-bg);
          }

          /* ========== FOOTER ========== */
          .modal-footer-daily-report {
            display: flex;
            gap: 12px;
            justify-content: flex-end;
            padding: 16px 24px;
            border-top: 1px solid var(--border-color);
            background: var(--bg-secondary);
            border-radius: 0 0 12px 12px;
            position: sticky;
            bottom: 0;
          }

          .btn-cancel-daily,
          .btn-generate-daily {
            padding: 10px 20px;
            border: none;
            border-radius: 8px;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
          }

          .btn-cancel-daily {
            background: var(--border-color);
            color: var(--text-primary);
          }

          .btn-cancel-daily:hover {
            background: var(--border-light);
            opacity: 0.8;
          }

          .btn-generate-daily {
            background: linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%);
            color: white;
          }

          .btn-generate-daily:hover {
            box-shadow: 0 4px 12px rgba(5, 150, 105, 0.3);
            transform: translateY(-2px);
          }

          .btn-generate-daily:active {
            transform: translateY(0);
          }

          /* ========== ANIMACIONES ========== */
          @keyframes fadeInDaily {
            from { opacity: 0; }
            to { opacity: 1; }
          }

          @keyframes slideInUpDaily {
            from {
              transform: translateY(20px);
              opacity: 0;
            }
            to {
              transform: translateY(0);
              opacity: 1;
            }
          }

          /* ========== SCROLLBAR PERSONALIZADO ========== */
          .modal-container-daily-report::-webkit-scrollbar {
            width: 8px;
          }

          .modal-container-daily-report::-webkit-scrollbar-track {
            background: var(--bg-secondary);
          }

          .modal-container-daily-report::-webkit-scrollbar-thumb {
            background: var(--border-color);
            border-radius: 4px;
          }

          .modal-container-daily-report::-webkit-scrollbar-thumb:hover {
            background: var(--accent-secondary);
          }

          /* ========== RESPONSIVE ========== */
          @media (max-width: 640px) {
            .modal-body-daily-report {
              padding: 16px;
            }

            .modal-footer-daily-report {
              flex-direction: column;
            }

            .btn-cancel-daily,
            .btn-generate-daily {
              width: 100%;
            }

            .quick-summary-daily {
              grid-template-columns: 1fr;
            }

            .report-option-label-daily {
              flex-direction: column;
              text-align: center;
            }

            .radio-wrapper-daily {
              margin: 0 auto;
            }

            .header-controls {
              gap: 4px;
            }

            .btn-dark-mode-toggle,
            .modal-close-btn-daily {
              width: 32px;
              height: 32px;
              font-size: 16px;
            }
          }
        `}</style>
      </div>
    </div>
  );
};

export default ModalDailyReportOptions;