import React, { useState, useEffect } from "react";
import { 
  CalendarClock, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Clock, 
  Award, 
  Heart,
  FileText,
  User
} from "lucide-react";
import ModalHeader from "../ModalHeader";
import apiService from "../../apiService";

const SCORE_COLOR_CLASSES = {
  0: 'text-red-500 bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/30',
  1: 'text-orange-500 bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-900/30',
  2: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/30',
  3: 'text-blue-500 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/30',
};

const parseSafeDate = (dateVal) => {
  if (!dateVal) return new Date();
  if (Array.isArray(dateVal)) {
    const [y, m, day, h = 0, min = 0, s = 0] = dateVal;
    return new Date(y, m - 1, day, h, min, s);
  }
  return new Date(dateVal);
};

const formatEventDateStr = (dateVal) => {
  const d = parseSafeDate(dateVal);
  return d.toLocaleString("es-ES", {
    weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit",
  });
};

function CriteriaBadge({ label, value, icon: Icon }) {
  const scoreClass = SCORE_COLOR_CLASSES[value] || SCORE_COLOR_CLASSES[0];
  return (
    <div className={`flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl border text-xs font-bold ${scoreClass}`}>
      <div className="flex items-center gap-1.5 min-w-0 flex-1">
        <Icon size={14} className="shrink-0" />
        <span className="leading-tight break-words whitespace-normal">{label}</span>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="text-sm font-black">{value}</span>
        <span className="opacity-60 text-[10px]">/ 3</span>
      </div>
    </div>
  );
}

export default function MemberEvaluationHistoryModal({ teamId, memberName, ministryName, onClose }) {
  const [evaluations, setEvaluations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!teamId) return;
    setLoading(true);
    setError(null);
    apiService.getMinistryMemberEvaluations(teamId)
      .then((data) => {
        setEvaluations(data || []);
      })
      .catch((err) => {
        console.error("Error cargando historial de evaluaciones:", err);
        setError("No se pudo cargar el historial de evaluaciones.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [teamId]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-[min(95vw,800px)] max-w-2xl rounded-[2.5rem] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
        <ModalHeader
          title="Historial de Evaluaciones"
          subtitle={memberName}
          icon={User}
          onClose={onClose}
        />

        <div className="p-6 md:p-8 overflow-y-auto space-y-6 flex-1">
          {loading ? (
            <div className="py-16 text-center space-y-4">
              <RefreshCw className="mx-auto text-blue-500 animate-spin opacity-50" size={36} />
              <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Cargando evaluaciones...</p>
            </div>
          ) : error ? (
            <div className="py-12 text-center space-y-3 bg-rose-50 dark:bg-rose-900/10 rounded-2xl border border-rose-100 dark:border-rose-800/40">
              <AlertCircle className="mx-auto text-rose-500" size={36} />
              <p className="text-sm font-bold text-rose-600 dark:text-rose-400">{error}</p>
            </div>
          ) : evaluations.length === 0 ? (
            <div className="py-16 text-center space-y-4 bg-slate-50 dark:bg-slate-800/40 rounded-[2rem] border border-dashed border-slate-200 dark:border-slate-800">
              <CalendarClock className="mx-auto text-slate-300 dark:text-slate-600" size={48} />
              <div className="space-y-1">
                <p className="font-bold text-slate-600 dark:text-slate-300">Sin historial registrado</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Este servidor aún no cuenta con evaluaciones en este ministerio.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <p className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Últimas {evaluations.length} evaluaciones de servicio en {ministryName}
              </p>
              
              <div className="space-y-6">
                {evaluations.map((evalItem, index) => {
                  const attended = evalItem.attended;
                  const excused = evalItem.excused;
                  
                  return (
                    <div 
                      key={evalItem.assignmentId || index}
                      className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 space-y-4"
                    >
                      {/* Cabecera de evaluación */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/50 dark:border-slate-800">
                        <div>
                          <p className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                            {evalItem.roleName || "Servidor"}
                          </p>
                          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 capitalize mt-0.5">
                            {formatEventDateStr(evalItem.eventDate)}
                          </p>
                        </div>
                        
                        <div>
                          {attended ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100/80 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-250 dark:border-emerald-800/50">
                              <CheckCircle2 size={12} />
                              Asistió
                            </span>
                          ) : excused ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-100/80 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-250 dark:border-blue-800/50">
                              <AlertCircle size={12} />
                              Excusado
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-100/80 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-250 dark:border-red-800/50">
                              <XCircle size={12} />
                              No Asistió
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Calificaciones */}
                      {attended && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <CriteriaBadge label="Puntualidad" value={evalItem.punctuality} icon={Clock} />
                          <CriteriaBadge label="Presentación" value={evalItem.presentation} icon={Award} />
                          <CriteriaBadge label="Actitud" value={evalItem.attitude} icon={Heart} />
                        </div>
                      )}

                      {!attended && (
                        <div className="p-3 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center justify-between">
                          <span>Puntuación por inasistencia:</span>
                          <span className="font-black">{excused ? '1.00 (Regular)' : '0.00 (Deficiente)'}</span>
                        </div>
                      )}

                      {/* Observaciones */}
                      {evalItem.observations && (
                        <div className="space-y-1.5">
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
                            <FileText size={12} />
                            Observaciones
                          </span>
                          <p className="text-xs text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900/30 p-3 rounded-xl border border-slate-100 dark:border-slate-800 leading-relaxed italic">
                            "{evalItem.observations}"
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-6 h-12 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-black rounded-xl transition-all"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
