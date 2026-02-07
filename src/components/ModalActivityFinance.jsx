// ============================================
// ModalActivityFinance.jsx
// Modal para ver información financiera detallada de una actividad
// ============================================

import React, { useState } from "react";
import "../css/ModalActivityFinance.css";

const ModalActivityFinance = ({ 
  isOpen, 
  onClose, 
  activity, 
  balance 
}) => {
  const [activeTab, setActiveTab] = useState("summary");
  //const [loading, setLoading] = useState(false);

  if (!isOpen || !activity || !balance) return null;

  // Calcular porcentajes
  const complianceRate = balance.compliancePercentage || 0;
  const paidPercentage = balance.totalCommitted > 0 
    ? (balance.totalPaid / balance.totalCommitted) * 100 
    : 0;
  const pendingPercentage = 100 - paidPercentage;

  // Calcular costos vs ingresos
  const costRatio = balance.totalPaid > 0 
    ? (balance.totalCosts / balance.totalPaid) * 100 
    : 0;
  const profitability = balance.totalPaid - balance.totalCosts;

  return (
    <div className="modal-finance-overlay">
      <div className="modal-finance">
        <div className="modal-finance__header">
          <div className="modal-finance__header-content">
            <h2>💰 Finanzas - {activity.activityName}</h2>
            <div className={`finance-status ${profitability >= 0 ? 'profitable' : 'loss'}`}>
              {profitability >= 0 ? '💰 Rentable' : '📉 En Pérdida'}
            </div>
          </div>
          <button className="modal-finance__close" onClick={onClose}>
            ×
          </button>
        </div>

        {/* TABS */}
        <div className="modal-finance__tabs">
          <button 
            className={`tab ${activeTab === 'summary' ? 'active' : ''}`}
            onClick={() => setActiveTab('summary')}
          >
            📊 Resumen
          </button>
          <button 
            className={`tab ${activeTab === 'participants' ? 'active' : ''}`}
            onClick={() => setActiveTab('participants')}
          >
            👥 Participantes
          </button>
          <button 
            className={`tab ${activeTab === 'costs' ? 'active' : ''}`}
            onClick={() => setActiveTab('costs')}
          >
            💸 Costos
          </button>
          <button 
            className={`tab ${activeTab === 'analysis' ? 'active' : ''}`}
            onClick={() => setActiveTab('analysis')}
          >
            📈 Análisis
          </button>
        </div>

        <div className="modal-finance__content">
          {/* RESUMEN */}
          {activeTab === "summary" && (
            <div className="tab-content summary-tab">
              <div className="summary-grid">
                {/* CARD 1: INGRESOS */}
                <div className="summary-card income">
                  <div className="card-icon">💵</div>
                  <div className="card-content">
                    <h3>Ingresos</h3>
                    <div className="card-amount">
                      ${balance.totalCommitted?.toLocaleString('es-CO') || "0"}
                    </div>
                    <div className="card-subtitle">
                      Total comprometido
                    </div>
                    <div className="card-details">
                      <div className="detail-item">
                        <span className="detail-label">Pagado:</span>
                        <span className="detail-value paid">
                          ${balance.totalPaid?.toLocaleString('es-CO') || "0"}
                        </span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Pendiente:</span>
                        <span className="detail-value pending">
                          ${balance.balance?.toLocaleString('es-CO') || "0"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* CARD 2: COSTOS */}
                <div className="summary-card costs">
                  <div className="card-icon">💸</div>
                  <div className="card-content">
                    <h3>Costos</h3>
                    <div className="card-amount">
                      ${balance.totalCosts?.toLocaleString('es-CO') || "0"}
                    </div>
                    <div className="card-subtitle">
                      Total de gastos
                    </div>
                    <div className="card-details">
                      <div className="detail-item">
                        <span className="detail-label">Relación:</span>
                        <span className={`detail-value ${costRatio <= 50 ? 'good' : 'warning'}`}>
                          {costRatio.toFixed(1)}%
                        </span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Balance:</span>
                        <span className={`detail-value ${profitability >= 0 ? 'profitable' : 'loss'}`}>
                          ${profitability.toLocaleString('es-CO')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* CARD 3: PARTICIPANTES */}
                <div className="summary-card participants">
                  <div className="card-icon">👥</div>
                  <div className="card-content">
                    <h3>Participantes</h3>
                    <div className="card-amount">
                      {balance.participantCount || 0}
                    </div>
                    <div className="card-subtitle">
                      Total inscritos
                    </div>
                    <div className="card-details">
                      <div className="detail-item">
                        <span className="detail-label">Pagado total:</span>
                        <span className="detail-value">
                          {balance.fullyPaidParticipants || 0}
                        </span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Parcial:</span>
                        <span className="detail-value">
                          {balance.partiallyPaidParticipants || 0}
                        </span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Pendiente:</span>
                        <span className="detail-value">
                          {balance.pendingParticipants || 0}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* CARD 4: CUMPLIMIENTO */}
                <div className="summary-card compliance">
                  <div className="card-icon">📈</div>
                  <div className="card-content">
                    <h3>Cumplimiento</h3>
                    <div className="card-amount">
                      {complianceRate.toFixed(1)}%
                    </div>
                    <div className="card-subtitle">
                      Tasa de pago
                    </div>
                    <div className="compliance-chart">
                      <div className="chart-bar">
                        <div 
                          className="chart-fill paid"
                          style={{ width: `${paidPercentage}%` }}
                        >
                          <span className="chart-label">
                            Pagado ({paidPercentage.toFixed(1)}%)
                          </span>
                        </div>
                        <div 
                          className="chart-fill pending"
                          style={{ width: `${pendingPercentage}%` }}
                        >
                          <span className="chart-label">
                            Pendiente ({pendingPercentage.toFixed(1)}%)
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* RESUMEN RÁPIDO */}
              <div className="quick-summary">
                <h4>📋 Resumen Rápido</h4>
                <div className="summary-list">
                  <div className="summary-item">
                    <span className="item-label">Precio por persona:</span>
                    <span className="item-value">
                      ${activity.price?.toLocaleString('es-CO') || "0"}
                    </span>
                  </div>
                  <div className="summary-item">
                    <span className="item-label">Participantes:</span>
                    <span className="item-value">
                      {balance.participantCount || 0} / {activity.quantity || "∞"}
                    </span>
                  </div>
                  <div className="summary-item">
                    <span className="item-label">Ingresos potenciales:</span>
                    <span className="item-value">
                      ${((activity.price || 0) * (activity.quantity || 0)).toLocaleString('es-CO')}
                    </span>
                  </div>
                  <div className="summary-item">
                    <span className="item-label">Rentabilidad:</span>
                    <span className={`item-value ${profitability >= 0 ? 'profitable' : 'loss'}`}>
                      {profitability >= 0 ? '💰 ' : '📉 '}
                      ${Math.abs(profitability).toLocaleString('es-CO')}
                      {profitability >= 0 ? ' de ganancia' : ' de pérdida'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* PARTICIPANTES */}
          {activeTab === "participants" && (
            <div className="tab-content participants-tab">
              <div className="participants-breakdown">
                <h4>📊 Distribución de Participantes</h4>
                <div className="breakdown-grid">
                  <div className="breakdown-card">
                    <div className="breakdown-icon paid">✅</div>
                    <div className="breakdown-content">
                      <div className="breakdown-count">
                        {balance.fullyPaidParticipants || 0}
                      </div>
                      <div className="breakdown-label">Pagado Total</div>
                      <div className="breakdown-percentage">
                        {balance.participantCount ? 
                          ((balance.fullyPaidParticipants / balance.participantCount) * 100).toFixed(1) : 0}%
                      </div>
                    </div>
                  </div>

                  <div className="breakdown-card">
                    <div className="breakdown-icon partial">🟡</div>
                    <div className="breakdown-content">
                      <div className="breakdown-count">
                        {balance.partiallyPaidParticipants || 0}
                      </div>
                      <div className="breakdown-label">Pago Parcial</div>
                      <div className="breakdown-percentage">
                        {balance.participantCount ? 
                          ((balance.partiallyPaidParticipants / balance.participantCount) * 100).toFixed(1) : 0}%
                      </div>
                    </div>
                  </div>

                  <div className="breakdown-card">
                    <div className="breakdown-icon pending">⏳</div>
                    <div className="breakdown-content">
                      <div className="breakdown-count">
                        {balance.pendingParticipants || 0}
                      </div>
                      <div className="breakdown-label">Pendiente</div>
                      <div className="breakdown-percentage">
                        {balance.participantCount ? 
                          ((balance.pendingParticipants / balance.participantCount) * 100).toFixed(1) : 0}%
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ESTADÍSTICAS DE PAGO */}
              <div className="payment-stats">
                <h4>💳 Estadísticas de Pago</h4>
                <div className="stats-grid">
                  <div className="stat-item">
                    <div className="stat-icon">💰</div>
                    <div className="stat-content">
                      <div className="stat-label">Pago promedio</div>
                      <div className="stat-value">
                        ${balance.participantCount > 0 ? 
                          (balance.totalPaid / balance.participantCount).toLocaleString('es-CO', {maximumFractionDigits: 0}) : "0"}
                      </div>
                    </div>
                  </div>

                  <div className="stat-item">
                    <div className="stat-icon">🎯</div>
                    <div className="stat-content">
                      <div className="stat-label">Meta por participante</div>
                      <div className="stat-value">
                        ${activity.price?.toLocaleString('es-CO') || "0"}
                      </div>
                    </div>
                  </div>

                  <div className="stat-item">
                    <div className="stat-icon">📊</div>
                    <div className="stat-content">
                      <div className="stat-label">Cumplimiento promedio</div>
                      <div className="stat-value">
                        {complianceRate.toFixed(1)}%
                      </div>
                    </div>
                  </div>

                  <div className="stat-item">
                    <div className="stat-icon">⚡</div>
                    <div className="stat-content">
                      <div className="stat-label">Eficiencia de cobro</div>
                      <div className="stat-value">
                        {balance.totalCommitted > 0 ? 
                          ((balance.totalPaid / balance.totalCommitted) * 100).toFixed(1) : 0}%
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* COSTOS */}
          {activeTab === "costs" && (
            <div className="tab-content costs-tab">
              <div className="costs-analysis">
                <h4>📉 Análisis de Costos</h4>
                
                <div className="cost-breakdown">
                  <div className="cost-item">
                    <div className="cost-label">Ingresos totales:</div>
                    <div className="cost-value income">
                      ${balance.totalPaid?.toLocaleString('es-CO') || "0"}
                    </div>
                  </div>
                  
                  <div className="cost-item">
                    <div className="cost-label">Costos totales:</div>
                    <div className="cost-value expense">
                      ${balance.totalCosts?.toLocaleString('es-CO') || "0"}
                    </div>
                  </div>
                  
                  <div className="cost-item total">
                    <div className="cost-label">Balance final:</div>
                    <div className={`cost-value ${profitability >= 0 ? 'profitable' : 'loss'}`}>
                      ${profitability.toLocaleString('es-CO')}
                    </div>
                  </div>
                </div>

                {/* RELACIÓN COSTOS/INGRESOS */}
                <div className="cost-ratio">
                  <h5>📊 Relación Costos/Ingresos</h5>
                  <div className="ratio-bar">
                    <div 
                      className="ratio-fill income"
                      style={{ width: `${100 - Math.min(costRatio, 100)}%` }}
                    >
                      <span className="ratio-label">
                        Ingresos ({Math.max(0, 100 - costRatio).toFixed(1)}%)
                      </span>
                    </div>
                    <div 
                      className="ratio-fill cost"
                      style={{ width: `${Math.min(costRatio, 100)}%` }}
                    >
                      <span className="ratio-label">
                        Costos ({Math.min(costRatio, 100).toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                  
                  <div className="ratio-analysis">
                    {costRatio <= 30 ? (
                      <div className="analysis-good">
                        ✅ <strong>Excelente</strong> - Los costos representan menos del 30% de los ingresos
                      </div>
                    ) : costRatio <= 50 ? (
                      <div className="analysis-ok">
                        ⚠️ <strong>Aceptable</strong> - Los costos están entre 30-50% de los ingresos
                      </div>
                    ) : costRatio <= 70 ? (
                      <div className="analysis-warning">
                        ⚠️ <strong>Alerta</strong> - Los costos superan el 50% de los ingresos
                      </div>
                    ) : (
                      <div className="analysis-danger">
                        ❌ <strong>Crítico</strong> - Los costos superan el 70% de los ingresos
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ANÁLISIS */}
          {activeTab === "analysis" && (
            <div className="tab-content analysis-tab">
              <div className="analysis-cards">
                <div className="analysis-card">
                  <div className="analysis-icon">📈</div>
                  <div className="analysis-content">
                    <h5>Eficiencia Financiera</h5>
                    <div className="analysis-value">
                      {balance.totalCommitted > 0 ? 
                        ((balance.totalPaid / balance.totalCommitted) * 100).toFixed(1) : 0}%
                    </div>
                    <div className="analysis-desc">
                      Porcentaje de ingresos comprometidos que se han recibido
                    </div>
                  </div>
                </div>

                <div className="analysis-card">
                  <div className="analysis-icon">🎯</div>
                  <div className="analysis-content">
                    <h5>Meta de Participación</h5>
                    <div className="analysis-value">
                      {activity.quantity ? 
                        ((balance.participantCount / activity.quantity) * 100).toFixed(1) : '∞'}%
                    </div>
                    <div className="analysis-desc">
                      Capacidad utilizada de la actividad
                    </div>
                  </div>
                </div>

                <div className="analysis-card">
                  <div className="analysis-icon">💰</div>
                  <div className="analysis-content">
                    <h5>Rentabilidad por Participante</h5>
                    <div className="analysis-value">
                      ${balance.participantCount > 0 ? 
                        (profitability / balance.participantCount).toLocaleString('es-CO', {maximumFractionDigits: 0}) : "0"}
                    </div>
                    <div className="analysis-desc">
                      Ganancia/pérdida promedio por participante
                    </div>
                  </div>
                </div>

                <div className="analysis-card">
                  <div className="analysis-icon">⚡</div>
                  <div className="analysis-content">
                    <h5>Velocidad de Pago</h5>
                    <div className="analysis-value">
                      {complianceRate.toFixed(1)}%
                    </div>
                    <div className="analysis-desc">
                      Tasa promedio de cumplimiento de pagos
                    </div>
                  </div>
                </div>
              </div>

              {/* RECOMENDACIONES */}
              <div className="recommendations">
                <h4>💡 Recomendaciones</h4>
                <ul className="recommendations-list">
                  {balance.pendingParticipants > 0 && (
                    <li>
                      <span className="rec-icon">📢</span>
                      <span className="rec-text">
                        Enviar recordatorios a los {balance.pendingParticipants} participantes pendientes
                      </span>
                    </li>
                  )}
                  
                  {balance.partiallyPaidParticipants > 0 && (
                    <li>
                      <span className="rec-icon">💳</span>
                      <span className="rec-text">
                        Seguimiento a los {balance.partiallyPaidParticipants} participantes con pago parcial
                      </span>
                    </li>
                  )}
                  
                  {costRatio > 50 && (
                    <li>
                      <span className="rec-icon">💸</span>
                      <span className="rec-text">
                        Revisar costos (representan el {costRatio.toFixed(1)}% de los ingresos)
                      </span>
                    </li>
                  )}
                  
                  {balance.participantCount < (activity.quantity || 0) * 0.5 && activity.quantity && (
                    <li>
                      <span className="rec-icon">👥</span>
                      <span className="rec-text">
                        Promocionar actividad ({balance.participantCount}/{activity.quantity} participantes)
                      </span>
                    </li>
                  )}
                  
                  {profitability < 0 && (
                    <li>
                      <span className="rec-icon">📉</span>
                      <span className="rec-text">
                        Actividad con pérdida de ${Math.abs(profitability).toLocaleString('es-CO')}
                      </span>
                    </li>
                  )}
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* ACCIONES */}
        <div className="modal-finance__actions">
          <button className="btn btn-secondary" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalActivityFinance;