// ============================================
// ModalAddActivity.jsx
// Modal para crear/editar actividades
// ============================================

import React, { useState, useEffect } from "react";
import "../css/ModalAddActivity.css";

const ModalAddActivity = ({ 
  isOpen, 
  onClose, 
  onSave, 
  initialData, 
  isEditing 
}) => {
  const [formData, setFormData] = useState({
    activityName: "",
    price: "",
    endDate: "",
    quantity: "",
    isActive: true,
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  // Inicializar formulario con datos existentes si es edición
  useEffect(() => {
    if (isOpen && initialData) {
      setFormData({
        activityName: initialData.activityName || "",
        price: initialData.price || "",
        endDate: initialData.endDate 
          ? new Date(initialData.endDate).toISOString().split('T')[0]
          : "",
        quantity: initialData.quantity || "",
        isActive: initialData.isActive !== undefined ? initialData.isActive : true,
      });
    } else if (isOpen) {
      // Resetear formulario para nuevo
      setFormData({
        activityName: "",
        price: "",
        endDate: "",
        quantity: "",
        isActive: true,
      });
      setErrors({});
    }
  }, [isOpen, initialData]);

  // Validar formulario
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
      const selectedDate = new Date(formData.endDate);
      
      if (selectedDate < today) {
        newErrors.endDate = "La fecha no puede ser anterior a hoy";
      }
    }

    if (formData.quantity && parseInt(formData.quantity) < 0) {
      newErrors.quantity = "La cantidad no puede ser negativa";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Manejar cambio en inputs
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
    
    // Limpiar error del campo cuando el usuario empieza a escribir
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: "" }));
    }
  };

  // Manejar envío del formulario
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const activityData = {
        activityName: formData.activityName.trim(),
        price: parseFloat(formData.price),
        endDate: formData.endDate,
        quantity: formData.quantity ? parseInt(formData.quantity) : null,
        isActive: formData.isActive,
      };

      await onSave(activityData);
      onClose();
    } catch (error) {
      console.error("Error al guardar actividad:", error);
      setErrors(prev => ({ 
        ...prev, 
        general: error.message || "Error al guardar la actividad" 
      }));
    } finally {
      setLoading(false);
    }
  };

  // Calcular fecha mínima (mañana)
  const getMinDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

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
          {/* Nombre de la actividad */}
          <div className="form-group">
            <label htmlFor="activityName">
              📋 Nombre de la Actividad *
            </label>
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
            <div className="form-hint">
              Mínimo 3 caracteres, máximo 100
            </div>
          </div>

          <div className="form-row">
            {/* Precio */}
            <div className="form-group">
              <label htmlFor="price">
                💰 Precio (COP) *
              </label>
              <div className="input-with-prefix">
                <span className="input-prefix"></span>
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

            {/* Cantidad (opcional) */}
            <div className="form-group">
              <label htmlFor="quantity">
                👥 Capacidad (opcional)
              </label>
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
              <div className="form-hint">
                Dejar vacío para capacidad ilimitada
              </div>
            </div>
          </div>

          {/* Fecha de finalización */}
          <div className="form-group">
            <label htmlFor="endDate">
              📅 Fecha de Finalización *
            </label>
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

          {/* Estado (solo en edición) */}
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

          {/* Error general */}
          {errors.general && (
            <div className="form-error-general">
              ❌ {errors.general}
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