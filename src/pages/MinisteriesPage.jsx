import React, { useState, useEffect, useCallback, useMemo } from "react";
import apiService from "../apiService";
import nameHelper from "../services/nameHelper";
import { useAuth } from "../context/AuthContext";
import {
  Users,
  Crown,
  Search,
  RefreshCcw,
  Activity,
  Building2,
  Network,
  Plus,
  CheckCircle2,
  Ghost,
  X,
  Settings2,
  UserPlus,
  AlertCircle,
  Edit,
  Trash2,
  CalendarDays,
  CalendarClock,
  Share2,
  ClipboardCheck,
} from "lucide-react";

const { getDisplayName } = nameHelper;

// --- 🛠️ HELPERS PARA CORREGIR FECHAS JS vs SPRING BOOT ---
const parseSafeDate = (dateVal) => {
  if (!dateVal) return new Date();
  // Si Spring Boot lo mandó como Array: [2026, 4, 18, 19, 0]
  if (Array.isArray(dateVal)) {
    const [y, m, day, h = 0, min = 0, s = 0] = dateVal;
    return new Date(y, m - 1, day, h, min, s);
  }
  // Si lo mandó como String
  return new Date(dateVal);
};

const formatEventDateStr = (dateVal) => {
  const d = parseSafeDate(dateVal);
  return d.toLocaleString("es-ES", {
    weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit",
  });
};
// ---------------------------------------------------------

