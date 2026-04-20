import React, { useState, useEffect, useCallback } from "react";
import {
  X,
  Home,
  ShieldCheck,
  Users,
  Search,
  UserPlus,
  Edit3,
  CheckCircle2,
  AlertTriangle,
  PauseCircle,
  StopCircle,
  FileText,
  MapPin,
  TrendingUp,
  Save,
  Unlink,
  Info,
  Plus,
  Loader2,
  UserX,
  RefreshCw,
  ChevronRight,
  ArrowLeftRight,
} from "lucide-react";
import apiService from "../apiService";
import { logUserAction } from "../utils/securityLogger";
import { generateCellDetailPDF } from "../services/cellDetailPdfGenerator";

// ─── Constantes ──────────────────────────────────────────────────────────────

const STATUS_MAP = {
  ACTIVE: {
    label: "Activa",
    icon: CheckCircle2,
    color: "emerald",
    bg: "bg-emerald-500/10",
    text: "text-emerald-600 dark:text-emerald-400",
  },
  INCOMPLETE_LEADERSHIP: {
    label: "Liderazgo Incompleto",
    icon: AlertTriangle,
    color: "amber",
    bg: "bg-amber-500/10",
    text: "text-amber-600 dark:text-amber-400",
  },
  INACTIVE: {
    label: "Inactiva",
    icon: StopCircle,
    color: "slate",
    bg: "bg-slate-500/10",
    text: "text-slate-600 dark:text-slate-400",
  },
  SUSPENDED: {
    label: "Suspendida",
    icon: PauseCircle,
    color: "rose",
    bg: "bg-rose-500/10",
    text: "text-rose-600 dark:text-rose-400",
  },
};

const CELL_STATUSES = [
  { value: "ACTIVE", label: "Activa" },
  { value: "INCOMPLETE_LEADERSHIP", label: "Liderazgo Incompleto" },
  { value: "INACTIVE", label: "Inactiva" },
  { value: "SUSPENDED", label: "Suspendida" },
];

const TABS = [
  { id: "info", label: "Información", icon: Info },
  { id: "members", label: "Miembros", icon: Users },
  { id: "add", label: "Nuevo Miembro", icon: UserPlus },
  { id: "edit", label: "Configuración", icon: Edit3 },
];

const DAYS_OF_WEEK = [
  "Lunes","Martes","Miércoles","Jueves","Viernes","Sábado","Domingo",
];
const DISTRICTS = [
  { value: "PASTORES", label: "Pastores"   },
  { value: "D1",       label: "Distrito 1" },
  { value: "D2",       label: "Distrito 2" },
  { value: "D3",       label: "Distrito 3" },
];

// rol → campo ID en el DTO y campo de actualización en updateCell
const LEADER_ROLE_META = {
  groupLeader: {
    label: "Líder de Grupo",
    idField: "groupLeaderId",
    nameField: "groupLeaderName",
    updateKey: "groupLeaderId",
    icon: Users,
    color: "emerald",
  },
  host: {
    label: "Anfitrión",
    idField: "hostId",
    nameField: "hostName",
    updateKey: "hostId",
    icon: Home,
    color: "amber",
  },
  timoteo: {
    label: "Timoteo",
    idField: "timoteoId",
    nameField: "timoteoName",
    updateKey: "timoteoId",
    icon: TrendingUp,
    color: "violet",
  },
};

// ─── Componente principal ─────────────────────────────────────────────────────

