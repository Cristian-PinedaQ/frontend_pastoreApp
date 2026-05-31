import React, { useState } from "react";
import PageHero from "../components/PageHero";
import { useTicketConfigsQuery } from "../hooks/queries/useTicketConfigsQuery";
import { useCreateTicketConfigMutation } from "../hooks/mutations/useCreateTicketConfigMutation";
import { useUpdateTicketConfigMutation } from "../hooks/mutations/useUpdateTicketConfigMutation";
import { useDeleteTicketConfigMutation } from "../hooks/mutations/useDeleteTicketConfigMutation";
import { useConfirmation } from "../context/ConfirmationContext";
import { 
  Settings, 
  Plus, 
  Edit3, 
  Trash2, 
  Check, 
  X, 
  Loader2, 
  AlertCircle,
  Tag,
  ShieldAlert,
  SlidersHorizontal
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// Lista de roles del sistema (nombres de enum limpios, sin el prefijo ROLE_)
const AVAILABLE_ROLES = [
  "ADMIN",
  "PASTORES",
  "CONEXION",
  "DESPLIEGUE",
  "ESENCIA",
  "LIDER",
  "ECONOMICO",
  "ALABANZA",
  "PROFESORES",
  "CIMIENTO",
  "PROTOCOLO",
  "MINISTERIOS",
  "SECRETARIA"
];

export const TicketConfigsPage = () => {
  const confirm = useConfirmation();

  // Queries y Mutations
  const { data: configs = [], isLoading, refetch } = useTicketConfigsQuery();

  const createMutation = useCreateTicketConfigMutation({
    onSuccess: () => {
      handleCloseForm();
      refetch();
    },
    onError: (err) => setFormError(err.message || "Error al crear la categoría."),
  });

  const updateMutation = useUpdateTicketConfigMutation({
    onSuccess: () => {
      handleCloseForm();
      refetch();
    },
    onError: (err) => setFormError(err.message || "Error al editar la categoría."),
  });

  const deleteMutation = useDeleteTicketConfigMutation({
    onSuccess: () => refetch(),
    onError: (err) => alert(err.message || "Error al eliminar la categoría."),
  });

  // Estado del formulario de edición / creación (Modal local)
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState(null); // null si es creación

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [requiredFieldsText, setRequiredFieldsText] = useState(""); // Separado por comas
  const [selectedRoles, setSelectedRoles] = useState([]); // Array de strings (sin ROLE_) para Resolutores
  const [selectedCreatorRoles, setSelectedCreatorRoles] = useState([]); // Array de strings (sin ROLE_) para Creadores
  const [isActive, setIsActive] = useState(true);
  const [formError, setFormError] = useState("");
  const [errors, setErrors] = useState({});

  const handleOpenCreate = () => {
    setEditingConfig(null);
    setName("");
    setDescription("");
    setRequiredFieldsText("");
    setSelectedRoles([]);
    // Por defecto, permitir que todos los roles creen tickets
    setSelectedCreatorRoles([...AVAILABLE_ROLES]);
    setIsActive(true);
    setFormError("");
    setErrors({});
    setIsFormOpen(true);
  };

  const handleOpenEdit = (config) => {
    setEditingConfig(config);
    setName(config.name);
    setDescription(config.description || "");
    setRequiredFieldsText((config.requiredFields || []).join(", "));
    
    // Normalizar los roles resolutores (Jackson devuelve objetos o strings) y quitar prefijo ROLE_
    const normRoles = (config.resolverRoles || []).map(r => {
      const rName = (typeof r === "object" ? r.name : r) || "";
      return rName.toUpperCase().replace("ROLE_", "");
    });
    setSelectedRoles(normRoles);

    // Normalizar los roles creadores y quitar prefijo ROLE_
    const normCreatorRoles = (config.creatorRoles || []).map(r => {
      const rName = (typeof r === "object" ? r.name : r) || "";
      return rName.toUpperCase().replace("ROLE_", "");
    });
    setSelectedCreatorRoles(normCreatorRoles);

    setIsActive(config.isActive);
    setFormError("");
    setErrors({});
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingConfig(null);
  };

  const handleRoleToggle = (roleName) => {
    const cleanRole = roleName.replace("ROLE_", "");
    setSelectedRoles(prev => {
      if (prev.includes(cleanRole)) {
        return prev.filter(r => r !== cleanRole);
      } else {
        return [...prev, cleanRole];
      }
    });
  };

  const handleCreatorRoleToggle = (roleName) => {
    const cleanRole = roleName.replace("ROLE_", "");
    setSelectedCreatorRoles(prev => {
      if (prev.includes(cleanRole)) {
        return prev.filter(r => r !== cleanRole);
      } else {
        return [...prev, cleanRole];
      }
    });
  };

  const validate = () => {
    const newErrors = {};
    if (!name.trim()) newErrors.name = true;
    if (!description.trim()) newErrors.description = true;
    if (selectedCreatorRoles.length === 0) newErrors.creatorRoles = true;
    if (selectedRoles.length === 0) newErrors.resolverRoles = true;
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError("");

    if (!validate()) return;

    // Procesar campos requeridos dinámicos (quitar espacios en blanco y filtrar vacíos)
    const requiredFields = requiredFieldsText
      .split(",")
      .map(f => f.trim())
      .filter(f => f.length > 0);

    // Enviar el payload al backend utilizando los nombres limpios del enum (sin ROLE_).
    // Spring Boot Jackson deserializará estos strings directamente a los valores del enum RoleName.
    const payload = {
      name: name.trim(),
      description: description.trim(),
      requiredFields,
      creatorRoles: selectedCreatorRoles, // Array de strings como ["CONEXION", "DESPLIEGUE"]
      resolverRoles: selectedRoles, // Array de strings como ["PASTORES"]
      isActive
    };

    if (editingConfig) {
      updateMutation.mutate({
        id: editingConfig.id,
        configData: payload
      });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleDelete = async (id, catName) => {
    const isConfirmed = await confirm({
      title: "¿Eliminar Categoría?",
      message: `¿Estás seguro de eliminar la categoría "${catName}"? Esto podría afectar la creación de nuevas solicitudes asociadas.`,
      type: "warning",
      confirmLabel: "Eliminar",
    });

    if (isConfirmed) {
      deleteMutation.mutate(id);
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="max-w-[1600px] mx-auto p-4 md:p-10 lg:p-14 space-y-12 animate-in fade-in duration-700">
      
      <PageHero
        size="medium"
        eyebrow="Configuración Administrativa"
        title="Categorías de"
        highlight="Tickets"
        stats={[
          { label: `${configs.length} Categorías en total`, variant: "indigo", icon: Tag },
          { label: "Acceso Pastores", variant: "emerald", icon: SlidersHorizontal },
        ]}
        actions={
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-3 px-6 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-[1.5rem] font-black text-sm shadow-2xl shadow-indigo-500/30 transition-all hover:-translate-y-1 active:scale-95 group shrink-0"
          >
            <Plus size={20} className="group-hover:rotate-90 transition-transform" />
            Nueva Categoría
          </button>
        }
      />

      {/* LISTADO DE CATEGORÍAS */}
      <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200/60 dark:border-white/5 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-20 space-y-4">
            <Loader2 size={40} className="animate-spin text-indigo-600" />
            <p className="text-sm font-black text-slate-400 uppercase tracking-widest">
              Cargando configuraciones...
            </p>
          </div>
        ) : configs.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-4">
              <Tag size={28} />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
              No hay categorías creadas
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mb-4">
              Crea una categoría para que los usuarios puedan reportar solicitudes en PastoreApp.
            </p>
            <button
              onClick={handleOpenCreate}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm"
            >
              Crear Primera Categoría
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/75 dark:bg-slate-800/20 border-b border-slate-100 dark:border-white/5">
                  <th className="px-6 py-4 text-xs font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider">
                    Nombre
                  </th>
                  <th className="px-6 py-4 text-xs font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider">
                    Descripción
                  </th>
                  <th className="px-6 py-4 text-xs font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider">
                    Campos Requeridos
                  </th>
                  <th className="px-6 py-4 text-xs font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider">
                    Roles Creadores
                  </th>
                  <th className="px-6 py-4 text-xs font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider">
                    Roles Resolutores
                  </th>
                  <th className="px-6 py-4 text-xs font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-4 text-xs font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider text-right">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {configs.map((config) => (
                  <tr key={config.id} className="hover:bg-slate-50/30 dark:hover:bg-slate-800/10 transition-colors">
                    {/* Nombre */}
                    <td className="px-6 py-4">
                      <span className="text-sm font-bold text-slate-900 dark:text-white">
                        {config.name}
                      </span>
                    </td>

                    {/* Descripción */}
                    <td className="px-6 py-4 max-w-xs md:max-w-md">
                      <p className="text-sm text-slate-600 dark:text-slate-400 truncate">
                        {config.description || "Sin descripción"}
                      </p>
                    </td>

                    {/* Campos requeridos */}
                    <td className="px-6 py-4">
                      {config.requiredFields && config.requiredFields.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {config.requiredFields.map((field, i) => (
                            <span key={i} className="text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded">
                              {field}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Ninguno</span>
                      )}
                    </td>

                    {/* Roles creadores */}
                    <td className="px-6 py-4">
                      {config.creatorRoles && config.creatorRoles.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {config.creatorRoles.map((roleObj, i) => {
                            const roleName = (typeof roleObj === "object" ? roleObj.name : roleObj) || "";
                            const cleanName = roleName.replace("ROLE_", "");
                            return (
                              <span key={i} className="text-[10px] font-bold bg-indigo-50/20 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded border border-indigo-100/50 dark:border-indigo-900/30">
                                {cleanName}
                              </span>
                            );
                          })}
                        </div>
                      ) : (
                        <span className="text-xs text-rose-500 font-bold flex items-center gap-1">
                          <ShieldAlert size={12} /> Nadie puede reportar
                        </span>
                      )}
                    </td>

                    {/* Roles resolutores */}
                    <td className="px-6 py-4">
                      {config.resolverRoles && config.resolverRoles.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {config.resolverRoles.map((roleObj, i) => {
                            const roleName = (typeof roleObj === "object" ? roleObj.name : roleObj) || "";
                            const cleanName = roleName.replace("ROLE_", "");
                            return (
                              <span key={i} className="text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded">
                                {cleanName}
                              </span>
                            );
                          })}
                        </div>
                      ) : (
                        <span className="text-xs text-rose-500 font-bold flex items-center gap-1">
                          <ShieldAlert size={12} /> Requiere Pastor
                        </span>
                      )}
                    </td>

                    {/* Estado */}
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full border ${
                        config.isActive
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/30"
                          : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700/30"
                      }`}>
                        {config.isActive ? "Activa" : "Inactiva"}
                      </span>
                    </td>

                    {/* Acciones */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenEdit(config)}
                          className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-all"
                          title="Editar"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(config.id, config.name)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-xl transition-all"
                          title="Eliminar"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* FORMULARIO MODAL (CREACIÓN / EDICIÓN) */}
      <AnimatePresence>
        {isFormOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* BACKDROP */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={handleCloseForm}
            />

            {/* FORM CONTAINER */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl border border-slate-100 dark:border-white/5 flex flex-col max-h-[90vh] overflow-hidden"
            >
              {/* HEADER */}
              <div className="h-20 border-b border-slate-100 dark:border-white/5 flex items-center justify-between px-8 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                    <Settings size={20} />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-slate-900 dark:text-white leading-tight">
                      {editingConfig ? "Editar Categoría" : "Nueva Categoría"}
                    </h2>
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-500 uppercase tracking-wider">
                      Módulo de Tickets
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleCloseForm}
                  className="w-10 h-10 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* BODY FORM */}
              <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
                {formError && (
                  <div className="flex items-center gap-2 p-4 bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 rounded-2xl border border-rose-200 dark:border-rose-800/30 text-sm font-semibold">
                    <AlertCircle size={18} className="shrink-0" />
                    {formError}
                  </div>
                )}

                {/* NOMBRE */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    Nombre de la Categoría <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (e.target.value.trim()) setErrors(prev => { const c = {...prev}; delete c.name; return c; });
                    }}
                    placeholder="Ej: Matrículas y Cursos"
                    className={`w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border text-sm font-semibold text-slate-800 dark:text-slate-100 placeholder:text-slate-400 outline-none transition-all focus:ring-2 focus:ring-indigo-500/20 ${
                      errors.name ? "border-rose-400 focus:border-rose-500" : "border-slate-200 dark:border-slate-700/50 focus:border-indigo-500"
                    }`}
                  />
                  {errors.name && (
                    <span className="text-[11px] font-bold text-rose-500 flex items-center gap-1 mt-0.5">
                      <AlertCircle size={12} /> El nombre es obligatorio
                    </span>
                  )}
                </div>

                {/* DESCRIPCIÓN */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    Descripción <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => {
                      setDescription(e.target.value);
                      if (e.target.value.trim()) setErrors(prev => { const c = {...prev}; delete c.description; return c; });
                    }}
                    placeholder="Ej: Solicitudes de soporte técnico de matrícula"
                    className={`w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border text-sm font-semibold text-slate-800 dark:text-slate-100 placeholder:text-slate-400 outline-none transition-all focus:ring-2 focus:ring-indigo-500/20 ${
                      errors.description ? "border-rose-400 focus:border-rose-500" : "border-slate-200 dark:border-slate-700/50 focus:border-indigo-500"
                    }`}
                  />
                  {errors.description && (
                    <span className="text-[11px] font-bold text-rose-500 flex items-center gap-1 mt-0.5">
                      <AlertCircle size={12} /> La descripción es obligatoria
                    </span>
                  )}
                </div>

                {/* CAMPOS REQUERIDOS (Separados por comas) */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      Campos Obligatorios Dinámicos
                    </label>
                    <span className="text-[10px] text-slate-400 font-bold">Separados por comas</span>
                  </div>
                  <input
                    type="text"
                    value={requiredFieldsText}
                    onChange={(e) => setRequiredFieldsText(e.target.value)}
                    placeholder="Ej: Teléfono del tutor, Grado del alumno, Nombre del docente"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/50 text-sm font-semibold text-slate-800 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                  />
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-tight">
                    Define las preguntas específicas que el usuario tendrá que responder de forma obligatoria al crear una solicitud en esta categoría.
                  </p>
                </div>

                {/* ROLES CREADORES (Checkboxes) */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      Roles Creadores Habilitados <span className="text-rose-500">*</span>
                    </label>
                    {errors.creatorRoles && (
                      <span className="text-[10px] font-bold text-rose-500 flex items-center gap-1">
                        <AlertCircle size={12} /> Al menos uno requerido
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-tight mb-2">
                    Selecciona qué roles pueden crear requerimientos en esta categoría.
                  </p>
                  <div className="grid grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-800/20 p-4 rounded-xl border border-slate-200/50 dark:border-slate-800/50">
                    {AVAILABLE_ROLES.map((role) => {
                      const isChecked = selectedCreatorRoles.includes(role);
                      return (
                        <label key={`creator-${role}`} className="flex items-center gap-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleCreatorRoleToggle(role)}
                            className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 dark:bg-slate-800 dark:border-slate-700"
                          />
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            {role}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* ROLES RESOLUTORES (Checkboxes) */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      Roles Resolutores Habilitados <span className="text-rose-500">*</span>
                    </label>
                    {errors.resolverRoles && (
                      <span className="text-[10px] font-bold text-rose-500 flex items-center gap-1">
                        <AlertCircle size={12} /> Al menos uno requerido
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-tight mb-2">
                    Selecciona qué roles del sistema pueden auto-asignarse y cambiar el estado de los tickets.
                  </p>
                  <div className="grid grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-800/20 p-4 rounded-xl border border-slate-200/50 dark:border-slate-800/50">
                    {AVAILABLE_ROLES.map((role) => {
                      const isChecked = selectedRoles.includes(role);
                      return (
                        <label key={`resolver-${role}`} className="flex items-center gap-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleRoleToggle(role)}
                            className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 dark:bg-slate-800 dark:border-slate-700"
                          />
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            {role}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* ESTADO (ACTIVA) */}
                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/20 rounded-xl border border-slate-200/50 dark:border-slate-800/50">
                  <div>
                    <label className="text-xs font-black text-slate-700 dark:text-slate-200 block mb-0.5">
                      Categoría Activa
                    </label>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold block">
                      Permitir a los usuarios seleccionar esta categoría
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="w-5 h-5 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 dark:bg-slate-800 dark:border-slate-700"
                  />
                </div>
              </form>

              {/* FOOTER */}
              <div className="h-20 border-t border-slate-100 dark:border-white/5 flex items-center justify-end px-8 gap-3 shrink-0">
                <button
                  type="button"
                  onClick={handleCloseForm}
                  disabled={isSaving}
                  className="px-5 py-3 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isSaving}
                  className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <>
                      <Check size={16} />
                      <span>Guardar Categoría</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TicketConfigsPage;
