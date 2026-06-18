import React, { useState, useEffect } from 'react';
import apiService from '../../apiService';

// ============================================================
// Helpers de UI
// ============================================================
const SCORE_LABELS = ['Deficiente', 'Regular', 'Bueno', 'Excelente'];
const SCORE_COLORS = ['#ef4444', '#f97316', '#22c55e', '#3b82f6'];

function ScoreSelector({ label, value, onChange, disabled }) {
  return (
    <div className="score-selector">
      <span className="score-label">{label}</span>
      <div className="score-buttons">
        {[0, 1, 2, 3].map((score) => (
          <button
            key={score}
            type="button"
            disabled={disabled}
            onClick={() => onChange(score)}
            className={`score-btn ${value === score ? 'score-btn--active' : ''}`}
            style={value === score ? { backgroundColor: SCORE_COLORS[score], color: '#fff', borderColor: SCORE_COLORS[score] } : {}}
            title={SCORE_LABELS[score]}
          >
            {score}
          </button>
        ))}
      </div>
      {value !== null && value !== undefined && (
        <span className="score-current" style={{ color: SCORE_COLORS[value] }}>
          {SCORE_LABELS[value]}
        </span>
      )}
    </div>
  );
}

function ServerRow({ assignment, record, onChange }) {
  const attended = record.attended;
  const excused = record.excused;

  const handleAttended = (val) => {
    if (val) {
      onChange({ ...record, attended: true, excused: null, punctuality: null, presentation: null, attitude: null });
    } else {
      onChange({ ...record, attended: false, excused: false, punctuality: 0, presentation: 0, attitude: 0 });
    }
  };

  const handleExcused = (val) => {
    const autoScore = val ? 1 : 0;
    onChange({ ...record, excused: val, punctuality: autoScore, presentation: autoScore, attitude: autoScore });
  };


  const isIncomplete = attended === null || attended === undefined ||
    (attended === true && (record.punctuality === null || record.punctuality === undefined ||
      record.presentation === null || record.presentation === undefined ||
      record.attitude === null || record.attitude === undefined)) ||
    !record.observations?.trim();

  return (
    <div className={`server-row ${isIncomplete ? 'server-row--incomplete' : 'server-row--complete'}`}>
      <div className="server-row__header">
        <div className="server-info">
          <span className="server-name">{assignment.memberName}</span>
          <span className="server-role">{assignment.roleName}</span>
        </div>

        {/* Toggle Asistió / No asistió */}
        <div className="attendance-toggle">
          <button
            type="button"
            className={`toggle-btn ${attended === true ? 'toggle-btn--yes' : ''}`}
            onClick={() => handleAttended(true)}
          >
            ✅ Asistió
          </button>
          <button
            type="button"
            className={`toggle-btn ${attended === false ? 'toggle-btn--no' : ''}`}
            onClick={() => handleAttended(false)}
          >
            ❌ No asistió
          </button>
        </div>
      </div>

      {/* Si no asistió → toggle excusado */}
      {attended === false && (
        <div className="excused-row">
          <span className="excused-label">Motivo de ausencia:</span>
          <button
            type="button"
            className={`excused-btn ${excused === true ? 'excused-btn--excused' : ''}`}
            onClick={() => handleExcused(true)}
          >
            📝 Excusado
          </button>
          <button
            type="button"
            className={`excused-btn ${excused === false ? 'excused-btn--unexcused' : ''}`}
            onClick={() => handleExcused(false)}
          >
            🚫 Sin excusa
          </button>
          <span className="auto-score-note">
            Puntuación automática: {excused ? '1 (Regular)' : '0 (Deficiente)'}
          </span>
        </div>
      )}

      {/* Si asistió → criterios manuales */}
      {attended === true && (
        <div className="scores-grid">
          <ScoreSelector
            label="Puntualidad"
            value={record.punctuality}
            onChange={(v) => onChange({ ...record, punctuality: v })}
            disabled={false}
          />
          <ScoreSelector
            label="Presentación"
            value={record.presentation}
            onChange={(v) => onChange({ ...record, presentation: v })}
            disabled={false}
          />
          <ScoreSelector
            label="Actitud"
            value={record.attitude}
            onChange={(v) => onChange({ ...record, attitude: v })}
            disabled={false}
          />
        </div>
      )}

      {/* Observaciones — siempre obligatorio */}
      <div className="observations-row">
        <label className="obs-label">
          Observaciones <span className="required">*</span>
        </label>
        <textarea
          className={`obs-input ${!record.observations?.trim() ? 'obs-input--empty' : ''}`}
          placeholder="Escribe una observación del servicio (obligatorio)..."
          value={record.observations || ''}
          onChange={(e) => onChange({ ...record, observations: e.target.value })}
          rows={2}
          maxLength={500}
        />
      </div>
    </div>
  );
}

