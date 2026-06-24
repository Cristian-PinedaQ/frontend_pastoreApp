import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  ClipboardCheck,
  CheckCircle2,
  XCircle,
  FileText,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import ModalHeader from '../ModalHeader';
import apiService from '../../apiService';

// ============================================================
// Helpers de UI
// ============================================================
const SCORE_LABELS = ['Deficiente', 'Regular', 'Bueno', 'Excelente'];

const SCORE_STYLES = {
  0: 'bg-red-50 dark:bg-red-900/20 border-red-400 dark:border-red-600 text-red-700 dark:text-red-400',
  1: 'bg-orange-50 dark:bg-orange-900/20 border-orange-400 dark:border-orange-600 text-orange-700 dark:text-orange-400',
  2: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-400 dark:border-emerald-600 text-emerald-700 dark:text-emerald-400',
  3: 'bg-blue-50 dark:bg-blue-900/20 border-blue-400 dark:border-blue-600 text-blue-700 dark:text-blue-400',
};

const SCORE_LABEL_STYLES = {
  0: 'text-red-600 dark:text-red-400',
  1: 'text-orange-600 dark:text-orange-400',
  2: 'text-emerald-600 dark:text-emerald-400',
  3: 'text-blue-600 dark:text-blue-400',
};

const parseSafeDate = (dateVal) => {
  if (!dateVal) return new Date();
  if (Array.isArray(dateVal)) {
    const [y, m, day, h = 0, min = 0, s = 0] = dateVal;
    return new Date(y, m - 1, day, h, min, s);
  }
  return new Date(dateVal);
};

