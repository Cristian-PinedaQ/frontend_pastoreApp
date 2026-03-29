// ModalActivityParticipants.jsx - CON FUNCIÓN DE GENERAR PDF (VERSIÓN OPTIMIZADA)
// ✅ INTEGRADO: nameHelper para transformación de nombres
// ✅ CORREGIDO: useCallback y useEffect sin warnings
// 🔐 AÑADIDO: prop readOnly para roles con solo GET
// 🗑️ AÑADIDO: eliminación de participante (solo en actividades "Por finalizar")

import React, { useState, useEffect, useCallback } from "react";
import "../css/ModalActivityParticipants.css";
import ParticipantDetailModal from "./ParticipantDetailModal";
import apiService from "../apiService";
import { generateGeneralParticipantsPDF } from "../services/participantsGeneralPdfGenerator";
import {
  transformForDisplay,
  transformArrayForDisplay,
} from "../services/nameHelper";
import ItemDeliveryToggle from "./ItemDeliveryToggle";
import ActivityDeliveryStats from "./ActivityDeliveryStats";

const ModalActivityParticipants = ({
  isOpen,
  onClose,
  activity,
  onAddPayment,
  onEnrollParticipant, // null cuando el rol es solo lectura
  readOnly = false, // 🔐 true para ROLE_CONEXION, ROLE_CIMIENTO, ROLE_ESENCIA, ROLE_DESPLIEGUE
}) => {
  const [filterText, setFilterText] = useState("");
  const [selectedParticipant, setSelectedParticipant] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [contributions, setContributions] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [leaderFilter, setLeaderFilter] = useState("");
  const [districtFilter, setDistrictFilter] = useState("");
  const [leaders, setLeaders] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [showFilters, setShowFilters] = useState(false);

  // 🗑️ Estados para la eliminación de participantes
  const [participantToDelete, setParticipantToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  // 🗑️ La actividad está "abierta" si isActive=true Y su fecha de fin no ha pasado
  // (equivale a los estados "Activa" y "Por finalizar" de ActivityPage)
  const isActivityOpen = (() => {
    if (!activity?.isActive) return false; // Inactiva → no
    if (!activity?.endDate) return true;
    const [y, m, d] = String(activity.endDate)
      .split("T")[0]
      .split("-")
      .map(Number);
    const end = new Date(y, m - 1, d); // fecha local sin UTC
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return end >= today; // Finalizada → no; Activa/Por finalizar → sí
  })();

  // Puede eliminar si tiene permisos de escritura Y la actividad sigue abierta
  const canDeleteParticipants = !readOnly && isActivityOpen;

  // ✅ DEFINIR loadParticipants CON useCallback ANTES del useEffect
  const loadParticipants = useCallback(async () => {
    if (!activity?.id) return;

    setLoading(true);
    try {
      const url = `/activity-contribution/activity/${activity.id}/with-leader-info`;
      const response = await apiService.request(url, { method: "GET" });

      // ✅ USANDO nameHelper: Transformar nombres de participantes para mostrar
      const transformedParticipants = transformArrayForDisplay(response, [
        "memberName",
        "leaderName",
      ]);

      // ✅ Asegurarse de que itemDelivered está presente y es booleano
      const participantsWithDelivery = transformedParticipants.map((p) => ({
        ...p,
        itemDelivered: p.itemDelivered === true,
        delivered: p.itemDelivered === true,
        isDelivered: p.itemDelivered === true,
        item_delivered: p.itemDelivered === true,
        quantity: p.quantity || 1, // 📦 Asegurar quantity
      }));

      setParticipants(participantsWithDelivery);

      // Resto del código...
    } catch (error) {
      console.error("❌ Error cargando participantes:", error);
    } finally {
      setLoading(false);
    }
  }, [activity?.id]);

  // ✅ useEffect CON DEPENDENCIAS CORRECTAS
  useEffect(() => {
    if (isOpen && activity?.id) {
      loadParticipants();
    } else {
      setParticipants([]);
      setLeaders([]);
      setDistricts([]);
      setShowFilters(false);
    }
  }, [isOpen, activity?.id, loadParticipants]);

  // =====================================================
  // 🗑️ LÓGICA DE ELIMINACIÓN DE PARTICIPANTE
  // =====================================================

  /** Abre el modal de confirmación para eliminar */
  const handleDeleteClick = (e, participant) => {
    // Evitar que el click propague al handleParticipantClick de la fila
    e.stopPropagation();
    setDeleteError(null);
    setParticipantToDelete(participant);
  };

  /** Cancela la eliminación */
  const handleCancelDelete = () => {
    setParticipantToDelete(null);
    setDeleteError(null);
  };

  /**
   * Confirma y ejecuta la eliminación.
   * El endpoint DELETE /activity-contribution/delete/{id} elimina la contribución.
   * Si la entidad tiene cascade = CascadeType.ALL sobre los pagos, estos se borran
   * automáticamente. De lo contrario, el backend debe eliminarlos primero
   * (ver nota al final del archivo).
   */
  const handleConfirmDelete = async () => {
    if (!participantToDelete) return;

    const contributionId =
      participantToDelete.contributionId || participantToDelete.id;
    setDeleting(true);
    setDeleteError(null);

    try {
      await apiService.request(
        `/activity-contribution/delete/${contributionId}`,
        { method: "DELETE" },
      );

      // Quitar el participante de la lista local inmediatamente (optimistic update)
      setParticipants((prev) =>
        prev.filter((p) => (p.contributionId || p.id) !== contributionId),
      );

      setParticipantToDelete(null);
    } catch (error) {
      console.error("❌ Error eliminando participante:", error);
      // Mostrar mensaje de error dentro del modal de confirmación
      const msg =
        error?.response?.data?.error ||
        error?.message ||
        "Error al eliminar. Verifica que los pagos asociados puedan eliminarse.";
      setDeleteError(msg);
    } finally {
      setDeleting(false);
    }
  };

  // =====================================================

  const handleGeneratePDF = () => {
    try {
      // Asegurarse de que cada participante tenga itemDelivered
      const participantsWithDelivery = filteredParticipants.map((p) => ({
        ...p,
        // Asegurar que itemDelivered está presente
        itemDelivered: p.itemDelivered === true,
        // También incluir otros nombres alternativos por si acaso
        delivered: p.itemDelivered === true,
        isDelivered: p.itemDelivered === true,
        item_delivered: p.itemDelivered === true,
      }));

      const pdfData = {
        activity: {
          id: activity.id,
          name: activity.activityName,
          price: activity.price,
          endDate: activity.endDate,
          quantity: activity.quantity,
          isActive: activity.isActive,
        },
        participants: participantsWithDelivery, // ✅ Usar la versión con datos asegurados
        filters: {
          searchText: filterText,
          leaderFilter,
          districtFilter,
        },
        statistics: {
          total: stats.total,
          fullyPaid: stats.fullyPaid,
          partiallyPaid: stats.partiallyPaid,
          pending: stats.pending,
          totalPaid: stats.totalPaid,
          totalPending: stats.totalPending,
          delivered: participantsWithDelivery.filter(
            (p) => p.itemDelivered === true,
          ).length, // ✅ Calcular aquí
          notDelivered: participantsWithDelivery.filter(
            (p) => p.itemDelivered !== true,
          ).length,
          percentagePaid:
            stats.total > 0
              ? (
                  (stats.totalPaid / (stats.totalPaid + stats.totalPending)) *
                  100
                ).toFixed(1)
              : 0,
          deliveryPercentage:
            participantsWithDelivery.length > 0
              ? (
                  (participantsWithDelivery.filter(
                    (p) => p.itemDelivered === true,
                  ).length /
                    participantsWithDelivery.length) *
                  100
                ).toFixed(1)
              : 0,
        },
      };

      const filename = `participantes-general-${activity.activityName.toLowerCase().replace(/\s+/g, "-")}`;
      generateGeneralParticipantsPDF(pdfData, filename);
    } catch (error) {
      console.error("❌ Error generando PDF general:", error);
      alert("Error al generar el PDF. Por favor, intente nuevamente.");
    }
  };

  const stats = {
    total: participants.length,
    fullyPaid: participants.filter((p) => p.isFullyPaid).length,
    partiallyPaid: participants.filter((p) => p.totalPaid > 0 && !p.isFullyPaid)
      .length,
    pending: participants.filter((p) => (p.totalPaid || 0) === 0).length,
    totalPaid: participants.reduce((sum, p) => sum + (p.totalPaid || 0), 0),
    totalPending: participants.reduce(
      (sum, p) => sum + (p.pendingBalance || 0),
      0,
    ),
  };

  const filteredParticipants = participants.filter((participant) => {
    const searchTerm = filterText.toLowerCase();
    const matchesSearch =
      !filterText ||
      (participant.memberName &&
        participant.memberName.toLowerCase().includes(searchTerm)) ||
      (participant.memberEmail &&
        participant.memberEmail.toLowerCase().includes(searchTerm)) ||
      (participant.document &&
        participant.document.toLowerCase().includes(searchTerm)) ||
      (participant.leaderName &&
        participant.leaderName.toLowerCase().includes(searchTerm));

    const matchesLeader =
      !leaderFilter ||
      (participant.leaderName && participant.leaderName === leaderFilter);

    const matchesDistrict =
      !districtFilter ||
      (participant.districtDescription &&
        participant.districtDescription === districtFilter);

    return matchesSearch && matchesLeader && matchesDistrict;
  });

  const clearAllFilters = () => {
    setFilterText("");
    setLeaderFilter("");
    setDistrictFilter("");
  };

  const handleParticipantClick = async (participant) => {
    try {
      const contributionId = participant.contributionId || participant.id;
      const contribution = await apiService.request(
        `/activity-payment/contribution/${contributionId}`,
        { method: "GET" },
      );

      // ✅ USANDO nameHelper: Transformar nombres en la contribución
      const transformedContribution = transformForDisplay(contribution, [
        "memberName",
      ]);

      setContributions([transformedContribution]);
      setSelectedParticipant(participant);
      setShowDetailModal(true);
    } catch (error) {
      console.error("Error cargando contribuciones:", error);
      setContributions([participant]);
      setSelectedParticipant(participant);
      setShowDetailModal(true);
    }
  };

  const handleCloseDetailModal = () => {
    setShowDetailModal(false);
    setSelectedParticipant(null);
    setContributions([]);
  };

  const handlePaymentOrDeliverySuccess = useCallback(
    async (eventData) => {
      // ✅ Caso: cambio de entrega (NO recarga todo)
      if (eventData?.type === "deliveryChange") {
        setParticipants((prev) =>
          prev.map((p) => {
            const cid = p.id || p.contributionId;
            return cid === eventData.contributionId
              ? { ...p, itemDelivered: eventData.itemDelivered }
              : p;
          }),
        );
        return;
      }

      // ✅ Caso normal: pago → recargar desde backend
      await loadParticipants();
    },
    [loadParticipants],
  );

  const handleDeliveryChange = useCallback(
    (cid, val) => {
      handlePaymentOrDeliverySuccess({
        type: "deliveryChange",
        contributionId: cid,
        itemDelivered: val,
      });
    },
    [handlePaymentOrDeliverySuccess],
  );

  if (!isOpen || !activity) return null;

  const activeFiltersCount =
    (filterText ? 1 : 0) + (leaderFilter ? 1 : 0) + (districtFilter ? 1 : 0);

  return (
    <>
      <div className="modal-participants-overlay">
        <div className="modal-participants">
          {/* HEADER COMPACTO */}
          <div className="modal-participants__header compact">
            <div className="modal-participants__header-main">
              <div className="modal-participants__title-section">
                <h2 className="modal-participants__title">
                  👥 {activity.activityName}
                </h2>
                <div className="modal-participants__stats">
                  <span className="participants-count">
                    {stats.total} participante{stats.total !== 1 ? "s" : ""}
                  </span>
                  <span className="participants-amount">
                    ${stats.totalPaid.toLocaleString("es-CO")} recaudado
                  </span>
                  {/* 🔐 Indicador visible solo para roles restringidos */}
                  {readOnly && (
                    <span
                      className="readonly-badge-inline"
                      title="Solo tienes permiso de consulta"
                    >
                      🔒 Solo lectura
                    </span>
                  )}
                  {/* 🗑️ Indicador visible cuando se puede eliminar participantes */}
                  {canDeleteParticipants && (
                    <span
                      className="finishing-badge-inline"
                      title="Actividad abierta — puedes eliminar participantes"
                    >
                      ✏️ Edición activa
                    </span>
                  )}
                </div>
              </div>

              <div className="modal-participants__header-actions">
                <button
                  className={`btn-toggle-filters ${activeFiltersCount > 0 ? "has-filters" : ""}`}
                  onClick={() => setShowFilters(!showFilters)}
                  title={showFilters ? "Ocultar filtros" : "Mostrar filtros"}
                >
                  🔍 Filtros{" "}
                  {activeFiltersCount > 0 && `(${activeFiltersCount})`}
                </button>

                {filteredParticipants.length > 0 && (
                  <button
                    className="btn-pdf-export"
                    onClick={handleGeneratePDF}
                    title="Exportar a PDF"
                  >
                    📄 PDF
                  </button>
                )}

                <button className="modal-participants__close" onClick={onClose}>
                  ×
                </button>
              </div>
            </div>

            {/* Barra de búsqueda principal siempre visible */}
            <div className="search-bar-main">
              <input
                type="text"
                placeholder="Buscar participantes..."
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                className="search-input-main"
              />
              <button
                className="btn-refresh-main"
                onClick={loadParticipants}
                disabled={loading}
                title="Actualizar"
              >
                {loading ? "🔄" : "↻"}
              </button>
            </div>
          </div>

          <div className="modal-participants__content">
            {/* SECCIÓN DE FILTROS (colapsable) */}
            {showFilters && (
              <div className="filters-section-collapsible">
                <div className="filters-header">
                  <h4>Filtros avanzados</h4>
                  <button
                    className="btn-close-filters"
                    onClick={() => setShowFilters(false)}
                    title="Cerrar filtros"
                  >
                    ×
                  </button>
                </div>

                <div className="filters-grid">
                  <div className="filter-group">
                    <label className="filter-label">👤 Líder:</label>
                    <select
                      value={leaderFilter}
                      onChange={(e) => setLeaderFilter(e.target.value)}
                      className="filter-select"
                    >
                      <option value="">Todos los líderes</option>
                      {leaders.map((leader, index) => (
                        <option key={index} value={leader}>
                          {/* ✅ Líderes ya transformados */}
                          {leader}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="filter-group">
                    <label className="filter-label">🏘️ Distrito:</label>
                    <select
                      value={districtFilter}
                      onChange={(e) => setDistrictFilter(e.target.value)}
                      className="filter-select"
                    >
                      <option value="">Todos los distritos</option>
                      {districts.map((district, index) => (
                        <option key={index} value={district}>
                          {district}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="filter-actions">
                    {(filterText || leaderFilter || districtFilter) && (
                      <button
                        className="btn-clear-all"
                        onClick={clearAllFilters}
                        title="Limpiar todos los filtros"
                      >
                        🧹 Limpiar filtros
                      </button>
                    )}
                  </div>
                </div>

                <div className="filters-info">
                  {filterText && `Buscando: "${filterText}"`}
                  {leaderFilter && ` • Líder: ${leaderFilter}`}
                  {districtFilter && ` • Distrito: ${districtFilter}`}
                  <span className="results-count">
                    Mostrando {filteredParticipants.length} de{" "}
                    {participants.length}
                  </span>
                </div>
              </div>
            )}

            {/* ESTADÍSTICAS COMPACTAS */}
            {/* 📦 Panel de entregas */}
            {/* ESTADÍSTICAS COMPACTAS */}
            <div className="quick-stats-compact">
              <div className="stat-item">
                <span className="stat-icon">✅</span>
                <span className="stat-value">{stats.fullyPaid}</span>
                <span className="stat-label">Pagado</span>
              </div>
              <div className="stat-item">
                <span className="stat-icon">🟡</span>
                <span className="stat-value">{stats.partiallyPaid}</span>
                <span className="stat-label">Parcial</span>
              </div>
              <div className="stat-item">
                <span className="stat-icon">⏳</span>
                <span className="stat-value">{stats.pending}</span>
                <span className="stat-label">Pendiente</span>
              </div>
              <div className="stat-item">
                <span className="stat-icon">💰</span>
                <span className="stat-value">
                  ${stats.totalPending.toLocaleString("es-CO")}
                </span>
                <span className="stat-label">Por cobrar</span>
              </div>
            </div>

            {/* 📦 Panel de entregas */}
            <ActivityDeliveryStats
              participants={participants}
              activityName={activity?.activityName}
            />

            {/* LISTA DE PARTICIPANTES */}
            <div className="participants-list">
              {loading ? (
                <div className="loading-participants">
                  <div className="loading-spinner"></div>
                  <p>Cargando participantes...</p>
                </div>
              ) : filteredParticipants.length === 0 ? (
                <div className="empty-participants">
                  {participants.length === 0 ? (
                    <>
                      <div className="empty-icon">👥</div>
                      <h4>No hay participantes inscritos</h4>
                      <p>Los participantes se inscriben desde otra sección</p>
                    </>
                  ) : (
                    <>
                      <div className="empty-icon">🔍</div>
                      <h4>No se encontraron participantes</h4>
                      <p>Intenta con otros términos o ajusta los filtros</p>
                      <button
                        className="btn-clear-filters"
                        onClick={clearAllFilters}
                      >
                        🧹 Limpiar filtros
                      </button>
                    </>
                  )}
                </div>
              ) : (
                <div className="participants-table-container">
                  <table className="participants-table">
                    <thead>
                      <tr>
                        <th>Miembro</th>
                        <th>Líder</th>
                        <th>Distrito</th>
                        <th>Estado</th>
                        <th>Pagado</th>
                        <th>Pendiente</th>
                        <th>Cumpl.</th>
                        <th>Inscrito</th>
                        <th>Entrega</th>
                        {/* 🗑️ Columna de acciones solo visible cuando se puede eliminar */}
                        {canDeleteParticipants && <th>Acción</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredParticipants.map((participant) => (
                        <tr
                          key={participant.id || participant.contributionId}
                          className={`participant-row 
                          ${participant.isFullyPaid ? "paid" : "pending"} 
                          ${participant.itemDelivered ? "delivered" : ""}`}
                          onClick={() => handleParticipantClick(participant)}
                        >
                          <td>
                            <div className="participant-info">
                              <div className="participant-avatar">
                                {participant.memberName?.charAt(0) || "?"}
                              </div>
                              <div className="participant-details">
                                <div className="participant-name">
                                  {/* ✅ Nombre ya transformado */}
                                  {participant.memberName || "Sin nombre"}
                                </div>
                                <div className="participant-document">
                                  {participant.documentType}:{" "}
                                  {participant.document}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <div className="participant-leader">
                              {/* ✅ Nombre del líder ya transformado */}
                              {participant.leaderName || "Sin líder"}
                            </div>
                          </td>
                          <td>
                            <div
                              className={`district-badge ${participant.districtDescription ? "has-district" : "no-district"}`}
                            >
                              {participant.districtDescription ||
                                "Sin distrito"}
                            </div>
                          </td>
                          <td>
                            <div
                              className={`status-badge ${participant.enrollmentStatus?.toLowerCase() || "pending"}`}
                            >
                              {participant.enrollmentStatus === "COMPLETED"
                                ? "✅"
                                : participant.enrollmentStatus === "ACTIVE"
                                  ? "🟡"
                                  : "⏳"}
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
                          <td onClick={(e) => e.stopPropagation()}>
                            <ItemDeliveryToggle
                              contributionId={
                                participant.id || participant.contributionId
                              }
                              initialDelivered={!!participant.itemDelivered}
                              memberName={participant.memberName}
                              onDeliveryChange={handleDeliveryChange}
                              disabled={readOnly}
                              compact
                            />
                          </td>

                          {/* 🗑️ Botón de eliminar — solo en actividades "Por finalizar" y con permisos */}
                          {canDeleteParticipants && (
                            <td onClick={(e) => e.stopPropagation()}>
                              <button
                                className="btn-delete-participant"
                                onClick={(e) =>
                                  handleDeleteClick(e, participant)
                                }
                                title={`Eliminar a ${participant.memberName || "participante"}${participant.totalPaid > 0 ? " (tiene pagos, también se eliminarán)" : ""}`}
                              >
                                🗑️
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          <div className="modal-participants__footer">
            <div className="footer-summary">
              <span className="footer-total">
                {filteredParticipants.length} participantes
              </span>
              <span className="footer-amount">
                Total recaudado: ${stats.totalPaid.toLocaleString("es-CO")}
              </span>
            </div>
            <button className="btn btn-close" onClick={onClose}>
              Cerrar
            </button>
          </div>
        </div>
      </div>

      {/* Modal de detalle */}
      {showDetailModal && selectedParticipant && (
        <ParticipantDetailModal
          isOpen={showDetailModal}
          onClose={handleCloseDetailModal}
          participant={selectedParticipant}
          activity={activity}
          contribution={contributions[0]}
          onAddPaymentSuccess={handlePaymentOrDeliverySuccess}
          readOnly={readOnly}
        />
      )}

      {/* =====================================================
          🗑️ MODAL DE CONFIRMACIÓN DE ELIMINACIÓN
          ===================================================== */}
      {participantToDelete && (
        <div className="delete-confirm-overlay" onClick={handleCancelDelete}>
          <div
            className="delete-confirm-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="delete-confirm-icon">🗑️</div>

            <h3 className="delete-confirm-title">Eliminar participante</h3>

            <p className="delete-confirm-desc">
              ¿Estás seguro de que deseas eliminar a{" "}
              <strong>
                {participantToDelete.memberName || "este participante"}
              </strong>{" "}
              de la actividad <strong>{activity.activityName}</strong>?
            </p>

            {/* Advertencia si tiene pagos registrados */}
            {(participantToDelete.totalPaid || 0) > 0 && (
              <div className="delete-confirm-warning">
                ⚠️ Este participante tiene{" "}
                <strong>
                  ${participantToDelete.totalPaid.toLocaleString("es-CO")}
                </strong>{" "}
                en pagos registrados. Al eliminarlo, todos sus pagos también
                serán eliminados permanentemente.
              </div>
            )}

            {/* Error si la eliminación falla */}
            {deleteError && (
              <div className="delete-confirm-error">❌ {deleteError}</div>
            )}

            <div className="delete-confirm-actions">
              <button
                className="btn-cancel-delete"
                onClick={handleCancelDelete}
                disabled={deleting}
              >
                Cancelar
              </button>
              <button
                className="btn-confirm-delete"
                onClick={handleConfirmDelete}
                disabled={deleting}
              >
                {deleting ? "Eliminando..." : "Sí, eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🔐 Estilos del badge inline + 🗑️ estilos de eliminación */}
      <style>{`
        .readonly-badge-inline {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          padding: 2px 8px;
          background: #fff3cd;
          border: 1px solid #f0c040;
          border-radius: 20px;
          font-size: 0.75em;
          color: #7d5a00;
          font-weight: 600;
          margin-left: 6px;
        }

        /* 🗑️ Badge "Por finalizar" */
        .finishing-badge-inline {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          padding: 2px 8px;
          background: #fde8e8;
          border: 1px solid #e07070;
          border-radius: 20px;
          font-size: 0.75em;
          color: #8b1a1a;
          font-weight: 600;
          margin-left: 6px;
        }

        /* 🗑️ Botón eliminar en la fila */
        .btn-delete-participant {
          background: none;
          border: 1px solid transparent;
          border-radius: 6px;
          padding: 4px 7px;
          cursor: pointer;
          font-size: 1em;
          transition: background 0.15s, border-color 0.15s;
          line-height: 1;
        }
        .btn-delete-participant:hover {
          background: #fde8e8;
          border-color: #e07070;
        }

        /* 🗑️ Overlay del modal de confirmación */
        .delete-confirm-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.55);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1100;
          animation: fadeIn 0.15s ease;
        }

        /* 🗑️ Caja del modal de confirmación */
        .delete-confirm-modal {
          background: #fff;
          border-radius: 14px;
          padding: 28px 32px 24px;
          max-width: 420px;
          width: 92%;
          box-shadow: 0 8px 32px rgba(0,0,0,0.18);
          text-align: center;
          animation: slideUp 0.2s ease;
        }

        .delete-confirm-icon {
          font-size: 2.4em;
          margin-bottom: 10px;
        }

        .delete-confirm-title {
          font-size: 1.15em;
          font-weight: 700;
          color: #1a1a2e;
          margin: 0 0 10px;
        }

        .delete-confirm-desc {
          font-size: 0.93em;
          color: #444;
          margin: 0 0 14px;
          line-height: 1.5;
        }

        /* Advertencia de pagos */
        .delete-confirm-warning {
          background: #fff7e6;
          border: 1px solid #f0a500;
          border-radius: 8px;
          padding: 10px 14px;
          font-size: 0.85em;
          color: #7a4500;
          margin-bottom: 14px;
          text-align: left;
          line-height: 1.5;
        }

        /* Error de eliminación */
        .delete-confirm-error {
          background: #fde8e8;
          border: 1px solid #e07070;
          border-radius: 8px;
          padding: 10px 14px;
          font-size: 0.85em;
          color: #8b1a1a;
          margin-bottom: 14px;
          text-align: left;
        }

        /* Botones del modal de confirmación */
        .delete-confirm-actions {
          display: flex;
          gap: 10px;
          justify-content: center;
        }

        .btn-cancel-delete {
          flex: 1;
          padding: 9px 0;
          border: 1.5px solid #ccc;
          border-radius: 8px;
          background: #fff;
          color: #444;
          font-size: 0.9em;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.15s;
        }
        .btn-cancel-delete:hover:not(:disabled) {
          background: #f0f0f0;
        }

        .btn-confirm-delete {
          flex: 1;
          padding: 9px 0;
          border: none;
          border-radius: 8px;
          background: #c0392b;
          color: #fff;
          font-size: 0.9em;
          font-weight: 700;
          cursor: pointer;
          transition: background 0.15s;
        }
        .btn-confirm-delete:hover:not(:disabled) {
          background: #a93226;
        }
        .btn-confirm-delete:disabled,
        .btn-cancel-delete:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }

        .participant-row.delivered {
          background: #f0fff4;
        }
      `}</style>
    </>
  );
};

export default ModalActivityParticipants;
