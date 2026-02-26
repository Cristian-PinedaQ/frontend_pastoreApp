// ============================================
// ModalAddActivity.jsx - CORREGIDO V3
// Vincula la actividad a una cohorte concreta (enrollmentId)
// y usa su LevelEnrollment como requiredLevel automáticamente
// ============================================

import React, { useState, useEffect } from "react";
import apiService from "../apiService";
import "../css/ModalAddActivity.css";

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
    // ✅ Ahora guardamos el ID de la cohorte concreta, NO el enum del nivel
    enrollmentId: null,
    // requiredLevel se deriva automáticamente de la cohorte seleccionada
    requiredLevel: null,
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [loadingCohorts, setLoadingCohorts] = useState(false);
  // Cada elemento: { id, cohortName, levelEnrollment, label }
  const [cohorts, setCohorts] = useState([]);

  // ── Inicializar formulario ────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;

    if (initialData) {
      setFormData({
        activityName: initialData.activityName || "",
        price: initialData.price || "",
        endDate: initialData.endDate
          ? new Date(initialData.endDate).toISOString().split("T")[0]
          : "",
        quantity: initialData.quantity || "",
        isActive: initialData.isActive !== undefined ? initialData.isActive : true,
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

  // ── Cargar cohortes PENDING cuando se necesitan ───────────────────────────
  useEffect(() => {
    if (isOpen && formData.activityType === "ENROLLMENT") {
      loadCohortsPending();
    }
  }, [isOpen, formData.activityType]);

  // ── Función para cargar cohortes PENDING ─────────────────────────────────
  // ── Función para cargar cohortes PENDING ─────────────────────────────────
const loadCohortsPending = async () => {
  setLoadingCohorts(true);
  try {
    // ✅ Usar el método que llama a /enrollment/cohorts/findAll
    //    NO getEnrollmentsCard() que es paginado
    const data = await apiService.getEnrollments(); 

    console.log("📊 [loadCohortsPending] Cohortes recibidas:", data);

    if (!Array.isArray(data)) {
      console.warn("⚠️ La respuesta no es un array:", data);
      setCohorts([]);
      return;
    }

    // ✅ FILTRO: solo las que tienen status === 'PENDING'
    const pendingCohorts = data
      .filter((cohort) => {
        const status = cohort.status;
        console.log(`  → ${cohort.cohortName} | status: ${status} | level: ${cohort.levelEnrollment}`);
        return status === "PENDING";
      })
      .map((cohort) => ({
        id: cohort.id,
        cohortName: cohort.cohortName,
        levelEnrollment: cohort.levelEnrollment,
        label: `${cohort.cohortName} (${cohort.levelEnrollment})`,
      }));

    console.log(`✅ Cohortes PENDING disponibles: ${pendingCohorts.length}`);

    if (pendingCohorts.length === 0) {
      console.warn("⚠️ No hay cohortes con estado PENDING");
    }

    setCohorts(pendingCohorts);
  } catch (error) {
    console.error("❌ Error al cargar cohortes PENDING:", error);
    setCohorts([]);
  } finally {
    setLoadingCohorts(false);
  }
};

  // ── Validación ────────────────────────────────────────────────────────────
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
      if (new Date(formData.endDate) < today) {
        newErrors.endDate = "La fecha no puede ser anterior a hoy";
      }
    }

    if (formData.quantity && parseInt(formData.quantity) < 0) {
      newErrors.quantity = "La cantidad no puede ser negativa";
    }

    // ✅ Para ENROLLMENT se exige seleccionar una cohorte concreta
    if (formData.activityType === "ENROLLMENT" && !formData.enrollmentId) {
      newErrors.enrollmentId = "Debe seleccionar una cohorte PENDING";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (name === "activityType") {
      setFormData((prev) => ({
        ...prev,
        activityType: value,
        // Limpiar datos de cohorte al cambiar a STANDALONE
        enrollmentId: value === "STANDALONE" ? null : prev.enrollmentId,
        requiredLevel: value === "STANDALONE" ? null : prev.requiredLevel,
      }));
      if (value === "ENROLLMENT") loadCohortsPending();
    } else if (name === "enrollmentId") {
      // ✅ Al seleccionar una cohorte, derivar automáticamente el requiredLevel
      const selectedCohort = cohorts.find((c) => String(c.id) === value);
      setFormData((prev) => ({
        ...prev,
        enrollmentId: value ? Number(value) : null,
        // El nivel del enum se toma directamente de la cohorte seleccionada
        requiredLevel: selectedCohort ? selectedCohort.levelEnrollment : null,
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
    console.log("🔍 [Modal] formData completo:", JSON.stringify(formData, null, 2));
    console.log("🔍 [Modal] cohorts disponibles:", cohorts);

    // Verificar que para ENROLLMENT, enrollmentId esté presente
    if (formData.activityType === "ENROLLMENT") {
      if (!formData.enrollmentId) {
        throw new Error("Debe seleccionar una cohorte para actividades ENROLLMENT");
      }
      console.log("🔍 [Modal] enrollmentId existe:", formData.enrollmentId);
    }

    // Crear el objeto base
    const activityData = {
      activityName: formData.activityName.trim(),
      price: Number(formData.price),
      endDate: formData.endDate,
      quantity: formData.quantity ? Number(formData.quantity) : null,
      isActive: formData.isActive,
      activityType: formData.activityType,
    };

    // Para ENROLLMENT, AGREGAR enrollmentId
    if (formData.activityType === "ENROLLMENT") {
      activityData.enrollmentId = Number(formData.enrollmentId);
      
      // Verificar que se agregó correctamente
      console.log("✅ [Modal] enrollmentId agregado:", activityData.enrollmentId);
    }

    // 🔴 LOG CRÍTICO: Ver el objeto final
    console.log("📤 [Modal] OBJETO FINAL a enviar:", JSON.stringify(activityData, null, 2));
    
    // Verificar que enrollmentId está en el objeto
    if (formData.activityType === "ENROLLMENT") {
      console.log("🔍 [Modal] Verificación - activityData tiene enrollmentId:", 
                  activityData.hasOwnProperty('enrollmentId'));
      console.log("🔍 [Modal] Valor de enrollmentId en activityData:", activityData.enrollmentId);
    }

    await onSave(activityData);
    onClose();
  } catch (error) {
    console.error("❌ [Modal] Error:", error);
    setErrors((prev) => ({
      ...prev,
      general: error.message || "Error al guardar la actividad",
    }));
  } finally {
    setLoading(false);
  }
};

  const getMinDate = () => new Date().toISOString().split("T")[0];

  // Encontrar la cohorte seleccionada para mostrar info adicional
  const selectedCohort = cohorts.find(
    (c) => c.id === formData.enrollmentId
  );

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
              <option value="STANDALONE">📋 Libre (STANDALONE)</option>
              <option value="ENROLLMENT">
                📚 Vinculada a Cohorte (ENROLLMENT)
              </option>
            </select>
            <div className="form-hint">
              {formData.activityType === "STANDALONE"
                ? "Actividad libre — cualquier miembro puede inscribirse"
                : "El pago de esta actividad habilitará al miembro para matricularse en la cohorte seleccionada"}
            </div>
          </div>

          {/* ✅ Selector de cohorte PENDING */}
          {formData.activityType === "ENROLLMENT" && (
            <div className="form-group">
              <label htmlFor="enrollmentId">
                📚 Cohorte PENDING *
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
                        No hay cohortes con estado PENDING
                      </option>
                    )}
              </select>

              {errors.enrollmentId && (
                <span className="form-error">{errors.enrollmentId}</span>
              )}

              {/* ✅ Info derivada automáticamente de la cohorte seleccionada */}
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
                  ✅ <strong>Nivel detectado:</strong>{" "}
                  <code>{selectedCohort.levelEnrollment}</code>
                  <br />
                  <small>
                    El campo <em>requiredLevel</em> se enviará automáticamente
                    al backend como{" "}
                    <strong>{selectedCohort.levelEnrollment}</strong>. Los
                    miembros deben cumplir el nivel previo para inscribirse.
                  </small>
                </div>
              )}

              <div className="form-hint">
                ℹ️ Solo se muestran cohortes con estado{" "}
                <strong>PENDING</strong>. Al pagar esta actividad, el miembro
                quedará habilitado para matricularse en la cohorte.
              </div>
            </div>
          )}

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