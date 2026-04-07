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
  const [localLoading, setLocalLoading] = useState(false);
  const [availableLeaders, setAvailableLeaders] = useState([]);
  
  const [newMemberData, setNewMemberData] = useState({
    memberId: "",
    primaryRoleId: "",
    skills: [],
    notes: "",
  });
  
  const [leaderSearchText, setLeaderSearchText] = useState("");
  const [showLeaderDropdown, setShowLeaderDropdown] = useState(false);

  /* NUEVO: Estados para manejar la edición del adorador */
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingMember, setEditingMember] = useState(null);

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

  /* NUEVO: Función para abrir el modal de edición y cargar los datos actuales */
  const handleOpenEditModal = (member) => {
    // Si tus habilidades vienen como un array de objetos, extraemos solo los IDs para los chips
    const currentSkillsIds = member.skills 
        ? member.skills.map(skill => (typeof skill === 'object' ? skill.id : skill))
        : [];

    setEditingMember({
      id: member.id, // ID del registro en el equipo de alabanza
      memberName: member.memberName, // Solo para mostrar en el título
      worshipStatus: member.worshipStatus,
      primaryRoleId: member.primaryRole?.id || "",
      skills: currentSkillsIds,
      notes: member.notes || "",
    });
    setShowEditModal(true);
  };

  /* NUEVO: Función para guardar los cambios del adorador */
  /* MODIFICADO: Función corregida para coincidir con apiService.js */
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Usamos el método exacto tal cual está en tu apiService:
      // updateWorshipMemberProfile(worshipId, primaryRoleId, skillsIds = [], status, notes = null)
      await apiService.updateWorshipMemberProfile(
        editingMember.id,
        editingMember.primaryRoleId,
        editingMember.skills,
        editingMember.worshipStatus,
        editingMember.notes
      );
      
      showSuccess("✅ Adorador actualizado correctamente.");
      setShowEditModal(false);
      await loadData();
    } catch (err) {
      showError(err.message || "Error al actualizar.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="leaders-page__controls">
        {/* ... (tu código actual de controles de búsqueda se mantiene igual) ... */}
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

      <div className="leaders-page__table-container">
        <table className="leaders-page__table">
          <thead>
            <tr>
              <th>Adorador</th>
              <th>Rol Principal</th>
              <th>Otras Habilidades</th> {/* NUEVO: Columna agregada */}
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {filteredTeamMembers.map((member) => (
              <tr 
                key={member.id} 
                className="leaders-page__row--clickable"
                onClick={() => canManageWorship ? handleOpenEditModal(member) : null} /* MODIFICADO: Evento onClick en la fila */
                style={{ cursor: canManageWorship ? "pointer" : "default" }}
              >
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
                
                {/* NUEVO: Celda para mostrar las otras habilidades */}
                <td>
                   <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    {member.skills && member.skills.length > 0 ? (
                      member.skills.map((skill, index) => (
                        <span 
                          key={index}
                          style={{
                            fontSize: '0.75rem',
                            backgroundColor: theme.bgSecondary || '#f3f4f6',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            border: '1px solid #e5e7eb'
                          }}
                        >
                          {typeof skill === 'object' ? skill.name : skill}
                        </span>
                      ))
                    ) : (
                      <span style={{ fontSize: '0.8rem', opacity: 0.5 }}>Ninguna</span>
                    )}
                  </div>
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

      {/* MODAL AÑADIR ADORADOR (Se mantiene idéntico a tu código original) */}
      {showAddMemberModal && (
          /* ... tu código actual de showAddMemberModal va aquí (omitido por brevedad, no hay cambios) ... */
          <div className="leaders-page__modal-overlay">
          <div className="leaders-page__modal" style={{ backgroundColor: theme.bgSecondary, color: theme.text }}>
            <div className="leaders-page__modal-header">
              <h2 style={{ margin: 0, color: "white" }}>🎸 Registro de Adorador</h2>
              <button onClick={() => setShowAddMemberModal(false)} type="button" style={{ background: "none", border: "none", color: "white", cursor: "pointer", fontSize: "1.2rem" }}>✕</button>
            </div>
            <form onSubmit={handleAddMemberSubmit} style={{ padding: "20px" }}>
              <div className="leaders-page__filter-item" style={{ marginBottom: "1.5rem", position: "relative" }}>
                <label>Seleccionar Líder *</label>
                <input
                  type="text" placeholder="Buscar por nombre..." value={leaderSearchText}
                  onChange={(e) => { setLeaderSearchText(e.target.value); setShowLeaderDropdown(true); }}
                  onFocus={() => setShowLeaderDropdown(true)}
                  onBlur={() => setTimeout(() => setShowLeaderDropdown(false), 200)}
                />
                {showLeaderDropdown && (
                  <ul className="worship-leader-search-results">
                    {availableLeaders.filter((l) => getDisplayName(l.memberName).toLowerCase().includes(leaderSearchText.toLowerCase())).map((l) => (
                        <li key={l.memberId} className="leaders-page__leader-item" onMouseDown={() => { setNewMemberData({ ...newMemberData, memberId: l.memberId, }); setLeaderSearchText(getDisplayName(l.memberName)); setShowLeaderDropdown(false); }}>
                          <strong>{getDisplayName(l.memberName)}</strong>
                          <small style={{ display: "block", opacity: 0.7 }}>{l.leaderType || "Líder"}</small>
                        </li>
                      ))}
                  </ul>
                )}
              </div>
              <div className="leaders-page__filter-item" style={{ marginBottom: "1.5rem" }}>
                <label>Instrumento Principal *</label>
                <select required value={newMemberData.primaryRoleId} onChange={(e) => setNewMemberData({ ...newMemberData, primaryRoleId: e.target.value, })}>
                  <option value="">-- Seleccione --</option>
                  {roles.filter((r) => r.active).map((r) => (<option key={r.id} value={r.id}>{r.name}</option>))}
                </select>
              </div>
              <div className="leaders-page__filter-item" style={{ marginBottom: "1.5rem" }}>
                <label>Otras habilidades</label>
                <div className="leaders-page__chips-container">
                  {roles.filter((role) => role.active && String(role.id) !== String(newMemberData.primaryRoleId)).map((role) => {
                      const isSelected = newMemberData.skills.includes(role.id);
                      return (
                        <div key={role.id} className={`leaders-page__chip ${isSelected ? "selected" : ""}`} onClick={() => { const skills = isSelected ? newMemberData.skills.filter((id) => id !== role.id) : [...newMemberData.skills, role.id]; setNewMemberData({ ...newMemberData, skills }); }}>
                          {role.name}
                        </div>
                      );
                    })}
                </div>
              </div>
              <div className="leaders-page__modal-footer">
                <button type="button" className="leaders-page__btn" style={{ background: "none", color: "inherit", border: "1px solid var(--gray-color)", }} onClick={() => setShowAddMemberModal(false)}>Cancelar</button>
                <button type="submit" className="leaders-page__btn leaders-page__btn--primary" disabled={!newMemberData.memberId || !newMemberData.primaryRoleId}>Confirmar Registro</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* NUEVO: MODAL PARA EDITAR ADORADOR */}
      {showEditModal && editingMember && (
        <div className="leaders-page__modal-overlay">
          <div
            className="leaders-page__modal"
            style={{ backgroundColor: theme.bgSecondary, color: theme.text }}
          >
            <div className="leaders-page__modal-header">
              <h2 style={{ margin: 0, color: "white" }}>
                ✏️ Editar Adorador
              </h2>
              <button
                onClick={() => setShowEditModal(false)}
                type="button"
                style={{
                  background: "none", border: "none", color: "white", cursor: "pointer", fontSize: "1.2rem",
                }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditSubmit} style={{ padding: "20px" }}>
              
              {/* Info del Adorador (Solo lectura) */}
              <div style={{ marginBottom: "1.5rem", padding: "10px", backgroundColor: "rgba(0,0,0,0.05)", borderRadius: "8px" }}>
                <strong style={{ fontSize: "1.1rem" }}>{getDisplayName(editingMember.memberName)}</strong>
              </div>

              {/* Estado */}
              <div className="leaders-page__filter-item" style={{ marginBottom: "1.5rem" }}>
                <label>Estado del Adorador *</label>
                <select
                  required
                  value={editingMember.worshipStatus}
                  onChange={(e) => setEditingMember({ ...editingMember, worshipStatus: e.target.value })}
                >
                  <option value="ACTIVE">Activo</option>
                  <option value="SUSPENDED">Suspendido</option>
                  <option value="INACTIVE">Inactivo</option>
                </select>
              </div>

              {/* Instrumento Principal */}
              <div className="leaders-page__filter-item" style={{ marginBottom: "1.5rem" }}>
                <label>Instrumento Principal *</label>
                <select
                  required
                  value={editingMember.primaryRoleId}
                  onChange={(e) => setEditingMember({ ...editingMember, primaryRoleId: e.target.value })}
                >
                  <option value="">-- Seleccione --</option>
                  {roles.filter((r) => r.active || String(r.id) === String(editingMember.primaryRoleId)).map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Habilidades */}
              <div className="leaders-page__filter-item" style={{ marginBottom: "1.5rem" }}>
                <label>Otras habilidades</label>
                <div className="leaders-page__chips-container">
                  {roles
                    .filter(
                      (role) =>
                        (role.active || editingMember.skills.includes(role.id)) &&
                        String(role.id) !== String(editingMember.primaryRoleId),
                    )
                    .map((role) => {
                      const isSelected = editingMember.skills.includes(role.id);
                      return (
                        <div
                          key={role.id}
                          className={`leaders-page__chip ${isSelected ? "selected" : ""}`}
                          onClick={() => {
                            const skills = isSelected
                              ? editingMember.skills.filter((id) => id !== role.id)
                              : [...editingMember.skills, role.id];
                            setEditingMember({ ...editingMember, skills });
                          }}
                        >
                          {role.name}
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Notas */}
              <div className="leaders-page__filter-item" style={{ marginBottom: "1.5rem" }}>
                <label>Notas adicionales</label>
                <textarea
                  style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ccc" }}
                  rows="3"
                  value={editingMember.notes}
                  onChange={(e) => setEditingMember({ ...editingMember, notes: e.target.value })}
                  placeholder="Detalles sobre disponibilidad, comportamiento, etc..."
                ></textarea>
              </div>

              {/* Botones */}
              <div className="leaders-page__modal-footer">
                <button
                  type="button"
                  className="leaders-page__btn"
                  style={{ background: "none", color: "inherit", border: "1px solid var(--gray-color)" }}
                  onClick={() => setShowEditModal(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="leaders-page__btn leaders-page__btn--primary"
                  disabled={!editingMember.primaryRoleId}
                >
                  Guardar Cambios
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