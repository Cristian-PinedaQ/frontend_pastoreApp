import React, { useState } from "react";
import apiService from "../../apiService";
import nameHelper from "../../services/nameHelper";

const { getDisplayName } = nameHelper;

const WORSHIP_STATUS_MAP = {
  ACTIVE: { label: "Activo", color: "#10b981", icon: "✅" },
  SUSPENDED: { label: "Suspendido", color: "#f59e0b", icon: "⏸️" },
  INACTIVE: { label: "Inactivo", color: "#6b7280", icon: "⏹️" },
};

const unwrap = (data) => {
  if (Array.isArray(data)) return data;
  if (data?.content && Array.isArray(data.content)) return data.content;
  return [];
};

const WorshipTeamTab = ({
  teamMembers = [],
  roles = [],
  canManageWorship,
  theme,
  loadData,
  showSuccess,
  showError,
  setLoading,
}) => {
  const [searchTeam, setSearchTeam] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterRole] = useState("ALL");

  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [localLoading, setLocalLoading] = useState(false); // ✅ Carga local para no romper el padre
  const [availableLeaders, setAvailableLeaders] = useState([]);
  const [newMemberData, setNewMemberData] = useState({
    memberId: "",
    primaryRoleId: "",
    skills: [],
    notes: "",
  });
  const [leaderSearchText, setLeaderSearchText] = useState("");
  const [showLeaderDropdown, setShowLeaderDropdown] = useState(false);

  const filteredTeamMembers = teamMembers.filter((member) => {
    const name = getDisplayName(member.memberName).toLowerCase();
    const role = (member.primaryRole?.name || "").toLowerCase();
    const matchesSearch =
      name.includes(searchTeam.toLowerCase()) ||
      role.includes(searchTeam.toLowerCase());
    const matchesStatus =
      filterStatus === "ALL" || member.worshipStatus === filterStatus;
    const matchesRole =
      filterRole === "ALL" ||
      (member.primaryRole && member.primaryRole.id?.toString() === filterRole);
    return matchesSearch && matchesStatus && matchesRole;
  });

  const handleOpenAddMemberModal = async () => {
    setLocalLoading(true);
    try {
      const leadersResponse = await apiService.getActiveLeaders();
      const allActiveLeaders = unwrap(leadersResponse);
      const currentIds = teamMembers.map((tm) => String(tm.memberId));
      const eligible = allActiveLeaders.filter(
        (l) => !currentIds.includes(String(l.memberId)),
      );

      if (eligible.length === 0) {
        showError("No hay líderes disponibles.");
        return;
      }

      setAvailableLeaders(eligible);
      setNewMemberData({
        memberId: "",
        primaryRoleId: "",
        skills: [],
        notes: "",
      });
      setLeaderSearchText("");
      setShowAddMemberModal(true);
    } catch (err) {
      showError("Error al cargar líderes.");
    } finally {
      setLocalLoading(false);
    }
  };

  const handleAddMemberSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiService.addWorshipMember(
        newMemberData.memberId,
        newMemberData.primaryRoleId,
        newMemberData.skills,
        newMemberData.notes,
      );
      showSuccess("✅ Adorador añadido.");
      setShowAddMemberModal(false);
      await loadData();
    } catch (err) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* BARRA DE CONTROLES (Usa tus clases de LeadersPage) */}
      <div className="leaders-page__controls">
        <div className="leaders-page__controls-grid">
          <div className="leaders-page__filter-item">
            <label>🔍 Buscar Músico</label>
            <input
              type="text"
              placeholder="Nombre o instrumento..."
              value={searchTeam}
              onChange={(e) => setSearchTeam(e.target.value)}
            />
          </div>
          <div className="leaders-page__filter-item">
            <label>📌 Estado</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="ALL">Todos los estados</option>
              <option value="ACTIVE">Activos</option>
              <option value="SUSPENDED">Suspendidos</option>
            </select>
          </div>
          <div
            className="leaders-page__filter-item"
            style={{
              justifyContent: "flex-end",
              flexDirection: "row",
              alignItems: "flex-end",
            }}
          >
            {canManageWorship && (
              <button
                type="button"
                className="leaders-page__btn leaders-page__btn--primary"
                onClick={handleOpenAddMemberModal}
                disabled={localLoading}
              >
                {localLoading ? "⏳ Cargando..." : "➕ Añadir Adorador"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* TABLA (Respeta tu diseño de LeadersPage) */}
      <div className="leaders-page__table-container">
        <table className="leaders-page__table">
          <thead>
            <tr>
              <th>Adorador</th>
              <th>Rol Principal</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {filteredTeamMembers.map((member) => (
              <tr key={member.id} className="leaders-page__row--clickable">
                <td>
                  <div className="leaders-page__member-info">
                    <span className="leaders-page__avatar">👤</span>
                    <div className="leaders-page__member-details">
                      <span className="leaders-page__member-name">
                        {getDisplayName(member.memberName)}
                      </span>
                      <span className="leaders-page__member-meta">
                        {member.memberPhone || "Sin teléfono"}
                      </span>
                    </div>
                  </div>
                </td>
                <td>
                  <span
                    className="leaders-page__type-badge"
                    style={{ borderColor: theme.primary, color: theme.primary }}
                  >
                    {member.primaryRole?.name || member.primaryRoleDisplay}
                  </span>
                </td>
                <td>
                  <span
                    className="leaders-page__status-badge"
                    style={{
                      borderColor:
                        WORSHIP_STATUS_MAP[member.worshipStatus]?.color,
                      color: WORSHIP_STATUS_MAP[member.worshipStatus]?.color,
                    }}
                  >
                    {WORSHIP_STATUS_MAP[member.worshipStatus]?.icon}{" "}
                    {WORSHIP_STATUS_MAP[member.worshipStatus]?.label}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL AÑADIR ADORADOR */}
      {showAddMemberModal && (
        <div className="leaders-page__modal-overlay">
          <div
            className="leaders-page__modal"
            style={{ backgroundColor: theme.bgSecondary, color: theme.text }}
          >
            {/* Header del Modal - Usa tu clase con degradado */}
            <div className="leaders-page__modal-header">
              <h2 style={{ margin: 0, color: "white" }}>
                🎸 Registro de Adorador
              </h2>
              <button
                onClick={() => setShowAddMemberModal(false)}
                type="button"
                style={{
                  background: "none",
                  border: "none",
                  color: "white",
                  cursor: "pointer",
                  fontSize: "1.2rem",
                }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddMemberSubmit} style={{ padding: "20px" }}>
              {/* Selector de Líder */}
              <div
                className="leaders-page__filter-item"
                style={{ marginBottom: "1.5rem", position: "relative" }}
              >
                <label>Seleccionar Líder *</label>
                <input
                  type="text"
                  placeholder="Buscar por nombre..."
                  value={leaderSearchText}
                  onChange={(e) => {
                    setLeaderSearchText(e.target.value);
                    setShowLeaderDropdown(true);
                  }}
                  onFocus={() => setShowLeaderDropdown(true)}
                  onBlur={() =>
                    setTimeout(() => setShowLeaderDropdown(false), 200)
                  }
                  /* Sin style inline de color aquí */
                />

                {showLeaderDropdown && (
                  <ul className="worship-leader-search-results">
                    {availableLeaders
                      .filter((l) =>
                        getDisplayName(l.memberName)
                          .toLowerCase()
                          .includes(leaderSearchText.toLowerCase()),
                      )
                      .map((l) => (
                        <li
                          key={l.memberId}
                          className="leaders-page__leader-item"
                          onMouseDown={() => {
                            setNewMemberData({
                              ...newMemberData,
                              memberId: l.memberId,
                            });
                            setLeaderSearchText(getDisplayName(l.memberName));
                            setShowLeaderDropdown(false);
                          }}
                        >
                          <strong>{getDisplayName(l.memberName)}</strong>
                          <small style={{ display: "block", opacity: 0.7 }}>
                            {l.leaderType || "Líder"}
                          </small>
                        </li>
                      ))}
                  </ul>
                )}
              </div>

              {/* Instrumento Principal */}
              <div
                className="leaders-page__filter-item"
                style={{ marginBottom: "1.5rem" }}
              >
                <label>Instrumento Principal *</label>
                <select
                  required
                  value={newMemberData.primaryRoleId}
                  onChange={(e) =>
                    setNewMemberData({
                      ...newMemberData,
                      primaryRoleId: e.target.value,
                    })
                  }
                >
                  <option value="">-- Seleccione --</option>
                  {roles
                    .filter((r) => r.active)
                    .map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                </select>
              </div>

              {/* Habilidades */}
              <div
                className="leaders-page__filter-item"
                style={{ marginBottom: "1.5rem" }}
              >
                <label>Otras habilidades</label>

                <div className="leaders-page__chips-container">
                  {roles
                    .filter(
                      (role) =>
                        role.active &&
                        String(role.id) !== String(newMemberData.primaryRoleId),
                    )
                    .map((role) => {
                      const isSelected = newMemberData.skills.includes(role.id);

                      return (
                        <div
                          key={role.id}
                          className={`leaders-page__chip ${
                            isSelected ? "selected" : ""
                          }`}
                          onClick={() => {
                            const skills = isSelected
                              ? newMemberData.skills.filter(
                                  (id) => id !== role.id,
                                )
                              : [...newMemberData.skills, role.id];

                            setNewMemberData({ ...newMemberData, skills });
                          }}
                        >
                          {role.name}
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Botones */}
              <div className="leaders-page__modal-footer">
                <button
                  type="button"
                  className="leaders-page__btn"
                  style={{
                    background: "none",
                    color: "inherit",
                    border: "1px solid var(--gray-color)",
                  }}
                  onClick={() => setShowAddMemberModal(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="leaders-page__btn leaders-page__btn--primary"
                  disabled={
                    !newMemberData.memberId || !newMemberData.primaryRoleId
                  }
                >
                  Confirmar Registro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default WorshipTeamTab;
