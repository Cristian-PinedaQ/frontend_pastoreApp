// ============================================
// ModalAddActivity.jsx
// ✅ v4: levelEnrollment llega como entidad JPA {code, displayName, requiresPayment, levelOrder}
//        Solo muestra cohortes cuyo nivel tiene requiresPayment = true
// ============================================

import React, { useState, useEffect } from "react";
import apiService from "../apiService";
import "../css/ModalAddActivity.css";

// ── Helper: extrae el code del nivel, sea string u objeto ─────────────────────
const getLevelCode = (level) => {
  if (!level) return null;
  if (typeof level === "string") return level;
  return level.code ?? null;
};

// ── Helper: extrae el displayName del nivel ───────────────────────────────────
const getLevelDisplay = (level) => {
  if (!level) return "Sin nivel";
  if (typeof level === "string") return level;
  return level.displayName ?? level.code ?? level;
};

// ── Helper: ¿el nivel requiere pago? (default true si no se sabe) ─────────────
const levelRequiresPayment = (level) => {
  if (!level) return true;
  if (typeof level === "string") return true; // estructura antigua: asumir sí
  if (typeof level.requiresPayment === "boolean") return level.requiresPayment;
  return true; // default conservador
};

const ModalAddActivity = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  isEditing,
}) => {
  const [formData, setFormData] = useState({
    activityName: "",
    price: "",
    endDate: "",
    quantity: "",
    isActive: true,
    activityType: "STANDALONE",
    enrollmentId: null,
    requiredLevel: null,
  });

  const [errors, setErrors]           = useState({});
  const [loading, setLoading]         = useState(false);
  const [loadingCohorts, setLoadingCohorts] = useState(false);
  const [cohorts, setCohorts]         = useState([]);

  // ── Inicializar formulario ──────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;

    if (initialData) {
      setFormData({
        activityName: initialData.activityName || "",
        price:        initialData.price        || "",
        endDate:      initialData.endDate
                        ? String(initialData.endDate).split("T")[0]
                        : "",
        quantity:     initialData.quantity     || "",
        isActive:     initialData.isActive !== undefined ? initialData.isActive : true,
        activityType: initialData.activityType || "STANDALONE",
        enrollmentId: initialData.enrollmentId || null,
        requiredLevel: initialData.requiredLevel || null,
      });
    } else {
      setFormData({
        activityName: "",
        price: "",
        endDate: "",
        quantity: "",
        isActive: true,
        activityType: "STANDALONE",
        enrollmentId: null,
        requiredLevel: null,
      });
      setErrors({});
    }
  }, [isOpen, initialData]);

  // ── Cargar cohortes PENDING con nivel de pago cuando se necesitan ──────────
  useEffect(() => {
    if (isOpen && formData.activityType === "ENROLLMENT") {
      loadCohortsPending();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, formData.activityType]);

  const loadCohortsPending = async () => {
    setLoadingCohorts(true);
    try {
      const data = await apiService.getEnrollments();

      if (!Array.isArray(data)) {
        console.warn("⚠️ La respuesta de cohortes no es un array:", data);
        setCohorts([]);
        return;
      }

      const pending = data
        .filter((cohort) => {
          if (cohort.status !== "PENDING") return false;

          // ✅ Solo cohortes cuyo nivel requiere pago
          const level = cohort.levelEnrollment;
          if (!levelRequiresPayment(level)) {
            console.log(
              `  → ${cohort.cohortName}: nivel sin pago requerido, omitida`
            );
            return false;
          }
          return true;
        })
        .map((cohort) => {
          const level    = cohort.levelEnrollment;
          const code     = getLevelCode(level);
          const display  = getLevelDisplay(level);
          const reqPay   = levelRequiresPayment(level);
          const levelObj = typeof level === "object" ? level : null;

          return {
            id:           cohort.id,
            cohortName:   cohort.cohortName,
            // Siempre almacenamos el objeto completo si está disponible
            levelEnrollment: levelObj ?? code,
            levelCode:    code,
            levelDisplay: display,
            requiresPayment: reqPay,
            label:        `${cohort.cohortName} (${display})`,
          };
        });

      console.log(`✅ Cohortes PENDING con pago: ${pending.length}`);
      setCohorts(pending);
    } catch (error) {
      console.error("❌ Error cargando cohortes PENDING:", error);
      setCohorts([]);
    } finally {
      setLoadingCohorts(false);
    }
  };

  // ── Validación ──────────────────────────────────────────────────────────────
  const validateForm = () => {
    const newErrors = {};

    if (!formData.activityName.trim()) {
      newErrors.activityName = "El nombre de la actividad es requerido";
    } else if (formData.activityName.length < 3) {
      newErrors.activityName = "El nombre debe tener al menos 3 caracteres";
    } else if (formData.activityName.length > 100) {
      newErrors.activityName = "El nombre no puede exceder 100 caracteres";
    }

    if (!formData.price) {
      newErrors.price = "El precio es requerido";
    } else if (parseFloat(formData.price) <= 0) {
      newErrors.price = "El precio debe ser mayor a cero";
    } else if (parseFloat(formData.price) > 999999999) {
      newErrors.price = "El precio es demasiado alto";
    }

    if (!formData.endDate) {
      newErrors.endDate = "La fecha de finalización es requerida";
    } else {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const [year, month, day] = formData.endDate.split("-").map(Number);
      const selected = new Date(year, month - 1, day);
      if (selected < today) {
        newErrors.endDate = "La fecha no puede ser anterior a hoy";
      }
    }

    if (formData.quantity && parseInt(formData.quantity) < 0) {
      newErrors.quantity = "La cantidad no puede ser negativa";
    }

    if (formData.activityType === "ENROLLMENT" && !formData.enrollmentId) {
      newErrors.enrollmentId = "Debe seleccionar una cohorte con pago requerido";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (name === "activityType") {
      setFormData((prev) => ({
        ...prev,
        activityType:  value,
        enrollmentId:  value === "STANDALONE" ? null : prev.enrollmentId,
        requiredLevel: value === "STANDALONE" ? null : prev.requiredLevel,
      }));
      if (value === "ENROLLMENT") loadCohortsPending();

    } else if (name === "enrollmentId") {
      const selected = cohorts.find((c) => String(c.id) === value);
      setFormData((prev) => ({
        ...prev,
        enrollmentId:  value ? Number(value) : null,
        // Guardamos el objeto nivel completo (o el code si solo tenemos string)
        requiredLevel: selected ? selected.levelEnrollment : null,
      }));

    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: type === "checkbox" ? checked : value,
      }));
    }

    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      const activityData = {
        activityName: formData.activityName.trim(),
        price:        Number(formData.price),
        endDate:      formData.endDate,
        quantity:     formData.quantity ? Number(formData.quantity) : null,
        isActive:     formData.isActive,
        activityType: formData.activityType,
      };

      if (formData.activityType === "ENROLLMENT") {
        activityData.enrollmentId = Number(formData.enrollmentId);
      }

      console.log("📤 [ModalAddActivity] Enviando:", JSON.stringify(activityData, null, 2));

      await onSave(activityData);
      onClose();
    } catch (error) {
      console.error("❌ [ModalAddActivity] Error:", error);
      setErrors((prev) => ({
        ...prev,
        general: error.message || "Error al guardar la actividad",
      }));
    } finally {
      setLoading(false);
    }
  };

  const getMinDate = () => new Date().toISOString().split("T")[0];

  const selectedCohort = cohorts.find((c) => c.id === formData.enrollmentId);

  if (!isOpen) return null;

  return (
    <div className="modal-add-activity-overlay">
      <div className="modal-add-activity">
        <div className="modal-add-activity__header">
          <h2>
            {isEditing ? "✏️ Editar Actividad" : "➕ Crear Nueva Actividad"}
          </h2>
          <button
            className="modal-add-activity__close"
            onClick={onClose}
            disabled={loading}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-add-activity__form">
          {/* Error general */}
          {errors.general && (
            <div className="form-error-general">❌ {errors.general}</div>
          )}

          {/* Tipo de actividad */}
          <div className="form-group">
            <label htmlFor="activityType">🎯 Tipo de Actividad *</label>
            <select
              id="activityType"
              name="activityType"
              value={formData.activityType}
              onChange={handleChange}
              disabled={loading}
            >
              <option value="STANDALONE">🍃 Libre</option>
              <option value="ENROLLMENT">🪾 Vinculada a Raiz Viva</option>
            </select>
            <div className="form-hint">
              {formData.activityType === "STANDALONE"
                ? "Actividad libre — cualquier miembro puede inscribirse"
                : "El pago habilita la matrícula en la cohorte seleccionada. Solo se muestran cohortes con pago requerido."}
            </div>
          </div>

          {/* Selector de cohorte */}
          {formData.activityType === "ENROLLMENT" && (
            <div className="form-group">
              <label htmlFor="enrollmentId">
                📚 Cohorte PENDIENTE con pago *
              </label>
              <select
                id="enrollmentId"
                name="enrollmentId"
                value={formData.enrollmentId || ""}
                onChange={handleChange}
                className={errors.enrollmentId ? "error" : ""}
                disabled={loading || loadingCohorts}
              >
                <option value="">
                  {loadingCohorts
                    ? "⏳ Cargando cohortes..."
                    : "-- Selecciona una cohorte --"}
                </option>
                {cohorts.length > 0
                  ? cohorts.map((cohort) => (
                      <option key={cohort.id} value={cohort.id}>
                        {cohort.label}
                      </option>
                    ))
                  : !loadingCohorts && (
                      <option disabled>
                        No hay cohortes PENDIENTES con pago requerido
                      </option>
                    )}
              </select>

              {errors.enrollmentId && (
                <span className="form-error">{errors.enrollmentId}</span>
              )}

              {/* Info de la cohorte seleccionada */}
              {selectedCohort && (
                <div
                  className="form-hint"
                  style={{
                    background: "#e8f5e9",
                    border: "1px solid #a5d6a7",
                    borderRadius: "6px",
                    padding: "8px 12px",
                    marginTop: "6px",
                  }}
                >
                  ✅ <strong>Nivel:</strong>{" "}
                  <code>{selectedCohort.levelCode}</code>
                  {" — "}
                  {selectedCohort.levelDisplay}
                  <br />
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      marginTop: "4px",
                      padding: "2px 8px",
                      background: "#c8e6c9",
                      borderRadius: "12px",
                      fontSize: "0.78em",
                      color: "#1b5e20",
                      fontWeight: 600,
                    }}
                  >
                    💳 Nivel con pago requerido
                  </span>
                  <br />
                  <small style={{ color: "#555", marginTop: "4px", display: "block" }}>
                    Al completar el pago de esta actividad, el sistema inscribirá
                    al miembro automáticamente en la cohorte.
                  </small>
                </div>
              )}

              <div className="form-hint">
                ℹ️ Solo cohortes <strong>PENDIENTES</strong> con nivel de pago
                activo. Si no ves la cohorte que buscas, verifica que su nivel
                tenga el pago habilitado en{" "}
                <em>Configuración &gt; Niveles</em>.
              </div>
            </div>
          )}

          {/* Nombre */}
          <div className="form-group">
            <label htmlFor="activityName">📋 Nombre de la Actividad *</label>
            <input
              type="text"
              id="activityName"
              name="activityName"
              value={formData.activityName}
              onChange={handleChange}
              placeholder="Ej: Retiro Espiritual, Conferencia, Taller..."
              className={errors.activityName ? "error" : ""}
              disabled={loading}
              maxLength="100"
            />
            {errors.activityName && (
              <span className="form-error">{errors.activityName}</span>
            )}
            <div className="form-hint">Mínimo 3 caracteres, máximo 100</div>
          </div>

          <div className="form-row">
            {/* Precio */}
            <div className="form-group">
              <label htmlFor="price">💰 Precio (COP) *</label>
              <div className="input-with-prefix">
                <span className="input-prefix">$</span>
                <input
                  type="number"
                  id="price"
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  placeholder="0"
                  min="0"
                  step="1000"
                  className={errors.price ? "error" : ""}
                  disabled={loading}
                />
              </div>
              {errors.price && (
                <span className="form-error">{errors.price}</span>
              )}
            </div>

            {/* Capacidad */}
            <div className="form-group">
              <label htmlFor="quantity">👥 Capacidad (opcional)</label>
              <input
                type="number"
                id="quantity"
                name="quantity"
                value={formData.quantity}
                onChange={handleChange}
                placeholder="Ilimitado"
                min="0"
                className={errors.quantity ? "error" : ""}
                disabled={loading}
              />
              {errors.quantity && (
                <span className="form-error">{errors.quantity}</span>
              )}
              <div className="form-hint">Vacío = capacidad ilimitada</div>
            </div>
          </div>

          {/* Fecha fin */}
          <div className="form-group">
            <label htmlFor="endDate">📅 Fecha de Finalización *</label>
            <input
              type="date"
              id="endDate"
              name="endDate"
              value={formData.endDate}
              onChange={handleChange}
              min={getMinDate()}
              className={errors.endDate ? "error" : ""}
              disabled={loading}
            />
            {errors.endDate && (
              <span className="form-error">{errors.endDate}</span>
            )}
            <div className="form-hint">
              La actividad será visible hasta esta fecha
            </div>
          </div>

          {/* Estado (solo edición) */}
          {isEditing && (
            <div className="form-group form-group-checkbox">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="isActive"
                  checked={formData.isActive}
                  onChange={handleChange}
                  disabled={loading}
                />
                <span className="checkbox-custom"></span>
                <span className="checkbox-text">
                  {formData.isActive ? "🟢 Activa" : "🔴 Inactiva"}
                </span>
              </label>
              <div className="form-hint">
                Las actividades inactivas no aparecen en búsquedas normales
              </div>
            </div>
          )}

          {/* Acciones */}
          <div className="modal-add-activity__actions">
            <button
              type="button"
              className="modal-add-activity__btn modal-add-activity__btn--cancel"
              onClick={onClose}
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="modal-add-activity__btn modal-add-activity__btn--save"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner"></span>
                  Guardando...
                </>
              ) : isEditing ? (
                "💾 Actualizar Actividad"
              ) : (
                "✅ Crear Actividad"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ModalAddActivity;