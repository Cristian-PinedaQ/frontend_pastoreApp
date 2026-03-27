// ============================================================
// ActivityDeliveryStats.jsx
// Panel de estadísticas de entregas para la ficha de actividad
// Muestra cuántos artículos se entregaron y cuántos faltan
// ============================================================

import React, { useMemo } from "react";

/**
 * @param {Array}   participants  - array de ActivityContributionWithLeaderDTO
 *                                  Cada item debe tener: isFullyPaid, itemDelivered
 * @param {string}  activityName  - nombre de la actividad (opcional)
 * @param {boolean} compact       - modo compacto para cabecera de lista
 */
const ActivityDeliveryStats = ({ participants = [], activityName = "", compact = false }) => {
  const stats = useMemo(() => {
    const total = participants.length;

    // Artículos entregados (independiente del estado de pago)
    const delivered = participants.filter((p) => p.itemDelivered === true).length;

    // Pagos completos (isFullyPaid)
    const fullyPaid = participants.filter((p) => p.isFullyPaid === true).length;

    // Pagado + entregado
    const paidAndDelivered = participants.filter(
      (p) => p.isFullyPaid && p.itemDelivered
    ).length;

    // Pagado pero NO entregado → artículos por entregar prioritarios
    const paidNotDelivered = participants.filter(
      (p) => p.isFullyPaid && !p.itemDelivered
    ).length;

    // Entregado pero NO pagado → caso irregular
    const deliveredNotPaid = participants.filter(
      (p) => !p.isFullyPaid && p.itemDelivered
    ).length;

    // Ni pagado ni entregado
    const neitherPaidNorDelivered = participants.filter(
      (p) => !p.isFullyPaid && !p.itemDelivered
    ).length;

    const pendingDelivery = total - delivered;
    const deliveryPct = total > 0 ? Math.round((delivered / total) * 100) : 0;
    const paymentPct = total > 0 ? Math.round((fullyPaid / total) * 100) : 0;

    return {
      total,
      delivered,
      pendingDelivery,
      fullyPaid,
      paidAndDelivered,
      paidNotDelivered,
      deliveredNotPaid,
      neitherPaidNorDelivered,
      deliveryPct,
      paymentPct,
    };
  }, [participants]);

  if (stats.total === 0) return null;

  // ── Modo compacto: fila de chips ─────────────────────────────────────────
  if (compact) {
    return (
      <div className="ads-compact">
        <span className="ads-chip ads-chip--total" title="Total inscritos">
          👥 {stats.total}
        </span>
        <span className="ads-chip ads-chip--paid" title="Pagos completos">
          💳 {stats.fullyPaid} pagados
        </span>
        <span className="ads-chip ads-chip--delivered" title="Artículos entregados">
          📦 {stats.delivered} entregados
        </span>
        {stats.paidNotDelivered > 0 && (
          <span
            className="ads-chip ads-chip--alert"
            title="Pagaron pero aún no recibieron el artículo"
          >
            ⚠️ {stats.paidNotDelivered} por entregar
          </span>
        )}

        <style>{`
          .ads-compact { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
          .ads-chip {
            display: inline-flex; align-items: center; gap: 4px;
            padding: 3px 10px; border-radius: 20px;
            font-size: 0.76em; font-weight: 600; white-space: nowrap;
          }
          .ads-chip--total   { background: #e9ecef; color: #495057; }
          .ads-chip--paid    { background: #cce5ff; color: #004085; }
          .ads-chip--delivered { background: #d4edda; color: #155724; }
          .ads-chip--alert   { background: #fff3cd; color: #856404; }
        `}</style>
      </div>
    );
  }

  // ── Modo completo: panel de estadísticas ─────────────────────────────────
  return (
    <div className="ads-panel">
      {/* Título */}
      <div className="ads-panel__header">
        <span className="ads-panel__title-icon">📦</span>
        <h4 className="ads-panel__title">Resumen de Entregas</h4>
        {activityName && (
          <span className="ads-panel__activity">{activityName}</span>
        )}
      </div>

      {/* Cards de métricas */}
      <div className="ads-metrics">
        {/* Total inscritos */}
        <div className="ads-metric ads-metric--neutral">
          <div className="ads-metric__icon">👥</div>
          <div className="ads-metric__value">{stats.total}</div>
          <div className="ads-metric__label">Inscritos</div>
        </div>

        {/* Pagos completos */}
        <div className="ads-metric ads-metric--blue">
          <div className="ads-metric__icon">💳</div>
          <div className="ads-metric__value">{stats.fullyPaid}</div>
          <div className="ads-metric__label">Pagos completos</div>
          <div className="ads-metric__pct">{stats.paymentPct}%</div>
        </div>

        {/* Artículos entregados */}
        <div className="ads-metric ads-metric--green">
          <div className="ads-metric__icon">📦</div>
          <div className="ads-metric__value">{stats.delivered}</div>
          <div className="ads-metric__label">Entregados</div>
          <div className="ads-metric__pct">{stats.deliveryPct}%</div>
        </div>

        {/* Pendientes de entrega */}
        <div className={`ads-metric ${stats.pendingDelivery > 0 ? "ads-metric--yellow" : "ads-metric--green"}`}>
          <div className="ads-metric__icon">
            {stats.pendingDelivery > 0 ? "🕐" : "✅"}
          </div>
          <div className="ads-metric__value">{stats.pendingDelivery}</div>
          <div className="ads-metric__label">Sin entregar</div>
        </div>
      </div>

      {/* Barras de progreso */}
      <div className="ads-bars">
        {/* Barra de pagos */}
        <div className="ads-bar-group">
          <div className="ads-bar-header">
            <span className="ads-bar-label">💳 Pagos completos</span>
            <span className="ads-bar-count">
              {stats.fullyPaid} / {stats.total}
            </span>
          </div>
          <div className="ads-bar-track">
            <div
              className="ads-bar-fill ads-bar-fill--blue"
              style={{ width: `${stats.paymentPct}%` }}
            />
          </div>
        </div>

        {/* Barra de entregas */}
        <div className="ads-bar-group">
          <div className="ads-bar-header">
            <span className="ads-bar-label">📦 Artículos entregados</span>
            <span className="ads-bar-count">
              {stats.delivered} / {stats.total}
            </span>
          </div>
          <div className="ads-bar-track">
            <div
              className="ads-bar-fill ads-bar-fill--green"
              style={{ width: `${stats.deliveryPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Tabla de desglose */}
      <div className="ads-breakdown">
        <div className="ads-breakdown__title">Desglose</div>
        <div className="ads-breakdown__grid">
          <div className="ads-breakdown__item ads-breakdown__item--success">
            <span className="ads-breakdown__icon">✅</span>
            <span className="ads-breakdown__desc">Pagado y entregado</span>
            <span className="ads-breakdown__count">{stats.paidAndDelivered}</span>
          </div>
          <div className={`ads-breakdown__item ${stats.paidNotDelivered > 0 ? "ads-breakdown__item--warning" : "ads-breakdown__item--ok"}`}>
            <span className="ads-breakdown__icon">
              {stats.paidNotDelivered > 0 ? "⚠️" : "✔️"}
            </span>
            <span className="ads-breakdown__desc">Pagado, artículo pendiente</span>
            <span className="ads-breakdown__count">{stats.paidNotDelivered}</span>
          </div>
          {stats.deliveredNotPaid > 0 && (
            <div className="ads-breakdown__item ads-breakdown__item--info">
              <span className="ads-breakdown__icon">📋</span>
              <span className="ads-breakdown__desc">Entregado sin pago completo</span>
              <span className="ads-breakdown__count">{stats.deliveredNotPaid}</span>
            </div>
          )}
          <div className="ads-breakdown__item ads-breakdown__item--danger">
            <span className="ads-breakdown__icon">🕐</span>
            <span className="ads-breakdown__desc">Sin pago ni entrega</span>
            <span className="ads-breakdown__count">{stats.neitherPaidNorDelivered}</span>
          </div>
        </div>
      </div>

      {/* Alerta si hay pagados pero sin entregar */}
      {stats.paidNotDelivered > 0 && (
        <div className="ads-alert">
          <span className="ads-alert__icon">📬</span>
          <div className="ads-alert__text">
            <strong>{stats.paidNotDelivered} participante{stats.paidNotDelivered !== 1 ? "s" : ""}</strong>
            {" "}completaron su pago y aún no {stats.paidNotDelivered !== 1 ? "han recibido" : "ha recibido"} el artículo.
          </div>
        </div>
      )}

      <style>{`
        /* ── Panel ─────────────────────────────────────────────────────── */
        .ads-panel {
          background: #fff;
          border: 1px solid #e9ecef;
          border-radius: 12px;
          padding: 18px 20px;
          margin: 14px 0;
          box-shadow: 0 2px 8px rgba(0,0,0,0.06);
        }

        /* ── Header ─────────────────────────────────────────────────────── */
        .ads-panel__header {
          display: flex; align-items: center; gap: 8px; margin-bottom: 16px;
        }
        .ads-panel__title-icon { font-size: 1.25em; }
        .ads-panel__title {
          margin: 0; font-size: 1em; font-weight: 700; color: #2d3748;
        }
        .ads-panel__activity {
          margin-left: auto; font-size: 0.78em; color: #6c757d;
          font-style: italic; max-width: 160px;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }

        /* ── Métricas ───────────────────────────────────────────────────── */
        .ads-metrics {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
          margin-bottom: 18px;
        }
        @media (max-width: 580px) {
          .ads-metrics { grid-template-columns: repeat(2, 1fr); }
        }
        .ads-metric {
          border-radius: 10px; padding: 12px 10px; text-align: center;
          border: 1px solid transparent; position: relative;
        }
        .ads-metric--neutral { background: #f8f9fa; border-color: #dee2e6; }
        .ads-metric--blue    { background: #e8f4fd; border-color: #bee3f8; }
        .ads-metric--green   { background: #f0fff4; border-color: #9ae6b4; }
        .ads-metric--yellow  { background: #fffbf0; border-color: #f6e05e; }

        .ads-metric__icon  { font-size: 1.3em; margin-bottom: 4px; }
        .ads-metric__value { font-size: 1.7em; font-weight: 800; line-height: 1; margin-bottom: 2px; color: #2d3748; }
        .ads-metric__label { font-size: 0.7em; color: #6c757d; font-weight: 500; }
        .ads-metric__pct {
          position: absolute; top: 6px; right: 8px;
          font-size: 0.65em; font-weight: 700;
          background: rgba(0,0,0,0.08); color: #4a5568;
          padding: 1px 5px; border-radius: 10px;
        }

        /* ── Barras ──────────────────────────────────────────────────────── */
        .ads-bars { display: flex; flex-direction: column; gap: 10px; margin-bottom: 16px; }
        .ads-bar-group {}
        .ads-bar-header {
          display: flex; justify-content: space-between; align-items: center;
          margin-bottom: 4px;
        }
        .ads-bar-label { font-size: 0.78em; font-weight: 600; color: #4a5568; }
        .ads-bar-count { font-size: 0.75em; color: #6c757d; font-weight: 500; }
        .ads-bar-track {
          height: 8px; background: #e9ecef; border-radius: 99px; overflow: hidden;
        }
        .ads-bar-fill {
          height: 100%; border-radius: 99px;
          transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .ads-bar-fill--blue  { background: linear-gradient(90deg, #4299e1, #3182ce); }
        .ads-bar-fill--green { background: linear-gradient(90deg, #48bb78, #38a169); }

        /* ── Desglose ─────────────────────────────────────────────────────── */
        .ads-breakdown { margin-bottom: 14px; }
        .ads-breakdown__title {
          font-size: 0.72em; font-weight: 700; text-transform: uppercase;
          letter-spacing: 0.06em; color: #6c757d; margin-bottom: 8px;
        }
        .ads-breakdown__grid { display: flex; flex-direction: column; gap: 6px; }
        .ads-breakdown__item {
          display: flex; align-items: center; gap: 8px;
          padding: 7px 12px; border-radius: 7px; border-left: 3px solid;
        }
        .ads-breakdown__item--success { background: #f0fff4; border-color: #48bb78; }
        .ads-breakdown__item--warning { background: #fffbf0; border-color: #f6ad55; }
        .ads-breakdown__item--ok      { background: #f7fafc; border-color: #cbd5e0; }
        .ads-breakdown__item--info    { background: #ebf8ff; border-color: #63b3ed; }
        .ads-breakdown__item--danger  { background: #fff5f5; border-color: #fc8181; }
        .ads-breakdown__icon  { font-size: 1em; flex-shrink: 0; }
        .ads-breakdown__desc  { flex: 1; font-size: 0.8em; color: #4a5568; font-weight: 500; }
        .ads-breakdown__count {
          font-size: 0.9em; font-weight: 700; color: #2d3748;
          min-width: 24px; text-align: right;
        }

        /* ── Alerta ──────────────────────────────────────────────────────── */
        .ads-alert {
          display: flex; align-items: center; gap: 10px;
          background: #fff3cd; border: 1px solid #ffc107;
          border-radius: 8px; padding: 10px 14px;
        }
        .ads-alert__icon { font-size: 1.2em; flex-shrink: 0; }
        .ads-alert__text { font-size: 0.82em; color: #856404; }
      `}</style>
    </div>
  );
};

export default ActivityDeliveryStats;