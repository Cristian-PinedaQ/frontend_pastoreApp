import React from 'react';
import {
  X,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  Trophy,
  BarChart3,
  Layers,
  Users,
} from 'lucide-react';

const STATUS_CONFIG = {
  ACTIVE: {
    label: 'Activo',
    classes: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    dot: 'bg-emerald-500',
    bar: 'bg-emerald-500',
  },
  COMPLETED: {
    label: 'Completado',
    classes: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
    dot: 'bg-indigo-500',
    bar: 'bg-indigo-500',
  },
  CANCELLED: {
    label: 'Cancelado',
    classes: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
    dot: 'bg-rose-500',
    bar: 'bg-rose-400',
  },
  PENDING: {
    label: 'Pendiente',
    classes: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    dot: 'bg-amber-500',
    bar: 'bg-amber-500',
  },
  DEFAULT: {
    label: 'Desconocido',
    classes: 'bg-slate-500/10 text-slate-500 dark:text-slate-400 border-slate-500/20',
    dot: 'bg-slate-400',
    bar: 'bg-slate-400',
  },
};

const getStatus = (status) =>
  STATUS_CONFIG[(status || '').toUpperCase()] || STATUS_CONFIG.DEFAULT;

const parseAttendance = (val) => {
  if (!val) return null;
  const num = typeof val === 'string' ? parseFloat(val) : val;
  return isNaN(num) ? null : Math.min(100, Math.max(0, Math.round(num)));
};

