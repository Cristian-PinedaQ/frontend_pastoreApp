import React, { useState, useEffect } from "react";
import apiService from "../../apiService";
import nameHelper from "../../services/nameHelper";

const { getDisplayName } = nameHelper;

// Helper para asegurar que siempre trabajamos con arrays
const toArray = (val) => (Array.isArray(val) ? val : []);

// Agrega esto junto a los otros helpers de array (línea ~10)
const getSetlist = (event) =>
  event.setlist?.length ? event.setlist : toArray(event.suggestedSongs);

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
    songCount: 4, // Meta de canciones por defecto
    assignments: [],
    songIds: [],
  });

  const [showAutoSuggestModal, setShowAutoSuggestModal] = useState(false);
  const [autoSuggestData, setAutoSuggestData] = useState({
    selectedEvents: [],
    requiredRoles: {}, // { roleId: cantidad }
    songCount: 4, // Meta para el algoritmo
  });

  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [attendanceEvent, setAttendanceEvent] = useState(null);
  const [attendanceList, setAttendanceList] = useState([]);

  // --- EFECTO: Inicializar Requerimientos de Auto-Programación ---
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
        songCount: 4,
      }));
    }
  }, [showAutoSuggestModal, roles, safeRoles]);

  // ========== LÓGICA: AUTO-PROGRAMAR ==========
  const handleToggleAutoEvent = (eventId) => {
    setAutoSuggestData((prev) => {
      const isSelected = prev.selectedEvents.includes(eventId);
      const newSelected = isSelected
        ? prev.selectedEvents.filter((id) => id !== eventId)
        : [...prev.selectedEvents, eventId];

      // LOGICA DE VALOR REAL: 
      // Si estamos seleccionando el primer evento, tomamos su songCount real de la BD
      let newSongCount = prev.songCount;
      if (!isSelected && newSelected.length === 1) {
        const firstEvent = safeEvents.find(e => e.id === eventId);
        newSongCount = firstEvent?.songCount || 0;
      } 
      // Si deseleccionamos todo, volvemos al default
      else if (newSelected.length === 0) {
        newSongCount = 4;
      }

      return {
        ...prev,
        selectedEvents: newSelected,
        songCount: newSongCount
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
        songCount: autoSuggestData.songCount, // Integrado
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
      const d = new Date(event.eventDate);
      const pad = (n) => String(n).padStart(2, "0");
      const dateLocal = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

      const initialSongs = getSetlist(event);
      const initialSongIds = initialSongs.map(s => String(s.id));

      setEventFormData({
        name: event.name || "",
        type: event.eventType || "CULTO_DOMINGO",
        date: dateLocal,
        description: event.description || "",
        songCount: event.songCount || 0,
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
        songCount: 4,
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
          eventFormData.songCount,
        );
      } else {
        const res = await apiService.createWorshipEvent(
          eventFormData.name,
          eventFormData.type,
          dateFormatted,
          eventFormData.description,
          eventFormData.songCount,
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
        
        // CORRECCIÓN: Filtrar IDs vacíos antes de enviar al backend
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

  // ========== LÓGICA: ASISTENCIA ==========
  const openAttendanceModal = (event) => {
    setAttendanceEvent(event);
    setAttendanceList(
      toArray(event?.assignments).map((a) => ({
        assignmentId: a.id,
        memberName: a.worshipTeamMember?.leader?.member?.name || "Músico",
        roleName: a.assignedRole?.name || "Instrumento",
        attended: a.attended !== false,
      })),
    );
    setShowAttendanceModal(true);
  };

  const handleSaveAttendance = async () => {
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
      {/* HEADER ACTIONS */}
      <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem" }}>
        {canManageWorship && (
          <>
            <button
              onClick={() => openEventModal()}
              style={{
                padding: "0.6rem 1.5rem",
                borderRadius: "6px",
                backgroundColor: theme.primary,
                color: "white",
                border: "none",
                fontWeight: "bold",
                cursor: "pointer",
              }}
            >
              ➕ Nuevo Evento
            </button>
            <button
              onClick={() => setShowAutoSuggestModal(true)}
              style={{
                padding: "0.6rem 1.5rem",
                borderRadius: "6px",
                backgroundColor: "#8b5cf6",
                color: "white",
                border: "none",
                fontWeight: "bold",
                cursor: "pointer",
              }}
            >
              ✨ Auto-Programar
            </button>
          </>
        )}
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
          safeEvents.map((event) => {
            const dateObj = new Date(event.eventDate);
            const isFuture = dateObj > new Date();
            const currentSetlist = getSetlist(event);
            return (
              <div
                key={event.id}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  backgroundColor: theme.bgSecondary,
                  border: `1px solid ${theme.border}`,
                  borderRadius: "12px",
                  overflow: "hidden",
                }}
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
                  <div
                    style={{ fontSize: "0.9rem", color: theme.textSecondary }}
                  >
                    📅 {dateObj.toLocaleString()}
                  </div>
                  <div
                    style={{
                      fontSize: "0.75rem",
                      marginTop: "4px",
                      color: theme.primary,
                    }}
                  >
                    🎵 Meta: {event.songCount || 0} canciones
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
                      <div key={idx} style={{ fontSize: "0.85rem" }}>
                        • {a.worshipTeamMember?.leader?.member?.name} (
                        {a.assignedRole?.name})
                      </div>
                    ))}
                  <div style={{ marginTop: "0.5rem" }}>
                    <strong>Setlist ({currentSetlist.length})</strong>
                    {currentSetlist
                      .slice(0, 3)
                      .map((s, idx) => (
                        <div key={idx} style={{ fontSize: "0.85rem" }}>
                          🎵 {s.title}
                        </div>
                      ))}
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
                      onClick={() => openEventModal(event)}
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
                      onClick={() => openAttendanceModal(event)}
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
              }}
            >
              <label
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  color: theme.text,
                }}
              >
                <span>🎵 Canciones a sugerir por evento:</span>
                <input
                  type="number"
                  min="0"
                  value={autoSuggestData.songCount}
                  onChange={(e) =>
                    setAutoSuggestData({
                      ...autoSuggestData,
                      songCount: parseInt(e.target.value) || 0,
                    })
                  }
                  style={{
                    width: "60px",
                    padding: "5px",
                    borderRadius: "4px",
                    border: `1px solid ${theme.border}`,
                    background: theme.bgSecondary,
                    color: theme.text,
                  }}
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
                      {e.name} (Meta: {e.songCount})
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
                    <span style={{ fontSize: "0.85rem", color: theme.text }}>
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
                        width: "50px",
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
                    <div style={{ width: "120px" }}>
                      <label
                        style={{
                          fontSize: "0.7rem",
                          color: theme.textSecondary,
                          display: "block",
                        }}
                      >
                        Canciones:
                      </label>
                      <input
                        type="number"
                        value={eventFormData.songCount}
                        onChange={(e) =>
                          setEventFormData({
                            ...eventFormData,
                            songCount: parseInt(e.target.value) || 0,
                          })
                        }
                        style={{
                          width: "100%",
                          padding: "0.7rem",
                          borderRadius: "6px",
                          border: `1px solid ${theme.border}`,
                          background: theme.bg,
                          color: theme.text,
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
                            {s.title}
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
            <div style={{ maxHeight: "300px", overflowY: "auto" }}>
              {attendanceList.map((a, i) => (
                <div
                  key={i}
                  onClick={() => {
                    const upd = [...attendanceList];
                    upd[i].attended = !upd[i].attended;
                    setAttendanceList(upd);
                  }}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "0.8rem",
                    borderBottom: `1px solid ${theme.border}`,
                    cursor: "pointer",
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
                Cancelar
              </button>
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
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default WorshipScheduleTab;