// ============================================================
// Modal principal
// ============================================================
export default function ModalMinistryAttendance({ event, onClose, onSaved }) {
  const [assignments, setAssignments] = useState([]);
  const [records, setRecords] = useState({});   // key: assignmentId → MinistryAttendanceRequest
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!event?.id) return;
    setLoading(true);
    apiService.getMinistryEventAttendance(event.id)
      .then((data) => {
        setAssignments(data);
        // Pre-cargar evaluaciones ya existentes
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

  const handleChange = (assignmentId, updated) => {
    setRecords((prev) => ({ ...prev, [assignmentId]: updated }));
  };

  const allComplete = Object.values(records).every((r) =>
    r.attended !== null && r.attended !== undefined &&
    (r.attended === false || (r.punctuality !== null && r.presentation !== null && r.attitude !== null)) &&
    r.observations?.trim()
  );

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

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-attendance"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 720, maxHeight: '90vh', overflowY: 'auto' }}
      >
        {/* Header */}
        <div className="modal-header">
          <div>
            <h2 className="modal-title">📋 Registro de Asistencias</h2>
            <p className="modal-subtitle">
              {event?.name} — {event?.eventDate
                ? new Date(event.eventDate).toLocaleDateString('es-CO', {
                    weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'
                  })
                : ''}
            </p>
          </div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        {/* Body */}
        <div className="modal-body" style={{ padding: '1rem' }}>
          {loading && <p className="loading-text">Cargando servidores asignados...</p>}

          {!loading && assignments.length === 0 && (
            <p className="empty-text">No hay servidores asignados a este culto.</p>
          )}

          {!loading && assignments.map((a) => (
            <ServerRow
              key={a.assignmentId}
              assignment={a}
              record={records[a.assignmentId] || { assignmentId: a.assignmentId }}
              onChange={(updated) => handleChange(a.assignmentId, updated)}
            />
          ))}

          {error && (
            <div className="error-banner" style={{ color: '#ef4444', marginTop: '0.75rem', fontSize: '0.875rem' }}>
              ⚠️ {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer" style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', padding: '1rem', borderTop: '1px solid #e5e7eb' }}>
          <button className="btn-secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </button>
          <button
            className="btn-primary"
            onClick={handleSave}
            disabled={saving || !allComplete || loading}
          >
            {saving ? '⏳ Guardando...' : '✅ Guardar evaluaciones'}
          </button>
        </div>
      </div>

      <style>{`
        .server-row {
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          padding: 1rem;
          margin-bottom: 1rem;
          transition: border-color .2s;
        }
        .server-row--incomplete { border-color: #fbbf24; }
        .server-row--complete   { border-color: #22c55e; }
        .server-row__header { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: .5rem; margin-bottom: .75rem; }
        .server-name { font-weight: 700; font-size: 1rem; display: block; }
        .server-role { font-size: .8rem; color: #6b7280; }
        .attendance-toggle { display: flex; gap: .5rem; }
        .toggle-btn { padding: .35rem .8rem; border-radius: 8px; border: 2px solid #d1d5db; background: transparent; cursor: pointer; font-size: .85rem; transition: all .15s; }
        .toggle-btn--yes { border-color: #22c55e; background: #dcfce7; color: #15803d; font-weight: 600; }
        .toggle-btn--no  { border-color: #ef4444; background: #fee2e2; color: #b91c1c; font-weight: 600; }
        .excused-row { display: flex; align-items: center; gap: .75rem; margin-bottom: .75rem; flex-wrap: wrap; }
        .excused-label { font-size: .85rem; font-weight: 600; }
        .excused-btn { padding: .3rem .7rem; border-radius: 6px; border: 1.5px solid #d1d5db; background: transparent; cursor: pointer; font-size: .82rem; }
        .excused-btn--excused   { border-color: #3b82f6; background: #eff6ff; color: #1d4ed8; font-weight: 600; }
        .excused-btn--unexcused { border-color: #ef4444; background: #fee2e2; color: #b91c1c; font-weight: 600; }
        .auto-score-note { font-size: .78rem; color: #6b7280; font-style: italic; }
        .scores-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: .75rem; margin-bottom: .75rem; }
        .score-selector { display: flex; flex-direction: column; gap: .3rem; }
        .score-label { font-size: .82rem; font-weight: 600; color: #374151; }
        .score-buttons { display: flex; gap: .3rem; }
        .score-btn { width: 36px; height: 36px; border-radius: 8px; border: 2px solid #d1d5db; background: #f9fafb; cursor: pointer; font-weight: 700; font-size: .9rem; transition: all .15s; }
        .score-btn:disabled { opacity: .4; cursor: not-allowed; }
        .score-btn--active { transform: scale(1.1); }
        .score-current { font-size: .78rem; font-weight: 600; }
        .observations-row { margin-top: .75rem; }
        .obs-label { font-size: .82rem; font-weight: 600; color: #374151; display: block; margin-bottom: .3rem; }
        .required { color: #ef4444; }
        .obs-input { width: 100%; border: 1.5px solid #d1d5db; border-radius: 8px; padding: .5rem .75rem; font-size: .85rem; resize: vertical; transition: border-color .15s; box-sizing: border-box; }
        .obs-input:focus { outline: none; border-color: #3b82f6; }
        .obs-input--empty { border-color: #fbbf24; }
        .loading-text, .empty-text { color: #6b7280; text-align: center; padding: 2rem; }
        .modal-attendance { background: white; border-radius: 16px; width: 100%; box-shadow: 0 20px 60px rgba(0,0,0,.18); }
        .modal-header { display: flex; justify-content: space-between; align-items: flex-start; padding: 1.25rem 1.5rem; border-bottom: 1px solid #e5e7eb; }
        .modal-title { font-size: 1.2rem; font-weight: 700; margin: 0 0 .2rem; }
        .modal-subtitle { font-size: .85rem; color: #6b7280; margin: 0; text-transform: capitalize; }
        .modal-close-btn { background: none; border: none; font-size: 1.2rem; cursor: pointer; color: #6b7280; padding: .25rem; }
      `}</style>
    </div>
  );
}
