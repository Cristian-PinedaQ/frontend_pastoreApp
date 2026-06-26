import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, AlertCircle, Sparkles, Send } from "lucide-react";
import { useCreateTicketMutation } from "../hooks/mutations/useCreateTicketMutation";
import { useActiveTicketConfigsQuery } from "../hooks/queries/useActiveTicketConfigsQuery";
import { FieldRenderer } from "./FieldRenderer";
import { useAuth } from "../context/AuthContext";

export const CreateTicketModal = ({ isOpen, onClose, onSuccess }) => {
  const { data: activeConfigs = [], isLoading: isLoadingConfigs } = useActiveTicketConfigsQuery({
    enabled: isOpen,
  });

  const { hasRole } = useAuth();

  const filteredConfigs = useMemo(() => {
    return activeConfigs.filter(config => {
      // Pastores y Administradores tienen acceso a todas las categorías
      if (hasRole("PASTORES") || hasRole("ADMIN")) {
        return true;
      }
      // Si la categoría no tiene roles de creador asignados, nadie más la puede crear
      if (!config.creatorRoles || config.creatorRoles.length === 0) {
        return false;
      }
      // El usuario debe tener al menos uno de los roles permitidos
      return config.creatorRoles.some(roleObj => {
        const roleName = (typeof roleObj === "object" ? roleObj.name : roleObj) || "";
        return hasRole(roleName);
      });
    });
  }, [activeConfigs, hasRole]);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("MEDIA");
  const [selectedConfigId, setSelectedConfigId] = useState("");
  const [metadata, setMetadata] = useState({});
  
  // Errores de validación
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");

  const createMutation = useCreateTicketMutation({
    onSuccess: (data) => {
      // Limpiar formulario
      resetForm();
      if (onSuccess) onSuccess(data);
      onClose();
    },
    onError: (err) => {
      setSubmitError(err.message || "Error al crear la solicitud. Intenta nuevamente.");
    },
  });

  // Al cambiar la categoría seleccionada, inicializar o limpiar los metadatos
  const selectedConfig = filteredConfigs.find(c => c.id === parseInt(selectedConfigId));
  const requiredFields = selectedConfig?.requiredFields || [];

  useEffect(() => {
    // Inicializar metadatos vacíos para los campos requeridos
    const initialMeta = {};
    requiredFields.forEach(field => {
      initialMeta[field] = "";
    });
    setMetadata(initialMeta);
    setErrors(prev => {
      const copy = { ...prev };
      delete copy.configId;
      requiredFields.forEach(field => {
        delete copy[field];
      });
      return copy;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConfigId]);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setPriority("MEDIA");
    setSelectedConfigId("");
    setMetadata({});
    setErrors({});
    setSubmitError("");
  };

  const handleMetadataChange = (fieldName, value) => {
    setMetadata(prev => ({
      ...prev,
      [fieldName]: value
    }));
    
    // Limpiar error del campo si el usuario escribe
    if (value.trim() !== "") {
      setErrors(prev => {
        const copy = { ...prev };
        delete copy[fieldName];
        return copy;
      });
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!title.trim()) newErrors.title = true;
    if (!description.trim()) newErrors.description = true;
    if (!selectedConfigId) newErrors.configId = true;

    // Validar campos requeridos dinámicos
    requiredFields.forEach(field => {
      if (!metadata[field] || !metadata[field].trim()) {
        newErrors[field] = true;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitError("");

    if (!validate()) return;

    createMutation.mutate({
      title: title.trim(),
      description: description.trim(),
      priority,
      configId: parseInt(selectedConfigId),
      metadata
    });
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        {/* BACKDROP */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* MODAL CONTAINER */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl border border-slate-100 dark:border-white/5 flex flex-col max-h-[90vh] overflow-hidden"
        >
          {/* HEADER */}
          <div className="h-20 border-b border-slate-100 dark:border-white/5 flex items-center justify-between px-8 shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Sparkles size={20} />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-900 dark:text-white leading-tight">
                  Nueva Solicitud
                </h2>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-500 uppercase tracking-wider">
                  Soporte y Requerimientos
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* FORM BODY */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
            {submitError && (
              <div className="flex items-center gap-2 p-4 bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 rounded-2xl border border-rose-200 dark:border-rose-800/30 text-sm font-semibold">
                <AlertCircle size={18} className="shrink-0" />
                {submitError}
              </div>
            )}

            {/* CATEGORÍA */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Categoría del Requerimiento <span className="text-rose-500">*</span>
              </label>
              {isLoadingConfigs ? (
                <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                  <Loader2 size={14} className="animate-spin" /> Cargando categorías...
                </div>
              ) : (
                <select
                  value={selectedConfigId}
                  onChange={(e) => setSelectedConfigId(e.target.value)}
                  className={`w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border text-sm font-semibold text-slate-800 dark:text-slate-100 outline-none transition-all focus:ring-2 focus:ring-indigo-500/20 ${
                    errors.configId ? "border-rose-400 focus:border-rose-500" : "border-slate-200 dark:border-slate-700/50 focus:border-indigo-500"
                  }`}
                >
                  <option value="">Selecciona una categoría...</option>
                  {filteredConfigs.length === 0 ? (
                    <option value="" disabled>No tienes categorías disponibles para tu rol</option>
                  ) : (
                    filteredConfigs.map((config) => (
                      <option key={config.id} value={config.id}>
                        {config.name} ({config.description})
                      </option>
                    ))
                  )}
                </select>
              )}
              {errors.configId && (
                <span className="text-[11px] font-bold text-rose-500 flex items-center gap-1 mt-0.5">
                  <AlertCircle size={12} />
                  Debes seleccionar una categoría
                </span>
              )}
            </div>

            {/* CAMPOS DINÁMICOS */}
            {selectedConfigId && requiredFields.length > 0 && (
              <FieldRenderer
                mode="edit"
                fields={requiredFields}
                values={metadata}
                onChange={handleMetadataChange}
                errors={errors}
              />
            )}

            {/* TÍTULO / ASUNTO */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Asunto / Título Resumido <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (e.target.value.trim()) setErrors(prev => { const c = {...prev}; delete c.title; return c; });
                }}
                placeholder="Ej: Inconveniente con acceso a la plataforma"
                className={`w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border text-sm font-semibold text-slate-800 dark:text-slate-100 placeholder:text-slate-400 outline-none transition-all focus:ring-2 focus:ring-indigo-500/20 ${
                  errors.title ? "border-rose-400 focus:border-rose-500" : "border-slate-200 dark:border-slate-700/50 focus:border-indigo-500"
                }`}
              />
              {errors.title && (
                <span className="text-[11px] font-bold text-rose-500 flex items-center gap-1 mt-0.5">
                  <AlertCircle size={12} />
                  El asunto es obligatorio
                </span>
              )}
            </div>

            {/* DESCRIPCIÓN */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Descripción Detallada <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  if (e.target.value.trim()) setErrors(prev => { const c = {...prev}; delete c.description; return c; });
                }}
                rows={4}
                placeholder="Por favor describe de manera clara y detallada tu requerimiento..."
                className={`w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border text-sm font-semibold text-slate-800 dark:text-slate-100 placeholder:text-slate-400 outline-none transition-all focus:ring-2 focus:ring-indigo-500/20 resize-none ${
                  errors.description ? "border-rose-400 focus:border-rose-500" : "border-slate-200 dark:border-slate-700/50 focus:border-indigo-500"
                }`}
              />
              {errors.description && (
                <span className="text-[11px] font-bold text-rose-500 flex items-center gap-1 mt-0.5">
                  <AlertCircle size={12} />
                  La descripción es obligatoria
                </span>
              )}
            </div>

            {/* PRIORIDAD */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Prioridad
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border text-sm font-semibold text-slate-800 dark:text-slate-100 border-slate-200 dark:border-slate-700/50 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="BAJA">Baja (Requerimiento rutinario)</option>
                <option value="MEDIA">Media (Afecta operaciones cotidianas)</option>
                <option value="ALTA">Alta (Bloqueo crítico / Urgente)</option>
              </select>
            </div>
          </form>

          {/* FOOTER */}
          <div className="h-20 border-t border-slate-100 dark:border-white/5 flex items-center justify-end px-8 gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={createMutation.isPending}
              className="px-5 py-3 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={createMutation.isPending}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white shadow-xl shadow-indigo-600/20 rounded-xl text-sm font-bold flex items-center gap-2 transition-all active:scale-95 disabled:scale-100 disabled:cursor-not-allowed"
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Enviando...</span>
                </>
              ) : (
                <>
                  <Send size={16} />
                  <span>Crear Solicitud</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default CreateTicketModal;
