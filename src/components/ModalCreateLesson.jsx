// ============================================
// ModalCreateLesson.jsx - TAILWIND EDITION
// Diseño Tailwind moderno + lógica completa original
// ============================================

import React, { useState, useEffect } from 'react';
import {
  X,
  BookOpen,
  ListOrdered,
  Clock,
  Calendar as CalendarIcon,
  AlignLeft,
  AlertCircle,
  CheckCircle2,
  FileText,
  Loader2,
  ListVideo,
  Save,
} from 'lucide-react';
import apiService from '../apiService';

const ModalCreateLesson = ({ isOpen, onClose, enrollmentId, onLessonCreated }) => {
  const [mode, setMode] = useState('individual');
  const [formData, setFormData] = useState({
    lessonName: '',
    lessonNumber: '',
    lessonDate: '',
    durationMinutes: 120,
    description: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showInitializeAttendance, setShowInitializeAttendance] = useState(false);
  const [createdLessonId, setCreatedLessonId] = useState(null);
  const [createdLessons, setCreatedLessons] = useState([]);
  const [initializingAttendance, setInitializingAttendance] = useState(false);

  // Cerrar con Escape
  useEffect(() => {
    const handleEscape = (e) => { if (e.key === 'Escape') handleClose(); };
    if (isOpen) window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // ── Handlers de formulario ──────────────────────────────────────────────
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'durationMinutes' ? parseInt(value) || 0 : value,
    }));
  };

  const validateForm = () => {
    if (!formData.lessonName?.trim()) { setError('El nombre de la lección es requerido'); return false; }
    if (!formData.lessonNumber) { setError('El número de lección es requerido'); return false; }
    if (!formData.lessonDate) { setError('La fecha de la lección es requerida'); return false; }
    if (formData.durationMinutes <= 0) { setError('La duración debe ser mayor a 0'); return false; }
    return true;
  };

  // ── Creación individual ─────────────────────────────────────────────────
  const handleCreateIndividualLesson = async (e) => {
    e.preventDefault();
    setError('');
    if (!validateForm()) return;
    setLoading(true);
    try {
      const dateTime = formData.lessonDate.includes('T') ? formData.lessonDate : `${formData.lessonDate}T09:00:00`;
      const lessonData = {
        enrollmentId,
        lessonName: formData.lessonName,
        lessonNumber: parseInt(formData.lessonNumber),
        lessonDate: dateTime,
        durationMinutes: formData.durationMinutes,
        description: formData.description,
      };
      const response = await apiService.createLesson(lessonData);
      setCreatedLessonId(response.lessonId);
      setShowInitializeAttendance(true);
      setFormData({ lessonName: '', lessonNumber: '', lessonDate: '', durationMinutes: 120, description: '' });
      if (onLessonCreated) onLessonCreated(response);
    } catch (err) {
      console.error('❌ Error al crear lección:', err);
      setError(err.message || 'Error al crear la lección');
    } finally {
      setLoading(false);
    }
  };

  // ── Plan predeterminado ─────────────────────────────────────────────────
  const handleCreateDefaultPlan = async () => {
    setError('');
    setLoading(true);
    try {
      const response = await apiService.createDefaultLessonPlan(enrollmentId);
      setCreatedLessons(response.lessons || []);
      setShowInitializeAttendance(true);
      if (onLessonCreated) onLessonCreated(response);
    } catch (err) {
      console.error('❌ Error al crear plan de lecciones:', err);
      setError(err.message || 'Error al crear el plan de lecciones');
    } finally {
      setLoading(false);
    }
  };

  // ── Inicializar asistencias ─────────────────────────────────────────────
  const handleInitializeAttendance = async () => {
    if (!createdLessonId && createdLessons.length === 0) return;
    setInitializingAttendance(true);
    try {
      if (createdLessonId) {
        await apiService.initializeLessonAttendance(createdLessonId);
      } else if (createdLessons.length > 0) {
        for (const lesson of createdLessons) {
          try { await apiService.initializeLessonAttendance(lesson.id); }
          catch (err) { console.warn(`⚠️ Error inicializando lección ${lesson.id}:`, err); }
        }
      }
      setShowInitializeAttendance(false);
      setCreatedLessonId(null);
      setCreatedLessons([]);
      handleClose();
    } catch (err) {
      console.error('❌ Error al inicializar asistencias:', err);
      setError(err.message || 'Error al inicializar asistencias');
    } finally {
      setInitializingAttendance(false);
    }
  };

  const handleSkipAttendance = () => {
    setShowInitializeAttendance(false);
    setCreatedLessonId(null);
    setCreatedLessons([]);
    handleClose();
  };

  const handleClose = () => {
    setFormData({ lessonName: '', lessonNumber: '', lessonDate: '', durationMinutes: 120, description: '' });
    setError('');
    setMode('individual');
    setShowInitializeAttendance(false);
    setCreatedLessonId(null);
    setCreatedLessons([]);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[1200] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md"
      style={{ animation: 'mcl-fadein 0.25s ease' }}
    >
      <div
        className="w-full max-w-2xl bg-white dark:bg-slate-950 rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-100 dark:border-slate-800 max-h-[90vh]"
        style={{ animation: 'mcl-slidein 0.3s cubic-bezier(0.16,1,0.3,1)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── HEADER ── */}
        <div className="relative pt-7 pb-6 px-8 bg-gradient-to-br from-indigo-600 to-indigo-800 shrink-0 overflow-hidden">
          <div className="absolute -top-16 -right-16 w-56 h-56 bg-white/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20 shadow-lg">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-black text-white leading-tight tracking-tight">Gestor de Lecciones</h2>
                <p className="text-indigo-100 text-[10px] font-black uppercase tracking-widest opacity-80 mt-0.5">Estructura Académica</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2.5 bg-white/10 hover:bg-white/25 text-white rounded-xl transition-all active:scale-90"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ── BODY ── */}
        <div className="flex-1 overflow-y-auto p-8 mcl-scrollbar">
          {!showInitializeAttendance ? (
            <div className="space-y-6">
              {/* Error */}
              {error && (
                <div className="flex items-center gap-3 p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800 rounded-2xl text-rose-600 dark:text-rose-400">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <p className="text-xs font-black uppercase tracking-tight">{error}</p>
                </div>
              )}

              {/* Selector de modo */}
              <div className="grid grid-cols-2 gap-3">
                <ModeButton
                  active={mode === 'individual'}
                  disabled={loading && mode !== 'individual'}
                  onClick={() => setMode('individual')}
                  icon={<FileText className="w-7 h-7" />}
                  label="Lección Individual"
                />
                <ModeButton
                  active={mode === 'default-plan'}
                  disabled={loading && mode !== 'default-plan'}
                  onClick={() => setMode('default-plan')}
                  icon={<ListVideo className="w-7 h-7" />}
                  label="Plan Predeterminado"
                />
              </div>

              {/* ── MODO INDIVIDUAL ── */}
              {mode === 'individual' && (
                <form id="individual-lesson-form" onSubmit={handleCreateIndividualLesson} className="space-y-5">
                  <FormField label="Título de la Lección *" icon={<BookOpen size={15} />}>
                    <input
                      type="text"
                      name="lessonName"
                      value={formData.lessonName}
                      onChange={handleChange}
                      placeholder="Ej: Fundamentos de fe"
                      disabled={loading}
                      className="mcl-input"
                    />
                  </FormField>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField label="N° Lección *" icon={<ListOrdered size={15} />}>
                      <input type="number" name="lessonNumber" value={formData.lessonNumber} onChange={handleChange} placeholder="1" min="1" disabled={loading} className="mcl-input" />
                    </FormField>
                    <FormField label="Duración (min) *" icon={<Clock size={15} />}>
                      <input type="number" name="durationMinutes" value={formData.durationMinutes} onChange={handleChange} placeholder="120" min="1" disabled={loading} className="mcl-input" />
                    </FormField>
                  </div>

                  <FormField label="Fecha de Ejecución *" icon={<CalendarIcon size={15} />}>
                    <input type="datetime-local" name="lessonDate" value={formData.lessonDate} onChange={handleChange} disabled={loading} className="mcl-input" />
                  </FormField>

                  <FormField label="Descripción / Objetivos" icon={<AlignLeft size={15} />} textarea>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      placeholder="Descripción de la lección..."
                      rows="3"
                      disabled={loading}
                      className="mcl-input resize-none"
                    />
                  </FormField>

                  <div className="p-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 rounded-2xl flex items-start gap-3 text-amber-700 dark:text-amber-400">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <p className="text-xs font-bold leading-relaxed">Las asistencias se crean de forma independiente. Después de guardar, podrás inicializarlas.</p>
                  </div>
                </form>
              )}

              {/* ── MODO PLAN PREDETERMINADO ── */}
              {mode === 'default-plan' && (
                <div className="space-y-4">
                  <div className="p-5 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-2xl">
                    <div className="flex items-center gap-2 mb-2">
                      <ListVideo size={16} className="text-indigo-600 dark:text-indigo-400" />
                      <h3 className="text-sm font-black uppercase tracking-widest text-indigo-700 dark:text-indigo-300">Plan Automático</h3>
                    </div>
                    <p className="text-xs font-semibold text-indigo-700/80 dark:text-indigo-300/80 leading-relaxed">
                      Se generarán todas las lecciones correspondientes al nivel de esta cohorte. Las fechas se programarán secuencialmente desde la fecha de inicio.
                    </p>
                  </div>

                  <div className="p-5 bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800 rounded-2xl">
                    <div className="flex items-center gap-2 mb-3">
                      <AlertCircle size={16} className="text-rose-600 dark:text-rose-400" />
                      <h3 className="text-sm font-black uppercase tracking-widest text-rose-700 dark:text-rose-300">Condiciones</h3>
                    </div>
                    <ul className="space-y-2 text-xs font-bold text-rose-700/80 dark:text-rose-300/80">
                      <li className="flex items-center gap-2"><CheckCircle2 size={13} className="text-emerald-500" /> Operación masiva automática</li>
                      <li className="flex items-center gap-2"><X size={13} className="text-rose-500" /> No se puede deshacer una vez creado</li>
                      <li className="flex items-center gap-2"><CheckCircle2 size={13} className="text-emerald-500" /> Requiere inicializar asistencias a posteriori</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* ── ESTADO DE ÉXITO ── */
            <div className="py-10 flex flex-col items-center justify-center text-center">
              <div className="relative w-20 h-20 mb-6">
                <div className="absolute inset-0 bg-emerald-500 rounded-full animate-ping opacity-20" />
                <div className="relative z-10 w-20 h-20 bg-emerald-50 dark:bg-emerald-500/10 rounded-full flex items-center justify-center border-2 border-emerald-200 dark:border-emerald-500/30">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                </div>
              </div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">
                ¡{createdLessonId ? 'Lección Creada' : 'Plan Generado'}!
              </h3>

              {createdLessons.length > 0 && (
                <div className="w-full mt-5 bg-slate-50 dark:bg-slate-900 rounded-2xl p-4 text-left border border-slate-100 dark:border-slate-800 max-h-48 overflow-y-auto mcl-scrollbar">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1">
                    Estructura ({createdLessons.length} lecciones)
                  </p>
                  <div className="space-y-2">
                    {createdLessons.map((lesson, idx) => (
                      <div key={lesson.id} className="flex items-center gap-3 p-2.5 bg-white dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800">
                        <span className="w-6 h-6 flex items-center justify-center bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 rounded-lg text-[10px] font-black shrink-0">{idx + 1}</span>
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">{lesson.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-8 space-y-4 w-full">
                <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                  ¿Deseas inicializar los registros de asistencia para los alumnos vinculados?
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    onClick={handleSkipAttendance}
                    disabled={initializingAttendance}
                    className="px-8 py-3.5 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-black uppercase tracking-widest rounded-2xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all active:scale-95 disabled:opacity-50"
                  >
                    Hacerlo Después
                  </button>
                  <button
                    onClick={handleInitializeAttendance}
                    disabled={initializingAttendance}
                    className="flex justify-center items-center gap-2 px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-indigo-600/20 transition-all active:scale-95 disabled:opacity-50"
                  >
                    {initializingAttendance ? <><Loader2 size={15} className="animate-spin" /> Procesando...</> : 'Iniciar Asistencias'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── FOOTER ── */}
        {!showInitializeAttendance && (
          <div className="p-6 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="px-7 py-3 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs font-black uppercase tracking-widest rounded-2xl border border-slate-100 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all active:scale-95 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type={mode === 'individual' ? 'submit' : 'button'}
              form={mode === 'individual' ? 'individual-lesson-form' : undefined}
              onClick={mode === 'default-plan' ? handleCreateDefaultPlan : undefined}
              disabled={loading}
              className="flex items-center gap-2.5 px-9 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-indigo-600/20 transition-all active:scale-95 disabled:opacity-50"
            >
              {loading
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : mode === 'individual' ? <Save size={15} /> : <ListVideo size={15} />
              }
              {loading ? 'Procesando...' : mode === 'individual' ? 'Guardar Lección' : 'Generar Plan'}
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes mcl-fadein { from { opacity: 0; } to { opacity: 1; } }
        @keyframes mcl-slidein { from { opacity: 0; transform: translateY(12px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
        .mcl-scrollbar::-webkit-scrollbar { width: 6px; }
        .mcl-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .mcl-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(156,163,175,0.4); border-radius: 20px; }
        .dark .mcl-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(71,85,105,0.6); }
        .mcl-input {
          width: 100%;
          padding: 10px 14px 10px 42px;
          background-color: rgb(248 250 252);
          border: 2px solid rgb(226 232 240);
          border-radius: 14px;
          font-size: 14px;
          font-weight: 500;
          color: rgb(15 23 42);
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
          font-family: inherit;
        }
        .mcl-input:focus { border-color: rgb(99 102 241 / 0.6); box-shadow: 0 0 0 3px rgb(99 102 241 / 0.1); }
        .mcl-input:disabled { opacity: 0.5; cursor: not-allowed; }
        @media (prefers-color-scheme: dark) {
          .mcl-input { background-color: rgb(15 23 42); border-color: rgb(30 41 59); color: rgb(241 245 249); }
        }
        :root.dark .mcl-input { background-color: rgb(15 23 42); border-color: rgb(30 41 59); color: rgb(241 245 249); }
      `}</style>
    </div>
  );
};

// ─── Componentes auxiliares ──────────────────────────────────────────────────
const ModeButton = ({ active, disabled, onClick, icon, label }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={`flex flex-col items-center justify-center gap-3 p-5 rounded-3xl border-2 transition-all duration-200 font-black text-[10px] uppercase tracking-widest
      ${active
        ? 'bg-indigo-50 dark:bg-indigo-500/10 border-indigo-500 text-indigo-600 dark:text-indigo-400'
        : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-400 hover:border-indigo-200'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
  >
    <span className={active ? 'text-indigo-500' : 'text-slate-300 dark:text-slate-600'}>{icon}</span>
    {label}
  </button>
);

const FormField = ({ label, icon, textarea, children }) => (
  <div className="space-y-1.5">
    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">{label}</label>
    <div className="relative group">
      <div className={`absolute left-4 ${textarea ? 'top-4' : 'top-1/2 -translate-y-1/2'} text-slate-400 group-focus-within:text-indigo-500 transition-colors pointer-events-none`}>
        {icon}
      </div>
      {children}
    </div>
  </div>
);

export default ModalCreateLesson;