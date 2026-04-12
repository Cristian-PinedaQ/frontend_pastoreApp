import React, { useState, useEffect, useCallback, useMemo } from "react"; // v2.1 - Clean state
import apiService from "../apiService";
import { useAuth } from "../context/AuthContext";
import { logUserAction } from "../utils/securityLogger";
import nameHelper from "../services/nameHelper";
import CellAttendanceStatsModal from "../components/CellAttendanceStatsModal";
import CreateAttendanceEventModal from "../components/CreateAttendanceEventModal";
import { generateAttendancePDF } from "../services/attendancePdfGenerator";
import { 
  Users, 
  Calendar, 
  MapPin, 
  TrendingUp, 
  CheckCircle2, 
  X, 
  Plus, 
  Download,
  RefreshCw,
  Inbox,
  Search,
  Zap,
  BookOpen,
  MessageSquare,
  AlertCircle,
  ShieldCheck,
} from "lucide-react";

const { getDisplayName } = nameHelper;

// ── Helpers ───────────────────────────────────────────────────────────────────
const ALLOWED_DAYS = [0, 3, 4]; // Dom, Mie, Jue
const LEADER_TYPE_MAP = {
  LEADER_12: { label: "Líder 12", icon: "👑", color: "indigo" },
  LEADER_144: { label: "Líder Rama", icon: "🌿", color: "blue" },
  SERVANT: { label: "Servidor", icon: "🤝", color: "emerald" },
  LEADER_GROUP: { label: "Líder Grupo", icon: "🏠", color: "amber" },
};

const resolveLeaderLabel = (attendance) => {
  if (!attendance || !attendance.leaderType) return null;
  const roleMap = {
    GROUP_LEADER: { label: "Líder de Grupo", icon: "🏠", color: "amber" },
    HOST: { label: "Anfitrión", icon: "🏡", color: "emerald" },
    TIMOTEO: { label: "Timoteo", icon: "📖", color: "emerald" },
    BRANCH_LEADER: { label: "Líder de Rama", icon: "🌿", color: "blue" },
    MAIN_LEADER: { label: "Líder 12", icon: "👑", color: "indigo" },
  };
  return roleMap[attendance.roleInCell] || LEADER_TYPE_MAP[attendance.leaderType] || { label: attendance.leaderType, icon: "👤", color: "slate" };
};

const formatDateShort = (dateStr) => {
  if (!dateStr) return "";
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(year, month - 1, day, 12, 0, 0);
  const days = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  return { dayName: days[d.getDay()], dayNum: d.getDate() };
};

