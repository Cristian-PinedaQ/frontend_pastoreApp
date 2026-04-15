import React, { useState, useEffect, useCallback } from "react";
import apiService from "../apiService";
import { 
  Settings, 
  BookOpen, 
  Plus, 
  Trash2, 
  Edit3, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  ArrowRight,  
  ShieldCheck,
  ChevronRight,
  X,
  CreditCard,
  BookMarked
} from "lucide-react";

const DEBUG = process.env.REACT_APP_DEBUG === "true";
const log = (msg, data) => { if (DEBUG) console.log(`[LevelsConfigPage] ${msg}`, data || ""); };
const logError = (msg, err) => console.error(`[LevelsConfigPage] ${msg}`, err);

// ── Helpers ──────────────────────────────────────────────────
const escapeHtml = (text) => {
  if (!text || typeof text !== "string") return "";
  const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
  return text.replace(/[&<>"']/g, (m) => map[m]);
};

// Valores por defecto para el formulario de nivel
const EMPTY_LEVEL = {
  code: "",
  displayName: "",
  description: "",
  levelOrder: "",
  isActive: true,
  requiresPayment: true,
};

// Valores por defecto para lección plantilla
const EMPTY_LESSON = {
  lessonName: "",
  lessonOrder: "",
  defaultDurationMinutes: 120,
  isActive: true,
};

const LevelsConfigPage = () => {
  // ── Estado global ────────────────────────────────────────────
  const [levels, setLevels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ── Panel derecho: nivel seleccionado + sus lecciones ────────
  const [selectedLevel, setSelectedLevel] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [lessonsLoading, setLessonsLoading] = useState(false);

  // ── Modales / formularios de nivel ───────────────────────────
  const [showLevelModal, setShowLevelModal] = useState(false);
  const [levelModalMode, setLevelModalMode] = useState("create"); // "create" | "edit"
  const [levelForm, setLevelForm] = useState(EMPTY_LEVEL);
  const [levelFormErrors, setLevelFormErrors] = useState({});
  const [levelSaving, setLevelSaving] = useState(false);

  // ── Modales / formularios de lección ─────────────────────────
  const [showLessonModal, setShowLessonModal] = useState(false);
  const [lessonModalMode, setLessonModalMode] = useState("create");
  const [lessonForm, setLessonForm] = useState(EMPTY_LESSON);
  const [lessonFormErrors, setLessonFormErrors] = useState({});
  const [lessonSaving, setLessonSaving] = useState(false);
  const [editingLesson, setEditingLesson] = useState(null);

  // ── Modal confirmación desactivar ─────────────────────────────
  const [confirmModal, setConfirmModal] = useState({ open: false, type: "", id: null, name: "" });

  const loadLevels = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const data = await apiService.getAllLevels();
      setLevels(data || []);
      log("Niveles cargados:", data?.length);
    } catch (err) {
      logError("Error cargando niveles:", err);
      setError("No se pudieron cargar los niveles. Verifica tu conexión.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadLevels(); }, [loadLevels]);

  const loadLessons = useCallback(async (levelCode) => {
    if (!levelCode) return;
    try {
      setLessonsLoading(true);
      setError("");
      const data = await apiService.getLessonTemplatesByLevel(levelCode);
      setLessons(data || []);
      log("Lecciones cargadas para", levelCode, ":", data?.length);
    } catch (err) {
      logError("Error cargando lecciones:", err);
      setError("No se logro cargar la plantilla de lecciones.");
      setLessons([]);
    } finally {
      setLessonsLoading(false);
    }
  }, []);

  const handleSelectLevel = (level) => {
    setSelectedLevel(level);
    setLessons([]);
    setError("");
    setSuccess("");
    loadLessons(level.code);
  };

  const handleOpenCreateLevel = () => {
    setLevelForm(EMPTY_LEVEL);
    setLevelFormErrors({});
    setLevelModalMode("create");
    setShowLevelModal(true);
  };

  const handleOpenEditLevel = (level) => {
    setLevelForm({
      code: level.code,
      displayName: level.displayName || "",
      description: level.description || "",
      levelOrder: level.levelOrder || "",
      isActive: level.isActive !== undefined ? level.isActive : true,
      requiresPayment: level.requiresPayment !== undefined ? level.requiresPayment : true,
    });
    setLevelFormErrors({});
    setLevelModalMode("edit");
    setShowLevelModal(true);
  };

  const validateLevelForm = () => {
    const errs = {};
    if (!levelForm.displayName.trim()) errs.displayName = "El nombre es obligatorio";
    if (levelModalMode === "create" && !levelForm.code.trim()) errs.code = "El código es obligatorio";
    if (levelModalMode === "create" && !/^[A-Z0-9_]+$/.test(levelForm.code.trim()))
      errs.code = "Solo mayúsculas, números y guion bajo (ej: ESENCIA_1)";
    if (!levelForm.levelOrder || isNaN(Number(levelForm.levelOrder)) || Number(levelForm.levelOrder) < 1)
      errs.levelOrder = "El orden debe ser un número mayor a 0";
    return errs;
  };

  const handleSaveLevel = async (e) => {
    e.preventDefault();
    const errs = validateLevelForm();
    if (Object.keys(errs).length > 0) { setLevelFormErrors(errs); return; }

    try {
      setLevelSaving(true);
      setError("");

      const payload = {
        displayName: levelForm.displayName.trim(),
        description: levelForm.description.trim() || null,
        levelOrder: Number(levelForm.levelOrder),
        isActive: levelForm.isActive,
        requiresPayment: levelForm.requiresPayment,
      };

      if (levelModalMode === "create") {
        payload.code = levelForm.code.trim().toUpperCase();
        await apiService.createLevel(payload);
        setSuccess(`✅ Nivel "${payload.displayName}" creado exitosamente`);
      } else {
        await apiService.updateLevel(selectedLevel.id, payload);
        setSuccess(`✅ Nivel "${payload.displayName}" actualizado`);
        setSelectedLevel((prev) => ({ ...prev, ...payload }));
      }

      setShowLevelModal(false);
      await loadLevels();
    } catch (err) {
      logError("Error guardando nivel:", err);
      const msg = err?.response?.data?.message || err?.message || "Error desconocido";
      setError(`Error al guardar el nivel: ${msg}`);
    } finally {
      setLevelSaving(false);
    }
  };

  const handleDeactivateLevel = async (levelId, levelName) => {
    setConfirmModal({ open: true, type: "level", id: levelId, name: levelName });
  };

  const handleConfirmDeactivate = async () => {
    const { type, id, name } = confirmModal;
    setConfirmModal({ open: false, type: "", id: null, name: "" });
    try {
      setError("");
      if (type === "level") {
        await apiService.deactivateLevel(id);
        setSuccess(`🚫 Nivel "${name}" desactivado`);
        if (selectedLevel?.id === id) setSelectedLevel(null);
        await loadLevels();
      } else if (type === "lesson") {
        await apiService.deactivateLessonTemplate(id);
        setSuccess(`🚫 Lección "${name}" desactivada`);
        if (selectedLevel) loadLessons(selectedLevel.code);
      }
    } catch (err) {
      logError("Error desactivando:", err);
      setError("No se pudo desactivar. Inténtalo de nuevo.");
    }
  };

  const handleOpenCreateLesson = () => {
    setLessonForm(EMPTY_LESSON);
    setLessonFormErrors({});
    setEditingLesson(null);
    setLessonModalMode("create");
    setShowLessonModal(true);
  };

  const handleOpenEditLesson = (lesson) => {
    setLessonForm({
      lessonName: lesson.lessonName || "",
      lessonOrder: lesson.lessonOrder || "",
      defaultDurationMinutes: lesson.defaultDurationMinutes || 120,
      isActive: lesson.isActive !== undefined ? lesson.isActive : true,
    });
    setLessonFormErrors({});
    setEditingLesson(lesson);
    setLessonModalMode("edit");
    setShowLessonModal(true);
  };

  const validateLessonForm = () => {
    const errs = {};
    if (!lessonForm.lessonName.trim()) errs.lessonName = "El nombre es obligatorio";
    if (lessonForm.lessonName.trim().length > 255) errs.lessonName = "Máximo 255 caracteres";
    if (!lessonForm.lessonOrder || isNaN(Number(lessonForm.lessonOrder)) || Number(lessonForm.lessonOrder) < 1)
      errs.lessonOrder = "El orden debe ser un número mayor a 0";
    const dur = Number(lessonForm.defaultDurationMinutes);
    if (isNaN(dur) || dur < 1 || dur > 600) errs.defaultDurationMinutes = "Entre 1 y 600 minutos";
    return errs;
  };

  const handleSaveLesson = async (e) => {
    e.preventDefault();
    const errs = validateLessonForm();
    if (Object.keys(errs).length > 0) { setLessonFormErrors(errs); return; }

    try {
      setLessonSaving(true);
      setError("");

      if (lessonModalMode === "create") {
        const payload = {
          level: { id: selectedLevel.id },
          lessonName: lessonForm.lessonName.trim(),
          lessonOrder: Number(lessonForm.lessonOrder),
          defaultDurationMinutes: Number(lessonForm.defaultDurationMinutes),
          isActive: true,
        };
        await apiService.createLessonTemplate(payload);
        setSuccess(`✅ Lección "${payload.lessonName}" creada`);
      } else {
        const payload = {
          lessonName: lessonForm.lessonName.trim(),
          lessonOrder: Number(lessonForm.lessonOrder),
          defaultDurationMinutes: Number(lessonForm.defaultDurationMinutes),
          isActive: lessonForm.isActive,
        };
        await apiService.updateLessonTemplate(editingLesson.id, payload);
        setSuccess(`✅ Lección "${payload.lessonName}" actualizada`);
      }

      setShowLessonModal(false);
      loadLessons(selectedLevel.code);
    } catch (err) {
      logError("Error guardando lección:", err);
      const msg = err?.response?.data?.message || err?.message || "Error desconocido";
      setError(`Error al guardar la lección: ${msg}`);
    } finally {
      setLessonSaving(false);
    }
  };

  const handleDeactivateLesson = (lesson) => {
    setConfirmModal({ open: true, type: "lesson", id: lesson.id, name: lesson.lessonName });
  };

  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(""), 4000);
      return () => clearTimeout(t);
    }
  }, [success]);

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0f172a] p-4 md:p-8 pt-20 transition-colors duration-500">
      <div className="max-w-[1600px] mx-auto space-y-8 animate-in">
        
        {/* ── HEADER CONSOLA ── */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-white dark:bg-slate-900/50 backdrop-blur-xl p-8 rounded-[3rem] border border-slate-200 dark:border-white/5 shadow-2xl shadow-slate-200/50 dark:shadow-none">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 rounded-3xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
              <Settings size={32} />
            </div>
            <div className="space-y-1">
              <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white uppercase leading-none">
                Gestión <span className="text-indigo-600">Curricular</span>
              </h1>
              <p className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em]">Arquitectura • Niveles • Lecciones</p>
            </div>
          </div>
          <button 
            onClick={handleOpenCreateLevel}
            className="group px-8 py-5 bg-slate-900 dark:bg-white text-white dark:text-indigo-900 rounded-[2rem] font-black text-[10px] uppercase tracking-[0.2em] transition-all hover:scale-105 active:scale-95 flex items-center gap-3 shadow-xl"
          >
            <Plus size={18} strokeWidth={3} className="transition-transform group-hover:rotate-90" />
            Nuevo Nivel de Formación
          </button>
        </div>

        {/* ── ALERTS ZONE ── */}
        {(error || success) && (
          <div className="flex flex-col gap-3">
            {error && (
              <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 p-6 rounded-[2rem] flex items-center justify-between animate-in">
                <div className="flex items-center gap-4 text-rose-600 dark:text-rose-400">
                  <AlertCircle size={24} />
                  <p className="font-bold text-sm tracking-tight capitalize">{error}</p>
                </div>
                <button onClick={() => setError("")} className="text-rose-400 hover:text-rose-600 transition-colors"><X size={20}/></button>
              </div>
            )}
            {success && (
              <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 p-6 rounded-[2rem] flex items-center justify-between animate-in">
                <div className="flex items-center gap-4 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 size={24} />
                  <p className="font-bold text-sm tracking-tight">{success}</p>
                </div>
                <button onClick={() => setSuccess("")} className="text-emerald-400 hover:text-emerald-600 transition-colors"><X size={20}/></button>
              </div>
            )}
          </div>
        )}

        {/* ── MAIN CONTENT: TWO COLUMNS GRID ── */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
          
          {/* ── IZQUIERDA: LISTA DE NIVELES (COL 4) ── */}
          <div className="xl:col-span-4 space-y-6">
            <div className="flex items-center justify-between px-4">
              <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Ruta de Formación ({levels.length})</h2>
            </div>
            
            <div className="space-y-4 max-h-[800px] overflow-y-auto pr-2 custom-scrollbar">
              {loading ? (
                <div className="h-64 flex flex-col items-center justify-center bg-white/50 dark:bg-white/5 rounded-[3rem] border border-dashed border-slate-300 dark:border-white/10">
                   <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mb-4" />
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Calculando Ruta...</p>
                </div>
              ) : levels.length === 0 ? (
                <div className="p-12 text-center bg-white/50 dark:bg-white/5 rounded-[3rem] border border-dashed border-slate-300 dark:border-white/10">
                   <BookOpen size={48} className="mx-auto text-slate-200/50 mb-4" />
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-loose">No hay niveles configurados en el sistema central</p>
                </div>
              ) : (
                [...levels]
                  .sort((a, b) => (a.levelOrder || 0) - (b.levelOrder || 0))
                  .map((level) => (
                    <div
                      key={level.id}
                      onClick={() => handleSelectLevel(level)}
                      className={`group relative overflow-hidden p-6 cursor-pointer transition-all duration-500 rounded-[2.5rem] border-2 shadow-sm ${
                        selectedLevel?.id === level.id 
                          ? "bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-600/30" 
                          : "bg-white dark:bg-slate-900/50 border-slate-100 dark:border-white/5 hover:border-indigo-500/50 dark:hover:border-indigo-400/50"
                      } ${!level.isActive ? "opacity-60 grayscale-[0.5]" : ""}`}
                    >
                      <div className="flex items-center gap-6 relative">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black transition-all ${
                          selectedLevel?.id === level.id ? "bg-white/20" : "bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                        }`}>
                          {level.levelOrder}
                        </div>
                        <div className="space-y-1 flex-1">
                          <h3 className={`font-black text-sm uppercase tracking-tight ${
                             selectedLevel?.id === level.id ? "text-white" : "text-slate-900 dark:text-white"
                          }`}>{escapeHtml(level.displayName)}</h3>
                          <p className={`text-[10px] font-bold ${
                            selectedLevel?.id === level.id ? "text-indigo-200" : "text-slate-400"
                          }`}>{level.code}</p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                           {level.requiresPayment && (
                             <div className={`w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-md ${
                               selectedLevel?.id === level.id ? "bg-white/20 text-white" : "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500"
                             }`}>
                               <CreditCard size={14} />
                             </div>
                           )}
                           <ChevronRight size={18} className={`transition-transform duration-500 ${
                             selectedLevel?.id === level.id ? "translate-x-1 opacity-100" : "opacity-0 -translate-x-2"
                           }`} />
                        </div>
                      </div>
                      {!level.isActive && (
                        <div className="absolute top-2 right-6">
                           <span className="text-[8px] font-black uppercase tracking-tighter bg-slate-200 dark:bg-slate-800 text-slate-500 px-2 py-1 rounded-full">Inactivo</span>
                        </div>
                      )}
                    </div>
                  ))
              )}
            </div>
          </div>

          {/* ── DERECHA: DETALLE Y LECCIONES (COL 8) ── */}
          <div className="xl:col-span-8 space-y-8">
            {!selectedLevel ? (
              <div className="h-full min-h-[500px] flex flex-col items-center justify-center bg-white/50 dark:bg-slate-900/20 backdrop-blur-xl rounded-[4rem] border border-slate-200 dark:border-white/5 border-dashed">
                 <div className="w-32 h-32 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-8 relative">
                   <div className="absolute inset-0 bg-indigo-500 rounded-full animate-ping opacity-10"></div>
                   <ArrowRight size={48} className="text-slate-400 rotate-180 xl:rotate-0" />
                 </div>
                 <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Panel de Ingeniería</h2>
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mt-2">Selecciona un nivel de la ruta académica</p>
              </div>
            ) : (
              <div className="space-y-8 animate-in">
                {/* ─ FICHA DEL NIVEL ─ */}
                <div className="bg-white dark:bg-slate-900/50 backdrop-blur-xl p-10 md:p-14 rounded-[4rem] border border-slate-200 dark:border-white/5 shadow-3xl shadow-slate-200/50 dark:shadow-none space-y-10 relative overflow-hidden">
                   {/* Decoration */}
                   <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-600/5 rounded-full blur-[80px]"></div>

                   <div className="flex flex-col md:flex-row justify-between items-start gap-8 border-b border-slate-100 dark:border-white/5 pb-10">
                      <div className="space-y-4">
                        <div className="flex items-center gap-4">
                           <span className="px-4 py-1.5 bg-indigo-600 text-white text-[10px] font-black rounded-full uppercase tracking-tighter">Nivel {selectedLevel.levelOrder}</span>
                           <h2 className="text-4xl md:text-5xl font-black tracking-tighter text-slate-900 dark:text-white uppercase leading-none">{escapeHtml(selectedLevel.displayName)}</h2>
                        </div>
                        <div className="flex flex-wrap gap-4">
                           <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-slate-800 rounded-2xl text-[10px] font-bold text-slate-500 uppercase">
                              <ShieldCheck size={14} /> ID: {selectedLevel.code}
                           </div>
                           <div className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-[10px] font-bold uppercase ${
                              selectedLevel.isActive ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500" : "bg-rose-50 dark:bg-rose-500/10 text-rose-500"
                           }`}>
                              {selectedLevel.isActive ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                              {selectedLevel.isActive ? "Certificable" : "Deshabilitado"}
                           </div>
                           <div className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-[10px] font-bold uppercase ${
                              selectedLevel.requiresPayment ? "bg-amber-50 dark:bg-amber-500/10 text-amber-500" : "bg-sky-50 dark:bg-sky-500/10 text-sky-500"
                           }`}>
                              <CreditCard size={14} /> {selectedLevel.requiresPayment ? "Inscripción con Costo" : "Inscripción Gratuita"}
                           </div>
                        </div>
                        {selectedLevel.description && (
                          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium max-w-2xl leading-relaxed">{escapeHtml(selectedLevel.description)}</p>
                        )}
                      </div>
                      
                      <div className="flex gap-3 shrink-0">
                         <button 
                           onClick={() => handleOpenEditLevel(selectedLevel)}
                           className="w-14 h-14 bg-slate-100 dark:bg-white/5 rounded-2xl flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-white hover:shadow-xl transition-all active:scale-95"
                         >
                           <Edit3 size={20} />
                         </button>
                         {selectedLevel.isActive && (
                           <button 
                             onClick={() => handleDeactivateLevel(selectedLevel.id, selectedLevel.displayName)}
                             className="w-14 h-14 bg-rose-50 dark:bg-rose-500/10 rounded-2xl flex items-center justify-center text-rose-500 hover:bg-rose-500 hover:text-white transition-all active:scale-95"
                           >
                             <Trash2 size={20} />
                           </button>
                         )}
                      </div>
                   </div>

                   {/* ─ SECCIÓN LECCIONES ─ */}
                   <div className="space-y-8">
                      <div className="flex items-center justify-between">
                         <div className="flex items-center gap-4">
                            <div className="w-1.5 h-8 bg-indigo-600 rounded-full"></div>
                            <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Estructura Académica</h3>
                            <span className="text-[10px] font-black text-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 px-3 py-1 rounded-full uppercase">{lessons.length} Módulos</span>
                         </div>
                         <button 
                           onClick={handleOpenCreateLesson}
                           className="px-6 py-3 bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-indigo-600 hover:text-white transition-all active:scale-95 flex items-center gap-2"
                         >
                            <Plus size={14} strokeWidth={3} /> Agregar Lección
                         </button>
                      </div>

                      {lessonsLoading ? (
                        <div className="py-20 flex flex-col items-center justify-center">
                           <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mb-4" />
                           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sincronizando Módulos...</p>
                        </div>
                      ) : lessons.length === 0 ? (
                        <div className="py-20 text-center bg-slate-50 dark:bg-white/5 rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-white/5">
                           <BookMarked size={48} className="mx-auto text-slate-200/50 mb-4" />
                           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-loose">No hay lecciones definidas para este nivel</p>
                           <button onClick={handleOpenCreateLesson} className="mt-6 font-black text-indigo-600 text-[10px] uppercase tracking-widest hover:underline">Configurar Estructura Ahora</button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           {[...lessons]
                             .sort((a, b) => (a.lessonOrder || 0) - (b.lessonOrder || 0))
                             .map((lesson) => (
                               <div 
                                 key={lesson.id}
                                 className={`group p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-transparent hover:border-indigo-500/30 hover:bg-white dark:hover:bg-slate-800 transition-all duration-300 relative ${!lesson.isActive ? "opacity-60 grayscale" : ""}`}
                               >
                                 <div className="flex items-center gap-5">
                                    <div className="w-12 h-12 bg-white dark:bg-slate-700 rounded-2xl flex items-center justify-center text-lg font-black text-slate-400 dark:text-slate-500 group-hover:text-indigo-600 transition-colors">
                                       {lesson.lessonOrder}
                                    </div>
                                    <div className="flex-1 space-y-1 overflow-hidden">
                                       <h4 className="font-black text-[11px] uppercase tracking-tight text-slate-900 dark:text-white truncate">{escapeHtml(lesson.lessonName)}</h4>
                                       <div className="flex items-center gap-3">
                                          <div className="flex items-center gap-1.5 text-slate-400">
                                             <Clock size={12} />
                                             <span className="text-[10px] font-bold">{lesson.defaultDurationMinutes}m</span>
                                          </div>
                                          {!lesson.isActive && <span className="text-[9px] font-black text-rose-500 uppercase tracking-tighter">Inactiva</span>}
                                       </div>
                                    </div>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                       <button onClick={() => handleOpenEditLesson(lesson)} className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-xl transition-all">
                                          <Edit3 size={14} />
                                       </button>
                                       {lesson.isActive && (
                                         <button onClick={() => handleDeactivateLesson(lesson)} className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-all focus:ring-0">
                                            <Trash2 size={14} />
                                         </button>
                                       )}
                                    </div>
                                 </div>
                               </div>
                             ))}
                        </div>
                      )}
                   </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── MODAL: NIVEL ── */}
      {showLevelModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowLevelModal(false)}></div>
          <div className="relative bg-white dark:bg-slate-900 w-full max-w-xl rounded-[3rem] shadow-4xl shadow-slate-900/20 overflow-hidden animate-in">
            <div className="p-10 space-y-8">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white uppercase leading-none">
                    {levelModalMode === "create" ? "Nuevo Nivel" : "Configurar Nivel"}
                  </h2>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Cámara Curricular</p>
                </div>
                <button onClick={() => setShowLevelModal(false)} className="w-12 h-12 flex items-center justify-center rounded-2xl bg-slate-50 dark:bg-white/5 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
                  <X size={20} strokeWidth={3} />
                </button>
              </div>

              <form onSubmit={handleSaveLevel} className="space-y-6">
                {(levelModalMode === "create") && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Código Maestro (Inmutable)</label>
                    <input
                      type="text"
                      value={levelForm.code}
                      onChange={(e) => setLevelForm({ ...levelForm, code: e.target.value.toUpperCase().replace(/\s/g, '_') })}
                      placeholder="EJ: NIVEL_ESENCIA_1"
                      className={`w-full p-6 bg-slate-50 dark:bg-white/5 rounded-3xl text-sm font-bold text-slate-900 dark:text-white border-2 transition-all outline-none focus:ring-0 ${
                        levelFormErrors.code ? "border-rose-500" : "border-transparent focus:border-indigo-500"
                      }`}
                    />
                    {levelFormErrors.code && <p className="text-[10px] font-bold text-rose-500 ml-2">{levelFormErrors.code}</p>}
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Nombre Público</label>
                  <input
                    type="text"
                    value={levelForm.displayName}
                    onChange={(e) => setLevelForm({ ...levelForm, displayName: e.target.value })}
                    placeholder="Nombre del curso..."
                    className={`w-full p-6 bg-slate-50 dark:bg-white/5 rounded-3xl text-sm font-bold text-slate-900 dark:text-white border-2 transition-all outline-none focus:ring-0 ${
                      levelFormErrors.displayName ? "border-rose-500" : "border-transparent focus:border-indigo-500"
                    }`}
                  />
                  {levelFormErrors.displayName && <p className="text-[10px] font-bold text-rose-500 ml-2">{levelFormErrors.displayName}</p>}
                </div>

                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Breve Sinopsis</label>
                   <textarea
                     value={levelForm.description}
                     onChange={(e) => setLevelForm({ ...levelForm, description: e.target.value })}
                     placeholder="¿De qué trata este nivel?"
                     rows={3}
                     className="w-full p-6 bg-slate-50 dark:bg-white/5 rounded-3xl text-sm font-bold text-slate-900 dark:text-white border-2 border-transparent focus:border-indigo-500 transition-all outline-none resize-none"
                   />
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Orden en Ruta</label>
                      <input
                        type="number"
                        value={levelForm.levelOrder}
                        onChange={(e) => setLevelForm({ ...levelForm, levelOrder: e.target.value })}
                        className="w-full p-6 bg-slate-50 dark:bg-white/5 rounded-3xl text-sm font-bold text-slate-900 dark:text-white border-2 border-transparent focus:border-indigo-500 transition-all outline-none"
                      />
                   </div>
                   <div className="flex flex-col gap-3 justify-center pt-6">
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={levelForm.requiresPayment}
                          onChange={(e) => setLevelForm({ ...levelForm, requiresPayment: e.target.checked })}
                          className="w-5 h-5 rounded-lg border-2 border-slate-300 dark:border-white/10 text-indigo-600 focus:ring-0 transition-all cursor-pointer bg-transparent"
                        />
                        <span className="text-[10px] font-black text-slate-400 group-hover:text-slate-600 dark:group-hover:text-white transition-colors uppercase tracking-[0.2em]">Requiere Pago</span>
                      </label>
                      {levelModalMode === "edit" && (
                        <label className="flex items-center gap-3 cursor-pointer group">
                          <input
                            type="checkbox"
                            checked={levelForm.isActive}
                            onChange={(e) => setLevelForm({ ...levelForm, isActive: e.target.checked })}
                            className="w-5 h-5 rounded-lg border-2 border-slate-300 dark:border-white/10 text-emerald-600 focus:ring-0 transition-all cursor-pointer bg-transparent"
                          />
                          <span className="text-[10px] font-black text-slate-400 group-hover:text-slate-600 dark:group-hover:text-white transition-colors uppercase tracking-[0.2em]">Nivel Activo</span>
                        </label>
                      )}
                   </div>
                </div>

                <div className="pt-6 flex gap-4">
                  <button type="button" onClick={() => setShowLevelModal(false)} className="flex-1 p-6 bg-slate-50 dark:bg-white/5 rounded-3xl font-black text-[10px] text-slate-500 uppercase tracking-widest hover:bg-slate-100 dark:hover:bg-white/10 transition-colors">Cancelar</button>
                  <button type="submit" disabled={levelSaving} className="flex-[2] p-6 bg-indigo-600 text-white rounded-3xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-500 shadow-xl shadow-indigo-600/30 transition-all active:scale-95 disabled:grayscale">
                    {levelSaving ? "Cargando..." : "Sincronizar Arquitectura"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: LECCIÓN ── */}
      {showLessonModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowLessonModal(false)}></div>
          <div className="relative bg-white dark:bg-slate-900 w-full max-w-lg rounded-[3.5rem] shadow-4xl shadow-slate-900/20 overflow-hidden animate-in">
            <div className="p-10 space-y-8">
               <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white uppercase leading-none">
                      {lessonModalMode === "create" ? "Nuevo Módulo" : "Editar Módulo"}
                    </h2>
                    <p className="text-[10px] font-black text-indigo-500 dark:text-indigo-400 uppercase tracking-[0.3em] font-bold">Ref: {selectedLevel?.displayName}</p>
                  </div>
                  <button onClick={() => setShowLessonModal(false)} className="w-12 h-12 flex items-center justify-center rounded-2xl bg-slate-50 dark:bg-white/5 text-slate-400 hover:text-white transition-colors"><X size={20} strokeWidth={3}/></button>
               </div>

               <form onSubmit={handleSaveLesson} className="space-y-6">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Título de la Lección</label>
                    <input
                      type="text"
                      value={lessonForm.lessonName}
                      onChange={(e) => setLessonForm({ ...lessonForm, lessonName: e.target.value })}
                      placeholder="Ej: Fundamentos de la Fe"
                      className={`w-full p-6 bg-slate-50 dark:bg-white/5 rounded-[2rem] text-sm font-bold text-slate-900 dark:text-white border-2 outline-none transition-all ${
                        lessonFormErrors.lessonName ? "border-rose-500" : "border-transparent focus:border-indigo-500"
                      }`}
                    />
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Orden Secuencial</label>
                       <input
                         type="number"
                         value={lessonForm.lessonOrder}
                         onChange={(e) => setLessonForm({ ...lessonForm, lessonOrder: e.target.value })}
                         className="w-full p-6 bg-slate-50 dark:bg-white/5 rounded-[2rem] text-sm font-bold text-slate-900 dark:text-white border-2 border-transparent focus:border-indigo-500 transition-all outline-none"
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Minutos (Est.)</label>
                       <div className="relative">
                          <input
                            type="number"
                            value={lessonForm.defaultDurationMinutes}
                            onChange={(e) => setLessonForm({ ...lessonForm, defaultDurationMinutes: e.target.value })}
                            className="w-full p-6 bg-slate-50 dark:bg-white/5 rounded-[2rem] text-sm font-bold text-slate-900 dark:text-white border-2 border-transparent focus:border-indigo-500 transition-all outline-none"
                          />
                          <Clock size={16} className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400" />
                       </div>
                    </div>
                 </div>

                 {lessonModalMode === "edit" && (
                    <label className="flex items-center gap-3 cursor-pointer group ml-2">
                      <input
                        type="checkbox"
                        checked={lessonForm.isActive}
                        onChange={(e) => setLessonForm({ ...lessonForm, isActive: e.target.checked })}
                        className="w-5 h-5 rounded-lg border-2 border-slate-300 dark:border-white/10 text-indigo-600 focus:ring-0 transition-all cursor-pointer bg-transparent"
                      />
                      <span className="text-[10px] font-black text-slate-400 group-hover:text-slate-600 dark:group-hover:text-white transition-colors uppercase tracking-[0.2em]">Módulo Activo</span>
                    </label>
                 )}

                 <div className="pt-6 flex gap-4">
                   <button type="button" onClick={() => setShowLessonModal(false)} className="flex-1 p-6 bg-slate-50 dark:bg-white/5 rounded-[2rem] font-black text-[10px] text-slate-500 uppercase tracking-widest hover:bg-slate-100 dark:hover:bg-white/10 transition-colors focus:ring-0 focus:outline-none">Descartar</button>
                   <button type="submit" disabled={lessonSaving} className="flex-[2] p-6 bg-indigo-600 text-white rounded-[2rem] font-black text-[10px] uppercase tracking-widest hover:bg-indigo-500 shadow-xl shadow-indigo-600/30 transition-all active:scale-95 disabled:grayscale focus:ring-0 focus:outline-none">
                     {lessonSaving ? "Registrando..." : "Guardar Módulo"}
                   </button>
                 </div>
               </form>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: CONFIRMACIÓN ── */}
      {confirmModal.open && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setConfirmModal({ open: false, type: "", id: null, name: "" })}></div>
           <div className="relative bg-white dark:bg-slate-900 w-full max-w-md p-10 rounded-[3.5rem] shadow-4xl animate-in text-center space-y-8">
              <div className="w-20 h-20 bg-rose-50 dark:bg-rose-500/10 rounded-full flex items-center justify-center text-rose-500 mx-auto animate-bounce">
                 <Trash2 size={40} />
              </div>
              <div className="space-y-4">
                 <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white uppercase leading-none">Confirmar Desconexión</h2>
                 <p className="text-sm text-slate-500 font-medium">¿Estás seguro de desactivar <span className="text-indigo-600 dark:text-indigo-400 font-black">"{escapeHtml(confirmModal.name)}"</span>? Esta acción conservará los registros históricos pero lo ocultará del currículo activo.</p>
              </div>
              <div className="flex gap-4 pt-4">
                 <button onClick={() => setConfirmModal({ open: false, type: "", id: null, name: "" })} className="flex-1 p-5 rounded-2xl font-black text-[10px] text-slate-500 bg-slate-50 dark:bg-white/5 uppercase tracking-widest transition-colors">Abortar</button>
                 <button onClick={handleConfirmDeactivate} className="flex-1 p-5 rounded-2xl font-black text-[10px] text-white bg-rose-500 uppercase tracking-widest hover:bg-rose-600 shadow-xl shadow-rose-500/30 transition-all active:scale-95 focus:ring-0">Desactivar Ahora</button>
              </div>
           </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-in { animation: fadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); }
        .shadow-3xl { box-shadow: 0 32px 64px -16px rgba(0, 0, 0, 0.1); }
        .shadow-4xl { box-shadow: 0 48px 96px -24px rgba(0, 0, 0, 0.25); }
      `}} />
    </div>
  );
};

export default LevelsConfigPage;