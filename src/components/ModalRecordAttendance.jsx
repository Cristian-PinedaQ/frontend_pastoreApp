import React, { useState, useEffect, useCallback } from "react";
import {
  X,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  BookOpen,
  User,
  ShieldCheck,
  Star,
  Frown,
  Meh,
  CheckCircle,
  XCircle,
  Loader2,
  CalendarCheck2
} from "lucide-react";
import apiService from "../apiService";
import { useAuth } from '../context/AuthContext';
import { logUserAction } from "../utils/securityLogger";

const PARTICIPATION_SCORES = [
  { value: "NO_PARTICIPA", label: "No participa", emoji: <Frown className="w-5 h-5" />, color: "rose" },
  { value: "POCA_PARTICIPACION", label: "Poca partic.", emoji: <Meh className="w-5 h-5" />, color: "amber" },
  { value: "EXCELENTE_PARTICIPACION", label: "Excelente", emoji: <Star className="w-5 h-5" />, color: "emerald" },
];

const ModalRecordAttendance = ({
  isOpen,
  onClose,
  enrollmentId,
  onAttendanceRecorded,
  lessonTitle = "",
  statsPresent = null,
  statsTotal = null,
}) => {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const [lessons, setLessons] = useState([]);
  const [students, setStudents] = useState([]);
  
  const [formData, setFormData] = useState({
    lessonId: "",
    studentId: "",
    present: true,
    score: "POCA_PARTICIPACION",
    recordedBy: "",
  });

  const [touched, setTouched] = useState({});

  const loadData = useCallback(async () => {
    if (!enrollmentId) return;
    setLoadingData(true);
    setError("");
    try {
      const [lessonsData, enrollmentData] = await Promise.all([
        apiService.getLessonsByEnrollment(enrollmentId),
        apiService.getEnrollmentById(enrollmentId),
      ]);

      setLessons(lessonsData || []);
      const allStudents = enrollmentData?.studentEnrollments || [];
      setStudents(allStudents.filter(s => s.status !== "CANCELLED"));
    } catch (err) {
      setError("Error al sincronizar datos de la cohorte");
    } finally {
      setLoadingData(false);
    }
  }, [enrollmentId]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      loadData();
      if (user) setFormData(prev => ({ ...prev, recordedBy: user.username || user.name || "" }));
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen, loadData, user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const validateStep1 = () => {
    if (!formData.lessonId || !formData.studentId) {
      setTouched({ lessonId: !formData.lessonId, studentId: !formData.studentId });
      setError("Selección académica obligatoria");
      return false;
    }
    return true;
  };

  const handleRecord = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const payload = {
        studentEnrollmentId: parseInt(formData.studentId),
        lessonId: parseInt(formData.lessonId),
        present: formData.present,
        recordedBy: formData.recordedBy.trim(),
        score: formData.score,
      };

      await apiService.recordAttendance(payload);
      setSuccess(true);
      logUserAction("record_attendance", { lessonId: payload.lessonId, studentId: payload.studentEnrollmentId });
      
      setTimeout(() => {
        if (onAttendanceRecorded) onAttendanceRecorded();
        handleClose();
      }, 2000);
    } catch (err) {
      setError(err.message || "Fallo en el registro de asistencia");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep(1);
    setSuccess(false);
    setFormData({ lessonId: "", studentId: "", present: true, score: "POCA_PARTICIPACION", recordedBy: user?.username || "" });
    setTouched({});
    setError("");
    onClose();
  };

  if (!isOpen) return null;

  const statsPercentage = statsTotal ? Math.round((statsPresent / statsTotal) * 100) : 0;

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center p-0 sm:p-6 bg-slate-900/60 backdrop-blur-xl animate-in fade-in duration-300">
      <div className="w-full max-w-lg bg-white dark:bg-[#0f172a] sm:rounded-[2.5rem] shadow-2xl flex flex-col h-full sm:h-auto sm:max-h-[90vh] overflow-hidden border border-slate-200 dark:border-white/10 animate-in slide-in-from-bottom-8 duration-500">
        
        {/* HEADER */}
        <div className="relative pt-8 pb-6 px-8 bg-white dark:bg-[#0f172a] shrink-0 border-b border-slate-100 dark:border-white/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <CalendarCheck2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Asistencia</h2>
                <div className="flex items-center gap-2 mt-0.5">
                   <p className="text-slate-500 dark:text-indigo-400 text-[9px] font-black uppercase tracking-[0.2em]">{lessonTitle || "Registro Administrativo"}</p>
                </div>
              </div>
            </div>
            <button onClick={handleClose} className="p-3 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-400 hover:text-rose-500 rounded-xl transition-all"><X size={18} /></button>
          </div>

          {statsTotal !== null && (
            <div className="mt-6 flex items-center gap-3">
               <div className="flex-1 h-3 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-600 rounded-full transition-all duration-1000" style={{ width: `${statsPercentage}%` }} />
               </div>
               <span className="text-[10px] font-black text-slate-500 dark:text-indigo-400 uppercase tracking-widest">{statsPresent}/{statsTotal} ({statsPercentage}%)</span>
            </div>
          )}
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-slate-50/50 dark:bg-black/20">
          {success ? (
            <div className="flex flex-col items-center justify-center py-12 text-center animate-in zoom-in-95 duration-500">
               <div className="w-20 h-20 bg-emerald-500 text-white rounded-[2rem] flex items-center justify-center mb-6 shadow-2xl shadow-emerald-500/30">
                  <CheckCircle2 size={40} className="animate-bounce" />
               </div>
               <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Registro Exitoso</h3>
               <p className="text-slate-500 dark:text-slate-400 text-xs font-black uppercase tracking-widest mt-2 px-6">Cronología académica actualizada en el sistema central.</p>
            </div>
          ) : loadingData ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
               <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sincronizando registros...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {error && (
                <div className="p-4 bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 rounded-2xl flex items-center gap-3 animate-shake">
                  <XCircle className="text-rose-600 shrink-0" size={18} />
                  <p className="text-[10px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-widest leading-relaxed">{error}</p>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] ml-2 flex items-center gap-2"><BookOpen size={12} className="text-indigo-500" /> Lección Académica</label>
                    <select
                      name="lessonId"
                      value={formData.lessonId}
                      onChange={handleChange}
                      className={`w-full h-14 px-5 rounded-2xl bg-white dark:bg-[#1a2332] border-2 ${touched.lessonId ? 'border-rose-400' : 'border-slate-100 dark:border-white/5 focus:border-indigo-500'} font-bold text-sm outline-none shadow-sm transition-all`}
                    >
                      <option value="">Seleccionar Fase lección</option>
                      {lessons.map(l => (
                        <option key={l.id} value={l.id}>{l.lessonNumber}. {l.lessonName}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] ml-2 flex items-center gap-2"><User size={12} className="text-indigo-500" /> Estudiante en Formación</label>
                    <select
                      name="studentId"
                      value={formData.studentId}
                      onChange={handleChange}
                      className={`w-full h-14 px-5 rounded-2xl bg-white dark:bg-[#1a2332] border-2 ${touched.studentId ? 'border-rose-400' : 'border-slate-100 dark:border-white/5 focus:border-indigo-500'} font-bold text-sm outline-none shadow-sm transition-all`}
                    >
                      <option value="">Seleccionar Discipulo</option>
                      {students.map(s => (
                        <option key={s.id} value={s.id}>{s.memberName || `Estudiante ID: ${s.memberId}`}</option>
                      ))}
                    </select>
                  </div>

                  <div className="pt-6">
                    <button
                      onClick={() => validateStep1() && setStep(2)}
                      className="w-full flex items-center justify-center gap-3 h-14 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-[11px] uppercase tracking-[0.2em] rounded-2xl transition-all shadow-xl shadow-indigo-500/20 active:scale-95"
                    >
                      Configurar Estado <ChevronRight size={18} />
                    </button>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] ml-2">Estado de Presencia</label>
                    <div 
                      onClick={() => setFormData(p => ({ ...p, present: !p.present }))}
                      className={`p-5 rounded-[2rem] border-2 cursor-pointer transition-all flex items-center justify-between ${formData.present ? 'bg-emerald-50/50 dark:bg-emerald-500/5 border-emerald-500/40' : 'bg-rose-50/50 dark:bg-rose-500/5 border-rose-500/40'}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white ${formData.present ? 'bg-emerald-500' : 'bg-rose-500'}`}>
                          {formData.present ? <CheckCircle size={24} /> : <XCircle size={24} />}
                        </div>
                        <div>
                          <p className={`font-black uppercase tracking-widest text-sm ${formData.present ? 'text-emerald-600' : 'text-rose-600'}`}>{formData.present ? 'Presente' : 'Ausente'}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Click para conmutar estado</p>
                        </div>
                      </div>
                      <div className={`w-12 h-6 rounded-full relative transition-colors ${formData.present ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'}`}>
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${formData.present ? 'translate-x-7' : 'translate-x-1'}`} />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 px-1">
                    <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em]">Nivel de Participación</label>
                    <div className="grid grid-cols-3 gap-3">
                      {PARTICIPATION_SCORES.map(s => (
                        <button
                          key={s.value}
                          type="button"
                          onClick={() => setFormData(p => ({ ...p, score: s.value }))}
                          className={`flex flex-col items-center gap-3 p-4 rounded-3xl border-2 transition-all group ${formData.score === s.value ? `bg-${s.color}-50 dark:bg-${s.color}-500/10 border-${s.color}-500 shadow-lg shadow-${s.color}-500/10` : 'bg-white dark:bg-[#1a2332] border-slate-100 dark:border-white/5 opacity-40 hover:opacity-100'}`}
                        >
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${formData.score === s.value ? `bg-${s.color}-500 text-white` : 'bg-slate-100 dark:bg-white/5 text-slate-400 group-hover:bg-indigo-500/20 group-hover:text-indigo-600'}`}>
                            {s.emoji}
                          </div>
                          <span className={`text-[9px] font-black uppercase tracking-widest ${formData.score === s.value ? `text-${s.color}-600` : 'text-slate-500'}`}>{s.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] ml-2 flex items-center gap-2"><ShieldCheck size={12} className="text-indigo-500" /> Sello de Registro (Operador)</label>
                    <input
                      type="text"
                      name="recordedBy"
                      value={formData.recordedBy}
                      onChange={handleChange}
                      placeholder="Nombre del registrador..."
                      className="w-full h-14 px-5 rounded-2xl bg-white dark:bg-[#1a2332] border-2 border-slate-100 dark:border-white/5 focus:border-indigo-500 font-bold text-sm outline-none shadow-sm transition-all"
                    />
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button
                      onClick={() => setStep(1)}
                      className="flex-1 h-14 px-6 rounded-2xl bg-slate-100 dark:bg-white/5 font-black text-[11px] uppercase tracking-[0.2em] text-slate-500 hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
                    >
                      <ChevronLeft size={18} /> Reversa
                    </button>
                    <button
                      onClick={handleRecord}
                      disabled={loading}
                      className="flex-[2] h-14 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[11px] uppercase tracking-[0.2em] rounded-2xl transition-all shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-3 disabled:opacity-50"
                    >
                      {loading ? <Loader2 className="animate-spin w-5 h-5" /> : <><CheckCircle2 size={18} /> Confirmar Registro</>}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* FOOTER - Solo en Desktop si es necesario, pero aquí usaremos el body para acciones */}
        <div className="p-6 bg-slate-50/50 dark:bg-black/40 border-t border-slate-100 dark:border-white/5 flex justify-center shrink-0">
           <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">Protocolo de Inspección Académica v5.0</p>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(99, 102, 241, 0.2); border-radius: 10px; }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.05); }
        .animate-shake { animation: mra-shake 0.5s cubic-bezier(.36,.07,.19,.97) both; }
        @keyframes mra-shake { 10%, 90% { transform: translate3d(-1px, 0, 0); } 20%, 80% { transform: translate3d(2px, 0, 0); } 30%, 50%, 70% { transform: translate3d(-4px, 0, 0); } 40%, 60% { transform: translate3d(4px, 0, 0); } }
      `}} />
    </div>
  );
};

export default ModalRecordAttendance;