const CellAttendancePage = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [userCells, setUserCells] = useState([]);
  const [monthAttendances, setMonthAttendances] = useState({});
  const [selectedCellId, setSelectedCellId] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [attendances, setAttendances] = useState([]);
  const [editedAttendances, setEditedAttendances] = useState({});
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [summary, setSummary] = useState(null);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [eventDates, setEventDates] = useState(new Set());
  const [sessionForm, setSessionForm] = useState({ newParticipants: 0, totalAttendees: "", notes: "" });
  const [savingSession, setSavingSession] = useState(false);
  const { user, hasAnyRole } = useAuth();

  const isLeaderShip = hasAnyRole(['PASTORES', 'CONEXION']);

  const showError = (msg) => { setError(msg); setTimeout(() => setError(""), 5000); };
  const showSuccess = (msg) => { setSuccessMessage(msg); setTimeout(() => setSuccessMessage(""), 5000); };

  const handleCreateEvent = async (eventData) => {
    setSaving(true);
    try {
      await apiService.createAttendanceEvent(eventData);
      showSuccess("Evento desplegado con éxito");
      setShowEventModal(false);
      loadInitialData();
    } catch (err) {
      showError("Falla al crear evento: " + (err.message || ""));
    } finally {
      setSaving(false);
    }
  };

  // ── Initial Load ────────────────────────────────────────────────────────────
  const loadInitialData = useCallback(async () => {
    setLoading(true);
    try {
      const [cellsRes, monthRes, eventsRes] = await Promise.all([
        apiService.getAccessibleCells(),
        apiService.getCellAttendancesCurrentMonth(),
        apiService.getActiveAttendanceEvents()
      ]);
      setUserCells(Array.isArray(cellsRes) ? cellsRes : []);
      setMonthAttendances(monthRes?.attendances || {});
      
      const dates = new Set();
      const now = new Date();
      (eventsRes?.events || []).forEach(ev => {
        (ev.eventDates || []).forEach(d => {
          const [y, m] = d.split('-').map(Number);
          if (y === now.getFullYear() && m - 1 === now.getMonth()) dates.add(d);
        });
      });
      setEventDates(dates);
      if (cellsRes?.length === 1) setSelectedCellId(String(cellsRes[0].id));
    } catch (err) { setError(err.message || "Error de conexión"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadInitialData(); }, [loadInitialData]);

  // ── Date Logic ─────────────────────────────────────────────────────────────
  const availableDates = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const lastDay = new Date(year, month + 1, 0).getDate();
    const dates = [];
    for (let day = 1; day <= lastDay; day++) {
      const d = new Date(year, month, day, 12, 0, 0);
      const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      if (ALLOWED_DAYS.includes(d.getDay()) || eventDates.has(iso)) {
        dates.push({
          value: iso,
          ...formatDateShort(iso),
          isToday: d.toDateString() === now.toDateString(),
          isFuture: d > now,
          isEvent: eventDates.has(iso)
        });
      }
    }
    return dates.sort((a,b) => a.value.localeCompare(b.value));
  }, [eventDates]);

  // ── Attendance Logic ───────────────────────────────────────────────────────
  const loadAttendances = useCallback(async () => {
    if (!selectedCellId || !selectedDate) return;
    setLoading(true);
    try {
      const [attRes, sumRes, sesRes] = await Promise.all([
        apiService.getCellAttendancesByDate(selectedCellId, selectedDate),
        apiService.getCellAttendanceSummary(selectedCellId, selectedDate),
        apiService.getSessionData(selectedCellId, selectedDate)
      ]);
      const list = (attRes?.attendances || []).filter(a => a.attendanceDate === selectedDate);
      setAttendances(list);
      setSummary(sumRes);
      
      const edited = {};
      list.forEach(a => edited[a.memberId] = { present: a.present || false, justifiedAbsence: a.justifiedAbsence || false, justificationReason: a.justificationReason || "" });
      setEditedAttendances(edited);

      if (sesRes?.hasData) {
        setSessionForm({ newParticipants: sesRes.sessionData.newParticipants || 0, totalAttendees: sesRes.sessionData.totalAttendees || "", notes: sesRes.sessionData.notes || "" });
      } else {
        setSessionForm({ newParticipants: 0, totalAttendees: "", notes: "" });
      }
    } catch { 
      setAttendances([]); setSummary(null); 
    } finally { setLoading(false); }
  }, [selectedCellId, selectedDate]);

  useEffect(() => { loadAttendances(); }, [loadAttendances]);

  const liveStats = useMemo(() => {
    const total = Object.keys(editedAttendances).length;
    const present = Object.values(editedAttendances).filter(a => a.present).length;
    return { total, present, pct: total > 0 ? Math.round((present / total) * 100) : 0 };
  }, [editedAttendances]);

  const filteredAttendances = useMemo(() => {
    if (!searchTerm) return attendances;
    return attendances.filter(a => 
      a.memberName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [attendances, searchTerm]);

  const handleFinalSubmit = async () => {
    if (!selectedDate) return;
    setSaving(true);
    try {
      // 1. Preparar datos de asistencia de miembros
      const attendanceRequests = Object.entries(editedAttendances).map(([id, data]) => ({
        memberId: Number(id), 
        present: data.present, 
        justifiedAbsence: data.justifiedAbsence, 
        justificationReason: data.justificationReason
      }));

      // 2. Ejecutar ambas peticiones en paralelo
      await Promise.all([
        apiService.updateBulkCellAttendances(selectedCellId, selectedDate, attendanceRequests),
        apiService.saveSessionData(selectedCellId, selectedDate, {
          newParticipants: Number(sessionForm.newParticipants),
          totalAttendees: sessionForm.totalAttendees ? Number(sessionForm.totalAttendees) : null,
          notes: sessionForm.notes
        })
      ]);

      showSuccess("¡Reporte consolidado guardado con éxito!");
      loadAttendances(); // Recargar para confirmar persistencia
    } catch (err) {
      setError(err?.message || "Ocurrió un error al sincronizar el reporte");
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateList = async () => {
    setGenerating(true);
    try {
      await apiService.generateCellAttendances(selectedCellId, selectedDate);
      loadAttendances();
    } catch (err) { setError(err.message); }
    finally { setGenerating(false); }
  };

  const handleMonthlyReport = async () => {
    if (!selectedCellId) {
      showError("Selecciona una célula primero para generar el reporte");
      return;
    }
    
    setGenerating(true);
    try {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      
      const stats = await apiService.getCellAttendanceMonthlyStats(selectedCellId, year, month);
      
      const cell = userCells.find(c => String(c.id) === String(selectedCellId));
      const cellName = cell ? cell.name : "Célula";
      
      const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
      const filtersInfo = { mes: monthNames[now.getMonth()], año: String(year) };
      
      generateAttendancePDF(stats, cellName, filtersInfo, true);
      showSuccess("Reporte mensual generado con éxito");
    } catch (err) {
      showError("Error al generar reporte: " + (err.message || ""));
    } finally {
      setGenerating(false);
    }
  };

  // ── Render ──
  return (
    <>
      <div className="max-w-[1500px] mx-auto p-4 md:p-6 lg:p-10 space-y-6 md:space-y-10 animate-fade-in relative z-0">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
         <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="w-16 h-16 md:w-20 md:h-20 bg-slate-900 dark:bg-white/5 backdrop-blur-xl rounded-[1.5rem] md:rounded-[2rem] flex items-center justify-center text-indigo-500 shadow-2xl shadow-indigo-500/10 border border-white/5 shrink-0">
               <Users className="w-8 h-8 md:w-10 md:h-10" />
            </div>
            <div>
               <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tighter">Agenda Asistencia</h1>
               <div className="flex items-center gap-3 mt-2 bg-slate-100 dark:bg-white/5 px-4 py-2 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm">
                  <MapPin className="w-4 h-4 text-indigo-500 shrink-0" />
                  <select 
                    value={selectedCellId || ""} 
                    onChange={(e) => setSelectedCellId(e.target.value)}
                    className="bg-transparent border-none text-[10px] md:text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 outline-none cursor-pointer focus:text-indigo-600 dark:focus:text-indigo-400 transition-colors w-full min-w-[200px]"
                  >
                     <option value="">-- Selecciona Grupo Célula --</option>
                     {userCells.map(c => <option key={c.id} value={c.id} className="bg-white dark:bg-slate-900">{c.name}</option>)}
                  </select>
               </div>
            </div>
         </div>
         
          <div className="flex flex-wrap items-center gap-3 md:gap-4 w-full lg:w-auto">
            {isLeaderShip && (
              <button 
                 onClick={() => setShowEventModal(true)}
                 className="flex-1 sm:flex-none flex items-center justify-center gap-3 px-6 md:px-8 py-4 bg-gradient-to-br from-indigo-600 to-indigo-700 text-white rounded-[1.5rem] font-black text-[10px] md:text-xs uppercase tracking-[0.2em] shadow-xl shadow-indigo-600/20 hover:shadow-indigo-600/40 hover:-translate-y-1 active:scale-95 transition-all text-center group"
              >
                 <Zap className="w-4 h-4 md:w-5 md:h-5 fill-white animate-pulse group-hover:scale-125 transition-transform" />
                 <span className="whitespace-nowrap">Evento Especial</span>
              </button>
            )}

            <button 
               onClick={() => setShowStatsModal(true)}
               className="flex-1 sm:flex-none flex items-center justify-center gap-3 px-6 md:px-8 py-4 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-[1.5rem] border border-slate-200 dark:border-slate-700 font-black text-[10px] md:text-xs uppercase tracking-[0.2em] shadow-lg shadow-slate-200/50 dark:shadow-black/20 hover:bg-slate-50 dark:hover:bg-slate-700 hover:-translate-y-1 active:scale-95 transition-all text-center group"
            >
               <TrendingUp className="w-4 h-4 md:w-5 md:h-5 text-indigo-500 group-hover:scale-125 transition-transform" />
               <span className="whitespace-nowrap">{selectedCellId ? "Estadísticas del Grupo" : "Estadísticas Globales"}</span>
            </button>
            
            <button 
               onClick={handleMonthlyReport}
               disabled={generating || !selectedCellId}
               className="w-full sm:w-auto flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-br from-slate-800 to-slate-900 dark:from-indigo-900/40 dark:to-slate-800 text-white rounded-[1.5rem] font-black text-[10px] md:text-xs uppercase tracking-[0.2em] shadow-2xl shadow-slate-900/20 hover:from-black hover:to-slate-800 transition-all hover:-translate-y-1 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-center group"
            >
               {generating ? <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" /> : <Download className="w-4 h-4 text-indigo-400 group-hover:translate-y-1 transition-transform" />} 
               <span className="whitespace-nowrap">Reporte Mes</span>
            </button>
         </div>
      </div>

      {/* ERROR / SUCCESS ALERTS */}
      {(error || successMessage) && (
        <div className={`p-6 rounded-[2rem] flex items-center justify-between group animate-shake border-2 ${error ? 'bg-rose-50 dark:bg-rose-500/10 border-rose-100 dark:border-rose-500/20 text-rose-600 dark:text-rose-400' : 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400'}`}>
          <div className="flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${error ? 'bg-rose-500/20' : 'bg-emerald-500/20'}`}>
              {error ? <AlertCircle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
            </div>
            <span className="font-black text-xs md:text-sm uppercase tracking-widest">{error || successMessage}</span>
          </div>
          <button onClick={() => { setError(""); setSuccessMessage(""); }} className="p-2.5 bg-white/50 dark:bg-white/10 hover:bg-white dark:hover:bg-white/20 rounded-xl transition-all"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* DATE HORIZON SELECTOR */}
      <div className="bg-white/80 dark:bg-[#1a2332]/80 backdrop-blur-xl p-3 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-500/5 relative group">
         <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-white dark:from-[#1a2332] to-transparent z-10 rounded-l-[2.5rem] pointer-events-none opacity-50"></div>
         <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-white dark:from-[#1a2332] to-transparent z-10 rounded-r-[2.5rem] pointer-events-none opacity-50"></div>
         
         <div className="flex gap-3 overflow-x-auto no-scrollbar py-2 px-4 snap-x">
            {availableDates.map(date => {
              const isSelected = selectedDate === date.value;
              return (
                <button 
                  key={date.value} 
                  onClick={() => setSelectedDate(date.value)}
                  className={`flex-shrink-0 w-16 md:w-20 h-20 md:h-24 rounded-[1.5rem] md:rounded-[2rem] flex flex-col items-center justify-center transition-all snap-center relative border-2 ${
                    isSelected 
                      ? 'bg-indigo-600 border-indigo-500 text-white shadow-2xl shadow-indigo-500/40 scale-105 z-20' 
                      : 'bg-slate-50/50 dark:bg-white/5 text-slate-500 border-transparent dark:border-white/5 hover:bg-white dark:hover:bg-white/10 hover:border-slate-200 dark:hover:border-white/10'
                  } ${date.isFuture ? 'opacity-30 grayscale pointer-events-none cursor-not-allowed' : ''}`}
                >
                   <span className={`text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] mb-1 ${isSelected ? 'opacity-90' : 'opacity-60'}`}>{date.dayName}</span>
                   <span className="text-xl md:text-2xl font-black tracking-tighter leading-none">{date.dayNum}</span>
                   {date.isEvent && (
                     <div className={`absolute top-3 right-3 w-3 h-3 rounded-full border-2 border-white/20 shadow-lg ${isSelected ? 'bg-white' : 'bg-indigo-500 animate-pulse'}`} />
                   )}
                   {date.isToday && !isSelected && (
                     <div className="absolute -bottom-1 w-6 h-1 bg-indigo-500 rounded-full" />
                   )}
                </button>
              );
            })}
         </div>
      </div>

      {/* MAIN INTERFACE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 items-start">
         
         {/* LEFT COLUMN: LISTA DE ASISTENCIA */}
         <div className="lg:col-span-8 flex flex-col gap-6 md:gap-8">
            
            {!selectedDate ? (
              <div className="py-24 md:py-32 text-center bg-white dark:bg-[#1a2332] rounded-[3rem] border border-slate-200 dark:border-slate-800 group px-6 shadow-xl shadow-slate-500/5 transition-all duration-700 hover:shadow-2xl">
                 <div className="w-20 h-20 md:w-24 md:h-24 bg-slate-50 dark:bg-white/5 rounded-[2rem] md:rounded-[2.5rem] flex items-center justify-center text-slate-300 dark:text-slate-500 mx-auto mb-6 md:mb-8 group-hover:scale-110 group-hover:rotate-6 transition-all duration-700 border border-slate-200 dark:border-white/10 shadow-inner">
                    <Calendar className="w-10 h-10 md:w-12 md:h-12" />
                 </div>
                 <h3 className="text-xl md:text-2xl font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Selecciona una fecha</h3>
                 <p className="text-[10px] md:text-xs font-bold text-slate-300 dark:text-slate-600 uppercase tracking-[0.3em] mt-3">Cronograma Ministerial CBI</p>
              </div>
            ) : attendances.length === 0 ? (
              <div className="py-24 md:py-32 text-center bg-white dark:bg-[#1a2332] rounded-[3rem] border border-slate-200 dark:border-slate-800 px-6 shadow-2xl shadow-indigo-500/5 relative overflow-hidden group">
                 <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                 <div className="w-20 h-20 md:w-24 md:h-24 bg-indigo-50 dark:bg-white/5 rounded-[2rem] md:rounded-[2.5rem] flex items-center justify-center text-indigo-500 mx-auto mb-6 md:mb-8 transition-all duration-700 group-hover:scale-110 group-hover:-rotate-3 border border-indigo-100 dark:border-white/10 shadow-lg relative z-10">
                    <Inbox className="w-10 h-10 md:w-12 md:h-12" />
                 </div>
                 <h3 className="text-xl md:text-2xl font-black text-slate-800 dark:text-white uppercase tracking-widest relative z-10">Lista no generada</h3>
                 <button 
                   onClick={handleGenerateList} 
                   disabled={generating}
                   className="mt-8 md:mt-10 px-8 md:px-12 py-5 md:py-6 bg-indigo-600 text-white rounded-[2rem] font-black text-[11px] md:text-xs uppercase tracking-[0.2em] shadow-2xl shadow-indigo-600/30 hover:bg-indigo-500 transition-all flex items-center justify-center gap-3 mx-auto active:scale-95 disabled:opacity-70 relative z-10 hover:-translate-y-1"
                 >
                    {generating ? <RefreshCw className="w-5 h-5 animate-spin" /> : <>Generar Lista del Grupo <Zap className="w-4 h-4 text-amber-300" /></>}
                 </button>
              </div>
            ) : (
              <div className="space-y-6 md:space-y-8 animate-fade-in flex-1">
                 
                 {/* SEARCH & BULK ACTIONS */}
                  <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white dark:bg-[#1a2332] p-5 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm">
                     <div className="relative w-full sm:w-80 group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                        <input 
                          type="text"
                          placeholder="Buscar miembro..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full pl-11 pr-5 py-3 bg-slate-50 dark:bg-black/20 border-2 border-transparent focus:border-indigo-500 rounded-xl text-xs font-bold text-slate-700 dark:text-white outline-none transition-all placeholder:text-slate-400"
                        />
                     </div>
                     <div className="flex items-center gap-3 w-full sm:w-auto">
                        <button onClick={() => {
                          const edit = {...editedAttendances};
                          Object.keys(edit).forEach(id => edit[id].present = true);
                          setEditedAttendances(edit);
                        }} className="flex-1 sm:flex-none px-6 py-3 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl text-[10px] font-black uppercase tracking-widest border border-emerald-200 dark:border-emerald-800/50 hover:bg-emerald-500 hover:text-white transition-all">Todos</button>
                        <button onClick={() => {
                          const edit = {...editedAttendances};
                          Object.keys(edit).forEach(id => edit[id].present = false);
                          setEditedAttendances(edit);
                        }} className="flex-1 sm:flex-none px-6 py-3 bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-xl text-[10px] font-black uppercase tracking-widest border border-rose-200 dark:border-rose-800/50 hover:bg-rose-500 hover:text-white transition-all">Ninguno</button>
                     </div>
                  </div>

                 {/* GROUPED LIST */}
                 <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    {filteredAttendances.length === 0 && searchTerm && (
                       <div className="col-span-full py-12 text-center bg-slate-50 dark:bg-black/20 rounded-[2rem] border-2 border-dashed border-slate-200 dark:border-slate-800">
                          <Search className="w-10 h-10 text-slate-300 mx-auto mb-3 opacity-20" />
                          <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Sin resultados para "{searchTerm}"</p>
                       </div>
                     )}
                    {filteredAttendances.sort((a,b) => (b.leaderType ? 1 : -1)).map((att) => {
                      const isLeader = !!att.leaderType;
                      const edited = editedAttendances[att.memberId];
                      const leaderInfo = isLeader ? resolveLeaderLabel(att) : null;
                      
                      return (
                        <div 
                          key={att.memberId} 
                          className={`p-5 md:p-6 rounded-[2rem] border-2 transition-all group overflow-hidden ${edited?.present ? 'bg-white dark:bg-[#1a2332] border-emerald-500 dark:border-emerald-500/50 shadow-xl shadow-emerald-500/5' : 'bg-slate-50 dark:bg-slate-800/30 border-transparent dark:border-transparent'}`}
                        >
                           <div className="flex items-center gap-4 md:gap-5">
                              <div className={`w-12 h-12 md:w-14 md:h-14 rounded-[1rem] md:rounded-[1.2rem] flex items-center justify-center text-white text-lg md:text-xl font-bold transition-all shrink-0 ${edited?.present ? 'bg-emerald-500 scale-105 shadow-lg shadow-emerald-500/30' : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}`}>
                                 {isLeader ? leaderInfo.icon : att.memberName.charAt(0)}
                              </div>
                              <div className="flex-1 min-w-0">
                                 <p className={`text-xs md:text-sm font-black tracking-tight truncate ${edited?.present ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-300'}`}>
                                    {getDisplayName(att.memberName)}
                                 </p>
                                 <div className="flex items-center gap-1.5 md:gap-2 mt-1">
                                    {isLeader ? (
                                      <span className={`text-[8px] md:text-[9px] font-black uppercase tracking-widest text-${leaderInfo.color}-500`}>{leaderInfo.label}</span>
                                    ) : (
                                      <span className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-slate-400">Participante</span>
                                    )}
                                    <div className={`w-1 h-1 rounded-full ${edited?.present ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}></div>
                                    <span className="text-[8px] md:text-[9px] font-bold text-slate-400 dark:text-slate-500 truncate">{att.memberPhone || "Sin contacto"}</span>
                                 </div>
                              </div>
                              <button 
                                onClick={() => {
                                  setEditedAttendances(prev => ({
                                    ...prev,
                                    [att.memberId]: { ...prev[att.memberId], present: !prev[att.memberId].present }
                                  }));
                                }}
                                className={`w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center transition-all shrink-0 ${edited?.present ? 'bg-emerald-500 text-white active:scale-95 shadow-md' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-300 dark:text-slate-500 hover:border-emerald-500 hover:text-emerald-500'}`}
                              >
                                 {edited?.present ? <CheckCircle2 className="w-5 h-5 md:w-6 md:h-6" /> : <div className="w-4 h-4 md:w-5 md:h-5 border-2 border-slate-300 dark:border-slate-600 rounded-full group-hover:border-emerald-500 transition-colors"></div>}
                              </button>
                           </div>
                           
                           {/* JUSTIFICATION AREA */}
                           {!edited?.present && (
                             <div className="mt-4 md:mt-5 pt-4 md:pt-5 border-t border-slate-200 dark:border-slate-700/50 space-y-2 md:space-y-3 animate-fade-in">
                                <label className="flex items-center gap-2.5 md:gap-3 cursor-pointer group/just w-fit">
                                   <input 
                                     type="checkbox" 
                                     checked={edited?.justifiedAbsence} 
                                     onChange={() => setEditedAttendances(prev => ({ ...prev, [att.memberId]: { ...prev[att.memberId], justifiedAbsence: !prev[att.memberId].justifiedAbsence } }))}
                                     className="hidden"
                                   />
                                   <div className={`w-4 h-4 md:w-5 md:h-5 rounded-md border-2 transition-all flex items-center justify-center ${edited?.justifiedAbsence ? 'bg-amber-500 border-amber-500 text-white' : 'border-slate-300 dark:border-slate-600 group-hover/just:border-amber-400'}`}>
                                      {edited?.justifiedAbsence && <CheckCircle2 className="w-3 h-3 md:w-4 md:h-4" />}
                                   </div>
                                   <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 group-hover/just:text-slate-700 dark:group-hover/just:text-slate-300">Justificar Inasistencia</span>
                                </label>
                                {edited?.justifiedAbsence && (
                                  <input 
                                    type="text" 
                                    placeholder="¿Por qué no asistió?" 
                                    value={edited?.justificationReason} 
                                    onChange={(e) => setEditedAttendances(prev => ({ ...prev, [att.memberId]: { ...prev[att.memberId], justificationReason: e.target.value } }))}
                                    className="w-full px-4 md:px-5 py-2.5 md:py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl md:rounded-2xl text-[10px] md:text-[11px] font-bold text-slate-700 dark:text-slate-300 outline-none focus:border-amber-500 dark:focus:border-amber-500 transition-all mt-2"
                                  />
                                )}
                             </div>
                           )}
                        </div>
                      );
                    })}
                 </div>
              </div>
            )}
         </div>

         {/* RIGHT COLUMN: CONTROL PANEL */}
          <div className="lg:col-span-4 flex flex-col gap-6 sticky top-8">
            
            {/* KPI SUMMARY CARD */}
            <div className="bg-gradient-to-br from-indigo-600 to-indigo-900 p-8 rounded-[3rem] text-white shadow-2xl relative overflow-hidden group border border-white/10">
               <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700"></div>
               <div className="relative z-10 flex flex-col gap-6">
                  <div className="flex items-center justify-between">
                     <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-80">Estado Actual</p>
                     <div className="px-3 py-1 bg-white/20 rounded-lg text-[9px] font-black uppercase tracking-widest">{liveStats.present} Confirmados</div>
                  </div>
                  <div className="flex items-baseline gap-2">
                     <h2 className="text-6xl font-black tracking-tighter italic">{liveStats.pct}%</h2>
                     <p className="text-xs font-bold opacity-60 uppercase tracking-widest italic">Eficacia</p>
                  </div>
                  <div className="h-3 bg-black/20 rounded-full border border-white/5 p-0.5 overflow-hidden shadow-inner">
                     <div 
                       className="h-full bg-gradient-to-r from-emerald-400 to-teal-300 rounded-full transition-all duration-1000 shadow-[0_0_15px_rgba(52,211,153,0.5)]" 
                       style={{ width: `${liveStats.pct}%` }}
                     ></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-2">
                     <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                        <p className="text-xl font-black tracking-tighter">{summary?.avgAttendance?.toFixed(1) || 0}%</p>
                        <p className="text-[8px] font-black text-white/50 uppercase tracking-widest mt-1">Meta Mes</p>
                     </div>
                     <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                        <p className="text-xl font-black tracking-tighter">{attendances.length > 0 ? attendances.length : (summary?.totalMembers || 0)}</p>
                        <p className="text-[8px] font-black text-white/50 uppercase tracking-widest mt-1">Censo</p>
                     </div>
                  </div>
               </div>
            </div>

            {/* FORM CARD: SESSION INSIGHTS */}
            <div className="bg-white dark:bg-[#1a2332] p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-500/5 space-y-8">
               <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-indigo-50 dark:bg-white/5 text-indigo-500 dark:text-indigo-400 rounded-2xl flex items-center justify-center border border-indigo-100 dark:border-white/10 shadow-sm">
                     <MessageSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-[0.2em]">Bitácora del Encuentro</h3>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Visitas y Revelaciones</p>
                  </div>
               </div>

               <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1 flex items-center gap-1.5">
                         <Plus size={12} className="text-emerald-500" /> Visitas
                       </label>
                       <input 
                         type="number" 
                         value={sessionForm.newParticipants} 
                         onChange={e => setSessionForm({...sessionForm, newParticipants: e.target.value})}
                         className="w-full h-12 px-4 bg-slate-50 dark:bg-black/40 border-2 border-transparent focus:border-indigo-500 rounded-xl text-sm font-black text-slate-800 dark:text-white outline-none transition-all shadow-inner" 
                         placeholder="0"
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1 flex items-center gap-1.5">
                         <Users size={12} className="text-indigo-500" /> Impacto
                       </label>
                       <input 
                         type="number" 
                         value={sessionForm.totalAttendees} 
                         onChange={e => setSessionForm({...sessionForm, totalAttendees: e.target.value})}
                         className="w-full h-12 px-4 bg-slate-50 dark:bg-black/40 border-2 border-transparent focus:border-indigo-500 rounded-xl text-sm font-black text-slate-800 dark:text-white outline-none transition-all shadow-inner" 
                         placeholder={liveStats.present + (Number(sessionForm.newParticipants) || 0)}
                       />
                    </div>
                  </div>

                  <div className="space-y-2">
                     <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1 flex items-center gap-1.5">
                       <BookOpen size={12} className="text-indigo-400" /> Revelaciones y Peticiones
                     </label>
                     <textarea 
                       value={sessionForm.notes} 
                       onChange={e => setSessionForm({...sessionForm, notes: e.target.value})}
                       rows="3" 
                       className="w-full px-5 py-4 bg-slate-50 dark:bg-black/40 border-2 border-transparent focus:border-indigo-500 rounded-2xl text-xs font-bold text-slate-700 dark:text-slate-300 outline-none transition-all shadow-inner resize-none no-scrollbar"
                       placeholder="Consolidación y clamores..."
                     ></textarea>
                  </div>
               </div>
            </div>

            {/* UNIFIED PERSISTENCE ACTION */}
            <div className="bg-slate-900 p-8 rounded-[2.5rem] border border-white/5 shadow-2xl relative overflow-hidden group">
               <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700"></div>
               <div className="relative z-10 space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center border border-emerald-500/20">
                       <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    </div>
                    <p className="text-[9px] font-black text-emerald-400 uppercase tracking-[0.3em]">Guardado Ministerial Consolidado</p>
                  </div>
                  <h4 className="text-xl font-black text-white tracking-tight leading-tight italic">
                    ¿Listos para sincronizar?
                  </h4>
                  <button 
                    onClick={handleFinalSubmit} 
                    disabled={saving || !selectedDate}
                    className="w-full py-5 bg-white text-slate-900 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-xl hover:bg-emerald-50 hover:scale-[1.02] hover:-translate-y-1 transition-all active:scale-95 disabled:bg-slate-800 disabled:text-slate-600 flex items-center justify-center gap-3 group/btn text-center"
                  >
                     {saving ? (
                       <RefreshCw className="w-5 h-5 animate-spin" />
                     ) : (
                       <>
                         Sincronizar Todo 
                         <Zap className="w-4 h-4 text-indigo-600 group-hover/btn:animate-bounce" />
                       </>
                     )}
                  </button>
               </div>
            </div>

          </div>
        </div>
      </div>

      {/* MODALS SECTION (Outside transform context) */}
      {showEventModal && (
        <CreateAttendanceEventModal 
          isOpen={showEventModal} 
          onClose={() => setShowEventModal(false)} 
          onCreate={handleCreateEvent} 
          userRole={user?.roles?.[0]?.name || user?.roles?.[0]} 
        />
      )}
      {showStatsModal && (
        <CellAttendanceStatsModal 
          isOpen={showStatsModal} 
          onClose={() => setShowStatsModal(false)} 
          cellId={selectedCellId || ""} 
          cellName={selectedCellId ? (userCells.find(c => String(c.id) === String(selectedCellId))?.name || "Célula") : "Estadísticas Globales"}
          apiService={apiService}
          logUserAction={logUserAction}
        />
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-5px); } 75% { transform: translateX(5px); } }
        .animate-fade-in { animation: fadeIn 0.4s ease-out forwards; }
        .animate-shake { animation: shake 0.4s ease-in-out; }
        select { -webkit-appearance: none; -moz-appearance: none; appearance: none; }
      `}} />

    </>
  );
};

export default CellAttendancePage;