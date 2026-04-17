import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  FULL_ACCESS_ROLES,
  ROLE_LEVEL_MAP,
} from "../utils/roleLevelPermissions";
import { useAuth } from "../context/AuthContext"; // ← ajusta según tu contexto de auth
import apiService from "../apiService";
import ModalAddActivity from "../components/ModalAddActivity";
import ModalActivityDetails from "../components/ModalActivityDetails";
import ModalActivityParticipants from "../components/ModalActivityParticipants";
import ModalActivityFinance from "../components/ModalActivityFinance";
import { generateActivityPDF } from "../services/activityPdfGenerator";
import {
  Calendar,
  Users,
  DollarSign,
  Search,
  Plus,
  Filter,
  ChevronDown,
  Clock,
  CheckCircle2,
  AlertCircle,
  History,
  LayoutGrid,
  List,
  RefreshCw,
  Wallet,
  TrendingUp,
  Zap,
  Target,
  FilterX,
  Loader2,
  ArrowRight,
  Download,
  CalendarCheck2,
  Layers,
  Edit2,
} from "lucide-react";

const LEVEL_LABELS = {
  PREENCUENTRO: "Pre-encuentro",
  ENCUENTRO: "Encuentro",
  POST_ENCUENTRO: "Post-encuentro",
  BAUTIZOS: "Bautizos",
  ESENCIA_1: "Esencia 1",
  ESENCIA_2: "Esencia 2",
  ESENCIA_3: "Esencia 3",
  ESENCIA_4: "Esencia 4",
  ADIESTRAMIENTO: "Adiestramiento",
  GRADUACION: "Graduación",
  GENERAL: "General",
};

const STATUS_CONFIG = {
  ACTIVE: {
    label: "Activa",
    color: "emerald",
    icon: <CheckCircle2 className="w-4 h-4" />,
  },
  ENDING_SOON: {
    label: "Por Cerrar",
    color: "amber",
    icon: <Clock className="w-4 h-4" />,
  },
  FINISHED: {
    label: "Finalizada",
    color: "slate",
    icon: <History className="w-4 h-4" />,
  },
  INACTIVE: {
    label: "Inactiva",
    color: "rose",
    icon: <AlertCircle className="w-4 h-4" />,
  },
};

const parseLocalDate = (dateString) => {
  if (!dateString) return null;
  const [year, month, day] = dateString.split("-");
  return new Date(year, month - 1, day); // LOCAL, no UTC
};