// ============================================================
// ScoreSelector — selector de puntuación 0-3
// ============================================================
function ScoreSelector({ label, value, onChange, disabled }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {label}
      </span>
      <div className="flex gap-1.5">
        {[0, 1, 2, 3].map((score) => {
          const isActive = value === score;
          return (
            <button
              key={score}
              type="button"
              disabled={disabled}
              onClick={() => onChange(score)}
              title={SCORE_LABELS[score]}
              className={`w-9 h-9 rounded-xl border-2 font-black text-sm transition-all
                ${isActive
                  ? `${SCORE_STYLES[score]} scale-110 shadow-md`
                  : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700/60'
                }
                focus:outline-none focus:ring-2 focus:ring-blue-400/50 dark:focus:ring-blue-500/40
                disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              {score}
            </button>
          );
        })}
      </div>
      {value !== null && value !== undefined && (
        <span className={`text-[10px] font-black uppercase tracking-wider ${SCORE_LABEL_STYLES[value]}`}>
          {SCORE_LABELS[value]}
        </span>
      )}
    </div>
  );
}

// ============================================================
// ServerRow — fila de un servidor con evaluación
// ============================================================
const ServerRow = React.memo(function ServerRow({ assignment, record, onChange }) {
  const attended = record.attended;
  const excused = record.excused;

  const handleAttended = (val) => {
    if (val) {
      onChange(assignment.assignmentId, { ...record, attended: true, excused: null, punctuality: null, presentation: null, attitude: null });
    } else {
      onChange(assignment.assignmentId, { ...record, attended: false, excused: false, punctuality: 0, presentation: 0, attitude: 0 });
    }
  };

  const handleExcused = (val) => {
    const autoScore = val ? 1 : 0;
    onChange(assignment.assignmentId, { ...record, excused: val, punctuality: autoScore, presentation: autoScore, attitude: autoScore });
  };

  const isIncomplete =
    attended === null || attended === undefined ||
    (attended === true && (
      record.punctuality === null || record.punctuality === undefined ||
      record.presentation === null || record.presentation === undefined ||
      record.attitude === null || record.attitude === undefined
    )) ||
    !record.observations?.trim();

  const initial = assignment.memberName?.[0]?.toUpperCase() || '?';

  return (
    <div className={`rounded-2xl border-2 p-4 sm:p-5 transition-all space-y-4
      ${isIncomplete
        ? 'border-amber-300 dark:border-amber-700/60 bg-amber-50/30 dark:bg-amber-950/10'
        : 'border-emerald-300 dark:border-emerald-700/60 bg-emerald-50/20 dark:bg-emerald-950/10'
      }`}
    >
      {/* Header del servidor */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black text-base shadow-md shrink-0">
            {initial}
          </div>
          <div className="min-w-0">
            {/* break-words para nombres muy largos */}
            <p className="font-black text-slate-900 dark:text-white text-sm break-words leading-tight">
              {assignment.memberName}
            </p>
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mt-0.5">
              {assignment.roleName}
            </p>
          </div>
        </div>

        {/* Toggle asistencia */}
        <div className="flex gap-2 shrink-0">
          <button
            type="button"
            onClick={() => handleAttended(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 font-bold text-sm transition-all
              focus:outline-none focus:ring-2 focus:ring-emerald-400/50
              ${attended === true
                ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 shadow-sm'
                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:border-emerald-300 dark:hover:border-emerald-700 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20'
              }`}
          >
            <CheckCircle2 size={14} /> Asistió
          </button>
          <button
            type="button"
            onClick={() => handleAttended(false)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 font-bold text-sm transition-all
              focus:outline-none focus:ring-2 focus:ring-red-400/50
              ${attended === false
                ? 'border-red-500 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 shadow-sm'
                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:border-red-300 dark:hover:border-red-700 hover:bg-red-50/40 dark:hover:bg-red-950/20'
              }`}
          >
            <XCircle size={14} /> No asistió
          </button>
        </div>
      </div>

      {/* Si no asistió → toggle excusado */}
      {attended === false && (
        <div className="flex flex-wrap items-center gap-3 pl-1">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Motivo:</span>
          <button
            type="button"
            onClick={() => handleExcused(true)}
            className={`px-3 py-1.5 rounded-xl border-2 font-bold text-xs transition-all
              focus:outline-none focus:ring-2 focus:ring-blue-400/50
              ${excused === true
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-blue-50/40 dark:hover:bg-blue-950/20'
              }`}
          >
            📝 Excusado
          </button>
          <button
            type="button"
            onClick={() => handleExcused(false)}
            className={`px-3 py-1.5 rounded-xl border-2 font-bold text-xs transition-all
              focus:outline-none focus:ring-2 focus:ring-red-400/50
              ${excused === false
                ? 'border-red-500 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:border-red-300 dark:hover:border-red-700 hover:bg-red-50/40 dark:hover:bg-red-950/20'
              }`}
          >
            🚫 Sin excusa
          </button>
          {excused !== null && excused !== undefined && (
            <span className="text-[10px] text-slate-400 dark:text-slate-500 italic">
              Puntuación automática: {excused ? '1 (Regular)' : '0 (Deficiente)'}
            </span>
          )}
        </div>
      )}

      {/* Si asistió → criterios manuales */}
      {attended === true && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-white dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-700/50">
          <ScoreSelector
            label="Puntualidad"
            value={record.punctuality}
            onChange={(v) => onChange(assignment.assignmentId, { ...record, punctuality: v })}
            disabled={false}
          />
          <ScoreSelector
            label="Presentación"
            value={record.presentation}
            onChange={(v) => onChange(assignment.assignmentId, { ...record, presentation: v })}
            disabled={false}
          />
          <ScoreSelector
            label="Actitud"
            value={record.attitude}
            onChange={(v) => onChange(assignment.assignmentId, { ...record, attitude: v })}
            disabled={false}
          />
        </div>
      )}

      {/* Observaciones — siempre obligatorio */}
      <div className="space-y-1.5">
        <label className="flex items-center gap-1 text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
          <FileText size={12} />
          Observaciones <span className="text-red-500 dark:text-red-400 normal-case font-bold ml-1">*obligatorio</span>
        </label>
        <textarea
          className={`w-full px-4 py-3 rounded-xl border-2 font-medium text-sm resize-none transition-all
            outline-none focus:ring-2 focus:ring-blue-400/40 dark:focus:ring-blue-500/30
            bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200
            placeholder:text-slate-300 dark:placeholder:text-slate-400
            focus:border-blue-500 dark:focus:border-blue-400
            ${!record.observations?.trim()
              ? 'border-amber-300 dark:border-amber-700/60'
              : 'border-slate-200 dark:border-slate-700'
            }`}
          placeholder="Escribe una observación del servicio (obligatorio)..."
          value={record.observations || ''}
          onChange={(e) => onChange(assignment.assignmentId, { ...record, observations: e.target.value })}
          rows={2}
          maxLength={500}
        />
        <p className="text-[10px] text-slate-400 dark:text-slate-500 text-right">
          {(record.observations || '').length}/500
        </p>
      </div>
    </div>
  );
});

const DEFAULT_RECORD = {
  attended: null,
  excused: null,
  punctuality: null,
  presentation: null,
  attitude: null,
  observations: '',
};

export default function ModalMinistryAttendance({ event, onClose, onSaved }) {
  const [assignments, setAssignments] = useState([]);
  const [records, setRecords] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Refs para focus management y DOM
  const modalRef = useRef(null);
  const firstFocusableRef = useRef(null);
  const triggerElementRef = useRef(null);

  // ── Scroll lock robusto (iOS Safari compatible) ───────────
  useEffect(() => {
    // Guardamos la posición de scroll actual
    const scrollY = window.scrollY;
    const scrollX = window.scrollX;

    // Guardamos el elemento activo antes de abrir (para restaurarlo al cerrar)
    triggerElementRef.current = document.activeElement;

    // Técnica compatible con iOS: fixed + top negativo
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.overflow = 'hidden';

    return () => {
      // Restaurar posición y scroll al desmontar
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      document.body.style.overflow = '';
      window.scrollTo(scrollX, scrollY);

      // Devolver foco al elemento disparador (botón "Registrar Asistencias")
      triggerElementRef.current?.focus?.();
    };
  }, []);

  // ── Focus Trap dinámico y control de Escape ──────────────
  useEffect(() => {
    const handleKeyDown = (e) => {
      // 1. Escape (Cierre controlado)
      if (e.key === 'Escape') {
        if (saving) return; // Bloquear si está guardando
        onClose?.();
        return;
      }

      // 2. Tab (Focus Trap dinámico en caliente)
      if (e.key === 'Tab') {
        const modalEl = modalRef.current;
        if (!modalEl) return;

        // Calcular elementos enfocables en el instante del evento Tab
        const focusableSelectors = 'button:not([disabled]), textarea:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';
        const focusableEls = Array.from(modalEl.querySelectorAll(focusableSelectors));

        if (focusableEls.length === 0) return;

        const first = focusableEls[0];
        const last = focusableEls[focusableEls.length - 1];

        if (e.shiftKey) {
          // Shift + Tab -> retroceder
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          // Tab -> avanzar
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, saving]);

  // ── Focus al primer elemento al montar ──────────────────
  useEffect(() => {
    // Pequeño delay para asegurar que el portal ya se renderizó
    const timer = setTimeout(() => {
      firstFocusableRef.current?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // ── Carga de datos ───────────────────────────────────────
  useEffect(() => {
    if (!event?.id) return;
    setLoading(true);
    setError('');
    setAssignments([]);
    setRecords({});

    apiService.getMinistryEventAttendance(event.id)
      .then((data) => {
        setAssignments(data);
        const initial = {};
        data.forEach((a) => {
          initial[a.assignmentId] = {
            assignmentId: a.assignmentId,
            attended:     a.attended,
            excused:      a.excused,
            punctuality:  a.punctuality,
            presentation: a.presentation,
            attitude:     a.attitude,
            observations: a.observations || '',
          };
        });
        setRecords(initial);
      })
      .catch((err) => setError('Error al cargar asistencias: ' + err.message))
      .finally(() => setLoading(false));
  }, [event?.id]);

  const handleChange = useCallback((assignmentId, updated) => {
    setRecords((prev) => ({ ...prev, [assignmentId]: updated }));
  }, []);

  const allComplete = Object.values(records).every((r) =>
    r.attended !== null && r.attended !== undefined &&
    (r.attended === false || (
      r.punctuality !== null && r.presentation !== null && r.attitude !== null
    )) &&
    r.observations?.trim()
  );

  const completedCount = Object.values(records).filter((r) =>
    r.attended !== null && r.attended !== undefined && r.observations?.trim()
  ).length;
  const totalCount = Object.keys(records).length;

  const handleSave = async () => {
    if (!allComplete) {
      setError('Completa todos los campos antes de guardar.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await apiService.saveMinistryEventAttendance(event.id, Object.values(records));
      onSaved?.();
      onClose?.();
    } catch (err) {
      setError('Error al guardar: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Fecha formateada del evento
  const eventDateStr = event?.eventDate
    ? parseSafeDate(event.eventDate).toLocaleString('es-ES', {
        weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
      })
    : '';

  const modalContent = (
    // Overlay — z-[9999] para superar cualquier z-index del sistema
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        // Solo cierra si se hace click exactamente en el overlay, y no se está guardando
        if (e.target === e.currentTarget && !saving) onClose?.();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-attendance-title"
    >
      <div
        ref={modalRef}
        className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[2.5rem] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[92vh] overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <ModalHeader
          title="Registro de Asistencias"
          titleId="modal-attendance-title"
          subtitle={`${event?.name} · ${eventDateStr}`}
          icon={ClipboardCheck}
          onClose={onClose}
          closeDisabled={saving}
          titleAddon={
            totalCount > 0 && (
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black
                ${allComplete
                  ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50'
                  : 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50'
                }`}
              >
                {completedCount}/{totalCount}
              </span>
            )
          }
        />

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* Loading */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-16 space-y-4">
              <Loader2 size={40} className="text-blue-500 animate-spin opacity-60" />
              <p className="text-sm font-bold text-slate-400 dark:text-slate-500">
                Cargando servidores asignados...
              </p>
            </div>
          )}

          {/* Vacío */}
          {!loading && assignments.length === 0 && !error && (
            <div className="flex flex-col items-center justify-center py-16 space-y-3 bg-slate-50 dark:bg-slate-800/20 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
              <ClipboardCheck size={40} className="text-slate-300 dark:text-slate-600" />
              <p className="font-bold text-slate-500 dark:text-slate-400 text-sm">
                No hay servidores asignados a este culto.
              </p>
            </div>
          )}

          {/* Filas de servidores */}
          {!loading && assignments.map((a) => (
            <ServerRow
              key={a.assignmentId}
              assignment={a}
              record={records[a.assignmentId] || DEFAULT_RECORD}
              onChange={handleChange}
            />
          ))}

          {/* Error */}
          {error && (
            <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-xl text-red-700 dark:text-red-400">
              <AlertTriangle size={18} className="shrink-0" />
              <p className="font-bold text-sm">{error}</p>
            </div>
          )}
        </div>

        {/* Footer — sticky en mobile, siempre visible */}
        <div className="shrink-0 border-t border-slate-100 dark:border-slate-800 p-4 sm:p-5 flex gap-3 bg-white dark:bg-slate-900 sticky bottom-0">
          <button
            ref={firstFocusableRef}
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex-1 py-3.5 px-6 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700
              text-slate-700 dark:text-slate-300 font-black rounded-2xl transition-colors
              focus:outline-none focus:ring-2 focus:ring-slate-400/50 dark:focus:ring-slate-500/40
              disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !allComplete || loading}
            className="flex-1 py-3.5 px-6 bg-gradient-to-r from-emerald-500 to-teal-600
              hover:from-emerald-600 hover:to-teal-700
              text-white font-black rounded-2xl transition-all
              shadow-lg shadow-emerald-500/20
              focus:outline-none focus:ring-2 focus:ring-emerald-400/50 dark:focus:ring-emerald-500/40
              disabled:opacity-50 disabled:cursor-not-allowed
              flex items-center justify-center gap-2"
          >
            {saving
              ? <><Loader2 size={16} className="animate-spin" /> Guardando...</>
              : <><CheckCircle2 size={16} /> Guardar evaluaciones</>
            }
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
