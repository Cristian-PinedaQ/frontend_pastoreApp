import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import apiService from "../../apiService";
import { useConfirmation } from "../../context/ConfirmationContext";
import nameHelper from "../../services/nameHelper";
import { generateSingleEventAttendancePDF, generateWorshipRangeAttendancePDF } from "../../services/worshipPdfGenerator";
import { 
  Plus, 
  Sparkles, 
  FileText, 
  Search, 
  Calendar as CalendarIcon, 
  Clock, 
  Edit2, 
  Trash2, 
  CheckSquare, 
  Share2, 
  X, 
  Info, 
  Music, 
  Youtube, 
  FileCode,
  ChevronRight,
  User,
  Check,
  AlertCircle,
  Users,
  Flame,
  Heart,
  RefreshCw
} from "lucide-react";
import { getRoleVisuals } from "./WorshipIconShared";

const { getDisplayName } = nameHelper;

const toArray = (val) => (Array.isArray(val) ? val : []);
const getSetlist = (event) => event.setlist?.length ? event.setlist : toArray(event.suggestedSongs);

const parseSafeDate = (dateVal) => {
  if (!dateVal) return new Date();
  if (Array.isArray(dateVal)) {
    const [y, m, d, h = 0, min = 0, s = 0] = dateVal;
    return new Date(y, m - 1, d, h, min, s);
  }
  const safeString = String(dateVal).replace(" ", "T");
  return new Date(safeString);
};

