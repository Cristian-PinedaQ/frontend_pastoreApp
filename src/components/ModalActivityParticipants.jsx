// ModalActivityParticipants.jsx - CON FUNCIÓN DE GENERAR PDF (VERSIÓN OPTIMIZADA)
// ✅ INTEGRADO: nameHelper para transformación de nombres
// ✅ CORREGIDO: useCallback y useEffect sin warnings
// 🔐 AÑADIDO: prop readOnly para roles con solo GET

import React, { useState, useEffect, useCallback } from "react";
import "../css/ModalActivityParticipants.css";
import ParticipantDetailModal from "./ParticipantDetailModal";
import apiService from "../apiService";
import { generateGeneralParticipantsPDF } from "../services/participantsGeneralPdfGenerator";
import { transformForDisplay, transformArrayForDisplay } from "../services/nameHelper";

const ModalActivityParticipants = ({
  isOpen,
  onClose,
  activity,
  onAddPayment,
  onEnrollParticipant,  // null cuando el rol es solo lectura
  readOnly = false,     // 🔐 true para ROLE_CONEXION, ROLE_CIMIENTO, ROLE_ESENCIA, ROLE_DESPLIEGUE
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

  // ✅ DEFINIR loadParticipants CON useCallback ANTES del useEffect
  const loadParticipants = useCallback(async () => {
    if (!activity?.id) return;

    setLoading(true);
    try {
      const url = `/activity-contribution/activity/${activity.id}/with-leader-info`;
      const response = await apiService.request(url, { method: "GET" });
      
      // ✅ USANDO nameHelper: Transformar nombres de participantes para mostrar
      const transformedParticipants = transformArrayForDisplay(response, ['memberName', 'leaderName']);
      
      setParticipants(transformedParticipants);

      const uniqueLeaders = [
        ...new Set(
          transformedParticipants
            .filter((p) => p.leaderName && p.leaderName !== "Sin líder")
            .map((p) => p.leaderName)
            .sort((a, b) => a.localeCompare(b)),
        ),
      ];
      setLeaders(uniqueLeaders);

      const uniqueDistricts = [
        ...new Set(
          transformedParticipants
            .filter((p) => p.districtDescription)
            .map((p) => p.districtDescription)
            .sort((a, b) => a.localeCompare(b)),
        ),
      ];
      setDistricts(uniqueDistricts);
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

  const handleGeneratePDF = () => {
    try {
      const pdfData = {
        activity: {
          id: activity.id,
          name: activity.activityName,
          price: activity.price,
          endDate: activity.endDate,
          quantity: activity.quantity,
          isActive: activity.isActive,
        },
        participants: filteredParticipants,
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
          percentagePaid: stats.total > 0
            ? ((stats.totalPaid / (stats.totalPaid + stats.totalPending)) * 100).toFixed(1)
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
      const transformedContribution = transformForDisplay(contribution, ['memberName']);
      
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

  const handleAddPaymentSuccess = async () => {
    await loadParticipants();
  };

  if (!isOpen || !activity) return null;

  const activeFiltersCount = (filterText ? 1 : 0) + 
                            (leaderFilter ? 1 : 0) + 
                            (districtFilter ? 1 : 0);

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
                    <span className="readonly-badge-inline" title="Solo tienes permiso de consulta">
                      🔒 Solo lectura
                    </span>
                  )}
                </div>
              </div>
              
              <div className="modal-participants__header-actions">
                <button 
                  className={`btn-toggle-filters ${activeFiltersCount > 0 ? 'has-filters' : ''}`}
                  onClick={() => setShowFilters(!showFilters)}
                  title={showFilters ? "Ocultar filtros" : "Mostrar filtros"}
                >
                  🔍 Filtros {activeFiltersCount > 0 && `(${activeFiltersCount})`}
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
                    Mostrando {filteredParticipants.length} de {participants.length}
                  </span>
                </div>
              </div>
            )}

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
                      </tr>
                    </thead>
                    <tbody>
                      {filteredParticipants.map((participant) => (
                        <tr
                          key={participant.id}
                          className={`participant-row ${participant.isFullyPaid ? "paid" : "pending"}`}
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
              <span className="footer-total">{filteredParticipants.length} participantes</span>
              <span className="footer-amount">Total recaudado: ${stats.totalPaid.toLocaleString("es-CO")}</span>
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
          onAddPaymentSuccess={handleAddPaymentSuccess}
          readOnly={readOnly}
        />
      )}

      {/* 🔐 Estilos del badge inline */}
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
      `}</style>
    </>
  );
};

export default ModalActivityParticipants;