// ============================================================
// LevelsConfigPage.jsx - Configuración de Niveles y Lecciones
// ============================================================
// Permite gestionar LevelEnrollment (CRUD) y las LessonTemplate
// de cada nivel. Sigue el mismo patrón visual de EnrollmentsPage.
// ============================================================

import React, { useState, useEffect, useCallback } from "react";
import apiService from "../apiService";
import "../css/LevelsConfigPage.css";

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

// ── Componente principal ──────────────────────────────────────
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
  const [editingLesson, setEditingLesson] = useState(null); // LessonTemplate completa en edición

  // ── Modal confirmación desactivar ─────────────────────────────
  const [confirmModal, setConfirmModal] = useState({ open: false, type: "", id: null, name: "" });

  // ══════════════════════════════════════════════════════════════
  // CARGA DE DATOS
  // ══════════════════════════════════════════════════════════════
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

  // ══════════════════════════════════════════════════════════════
  // CRUD NIVELES
  // ══════════════════════════════════════════════════════════════

  // Abrir modal crear nivel
  const handleOpenCreateLevel = () => {
    setLevelForm(EMPTY_LEVEL);
    setLevelFormErrors({});
    setLevelModalMode("create");
    setShowLevelModal(true);
  };

  // Abrir modal editar nivel
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
        // Actualizar nivel seleccionado con nuevos datos
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

  // Desactivar nivel
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

  // ══════════════════════════════════════════════════════════════
  // CRUD LECCIONES PLANTILLA
  // ══════════════════════════════════════════════════════════════

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

  // Auto-dismiss success
  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(""), 4000);
      return () => clearTimeout(t);
    }
  }, [success]);

  // ══════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════
  return (
    <div className="lcp-page">
      <div className="lcp-container">

        {/* ── Header ── */}
        <div className="lcp-header">
          <div className="lcp-header-text">
            <h1>⚙️ Configuración de Niveles</h1>
            <p>Gestiona los niveles del camino formativo y su plantilla de lecciones</p>
          </div>
          <button className="lcp-btn lcp-btn-primary" onClick={handleOpenCreateLevel}>
            ➕ Nuevo Nivel
          </button>
        </div>

        {/* ── Alertas ── */}
        {error && (
          <div className="lcp-alert lcp-alert-error" role="alert">
            <span>⚠️ {error}</span>
            <button className="lcp-alert-close" onClick={() => setError("")}>✕</button>
          </div>
        )}
        {success && (
          <div className="lcp-alert lcp-alert-success" role="alert">
            <span>{success}</span>
            <button className="lcp-alert-close" onClick={() => setSuccess("")}>✕</button>
          </div>
        )}

        {/* ── Layout de dos columnas ── */}
        <div className="lcp-layout">

          {/* ── Columna izquierda: lista de niveles ── */}
          <div className="lcp-levels-panel">
            <div className="lcp-panel-header">
              <h2>📚 Niveles ({levels.length})</h2>
            </div>

            {loading ? (
              <div className="lcp-empty">
                <div className="lcp-spinner" />
                <p>Cargando niveles...</p>
              </div>
            ) : levels.length === 0 ? (
              <div className="lcp-empty">
                <p>No hay niveles configurados</p>
                <button className="lcp-btn lcp-btn-primary" onClick={handleOpenCreateLevel}>
                  Crear primer nivel
                </button>
              </div>
            ) : (
              <ul className="lcp-levels-list">
                {[...levels]
                  .sort((a, b) => (a.levelOrder || 0) - (b.levelOrder || 0))
                  .map((level) => (
                    <li
                      key={level.id}
                      className={`lcp-level-item ${selectedLevel?.id === level.id ? "lcp-level-item--active" : ""} ${!level.isActive ? "lcp-level-item--inactive" : ""}`}
                      onClick={() => handleSelectLevel(level)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === "Enter" && handleSelectLevel(level)}
                    >
                      <div className="lcp-level-order">{level.levelOrder}</div>
                      <div className="lcp-level-info">
                        <span className="lcp-level-name">{escapeHtml(level.displayName)}</span>
                        <span className="lcp-level-code">{level.code}</span>
                      </div>
                      <div className="lcp-level-badges">
                        {!level.isActive && <span className="lcp-badge lcp-badge-inactive">Inactivo</span>}
                        {level.requiresPayment && <span className="lcp-badge lcp-badge-payment">💳</span>}
                      </div>
                    </li>
                  ))}
              </ul>
            )}
          </div>

          {/* ── Columna derecha: detalle del nivel seleccionado ── */}
          <div className="lcp-detail-panel">
            {!selectedLevel ? (
              <div className="lcp-empty lcp-empty--detail">
                <div className="lcp-empty-icon">👈</div>
                <p>Selecciona un nivel para ver y gestionar su plantilla de lecciones</p>
              </div>
            ) : (
              <>
                {/* ─ Info del nivel ─ */}
                <div className="lcp-detail-header">
                  <div className="lcp-detail-title">
                    <div className="lcp-detail-order">#{selectedLevel.levelOrder}</div>
                    <div>
                      <h2>{escapeHtml(selectedLevel.displayName)}</h2>
                      <span className="lcp-level-code">{selectedLevel.code}</span>
                    </div>
                  </div>
                  <div className="lcp-detail-actions">
                    <button
                      className="lcp-btn lcp-btn-warning lcp-btn-sm"
                      onClick={() => handleOpenEditLevel(selectedLevel)}
                    >
                      ✏️ Editar nivel
                    </button>
                    {selectedLevel.isActive && (
                      <button
                        className="lcp-btn lcp-btn-danger lcp-btn-sm"
                        onClick={() => handleDeactivateLevel(selectedLevel.id, selectedLevel.displayName)}
                      >
                        🚫 Desactivar
                      </button>
                    )}
                  </div>
                </div>

                <div className="lcp-detail-chips">
                  <span className={`lcp-chip ${selectedLevel.isActive ? "lcp-chip-success" : "lcp-chip-danger"}`}>
                    {selectedLevel.isActive ? "✅ Activo" : "❌ Inactivo"}
                  </span>
                  <span className={`lcp-chip ${selectedLevel.requiresPayment ? "lcp-chip-info" : "lcp-chip-neutral"}`}>
                    {selectedLevel.requiresPayment ? "💳 Requiere pago" : "🆓 Sin pago"}
                  </span>
                  {selectedLevel.description && (
                    <span className="lcp-detail-description">{escapeHtml(selectedLevel.description)}</span>
                  )}
                </div>

                {/* ─  Lecciones plantilla ─ */}
                <div className="lcp-lessons-section">
                  <div className="lcp-lessons-header">
                    <h3>📖 Planilla de lecciones 
                      {!lessonsLoading && (
                        <span className="lcp-lessons-count"> ({lessons.length})</span>
                      )}
                    </h3>
                    <button
                      className="lcp-btn lcp-btn-primary lcp-btn-sm"
                      onClick={handleOpenCreateLesson}
                    >
                      ➕ Nueva lección
                    </button>
                  </div>

                  {lessonsLoading ? (
                    <div className="lcp-empty">
                      <div className="lcp-spinner" />
                      <p>Cargando lecciones...</p>
                    </div>
                  ) : lessons.length === 0 ? (
                    <div className="lcp-empty lcp-empty--lessons">
                      <p>Este nivel no tiene plantilla de lecciones configuradas</p>
                      <button className="lcp-btn lcp-btn-primary lcp-btn-sm" onClick={handleOpenCreateLesson}>
                        Agregar primera lección
                      </button>
                    </div>
                  ) : (
                    <div className="lcp-lessons-list">
                      {[...lessons]
                        .sort((a, b) => (a.lessonOrder || 0) - (b.lessonOrder || 0))
                        .map((lesson) => (
                          <div
                            key={lesson.id}
                            className={`lcp-lesson-card ${!lesson.isActive ? "lcp-lesson-card--inactive" : ""}`}
                          >
                            <div className="lcp-lesson-order">{lesson.lessonOrder}</div>
                            <div className="lcp-lesson-info">
                              <span className="lcp-lesson-name">{escapeHtml(lesson.lessonName)}</span>
                              <span className="lcp-lesson-duration">⏱️ {lesson.defaultDurationMinutes} min</span>
                            </div>
                            <div className="lcp-lesson-badges">
                              {!lesson.isActive && (
                                <span className="lcp-badge lcp-badge-inactive">Inactiva</span>
                              )}
                            </div>
                            <div className="lcp-lesson-actions">
                              <button
                                className="lcp-icon-btn lcp-icon-btn--edit"
                                title="Editar lección"
                                onClick={() => handleOpenEditLesson(lesson)}
                              >
                                ✏️
                              </button>
                              {lesson.isActive && (
                                <button
                                  className="lcp-icon-btn lcp-icon-btn--danger"
                                  title="Desactivar lección"
                                  onClick={() => handleDeactivateLesson(lesson)}
                                >
                                  🚫
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          MODAL: Crear / Editar NIVEL
      ══════════════════════════════════════════════════════════ */}
      {showLevelModal && (
        <div className="lcp-modal-overlay" onClick={() => setShowLevelModal(false)}>
          <div className="lcp-modal" onClick={(e) => e.stopPropagation()}>
            <div className="lcp-modal-header">
              <h2>{levelModalMode === "create" ? "➕ Nuevo Nivel" : "✏️ Editar Nivel"}</h2>
              <button className="lcp-modal-close" onClick={() => setShowLevelModal(false)}>✕</button>
            </div>

            <form onSubmit={handleSaveLevel} className="lcp-form">
              {/* Código (solo al crear) */}
              {levelModalMode === "create" && (
                <div className="lcp-field">
                  <label>Código * <span className="lcp-hint">(ej: ESENCIA_5 — no se puede cambiar después)</span></label>
                  <input
                    type="text"
                    value={levelForm.code}
                    onChange={(e) => setLevelForm({ ...levelForm, code: e.target.value.toUpperCase() })}
                    placeholder="ESENCIA_5"
                    maxLength={50}
                    className={levelFormErrors.code ? "lcp-input-error" : ""}
                  />
                  {levelFormErrors.code && <span className="lcp-error-msg">{levelFormErrors.code}</span>}
                </div>
              )}

              {/* Nombre visible */}
              <div className="lcp-field">
                <label>Nombre visible *</label>
                <input
                  type="text"
                  value={levelForm.displayName}
                  onChange={(e) => setLevelForm({ ...levelForm, displayName: e.target.value })}
                  placeholder="ESENCIA 5"
                  maxLength={100}
                  className={levelFormErrors.displayName ? "lcp-input-error" : ""}
                />
                {levelFormErrors.displayName && <span className="lcp-error-msg">{levelFormErrors.displayName}</span>}
              </div>

              {/* Descripción */}
              <div className="lcp-field">
                <label>Descripción</label>
                <textarea
                  value={levelForm.description}
                  onChange={(e) => setLevelForm({ ...levelForm, description: e.target.value })}
                  placeholder="Descripción opcional del nivel..."
                  rows={3}
                  maxLength={500}
                />
              </div>

              {/* Orden + checkboxes en fila */}
              <div className="lcp-form-row">
                <div className="lcp-field lcp-field-sm">
                  <label>Orden *</label>
                  <input
                    type="number"
                    value={levelForm.levelOrder}
                    onChange={(e) => setLevelForm({ ...levelForm, levelOrder: e.target.value })}
                    placeholder="11"
                    min={1}
                    max={999}
                    className={levelFormErrors.levelOrder ? "lcp-input-error" : ""}
                  />
                  {levelFormErrors.levelOrder && <span className="lcp-error-msg">{levelFormErrors.levelOrder}</span>}
                </div>

                <div className="lcp-field lcp-field-checkbox">
                  <label className="lcp-checkbox-label">
                    <input
                      type="checkbox"
                      checked={levelForm.requiresPayment}
                      onChange={(e) => setLevelForm({ ...levelForm, requiresPayment: e.target.checked })}
                    />
                    <span>Requiere pago</span>
                  </label>
                  {levelModalMode === "edit" && (
                    <label className="lcp-checkbox-label">
                      <input
                        type="checkbox"
                        checked={levelForm.isActive}
                        onChange={(e) => setLevelForm({ ...levelForm, isActive: e.target.checked })}
                      />
                      <span>Activo</span>
                    </label>
                  )}
                </div>
              </div>

              <div className="lcp-form-footer">
                <button type="button" className="lcp-btn lcp-btn-secondary" onClick={() => setShowLevelModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="lcp-btn lcp-btn-primary" disabled={levelSaving}>
                  {levelSaving ? "Guardando..." : levelModalMode === "create" ? "✅ Crear nivel" : "✅ Guardar cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          MODAL: Crear / Editar LECCIÓN PLANTILLA
      ══════════════════════════════════════════════════════════ */}
      {showLessonModal && (
        <div className="lcp-modal-overlay" onClick={() => setShowLessonModal(false)}>
          <div className="lcp-modal lcp-modal--sm" onClick={(e) => e.stopPropagation()}>
            <div className="lcp-modal-header">
              <h2>
                {lessonModalMode === "create" ? "➕ Nueva Lección" : "✏️ Editar Lección"}
                <span className="lcp-modal-subtitle"> — {selectedLevel?.displayName}</span>
              </h2>
              <button className="lcp-modal-close" onClick={() => setShowLessonModal(false)}>✕</button>
            </div>

            <form onSubmit={handleSaveLesson} className="lcp-form">
              {/* Nombre */}
              <div className="lcp-field">
                <label>Nombre de la lección *</label>
                <input
                  type="text"
                  value={lessonForm.lessonName}
                  onChange={(e) => setLessonForm({ ...lessonForm, lessonName: e.target.value })}
                  placeholder="El Nuevo Nacimiento"
                  maxLength={255}
                  className={lessonFormErrors.lessonName ? "lcp-input-error" : ""}
                />
                {lessonFormErrors.lessonName && <span className="lcp-error-msg">{lessonFormErrors.lessonName}</span>}
              </div>

              {/* Orden + duración en fila */}
              <div className="lcp-form-row">
                <div className="lcp-field">
                  <label>Orden *</label>
                  <input
                    type="number"
                    value={lessonForm.lessonOrder}
                    onChange={(e) => setLessonForm({ ...lessonForm, lessonOrder: e.target.value })}
                    placeholder="1"
                    min={1}
                    max={999}
                    className={lessonFormErrors.lessonOrder ? "lcp-input-error" : ""}
                  />
                  {lessonFormErrors.lessonOrder && <span className="lcp-error-msg">{lessonFormErrors.lessonOrder}</span>}
                </div>

                <div className="lcp-field">
                  <label>Duración (minutos)</label>
                  <input
                    type="number"
                    value={lessonForm.defaultDurationMinutes}
                    onChange={(e) => setLessonForm({ ...lessonForm, defaultDurationMinutes: e.target.value })}
                    placeholder="120"
                    min={1}
                    max={600}
                    className={lessonFormErrors.defaultDurationMinutes ? "lcp-input-error" : ""}
                  />
                  {lessonFormErrors.defaultDurationMinutes && (
                    <span className="lcp-error-msg">{lessonFormErrors.defaultDurationMinutes}</span>
                  )}
                </div>
              </div>

              {/* isActive (solo edición) */}
              {lessonModalMode === "edit" && (
                <div className="lcp-field">
                  <label className="lcp-checkbox-label">
                    <input
                      type="checkbox"
                      checked={lessonForm.isActive}
                      onChange={(e) => setLessonForm({ ...lessonForm, isActive: e.target.checked })}
                    />
                    <span>Lección activa</span>
                  </label>
                </div>
              )}

              <div className="lcp-form-footer">
                <button type="button" className="lcp-btn lcp-btn-secondary" onClick={() => setShowLessonModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="lcp-btn lcp-btn-primary" disabled={lessonSaving}>
                  {lessonSaving ? "Guardando..." : lessonModalMode === "create" ? "✅ Crear lección" : "✅ Guardar cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          MODAL: Confirmación de desactivación
      ══════════════════════════════════════════════════════════ */}
      {confirmModal.open && (
        <div className="lcp-modal-overlay" onClick={() => setConfirmModal({ open: false, type: "", id: null, name: "" })}>
          <div className="lcp-modal lcp-modal--confirm" onClick={(e) => e.stopPropagation()}>
            <div className="lcp-modal-header lcp-modal-header--danger">
              <h2>⚠️ Confirmar desactivación</h2>
            </div>
            <div className="lcp-confirm-body">
              <p>
                ¿Estás seguro de que quieres desactivar{" "}
                {confirmModal.type === "level" ? "el nivel" : "la lección"}{" "}
                <strong>"{escapeHtml(confirmModal.name)}"</strong>?
              </p>
              <p className="lcp-confirm-warning">
                Los datos históricos se conservan. Esta acción se puede revertir
                editando el registro y activando nuevamente.
              </p>
            </div>
            <div className="lcp-form-footer">
              <button
                className="lcp-btn lcp-btn-secondary"
                onClick={() => setConfirmModal({ open: false, type: "", id: null, name: "" })}
              >
                Cancelar
              </button>
              <button className="lcp-btn lcp-btn-danger" onClick={handleConfirmDeactivate}>
                🚫 Sí, desactivar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LevelsConfigPage;