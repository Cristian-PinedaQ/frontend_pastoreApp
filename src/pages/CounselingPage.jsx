// ============================================
// CounselingPage.jsx - Módulo de Consejerías Pastorales
// ✅ Fila clickeable → abre detalle
// ✅ Botones de acción dentro del modal de detalle
// ✅ Tabla limpia sin columna de acciones
// ✅ Tarjetas responsive en móvil
// ✅ Estado IN_PROGRESS: iniciar sesión en tiempo real
// ✅ Modal de sesión activa con contexto histórico del miembro
// ============================================

import React, { useState, useEffect, useCallback, useRef } from "react";
import apiService from "../apiService";
import "../css/CounselingPage.css";

const DEBUG = process.env.REACT_APP_DEBUG === "true";
const log = (msg, data) => { if (DEBUG) console.log(`[CounselingPage] ${msg}`, data || ""); };
const logError = (msg, err) => console.error(`[CounselingPage] ${msg}`, err);

// ============================================================
// CONSTANTES
// ============================================================
const COUNSELING_STATUS = {
  SCHEDULED:    { label: "Programada",   color: "scheduled",    icon: "📅" },
  RESCHEDULED:  { label: "Reprogramada", color: "rescheduled",  icon: "🔄" },
  IN_PROGRESS:  { label: "En curso",     color: "inprogress",   icon: "▶️" },
  COMPLETED:    { label: "Completada",   color: "completed",    icon: "✅" },
  CANCELLED:    { label: "Cancelada",    color: "cancelled",    icon: "❌" },
  NO_SHOW:      { label: "No asistió",   color: "noshow",       icon: "👻" },
};

const COUNSELING_TOPICS = {
  SPIRITUAL:    "🙏 Espiritual",
  FAMILY:       "👨‍👩‍👧 Familiar",
  MARITAL:      "💑 Matrimonial",
  GRIEF:        "🕊️ Duelo",
  FINANCIAL:    "💰 Finanzas",
  PERSONAL:     "🧠 Personal",
  VOCATIONAL:   "🌟 Vocacional",
  ADDICTION:    "🔗 Adicciones",
  PREMARITAL:   "💍 Prematrimonial",
  OTHER:        "📋 Otro",
};

const EMPTY_SESSION_FORM = {
  memberId: "",
  scheduledAt: "",
  durationMinutes: 60,
  location: "",
  topic: "OTHER",
  objectives: "",
};

const EMPTY_COMPLETE_FORM = {
  notes: "",
  followUpRequired: false,
  followUpNotes: "",
  followUpDate: "",
};

