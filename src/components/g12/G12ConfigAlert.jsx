import React from "react";
import { AlertCircle } from "lucide-react";

export default function G12ConfigAlert({ data }) {
  if (!data || data.status !== "DOWN") return null;

  const { error, hint } = data.details || {};

  return (
    <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-500/20 dark:bg-rose-500/10 animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex items-start gap-3">
        <AlertCircle className="text-rose-500 mt-0.5 shrink-0" size={20} />
        <div className="min-w-0">
          <h3 className="font-semibold text-rose-700 dark:text-rose-300">
            Configuraci&oacute;n G12 inv&aacute;lida
          </h3>
          {error && (
            <p className="text-sm text-rose-600 dark:text-rose-400 mt-1 break-words">
              {error}
            </p>
          )}
          {hint && (
            <p className="text-sm text-rose-500/80 dark:text-rose-300/70 mt-2 break-words">
              {hint}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
