// ============================================
// CellGroupOverviewModal.jsx
// Vista general de todas las células accesibles
// Mes actual + comparativa entre células + Filtro por Sesión
// ============================================

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { 
  LayoutDashboard, 
  RotateCw, 
  FileText, 
  X, 
  UserCheck, 
  Users, 
  BarChart3, 
  TrendingUp, 
  UserPlus, 
  Calendar, 
  ArrowUpDown, 
  ChevronDown,
  Activity,
  Search,
  AlertCircle,
  Home
} from "lucide-react";
import { generateOverviewPDF } from "../services/Cellgroupoverviewpdfgenerator";

const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const CellGroupOverviewModal = ({
  isOpen,
  onClose,
  userCells = [],
  apiService,
  isDarkMode = false,
  isMobile = false,
  logUserAction,
  onSelectCell,
}) => {
  const [loading, setLoading] = useState(false);
  const [cellStats, setCellStats] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedDate, setSelectedDate] = useState("");
  const [availableDates, setAvailableDates] = useState([]);
  const [sortBy, setSortBy] = useState("percentage");
  const [sortDir, setSortDir] = useState("desc");
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // ── Load available dates ──────────────────────────────────────
  useEffect(() => {
    const fetchAvailableDates = async () => {
      if (!isOpen || !userCells.length) return;
      try {
        const response = await apiService.getCellAttendancesByMonth(
          selectedYear,
          selectedMonth,
        );
        const allRecords = [];
        if (response && response.cells) {
          Object.values(response.cells).forEach((cellArray) => {
            if (Array.isArray(cellArray)) allRecords.push(...cellArray);
          });
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const dates = [...new Set(allRecords.map((r) => r.attendanceDate))]
          .filter(Boolean)
          .filter((dateStr) => {
            const sessionDate = new Date(dateStr + "T00:00:00");
            sessionDate.setHours(0, 0, 0, 0);
            return sessionDate <= today;
          })
          .sort()
          .reverse();

        setAvailableDates(dates);
        setSelectedDate("");
      } catch (e) {
        console.error("[CellGroupOverviewModal] Error fetching dates:", e);
      }
    };
    fetchAvailableDates();
  }, [selectedMonth, selectedYear, apiService, isOpen, userCells.length]);

  // ── Load stats ───────────────────────────────────────────────
  const loadAllStats = useCallback(async () => {
    if (!userCells.length) return;
    setLoading(true);
    setCellStats([]);

    try {
      if (selectedDate) {
        const globalData = await apiService.getGlobalSummaryByDate(selectedDate);
        const results = userCells.map((cell) => {
          const cellData = globalData.find(
            (d) => Number(d.cellId) === Number(cell.id),
          );
          return {
            cellId: cell.id,
            cellName: cell.name,
            stats: cellData
              ? {
                  totalPresent: cellData.totalPresent || 0,
                  totalRegistered: cellData.totalRegistered || 0,
                  totalMeetings: 1,
                  totalJustified: cellData.totalJustified || 0,
                  totalNewParticipants: cellData.newParticipants || 0,
                }
              : null,
            error: cellData ? null : "No hay datos para esta sesión",
          };
        });
        setCellStats(results);
      } else {
        const promises = userCells.map((cell) =>
          apiService
            .getCellAttendanceMonthlyStats(cell.id, selectedYear, selectedMonth)
            .then((data) => ({
              cellId: cell.id,
              cellName: cell.name,
              stats: data,
              error: null,
            }))
            .catch((err) => ({
              cellId: cell.id,
              cellName: cell.name,
              stats: null,
              error: err.message,
            })),
        );
        const results = await Promise.all(promises);
        setCellStats(results);
      }
    } catch (err) {
      console.error("[CellGroupOverviewModal] Error:", err);
    } finally {
      setLoading(false);
    }
  }, [userCells, selectedMonth, selectedYear, selectedDate, apiService]);

  useEffect(() => {
    if (isOpen) loadAllStats();
  }, [isOpen, loadAllStats]);

  useEffect(() => {
    if (!isOpen) {
      setCellStats([]);
      setSelectedDate("");
    }
  }, [isOpen]);

  // ── Aggregated totals ──────────────────────────────────────────────────────
  const aggregated = useMemo(() => {
    const withData = cellStats.filter(
      (c) => c.stats && c.stats.totalRegistered > 0,
    );
    if (!withData.length) return null;

    const totalPresent = withData.reduce((s, c) => s + (c.stats.totalPresent || 0), 0);
    const totalJustified = withData.reduce((s, c) => s + (c.stats.totalJustified || 0), 0);
    const totalNew = withData.reduce((s, c) => s + (c.stats.totalNewParticipants || 0), 0);
    const totalCelebracion = totalPresent + totalNew;
    const totalRegistered = withData.reduce((s, c) => s + (c.stats.totalRegistered || 0), 0);
    
    const overallPct = totalRegistered > 0 ? Math.round((totalPresent / totalRegistered) * 100) : 0;
    const avgPct = withData.length > 0 ? Math.round(
      withData.reduce((s, c) => {
        const pct = c.stats.totalRegistered > 0 ? (c.stats.totalPresent / c.stats.totalRegistered) * 100 : 0;
        return s + pct;
      }, 0) / withData.length,
    ) : 0;

    return {
      totalPresent,
      totalRegistered,
      totalJustified,
      totalNew,
      totalCelebracion,
      overallPct,
      avgPct,
      cellsWithData: withData.length,
    };
  }, [cellStats]);

  // ── Filtered & Sorted cells ────────────────────────────────────────────────
  const filteredAndSortedCells = useMemo(() => {
    let list = [...cellStats];
    
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(c => c.cellName.toLowerCase().includes(q));
    }

    list.sort((a, b) => {
      let va, vb;
      if (sortBy === "percentage") {
        va = a.stats?.totalRegistered > 0 ? (a.stats.totalPresent / a.stats.totalRegistered) * 100 : -1;
        vb = b.stats?.totalRegistered > 0 ? (b.stats.totalPresent / b.stats.totalRegistered) * 100 : -1;
      } else if (sortBy === "present") {
        va = a.stats?.totalPresent || -1;
        vb = b.stats?.totalPresent || -1;
      } else {
        va = a.cellName.toLowerCase();
        vb = b.cellName.toLowerCase();
        return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
      }
      return sortDir === "asc" ? va - vb : vb - va;
    });
    return list;
  }, [cellStats, sortBy, sortDir, searchTerm]);

  const handleSort = (field) => {
    if (sortBy === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortBy(field); setSortDir("desc"); }
  };

  const handleGeneratePDF = async () => {
    if (!cellStats.length) return;
    setGeneratingPDF(true);
    try {
      await generateOverviewPDF(cellStats, selectedMonth, selectedYear, aggregated, selectedDate);
      logUserAction?.("generate_overview_pdf", { month: selectedMonth, year: selectedYear, date: selectedDate });
    } catch (err) {
      console.error("[CellGroupOverviewModal] Error generating PDF:", err);
    } finally {
      setGeneratingPDF(false);
    }
  };

  const yearOptions = useMemo(() => {
    const y = new Date().getFullYear();
    return [y, y - 1, y - 2];
  }, []);

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[1000] animate-in fade-in duration-300"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-[1001] flex items-center justify-center pointer-events-none p-4 sm:p-6">
        <div 
          className="w-full max-w-4xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden pointer-events-auto border border-slate-200 dark:border-slate-800 animate-in slide-in-from-bottom-8 duration-500 ease-out"
        >
          {isMobile && (
            <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mt-4 shrink-0" />
          )}

          {/* HEADER */}
          <div className="p-6 md:p-8 flex justify-between items-start gap-4 border-b border-slate-100 dark:border-slate-800/50">
            <div className="flex gap-4 md:gap-6 items-center">
              <div className="w-12 h-12 md:w-16 md:h-16 bg-indigo-500/10 rounded-2xl md:rounded-[1.5rem] flex items-center justify-center text-indigo-600 shrink-0 border border-indigo-500/20">
                <LayoutDashboard className="w-6 h-6 md:w-8 md:h-8" />
              </div>
              <div>
                <h2 className="text-xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase italic">
                  Resumen de Altares
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] md:text-xs font-black uppercase tracking-widest text-indigo-500 bg-indigo-500/10 px-2 py-0.5 rounded-md">
                    {selectedDate ? "Vista por Sesión" : "Vista Acumulada"}
                  </span>
                  <span className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest">
                    · {userCells.length} Altares de Vida
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={loadAllStats}
                disabled={loading}
                className="bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl md:rounded-2xl flex items-center justify-center text-slate-500 dark:text-slate-400 transition-all border border-slate-200 dark:border-slate-700 relative group active:scale-95"
                title="Recargar datos"
              >
                <RotateCw className={`w-5 h-5 ${loading ? "animate-spin" : "group-hover:rotate-180 transition-transform duration-500"}`} />
              </button>
              <button
                onClick={handleGeneratePDF}
                disabled={!cellStats.length || generatingPDF || loading}
                className="bg-slate-900 dark:bg-indigo-600 hover:bg-black dark:hover:bg-indigo-500 rounded-xl md:rounded-2xl flex items-center justify-center text-white transition-all shadow-lg active:scale-95 disabled:opacity-30"
                title="Descargar Reporte PDF"
              >
                <FileText className="w-5 h-5" />
              </button>
              <button
                onClick={onClose}
                className="bg-slate-50 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-xl md:rounded-2xl flex items-center justify-center text-slate-400 hover:text-rose-500 transition-all border border-slate-200 dark:border-slate-700 active:scale-95"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* FILTERS & TOOLS */}
          <div className="px-6 md:px-8 py-6 bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800/30 space-y-4">
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex-1 min-w-[300px] flex gap-3">
                <div className="flex-1 space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Periodo</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(Number(e.target.value))}
                        className="bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 outline-none focus:border-indigo-500 transition-all appearance-none cursor-pointer"
                      >
                        {MONTH_NAMES.map((m, i) => (
                          <option key={i + 1} value={i + 1}>{m}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                    <div className="relative w-28">
                      <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(Number(e.target.value))}
                        className="bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 outline-none focus:border-indigo-500 transition-all appearance-none cursor-pointer"
                      >
                        {yearOptions.map((y) => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                </div>

                <div className="flex-1 space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Sesión Específica</label>
                  <div className="relative">
                    <select
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="pl-10 pr-10 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 outline-none focus:border-indigo-500 transition-all appearance-none cursor-pointer"
                    >
                      <option value="">Acumulado Mensual ({availableDates.length})</option>
                      {availableDates.map((d) => (
                        <option key={d} value={d}>
                          {new Date(d + "T00:00:00").toLocaleDateString("es-CO", { day: "2-digit", month: "short" })}
                        </option>
                      ))}
                    </select>
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-500 pointer-events-none" />
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* SEARCH */}
              <div className="flex-1 min-w-[200px] flex flex-col gap-1.5">
                <label className="flex gap-1 text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1"><Search className="w-4 h-4 text-slate-400 pointer-events-none" />Buscar Altar</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Escribe nombre o zona..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full h-11 pl-10 pr-4 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 outline-none focus:border-indigo-500 transition-all shadow-inner"
                  />
                </div>
              </div>
            </div>

            {/* SORTING CHIPS */}
            <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-1">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] whitespace-nowrap">Ordenar:</span>
              {[
                { id: "percentage", label: "% Asistencia", icon: TrendingUp },
                { id: "present", label: "Presentes", icon: UserCheck },
                { id: "name", label: "Nombre", icon: LayoutDashboard },
              ].map((sort) => (
                <button
                  key={sort.id}
                  onClick={() => handleSort(sort.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full border-2 text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap active:scale-95
                    ${sortBy === sort.id 
                      ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-600/20" 
                      : "bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-200 dark:hover:border-slate-600"}`}
                >
                  <sort.icon className="w-3.5 h-3.5" />
                  {sort.label}
                  {sortBy === sort.id && (
                    <ArrowUpDown className={`w-3 h-3 transition-transform ${sortDir === "asc" ? "" : "rotate-180"}`} />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* KPI CARDS STRIP */}
          {aggregated && !loading && (
            <div className="px-6 md:px-8 py-6 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800/50">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {[
                  { label: "Altares", value: aggregated.cellsWithData, icon: Home, color: "blue", bg: "bg-blue-500/10", text: "text-blue-600" },
                  { label: "Presentes", value: aggregated.totalPresent, icon: UserCheck, color: "emerald", bg: "bg-emerald-500/10", text: "text-emerald-600" },
                  { label: "Impacto", value: aggregated.totalCelebracion, icon: Users, color: "indigo", bg: "bg-indigo-500/10", text: "text-indigo-600" },
                  { label: "Nuevos", value: aggregated.totalNew, icon: UserPlus, color: "amber", bg: "bg-amber-500/10", text: "text-amber-500" },
                  { label: "% Global", value: `${aggregated.overallPct}%`, icon: BarChart3, color: "slate", bg: "bg-slate-500/10", text: aggregated.overallPct >= 70 ? "text-emerald-500" : aggregated.overallPct >= 40 ? "text-amber-500" : "text-rose-500" },
                  { label: "% Promedio", value: `${aggregated.avgPct}%`, icon: Activity, color: "slate", bg: "bg-slate-500/10", text: aggregated.avgPct >= 70 ? "text-emerald-500" : aggregated.avgPct >= 40 ? "text-amber-500" : "text-rose-500" },
                ].map((kpi, i) => (
                  <div key={i} className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-all group">
                    <div className={`w-8 h-8 ${kpi.bg} ${kpi.text} rounded-lg flex items-center justify-center mb-2 group-hover:scale-110 transition-transform`}>
                      <kpi.icon className="w-4 h-4" />
                    </div>
                    <span className={`text-lg font-black tracking-tight ${kpi.text}`}>{kpi.value}</span>
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{kpi.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* MAIN CONTENT AREA */}
          <div className="flex-1 overflow-y-auto no-scrollbar p-6 md:p-8 space-y-3">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-100 transition-opacity">
                <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
                <div className="text-center">
                  <p className="text-sm font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest pulse">Escaneando Altares...</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">Sincronizando base de datos ministerial</p>
                </div>
              </div>
            ) : filteredAndSortedCells.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-300 dark:text-slate-600">
                  <Search className="w-10 h-10" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest">No se encontraron altares</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Prueba con otros términos de búsqueda</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {filteredAndSortedCells.map(({ cellId, cellName, stats, error }) => {
                  const hasData = stats && stats.totalRegistered > 0;
                  const pct = hasData ? Math.round((stats.totalPresent / stats.totalRegistered) * 100) : 0;
                  const newVisits = stats?.totalNewParticipants || 0;
                  
                  return (
                    <button
                      key={cellId}
                      onClick={() => hasData && onSelectCell?.(String(cellId))}
                      disabled={!hasData}
                      className={`group relative text-left p-5 rounded-2xl border-2 transition-all flex items-center gap-4 overflow-hidden
                        ${hasData 
                          ? "bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 hover:border-indigo-500/50 hover:shadow-xl hover:shadow-indigo-500/5 active:scale-[0.99]" 
                          : "bg-slate-50/50 dark:bg-slate-800/30 border-transparent opacity-80"}`}
                    >
                      {/* Left Accent Indicator */}
                      <div className={`absolute top-0 left-0 bottom-0 w-1.5 transition-colors
                        ${!hasData ? "bg-slate-200 dark:bg-slate-800" : pct >= 70 ? "bg-emerald-500" : pct >= 40 ? "bg-amber-500" : "bg-rose-500"}`} 
                      />

                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg font-black shrink-0 transition-transform group-hover:scale-110
                        ${!hasData ? "bg-slate-100 dark:bg-slate-800 text-slate-400" : "bg-indigo-500/10 text-indigo-500"}`}>
                        {cellName.charAt(0).toUpperCase()}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight truncate flex items-center gap-2">
                          {cellName}
                          {hasData && pct >= 90 && (
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          )}
                        </h4>
                        <div className="flex items-center gap-3 mt-1 text-[9px] font-black uppercase tracking-widest text-slate-400 group-hover:text-slate-500">
                          {hasData ? (
                            <>
                              <span className="flex items-center gap-1">
                                <UserCheck className="w-3 h-3 text-emerald-500" /> {stats.totalPresent} Presentes
                              </span>
                              {newVisits > 0 && (
                                <span className="flex items-center gap-1">
                                  <UserPlus className="w-3 h-3 text-amber-500" /> {newVisits} Nuevos
                                </span>
                              )}
                              <span className="text-slate-300 dark:text-slate-700">|</span>
                              <span>{stats.totalRegistered} Miembros</span>
                            </>
                          ) : (
                            <span className="flex items-center gap-1 text-rose-500">
                              <AlertCircle className="w-3 h-3" /> Sin registros enviados
                            </span>
                          )}
                        </div>
                      </div>

                      {hasData && (
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <div className={`text-lg font-black tracking-tighter
                            ${pct >= 70 ? "text-emerald-500" : pct >= 40 ? "text-amber-500" : "text-rose-500"}`}>
                            {pct}%
                          </div>
                          <div className="w-24 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden border border-slate-50 dark:border-slate-800">
                             <div 
                               className={`h-full transition-all duration-1000 ease-out rounded-full
                                 ${pct >= 70 ? "bg-emerald-500" : pct >= 40 ? "bg-amber-500" : "bg-rose-500"}`}
                               style={{ width: `${pct}%` }}
                             />
                          </div>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          
          {/* FOOTER */}
          <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800/50 flex flex-col sm:flex-row justify-between items-center gap-3">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">
              Gerencia de Pastoral CBI · Sistema RAÍZ DE DAVID
            </p>
            <div className="flex items-center gap-4">
               {aggregated && (
                 <div className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-lg">
                   <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                   <span className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Sincronización en tiempo real</span>
                 </div>
               )}
            </div>
          </div>
        </div>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }
        .pulse { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
      `,
        }}
      />
    </>
  );
};

export default CellGroupOverviewModal;