const WorshipScheduleTab = ({
  events = [],
  teamMembers = [],
  roles = [],
  songs = [],
  canManageWorship,
  loadData,
  showSuccess,
  showError,
  loading,
  setLoading,
}) => {
  const confirm = useConfirmation();
  const safeEvents = toArray(events);
  const safeTeamMembers = toArray(teamMembers);
  const safeRoles = toArray(roles);
  const safeSongs = toArray(songs);

  const [showEventModal, setShowEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [eventModalTab, setEventModalTab] = useState("INFO");
  const [eventFormData, setEventFormData] = useState({
    name: "",
    type: "CULTO_DOMINGO",
    date: "",
    description: "",
    praiseSongCount: 2, 
    worshipSongCount: 2, 
    assignments: [],
    songIds: [],
  });

  const [showAutoSuggestModal, setShowAutoSuggestModal] = useState(false);
  const [autoSuggestData, setAutoSuggestData] = useState({
    selectedEvents: [],
    requiredRoles: {},
    praiseSongCount: 2, 
    worshipSongCount: 2, 
  });

  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [attendanceEvent, setAttendanceEvent] = useState(null);
  const [attendanceList, setAttendanceList] = useState([]);
  const [isAttendanceLocked, setIsAttendanceLocked] = useState(false);

  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingEvent, setViewingEvent] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    const isAnyModalOpen = showEventModal || showAutoSuggestModal || showAttendanceModal || showViewModal;
    if (isAnyModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [showEventModal, showAutoSuggestModal, showAttendanceModal, showViewModal]);

  useEffect(() => {
    if (showAutoSuggestModal) {
      const initialReqs = {};
      safeRoles.filter((r) => r.active).forEach((r) => { initialReqs[r.id] = 0; });
      setAutoSuggestData((prev) => ({
        ...prev,
        selectedEvents: [],
        requiredRoles: initialReqs,
        praiseSongCount: 2,
        worshipSongCount: 2,
      }));
    }
  }, [showAutoSuggestModal, safeRoles]);

  const getAssignedVocalists = (songObj, eventAssignments) => {
    const fullSong = safeSongs.find(s => String(s.id) === String(songObj.id)) || songObj;
    const songVocalists = toArray(fullSong.vocalists);
    if (songVocalists.length === 0) return null;
    const leadVocalistIds = toArray(eventAssignments)
      .filter(a => {
        const roleName = (a.assignedRole?.name || "").toLowerCase();
        const isLeadSinger = roleName.includes("vocal") || roleName.includes("voz") || roleName.includes("cant") || roleName.includes("líder") || roleName.includes("director");
        const isChoir = roleName.includes("coro");
        return isLeadSinger && !isChoir;
      })
      .map(a => String(a.worshipTeamMember?.id));
    const singingToday = songVocalists.filter(v => leadVocalistIds.includes(String(v.id)));
    const formatName = (member) => {
      const rawName = member?.leader?.member?.name || member?.name || "Vocalista";
      return getDisplayName(rawName);
    };
    if (singingToday.length > 0) return singingToday.map(formatName).join(" & ");
    return null; 
  };

  const openViewModal = (event) => {
    setViewingEvent(event);
    setShowViewModal(true);
  };

  // FIX 3: Share now includes full event info: team assignments + attendance + setlist + links
  const handleShareEvent = async (event) => {
    const currentSetlist = getSetlist(event);
    const dateObj = parseSafeDate(event.eventDate);
    const assignments = toArray(event.assignments);

    let shareText = `⛪ *EVENTO: ${event.name}*\n`;
    shareText += `📅 Fecha: ${dateObj.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}\n`;
    shareText += `⏰ Hora: ${dateObj.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true })}\n`;
    if (event.description) {
      shareText += `📝 Notas: ${event.description}\n`;
    }
    shareText += `\n`;

    // Team section
    if (assignments.length > 0) {
      shareText += `🎸 *EQUIPO MINISTERIAL:*\n`;
      assignments.forEach((a) => {
        const name = getDisplayName(a.worshipTeamMember?.leader?.member?.name || "Músico");
        const role = a.assignedRole?.name || "Instrumento";
        const attendanceStatus =
          a.attended === true ? " ✅" :
          a.attended === false ? " ❌" : "";
        shareText += `• ${role}: *${name}*${attendanceStatus}\n`;
      });
      shareText += `\n`;
    }

    // Song counts summary
    shareText += `🎵 Meta musical: 🙌 ${event.praiseSongCount} alabanzas · 🙇 ${event.worshipSongCount} adoración\n\n`;

    // Setlist section
    shareText += `🎶 *SETLIST DE ADORACIÓN:*\n`;
    currentSetlist.forEach((s, idx) => {
      const emoji = s.type === 'ALABANZA' ? '🙌' : '🙇';
      const singer = getAssignedVocalists(s, assignments); 
      const singerText = singer ? ` (🎤 ${singer})` : '';
      const keyText = s.musicalKey ? ` [${s.musicalKey}]` : '';
      const bpmText = s.tempo ? ` • ${s.tempo} BPM` : '';
      shareText += `${idx + 1}. ${emoji} *${s.title}*${keyText}${bpmText}${singerText}\n`;
      if (s.author) shareText += `   ✍️ ${s.author}\n`;
      if (s.youtubeLink) shareText += `   📺 YouTube: ${s.youtubeLink}\n`;
      if (s.chordsLink) shareText += `   🎸 Acordes: ${s.chordsLink}\n`;
      shareText += `\n`;
    });

    shareText += `🚀 _Generado por PastoreApp_`;

    if (navigator.share) {
      try { await navigator.share({ title: event.name, text: shareText }); } 
      catch (err) { console.warn("Error compartiendo:", err); }
    } else {
      navigator.clipboard.writeText(shareText);
      showSuccess("📋 ¡Información del evento copiada al portapapeles!");
    }
  };

  const handleToggleAutoEvent = (eventId) => {
    setAutoSuggestData((prev) => {
      const isSelected = prev.selectedEvents.includes(eventId);
      const newSelected = isSelected ? prev.selectedEvents.filter((id) => id !== eventId) : [...prev.selectedEvents, eventId];
      let newPraise = prev.praiseSongCount;
      let newWorship = prev.worshipSongCount;
      if (!isSelected && newSelected.length === 1) {
        const firstEvent = safeEvents.find(e => e.id === eventId);
        newPraise = firstEvent?.praiseSongCount || 0;
        newWorship = firstEvent?.worshipSongCount || 0;
      } else if (newSelected.length === 0) {
        newPraise = 2;
        newWorship = 2;
      }
      return { ...prev, selectedEvents: newSelected, praiseSongCount: newPraise, worshipSongCount: newWorship };
    });
  };

  const handleRequirementChange = (roleId, value) => {
    setAutoSuggestData((prev) => ({
      ...prev, requiredRoles: { ...prev.requiredRoles, [roleId]: parseInt(value) || 0 },
    }));
  };

  const handleExecuteAutoSuggest = async () => {
    if (autoSuggestData.selectedEvents.length === 0) return showError("Selecciona al menos un evento.");
    const cleanRequirements = {};
    Object.entries(autoSuggestData.requiredRoles).forEach(([roleId, qty]) => { if (qty > 0) cleanRequirements[roleId] = qty; });
    if (Object.keys(cleanRequirements).length === 0) return showError("Indica cuántos músicos necesitas.");
    try {
      setLoading(true);
      await apiService.autoSuggestWorshipSchedule({
        eventIds: autoSuggestData.selectedEvents,
        requiredRoles: cleanRequirements,
        praiseSongCount: autoSuggestData.praiseSongCount,
        worshipSongCount: autoSuggestData.worshipSongCount,
      });
      showSuccess("✨ ¡Equipo y sugerencias de canciones generadas!");
      setShowAutoSuggestModal(false);
      await loadData();
    } catch (err) { showError(err.message); } 
    finally { setLoading(false); }
  };

  const openEventModal = async (event = null) => {
    setEventModalTab("INFO");
    if (event) {
      setEditingEvent(event);
      const d = parseSafeDate(event.eventDate);
      const pad = (n) => String(n).padStart(2, "0");
      const dateLocal = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
      const initialSongs = getSetlist(event);
      const initialSongIds = initialSongs.map(s => String(s.id));
      setEventFormData({
        name: event.name || "",
        type: event.eventType || "CULTO_DOMINGO",
        date: dateLocal,
        description: event.description || "",
        praiseSongCount: event.praiseSongCount || 0,
        worshipSongCount: event.worshipSongCount || 0,
        assignments: toArray(event.assignments).map((a) => ({
          roleId: a.assignedRole?.id?.toString() || "",
          memberId: a.worshipTeamMember?.id?.toString() || "",
        })),
        songIds: initialSongIds,
      });
      setShowEventModal(true);
      try {
        const fullEvent = await apiService.getWorshipEventById(event.id);
        if (fullEvent) {
          const freshSongs = getSetlist(fullEvent);
          const freshIds = freshSongs.map((s) => String(s.id));
          setEventFormData((prev) => ({ ...prev, songIds: freshIds }));
        }
      } catch (e) { console.warn("⚠️ Error al refrescar el setlist detallado:", e); }
    } else {
      setEditingEvent(null);
      setEventFormData({
        name: "", type: "CULTO_DOMINGO", date: "", description: "",
        praiseSongCount: 2, worshipSongCount: 2, assignments: [], songIds: [],
      });
      setShowEventModal(true);
    }
  };

  const handleSaveEvent = async (e) => {
    e.preventDefault();
    if (!eventFormData.name || !eventFormData.date) return showError("Nombre y fecha son obligatorios.");
    try {
      setLoading(true);
      const dateFormatted = eventFormData.date.length === 16 ? `${eventFormData.date}:00` : eventFormData.date;
      let savedId = editingEvent?.id;
      if (editingEvent) {
        await apiService.updateWorshipEvent(savedId, eventFormData.name, eventFormData.type, dateFormatted, eventFormData.description, eventFormData.praiseSongCount, eventFormData.worshipSongCount);
      } else {
        const res = await apiService.createWorshipEvent(eventFormData.name, eventFormData.type, dateFormatted, eventFormData.description, eventFormData.praiseSongCount, eventFormData.worshipSongCount);
        savedId = res?.id || res?.eventId;
      }
      if (savedId) {
        const validAssignments = toArray(eventFormData.assignments).filter((a) => a.roleId && a.memberId).map((a) => ({ roleId: parseInt(a.roleId), memberId: parseInt(a.memberId) }));
        await apiService.syncEventAssignments(savedId, validAssignments);
        const cleanSongIds = toArray(eventFormData.songIds).filter(id => id !== "" && id !== null).map(Number);
        await apiService.syncEventSetlist(savedId, cleanSongIds);
      }
      showSuccess("Evento guardado correctamente.");
      setShowEventModal(false);
      await loadData();
    } catch (err) { showError(err.message); } 
    finally { setLoading(false); }
  };

  const handleDeleteEvent = async (id) => {
    await confirm({
      title: "¿Eliminar Evento?",
      message: "¿Estás seguro de que deseas eliminar este evento del cronograma? Esta acción no se puede deshacer.",
      type: "danger",
      confirmLabel: "Eliminar Ahora",
      onConfirm: async () => {
        try {
          setLoading(true);
          await apiService.deleteWorshipEvent(id);
          showSuccess("Evento eliminado exitosamente.");
          await loadData();
        } catch (err) { 
          showError(err.message); 
        } finally { 
          setLoading(false); 
        }
      }
    });
  };

  const filteredEvents = safeEvents.filter((event) => {
    const matchName = event.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = filterStatus === "ALL" || event.status === filterStatus;
    let matchDate = true;
    const evDate = parseSafeDate(event.eventDate);
    if (dateFrom) matchDate = matchDate && evDate >= new Date(`${dateFrom}T00:00:00`);
    if (dateTo) matchDate = matchDate && evDate <= new Date(`${dateTo}T23:59:59`);
    return matchName && matchStatus && matchDate;
  });

  const handlePrintRangePDF = () => {
    if (filteredEvents.length === 0) return showError("No hay eventos en este rango para imprimir.");
    const startStr = dateFrom ? dateFrom : "Inicio histórico";
    const endStr = dateTo ? dateTo : "Actualidad";
    generateWorshipRangeAttendancePDF(filteredEvents, startStr, endStr);
  };

  const openAttendanceModal = (event) => {
    setAttendanceEvent(event);
    const hasBeenSavedBefore = toArray(event?.assignments).some(a => a.attended === true || a.attended === false);
    const eventDate = parseSafeDate(event.eventDate);
    const now = new Date();
    const hoursSinceEvent = (now.getTime() - eventDate.getTime()) / (1000 * 60 * 60);
    const shouldLock = hasBeenSavedBefore && hoursSinceEvent > 24;
    setIsAttendanceLocked(shouldLock);
    setAttendanceList(toArray(event?.assignments).map((a) => ({
      assignmentId: a.id,
      memberName: a.worshipTeamMember?.leader?.member?.name || "Músico",
      roleName: a.assignedRole?.name || "Instrumento",
      attended: a.attended === null || a.attended === undefined ? true : a.attended,
    })));
    setShowAttendanceModal(true);
  };

  const handleSaveAttendance = async () => {
    if (isAttendanceLocked) return;
    try {
      setLoading(true);
      const payload = attendanceList.map((a) => ({ assignmentId: a.assignmentId, attended: a.attended }));
      await apiService.recordWorshipAttendance(attendanceEvent.id, payload);
      showSuccess("Asistencia guardada.");
      setShowAttendanceModal(false);
      await loadData();
    } catch (err) { showError(err.message); } 
    finally { setLoading(false); }
  };

  const statusConfig = {
    PENDING: { color: "text-amber-400", bg: "bg-amber-400/10", border: "border-amber-400/20", label: "Pendiente" },
    ACTIVE: { color: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-emerald-400/20", label: "En Curso" },
    COMPLETED: { color: "text-indigo-400", bg: "bg-indigo-400/10", border: "border-indigo-400/20", label: "Completado" }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* ACTIONS & FILTERS PANEL */}
      <section className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2rem] p-4 sm:p-6 shadow-xl space-y-6">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {canManageWorship && (
              <>
                {/* FIX 1: explicit icon colors for light and dark mode */}
                <button
                  onClick={() => openEventModal()}
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold transition-all duration-300 shadow-lg shadow-indigo-600/20 active:scale-95"
                >
                  <Plus className="w-5 h-5 text-white" />
                  <span>Nuevo Evento</span>
                </button>
                <button
                  onClick={() => setShowAutoSuggestModal(true)}
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-purple-100 dark:bg-purple-600/20 hover:bg-purple-200 dark:hover:bg-purple-600/30 text-purple-700 dark:text-purple-400 border border-purple-300 dark:border-purple-500/30 rounded-2xl font-bold transition-all duration-300 active:scale-95"
                >
                  <Sparkles className="w-5 h-5 text-purple-700 dark:text-purple-400" />
                  <span>Auto-Programar</span>
                </button>
              </>
            )}
          </div>
          
          <button
            onClick={handlePrintRangePDF}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-2xl font-bold transition-all duration-300 active:scale-95 w-full xl:w-auto"
          >
            <FileText className="w-5 h-5 text-slate-700 dark:text-slate-200" />
            <span>Asistencia ({filteredEvents.length})</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
            <input
              type="text"
              placeholder="Buscar por nombre..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 focus:border-indigo-500/50 rounded-2xl pl-12 pr-4 py-3 text-sm focus:outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600 text-slate-900 dark:text-white font-bold"
            />
          </div>
          <div className="relative">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 focus:border-indigo-500/50 rounded-2xl px-4 py-3 text-sm focus:outline-none transition-all appearance-none cursor-pointer text-slate-900 dark:text-white font-bold"
            >
              <option value="ALL" className="bg-white dark:bg-slate-900">Todos los Estados</option>
              <option value="PENDING" className="bg-white dark:bg-slate-900">⏳ Pendiente</option>
              <option value="ACTIVE" className="bg-white dark:bg-slate-900">▶️ En Curso</option>
              <option value="COMPLETED" className="bg-white dark:bg-slate-900">✅ Completado</option>
            </select>
            <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 rotate-90 pointer-events-none" />
          </div>
          <div className="grid grid-cols-2 gap-0 bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-white/5 rounded-2xl overflow-hidden shadow-inner group">
            <div className="flex flex-col gap-1 p-3 border-r border-slate-200 dark:border-white/5 hover:bg-white/[0.02] transition-colors relative">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-3 h-3 text-indigo-500 opacity-70" />
                <span className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em]">Desde</span>
              </div>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="bg-transparent border-none focus:ring-0 text-[11px] text-slate-900 dark:text-white font-bold w-full cursor-pointer focus:outline-none p-0 [appearance:none]"
              />
            </div>
            <div className="flex flex-col gap-1 p-3 hover:bg-white/[0.02] transition-colors">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-3 h-3 text-purple-500 opacity-70" />
                <span className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em]">Hasta</span>
              </div>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="bg-transparent border-none focus:ring-0 text-[11px] text-slate-900 dark:text-white font-bold w-full cursor-pointer focus:outline-none p-0 [appearance:none]"
              />
            </div>
          </div>
        </div>
      </section>

      {/* EVENTS GRID */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredEvents.length === 0 ? (
          <div className="col-span-full py-20 flex flex-col items-center justify-center bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-[2.5rem] text-slate-500">
            <CalendarIcon className="w-16 h-16 opacity-10 mb-4" />
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-400">Sin eventos que mostrar</h3>
            <p className="text-sm">Ajusta los filtros o crea un nuevo evento</p>
          </div>
        ) : (
          filteredEvents.map((event) => {
            const dateObj = parseSafeDate(event.eventDate);
            const currentSetlist = getSetlist(event);
            const status = statusConfig[event.status] || statusConfig.PENDING;
            const isFuture = dateObj > new Date();

            return (
              <div
                key={event.id}
                onClick={() => openViewModal(event)}
                className="group relative bg-white dark:bg-white/5 backdrop-blur-md border border-slate-200 dark:border-white/10 hover:border-indigo-500/30 rounded-[2.5rem] p-6 transition-all duration-500 hover:translate-y-[-4px] hover:shadow-2xl hover:shadow-indigo-500/10 cursor-pointer overflow-hidden"
              >
                {/* Status Badge */}
                <div className={`absolute top-6 right-6 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${status.bg} ${status.color} ${status.border}`}>
                  {status.label}
                </div>
 
                <div className="space-y-4">
                  <div className="space-y-1">
                    {/* FIX 2: clamp event name to 2 lines, prevent overflow into badge area */}
                    <h3 className="text-xl font-black text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors pr-20 leading-tight line-clamp-2 break-words">
                      {event.name}
                    </h3>
                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm font-medium">
                      <Clock className="w-4 h-4 text-indigo-500/50" />
                      {dateObj.toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 py-2 border-y border-slate-100 dark:border-white/5">
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold block mb-2">Meta Musical</span>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="flex items-center gap-1 text-[10px] font-black bg-red-500/10 text-red-600 dark:text-red-400 px-2.5 py-1 rounded-xl border border-red-500/20 uppercase tracking-widest">
                          <Flame className="w-3 h-3" /> {event.praiseSongCount}
                        </span>
                        <span className="flex items-center gap-1 text-[10px] font-black bg-purple-500/10 text-purple-600 dark:text-purple-400 px-2.5 py-1 rounded-xl border border-purple-500/20 uppercase tracking-widest">
                          <Heart className="w-3 h-3" /> {event.worshipSongCount}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold block mb-2">Músicos • {toArray(event.assignments).length}</span>
                      <div className="flex -space-x-2 overflow-hidden">
                        {toArray(event.assignments).slice(0, 5).map((a, idx) => (
                          <div 
                            key={idx} 
                            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-white dark:border-[#12141a] flex items-center justify-center text-[10px] font-black text-indigo-600 dark:text-indigo-400"
                            title={`${getDisplayName(a.worshipTeamMember?.leader?.member?.name)} - ${a.assignedRole?.name}`}
                          >
                            {getDisplayName(a.worshipTeamMember?.leader?.member?.name)?.charAt(0)}
                          </div>
                        ))}
                        {toArray(event.assignments).length > 5 && (
                          <div className="w-8 h-8 rounded-full bg-indigo-600 border-2 border-white dark:border-[#12141a] flex items-center justify-center text-[10px] font-black text-white">
                            +{toArray(event.assignments).length - 5}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold block mb-2">Setlist • {currentSetlist.length} Canciones</span>
                    <div className="space-y-1.5">
                      {currentSetlist.slice(0, 2).map((s, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
                          <div className={`w-1.5 h-1.5 flex-shrink-0 rounded-full ${s.type === 'ALABANZA' ? 'bg-red-400 shadow-[0_0_8px_rgba(239,68,68,0.6)]' : 'bg-purple-400 shadow-[0_0_8px_rgba(167,139,250,0.6)]'}`} />
                          <span className="truncate">{s.title}</span>
                        </div>
                      ))}
                      {currentSetlist.length > 2 && (
                        <span className="text-[10px] text-indigo-600 dark:text-indigo-400/60 font-bold ml-3.5 italic">+{currentSetlist.length - 2} más...</span>
                      )}
                    </div>
                  </div>
                </div>

                {canManageWorship && (
                  <div className="flex gap-2 pt-4 border-t border-slate-100 dark:border-white/5 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
                    <button
                      onClick={(e) => { e.stopPropagation(); openEventModal(event); }}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-900 dark:text-white rounded-xl text-xs font-bold border border-slate-200 dark:border-white/10 transition-colors shadow-sm"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
                      <span>Editar</span>
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); openAttendanceModal(event); }}
                      disabled={isFuture}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-indigo-50 dark:bg-indigo-600/10 hover:bg-indigo-100 dark:hover:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 rounded-xl text-xs font-bold border border-indigo-200 dark:border-indigo-500/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed shadow-sm"
                    >
                      <CheckSquare className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      <span>Asistencia</span>
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteEvent(event.id); }}
                      className="w-10 flex items-center justify-center bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 rounded-xl border border-red-200 dark:border-red-500/20 transition-colors shadow-sm"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </section>

      {/* MODAL: EVENT VIEW */}
      {showViewModal && viewingEvent && typeof document !== 'undefined' && document.body && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4 md:p-6 animate-in fade-in duration-300">
          <div 
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-500" 
            onClick={() => setShowViewModal(false)} 
          />
          <div className="relative w-full max-w-4xl bg-white dark:bg-[#0f1117] border border-slate-200 dark:border-white/10 rounded-[2.5rem] shadow-[0_0_100px_rgba(99,102,241,0.2)] flex flex-col max-h-[95vh] animate-in zoom-in-95 fade-in slide-in-from-bottom-8 duration-500 overflow-hidden">
            
            {/* --- MODAL HEADER --- */}
            <div className="relative p-6 md:p-10 border-b border-slate-100 dark:border-white/5 bg-white dark:bg-[#0f1117] shrink-0">
               <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />
               
               {/* Top Navigation */}
               <div className="flex items-center justify-between mb-8 relative z-10">
                  <button 
                    onClick={() => setShowViewModal(false)}
                    className="group flex items-center gap-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all font-bold text-[10px] uppercase tracking-widest px-4 py-2 bg-slate-50 dark:bg-white/5 rounded-full border border-slate-200 dark:border-white/10 shadow-sm"
                  >
                    <ChevronRight className="w-4 h-4 rotate-180 group-hover:-translate-x-1 transition-transform" />
                    <span>Cerrar</span>
                  </button>

                  <div className="flex gap-2">
                    {canManageWorship && (
                      <button 
                        onClick={() => { setShowViewModal(false); openEventModal(viewingEvent); }}
                        className="w-10 h-10 flex items-center justify-center bg-slate-50 dark:bg-white/5 hover:bg-indigo-600 hover:text-white rounded-xl border border-slate-200 dark:border-white/10 transition-all text-slate-600 dark:text-slate-300 active:scale-95 shadow-sm"
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}
                    <button 
                      onClick={() => handleShareEvent(viewingEvent)}
                      className="w-10 h-10 flex items-center justify-center bg-slate-50 dark:bg-white/5 hover:bg-indigo-600 hover:text-white rounded-xl border border-slate-200 dark:border-white/10 transition-all text-slate-600 dark:text-slate-300 active:scale-95 shadow-sm"
                      title="Compartir"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => setShowViewModal(false)}
                      className="w-10 h-10 flex items-center justify-center bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-600 hover:text-white rounded-xl border border-rose-200 dark:border-rose-500/20 transition-all text-rose-600 dark:text-rose-400 active:scale-95 shadow-sm sm:hidden"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
               </div>

               {/* Event Identity */}
               <div className="space-y-4 relative z-10">
                 <div className="flex flex-wrap items-center gap-3">
                   <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm ${statusConfig[viewingEvent.status]?.bg} ${statusConfig[viewingEvent.status]?.color} ${statusConfig[viewingEvent.status]?.border}`}>
                     {statusConfig[viewingEvent.status]?.label}
                   </div>
                   <div className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-white/5 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest border border-slate-200 dark:border-white/5">
                     {viewingEvent.type?.replace('_', ' ')}
                   </div>
                 </div>

                 <h2 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tighter leading-[1.1] break-words">
                   {viewingEvent.name || "Sin Título Informativo"}
                 </h2>

                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl pt-2">
                    <div className="flex items-center gap-4 p-4 bg-indigo-50/50 dark:bg-indigo-500/5 rounded-2xl border border-indigo-100 dark:border-indigo-500/10 backdrop-blur-sm">
                       <div className="w-10 h-10 flex items-center justify-center bg-indigo-600 rounded-xl shadow-lg shadow-indigo-600/30">
                         <CalendarIcon className="w-5 h-5 text-white" />
                       </div>
                       <div className="flex flex-col">
                         <span className="text-[9px] font-black uppercase tracking-widest text-indigo-400 dark:text-indigo-500 mb-0.5">Fecha del Evento</span>
                         <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                           {parseSafeDate(viewingEvent.eventDate).toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                         </span>
                       </div>
                    </div>

                    <div className="flex items-center gap-4 p-4 bg-purple-50/50 dark:bg-purple-500/5 rounded-2xl border border-purple-100 dark:border-purple-500/10 backdrop-blur-sm">
                       <div className="w-10 h-10 flex items-center justify-center bg-purple-600 rounded-xl shadow-lg shadow-purple-600/30">
                         <Clock className="w-5 h-5 text-white" />
                       </div>
                       <div className="flex flex-col">
                         <span className="text-[9px] font-black uppercase tracking-widest text-purple-400 dark:text-purple-500 mb-0.5">Hora de Inicio</span>
                         <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                           {parseSafeDate(viewingEvent.eventDate).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true })}
                         </span>
                       </div>
                    </div>
                 </div>
               </div>
            </div>

            {/* --- MODAL BODY --- */}
            <div className="flex-1 overflow-y-auto no-scrollbar p-6 md:p-10 space-y-10 bg-gradient-to-b from-transparent to-slate-50/30 dark:to-white/[0.01]">
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                 <div className="p-5 bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 rounded-3xl shadow-sm">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Músicos</span>
                    <div className="flex items-end gap-2">
                       <span className="text-2xl font-black text-slate-900 dark:text-white">{toArray(viewingEvent.assignments).length}</span>
                       <Users className="w-5 h-5 text-indigo-500 mb-1 opacity-50" />
                    </div>
                 </div>
                 <div className="p-5 bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 rounded-3xl shadow-sm">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Canciones</span>
                    <div className="flex items-end gap-2">
                       <span className="text-2xl font-black text-slate-900 dark:text-white">{getSetlist(viewingEvent).length}</span>
                       <Music className="w-5 h-5 text-purple-500 mb-1 opacity-50" />
                    </div>
                 </div>
                 <div className="p-5 bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 rounded-3xl shadow-sm">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Alabanza</span>
                    <div className="flex items-end gap-2">
                       <span className="text-2xl font-black text-red-500">{viewingEvent.praiseSongCount}</span>
                       <Flame className="w-5 h-5 text-red-500/50 mb-1" />
                    </div>
                 </div>
                 <div className="p-5 bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 rounded-3xl shadow-sm">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Adoración</span>
                    <div className="flex items-end gap-2">
                       <span className="text-2xl font-black text-violet-500">{viewingEvent.worshipSongCount}</span>
                       <Heart className="w-5 h-5 text-violet-500/50 mb-1" />
                    </div>
                 </div>
              </div>

              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 flex items-center justify-center bg-indigo-500/10 rounded-2xl">
                      <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                      <h4 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Cuerpo Ministerial</h4>
                      <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Servidores asignados hoy</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {toArray(viewingEvent.assignments).map((a, idx) => {
                    const visuals = getRoleVisuals(a.assignedRole?.name || "🎵");
                    return (
                      <div key={idx} className="flex items-center gap-4 p-5 bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 rounded-3xl group transition-all hover:bg-slate-50 dark:hover:bg-white/[0.05] hover:border-indigo-500/20 shadow-sm">
                        <div className={`w-12 h-12 rounded-2xl ${visuals.bg} flex items-center justify-center ${visuals.color} transition-all`}>
                           <visuals.icon className="w-6 h-6 text-current" />
                        </div>
                        <div className="flex flex-col flex-1">
                          <span className="text-sm font-black text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors">
                            {getDisplayName(a.assignedMember?.memberName)}
                          </span>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <div className="w-1 h-1 rounded-full bg-indigo-500" />
                            <span className="text-[10px] font-black text-slate-500 dark:text-slate-600 uppercase tracking-[0.15em]">{visuals.name}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 flex items-center justify-center bg-purple-500/10 rounded-2xl">
                      <Music className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <h4 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Repertorio Maestro</h4>
                      <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Orden de ejecución</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {getSetlist(viewingEvent).map((song, idx) => {
                    const singer = getAssignedVocalists(song, viewingEvent.assignments);
                    return (
                      <div key={idx} className="relative p-6 bg-white dark:bg-[#1a1c24]/50 border border-slate-200 dark:border-white/5 rounded-[2rem] group transition-all hover:shadow-xl hover:shadow-indigo-500/10 hover:border-indigo-500/30 overflow-hidden">
                         <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            <span className="text-6xl font-black text-indigo-500">{idx + 1}</span>
                         </div>

                        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                          <div className="space-y-4 flex-1">
                            <div className="space-y-2">
                               <div className="flex flex-wrap items-center gap-2">
                                 <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border flex items-center gap-2 ${
                                   song.type === 'ALABANZA' 
                                     ? 'bg-red-500/10 text-red-600 border-red-500/20' 
                                     : 'bg-violet-500/10 text-violet-600 border-violet-500/20'
                                 }`}>
                                   {song.type === 'ALABANZA' ? <Flame className="w-3 h-3" /> : <Heart className="w-3 h-3" />}
                                   {song.type}
                                 </span>
                                 {song.musicalKey && (
                                   <span className="px-2.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[9px] font-black rounded-lg border border-slate-200 dark:border-white/5">
                                      TONO: {song.musicalKey}
                                   </span>
                                 )}
                                 {song.tempo && (
                                   <span className="px-2.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[9px] font-black rounded-lg border border-slate-200 dark:border-white/5">
                                      {song.tempo} BPM
                                   </span>
                                 )}
                               </div>
                               <h5 className="text-xl font-black text-slate-900 dark:text-white tracking-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{song.title}</h5>
                               {song.author && <p className="text-xs font-bold text-slate-500 italic">By {song.author}</p>}
                            </div>
                            
                            <div className="flex flex-wrap items-center gap-3 pt-1">
                               {singer && (
                                 <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
                                   <User className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                                   <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300">Voz: <span className="font-black underline decoration-indigo-500/30 underline-offset-2">{singer}</span></span>
                                 </div>
                               )}
                               
                               <div className="flex items-center gap-2">
                                  {song.youtubeLink && (
                                    <a 
                                      href={song.youtubeLink} 
                                      target="_blank" 
                                      rel="noreferrer"
                                      className="flex items-center justify-center w-8 h-8 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all"
                                      title="Ver en YouTube"
                                    >
                                      <Youtube className="w-4 h-4" />
                                    </a>
                                  )}
                                  {song.chordsLink && (
                                    <a 
                                      href={song.chordsLink} 
                                      target="_blank" 
                                      rel="noreferrer"
                                      className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500 hover:text-white transition-all"
                                      title="Ver Acordes"
                                    >
                                      <FileCode className="w-4 h-4" />
                                    </a>
                                  )}
                               </div>
                            </div>
                          </div>
                          
                          <div className="hidden sm:flex flex-col items-center">
                             <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Orden</div>
                             <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 flex items-center justify-center font-black text-slate-900 dark:text-white text-lg shadow-sm">
                                {idx + 1}
                             </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              
              {viewingEvent.description && (
                 <div className="p-6 bg-slate-900 dark:bg-indigo-600/10 rounded-[2rem] border border-white/5 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4">
                       <Info className="w-8 h-8 text-indigo-400 opacity-20 group-hover:opacity-40 transition-opacity" />
                    </div>
                    <div className="relative z-10">
                       <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] block mb-3">Notas del Evento</span>
                       <p className="text-sm font-medium text-slate-300 dark:text-slate-200 leading-relaxed italic">"{viewingEvent.description}"</p>
                    </div>
                 </div>
              )}
            </div>

            {canManageWorship && (
              <div className="px-8 py-6 bg-white dark:bg-[#0a0c10] border-t border-slate-100 dark:border-white/10 flex flex-col sm:flex-row justify-end gap-3 items-center">
                <button
                  onClick={() => { setShowViewModal(false); openEventModal(viewingEvent); }}
                  className="w-full sm:w-auto px-8 py-3.5 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-white rounded-2xl font-black border border-slate-200 dark:border-white/10 transition-all flex items-center justify-center gap-2 active:scale-95"
                >
                  <Edit2 className="w-4 h-4" />
                  <span>Editar Programación</span>
                </button>
                <div className="w-px h-8 bg-slate-100 dark:bg-white/5 mx-2 hidden sm:block" />
                <button
                   onClick={() => handleShareEvent(viewingEvent)}
                  className="w-full sm:w-auto px-10 py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-2xl font-black transition-all shadow-xl shadow-indigo-600/20 flex items-center justify-center gap-2 active:scale-95"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Enviar a Equipo</span>
                </button>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* MODAL: EVENT FORM (CREATE/EDIT) */}
      {showEventModal && typeof document !== 'undefined' && document.body && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4">
           <div 
             className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-500" 
             onClick={() => setShowEventModal(false)} 
           />
           <div className="relative w-full max-w-4xl bg-white dark:bg-[#12141c] border border-slate-200 dark:border-white/10 rounded-[2.5rem] shadow-[0_0_100px_rgba(99,102,241,0.15)] overflow-hidden">
               {/* --- MODAL HEADER --- */}
               <div className="p-8 pb-4 shrink-0 bg-white dark:bg-[#12141c] border-b border-slate-100 dark:border-white/5">
                 <div className="flex items-center justify-between mb-4">
                    <div className="space-y-1">
                      <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                        {editingEvent ? 'Editar Culto' : 'Programar Nuevo Culto'}
                      </h2>
                      <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Define los detalles, el equipo y las canciones</p>
                    </div>
                    <button onClick={() => setShowEventModal(false)} className="p-3 bg-slate-100 dark:bg-white/5 hover:bg-rose-500 hover:text-white rounded-2xl border border-slate-200 dark:border-white/10 transition-all text-slate-600 dark:text-slate-400 active:scale-95">
                      <X className="w-5 h-5" />
                    </button>
                 </div>

                 <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                   {[
                     { id: "INFO", icon: Info, label: "Detalles" },
                     { id: "TEAM", icon: Users, label: "Equipo" },
                     { id: "SONGS", icon: Music, label: "Canciones" }
                   ].map((t) => (
                     <button 
                       key={t.id}
                       type="button"
                       onClick={() => setEventModalTab(t.id)}
                       className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-[11px] uppercase tracking-widest transition-all whitespace-nowrap border ${
                         eventModalTab === t.id 
                           ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/20" 
                           : "bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-300"
                       }`}
                     >
                       <t.icon className={`w-3.5 h-3.5 ${eventModalTab === t.id ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />
                       {t.label}
                     </button>
                   ))}
                 </div>
               </div>

               {/* --- MODAL BODY --- */}
               <div className="flex-1 overflow-y-auto no-scrollbar p-8">
                 <form onSubmit={handleSaveEvent} className="space-y-6">
                   {eventModalTab === "INFO" && (
                     <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <div className="space-y-2">
                           <label className="text-[10px] uppercase tracking-widest text-slate-500 font-black px-1">Título del Evento *</label>
                           <input 
                             type="text" required value={eventFormData.name} 
                             onChange={(e) => setEventFormData({ ...eventFormData, name: e.target.value })}
                             className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 focus:border-indigo-500 rounded-2xl px-6 py-4 text-sm focus:outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-700 text-slate-900 dark:text-white font-bold" 
                             placeholder="Ej: Culto Dominical de Adoración"
                           />
                         </div>
                         <div className="space-y-2">
                           <label className="text-[10px] uppercase tracking-widest text-slate-500 font-black px-1">Tipo de Evento</label>
                           <div className="relative">
                             <select 
                               value={eventFormData.type} 
                               onChange={(e) => setEventFormData({ ...eventFormData, type: e.target.value })}
                               className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 focus:border-indigo-500 rounded-2xl px-6 py-4 text-sm focus:outline-none transition-all appearance-none cursor-pointer text-slate-900 dark:text-white font-bold"
                             >
                               <option value="CULTO_DOMINGO" className="bg-white dark:bg-[#12141c]">Culto de Domingo</option>
                               <option value="AYUNO_GENERAL" className="bg-white dark:bg-[#12141c]">Ayuno General</option>
                               <option value="CELULA_GENERAL" className="bg-white dark:bg-[#12141c]">Célula General</option>
                               <option value="ENSAYO" className="bg-white dark:bg-[#12141c]">Ensayo de Alabanza</option>
                               <option value="OTRO" className="bg-white dark:bg-[#12141c]">Otro Evento Especial</option>
                             </select>
                             <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 rotate-90 pointer-events-none" />
                           </div>
                         </div>
                       </div>

                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <div className="space-y-2 group">
                           <label className="text-[10px] uppercase tracking-widest text-slate-500 font-black px-1 flex items-center gap-2">
                              <CalendarIcon className="w-3.5 h-3.5 text-indigo-500" />
                              Fecha y Hora *
                           </label>
                           <div className="relative">
                             <input 
                               type="datetime-local" 
                               required 
                               value={eventFormData.date} 
                               onChange={(e) => setEventFormData({ ...eventFormData, date: e.target.value })}
                               className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 group-focus-within:border-indigo-500/50 rounded-2xl pl-6 pr-12 py-4 text-sm text-slate-900 dark:text-white font-bold focus:outline-none transition-all cursor-pointer [appearance:none] [color-scheme:light] dark:[color-scheme:dark]" 
                             />
                             <Clock className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none group-focus-within:text-indigo-500 transition-colors" />
                           </div>
                         </div>
                         <div className="flex gap-4">
                           <div className="space-y-2 flex-1 group">
                             <label className="text-[10px] uppercase tracking-widest text-slate-500 font-black px-1 flex items-center gap-2">
                               Alabanzas <Flame className="w-3.5 h-3.5 text-rose-500" />
                             </label>
                             <input 
                               type="number" min="0" value={eventFormData.praiseSongCount} 
                               onChange={(e) => setEventFormData({ ...eventFormData, praiseSongCount: parseInt(e.target.value) || 0 })}
                               className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 group-focus-within:border-indigo-500 rounded-2xl px-6 py-4 text-sm focus:outline-none transition-all text-center font-black text-slate-900 dark:text-white" 
                             />
                           </div>
                           <div className="space-y-2 flex-1 group">
                             <label className="text-[10px] uppercase tracking-widest text-slate-500 font-black px-1 flex items-center gap-2">
                               Adoración <Heart className="w-3.5 h-3.5 text-indigo-500" />
                             </label>
                             <input 
                               type="number" min="0" value={eventFormData.worshipSongCount} 
                               onChange={(e) => setEventFormData({ ...eventFormData, worshipSongCount: parseInt(e.target.value) || 0 })}
                               className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 group-focus-within:border-indigo-500 rounded-2xl px-6 py-4 text-sm focus:outline-none transition-all text-center font-black text-slate-900 dark:text-white" 
                             />
                           </div>
                         </div>
                       </div>

                       <div className="space-y-2">
                         <label className="text-[10px] uppercase tracking-widest text-slate-500 font-black px-1">Descripción / Notas</label>
                         <textarea 
                           rows="3" value={eventFormData.description} 
                           onChange={(e) => setEventFormData({ ...eventFormData, description: e.target.value })}
                           className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 focus:border-indigo-500 rounded-[2rem] px-6 py-4 text-sm focus:outline-none transition-all no-scrollbar placeholder:text-slate-400 dark:placeholder:text-slate-700 text-slate-900 dark:text-white font-medium resize-none" 
                           placeholder="Detalles adicionales sobre el vestuario, dinámicas, etc..."
                         />
                       </div>
                     </div>
                   )}

                   {eventModalTab === "TEAM" && (
                     <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                       <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] uppercase tracking-widest text-slate-500 font-black px-1">Asignación Ministerial</span>
                          <button 
                           type="button"
                           onClick={() => setEventFormData({ ...eventFormData, assignments: [...eventFormData.assignments, { roleId: "", memberId: "" }] })}
                           className="flex items-center gap-2 px-4 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-indigo-500/20"
                          >
                            <Plus className="w-3.5 h-3.5" /> Añadir Rol
                          </button>
                       </div>
                       
                       <div className="space-y-4">
                         {eventFormData.assignments.map((assignment, idx) => (
                           <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end p-4 bg-slate-50/50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 rounded-2xl animate-in fade-in duration-300">
                             <div className="md:col-span-5 space-y-1.5">
                                <label className="text-[9px] uppercase font-black text-slate-400 pl-1">Instrumento</label>
                                <div className="relative">
                                  <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                                    {(() => {
                                      const visuals = getRoleVisuals(safeRoles.find(r => r.id === assignment.roleId)?.name || "🎵");
                                      return <visuals.icon className={`w-4 h-4 ${assignment.roleId ? visuals.color : 'text-slate-400'}`} />;
                                    })()}
                                  </div>
                                  <select 
                                   value={assignment.roleId} 
                                   onChange={(e) => {
                                     const newAss = [...eventFormData.assignments];
                                     newAss[idx].roleId = e.target.value;
                                     setEventFormData({ ...eventFormData, assignments: newAss });
                                   }}
                                   className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl pl-11 pr-10 py-2.5 text-sm focus:outline-none appearance-none cursor-pointer text-slate-900 dark:text-white font-bold transition-all focus:border-indigo-500/50"
                                  >
                                    <option value="">-- Rol --</option>
                                    {safeRoles.filter(r => r.active).map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                  </select>
                                  <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 rotate-90 pointer-events-none" />
                                </div>
                             </div>
                             <div className="md:col-span-6 space-y-1.5">
                                <label className="text-[9px] uppercase font-black text-slate-400 pl-1">Adorador (Activo)</label>
                                <div className="relative">
                                  <select 
                                   value={assignment.memberId} 
                                   onChange={(e) => {
                                     const newAss = [...eventFormData.assignments];
                                     newAss[idx].memberId = e.target.value;
                                     setEventFormData({ ...eventFormData, assignments: newAss });
                                   }}
                                   className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none appearance-none cursor-pointer text-slate-900 dark:text-white font-bold transition-all focus:border-indigo-500/50"
                                  >
                                    <option value="">-- Músico --</option>
                                    {safeTeamMembers.filter(m => m.worshipStatus === 'ACTIVE' || m.id === assignment.memberId).map(m => (
                                      <option key={m.id} value={m.id}>{getDisplayName(m.memberName)}</option>
                                    ))}
                                  </select>
                                  <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 rotate-90 pointer-events-none" />
                                </div>
                             </div>
                             <div className="md:col-span-1 flex justify-end">
                                <button 
                                  type="button"
                                  onClick={() => {
                                    const newAss = eventFormData.assignments.filter((_, i) => i !== idx);
                                    setEventFormData({ ...eventFormData, assignments: newAss });
                                  }}
                                  className="w-10 h-10 flex items-center justify-center bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white rounded-xl transition-all border border-rose-500/20 active:scale-90"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                             </div>
                           </div>
                         ))}
                         {eventFormData.assignments.length === 0 && (
                           <div className="text-center py-10 bg-slate-50 dark:bg-white/[0.02] border border-dashed border-slate-300 dark:border-white/10 rounded-[2rem]">
                              <p className="text-slate-500 text-sm font-medium">Asigna el equipo musical hoy</p>
                           </div>
                         )}
                       </div>
                     </div>
                   )}

                   {eventModalTab === "SONGS" && (
                     <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                        <div className="flex items-center justify-between">
                           <span className="text-[10px] uppercase tracking-widest text-slate-500 font-black px-1 block">Setlist Master ({eventFormData.songIds.length})</span>
                           <div className="flex gap-2">
                              <span className="flex items-center gap-1.5 text-[9px] font-black text-rose-500 uppercase px-2 py-1 bg-rose-500/5 rounded-lg border border-rose-500/10">
                                <Flame className="w-3 h-3" /> {eventFormData.praiseSongCount} Alabanza
                              </span>
                              <span className="flex items-center gap-1.5 text-[9px] font-black text-indigo-500 uppercase px-2 py-1 bg-indigo-500/5 rounded-lg border border-indigo-500/10">
                                <Heart className="w-3 h-3" /> {eventFormData.worshipSongCount} Adoración
                              </span>
                           </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                           {safeSongs.map((song) => {
                             const isSelected = eventFormData.songIds.includes(String(song.id));
                             return (
                               <button
                                 key={song.id}
                                 type="button"
                                 onClick={() => {
                                   const newIds = isSelected 
                                    ? eventFormData.songIds.filter(id => id !== String(song.id)) 
                                    : [...eventFormData.songIds, String(song.id)];
                                   setEventFormData({ ...eventFormData, songIds: newIds });
                                 }}
                                 className={`
                                   flex items-center gap-4 p-4 rounded-2xl border text-left transition-all duration-300 group
                                   ${isSelected 
                                     ? "bg-indigo-600/10 border-indigo-500 text-indigo-600 dark:text-indigo-400 shadow-md" 
                                     : "bg-white dark:bg-white/[0.02] border-slate-200 dark:border-white/5 text-slate-500 hover:border-indigo-500/30"
                                   }
                                 `}
                               >
                                 <div className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center font-black transition-all ${
                                   isSelected ? "bg-indigo-600 text-white shadow-lg" : "bg-slate-50 dark:bg-white/5 text-slate-400 grayscale opacity-60 group-hover:opacity-100"
                                 }`}>
                                   {isSelected ? <Check className="w-5 h-5 text-white stroke-[3px]" /> : <Music className="w-4 h-4" />}
                                 </div>
                                 <div className="flex flex-col min-w-0">
                                   <span className={`text-sm font-black truncate leading-tight ${isSelected ? 'text-indigo-900 dark:text-indigo-200' : 'text-slate-700 dark:text-slate-300'}`}>{song.title}</span>
                                   <span className={`text-[9px] font-black uppercase tracking-widest mt-0.5 ${
                                     song.type === 'ALABANZA' ? 'text-rose-500' : 'text-indigo-500'
                                   }`}>
                                     {song.type === 'ALABANZA' ? 'Alabanza' : 'Adoración'}
                                   </span>
                                 </div>
                               </button>
                             );
                           })}
                        </div>
                     </div>
                   )}
                 </form>
               </div>

               {/* --- MODAL FOOTER --- */}
               <div className="p-8 shrink-0 bg-slate-50 dark:bg-white/5 border-t border-slate-200 dark:border-white/10 flex justify-end gap-3 backdrop-blur-md">
                  <button 
                   type="button" 
                   onClick={() => setShowEventModal(false)}
                   className="px-8 py-3 bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 dark:text-slate-400 rounded-2xl font-black border border-slate-200 dark:border-white/10 transition-all active:scale-95"
                  >
                    Cancelar
                  </button>
                  <button 
                   type="button"
                   onClick={handleSaveEvent}
                   disabled={loading}
                   className="px-10 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-2xl font-black shadow-xl shadow-indigo-600/30 transition-all active:scale-95 flex items-center gap-2"
                  >
                    {loading && <RefreshCw className="w-4 h-4 animate-spin" />}
                    <span>{editingEvent ? 'Actualizar Console' : 'Lanzar al Aire'}</span>
                  </button>
               </div>
            </div>
         </div>,
        document.body
      )}

      {/* MODAL: ATTENDANCE */}
      {showAttendanceModal && attendanceEvent && typeof document !== 'undefined' && document.body && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-300">
           <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl" onClick={() => setShowAttendanceModal(false)} />
           <div className="relative w-full max-w-xl bg-white dark:bg-[#12141c] border border-slate-200 dark:border-white/10 rounded-[2.5rem] shadow-[0_32px_80px_rgba(0,0,0,0.4)] overflow-hidden">
               {/* --- MODAL HEADER --- */}
               <div className="p-8 pb-4 shrink-0 border-b border-slate-100 dark:border-white/5 bg-white dark:bg-[#12141c]">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                       <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
                         <CheckSquare className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                         Toma de Asistencia
                       </h2>
                       <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">
                         Evento: <span className="text-indigo-600 dark:text-indigo-300 font-black italic">{attendanceEvent.name}</span>
                       </p>
                    </div>
                    <button onClick={() => setShowAttendanceModal(false)} className="p-3 bg-slate-100 dark:bg-white/5 hover:bg-rose-500 hover:text-white rounded-2xl border border-slate-200 dark:border-white/10 transition-all text-slate-600 dark:text-slate-400 active:scale-95 shadow-sm">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  {isAttendanceLocked && (
                    <div className="mt-4 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center gap-3 text-amber-500 dark:text-amber-400">
                       <AlertCircle className="w-5 h-5 flex-shrink-0" />
                       <p className="text-[10px] font-black leading-tight uppercase tracking-widest">
                          Registro bloqueado por antigüedad (+24h).
                       </p>
                    </div>
                  )}
               </div>

               {/* --- MODAL BODY --- */}
               <div className="flex-1 overflow-y-auto no-scrollbar p-8 space-y-4 bg-slate-50/30 dark:bg-white/[0.01]">
                  {attendanceList.map((a, idx) => (
                    <div 
                     key={idx} 
                     onClick={() => {
                         if (isAttendanceLocked) return;
                         const newList = [...attendanceList];
                         newList[idx].attended = !newList[idx].attended;
                         setAttendanceList(newList);
                     }}
                     className={`
                       flex items-center justify-between p-5 rounded-3xl border transition-all duration-300 cursor-pointer group
                       ${a.attended 
                         ? 'bg-indigo-600/10 border-indigo-500/40 text-indigo-950 dark:text-white shadow-md' 
                         : 'bg-white dark:bg-white/[0.02] border-slate-200 dark:border-white/10 text-slate-400 opacity-60'
                       }
                     `}
                    >
                      <div className="flex flex-col">
                         <span className="text-sm font-black tracking-tight">{a.memberName}</span>
                         <span className="text-[9px] uppercase tracking-[0.2em] font-black opacity-50 mt-1">{a.roleName}</span>
                      </div>
                      <div className={`
                        w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-500 shadow-inner
                        ${a.attended ? 'bg-indigo-600 scale-110 rotate-0' : 'bg-slate-200 dark:bg-slate-800 scale-90 -rotate-12'}
                      `}>
                        {a.attended ? <Check className="w-5 h-5 text-white stroke-[3px]" /> : <X className="w-4 h-4 text-slate-500" />}
                      </div>
                    </div>
                  ))}
               </div>

               {/* --- MODAL FOOTER --- */}
               <div className="p-8 shrink-0 bg-white dark:bg-[#0a0c10] border-t border-slate-100 dark:border-white/10 flex justify-end gap-3 backdrop-blur-md">
                  <button onClick={() => setShowAttendanceModal(false)} className="px-8 py-3 text-slate-500 dark:text-slate-400 font-bold hover:text-indigo-600 transition-colors">Cancelar</button>
                  <button 
                   onClick={handleSaveAttendance} 
                   disabled={isAttendanceLocked || loading}
                   className="px-10 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded-2xl font-black shadow-xl shadow-indigo-600/30 transition-all active:scale-95"
                  >
                    {loading ? 'Sincronizando...' : 'Cerrar Acta'}
                  </button>
               </div>
              </div>
           </div> ,
        document.body
      )}

      {/* MODAL: AUTO-SUGGEST */}
      {showAutoSuggestModal && typeof document !== 'undefined' && document.body && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl" onClick={() => setShowAutoSuggestModal(false)} />
          <div className="relative w-full max-w-2xl bg-white dark:bg-[#12141c] border border-slate-200 dark:border-white/10 rounded-[2.5rem] shadow-[0_0_100px_rgba(99,102,241,0.15)] flex flex-col max-h-[92vh]">
            <div className="p-8 pb-4 border-b border-slate-100 dark:border-white/5 relative overflow-hidden">
               <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-transparent pointer-events-none" />
               <div className="relative z-10 flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
                      <Sparkles className="w-7 h-7 text-purple-600 dark:text-purple-400" />
                      Algoritmo de Programación
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mt-1">IA Inteligente para rotación ministerial justa</p>
                  </div>
                  <button onClick={() => setShowAutoSuggestModal(false)} className="p-3 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 rounded-2xl text-slate-600 dark:text-slate-400">
                    <X className="w-5 h-5" />
                  </button>
               </div>
            </div>

            <div className="p-8 flex-1 overflow-y-auto no-scrollbar space-y-8">
               
               <div className="space-y-4">
                  <span className="text-[10px] uppercase tracking-widest text-slate-500 font-black block px-1">1. Seleccionar Eventos a Programar</span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                     {safeEvents.filter(e => toArray(e.assignments).length === 0).map(e => (
                       <div 
                        key={e.id} 
                        onClick={() => handleToggleAutoEvent(e.id)}
                        className={`flex items-center gap-4 p-4 rounded-2xl border transition-all duration-300 cursor-pointer ${
                          autoSuggestData.selectedEvents.includes(e.id) 
                            ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-900 dark:text-white' 
                            : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-500'
                        }`}
                       >
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                            autoSuggestData.selectedEvents.includes(e.id) ? 'bg-indigo-500 shadow-lg shadow-indigo-600/30' : 'bg-slate-200 dark:bg-slate-800'
                          }`}>
                            {autoSuggestData.selectedEvents.includes(e.id) 
                              ? <Check className="w-5 h-5 text-white" /> 
                              : <CalendarIcon className="w-4 h-4 text-slate-500 dark:text-slate-600 opacity-60" />
                            }
                          </div>
                          <div className="flex flex-col min-w-0">
                             <span className="text-sm font-black truncate">{e.name}</span>
                             <span className="text-[10px] font-bold text-slate-500 opacity-60">{parseSafeDate(e.eventDate).toLocaleDateString()}</span>
                          </div>
                       </div>
                     ))}
                     {safeEvents.filter(e => toArray(e.assignments).length === 0).length === 0 && (
                       <p className="text-slate-500 text-sm italic col-span-2 py-6 text-center bg-slate-50 dark:bg-white/5 border border-dashed border-slate-300 dark:border-white/10 rounded-3xl">No hay eventos pendientes de personal</p>
                     )}
                  </div>
               </div>

               <div className="space-y-4">
                  <span className="text-[10px] uppercase tracking-widest text-slate-500 font-black block px-1">2. Requerimientos de Personal por Evento</span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 bg-slate-50 dark:bg-slate-900/40 p-6 rounded-3xl border border-slate-200 dark:border-white/5">
                     {safeRoles.filter(r => r.active).map(r => {
                       const visuals = getRoleVisuals(r.name);
                       return (
                         <div key={r.id} className="space-y-2 group">
                            <div className="flex items-center gap-2 px-1">
                               <visuals.icon className={`w-3.5 h-3.5 ${visuals.color}`} />
                               <label className="text-[11px] font-black text-slate-500 dark:text-slate-400 block truncate uppercase tracking-tighter">{visuals.name}</label>
                            </div>
                            <input 
                              type="number" min="0" value={autoSuggestData.requiredRoles[r.id]} 
                              onChange={(e) => handleRequirementChange(r.id, e.target.value)}
                              className="w-full bg-white dark:bg-[#0a0c10] border border-slate-200 dark:border-white/10 focus:border-purple-500 rounded-xl px-4 py-2.5 text-center text-sm font-black focus:outline-none transition-all appearance-none text-slate-900 dark:text-white group-hover:border-purple-500/30" 
                            />
                         </div>
                       );
                     })}
                  </div>
               </div>

            </div>

            <div className="p-8 bg-slate-50 dark:bg-white/5 border-t border-slate-100 dark:border-white/10 flex justify-end gap-3">
               <button onClick={() => setShowAutoSuggestModal(false)} className="px-6 py-3 text-slate-500 dark:text-slate-400 font-bold hover:text-indigo-600 transition-colors">Cancelar</button>
               <button 
                onClick={handleExecuteAutoSuggest} 
                disabled={loading || autoSuggestData.selectedEvents.length === 0}
                className="px-10 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-30 disabled:grayscale text-white rounded-2xl font-black shadow-xl shadow-indigo-600/20 active:scale-95 transition-all flex items-center gap-3"
               >
                 <Sparkles className="w-5 h-5 text-white animate-pulse" />
                 <span>Ejecutar Algoritmo Mágico</span>
               </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default WorshipScheduleTab;