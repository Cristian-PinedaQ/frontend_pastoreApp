// 📅 ModalDailyReportOptions.jsx - VERSIÓN GENÉRICA PARA CUALQUIER REPORTE
// ✅ Funciona con un solo día, rango de fechas o sin fechas
// ✅ Opciones más visibles y fáciles de seleccionar
// ✅ Debugging incorporado
// ✅ Estilos mejorados

import React, { useState, useMemo, useEffect } from 'react';

const ModalDailyReportOptions = ({ isOpen, onClose, onConfirm, selectedDate, financesData, dateRange }) => {
  const [reportType, setReportType] = useState('summary'); // 'summary' o 'members'

  // Debug: Log cuando cambia el reportType
  useEffect(() => {
    console.log('📊 [DEBUG] reportType cambió a:', reportType);
  }, [reportType]);

  // Debug: Log cuando abre el modal
  useEffect(() => {
    if (isOpen) {
      console.log('📊 [DEBUG] Modal abierto');
      console.log('📊 [DEBUG] financesData:', financesData);
      console.log('📊 [DEBUG] selectedDate:', selectedDate);
      console.log('📊 [DEBUG] dateRange:', dateRange);
    }
  }, [isOpen, financesData, selectedDate, dateRange]);

  const dailyStats = useMemo(() => {
    if (!financesData || financesData.length === 0) {
      return {
        totalAmount: 0,
        byConcept: {},
        totalRecords: 0,
      };
    }

    const stats = {
      totalAmount: 0,
      byConcept: {},
      totalRecords: financesData.length,
      finances: financesData,
    };

    financesData.forEach(finance => {
      stats.totalAmount += finance.amount || 0;

      if (!stats.byConcept[finance.concept]) {
        stats.byConcept[finance.concept] = { count: 0, total: 0 };
      }
      stats.byConcept[finance.concept].count += 1;
      stats.byConcept[finance.concept].total += finance.amount || 0;
    });

    console.log('📊 [DEBUG] stats calculado:', stats);
    return stats;
  }, [financesData]);

  const handleConfirm = () => {
    console.log('📊 [DEBUG] Generando PDF con tipo:', reportType);
    onConfirm(reportType);
    setReportType('summary');
  };

  if (!isOpen) return null;

  // Determinar si es un rango o un solo día
  const isRangeReport = !!dateRange;
  const reportTitle = isRangeReport ? 'Reporte de Ingresos' : 'Reporte Diario de Ingresos';
  const displayDate = dateRange || (selectedDate ? new Date(selectedDate).toLocaleDateString('es-CO') : 'Sin fecha');

  const conceptMap = {
    'TITHE': '💵 Diezmo',
    'OFFERING': '🎁 Ofrenda',
    'SEED_OFFERING': '🌱 Ofrenda de Semilla',
    'BUILDING_FUND': '🏗️ Fondo de Construcción',
  };

  return (
    <div className="modal-overlay-daily-report" onClick={onClose}>
      <div className="modal-container-daily-report" onClick={(e) => e.stopPropagation()}>
        {/* HEADER */}
        <div className="modal-header-daily-report">
          <h2>📅 {reportTitle}</h2>
          <button className="modal-close-btn-daily" onClick={onClose}>✕</button>
        </div>

        {/* BODY */}
        <div className="modal-body-daily-report">
          {/* Fecha del reporte */}
          <div className="modal-date-info-daily-report">
            <h3>📆 Período del Reporte</h3>
            <p>{displayDate}</p>
          </div>
          {/* Fecha Seleccionada */}
          <div className="date-info-daily">
            <p className="date-selected">
              📆 Fecha Seleccionada: <strong>{new Date(selectedDate).toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</strong>
            </p>
          </div>

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
                    <p className="concept-name-daily">{conceptMap[key] || key}</p>
                    <p className="concept-count-daily">{value.count} registros</p>
                    <p className="concept-amount-daily">
                      $ {(value.total || 0).toLocaleString('es-CO')}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SECCIÓN IMPORTANTE: OPCIONES DE REPORTE */}
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
                    onChange={(e) => {
                      console.log('📊 [DEBUG] Seleccionando:', e.target.value);
                      setReportType(e.target.value);
                    }}
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
                    onChange={(e) => {
                      console.log('📊 [DEBUG] Seleccionando:', e.target.value);
                      setReportType(e.target.value);
                    }}
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
                        <td>{finance.memberName || 'Sin nombre'}</td>
                        <td>{conceptMap[finance.concept] || finance.concept}</td>
                        <td>$ {(finance.amount || 0).toLocaleString('es-CO')}</td>
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
          <button className="btn-cancel-daily" onClick={onClose}>
            ✕ Cancelar
          </button>
          <button 
            className="btn-generate-daily" 
            onClick={handleConfirm}
            disabled={false}
          >
            📄 Generar PDF ({reportType === 'summary' ? 'Resumen' : 'Con Miembros'})
          </button>
        </div>

        <style jsx>{`
          /* ========== OVERLAY ========== */
          .modal-overlay-daily-report {
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
            animation: fadeInDaily 0.3s ease-in-out;
          }

          /* ========== CONTAINER ========== */
          .modal-container-daily-report {
            background: white;
            border-radius: 12px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            width: 100%;
            max-width: 650px;
            max-height: 90vh;
            overflow-y: auto;
            animation: slideInUpDaily 0.3s ease-in-out;
            display: flex;
            flex-direction: column;
          }

          /* ========== HEADER ========== */
          .modal-header-daily-report {
            background: linear-gradient(135deg, #059669 0%, #10b981 100%);
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
          }

          /* ========== FECHA ========== */
          .date-info-daily {
            background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
            border: 1px solid #a7f3d0;
            padding: 16px;
            border-radius: 8px;
            margin-bottom: 20px;
          }

          .date-selected {
            margin: 0;
            font-size: 14px;
            color: #065f46;
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
            background: white;
            border: 1px solid #e5e7eb;
            padding: 16px;
            border-radius: 8px;
            display: flex;
            align-items: center;
            gap: 12px;
            transition: all 0.2s;
          }

          .summary-card-daily:hover {
            border-color: #10b981;
            box-shadow: 0 4px 12px rgba(16, 185, 129, 0.1);
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
            color: #999;
            font-weight: 600;
            text-transform: uppercase;
          }

          .summary-value-daily {
            margin: 4px 0 0;
            font-size: 16px;
            font-weight: 700;
            color: #059669;
          }

          /* ========== DESGLOSE POR CONCEPTO ========== */
          .concept-breakdown-daily {
            margin-bottom: 24px;
          }

          .concept-breakdown-daily h3 {
            margin: 0 0 12px;
            font-size: 14px;
            font-weight: 600;
            color: #333;
          }

          .concepts-grid-daily {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
            gap: 12px;
          }

          .concept-item-daily {
            background: #f9fafb;
            border: 1px solid #e5e7eb;
            padding: 12px;
            border-radius: 8px;
            text-align: center;
            transition: all 0.2s;
          }

          .concept-item-daily:hover {
            border-color: #10b981;
            background: #ecfdf5;
          }

          .concept-name-daily {
            margin: 0 0 4px;
            font-size: 12px;
            font-weight: 600;
            color: #333;
          }

          .concept-count-daily {
            margin: 0;
            font-size: 11px;
            color: #999;
          }

          .concept-amount-daily {
            margin: 6px 0 0;
            font-size: 13px;
            font-weight: 700;
            color: #059669;
          }

          /* ========== OPCIONES DE REPORTE (IMPORTANTE) ========== */
          .report-options-section-daily {
            background: #f9fafb;
            border: 2px solid #e5e7eb;
            padding: 20px;
            border-radius: 12px;
            margin-bottom: 24px;
          }

          .report-options-title-daily {
            margin: 0 0 8px;
            font-size: 16px;
            font-weight: 700;
            color: #333;
          }

          .report-options-subtitle-daily {
            margin: 0 0 16px;
            font-size: 12px;
            color: #666;
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
            border: 2px solid #e5e7eb;
            border-radius: 10px;
            cursor: pointer;
            transition: all 0.3s ease;
            background: white;
          }

          .report-option-label-daily:hover {
            border-color: #10b981;
            background: #f0fdf4;
          }

          .report-option-label-daily.active-daily {
            border-color: #059669;
            background: #ecfdf5;
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
            background-color: white;
            border: 2px solid #d1d5db;
            border-radius: 50%;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .radio-input-daily:checked + .radio-checkmark-daily {
            border-color: #059669;
            background-color: #059669;
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
            color: #333;
          }

          .option-info-daily p {
            margin: 4px 0 0;
            font-size: 12px;
            color: #666;
          }

          /* ========== PREVISUALIZACIÓN ========== */
          .preview-section-daily {
            margin-bottom: 20px;
            background: #f9fafb;
            padding: 16px;
            border-radius: 8px;
            border: 1px solid #e5e7eb;
          }

          .preview-section-daily h3 {
            margin: 0 0 12px;
            font-size: 13px;
            font-weight: 600;
            color: #333;
          }

          .table-scroll-daily {
            overflow-x: auto;
            max-height: 300px;
            overflow-y: auto;
            border: 1px solid #e5e7eb;
            border-radius: 6px;
          }

          .members-preview-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 11px;
            background: white;
          }

          .members-preview-table thead {
            background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
            position: sticky;
            top: 0;
          }

          .members-preview-table th {
            padding: 8px;
            text-align: left;
            font-weight: 600;
            color: #065f46;
            border-bottom: 1px solid #a7f3d0;
          }

          .members-preview-table td {
            padding: 8px;
            border-bottom: 1px solid #e5e7eb;
          }

          .members-preview-table tbody tr:hover {
            background: #f0fdf4;
          }

          /* ========== FOOTER ========== */
          .modal-footer-daily-report {
            display: flex;
            gap: 12px;
            justify-content: flex-end;
            padding: 16px 24px;
            border-top: 1px solid #e5e7eb;
            background: #f9fafb;
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
            background: #e5e7eb;
            color: #333;
          }

          .btn-cancel-daily:hover {
            background: #d1d5db;
          }

          .btn-generate-daily {
            background: linear-gradient(135deg, #059669 0%, #10b981 100%);
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
          }
        `}</style>
      </div>
    </div>
  );
};

export default ModalDailyReportOptions;