const MinisteriesPage = () => {
  const { hasAnyRole } = useAuth();
  const canManage = hasAnyRole(["ROLE_PASTORES", "ROLE_DESPLIEGUE"]);
  const isPastor = hasAnyRole(["ROLE_PASTORES"]);

  const MINISTERY_LEVEL_CONFIG = {
    LEVEL_1: {
      label: "Nivel 1",
      icon: <Users size={20} />,
      gradient: "from-blue-500/20 to-cyan-600/20",
      iconColor: "text-blue-600",
      accent: "bg-blue-600",
    },
    LEVEL_2: {
      label: "Nivel 2",
      icon: <Network size={20} />,
      gradient: "from-indigo-500/20 to-purple-600/20",
      iconColor: "text-indigo-600",
      accent: "bg-indigo-600",
    },
    LEVEL_3: {
      label: "Nivel 3",
      icon: <Crown size={20} />,
      gradient: "from-amber-500/20 to-orange-600/20",
      iconColor: "text-amber-600",
      accent: "bg-amber-500",
    },
  };

  const TEAM_STATUS_CONFIG = {
    ACTIVE: {
      label: "Activo",
      textColor: "text-emerald-700",
      bgColor: "bg-emerald-50",
      dotColor: "bg-emerald-500",
      border: "border-emerald-200",
    },
    SUSPENDED: {
      label: "Suspendido",
      textColor: "text-amber-700",
      bgColor: "bg-amber-50",
      dotColor: "bg-amber-500",
      border: "border-amber-200",
    },
    INACTIVE: {
      label: "Inactivo",
      textColor: "text-slate-500",
      bgColor: "bg-slate-100",
      dotColor: "bg-slate-400",
      border: "border-slate-200",
    },
  };

  const [activeTab, setActiveTab] = useState("TEAMS");
  const [teams, setTeams] = useState([]);
  const [ministeries, setMinisteries] = useState([]);
  const [leaders, setLeaders] = useState([]);
  const [events, setEvents] = useState([]);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [success, setSuccess] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    status: "ALL",
    level: "ALL",
    ministeryId: "ALL",
  });
  const [scheduleMinisteryId, setScheduleMinisteryId] = useState("");

  const [modals, setModals] = useState({
    assign: false,
    ministery: false,
    role: false,
    statusUpdate: false,
    eventCreate: false,
    eventAssign: false,
    eventAttendance: false, // <-- Añadido eventAttendance
  });

  const [isEditing, setIsEditing] = useState(false);
  const [isEditingTeam, setIsEditingTeam] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedMinisteryId, setSelectedMinisteryId] = useState("");

  const defaultForm = {
    name: "",
    description: "",
    leaderId: "",
    level: "LEVEL_1",
    roleIds: [],
    active: true,
  };
  const [formData, setFormData] = useState(defaultForm);
  const [eventAssignments, setEventAssignments] = useState({});

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [teamsData, ministeriesData, leadersData] = await Promise.all([
        apiService.getMinisteryTeams(),
        apiService.getMinisteries(),
        canManage ? apiService.getActiveLeaders() : Promise.resolve([]),
      ]);
      setTeams(teamsData || []);
      setMinisteries(ministeriesData || []);
      setLeaders(leadersData || []);
    } catch (err) {
      console.error(err);
      alert("Error al cargar los datos base del sistema.");
    } finally {
      setLoading(false);
    }
  }, [canManage]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (
      activeTab === "SCHEDULE" &&
      scheduleMinisteryId &&
      scheduleMinisteryId !== "ALL"
    ) {
      loadEvents(scheduleMinisteryId);
    } else {
      setEvents([]);
    }
  }, [activeTab, scheduleMinisteryId]);

  const loadEvents = async (minId) => {
    try {
      setLoading(true);
      const data = await apiService.getMinisteryEvents(minId);
      setEvents(data || []);
    } catch (err) {
      console.error("Error cargando eventos", err);
    } finally {
      setLoading(false);
    }
  };

  const showSuccess = (msg) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(""), 4000);
  };

  // ==========================================
  // CRUD MINISTERIOS & ROLES & EQUIPOS
  // ==========================================
  const openMinisteryModal = (ministery = null) => {
    if (ministery) {
      setSelectedItem(ministery);
      setFormData({
        ...defaultForm,
        name: ministery.name,
        active: ministery.active,
      });
      setIsEditing(true);
    } else {
      setSelectedItem(null);
      setFormData({ ...defaultForm });
      setIsEditing(false);
    }
    setModals({ ...modals, ministery: true });
  };

  const handleSaveMinistery = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      if (isEditing)
        await apiService.updateMinistery(
          selectedItem.id,
          formData.name,
          formData.active,
        );
      else await apiService.createMinistery(formData.name);
      await loadData();
      setModals({ ...modals, ministery: false });
      showSuccess(isEditing ? "Ministerio actualizado" : "Ministerio creado");
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteMinistery = async (id) => {
    if (!window.confirm("¿Estás seguro de eliminar este ministerio?")) return;
    setActionLoading(true);
    try {
      await apiService.deleteMinistery(id);
      await loadData();
      showSuccess("Ministerio eliminado");
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const openRoleModal = (role = null, defaultMinisteryId = "") => {
    if (role) {
      setSelectedItem(role);
      setSelectedMinisteryId(defaultMinisteryId);
      setFormData({
        ...defaultForm,
        name: role.name,
        description: role.description || "",
        active: role.active,
      });
      setIsEditing(true);
    } else {
      setSelectedItem(null);
      setSelectedMinisteryId(defaultMinisteryId);
      setFormData({ ...defaultForm });
      setIsEditing(false);
    }
    setModals({ ...modals, role: true });
  };

  const handleSaveRole = async (e) => {
    e.preventDefault();
    if (!selectedMinisteryId && !isEditing) return;
    setActionLoading(true);
    try {
      if (isEditing)
        await apiService.updateMinisteryRole(
          selectedItem.id,
          formData.name,
          formData.description,
          formData.active,
        );
      else
        await apiService.addRoleToMinistery(
          selectedMinisteryId,
          formData.name,
          formData.description,
        );
      await loadData();
      setModals({ ...modals, role: false });
      showSuccess(isEditing ? "Rol actualizado" : "Rol creado");
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteRole = async (id) => {
    if (!window.confirm("¿Seguro de eliminar este rol?")) return;
    setActionLoading(true);
    try {
      await apiService.deleteMinisteryRole(id);
      await loadData();
      showSuccess("Rol eliminado");
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const openAssignModal = () => {
    setFormData(defaultForm);
    setSelectedMinisteryId("");
    setIsEditingTeam(false);
    setModals({ ...modals, assign: true });
  };

  const openTeamModal = (team = null) => {
    if (team) {
      setSelectedItem(team);
      setSelectedMinisteryId(team.ministeryId);
      setFormData({
        ...defaultForm,
        leaderId: team.leaderId,
        level: team.levelCode,
        roleIds: team.roles ? team.roles.map((r) => r.id) : [],
      });
      setIsEditingTeam(true);
    } else {
      setSelectedItem(null);
      setSelectedMinisteryId("");
      setFormData(defaultForm);
      setIsEditingTeam(false);
    }
    setModals({ ...modals, assign: true });
  };

  const handleSaveTeam = async (e) => {
    e.preventDefault();
    if (formData.roleIds.length === 0) {
      alert("Seleccione al menos un rol.");
      return;
    }
    setActionLoading(true);
    try {
      if (isEditingTeam)
        await apiService.updateMinisteryTeam(
          selectedItem.id,
          formData.level,
          formData.roleIds,
        );
      else
        await apiService.assignLeaderToMinisteryTeam(
          selectedMinisteryId,
          formData.leaderId,
          formData.level,
          formData.roleIds,
        );
      await loadData();
      setModals({ ...modals, assign: false });
      showSuccess("Asignación guardada exitosamente");
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const openStatusUpdateModal = (team) => {
    setSelectedItem(team);
    setModals({ ...modals, statusUpdate: true });
  };

  const handleUpdateStatus = async (status) => {
    if (!selectedItem) return;
    setActionLoading(true);
    try {
      await apiService.updateMinisteryTeamStatus(selectedItem.id, status);
      await loadData();
      setModals({ ...modals, statusUpdate: false });
      showSuccess(`Estado actualizado`);
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // ==========================================
  // PROGRAMACIÓN DE SERVICIO (SCHEDULE)
  // ==========================================

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.description) return;
    setActionLoading(true);
    try {
      await apiService.createMinisteryEvent(
        scheduleMinisteryId,
        formData.name,
        formData.description,
      );
      await loadEvents(scheduleMinisteryId);
      setModals({ ...modals, eventCreate: false });
      showSuccess("Evento creado");
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteEvent = async (eventId) => {
    if (
      !window.confirm(
        "¿Seguro de eliminar este evento? Se borrarán sus asignaciones.",
      )
    )
      return;
    try {
      await apiService.deleteMinisteryEvent(eventId);
      await loadEvents(scheduleMinisteryId);
      showSuccess("Evento eliminado");
    } catch (err) {
      alert(err.message);
    }
  };

  const openEventAssignModal = (event) => {
    setSelectedItem(event);
    const currentAssignments = {};
    if (event.assignments) {
      event.assignments.forEach((a) => {
        currentAssignments[a.roleId] = a.teamId;
      });
    }
    setEventAssignments(currentAssignments);
    setModals({ ...modals, eventAssign: true });
  };

  const handleSaveEventAssignments = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const payload = Object.entries(eventAssignments)
        .filter(([roleId, teamId]) => teamId && teamId !== "")
        .map(([roleId, teamId]) => ({
          roleId: parseInt(roleId),
          teamId: parseInt(teamId),
        }));

      await apiService.syncMinisteryEventAssignments(selectedItem.id, payload);
      await loadEvents(scheduleMinisteryId);
      setModals({ ...modals, eventAssign: false });
      showSuccess("Asignaciones actualizadas");
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleShareEvent = async (ev) => {
    const ministryName = scheduleMinisteryData?.name || "Ministerio";
    
    // Usamos directamente nuestro helper seguro para la fecha
    const eventDateStr = formatEventDateStr(ev.eventDate);

    let text = `🗓️ *Programación de Servicio*\n`;
    text += `🏛️ *Ministerio:* ${ministryName}\n`;
    text += `📌 *Evento:* ${ev.name}\n`;
    text += `📅 *Fecha:* ${eventDateStr}\n\n`;
    text += `*Equipo Asignado:*\n`;

    if (ev.assignments && ev.assignments.length > 0) {
      ev.assignments.forEach((a) => {
        text += `🔸 *${a.roleName}:* ${getDisplayName(a.leaderName)}\n`;
      });
    } else {
      text += `⚠️ Aún no hay servidores asignados.\n`;
    }

    try {
      if (navigator.share) {
        await navigator.share({
          title: `Programación - ${ministryName}`,
          text: text,
        });
      } else {
        await navigator.clipboard.writeText(text);
        showSuccess("¡Copiado al portapapeles!");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // --- CONTROL DE ASISTENCIA (NUEVO) ---
  const openAttendanceModal = (event) => {
    setSelectedItem(event);
    setModals({ ...modals, eventAttendance: true });
  };

  const handleToggleAttendance = async (assignmentId, currentStatus) => {
    // Si era true o null, lo mandamos. (Consideramos null como false visualmente)
    const newStatus = !currentStatus;
    try {
      await apiService.markMinisteryEventAttendance(assignmentId, newStatus);

      // Actualización optimista del estado local para que se sienta instantáneo
      setSelectedItem((prev) => ({
        ...prev,
        assignments: prev.assignments.map((a) =>
          a.assignmentId === assignmentId ? { ...a, attended: newStatus } : a,
        ),
      }));
      setEvents((prev) =>
        prev.map((e) =>
          e.id === selectedItem.id
            ? {
                ...e,
                assignments: e.assignments.map((a) =>
                  a.assignmentId === assignmentId
                    ? { ...a, attended: newStatus }
                    : a,
                ),
              }
            : e,
        ),
      );
    } catch (err) {
      alert(err.message || "Error al actualizar asistencia");
    }
  };

  // --- RENDERS AUXILIARES ---
  const filteredTeams = useMemo(
    () =>
      teams.filter(
        (t) =>
          (!searchTerm ||
            t.leaderName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.ministeryName
              ?.toLowerCase()
              .includes(searchTerm.toLowerCase())) &&
          (filters.status === "ALL" || t.status === filters.status) &&
          (filters.level === "ALL" || t.levelCode === filters.level) &&
          (filters.ministeryId === "ALL" ||
            t.ministeryId.toString() === filters.ministeryId.toString()),
      ),
    [teams, searchTerm, filters],
  );

  const activeMinisteries = ministeries.filter((m) => m.active);
  const selectedMinisteryData = ministeries.find(
    (m) => m.id.toString() === selectedMinisteryId.toString(),
  );
  const scheduleMinisteryData = ministeries.find(
    (m) => m.id.toString() === scheduleMinisteryId.toString(),
  );

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20 animate-in fade-in p-4 md:p-8">
      {success && (
        <div className="fixed top-6 right-6 z-50 bg-emerald-50 border border-emerald-200 text-emerald-800 px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3">
          <CheckCircle2 size={24} className="text-emerald-500" />
          <span className="font-bold">{success}</span>
        </div>
      )}

      {/* HEADER & TABS MENU */}
      <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-2xl shadow-blue-500/5 relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 relative z-10">
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-blue-600 font-black text-xs uppercase tracking-[0.4em]">
              <Building2 size={16} className="animate-pulse" /> Operación &
              Servicio
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white leading-tight">
              Gestión de{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                Ministerios
              </span>
            </h1>

            <div className="flex flex-wrap items-center gap-2 mt-6 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl w-fit">
              <button
                onClick={() => setActiveTab("TEAMS")}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all ${activeTab === "TEAMS" ? "bg-white dark:bg-slate-700 text-blue-600 shadow-md scale-105" : "text-slate-500 hover:text-slate-700 dark:text-slate-400"}`}
              >
                <Users size={18} /> Equipos Activos
              </button>
              <button
                onClick={() => setActiveTab("SCHEDULE")}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all ${activeTab === "SCHEDULE" ? "bg-white dark:bg-slate-700 text-blue-600 shadow-md scale-105" : "text-slate-500 hover:text-slate-700 dark:text-slate-400"}`}
              >
                <CalendarDays size={18} /> Programación
              </button>
              <button
                onClick={() => setActiveTab("MINISTERIES")}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all ${activeTab === "MINISTERIES" ? "bg-white dark:bg-slate-700 text-blue-600 shadow-md scale-105" : "text-slate-500 hover:text-slate-700 dark:text-slate-400"}`}
              >
                <Building2 size={18} /> Ministerios
              </button>
              <button
                onClick={() => setActiveTab("ROLES")}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all ${activeTab === "ROLES" ? "bg-white dark:bg-slate-700 text-blue-600 shadow-md scale-105" : "text-slate-500 hover:text-slate-700 dark:text-slate-400"}`}
              >
                <Settings2 size={18} /> Roles de Equipo
              </button>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="p-24 text-center space-y-6">
          <RefreshCcw
            size={64}
            className="mx-auto text-blue-500 animate-spin opacity-20"
          />
        </div>
      ) : activeTab === "TEAMS" ? (
        /* ==================== TAB 1: EQUIPOS (TEAMS) ==================== */
        <div className="space-y-6 animate-in fade-in">
          <div className="flex justify-end mb-4">
            {canManage && (
              <button
                onClick={openAssignModal}
                className="flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-[1.5rem] font-black text-sm hover:shadow-lg hover:-translate-y-1 transition-all"
              >
                <UserPlus size={20} /> Asignar Líder a Equipo
              </button>
            )}
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
            <div className="mb-8 grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative group md:col-span-1">
                <Search
                  className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400"
                  size={20}
                />
                <input
                  type="text"
                  placeholder="Buscar líder..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full h-14 pl-14 pr-8 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-sm outline-none focus:border-blue-400 text-slate-800 dark:text-slate-200"
                />
              </div>
              <select
                value={filters.ministeryId}
                onChange={(e) =>
                  setFilters({ ...filters, ministeryId: e.target.value })
                }
                className="h-14 w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 font-bold text-sm outline-none text-slate-800 dark:text-slate-200"
              >
                <option value="ALL">Todos los Ministerios</option>
                {activeMinisteries.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
              <select
                value={filters.level}
                onChange={(e) =>
                  setFilters({ ...filters, level: e.target.value })
                }
                className="h-14 w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 font-bold text-sm outline-none text-slate-800 dark:text-slate-200"
              >
                <option value="ALL">Todos los Niveles</option>
                {Object.entries(MINISTERY_LEVEL_CONFIG).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.label}
                  </option>
                ))}
              </select>
              <select
                value={filters.status}
                onChange={(e) =>
                  setFilters({ ...filters, status: e.target.value })
                }
                className="h-14 w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 font-bold text-sm outline-none text-slate-800 dark:text-slate-200"
              >
                <option value="ALL">Todos los Estados</option>
                {Object.entries(TEAM_STATUS_CONFIG).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredTeams.length === 0 && (
                <div className="col-span-full p-10 text-center text-slate-500 font-bold bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                  No se encontraron resultados.
                </div>
              )}
              {filteredTeams.map((team) => {
                const levelCfg =
                  MINISTERY_LEVEL_CONFIG[team.levelCode] ||
                  MINISTERY_LEVEL_CONFIG.LEVEL_1;
                const statusCfg =
                  TEAM_STATUS_CONFIG[team.status] || TEAM_STATUS_CONFIG.ACTIVE;
                return (
                  <div
                    key={team.id}
                    className="relative bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 hover:border-blue-400 transition-all shadow-sm group"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-12 h-12 rounded-xl bg-gradient-to-br ${levelCfg.gradient} flex items-center justify-center ${levelCfg.iconColor} font-black text-xl`}
                        >
                          {team.leaderName?.[0]?.toUpperCase()}
                        </div>
                        <div>
                          <h4 className="font-black text-slate-900 dark:text-white line-clamp-1">
                            {getDisplayName(team.leaderName)}
                          </h4>
                          <span
                            className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md border ${statusCfg.bgColor} ${statusCfg.textColor} ${statusCfg.border}`}
                          >
                            {statusCfg.label}
                          </span>
                        </div>
                      </div>
                      {canManage && (
                        <div className="flex gap-1">
                          <button
                            onClick={() => openTeamModal(team)}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                          >
                            <Edit size={18} />
                          </button>
                          <button
                            onClick={() => openStatusUpdateModal(team)}
                            className="p-2 text-slate-400 hover:text-amber-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                          >
                            <Activity size={18} />
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="space-y-3 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                      <div className="text-xs font-black text-slate-600 dark:text-slate-300 flex items-center gap-2">
                        <Building2 size={14} className="text-blue-500" />{" "}
                        Ministerio: {team.ministeryName}
                      </div>
                      <div className="text-xs font-black text-slate-600 dark:text-slate-300 flex items-center gap-2">
                        <Crown size={14} className={levelCfg.iconColor} />{" "}
                        Rango: {team.levelDisplay}
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {team.roles?.length > 0 ? (
                        team.roles.map((r) => (
                          <span
                            key={r.id}
                            className="text-[10px] font-bold px-2 py-1 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded border border-slate-200 dark:border-slate-700 shadow-sm"
                          >
                            {r.name}
                          </span>
                        ))
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">
                          Sin roles asignados
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : activeTab === "SCHEDULE" ? (
        /* ==================== TAB 4: PROGRAMACIÓN DE SERVICIO ==================== */
        <div className="space-y-6 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
            <div className="flex flex-col md:flex-row items-end justify-between gap-6 mb-8 border-b border-slate-100 dark:border-slate-800 pb-8">
              <div className="w-full md:w-1/3">
                <label className="block text-xs font-black uppercase text-slate-500 dark:text-slate-400 mb-2">
                  Ministerio a Programar
                </label>
                <select
                  value={scheduleMinisteryId}
                  onChange={(e) => setScheduleMinisteryId(e.target.value)}
                  className="w-full h-14 px-5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-sm outline-none focus:border-blue-500 text-slate-800 dark:text-white"
                >
                  <option value="" disabled>
                    Seleccione el ministerio...
                  </option>
                  {activeMinisteries.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              {canManage && (
                <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto">
                  <button
                    onClick={async () => {
                      if (
                        !window.confirm(
                          "Se generarán los cultos (Miércoles y Domingos) del mes siguiente para TODOS los ministerios. ¿Continuar?",
                        )
                      )
                        return;
                      setActionLoading(true);
                      try {
                        const result =
                          await apiService.autoGenerateMinisterySchedule();
                        alert(
                          `¡Éxito! Mes: ${result.targetMonth} | Eventos: ${result.eventsCreated} | Asignaciones: ${result.assignmentsCreated}`,
                        );
                        if (scheduleMinisteryId)
                          loadEvents(scheduleMinisteryId);
                      } catch (err) {
                        alert(err.message);
                      } finally {
                        setActionLoading(false);
                      }
                    }}
                    disabled={actionLoading}
                    className="flex items-center justify-center gap-2 px-6 py-4 bg-emerald-600 text-white rounded-2xl font-bold shadow-lg hover:bg-emerald-700 hover:-translate-y-1 transition-all w-full md:w-auto disabled:opacity-50"
                  >
                    <RefreshCcw
                      size={18}
                      className={actionLoading ? "animate-spin" : ""}
                    />{" "}
                    Generar Mes Siguiente
                  </button>

                  {scheduleMinisteryId && (
                    <button
                      onClick={() => {
                        setFormData({ name: "", description: "" });
                        setModals({ ...modals, eventCreate: true });
                      }}
                      className="flex items-center justify-center gap-2 px-6 py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg hover:bg-blue-700 hover:-translate-y-1 transition-all w-full md:w-auto"
                    >
                      <CalendarDays size={18} /> Agendar Culto Extra
                    </button>
                  )}
                </div>
              )}
            </div>

            {!scheduleMinisteryId ? (
              <div className="p-16 text-center bg-slate-50 dark:bg-slate-800/30 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700">
                <CalendarClock
                  size={48}
                  className="mx-auto text-slate-300 dark:text-slate-600 mb-4"
                />
                <h3 className="text-xl font-black text-slate-500 dark:text-slate-400">
                  Seleccione un ministerio
                </h3>
                <p className="text-sm text-slate-400 mt-2">
                  Para ver y crear programaciones, primero elija un área en la
                  parte superior.
                </p>
              </div>
            ) : events.length === 0 ? (
              <div className="p-16 text-center">
                <Ghost
                  size={48}
                  className="mx-auto text-slate-300 dark:text-slate-600 mb-4"
                />
                <p className="font-bold text-slate-500">
                  No hay eventos programados próximos para esta área.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {events.map((ev) => {
                  // 🛠️ FIX 1: Usamos la función segura para calcular si ya pasó
                  const eventDateObj = parseSafeDate(ev.eventDate);
                  const isPastOrToday = eventDateObj.getTime() <= new Date().getTime() + 86400000;

                  return (
                    <div
                      key={ev.id}
                      className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-700"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h4 className="text-xl font-black text-slate-900 dark:text-white">
                            {ev.name}
                          </h4>
                          <div className="flex items-center gap-2 text-sm font-bold text-blue-600 dark:text-blue-400 mt-1">
                            <CalendarClock size={16} />{" "}
                            {/* 🛠️ FIX 2: Renderizamos la fecha limpia */}
                            {formatEventDateStr(ev.eventDate)}
                          </div>
                        </div>
                        {canManage && (
                          <button
                            onClick={() => handleDeleteEvent(ev.id)}
                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-slate-800 rounded-xl transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>

                      <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-200 dark:border-slate-700/50">
                        <div className="flex -space-x-3">
                          {ev.assignments?.length > 0 ? (
                            <div className="text-xs font-bold text-slate-500 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                              {ev.assignments.length} personas sirviendo
                            </div>
                          ) : (
                            <div className="text-xs font-bold text-amber-600 bg-amber-50 dark:bg-amber-900/30 px-3 py-1.5 rounded-lg border border-amber-200 dark:border-amber-800/50">
                              Falta programar equipo
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleShareEvent(ev)}
                            className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-slate-800 rounded-xl transition-colors"
                            title="Compartir Servicio"
                          >
                            <Share2 size={18} />
                          </button>

                          {canManage && (
                            <>
                              {/* BOTÓN ASISTENCIA: Se muestra si el evento ya pasó o es hoy */}
                              {isPastOrToday && ev.assignments?.length > 0 && (
                                <button
                                  onClick={() => openAttendanceModal(ev)}
                                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-sm font-bold rounded-xl border border-slate-200 dark:border-slate-700 hover:border-emerald-500 hover:text-emerald-600 shadow-sm transition-all flex items-center gap-2"
                                >
                                  <ClipboardCheck size={16} /> Lista
                                </button>
                              )}

                              <button
                                onClick={() => openEventAssignModal(ev)}
                                className="px-4 py-2 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-sm font-bold rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-400 shadow-sm transition-all"
                              >
                                Organizar
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : activeTab === "MINISTERIES" ? (
        /* ==================== TAB 2: GESTIÓN DE MINISTERIOS ==================== */
        <div className="space-y-6 animate-in fade-in">
          <div className="flex justify-end">
            {isPastor && (
              <button
                onClick={() => openMinisteryModal()}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl font-bold shadow-lg hover:bg-blue-700 transition-all hover:-translate-y-1"
              >
                <Plus size={18} /> Crear Nuevo Ministerio
              </button>
            )}
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 text-[10px] uppercase tracking-[0.2em] text-slate-400 font-black">
                  <th className="px-8 py-6">Ministerio Configurado</th>
                  <th className="px-8 py-6">Estado Base</th>
                  <th className="px-8 py-6">Roles Activos</th>
                  <th className="px-8 py-6 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                {ministeries.map((m) => (
                  <tr
                    key={m.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/20 transition-colors"
                  >
                    <td className="px-8 py-6 font-bold text-slate-900 dark:text-white flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center border border-blue-100 dark:border-blue-800/50">
                        <Building2 size={18} />
                      </div>
                      {m.name}
                    </td>
                    <td className="px-8 py-6">
                      <span
                        className={`text-[10px] font-black tracking-widest border px-3 py-1 rounded-lg uppercase ${m.active ? "text-emerald-600 bg-emerald-50 border-emerald-200" : "text-slate-500 bg-slate-100 border-slate-300"}`}
                      >
                        {m.active ? "Operativo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="px-8 py-6 font-bold text-slate-500 dark:text-slate-400">
                      {m.roles?.filter((r) => r.active).length || 0} Roles
                      Activos
                    </td>
                    <td className="px-8 py-6 text-right space-x-2">
                      {isPastor && (
                        <>
                          <button
                            onClick={() => openMinisteryModal(m)}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-700 rounded-xl transition-all"
                            title="Editar"
                          >
                            <Edit size={18} />
                          </button>
                          <button
                            onClick={() => handleDeleteMinistery(m.id)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-slate-700 rounded-xl transition-all"
                            title="Eliminar"
                          >
                            <Trash2 size={18} />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ==================== TAB 3: ROLES ==================== */
        <div className="space-y-6 animate-in fade-in">
          <div className="flex justify-end">
            {canManage && (
              <button
                onClick={() => openRoleModal()}
                className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg hover:bg-indigo-700 transition-all hover:-translate-y-1"
              >
                <Plus size={18} /> Crear Nuevo Rol
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {activeMinisteries.map((min) => (
              <div
                key={min.id}
                className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 p-6 shadow-sm"
              >
                <div className="flex justify-between items-center mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">
                  <h3 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">
                    <Building2 className="text-blue-500" size={20} /> {min.name}
                  </h3>
                  <button
                    onClick={() => openRoleModal(null, min.id)}
                    className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1.5 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors"
                  >
                    + Añadir Rol a {min.name}
                  </button>
                </div>

                <div className="space-y-3">
                  {min.roles?.map((role) => (
                    <div
                      key={role.id}
                      className="group flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700/50 transition-all hover:border-indigo-200 dark:hover:border-indigo-800"
                    >
                      <div className="pr-4">
                        <p className="font-bold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-2">
                          {role.name}
                          {!role.active && (
                            <span className="text-[10px] bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border border-slate-300 dark:border-slate-700 px-2 py-0.5 rounded-md uppercase tracking-widest">
                              Inactivo
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                          {role.description || "Sin descripción configurada"}
                        </p>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openRoleModal(role, min.id)}
                          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-700 rounded-lg"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteRole(role.id)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-slate-700 rounded-lg"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                  {(!min.roles || min.roles.length === 0) && (
                    <p className="text-sm text-slate-400 italic text-center py-4 bg-slate-50 dark:bg-slate-800/20 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                      Sin roles configurados en esta área.
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==========================================
          MODALES
          ========================================== */}

      {/* MODAL CREAR EVENTO (PROGRAMACIÓN) */}
      {modals.eventCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex justify-between items-center mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">
              <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                <CalendarDays className="text-blue-500" /> Agendar Evento
              </h3>
              <button
                onClick={() => setModals({ ...modals, eventCreate: false })}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateEvent} className="space-y-6">
              <div>
                <label className="block text-xs font-black uppercase text-slate-500 dark:text-slate-400 mb-2">
                  Nombre del Evento/Culto
                </label>
                <input
                  required
                  type="text"
                  placeholder="Ej. Culto Dominical..."
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full h-14 px-5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-sm outline-none focus:border-blue-500 text-slate-800 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-black uppercase text-slate-500 dark:text-slate-400 mb-2">
                  Fecha y Hora
                </label>
                <input
                  required
                  type="datetime-local"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="w-full h-14 px-5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-sm outline-none focus:border-blue-500 text-slate-800 dark:text-white"
                />
              </div>
              <button
                disabled={actionLoading}
                type="submit"
                className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl shadow-lg disabled:opacity-50 transition-colors"
              >
                {actionLoading ? "Guardando..." : "Crear Evento"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL ORGANIZAR SERVICIO (ASIGNAR ROLES A EVENTO) */}
      {modals.eventAssign && selectedItem && scheduleMinisteryData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[2.5rem] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh]">
            <div className="p-8 pb-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center shrink-0">
              <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                <UserPlus className="text-blue-500" /> Programar Servicio
              </h3>
              <button
                onClick={() => setModals({ ...modals, eventAssign: false })}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>

            <div className="px-8 py-4 bg-blue-50 dark:bg-blue-900/10 border-b border-blue-100 dark:border-blue-900/30">
              <h4 className="font-bold text-blue-800 dark:text-blue-300">
                {selectedItem.name}
              </h4>
              <p className="text-xs font-black uppercase text-blue-600 dark:text-blue-500 mt-1">
                {new Date(selectedItem.eventDate).toLocaleString("es-ES", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>

            <form
              onSubmit={handleSaveEventAssignments}
              className="p-8 space-y-6 overflow-y-auto"
            >
              <div className="space-y-4">
                {scheduleMinisteryData.roles
                  ?.filter((r) => r.active)
                  .map((role) => {
                    const eligibleTeamMembers = teams.filter(
                      (t) =>
                        t.ministeryId === scheduleMinisteryData.id &&
                        t.status === "ACTIVE" &&
                        t.roles.some((r) => r.id === role.id),
                    );

                    return (
                      <div
                        key={role.id}
                        className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30"
                      >
                        <div className="md:w-1/3">
                          <span className="font-bold text-sm text-slate-800 dark:text-slate-200">
                            {role.name}
                          </span>
                        </div>
                        <div className="flex-1">
                          {eligibleTeamMembers.length > 0 ? (
                            <select
                              value={eventAssignments[role.id] || ""}
                              onChange={(e) =>
                                setEventAssignments({
                                  ...eventAssignments,
                                  [role.id]: e.target.value,
                                })
                              }
                              className="w-full h-12 px-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-sm outline-none focus:border-blue-500 text-slate-800 dark:text-white"
                            >
                              <option value="">-- No asignar a nadie --</option>
                              {eligibleTeamMembers.map((member) => (
                                <option key={member.id} value={member.id}>
                                  {getDisplayName(member.leaderName)}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <div className="h-12 px-4 flex items-center bg-amber-50 dark:bg-amber-900/20 text-amber-600 border border-amber-200 dark:border-amber-800/50 rounded-xl text-xs font-bold">
                              Nadie en el equipo tiene este rol
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
              <button
                disabled={actionLoading}
                type="submit"
                className="w-full h-14 mt-6 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl shadow-lg disabled:opacity-50 transition-colors"
              >
                {actionLoading
                  ? "Guardando Planilla..."
                  : "Confirmar Programación"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PASAR LISTA / ASISTENCIA (NUEVO) */}
      {modals.eventAttendance && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh]">
            <div className="p-8 pb-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center shrink-0">
              <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                <ClipboardCheck className="text-emerald-500" /> Pasar Lista
              </h3>
              <button
                onClick={() => setModals({ ...modals, eventAttendance: false })}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>

            <div className="px-8 py-4 bg-emerald-50 dark:bg-emerald-900/10 border-b border-emerald-100 dark:border-emerald-900/30">
              <h4 className="font-bold text-emerald-800 dark:text-emerald-300">
                {selectedItem.name}
              </h4>
              <p className="text-xs font-black uppercase text-emerald-600 dark:text-emerald-500 mt-1">
                {new Date(selectedItem.eventDate).toLocaleString("es-ES", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>

            <div className="p-8 space-y-4 overflow-y-auto">
              <p className="text-sm font-bold text-slate-500 mb-4">
                ¿Quiénes asistieron a servir?
              </p>
              {selectedItem.assignments?.map((assignment) => (
                <label
                  key={assignment.assignmentId}
                  className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-colors ${assignment.attended ? "bg-emerald-50 border-emerald-500 text-emerald-800 dark:bg-emerald-900/30 dark:border-emerald-500 dark:text-emerald-200" : "bg-white border-slate-200 text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300"}`}
                >
                  <div>
                    <p className="font-bold text-sm">
                      {getDisplayName(assignment.leaderName)}
                    </p>
                    <p className="text-[10px] font-black uppercase opacity-70 mt-0.5">
                      {assignment.roleName}
                    </p>
                  </div>
                  <div
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${assignment.attended ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-300 dark:border-slate-600"}`}
                  >
                    {assignment.attended && <CheckCircle2 size={16} />}
                  </div>
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={!!assignment.attended}
                    onChange={() =>
                      handleToggleAttendance(
                        assignment.assignmentId,
                        assignment.attended,
                      )
                    }
                  />
                </label>
              ))}

              <button
                onClick={() => setModals({ ...modals, eventAttendance: false })}
                className="w-full h-14 mt-6 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-black rounded-2xl transition-colors"
              >
                Terminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL MINISTERIOS */}
      {modals.ministery && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex justify-between items-center mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">
              <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Building2 className="text-blue-500" />{" "}
                {isEditing ? "Editar Ministerio" : "Crear Ministerio"}
              </h3>
              <button
                onClick={() => setModals({ ...modals, ministery: false })}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSaveMinistery} className="space-y-6">
              <div>
                <label className="block text-xs font-black uppercase text-slate-500 dark:text-slate-400 mb-2">
                  Nombre de la Organización
                </label>
                <input
                  required
                  type="text"
                  placeholder="Ej. Alabanza, Ujieres, Medios..."
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full h-14 px-5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-sm outline-none focus:border-blue-500 text-slate-800 dark:text-white"
                />
                {isEditing && (
                  <div className="pt-6 mt-6 border-t border-slate-100 dark:border-slate-800">
                    <label className="block text-xs font-black uppercase text-slate-500 dark:text-slate-400 mb-3">
                      Estado Operativo
                    </label>
                    <div className="flex gap-4">
                      <label
                        className={`flex-1 flex items-center justify-center gap-2 p-4 rounded-xl border cursor-pointer transition-colors ${formData.active ? "bg-emerald-50 border-emerald-500 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-white border-slate-200 dark:bg-slate-800 dark:border-slate-700 text-slate-500"}`}
                      >
                        <input
                          type="radio"
                          checked={formData.active}
                          onChange={() =>
                            setFormData({ ...formData, active: true })
                          }
                          className="hidden"
                        />
                        <CheckCircle2
                          size={18}
                          className={
                            formData.active
                              ? "text-emerald-500"
                              : "opacity-0 hidden"
                          }
                        />{" "}
                        Activo
                      </label>
                      <label
                        className={`flex-1 flex items-center justify-center gap-2 p-4 rounded-xl border cursor-pointer transition-colors ${!formData.active ? "bg-slate-100 border-slate-400 text-slate-700 dark:bg-slate-800 dark:text-slate-300" : "bg-white border-slate-200 dark:bg-slate-800 dark:border-slate-700 text-slate-500"}`}
                      >
                        <input
                          type="radio"
                          checked={!formData.active}
                          onChange={() =>
                            setFormData({ ...formData, active: false })
                          }
                          className="hidden"
                        />
                        <AlertCircle
                          size={18}
                          className={
                            !formData.active
                              ? "text-slate-500"
                              : "opacity-0 hidden"
                          }
                        />{" "}
                        Inactivo
                      </label>
                    </div>
                  </div>
                )}
              </div>
              <button
                disabled={actionLoading}
                type="submit"
                className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl shadow-lg disabled:opacity-50 transition-colors"
              >
                {actionLoading ? "Procesando..." : "Guardar Información"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL ROLES */}
      {modals.role && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex justify-between items-center mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">
              <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Settings2 className="text-indigo-500" />{" "}
                {isEditing ? "Editar Rol" : "Nuevo Rol Ministerial"}
              </h3>
              <button
                onClick={() => setModals({ ...modals, role: false })}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSaveRole} className="space-y-5">
              {!isEditing && (
                <div>
                  <label className="block text-xs font-black uppercase text-slate-500 dark:text-slate-400 mb-2">
                    Asignar al Ministerio
                  </label>
                  <select
                    required
                    value={selectedMinisteryId}
                    onChange={(e) => setSelectedMinisteryId(e.target.value)}
                    className="w-full h-14 px-5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-sm outline-none focus:border-indigo-500 text-slate-800 dark:text-white"
                  >
                    <option value="" disabled>
                      Seleccione el ministerio base...
                    </option>
                    {ministeries
                      .filter((m) => m.active)
                      .map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-xs font-black uppercase text-slate-500 dark:text-slate-400 mb-2">
                  Nombre del Cargo/Rol
                </label>
                <input
                  required
                  type="text"
                  placeholder="Ej. Baterista, Recepción..."
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full h-14 px-5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-sm outline-none focus:border-indigo-500 text-slate-800 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-black uppercase text-slate-500 dark:text-slate-400 mb-2">
                  Descripción Funcional (Opcional)
                </label>
                <textarea
                  placeholder="Responsabilidades principales..."
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="w-full h-24 p-5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-sm outline-none focus:border-indigo-500 text-slate-800 dark:text-white resize-none"
                />
              </div>
              {isEditing && (
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                  <label className="block text-xs font-black uppercase text-slate-500 dark:text-slate-400 mb-3">
                    Estado Operativo
                  </label>
                  <div className="flex gap-4">
                    <label
                      className={`flex-1 flex items-center justify-center gap-2 p-4 rounded-xl border cursor-pointer transition-colors ${formData.active ? "bg-indigo-50 border-indigo-500 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400" : "bg-white border-slate-200 dark:bg-slate-800 dark:border-slate-700 text-slate-500"}`}
                    >
                      <input
                        type="radio"
                        checked={formData.active}
                        onChange={() =>
                          setFormData({ ...formData, active: true })
                        }
                        className="hidden"
                      />
                      <CheckCircle2
                        size={18}
                        className={
                          formData.active
                            ? "text-indigo-500"
                            : "opacity-0 hidden"
                        }
                      />{" "}
                      Activo
                    </label>
                    <label
                      className={`flex-1 flex items-center justify-center gap-2 p-4 rounded-xl border cursor-pointer transition-colors ${!formData.active ? "bg-slate-100 border-slate-400 text-slate-700 dark:bg-slate-800 dark:text-slate-300" : "bg-white border-slate-200 dark:bg-slate-800 dark:border-slate-700 text-slate-500"}`}
                    >
                      <input
                        type="radio"
                        checked={!formData.active}
                        onChange={() =>
                          setFormData({ ...formData, active: false })
                        }
                        className="hidden"
                      />
                      <AlertCircle
                        size={18}
                        className={
                          !formData.active
                            ? "text-slate-500"
                            : "opacity-0 hidden"
                        }
                      />{" "}
                      Inactivo
                    </label>
                  </div>
                </div>
              )}
              <button
                disabled={actionLoading}
                type="submit"
                className="w-full h-14 mt-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl shadow-lg disabled:opacity-50 transition-colors"
              >
                {actionLoading ? "Procesando..." : "Confirmar Rol"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL ASIGNAR LÍDER A EQUIPO */}
      {modals.assign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2.5rem] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh]">
            <div className="p-8 pb-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center shrink-0">
              <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                <UserPlus className="text-blue-500" />{" "}
                {isEditingTeam ? "Editar Asignación" : "Asignar Líder a Equipo"}
              </h3>
              <button
                onClick={() => setModals({ ...modals, assign: false })}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>
            <form
              onSubmit={handleSaveTeam}
              className="p-8 space-y-6 overflow-y-auto"
            >
              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-black uppercase text-slate-500 dark:text-slate-400 mb-2">
                    Líder Operativo
                  </label>
                  <select
                    required
                    disabled={isEditingTeam}
                    value={formData.leaderId}
                    onChange={(e) =>
                      setFormData({ ...formData, leaderId: e.target.value })
                    }
                    className="w-full h-14 px-5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-sm outline-none focus:border-blue-500 text-slate-800 dark:text-white disabled:opacity-60"
                  >
                    <option value="" disabled>
                      Buscar líder en base de datos...
                    </option>
                    {leaders.map((l) => (
                      <option key={l.id} value={l.id}>
                        {getDisplayName(l.memberName)}
                      </option>
                    ))}
                    {isEditingTeam &&
                      !leaders.find(
                        (l) => l.id.toString() === formData.leaderId.toString(),
                      ) && (
                        <option value={formData.leaderId}>
                          {getDisplayName(selectedItem?.leaderName)}
                        </option>
                      )}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black uppercase text-slate-500 dark:text-slate-400 mb-2">
                      Ministerio Destino
                    </label>
                    <select
                      required
                      disabled={isEditingTeam}
                      value={selectedMinisteryId}
                      onChange={(e) => {
                        setSelectedMinisteryId(e.target.value);
                        setFormData({ ...formData, roleIds: [] });
                      }}
                      className="w-full h-14 px-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-sm outline-none focus:border-blue-500 text-slate-800 dark:text-white disabled:opacity-60"
                    >
                      <option value="" disabled>
                        Seleccione...
                      </option>
                      {ministeries
                        .filter((m) => m.active || isEditingTeam)
                        .map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name} {!m.active && "(Inactivo)"}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase text-slate-500 dark:text-slate-400 mb-2">
                      Rango / Nivel
                    </label>
                    <select
                      required
                      value={formData.level}
                      onChange={(e) =>
                        setFormData({ ...formData, level: e.target.value })
                      }
                      className="w-full h-14 px-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-sm outline-none focus:border-blue-500 text-slate-800 dark:text-white"
                    >
                      {Object.entries(MINISTERY_LEVEL_CONFIG).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {selectedMinisteryData && (
                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                    <label className="block text-xs font-black uppercase text-slate-500 dark:text-slate-400 mb-3">
                      Configurar Roles{" "}
                      <span className="text-red-500 normal-case">
                        (Obligatorio)
                      </span>
                    </label>
                    {selectedMinisteryData.roles?.filter(
                      (r) => r.active || formData.roleIds.includes(r.id),
                    ).length > 0 ? (
                      <div className="grid grid-cols-2 gap-3">
                        {selectedMinisteryData.roles
                          .filter(
                            (r) => r.active || formData.roleIds.includes(r.id),
                          )
                          .map((role) => (
                            <label
                              key={role.id}
                              className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${formData.roleIds.includes(role.id) ? "bg-blue-50 border-blue-500 dark:bg-blue-900/30 dark:border-blue-500" : "bg-white border-slate-200 dark:bg-slate-800 dark:border-slate-700"}`}
                            >
                              <input
                                type="checkbox"
                                checked={formData.roleIds.includes(role.id)}
                                onChange={(e) => {
                                  const newIds = e.target.checked
                                    ? [...formData.roleIds, role.id]
                                    : formData.roleIds.filter(
                                        (id) => id !== role.id,
                                      );
                                  setFormData({ ...formData, roleIds: newIds });
                                }}
                                className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                              />
                              <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                                {role.name} {!role.active && "(Inactivo)"}
                              </span>
                            </label>
                          ))}
                      </div>
                    ) : (
                      <div className="p-4 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 rounded-xl flex items-center gap-2 text-sm font-bold border border-amber-200 dark:border-amber-800/50">
                        <AlertCircle size={18} /> No hay roles activos
                        disponibles en este ministerio.
                      </div>
                    )}
                  </div>
                )}
              </div>
              <button
                disabled={
                  actionLoading ||
                  !selectedMinisteryId ||
                  !formData.leaderId ||
                  (selectedMinisteryData &&
                    selectedMinisteryData.roles?.length === 0)
                }
                type="submit"
                className="w-full h-14 mt-6 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl shadow-lg disabled:opacity-50 transition-colors"
              >
                {actionLoading
                  ? "Procesando Enlace..."
                  : isEditingTeam
                    ? "Guardar Cambios"
                    : "Confirmar Asignación"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL ESTADO EQUIPO */}
      {modals.statusUpdate && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-slate-800 p-8 text-center">
            <Activity size={32} className="mx-auto mb-4 text-slate-400" />
            <h3 className="text-xl font-black mb-2 text-slate-900 dark:text-white">
              Cambio Operativo
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              Seleccione el nuevo estado para{" "}
              <strong>{getDisplayName(selectedItem.leaderName)}</strong>
            </p>
            <div className="space-y-3">
              {Object.entries(TEAM_STATUS_CONFIG).map(([k, v]) => (
                <button
                  key={k}
                  onClick={() => handleUpdateStatus(k)}
                  disabled={selectedItem.status === k || actionLoading}
                  className={`w-full h-12 rounded-xl font-bold text-sm border flex items-center justify-center gap-2 transition-all ${selectedItem.status === k ? "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-transparent cursor-not-allowed" : `bg-white dark:bg-slate-900 hover:${v.bgColor} border-slate-200 dark:border-slate-700 ${v.textColor}`}`}
                >
                  <span className={`w-2 h-2 rounded-full ${v.dotColor}`} />{" "}
                  Marcar como {v.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => setModals({ ...modals, statusUpdate: false })}
              className="w-full mt-6 pt-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-bold border-t border-slate-100 dark:border-slate-800"
            >
              Cerrar Ventana
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MinisteriesPage;