const ActivityPage = () => {
  const [allActivities, setAllActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [viewMode, setViewMode] = useState("grid");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });

  const [modals, setModals] = useState({
    add: false,
    details: false,
    participants: false,
    finance: false,
    edit: false,
  });
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [selectedBalance, setSelectedBalance] = useState(null);

  const { user } = useAuth(); // ← ajusta según cómo expones el usuario

  // Normaliza los roles del usuario a strings en mayúsculas
  const userRoles = useMemo(() => {
    if (!user?.roles) return [];
    return user.roles.map((r) =>
      typeof r === "object" && r.name
        ? r.name.toUpperCase()
        : String(r).toUpperCase(),
    );
  }, [user]);

  // ¿Tiene acceso completo?
  const hasFullAccess = useMemo(
    () => userRoles.some((r) => FULL_ACCESS_ROLES.includes(r)),
    [userRoles],
  );

  // Set de levelCodes permitidos para este usuario
  const allowedLevelCodes = useMemo(() => {
    if (hasFullAccess) return null; // null = sin restricción
    const codes = new Set();
    userRoles.forEach((role) => {
      const matchingKey = Object.keys(ROLE_LEVEL_MAP).find(
        (k) => k.toUpperCase() === role,
      );
      if (matchingKey) {
        ROLE_LEVEL_MAP[matchingKey].forEach((code) => codes.add(code));
      }
    });
    return codes;
  }, [userRoles, hasFullAccess]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const loadActivities = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiService.request("/activity");
      setAllActivities(Array.isArray(response) ? response : []);
    } catch (err) {
      setError("Falla en la sincronización de agenda ministerial");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadActivities();
  }, [loadActivities]);

  const getActivityStatus = useCallback((activity) => {
    if (!activity || !activity.isActive) return STATUS_CONFIG.INACTIVE;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const end = parseLocalDate(activity.endDate);

    if (!end) return STATUS_CONFIG.INACTIVE;

    if (end < today) return STATUS_CONFIG.FINISHED;

    const daysLeft = (end - today) / (1000 * 60 * 60 * 24);

    if (daysLeft <= 7) return STATUS_CONFIG.ENDING_SOON;

    return STATUS_CONFIG.ACTIVE;
  }, []);

  const filteredActivities = useMemo(() => {
    return allActivities
      .filter((a) => {
        // ── Filtro por rol / nivel ──────────────────────────────
        if (allowedLevelCodes !== null) {
          const activityLevel = a.requiredLevel?.code;

          // STANDALONE (sin nivel): solo FULL_ACCESS_ROLES — los demás no la ven
          if (!activityLevel) return false;

          // ENROLLMENT: debe estar en los niveles permitidos del rol
          if (!allowedLevelCodes.has(activityLevel)) return false;
        }

        // ── Filtros existentes (sin cambios) ───────────────────
        const matchesSearch =
          !searchTerm ||
          a.activityName?.toLowerCase().includes(searchTerm.toLowerCase());

        const statusInfo = getActivityStatus(a);
        const matchesStatus =
          selectedStatus === "ALL" ||
          (selectedStatus === "ACTIVE" &&
            a.isActive &&
            statusInfo.label !== "Finalizada") ||
          (selectedStatus === "FINISHED" &&
            (statusInfo.label === "Finalizada" || !a.isActive));

        const matchesDate =
          (!dateRange.start ||
            parseLocalDate(a.endDate) >= parseLocalDate(dateRange.start)) &&
          (!dateRange.end ||
            parseLocalDate(a.endDate) <= parseLocalDate(dateRange.end));

        return matchesSearch && matchesStatus && matchesDate;
      })
      .sort((a, b) => parseLocalDate(b.endDate) - parseLocalDate(a.endDate));
  }, [
    allActivities,
    searchTerm,
    selectedStatus,
    dateRange,
    getActivityStatus,
    allowedLevelCodes,
  ]);

  const stats = useMemo(() => {
    const active = allActivities.filter((a) => a.isActive).length;
    const totalRev = allActivities.reduce(
      (acc, curr) => acc + (curr.price || 0),
      0,
    );
    return {
      active,
      total: allActivities.length,
      revenue: totalRev,
      finished: allActivities.length - active,
    };
  }, [allActivities]);

  const handleExportPDF = () => {
    generateActivityPDF({
      activities: filteredActivities,
      title: "Consolidado de Actividades Ministeriales",
      date: new Date().toLocaleDateString(),
    });
  };

  const handleSaveActivity = async (payload) => {
    try {
      const isEdit = !!payload.id;
      const url = isEdit ? `/activity/patch/${payload.id}` : "/activity/save";
      const method = isEdit ? "PATCH" : "POST";

      await apiService.request(url, {
        method,
        body: JSON.stringify(payload),
      });

      setModals({
        add: false,
        details: false,
        participants: false,
        finance: false,
        edit: false,
      });
      setSelectedActivity(null);
      loadActivities();
    } catch (err) {
      throw new Error(err.message || "Falla al procesar actividad ministerial");
    }
  };

  const handleEditActivity = useCallback((activity) => {
    setSelectedActivity(activity);
    setModals((prev) => ({ ...prev, edit: true, add: false }));
  }, []);

  const handleEnrollParticipant = async (
    activityId,
    memberId,
    initialPayment,
    incomeMethod,
    quantity,
  ) => {
    try {
      const payload = {
        activityId,
        memberId,
        initialPayment: parseFloat(initialPayment) || 0,
        incomeMethod,
        quantity: parseInt(quantity) || 1,
      };
      await apiService.request("/activity-contribution", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      loadActivities();
      return true;
    } catch (err) {
      throw err;
    }
  };

  const handleAddPayment = async (contributionId, amount, method) => {
    try {
      await apiService.request("/activity-payment", {
        method: "POST",
        body: JSON.stringify({
          contributionId,
          amount: parseFloat(amount),
          incomeMethod: method,
        }),
      });
      loadActivities();
      return true;
    } catch (err) {
      throw err;
    }
  };

  const handleOpenFinance = async (activity) => {
    try {
      setSelectedActivity(activity);
      // Cargar balance antes de abrir
      const balanceData = await apiService.request(
        `/activity/balance/${activity.id}`,
      );
      setSelectedBalance(balanceData);
      setModals((prev) => ({ ...prev, finance: true }));
    } catch (err) {
      console.error("Error al cargar balance financiero:", err);
      // Opcional: mostrar notificación de error
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto p-3 sm:p-6 md:p-10 space-y-6 md:space-y-10 animate-in fade-in duration-700">
      {/* ── HEADER ── */}
      <div className="relative p-6 sm:p-10 md:p-16 bg-white dark:bg-[#0f172a] rounded-3xl sm:rounded-[3rem] md:rounded-[5rem] border border-slate-200 dark:border-white/10 shadow-lg overflow-hidden group">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 sm:w-96 md:w-[500px] h-64 sm:h-96 md:h-[500px] bg-indigo-500/5 rounded-full blur-[80px] pointer-events-none" />

        <div className="relative z-10 flex flex-col gap-6 sm:gap-8">
          {/* Title block */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-0.5 w-8 bg-indigo-600 rounded-full" />
              <span className="text-indigo-600 dark:text-indigo-400 font-black text-[10px] uppercase tracking-[0.4em]">
                Agenda de Conquista
              </span>
            </div>
            <h1
              className="font-black tracking-[-0.05em] text-slate-950 dark:text-white uppercase leading-[0.9]"
              style={{ fontSize: "clamp(2rem, 8vw, 6rem)" }}
            >
              Agenda <br />
              <span className="bg-gradient-to-r from-indigo-600 to-indigo-400 bg-clip-text text-transparent italic">
                Ministerial
              </span>
            </h1>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <div className="px-3 py-2 sm:px-5 sm:py-2.5 bg-slate-100 dark:bg-white/5 rounded-xl flex items-center gap-2 border border-white/5">
                <Zap className="text-indigo-500 w-4 h-4 shrink-0" />
                <span className="text-[9px] sm:text-[10px] font-black text-slate-500 dark:text-slate-300 uppercase tracking-widest">
                  {stats.active} Actividades Vigentes
                </span>
              </div>
              <div className="px-3 py-2 sm:px-5 sm:py-2.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center gap-2 border border-emerald-500/20">
                <Target className="w-4 h-4 shrink-0" />
                <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest">
                  Planificación Estratégica
                </span>
              </div>
            </div>
          </div>

          {/* Action buttons — full width row on mobile */}
          <div className="flex flex-row gap-3 sm:gap-4 w-full">
            <button
              onClick={handleExportPDF}
              className="flex-1 py-4 sm:py-5 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-900 dark:text-white rounded-2xl sm:rounded-3xl font-black text-[9px] sm:text-[10px] uppercase tracking-[0.15em] border-2 border-slate-100 dark:border-white/5 transition-all flex flex-col items-center justify-center gap-1.5 group"
            >
              <Download className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-500 group-hover:scale-110 transition-transform" />
              <span>Informe PDF</span>
            </button>
            <button
              onClick={() => setModals({ ...modals, add: true })}
              className="flex-1 py-4 sm:py-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl sm:rounded-3xl font-black text-[9px] sm:text-xs uppercase tracking-[0.15em] shadow-2xl shadow-indigo-500/30 transition-all active:scale-95 flex flex-col items-center justify-center gap-1.5 group"
            >
              <Plus className="w-6 h-6 sm:w-7 sm:h-7 group-hover:scale-125 transition-transform" />
              <span>Nueva Actividad</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── KPI DASHBOARD (FILAS) ── */}
      <div className="grid grid-cols-1 gap-4 md:gap-6">
        {[
          {
            label: "Vigencia Actual",
            value: stats.active,
            icon: Zap,
            color: "emerald",
            sub: "Eventos en curso",
          },
          {
            label: "Alcance Global",
            value: stats.total,
            icon: Users,
            color: "indigo",
            sub: "Registros históricos",
          },
          {
            label: "Inversión Total",
            value: `$${new Intl.NumberFormat().format(stats.revenue)}`,
            icon: Wallet,
            color: "violet",
            sub: "Flujo proyectado",
          },
          {
            label: "Ciclos Cerrados",
            value: stats.finished,
            icon: CalendarCheck2,
            color: "slate",
            sub: "Actividades finalizadas",
          },
        ].map((stat, i) => (
          <div
            key={i}
            className="group p-5 sm:p-7 bg-white dark:bg-[#1a2332] rounded-[2rem] sm:rounded-[3rem] border-2 border-slate-100 dark:border-white/5 shadow-sm hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-500 relative overflow-hidden"
          >
            <div
              className={`absolute -right-3 -top-3 w-32 h-32 bg-${stat.color}-500/5 rounded-full group-hover:scale-150 transition-transform duration-1000 blur-2xl`}
            />

            <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-6">
              {/* Icon Section */}
              <div
                className={`w-14 h-14 sm:w-16 sm:h-16 bg-${stat.color}-500/10 text-${stat.color}-500 rounded-2xl flex items-center justify-center shrink-0 shadow-inner group-hover:scale-110 transition-transform`}
              >
                <stat.icon size={28} />
              </div>

              {/* Data Section */}
              <div className="flex-1 space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em]">
                  {stat.label}
                </p>
                <h4 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">
                  {stat.value}
                </h4>
              </div>

              {/* Status / Subtext Section */}
              <div className="flex items-center gap-3 px-5 py-3 bg-slate-50 dark:bg-black/40 rounded-2xl border border-slate-100 dark:border-white/5 transition-colors group-hover:border-indigo-500/30">
                <div
                  className={`w-2 h-2 rounded-full bg-${stat.color}-500 animate-pulse`}
                />
                <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                  {stat.sub}
                </span>
                <TrendingUp size={14} className="text-indigo-500 ml-2" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── CONTROL PANEL ── */}
      <div className="p-4 sm:p-6 md:p-10 bg-white dark:bg-[#0f172a] rounded-3xl sm:rounded-[3rem] md:rounded-[4rem] border border-slate-200 dark:border-white/10 shadow-sm space-y-5 md:space-y-8">
        {/* Row 1: Search + View toggle + Refresh */}
        <div className="flex flex-col sm:flex-row items-stretch gap-3 sm:gap-4">
          <div className="relative flex-1 group">
            <Search className="absolute left-4 sm:left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar por nombre..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-14 sm:h-16 pl-11 sm:pl-14 pr-4 bg-slate-50 dark:bg-black/20 rounded-2xl border-2 border-transparent focus:border-indigo-500 outline-none font-black text-sm transition-all"
            />
          </div>

          <div className="flex items-center gap-3">
            <div className="flex bg-slate-100 dark:bg-black/20 p-1.5 rounded-2xl border-2 border-slate-100 dark:border-white/5 h-14 sm:h-16">
              <button
                onClick={() => setViewMode("grid")}
                className={`flex items-center justify-center gap-2 px-4 sm:px-5 rounded-xl transition-all text-[10px] font-black uppercase tracking-widest ${viewMode === "grid" ? "bg-white dark:bg-indigo-600 shadow-lg text-indigo-600 dark:text-white" : "text-slate-400 hover:text-slate-600"}`}
              >
                <LayoutGrid size={16} />
                <span className="hidden sm:inline">Grid</span>
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`flex items-center justify-center gap-2 px-4 sm:px-5 rounded-xl transition-all text-[10px] font-black uppercase tracking-widest ${viewMode === "list" ? "bg-white dark:bg-indigo-600 shadow-lg text-indigo-600 dark:text-white" : "text-slate-400 hover:text-slate-600"}`}
              >
                <List size={16} />
                <span className="hidden sm:inline">Lista</span>
              </button>
            </div>
            <button
              onClick={loadActivities}
              className="w-14 sm:w-16 h-14 sm:h-16 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center active:scale-90 shrink-0"
            >
              <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {/* Row 2: Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 pt-4 sm:pt-6 border-t border-slate-100 dark:border-white/5">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2">
              Fase de Actividad
            </label>
            <div className="relative">
              <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500 w-4 h-4" />
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full h-13 pl-10 pr-8 py-3.5 bg-slate-50 dark:bg-black/20 rounded-2xl font-black text-xs outline-none border-2 border-transparent focus:border-indigo-500 appearance-none cursor-pointer"
              >
                <option value="ALL">HISTÓRICO GLOBAL</option>
                <option value="ACTIVE">VIGENTES</option>
                <option value="FINISHED">FINALIZADAS</option>
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2">
              Fecha Inicio
            </label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) =>
                setDateRange({ ...dateRange, start: e.target.value })
              }
              className="w-full h-13 px-4 py-3.5 bg-slate-50 dark:bg-black/20 rounded-2xl font-black text-xs border-2 border-transparent focus:border-indigo-500 transition-all outline-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2">
              Fecha Cierre
            </label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) =>
                setDateRange({ ...dateRange, end: e.target.value })
              }
              className="w-full h-13 px-4 py-3.5 bg-slate-50 dark:bg-black/20 rounded-2xl font-black text-xs border-2 border-transparent focus:border-indigo-500 transition-all outline-none"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={() => {
                setDateRange({ start: "", end: "" });
                setSelectedStatus("ALL");
                setSearchTerm("");
              }}
              className="w-full h-13 py-3.5 bg-slate-100 dark:bg-white/5 text-slate-900 dark:text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center gap-2 group"
            >
              <FilterX className="group-hover:rotate-12 transition-transform w-4 h-4" />
              <span>Limpiar Filtros</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── ACTIVITY GRID / LIST ── */}
      <div className="min-h-[300px]">
        {loading ? (
          <div className="py-20 sm:py-32 flex flex-col items-center gap-5">
            <Loader2 className="w-12 h-12 sm:w-16 sm:h-16 text-indigo-600 animate-spin" />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">
              Sincronizando Agenda Central...
            </p>
          </div>
        ) : filteredActivities.length === 0 ? (
          <div className="bg-white dark:bg-[#0f172a] border-2 border-slate-100 dark:border-white/5 p-10 sm:p-20 rounded-3xl sm:rounded-[3rem] text-center shadow-sm">
            <div className="w-14 h-14 sm:w-20 sm:h-20 bg-slate-100 dark:bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-5 text-slate-300">
              <Search size={28} className="sm:w-10 sm:h-10" />
            </div>
            <h3 className="text-xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase mb-3">
              Agenda Vacía
            </h3>
            <p className="text-slate-400 font-black uppercase tracking-[0.15em] text-[9px] sm:text-[10px] max-w-xs mx-auto">
              No se encontraron eventos coincidentes.
            </p>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
            {filteredActivities.map((activity) => {
              const status = getActivityStatus(activity);
              const isUrgent = status.color === "amber";
              return (
                <div
                  key={activity.id}
                  className={`group relative bg-white dark:bg-[#1a2332] rounded-3xl sm:rounded-[2.5rem] border-2 border-slate-100 dark:border-white/5 hover:border-indigo-500 transition-all duration-500 shadow-sm hover:shadow-xl hover:shadow-indigo-500/10 flex flex-col ${!activity.isActive ? "opacity-60 grayscale" : ""}`}
                >
                  {isUrgent && (
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
                      <div className="px-4 py-1.5 bg-amber-500 text-white rounded-full text-[8px] font-black uppercase tracking-widest shadow-lg shadow-amber-500/40 animate-bounce flex items-center gap-1.5">
                        <Clock size={9} /> Atención
                      </div>
                    </div>
                  )}

                  {/* Card body */}
                  <div className="p-5 sm:p-7 pb-3 flex-1 space-y-4 sm:space-y-5 relative overflow-hidden">
                    <div
                      className={`absolute top-0 right-0 w-24 h-24 bg-${status.color}-500/5 -mr-10 -mt-10 rounded-full group-hover:scale-150 transition-transform duration-1000`}
                    />

                    <div className="flex items-center justify-between relative z-10">
                      <div
                        className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-2 bg-${status.color}-50 dark:bg-${status.color}-500/10 text-${status.color}-600 dark:text-${status.color}-400`}
                      >
                        {status.icon} {status.label}
                      </div>
                      <span className="text-[9px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest">
                        #{activity.id}
                      </span>
                    </div>

                    <div className="space-y-2 relative z-10">
                      <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-tight group-hover:text-indigo-600 transition-colors">
                        {activity.activityName}
                      </h3>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 dark:bg-black/40 text-indigo-600 dark:text-indigo-400 text-[8px] font-black uppercase tracking-widest rounded-full border border-indigo-100 dark:border-white/5">
                        <Layers size={9} />{" "}
                        {LEVEL_LABELS[activity.requiredLevel?.code] || "General"}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 sm:gap-5 pt-4 mt-auto border-t border-slate-50 dark:border-white/5">
                      <div className="space-y-1">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                          <Wallet size={11} /> Inversión
                        </p>
                        <p className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tighter">
                          $
                          {new Intl.NumberFormat().format(
                            Math.round(activity.price || 0),
                          )}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                          <Calendar size={11} /> Cierre
                        </p>
                        <p className="text-sm font-black text-slate-700 dark:text-slate-400 tracking-tighter">
                          {parseLocalDate(
                            activity.endDate,
                          ).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 sm:p-4 bg-slate-50 dark:bg-black/20 rounded-b-3xl sm:rounded-b-[2.5rem] border-t border-slate-100 dark:border-white/5">
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => {
                          setSelectedActivity(activity);
                          setModals((prev) => ({ ...prev, details: true }));
                        }}
                        className="flex-1 min-w-[80px] h-11 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 rounded-xl border border-indigo-100 dark:border-indigo-500/20 text-[9px] font-black uppercase tracking-widest transition-all active:scale-95"
                      >
                        Gestión
                      </button>
                      <button
                        onClick={() => {
                          setSelectedActivity(activity);
                          setModals((prev) => ({
                            ...prev,
                            participants: true,
                          }));
                        }}
                        className=" bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 rounded-xl border border-emerald-100 dark:border-emerald-500/20 text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-1.5"
                      >
                        <Users size={12} /> <span>Equipo</span>
                      </button>
                      <button
                        onClick={() => handleOpenFinance(activity)}
                        className="bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 rounded-xl border border-indigo-100 dark:border-indigo-500/20 shadow-sm flex items-center justify-center shrink-0 active:scale-90 transition-all"
                        title="Finanzas"
                      >
                        <DollarSign size={16} />
                      </button>
                      <button
                        onClick={() => handleEditActivity(activity)}
                        className="bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-500/20 rounded-xl border border-amber-100 dark:border-amber-500/20 transition-all shadow-sm flex items-center justify-center shrink-0 active:scale-90"
                        title="Editar Actividad"
                      >
                        <Edit2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* LIST VIEW */
          <div className="bg-white dark:bg-[#0f172a] rounded-3xl sm:rounded-[3rem] border border-slate-200 dark:border-white/10 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full" style={{ minWidth: "600px" }}>
                <thead>
                  <tr className="bg-slate-50 dark:bg-black/40 border-b border-slate-100 dark:border-white/10">
                    <th className="px-5 sm:px-8 py-5 sm:py-7 text-left text-[10px] font-black uppercase text-slate-400 tracking-[0.25em]">
                      Actividad
                    </th>
                    <th className="px-5 sm:px-8 py-5 sm:py-7 text-left text-[10px] font-black uppercase text-slate-400 tracking-[0.25em] hidden sm:table-cell">
                      Nivel
                    </th>
                    <th className="px-5 sm:px-8 py-5 sm:py-7 text-left text-[10px] font-black uppercase text-slate-400 tracking-[0.25em]">
                      Inversión
                    </th>
                    <th className="px-5 sm:px-8 py-5 sm:py-7 text-left text-[10px] font-black uppercase text-slate-400 tracking-[0.25em]">
                      Estado
                    </th>
                    <th className="px-5 sm:px-8 py-5 sm:py-7 text-right text-[10px] font-black uppercase text-slate-400 tracking-[0.25em]">
                      Acc.
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                  {filteredActivities.map((activity) => {
                    const status = getActivityStatus(activity);
                    return (
                      <tr
                        key={activity.id}
                        className="hover:bg-indigo-500/[0.02] transition-colors group"
                      >
                        <td className="px-5 sm:px-8 py-5 sm:py-7">
                          <div className="flex flex-col">
                            <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight group-hover:text-indigo-600 transition-colors leading-tight">
                              {activity.activityName}
                            </span>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                              {parseLocalDate(
                                activity.endDate,
                              ).toLocaleDateString()}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 sm:px-8 py-5 sm:py-7 hidden sm:table-cell">
                          <span className="px-3 py-1.5 bg-slate-100 dark:bg-white/5 text-slate-500 text-[9px] font-black uppercase tracking-widest rounded-xl">
                            {LEVEL_LABELS[activity.requiredLevel?.code] || "General"}
                          </span>
                        </td>
                        <td className="px-5 sm:px-8 py-5 sm:py-7">
                          <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tighter">
                            $
                            {new Intl.NumberFormat().format(
                              Math.round(activity.price || 0),
                            )}
                          </span>
                        </td>
                        <td className="px-5 sm:px-8 py-5 sm:py-7">
                          <span
                            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest bg-${status.color}-50 dark:bg-${status.color}-500/10 text-${status.color}-600 dark:text-${status.color}-400`}
                          >
                            {status.icon}{" "}
                            <span className="hidden xs:inline">
                              {status.label}
                            </span>
                          </span>
                        </td>
                        <td className="px-5 sm:px-8 py-5 sm:py-7 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleEditActivity(activity)}
                              className="p-2.5 sm:p-3 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-500/20 rounded-xl border border-amber-100 dark:border-amber-500/20 transition-all shadow-sm"
                              title="Editar"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => handleOpenFinance(activity)}
                              className="p-2.5 sm:p-3 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 rounded-xl border border-emerald-100 dark:border-emerald-500/20 transition-all shadow-sm"
                              title="Finanzas"
                            >
                              <DollarSign size={16} />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedActivity(activity);
                                setModals((prev) => ({
                                  ...prev,
                                  details: true,
                                }));
                              }}
                              className="p-2.5 sm:p-3 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 rounded-xl border border-indigo-100 dark:border-indigo-500/20 transition-all shadow-sm"
                              title="Ver Detalles"
                            >
                              <ArrowRight size={16} />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedActivity(activity);
                                setModals((prev) => ({
                                  ...prev,
                                  participants: true,
                                }));
                              }}
                              className="p-2.5 sm:p-3 bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10 rounded-xl border border-slate-200 dark:border-white/5 transition-all shadow-sm"
                              title="Participantes"
                            >
                              <Users size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ── FOOTER HERO ── */}
      <div className="relative p-6 sm:p-10 md:p-16 bg-indigo-600 rounded-3xl sm:rounded-[3rem] md:rounded-[5rem] text-white shadow-2xl shadow-indigo-600/20 overflow-hidden group mb-2">
        <div className="absolute top-0 right-0 w-64 sm:w-96 h-64 sm:h-96 bg-white/5 rounded-full blur-3xl -mr-20 -mt-20 transition-transform duration-1000 group-hover:scale-110" />
        <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-8 sm:gap-10">
          <div className="text-center sm:text-left space-y-3">
            <h3
              className="font-black tracking-tighter uppercase"
              style={{ fontSize: "clamp(1.5rem, 5vw, 3.5rem)", lineHeight: 1 }}
            >
              Consolidación <br /> Ministerial 2026
            </h3>
            <p className="text-white/40 font-black uppercase tracking-[0.4em] text-[9px] sm:text-[10px]">
              Raíz de David · Gestión Centralizada
            </p>
          </div>
          <div className="flex items-center gap-8 sm:gap-12">
            <div className="text-center">
              <p className="text-4xl sm:text-6xl font-black tracking-tighter text-white mb-1">
                {stats.total}
              </p>
              <p className="text-[9px] font-black uppercase tracking-[0.25em] text-white/50">
                Proyectos Totales
              </p>
            </div>
            <div className="w-px h-12 sm:h-16 bg-white/10" />
            <div className="text-center">
              <p className="text-4xl sm:text-6xl font-black tracking-tighter text-indigo-200 mb-1">
                {stats.active}
              </p>
              <p className="text-[9px] font-black uppercase tracking-[0.25em] text-white/50">
                Vigentes
              </p>
            </div>
          </div>
        </div>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        select { -webkit-appearance: none; -moz-appearance: none; appearance: none; }
        .overflow-x-auto { -webkit-overflow-scrolling: touch; }
      `,
        }}
      />

      {/* MODALS */}
      <ModalAddActivity
        isOpen={modals.add || modals.edit}
        onClose={() => {
          setModals({ ...modals, add: false, edit: false });
          setSelectedActivity(null);
        }}
        onSave={handleSaveActivity}
        initialData={modals.edit ? selectedActivity : null}
        isEditing={modals.edit}
      />
      <ModalActivityDetails
        isOpen={modals.details}
        onClose={() => setModals({ ...modals, details: false })}
        activity={selectedActivity}
        onUpdate={loadActivities}
        onEnrollParticipant={handleEnrollParticipant}
      />
      <ModalActivityParticipants
        isOpen={modals.participants}
        onClose={() => setModals({ ...modals, participants: false })}
        activity={selectedActivity}
        onEnrollParticipant={handleEnrollParticipant}
        onAddPayment={handleAddPayment}
      />
      <ModalActivityFinance
        isOpen={modals.finance}
        onClose={() => {
          setModals({ ...modals, finance: false });
          setSelectedBalance(null);
        }}
        activity={selectedActivity}
        balance={selectedBalance}
      />
    </div>
  );
};

export default ActivityPage;
