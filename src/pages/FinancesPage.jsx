// ============================================
// FinancesPage.jsx - ELITE MODERN EDITION
// ============================================

import React, { useState, useEffect, useCallback, useMemo } from "react";
import apiService from "../apiService";
import { useConfirmation } from "../context/ConfirmationContext";
import ModalAddFinance from "../components/ModalAddFinance";
import ModalFinanceStatistics from "../components/ModalFinanceStatistics";
import ModalDailyReportOptions from "../components/ModalDailyReportOptions";
import {
  generateFinancePDF,
  generateDailyFinancePDF,
} from "../services/financepdfgenerator";
import { logSecurityEvent, logUserAction } from "../utils/securityLogger";
import { transformForDisplay, prepareForBackend } from "../services/nameHelper";
import { 
  TrendingUp, 
  Search, 
  Plus, 
  BarChart3,
  RefreshCw, 
  Filter, 
  Calendar, 
  CreditCard, 
  CircleDollarSign,
  User,
  CheckCircle2,
  Clock,
  MoreVertical,
  X,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  AlertCircle,
  Download,
  Edit3,
  Trash2
} from "lucide-react";

// ✅ CONSTANTES
const INCOME_CONCEPTS = [
  "TITHE",
  "OFFERING",
  "SEED_OFFERING",
  "BUILDING_FUND",
  "FIRST_FRUITS",
  "CELL_GROUP_OFFERING",
];
const INCOME_METHODS = ["CASH", "BANK_TRANSFER"];

const CONCEPT_LABELS = {
  TITHE: "Diezmo",
  OFFERING: "Ofrenda",
  TITHE_AND_OFFERING: "Diezmo + Ofrenda",
  SEED_OFFERING: "Semilla",
  BUILDING_FUND: "Construcción",
  FIRST_FRUITS: "Primicias",
  CELL_GROUP_OFFERING: "Grupo de Célula",
};

const CONCEPT_UI_CONFIG = {
  TITHE: { bgClass: 'bg-indigo-50 dark:bg-indigo-900/30', borderClass: 'border-indigo-100 dark:border-indigo-800/50', textClass: 'text-indigo-600 dark:text-indigo-400', dotClass: 'bg-indigo-600' },
  OFFERING: { bgClass: 'bg-violet-50 dark:bg-violet-900/30', borderClass: 'border-violet-100 dark:border-violet-800/50', textClass: 'text-violet-600 dark:text-violet-400', dotClass: 'bg-violet-600' },
  TITHE_AND_OFFERING: { bgClass: 'bg-fuchsia-50 dark:bg-fuchsia-900/30', borderClass: 'border-fuchsia-100 dark:border-fuchsia-800/50', textClass: 'text-fuchsia-600 dark:text-fuchsia-400', dotClass: 'bg-fuchsia-600' },
  SEED_OFFERING: { bgClass: 'bg-emerald-50 dark:bg-emerald-900/30', borderClass: 'border-emerald-100 dark:border-emerald-800/50', textClass: 'text-emerald-600 dark:text-emerald-400', dotClass: 'bg-emerald-600' },
  BUILDING_FUND: { bgClass: 'bg-amber-50 dark:bg-amber-900/30', borderClass: 'border-amber-100 dark:border-amber-800/50', textClass: 'text-amber-600 dark:text-amber-400', dotClass: 'bg-amber-600' },
  FIRST_FRUITS: { bgClass: 'bg-rose-50 dark:bg-rose-900/30', borderClass: 'border-rose-100 dark:border-rose-800/50', textClass: 'text-rose-600 dark:text-rose-400', dotClass: 'bg-rose-600' },
  CELL_GROUP_OFFERING: { bgClass: 'bg-blue-50 dark:bg-blue-900/30', borderClass: 'border-blue-100 dark:border-blue-800/50', textClass: 'text-blue-600 dark:text-blue-400', dotClass: 'bg-blue-600' },
  DEFAULT: { bgClass: 'bg-slate-50 dark:bg-slate-800/50', borderClass: 'border-slate-200 dark:border-slate-700', textClass: 'text-slate-600 dark:text-slate-400', dotClass: 'bg-slate-600' }
};

const METHOD_LABELS = {
  CASH: "Efectivo",
  BANK_TRANSFER: "Transferencia",
};

