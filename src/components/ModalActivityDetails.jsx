// ============================================
// ModalActivityDetails.jsx
// Modal para ver detalles de actividad y agregar participantes
// ============================================

import React, { useState, useEffect, useRef, useCallback } from "react";
import apiService from "../apiService";
import "../css/ModalActivityDetails.css";

const ModalActivityDetails = ({
  isOpen,
  onClose,
  activity,
  balance,
  onEnrollParticipant,
}) => {
  const [members, setMembers] = useState([]);
  const [filteredMembers, setFilteredMembers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [selectedMemberName, setSelectedMemberName] = useState("");
  const [initialPayment, setInitialPayment] = useState("");
  const [enrolling, setEnrolling] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [enrollError, setEnrollError] = useState("");
  const [enrollSuccess, setEnrollSuccess] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  // Cargar lista de miembros
  const loadMembers = useCallback(async () => {
    setLoadingMembers(true);
    try {
      const response = await apiService.getAllMembers();
      setMembers(response || []);
    } catch (error) {
      console.error("Error cargando miembros:", error);
    } finally {
      setLoadingMembers(false);
    }
  }, []);

  // Efecto para cargar miembros cuando se abre el modal
  useEffect(() => {
    if (isOpen && activity) {
      loadMembers();
    }
  }, [isOpen, activity, loadMembers]);

  // Efecto para filtrar miembros según el término de búsqueda
  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredMembers(members);
    } else {
      const filtered = members.filter((member) =>
        member.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredMembers(filtered);
    }
  }, [searchTerm, members]);

  // Efecto para cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setShowDropdown(true);
    setSelectedMemberId("");
    setSelectedMemberName("");
  };

  const handleSelectMember = (member) => {
    setSelectedMemberId(member.id);
    setSelectedMemberName(member.name);
    setSearchTerm(member.name);
    setShowDropdown(false);
  };

  const handleClearSelection = () => {
    setSelectedMemberId("");
    setSelectedMemberName("");
    setSearchTerm("");
    setShowDropdown(true);
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  const handleEnroll = async () => {
    if (!selectedMemberId) {
      setEnrollError("Debes seleccionar un miembro");
      return;
    }

    if (initialPayment && parseFloat(initialPayment) < 0) {
      setEnrollError("El pago inicial no puede ser negativo");
      return;
    }

    if (initialPayment && parseFloat(initialPayment) > activity.price) {
      setEnrollError(
        `El pago inicial no puede exceder el precio de la actividad ($${activity.price.toLocaleString("es-CO")})`
      );
      return;
    }

    setEnrolling(true);
    setEnrollError("");
    setEnrollSuccess("");

    try {
      const success = await onEnrollParticipant(
        activity.id,
        selectedMemberId,
        initialPayment ? parseFloat(initialPayment) : 0
      );

      if (success) {
        setEnrollSuccess("✅ Participante inscrito exitosamente");

        // Resetear formulario
        setSelectedMemberId("");
        setSelectedMemberName("");
        setSearchTerm("");
        setInitialPayment("");

        // Recargar miembros después de 1 segundo
        setTimeout(() => {
          loadMembers();
          setEnrollSuccess("");
        }, 2000);
      }
    } catch (error) {
      console.error("❌ Error completo:", error);

      let errorMessage = "Error al inscribir participante";

      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }

      setEnrollError(errorMessage);
    } finally {
      setEnrolling(false);
    }
  };

  if (!isOpen || !activity) return null;

  // Calcular estadísticas
  const totalValue = (activity.price || 0) * (activity.quantity || 0);
  const daysLeft = activity.endDate
    ? Math.ceil(
        (new Date(activity.endDate) - new Date()) / (1000 * 60 * 60 * 24)
      )
    : null;

  // Calcular miembros disponibles usando balance.participantCount
  const enrolledCount = balance?.participantCount || 0;
  const availableMembersCount = Math.max(0, members.length - enrolledCount);
  const hasCapacity = !activity.quantity || enrolledCount < activity.quantity;

  return (
    <div className="modal-activity-details-overlay">
      <div className="modal-activity-details">
        <div className="modal-activity-details__header">
          <div className="modal-activity-details__header-content">
            <h2>📋 {activity.activityName}</h2>
            <div
              className={`activity-status ${activity.status?.color || "secondary"}`}
            >
              {activity.status?.text || "Desconocido"}
            </div>
          </div>
          <button className="modal-activity-details__close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="modal-activity-details__content">
          {/* INFORMACIÓN PRINCIPAL */}
          <div className="details-section">
            <h3>📊 Información General</h3>
            <div className="details-grid">
              <div className="detail-item">
                <span className="detail-label">💰 Precio:</span>
                <span className="detail-value price">
                  ${activity.price?.toLocaleString("es-CO") || "0"}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">👥 Capacidad:</span>
                <span className="detail-value">
                  {activity.quantity || "Ilimitada"}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">📅 Fecha de creación:</span>
                <span className="detail-value">
                  {new Date(activity.registrationDate).toLocaleDateString(
                    "es-CO"
                  )}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">📅 Fecha de finalización:</span>
                <span className="detail-value">
                  {new Date(activity.endDate).toLocaleDateString("es-CO")}
                  {daysLeft > 0 && (
                    <span className="days-left"> ({daysLeft} días)</span>
                  )}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">💵 Valor total:</span>
                <span className="detail-value price-total">
                  ${totalValue.toLocaleString("es-CO")}
                </span>
              </div>

              {/* Mostrar capacidad utilizada */}
              {activity.quantity && (
                <div className="detail-item">
                  <span className="detail-label">🎯 Capacidad utilizada:</span>
                  <span className="detail-value">
                    {enrolledCount} / {activity.quantity}
                    {activity.quantity > 0 && (
                      <span className="percentage">
                        ({((enrolledCount / activity.quantity) * 100).toFixed(1)}
                        %)
                      </span>
                    )}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* INFORMACIÓN FINANCIERA */}
          {balance && (
            <div className="details-section">
              <h3>💰 Estado Financiero</h3>
              <div className="finance-grid">
                <div className="finance-card income">
                  <div className="finance-icon">💵</div>
                  <div className="finance-content">
                    <div className="finance-label">Comprometido</div>
                    <div className="finance-value">
                      ${balance.totalCommitted?.toLocaleString("es-CO") || "0"}
                    </div>
                  </div>
                </div>
                <div className="finance-card paid">
                  <div className="finance-icon">✅</div>
                  <div className="finance-content">
                    <div className="finance-label">Pagado</div>
                    <div className="finance-value">
                      ${balance.totalPaid?.toLocaleString("es-CO") || "0"}
                    </div>
                  </div>
                </div>
                <div className="finance-card pending">
                  <div className="finance-icon">⏳</div>
                  <div className="finance-content">
                    <div className="finance-label">Pendiente</div>
                    <div className="finance-value">
                      ${balance.balance?.toLocaleString("es-CO") || "0"}
                    </div>
                  </div>
                </div>
                <div className="finance-card compliance">
                  <div className="finance-icon">📈</div>
                  <div className="finance-content">
                    <div className="finance-label">Cumplimiento</div>
                    <div className="finance-value">
                      {balance.compliancePercentage?.toFixed(1) || "0"}%
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* INSCRIBIR NUEVO PARTICIPANTE */}
          <div className="details-section enroll-section">
            <h3>👥 Inscribir Nuevo Participante</h3>

            {/* Información de disponibilidad */}
            {loadingMembers ? (
              <div className="info-message">
                ⏳ Cargando lista de miembros...
              </div>
            ) : (
              <div className="info-message">
                <strong>ℹ️ {members.length} miembros en el sistema</strong>
                {enrolledCount > 0 && (
                  <span> · {enrolledCount} ya inscritos en esta actividad</span>
                )}
                {availableMembersCount > 0 && (
                  <span> · {availableMembersCount} disponibles para inscribir</span>
                )}
                {!hasCapacity && activity.quantity && (
                  <span className="warning-text">
                    {" "}
                    · ⚠️ Capacidad máxima alcanzada ({activity.quantity})
                  </span>
                )}
              </div>
            )}

            {enrollSuccess && (
              <div className="enroll-success">{enrollSuccess}</div>
            )}

            {enrollError && <div className="enroll-error">{enrollError}</div>}

            {hasCapacity && availableMembersCount > 0 && (
              <div className="enroll-form">
                <div className="form-group">
                  <label>Buscar Miembro</label>
                  {loadingMembers ? (
                    <div className="loading-members">Cargando miembros...</div>
                  ) : (
                    <div className="member-search-container" ref={dropdownRef}>
                      <div className="search-input-wrapper">
                        <input
                          ref={searchInputRef}
                          type="text"
                          placeholder="Buscar por nombre..."
                          value={searchTerm}
                          onChange={handleSearchChange}
                          onFocus={() => setShowDropdown(true)}
                          disabled={enrolling}
                          className="member-search-input"
                        />
                        {selectedMemberId && (
                          <button
                            type="button"
                            className="clear-selection-btn"
                            onClick={handleClearSelection}
                            disabled={enrolling}
                            title="Limpiar selección"
                          >
                            ×
                          </button>
                        )}
                      </div>

                      {showDropdown && filteredMembers.length > 0 && (
                        <div className="member-dropdown">
                          <div className="dropdown-header">
                            <span className="result-count">
                              {filteredMembers.length} miembro(s) encontrado(s)
                            </span>
                          </div>
                          <div className="dropdown-list">
                            {filteredMembers.map((member) => (
                              <div
                                key={member.id}
                                className={`dropdown-item ${
                                  selectedMemberId === member.id
                                    ? "selected"
                                    : ""
                                }`}
                                onClick={() => handleSelectMember(member)}
                              >
                                <div className="member-name">{member.name}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {showDropdown &&
                        searchTerm.trim() !== "" &&
                        filteredMembers.length === 0 && (
                          <div className="member-dropdown">
                            <div className="dropdown-empty">
                              No se encontraron miembros con "{searchTerm}"
                            </div>
                          </div>
                        )}
                    </div>
                  )}

                  {selectedMemberId && (
                    <div className="selected-member-info">
                      <div className="selected-member-badge">
                        <span className="selected-member-name">
                          ✅ Seleccionado: {selectedMemberName}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label>Pago Inicial (opcional)</label>
                  <div className="input-with-prefix">
                    <span className="input-prefix">$</span>
                    <input
                      type="number"
                      placeholder="0"
                      value={initialPayment}
                      onChange={(e) => setInitialPayment(e.target.value)}
                      disabled={enrolling}
                      min="0"
                      max={activity.price}
                    />
                  </div>
                  <div className="form-hint">
                    Máximo: ${activity.price?.toLocaleString("es-CO") || "0"}
                  </div>
                </div>

                <button
                  className="enroll-btn"
                  onClick={handleEnroll}
                  disabled={!selectedMemberId || enrolling}
                >
                  {enrolling ? (
                    <>
                      <span className="spinner"></span>
                      Inscribiendo...
                    </>
                  ) : (
                    "✅ Inscribir Participante"
                  )}
                </button>
              </div>
            )}

            {!hasCapacity && (
              <div className="warning-message">
                ⚠️ No se pueden inscribir más participantes. Capacidad máxima
                alcanzada ({activity.quantity}).
              </div>
            )}

            {hasCapacity && availableMembersCount === 0 && members.length > 0 && (
              <div className="info-message">
                ℹ️ Todos los miembros del sistema ya están inscritos en esta
                actividad.
              </div>
            )}
          </div>
        </div>

        {/* ACCIONES */}
        <div className="modal-activity-details__actions">
          <button className="btn btn-secondary" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalActivityDetails;