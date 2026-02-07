// ============================================
// ModalActivityParticipants.jsx
// Modal para ver y gestionar participantes de una actividad
// ============================================

import React, { useState } from "react";
import "../css/ModalActivityParticipants.css";

const ModalActivityParticipants = ({
  isOpen,
  onClose,
  activity,
  participants,
  onEnrollParticipant,
}) => {
  const [filterText, setFilterText] = useState("");
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [initialPayment, setInitialPayment] = useState("");
  const [enrolling, setEnrolling] = useState(false);
  const [enrollError, setEnrollError] = useState("");
  const [enrollSuccess, setEnrollSuccess] = useState("");

  // Filtrar participantes
  const filteredParticipants = participants.filter((participant) => {
    if (!filterText) return true;

    const searchTerm = filterText.toLowerCase();
    return (
      (participant.memberName &&
        participant.memberName.toLowerCase().includes(searchTerm)) ||
      (participant.memberEmail &&
        participant.memberEmail.toLowerCase().includes(searchTerm)) ||
      (participant.enrollmentStatus &&
        participant.enrollmentStatus.toLowerCase().includes(searchTerm))
    );
  });

  // Estadísticas de participantes
  const stats = {
    total: participants.length,
    fullyPaid: participants.filter((p) => p.isFullyPaid).length,
    partiallyPaid: participants.filter((p) => p.totalPaid > 0 && !p.isFullyPaid)
      .length,
    pending: participants.filter((p) => p.totalPaid === 0).length,
    totalPaid: participants.reduce((sum, p) => sum + (p.totalPaid || 0), 0),
    totalPending: participants.reduce(
      (sum, p) => sum + (p.pendingBalance || 0),
      0,
    ),
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

    // Verificar si el miembro ya está inscrito
    const alreadyEnrolled = participants.find(
      (p) => p.memberId === parseInt(selectedMemberId),
    );
    if (alreadyEnrolled) {
      setEnrollError("Este miembro ya está inscrito en la actividad");
      return;
    }

    setEnrolling(true);
    setEnrollError("");
    setEnrollSuccess("");

    try {
      const success = await onEnrollParticipant(
        activity.id,
        selectedMemberId,
        initialPayment ? parseFloat(initialPayment) : 0,
      );

      if (success) {
        setEnrollSuccess("✅ Participante inscrito exitosamente");
        // Resetear formulario
        setSelectedMemberId("");
        setInitialPayment("");
        // Limpiar mensaje después de 3 segundos
        setTimeout(() => setEnrollSuccess(""), 3000);
      }
    } catch (error) {
      setEnrollError(error.message || "Error al inscribir participante");
    } finally {
      setEnrolling(false);
    }
  };

  if (!isOpen || !activity) return null;

  return (
    <div className="modal-participants-overlay">
      <div className="modal-participants">
        <div className="modal-participants__header">
          <div className="modal-participants__header-content">
            <h2>👥 Participantes - {activity.activityName}</h2>
            <div className="participants-count">
              {stats.total} participante{stats.total !== 1 ? "s" : ""}
            </div>
          </div>
          <button className="modal-participants__close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="modal-participants__content">
          {/* ESTADÍSTICAS */}
          <div className="participants-stats">
            <div className="stat-card total">
              <div className="stat-icon">👥</div>
              <div className="stat-content">
                <div className="stat-value">{stats.total}</div>
                <div className="stat-label">Total</div>
              </div>
            </div>

            <div className="stat-card paid">
              <div className="stat-icon">✅</div>
              <div className="stat-content">
                <div className="stat-value">{stats.fullyPaid}</div>
                <div className="stat-label">Pagado</div>
              </div>
            </div>

            <div className="stat-card partial">
              <div className="stat-icon">🟡</div>
              <div className="stat-content">
                <div className="stat-value">{stats.partiallyPaid}</div>
                <div className="stat-label">Parcial</div>
              </div>
            </div>

            <div className="stat-card pending">
              <div className="stat-icon">⏳</div>
              <div className="stat-content">
                <div className="stat-value">{stats.pending}</div>
                <div className="stat-label">Pendiente</div>
              </div>
            </div>

            <div className="stat-card money">
              <div className="stat-icon">💰</div>
              <div className="stat-content">
                <div className="stat-value">
                  ${stats.totalPaid.toLocaleString("es-CO")}
                </div>
                <div className="stat-label">Pagado Total</div>
              </div>
            </div>

            <div className="stat-card debt">
              <div className="stat-icon">📝</div>
              <div className="stat-content">
                <div className="stat-value">
                  ${stats.totalPending.toLocaleString("es-CO")}
                </div>
                <div className="stat-label">Pendiente Total</div>
              </div>
            </div>
          </div>

          {/* INSCRIBIR NUEVO PARTICIPANTE */}
          <div className="enroll-section">
            <h3>➕ Inscribir Nuevo Participante</h3>

            {enrollSuccess && (
              <div className="enroll-success">{enrollSuccess}</div>
            )}

            {enrollError && <div className="enroll-error">{enrollError}</div>}

            <div className="enroll-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Miembro *</label>
                  <input
                    type="text"
                    placeholder="ID del miembro..."
                    value={selectedMemberId}
                    onChange={(e) =>
                      setSelectedMemberId(e.target.value.replace(/\D/g, ""))
                    }
                    disabled={enrolling}
                  />
                  <div className="form-hint">
                    Ingresa el ID numérico del miembro
                  </div>
                </div>

                <div className="form-group">
                  <label>Pago Inicial (opcional)</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={initialPayment}
                    onChange={(e) => setInitialPayment(e.target.value)}
                    disabled={enrolling}
                    min="0"
                    max={activity.price}
                    className="payment-input" /* ← Agrega clase específica si necesitas */
                  />
                  <div className="form-hint">
                    Máximo: ${activity.price?.toLocaleString("es-CO") || "0"}
                  </div>
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
          </div>

          {/* BÚSQUEDA */}
          <div className="search-section">
            <div className="search-container">
              <input
                type="text"
                placeholder="🔍 Buscar participante por nombre, email o estado..."
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                className="search-input"
              />
              {filterText && (
                <button
                  className="clear-search"
                  onClick={() => setFilterText("")}
                >
                  ×
                </button>
              )}
            </div>
            <div className="search-info">
              Mostrando {filteredParticipants.length} de {participants.length}{" "}
              participantes
              {filterText && ` para "${filterText}"`}
            </div>
          </div>

          {/* LISTA DE PARTICIPANTES */}
          <div className="participants-list">
            {filteredParticipants.length === 0 ? (
              <div className="empty-participants">
                {participants.length === 0 ? (
                  <>
                    <div className="empty-icon">👥</div>
                    <h4>No hay participantes inscritos</h4>
                    <p>
                      Comienza inscribiendo participantes usando el formulario
                      arriba
                    </p>
                  </>
                ) : (
                  <>
                    <div className="empty-icon">🔍</div>
                    <h4>No se encontraron participantes</h4>
                    <p>Intenta con otros términos de búsqueda</p>
                  </>
                )}
              </div>
            ) : (
              <div className="participants-table-container">
                <table className="participants-table">
                  <thead>
                    <tr>
                      <th>Miembro</th>
                      <th>Estado</th>
                      <th>Pagado</th>
                      <th>Pendiente</th>
                      <th>Cumplimiento</th>
                      <th>Fecha Inscripción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredParticipants.map((participant) => (
                      <tr
                        key={participant.id}
                        className={`participant-${participant.isFullyPaid ? "paid" : "pending"}`}
                      >
                        <td>
                          <div className="participant-info">
                            <div className="participant-avatar">
                              {participant.memberName?.charAt(0) || "?"}
                            </div>
                            <div className="participant-details">
                              <div className="participant-name">
                                {participant.memberName || "Sin nombre"}
                              </div>
                              <div className="participant-id">
                                ID: {participant.memberId}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div
                            className={`status-badge ${participant.enrollmentStatus?.toLowerCase() || "pending"}`}
                          >
                            {participant.enrollmentStatus === "COMPLETED"
                              ? "✅ Pagado"
                              : participant.enrollmentStatus === "ACTIVE"
                                ? "🟡 Parcial"
                                : "⏳ Pendiente"}
                          </div>
                        </td>
                        <td>
                          <div className="amount paid">
                            $
                            {(participant.totalPaid || 0).toLocaleString(
                              "es-CO",
                            )}
                          </div>
                        </td>
                        <td>
                          <div className="amount pending">
                            $
                            {(participant.pendingBalance || 0).toLocaleString(
                              "es-CO",
                            )}
                          </div>
                        </td>
                        <td>
                          <div className="compliance">
                            <div className="compliance-bar">
                              <div
                                className="compliance-fill"
                                style={{
                                  width: `${Math.min(100, participant.compliancePercentage || 0)}%`,
                                }}
                              ></div>
                            </div>
                            <span className="compliance-text">
                              {Math.round(
                                participant.compliancePercentage || 0,
                              )}
                              %
                            </span>
                          </div>
                        </td>
                        <td>
                          <div className="registration-date">
                            {participant.registrationDate
                              ? new Date(
                                  participant.registrationDate,
                                ).toLocaleDateString("es-CO")
                              : "-"}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* ACCIONES */}
        <div className="modal-participants__actions">
          <button className="btn btn-secondary" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalActivityParticipants;
