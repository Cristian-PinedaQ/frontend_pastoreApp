import React from "react";
import { ClipboardList, AlertCircle } from "lucide-react";

export const FieldRenderer = ({
  mode = "read", // 'read' o 'edit'
  fields = [], // array de nombres de campos en modo 'edit' (ej: config.requiredFields)
  values = {}, // objeto de valores (metadata)
  onChange, // callback en modo 'edit': (fieldName, value) => void
  errors = {}, // errores de validación en modo 'edit'
}) => {
  // 1. MODO LECTURA: Mostrar los metadatos clave-valor de forma atractiva
  if (mode === "read") {
    const metadataEntries = Object.entries(values || {});
    
    if (metadataEntries.length === 0) return null;

    return (
      <div className="bg-slate-50 dark:bg-slate-800/20 rounded-2xl border border-slate-100 dark:border-white/5 p-6 space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-200/60 dark:border-slate-800 pb-3">
          <ClipboardList className="text-indigo-500" size={18} />
          <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">
            Detalles Dinámicos
          </h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {metadataEntries.map(([key, val]) => (
            <div
              key={key}
              className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-white/5 p-4 shadow-sm"
            >
              <span className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">
                {key}
              </span>
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 break-words">
                {val || <em className="text-slate-400">No provisto</em>}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 2. MODO EDICIÓN: Renderizar inputs de formulario dinámicamente
  if (!fields || fields.length === 0) return null;

  return (
    <div className="space-y-4 bg-slate-50 dark:bg-slate-800/10 p-5 rounded-2xl border border-slate-200/50 dark:border-slate-800">
      <div className="flex items-center gap-2 border-b border-slate-200/60 dark:border-slate-800/80 pb-2 mb-2">
        <ClipboardList size={16} className="text-indigo-500" />
        <span className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          Campos requeridos por la categoría
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {fields.map((fieldName) => {
          const hasError = !!errors[fieldName];
          return (
            <div key={fieldName} className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {fieldName} <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={values[fieldName] || ""}
                onChange={(e) => onChange(fieldName, e.target.value)}
                placeholder={`Digita ${fieldName.toLowerCase()}...`}
                className={`w-full px-4 py-3 bg-white dark:bg-slate-900 rounded-xl border text-sm font-semibold text-slate-800 dark:text-slate-100 placeholder:text-slate-400 outline-none transition-all focus:ring-2 ${
                  hasError
                    ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500/20"
                    : "border-slate-200 dark:border-slate-800 focus:border-indigo-500 focus:ring-indigo-500/20"
                }`}
              />
              {hasError && (
                <span className="text-[11px] font-bold text-rose-500 flex items-center gap-1">
                  <AlertCircle size={12} />
                  Este campo es obligatorio
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default FieldRenderer;