const LEADER_TYPE_LABELS = {
  SERVANT: "Servidor",
  LEADER_144: "Líder 144",
  LEADER_12: "Líder 12",
};

const FinancesPage = () => {
  const confirm = useConfirmation();
  const [allFinances, setAllFinances] = useState([]);
  const [filteredFinances, setFilteredFinances] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [selectedConcept, setSelectedConcept] = useState("ALL");
  const [selectedMethod, setSelectedMethod] = useState("ALL");
  const [selectedVerification, setSelectedVerification] = useState("ALL");
  const [searchText, setSearchText] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [selectedLeaderType, setSelectedLeaderType] = useState("ALL");
  const [leaders, setLeaders] = useState([]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showStatisticsModal, setShowStatisticsModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [statisticsData, setStatisticsData] = useState(null);
  const [editingFinance, setEditingFinance] = useState(null);

  const operationInProgress = React.useRef(false);

  // ========== INIT LOAD ==========
  useEffect(() => {
    const fetchLeaders = async () => {
      try {
        const leaderData = await apiService.getLeaders();
        setLeaders(leaderData || []);
      } catch (err) {
        console.error("No se pudieron cargar líderes para filtro", err);
      }
    };
    fetchLeaders();
  }, []);

  const loadFinances = useCallback(async () => {
    if (operationInProgress.current) return;
    operationInProgress.current = true;
    setLoading(true);
    setError("");

    try {
      const PAGE_SIZE = 100;
      let allFinancesData = [];
      let currentPage = 0;
      let hasMore = true;

      while (hasMore) {
        const response = await apiService.getFinances(currentPage, PAGE_SIZE);
        const pageContent = response?.content || [];
        allFinancesData = [...allFinancesData, ...pageContent];
        hasMore = response?.hasNext === true;
        currentPage++;
        if (currentPage > 100) break;
      }

      // Deduplicar
      const uniqueMap = new Map();
      allFinancesData.forEach((finance) => uniqueMap.set(finance.id, finance));
      const uniqueFinances = Array.from(uniqueMap.values());

      const processedFinances = uniqueFinances.map((f) => ({
        id: f.id,
        memberId: f.memberId,
        memberName: f.memberName || "Sin nombre",
        amount: f.amount || 0,
        concept: f.incomeConcept || "OTRO",
        method: f.incomeMethod || "EFECTIVO",
        registrationDate: f.registrationDate,
        isVerified: f.isVerified === true,
        description: f.description || "",
        recordedBy: f.recordedBy || "-",
      }));

      const transformed = processedFinances.map((f) => transformForDisplay(f, ["memberName"]));
      setAllFinances(transformed);
    } catch (err) {
      setError("Error al sincronizar registros financieros");
      logSecurityEvent("finance_load_error", { errorType: "api_error" });
    } finally {
      setLoading(false);
      operationInProgress.current = false;
    }
  }, []);

  useEffect(() => { loadFinances(); }, [loadFinances]);

  // ========== FILTER LOGIC ==========
  const applyFilters = useCallback(() => {
    let filtered = [...allFinances];

    // Search
    if (searchText.trim()) {
      const s = searchText.toLowerCase().trim();
      filtered = filtered.filter(f => f.memberName.toLowerCase().includes(s));
    }

    // Concept
    if (selectedConcept !== "ALL") {
      if (selectedConcept === "TITHE_AND_OFFERING") {
        filtered = filtered.filter(f => f.concept === "TITHE" || f.concept === "OFFERING");
      } else {
        filtered = filtered.filter(f => f.concept === selectedConcept);
      }
    }

    // Method
    if (selectedMethod !== "ALL") {
      filtered = filtered.filter(f => f.method === selectedMethod);
    }

    // Verification
    if (selectedVerification !== "ALL") {
      filtered = filtered.filter(f => f.isVerified === (selectedVerification === "VERIFIED"));
    }

    // Leader Type
    if (selectedLeaderType !== "ALL") {
      if (selectedLeaderType === "NO_LEADER") {
        const allLeaderIds = new Set(leaders.map(l => l.memberId));
        filtered = filtered.filter(f => !allLeaderIds.has(f.memberId));
      } else {
        const memberIdsWithType = new Set(leaders.filter(l => l.leaderType === selectedLeaderType).map(l => l.memberId));
        filtered = filtered.filter(f => memberIdsWithType.has(f.memberId));
      }
    }

    // Dates
    if (startDate) {
      filtered = filtered.filter(f => f.registrationDate >= startDate);
    }
    if (endDate) {
      filtered = filtered.filter(f => f.registrationDate <= endDate);
    }

    // Sort by date (desc)
    filtered.sort((a, b) => new Date(b.registrationDate) - new Date(a.registrationDate));

    setFilteredFinances(filtered);
  }, [allFinances, searchText, selectedConcept, selectedMethod, selectedVerification, selectedLeaderType, leaders, startDate, endDate]);

  useEffect(() => { applyFilters(); }, [applyFilters]);

  // ========== STATISTICS CALCULATION ==========
  const stats = useMemo(() => {
    const base = {
      total: 0,
      verified: 0,
      pending: 0,
      count: filteredFinances.length,
      verifiedCount: 0,
      pendingCount: 0
    };

    filteredFinances.forEach(f => {
      base.total += f.amount;
      if (f.isVerified) {
        base.verified += f.amount;
        base.verifiedCount++;
      } else {
        base.pending += f.amount;
        base.pendingCount++;
      }
    });

    return base;
  }, [filteredFinances]);

  // ========== ACTIONS & HANDLERS ==========
  const handleReloadAndClearFilters = () => {
    setSelectedConcept("ALL");
    setSelectedMethod("ALL");
    setSelectedVerification("ALL");
    setSelectedLeaderType("ALL");
    setSearchText("");
    setStartDate("");
    setEndDate("");
    loadFinances();
  };

  const calculateDetailedStats = useCallback(() => {
    const s = {
      totalRecords: allFinances.length,
      totalAmount: 0,
      verifiedAmount: 0,
      unverifiedAmount: 0,
      verifiedCount: 0,
      unverifiedCount: 0,
      byConcept: {},
      byMethod: {},
    };
    allFinances.forEach(f => {
      s.totalAmount += f.amount;
      if (f.isVerified) { s.verifiedAmount += f.amount; s.verifiedCount++; } 
      else { s.unverifiedAmount += f.amount; s.unverifiedCount++; }
      
      const c = f.concept || "OTRO";
      if (!s.byConcept[c]) s.byConcept[c] = { count: 0, total: 0 };
      s.byConcept[c].count++; s.byConcept[c].total += f.amount;

      const m = f.method || "EFECTIVO";
      if (!s.byMethod[m]) s.byMethod[m] = { count: 0, total: 0 };
      s.byMethod[m].count++; s.byMethod[m].total += f.amount;
    });
    return s;
  }, [allFinances]);

  const handleExportPDF = () => {
    if (startDate || endDate || selectedMethod !== "ALL" || selectedVerification !== "ALL" || selectedConcept !== "ALL" || selectedLeaderType !== "ALL" || searchText.trim()) {
      setShowReportModal(true);
      return;
    }
    const d = {
      title: "Reporte de Ingresos",
      totalAmount: stats.total,
      date: new Date().toLocaleDateString("es-CO"),
      finances: filteredFinances,
      statistics: calculateDetailedStats(),
    };
    generateFinancePDF(d, "financial-report");
  };

  const handleConfirmReport = (type) => {
    const s = {
      totalRecords: filteredFinances.length,
      totalAmount: filteredFinances.reduce((sum, f) => sum + f.amount, 0),
      verifiedCount: filteredFinances.filter(f => f.isVerified).length,
      unverifiedCount: filteredFinances.filter(f => !f.isVerified).length,
      byConcept: {},
      finances: filteredFinances,
    };
    filteredFinances.forEach(f => {
      const c = f.concept || "OTRO";
      if (!s.byConcept[c]) s.byConcept[c] = { count: 0, total: 0, verified: 0, pending: 0 };
      s.byConcept[c].count++; s.byConcept[c].total += f.amount;
      if (f.isVerified) s.byConcept[c].verified++; else s.byConcept[c].pending++;
    });

    generateDailyFinancePDF({
      finances: filteredFinances,
      reportType: type,
      statistics: s,
      config: { title: "Reporte Específico de Finanzas" }
    }, "reporte-personalizado");
    setShowReportModal(false);
  };

  const handleAction = async (type, id, data) => {
    if (operationInProgress.current) return;
    try {
      if (type === 'verify') {
        const isConfirmed = await confirm({
          title: '¿Verificar Ingreso?',
          message: 'Esta acción validará formalmente el ingreso en el sistema contable.',
          type: 'success',
          confirmLabel: 'Validar ahora',
          onConfirm: async () => {
            await apiService.verifyFinance(id);
          }
        });
        if (!isConfirmed) return;
      } else if (type === 'delete') {
        const isConfirmed = await confirm({
          title: '¿Eliminar Registro?',
          message: 'Esta operación es irreversible y afectará los reportes contables.',
          type: 'danger',
          confirmLabel: 'Eliminar permanentemente',
          onConfirm: async () => {
            await apiService.deleteFinance(id);
          }
        });
        if (!isConfirmed) return;
      } else if (type === 'save') {
        operationInProgress.current = true;
        const payload = prepareForBackend(data, ["memberName"]);
        if (editingFinance) await apiService.updateFinance(editingFinance.id, payload);
        else await apiService.createFinance(payload, `fin-${Date.now()}`);
      }
      
      setShowAddModal(false);
      // 🔥 CRÍTICO: Resetear la bandera ANTES de cargar, para que loadFinances no se auto-bloquee
      operationInProgress.current = false; 
      await loadFinances();
    } catch (err) {
      operationInProgress.current = false;
      setError(err?.response?.data?.message || err?.message || "Error en la operación");
    } finally {
      operationInProgress.current = false;
    }
  };

  return (
    <div className="max-w-[1500px] mx-auto p-4 md:p-6 lg:p-10 space-y-6 md:space-y-10 animate-fade-in relative z-0">
      {/* HEADER SECTION */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div className="space-y-2">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-black tracking-tighter text-slate-900 dark:text-white flex items-center gap-3 md:gap-4">
            <div className="h-8 md:h-10 w-2.5 bg-indigo-600 rounded-full"></div>
            Gestión Financiera
          </h1>
          <p className="text-slate-500 dark:text-slate-400 flex items-center gap-2 font-bold ml-6 uppercase tracking-widest text-[10px] md:text-xs">
            <CircleDollarSign className="w-4 h-4 text-emerald-500" />
            Transacciones e Ingresos
          </p>
        </div>

        <div className="flex flex-wrap gap-3 w-full lg:w-auto">
          <button 
            onClick={() => { setEditingFinance(null); setShowAddModal(true); }}
            className="flex-1 lg:flex-none justify-center flex items-center gap-2 px-6 lg:px-8 py-3.5 lg:py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-[1.5rem] lg:rounded-[2rem] font-bold shadow-lg shadow-indigo-500/20 transition-all active:scale-95 text-xs lg:text-sm whitespace-nowrap"
          >
            <Plus className="w-5 h-5 lg:w-6 lg:h-6" />
            Nuevo Registro
          </button>
          <button 
            onClick={() => { setStatisticsData(calculateDetailedStats()); setShowStatisticsModal(true); }}
            className="flex-1 lg:flex-none justify-center flex items-center gap-2 px-5 lg:px-6 py-3.5 lg:py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-[1.5rem] lg:rounded-[2rem] font-bold hover:border-indigo-500 dark:hover:border-indigo-500 transition-all active:scale-95 shadow-sm text-xs lg:text-sm whitespace-nowrap"
          >
            <BarChart3 className="w-4 h-4 lg:w-5 lg:h-5 text-indigo-500" />
            Estadísticas
          </button>
        </div>
      </div>

      {/* STATS OVERVIEW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6">
        <div className="bg-white dark:bg-[#1a2332] p-6 md:p-8 rounded-[2rem] md:rounded-[3rem] border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all group overflow-hidden relative">
          <div className="absolute top-0 right-0 w-20 h-20 md:w-24 md:h-24 bg-emerald-500/10 rounded-bl-[4rem] -mr-6 -mt-6 group-hover:scale-110 transition-transform"></div>
          <p className="text-[10px] md:text-xs font-black text-slate-500 uppercase tracking-widest mb-3 md:mb-4">Total Recaudado</p>
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-baseline gap-2">
            <span className="text-emerald-500 text-xl md:text-2xl">$</span>
            {stats.total.toLocaleString("es-CO")}
          </h2>
          <div className="flex items-center gap-1.5 mt-4 text-[10px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 py-1 px-3 rounded-xl border border-emerald-100 dark:border-emerald-800/50 w-fit">
            <TrendingUp className="w-3 h-3" />
            {stats.count} Registros
          </div>
        </div>

        <div className="bg-white dark:bg-[#1a2332] p-6 md:p-8 rounded-[2rem] md:rounded-[3rem] border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all group overflow-hidden relative">
          <div className="absolute top-0 right-0 w-20 h-20 md:w-24 md:h-24 bg-indigo-500/10 rounded-bl-[4rem] -mr-6 -mt-6"></div>
          <p className="text-[10px] md:text-xs font-black text-slate-500 uppercase tracking-widest mb-3 md:mb-4">Monto Verificado</p>
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-baseline gap-2">
            <span className="text-indigo-500 text-xl md:text-2xl">$</span>
            {stats.verified.toLocaleString("es-CO")}
          </h2>
          <div className="flex items-center gap-1.5 mt-4 text-[10px] font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 py-1 px-3 rounded-xl border border-indigo-100 dark:border-indigo-800/50 w-fit">
            <CheckCircle2 className="w-3 h-3" />
            {stats.verifiedCount} Listos
          </div>
        </div>

        <div className="bg-white dark:bg-[#1a2332] p-6 md:p-8 rounded-[2rem] md:rounded-[3rem] border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all group overflow-hidden relative">
          <div className="absolute top-0 right-0 w-20 h-20 md:w-24 md:h-24 bg-amber-500/10 rounded-bl-[4rem] -mr-6 -mt-6"></div>
          <p className="text-[10px] md:text-xs font-black text-slate-500 uppercase tracking-widest mb-3 md:mb-4">Por Auditar</p>
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-baseline gap-2">
            <span className="text-amber-500 text-xl md:text-2xl">$</span>
            {stats.pending.toLocaleString("es-CO")}
          </h2>
          <div className="flex items-center gap-1.5 mt-4 text-[10px] font-black text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 py-1 px-3 rounded-xl border border-amber-100 dark:border-amber-800/50 w-fit">
            <Clock className="w-3 h-3" />
            {stats.pendingCount} En espera
          </div>
        </div>

        <div className="bg-white dark:bg-[#1a2332] p-6 md:p-8 rounded-[2rem] md:rounded-[3rem] border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all flex flex-col justify-center gap-3 md:gap-4">
          <button 
            onClick={handleExportPDF}
            className="flex items-center justify-between px-5 md:px-6 py-3.5 md:py-4 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl md:rounded-2xl border border-slate-200 dark:border-slate-700 transition-all font-bold text-xs md:text-sm group text-slate-700 dark:text-slate-300"
          >
            <span className="flex items-center gap-2.5">
              <Download className="w-4 h-4 md:w-5 md:h-5 text-indigo-500" />
              Exportar Reporte
            </span>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
          </button>
          <button 
            onClick={handleReloadAndClearFilters}
            className="flex items-center justify-between px-5 md:px-6 py-3.5 md:py-4 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl md:rounded-2xl border border-slate-200 dark:border-slate-700 transition-all font-bold text-xs md:text-sm group text-slate-700 dark:text-slate-300"
          >
            <span className="flex items-center gap-2.5">
              <RefreshCw className={`w-4 h-4 md:w-5 md:h-5 text-emerald-500 ${loading ? 'animate-spin' : ''}`} />
              Sincronizar
            </span>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>

      {/* FILTER PANEL */}
      <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 p-6 md:p-8 rounded-[2rem] md:rounded-[3rem] shadow-sm">
        <div className="flex items-center gap-3 mb-6 md:mb-8 ml-1 md:ml-2">
          <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl md:rounded-2xl bg-indigo-500/10 flex items-center justify-center">
            <Filter className="w-4 h-4 md:w-5 md:h-5 text-indigo-500" />
          </div>
          <h3 className="text-lg md:text-xl font-black text-slate-900 dark:text-white tracking-tight">Filtros Avanzados</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <div className="space-y-1.5 md:space-y-2 group flex flex-col">
            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-3 md:ml-4"><Search className="absolute left-4 md:left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />Miembro</label>
            <div className="relative">
              <input 
                type="text" 
                placeholder="Buscar por nombre..." 
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="w-full h-12 md:h-14 pl-12 md:pl-14 pr-4 md:pr-6 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-2xl md:rounded-3xl text-xs md:text-sm font-medium transition-all focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-1.5 md:space-y-2 flex flex-col">
            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-3 md:ml-4">Concepto</label>
            <div className="relative">
              <CircleDollarSign className="absolute left-4 md:left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <select 
                value={selectedConcept}
                onChange={(e) => setSelectedConcept(e.target.value)}
                className="w-full h-12 md:h-14 pl-12 md:pl-14 pr-10 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl md:rounded-3xl text-xs md:text-sm font-bold text-slate-800 dark:text-slate-200 appearance-none focus:outline-none focus:border-indigo-500 transition-all cursor-pointer"
              >
                <option value="ALL">Cualquier Concepto</option>
                <option value="TITHE_AND_OFFERING">💵🎁 Diezmo + Ofrenda</option>
                {INCOME_CONCEPTS.map(c => <option key={c} value={c}>{CONCEPT_LABELS[c]}</option>)}
              </select>
              <ChevronDown className="absolute right-4 md:right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          <div className="space-y-1.5 md:space-y-2 flex flex-col">
            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-3 md:ml-4">Estado</label>
            <div className="relative">
              <CheckCircle2 className="absolute left-4 md:left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <select 
                value={selectedVerification}
                onChange={(e) => setSelectedVerification(e.target.value)}
                className="w-full h-12 md:h-14 pl-12 md:pl-14 pr-10 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl md:rounded-3xl text-xs md:text-sm font-bold text-slate-800 dark:text-slate-200 appearance-none focus:outline-none focus:border-indigo-500 transition-all cursor-pointer"
              >
                <option value="ALL">Todos los Estados</option>
                <option value="VERIFIED">✅ Auditados</option>
                <option value="UNVERIFIED">⏳ Pendientes</option>
              </select>
              <ChevronDown className="absolute right-4 md:right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          <div className="space-y-1.5 md:space-y-2 flex flex-col">
            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-3 md:ml-4">Inicio</label>
            <div className="relative">
              <Calendar className="absolute left-4 md:left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input 
                type="date" 
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full h-12 md:h-14 pl-12 md:pl-14 pr-4 md:pr-6 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-2xl md:rounded-3xl text-xs md:text-sm font-bold focus:outline-none focus:border-indigo-500 transition-all cursor-pointer custom-date-input"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ERROR BANNER */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 p-4 md:p-6 rounded-[2rem] flex items-center justify-between group animate-shake">
          <div className="flex items-center gap-3 md:gap-4 text-red-600 dark:text-red-400">
            <AlertCircle className="w-5 h-5 md:w-6 md:h-6 shrink-0" />
            <span className="font-bold text-xs md:text-sm uppercase tracking-wider">{error}</span>
          </div>
          <button onClick={() => setError("")} className="text-red-400 hover:text-red-600 transition-colors bg-white/50 dark:bg-black/20 p-2 rounded-full"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* DATA TABLE / GRID */}
      <div className="bg-white dark:bg-[#1a2332] border border-slate-200 dark:border-slate-800 rounded-[2rem] md:rounded-[3rem] shadow-sm overflow-hidden min-h-[400px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 md:py-32 space-y-6">
            <div className="w-12 h-12 md:w-16 md:h-16 border-4 border-indigo-600/10 border-t-indigo-600 rounded-full animate-spin"></div>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] md:text-xs">Sincronizando Base de Datos...</p>
          </div>
        ) : filteredFinances.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 md:py-32 text-center px-6 md:px-10">
            <div className="w-20 h-20 md:w-24 md:h-24 bg-slate-50 dark:bg-slate-800/50 rounded-[2rem] md:rounded-[2.5rem] flex items-center justify-center mb-6 md:mb-8 relative border border-slate-200 dark:border-slate-700">
              <CircleDollarSign className="w-10 h-10 md:w-12 md:h-12 text-slate-300 dark:text-slate-500" />
              <div className="absolute -right-2 -bottom-2 w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-white border-[3px] border-white dark:border-[#1a2332] shadow-xl">
                <Search className="w-3.5 h-3.5" />
              </div>
            </div>
            <h3 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white mb-2 decoration-indigo-500/30">Sin Transacciones</h3>
            <p className="text-slate-500 dark:text-slate-400 max-w-sm font-medium leading-relaxed text-sm">No encontramos registros que coincidan con los filtros seleccionados.</p>
          </div>
        ) : (
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/30 border-b border-slate-200 dark:border-slate-800">
                  <th className="px-6 md:px-8 py-5 md:py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Miembro Aportante</th>
                  <th className="px-6 md:px-8 py-5 md:py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Monto</th>
                  <th className="px-6 md:px-8 py-5 md:py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Concepto</th>
                  <th className="px-6 md:px-8 py-5 md:py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Estado</th>
                  <th className="px-6 md:px-8 py-5 md:py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredFinances.map((f) => {
                  const leaderType = leaders.find(l => l.memberId === f.memberId)?.leaderType;
                  const config = CONCEPT_UI_CONFIG[f.concept] || CONCEPT_UI_CONFIG.DEFAULT;
                  
                  return (
                    <tr key={f.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-all duration-300">
                      <td className="px-6 md:px-8 py-4 md:py-6 cursor-pointer" onClick={() => { setEditingFinance(f); setShowAddModal(true); }}>
                        <div className="flex items-center gap-4 md:gap-5">
                          <div className="md:w-14 md:h-14 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/30 rounded-[1rem] md:rounded-[1.2rem] flex items-center justify-center text-indigo-500 dark:text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white transition-all shadow-sm shrink-0">
                            <User className="w-5 h-5 md:w-6 md:h-6" />
                          </div>
                          <div>
                            <p className="text-sm md:text-base lg:text-lg font-bold text-slate-900 dark:text-white leading-tight mb-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-1">{f.memberName}</p>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{new Date(f.registrationDate).toLocaleDateString("es-CO")}</span>
                              {leaderType && (
                                <span className="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded border border-emerald-100 dark:border-emerald-800/50 text-[8px] md:text-[9px] font-black uppercase tracking-tighter">{LEADER_TYPE_LABELS[leaderType]}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 md:px-8 py-4 md:py-6">
                        <div className="flex flex-col">
                          <p className="text-lg md:text-xl font-black text-slate-900 dark:text-white tracking-tighter whitespace-nowrap">$ {f.amount.toLocaleString("es-CO")}</p>
                          <p className="text-[9px] md:text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1 opacity-80 flex items-center gap-1.5">
                            <CreditCard className="text-slate-400" />
                            {METHOD_LABELS[f.method]}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 md:px-8 py-4 md:py-6">
                        <span className={`inline-flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-1.5 md:py-2 ${config.bgClass} ${config.textClass} text-[10px] md:text-[11px] font-black uppercase tracking-wider rounded-xl border ${config.borderClass} shadow-sm whitespace-nowrap`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${config.dotClass}`} />
                          {CONCEPT_LABELS[f.concept] || f.concept}
                        </span>
                      </td>
                      <td className="px-6 md:px-8 py-4 md:py-6">
                        {f.isVerified ? (
                          <div className="flex items-center gap-1.5 md:gap-2 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-3 md:px-4 py-1.5 md:py-2 rounded-xl border border-emerald-100 dark:border-emerald-800/50 w-fit">
                            <CheckCircle2 className="md:w-4 md:h-4 shadow-sm" />
                            <span className="text-[10px] md:text-[11px] font-black uppercase tracking-wider">Auditado</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 md:gap-2 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-3 md:px-4 py-1.5 md:py-2 rounded-xl border border-amber-100 dark:border-amber-800/50 w-fit">
                            <Clock className="md:w-4 md:h-4 animate-pulse" />
                            <span className="text-[10px] md:text-[11px] font-black uppercase tracking-wider">Por Auditar</span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 md:px-8 py-4 md:py-6">
                        <div className="flex items-center justify-center gap-2 md:gap-3 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity lg:translate-x-4 lg:group-hover:translate-x-0">
                          {!f.isVerified && (
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleAction('verify', f.id); }}
                              className="bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-100 dark:border-emerald-800/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center rounded-[1rem] hover:bg-emerald-600 hover:text-white dark:hover:text-white transition-all shadow-sm"
                              title="Verificar Transacción"
                            >
                              <CheckCircle2 className="w-4 h-4 md:w-5 md:h-5" />
                            </button>
                          )}
                          <button 
                            onClick={(e) => { e.stopPropagation(); setEditingFinance(f); setShowAddModal(true); }}
                            className="bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center rounded-[1rem] hover:bg-indigo-600 hover:text-white dark:hover:text-white transition-all shadow-sm"
                            title="Editar Datos"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleAction('delete', f.id); }}
                            className="bg-red-50 dark:bg-red-900/30 border border-red-100 dark:border-red-800/50 text-red-500 flex items-center justify-center rounded-[1rem] hover:bg-red-600 hover:text-white dark:hover:text-white transition-all shadow-sm"
                            title="Eliminar Registro"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="hidden lg:flex lg:group-hover:hidden justify-center transition-all h-10 items-center">
                          <MoreVertical className="text-slate-300 dark:text-slate-600" />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* FOOTER AUDIT */}
      <div className="p-6 md:p-10 bg-indigo-600 dark:bg-indigo-900/50 border border-indigo-500/20 rounded-[2.5rem] md:rounded-[4rem] text-white flex flex-col xl:flex-row items-center justify-between gap-8 md:gap-10 shadow-xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-48 h-48 md:w-64 md:h-64 bg-white/5 rounded-bl-[8rem] md:rounded-bl-[10rem] -mr-10 -mt-10 md:-mr-16 md:-mt-16 group-hover:scale-110 group-hover:bg-white/10 transition-all duration-700 pointer-events-none"></div>
        <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-6 md:gap-8 relative z-10 w-full xl:w-auto">
          <div className="w-16 h-16 md:w-20 md:h-20 bg-white/10 backdrop-blur-xl border border-white/20 rounded-[2rem] md:rounded-[2.5rem] flex items-center justify-center shadow-inner shrink-0">
            <ShieldCheck className="w-8 h-8 md:w-10 md:h-10 text-white" />
          </div>
          <div>
            <h4 className="text-2xl md:text-3xl font-black tracking-tight leading-none mb-3 md:mb-4">Protocolo de Auditoría</h4>
            <div className="flex flex-col sm:flex-row items-center gap-3 md:gap-4 text-indigo-100 text-xs font-bold uppercase tracking-widest">
              <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Validación Concurrente</span>
              <span className="hidden sm:block w-1.5 h-1.5 bg-indigo-400 rounded-full"></span>
              <span className="flex items-center gap-2"><TrendingUp className="w-4 h-4" /> Tiempo Real</span>
            </div>
          </div>
        </div>
        <div className="flex w-full xl:w-auto justify-center sm:justify-end gap-8 md:gap-12 relative z-10 bg-black/10 backdrop-blur-xl p-6 md:p-8 rounded-[2rem] md:rounded-[3rem] border border-white/10">
          <div className="text-center">
            <p className="text-3xl md:text-4xl font-black mb-1">{stats.count}</p>
            <p className="text-[9px] md:text-[10px] font-bold text-indigo-200 uppercase tracking-widest">Transacciones</p>
          </div>
          <div className="w-px h-10 md:h-12 bg-white/20 self-center"></div>
          <div className="text-center">
            <p className="text-3xl md:text-4xl font-black mb-1">{((stats.verifiedCount / Math.max(stats.count, 1)) * 100).toFixed(0)}<span className="text-lg md:text-xl text-indigo-300 ml-1">%</span></p>
            <p className="text-[9px] md:text-[10px] font-bold text-indigo-200 uppercase tracking-widest">Tasa de Verificación</p>
          </div>
        </div>
      </div>

      {/* MODALS */}
      <ModalAddFinance
        isOpen={showAddModal}
        onClose={() => { setShowAddModal(false); setEditingFinance(null); }}
        onSave={(d) => handleAction('save', null, d)}
        initialData={editingFinance}
        isEditing={!!editingFinance}
      />

      <ModalFinanceStatistics
        isOpen={showStatisticsModal}
        onClose={() => setShowStatisticsModal(false)}
        data={statisticsData}
        allFinances={allFinances}
        onExportPDF={() => {
          generateFinancePDF({ statistics: calculateDetailedStats(), title: "Estadísticas Globales" }, "finance-full-stats");
        }}
      />

      <ModalDailyReportOptions
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        onConfirm={handleConfirmReport}
        selectedDate={startDate || endDate}
        financesData={filteredFinances}
      />
    </div>
  );
};

export default FinancesPage;
