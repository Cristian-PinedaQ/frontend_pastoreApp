import React, { useState, useEffect, useCallback, useMemo } from "react";
import apiService from "../apiService";
import { generateLeadersPDF } from "../services/leadersPdfGenerator";
import nameHelper from "../services/nameHelper";
import ModalPromoteLeader from "../components/ModalPromoteLeader";
import ModalLeaderStatistics from "../components/ModalLeaderStatistics";
import ModalLeaderDetail from "../components/ModalLeaderDetail";
import PageHero from "../components/PageHero";
import { useAuth } from "../context/AuthContext";
import {
  Users,
  CircleUserRound,
  Crown,
  ShieldCheck,
  FileText,
  BarChart3,
  RefreshCcw,
  ChevronRight,
  UserPlus,
  AlertTriangle,
  Clock,
  MoreVertical,
  Phone,
  LayoutGrid,
  List,
  ShieldAlert,
  Star,
  ShieldUser,
  Activity,
  Zap,
  CheckCircle2,
  Ghost,
  Search,
  X,
} from "lucide-react";

const { getDisplayName } = nameHelper;

const LeadersPage = () => {
  const { hasAnyRole } = useAuth();

  const LEADER_TYPE_CONFIG = {
    SERVANT: {
      label: "Servidor",
      color: "indigo",
      icon: <Star size={16} />,
      gradient: "from-blue-500/20 to-indigo-600/20",
      iconColor: "text-blue-600 dark:text-blue-400",
      accent: "bg-blue-600",
      shadow: "shadow-blue-500/20",
    },
    LEADER_144: {
      label: "Líder 144",
      color: "violet",
      icon: <CircleUserRound size={16} />,
      gradient: "from-amber-500/20 to-orange-600/20",
      iconColor: "text-amber-600 dark:text-amber-400",
      accent: "bg-amber-500",
      shadow: "shadow-amber-500/20",
    },
    LEADER_12: {
      label: "Líder 12",
      color: "emerald",
      icon: <ShieldUser size={16} />,
      gradient: "from-green-500/20 to-emerald-600/20",
      iconColor: "text-green-600 dark:text-green-400",
      accent: "bg-green-600",
      shadow: "shadow-green-500/20",
    },
  };

  const LEADER_STATUS_CONFIG = {
    ACTIVE: {
      label: "Activo",
      textColor: "text-emerald-700 dark:text-emerald-400",
      bgColor: "bg-emerald-50 dark:bg-emerald-900/30",
      dotColor: "bg-emerald-500",
      border: "border-emerald-200 dark:border-emerald-800/50",
    },
    SUSPENDED: {
      label: "Suspendido",
      textColor: "text-amber-700 dark:text-amber-400",
      bgColor: "bg-amber-50 dark:bg-amber-900/30",
      dotColor: "bg-amber-500",
      border: "border-amber-200 dark:border-amber-800/50",
    },
    INACTIVE: {
      label: "Inactivo",
      textColor: "text-slate-500 dark:text-slate-400",
      bgColor: "bg-slate-100 dark:bg-slate-800",
      dotColor: "bg-slate-400",
      border: "border-slate-200 dark:border-slate-700",
    },
  };

  const [allLeaders, setAllLeaders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [viewMode, setViewMode] = useState("grid");

  const [filters, setFilters] = useState({
    status: "ALL",
    type: "ALL",
  });

  const [modals, setModals] = useState({
    promote: false,
    stats: false,
    detail: false,
  });

  const [selectedLeader, setSelectedLeader] = useState(null);
  const [statsData, setStatsData] = useState(null);

  const canManage = hasAnyRole(["ROLE_PASTORES", "ROLE_DESPLIEGUE"]);

  const loadLeaders = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiService.getLeaders();
      setAllLeaders(data || []);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const stats = await apiService.getLeaderStatistics();
      setStatsData(stats);
    } catch (error) {
      console.error("Error cargando Stats:", error);
    }
  }, []);

  useEffect(() => {
    loadLeaders();
    loadStats();
  }, [loadLeaders, loadStats]);

  const filteredLeaders = useMemo(() => {
    return allLeaders.filter((l) => {
      const name = l.memberName || "";
      const doc = l.memberDocument || "";
      const matchesSearch =
        !searchTerm ||
        name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.includes(searchTerm);
      const matchesStatus =
        filters.status === "ALL" || l.status === filters.status;
      const matchesType =
        filters.type === "ALL" || l.leaderType === filters.type;
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [allLeaders, searchTerm, filters]);

  const handleExportPDF = () => {
    const data = {
      leaders: filteredLeaders,
      title: "Censo de Liderazgo Ministerial",
      totalCount: filteredLeaders.length,
      date: new Date().toLocaleDateString(),
    };
    generateLeadersPDF(data);
  };

  const handleVerifyAll = async () => {
    if (!canManage) return;
    try {
      setLoading(true);
      const result = await apiService.verifyAllLeaders();
      setSuccessMessage(`✅ Verificación completada: ${result.suspended} suspendidos.`);
      loadLeaders();
      setTimeout(() => setSuccessMessage(""), 5000);
    } catch (err) {
      console.error("Error en verificación masiva:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyLeader = async (id, memberName) => {
    setActionLoading(true);
    try {
      await apiService.verifyLeader(id);
      await loadLeaders();
      setSelectedLeader((prev) =>
        prev ? { ...prev, lastVerificationDate: new Date().toISOString() } : null
      );
    } catch (e) {
      console.error(e);
      throw e;
    } finally {
      setActionLoading(false);
    }
  };

  const handleSuspendLeader = async (id, memberName) => {
    const reason = window.prompt(`Motivo de suspensión para ${memberName}:`);
    if (!reason) return;
    setActionLoading(true);
    try {
      await apiService.suspendLeader(id, reason);
      await loadLeaders();
      setSelectedLeader((prev) =>
        prev ? { ...prev, status: "SUSPENDED", suspensionReason: reason } : null
      );
    } catch (e) {
      throw e;
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnsuspendLeader = async (id, memberName) => {
    setActionLoading(true);
    try {
      await apiService.unsuspendLeader(id);
      await loadLeaders();
      setSelectedLeader((prev) =>
        prev ? { ...prev, status: "ACTIVE" } : null
      );
    } catch (e) {
      throw e;
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeactivateLeader = async (id, memberName) => {
    const reason = window.prompt(`Motivo de desactivación para ${memberName}:`);
    if (!reason) return;
    setActionLoading(true);
    try {
      await apiService.deactivateLeader(id, reason);
      await loadLeaders();
      setSelectedLeader((prev) =>
        prev
          ? { ...prev, status: "INACTIVE", deactivationReason: reason }
          : null
      );
    } catch (e) {
      throw e;
    } finally {
      setActionLoading(false);
    }
  };

  const handleReactivateLeader = async (id, memberName) => {
    setActionLoading(true);
    try {
      await apiService.reactivateLeader(id);
      await loadLeaders();
      setSelectedLeader((prev) =>
        prev ? { ...prev, status: "ACTIVE" } : null
      );
    } catch (e) {
      throw e;
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditLeader = async (id, payload) => {
    setActionLoading(true);
    try {
      await apiService.updateLeader(
        id,
        payload.leaderType,
        payload.cellGroupCode,
        payload.notes
      );
      await loadLeaders();
      const updated = await apiService.getLeaderById(id);
      setSelectedLeader(updated);
    } catch (e) {
      throw e;
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteLeader = async (id) => {
    setActionLoading(true);
    try {
      await apiService.deleteLeader(id);
      await loadLeaders();
      setModals({ ...modals, detail: false });
    } catch (e) {
      throw e;
    } finally {
      setActionLoading(false);
    }
  };

  const openStatsModal = async () => {
    await loadStats();
    let statsPayload = statsData || {
      totalLeaders: 0,
      activeLeaders: 0,
      byType: {},
    };
    if (filters.status !== "ALL" || filters.type !== "ALL" || searchTerm) {
      statsPayload = {
        ...statsPayload,
        hasFilters: true,
        currentViewCount: filteredLeaders.length,
        totalCount: allLeaders.length,
        filtersInfo: {
          status:
            filters.status !== "ALL"
              ? LEADER_STATUS_CONFIG[filters.status].label
              : null,
          type:
            filters.type !== "ALL"
              ? LEADER_TYPE_CONFIG[filters.type].label
              : null,
          search: searchTerm || null,
        },
      };
    }
    setStatsData(statsPayload);
    setModals({ ...modals, stats: true });
  };

  const hasActiveFilters =
    filters.status !== "ALL" || filters.type !== "ALL" || searchTerm;

  return (
    <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6 lg:space-y-8 pb-24 animate-in fade-in slide-in-from-bottom-6 duration-1000 px-3 sm:px-4 md:px-6 lg:px-8">

      {/* ── PAGE HERO ── */}
      <PageHero
        icon={Crown}
        eyebrow="Gobierno & Visión"
        title="Gestión de"
        highlight="Liderazgo"
        stats={[
          { label: `${allLeaders.length} Líderes`, variant: "emerald", icon: Users },
          { label: "Auditoría Activa", variant: "amber", icon: Zap },
        ]}
        actions={
          <div className="flex items-center gap-2">
            {/* Exportar — icono en sm/md/lg, texto desde xl */}
            <button
              onClick={handleExportPDF}
              title="Exportar Censo"
              className="flex items-center gap-2 px-3 py-3 xl:px-5 xl:py-3 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl font-black text-xs hover:bg-slate-100 dark:hover:bg-slate-700 hover:shadow-xl hover:-translate-y-1 transition-all group/btn"
            >
              <FileText size={16} className="group-hover/btn:rotate-12 transition-transform shrink-0" />
              <span className="hidden xl:inline">Exportar</span>
            </button>

            {/* Analíticas — icono en sm/md/lg, texto desde xl */}
            <button
              onClick={openStatsModal}
              title="Ver Analíticas"
              className="flex items-center gap-2 px-3 py-3 xl:px-5 xl:py-3 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-2xl font-black text-xs hover:bg-indigo-100 dark:hover:bg-indigo-900/60 hover:shadow-xl hover:-translate-y-1 transition-all group/btn"
            >
              <BarChart3 size={16} className="group-hover/btn:scale-110 transition-transform shrink-0" />
              <span className="hidden xl:inline">Analíticas</span>
            </button>

            {/* Promover — icono siempre, texto desde lg */}
            {canManage && (
              <button
                onClick={() => setModals({ ...modals, promote: true })}
                title="Promover Líder"
                className="flex items-center gap-2 px-3 py-3 lg:px-5 lg:py-3 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-2xl font-black text-xs shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:-translate-y-1 active:scale-95 transition-all group/btn"
              >
                <UserPlus size={16} className="group-hover/btn:scale-110 transition-transform shrink-0" />
                <span className="hidden lg:inline">Promover</span>
              </button>
            )}
          </div>
        }
      />

      {/* ── KPI GRID ── */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
        {Object.entries(LEADER_TYPE_CONFIG).map(([type, config]) => {
          const count = allLeaders.filter((l) => l.leaderType === type).length;
          return (
            <div
              key={type}
              className="bg-white dark:bg-slate-900 p-4 sm:p-5 lg:p-8 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 relative group hover:border-blue-300 dark:hover:border-blue-900/50 hover:shadow-2xl hover:shadow-blue-500/5 transition-all duration-500 overflow-hidden"
            >
              <div
                className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${config.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-2xl -mr-8 -mt-8`}
              />
              <div className="flex flex-col gap-3 relative z-10">
                {/* Icon — hidden on very small screens */}
                <div
                  className={`hidden sm:flex w-10 h-10 lg:w-12 lg:h-12 rounded-xl lg:rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 items-center justify-center ${config.iconColor} shadow-lg group-hover:scale-110 group-hover:rotate-6 transition-all duration-500`}
                >
                  {config.icon}
                </div>
                <div>
                  <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 leading-tight mb-1">
                    {config.label}
                  </p>
                  <h3 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 dark:text-white">
                    {count}
                  </h3>
                </div>
              </div>
              <div className="mt-3 lg:mt-6 w-full h-1 lg:h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full ${config.accent} transition-all duration-1000 ease-out delay-300`}
                  style={{
                    width: `${allLeaders.length > 0 ? (count / allLeaders.length) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* ── MAIN CONTENT CARD ── */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl shadow-blue-500/5 overflow-hidden">

        {/* ── MOBILE TOOLBAR ── */}
        <div className="flex items-center gap-2 p-3 sm:p-4 border-b border-slate-100 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-950/20 sm:hidden">
          {/* Search toggle */}
          <button
            onClick={() => setShowSearch(!showSearch)}
            className={`flex items-center justify-center w-11 h-11 rounded-2xl border transition-all ${
              showSearch || searchTerm
                ? "bg-blue-600 text-white border-blue-700"
                : "bg-white dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700"
            }`}
          >
            <Search size={18} />
          </button>

          {/* Status Filter */}
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="flex-1 h-11 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-3 text-xs font-bold outline-none text-slate-800 dark:text-slate-200 appearance-none"
          >
            <option value="ALL">Todos los estados</option>
            {Object.entries(LEADER_STATUS_CONFIG).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>

          {/* Type Filter */}
          <select
            value={filters.type}
            onChange={(e) => setFilters({ ...filters, type: e.target.value })}
            className="flex-1 h-11 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-3 text-xs font-bold outline-none text-slate-800 dark:text-slate-200 appearance-none"
          >
            <option value="ALL">Cualquier nivel</option>
            {Object.entries(LEADER_TYPE_CONFIG).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>

          {/* View mode */}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2.5 rounded-xl transition-all ${viewMode === "grid" ? "bg-white dark:bg-slate-700 shadow text-blue-600 dark:text-blue-400" : "text-slate-400"}`}
            >
              <LayoutGrid size={16} />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2.5 rounded-xl transition-all ${viewMode === "list" ? "bg-white dark:bg-slate-700 shadow text-blue-600 dark:text-blue-400" : "text-slate-400"}`}
            >
              <List size={16} />
            </button>
          </div>
        </div>

        {/* Mobile expandable search bar */}
        {showSearch && (
          <div className="px-3 pb-3 sm:hidden animate-in slide-in-from-top-2 duration-200">
            <div className="relative">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                autoFocus
                type="text"
                placeholder="Nombre o documento..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-12 pl-10 pr-10 bg-white dark:bg-slate-900 rounded-2xl font-bold text-sm outline-none border border-slate-200 dark:border-slate-800 focus:border-blue-400 dark:focus:border-blue-600 focus:ring-4 focus:ring-blue-50 dark:focus:ring-blue-900/10 transition-all text-slate-800 dark:text-slate-100"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── DESKTOP TOOLBAR ── */}
        <div className="hidden sm:flex items-center gap-4 p-5 lg:p-8 border-b border-slate-100 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-950/20">
          <div className="relative flex-1 group">
            <Search size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, apellido o documento..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-14 pl-12 pr-8 bg-white dark:bg-slate-900 rounded-2xl font-bold text-sm outline-none border border-slate-200 dark:border-slate-800 focus:border-blue-400 dark:focus:border-blue-600 focus:ring-8 focus:ring-blue-50 dark:focus:ring-blue-900/10 transition-all text-slate-800 dark:text-slate-100 shadow-sm"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl shadow-inner">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2.5 rounded-xl transition-all ${viewMode === "grid" ? "bg-white dark:bg-slate-700 shadow-md text-blue-600 dark:text-blue-400 scale-105" : "text-slate-400 hover:text-slate-600"}`}
              >
                <LayoutGrid size={18} />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-2.5 rounded-xl transition-all ${viewMode === "list" ? "bg-white dark:bg-slate-700 shadow-md text-blue-600 dark:text-blue-400 scale-105" : "text-slate-400 hover:text-slate-600"}`}
              >
                <List size={18} />
              </button>
            </div>
            {canManage && (
              <button
                onClick={handleVerifyAll}
                disabled={loading}
                className="flex items-center gap-2 px-5 py-3 bg-slate-900 dark:bg-slate-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black dark:hover:bg-slate-600 disabled:opacity-50 hover:shadow-xl hover:-translate-y-1 transition-all whitespace-nowrap active:scale-95"
              >
                <ShieldAlert size={16} className="text-amber-500" /> Auditoría Global
              </button>
            )}
          </div>
        </div>

        {/* ── DESKTOP EXTENDED FILTERS ── */}
        <div className="hidden sm:flex px-5 lg:px-8 py-4 gap-6 border-b border-slate-100 dark:border-slate-800/50 bg-white dark:bg-slate-900">
          <div className="flex flex-col gap-2 flex-1">
            <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest px-1 flex items-center gap-2">
              <Activity size={12} /> Filtrar por Estado
            </span>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl px-5 py-3 text-sm font-bold outline-none text-slate-800 dark:text-slate-200 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all appearance-none cursor-pointer"
            >
              <option value="ALL">Todos los Estados</option>
              {Object.entries(LEADER_STATUS_CONFIG).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2 flex-1">
            <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest px-1 flex items-center gap-2">
              <Crown size={12} /> Nivel de Jerarquía
            </span>
            <select
              value={filters.type}
              onChange={(e) => setFilters({ ...filters, type: e.target.value })}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl px-5 py-3 text-sm font-bold outline-none text-slate-800 dark:text-slate-200 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all appearance-none cursor-pointer"
            >
              <option value="ALL">Cualquier Nivel</option>
              {Object.entries(LEADER_TYPE_CONFIG).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Active filters pill strip — mobile */}
        {hasActiveFilters && (
          <div className="flex items-center gap-2 px-3 py-2 sm:hidden overflow-x-auto">
            {searchTerm && (
              <span className="flex items-center gap-1.5 text-[10px] font-black bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800 rounded-full px-3 py-1.5 whitespace-nowrap">
                "{searchTerm.slice(0, 12)}{searchTerm.length > 12 ? "…" : ""}"
                <button onClick={() => setSearchTerm("")}><X size={10} /></button>
              </span>
            )}
            {filters.status !== "ALL" && (
              <span className="flex items-center gap-1.5 text-[10px] font-black bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-full px-3 py-1.5 whitespace-nowrap">
                {LEADER_STATUS_CONFIG[filters.status].label}
                <button onClick={() => setFilters({ ...filters, status: "ALL" })}><X size={10} /></button>
              </span>
            )}
            {filters.type !== "ALL" && (
              <span className="flex items-center gap-1.5 text-[10px] font-black bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-full px-3 py-1.5 whitespace-nowrap">
                {LEADER_TYPE_CONFIG[filters.type].label}
                <button onClick={() => setFilters({ ...filters, type: "ALL" })}><X size={10} /></button>
              </span>
            )}
            <button
              onClick={() => { setSearchTerm(""); setFilters({ status: "ALL", type: "ALL" }); }}
              className="ml-auto text-[10px] font-black text-blue-600 dark:text-blue-400 whitespace-nowrap"
            >
              Limpiar
            </button>
          </div>
        )}

        {/* Mobile Verify All CTA */}
        {canManage && (
          <div className="sm:hidden px-3 pb-3">
            <button
              onClick={handleVerifyAll}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 bg-slate-900 dark:bg-slate-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black disabled:opacity-50 transition-all active:scale-95"
            >
              <ShieldAlert size={16} className="text-amber-500" /> Auditoría Global
            </button>
          </div>
        )}

        {/* Success Message */}
        {successMessage && (
          <div className="mx-3 sm:mx-8 mt-4 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 rounded-2xl text-emerald-700 dark:text-emerald-400 font-bold text-sm flex items-center gap-3 animate-in fade-in zoom-in duration-300">
            <CheckCircle2 size={18} /> {successMessage}
          </div>
        )}

        {/* ── CONTENT ── */}
        {loading ? (
          <div className="p-16 sm:p-24 text-center space-y-6">
            <div className="relative mx-auto w-14 h-14 sm:w-16 sm:h-16">
              <RefreshCcw size={56} className="text-blue-500 animate-spin opacity-20" />
              <ShieldCheck size={28} className="absolute inset-0 m-auto text-blue-600 animate-pulse" />
            </div>
            <div className="space-y-2">
              <p className="text-base sm:text-lg font-black text-slate-800 dark:text-white">Sincronizando archivos maestro</p>
              <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest animate-pulse">
                Verificando credenciales...
              </p>
            </div>
          </div>
        ) : filteredLeaders.length === 0 ? (
          <div className="p-16 sm:p-24 text-center flex flex-col items-center">
            <div className="w-20 h-20 sm:w-24 sm:h-24 bg-slate-50 dark:bg-slate-800 rounded-3xl flex items-center justify-center mb-6 border border-slate-100 dark:border-slate-700 shadow-inner">
              <Ghost size={40} className="text-slate-300 dark:text-slate-600" />
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mb-2 tracking-tighter">
              Sin coincidencias
            </h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium max-w-xs leading-relaxed">
              Prueba ajustando los filtros de búsqueda o el nivel de jerarquía.
            </p>
            <button
              onClick={() => { setSearchTerm(""); setFilters({ status: "ALL", type: "ALL" }); }}
              className="mt-6 text-blue-600 dark:text-blue-400 font-black text-xs uppercase tracking-widest hover:underline"
            >
              Reiniciar Filtros
            </button>
          </div>

        ) : viewMode === "grid" ? (
          /* ── GRID VIEW ── */
          <div className="p-3 sm:p-5 lg:p-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5 lg:gap-8 bg-slate-50/50 dark:bg-slate-950/20">
            {filteredLeaders.map((leader, idx) => {
              const typeCfg = LEADER_TYPE_CONFIG[leader.leaderType];
              const statusCfg = LEADER_STATUS_CONFIG[leader.status];
              return (
                <div
                  key={leader.id}
                  onClick={() => { setSelectedLeader(leader); setModals({ ...modals, detail: true }); }}
                  className="group relative bg-white dark:bg-slate-900 p-5 sm:p-6 lg:p-8 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-800 hover:shadow-[0_20px_50px_rgba(59,130,246,0.1)] transition-all duration-500 cursor-pointer overflow-hidden animate-in fade-in slide-in-from-bottom-4"
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  {/* Decorative */}
                  <div className={`absolute top-0 right-0 w-28 h-28 bg-gradient-to-bl ${typeCfg.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-700 pointer-events-none rounded-bl-[3rem]`} />

                  {/* Header */}
                  <div className="flex items-start justify-between mb-5 lg:mb-8 relative">
                    <div
                      className={`w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 rounded-xl sm:rounded-2xl bg-gradient-to-br ${typeCfg.gradient} flex items-center justify-center ${typeCfg.iconColor} font-black text-xl sm:text-2xl shadow-xl group-hover:scale-110 group-hover:rotate-3 transition-all duration-500`}
                    >
                      {leader.memberName?.[0]?.toUpperCase()}
                    </div>
                    <div
                      className={`px-2.5 py-1.5 sm:px-4 sm:py-2 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 sm:gap-2 ${statusCfg.bgColor} ${statusCfg.textColor} border ${statusCfg.border} shadow-sm group-hover:-translate-y-1 transition-transform`}
                    >
                      <span className={`inline-block w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${statusCfg.dotColor} animate-pulse`} />
                      {statusCfg.label}
                    </div>
                  </div>

                  {/* Info */}
                  <div className="space-y-2 relative">
                    <h4 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-1 tracking-tighter">
                      {getDisplayName(leader.memberName)}
                    </h4>
                    <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest bg-slate-50 dark:bg-slate-800/50 w-fit px-2.5 py-1.5 rounded-lg border border-slate-100 dark:border-slate-700">
                      <span className={typeCfg.iconColor}>{typeCfg.icon}</span>
                      {typeCfg.label}
                    </div>
                  </div>

                  {/* Footer info */}
                  <div className="mt-5 lg:mt-8 pt-4 lg:pt-6 border-t border-slate-100 dark:border-slate-800 space-y-3 relative">
                    <div className="flex items-center justify-between text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1.5 uppercase text-[9px] sm:text-[10px] tracking-widest">
                        <Phone size={12} className="text-blue-400" /> Móvil
                      </span>
                      <span className="text-slate-800 dark:text-slate-200 text-xs sm:text-sm">
                        {leader.memberPhone || "—"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1.5 uppercase text-[9px] sm:text-[10px] tracking-widest">
                        <Clock size={12} className="text-blue-400" /> Promoción
                      </span>
                      <span className="text-slate-800 dark:text-slate-200 text-xs sm:text-sm">
                        {new Date(leader.promotionDate).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* CTA */}
                  <div className="mt-4 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-500">
                    <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">
                      Ver Perfil
                    </span>
                    <ChevronRight size={12} className="text-blue-600" />
                  </div>
                </div>
              );
            })}
          </div>

        ) : (
          /* ── LIST VIEW ── */
          <>
            {/* Mobile list — compact cards, no table */}
            <div className="sm:hidden divide-y divide-slate-100 dark:divide-slate-800/50">
              {filteredLeaders.map((leader, idx) => {
                const typeCfg = LEADER_TYPE_CONFIG[leader.leaderType];
                const statusCfg = LEADER_STATUS_CONFIG[leader.status];
                return (
                  <div
                    key={leader.id}
                    onClick={() => { setSelectedLeader(leader); setModals({ ...modals, detail: true }); }}
                    className="flex items-center gap-3 px-4 py-4 active:bg-slate-50 dark:active:bg-slate-800/50 transition-colors cursor-pointer"
                  >
                    {/* Avatar */}
                    <div
                      className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${typeCfg.gradient} flex items-center justify-center ${typeCfg.iconColor} font-black text-base shrink-0 shadow-md`}
                    >
                      {leader.memberName?.[0]?.toUpperCase()}
                    </div>

                    {/* Main info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black text-slate-900 dark:text-white truncate tracking-tight">
                        {getDisplayName(leader.memberName)}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-[9px] font-black uppercase tracking-wider ${typeCfg.iconColor}`}>
                          {typeCfg.label}
                        </span>
                        <span className="text-slate-300 dark:text-slate-600">·</span>
                        <span className="text-[9px] font-bold text-slate-400">
                          {new Date(leader.promotionDate).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    {/* Status badge + chevron */}
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider ${statusCfg.bgColor} ${statusCfg.textColor} border ${statusCfg.border}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dotColor}`} />
                        {statusCfg.label}
                      </span>
                      <ChevronRight size={14} className="text-slate-300 dark:text-slate-600" />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full min-w-[800px] border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                    <th className="px-6 lg:px-8 py-5 text-left text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-[0.2em]">Líder & Credencial</th>
                    <th className="px-6 lg:px-8 py-5 text-left text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-[0.2em]">Rango</th>
                    <th className="px-6 lg:px-8 py-5 text-left text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-[0.2em]">Estado</th>
                    <th className="px-6 lg:px-8 py-5 text-left text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-[0.2em]">Última Auditoría</th>
                    <th className="px-6 lg:px-8 py-5 text-right text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-[0.2em]">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                  {filteredLeaders.map((leader) => {
                    const typeCfg = LEADER_TYPE_CONFIG[leader.leaderType];
                    const statusCfg = LEADER_STATUS_CONFIG[leader.status];
                    return (
                      <tr
                        key={leader.id}
                        className="group hover:bg-slate-50/80 dark:hover:bg-blue-900/10 transition-all cursor-pointer"
                        onClick={() => { setSelectedLeader(leader); setModals({ ...modals, detail: true }); }}
                      >
                        <td className="px-6 lg:px-8 py-5">
                          <div className="flex items-center gap-4">
                            <div
                              className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${typeCfg.gradient} flex items-center justify-center ${typeCfg.iconColor} font-black text-base shrink-0 shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-transform`}
                            >
                              {leader.memberName?.[0]?.toUpperCase()}
                            </div>
                            <div className="space-y-0.5">
                              <p className="text-sm font-black text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors tracking-tight">
                                {getDisplayName(leader.memberName)}
                              </p>
                              <p className="text-xs font-bold text-slate-400 dark:text-slate-500">
                                {leader.memberEmail || "Sin correo"}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 lg:px-8 py-5">
                          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                            <span className={typeCfg.iconColor}>{typeCfg.icon}</span>
                            <span className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-tighter">
                              {typeCfg.label}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 lg:px-8 py-5">
                          <span
                            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest ${statusCfg.bgColor} ${statusCfg.textColor} border ${statusCfg.border} shadow-sm`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dotColor}`} />
                            {statusCfg.label}
                          </span>
                        </td>
                        <td className="px-6 lg:px-8 py-5">
                          <div className="flex flex-col gap-0.5">
                            <p className="text-sm font-black text-slate-700 dark:text-slate-300 flex items-center gap-2">
                              {leader.lastVerificationDate ? (
                                <>
                                  <ShieldCheck size={14} className="text-emerald-500" />
                                  {new Date(leader.lastVerificationDate).toLocaleDateString()}
                                </>
                              ) : (
                                <>
                                  <AlertTriangle size={14} className="text-amber-500 animate-pulse" />
                                  Pendiente
                                </>
                              )}
                            </p>
                            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tighter">
                              Último Reporte
                            </p>
                          </div>
                        </td>
                        <td className="px-6 lg:px-8 py-5 text-right">
                          <button className="p-2.5 text-slate-300 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/40 rounded-xl transition-all active:scale-90 border border-transparent hover:border-blue-100">
                            <MoreVertical size={18} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* ── MODALS ── */}
      {modals.promote && (
        <ModalPromoteLeader
          onClose={() => setModals({ ...modals, promote: false })}
          onSuccess={() => { setModals({ ...modals, promote: false }); loadLeaders(); }}
        />
      )}
      {modals.stats && statsData && (
        <ModalLeaderStatistics
          onClose={() => setModals({ ...modals, stats: false })}
          stats={statsData}
        />
      )}
      {modals.detail && selectedLeader && (
        <ModalLeaderDetail
          isOpen={modals.detail}
          leader={selectedLeader}
          loading={actionLoading}
          onClose={() => { setModals({ ...modals, detail: false }); setSelectedLeader(null); }}
          onVerify={handleVerifyLeader}
          onSuspend={handleSuspendLeader}
          onUnsuspend={handleUnsuspendLeader}
          onDeactivate={handleDeactivateLeader}
          onReactivate={handleReactivateLeader}
          onEdit={handleEditLeader}
          onDelete={handleDeleteLeader}
        />
      )}

      {/* Footer hint */}
      <div className="text-center text-slate-400 dark:text-slate-600 text-[10px] font-black uppercase tracking-[0.3em] py-6">
        Base de Datos de Liderazgo — David Vision 2026
      </div>
    </div>
  );
};

export default LeadersPage;