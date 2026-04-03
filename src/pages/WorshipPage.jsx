// ============================================
// WorshipPage.jsx - Gestión del Ministerio de Alabanza
// Incluye: Equipo (Filtros y Perfiles), Programación (CRUD y Asignaciones) y Roles
// ============================================

import React, { useState, useEffect, useCallback } from "react";
import apiService from "../apiService";
import nameHelper from "../services/nameHelper";
import { useAuth } from "../context/AuthContext";
import "../css/LeadersPage.css";

const { getDisplayName } = nameHelper;

// ========== CONSTANTES ==========
const WORSHIP_STATUS_MAP = {
  ACTIVE: { label: "Activo", color: "#10b981", icon: "✅" },
  SUSPENDED: { label: "Suspendido", color: "#f59e0b", icon: "⏸️" },
  INACTIVE: { label: "Inactivo", color: "#6b7280", icon: "⏹️" },
};

const EVENT_TYPES = {
  CULTO_DOMINGO: "Culto de Domingo",
  CULTO_MIERCOLES: "Culto Miércoles",
  REUNION_JOVENES: "Reunión de Jóvenes",
  VIGILIA: "Vigilia",
  ENSAYO: "Ensayo General",
  EVENTO_ESPECIAL: "Evento Especial"
};

// Íconos predefinidos para la creación de roles
const ROLE_ICONS = ["🎵", "🎤", "🎸", "🎹", "🥁", "🎻", "🎺", "🎷", "🪕", "🎛️", "💻", "🎼"];

