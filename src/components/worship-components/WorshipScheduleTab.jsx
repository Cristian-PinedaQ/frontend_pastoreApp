import React, { useState, useEffect } from "react";
import apiService from "../../apiService";
import nameHelper from "../../services/nameHelper";
import { generateSingleEventAttendancePDF, generateWorshipRangeAttendancePDF } from "../../services/worshipPdfGenerator"; // Ajusta la ruta a donde guardaste el archivo

const { getDisplayName } = nameHelper;

// Helper para asegurar que siempre trabajamos con arrays
const toArray = (val) => (Array.isArray(val) ? val : []);

// Helper para extraer el setlist de forma segura
const getSetlist = (event) =>
  event.setlist?.length ? event.setlist : toArray(event.suggestedSongs);

// NUEVO HELPER: Parsea fechas evitando fallos en Safari/iOS y estandariza zonas horarias locales
const parseSafeDate = (dateVal) => {
  if (!dateVal) return new Date();
  if (Array.isArray(dateVal)) {
    // Si Spring Boot lo envía como array: [2026, 4, 12, 10, 30]
    const [y, m, d, h = 0, min = 0, s = 0] = dateVal;
    return new Date(y, m - 1, d, h, min, s);
  }
  // Si es string, aseguramos que tenga la 'T' para formato ISO
  const safeString = String(dateVal).replace(" ", "T");
  return new Date(safeString);
};