const ModalCellDetail = ({ isOpen, onClose, cell: initialCell, onCellChanged }) => {
  const [cell, setCell] = useState(initialCell);
  const [activeTab, setActiveTab] = useState("info");
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [, setError] = useState("");

  // Search miembros
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  // Edit form
  const [editForm, setEditForm] = useState({});
  const [editLoading, setEditLoading] = useState(false);

  // Confirmación genérica
  const [confirmDialog, setConfirmDialog] = useState(null);

  // ── NUEVO: panel de gestión de líderes ───────────────────────────────────
  // leaderPanel = { role: 'groupLeader'|'host'|'timoteo' } o null
  const [leaderPanel, setLeaderPanel] = useState(null);
  const [leaderSearch, setLeaderSearch] = useState("");
  const [availableLeaders, setAvailableLeaders] = useState([]);
  const [loadingLeaders, setLoadingLeaders] = useState(false);
  const [leaderActionLoading, setLeaderActionLoading] = useState(false);

  // ── NUEVO: cambio de estado ───────────────────────────────────────────────
  const [statusLoading, setStatusLoading] = useState(false);

  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (initialCell) {
      setCell(initialCell);
      setEditForm({ ...initialCell });
    }
  }, [initialCell]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      if (activeTab === "members" || activeTab === "add") loadMembers();
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen, activeTab, cell?.id]);

  // Cerrar panel de líderes al cambiar de pestaña
  useEffect(() => {
    setLeaderPanel(null);
    setLeaderSearch("");
    setAvailableLeaders([]);
  }, [activeTab]);

  const loadMembers = useCallback(async () => {
    if (!cell?.id) return;
    setLoadingMembers(true);
    try {
      const raw = await apiService.getCellMembers(cell.id);
      setMembers(raw || []);
    } catch (err) {
      setError("Error al sincronizar integrantes");
    } finally {
      setLoadingMembers(false);
    }
  }, [cell?.id]);

  // ── Handlers existentes ───────────────────────────────────────────────────

  const handleVerify = async () => {
    setLoading(true);
    try {
      const result = await apiService.verifyCell(cell.id);
      setCell((prev) => ({ ...prev, status: result.status }));
      if (onCellChanged) onCellChanged();
      logUserAction("verify_cell", { cellId: cell.id });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEdit = async () => {
    setEditLoading(true);
    try {
      await apiService.updateCell(cell.id, editForm);
      setCell((prev) => ({ ...prev, ...editForm }));
      if (onCellChanged) onCellChanged();
      setActiveTab("info");
    } catch (err) {
      setError(err.message);
    } finally {
      setEditLoading(false);
    }
  };

  const handleSearch = async () => {
    if (searchTerm.trim().length < 2) return;
    setSearching(true);
    try {
      const all = await apiService.getAllMembers();
      const q = searchTerm.toLowerCase();
      setSearchResults(
        all
          .filter(
            (m) =>
              m.name?.toLowerCase().includes(q) || m.document?.includes(q)
          )
          .slice(0, 10)
      );
    } catch (err) {
      setError("Error en búsqueda");
    } finally {
      setSearching(false);
    }
  };

  const handleAddMember = async (member) => {
    setLoading(true);
    try {
      await apiService.addMemberToCell(cell.id, member.id);
      await loadMembers();
      setCell((prev) => ({
        ...prev,
        currentMemberCount: (prev.currentMemberCount || 0) + 1,
      }));
      setActiveTab("members");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUnlinkMember = (member) => {
    setConfirmDialog({
      title: "¿Desvincular Integrante?",
      message: `El registro de ${member.name} será omitido de esta célula.`,
      action: async () => {
        setLoading(true);
        try {
          await apiService.removeMemberFromCell(cell.id, member.id);
          await loadMembers();
          setCell((prev) => ({
            ...prev,
            currentMemberCount: Math.max(0, (prev.currentMemberCount || 1) - 1),
          }));
        } catch (err) {
          setError(err.message);
        } finally {
          setLoading(false);
          setConfirmDialog(null);
        }
      },
    });
  };

  // ── NUEVO: Cambiar estado de la célula ────────────────────────────────────

  const handleChangeStatus = async (newStatus) => {
    if (!newStatus || newStatus === cell.status) return;
    setStatusLoading(true);
    try {
      const result = await apiService.changeCellStatus(cell.id, newStatus);
      const updatedStatus = result?.newStatus || newStatus;
      setCell((prev) => ({ ...prev, status: updatedStatus }));
      setEditForm((prev) => ({ ...prev, status: updatedStatus }));
      if (onCellChanged) onCellChanged();
    } catch (err) {
      setError(err.message);
    } finally {
      setStatusLoading(false);
    }
  };

  // ── NUEVO: Cargar líderes activos para el panel de reemplazo ─────────────

  const loadActiveLeaders = useCallback(async () => {
    setLoadingLeaders(true);
    try {
      const leaders = await apiService.getActiveLeaders();
      setAvailableLeaders(leaders || []);
    } catch (err) {
      setError("Error al cargar líderes disponibles");
    } finally {
      setLoadingLeaders(false);
    }
  }, []);

  // ── NUEVO: Abrir panel de gestión de un líder ─────────────────────────────

  const openLeaderPanel = (role) => {
    setLeaderPanel(role);
    setLeaderSearch("");
    loadActiveLeaders();
  };

  const closeLeaderPanel = () => {
    setLeaderPanel(null);
    setLeaderSearch("");
    setAvailableLeaders([]);
  };

  // ── NUEVO: Desvincular un líder (groupLeader, host, timoteo) ─────────────

  const handleUnlinkLeader = (role) => {
    const meta = LEADER_ROLE_META[role];
    const leaderId = cell[meta.idField];
    const leaderName = cell[meta.nameField];

    if (!leaderId) {
      setError("No se encontró el ID del líder para desvincular");
      return;
    }

    setConfirmDialog({
      title: `¿Desvincular ${meta.label}?`,
      message: `${leaderName || "Este líder"} será removido del equipo de esta célula. El estado de la célula se recalculará automáticamente.`,
      variant: "warning",
      action: async () => {
        setLeaderActionLoading(true);
        try {
          const result = await apiService.unlinkLeaderFromCell(cell.id, leaderId);
          // Actualizar el cell local limpiando el rol
          setCell((prev) => ({
            ...prev,
            [meta.idField]: null,
            [meta.nameField]: null,
            status: result?.newCellStatus || prev.status,
          }));
          closeLeaderPanel();
          if (onCellChanged) onCellChanged();
          logUserAction("unlink_leader", { cellId: cell.id, role, leaderId });
        } catch (err) {
          setError(err.message);
        } finally {
          setLeaderActionLoading(false);
          setConfirmDialog(null);
        }
      },
    });
  };

  // ── NUEVO: Reemplazar un líder ────────────────────────────────────────────

  const handleReplaceLeader = async (newLeader) => {
    if (!leaderPanel) return;
    const meta = LEADER_ROLE_META[leaderPanel];
    setLeaderActionLoading(true);
    try {
      await apiService.updateCell(cell.id, { [meta.updateKey]: newLeader.id });
      setCell((prev) => ({
        ...prev,
        [meta.idField]: newLeader.id,
        [meta.nameField]: newLeader.member?.name || newLeader.memberName || newLeader.name,
      }));
      closeLeaderPanel();
      if (onCellChanged) onCellChanged();
      logUserAction("replace_leader", { cellId: cell.id, role: leaderPanel, newLeaderId: newLeader.id });
    } catch (err) {
      setError(err.message);
    } finally {
      setLeaderActionLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────

  if (!isOpen || !cell) return null;

  const status = STATUS_MAP[cell.status] || STATUS_MAP.ACTIVE;

  // Líderes filtrados por búsqueda en el panel
  const filteredLeaders = availableLeaders.filter((l) => {
    const name = (l.member?.name || l.memberName || l.name || "").toLowerCase();
    const doc = (l.member?.document || l.document || "").toLowerCase();
    const q = leaderSearch.toLowerCase();
    return name.includes(q) || doc.includes(q);
  });

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-0 sm:p-6 bg-slate-900/60 backdrop-blur-xl animate-in fade-in duration-300">
      <div className="w-full max-w-6xl bg-white dark:bg-[#0f172a] sm:rounded-[3rem] shadow-2xl flex flex-col h-full sm:h-[85vh] overflow-hidden border border-slate-200 dark:border-white/10 animate-in slide-in-from-bottom-12 duration-500">

        {/* ── HEADER ─────────────────────────────────────────────────────── */}
        <div className="relative pt-10 px-10 pb-2 shrink-0 overflow-hidden">
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-8 relative z-10">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 bg-indigo-600 rounded-[2rem] flex items-center justify-center shadow-2xl shadow-indigo-500/20 shrink-0 border border-white/10">
                <Home className="w-10 h-10 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className={`px-4 py-1.5 ${status.bg} ${status.text} text-[10px] font-black uppercase tracking-[0.2em] rounded-xl border border-white/5 flex items-center gap-2`}>
                    <status.icon size={14} className="animate-pulse" /> {status.label}
                  </span>
                  {cell.isMultiplying && (
                    <span className="px-4 py-1.5 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-xl shadow-lg shadow-emerald-500/20">
                      🌱 Multiplicación
                    </span>
                  )}
                </div>
                <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none">
                  {cell.name}
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-4 w-full xl:w-auto overflow-x-auto no-scrollbar pb-2 xl:pb-0">
              <button
                onClick={handleVerify}
                disabled={loading}
                className="flex-1 sm:flex-none h-14 px-8 bg-emerald-600 hover:bg-emerald-500 text-white rounded-[1.2rem] font-black text-[11px] uppercase tracking-[0.2em] transition-all active:scale-95 shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-3"
              >
                {loading ? <Loader2 className="animate-spin w-5 h-5" /> : <ShieldCheck size={20} />} Verificar
              </button>
              <button
                onClick={() => generateCellDetailPDF(cell, members)}
                className="h-14 w-14 sm:w-auto sm:px-8 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-white rounded-[1.2rem] font-black text-[11px] uppercase tracking-[0.2em] hover:bg-indigo-600 hover:text-white transition-all flex items-center justify-center gap-3"
              >
                <FileText size={20} /> <span className="hidden sm:inline">Exportar PDF</span>
              </button>
              <button
                onClick={onClose}
                className="bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white rounded-[1.2rem] transition-all flex items-center justify-center"
              >
                <X size={24} />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-8 mt-10 border-b border-slate-100 dark:border-white/5 overflow-x-auto no-scrollbar">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative pb-5 flex items-center gap-3 transition-all ${
                  activeTab === tab.id
                    ? "text-indigo-600 dark:text-indigo-400"
                    : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 opacity-60"
                }`}
              >
                <tab.icon size={18} />
                <span className="text-xs font-black uppercase tracking-[0.2em]">{tab.label}</span>
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-600 dark:bg-indigo-400 rounded-full shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ── CONTENT ────────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-10 bg-slate-50/30 dark:bg-black/20">

          {/* ── TAB: INFO ─────────────────────────────────────────────────── */}
          {activeTab === "info" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in slide-in-from-bottom-4 duration-500">
              <div className="lg:col-span-2 space-y-8 text-slate-800 dark:text-slate-200">

                {/* Equipo de liderazgo — solo lectura (acciones en pestaña Configuración) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {[
                    { label: "COBERTURA 12",   name: cell.mainLeaderName,  icon: ShieldCheck, color: "indigo" },
                    { label: "LÍDER DE GRUPO", name: cell.groupLeaderName, icon: Users,       color: "emerald" },
                    { label: "ANFITRIÓN",      name: cell.hostName,        icon: Home,        color: "amber" },
                    { label: "TIMOTEO",        name: cell.timoteoName,     icon: TrendingUp,  color: "violet" },
                  ].map((r, i) => (
                    <div key={i} className="p-6 bg-white dark:bg-[#1a2332] rounded-[2rem] border-2 border-slate-100 dark:border-white/5 flex items-center gap-5 hover:border-indigo-500/30 transition-all shadow-sm">
                      <div className={`w-14 h-14 bg-${r.color}-500/10 rounded-2xl flex items-center justify-center text-${r.color}-500 shadow-inner`}>
                        <r.icon size={28} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">{r.label}</p>
                        <p className="font-black text-base truncate">{r.name || "SIN ASIGNAR"}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Logística */}
                <div className="p-8 bg-white dark:bg-[#1a2332] rounded-[2.5rem] border-2 border-slate-100 dark:border-white/5 space-y-6">
                  <div className="flex items-center gap-3">
                    <MapPin className="text-indigo-500" size={20} />
                    <h4 className="text-[11px] font-black uppercase tracking-[0.2em]">Logística de Altar</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Día Ministerial</p>
                      <p className="font-black text-sm">{cell.meetingDay || "S.N."}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Horario Pactado</p>
                      <p className="font-black text-sm">{cell.meetingTimeFormatted || cell.meetingTime || "S.N."}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Sector / Distrito</p>
                      <p className="font-black text-sm">{cell.district || "S.N."}</p>
                    </div>
                  </div>
                  <div className="pt-4 border-t border-slate-100 dark:border-white/5">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Ubicación Física</p>
                    <p className="font-black text-sm">{cell.meetingAddress || "S.N."}</p>
                  </div>
                </div>
              </div>

              {/* Sidebar derecho */}
              <div className="space-y-8">
                <div className="p-10 bg-indigo-600 rounded-[3rem] text-white shadow-2xl shadow-indigo-500/20 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -mr-10 -mt-10 blur-3xl group-hover:bg-white/20 transition-all duration-700" />
                  <p className="text-[10px] font-black text-indigo-100/60 uppercase tracking-[0.3em] mb-6">Métrica de Censo</p>
                  <div className="flex items-end gap-3 mb-8">
                    <span className="text-7xl font-black leading-none">{cell.currentMemberCount || 0}</span>
                    <span className="text-2xl font-black text-indigo-100/40 mb-2 uppercase tracking-tighter">/ {cell.maxCapacity || 12}</span>
                  </div>
                  <div className="h-4 bg-white/20 rounded-full overflow-hidden border border-white/10">
                    <div
                      className="h-full bg-white rounded-full transition-all duration-1000 shadow-[0_0_15px_rgba(255,255,255,0.5)]"
                      style={{ width: `${Math.min(100, ((cell.currentMemberCount || 0) / (cell.maxCapacity || 12)) * 100)}%` }}
                    />
                  </div>
                </div>

                {cell.notes && (
                  <div className="p-8 bg-white dark:bg-[#1a2332] rounded-[2.5rem] border-2 border-slate-100 dark:border-white/5">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">Anotaciones Ministeriales</p>
                    <p className="text-sm font-bold leading-relaxed opacity-80 italic">"{cell.notes}"</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── TAB: MEMBERS ──────────────────────────────────────────────── */}
          {activeTab === "members" && (
            <div className="animate-in slide-in-from-right-4 duration-500 h-full">
              {loadingMembers ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sincronizando membresía...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pb-12">
                  {members.map((m) => (
                    <div
                      key={m.id}
                      className="p-6 bg-white dark:bg-[#1a2332] rounded-3xl border-2 border-slate-100 dark:border-white/5 flex items-center justify-between group hover:border-indigo-500/40 transition-all shadow-sm"
                    >
                      <div className="flex items-center gap-5">
                        <div className="w-14 h-14 bg-slate-50 dark:bg-black/20 rounded-2xl flex items-center justify-center font-black text-indigo-500 text-xl shadow-inner">
                          {m.name?.[0].toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-black text-sm uppercase tracking-tight truncate max-w-[120px]">{m.name}</h4>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{m.document || "---"}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleUnlinkMember(m)}
                        className="p-3 text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-all"
                      >
                        <Unlink size={18} />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => setActiveTab("add")}
                    className="p-8 border-4 border-dashed border-slate-100 dark:border-white/5 rounded-[2.5rem] flex flex-col items-center justify-center gap-4 text-slate-400 hover:border-indigo-500/40 hover:text-indigo-500 transition-all opacity-60 hover:opacity-100 group"
                  >
                    <div className="w-14 h-14 bg-slate-100 dark:bg-white/5 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Plus size={32} />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest">Vincular Integrante</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── TAB: ADD MEMBER ───────────────────────────────────────────── */}
          {activeTab === "add" && (
            <div className="max-w-2xl mx-auto animate-in zoom-in-95 duration-500 py-10">
              <div className="text-center mb-12">
                <div className="w-24 h-24 bg-indigo-500/10 rounded-[2.5rem] flex items-center justify-center text-indigo-500 mx-auto mb-6 shadow-inner">
                  <UserPlus size={48} />
                </div>
                <h3 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Vinculación de Red</h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-2">
                  Expande el censo ministerial integrando nuevos discípulos
                </p>
              </div>

              <div className="relative group mb-12">
                <input
                  type="text"
                  placeholder="Buscar por Nombre o Documento..."
                  className="w-full h-20 pl-16 pr-8 bg-white dark:bg-[#1a2332] rounded-[2rem] border-2 border-slate-100 dark:border-white/5 focus:border-indigo-500 outline-none font-black text-lg transition-all shadow-lg shadow-indigo-500/5"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyUp={(e) => e.key === "Enter" && handleSearch()}
                />
              </div>

              {searching ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
                </div>
              ) : searchResults.length > 0 ? (
                <div className="space-y-4">
                  {searchResults.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => handleAddMember(m)}
                      className="w-full p-6 bg-white dark:bg-[#1a2332] rounded-[2rem] border-2 border-slate-100 dark:border-white/5 flex items-center justify-between group hover:border-emerald-500 hover:bg-emerald-50/20 transition-all active:scale-95 shadow-sm"
                    >
                      <div className="flex items-center gap-6">
                        <div className="w-16 h-16 bg-slate-50 dark:bg-black/20 rounded-2xl flex items-center justify-center font-black text-indigo-500 text-2xl shadow-inner">
                          {m.name[0]}
                        </div>
                        <div className="text-left">
                          <h4 className="font-black text-base uppercase tracking-tight">{m.name}</h4>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{m.document}</p>
                        </div>
                      </div>
                      <Plus className="text-emerald-500 group-hover:scale-150 transition-transform" size={24} />
                    </button>
                  ))}
                </div>
              ) : (
                searchTerm.length > 2 && (
                  <div className="p-12 text-center bg-slate-100/50 dark:bg-black/20 rounded-[3rem] border-4 border-dashed border-slate-200 dark:border-white/5">
                    <Users className="mx-auto text-slate-300 dark:text-slate-700 mb-4" size={48} />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No se encontraron registros activos</p>
                  </div>
                )
              )}
            </div>
          )}

          {/* ── TAB: EDIT ─────────────────────────────────────────────────── */}
          {activeTab === "edit" && (
            <div className="animate-in slide-in-from-left-4 duration-500 space-y-12 pb-12">

              {/* ── NUEVO: Cambio de estado ─────────────────────────────── */}
              <div className="p-8 bg-white dark:bg-[#1a2332] rounded-[2.5rem] border-2 border-slate-100 dark:border-white/5 space-y-5">
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-10 h-10 ${status.bg} rounded-xl flex items-center justify-center`}>
                    <status.icon size={20} className={status.text} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Estado Operativo</p>
                    <p className="text-sm font-black text-slate-800 dark:text-white">{status.label}</p>
                  </div>
                  {statusLoading && <Loader2 size={18} className="text-indigo-500 animate-spin ml-auto" />}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {CELL_STATUSES.map((s) => {
                    const sConf = STATUS_MAP[s.value];
                    const isCurrent = cell.status === s.value;
                    return (
                      <button
                        key={s.value}
                        onClick={() => !isCurrent && handleChangeStatus(s.value)}
                        disabled={statusLoading || isCurrent}
                        className={`h-14 px-4 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all border-2 ${
                          isCurrent
                            ? `${sConf.bg} ${sConf.text} border-current opacity-100 cursor-default shadow-inner`
                            : "bg-slate-50 dark:bg-black/20 text-slate-400 border-slate-100 dark:border-white/5 hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 active:scale-95"
                        } disabled:cursor-not-allowed`}
                      >
                        <sConf.icon size={14} />
                        <span className="hidden sm:inline">{s.label}</span>
                        <span className="sm:hidden text-[9px]">{s.label.split(" ")[0]}</span>
                      </button>
                    );
                  })}
                </div>

                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                  Selecciona un estado para aplicarlo inmediatamente. El cambio es auditable.
                </p>
              </div>

              {/* ── Gestión del equipo de liderazgo ────────────────────── */}
              <div className="p-8 bg-white dark:bg-[#1a2332] rounded-[2.5rem] border-2 border-slate-100 dark:border-white/5 space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center">
                    <Users size={20} className="text-indigo-500" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Equipo de Liderazgo</p>
                    <p className="text-[9px] font-bold text-slate-400 mt-0.5">Cambia o desvincula al Líder de Grupo, Anfitrión y Timoteo</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {[
                    { role: "groupLeader", color: "emerald" },
                    { role: "host",        color: "amber"   },
                    { role: "timoteo",     color: "violet"  },
                  ].map(({ role, color }) => {
                    const meta         = LEADER_ROLE_META[role];
                    const leaderId     = cell[meta.idField];
                    const leaderName   = cell[meta.nameField];
                    const RoleIcon     = meta.icon;
                    const isPanelOpen  = leaderPanel === role;

                    return (
                      <div key={role}>
                        {/* Fila del líder */}
                        <div className={`flex items-center gap-4 p-5 rounded-[1.5rem] border-2 transition-all ${isPanelOpen ? "border-indigo-500/30 bg-indigo-50/40 dark:bg-indigo-500/5" : "border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-black/10"}`}>
                          {/* Ícono + info */}
                          <div className={`w-11 h-11 bg-${color}-500/10 rounded-xl flex items-center justify-center text-${color}-500 shrink-0`}>
                            <RoleIcon size={22} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{meta.label}</p>
                            <p className="font-black text-sm truncate text-slate-800 dark:text-white">
                              {leaderName || <span className="text-slate-400 font-bold italic">Sin asignar</span>}
                            </p>
                          </div>

                          {/* Botones de acción */}
                          <div className="flex gap-2 shrink-0">
                            <button
                              onClick={() => isPanelOpen ? closeLeaderPanel() : openLeaderPanel(role)}
                              className={`h-9 px-4 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-all border-2 ${
                                isPanelOpen
                                  ? "bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-500/20"
                                  : "bg-white dark:bg-black/20 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-white/10 hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                              }`}
                            >
                              <ArrowLeftRight size={12} />
                              <span className="hidden sm:inline">Cambiar</span>
                            </button>
                            <button
                              onClick={() => handleUnlinkLeader(role)}
                              disabled={!leaderId || leaderActionLoading}
                              title={leaderId ? `Desvincular ${meta.label}` : "No hay líder asignado"}
                              className="rounded-xl border-2 border-rose-100 dark:border-rose-500/20 bg-rose-50 dark:bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:border-rose-500 hover:text-white transition-all flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              <UserX size={14} />
                            </button>
                          </div>
                        </div>

                        {/* Panel de búsqueda y selección inline */}
                        {isPanelOpen && (
                          <div className="mt-2 p-5 bg-white dark:bg-[#1a2332] rounded-[1.5rem] border-2 border-indigo-500/20 animate-in slide-in-from-top-2 duration-300 shadow-lg shadow-indigo-500/10">
                            <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                              <RefreshCw size={10} /> Seleccionar nuevo {meta.label}
                            </p>

                            {/* Input de búsqueda */}
                            <div className="relative mb-3">
                              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                              <input
                                type="text"
                                placeholder="Buscar por nombre o documento..."
                                value={leaderSearch}
                                onChange={(e) => setLeaderSearch(e.target.value)}
                                className="w-full h-11 pl-10 pr-4 bg-slate-50 dark:bg-black/20 rounded-2xl border-2 border-slate-100 dark:border-white/5 focus:border-indigo-500 outline-none text-[11px] font-bold transition-all"
                              />
                            </div>

                            {/* Lista resultados */}
                            <div className="max-h-52 overflow-y-auto space-y-1.5 custom-scrollbar">
                              {loadingLeaders ? (
                                <div className="flex justify-center py-6">
                                  <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
                                </div>
                              ) : filteredLeaders.length === 0 ? (
                                <div className="text-center py-6">
                                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                    {leaderSearch ? "Sin coincidencias" : "Sin líderes activos disponibles"}
                                  </p>
                                </div>
                              ) : (
                                filteredLeaders.slice(0, 8).map((leader) => {
                                  const lName = leader.member?.name || leader.memberName || leader.name || "—";
                                  const lDoc  = leader.member?.document || leader.document || "";
                                  const lType = leader.leaderType || leader.type || "";
                                  const isCurrentLeader = leader.id === leaderId;
                                  return (
                                    <button
                                      key={leader.id}
                                      onClick={() => !isCurrentLeader && handleReplaceLeader(leader)}
                                      disabled={leaderActionLoading || isCurrentLeader}
                                      className={`w-full flex items-center justify-between gap-3 p-3 rounded-xl border transition-all group active:scale-95 ${
                                        isCurrentLeader
                                          ? "bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/30 cursor-default"
                                          : "bg-slate-50 dark:bg-black/20 border-transparent hover:bg-indigo-50 dark:hover:bg-indigo-500/10 hover:border-indigo-200 dark:hover:border-indigo-500/20 disabled:opacity-50"
                                      }`}
                                    >
                                      <div className="flex items-center gap-3 min-w-0 text-left">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs shrink-0 ${isCurrentLeader ? "bg-indigo-500 text-white" : "bg-indigo-500/10 text-indigo-500"}`}>
                                          {lName[0]?.toUpperCase()}
                                        </div>
                                        <div className="min-w-0">
                                          <p className="font-black text-[11px] text-slate-800 dark:text-white truncate">{lName}</p>
                                          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">{lDoc || lType}</p>
                                        </div>
                                      </div>
                                      {isCurrentLeader ? (
                                        <CheckCircle2 size={13} className="text-indigo-500 shrink-0" />
                                      ) : leaderActionLoading ? (
                                        <Loader2 size={13} className="text-indigo-400 animate-spin shrink-0" />
                                      ) : (
                                        <ChevronRight size={13} className="text-slate-300 group-hover:text-indigo-500 transition-colors shrink-0" />
                                      )}
                                    </button>
                                  );
                                })
                              )}
                            </div>

                            <button
                              onClick={closeLeaderPanel}
                              className="w-full mt-3 h-9 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-400 text-[9px] font-black uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-white/10 transition-all"
                            >
                              Cerrar
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Datos básicos */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Identificador del Altar</label>
                  <input
                    type="text"
                    value={editForm.name || ""}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full h-16 px-6 bg-white dark:bg-[#1a2332] rounded-3xl border-2 border-slate-100 dark:border-white/5 focus:border-indigo-500 outline-none font-black text-sm transition-all"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Censo Estimado</label>
                  <input
                    type="number"
                    value={editForm.maxCapacity || ""}
                    onChange={(e) => setEditForm({ ...editForm, maxCapacity: e.target.value })}
                    className="w-full h-16 px-6 bg-white dark:bg-[#1a2332] rounded-3xl border-2 border-slate-100 dark:border-white/5 focus:border-indigo-500 outline-none font-black text-sm transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Día de Encuentro</label>
                  <select
                    value={editForm.meetingDay || ""}
                    onChange={(e) => setEditForm({ ...editForm, meetingDay: e.target.value })}
                    className="w-full h-16 px-6 bg-white dark:bg-[#1a2332] rounded-3xl border-2 border-slate-100 dark:border-white/5 focus:border-indigo-500 outline-none font-black text-sm appearance-none"
                  >
                    {DAYS_OF_WEEK.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Horario</label>
                  <input
                    type="time"
                    value={editForm.meetingTime || ""}
                    onChange={(e) => setEditForm({ ...editForm, meetingTime: e.target.value })}
                    className="w-full h-16 px-6 bg-white dark:bg-[#1a2332] rounded-3xl border-2 border-slate-100 dark:border-white/5 focus:border-indigo-500 outline-none font-black text-sm transition-all"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Sector Cobertura</label>
                  <select
                    value={editForm.district || ""}
                    onChange={(e) => setEditForm({ ...editForm, district: e.target.value })}
                    className="w-full h-16 px-6 bg-white dark:bg-[#1a2332] rounded-3xl border-2 border-slate-100 dark:border-white/5 focus:border-indigo-500 outline-none font-black text-sm appearance-none"
                  >
                    {DISTRICTS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-3">
                <label className="flex gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">
                  <MapPin className="text-indigo-500" size={20} />Ubicación Física</label>
                <div className="relative">
                  <input
                    type="text"
                    value={editForm.meetingAddress || ""}
                    onChange={(e) => setEditForm({ ...editForm, meetingAddress: e.target.value })}
                    className="w-full h-16 pl-14 pr-6 bg-white dark:bg-[#1a2332] rounded-3xl border-2 border-slate-100 dark:border-white/5 focus:border-indigo-500 outline-none font-black text-sm transition-all"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-8">
                <button
                  onClick={handleSaveEdit}
                  disabled={editLoading}
                  className="w-full sm:w-auto h-16 px-12 bg-indigo-600 hover:bg-indigo-500 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-[0.3em] transition-all active:scale-95 shadow-2xl shadow-indigo-500/20 flex items-center justify-center gap-4"
                >
                  {editLoading ? <Loader2 className="animate-spin w-5 h-5" /> : <Save size={20} />} Actualizar Configuración
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── CONFIRM DIALOG ────────────────────────────────────────────── */}
        {confirmDialog && (
          <div className="fixed inset-0 z-[2000] bg-slate-950/60 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in duration-300">
            <div className="w-full max-w-md bg-white dark:bg-[#0f172a] rounded-[2.5rem] p-10 shadow-2xl border border-rose-500/20 animate-in zoom-in-95 duration-500 text-center">
              <div className="w-20 h-20 bg-rose-500/10 rounded-3xl flex items-center justify-center text-rose-500 mx-auto mb-8 shadow-inner">
                <AlertTriangle size={40} />
              </div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter mb-4">{confirmDialog.title}</h3>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest leading-relaxed mb-10">{confirmDialog.message}</p>
              <div className="flex gap-4">
                <button
                  onClick={() => setConfirmDialog(null)}
                  disabled={leaderActionLoading}
                  className="flex-1 h-14 bg-slate-100 dark:bg-white/5 text-slate-400 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all hover:bg-slate-200 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmDialog.action}
                  disabled={leaderActionLoading}
                  className="flex-1 h-14 bg-rose-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all hover:bg-rose-500 shadow-xl shadow-rose-500/20 active:scale-95 flex items-center justify-center gap-2 disabled:opacity-70"
                >
                  {leaderActionLoading ? <Loader2 size={16} className="animate-spin" /> : null}
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(99, 102, 241, 0.1); border-radius: 20px; }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.05); }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(99, 102, 241, 0.3); }
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}} />
    </div>
  );
};

export default ModalCellDetail;