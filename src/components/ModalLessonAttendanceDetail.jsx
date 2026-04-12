// ============================================
// ModalLessonAttendanceDetail.jsx - TAILWIND EDITION
// Diseño Tailwind moderno + lógica defensiva completa
// ============================================

import React, { useState, useEffect, useCallback } from 'react';
import apiService from '../apiService';
import {
  X,
  Plus,
  Calendar,
  UserCircle2,
  ClipboardCheck,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
  XCircle,
  GraduationCap,
} from 'lucide-react';

const PARTICIPATION_OPTIONS = [
  { value: 'NO_PARTICIPA',           label: '🤐 No participa' },
  { value: 'POCA_PARTICIPACION',     label: '👌 Poca participación' },
  { value: 'EXCELENTE_PARTICIPACION',label: '🌟 Excelente participación' },
];

const PARTICIPATION_LABEL = {
  NO_PARTICIPA:            '🤐 No participa',
  POCA_PARTICIPACION:      '👌 Poca',
  EXCELENTE_PARTICIPACION: '🌟 Excelente',
};

const ModalLessonAttendanceDetail = ({
  isOpen,
  onClose,
  // Acepta props tanto como objeto completo o solo ID (compatibilidad total)
  lesson: lessonProp,
  enrollment: enrollmentProp,
  enrollmentId: enrollmentIdProp,
  lessonId: lessonIdProp,
  onAttendanceRecorded,
}) => {
  // ── Estado ──────────────────────────────────────────────────────────────
  const [attendances, setAttendances]       = useState([]);
  const [students, setStudents]             = useState([]);
  const [currentLesson, setCurrentLesson]   = useState(null);
  const [currentEnrollment, setCurrentEnrollment] = useState(null);

  const [loading, setLoading]               = useState(false);
  const [error, setError]                   = useState('');
  const [recordingId, setRecordingId]       = useState(null);

  // Estados de participación por estudiante
  const [participationScores, setParticipationScores]             = useState({});
  const [showParticipationSelect, setShowParticipationSelect]     = useState({});

  // ── Dark mode (mismo mecanismo que el original) ──────────────────────────
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const checkDark = () => {
      setIsDarkMode(
        document.documentElement.classList.contains('dark-mode') ||
        document.documentElement.classList.contains('dark')
      );
    };
    checkDark();
    const observer = new MutationObserver(checkDark);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // ── Carga defensiva de datos ─────────────────────────────────────────────
  const loadContent = useCallback(async () => {
    // Extraer IDs de cualquier fuente posible
    const eId = enrollmentProp?.id || enrollmentIdProp;
    const lId = lessonProp?.id || lessonIdProp;

    if (!eId || !lId) {
      console.warn('⚠️ [ModalLessonAttendanceDetail] IDs faltantes:', { eId, lId });
      return;
    }

    setLoading(true);
    setError('');
    setParticipationScores({});
    setShowParticipationSelect({});

    try {
      // Resolver objetos completos si faltan
      let activeLesson = lessonProp;
      let activeEnrollment = enrollmentProp;

      if (!activeLesson) {
        try { activeLesson = await apiService.getLessonById(lId); }
        catch (err) { console.error('Error cargando lección:', err); }
      }
      if (!activeEnrollment) {
        try { activeEnrollment = await apiService.getEnrollmentById(eId); }
        catch (err) { console.error('Error cargando cohorte:', err); }
      }

      setCurrentLesson(activeLesson);
      setCurrentEnrollment(activeEnrollment);

      // Cargar estudiantes y asistencias en paralelo
      const [enrollmentData, attData] = await Promise.all([
        apiService.getEnrollmentById(eId),
        apiService.getAttendancesByLesson(lId).catch(() => []),
      ]);

      // Filtrar cancelados (misma lógica que el original)
      const allStudents = enrollmentData?.studentEnrollments || [];
      const activeStudents = allStudents.filter((s) => s.status !== 'CANCELLED');

      setStudents(activeStudents);
      setAttendances(attData || []);

      if (activeStudents.length === 0) {
        setError('No hay estudiantes activos inscritos en esta cohorte.');
      }
    } catch (err) {
      console.error('❌ Error en loadContent:', err);
      setError('Error al sincronizar datos académicos: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [lessonProp, enrollmentProp, enrollmentIdProp, lessonIdProp]);

  // ── Ciclo de vida ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      loadContent();
    } else {
      // Limpiar al cerrar para evitar datos "fantasma"
      setStudents([]);
      setAttendances([]);
      setCurrentLesson(null);
      setCurrentEnrollment(null);
      setError('');
    }
  }, [isOpen, loadContent]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const getStudentAttendance = (studentEnrollmentId) =>
    attendances.find((a) => a.studentEnrollmentId === studentEnrollmentId);

  // ── Registrar asistencia rápida ───────────────────────────────────────────
  const handleQuickAttendance = async (studentEnrollmentId, present = true) => {
    const lId = currentLesson?.id || lessonIdProp;
    if (!lId) return;

    try {
      setRecordingId(studentEnrollmentId);

      const userData = apiService.getCurrentUser() || {};
      const score = participationScores[studentEnrollmentId] || 'POCA_PARTICIPACION';

      await apiService.recordAttendance({
        studentEnrollmentId,
        lessonId: lId,
        present,
        recordedBy: userData.username || userData.name || 'Admin',
        score,
      });

      await loadContent();
      if (onAttendanceRecorded) onAttendanceRecorded();
    } catch (err) {
      setError('Error al registrar la asistencia: ' + err.message);
    } finally {
      setRecordingId(null);
    }
  };

  if (!isOpen) return null;

  // ── Estadísticas ──────────────────────────────────────────────────────────
  const presentCount = attendances.filter((a) => a.present).length;
  const totalStudents = students.length;
  const attendancePercentage = totalStudents > 0
    ? Math.round((presentCount / totalStudents) * 100)
    : 0;

  return (
    <div
      className="fixed inset-0 z-[1100] flex items-center justify-center p-4 sm:p-6 md:p-10 bg-slate-900/80 backdrop-blur-xl"
      style={{ animation: 'mlad-fadein 0.25s ease' }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden max-h-[90vh]"
        style={{ animation: 'mlad-zoomin 0.3s cubic-bezier(0.16,1,0.3,1)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── HEADER ── */}
        <div className="p-7 sm:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-br from-indigo-600 to-violet-700 text-white relative overflow-hidden shrink-0">
          <div className="absolute -top-16 -right-16 w-48 h-48 bg-white/10 rounded-full blur-3xl pointer-events-none" />
          <div className="flex items-center gap-5 z-10">
            <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/20 shrink-0">
              <ClipboardCheck size={28} strokeWidth={2.5} />
            </div>
            <div className="space-y-1 min-w-0">
              <div className="text-[10px] font-black uppercase tracking-widest opacity-70">Registro de Asistencia</div>
              <h3 className="text-2xl font-black tracking-tight truncate">
                {currentLesson?.lessonName || lessonProp?.lessonName || 'Detalle de Lección'}
              </h3>
              <div className="flex flex-wrap items-center gap-3 text-xs font-bold opacity-80 uppercase tracking-wide">
                <span className="flex items-center gap-1.5">
                  <Calendar size={13} />
                  {(currentLesson?.lessonDate || lessonProp?.lessonDate)
                    ? new Date(currentLesson?.lessonDate || lessonProp?.lessonDate).toLocaleDateString()
                    : 'Cargando...'}
                </span>
                <span className="opacity-40">•</span>
                <span className="flex items-center gap-1.5">
                  <GraduationCap size={13} />
                  {currentEnrollment?.cohortName || enrollmentProp?.cohortName || 'Cargando...'}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="absolute top-5 right-5 w-10 h-10 flex items-center justify-center bg-black/20 hover:bg-black/40 rounded-2xl transition-all z-20"
          >
            <X size={20} strokeWidth={2.5} />
          </button>
        </div>

        {/* ── STATS ── */}
        <div className="grid grid-cols-3 divide-x divide-slate-100 dark:divide-slate-800 bg-slate-50 dark:bg-slate-950/40 border-b border-slate-100 dark:border-slate-800 shrink-0">
          {[
            { label: 'Presentes', value: presentCount, color: 'text-emerald-500' },
            { label: 'Matrícula', value: totalStudents, color: 'text-indigo-500' },
            { label: 'Quórum', value: `${attendancePercentage}%`, color: 'text-violet-500' },
          ].map((s, i) => (
            <div key={i} className="py-4 px-3 text-center">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">{s.label}</p>
              <p className={`text-2xl font-black tracking-tighter ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* ── BODY ── */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-8 mlad-scrollbar bg-white dark:bg-slate-900">
          {error && (
            <div className="mb-6 flex items-center gap-3 p-4 bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 rounded-2xl text-rose-600 dark:text-rose-400">
              <AlertCircle size={18} className="shrink-0" />
              <p className="text-xs font-black uppercase tracking-wide">{error}</p>
            </div>
          )}

          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-4 text-slate-400">
              <RefreshCw size={36} className="animate-spin" />
              <p className="text-[10px] font-black uppercase tracking-widest">Sincronizando Registros...</p>
            </div>
          ) : students.length === 0 ? (
            <div className="py-20 text-center">
              <UserCircle2 size={40} className="mx-auto text-slate-200 dark:text-slate-700 mb-4" />
              <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Sin estudiantes</p>
              <p className="text-xs text-slate-400 font-semibold mt-1">No hay estudiantes activos en esta cohorte.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {students.map((student, idx) => {
                const att = getStudentAttendance(student.id);
                const isRec = recordingId === student.id;
                const name = student.memberName || student.name || `Estudiante ${student.memberId || student.id}`;
                const showParticipation = showParticipationSelect[student.id];
                const selectedScore = participationScores[student.id];

                return (
                  <div
                    key={student.id}
                    className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl border transition-all duration-200
                      ${att
                        ? 'bg-emerald-50/50 dark:bg-emerald-500/5 border-emerald-100 dark:border-emerald-500/20'
                        : showParticipation
                          ? 'bg-amber-50/50 dark:bg-amber-500/5 border-amber-100 dark:border-amber-500/20'
                          : 'bg-slate-50 dark:bg-slate-800/30 border-slate-100 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-700'
                      }`}
                    style={{ animationDelay: `${idx * 30}ms` }}
                  >
                    {/* Nombre */}
                    <div className="flex items-center gap-4 min-w-0">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg shrink-0 transition-all
                        ${att
                          ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                          : 'bg-white dark:bg-slate-800 text-slate-400 border border-slate-100 dark:border-slate-700'
                        }`}>
                        {name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-black tracking-tight text-slate-900 dark:text-white uppercase leading-none truncate">
                          {name}
                        </h4>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">ID: #{student.id}</p>
                      </div>
                    </div>

                    {/* Controles */}
                    <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                      {att ? (
                        /* Estudiante ya registrado */
                        <div className="flex items-center gap-3">
                          <span className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wide
                            ${att.present ? 'bg-emerald-500 text-white shadow-sm' : 'bg-rose-500 text-white shadow-sm'}`}>
                            {att.present ? <CheckCircle2 size={12} strokeWidth={3} /> : <XCircle size={12} strokeWidth={3} />}
                            {att.present ? 'Presente' : 'Ausente'}
                          </span>
                          {att.score && (
                            <span className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 text-xs font-black rounded-xl border border-indigo-100 dark:border-indigo-800">
                              {PARTICIPATION_LABEL[att.score] || att.score}
                            </span>
                          )}
                          {att.recordedBy && (
                            <span className="text-[10px] text-slate-400 italic font-semibold hidden md:block">por {att.recordedBy}</span>
                          )}
                        </div>
                      ) : showParticipation ? (
                        /* Selector de participación + botón confirmar */
                        <div className="flex items-center gap-2 flex-wrap">
                          <select
                            className="h-10 px-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-500/30 cursor-pointer transition-all appearance-none"
                            value={selectedScore || 'POCA_PARTICIPACION'}
                            onChange={(e) => setParticipationScores((prev) => ({ ...prev, [student.id]: e.target.value }))}
                            autoFocus
                          >
                            {PARTICIPATION_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                          </select>
                          <button
                            onClick={() => handleQuickAttendance(student.id, true)}
                            disabled={isRec || !selectedScore}
                            className="flex items-center gap-1.5 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 text-white rounded-xl text-xs font-black uppercase tracking-wide transition-all active:scale-95 disabled:cursor-not-allowed shadow-sm"
                          >
                            {isRec ? <RefreshCw size={13} className="animate-spin" /> : <CheckCircle2 size={13} strokeWidth={3} />}
                            {isRec ? 'Guardando...' : 'Confirmar'}
                          </button>
                          <button
                            onClick={() => setShowParticipationSelect((prev) => ({ ...prev, [student.id]: false }))}
                            className="p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-xl hover:bg-slate-200 transition-all"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        /* Botón para iniciar registro */
                        <button
                          onClick={() => {
                            // Si no hay score guardado, poner uno por defecto
                            if (!participationScores[student.id]) {
                              setParticipationScores((prev) => ({ ...prev, [student.id]: 'POCA_PARTICIPACION' }));
                            }
                            setShowParticipationSelect((prev) => ({ ...prev, [student.id]: true }));
                          }}
                          disabled={isRec}
                          className="flex items-center gap-2 px-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-sm hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                        >
                          <Plus size={13} strokeWidth={3} /> Registrar
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── FOOTER ── */}
        <div className="p-6 bg-slate-50 dark:bg-slate-950/40 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 shrink-0">
          <button
            onClick={onClose}
            className="px-8 py-3.5 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl font-black text-xs uppercase tracking-widest text-slate-500 hover:text-indigo-600 transition-all shadow-sm active:scale-95"
          >
            Cerrar Ventana
          </button>
          <button
            onClick={loadContent}
            disabled={loading}
            className="flex items-center gap-2 px-8 py-3.5 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Actualizar
          </button>
        </div>
      </div>

      <style>{`
        @keyframes mlad-fadein { from { opacity: 0; } to { opacity: 1; } }
        @keyframes mlad-zoomin { from { opacity: 0; transform: scale(0.96) translateY(8px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        .mlad-scrollbar::-webkit-scrollbar { width: 6px; }
        .mlad-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .mlad-scrollbar::-webkit-scrollbar-thumb { background: rgb(203 213 225 / 0.5); border-radius: 10px; }
        .dark .mlad-scrollbar::-webkit-scrollbar-thumb { background: rgb(51 65 85 / 0.6); }
        select { -webkit-appearance: none; appearance: none; }
      `}</style>
    </div>
  );
};

export default ModalLessonAttendanceDetail;