const WorshipPage = () => {
  const { user, hasAnyRole } = useAuth();
  const canManageWorship = hasAnyRole(["ROLE_PASTORES", "ROLE_ALABANZA"]);

  // ========== STATE GLOBALES ==========
  const [activeTab, setActiveTab] = useState("SCHEDULE"); 
  const [teamMembers, setTeamMembers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [events, setEvents] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isDarkMode, setIsDarkMode] = useState(false);

  // ========== STATE FILTROS DE EQUIPO ==========
  const [searchTeam, setSearchTeam] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterRole, setFilterRole] = useState("ALL");

  // ========== STATE MODALES EQUIPO ==========
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [availableLeaders, setAvailableLeaders] = useState([]);
  const [newMemberData, setNewMemberData] = useState({ 
    memberId: "", 
    primaryRoleId: "", 
    skills: [], 
    notes: "" 
  });
  const [leaderSearchText, setLeaderSearchText] = useState("");
  const [showLeaderDropdown, setShowLeaderDropdown] = useState(false);

  const [showMemberDetailModal, setShowMemberDetailModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [memberEditData, setMemberEditData] = useState({ 
    status: "", 
    notes: "", 
    primaryRoleId: "", 
    skills: [] 
  });

  // ========== STATE MODALES ROLES ==========
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [roleFormData, setRoleFormData] = useState({ 
    icon: "🎵", 
    name: "", 
    description: "", 
    active: true 
  });

  // ========== STATE MODALES PROGRAMACIÓN ==========
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [eventFormData, setEventFormData] = useState({ 
    name: "", 
    type: "CULTO_DOMINGO", 
    date: "", 
    description: "", 
    assignments: [] 
  });
  const [showAutoSuggestModal, setShowAutoSuggestModal] = useState(false);
  const [autoSuggestData, setAutoSuggestData] = useState({ 
    selectedEvents: [], 
    requiredRoles: {} 
  });

  // ========== DARK MODE ==========
  useEffect(() => {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const savedMode = localStorage.getItem("darkMode");
    const htmlHasDarkClass = document.documentElement.classList.contains("dark-mode") || document.documentElement.classList.contains("dark");
    setIsDarkMode(savedMode === "true" || htmlHasDarkClass || prefersDark);
  }, []);

  const theme = {
    bg: isDarkMode ? "#0f172a" : "#f9fafb",
    bgSecondary: isDarkMode ? "#1e293b" : "#ffffff",
    text: isDarkMode ? "#f3f4f6" : "#1f2937",
    textSecondary: isDarkMode ? "#9ca3af" : "#6b7280",
    border: isDarkMode ? "#334155" : "#e5e7eb",
    errorBg: isDarkMode ? "#7f1d1d" : "#fee2e2",
    errorText: isDarkMode ? "#fecaca" : "#991b1b",
    successBg: isDarkMode ? "#14532d" : "#d1fae5",
    successText: isDarkMode ? "#a7f3d0" : "#065f46",
    primary: "#3b82f6",
    danger: "#ef4444",
    warning: "#f59e0b"
  };

  const showSuccess = (msg) => { 
    setSuccessMessage(msg); 
    setTimeout(() => setSuccessMessage(""), 4000); 
  };
  
  const showError = (msg) => { 
    setError(msg); 
    setTimeout(() => setError(""), 6000); 
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [teamData, rolesData, eventsData] = await Promise.all([
        apiService.getWorshipTeam(),
        apiService.getWorshipRoles(),
        apiService.getWorshipEvents()
      ]);
      setTeamMembers(teamData || []);
      setRoles((rolesData || []).sort((a, b) => a.name.localeCompare(b.name)));
      setEvents(eventsData || []);
    } catch (err) {
      showError("Error al cargar los datos. " + (err.message || ""));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { 
    loadData(); 
  }, [loadData]);


  // =========================================================================
  // 👥 FUNCIONES: PESTAÑA EQUIPO
  // =========================================================================

  const filteredTeamMembers = teamMembers.filter(member => {
    const matchesSearch = getDisplayName(member.memberName).toLowerCase().includes(searchTeam.toLowerCase()) || 
                          (member.primaryRole?.name || member.primaryRoleDisplay || "").toLowerCase().includes(searchTeam.toLowerCase());
    const matchesStatus = filterStatus === "ALL" || member.worshipStatus === filterStatus;
    const matchesRole = filterRole === "ALL" || (member.primaryRole && member.primaryRole.id.toString() === filterRole);
    return matchesSearch && matchesStatus && matchesRole;
  });

  const handleOpenAddMemberModal = async () => {
    setLoading(true);
    try {
      const leadersResponse = await apiService.getActiveLeaders();
      const currentTeamMemberIds = teamMembers.map(tm => tm.memberId);
      const eligibleLeaders = (leadersResponse || []).filter(leader => !currentTeamMemberIds.includes(leader.memberId));

      setAvailableLeaders(eligibleLeaders);
      setNewMemberData({ 
        memberId: "", 
        primaryRoleId: "", 
        skills: [], 
        notes: "" 
      });
      setLeaderSearchText("");
      setShowLeaderDropdown(false);
      setShowAddMemberModal(true);
    } catch (err) {
      showError("Error al cargar la lista de líderes disponibles.");
    } finally {
      setLoading(false);
    }
  };

  const filteredAvailableLeaders = availableLeaders.filter(l => 
    getDisplayName(l.memberName).toLowerCase().includes(leaderSearchText.toLowerCase()) ||
    l.leaderType.toLowerCase().includes(leaderSearchText.toLowerCase())
  );

  const handleAddMemberSubmit = async (e) => {
    e.preventDefault();
    if (!newMemberData.memberId || !newMemberData.primaryRoleId) { 
      showError("Debe seleccionar un líder y su instrumento principal."); 
      return; 
    }
    try {
      setLoading(true);
      await apiService.addWorshipMember(
        newMemberData.memberId, 
        newMemberData.primaryRoleId, 
        newMemberData.skills, 
        newMemberData.notes
      );
      showSuccess("Adorador añadido al equipo exitosamente.");
      setShowAddMemberModal(false);
      await loadData();
    } catch (err) {
      showError(err.message || "Error al añadir el adorador.");
    } finally {
      setLoading(false);
    }
  };

  const handleSkillToggle = (roleId) => {
    setNewMemberData(prev => {
      const skills = prev.skills.includes(roleId) 
        ? prev.skills.filter(id => id !== roleId) 
        : [...prev.skills, roleId];
      return { ...prev, skills };
    });
  };

  const handleRowClick = (member) => {
    setSelectedMember(member);
    setMemberEditData({ 
      status: member.worshipStatus, 
      notes: member.notes || "",
      primaryRoleId: member.primaryRole?.id || "",
      skills: member.skills?.map(s => s.id) || []
    });
    setShowMemberDetailModal(true);
  };

  const handleEditSkillToggle = (roleId) => {
    setMemberEditData(prev => {
      const skills = prev.skills.includes(roleId) 
        ? prev.skills.filter(id => id !== roleId) 
        : [...prev.skills, roleId];
      return { ...prev, skills };
    });
  };

  const handleMemberUpdateSubmit = async (e) => {
    e.preventDefault();
    if (!memberEditData.primaryRoleId) {
      showError("Debe seleccionar un instrumento principal.");
      return;
    }
    try {
      setLoading(true);
      await apiService.updateWorshipMemberProfile(
        selectedMember.id, 
        memberEditData.primaryRoleId,
        memberEditData.skills,
        memberEditData.status, 
        memberEditData.notes
      );
      showSuccess(`Perfil de ${getDisplayName(selectedMember.memberName)} actualizado.`);
      setShowMemberDetailModal(false);
      await loadData();
    } catch (err) {
      showError(err.message || "Error al actualizar el perfil.");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFromTeam = async () => {
    if (!window.confirm(`⚠️ ¿Estás seguro de retirar a ${getDisplayName(selectedMember.memberName)} del equipo de alabanza? Su historial se mantendrá como "Inactivo".`)) return;
    try {
      setLoading(true);
      await apiService.updateWorshipMemberProfile(
        selectedMember.id, 
        memberEditData.primaryRoleId, 
        memberEditData.skills, 
        "INACTIVE", 
        "Retirado del equipo manualmente."
      );
      showSuccess("Miembro retirado del equipo.");
      setShowMemberDetailModal(false);
      await loadData();
    } catch (err) {
      showError(err.message || "Error al retirar al miembro.");
    } finally {
      setLoading(false);
    }
  };


  // =========================================================================
  // 🎹 FUNCIONES: PESTAÑA ROLES (INSTRUMENTOS)
  // =========================================================================
  
  const openRoleModal = (role = null) => {
    if (role) {
      setEditingRole(role);
      const firstChar = role.name.charAt(0);
      const hasIcon = ROLE_ICONS.includes(firstChar) || /\p{Extended_Pictographic}/u.test(firstChar);
      
      setRoleFormData({ 
        icon: hasIcon ? firstChar : "🎵", 
        name: hasIcon ? role.name.substring(1).trim() : role.name, 
        description: role.description || "", 
        active: role.active 
      });
    } else {
      setEditingRole(null);
      setRoleFormData({ 
        icon: "🎵", 
        name: "", 
        description: "", 
        active: true 
      });
    }
    setShowRoleModal(true);
  };

  const handleSaveRole = async (e) => {
    e.preventDefault();
    if (!roleFormData.name.trim()) { 
      showError("El nombre del instrumento es obligatorio"); 
      return; 
    }
    try {
      setLoading(true);
      const fullName = `${roleFormData.icon} ${roleFormData.name.trim()}`;
      const payload = { ...roleFormData, name: fullName };

      if (editingRole) {
        await apiService.updateWorshipRole(editingRole.id, payload);
        showSuccess(`Instrumento "${fullName}" actualizado`);
      } else {
        await apiService.createWorshipRole(payload);
        showSuccess(`Instrumento "${fullName}" creado`);
      }
      setShowRoleModal(false);
      await loadData();
    } catch (err) {
      showError(err.message || "Error al guardar el instrumento");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRole = async (id, name) => {
    if (!window.confirm(`⚠️ ¿Estás seguro de eliminar el instrumento "${name}"?`)) return;
    try {
      setLoading(true);
      await apiService.deleteWorshipRole(id);
      showSuccess(`Instrumento "${name}" eliminado exitosamente`);
      await loadData();
    } catch (err) {
      if (err.message?.includes("constraint") || err.message?.includes("violates")) {
        showError(`No se puede eliminar "${name}" porque ya está siendo usado. Desmárcalo como "Activo" en su lugar.`);
      } else {
        showError(err.message || "Error al eliminar el instrumento");
      }
    } finally {
      setLoading(false);
    }
  };


  // =========================================================================
  // 📅 FUNCIONES: PESTAÑA PROGRAMACIÓN (SCHEDULE)
  // =========================================================================

  const openEventModal = (event = null) => {
    if (event) {
      setEditingEvent(event);
      
      // 🚀 CORRECCIÓN DE ZONA HORARIA AL ABRIR EL MODAL
      // En lugar de usar toISOString() que suma 5 horas por el UTC,
      // extraemos la fecha y hora local exacta para el input.
      const d = new Date(event.eventDate);
      const pad = (n) => n.toString().padStart(2, '0');
      const dateLocal = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
      
      // Mapeamos las asignaciones actuales al formato del formulario
      const currentAssignments = (event.assignments || []).map(a => ({
        roleId: a.assignedRole.id.toString(),
        memberId: a.worshipTeamMember.id.toString()
      }));

      setEventFormData({
        name: event.name,
        type: event.eventType,
        date: dateLocal,
        description: event.description || "",
        assignments: currentAssignments
      });
    } else {
      setEditingEvent(null);
      setEventFormData({ 
        name: "", 
        type: "CULTO_DOMINGO", 
        date: "", 
        description: "", 
        assignments: [] 
      });
    }
    setShowEventModal(true);
  };

  // LÓGICA DINÁMICA DE ASIGNACIONES DENTRO DEL MODAL
  const handleAddAssignmentRow = () => {
    setEventFormData(prev => ({ 
      ...prev, 
      assignments: [...prev.assignments, { roleId: "", memberId: "" }] 
    }));
  };

  const handleRemoveAssignmentRow = (index) => {
    const updated = [...eventFormData.assignments];
    updated.splice(index, 1);
    setEventFormData(prev => ({ ...prev, assignments: updated }));
  };

  const handleAssignmentChange = (index, field, value) => {
    const updated = [...eventFormData.assignments];
    
    // 🚀 NUEVO: Prevenir que se seleccione el mismo músico dos veces en el UI
    if (field === 'memberId' && value !== "") {
      const isDuplicate = updated.some((a, i) => i !== index && a.memberId === value);
      if (isDuplicate) {
        showError("Este músico ya está asignado a este evento. Elige a otra persona.");
        return; // Detenemos el cambio
      }
    }

    updated[index][field] = value;
    // Si cambia el rol, reseteamos el miembro seleccionado
    if (field === 'roleId') { 
      updated[index].memberId = ""; 
    }
    setEventFormData(prev => ({ ...prev, assignments: updated }));
  };

  // Función que filtra los músicos que saben tocar el rol seleccionado
  const getEligibleMembersForRole = (roleId) => {
    if (!roleId) return [];
    return teamMembers.filter(m => 
      m.worshipStatus === 'ACTIVE' && 
      (m.primaryRole?.id.toString() === roleId.toString() || m.skills?.some(s => s.id.toString() === roleId.toString()))
    );
  };

  // GUARDAR EVENTO (TEXTO Y ASIGNACIONES)
  const handleSaveEvent = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const dateLocal = eventFormData.date.length === 16 
        ? `${eventFormData.date}:00` 
        : eventFormData.date; 
      
      let savedEventId = null;

      // 1. Guardar o Actualizar Evento Base
      if (editingEvent) {
        await apiService.updateWorshipEvent(
          editingEvent.id, 
          eventFormData.name, 
          eventFormData.type, 
          dateLocal, 
          eventFormData.description
        );
        savedEventId = editingEvent.id;
      } else {
        const response = await apiService.createWorshipEvent(
          eventFormData.name, 
          eventFormData.type, 
          dateLocal, 
          eventFormData.description
        );
        savedEventId = response.id || response.eventId; 
      }

      // 2. Sincronizar las asignaciones si el usuario agregó o modificó músicos en el modal
      const validAssignments = eventFormData.assignments.filter(a => a.roleId !== "" && a.memberId !== "");
      
      if (savedEventId) {
        await apiService.syncEventAssignments(savedEventId, validAssignments);
      }
      
      showSuccess(editingEvent ? "Evento y asignaciones actualizados." : "Evento creado exitosamente.");
      setShowEventModal(false);
      await loadData();
    } catch (err) {
      showError(err.message || "Error al guardar el evento");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEvent = async (id) => {
    if (!window.confirm("⚠️ ¿Estás seguro de eliminar este culto y todas sus asignaciones? Esta acción no se puede deshacer.")) return;
    try {
      setLoading(true);
      await apiService.deleteWorshipEvent(id);
      showSuccess("Evento eliminado.");
      setShowEventModal(false);
      await loadData();
    } catch (err) {
      showError(err.message || "Error al eliminar el evento");
    } finally {
      setLoading(false);
    }
  };

  const handleAssignAllToEvent = async (eventId, eventName) => {
    if (!window.confirm(`👥 ¿Estás seguro de citar a TODO el equipo activo para el evento "${eventName}"?`)) return;
    try {
      setLoading(true);
      await apiService.assignAllWorshipMembersToEvent(eventId);
      showSuccess("¡Todo el equipo activo ha sido citado al evento!");
      await loadData();
    } catch (err) {
      showError(err.message || "Error al citar a todo el equipo.");
    } finally {
      setLoading(false);
    }
  };

  const openAutoSuggestModal = () => {
    const initialRequirements = {};
    roles.filter(r => r.active).forEach(r => { 
      initialRequirements[r.id] = 0; 
    });
    setAutoSuggestData({ 
      selectedEvents: [], 
      requiredRoles: initialRequirements 
    });
    setShowAutoSuggestModal(true);
  };

  const handleToggleEventSelection = (eventId) => {
    setAutoSuggestData(prev => ({ 
      ...prev, 
      selectedEvents: prev.selectedEvents.includes(eventId) 
        ? prev.selectedEvents.filter(id => id !== eventId) 
        : [...prev.selectedEvents, eventId] 
    }));
  };

  const handleRequirementChange = (roleId, value) => {
    setAutoSuggestData(prev => ({ 
      ...prev, 
      requiredRoles: { 
        ...prev.requiredRoles, 
        [roleId]: parseInt(value) || 0 
      } 
    }));
  };

  const handleExecuteAutoSuggest = async () => {
    if (autoSuggestData.selectedEvents.length === 0) { 
      showError("Debe seleccionar al menos un evento."); 
      return; 
    }
    
    const cleanRequirements = {};
    Object.entries(autoSuggestData.requiredRoles).forEach(([roleId, qty]) => { 
      if (qty > 0) cleanRequirements[roleId] = qty; 
    });
    
    if (Object.keys(cleanRequirements).length === 0) { 
      showError("Debe solicitar al menos un músico."); 
      return; 
    }

    try {
      setLoading(true);
      await apiService.autoSuggestWorshipSchedule({ 
        eventIds: autoSuggestData.selectedEvents, 
        requiredRoles: cleanRequirements 
      });
      showSuccess("✨ ¡Algoritmo ejecutado! Equipo programado equitativamente.");
      setShowAutoSuggestModal(false);
      await loadData();
    } catch (err) {
      showError(err.message || "Error al ejecutar el algoritmo");
    } finally {
      setLoading(false);
    }
  };


  // =========================================================================
  // RENDERIZADOS DE COMPONENTES (TABS)
  // =========================================================================

  const renderTeamTab = () => (
    <>
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: '1rem', 
        marginBottom: '1.5rem', 
        backgroundColor: theme.bgSecondary, 
        padding: '1rem', 
        borderRadius: '8px', 
        border: `1px solid ${theme.border}` 
      }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', color: theme.textSecondary, marginBottom: '0.3rem' }}>🔍 Buscar por nombre o instrumento</label>
          <input 
            type="text" 
            placeholder="Ej. Juan, Guitarra..." 
            value={searchTeam} 
            onChange={(e) => setSearchTeam(e.target.value)}
            style={{ 
              width: '100%', 
              padding: '0.5rem', 
              borderRadius: '6px', 
              border: `1px solid ${theme.border}`, 
              backgroundColor: theme.bg, 
              color: theme.text, 
              boxSizing: 'border-box' 
            }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', color: theme.textSecondary, marginBottom: '0.3rem' }}>📌 Estado</label>
          <select 
            value={filterStatus} 
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{ 
              width: '100%', 
              padding: '0.5rem', 
              borderRadius: '6px', 
              border: `1px solid ${theme.border}`, 
              backgroundColor: theme.bg, 
              color: theme.text, 
              boxSizing: 'border-box' 
            }}
          >
            <option value="ALL">Todos los estados</option>
            <option value="ACTIVE">✅ Activos</option>
            <option value="SUSPENDED">⏸️ Suspendidos</option>
            <option value="INACTIVE">⏹️ Inactivos</option>
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', color: theme.textSecondary, marginBottom: '0.3rem' }}>🎹 Instrumento Principal</label>
          <select 
            value={filterRole} 
            onChange={(e) => setFilterRole(e.target.value)}
            style={{ 
              width: '100%', 
              padding: '0.5rem', 
              borderRadius: '6px', 
              border: `1px solid ${theme.border}`, 
              backgroundColor: theme.bg, 
              color: theme.text, 
              boxSizing: 'border-box' 
            }}
          >
            <option value="ALL">Todos los instrumentos</option>
            {roles.map(r => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="leaders-page__table-container">
        <table className="leaders-page__table">
          <thead>
            <tr>
              <th>Adorador</th>
              <th>Rol Principal</th>
              <th>Otras Habilidades</th>
              <th>Estado Espiritual</th>
              <th>Estado Técnico</th>
            </tr>
          </thead>
          <tbody>
            {filteredTeamMembers.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: '3rem', color: theme.textSecondary }}>
                  No hay integrantes que coincidan con la búsqueda.
                </td>
              </tr>
            ) : (
              filteredTeamMembers.map((member) => {
                const roleIcon = member.primaryRole?.name?.charAt(0);
                const hasIcon = ROLE_ICONS.includes(roleIcon) || /\p{Extended_Pictographic}/u.test(roleIcon);
                const displayIcon = hasIcon ? roleIcon : "🎤";

                return (
                  <tr 
                    key={member.id} 
                    onClick={() => canManageWorship ? handleRowClick(member) : null}
                    title={canManageWorship ? "Clic para gestionar participante" : ""}
                    style={{ 
                      backgroundColor: isDarkMode ? "#1a2332" : "#fff", 
                      borderColor: theme.border, 
                      cursor: canManageWorship ? "pointer" : "default" 
                    }} 
                    className={canManageWorship ? "leaders-page__row hover-highlight" : "leaders-page__row"}
                  >
                    <td>
                      <div className="leaders-page__member-info">
                        <span className="leaders-page__avatar">{displayIcon}</span>
                        <div className="leaders-page__member-details">
                          <span className="leaders-page__member-name">{getDisplayName(member.memberName)}</span>
                          <span className="leaders-page__member-meta">
                            {member.memberPhone || "Sin teléfono"} • Unido: {new Date(member.joinedWorshipDate).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="leaders-page__type-badge" style={{ backgroundColor: `${theme.primary}20`, color: theme.primary }}>
                        {member.primaryRoleDisplay || member.primaryRole?.name}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', maxWidth: '200px' }}>
                        {member.skills?.map(skill => (
                          <span key={skill.id} style={{ 
                            fontSize: '0.7rem', 
                            padding: '0.2rem 0.4rem', 
                            borderRadius: '8px', 
                            backgroundColor: theme.bg, 
                            border: `1px solid ${theme.border}` 
                          }}>
                            {skill.name}
                          </span>
                        ))}
                        {(!member.skills || member.skills.length === 0) && (
                          <span style={{ color: theme.textSecondary }}>-</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span style={{ color: member.leaderStatus === 'ACTIVE' ? theme.successText : theme.errorText, fontSize: '0.85rem', fontWeight: 'bold' }}>
                        {member.leaderStatus === 'ACTIVE' ? '✅ Líder Activo' : `⚠️ ${member.leaderStatusDisplay}`}
                      </span>
                    </td>
                    <td>
                      <span className="leaders-page__status-badge" style={{ 
                        backgroundColor: `${WORSHIP_STATUS_MAP[member.worshipStatus]?.color || '#6b7280'}20`, 
                        color: WORSHIP_STATUS_MAP[member.worshipStatus]?.color || '#6b7280' 
                      }}>
                        {WORSHIP_STATUS_MAP[member.worshipStatus]?.icon} {WORSHIP_STATUS_MAP[member.worshipStatus]?.label}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <style>{`.hover-highlight:hover { background-color: ${isDarkMode ? '#1e293b' : '#f1f5f9'} !important; }`}</style>
    </>
  );

  const renderRolesTab = () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
      {roles.map(role => (
        <div key={role.id} style={{ 
          padding: '1.25rem', 
          backgroundColor: theme.bgSecondary, 
          border: `1px solid ${theme.border}`, 
          borderRadius: '12px', 
          display: 'flex', 
          flexDirection: 'column', 
          justifyContent: 'space-between', 
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)' 
        }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: theme.text }}>{role.name}</h3>
              <span style={{ 
                fontSize: '0.7rem', 
                padding: '0.2rem 0.5rem', 
                borderRadius: '10px', 
                backgroundColor: role.active ? `${theme.successText}20` : `${theme.textSecondary}20`, 
                color: role.active ? theme.successText : theme.textSecondary, 
                fontWeight: 'bold' 
              }}>
                {role.active ? 'Activo' : 'Inactivo'}
              </span>
            </div>
            <p style={{ margin: '0 0 1rem 0', fontSize: '0.85rem', color: theme.textSecondary, minHeight: '2.5rem' }}>
              {role.description || "Sin descripción."}
            </p>
          </div>
          {canManageWorship && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', borderTop: `1px solid ${theme.border}`, paddingTop: '0.75rem' }}>
              <button 
                onClick={() => openRoleModal(role)} 
                style={{ background: 'none', border: 'none', color: theme.primary, cursor: 'pointer', fontSize: '0.9rem', fontWeight: '500' }}
              >
                ✏️ Editar
              </button>
              <button 
                onClick={() => handleDeleteRole(role.id, role.name)} 
                style={{ background: 'none', border: 'none', color: theme.danger, cursor: 'pointer', fontSize: '0.9rem', fontWeight: '500' }}
              >
                🗑️ Eliminar
              </button>
            </div>
          )}
        </div>
      ))}
      {roles.length === 0 && !loading && (
        <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', color: theme.textSecondary }}>
          No hay instrumentos configurados.
        </div>
      )}
    </div>
  );

  const renderScheduleTab = () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
      {events.length === 0 ? (
        <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', color: theme.textSecondary, backgroundColor: theme.bgSecondary, borderRadius: '12px' }}>
          <h3>No hay eventos programados</h3>
          <p>Crea tu primer culto para empezar a asignar a tu equipo.</p>
        </div>
      ) : (
        events.map(event => {
          const dateObj = new Date(event.eventDate);
          return (
            <div 
              key={event.id} 
              style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                backgroundColor: theme.bgSecondary, 
                border: `1px solid ${theme.border}`, 
                borderRadius: '12px', 
                overflow: 'hidden', 
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' 
              }}
            >
              <div style={{ padding: '1.25rem', borderBottom: `1px solid ${theme.border}`, backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                  <h3 style={{ margin: 0, color: theme.text, fontSize: '1.1rem' }}>{event.name}</h3>
                  <span style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', borderRadius: '12px', backgroundColor: `${theme.primary}20`, color: theme.primary, fontWeight: 'bold', textAlign: 'right' }}>
                    {EVENT_TYPES[event.eventType] || event.eventType}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: theme.textSecondary, fontSize: '0.9rem' }}>
                  📅 {dateObj.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}<br/>
                  ⏰ {dateObj.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                </div>
                {event.description && (
                  <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: theme.textSecondary, fontStyle: 'italic' }}>
                    {event.description}
                  </div>
                )}
              </div>
              <div style={{ padding: '1.25rem', flexGrow: 1 }}>
                <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: '1px' }}>
                  Equipo Asignado ({event.assignments?.length || 0})
                </h4>
                {(!event.assignments || event.assignments.length === 0) ? (
                  <p style={{ margin: 0, fontSize: '0.85rem', color: theme.warning, fontStyle: 'italic' }}>
                    Sin músicos asignados aún.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {event.assignments.map(assignment => (
                      <div key={assignment.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem', backgroundColor: theme.bg, borderRadius: '8px', border: `1px solid ${theme.border}` }}>
                        <div style={{ 
                          width: '30px', 
                          height: '30px', 
                          borderRadius: '50%', 
                          backgroundColor: `${theme.primary}20`, 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          fontSize: '0.8rem' 
                        }}>
                          {assignment.assignedRole?.name?.charAt(0) || "👤"}
                        </div>
                        <div>
                          <div style={{ fontSize: '0.9rem', fontWeight: '500', color: theme.text }}>
                            {getDisplayName(assignment.worshipTeamMember?.leader?.member?.name || 'Músico')}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: theme.primary, fontWeight: 'bold' }}>
                            {assignment.assignedRole?.name}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {canManageWorship && (
                <div style={{ padding: '1rem', borderTop: `1px solid ${theme.border}`, display: 'flex', gap: '0.5rem', backgroundColor: theme.bg }}>
                  <button 
                    onClick={() => openEventModal(event)} 
                    style={{ 
                      flex: 1, 
                      padding: '0.6rem', 
                      borderRadius: '6px', 
                      border: `1px solid ${theme.border}`, 
                      backgroundColor: theme.bgSecondary, 
                      color: theme.text, 
                      cursor: 'pointer', 
                      fontWeight: '500', 
                      fontSize: '0.85rem' 
                    }}
                  >
                    ✏️ Editar y Asignar
                  </button>
                  <button 
                    onClick={() => handleAssignAllToEvent(event.id, event.name)} 
                    style={{ 
                      flex: 1, 
                      padding: '0.6rem', 
                      borderRadius: '6px', 
                      background: `${theme.primary}15`, 
                      color: theme.primary, 
                      border: 'none', 
                      fontWeight: 'bold', 
                      cursor: 'pointer', 
                      fontSize: '0.85rem' 
                    }}
                  >
                    👥 Citar a Todos
                  </button>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );

  // =========================================================================
  // MAIN RENDER (CONTENEDOR GLOBAL)
  // =========================================================================

  return (
    <div className="leaders-page" style={{ backgroundColor: theme.bg, color: theme.text, minHeight: '100vh', transition: "all 0.3s ease" }}>
      <div className="leaders-page-container">
        
        {/* HEADER */}
        <div className="leaders-page__header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <h1>🎸 Ministerio de Alabanza</h1>
            {user && (
              <div className="user-role-badge" style={{ backgroundColor: theme.bgSecondary, padding: '0.5rem 1rem', borderRadius: '20px', fontSize: '0.9rem', border: `1px solid ${theme.border}` }}>
                <span>👤 {user.username || user.name}</span>
                <span style={{ 
                  backgroundColor: canManageWorship ? '#8b5cf6' : '#4299e1', 
                  color: 'white', 
                  padding: '0.2rem 0.5rem', 
                  borderRadius: '12px', 
                  marginLeft: '0.5rem', 
                  fontSize: '0.8rem', 
                  fontWeight: 'bold' 
                }}>
                  {canManageWorship ? '🎵 Director' : '👁️ Visor'}
                </span>
              </div>
            )}
          </div>
          <p>Gestiona el equipo, configura instrumentos y programa el cronograma mensual automáticamente.</p>
        </div>

        {/* MENSAJES GLOBALES */}
        {error && <div className="leaders-page__error" style={{ backgroundColor: theme.errorBg, color: theme.errorText }}>❌ {error}</div>}
        {successMessage && <div className="leaders-page__success" style={{ backgroundColor: theme.successBg, color: theme.successText }}>{successMessage}</div>}

        {/* TABS NAVIGATION */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: `2px solid ${theme.border}`, paddingBottom: '0.5rem', overflowX: 'auto' }}>
          {[
            { id: "SCHEDULE", label: "📅 Programación", count: events.length },
            { id: "TEAM", label: "👥 Equipo", count: teamMembers.length },
            { id: "ROLES", label: "🎹 Instrumentos", count: roles.length }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                background: 'none', 
                border: 'none', 
                padding: '0.5rem 1rem', 
                fontSize: '1rem',
                fontWeight: activeTab === tab.id ? 'bold' : 'normal',
                color: activeTab === tab.id ? theme.primary : theme.textSecondary,
                borderBottom: activeTab === tab.id ? `3px solid ${theme.primary}` : 'none',
                cursor: 'pointer', 
                marginBottom: '-0.65rem', 
                whiteSpace: 'nowrap'
              }}
            >
              {tab.label} {tab.count !== undefined && <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>({tab.count})</span>}
            </button>
          ))}
        </div>

        {/* CONTROLES GLOBALES DE LA PESTAÑA ACTIVA */}
        <div className="leaders-page__controls" style={{ marginBottom: '1.5rem' }}>
          <div className="leaders-page__actions" style={{ width: '100%', justifyContent: 'flex-start' }}>
            
            {activeTab === "SCHEDULE" && canManageWorship && (
              <>
                <button className="leaders-page__btn leaders-page__btn--primary" onClick={() => openEventModal()}>
                  ➕ Nuevo Evento
                </button>
                <button className="leaders-page__btn" style={{ backgroundColor: '#8b5cf6', color: 'white', border: 'none' }} onClick={openAutoSuggestModal}>
                  ✨ Auto-Programar Equipo
                </button>
              </>
            )}

            {activeTab === "TEAM" && canManageWorship && (
              <button className="leaders-page__btn leaders-page__btn--primary" onClick={handleOpenAddMemberModal}>
                ➕ Añadir Adorador
              </button>
            )}

            {activeTab === "ROLES" && canManageWorship && (
              <button className="leaders-page__btn leaders-page__btn--primary" onClick={() => openRoleModal()}>
                ➕ Nuevo Instrumento
              </button>
            )}

            <button className="leaders-page__btn leaders-page__btn--refresh" onClick={loadData} disabled={loading} style={{ marginLeft: 'auto' }}>
              🔄 Recargar
            </button>
          </div>
        </div>

        {/* CONTENIDO PRINCIPAL */}
        {loading && teamMembers.length === 0 ? (
          <div className="leaders-page__loading" style={{ color: theme.text }}>⏳ Cargando datos...</div>
        ) : (
          <>
            {activeTab === "SCHEDULE" && renderScheduleTab()}
            {activeTab === "TEAM" && renderTeamTab()}
            {activeTab === "ROLES" && renderRolesTab()}
          </>
        )}
      </div>

      {/* =========================================================
          MODALES
      ========================================================= */}

      {/* MODAL: DETALLE Y GESTIÓN DEL PARTICIPANTE */}
      {showMemberDetailModal && selectedMember && (
        <div className="leaders-page__modal-overlay" style={{ backgroundColor: 'rgba(0,0,0,0.6)', position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="leaders-page__modal" style={{ backgroundColor: theme.bgSecondary, padding: '0', borderRadius: '12px', width: '100%', maxWidth: '500px', border: `1px solid ${theme.border}`, overflow: 'hidden', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            
            <div style={{ backgroundColor: theme.primary, padding: '2rem 1.5rem', color: 'white', position: 'relative', flexShrink: 0 }}>
              <button onClick={() => setShowMemberDetailModal(false)} style={{ position: 'absolute', top: '10px', right: '15px', background: 'none', border: 'none', fontSize: '1.5rem', color: 'white', opacity: 0.8, cursor: 'pointer' }}>
                ✕
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ fontSize: '3rem', backgroundColor: 'rgba(255,255,255,0.2)', width: '70px', height: '70px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%' }}>
                  {selectedMember.primaryRole?.name?.charAt(0) || "🎤"}
                </div>
                <div>
                  <h2 style={{ margin: '0 0 0.25rem 0' }}>{getDisplayName(selectedMember.memberName)}</h2>
                  <span style={{ fontSize: '0.9rem', opacity: 0.9 }}>{selectedMember.primaryRole?.name || selectedMember.primaryRoleDisplay}</span>
                </div>
              </div>
            </div>

            <div style={{ padding: '1.5rem', overflowY: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: theme.textSecondary, textTransform: 'uppercase' }}>Estado Espiritual</label>
                  <div style={{ fontWeight: '500', color: selectedMember.leaderStatus === 'ACTIVE' ? theme.successText : theme.errorText }}>
                    {selectedMember.leaderStatus === 'ACTIVE' ? '✅ Líder Activo' : `⚠️ ${selectedMember.leaderStatusDisplay}`}
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: theme.textSecondary, textTransform: 'uppercase' }}>Ingreso al equipo</label>
                  <div style={{ fontWeight: '500', color: theme.text }}>{new Date(selectedMember.joinedWorshipDate).toLocaleDateString()}</div>
                </div>
              </div>

              {canManageWorship ? (
                <form onSubmit={handleMemberUpdateSubmit} style={{ borderTop: `1px solid ${theme.border}`, paddingTop: '1.5rem' }}>
                  <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: theme.text }}>⚙️ Gestionar Perfil y Roles</h3>
                  
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: theme.textSecondary }}>Instrumento Principal *</label>
                    <select 
                      required 
                      value={memberEditData.primaryRoleId} 
                      onChange={(e) => setMemberEditData({...memberEditData, primaryRoleId: e.target.value})}
                      style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: `1px solid ${theme.border}`, backgroundColor: theme.bg, color: theme.text }}
                    >
                      <option value="">-- Seleccionar --</option>
                      {roles.filter(r => r.active || r.id.toString() === memberEditData.primaryRoleId.toString()).map(r => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                  </div>

                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: theme.textSecondary }}>Otras habilidades (Opcional)</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', backgroundColor: theme.bg, padding: '0.75rem', borderRadius: '6px', border: `1px solid ${theme.border}`, maxHeight: '120px', overflowY: 'auto' }}>
                      {roles.filter(r => (r.active || memberEditData.skills.includes(r.id)) && r.id.toString() !== memberEditData.primaryRoleId.toString()).map(role => (
                        <label key={role.id} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: theme.text, cursor: 'pointer' }}>
                          <input 
                            type="checkbox" 
                            checked={memberEditData.skills.includes(role.id)} 
                            onChange={() => handleEditSkillToggle(role.id)} 
                          /> 
                          {role.name}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: theme.textSecondary }}>Estado Técnico/Musical</label>
                    <select 
                      value={memberEditData.status} 
                      onChange={(e) => setMemberEditData({...memberEditData, status: e.target.value})}
                      style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: `1px solid ${theme.border}`, backgroundColor: theme.bg, color: theme.text }}
                    >
                      <option value="ACTIVE">✅ Activo (Disponible para tocar)</option>
                      <option value="SUSPENDED">⏸️ Suspendido Temporalmente</option>
                      <option value="INACTIVE">⏹️ Inactivo (No cuenta para eventos)</option>
                    </select>
                  </div>

                  <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: theme.textSecondary }}>Notas del Director</label>
                    <textarea 
                      value={memberEditData.notes} 
                      onChange={(e) => setMemberEditData({...memberEditData, notes: e.target.value})}
                      placeholder="Ej: Suspendido por viaje hasta el mes de..." 
                      rows="2"
                      style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: `1px solid ${theme.border}`, backgroundColor: theme.bg, color: theme.text, resize: 'vertical' }}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <button type="button" onClick={handleRemoveFromTeam} style={{ background: 'none', border: 'none', color: theme.danger, cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold' }}>
                      🗑️ Retirar del Equipo
                    </button>
                    <button type="submit" disabled={loading} style={{ background: theme.primary, color: 'white', border: 'none', padding: '0.5rem 1.25rem', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                      Guardar Cambios
                    </button>
                  </div>
                </form>
              ) : (
                <div style={{ padding: '1rem', backgroundColor: theme.bg, borderRadius: '8px', color: theme.textSecondary, fontSize: '0.85rem' }}>
                  Solo los directores de alabanza y pastores pueden editar esta información.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: NUEVO/EDITAR EVENTO (SCHEDULE) CON EDICIÓN DE ASIGNACIONES */}
      {showEventModal && (
        <div className="leaders-page__modal-overlay" style={{ backgroundColor: 'rgba(0,0,0,0.6)', position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="leaders-page__modal" style={{ backgroundColor: theme.bgSecondary, padding: '2rem', borderRadius: '12px', width: '100%', maxWidth: '550px', border: `1px solid ${theme.border}`, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, color: theme.text }}>{editingEvent ? "✏️ Editar Evento" : "➕ Programar Evento"}</h2>
              <button onClick={() => setShowEventModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', color: theme.textSecondary, cursor: 'pointer' }}>✕</button>
            </div>
            
            <form onSubmit={handleSaveEvent}>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: theme.text }}>Nombre del Evento *</label>
                <input 
                  type="text" 
                  required 
                  value={eventFormData.name} 
                  onChange={(e) => setEventFormData({...eventFormData, name: e.target.value})}
                  placeholder="Ej: Culto Dominical 1er Servicio" 
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: `1px solid ${theme.border}`, backgroundColor: theme.bg, color: theme.text, boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: theme.text }}>Tipo *</label>
                  <select 
                    value={eventFormData.type} 
                    onChange={(e) => setEventFormData({...eventFormData, type: e.target.value})} 
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: `1px solid ${theme.border}`, backgroundColor: theme.bg, color: theme.text }}
                  >
                    {Object.entries(EVENT_TYPES).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: theme.text }}>Fecha y Hora *</label>
                  <input 
                    type="datetime-local" 
                    required 
                    value={eventFormData.date} 
                    onChange={(e) => setEventFormData({...eventFormData, date: e.target.value})} 
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: `1px solid ${theme.border}`, backgroundColor: theme.bg, color: theme.text, boxSizing: 'border-box' }} 
                  />
                </div>
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: theme.text }}>Descripción</label>
                <textarea 
                  value={eventFormData.description} 
                  onChange={(e) => setEventFormData({...eventFormData, description: e.target.value})} 
                  placeholder="Ej: Servicio de Santa Cena..." 
                  rows="2" 
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: `1px solid ${theme.border}`, backgroundColor: theme.bg, color: theme.text, boxSizing: 'border-box', resize: 'vertical' }} 
                />
              </div>
              
              {/* PANEL DE EDICIÓN DE ASIGNACIONES (MÚSICOS) */}
              <div style={{ borderTop: `1px solid ${theme.border}`, paddingTop: '1.5rem', marginBottom: '2rem' }}>
                <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: theme.text }}>👥 Músicos Asignados</h3>
                {eventFormData.assignments.length === 0 ? (
                  <p style={{ fontSize: '0.85rem', color: theme.textSecondary, fontStyle: 'italic' }}>
                    Sin músicos asignados. Usa el botón abajo para añadir uno por uno, o usa "Auto-Programar" desde fuera.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {eventFormData.assignments.map((assignment, index) => {
                      const eligibleMembers = getEligibleMembersForRole(assignment.roleId);
                      return (
                        <div key={index} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', backgroundColor: theme.bg, padding: '0.5rem', borderRadius: '8px', border: `1px solid ${theme.border}` }}>
                          <select 
                            value={assignment.roleId} 
                            onChange={(e) => handleAssignmentChange(index, 'roleId', e.target.value)}
                            style={{ flex: 1, padding: '0.5rem', borderRadius: '6px', border: `1px solid ${theme.border}`, backgroundColor: theme.bgSecondary, color: theme.text, fontSize: '0.85rem' }}
                          >
                            <option value="">-- Instrumento --</option>
                            {roles.filter(r => r.active || r.id.toString() === assignment.roleId).map(r => (
                              <option key={r.id} value={r.id}>{r.name}</option>
                            ))}
                          </select>
                          
                          <select 
                            value={assignment.memberId} 
                            onChange={(e) => handleAssignmentChange(index, 'memberId', e.target.value)} 
                            disabled={!assignment.roleId}
                            style={{ flex: 1, padding: '0.5rem', borderRadius: '6px', border: `1px solid ${theme.border}`, backgroundColor: assignment.roleId ? theme.bgSecondary : theme.bg, color: theme.text, fontSize: '0.85rem' }}
                          >
                            <option value="">-- Músico --</option>
                            {eligibleMembers.map(m => (
                              <option key={m.id} value={m.id}>{getDisplayName(m.memberName)}</option>
                            ))}
                            {/* Si el músico original ya no es activo o se le quitó el rol, lo mantenemos en la lista temporalmente para no romper la UI */}
                            {assignment.memberId && !eligibleMembers.find(m => m.id.toString() === assignment.memberId) && (
                              <option value={assignment.memberId} disabled>👤 Músico no disponible</option>
                            )}
                          </select>

                          <button 
                            type="button" 
                            onClick={() => handleRemoveAssignmentRow(index)} 
                            style={{ background: 'none', border: 'none', color: theme.danger, cursor: 'pointer', fontSize: '1rem', padding: '0.5rem' }} 
                            title="Quitar Músico"
                          >
                            ✖
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
                <button 
                  type="button" 
                  onClick={handleAddAssignmentRow} 
                  style={{ marginTop: '0.75rem', background: 'none', border: `1px dashed ${theme.primary}`, color: theme.primary, padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem', width: '100%', fontWeight: '500' }}
                >
                  ➕ Añadir Músico Manualmente
                </button>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: `1px solid ${theme.border}`, paddingTop: '1.5rem' }}>
                {editingEvent ? (
                  <button 
                    type="button" 
                    onClick={() => handleDeleteEvent(editingEvent.id)} 
                    style={{ background: 'none', border: 'none', color: theme.danger, cursor: 'pointer', fontSize: '0.9rem', fontWeight: 'bold' }}
                  >
                    🗑️ Eliminar Culto
                  </button>
                ) : ( <div></div> )}
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button 
                    type="button" 
                    onClick={() => setShowEventModal(false)} 
                    style={{ background: 'none', border: `1px solid ${theme.border}`, color: theme.text, padding: '0.6rem 1.5rem', borderRadius: '6px', cursor: 'pointer' }}
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    disabled={loading} 
                    style={{ background: theme.primary, color: 'white', border: 'none', padding: '0.6rem 1.5rem', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                  >
                    Guardar Todo
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: AUTO-SUGGEST */}
      {showAutoSuggestModal && (
        <div className="leaders-page__modal-overlay" style={{ backgroundColor: 'rgba(0,0,0,0.6)', position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="leaders-page__modal" style={{ backgroundColor: theme.bgSecondary, padding: '2rem', borderRadius: '12px', width: '100%', maxWidth: '600px', border: `1px solid ${theme.border}`, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <span style={{ fontSize: '3rem' }}>✨</span>
              <h2 style={{ margin: '0.5rem 0', color: theme.text }}>Auto-Programar Equipo</h2>
              <p style={{ margin: 0, color: theme.textSecondary, fontSize: '0.9rem' }}>
                El algoritmo buscará músicos disponibles y los asignará rotando equitativamente.
              </p>
            </div>
            
            <div style={{ marginBottom: '2rem', backgroundColor: theme.bg, padding: '1rem', borderRadius: '8px', border: `1px solid ${theme.border}` }}>
              <h4 style={{ margin: '0 0 1rem 0', color: theme.primary }}>1. Selecciona los eventos a programar</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '150px', overflowY: 'auto' }}>
                {events.filter(e => !e.assignments || e.assignments.length === 0).length === 0 ? (
                  <p style={{ fontSize: '0.85rem', color: theme.warning }}>
                    Todos los eventos ya tienen equipo asignado o no hay eventos futuros.
                  </p>
                ) : (
                  events.filter(e => !e.assignments || e.assignments.length === 0).map(event => {
                    const d = new Date(event.eventDate);
                    return (
                      <label key={event.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: theme.text, fontSize: '0.9rem' }}>
                        <input 
                          type="checkbox" 
                          checked={autoSuggestData.selectedEvents.includes(event.id)} 
                          onChange={() => handleToggleEventSelection(event.id)} 
                        />
                        <strong>{event.name}</strong> - {d.toLocaleDateString()}
                      </label>
                    );
                  })
                )}
              </div>
            </div>
            
            <div style={{ marginBottom: '2rem', backgroundColor: theme.bg, padding: '1rem', borderRadius: '8px', border: `1px solid ${theme.border}` }}>
              <h4 style={{ margin: '0 0 1rem 0', color: '#8b5cf6' }}>2. ¿Qué instrumentos necesitas en cada evento?</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                {roles.filter(r => r.active).map(role => (
                  <div key={role.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.9rem', color: theme.text }}>{role.name}</span>
                    <input 
                      type="number" 
                      min="0" 
                      max="10" 
                      value={autoSuggestData.requiredRoles[role.id] || 0} 
                      onChange={(e) => handleRequirementChange(role.id, e.target.value)} 
                      style={{ width: '60px', padding: '0.4rem', borderRadius: '6px', border: `1px solid ${theme.border}`, backgroundColor: theme.bgSecondary, color: theme.text, textAlign: 'center' }} 
                    />
                  </div>
                ))}
              </div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <button 
                type="button" 
                onClick={() => setShowAutoSuggestModal(false)} 
                style={{ background: 'none', border: `1px solid ${theme.border}`, color: theme.text, padding: '0.6rem 1.5rem', borderRadius: '6px', cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button 
                type="button" 
                onClick={handleExecuteAutoSuggest} 
                disabled={loading} 
                style={{ background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)', color: 'white', border: 'none', padding: '0.6rem 1.5rem', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                {loading ? 'Procesando...' : 'Ejecutar Algoritmo'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL AÑADIR ADORADOR */}
      {showAddMemberModal && (
        <div className="leaders-page__modal-overlay" style={{ backgroundColor: 'rgba(0,0,0,0.6)', position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="leaders-page__modal" style={{ backgroundColor: theme.bgSecondary, padding: '2rem', borderRadius: '12px', width: '100%', maxWidth: '500px', border: `1px solid ${theme.border}`, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, color: theme.text }}>➕ Añadir Adorador</h2>
              <button onClick={() => setShowAddMemberModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', color: theme.textSecondary, cursor: 'pointer' }}>✕</button>
            </div>
            
            {availableLeaders.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', backgroundColor: theme.bg, borderRadius: '8px', color: theme.textSecondary }}>
                <p>No hay líderes activos disponibles.</p>
              </div>
            ) : (
              <form onSubmit={handleAddMemberSubmit}>
                <div style={{ marginBottom: '1.25rem', position: 'relative' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: theme.text }}>Seleccionar Líder *</label>
                  <input 
                    type="text" 
                    placeholder="Escribe el nombre para buscar..." 
                    value={leaderSearchText} 
                    onChange={(e) => { 
                      setLeaderSearchText(e.target.value); 
                      setNewMemberData({ ...newMemberData, memberId: "" }); 
                      setShowLeaderDropdown(true); 
                    }} 
                    onFocus={() => setShowLeaderDropdown(true)} 
                    onBlur={() => setTimeout(() => setShowLeaderDropdown(false), 200)} 
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: `1px solid ${theme.border}`, backgroundColor: theme.bg, color: theme.text }} 
                  />
                  {showLeaderDropdown && (
                    <ul style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, backgroundColor: theme.bgSecondary, border: `1px solid ${theme.border}`, borderRadius: '6px', maxHeight: '180px', overflowY: 'auto', listStyle: 'none', padding: 0, margin: '0.25rem 0 0 0', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}>
                      {filteredAvailableLeaders.length > 0 ? (
                        filteredAvailableLeaders.map(l => (
                          <li 
                            key={l.id} 
                            onClick={() => { 
                              setNewMemberData({ ...newMemberData, memberId: l.memberId }); 
                              setLeaderSearchText(`${getDisplayName(l.memberName)} (${l.leaderType})`); 
                              setShowLeaderDropdown(false); 
                            }} 
                            style={{ padding: '0.6rem 0.8rem', cursor: 'pointer', borderBottom: `1px solid ${theme.border}`, color: theme.text, fontSize: '0.9rem' }} 
                            onMouseEnter={(e) => e.target.style.backgroundColor = theme.bg} 
                            onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                          >
                            <strong>{getDisplayName(l.memberName)}</strong> <span style={{ color: theme.textSecondary, fontSize: '0.8rem' }}>({l.leaderType})</span>
                          </li>
                        ))
                      ) : ( 
                        <li style={{ padding: '0.6rem 0.8rem', color: theme.textSecondary, fontSize: '0.9rem' }}>No se encontraron coincidencias...</li> 
                      )}
                    </ul>
                  )}
                </div>
                
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: theme.text }}>Instrumento Principal *</label>
                  <select 
                    required 
                    value={newMemberData.primaryRoleId} 
                    onChange={(e) => setNewMemberData({...newMemberData, primaryRoleId: e.target.value})} 
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: `1px solid ${theme.border}`, backgroundColor: theme.bg, color: theme.text }}
                  >
                    <option value="">-- Seleccione el instrumento fuerte --</option>
                    {roles.filter(r => r.active).map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>
                
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: theme.text }}>Otras habilidades (Opcional)</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', backgroundColor: theme.bg, padding: '1rem', borderRadius: '6px', border: `1px solid ${theme.border}` }}>
                    {roles.filter(r => r.active && r.id.toString() !== newMemberData.primaryRoleId).map(role => (
                      <label key={role.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: theme.text, cursor: 'pointer' }}>
                        <input 
                          type="checkbox" 
                          checked={newMemberData.skills.includes(role.id)} 
                          onChange={() => handleSkillToggle(role.id)} 
                        /> 
                        {role.name}
                      </label>
                    ))}
                  </div>
                </div>
                
                <div style={{ marginBottom: '2rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: theme.text }}>Notas (Opcional)</label>
                  <textarea 
                    value={newMemberData.notes} 
                    onChange={(e) => setNewMemberData({...newMemberData, notes: e.target.value})} 
                    rows="2" 
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: `1px solid ${theme.border}`, backgroundColor: theme.bg, color: theme.text, resize: 'vertical' }} 
                  />
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', borderTop: `1px solid ${theme.border}`, paddingTop: '1.5rem' }}>
                  <button 
                    type="button" 
                    onClick={() => setShowAddMemberModal(false)} 
                    style={{ background: 'none', border: `1px solid ${theme.border}`, color: theme.text, padding: '0.6rem 1.5rem', borderRadius: '6px', cursor: 'pointer' }}
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    disabled={loading} 
                    style={{ background: theme.primary, color: 'white', border: 'none', padding: '0.6rem 1.5rem', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                  >
                    {loading ? 'Guardando...' : 'Añadir al Equipo'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* CRUD DE ROLES */}
      {showRoleModal && (
        <div className="leaders-page__modal-overlay" style={{ backgroundColor: 'rgba(0,0,0,0.6)', position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="leaders-page__modal" style={{ backgroundColor: theme.bgSecondary, padding: '2rem', borderRadius: '12px', width: '100%', maxWidth: '450px', border: `1px solid ${theme.border}`, boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, color: theme.text }}>{editingRole ? '✏️ Editar Instrumento' : '➕ Nuevo Instrumento'}</h2>
              <button onClick={() => setShowRoleModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', color: theme.textSecondary, cursor: 'pointer' }}>✕</button>
            </div>
            
            <form onSubmit={handleSaveRole}>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: theme.text }}>Elige un ícono</label>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', backgroundColor: theme.bg, padding: '0.75rem', borderRadius: '8px', border: `1px solid ${theme.border}` }}>
                  {ROLE_ICONS.map(emoji => (
                    <button 
                      key={emoji} 
                      type="button" 
                      onClick={() => setRoleFormData({...roleFormData, icon: emoji})}
                      style={{ 
                        fontSize: '1.25rem', 
                        padding: '0.25rem', 
                        border: 'none', 
                        backgroundColor: roleFormData.icon === emoji ? `${theme.primary}40` : 'transparent', 
                        borderRadius: '6px', 
                        cursor: 'pointer', 
                        transform: roleFormData.icon === emoji ? 'scale(1.2)' : 'scale(1)', 
                        transition: 'transform 0.1s' 
                      }}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
              
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: theme.text }}>Nombre del Instrumento/Rol *</label>
                <div style={{ display: 'flex', alignItems: 'stretch' }}>
                  <div style={{ padding: '0.75rem', backgroundColor: theme.bg, border: `1px solid ${theme.border}`, borderRight: 'none', borderRadius: '6px 0 0 6px', fontSize: '1.2rem', display: 'flex', alignItems: 'center' }}>
                    {roleFormData.icon}
                  </div>
                  <input 
                    type="text" 
                    required 
                    maxLength="50" 
                    value={roleFormData.name} 
                    onChange={(e) => setRoleFormData({...roleFormData, name: e.target.value})} 
                    placeholder="Ej: Violín, Batería, Coro..." 
                    style={{ flex: 1, padding: '0.75rem', borderRadius: '0 6px 6px 0', border: `1px solid ${theme.border}`, backgroundColor: theme.bg, color: theme.text, boxSizing: 'border-box' }} 
                  />
                </div>
              </div>
              
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: theme.text }}>Descripción</label>
                <textarea 
                  maxLength="255" 
                  value={roleFormData.description} 
                  onChange={(e) => setRoleFormData({...roleFormData, description: e.target.value})} 
                  rows="2" 
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: `1px solid ${theme.border}`, backgroundColor: theme.bg, color: theme.text, boxSizing: 'border-box', resize: 'vertical' }} 
                />
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
                <input 
                  type="checkbox" 
                  id="activeCheck" 
                  checked={roleFormData.active} 
                  onChange={(e) => setRoleFormData({...roleFormData, active: e.target.checked})} 
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }} 
                />
                <label htmlFor="activeCheck" style={{ cursor: 'pointer', color: theme.text }}>
                  Instrumento Activo 
                  <span style={{ display: 'block', fontSize: '0.8rem', color: theme.textSecondary }}>
                    Si se desactiva, no se podrá usar.
                  </span>
                </label>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', borderTop: `1px solid ${theme.border}`, paddingTop: '1.5rem' }}>
                <button 
                  type="button" 
                  onClick={() => setShowRoleModal(false)} 
                  style={{ background: 'none', border: `1px solid ${theme.border}`, color: theme.text, padding: '0.6rem 1.5rem', borderRadius: '6px', cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={loading} 
                  style={{ background: theme.primary, color: 'white', border: 'none', padding: '0.6rem 1.5rem', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default WorshipPage;