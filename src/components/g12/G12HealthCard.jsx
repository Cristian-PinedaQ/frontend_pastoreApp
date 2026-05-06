import React from "react";
import { CheckCircle2, XCircle } from "lucide-react";

export default function G12HealthCard({ data }) {
  if (!data) return null;

  const isUp = data.status === "UP";
  const details = data.details || {};

  return (
    <div className="rounded-3xl border bg-white dark:bg-slate-900 p-6 shadow-sm border-slate-200 dark:border-slate-800">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          {isUp ? (
            <CheckCircle2 className="text-emerald-500" size={24} />
          ) : (
            <XCircle className="text-rose-500" size={24} />
          )}
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Estado G12
          </h2>
        </div>

        <span
          className={`px-3 py-1 rounded-full text-xs font-bold ${
            isUp
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400"
              : "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400"
          }`}
        >
          {isUp ? "Activo" : "Error"}
        </span>
      </div>

      {isUp ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-4">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
              Pastor ID
            </p>
            <p className="text-xl font-black text-slate-900 dark:text-white">
              {details.pastorId ?? "—"}
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-4">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
              Pastora ID
            </p>
            <p className="text-xl font-black text-slate-900 dark:text-white">
              {details.pastoraId ?? "—"}
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-xl bg-rose-50 dark:bg-rose-500/10 p-4">
          <p className="text-sm font-medium text-rose-600 dark:text-rose-400 break-words">
            {details.error || "Error desconocido en la configuraci&oacute;n G12"}
          </p>
          {details.hint && (
            <p className="text-xs text-rose-500/70 dark:text-rose-300/60 mt-2 break-words">
              {details.hint}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
