import React, { useState, useEffect, useCallback, useMemo } from "react";
import apiService from "../apiService";
import { generateLeadersPDF } from "../services/leadersPdfGenerator";
import nameHelper from "../services/nameHelper";
import ModalPromoteLeader from "../components/ModalPromoteLeader";
import ModalLeaderStatistics from "../components/ModalLeaderStatistics";
import ModalLeaderDetail from "../components/ModalLeaderDetail";
import { useAuth } from "../context/AuthContext";
import { 
  Users, 
  Crown, 
  ShieldCheck, 
  Search, 
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
  Award,
  Activity,
  Zap,
  CheckCircle2,
  Ghost,
} from "lucide-react";

const { getDisplayName } = nameHelper;
console.log("LEADERS PAGE UPDATED - NO CALENDAR");

const LeadersPage = () => {
  const { user, hasAnyRole } = useAuth();
  
  const LEADER_TYPE_CONFIG = {
    SERVANT: { 
      label: "Servidor", 
      color: "indigo", 
      icon: <Star size={20} />,
      gradient: "from-blue-500/20 to-indigo-600/20",
      iconColor: "text-blue-600 dark:text-blue-400",
      accent: "bg-blue-600",
      shadow: "shadow-blue-500/20"
    },
    LEADER_144: { 
      label: "Líder 144", 
      color: "violet", 
      icon: <Users size={20} />,
      gradient: "from-amber-500/20 to-orange-600/20",
      iconColor: "text-amber-600 dark:text-amber-400",
      accent: "bg-amber-500",
      shadow: "shadow-amber-500/20"
    },
    LEADER_12: { 
      label: "Líder 12", 
      color: "emerald", 
      icon: <Award size={20} />,
      gradient: "from-green-500/20 to-emerald-600/20",
      iconColor: "text-green-600 dark:text-green-400",
      accent: "bg-green-600",
      shadow: "shadow-green-500/20"
    },
  };

  const LEADER_STATUS_CONFIG = {
    ACTIVE: { 
      label: "Activo", 
      textColor: "text-emerald-700 dark:text-emerald-400", 
      bgColor: "bg-emerald-50 dark:bg-emerald-900/30", 
      dotColor: "bg-emerald-500",
      border: "border-emerald-200 dark:border-emerald-800/50"
    },
    SUSPENDED: { 
      label: "Suspendido", 
      textColor: "text-amber-700 dark:text-amber-400", 
      bgColor: "bg-amber-50 dark:bg-amber-900/30", 
      dotColor: "bg-amber-500",
      border: "border-amber-200 dark:border-amber-800/50"
    },
    INACTIVE: { 
      label: "Inactivo", 
      textColor: "text-slate-500 dark:text-slate-400", 
      bgColor: "bg-slate-100 dark:bg-slate-800", 
      dotColor: "bg-slate-400",
      border: "border-slate-200 dark:border-slate-700"
    },
  };

  const [allLeaders, setAllLeaders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState("grid"); // grid, list
  
  const [filters, setFilters] = useState({
    status: "ALL",
    type: "ALL"
  });

  const [modals, setModals] = useState({
    promote: false,
    stats: false,
    detail: false
  });
  
  const [selectedLeader, setSelectedLeader] = useState(null);
  const [statsData, setStatsData] = useState(null);

  const canManage = hasAnyRole(["ROLE_PASTORES", "ROLE_DESPLIEGUE"]);

  const loadLeaders = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const data = await apiService.getLeaders();
      setAllLeaders(data || []);
    } catch (err) {
      setError("No se pudieron sincronizar los líderes");
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
    return allLeaders.filter(l => {
      const name = l.memberName || "";
      const doc = l.memberDocument || "";
      const matchesSearch = !searchTerm || 
        name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        doc.includes(searchTerm);
      const matchesStatus = filters.status === "ALL" || l.status === filters.status;
      const matchesType = filters.type === "ALL" || l.leaderType === filters.type;
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [allLeaders, searchTerm, filters]);

  const handleExportPDF = () => {
    const data = {
      leaders: filteredLeaders,
      title: "Censo de Liderazgo Ministerial",
      totalCount: filteredLeaders.length,
      date: new Date().toLocaleDateString()
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
      setError("Error en verificación masiva");
    } finally {
      setLoading(false);
    }
  };

  // Handlers ModalLeaderDetail
  const handleVerifyLeader = async (id, memberName) => {
    setActionLoading(true);
    try {
      await apiService.verifyLeader(id);
      await loadLeaders();
      setSelectedLeader(prev => prev ? {...prev, lastVerificationDate: new Date().toISOString()} : null);
    } catch (e) {
      console.error(e);
      throw e;
    } finally {
      setActionLoading(false);
    }
  };

  const handleSuspendLeader = async (id, memberName) => {
    const reason = window.prompt(`Motivo de suspensión para ${memberName}:`);
    if(!reason) return;
    setActionLoading(true);
    try {
      await apiService.suspendLeader(id, reason);
      await loadLeaders();
      setSelectedLeader(prev => prev ? {...prev, status: 'SUSPENDED', suspensionReason: reason} : null);
    } catch(e) {
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
      setSelectedLeader(prev => prev ? {...prev, status: 'ACTIVE'} : null);
    } catch(e) {
      throw e;
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeactivateLeader = async (id, memberName) => {
    const reason = window.prompt(`Motivo de desactivación para ${memberName}:`);
    if(!reason) return;
    setActionLoading(true);
    try {
      await apiService.deactivateLeader(id, reason);
      await loadLeaders();
      setSelectedLeader(prev => prev ? {...prev, status: 'INACTIVE', deactivationReason: reason} : null);
    } catch(e) {
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
      setSelectedLeader(prev => prev ? {...prev, status: 'ACTIVE'} : null);
    } catch(e) {
      throw e;
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditLeader = async (id, payload) => {
    setActionLoading(true);
    try {
      await apiService.updateLeader(id, payload.leaderType, payload.cellGroupCode, payload.notes);
      await loadLeaders();
      const updated = await apiService.getLeaderById(id);
      setSelectedLeader(updated);
    } catch(e) {
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
      setModals({...modals, detail: false});
    } catch(e) {
      throw e;
    } finally {
      setActionLoading(false);
    }
  };

  const openStatsModal = async () => {
    await loadStats();
    let statsPayload = statsData || { totalLeaders: 0, activeLeaders: 0, byType: {} };
    if (filters.status !== 'ALL' || filters.type !== 'ALL' || searchTerm) {
      statsPayload = {
         ...statsPayload,
         hasFilters: true,
         currentViewCount: filteredLeaders.length,
         totalCount: allLeaders.length,
         filtersInfo: {
            status: filters.status !== 'ALL' ? LEADER_STATUS_CONFIG[filters.status].label : null,
            type: filters.type !== 'ALL' ? LEADER_TYPE_CONFIG[filters.type].label : null,
            search: searchTerm || null
         }
      };
    }
    setStatsData(statsPayload);
    setModals({...modals, stats: true});
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20 animate-in fade-in slide-in-from-bottom-6 duration-1000 p-4 md:p-8">
      
      {/* ── TOP HEADER ── */}
      <div className="bg-white dark:bg-slate-900 p-8 md:p-10 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-2xl shadow-blue-500/5 flex flex-col lg:flex-row lg:items-center justify-between gap-8 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-blue-500/10 to-transparent rounded-bl-full -mr-10 -mt-10 group-hover:scale-110 transition-transform duration-1000 pointer-events-none" />
        
        <div className="space-y-4 relative z-10">
          <div className="flex items-center gap-3 text-blue-600 dark:text-blue-400 font-black text-xs uppercase tracking-[0.4em]">
            <Crown size={16} className="animate-pulse" /> Gobierno & Visión
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-slate-900 dark:text-white leading-tight">
            Gestión de <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Liderazgo</span>
          </h1>
          <div className="flex items-center gap-4">
            <div className="bg-emerald-50 dark:bg-emerald-900/30 px-4 py-2 rounded-2xl flex items-center gap-2 border border-emerald-100 dark:border-emerald-800/50">
              <Users size={18} className="text-emerald-500" />
              <span className="text-emerald-700 dark:text-emerald-400 font-bold text-sm tracking-tight">{allLeaders.length} Líderes en Total</span>
            </div>
            <div className="hidden sm:flex items-center gap-2 text-slate-400 dark:text-slate-500 text-xs font-bold uppercase tracking-widest">
              <Zap size={14} className="text-amber-500" /> Sistema de Auditoría Activo
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 relative z-10">
          <button 
            onClick={handleExportPDF}
            className="flex items-center gap-3 px-6 py-4 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-[1.5rem] font-black text-sm hover:bg-slate-100 dark:hover:bg-slate-700 hover:shadow-xl hover:-translate-y-1 transition-all group/btn"
          >
            <FileText size={20} className="group-hover/btn:rotate-12 transition-transform" /> Exportar Censo
          </button>
          <button 
            onClick={openStatsModal}
            className="flex items-center gap-3 px-6 py-4 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-[1.5rem] font-black text-sm hover:bg-indigo-100 dark:hover:bg-indigo-900/60 hover:shadow-xl hover:-translate-y-1 transition-all group/btn"
          >
            <BarChart3 size={20} className="group-hover/btn:scale-110 transition-transform" /> Analíticas
          </button>
          {canManage && (
            <button 
              onClick={() => setModals({ ...modals, promote: true })}
              className="flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-[1.5rem] font-black text-sm shadow-2xl shadow-blue-500/30 hover:shadow-blue-500/50 hover:-translate-y-1 active:scale-95 transition-all group/btn"
            >
              <UserPlus size={20} className="group-hover/btn:scale-110 transition-transform" /> Promover Líder
            </button>
          )}
        </div>
      </div>

      {/* ── KPI GRID ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
        {Object.entries(LEADER_TYPE_CONFIG).map(([type, config]) => {
          const count = allLeaders.filter(l => l.leaderType === type).length;
          return (
            <div key={type} className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 relative group hover:border-blue-300 dark:hover:border-blue-900/50 hover:shadow-2xl hover:shadow-blue-500/5 transition-all duration-500 overflow-hidden">
              <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${config.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-2xl -mr-10 -mt-10`} />
              
              <div className="flex items-center justify-between relative z-10">
                <div className="space-y-2">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">{config.label}</p>
                  <h3 className="text-4xl font-black text-slate-900 dark:text-white flex items-baseline gap-1">
                    {count}
                    <span className="text-xs font-bold text-slate-400 tracking-tighter ml-1">MIEMBROS</span>
                  </h3>
                </div>
                <div className={`w-14 h-14 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center ${config.iconColor} shadow-xl group-hover:scale-110 group-hover:rotate-6 transition-all duration-500`}>
                  {config.icon}
                </div>
              </div>
              <div className="mt-6 w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className={`h-full ${config.accent} transition-all duration-1000 ease-out delay-300`} 
                  style={{ width: `${allLeaders.length > 0 ? (count / allLeaders.length) * 100 : 0}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* ── MAIN CONTENT CARD ── */}
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-2xl shadow-blue-500/5 overflow-hidden">
        
        {/* Filtering Bar */}
        <div className="p-6 md:p-8 flex flex-col md:flex-row items-center gap-6 border-b border-slate-100 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-950/20">
          <div className="relative flex-1 w-full group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 group-focus-within:scale-110 transition-all" size={20} />
            <input 
              type="text" 
              placeholder="Buscar por nombre, apellido o documento..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-14 md:h-16 pl-14 pr-8 bg-white dark:bg-slate-900 rounded-[1.5rem] font-bold text-sm outline-none border border-slate-200 dark:border-slate-800 focus:border-blue-400 dark:focus:border-blue-600 focus:ring-8 focus:ring-blue-50 dark:focus:ring-blue-900/10 transition-all text-slate-800 dark:text-slate-100 shadow-sm"
            />
          </div>
          
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl shadow-inner">
              <button 
                onClick={() => setViewMode("grid")}
                className={`p-3 rounded-xl transition-all ${viewMode === "grid" ? "bg-white dark:bg-slate-700 shadow-md text-blue-600 dark:text-blue-400 scale-105" : "text-slate-400 hover:text-slate-600"}`}
              >
                <LayoutGrid size={20} />
              </button>
              <button 
                onClick={() => setViewMode("list")}
                className={`p-3 rounded-xl transition-all ${viewMode === "list" ? "bg-white dark:bg-slate-700 shadow-md text-blue-600 dark:text-blue-400 scale-105" : "text-slate-400 hover:text-slate-600"}`}
              >
                <List size={20} />
              </button>
            </div>
            {canManage && (
              <button 
                onClick={handleVerifyAll}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-4 bg-slate-900 dark:bg-slate-700 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-widest hover:bg-black dark:hover:bg-slate-600 disabled:opacity-50 hover:shadow-xl hover:-translate-y-1 transition-all whitespace-nowrap active:scale-95"
              >
                <ShieldAlert size={18} className="text-amber-500" /> Auditoría Global
              </button>
            )}
          </div>
        </div>

        {/* Extended Filters */}
        <div className="px-8 py-5 flex flex-col sm:flex-row gap-6 border-b border-slate-100 dark:border-slate-800/50 bg-white dark:bg-slate-900">
           <div className="flex flex-col gap-2 flex-1">
             <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest px-1 flex items-center gap-2">
               <Activity size={12} /> Filtrar por Estado
             </span>
             <select 
               value={filters.status}
               onChange={(e) => setFilters({...filters, status: e.target.value})}
               className="bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl px-5 py-3 text-sm font-bold outline-none text-slate-800 dark:text-slate-200 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all appearance-none cursor-pointer"
             >
               <option value="ALL">Todos los Estados</option>
               {Object.entries(LEADER_STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
             </select>
           </div>
           <div className="flex flex-col gap-2 flex-1">
             <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest px-1 flex items-center gap-2">
               <Crown size={12} /> Nivel de Jerarquía
             </span>
             <select 
               value={filters.type}
               onChange={(e) => setFilters({...filters, type: e.target.value})}
               className="bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl px-5 py-3 text-sm font-bold outline-none text-slate-800 dark:text-slate-200 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all appearance-none cursor-pointer"
             >
               <option value="ALL">Cualquier Nivel</option>
               {Object.entries(LEADER_TYPE_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
             </select>
           </div>
        </div>

        {/* Message Alert */}
        {successMessage && (
          <div className="mx-8 mt-6 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 rounded-2xl text-emerald-700 dark:text-emerald-400 font-bold text-sm flex items-center gap-3 animate-in fade-in zoom-in duration-300">
            <CheckCircle2 size={18} /> {successMessage}
          </div>
        )}

        {/* Empty States / Loading / Content */}
        {loading ? (
          <div className="p-24 text-center space-y-6">
            <div className="relative mx-auto w-16 h-16">
              <RefreshCcw size={64} className="text-blue-500 animate-spin opacity-20" />
              <ShieldCheck size={32} className="absolute inset-0 m-auto text-blue-600 animate-pulse" />
            </div>
            <div className="space-y-2">
              <p className="text-lg font-black text-slate-800 dark:text-white">Sincronizando archivos maestro</p>
              <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest animate-pulse">Verificando credenciales de acceso...</p>
            </div>
          </div>
        ) : filteredLeaders.length === 0 ? (
          <div className="p-24 text-center flex flex-col items-center">
            <div className="w-24 h-24 bg-slate-50 dark:bg-slate-800 rounded-[2rem] flex items-center justify-center mb-8 border border-slate-100 dark:border-slate-700 shadow-inner">
              <Ghost size={48} className="text-slate-300 dark:text-slate-600" />
            </div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2 tracking-tighter">Sin coincidencias en el radar</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium max-w-xs leading-relaxed">Prueba ajustando los filtros de búsqueda o el nivel de jerarquía para encontrar lo que buscas.</p>
            <button onClick={() => { setSearchTerm(""); setFilters({status: "ALL", type: "ALL"}); }} className="mt-8 text-blue-600 dark:text-blue-400 font-black text-xs uppercase tracking-widest hover:underline">Reiniciar Filtros</button>
          </div>
        ) : viewMode === "grid" ? (
          <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 bg-slate-50/50 dark:bg-slate-950/20">
            {filteredLeaders.map((leader, idx) => {
              const typeCfg = LEADER_TYPE_CONFIG[leader.leaderType];
              const statusCfg = LEADER_STATUS_CONFIG[leader.status];
              return (
              <div 
                key={leader.id}
                onClick={() => { setSelectedLeader(leader); setModals({...modals, detail: true}); }}
                className="group relative bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-800 hover:shadow-[0_20px_50px_rgba(59,130,246,0.1)] transition-all duration-500 cursor-pointer overflow-hidden animate-in fade-in slide-in-from-bottom-4"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                {/* Decorative Elements */}
                <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl ${typeCfg.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-700 pointer-events-none rounded-bl-[4rem]`} />
                <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl pointer-events-none group-hover:scale-150 transition-transform duration-1000" />
                
                <div className="flex items-start justify-between mb-8 relative">
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${typeCfg.gradient} flex items-center justify-center ${typeCfg.iconColor} font-black text-2xl shadow-xl group-hover:scale-110 group-hover:rotate-3 transition-all duration-500`}>
                    {leader.memberName?.[0]?.toUpperCase()}
                  </div>
                  <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-2 ${statusCfg.bgColor} ${statusCfg.textColor} border ${statusCfg.border} shadow-sm group-hover:-translate-y-1 transition-transform`}>
                    <span className={`inline-block w-2 h-2 rounded-full ${statusCfg.dotColor} animate-pulse shadow-glow`} />
                    {statusCfg.label}
                  </div>
                </div>

                <div className="space-y-2 relative">
                  <h4 className="text-xl font-black text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-1 tracking-tighter">
                    {getDisplayName(leader.memberName)}
                  </h4>
                  <div className="flex items-center gap-2.5 text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest bg-slate-50 dark:bg-slate-800/50 w-fit px-3 py-1.5 rounded-lg border border-slate-100 dark:border-slate-700 group-hover:border-blue-200 dark:group-hover:border-blue-900 transition-colors">
                     <span className={typeCfg.iconColor}>{typeCfg.icon}</span>
                     {typeCfg.label}
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 space-y-4 relative">
                  <div className="flex items-center justify-between text-sm font-bold text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-2 uppercase text-[10px] tracking-widest"><Phone size={14} className="text-blue-400" /> Móvil</span>
                    <span className="text-slate-800 dark:text-slate-200">{leader.memberPhone || '—'}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm font-bold text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-2 uppercase text-[10px] tracking-widest"><Clock size={14} className="text-blue-400" /> Promoción</span>
                    <span className="text-slate-800 dark:text-slate-200">{new Date(leader.promotionDate).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="mt-6 flex items-center gap-2 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-500">
                  <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">Ver Perfil Completo</span>
                  <ChevronRight size={14} className="text-blue-600 font-bold" />
                </div>
              </div>
            )})}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                  <th className="px-8 py-6 text-left text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-[0.2em]">Líder & Credencial</th>
                  <th className="px-8 py-6 text-left text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-[0.2em]">Rango de Gobierno</th>
                  <th className="px-8 py-6 text-left text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-[0.2em]">Estado Actual</th>
                  <th className="px-8 py-6 text-left text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-[0.2em]">Historial Auditoría</th>
                  <th className="px-8 py-6 text-right text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-[0.2em]">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                {filteredLeaders.map((leader, idx) => {
                  const typeCfg = LEADER_TYPE_CONFIG[leader.leaderType];
                  const statusCfg = LEADER_STATUS_CONFIG[leader.status];
                  return (
                  <tr 
                    key={leader.id} 
                    className="group hover:bg-slate-50/80 dark:hover:bg-blue-900/10 transition-all cursor-pointer" 
                    onClick={() => { setSelectedLeader(leader); setModals({...modals, detail: true}); }}
                  >
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-5">
                        <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${typeCfg.gradient} flex items-center justify-center ${typeCfg.iconColor} font-black text-lg shrink-0 shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-transform`}>
                          {leader.memberName?.[0]?.toUpperCase()}
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-base font-black text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors tracking-tight">{getDisplayName(leader.memberName)}</p>
                          <p className="text-xs font-bold text-slate-400 dark:text-slate-500 tracking-tight">{leader.memberEmail || 'Sin dirección de correo'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="inline-flex items-center gap-2.5 px-4 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                        <span className={typeCfg.iconColor}>{typeCfg.icon}</span>
                        <span className="text-sm font-black text-slate-700 dark:text-slate-300 uppercase tracking-tighter">{typeCfg.label}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className={`inline-flex items-center gap-2.5 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest ${statusCfg.bgColor} ${statusCfg.textColor} border ${statusCfg.border} shadow-sm`}>
                        <span className={`w-2 h-2 rounded-full ${statusCfg.dotColor} shadow-glow`} />
                        {statusCfg.label}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex flex-col gap-1">
                        <p className="text-sm font-black text-slate-700 dark:text-slate-300 flex items-center gap-2">
                          {leader.lastVerificationDate 
                            ? <><ShieldCheck size={16} className="text-emerald-500"/> {new Date(leader.lastVerificationDate).toLocaleDateString()}</> 
                            : <><AlertTriangle size={16} className="text-amber-500 animate-pulse"/> Pendiente</>}
                        </p>
                        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tighter">Último Reporte de Guardia</p>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <button className="p-3 text-slate-300 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/40 rounded-2xl transition-all active:scale-90 shadow-sm border border-transparent hover:border-blue-100">
                        <MoreVertical size={20} />
                      </button>
                    </td>
                  </tr>
                )})}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals Section */}
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
          onClose={() => { setModals({...modals, detail: false}); setSelectedLeader(null); }}
          onVerify={handleVerifyLeader}
          onSuspend={handleSuspendLeader}
          onUnsuspend={handleUnsuspendLeader}
          onDeactivate={handleDeactivateLeader}
          onReactivate={handleReactivateLeader}
          onEdit={handleEditLeader}
          onDelete={handleDeleteLeader}
        />
      )}

      {/* Floating Action Hint */}
      <div className="text-center text-slate-400 dark:text-slate-600 text-[10px] font-black uppercase tracking-[0.3em] py-8">
        Base de Datos de Liderazgo Ministerial — David Vision 2026
      </div>
    </div>
  );
};

export default LeadersPage;