// ============================================================
// HELPERS
// ============================================================
const formatDateTime = (dt) => {
  if (!dt) return "-";
  try {
    return new Date(dt).toLocaleString("es-CO", {
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return dt; }
};

const formatDate = (dt) => {
  if (!dt) return "-";
  try { return parseLocalDate(dt).toLocaleDateString("es-CO"); } // ✅
  catch { return dt; }
};

const toLocalDatetimeInput = (iso) => {
  if (!iso) return "";
  return iso.length >= 16 ? iso.slice(0, 16) : iso;
};

// Agregar esta función helper al inicio del archivo
const parseLocalDate = (str) => {
  if (!str) return null;
  // Si es solo fecha "YYYY-MM-DD", parsear sin conversión UTC
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const [y, m, d] = str.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  // Si ya trae hora/timezone, new Date es seguro
  return new Date(str);
};

// ============================================================
// MODAL: Agendar / Editar sesión  (sin cambios)
// ============================================================
function ModalScheduleSession({ isOpen, onClose, onSave, initialData, members, isEditing }) {
  const [form, setForm] = useState(EMPTY_SESSION_FORM);
  const [memberSearch, setMemberSearch] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (isEditing && initialData) {
        setForm({
          memberId:        initialData.memberId || "",
          scheduledAt:     toLocalDatetimeInput(initialData.scheduledAt) || "",
          durationMinutes: initialData.durationMinutes || 60,
          location:        initialData.location || "",
          topic:           initialData.topic || "OTHER",
          objectives:      initialData.objectives || "",
        });
        setMemberSearch(initialData.memberName || "");
      } else {
        setForm(EMPTY_SESSION_FORM);
        setMemberSearch("");
      }
    }
  }, [isOpen, isEditing, initialData]);

  if (!isOpen) return null;

  const filteredMembers = memberSearch.length >= 2
    ? members.filter(m =>
        m.name?.toLowerCase().includes(memberSearch.toLowerCase()) ||
        m.document?.toLowerCase().includes(memberSearch.toLowerCase())
      ).slice(0, 10)
    : [];

  const handleMemberSelect = (m) => {
    setForm(f => ({ ...f, memberId: m.id }));
    setMemberSearch(m.name);
  };

  const handleSubmit = async () => {
    if (!form.memberId)    return alert("Selecciona un miembro");
    if (!form.scheduledAt) return alert("La fecha y hora son obligatorias");
    setSaving(true);
    try {
      await onSave({
        memberId:        Number(form.memberId),
        scheduledAt:     form.scheduledAt,
        durationMinutes: Number(form.durationMinutes),
        location:        form.location || null,
        topic:           form.topic,
        objectives:      form.objectives || null,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="cp-modal-overlay" onClick={onClose}>
      <div className="cp-modal" onClick={e => e.stopPropagation()}>
        <div className="cp-modal__header">
          <h2>{isEditing ? "✏️ Editar Sesión" : "📅 Agendar Sesión"}</h2>
          <button className="cp-modal__close" onClick={onClose}>✕</button>
        </div>
        <div className="cp-modal__body">
          <div className="cp-form-group">
            <label>👤 Miembro *</label>
            <input
              type="text"
              placeholder="Buscar por nombre o documento..."
              value={memberSearch}
              onChange={e => { setMemberSearch(e.target.value); setForm(f => ({ ...f, memberId: "" })); }}
            />
            {filteredMembers.length > 0 && !form.memberId && (
              <div className="cp-member-dropdown">
                {filteredMembers.map(m => (
                  <div key={m.id} className="cp-member-option" onClick={() => handleMemberSelect(m)}>
                    <span className="cp-member-option__name">{m.name}</span>
                    <span className="cp-member-option__doc">{m.document}</span>
                  </div>
                ))}
              </div>
            )}
            {form.memberId && (
              <span className="cp-selected-member">✅ Miembro seleccionado (ID: {form.memberId})</span>
            )}
          </div>

          <div className="cp-form-row">
            <div className="cp-form-group">
              <label>📅 Fecha y Hora *</label>
              <input
                type="datetime-local"
                value={form.scheduledAt}
                onChange={e => setForm(f => ({ ...f, scheduledAt: e.target.value }))}
              />
            </div>
            <div className="cp-form-group">
              <label>⏱️ Duración (min)</label>
              <input
                type="number"
                min="15"
                value={form.durationMinutes}
                onChange={e => setForm(f => ({ ...f, durationMinutes: e.target.value }))}
              />
            </div>
          </div>

          <div className="cp-form-row">
            <div className="cp-form-group">
              <label>📍 Lugar</label>
              <input
                type="text"
                placeholder="Ej: Oficina pastoral"
                value={form.location}
                onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                maxLength={255}
              />
            </div>
            <div className="cp-form-group">
              <label>🏷️ Tema</label>
              <select value={form.topic} onChange={e => setForm(f => ({ ...f, topic: e.target.value }))}>
                {Object.entries(COUNSELING_TOPICS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="cp-form-group">
            <label>🎯 Objetivos de la sesión</label>
            <textarea
              rows={3}
              placeholder="Describe los objetivos principales de esta sesión..."
              value={form.objectives}
              onChange={e => setForm(f => ({ ...f, objectives: e.target.value }))}
            />
          </div>
        </div>
        <div className="cp-modal__footer">
          <button className="cp-btn cp-btn--ghost" onClick={onClose} disabled={saving}>Cancelar</button>
          <button className="cp-btn cp-btn--primary" onClick={handleSubmit} disabled={saving}>
            {saving ? "⏳ Guardando..." : isEditing ? "💾 Actualizar" : "📅 Agendar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// MODAL: Completar sesión  (sin cambios)
// ============================================================
function ModalCompleteSession({ isOpen, onClose, onSave, session }) {
  const [form, setForm] = useState(EMPTY_COMPLETE_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (isOpen) setForm(EMPTY_COMPLETE_FORM); }, [isOpen]);
  if (!isOpen || !session) return null;

  const handleSubmit = async () => {
    if (!form.notes.trim()) return alert("Las notas son obligatorias para completar la sesión");
    setSaving(true);
    try {
      await onSave({
        notes:            form.notes,
        followUpRequired: form.followUpRequired,
        followUpNotes:    form.followUpNotes || null,
        followUpDate:     form.followUpDate || null,
      });
    } finally { setSaving(false); }
  };

  return (
    <div className="cp-modal-overlay" onClick={onClose}>
      <div className="cp-modal" onClick={e => e.stopPropagation()}>
        <div className="cp-modal__header cp-modal__header--complete">
          <h2>✅ Completar Sesión</h2>
          <button className="cp-modal__close" onClick={onClose}>✕</button>
        </div>
        <div className="cp-modal__body">
          <div className="cp-session-info-box">
            <strong>{session.memberName}</strong>
            <span>{formatDateTime(session.scheduledAt)}</span>
          </div>
          <div className="cp-form-group">
            <label>📝 Notas de la sesión *</label>
            <textarea
              rows={4}
              placeholder="Describe lo que se trabajó en la sesión, observaciones, avances..."
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            />
          </div>
          <div className="cp-form-group cp-form-group--checkbox">
            <label>
              <input
                type="checkbox"
                checked={form.followUpRequired}
                onChange={e => setForm(f => ({ ...f, followUpRequired: e.target.checked }))}
              />
              🔔 Requiere seguimiento
            </label>
          </div>
          {form.followUpRequired && (
            <>
              <div className="cp-form-group">
                <label>📋 Notas de seguimiento</label>
                <textarea
                  rows={2}
                  placeholder="Qué se debe verificar o continuar en la próxima sesión..."
                  value={form.followUpNotes}
                  onChange={e => setForm(f => ({ ...f, followUpNotes: e.target.value }))}
                />
              </div>
              <div className="cp-form-group">
                <label>📅 Fecha de seguimiento</label>
                <input
                  type="datetime-local"
                  value={form.followUpDate}
                  onChange={e => setForm(f => ({ ...f, followUpDate: e.target.value }))}
                />
              </div>
            </>
          )}
        </div>
        <div className="cp-modal__footer">
          <button className="cp-btn cp-btn--ghost" onClick={onClose} disabled={saving}>Cancelar</button>
          <button className="cp-btn cp-btn--complete" onClick={handleSubmit} disabled={saving}>
            {saving ? "⏳ Guardando..." : "✅ Completar Sesión"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// MODAL: Cancelar sesión  (sin cambios)
// ============================================================
function ModalCancelSession({ isOpen, onClose, onSave, session }) {
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (isOpen) setReason(""); }, [isOpen]);
  if (!isOpen || !session) return null;

  const handleSubmit = async () => {
    if (!reason.trim()) return alert("El motivo de cancelación es obligatorio");
    setSaving(true);
    try { await onSave({ cancellationReason: reason }); }
    finally { setSaving(false); }
  };

  return (
    <div className="cp-modal-overlay" onClick={onClose}>
      <div className="cp-modal cp-modal--sm" onClick={e => e.stopPropagation()}>
        <div className="cp-modal__header cp-modal__header--cancel">
          <h2>❌ Cancelar Sesión</h2>
          <button className="cp-modal__close" onClick={onClose}>✕</button>
        </div>
        <div className="cp-modal__body">
          <div className="cp-session-info-box cp-session-info-box--danger">
            <strong>{session.memberName}</strong>
            <span>{formatDateTime(session.scheduledAt)}</span>
          </div>
          <div className="cp-form-group">
            <label>📝 Motivo de cancelación *</label>
            <textarea
              rows={3}
              placeholder="Indica el motivo por el que se cancela esta sesión..."
              value={reason}
              onChange={e => setReason(e.target.value)}
              maxLength={500}
            />
            <span className="cp-char-count">{reason.length}/500</span>
          </div>
        </div>
        <div className="cp-modal__footer">
          <button className="cp-btn cp-btn--ghost" onClick={onClose} disabled={saving}>Volver</button>
          <button className="cp-btn cp-btn--danger" onClick={handleSubmit} disabled={saving}>
            {saving ? "⏳ Cancelando..." : "❌ Confirmar Cancelación"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// MODAL: Sesión Activa (IN_PROGRESS) con contexto histórico  ← NUEVO
// ============================================================
function ModalActiveSession({ isOpen, onClose, sessionData, onComplete, onCancel, onNoShow }) {
  const [activeTab, setActiveTab] = useState("current");

  useEffect(() => {
    if (isOpen) setActiveTab("current");
  }, [isOpen]);

  if (!isOpen || !sessionData) return null;

  const { activeSession, previousSessions = [], pendingFollowUps = [], memberStats, totalPreviousSessions } = sessionData;

  const hasPrevious  = previousSessions.length > 0;
  const hasFollowUps = pendingFollowUps.length > 0;

  return (
    <div className="cp-modal-overlay" onClick={onClose}>
      <div className="cp-modal cp-modal--active-session" onClick={e => e.stopPropagation()}>

        {/* Header — barra naranja de sesión en curso */}
        <div className="cp-active-session-header">
          <div className="cp-active-session-header__left">
            <span className="cp-active-pulse" />
            <div>
              <span className="cp-active-session-label">SESIÓN EN CURSO</span>
              <h2>{activeSession.memberName}</h2>
              <span className="cp-active-session-meta">
                {COUNSELING_TOPICS[activeSession.topic] || activeSession.topic}
                {activeSession.location ? ` · 📍 ${activeSession.location}` : ""}
                {activeSession.startedAt ? ` · Inició ${formatDateTime(activeSession.startedAt)}` : ""}
              </span>
            </div>
          </div>
          <button className="cp-modal__close cp-modal__close--light" onClick={onClose}>✕</button>
        </div>

        {/* Tabs de navegación */}
        <div className="cp-active-tabs">
          <button
            className={`cp-active-tab ${activeTab === "current" ? "cp-active-tab--active" : ""}`}
            onClick={() => setActiveTab("current")}
          >
            📋 Sesión actual
          </button>
          <button
            className={`cp-active-tab ${activeTab === "history" ? "cp-active-tab--active" : ""}`}
            onClick={() => setActiveTab("history")}
          >
            📂 Historial
            {hasPrevious && <span className="cp-active-tab__badge">{totalPreviousSessions}</span>}
          </button>
          <button
            className={`cp-active-tab ${activeTab === "followups" ? "cp-active-tab--active" : ""}`}
            onClick={() => setActiveTab("followups")}
          >
            🔔 Seguimientos
            {hasFollowUps && <span className="cp-active-tab__badge cp-active-tab__badge--warn">{pendingFollowUps.length}</span>}
          </button>
          <button
            className={`cp-active-tab ${activeTab === "stats" ? "cp-active-tab--active" : ""}`}
            onClick={() => setActiveTab("stats")}
          >
            📈 Estadísticas
          </button>
        </div>

        <div className="cp-modal__body cp-active-body">

          {/* ── TAB: Sesión actual ─────────────────────────────── */}
          {activeTab === "current" && (
            <div className="cp-active-tab-content">
              <div className="cp-detail-grid">
                <div className="cp-detail-section">
                  <h3>👤 Miembro</h3>
                  <div className="cp-detail-row"><span>Nombre</span><strong>{activeSession.memberName}</strong></div>
                  <div className="cp-detail-row"><span>Documento</span><strong>{activeSession.memberDocument || "-"}</strong></div>
                  <div className="cp-detail-row"><span>Teléfono</span><strong>{activeSession.memberPhone || "-"}</strong></div>
                  <div className="cp-detail-row"><span>Email</span><strong>{activeSession.memberEmail || "-"}</strong></div>
                </div>
                <div className="cp-detail-section">
                  <h3>📅 Esta sesión</h3>
                  <div className="cp-detail-row"><span>Agendada</span><strong>{formatDateTime(activeSession.scheduledAt)}</strong></div>
                  <div className="cp-detail-row"><span>Iniciada</span><strong>{formatDateTime(activeSession.startedAt)}</strong></div>
                  <div className="cp-detail-row"><span>Duración est.</span><strong>{activeSession.durationMinutes} min</strong></div>
                  <div className="cp-detail-row"><span>Sesión N°</span><strong>#{activeSession.sessionNumber}</strong></div>
                </div>
              </div>

              {activeSession.objectives && (
                <div className="cp-detail-section cp-detail-section--full">
                  <h3>🎯 Objetivos de esta sesión</h3>
                  <p className="cp-detail-text">{activeSession.objectives}</p>
                </div>
              )}

              {/* Alerta si hay follow-ups vencidos */}
              {pendingFollowUps.some(f => f.overdue) && (
                <div className="cp-active-alert cp-active-alert--warn">
                  ⚠️ <strong>{pendingFollowUps.filter(f => f.overdue).length} seguimiento(s) vencido(s)</strong> de sesiones anteriores.
                  <button className="cp-active-alert__link" onClick={() => setActiveTab("followups")}>
                    Ver →
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── TAB: Historial ─────────────────────────────────── */}
          {activeTab === "history" && (
            <div className="cp-active-tab-content">
              {!hasPrevious ? (
                <div className="cp-active-empty">
                  <span>🕊️</span>
                  <p>Esta es la primera sesión con este miembro.</p>
                </div>
              ) : (
                <div className="cp-history-list">
                  <p className="cp-history-intro">
                    Últimas {previousSessions.length} de {totalPreviousSessions} sesión(es) completada(s) con este miembro:
                  </p>
                  {previousSessions.map((s, i) => (
                    <div key={s.sessionId} className="cp-history-card">
                      <div className="cp-history-card__header">
                        <span className="cp-history-card__num">Sesión #{s.sessionNumber}</span>
                        <span className="cp-history-card__date">{formatDate(s.scheduledAt)}</span>
                        <span className="cp-topic-badge">{COUNSELING_TOPICS[s.topic] || s.topic}</span>
                      </div>

                      {s.objectives && (
                        <div className="cp-history-card__block">
                          <span className="cp-history-card__block-label">🎯 Objetivos</span>
                          <p>{s.objectives}</p>
                        </div>
                      )}

                      {s.notes ? (
                        <div className="cp-history-card__block cp-history-card__block--notes">
                          <span className="cp-history-card__block-label">📝 Notas del pastor</span>
                          <p>{s.notes}</p>
                        </div>
                      ) : (
                        <p className="cp-history-card__empty">Sin notas registradas.</p>
                      )}

                      {s.followUpRequired && s.followUpNotes && (
                        <div className="cp-history-card__block cp-history-card__block--followup">
                          <span className="cp-history-card__block-label">🔔 Seguimiento solicitado</span>
                          <p>{s.followUpNotes}</p>
                          {s.followUpDate && (
                            <span className="cp-history-card__followup-date">
                              Fecha: {formatDateTime(s.followUpDate)}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── TAB: Follow-ups ────────────────────────────────── */}
          {activeTab === "followups" && (
            <div className="cp-active-tab-content">
              {!hasFollowUps ? (
                <div className="cp-active-empty">
                  <span>✅</span>
                  <p>No hay seguimientos pendientes de sesiones anteriores.</p>
                </div>
              ) : (
                <div className="cp-followup-list">
                  {pendingFollowUps.map((fu, i) => (
                    <div
                      key={fu.originSessionId}
                      className={`cp-followup-card ${fu.overdue ? "cp-followup-card--overdue" : ""}`}
                    >
                      <div className="cp-followup-card__header">
                        <span className="cp-followup-card__origin">
                          De sesión #{fu.originSessionNumber} · {formatDate(fu.originSessionDate)}
                        </span>
                        {fu.overdue && (
                          <span className="cp-followup-card__overdue-badge">⚠️ Vencido</span>
                        )}
                      </div>
                      <p className="cp-followup-card__notes">{fu.followUpNotes}</p>
                      {fu.followUpDate && (
                        <span className="cp-followup-card__date">
                          📅 Fecha sugerida: {formatDateTime(fu.followUpDate)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── TAB: Estadísticas ──────────────────────────────── */}
          {activeTab === "stats" && (
            <div className="cp-active-tab-content">
              {!memberStats ? (
                <div className="cp-active-empty"><span>📊</span><p>Sin estadísticas disponibles.</p></div>
              ) : (
                <div className="cp-stats-grid">
                  <div className="cp-stat-card cp-stat-card--total">
                    <span className="cp-stat-card__icon">📋</span>
                    <span className="cp-stat-card__value">{memberStats.totalSessions}</span>
                    <span className="cp-stat-card__label">Total sesiones</span>
                  </div>
                  <div className="cp-stat-card cp-stat-card--completed">
                    <span className="cp-stat-card__icon">✅</span>
                    <span className="cp-stat-card__value">{memberStats.completedSessions}</span>
                    <span className="cp-stat-card__label">Completadas</span>
                  </div>
                  <div className="cp-stat-card cp-stat-card--cancelled">
                    <span className="cp-stat-card__icon">❌</span>
                    <span className="cp-stat-card__value">{memberStats.cancelledSessions}</span>
                    <span className="cp-stat-card__label">Canceladas</span>
                  </div>
                  <div className="cp-stat-card cp-stat-card--noshow">
                    <span className="cp-stat-card__icon">👻</span>
                    <span className="cp-stat-card__value">{memberStats.noShowSessions}</span>
                    <span className="cp-stat-card__label">No asistió</span>
                  </div>
                  <div className="cp-stat-card cp-stat-card--rate">
                    <span className="cp-stat-card__icon">📈</span>
                    <span className="cp-stat-card__value">{memberStats.completionRate}%</span>
                    <span className="cp-stat-card__label">Tasa completadas</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer de acciones */}
        <div className="cp-modal__footer cp-modal__footer--active">
          <button className="cp-btn cp-btn--ghost" onClick={onClose}>
            Minimizar
          </button>
          <div className="cp-modal__footer-spacer" />
          <button
            className="cp-btn cp-btn--noshow"
            onClick={() => { onNoShow(activeSession); onClose(); }}
          >
            👻 No asistió
          </button>
          <button
            className="cp-btn cp-btn--danger"
            onClick={() => { onCancel(activeSession); onClose(); }}
          >
            ❌ Cancelar
          </button>
          <button
            className="cp-btn cp-btn--complete"
            onClick={() => { onComplete(activeSession); onClose(); }}
          >
            ✅ Completar sesión
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// MODAL: Detalle de sesión + Acciones integradas  (actualizado)
// ============================================================
function ModalSessionDetail({ isOpen, onClose, session, onEdit, onComplete, onCancel, onNoShow, onPdf, onStart }) {
  if (!isOpen || !session) return null;

  const status   = COUNSELING_STATUS[session.status] || { label: session.status, color: "default", icon: "📋" };
  const isActive = session.status === "SCHEDULED" || session.status === "RESCHEDULED";
  const isOngoing = session.status === "IN_PROGRESS";

  return (
    <div className="cp-modal-overlay" onClick={onClose}>
      <div className="cp-modal cp-modal--detail" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="cp-modal__header">
          <div className="cp-detail-header-info">
            <span className="cp-detail-session-num">Sesión #{session.sessionNumber}</span>
            <h2>{session.memberName}</h2>
          </div>
          <button className="cp-modal__close" onClick={onClose}>✕</button>
        </div>

        {/* Status bar */}
        <div className={`cp-detail-status-bar cp-detail-status-bar--${status.color}`}>
          <span className="cp-detail-status-bar__badge">
            {status.icon} {status.label}
          </span>
          {session.followUpRequired && (
            <span className="cp-detail-status-bar__followup">🔔 Seguimiento pendiente</span>
          )}
        </div>

        <div className="cp-modal__body">

          {/* Grid: Miembro + Sesión */}
          <div className="cp-detail-grid">
            <div className="cp-detail-section">
              <h3>👤 Miembro</h3>
              <div className="cp-detail-row"><span>Nombre</span><strong>{session.memberName}</strong></div>
              <div className="cp-detail-row"><span>Documento</span><strong>{session.memberDocument || "-"}</strong></div>
              <div className="cp-detail-row"><span>Teléfono</span><strong>{session.memberPhone || "-"}</strong></div>
              <div className="cp-detail-row"><span>Email</span><strong>{session.memberEmail || "-"}</strong></div>
            </div>
            <div className="cp-detail-section">
              <h3>📅 Sesión</h3>
              <div className="cp-detail-row"><span>Fecha</span><strong>{formatDateTime(session.scheduledAt)}</strong></div>
              <div className="cp-detail-row"><span>Duración</span><strong>{session.durationMinutes} min</strong></div>
              <div className="cp-detail-row"><span>Lugar</span><strong>{session.location || "-"}</strong></div>
              <div className="cp-detail-row"><span>Tema</span><strong>{COUNSELING_TOPICS[session.topic] || session.topic}</strong></div>
              {session.startedAt && (
                <div className="cp-detail-row"><span>Iniciada</span><strong>{formatDateTime(session.startedAt)}</strong></div>
              )}
            </div>
          </div>

          {/* Objetivos */}
          {session.objectives && (
            <div className="cp-detail-section cp-detail-section--full">
              <h3>🎯 Objetivos</h3>
              <p className="cp-detail-text">{session.objectives}</p>
            </div>
          )}

          {/* Notas */}
          {session.notes && (
            <div className="cp-detail-section cp-detail-section--full">
              <h3>📝 Notas de la sesión</h3>
              <p className="cp-detail-text">{session.notes}</p>
            </div>
          )}

          {/* Seguimiento */}
          {session.followUpRequired && (
            <div className="cp-detail-section cp-detail-section--full cp-detail-section--followup">
              <h3>🔔 Seguimiento requerido</h3>
              {session.followUpNotes && <p className="cp-detail-text">{session.followUpNotes}</p>}
              {session.followUpDate && (
                <div className="cp-detail-row"><span>Fecha</span><strong>{formatDateTime(session.followUpDate)}</strong></div>
              )}
            </div>
          )}

          {/* Cancelación */}
          {session.cancellationReason && (
            <div className="cp-detail-section cp-detail-section--full cp-detail-section--cancelled">
              <h3>❌ Motivo de cancelación</h3>
              <p className="cp-detail-text">{session.cancellationReason}</p>
              {session.cancelledAt && (
                <div className="cp-detail-row"><span>Cancelada el</span><strong>{formatDateTime(session.cancelledAt)}</strong></div>
              )}
            </div>
          )}

          {/* Meta */}
          <div className="cp-detail-meta">
            <span>Creada: {formatDate(session.createdAt)}</span>
            <span>Actualizada: {formatDate(session.updatedAt)}</span>
          </div>
        </div>

        {/* Footer con acciones */}
        <div className="cp-modal__footer cp-modal__footer--actions">

          {/* PDF siempre disponible */}
          <button
            className="cp-btn cp-btn--report"
            onClick={() => { onPdf(session); onClose(); }}
            title="Descargar historial PDF"
          >
            📄 Historial PDF
          </button>

          <div className="cp-modal__footer-spacer" />

          <button className="cp-btn cp-btn--ghost" onClick={onClose}>
            Cerrar
          </button>

          {/* Sesión EN CURSO: solo mostrar botón para abrir la vista activa */}
          {isOngoing && (
            <button
              className="cp-btn cp-btn--inprogress"
              onClick={() => { onStart(session); onClose(); }}
            >
              ▶️ Ver sesión en curso
            </button>
          )}

          {/* Sesión PROGRAMADA: editar, completar, no-show, cancelar */}
          {isActive && (
            <>
              <button
                className="cp-btn cp-btn--start"
                onClick={() => { onStart(session); onClose(); }}
                title="Iniciar sesión ahora"
              >
                ▶️ Iniciar sesión
              </button>
              <button
                className="cp-btn cp-btn--edit"
                onClick={() => { onEdit(session); onClose(); }}
                title="Editar sesión"
              >
                ✏️ Editar
              </button>
              <button
                className="cp-btn cp-btn--complete"
                onClick={() => { onComplete(session); onClose(); }}
                title="Completar sesión"
              >
                ✅ Completar
              </button>
              <button
                className="cp-btn cp-btn--noshow"
                onClick={() => { onNoShow(session); onClose(); }}
                title="Marcar como No Asistió"
              >
                👻 No asistió
              </button>
              <button
                className="cp-btn cp-btn--danger"
                onClick={() => { onCancel(session); onClose(); }}
                title="Cancelar sesión"
              >
                ❌ Cancelar
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================
const CounselingPage = () => {
  const [sessions, setSessions]             = useState([]);
  const [filtered, setFiltered]             = useState([]);
  const [members, setMembers]               = useState([]);
  const [loading, setLoading]               = useState(false);
  const [error, setError]                   = useState("");

  const [filterStatus, setFilterStatus]     = useState("ALL");
  const [filterTopic, setFilterTopic]       = useState("ALL");
  const [filterSearch, setFilterSearch]     = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo]     = useState("");

  const [showSchedule, setShowSchedule]     = useState(false);
  const [showComplete, setShowComplete]     = useState(false);
  const [showCancel, setShowCancel]         = useState(false);
  const [showDetail, setShowDetail]         = useState(false);
  const [showActive, setShowActive]         = useState(false);   // ← NUEVO
  const [activeSession, setActiveSession]   = useState(null);
  const [activeSessionData, setActiveSessionData] = useState(null); // ← NUEVO: datos de startSession
  const [isEditing, setIsEditing]           = useState(false);

  const opInProgress = useRef(false);

  // ── Carga de datos ─────────────────────────────────────────
  const loadSessions = useCallback(async () => {
    if (opInProgress.current) return;
    opInProgress.current = true;
    setLoading(true);
    setError("");
    try {
      log("Cargando sesiones de consejería");
      const data = await apiService.request("/counseling");
      setSessions(Array.isArray(data) ? data : []);
    } catch (err) {
      logError("Error cargando sesiones:", err);
      setError("Error al cargar las sesiones de consejería");
    } finally {
      setLoading(false);
      opInProgress.current = false;
    }
  }, []);

  const loadMembers = useCallback(async () => {
    try {
      const data = await apiService.getAllMembers();
      setMembers(Array.isArray(data) ? data : []);
    } catch (err) { logError("Error cargando miembros:", err); }
  }, []);

  useEffect(() => { loadSessions(); loadMembers(); }, [loadSessions, loadMembers]);

  // ── Filtros ────────────────────────────────────────────────
  const applyFilters = useCallback(() => {
    let result = [...sessions];
    result.sort((a, b) => new Date(b.scheduledAt) - new Date(a.scheduledAt));
    if (filterStatus !== "ALL") result = result.filter(s => s.status === filterStatus);
    if (filterTopic !== "ALL")  result = result.filter(s => s.topic === filterTopic);
    if (filterSearch.trim()) {
      const q = filterSearch.toLowerCase();
      result = result.filter(s =>
        s.memberName?.toLowerCase().includes(q) ||
        s.memberDocument?.toLowerCase().includes(q)
      );
    }
    if (filterDateFrom) result = result.filter(s => s.scheduledAt >= filterDateFrom);
    if (filterDateTo)   result = result.filter(s => s.scheduledAt <= filterDateTo + "T23:59");
    setFiltered(result);
  }, [sessions, filterStatus, filterTopic, filterSearch, filterDateFrom, filterDateTo]);

  useEffect(() => { applyFilters(); }, [applyFilters]);

  const clearFilters = useCallback(async () => {
    setFilterStatus("ALL");
    setFilterTopic("ALL");
    setFilterSearch("");
    setFilterDateFrom("");
    setFilterDateTo("");
    await loadSessions();
  }, [loadSessions]);

  // ── Handlers de detalle → sub-modales ─────────────────────
  const openDetail = useCallback((session) => {
    setActiveSession(session);
    setShowDetail(true);
  }, []);

  const handleOpenEdit = useCallback((session) => {
    setActiveSession(session);
    setIsEditing(true);
    setShowSchedule(true);
  }, []);

  const handleOpenComplete = useCallback((session) => {
    setActiveSession(session);
    setShowComplete(true);
  }, []);

  const handleOpenCancel = useCallback((session) => {
    setActiveSession(session);
    setShowCancel(true);
  }, []);

  // ── INICIAR SESIÓN ← NUEVO ─────────────────────────────────
  /**
   * Llama a PATCH /{id}/start y abre el modal de sesión activa
   * con el contexto histórico que devuelve el backend.
   *
   * Si la sesión ya está IN_PROGRESS (se reabre desde el detalle),
   * no vuelve a llamar al backend: solo abre el modal con los datos
   * que ya tenemos.
   */
  const handleStartSession = useCallback(async (session) => {
    if (opInProgress.current) return;

    // Si la sesión ya está en curso, abrir el modal directamente
    // con datos mínimos (sin historial — el historial se cargó al iniciar).
    // Para tener historial completo, igual llamamos al endpoint de historial.
    if (session.status === "IN_PROGRESS") {
      opInProgress.current = true;
      try {
        // Cargar historial del miembro para reconstruir el contexto
        const historyRaw = await apiService.request(`/counseling/member/${session.memberId}/history`);
        const currentId = session.id;
        const previousSessions = (Array.isArray(historyRaw) ? historyRaw : [])
          .filter(s => s.id !== currentId && s.status === "COMPLETED")
          .slice(0, 5)
          .map(s => ({
            sessionId:       s.id,
            sessionNumber:   s.sessionNumber,
            scheduledAt:     s.scheduledAt,
            startedAt:       s.startedAt,
            topic:           s.topic,
            topicDisplayName: COUNSELING_TOPICS[s.topic] || s.topic,
            status:          s.status,
            statusDisplayName: COUNSELING_STATUS[s.status]?.label || s.status,
            objectives:      s.objectives,
            notes:           s.notes,
            followUpRequired: s.followUpRequired,
            followUpNotes:   s.followUpNotes,
            followUpDate:    s.followUpDate,
          }));

        const pendingFollowUps = previousSessions
          .filter(s => s.followUpRequired && s.followUpNotes)
          .map(s => ({
            originSessionId:     s.sessionId,
            originSessionNumber: s.sessionNumber,
            originSessionDate:   s.scheduledAt,
            followUpNotes:       s.followUpNotes,
            followUpDate:        s.followUpDate,
            overdue:             s.followUpDate && parseLocalDate(s.followUpDate) < new Date(),
          }));

        setActiveSessionData({
          activeSession:        session,
          totalPreviousSessions: previousSessions.length,
          previousSessions,
          pendingFollowUps,
          memberStats: null,
        });
        setShowActive(true);
      } catch (err) {
        logError("Error cargando historial para sesión en curso:", err);
        // Aun así abrimos el modal con datos básicos
        setActiveSessionData({ activeSession: session, previousSessions: [], pendingFollowUps: [], memberStats: null, totalPreviousSessions: 0 });
        setShowActive(true);
      } finally {
        opInProgress.current = false;
      }
      return;
    }

    // Si está SCHEDULED o RESCHEDULED → llamar al endpoint /start
    if (session.status !== "SCHEDULED" && session.status !== "RESCHEDULED") return;

    opInProgress.current = true;
    try {
      log("Iniciando sesión:", session.id);
      const data = await apiService.request(`/counseling/${session.id}/start`, { method: "PATCH" });
      // data es un StartSessionResponse
      setActiveSessionData(data);
      setShowActive(true);
      // Actualizar la lista para reflejar IN_PROGRESS
      await loadSessions();
    } catch (err) {
      logError("Error iniciando sesión:", err);
      const msg = err.message || "Error al iniciar la sesión";
      setError(msg);
      alert(`❌ ${msg}`);
    } finally {
      opInProgress.current = false;
    }
  }, [loadSessions]);

  // ── CRUD ───────────────────────────────────────────────────
  const handleSaveSession = useCallback(async (formData) => {
    if (opInProgress.current) return;
    opInProgress.current = true;
    try {
      if (isEditing && activeSession) {
        await apiService.request(`/counseling/${activeSession.id}`, { method: "PUT", body: JSON.stringify(formData) });
        alert("✅ Sesión actualizada correctamente");
      } else {
        await apiService.request("/counseling", { method: "POST", body: JSON.stringify(formData) });
        alert("✅ Sesión agendada correctamente. Se enviará notificación Telegram.");
      }
      setShowSchedule(false);
      setActiveSession(null);
      setIsEditing(false);
      opInProgress.current = false;
      await loadSessions();
    } catch (err) {
      logError("Error guardando sesión:", err);
      const msg = err.message || "Error al guardar la sesión";
      setError(msg);
      alert(`❌ ${msg}`);
    } finally { opInProgress.current = false; }
  }, [isEditing, activeSession, loadSessions]);

  const handleCompleteSession = useCallback(async (formData) => {
    if (!activeSession || opInProgress.current) return;
    opInProgress.current = true;
    try {
      await apiService.request(`/counseling/${activeSession.id}/complete`, { method: "PATCH", body: JSON.stringify(formData) });
      alert("✅ Sesión marcada como completada");
      setShowComplete(false);
      setShowActive(false);
      setActiveSession(null);
      setActiveSessionData(null);
      opInProgress.current = false;
      await loadSessions();
    } catch (err) {
      logError("Error completando sesión:", err);
      setError(err.message || "Error al completar la sesión");
    } finally { opInProgress.current = false; }
  }, [activeSession, loadSessions]);

  const handleCancelSession = useCallback(async (formData) => {
    if (!activeSession || opInProgress.current) return;
    opInProgress.current = true;
    try {
      await apiService.request(`/counseling/${activeSession.id}/cancel`, { method: "PATCH", body: JSON.stringify(formData) });
      alert("✅ Sesión cancelada");
      setShowCancel(false);
      setShowActive(false);
      setActiveSession(null);
      setActiveSessionData(null);
      opInProgress.current = false;
      await loadSessions();
    } catch (err) {
      logError("Error cancelando sesión:", err);
      setError(err.message || "Error al cancelar la sesión");
    } finally { opInProgress.current = false; }
  }, [activeSession, loadSessions]);

  const handleNoShow = useCallback(async (session) => {
    if (opInProgress.current) return;
    if (!window.confirm(`¿Marcar a ${session.memberName} como NO ASISTIDO?`)) return;
    opInProgress.current = true;
    try {
      await apiService.request(`/counseling/${session.id}/no-show`, { method: "PATCH" });
      alert("✅ Sesión marcada como No Asistió");
      setShowActive(false);
      setActiveSessionData(null);
      opInProgress.current = false;
      await loadSessions();
    } catch (err) {
      logError("Error marcando no-show:", err);
      setError(err.message || "Error al marcar no-show");
    } finally { opInProgress.current = false; }
  }, [loadSessions]);

  // ── PDFs ───────────────────────────────────────────────────
  const handleMemberHistoryPdf = useCallback(async (session) => {
    if (opInProgress.current) return;
    opInProgress.current = true;
    try {
      const token = sessionStorage.getItem("token");
      const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:8080/api/v1";
      const res = await fetch(`${API_BASE}/counseling/report/member/${session.memberId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const blob = await res.blob();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `historial-consejeria-${session.memberName?.replace(/\s+/g, "-")}.pdf`;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (err) {
      logError("Error generando PDF:", err);
      alert("❌ Error al generar el PDF del historial");
    } finally { opInProgress.current = false; }
  }, []);

  const handleManagementPdf = useCallback(async () => {
    if (opInProgress.current) return;
    opInProgress.current = true;
    try {
      const year = new Date().getFullYear();
      const token = sessionStorage.getItem("token");
      const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:8080/api/v1";
      const res = await fetch(`${API_BASE}/counseling/report/management?year=${year}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const blob = await res.blob();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `informe-gestion-consejerias-${year}.pdf`;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (err) {
      logError("Error generando PDF gestión:", err);
      alert("❌ Error al generar el informe de gestión");
    } finally { opInProgress.current = false; }
  }, []);

  // ── Estadísticas ───────────────────────────────────────────
  const stats = {
    total:          sessions.length,
    scheduled:      sessions.filter(s => s.status === "SCHEDULED" || s.status === "RESCHEDULED").length,
    inProgress:     sessions.filter(s => s.status === "IN_PROGRESS").length,
    completed:      sessions.filter(s => s.status === "COMPLETED").length,
    cancelled:      sessions.filter(s => s.status === "CANCELLED").length,
    noShow:         sessions.filter(s => s.status === "NO_SHOW").length,
    completionRate: sessions.length
      ? Math.round((sessions.filter(s => s.status === "COMPLETED").length / sessions.length) * 100)
      : 0,
  };

  // ── RENDER ─────────────────────────────────────────────────
  return (
    <div className="cp-page">
      <div className="cp-container">

        {/* HEADER */}
        <div className="cp-header">
          <div className="cp-header__text">
            <h1>🕊️ Consejerías Pastorales</h1>
            <p>Gestiona y programa sesiones de consejería a miembros de la iglesia</p>
          </div>
          <div className="cp-header__actions">
            <button className="cp-btn cp-btn--report" onClick={handleManagementPdf}>
              📊 Informe Anual
            </button>
            <button className="cp-btn cp-btn--primary" onClick={() => { setIsEditing(false); setActiveSession(null); setShowSchedule(true); }}>
              ➕ Agendar Sesión
            </button>
          </div>
        </div>

        {/* ESTADÍSTICAS */}
        <div className="cp-stats">
          <div className="cp-stat cp-stat--total">
            <span className="cp-stat__icon">📋</span>
            <div>
              <span className="cp-stat__value">{stats.total}</span>
              <span className="cp-stat__label">Total</span>
            </div>
          </div>
          <div className="cp-stat cp-stat--scheduled">
            <span className="cp-stat__icon">📅</span>
            <div>
              <span className="cp-stat__value">{stats.scheduled}</span>
              <span className="cp-stat__label">Programadas</span>
            </div>
          </div>
          {/* Tarjeta de sesiones EN CURSO — solo visible si hay alguna */}
          {stats.inProgress > 0 && (
            <div className="cp-stat cp-stat--inprogress">
              <span className="cp-stat__icon">▶️</span>
              <div>
                <span className="cp-stat__value">{stats.inProgress}</span>
                <span className="cp-stat__label">En curso</span>
              </div>
            </div>
          )}
          <div className="cp-stat cp-stat--completed">
            <span className="cp-stat__icon">✅</span>
            <div>
              <span className="cp-stat__value">{stats.completed}</span>
              <span className="cp-stat__label">Completadas</span>
            </div>
          </div>
          <div className="cp-stat cp-stat--cancelled">
            <span className="cp-stat__icon">❌</span>
            <div>
              <span className="cp-stat__value">{stats.cancelled + stats.noShow}</span>
              <span className="cp-stat__label">Canceladas / NS</span>
            </div>
          </div>
          <div className="cp-stat cp-stat--rate">
            <span className="cp-stat__icon">📈</span>
            <div>
              <span className="cp-stat__value">{stats.completionRate}%</span>
              <span className="cp-stat__label">Tasa completadas</span>
            </div>
          </div>
        </div>

        {/* FILTROS */}
        <div className="cp-controls">
          <div className="cp-controls__grid">
            <div className="cp-filter-item">
              <label>🔍 Buscar</label>
              <input
                type="text"
                placeholder="Nombre o documento..."
                value={filterSearch}
                onChange={e => setFilterSearch(e.target.value)}
                maxLength={100}
              />
            </div>
            <div className="cp-filter-item">
              <label>🔖 Estado</label>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                <option value="ALL">Todos los estados</option>
                {Object.entries(COUNSELING_STATUS).map(([k, v]) => (
                  <option key={k} value={k}>{v.icon} {v.label}</option>
                ))}
              </select>
            </div>
            <div className="cp-filter-item">
              <label>🏷️ Tema</label>
              <select value={filterTopic} onChange={e => setFilterTopic(e.target.value)}>
                <option value="ALL">Todos los temas</option>
                {Object.entries(COUNSELING_TOPICS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div className="cp-filter-item">
              <label>📅 Desde</label>
              <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} />
            </div>
            <div className="cp-filter-item">
              <label>📅 Hasta</label>
              <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} />
            </div>
          </div>
          <div className="cp-controls__actions">
            <button className="cp-btn cp-btn--ghost" onClick={clearFilters} disabled={loading}>
              🔄 Limpiar filtros
            </button>
          </div>
        </div>

        {/* INFO FILTROS */}
        <div className="cp-filter-info">
          <p>
            Mostrando <strong>{filtered.length}</strong> de <strong>{sessions.length}</strong> sesiones
            {filterStatus !== "ALL" && ` · ${COUNSELING_STATUS[filterStatus]?.icon} ${COUNSELING_STATUS[filterStatus]?.label}`}
            {filterTopic !== "ALL" && ` · ${COUNSELING_TOPICS[filterTopic]}`}
          </p>
          <p className="cp-filter-info__hint">Toca cualquier fila para ver el detalle y acciones</p>
        </div>

        {/* ERROR */}
        {error && (
          <div className="cp-error">
            ❌ {error}
            <button onClick={() => setError("")} className="cp-error__close">✕</button>
          </div>
        )}

        {/* CONTENIDO */}
        {loading ? (
          <div className="cp-loading">
            <div className="cp-loading__spinner" />
            <p>Cargando sesiones de consejería...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="cp-empty">
            <span className="cp-empty__icon">🕊️</span>
            <p>{sessions.length === 0 ? "No hay sesiones de consejería registradas." : "No hay sesiones que coincidan con los filtros."}</p>
            {sessions.length === 0 && (
              <button className="cp-btn cp-btn--primary" onClick={() => { setIsEditing(false); setActiveSession(null); setShowSchedule(true); }}>
                ➕ Agendar la primera sesión
              </button>
            )}
          </div>
        ) : (
          <>
            {/* ─── TABLA (desktop) ─────────────────────────────── */}
            <div className="cp-table-container cp-table-container--desktop">
              <table className="cp-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Miembro</th>
                    <th>Fecha y Hora</th>
                    <th>Tema</th>
                    <th>Duración</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(session => {
                    const status   = COUNSELING_STATUS[session.status] || { label: session.status, color: "default", icon: "📋" };
                    const isActive  = session.status === "SCHEDULED" || session.status === "RESCHEDULED";
                    const isOngoing = session.status === "IN_PROGRESS";

                    return (
                      <tr
                        key={session.id}
                        className={`cp-table__row cp-table__row--${status.color} cp-table__row--clickable${isOngoing ? " cp-table__row--ongoing" : ""}`}
                        onClick={() => openDetail(session)}
                        title={isOngoing ? "Sesión en curso — toca para ver" : "Toca para ver detalle y acciones"}
                      >
                        <td>
                          <span className="cp-session-number">#{session.sessionNumber}</span>
                        </td>

                        <td className="cp-table__member">
                          <div className="cp-member-cell">
                            <div className="cp-member-avatar-wrap">
                              <span className="cp-member-avatar">👤</span>
                              {(isActive || isOngoing) && (
                                <span
                                  className={`cp-member-active-dot${isOngoing ? " cp-member-active-dot--ongoing" : ""}`}
                                  title={isOngoing ? "En curso" : "Sesión activa"}
                                />
                              )}
                            </div>
                            <div className="cp-member-cell__info">
                              <span className="cp-member-cell__name">{session.memberName}</span>
                              {session.memberPhone && (
                                <span className="cp-member-cell__phone">{session.memberPhone}</span>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="cp-table__date">
                          <div className="cp-date-cell">
                            <span className="cp-date-cell__date">{formatDate(session.scheduledAt)}</span>
                            <span className="cp-date-cell__time">
                              {session.scheduledAt
                                ? new Date(session.scheduledAt).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })
                                : "-"}
                            </span>
                            {session.location && <span className="cp-date-cell__loc">📍 {session.location}</span>}
                          </div>
                        </td>

                        <td>
                          <span className="cp-topic-badge">{COUNSELING_TOPICS[session.topic] || session.topic}</span>
                        </td>

                        <td>
                          <span className="cp-duration">{session.durationMinutes} min</span>
                        </td>

                        <td>
                          <div className="cp-status-cell">
                            <span className={`cp-status-badge cp-status-badge--${status.color}`}>
                              {status.icon} {status.label}
                            </span>
                            {session.followUpRequired && (
                              <span className="cp-followup-badge" title="Requiere seguimiento">🔔</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* ─── TARJETAS (móvil) ────────────────────────────── */}
            <div className="cp-cards cp-cards--mobile">
              {filtered.map(session => {
                const status   = COUNSELING_STATUS[session.status] || { label: session.status, color: "default", icon: "📋" };
                const isActive  = session.status === "SCHEDULED" || session.status === "RESCHEDULED";
                const isOngoing = session.status === "IN_PROGRESS";

                return (
                  <div
                    key={session.id}
                    className={`cp-card cp-card--${status.color}${isOngoing ? " cp-card--ongoing" : ""}`}
                    onClick={() => openDetail(session)}
                  >
                    {/* Card header */}
                    <div className="cp-card__header">
                      <div className="cp-card__member">
                        <span className="cp-card__avatar">👤</span>
                        <div>
                          <span className="cp-card__name">{session.memberName}</span>
                          <span className="cp-session-number">#{session.sessionNumber}</span>
                        </div>
                      </div>
                      <span className={`cp-status-badge cp-status-badge--${status.color}`}>
                        {status.icon} {status.label}
                      </span>
                    </div>

                    {/* Card body */}
                    <div className="cp-card__body">
                      <div className="cp-card__row">
                        <span>📅</span>
                        <span>{formatDateTime(session.scheduledAt)}</span>
                      </div>
                      <div className="cp-card__row">
                        <span>🏷️</span>
                        <span>{COUNSELING_TOPICS[session.topic] || session.topic}</span>
                      </div>
                      {session.location && (
                        <div className="cp-card__row">
                          <span>📍</span>
                          <span>{session.location}</span>
                        </div>
                      )}
                      <div className="cp-card__row">
                        <span>⏱️</span>
                        <span>{session.durationMinutes} min</span>
                      </div>
                    </div>

                    {/* Card footer */}
                    <div className="cp-card__footer">
                      {session.followUpRequired && (
                        <span className="cp-card__followup">🔔 Seguimiento pendiente</span>
                      )}
                      <span className="cp-card__tap-hint">
                        {isOngoing
                          ? "Sesión en curso — toca para ver →"
                          : isActive
                            ? "Toca para ver detalles y acciones →"
                            : "Toca para ver detalles →"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* ── MODALES ────────────────────────────────────────────── */}
      <ModalScheduleSession
        isOpen={showSchedule}
        onClose={() => { setShowSchedule(false); setActiveSession(null); setIsEditing(false); }}
        onSave={handleSaveSession}
        initialData={activeSession}
        members={members}
        isEditing={isEditing}
      />
      <ModalCompleteSession
        isOpen={showComplete}
        onClose={() => { setShowComplete(false); setActiveSession(null); }}
        onSave={handleCompleteSession}
        session={activeSession}
      />
      <ModalCancelSession
        isOpen={showCancel}
        onClose={() => { setShowCancel(false); setActiveSession(null); }}
        onSave={handleCancelSession}
        session={activeSession}
      />
      <ModalSessionDetail
        isOpen={showDetail}
        onClose={() => { setShowDetail(false); setActiveSession(null); }}
        session={activeSession}
        onEdit={handleOpenEdit}
        onComplete={handleOpenComplete}
        onCancel={handleOpenCancel}
        onNoShow={handleNoShow}
        onPdf={handleMemberHistoryPdf}
        onStart={handleStartSession}
      />
      {/* Modal de sesión activa — solo cuando hay datos de start */}
      <ModalActiveSession
        isOpen={showActive}
        onClose={() => setShowActive(false)}
        sessionData={activeSessionData}
        onComplete={(s) => { setActiveSession(s); setShowComplete(true); }}
        onCancel={(s)   => { setActiveSession(s); setShowCancel(true);   }}
        onNoShow={handleNoShow}
      />
    </div>
  );
};

export default CounselingPage;