const formatDate = (raw) => {
  if (!raw) return null;
  return new Date(raw).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

export const EnrollmentHistoryModal = ({
  isOpen = false,
  history = [],
  memberName = '',
  onClose = () => {},
}) => {
  if (!isOpen) return null;

  const initials = memberName
    .split(' ')
    .map((n) => n?.[0])
    .join('')
    .substring(0, 2)
    .toUpperCase() || 'M';

  const completed = history.filter(
    (e) => (e.status || '').toUpperCase() === 'COMPLETED'
  ).length;

  const stats = [
    {
      icon: <Layers size={14} />,
      value: history.length,
      label: 'Inscripciones',
      color: 'text-indigo-600 dark:text-indigo-400',
      bg: 'bg-indigo-50 dark:bg-indigo-950/50',
    },
    {
      icon: <CheckCircle2 size={14} />,
      value: completed,
      label: 'Completadas',
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-950/50',
    },
    {
      icon: <Clock size={14} />,
      value: history.length - completed,
      label: 'En Progreso',
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-950/50',
    },
  ];

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col bg-white dark:bg-[#0f172a] rounded-[2.5rem] border-2 border-slate-100 dark:border-white/10 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.25)] animate-in zoom-in-95 duration-300 overflow-hidden">

          {/* Header */}
          <div className="relative p-8 pb-6 shrink-0">
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-indigo-500/5 rounded-full blur-[60px] pointer-events-none" />

            <div className="flex items-start justify-between gap-6 relative z-10">
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 rounded-[1.4rem] bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-2xl font-black border border-indigo-100 dark:border-indigo-500/20 shrink-0">
                  {initials}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <div className="h-0.5 w-6 bg-indigo-600 rounded-full" />
                    <span className="text-indigo-600 dark:text-indigo-400 font-black text-[9px] uppercase tracking-[0.4em]">
                      Historial
                    </span>
                  </div>
                  <h2 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white leading-tight">
                    {memberName || 'Miembro'}
                  </h2>
                </div>
              </div>

              <button
                onClick={onClose}
                className="bg-slate-100 dark:bg-white/5 hover:bg-rose-200 dark:hover:bg-white/10 rounded-2xl flex items-center justify-center text-slate-500 dark:text-slate-400 transition-all active:scale-95 shrink-0"
              >
                <X size={20} />
              </button>
            </div>

            {/* Stats strip — 1 columna en móvil (filas compactas), 3 columnas en sm+ */}
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
              {stats.map((s, i) => (
                <div
                  key={i}
                  className={`${s.bg} rounded-2xl border border-white/5 p-4 flex sm:block items-center justify-between`}
                >
                  <div className={`flex items-center gap-2 sm:mb-2 ${s.color}`}>
                    {s.icon}
                    <span className="text-[9px] font-black uppercase tracking-widest">
                      {s.label}
                    </span>
                  </div>
                  <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">
                    {s.value}
                  </p>
                </div>
              ))}
            </div>

            {/* Divider */}
            <div className="mt-6 h-px bg-slate-100 dark:bg-white/5" />
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-8 pb-8 space-y-4 custom-scrollbar">
            {history.length === 0 ? (
              <div className="py-20 flex flex-col items-center gap-6 text-center">
                <div className="w-24 h-24 bg-slate-100 dark:bg-white/5 rounded-[2rem] flex items-center justify-center">
                  <BookOpen size={36} className="text-slate-400" />
                </div>
                <div className="space-y-2">
                  <p className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">
                    Sin Inscripciones
                  </p>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                    No hay registros académicos para este miembro
                  </p>
                </div>
              </div>
            ) : (
              history.map((enrollment, index) => {
                const status = getStatus(enrollment.status);
                const attendance = parseAttendance(enrollment.attendancePercentage);
                const date = formatDate(enrollment.enrollmentDate);

                return (
                  <div
                    key={index}
                    className="group relative bg-slate-50 dark:bg-[#1a2332] rounded-[2rem] border-2 border-slate-100 dark:border-white/5 hover:border-indigo-500/50 transition-all duration-300 overflow-hidden p-6"
                  >
                    {/* Top row */}
                    <div className="flex items-start justify-between gap-4 mb-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-[1rem] bg-white dark:bg-black/30 flex items-center justify-center border border-slate-200 dark:border-white/5 shadow-sm group-hover:bg-indigo-600 group-hover:border-indigo-600 transition-all duration-300">
                          <BookOpen
                            size={16}
                            className="text-slate-400 group-hover:text-white transition-colors"
                          />
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                            Nivel Académico
                          </p>
                          <p className="text-base font-black text-slate-900 dark:text-white tracking-tight">
                            {enrollment.levelDisplayName || enrollment.levelCode || 'N/A'}
                          </p>
                        </div>
                      </div>

                      <div
                        className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border flex items-center gap-2 ${status.classes}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                        {status.label}
                      </div>
                    </div>

                    {/* Detail grid */}
                    <div className="grid grid-cols-2 gap-3 mb-5">
                      {[
                        {
                          icon: <Users size={13} />,
                          label: 'Cohorte',
                          value: enrollment.cohort || 'N/A',
                        },
                        {
                          icon: <Calendar size={13} />,
                          label: 'Inscripción',
                          value: date || 'N/A',
                        },
                        {
                          icon: <Trophy size={13} />,
                          label: 'Resultado',
                          value:
                            enrollment.passed === true
                              ? 'Aprobado'
                              : enrollment.passed === false
                              ? 'Pendiente'
                              : 'Sin calificar',
                        },
                        {
                          icon: <BarChart3 size={13} />,
                          label: 'Duración',
                          value:
                            enrollment.status?.toUpperCase() === 'COMPLETED'
                              ? 'Completado'
                              : 'En Progreso',
                        },
                      ].map((item, i) => (
                        <div
                          key={i}
                          className="bg-white dark:bg-black/20 rounded-[1.2rem] p-3 border border-slate-100 dark:border-white/5"
                        >
                          <div className="flex items-center gap-2 text-slate-400 mb-1">
                            {item.icon}
                            <span className="text-[8px] font-black uppercase tracking-widest">
                              {item.label}
                            </span>
                          </div>
                          <p className="text-xs font-black text-slate-700 dark:text-slate-200 truncate">
                            {item.value}
                          </p>
                        </div>
                      ))}
                    </div>

                    {/* Attendance bar */}
                    {attendance !== null && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                            Asistencia
                          </span>
                          <span className="text-[9px] font-black text-slate-900 dark:text-white">
                            {attendance}%
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${status.bar}`}
                            style={{ width: `${attendance}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Index number */}
                    <span className="absolute top-5 right-5 text-[9px] font-black text-slate-300 dark:text-white/10 tabular-nums pointer-events-none">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="shrink-0 px-8 py-5 bg-slate-50 dark:bg-black/20 border-t border-slate-100 dark:border-white/5 flex items-center justify-between gap-4">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              {history.length} registro{history.length !== 1 ? 's' : ''} encontrado{history.length !== 1 ? 's' : ''}
            </p>
            <button
              onClick={onClose}
              className="h-12 px-8 bg-slate-900 dark:bg-indigo-600 text-white rounded-[1.2rem] font-black text-[10px] uppercase tracking-widest hover:bg-black dark:hover:bg-indigo-500 active:scale-95 transition-all shadow-lg"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(99,102,241,0.15); border-radius: 10px; }
      `}} />
    </>
  );
};

export default EnrollmentHistoryModal;