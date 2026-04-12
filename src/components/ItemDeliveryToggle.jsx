// ============================================================
// ItemDeliveryToggle.jsx
// Toggle para marcar si el artículo fue entregado al participante
// Endpoint: PATCH /api/v1/activity-contribution/{id}/deliver
// ============================================================

import React, { useState } from "react";
import apiService from "../apiService";
import { useConfirmation } from "../context/ConfirmationContext";

const ItemDeliveryToggle = ({
  contributionId,         // ID de la contribución (ActivityContributionManager.id)
  initialDelivered = false, // valor actual de itemDelivered
  memberName = "",
  onDeliveryChange,       // callback(contributionId, newValue) → refresca la lista padre
  disabled = false,
  compact = false,        // modo compacto para usar dentro de tablas
}) => {
  const confirm = useConfirmation();
  const [delivered, setDelivered] = useState(initialDelivered);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [animating, setAnimating] = useState(false);

  const handleToggle = async () => {
    if (loading || disabled) return;

    const newValue = !delivered;
    const isConfirmed = await confirm({
      title: newValue ? "Confirmar Entrega" : "¿Rectificar Entrega?",
      message: newValue 
        ? `¿Confirmas que el artículo fue entregado a ${memberName || "este participante"}?`
        : `¿Estás seguro de que deseas desmarcar la entrega del artículo para ${memberName || "este participante"}?`,
      type: "info",
      confirmLabel: newValue ? "SÍ, Entregado" : "SÍ, Rectificar",
      onConfirm: async () => {
        setLoading(true);
        setError("");
        setAnimating(true);

        try {
          await apiService.request(
            `/activity-contribution/${contributionId}/deliver`,
            {
              method: "PATCH",
              body: JSON.stringify({ delivered: newValue }),
            }
          );

          setDelivered(newValue);
          if (onDeliveryChange) onDeliveryChange(contributionId, newValue);
        } catch (err) {
          const msg = err?.data?.error || err?.message || "Error al actualizar la entrega";
          setError(msg);
          setTimeout(() => setError(""), 4000);
        } finally {
          setLoading(false);
          setTimeout(() => setAnimating(false), 400);
        }
      }
    });
  };

  // ── Modo compacto: solo el badge/botón para usar en tablas ──────────────
  if (compact) {
    return (
      <div className="idt-compact">
        <button
          className={`idt-compact-btn ${delivered ? "idt-compact-btn--delivered" : "idt-compact-btn--pending"} ${animating ? "idt-animating" : ""}`}
          onClick={handleToggle}
          disabled={loading || disabled}
          title={
            disabled
              ? "Sin permiso para editar"
              : delivered
              ? "Haz clic para marcar como NO entregado"
              : "Haz clic para marcar como entregado"
          }
        >
          {loading ? (
            <span className="idt-spinner" />
          ) : delivered ? (
            <>📦 Entregado</>
          ) : (
            <>🕐 Pendiente</>
          )}
        </button>
        {error && <span className="idt-compact-error" title={error}>⚠️</span>}

        <style>{`
          .idt-compact { display: inline-flex; align-items: center; gap: 4px; }
          .idt-compact-btn {
            display: inline-flex; align-items: center; gap: 5px;
            padding: 3px 10px; border-radius: 20px; border: none;
            font-size: 0.76em; font-weight: 600; cursor: pointer;
            transition: all 0.2s ease; white-space: nowrap;
          }
          .idt-compact-btn--delivered {
            background: #d4edda; color: #155724; border: 1px solid #c3e6cb;
          }
          .idt-compact-btn--delivered:hover:not(:disabled) {
            background: #c3e6cb; transform: scale(1.03);
          }
          .idt-compact-btn--pending {
            background: #fff3cd; color: #856404; border: 1px solid #ffeeba;
          }
          .idt-compact-btn--pending:hover:not(:disabled) {
            background: #ffeeba; transform: scale(1.03);
          }
          .idt-compact-btn:disabled { opacity: 0.6; cursor: not-allowed; }
          .idt-animating { animation: idt-pulse 0.35s ease; }
          @keyframes idt-pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.08)} }
          .idt-spinner {
            width: 10px; height: 10px; border: 2px solid currentColor;
            border-top-color: transparent; border-radius: 50%;
            animation: idt-spin 0.6s linear infinite; display: inline-block;
          }
          @keyframes idt-spin { to { transform: rotate(360deg); } }
          .idt-compact-error { font-size: 0.85em; cursor: help; }
        `}</style>
      </div>
    );
  }

  // ── Modo completo: card dentro del detalle del participante ─────────────
  return (
    <div className={`idt-card ${delivered ? "idt-card--delivered" : "idt-card--pending"}`}>
      <div className="idt-card__icon">
        {loading ? (
          <span className="idt-spinner idt-spinner--lg" />
        ) : delivered ? (
          "📦"
        ) : (
          "🕐"
        )}
      </div>

      <div className="idt-card__body">
        <div className="idt-card__label">Entrega del artículo</div>
        <div className="idt-card__status">
          {delivered ? "Artículo entregado al participante" : "Pendiente de entrega"}
        </div>
        {error && <div className="idt-card__error">⚠️ {error}</div>}
      </div>

      <div className="idt-card__action">
        <button
          className={`idt-toggle-btn ${delivered ? "idt-toggle-btn--undo" : "idt-toggle-btn--deliver"}`}
          onClick={handleToggle}
          disabled={loading || disabled}
          title={disabled ? "Sin permiso para editar" : ""}
        >
          {loading
            ? "Guardando..."
            : delivered
            ? "↩ Desmarcar"
            : "✅ Marcar entregado"}
        </button>
      </div>

      <style>{`
        .idt-card {
          display: flex; align-items: center; gap: 14px;
          padding: 14px 18px; border-radius: 10px;
          border: 1.5px solid; transition: all 0.25s ease;
          margin: 8px 0;
        }
        .idt-card--delivered {
          background: linear-gradient(135deg, #f0fff4 0%, #d4edda 100%);
          border-color: #81c995;
        }
        .idt-card--pending {
          background: linear-gradient(135deg, #fffbf0 0%, #fff3cd 100%);
          border-color: #f0c040;
        }
        .idt-card__icon { font-size: 1.6em; flex-shrink: 0; }
        .idt-card__body { flex: 1; }
        .idt-card__label {
          font-size: 0.75em; font-weight: 600; text-transform: uppercase;
          letter-spacing: 0.05em; color: #6c757d; margin-bottom: 2px;
        }
        .idt-card__status { font-size: 0.92em; font-weight: 600; color: #2d3748; }
        .idt-card__error { font-size: 0.78em; color: #dc3545; margin-top: 4px; }
        .idt-toggle-btn {
          padding: 7px 16px; border-radius: 8px; border: none;
          font-size: 0.82em; font-weight: 600; cursor: pointer;
          transition: all 0.2s ease; white-space: nowrap;
        }
        .idt-toggle-btn--deliver {
          background: #28a745; color: #fff;
        }
        .idt-toggle-btn--deliver:hover:not(:disabled) {
          background: #218838; transform: translateY(-1px);
          box-shadow: 0 3px 8px rgba(40,167,69,0.35);
        }
        .idt-toggle-btn--undo {
          background: #fff; color: #6c757d;
          border: 1.5px solid #dee2e6 !important;
        }
        .idt-toggle-btn--undo:hover:not(:disabled) {
          background: #f8f9fa; color: #495057;
        }
        .idt-toggle-btn:disabled { opacity: 0.55; cursor: not-allowed; }
        .idt-spinner--lg {
          display: inline-block; width: 22px; height: 22px;
          border: 3px solid #dee2e6; border-top-color: #28a745;
          border-radius: 50%; animation: idt-spin 0.7s linear infinite;
        }
        @keyframes idt-spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default ItemDeliveryToggle;