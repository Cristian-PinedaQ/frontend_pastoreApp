import React, { useState } from "react";
import { 
  CheckCircle2, 
  Clock, 
  PackageCheck, 
  Undo2, 
  AlertCircle, 
  Loader2,
  ChevronRight
} from "lucide-react";
import apiService from "../apiService";
import { useConfirmation } from "../context/ConfirmationContext";

const ItemDeliveryToggle = ({
  contributionId,
  initialDelivered = false,
  memberName = "",
  onDeliveryChange,
  disabled = false,
  compact = false,
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
          const msg = err?.data?.error || err?.message || "Error al actualizar";
          setError(msg);
          setTimeout(() => setError(""), 4000);
        } finally {
          setLoading(false);
          setTimeout(() => setAnimating(false), 400);
        }
      }
    });
  };

  // --- MODO COMPACTO (Tablas) ---
  if (compact) {
    return (
      <div className="inline-flex items-center gap-2 group">
        <button
          onClick={handleToggle}
          disabled={loading || disabled}
          className={`
            relative flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold tracking-tight transition-all duration-300
            ${delivered 
              ? "bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100 ring-4 ring-emerald-500/5" 
              : "bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200 ring-4 ring-transparent"}
            active:scale-90 disabled:opacity-50
          `}
        >
          {loading ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : delivered ? (
            <PackageCheck className="w-3.5 h-3.5" />
          ) : (
            <Clock className="w-3.5 h-3.5" />
          )}
          {delivered ? "Entregado" : "Pendiente"}
        </button>
        {error && <AlertCircle className="w-4 h-4 text-red-500 animate-bounce" title={error} />}
      </div>
    );
  }

  // --- MODO CARD (Detalle) ---
  return (
    <div className={`
      relative overflow-hidden flex items-center gap-5 p-5 rounded-2xl border transition-all duration-500 my-4
      ${delivered 
        ? "bg-white border-emerald-100 shadow-sm shadow-emerald-100/50" 
        : "bg-white border-slate-100 shadow-sm shadow-slate-100/50"}
    `}>
      {/* Decoración lateral de color */}
      <div className={`absolute left-0 top-0 bottom-0 w-1.5 transition-colors duration-500 ${delivered ? "bg-emerald-500" : "bg-slate-300"}`} />

      <div className={`
        relative flex items-center justify-center w-14 h-14 rounded-2xl transition-all duration-500
        ${delivered ? "bg-emerald-50 text-emerald-600 rotate-0" : "bg-slate-50 text-slate-400 -rotate-6"}
      `}>
        {loading ? (
          <Loader2 className="w-7 h-7 animate-spin" />
        ) : delivered ? (
          <PackageCheck className="w-8 h-8" />
        ) : (
          <Clock className="w-8 h-8" />
        )}
      </div>

      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className={`text-[10px] font-black uppercase tracking-[0.15em] ${delivered ? "text-emerald-500" : "text-slate-400"}`}>
            Status de Entrega
          </span>
          {delivered && <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />}
        </div>
        <h4 className="text-base font-bold text-slate-800 leading-tight">
          {delivered ? "Artículo entregado" : "Esperando entrega"}
        </h4>
        <p className="text-sm text-slate-500 mt-0.5">
          {delivered 
            ? `Se confirmó la recepción de ${memberName || "el artículo"}`
            : "Aún no se ha registrado la entrega física."}
        </p>
        
        {error && (
          <div className="flex items-center gap-1.5 mt-2 p-2 bg-red-50 rounded-lg text-xs text-red-600 font-semibold animate-in fade-in slide-in-from-top-1">
            <AlertCircle className="w-3.5 h-3.5" /> {error}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <button
          onClick={handleToggle}
          disabled={loading || disabled}
          className={`
            group flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300
            ${delivered 
              ? "bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 hover:border-slate-300" 
              : "bg-slate-900 text-white hover:bg-black shadow-lg shadow-slate-200 hover:shadow-slate-300"}
            active:scale-95 disabled:opacity-40
          `}
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : delivered ? (
            <>
              <Undo2 className="w-4 h-4 transition-transform group-hover:-rotate-45" />
              <span>Corregir</span>
            </>
          ) : (
            <>
              <span>Marcar</span>
              <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default ItemDeliveryToggle;