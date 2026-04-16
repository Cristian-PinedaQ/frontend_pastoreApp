import React, { useState, useEffect } from "react";
import apiService from "../apiService";
import {
  X,
  Zap,
  Calendar,
  Users,
  Target,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Banknote,
  BookOpen,
  ShieldCheck,
  Settings,
  Plus,
  ChevronRight,
  RefreshCw,
} from "lucide-react";

// ── Helpers ───────────────────────────────────────────────────────────────────
const getLevelCode = (level) => {
  if (!level) return null;
  if (typeof level === "string") return level;
  return level.code ?? null;
};

const getLevelDisplay = (level) => {
  if (!level) return "Sin nivel";
  if (typeof level === "string") return level;
  return level.displayName ?? level.code ?? level;
};

const levelRequiresPayment = (level) => {
  if (!level) return true;
  if (typeof level === "string") return true;
  if (typeof level.requiresPayment === "boolean") return level.requiresPayment;
  return true;
};

// ✅ FIX #3: Helper para la fecha mínima (hoy)
const getMinDate = () => new Date().toISOString().split("T")[0];

const ModalAddActivity = ({ isOpen, onClose, onSave, initialData, isEditing }) => {
  const [formData, setFormData] = useState({
    activityName: "",
    price: "",
    endDate: "",
    quantity: "",
    isActive: true,
    activityType: "STANDALONE",
    enrollmentId: null,
    requiredLevel: null,
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [loadingCohorts, setLoadingCohorts] = useState(false);
  const [cohorts, setCohorts] = useState([]);

  // ── Inicializar formulario ────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) {
      // Limpiar datos al cerrar
      setFormData({
        activityName: "", price: "", endDate: "", quantity: "",
        isActive: true, activityType: "STANDALONE",
        enrollmentId: null, requiredLevel: null,
      });
      setErrors({});
      return;
    }

    if (isEditing && initialData) {
      setFormData({
        activityName:  initialData.activityName  || "",
        price:         initialData.price         || "",
        endDate:       initialData.endDate
                         ? String(initialData.endDate).split("T")[0]
                         : "",
        quantity:      initialData.quantity      || "",
        isActive:      initialData.isActive !== undefined ? initialData.isActive : true,
        activityType:  initialData.activityType  || "STANDALONE",
        enrollmentId:  initialData.enrollmentId  || null,
        requiredLevel: initialData.requiredLevel || null,
      });
      setErrors({});
    } else if (!isEditing) {
      setFormData({
        activityName: "", price: "", endDate: "", quantity: "",
        isActive: true, activityType: "STANDALONE",
        enrollmentId: null, requiredLevel: null,
      });
      setErrors({});
    }
  }, [isOpen, initialData, isEditing]);

  // Carga cohortes cuando el tipo cambia a ENROLLMENT
  useEffect(() => {
    if (isOpen && formData.activityType === "ENROLLMENT") loadCohortsPending();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, formData.activityType]);

  const loadCohortsPending = async () => {
    setLoadingCohorts(true);
    try {
      const data = await apiService.getEnrollments();
      if (!Array.isArray(data)) { setCohorts([]); return; }

      const pending = data
        .filter((c) => c.status === "PENDING" && levelRequiresPayment(c.levelEnrollment))
        .map((c) => ({
          id:              c.id,
          cohortName:      c.cohortName,
          levelEnrollment: typeof c.levelEnrollment === "object" ? c.levelEnrollment : null,
          levelCode:       getLevelCode(c.levelEnrollment),
          levelDisplay:    getLevelDisplay(c.levelEnrollment),
          requiresPayment: levelRequiresPayment(c.levelEnrollment),
          label:           `${c.cohortName} (${getLevelDisplay(c.levelEnrollment)})`,
        }));

      setCohorts(pending);
    } catch (err) {
      console.error("Error cargando cohortes:", err);
      setCohorts([]);
    } finally {
      setLoadingCohorts(false);
    }
  };

  // ── Validación completa (igual que el original) ───────────────────────────
  const validateForm = () => {
    const newErrors = {};

    // Nombre
    if (!formData.activityName.trim()) {
      newErrors.activityName = "El nombre de la actividad es requerido";
    } else if (formData.activityName.length < 3) {
      newErrors.activityName = "El nombre debe tener al menos 3 caracteres";
    } else if (formData.activityName.length > 100) {
      // ✅ FIX #4: validación de longitud máxima recuperada
      newErrors.activityName = "El nombre no puede exceder 100 caracteres";
    }

    // Precio
    if (!formData.price) {
      newErrors.price = "El precio es requerido";
    } else if (parseFloat(formData.price) <= 0) {
      newErrors.price = "El precio debe ser mayor a cero";
    } else if (parseFloat(formData.price) > 999999999) {
      // ✅ FIX #4: validación de precio máximo recuperada
      newErrors.price = "El precio es demasiado alto";
    }

    // Fecha — ✅ FIX #4: validación de fecha pasada recuperada
    if (!formData.endDate) {
      newErrors.endDate = "La fecha de finalización es requerida";
    } else {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const [year, month, day] = formData.endDate.split("-").map(Number);
      const selected = new Date(year, month - 1, day);
      if (selected < today) {
        newErrors.endDate = "La fecha no puede ser anterior a hoy";
      }
    }

    // Cantidad — ✅ FIX #4: validación de cantidad negativa recuperada
    if (formData.quantity && parseInt(formData.quantity) < 0) {
      newErrors.quantity = "La cantidad no puede ser negativa";
    }

    // Cohorte
    if (formData.activityType === "ENROLLMENT" && !formData.enrollmentId) {
      newErrors.enrollmentId = "Debe seleccionar una cohorte con pago requerido";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (name === "activityType") {
      setFormData((prev) => ({
        ...prev,
        activityType:  value,
        enrollmentId:  value === "STANDALONE" ? null : prev.enrollmentId,
        requiredLevel: value === "STANDALONE" ? null : prev.requiredLevel,
      }));
    } else if (name === "enrollmentId") {
      const selected = cohorts.find((c) => String(c.id) === value);
      setFormData((prev) => ({
        ...prev,
        enrollmentId:  value ? Number(value) : null,
        requiredLevel: selected ? selected.levelEnrollment : null,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: type === "checkbox" ? checked : value,
      }));
    }

    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      const payload = {
        activityName: formData.activityName.trim(),
        price:        Math.round(Number(formData.price || 0)),
        endDate:      formData.endDate,
        quantity:     formData.quantity ? Number(formData.quantity) : null,
        isActive:     formData.isActive,
        activityType: formData.activityType,
        ...(formData.activityType === "ENROLLMENT" && {
          enrollmentId: Number(formData.enrollmentId),
        }),
        ...(initialData?.id && { id: initialData.id }),
      };

      await onSave(payload);
      // ✅ FIX #1: cerrar el modal tras guardar exitosamente
      onClose();
    } catch (err) {
      console.error("Error guardando actividad:", err);
      setErrors((prev) => ({
        ...prev,
        general: err.message || "Falla al guardar la actividad",
      }));
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const selectedCohort = cohorts.find((c) => c.id === formData.enrollmentId);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-300">
      <div
        className="bg-white dark:bg-slate-900 w-full sm:max-w-2xl h-full sm:h-auto sm:max-h-[90vh] sm:rounded-[3rem] shadow-[0_40px_100px_-15px_rgba(0,0,0,0.4)] border-x-0 sm:border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── HEADER ───────────────────────────────────────────────────── */}
        <div className="p-6 sm:p-10 pb-4 sm:pb-6 flex justify-between items-center relative shrink-0">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-500" />
          <div className="flex items-center gap-3 sm:gap-5">
            <div className="w-10 h-10 sm:w-14 sm:h-14 bg-indigo-600 rounded-xl sm:rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-500/20">
              {isEditing ? (
                <Settings className="w-5 h-5 sm:w-7 sm:h-7" />
              ) : (
                <Plus className="w-5 h-5 sm:w-7 sm:h-7" />
              )}
            </div>
            <div>
              <h2 className="text-xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-none">
                {isEditing ? "Ajustar Actividad" : "Nueva Actividad"}
              </h2>
              <p className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1">
                Gestión de Agenda Ministerial
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-2 sm:p-3 bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-rose-500 rounded-xl sm:rounded-2xl transition-all hover:rotate-90 disabled:opacity-50"
          >
            <X size={20} className="sm:w-6 sm:h-6" />
          </button>
        </div>

        {/* ── FORM BODY ────────────────────────────────────────────────── */}
        <form
          onSubmit={handleSubmit}
          className="p-6 sm:p-10 pt-2 sm:pt-4 space-y-6 sm:space-y-8 overflow-y-auto no-scrollbar flex-1"
        >
          {/* Error general */}
          {errors.general && (
            <div className="p-4 sm:p-5 bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-900/30 rounded-2xl flex items-center gap-4 text-rose-600 animate-in shake duration-500">
              <AlertCircle size={18} className="sm:w-5 sm:h-5 shrink-0" />
              <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest leading-tight">
                {errors.general}
              </span>
            </div>
          )}

          {/* ── Selector de tipo ────────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {[
              { id: "STANDALONE", label: "Evento Libre",   desc: "Atención general",       icon: Zap,      color: "indigo" },
              { id: "ENROLLMENT", label: "Raíz Viva",      desc: "Vinculado a cohorte",     icon: BookOpen, color: "violet" },
            ].map((type) => (
              <button
                key={type.id}
                type="button"
                disabled={loading}
                onClick={() =>
                  handleChange({ target: { name: "activityType", value: type.id } })
                }
                className={`p-4 sm:p-6 rounded-2xl sm:rounded-[2rem] border-2 transition-all flex items-center sm:flex-col gap-4 sm:gap-3 text-left group relative overflow-hidden disabled:opacity-50 ${
                  formData.activityType === type.id
                    ? "border-indigo-600 bg-indigo-600 text-white shadow-xl shadow-indigo-600/20"
                    : "border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 text-slate-600 dark:text-slate-400 hover:border-slate-200 dark:hover:border-slate-700"
                }`}
              >
                <div
                  className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0 ${
                    formData.activityType === type.id
                      ? "bg-white/20"
                      : "bg-white dark:bg-slate-800 border"
                  }`}
                >
                  <type.icon className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-[10px] sm:text-xs font-black uppercase tracking-widest">
                    {type.label}
                  </h4>
                  <p
                    className={`text-[9px] sm:text-[10px] font-bold mt-0.5 sm:mt-1 ${
                      formData.activityType === type.id
                        ? "text-white/60"
                        : "text-slate-400"
                    }`}
                  >
                    {type.desc}
                  </p>
                </div>
                {formData.activityType === type.id && (
                  <div className="absolute top-4 right-4 animate-in zoom-in-50 hidden sm:block">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                )}
              </button>
            ))}
          </div>

          <div className="space-y-5 sm:space-y-6">
            {/* ── Nombre ──────────────────────────────────────────────── */}
            <div className="space-y-2 group">
              <label className="flex gap-1 text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 sm:ml-5">
                <Target className="w-4 h-4 sm:w-5 sm:h-5 text-slate-300 group-focus-within:text-indigo-600 transition-colors" />Nombre de la Actividad *
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="activityName"
                  value={formData.activityName}
                  onChange={handleChange}
                  placeholder="Ej: Retiro Espiritual"
                  maxLength="100"
                  disabled={loading}
                  className={`w-full pl-12 sm:pl-16 pr-6 sm:pr-8 py-4 sm:py-5 bg-slate-50 dark:bg-slate-800/50 border-2 rounded-2xl sm:rounded-[1.8rem] text-sm font-black outline-none transition-all disabled:opacity-50 ${
                    errors.activityName
                      ? "border-rose-500/50"
                      : "border-transparent focus:border-indigo-600/30"
                  }`}
                />
              </div>
              {/* ✅ FIX #2: mensaje de error recuperado */}
              {errors.activityName && (
                <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest ml-4 sm:ml-5">
                  {errors.activityName}
                </p>
              )}
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-4 sm:ml-5">
                Mínimo 3 · Máximo 100 caracteres
              </p>
            </div>

            {/* ── Selector de cohorte (ENROLLMENT) ────────────────────── */}
            {formData.activityType === "ENROLLMENT" && (
              <div className="p-6 sm:p-8 bg-slate-50 dark:bg-slate-800/30 rounded-2xl sm:rounded-[2.5rem] border border-slate-100 dark:border-slate-800 space-y-4 animate-in slide-in-from-top-4 duration-500">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-indigo-500/10 rounded-lg flex items-center justify-center text-indigo-500">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                    Cohorte Requerida
                  </h4>
                </div>

                <div className="relative">
                  <select
                    name="enrollmentId"
                    value={formData.enrollmentId || ""}
                    onChange={handleChange}
                    disabled={loading || loadingCohorts}
                    className={`w-full px-6 py-4 bg-white dark:bg-slate-900 border-2 rounded-xl sm:rounded-2xl text-[10px] sm:text-[11px] font-black uppercase tracking-widest outline-none appearance-none transition-all disabled:opacity-50 ${
                      errors.enrollmentId
                        ? "border-rose-500/50"
                        : "border-slate-100 dark:border-slate-800 focus:border-indigo-600/30"
                    }`}
                  >
                    <option value="">
                      {loadingCohorts ? "Cargando..." : "-- Selecciona --"}
                    </option>
                    {cohorts.length > 0
                      ? cohorts.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.label}
                          </option>
                        ))
                      : !loadingCohorts && (
                          <option disabled>
                            No hay cohortes PENDIENTES con pago requerido
                          </option>
                        )}
                  </select>
                  <ChevronRight className="absolute right-5 sm:right-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 rotate-90 pointer-events-none" />
                </div>

                {/* ✅ FIX #2: error de cohorte recuperado */}
                {errors.enrollmentId && (
                  <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest">
                    {errors.enrollmentId}
                  </p>
                )}

                {/* Info de cohorte seleccionada */}
                {selectedCohort && (
                  <div className="p-4 sm:p-5 bg-emerald-50 dark:bg-emerald-500/5 rounded-xl sm:rounded-2xl border border-emerald-100 dark:border-emerald-500/20 flex gap-3 sm:gap-4 items-start">
                    <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[9px] sm:text-[10px] font-black text-emerald-600 uppercase tracking-widest leading-none mb-1">
                        Nivel: {selectedCohort.levelDisplay}
                      </p>
                      <p className="text-[8px] sm:text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-tight">
                        Al completar el pago, el sistema inscribirá al miembro
                        automáticamente en la cohorte.
                      </p>
                    </div>
                  </div>
                )}

                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-tight">
                  Solo se muestran cohortes <strong>PENDIENTES</strong> con
                  nivel de pago activo.
                </p>
              </div>
            )}

            {/* ── Precio y Capacidad ───────────────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
              {/* Precio */}
              <div className="space-y-2 group">
                <label className="flex gap-1 text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 sm:ml-5">
                 <Banknote
                    size={18}
                    className="text-slate-300 group-focus-within:text-emerald-500 transition-colors"
                  /> Inversión (COP) *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleChange}
                    placeholder="0.00"
                    min="0"
                    step="1000"
                    disabled={loading}
                    className={`w-full pl-12 sm:pl-16 pr-6 sm:pr-8 py-4 sm:py-5 bg-slate-50 dark:bg-slate-800/50 border-2 rounded-2xl sm:rounded-[1.8rem] text-sm font-black outline-none transition-all disabled:opacity-50 ${
                      errors.price
                        ? "border-rose-500/50"
                        : "border-transparent focus:border-emerald-500/30"
                    }`}
                  />
                </div>
                {/* ✅ FIX #2: error de precio recuperado */}
                {errors.price && (
                  <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest ml-4 sm:ml-5">
                    {errors.price}
                  </p>
                )}
              </div>

              {/* Capacidad */}
              <div className="space-y-2 group">
                <label className="flex gap-1 text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 sm:ml-5">
                 <Users
                    size={18}
                    className="text-slate-300 group-focus-within:text-indigo-600 transition-colors"
                  /> Cupos (Opcional)
                </label>
                <div className="relative">
                  
                  <input
                    type="number"
                    name="quantity"
                    value={formData.quantity}
                    onChange={handleChange}
                    placeholder="Ilimitados"
                    min="0"
                    disabled={loading}
                    className={`w-full pl-12 sm:pl-16 pr-6 sm:pr-8 py-4 sm:py-5 bg-slate-50 dark:bg-slate-800/50 border-2 rounded-2xl sm:rounded-[1.8rem] text-sm font-black outline-none transition-all disabled:opacity-50 ${
                      errors.quantity
                        ? "border-rose-500/50"
                        : "border-transparent focus:border-indigo-600/30"
                    }`}
                  />
                </div>
                {/* ✅ FIX #2: error de capacidad recuperado */}
                {errors.quantity && (
                  <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest ml-4 sm:ml-5">
                    {errors.quantity}
                  </p>
                )}
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-4 sm:ml-5">
                  Vacío = capacidad ilimitada
                </p>
              </div>
            </div>

            {/* ── Fecha de finalización ────────────────────────────────── */}
            <div className="space-y-2 group">
              <label className="flex gap-1 text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 sm:ml-5">
               <Calendar
                  size={18}
                  className="text-slate-300 group-focus-within:text-indigo-600 transition-colors"
                /> Finalización de Agenda *
              </label>
              <div className="relative">
                <input
                  type="date"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleChange}
                  // ✅ FIX #3: min recuperado para bloquear fechas pasadas en el picker
                  min={getMinDate()}
                  disabled={loading}
                  className={`w-full pl-12 sm:pl-16 pr-6 sm:pr-8 py-4 sm:py-5 bg-slate-50 dark:bg-slate-800/50 border-2 rounded-2xl sm:rounded-[1.8rem] text-sm font-black outline-none transition-all disabled:opacity-50 ${
                    errors.endDate
                      ? "border-rose-500/50"
                      : "border-transparent focus:border-indigo-600/30"
                  }`}
                />
              </div>
              {/* ✅ FIX #2: error de fecha recuperado */}
              {errors.endDate && (
                <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest ml-4 sm:ml-5">
                  {errors.endDate}
                </p>
              )}
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-4 sm:ml-5 leading-tight">
                La actividad dejará de ser visible en esta fecha.
              </p>
            </div>

            {/* ── Estado activo (solo edición) ─────────────────────────── */}
            {isEditing && (
              <label className="flex items-center gap-4 p-5 sm:p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl sm:rounded-[1.8rem] cursor-pointer group hover:bg-slate-100 dark:hover:bg-slate-800 transition-all border border-transparent hover:border-indigo-500/20">
                <div
                  className={`w-8 h-8 rounded-xl border-2 flex items-center justify-center shrink-0 transition-all ${
                    formData.isActive
                      ? "bg-emerald-500 border-emerald-500 shadow-lg shadow-emerald-500/20"
                      : "border-slate-300 dark:border-slate-600"
                  }`}
                >
                  {formData.isActive && (
                    <CheckCircle2 className="w-5 h-5 text-white" />
                  )}
                </div>
                <input
                  type="checkbox"
                  name="isActive"
                  checked={formData.isActive}
                  onChange={handleChange}
                  disabled={loading}
                  className="hidden"
                />
                <div>
                  <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest block leading-none">
                    {formData.isActive ? "Actividad Activa" : "Actividad Pausada"}
                  </span>
                  <span className="text-[8px] sm:text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1 block leading-tight">
                    {formData.isActive
                      ? "Visible en el catálogo"
                      : "Oculta en la agenda"}
                  </span>
                </div>
              </label>
            )}
          </div>
        </form>

        {/* ── FOOTER ───────────────────────────────────────────────────── */}
        <div className="p-6 sm:p-10 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row gap-3 sm:gap-4 backdrop-blur-xl shrink-0">
          <button
            onClick={onClose}
            disabled={loading}
            type="button"
            className="order-2 sm:order-1 flex-1 py-4 sm:py-5 text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest text-[10px] sm:text-[11px] hover:text-slate-600 transition-all disabled:opacity-50"
          >
            Descartar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            type="button"
            className="order-1 sm:order-2 flex-[2] py-4 sm:py-5 bg-indigo-600 text-white rounded-2xl sm:rounded-3xl font-black text-[11px] sm:text-xs uppercase tracking-widest shadow-2xl shadow-indigo-600/20 hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:pointer-events-none"
          >
            {loading ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <span className="truncate">
                  {isEditing ? "Confirmar Ajustes" : "Desplegar Actividad"}
                </span>
                <ArrowRight className="w-5 h-5 shrink-0" />
              </>
            )}
          </button>
        </div>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
          .no-scrollbar::-webkit-scrollbar { display: none; }
          .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
          @keyframes shake { 0%,100% { transform: translateX(0); } 25% { transform: translateX(-5px); } 75% { transform: translateX(5px); } }
          .shake { animation: shake 0.5s ease-in-out; }
          .animate-in { animation: fadeSlideIn 0.4s ease-out; }
          @keyframes fadeSlideIn { from { opacity: 0; transform: translateY(6px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
        `,
        }}
      />
    </div>
  );
};

export default ModalAddActivity;