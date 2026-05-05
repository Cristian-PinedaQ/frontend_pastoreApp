import React, { useState } from "react";
import { Rocket, Loader2 } from "lucide-react";
import apiService from "../apiService";
import { useNotification } from "../hooks";

export default function AutoEnrollButton({ cohortId }) {
  const [loading, setLoading] = useState(false);
  const { success, warning, error, notifications, remove } = useNotification();

  const handleClick = async () => {
    try {
      setLoading(true);

      const data = await apiService.autoEnrollNext(cohortId);

      if (data.requiresPayment) {
        warning("El siguiente nivel requiere pago.");
        return;
      }

      const parts = [];
      if (data.enrolled > 0) parts.push(`✅ ${data.enrolled} matriculados`);
      if (data.alreadyEnrolled > 0) parts.push(`⚠️ ${data.alreadyEnrolled} ya inscritos`);
      if (data.noCohortAvailable > 0) parts.push(`🚫 ${data.noCohortAvailable} sin cupo`);
      if (data.errors > 0) parts.push(`❌ ${data.errors} errores`);

      const message = parts.length > 0 ? parts.join("\n") : "Matrícula completada.";
      success(message);
    } catch (err) {
      error("No se pudo ejecutar la matrícula automática.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Render de notificaciones del hook existente */}
      {notifications.length > 0 && (
        <div className="fixed top-6 right-6 z-50 flex flex-col gap-2 w-80 pointer-events-none">
          {notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => remove(n.id)}
              className={`pointer-events-auto px-4 py-3 rounded-xl shadow-lg text-sm font-bold flex items-start gap-2 cursor-pointer animate-in fade-in slide-in-from-right-4 duration-300 ${
                n.type === "success"
                  ? "bg-emerald-500 text-white"
                  : n.type === "warning"
                  ? "bg-amber-500 text-white"
                  : "bg-rose-500 text-white"
              }`}
            >
              <span className="whitespace-pre-line">{n.message}</span>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={handleClick}
        disabled={loading}
        className="
          flex-1 min-w-[120px]
          flex items-center justify-center gap-2
          px-3 py-3
          rounded-xl
          bg-indigo-600 hover:bg-indigo-700
          text-white text-xs font-black uppercase tracking-widest
          transition-all shadow-sm active:scale-95
          disabled:opacity-50 disabled:cursor-not-allowed
        "
      >
        {loading ? (
          <>
            <Loader2 size={13} className="animate-spin" />
            <span className="hidden sm:inline">Procesando...</span>
            <span className="sm:hidden">Procesando</span>
          </>
        ) : (
          <>
            <Rocket size={13} />
            <span className="hidden sm:inline">Matricular aprobados</span>
            <span className="sm:hidden">Matricular</span>
          </>
        )}
      </button>
    </>
  );
}
