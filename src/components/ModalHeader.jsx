import React from "react";
import { X } from "lucide-react";

const SEMANTIC_STYLES = {
  success: {
    container: "bg-emerald-50 dark:bg-emerald-900/20 border-b border-emerald-100 dark:border-emerald-800/30",
    icon: "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400",
  },
  danger: {
    container: "bg-rose-50 dark:bg-rose-900/20 border-b border-rose-100 dark:border-rose-800/30",
    icon: "bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400",
  },
  info: {
    container: "bg-indigo-50 dark:bg-indigo-900/20 border-b border-indigo-100 dark:border-indigo-800/30",
    icon: "bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400",
  },
};

/**
 * ModalHeader — Encabezado estándar para modales.
 *
 * Reglas del sistema:
 * - title: string ÚNICAMENTE (sin layouts complejos)
 * - titleAddon: ReactNode opcional SOLO para badges/estados pequeños
 * - actions: ReactNode opcional para botones de acción
 * - NO usar para: tabs, steps, formularios, layouts complejos
 */
export const ModalHeader = ({
  title,
  titleId,
  titleAddon,
  subtitle,
  icon: Icon,
  onClose,
  variant = "default",
  semanticType = "info",
  actions,
  closeDisabled = false,
}) => {
  const isSemantic = variant === "semantic";
  const semantic = isSemantic ? SEMANTIC_STYLES[semanticType] || SEMANTIC_STYLES.info : null;

  return (
    <div
      className={
        isSemantic
          ? `flex items-center justify-between px-6 py-5 shrink-0 ${semantic.container}`
          : "flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0"
      }
    >
      <div className="flex flex-wrap items-center gap-3 min-w-0">
        {Icon && (
          <div
            className={
              isSemantic
                ? `w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${semantic.icon}`
                : "w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0"
            }
          >
            <Icon className="w-5 h-5" />
          </div>
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2
              id={titleId}
              className="text-2xl font-black tracking-tight text-slate-900 dark:text-white truncate"
            >
              {title}
            </h2>
            {titleAddon && (
              <span className="shrink-0">{titleAddon}</span>
            )}
          </div>
          {subtitle && (
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400 mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {actions}
        {onClose && (
          <button
            onClick={onClose}
            disabled={closeDisabled}
            aria-label="Cerrar"
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:text-slate-300 dark:hover:bg-slate-700 rounded-xl transition-all disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
};

export default ModalHeader;