const WorshipScheduleTab = ({
  events = [],
  teamMembers = [],
  roles = [],
  songs = [],
  canManageWorship,
  theme,
  isDarkMode,
  loadData,
  showSuccess,
  showError,
  loading,
  setLoading,
}) => {
  // --- SEGURIDAD DE DATOS ---
  const safeEvents = toArray(events);
  const safeTeamMembers = toArray(teamMembers);
  const safeRoles = toArray(roles);
  const safeSongs = toArray(songs);

  // --- ESTADOS LOCALES ---
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
  // --- ESTADOS DE FILTROS ---
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL"); // ALL, PENDING, ACTIVE, COMPLETED
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // --- EFECTO: Inicializar Requerimientos ---
  useEffect(() => {
    if (showAutoSuggestModal) {
      const initialReqs = {};
      safeRoles
        .filter((r) => r.active)
        .forEach((r) => {
          initialReqs[r.id] = 0;
        });
      setAutoSuggestData((prev) => ({
        ...prev,
        selectedEvents: [],
        requiredRoles: initialReqs,
        praiseSongCount: 2,
        worshipSongCount: 2,
      }));
    }
  }, [showAutoSuggestModal, roles, safeRoles]);

  // ========== LÓGICA DE VOCALISTAS ==========
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

    if (singingToday.length > 0) {
       return singingToday.map(formatName).join(" & ");
    }
    return null; 
  };

  // ========== LÓGICA: VISTA Y COMPARTIR ==========
  const openViewModal = (event) => {
    setViewingEvent(event);
    setShowViewModal(true);
  };

  const handleShareEvent = async (event) => {
    const currentSetlist = getSetlist(event);
    const dateObj = parseSafeDate(event.eventDate); // Uso de parseo seguro
    
    let shareText = `⛪ *EVENTO: ${event.name}*\n`;
    shareText += `📅 Fecha: ${dateObj.toLocaleDateString()}\n`;
    shareText += `⏰ Hora: ${dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}\n\n`;
    
    shareText += `🎵 *SETLIST DE ADORACIÓN:*\n`;
    
    currentSetlist.forEach((s, idx) => {
      const emoji = s.type === 'ALABANZA' ? '🙌' : '🙇';
      const singer = getAssignedVocalists(s, event.assignments); 
      const singerText = singer ? ` (🎤 ${singer})` : '';
      
      shareText += `${idx + 1}. ${emoji} *${s.title}*${singerText}\n`;
      
      if (s.youtubeLink) {
        shareText += `   📺 YouTube: ${s.youtubeLink}\n`;
      }
      if (s.chordsLink) {
        shareText += `   🎸 Acordes: ${s.chordsLink}\n`;
      }
      shareText += `\n`;
    });

    shareText += `🚀 _Generado por PastoreApp_`;

    if (navigator.share) {
      try {
        await navigator.share({ title: event.name, text: shareText });
      } catch (err) { console.warn("Error compartiendo:", err); }
    } else {
      navigator.clipboard.writeText(shareText);
      showSuccess("📋 ¡Información del evento copiada al portapapeles!");
    }
  };

  // ========== LÓGICA: AUTO-PROGRAMAR ==========
  const handleToggleAutoEvent = (eventId) => {
    setAutoSuggestData((prev) => {
      const isSelected = prev.selectedEvents.includes(eventId);
      const newSelected = isSelected
        ? prev.selectedEvents.filter((id) => id !== eventId)
        : [...prev.selectedEvents, eventId];

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

      return {
        ...prev,
        selectedEvents: newSelected,
        praiseSongCount: newPraise,
        worshipSongCount: newWorship
      };
    });
  };

  const handleRequirementChange = (roleId, value) => {
    setAutoSuggestData((prev) => ({
      ...prev,
      requiredRoles: { ...prev.requiredRoles, [roleId]: parseInt(value) || 0 },
    }));
  };

  const handleExecuteAutoSuggest = async () => {
    if (autoSuggestData.selectedEvents.length === 0)
      return showError("Selecciona al menos un evento.");

    const cleanRequirements = {};
    Object.entries(autoSuggestData.requiredRoles).forEach(([roleId, qty]) => {
      if (qty > 0) cleanRequirements[roleId] = qty;
    });

    if (Object.keys(cleanRequirements).length === 0)
      return showError("Indica cuántos músicos necesitas.");

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
    } catch (err) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ========== LÓGICA: CRUD EVENTOS ==========
  const openEventModal = async (event = null) => {
    setEventModalTab("INFO");
    if (event) {
      setEditingEvent(event);
      const d = parseSafeDate(event.eventDate); // Uso de parseo seguro
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
      } catch (e) {
        console.warn("⚠️ Error al refrescar el setlist detallado:", e);
      }

    } else {
      setEditingEvent(null);
      setEventFormData({
        name: "",
        type: "CULTO_DOMINGO",
        date: "",
        description: "",
        praiseSongCount: 2,
        worshipSongCount: 2,
        assignments: [],
        songIds: [],
      });
      setShowEventModal(true);
    }
  };

  const handleSaveEvent = async (e) => {
    e.preventDefault();
    if (!eventFormData.name || !eventFormData.date)
      return showError("Nombre y fecha son obligatorios.");
    try {
      setLoading(true);
      const dateFormatted =
        eventFormData.date.length === 16
          ? `${eventFormData.date}:00`
          : eventFormData.date;
      let savedId = editingEvent?.id;

      if (editingEvent) {
        await apiService.updateWorshipEvent(
          savedId,
          eventFormData.name,
          eventFormData.type,
          dateFormatted,
          eventFormData.description,
          eventFormData.praiseSongCount,
          eventFormData.worshipSongCount,
        );
      } else {
        const res = await apiService.createWorshipEvent(
          eventFormData.name,
          eventFormData.type,
          dateFormatted,
          eventFormData.description,
          eventFormData.praiseSongCount,
          eventFormData.worshipSongCount,
        );
        savedId = res?.id || res?.eventId;
      }

      if (savedId) {
        const validAssignments = toArray(eventFormData.assignments)
          .filter((a) => a.roleId && a.memberId)
          .map((a) => ({
            roleId: parseInt(a.roleId),
            memberId: parseInt(a.memberId),
          }));

        await apiService.syncEventAssignments(savedId, validAssignments);
        
        const cleanSongIds = toArray(eventFormData.songIds)
          .filter(id => id !== "" && id !== null)
          .map(Number);

        await apiService.syncEventSetlist(savedId, cleanSongIds);
      }

      showSuccess("Evento guardado correctamente.");
      setShowEventModal(false);
      await loadData();
    } catch (err) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEvent = async (id) => {
    if (!window.confirm("⚠️ ¿Eliminar este culto?")) return;
    try {
      setLoading(true);
      await apiService.deleteWorshipEvent(id);
      showSuccess("Eliminado.");
      setShowEventModal(false);
      await loadData();
    } catch (err) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- LÓGICA DE FILTRADO ---
  const filteredEvents = safeEvents.filter((event) => {
    // Filtro por Nombre
    const matchName = event.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Filtro por Estado (Asume que tu backend ya devuelve event.status)
    const matchStatus = filterStatus === "ALL" || event.status === filterStatus;
    
    // Filtro por Fechas
    let matchDate = true;
    const evDate = parseSafeDate(event.eventDate);
    if (dateFrom) {
      matchDate = matchDate && evDate >= new Date(`${dateFrom}T00:00:00`);
    }
    if (dateTo) {
      matchDate = matchDate && evDate <= new Date(`${dateTo}T23:59:59`);
    }

    return matchName && matchStatus && matchDate;
  });

  // --- HANDLER PARA IMPRIMIR REPORTE FILTRADO ---
  const handlePrintRangePDF = () => {
    if (filteredEvents.length === 0) {
      return showError("No hay eventos en este rango para imprimir.");
    }
    const startStr = dateFrom ? dateFrom : "Inicio histórico";
    const endStr = dateTo ? dateTo : "Actualidad";
    generateWorshipRangeAttendancePDF(filteredEvents, startStr, endStr);
  };

  // ========== LÓGICA: ASISTENCIA (BLOQUEO 24H SEGURO) ==========
  const openAttendanceModal = (event) => {
    setAttendanceEvent(event);
    
    // 1. Verificamos si alguna asignación ya tiene un valor booleano en "attended"
    const hasBeenSavedBefore = toArray(event?.assignments).some(a => a.attended === true || a.attended === false);
    
    // 2. Calculamos las horas transcurridas usando getTime() para mayor precisión y evitar errores de zona horaria
    const eventDate = parseSafeDate(event.eventDate);
    const now = new Date();
    // Restamos los milisegundos absolutos y convertimos a horas
    const hoursSinceEvent = (now.getTime() - eventDate.getTime()) / (1000 * 60 * 60);

    // 3. Bloquear si ya se guardó Y pasaron más de 24 horas del evento
    const shouldLock = hasBeenSavedBefore && hoursSinceEvent > 24;
    setIsAttendanceLocked(shouldLock);

    setAttendanceList(
      toArray(event?.assignments).map((a) => ({
        assignmentId: a.id,
        memberName: a.worshipTeamMember?.leader?.member?.name || "Músico",
        roleName: a.assignedRole?.name || "Instrumento",
        attended: a.attended === null || a.attended === undefined ? true : a.attended,
      })),
    );
    setShowAttendanceModal(true);
  };

  const handleSaveAttendance = async () => {
    if (isAttendanceLocked) return;

    try {
      setLoading(true);
      const payload = attendanceList.map((a) => ({
        assignmentId: a.assignmentId,
        attended: a.attended,
      }));
      await apiService.recordWorshipAttendance(attendanceEvent.id, payload);
      showSuccess("Asistencia guardada.");
      setShowAttendanceModal(false);
      await loadData();
    } catch (err) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* HEADER ACTIONS Y FILTROS */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "1.5rem" }}>
        
        {/* Botones Principales */}
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: "1rem" }}>
            {canManageWorship && (
              <>
                <button
                  onClick={() => openEventModal()}
                  style={{ padding: "0.6rem 1.5rem", borderRadius: "6px", backgroundColor: theme.primary, color: "white", border: "none", fontWeight: "bold", cursor: "pointer" }}
                >
                  ➕ Nuevo Evento
                </button>
                <button
                  onClick={() => setShowAutoSuggestModal(true)}
                  style={{ padding: "0.6rem 1.5rem", borderRadius: "6px", backgroundColor: "#8b5cf6", color: "white", border: "none", fontWeight: "bold", cursor: "pointer" }}
                >
                  ✨ Auto-Programar
                </button>
              </>
            )}
          </div>
          
          <button
            onClick={handlePrintRangePDF}
            style={{ padding: "0.6rem 1.5rem", borderRadius: "6px", backgroundColor: "#1e293b", color: "white", border: "none", fontWeight: "bold", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}
          >
            📄 Reporte Asistencia ({filteredEvents.length})
          </button>
        </div>

        {/* Barra de Filtros */}
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", backgroundColor: theme.bgSecondary, padding: "1rem", borderRadius: "8px", border: `1px solid ${theme.border}` }}>
          <input
            type="text"
            placeholder="🔍 Buscar por nombre..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ flex: "1 1 200px", padding: "0.6rem", borderRadius: "6px", border: `1px solid ${theme.border}`, background: theme.bg, color: theme.text }}
          />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{ flex: "1 1 150px", padding: "0.6rem", borderRadius: "6px", border: `1px solid ${theme.border}`, background: theme.bg, color: theme.text }}
          >
            <option value="ALL">Todos los Estados</option>
            <option value="PENDING">⏳ Pendiente</option>
            <option value="ACTIVE">▶️ En Curso (Activo)</option>
            <option value="COMPLETED">✅ Completado</option>
          </select>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flex: "1 1 300px" }}>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              style={{ flex: 1, padding: "0.6rem", borderRadius: "6px", border: `1px solid ${theme.border}`, background: theme.bg, color: theme.text }}
            />
            <span style={{ color: theme.textSecondary }}>a</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              style={{ flex: 1, padding: "0.6rem", borderRadius: "6px", border: `1px solid ${theme.border}`, background: theme.bg, color: theme.text }}
            />
          </div>
        </div>
      </div>

      {/* GRID DE EVENTOS */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
          gap: "1.5rem",
        }}
      >
        {safeEvents.length === 0 ? (
          <div
            style={{
              gridColumn: "1 / -1",
              textAlign: "center",
              padding: "3rem",
              color: theme.textSecondary,
              backgroundColor: theme.bgSecondary,
              borderRadius: "12px",
            }}
          >
            <h3>No hay eventos programados</h3>
          </div>
        ) : (
          filteredEvents.map((event) => {
            const dateObj = parseSafeDate(event.eventDate);
            const isFuture = dateObj.getTime() > new Date().getTime();
            const currentSetlist = getSetlist(event);
            
            // Helper interno para el color del estado
            const statusConfig = {
              PENDING: { color: "#f59e0b", label: "⏳ Pendiente" },
              ACTIVE: { color: "#10b981", label: "▶️ En Curso" },
              COMPLETED: { color: "#3b82f6", label: "✅ Completado" }
            };
            const currentStatus = statusConfig[event.status] || statusConfig.PENDING;

            return (
              <div
                key={event.id}
                onClick={() => openViewModal(event)}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  backgroundColor: theme.bgSecondary,
                  border: `1px solid ${theme.border}`,
                  borderRadius: "12px",
                  overflow: "hidden",
                  cursor: "pointer",
                  transition: "transform 0.2s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.02)")}
                onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
              >
                <div
                  style={{
                    padding: "1.25rem",
                    borderBottom: `1px solid ${theme.border}`,
                    backgroundColor: isDarkMode ? "#1e293b" : "#f8fafc",
                    position: "relative",
                  }}
                >
                  <h3 style={{ margin: 0, color: theme.text }}>{event.name}</h3>
                  <div style={{ fontSize: "0.9rem", color: theme.textSecondary }}>
                    📅 {dateObj.toLocaleString()}
                  </div>
                  
                  {/* NUEVO: Etiqueta de Estado */}
                  <div style={{ display: "inline-block", marginTop: "8px", padding: "2px 8px", borderRadius: "12px", fontSize: "0.75rem", fontWeight: "bold", backgroundColor: `${currentStatus.color}22`, color: currentStatus.color }}>
                    {currentStatus.label}
                  </div>
                  <div
                    style={{
                      fontSize: "0.75rem",
                      marginTop: "4px",
                      color: theme.primary,
                    }}
                  >
                    🎵 Meta: 🙌 {event.praiseSongCount || 0} Alabanzas | 🙇 {event.worshipSongCount || 0} Adoración
                  </div>

                  {canManageWorship && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteEvent(event.id);
                      }}
                      style={{
                        position: "absolute",
                        top: "10px",
                        right: "10px",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        fontSize: "1.1rem",
                        opacity: 0.6,
                      }}
                      title="Eliminar evento"
                    >
                      🗑️
                    </button>
                  )}
                </div>
                <div style={{ padding: "1.25rem", flexGrow: 1 }}>
                  <strong>Equipo ({toArray(event.assignments).length})</strong>
                  {toArray(event.assignments)
                    .slice(0, 3)
                    .map((a, idx) => (
                      <div key={idx} style={{ fontSize: "0.85rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        • {a.worshipTeamMember?.leader?.member?.name} (
                        {a.assignedRole?.name})
                      </div>
                    ))}
                  <div style={{ marginTop: "0.5rem" }}>
                    <strong>Setlist ({currentSetlist.length})</strong>
                    {currentSetlist
                      .slice(0, 3)
                      .map((s, idx) => {
                        const singer = getAssignedVocalists(s, event.assignments);
                        return (
                          <div key={idx} style={{ fontSize: "0.85rem", color: s.type === 'ALABANZA' ? '#eab308' : '#8b5cf6', whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {s.type === 'ALABANZA' ? '🙌' : '🙇'} {s.title}
                            {singer && <span style={{ color: theme.textSecondary, fontWeight: "500", marginLeft: "4px" }}>(🎤 {singer})</span>}
                          </div>
                        );
                      })}
                  </div>
                </div>
                {canManageWorship && (
                  <div
                    style={{
                      padding: "1rem",
                      borderTop: `1px solid ${theme.border}`,
                      display: "flex",
                      gap: "0.5rem",
                    }}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openEventModal(event);
                      }}
                      style={{
                        flex: 1,
                        padding: "0.5rem",
                        borderRadius: "6px",
                        cursor: "pointer",
                      }}
                    >
                      ✏️ Editar
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openAttendanceModal(event);
                      }}
                      disabled={isFuture}
                      style={{
                        flex: 1,
                        padding: "0.5rem",
                        borderRadius: "6px",
                        cursor: isFuture ? "not-allowed" : "pointer",
                        opacity: isFuture ? 0.5 : 1,
                      }}
                    >
                      📋 Asistencia
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* MODAL: VISTA COMPLETA Y COMPARTIR */}
      {showViewModal && viewingEvent && (
        <div
          style={{
            position: "fixed", inset: 0, display: "flex", alignItems: "center",
            justifyContent: "center", zIndex: 1100, backgroundColor: "rgba(0,0,0,0.7)",
            padding: "1rem"
          }}
          onClick={() => setShowViewModal(false)}
        >
          <div
            style={{
              backgroundColor: theme.bgSecondary, borderRadius: "16px",
              width: "100%", maxWidth: "550px", maxHeight: "85vh", overflowY: "auto",
              position: "relative", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.3)"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: "1.5rem", borderBottom: `1px solid ${theme.border}`, position: 'sticky', top: 0, background: theme.bgSecondary, zIndex: 1 }}>
              <button 
                onClick={() => setShowViewModal(false)}
                style={{ position: 'absolute', right: '1rem', top: '1rem', background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: theme.textSecondary }}
              >✕</button>
              <h2 style={{ color: theme.text, margin: 0 }}>{viewingEvent.name}</h2>
              <p style={{ color: theme.primary, margin: "5px 0 0 0" }}>📅 {parseSafeDate(viewingEvent.eventDate).toLocaleString()}</p>
            </div>

            <div style={{ padding: "1.5rem" }}>
              <h4 style={{ color: theme.text, borderBottom: `1px solid ${theme.border}`, paddingBottom: "5px" }}>👥 Equipo de Alabanza</h4>
              <div style={{ display: "grid", gap: "0.5rem", marginBottom: "1.5rem" }}>
                {toArray(viewingEvent.assignments).map((a, idx) => (
                  <div key={idx} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.95rem", color: theme.text }}>
                    <span><strong>{a.assignedRole?.name}:</strong></span>
                    <span>{a.worshipTeamMember?.leader?.member?.name}</span>
                  </div>
                ))}
              </div>

              <h4 style={{ color: theme.text, borderBottom: `1px solid ${theme.border}`, paddingBottom: "5px" }}>🎵 Setlist Detallado</h4>
              <div style={{ display: "grid", gap: "1rem" }}>
                {getSetlist(viewingEvent).map((song, idx) => {
                  const singer = getAssignedVocalists(song, viewingEvent.assignments);
                  
                  return (
                  <div key={idx} style={{ 
                    padding: "12px", 
                    borderRadius: "8px", 
                    backgroundColor: theme.bg, 
                    border: `1px solid ${theme.border}`,
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px"
                  }}>
                    <div style={{ fontWeight: "bold", color: theme.text, fontSize: "1rem" }}>
                      {song.type === 'ALABANZA' ? '🙌' : '🙇'} {song.title}
                      {singer && (
                        <span style={{ fontWeight: "normal", color: theme.primary, marginLeft: "8px", display: "inline-block", backgroundColor: theme.bgSecondary, padding: "2px 8px", borderRadius: "12px", fontSize: "0.85rem", border: `1px solid ${theme.border}` }}>
                          🎤 Canta: {singer}
                        </span>
                      )}
                    </div>
                    
                    <div style={{ display: "flex", gap: "15px", flexWrap: "wrap" }}>
                      {song.youtubeLink ? (
                        <a 
                          href={song.youtubeLink} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          style={{ 
                            fontSize: "0.85rem", 
                            color: "#ff0000", 
                            textDecoration: "none", 
                            display: "flex", 
                            alignItems: "center", 
                            gap: "4px",
                            fontWeight: "600"
                          }}
                        >
                          📺 Ver en YouTube
                        </a>
                      ) : (
                        <span style={{ fontSize: "0.85rem", color: theme.textSecondary, opacity: 0.5 }}>🚫 Sin Video</span>
                      )}

                      {song.chordsLink && (
                        <a 
                          href={song.chordsLink} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          style={{ 
                            fontSize: "0.85rem", 
                            color: theme.primary, 
                            textDecoration: "none", 
                            display: "flex", 
                            alignItems: "center", 
                            gap: "4px",
                            fontWeight: "600"
                          }}
                        >
                          🎸 Ver Acordes
                        </a>
                      )}
                    </div>
                  </div>
                )})}
              </div>

              <button
                onClick={() => handleShareEvent(viewingEvent)}
                style={{
                  width: "100%", marginTop: "2rem", padding: "1rem", borderRadius: "8px",
                  backgroundColor: "#3c0f84", color: "white", border: "none",
                  fontWeight: "bold", cursor: "pointer", display: "flex", justifyContent: "center", alignItems: "center", gap: "10px"
                }}
              >
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  width="22" 
                  height="22" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                >
                  <line x1="22" y1="2" x2="11" y2="13"></line>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                </svg>
                Compartir Setlist
              </button>
              <button
                onClick={() => generateSingleEventAttendancePDF(viewingEvent)}
                style={{
                  width: "100%", marginTop: "1rem", padding: "1rem", borderRadius: "8px",
                  backgroundColor: theme.primary, color: "white", border: "none",
                  fontWeight: "bold", cursor: "pointer", display: "flex", justifyContent: "center", alignItems: "center", gap: "10px"
                }}
              >
                📄 Descargar Asistencia PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: AUTO-PROGRAMAR */}
      {showAutoSuggestModal && (
        <div
          className="leaders-page__modal-overlay"
          style={{
            position: "fixed",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            backgroundColor: "rgba(0,0,0,0.6)",
          }}
        >
          <div
            className="leaders-page__modal"
            style={{
              backgroundColor: theme.bgSecondary,
              padding: "2rem",
              borderRadius: "12px",
              width: "95%",
              maxWidth: "600px",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            <h2
              style={{ color: theme.text, textAlign: "center", marginTop: 0 }}
            >
              ✨ Auto-Programar Equipo
            </h2>

            <div
              style={{
                marginBottom: "1.5rem",
                padding: "1rem",
                backgroundColor: theme.bg,
                borderRadius: "8px",
                border: `1px solid ${theme.border}`,
                display: 'flex',
                justifyContent: 'space-between',
                gap: '1rem'
              }}
            >
              <label style={{ display: "flex", flexDirection: "column", gap: "0.3rem", color: theme.text, flex: 1 }}>
                <span style={{ fontSize: '0.85rem' }}>🙌 Alabanzas por culto:</span>
                <input
                  type="number"
                  min="0"
                  value={autoSuggestData.praiseSongCount}
                  onChange={(e) =>
                    setAutoSuggestData({
                      ...autoSuggestData,
                      praiseSongCount: parseInt(e.target.value) || 0,
                    })
                  }
                  style={{ padding: "8px", borderRadius: "4px", border: `1px solid ${theme.border}`, background: theme.bgSecondary, color: theme.text }}
                />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: "0.3rem", color: theme.text, flex: 1 }}>
                <span style={{ fontSize: '0.85rem' }}>🙇 Adoración por culto:</span>
                <input
                  type="number"
                  min="0"
                  value={autoSuggestData.worshipSongCount}
                  onChange={(e) =>
                    setAutoSuggestData({
                      ...autoSuggestData,
                      worshipSongCount: parseInt(e.target.value) || 0,
                    })
                  }
                  style={{ padding: "8px", borderRadius: "4px", border: `1px solid ${theme.border}`, background: theme.bgSecondary, color: theme.text }}
                />
              </label>
            </div>

            <h4 style={{ color: theme.primary, marginBottom: "0.5rem" }}>
              1. Eventos vacíos detectados:
            </h4>
            <div
              style={{
                backgroundColor: theme.bg,
                padding: "1rem",
                borderRadius: "8px",
                border: `1px solid ${theme.border}`,
                marginBottom: "1.5rem",
                maxHeight: "150px",
                overflowY: "auto",
              }}
            >
              {safeEvents.filter((e) => toArray(e.assignments).length === 0)
                .length === 0 ? (
                <p style={{ fontSize: "0.9rem", color: theme.textSecondary }}>
                  No hay eventos sin músicos.
                </p>
              ) : (
                safeEvents
                  .filter((e) => toArray(e.assignments).length === 0)
                  .map((e) => (
                    <label
                      key={e.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        padding: "0.3rem 0",
                        color: theme.text,
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={autoSuggestData.selectedEvents.includes(e.id)}
                        onChange={() => handleToggleAutoEvent(e.id)}
                      />
                      {e.name} (Meta: 🙌 {e.praiseSongCount} | 🙇 {e.worshipSongCount})
                    </label>
                  ))
              )}
            </div>

            <h4 style={{ color: "#8b5cf6", marginBottom: "0.5rem" }}>
              2. Personal requerido por evento:
            </h4>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "0.5rem",
                marginBottom: "1.5rem",
              }}
            >
              {safeRoles
                .filter((r) => r.active)
                .map((role) => (
                  <div
                    key={role.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      backgroundColor: theme.bg,
                      padding: "0.5rem",
                      borderRadius: "6px",
                      border: `1px solid ${theme.border}`,
                    }}
                  >
                    <span style={{ fontSize: "1rem", color: theme.text }}>
                      {role.name}
                    </span>
                    <input
                      type="number"
                      min="0"
                      value={autoSuggestData.requiredRoles[role.id] || 0}
                      onChange={(e) =>
                        handleRequirementChange(role.id, e.target.value)
                      }
                      style={{
                        width: "35%",
                        textAlign: "center",
                        borderRadius: "4px",
                        border: `1px solid ${theme.border}`,
                        background: theme.bgSecondary,
                        color: theme.text,
                      }}
                    />
                  </div>
                ))}
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "1rem",
              }}
            >
              <button
                onClick={() => setShowAutoSuggestModal(false)}
                style={{
                  padding: "0.6rem 1.5rem",
                  borderRadius: "6px",
                  cursor: "pointer",
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleExecuteAutoSuggest}
                disabled={
                  loading || autoSuggestData.selectedEvents.length === 0
                }
                style={{
                  padding: "0.6rem 1.5rem",
                  borderRadius: "6px",
                  backgroundColor: theme.primary,
                  color: "white",
                  border: "none",
                  fontWeight: "bold",
                  cursor: "pointer",
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? "Procesando..." : "Ejecutar Algoritmo"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EDITAR EVENTO (TABS) */}
      {showEventModal && (
        <div
          className="leaders-page__modal-overlay"
          style={{
            position: "fixed",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            backgroundColor: "rgba(0,0,0,0.6)",
          }}
        >
          <div
            className="leaders-page__modal"
            style={{
              backgroundColor: theme.bgSecondary,
              borderRadius: "12px",
              width: "95%",
              maxWidth: "600px",
              maxHeight: "90vh",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                padding: "1.5rem",
                borderBottom: `1px solid ${theme.border}`,
              }}
            >
              <h2 style={{ color: theme.text, margin: 0 }}>
                {editingEvent ? "Editar Culto" : "Nuevo Culto"}
              </h2>
              <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
                {["INFO", "TEAM", "SETLIST"].map((t) => (
                  <button
                    key={t}
                    onClick={() => setEventModalTab(t)}
                    style={{
                      background: "none",
                      border: "none",
                      padding: "0.5rem",
                      color:
                        eventModalTab === t
                          ? theme.primary
                          : theme.textSecondary,
                      borderBottom:
                        eventModalTab === t
                          ? `2px solid ${theme.primary}`
                          : "none",
                      cursor: "pointer",
                      fontWeight: "bold",
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ padding: "1.5rem", overflowY: "auto", flexGrow: 1 }}>
              {eventModalTab === "INFO" && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "1rem",
                  }}
                >
                  <input
                    type="text"
                    placeholder="Nombre"
                    value={eventFormData.name}
                    onChange={(e) =>
                      setEventFormData({
                        ...eventFormData,
                        name: e.target.value,
                      })
                    }
                    style={{
                      padding: "0.7rem",
                      borderRadius: "6px",
                      border: `1px solid ${theme.border}`,
                      background: theme.bg,
                      color: theme.text,
                    }}
                  />
                  <div style={{ display: "flex", gap: "1rem" }}>
                    <input
                      type="datetime-local"
                      value={eventFormData.date}
                      onChange={(e) =>
                        setEventFormData({
                          ...eventFormData,
                          date: e.target.value,
                        })
                      }
                      style={{
                        flex: 1,
                        padding: "0.7rem",
                        borderRadius: "6px",
                        border: `1px solid ${theme.border}`,
                        background: theme.bg,
                        color: theme.text,
                      }}
                    />
                  </div>

                  <div style={{ display: "flex", gap: "1rem" }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: "0.8rem", color: theme.textSecondary, display: "block", marginBottom: "4px" }}>
                        🙌 Cant. Alabanzas
                      </label>
                      <input
                        type="number"
                        value={eventFormData.praiseSongCount}
                        onChange={(e) =>
                          setEventFormData({
                            ...eventFormData,
                            praiseSongCount: parseInt(e.target.value) || 0,
                          })
                        }
                        style={{
                          width: "100%", padding: "0.7rem", borderRadius: "6px", border: `1px solid ${theme.border}`, background: theme.bg, color: theme.text, boxSizing: "border-box"
                        }}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: "0.8rem", color: theme.textSecondary, display: "block", marginBottom: "4px" }}>
                        🙇 Cant. Adoración
                      </label>
                      <input
                        type="number"
                        value={eventFormData.worshipSongCount}
                        onChange={(e) =>
                          setEventFormData({
                            ...eventFormData,
                            worshipSongCount: parseInt(e.target.value) || 0,
                          })
                        }
                        style={{
                          width: "100%", padding: "0.7rem", borderRadius: "6px", border: `1px solid ${theme.border}`, background: theme.bg, color: theme.text, boxSizing: "border-box"
                        }}
                      />
                    </div>
                  </div>

                  <textarea
                    placeholder="Descripción"
                    value={eventFormData.description}
                    onChange={(e) =>
                      setEventFormData({
                        ...eventFormData,
                        description: e.target.value,
                      })
                    }
                    rows={3}
                    style={{
                      padding: "0.7rem",
                      borderRadius: "6px",
                      border: `1px solid ${theme.border}`,
                      background: theme.bg,
                      color: theme.text,
                    }}
                  />
                </div>
              )}

              {eventModalTab === "TEAM" && (
                <div>
                  {eventFormData.assignments.map((a, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        gap: "0.5rem",
                        marginBottom: "0.5rem",
                      }}
                    >
                      <select
                        value={a.roleId}
                        onChange={(e) => {
                          const upd = [...eventFormData.assignments];
                          upd[i] = {
                            ...upd[i],
                            roleId: e.target.value,
                            memberId: "",
                          };
                          setEventFormData({
                            ...eventFormData,
                            assignments: upd,
                          });
                        }}
                        style={{
                          flex: 1,
                          padding: "0.5rem",
                          background: theme.bg,
                          color: theme.text,
                          border: `1px solid ${theme.border}`,
                        }}
                      >
                        <option value="">Instrumento</option>
                        {safeRoles
                          .filter((r) => r.active)
                          .map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.name}
                            </option>
                          ))}
                      </select>
                      <select
                        value={a.memberId}
                        onChange={(e) => {
                          const upd = [...eventFormData.assignments];
                          upd[i] = { ...upd[i], memberId: e.target.value };
                          setEventFormData({
                            ...eventFormData,
                            assignments: upd,
                          });
                        }}
                        style={{
                          flex: 1,
                          padding: "0.5rem",
                          background: theme.bg,
                          color: theme.text,
                          border: `1px solid ${theme.border}`,
                        }}
                      >
                        <option value="">Músico</option>
                        {safeTeamMembers
                          .filter(
                            (m) =>
                              m.primaryRole?.id?.toString() === a.roleId ||
                              toArray(m.skills).some(
                                (s) => s.id?.toString() === a.roleId,
                              ),
                          )
                          .map((m) => (
                            <option key={m.id} value={m.id}>
                              {getDisplayName(m.memberName)}
                            </option>
                          ))}
                      </select>
                      <button
                        onClick={() => {
                          const upd = [...eventFormData.assignments];
                          upd.splice(i, 1);
                          setEventFormData({
                            ...eventFormData,
                            assignments: upd,
                          });
                        }}
                        style={{ padding: "0.5rem" }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() =>
                      setEventFormData({
                        ...eventFormData,
                        assignments: [
                          ...eventFormData.assignments,
                          { roleId: "", memberId: "" },
                        ],
                      })
                    }
                    style={{ width: "100%", padding: "0.5rem" }}
                  >
                    + Añadir Músico
                  </button>
                </div>
              )}

              {eventModalTab === "SETLIST" && (
                <div>
                  {eventFormData.songIds.map((id, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        gap: "0.5rem",
                        marginBottom: "0.5rem",
                      }}
                    >
                      <select
                        value={id}
                        onChange={(e) => {
                          const upd = [...eventFormData.songIds];
                          upd[i] = e.target.value;
                          setEventFormData({ ...eventFormData, songIds: upd });
                        }}
                        style={{
                          flex: 1,
                          padding: "0.5rem",
                          background: theme.bg,
                          color: theme.text,
                          border: `1px solid ${theme.border}`,
                        }}
                      >
                        <option value="">Canción</option>
                        {safeSongs.map((s) => (
                          <option key={s.id} value={String(s.id)}>
                            {s.type === 'ALABANZA' ? '🙌' : '🙇'} {s.title}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => {
                          const upd = [...eventFormData.songIds];
                          upd.splice(i, 1);
                          setEventFormData({ ...eventFormData, songIds: upd });
                        }}
                        style={{ padding: "0.5rem" }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() =>
                      setEventFormData({
                        ...eventFormData,
                        songIds: [...eventFormData.songIds, ""],
                      })
                    }
                    style={{ width: "100%", padding: "0.5rem" }}
                  >
                    + Añadir Canción
                  </button>
                </div>
              )}
            </div>

            <div
              style={{
                padding: "1.5rem",
                borderTop: `1px solid ${theme.border}`,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                {editingEvent && (
                  <button
                    onClick={() => handleDeleteEvent(editingEvent.id)}
                    style={{
                      color: "#ef4444",
                      background: "none",
                      border: "1px solid #ef4444",
                      padding: "0.4rem 0.8rem",
                      borderRadius: "6px",
                      fontWeight: "bold",
                      cursor: "pointer",
                    }}
                  >
                    🗑️ Eliminar Culto
                  </button>
                )}
              </div>
              <div style={{ display: "flex", gap: "1rem" }}>
                <button
                  onClick={() => setShowEventModal(false)}
                  style={{
                    padding: "0.5rem 1rem",
                    borderRadius: "6px",
                    cursor: "pointer",
                  }}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveEvent}
                  disabled={loading}
                  style={{
                    background: theme.primary,
                    color: "white",
                    padding: "0.5rem 1.5rem",
                    borderRadius: "6px",
                    border: "none",
                    fontWeight: "bold",
                    cursor: "pointer",
                  }}
                >
                  {loading ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ASISTENCIA */}
      {showAttendanceModal && (
        <div
          className="leaders-page__modal-overlay"
          style={{
            position: "fixed",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            backgroundColor: "rgba(0,0,0,0.6)",
          }}
        >
          <div
            className="leaders-page__modal"
            style={{
              backgroundColor: theme.bgSecondary,
              padding: "1.5rem",
              borderRadius: "12px",
              width: "90%",
              maxWidth: "500px",
            }}
          >
            <h2 style={{ color: theme.text, marginTop: 0 }}>📋 Asistencia</h2>
            
            {/* Mensaje de Bloqueo */}
            {isAttendanceLocked && (
              <div style={{ backgroundColor: "#fee2e2", color: "#b91c1c", padding: "0.8rem", borderRadius: "6px", marginBottom: "1rem", fontSize: "0.9rem" }}>
                ⚠️ Han pasado más de 24 horas desde el evento. La asistencia ya no se puede modificar.
              </div>
            )}

            <div style={{ maxHeight: "300px", overflowY: "auto", opacity: isAttendanceLocked ? 0.7 : 1 }}>
              {attendanceList.map((a, i) => (
                <div
                  key={i}
                  onClick={() => {
                    if (isAttendanceLocked) return; // Bloquear clic
                    const upd = [...attendanceList];
                    upd[i].attended = !upd[i].attended;
                    setAttendanceList(upd);
                  }}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "0.8rem",
                    borderBottom: `1px solid ${theme.border}`,
                    cursor: isAttendanceLocked ? "not-allowed" : "pointer", // Cursor bloqueado
                    background: a.attended
                      ? isDarkMode
                        ? "#14532d20"
                        : "#ecfdf5"
                      : "transparent",
                  }}
                >
                  <div style={{ color: theme.text }}>
                    <strong>{a.memberName}</strong>
                    <br />
                    <small>{a.roleName}</small>
                  </div>
                  <span>{a.attended ? "✅" : "❌"}</span>
                </div>
              ))}
            </div>
            <div
              style={{
                marginTop: "1.5rem",
                display: "flex",
                justifyContent: "flex-end",
                gap: "1rem",
              }}
            >
              <button
                onClick={() => setShowAttendanceModal(false)}
                style={{
                  padding: "0.5rem 1rem",
                  borderRadius: "6px",
                  cursor: "pointer",
                }}
              >
                {isAttendanceLocked ? "Cerrar" : "Cancelar"}
              </button>
              {!isAttendanceLocked && (
                <button
                  onClick={handleSaveAttendance}
                  disabled={loading}
                  style={{
                    background: theme.primary,
                    color: "white",
                    padding: "0.5rem 1.5rem",
                    borderRadius: "6px",
                    border: "none",
                    fontWeight: "bold",
                    cursor: "pointer",
                  }}
                >
                  {loading ? "Guardando..." : "Guardar"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default WorshipScheduleTab;