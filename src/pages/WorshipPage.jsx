// ============================================
// WorshipPage.jsx - Gestión del Ministerio de Alabanza (CONTENEDOR PRINCIPAL)
// ============================================

import React, { useState, useEffect, useCallback } from "react";
import apiService from "../apiService";
import { useAuth } from "../context/AuthContext";
import "../css/LeadersPage.css";

import WorshipScheduleTab from "../components/worship-components/WorshipScheduleTab";
import WorshipTeamTab from "../components/worship-components/WorshipTeamTab";
import WorshipRolesTab from "../components/worship-components/WorshipRolesTab";
import WorshipRepertoireTab from "../components/worship-components/WorshipRepertoireTab";

// ✅ Guard universal: convierte CUALQUIER valor en array válido
const toArray = (val) => (Array.isArray(val) ? val : []);

// ✅ FIX: unwrap maneja tanto arrays directos como respuestas paginadas { content: [...] }
//    que Spring devuelve cuando se usa Pageable. Evita que toArray devuelva [] silenciosamente.
const unwrap = (data) => {
  if (Array.isArray(data)) return data;
  if (data?.content && Array.isArray(data.content)) return data.content;
  return [];
};

const WorshipPage = () => {
  const { user } = useAuth();
  const canManageWorship = true;

  const [activeTab, setActiveTab] = useState("SCHEDULE");
  const [teamMembers, setTeamMembers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [events, setEvents] = useState([]);
  const [songs, setSongs] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const savedMode = localStorage.getItem("darkMode");
    const htmlHasDarkClass =
      document.documentElement.classList.contains("dark-mode") ||
      document.documentElement.classList.contains("dark");
    setIsDarkMode(savedMode === "true" || htmlHasDarkClass || prefersDark);
  }, []);

  const theme = {
    bg: isDarkMode ? "#0f172a" : "#f9fafb",
    bgSecondary: isDarkMode ? "#1e293b" : "#ffffff",
    text: isDarkMode ? "#f3f4f6" : "#1f2937",
    textSecondary: isDarkMode ? "#9ca3af" : "#6b7280",
    border: isDarkMode ? "#334155" : "#e5e7eb",
    errorBg: isDarkMode ? "#7f1d1d" : "#fee2e2",
    errorText: isDarkMode ? "#fecaca" : "#991b1b",
    successBg: isDarkMode ? "#14532d" : "#d1fae5",
    successText: isDarkMode ? "#a7f3d0" : "#065f46",
    primary: "#3b82f6",
    danger: "#ef4444",
    warning: "#f59e0b",
  };

  const showSuccess = (msg) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(""), 4000);
  };
  const showError = (msg) => {
    setError(msg);
    setTimeout(() => setError(""), 6000);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [teamData, rolesData, eventsData, songsData] = await Promise.all([
        apiService.getWorshipTeam(),
        apiService.getWorshipRoles(),
        apiService.getWorshipEvents(),
        apiService.getWorshipSongs(),
      ]);

      // ✅ FIX: usar unwrap en lugar de toArray para manejar respuestas paginadas del backend
      //    Spring puede devolver { content: [...], totalPages: N, ... } en vez de un array directo.
      //    unwrap extrae el array real en ambos casos.
      const safeTeam   = unwrap(teamData);
      const safeRoles  = unwrap(rolesData);
      const safeEvents = unwrap(eventsData);
      const safeSongs  = unwrap(songsData);

      setTeamMembers(safeTeam);
      setRoles(
        safeRoles.sort((a, b) =>
          (a.name || "").localeCompare(b.name || "")
        )
      );
      setEvents(safeEvents);
      setSongs(
        safeSongs.sort((a, b) =>
          (a.title || "").localeCompare(b.title || "")
        )
      );
    } catch (err) {
      showError("Error al cargar los datos. " + (err.message || ""));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ✅ Conteos seguros para las tabs (nunca undefined.length)
  const eventsCount = toArray(events).length;
  const teamCount   = toArray(teamMembers).length;
  const rolesCount  = toArray(roles).length;
  const songsCount  = toArray(songs).length;

  const tabs = [
    { id: "SCHEDULE",   label: "📅 Programación", count: eventsCount },
    { id: "TEAM",       label: "👥 Equipo",        count: teamCount   },
    { id: "ROLES",      label: "🎹 Instrumentos",  count: rolesCount  },
    { id: "REPERTOIRE", label: "🎵 Repertorio",    count: songsCount  },
  ];

  // ✅ Guard para el loading inicial
  const isInitialLoading = loading && teamCount === 0;

  return (
    <div
      className="leaders-page"
      style={{
        backgroundColor: theme.bg,
        color: theme.text,
        minHeight: "100vh",
        transition: "all 0.3s ease",
      }}
    >
      <div className="leaders-page-container">
        <div className="leaders-page__header">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "1rem",
            }}
          >
            <h1>🎸 Ministerio de Alabanza</h1>
            {user && (
              <div
                className="user-role-badge"
                style={{
                  backgroundColor: theme.bgSecondary,
                  padding: "0.5rem 1rem",
                  borderRadius: "20px",
                  fontSize: "0.9rem",
                  border: `1px solid ${theme.border}`,
                }}
              >
                <span>👤 {user.username || user.name}</span>
                <span
                  style={{
                    backgroundColor: canManageWorship ? "#8b5cf6" : "#4299e1",
                    color: "white",
                    padding: "0.2rem 0.5rem",
                    borderRadius: "12px",
                    marginLeft: "0.5rem",
                    fontSize: "0.8rem",
                    fontWeight: "bold",
                  }}
                >
                  {canManageWorship ? "🎵 Director" : "👁️ Visor"}
                </span>
              </div>
            )}
          </div>
          <p>
            Gestiona el equipo, roles, cronograma de cultos y el repertorio musical.
          </p>
        </div>

        {error && (
          <div
            className="leaders-page__error"
            style={{ backgroundColor: theme.errorBg, color: theme.errorText }}
          >
            ❌ {error}
          </div>
        )}
        {successMessage && (
          <div
            className="leaders-page__success"
            style={{ backgroundColor: theme.successBg, color: theme.successText }}
          >
            {successMessage}
          </div>
        )}

        {/* TABS */}
        <div
          style={{
            display: "flex",
            gap: "1rem",
            marginBottom: "2rem",
            borderBottom: `2px solid ${theme.border}`,
            paddingBottom: "0.5rem",
            overflowX: "auto",
          }}
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button" // 🚀 AQUÍ ESTÁ LA CORRECCIÓN (Evita que las pestañas recarguen la página)
              onClick={() => setActiveTab(tab.id)}
              style={{
                background: "none",
                border: "none",
                padding: "0.5rem 1rem",
                fontSize: "1rem",
                fontWeight: activeTab === tab.id ? "bold" : "normal",
                color: activeTab === tab.id ? theme.primary : theme.textSecondary,
                borderBottom:
                  activeTab === tab.id ? `3px solid ${theme.primary}` : "none",
                cursor: "pointer",
                marginBottom: "-0.65rem",
                whiteSpace: "nowrap",
              }}
            >
              {tab.label}{" "}
              <span style={{ fontSize: "0.8rem", opacity: 0.7 }}>
                ({tab.count})
              </span>
            </button>
          ))}
        </div>

        {isInitialLoading ? (
          <div
            style={{
              color: theme.text,
              textAlign: "center",
              padding: "3rem",
              fontSize: "1.2rem",
            }}
          >
            ⏳ Cargando datos del ministerio...
          </div>
        ) : (
          <div style={{ position: "relative" }}>
            <div style={{ position: "absolute", top: "-4.5rem", right: "0" }}>
              <button
                type="button" // 🚀 AQUÍ ESTÁ LA OTRA CORRECCIÓN (Evita que recargar recargue el navegador)
                onClick={loadData}
                disabled={loading}
                style={{
                  padding: "0.5rem 1rem",
                  borderRadius: "6px",
                  backgroundColor: theme.bgSecondary,
                  border: `1px solid ${theme.border}`,
                  color: theme.text,
                  cursor: "pointer",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                }}
              >
                🔄 Recargar
              </button>
            </div>

            {activeTab === "SCHEDULE" && (
              <WorshipScheduleTab
                events={toArray(events)}
                teamMembers={toArray(teamMembers)}
                roles={toArray(roles)}
                songs={toArray(songs)}
                canManageWorship={canManageWorship}
                theme={theme}
                isDarkMode={isDarkMode}
                loadData={loadData}
                showSuccess={showSuccess}
                showError={showError}
                loading={loading}
                setLoading={setLoading}
              />
            )}

            {activeTab === "TEAM" && (
              <WorshipTeamTab
                teamMembers={toArray(teamMembers)}
                roles={roles && roles.length > 0 ? roles : []} // Refuerzo aquí
                canManageWorship={canManageWorship}
                theme={theme}
                isDarkMode={isDarkMode}
                loadData={loadData}
                showSuccess={showSuccess}
                showError={showError}
                loading={loading}
                setLoading={setLoading}
              />
            )}

            {activeTab === "ROLES" && (
              <WorshipRolesTab
                roles={toArray(roles)}
                canManageWorship={canManageWorship}
                theme={theme}
                isDarkMode={isDarkMode}
                loadData={loadData}
                showSuccess={showSuccess}
                showError={showError}
                loading={loading}
                setLoading={setLoading}
              />
            )}

            {activeTab === "REPERTOIRE" && (
              <WorshipRepertoireTab
                songs={toArray(songs)}
                teamMembers={toArray(teamMembers)}
                canManageWorship={canManageWorship}
                theme={theme}
                isDarkMode={isDarkMode}
                loadData={loadData}
                showSuccess={showSuccess}
                showError={showError}
                loading={loading}
                setLoading={setLoading}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default WorshipPage;