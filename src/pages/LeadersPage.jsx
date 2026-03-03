// ============================================
// LeadersPage.jsx - Gestión de Líderes (SERVANT, LEADER_144 y LEADER_12)
// Versión limpia: click en fila abre ModalLeaderDetail
// ============================================

import React, { useState, useEffect, useCallback } from "react";
import apiService from "../apiService";
import { generateLeadersPDF } from "../services/leadersPdfGenerator";
import { logSecurityEvent, logUserAction } from "../utils/securityLogger";
import nameHelper from "../services/nameHelper";
import ModalPromoteLeader from "../components/ModalPromoteLeader";
import ModalLeaderStatistics from "../components/ModalLeaderStatistics";
import ModalLeaderDetail from "../components/ModalLeaderDetail";
import "../css/LeadersPage.css";

// Extraer función del helper para transformar nombres
const { getDisplayName } = nameHelper;

// 🔐 Debug condicional
const DEBUG = process.env.REACT_APP_DEBUG === "true";

const log = (message, data) => {
  if (DEBUG) {
    console.log(`[LeadersPage] ${message}`, data || "");
  }
};

const logError = (message, error) => {
  console.error(`[LeadersPage] ${message}`, error);
};

// ✅ Sanitización de HTML
const escapeHtml = (text) => {
  if (!text || typeof text !== "string") return "";
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
};

// ✅ Validación de búsqueda
const validateSearchText = (text) => {
  if (!text || typeof text !== "string") return "";
  if (text.length > 100) return text.substring(0, 100);
  return text.trim();
};

// ========== CONSTANTES ==========
const LEADER_TYPE_MAP = {
  SERVANT: { label: "Servidor", color: "#3b82f6", icon: "🌱" },
  LEADER_144: { label: "Líder 144", color: "#8b5cf6", icon: "🌿" },
  LEADER_12: { label: "Líder 12", color: "#10b981", icon: "🌳" },
};

const LEADER_STATUS_MAP = {
  ACTIVE: { label: "Activo", color: "#10b981", icon: "✅" },
  SUSPENDED: { label: "Suspendido", color: "#f59e0b", icon: "⏸️" },
  INACTIVE: { label: "Inactivo", color: "#6b7280", icon: "⏹️" },
};

const LeadersPage = () => {
  // ========== STATE ==========
  const [allLeaders, setAllLeaders] = useState([]);
  const [filteredLeaders, setFilteredLeaders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Filtros
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [selectedType, setSelectedType] = useState("ALL");
  const [searchText, setSearchText] = useState("");

  // Modales
  const [showPromoteModal, setShowPromoteModal] = useState(false);
  const [showStatisticsModal, setShowStatisticsModal] = useState(false);
  const [showVerifyAllModal, setShowVerifyAllModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedLeader, setSelectedLeader] = useState(null);
  const [verificationResult, setVerificationResult] = useState(null);
  const [statisticsData, setStatisticsData] = useState(null);

  // UI State
  const [hasFiltersApplied, setHasFiltersApplied] = useState(false);
  const [activeFiltersInfo, setActiveFiltersInfo] = useState({});
  const [isDarkMode, setIsDarkMode] = useState(false);

  // ========== DARK MODE DETECTION ==========
  useEffect(() => {
    try {
      const prefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)",
      ).matches;
      const savedMode = localStorage.getItem("darkMode");
      const htmlHasDarkClass =
        document.documentElement.classList.contains("dark-mode") ||
        document.documentElement.classList.contains("dark");

      setIsDarkMode(savedMode === "true" || htmlHasDarkClass || prefersDark);

      const observer = new MutationObserver(() => {
        setIsDarkMode(
          document.documentElement.classList.contains("dark-mode") ||
            document.documentElement.classList.contains("dark"),
        );
      });

      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["class"],
      });

      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handleChange = (e) => {
        if (localStorage.getItem("darkMode") === null) {
          setIsDarkMode(e.matches);
        }
      };
      mediaQuery.addEventListener("change", handleChange);

      return () => {
        observer.disconnect();
        mediaQuery.removeEventListener("change", handleChange);
      };
    } catch (error) {
      logError("Error detectando dark mode:", error);
    }
  }, []);

  // ========== THEME COLORS ==========
  const theme = {
    bg: isDarkMode ? "#0f172a" : "#f9fafb",
    bgSecondary: isDarkMode ? "#1e293b" : "#ffffff",
    text: isDarkMode ? "#f3f4f6" : "#1f2937",
    textSecondary: isDarkMode ? "#9ca3af" : "#6b7280",
    border: isDarkMode ? "#334155" : "#e5e7eb",
    errorBg: isDarkMode ? "#7f1d1d" : "#fee2e2",
    errorBorder: "#ef4444",
    errorText: isDarkMode ? "#fecaca" : "#991b1b",
    successBg: isDarkMode ? "#14532d" : "#d1fae5",
    successBorder: "#10b981",
    successText: isDarkMode ? "#a7f3d0" : "#065f46",
  };

  // ========== LOAD LEADERS ==========
  const loadLeaders = useCallback(async () => {
    setLoading(true);
    setError("");
    setSuccessMessage("");

    try {
      log("Cargando líderes");

      const leaders = await apiService.getLeaders();
      log("Líderes cargados", { count: leaders?.length || 0 });

      if (!leaders || leaders.length === 0) {
        log("No hay líderes disponibles");
        setAllLeaders([]);
        return;
      }

      const processedLeaders = leaders.map((leader) => ({
        ...leader,
        memberName: getDisplayName(
          escapeHtml(leader.memberName || "Sin nombre"),
        ),
        leaderTypeIcon: LEADER_TYPE_MAP[leader.leaderType]?.icon || "👤",
        leaderTypeLabel:
          LEADER_TYPE_MAP[leader.leaderType]?.label || leader.leaderType,
        statusIcon: LEADER_STATUS_MAP[leader.status]?.icon || "•",
        statusLabel: LEADER_STATUS_MAP[leader.status]?.label || leader.status,
        promotionDateFormatted: leader.promotionDate
          ? new Date(leader.promotionDate).toLocaleDateString("es-CO")
          : "-",
        suspensionDateFormatted: leader.suspensionDate
          ? new Date(leader.suspensionDate).toLocaleDateString("es-CO")
          : null,
        lastVerificationFormatted: leader.lastVerificationDate
          ? new Date(leader.lastVerificationDate).toLocaleDateString("es-CO")
          : "Nunca",
      }));

      log("Líderes procesados", { count: processedLeaders.length });
      setAllLeaders(processedLeaders);

      // Si hay un líder seleccionado, actualizar su data
      if (selectedLeader) {
        const updated = processedLeaders.find(
          (l) => l.id === selectedLeader.id,
        );
        if (updated) setSelectedLeader(updated);
      }

      logUserAction("load_leaders", {
        leaderCount: processedLeaders.length,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      logError("Error cargando líderes:", err);
      setError("Error al cargar la lista de líderes");

      logSecurityEvent("leaders_load_error", {
        errorType: "api_error",
        timestamp: new Date().toISOString(),
      });
    } finally {
      setLoading(false);
    }
  }, [selectedLeader]);

  // ========== APPLY FILTERS ==========
  const applyFilters = useCallback(() => {
    try {
      let filtered = [...allLeaders];

      if (selectedStatus !== "ALL") {
        filtered = filtered.filter(
          (leader) => leader.status === selectedStatus,
        );
      }

      if (selectedType !== "ALL") {
        filtered = filtered.filter(
          (leader) => leader.leaderType === selectedType,
        );
      }

      if (searchText.trim()) {
        const search = searchText.toLowerCase().trim();
        filtered = filtered.filter(
          (leader) =>
            leader.memberName?.toLowerCase().includes(search) ||
            leader.memberDocument?.toLowerCase().includes(search) ||
            leader.memberEmail?.toLowerCase().includes(search) ||
            leader.cellGroupCode?.toLowerCase().includes(search),
        );
      }

      filtered.sort((a, b) => {
        const statusOrder = { ACTIVE: 1, SUSPENDED: 2, INACTIVE: 3 };
        const orderA = statusOrder[a.status] || 99;
        const orderB = statusOrder[b.status] || 99;

        if (orderA !== orderB) return orderA - orderB;

        return new Date(b.promotionDate || 0) - new Date(a.promotionDate || 0);
      });

      log("Filtros aplicados", { count: filtered.length });
      setFilteredLeaders(filtered);
    } catch (error) {
      logError("Error aplicando filtros:", error);
      setFilteredLeaders(allLeaders);
    }
  }, [allLeaders, selectedStatus, selectedType, searchText]);

  // ========== INIT LOAD ==========
  useEffect(() => {
    loadLeaders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ========== APPLY FILTERS ON CHANGE ==========
  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  // ========== DETECT ACTIVE FILTERS ==========
  useEffect(() => {
    try {
      const filtersActive =
        selectedStatus !== "ALL" ||
        selectedType !== "ALL" ||
        searchText.trim() !== "";

      setHasFiltersApplied(filtersActive);

      if (filtersActive) {
        const info = {};
        if (selectedStatus !== "ALL")
          info.status =
            LEADER_STATUS_MAP[selectedStatus]?.label || selectedStatus;
        if (selectedType !== "ALL")
          info.type = LEADER_TYPE_MAP[selectedType]?.label || selectedType;
        if (searchText.trim()) info.search = validateSearchText(searchText);

        setActiveFiltersInfo(info);
      } else {
        setActiveFiltersInfo({});
      }
    } catch (error) {
      logError("Error detectando filtros activos:", error);
    }
  }, [selectedStatus, selectedType, searchText]);

  // ========== OPEN LEADER DETAIL ==========
  const handleRowClick = useCallback((leader) => {
    setSelectedLeader(leader);
    setShowDetailModal(true);

    logUserAction("open_leader_detail", {
      leaderId: leader.id,
      timestamp: new Date().toISOString(),
    });
  }, []);

  // ========== VERIFY ALL LEADERS ==========
  const handleVerifyAll = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      log("Verificando todos los líderes activos");

      const result = await apiService.verifyAllLeaders();
      log("Resultado de verificación", result);

      setVerificationResult(result);
      setShowVerifyAllModal(true);

      await loadLeaders();

      logUserAction("verify_all_leaders", {
        totalVerified: result.totalVerified,
        suspended: result.suspended,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      logError("Error en verificación masiva:", err);
      setError("Error al verificar líderes");
    } finally {
      setLoading(false);
    }
  }, [loadLeaders]);

  // ========== REACTIVATE SUSPENDED ==========
  const handleReactivateSuspended = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      log("Intentando reactivar líderes suspendidos");

      const result = await apiService.reactivateSuspendedLeaders();

      if (result.reactivated > 0) {
        setSuccessMessage(
          `✅ ${result.reactivated} líder(es) reactivado(s) exitosamente`,
        );
      } else {
        setSuccessMessage(
          "✅ No se encontraron líderes suspendidos que cumplan requisitos",
        );
      }

      await loadLeaders();

      logUserAction("reactivate_suspended", {
        reactivated: result.reactivated,
        timestamp: new Date().toISOString(),
      });

      setTimeout(() => setSuccessMessage(""), 5000);
    } catch (err) {
      logError("Error reactivando suspendidos:", err);
      setError("Error al reactivar líderes");
    } finally {
      setLoading(false);
    }
  }, [loadLeaders]);

  // ========== SHOW STATISTICS ==========
  const handleShowStatistics = useCallback(async () => {
    try {
      setLoading(true);
      log("Cargando estadísticas de liderazgo");

      const stats = await apiService.getLeaderStatistics();
      log("Estadísticas recibidas", stats);

      const dataWithContext = {
        ...stats,
        hasFilters: hasFiltersApplied,
        filtersInfo: activeFiltersInfo,
        currentViewCount: filteredLeaders.length,
        totalCount: allLeaders.length,
      };

      setStatisticsData(dataWithContext);
      setShowStatisticsModal(true);

      logUserAction("view_leader_statistics", {
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      logError("Error cargando estadísticas:", err);
      setError("Error al cargar estadísticas");
    } finally {
      setLoading(false);
    }
  }, [
    hasFiltersApplied,
    activeFiltersInfo,
    filteredLeaders.length,
    allLeaders.length,
  ]);

  // ========== ACCIONES INDIVIDUALES (usadas por ModalLeaderDetail) ==========
  const handleSuspendLeader = useCallback(
    async (leaderId, memberName) => {
      try {
        const reason = window.prompt(
          `Ingrese el motivo para suspender a ${memberName}:`,
          "Incumplimiento de requisitos",
        );

        if (reason === null) return;
        if (!reason.trim()) {
          alert("Debe ingresar un motivo para la suspensión");
          return;
        }

        setLoading(true);
        log("Suspendiendo líder", { leaderId, reason });

        await apiService.suspendLeader(leaderId, reason.trim());
        setSuccessMessage(`✅ Líder ${memberName} suspendido exitosamente`);

        await loadLeaders();
        setTimeout(() => setSuccessMessage(""), 5000);
      } catch (err) {
        logError("Error suspendiendo líder:", err);
        setError(`Error al suspender líder: ${err.message}`);
      } finally {
        setLoading(false);
      }
    },
    [loadLeaders],
  );

  const handleUnsuspendLeader = useCallback(
    async (leaderId, memberName) => {
      try {
        if (
          !window.confirm(
            `¿Está seguro de reactivar a ${memberName}? Se verificará que cumpla los requisitos.`,
          )
        ) {
          return;
        }

        setLoading(true);
        log("Reactivando líder suspendido", { leaderId });

        await apiService.unsuspendLeader(leaderId);
        setSuccessMessage(`✅ Líder ${memberName} reactivado exitosamente`);

        await loadLeaders();
        setTimeout(() => setSuccessMessage(""), 5000);
      } catch (err) {
        logError("Error reactivando líder:", err);

        // ✅ Mostrar el mensaje del backend directamente si es un 400
        const msg = err.message || "";
        if (msg.includes("No cumple requisitos") || msg.includes("diezmos")) {
          setError(`⚠️ No se puede reactivar a ${memberName}: ${msg}`);
        } else {
          setError(`Error al reactivar líder: ${msg}`);
        }
      } finally {
        setLoading(false);
      }
    },
    [loadLeaders],
  );

  const handleDeactivateLeader = useCallback(
    async (leaderId, memberName) => {
      try {
        const reason = window.prompt(
          `Ingrese el motivo para desactivar a ${memberName} (permanente):`,
          "Renuncia / Traslado",
        );

        if (reason === null) return;
        if (!reason.trim()) {
          alert("Debe ingresar un motivo para la desactivación");
          return;
        }

        if (
          !window.confirm(
            `⚠️ Esta acción es irreversible. ¿Desactivar permanentemente a ${memberName}?`,
          )
        ) {
          return;
        }

        setLoading(true);
        log("Desactivando líder", { leaderId, reason });

        await apiService.deactivateLeader(leaderId, reason.trim());
        setSuccessMessage(`✅ Líder ${memberName} desactivado exitosamente`);

        await loadLeaders();
        setTimeout(() => setSuccessMessage(""), 5000);
      } catch (err) {
        logError("Error desactivando líder:", err);
        setError(`Error al desactivar líder: ${err.message}`);
      } finally {
        setLoading(false);
      }
    },
    [loadLeaders],
  );

  const handleReactivateLeader = useCallback(
    async (leaderId, memberName) => {
      try {
        if (
          !window.confirm(
            `¿Reactivar a ${memberName}? Se verificará que cumpla los requisitos actuales.`,
          )
        ) {
          return;
        }

        setLoading(true);
        log("Reactivando líder inactivo", { leaderId });

        await apiService.reactivateLeader(leaderId);
        setSuccessMessage(`✅ Líder ${memberName} reactivado exitosamente`);

        await loadLeaders();
        setTimeout(() => setSuccessMessage(""), 5000);
      } catch (err) {
        logError("Error reactivando líder inactivo:", err);
        setError(`Error al reactivar líder: ${err.message}`);
      } finally {
        setLoading(false);
      }
    },
    [loadLeaders],
  );

  const handleVerifyLeader = useCallback(
    async (leaderId, memberName) => {
      try {
        setLoading(true);
        log("Verificando líder específico", { leaderId });

        const result = await apiService.verifyLeader(leaderId);

        if (result.wasSuspended) {
          setSuccessMessage(
            `⚠️ ${memberName} fue suspendido automáticamente por no cumplir requisitos`,
          );
        } else {
          setSuccessMessage(
            `✅ ${memberName} verificado, cumple todos los requisitos`,
          );
        }

        await loadLeaders();
        setTimeout(() => setSuccessMessage(""), 5000);
      } catch (err) {
        logError("Error verificando líder:", err);
        setError(`Error al verificar líder: ${err.message}`);
      } finally {
        setLoading(false);
      }
    },
    [loadLeaders],
  );

  // ========== EDITAR LÍDER ==========
  // Usa la firma existente en apiService:
  //   updateLeader(leaderId, leaderType, cellGroupCode, notes)
  const handleEditLeader = useCallback(
    async (leaderId, fields) => {
      log("Editando líder", { leaderId, fields });

      await apiService.updateLeader(
        leaderId,
        fields.leaderType || null,
        fields.cellGroupCode !== undefined ? fields.cellGroupCode : null,
        fields.notes !== undefined ? fields.notes : null,
      );

      setSuccessMessage("✅ Líder actualizado exitosamente");
      await loadLeaders();
      setTimeout(() => setSuccessMessage(""), 5000);

      logUserAction("edit_leader", {
        leaderId,
        fields,
        timestamp: new Date().toISOString(),
      });
    },
    [loadLeaders],
  );

  // ========== ELIMINAR LÍDER ==========
  const handleDeleteLeader = useCallback(
    async (leaderId, memberName) => {
      log("Eliminando líder", { leaderId, memberName });

      // Lanzar la llamada — si falla, el error burbujea al modal para mostrarlo
      await apiService.deleteLeader(leaderId);

      setSuccessMessage(`✅ Líder ${memberName} eliminado exitosamente`);

      // Cerrar modal y limpiar selección antes de recargar
      setShowDetailModal(false);
      setSelectedLeader(null);

      await loadLeaders();
      setTimeout(() => setSuccessMessage(""), 5000);

      logUserAction("delete_leader", {
        leaderId,
        memberName,
        timestamp: new Date().toISOString(),
      });
    },
    [loadLeaders],
  );

  // ========== EXPORT PDF ==========
  const handleExportPDF = useCallback(() => {
    try {
      log("Generando PDF de líderes");

      const dataForPDF = hasFiltersApplied ? filteredLeaders : allLeaders;

      const active = dataForPDF.filter((l) => l.status === "ACTIVE");
      const suspended = dataForPDF.filter((l) => l.status === "SUSPENDED");
      const inactive = dataForPDF.filter((l) => l.status === "INACTIVE");

      const data = {
        leaders: dataForPDF,
        title: hasFiltersApplied
          ? "Reporte de Líderes (Filtrados)"
          : "Reporte General de Líderes",
        type:
          selectedType !== "ALL"
            ? LEADER_TYPE_MAP[selectedType]?.label
            : "Todos los Tipos",
        status:
          selectedStatus !== "ALL"
            ? LEADER_STATUS_MAP[selectedStatus]?.label
            : "Todos los Estados",
        date: new Date().toLocaleDateString("es-CO"),
        activeCount: active.length,
        suspendedCount: suspended.length,
        inactiveCount: inactive.length,
        totalCount: dataForPDF.length,
        hasFilters: hasFiltersApplied,
        filtersInfo: activeFiltersInfo,
        byType: {
          SERVANT: dataForPDF.filter((l) => l.leaderType === "SERVANT").length,
          LEADER_144: dataForPDF.filter((l) => l.leaderType === "LEADER_144")
            .length,
          LEADER_12: dataForPDF.filter((l) => l.leaderType === "LEADER_12")
            .length,
        },
      };

      generateLeadersPDF(data);

      logUserAction("export_leaders_pdf", {
        hasFilters: hasFiltersApplied,
        count: dataForPDF.length,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      logError("Error generando PDF:", err);
      setError("Error al generar PDF");
    }
  }, [
    hasFiltersApplied,
    filteredLeaders,
    allLeaders,
    selectedType,
    selectedStatus,
    activeFiltersInfo,
  ]);

  // ========== RENDER HELPERS ==========
  const renderStatusBadge = (status) => {
    const statusInfo = LEADER_STATUS_MAP[status] || {
      label: status,
      icon: "•",
      color: "#6b7280",
    };

    return (
      <span
        className="leaders-page__status-badge"
        style={{
          backgroundColor: isDarkMode
            ? `${statusInfo.color}20`
            : `${statusInfo.color}10`,
          color: statusInfo.color,
          borderColor: isDarkMode
            ? `${statusInfo.color}40`
            : `${statusInfo.color}30`,
        }}
      >
        {statusInfo.icon} {statusInfo.label}
      </span>
    );
  };

  const renderTypeBadge = (type) => {
    const typeInfo = LEADER_TYPE_MAP[type] || {
      label: type,
      icon: "👤",
      color: "#3b82f6",
    };

    return (
      <span
        className="leaders-page__type-badge"
        style={{
          backgroundColor: isDarkMode
            ? `${typeInfo.color}20`
            : `${typeInfo.color}10`,
          color: typeInfo.color,
          borderColor: isDarkMode
            ? `${typeInfo.color}40`
            : `${typeInfo.color}30`,
        }}
      >
        {typeInfo.icon} {typeInfo.label}
      </span>
    );
  };

  return (
    <div
      className="leaders-page"
      style={{
        backgroundColor: theme.bg,
        color: theme.text,
        transition: "all 0.3s ease",
      }}
    >
      <div className="leaders-page-container">
        {/* HEADER */}
        <div className="leaders-page__header">
          <h1>👥 Gestión de Líderes</h1>
          <p>
            Promueve, verifica y administra líderes (Servidores, Líderes 144 y
            Líderes 12)
          </p>
        </div>

        {/* CONTROLES */}
        <div className="leaders-page__controls">
          <div className="leaders-page__controls-grid">
            {/* Búsqueda */}
            <div className="leaders-page__filter-item">
              <label>🔍 Buscar</label>
              <input
                type="text"
                placeholder="Nombre, documento, email, célula..."
                value={searchText}
                onChange={(e) =>
                  setSearchText(validateSearchText(e.target.value))
                }
                maxLength="100"
                style={{
                  backgroundColor: theme.bgSecondary,
                  color: theme.text,
                  borderColor: theme.border,
                }}
              />
            </div>

            {/* Filtro por Estado */}
            <div className="leaders-page__filter-item">
              <label>📌 Estado</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                style={{
                  backgroundColor: theme.bgSecondary,
                  color: theme.text,
                  borderColor: theme.border,
                }}
              >
                <option value="ALL">
                  Todos los Estados ({allLeaders.length})
                </option>
                <option value="ACTIVE">
                  ✅ Activos (
                  {allLeaders.filter((l) => l.status === "ACTIVE").length})
                </option>
                <option value="SUSPENDED">
                  ⏸️ Suspendidos (
                  {allLeaders.filter((l) => l.status === "SUSPENDED").length})
                </option>
                <option value="INACTIVE">
                  ⏹️ Inactivos (
                  {allLeaders.filter((l) => l.status === "INACTIVE").length})
                </option>
              </select>
            </div>

            {/* Filtro por Tipo */}
            <div className="leaders-page__filter-item">
              <label>✨ Tipo</label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                style={{
                  backgroundColor: theme.bgSecondary,
                  color: theme.text,
                  borderColor: theme.border,
                }}
              >
                <option value="ALL">Todos los Tipos</option>
                <option value="SERVANT">
                  🌱 Servidores (
                  {allLeaders.filter((l) => l.leaderType === "SERVANT").length})
                </option>
                <option value="LEADER_144">
                  🌿 Líderes 144 (
                  {
                    allLeaders.filter((l) => l.leaderType === "LEADER_144")
                      .length
                  }
                  )
                </option>
                <option value="LEADER_12">
                  🌳 Líderes 12 (
                  {
                    allLeaders.filter((l) => l.leaderType === "LEADER_12")
                      .length
                  }
                  )
                </option>
              </select>
            </div>
          </div>

          {/* BOTONES DE ACCIÓN */}
          <div className="leaders-page__actions">
            <button
              className="leaders-page__btn leaders-page__btn--primary"
              onClick={() => setShowPromoteModal(true)}
              title="Promover miembro a líder"
            >
              🌟 Promover
            </button>

            <button
              className="leaders-page__btn leaders-page__btn--secondary"
              onClick={handleShowStatistics}
              title="Ver estadísticas de liderazgo"
              disabled={loading}
            >
              📊 Estadísticas {hasFiltersApplied && "🔍"}
            </button>

            <button
              className="leaders-page__btn leaders-page__btn--export"
              onClick={handleExportPDF}
              title="Exportar a PDF"
              disabled={loading}
            >
              📄 PDF {hasFiltersApplied && "🔍"}
            </button>

            <button
              className="leaders-page__btn leaders-page__btn--verify-all"
              onClick={handleVerifyAll}
              title="Verificar todos los líderes activos"
              disabled={loading}
            >
              🔄 Verificar Todos
            </button>

            <button
              className="leaders-page__btn leaders-page__btn--reactivate-all"
              onClick={handleReactivateSuspended}
              title="Intentar reactivar suspendidos"
              disabled={loading}
            >
              ▶️ Reactivar Suspendidos
            </button>

            <button
              className="leaders-page__btn leaders-page__btn--refresh"
              onClick={loadLeaders}
              disabled={loading}
              title="Recargar datos"
            >
              🔄 Recargar
            </button>
          </div>
        </div>

        {/* INFORMACIÓN DE FILTROS */}
        <div className="leaders-page__filter-info">
          <p>
            Mostrando <strong>{filteredLeaders.length}</strong> de{" "}
            <strong>{allLeaders.length}</strong> líderes
            {hasFiltersApplied && " (🔍 Con filtros aplicados)"}
          </p>
        </div>

        {/* MENSAJES */}
        {error && (
          <div
            className="leaders-page__error"
            style={{
              backgroundColor: theme.errorBg,
              borderColor: theme.errorBorder,
              color: theme.errorText,
            }}
          >
            ❌ {error}
          </div>
        )}

        {successMessage && (
          <div
            className="leaders-page__success"
            style={{
              backgroundColor: theme.successBg,
              borderColor: theme.successBorder,
              color: theme.successText,
            }}
          >
            {successMessage}
          </div>
        )}

        {/* CONTENIDO PRINCIPAL */}
        {loading ? (
          <div className="leaders-page__loading" style={{ color: theme.text }}>
            ⏳ Cargando líderes...
          </div>
        ) : filteredLeaders.length === 0 ? (
          <div className="leaders-page__empty">
            <p>👥 No hay líderes que coincidan con los filtros</p>
            {allLeaders.length === 0 && (
              <p className="leaders-page__empty-hint">
                💡 Promueve el primer líder usando el botón "Promover"
              </p>
            )}
          </div>
        ) : (
          <div className="leaders-page__table-container">
            <table className="leaders-page__table">
              <thead>
                <tr>
                  <th className="leaders-page__col-member">Líder</th>
                  <th className="leaders-page__col-type">Tipo</th>
                  <th className="leaders-page__col-status">Estado</th>
                  <th className="leaders-page__col-group">Célula</th>
                  <th className="leaders-page__col-date">Promoción</th>
                  <th className="leaders-page__col-verified">Verificado</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeaders.map((leader) => (
                  <tr
                    key={leader.id}
                    className={`leaders-page__row leaders-page__row--${leader.status.toLowerCase()} leaders-page__row--clickable`}
                    style={{
                      backgroundColor: isDarkMode ? "#1a2332" : "#fff",
                      borderColor: theme.border,
                    }}
                    onClick={() => handleRowClick(leader)}
                    title="Click para ver detalles"
                  >
                    {/* Miembro */}
                    <td className="leaders-page__col-member">
                      <div className="leaders-page__member-info">
                        <span className="leaders-page__avatar">👤</span>
                        <div className="leaders-page__member-details">
                          <span className="leaders-page__member-name">
                            {leader.memberName}
                          </span>
                          <span className="leaders-page__member-meta">
                            {leader.memberDocument || "Sin documento"}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Tipo */}
                    <td className="leaders-page__col-type">
                      {renderTypeBadge(leader.leaderType)}
                    </td>

                    {/* Estado */}
                    <td className="leaders-page__col-status">
                      {renderStatusBadge(leader.status)}
                    </td>

                    {/* Célula */}
                    <td className="leaders-page__col-group">
                      {leader.cellGroupCode || "-"}
                    </td>

                    {/* Fecha Promoción */}
                    <td className="leaders-page__col-date">
                      {leader.promotionDateFormatted}
                    </td>

                    {/* Última Verificación */}
                    <td className="leaders-page__col-verified">
                      <span
                        className="leaders-page__verified-badge"
                        style={{
                          backgroundColor: leader.lastVerificationDate
                            ? isDarkMode
                              ? "#10b98120"
                              : "#d1fae5"
                            : isDarkMode
                              ? "#6b728020"
                              : "#f3f4f6",
                          color: leader.lastVerificationDate
                            ? "#10b981"
                            : "#6b7280",
                        }}
                      >
                        {leader.lastVerificationDate
                          ? `✅ ${leader.lastVerificationFormatted}`
                          : "⏳ Nunca"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========== MODALES ========== */}

      {/* Modal Detalle de Líder */}
      <ModalLeaderDetail
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedLeader(null);
        }}
        leader={selectedLeader}
        isDarkMode={isDarkMode}
        loading={loading}
        onVerify={handleVerifyLeader}
        onSuspend={handleSuspendLeader}
        onUnsuspend={handleUnsuspendLeader}
        onDeactivate={handleDeactivateLeader}
        onReactivate={handleReactivateLeader}
        onEdit={handleEditLeader}
        onDelete={handleDeleteLeader}
      />

      {/* Modal Promover */}
      <ModalPromoteLeader
        isOpen={showPromoteModal}
        onClose={() => setShowPromoteModal(false)}
        onPromoteSuccess={() => {
          setShowPromoteModal(false);
          loadLeaders();
        }}
      />

      {/* Modal Estadísticas */}
      <ModalLeaderStatistics
        isOpen={showStatisticsModal}
        onClose={() => setShowStatisticsModal(false)}
        data={statisticsData}
        isDarkMode={isDarkMode}
      />

      {/* Modal de Verificación Masiva */}
      {showVerifyAllModal && verificationResult && (
        <div className="leaders-page__modal-overlay">
          <div
            className="leaders-page__modal"
            style={{ backgroundColor: theme.bgSecondary }}
          >
            <div className="leaders-page__modal-header">
              <h2>🔍 Resultado de Verificación Masiva</h2>
              <button onClick={() => setShowVerifyAllModal(false)}>✕</button>
            </div>
            <div className="leaders-page__modal-body">
              <p>✅ Verificación completada:</p>
              <ul>
                <li>
                  <strong>Total verificados:</strong>{" "}
                  {verificationResult.totalVerified}
                </li>
                <li>
                  <strong>Aún válidos:</strong> {verificationResult.stillValid}
                </li>
                <li>
                  <strong>Suspendidos:</strong> {verificationResult.suspended}
                </li>
              </ul>

              {verificationResult.suspendedLeaders?.length > 0 && (
                <>
                  <h3>Líderes suspendidos automáticamente:</h3>
                  <ul>
                    {verificationResult.suspendedLeaders.map((item, idx) => (
                      <li key={idx}>
                        <strong>{item.memberName}</strong>: {item.reason}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
            <div className="leaders-page__modal-footer">
              <button
                className="leaders-page__btn leaders-page__btn--primary"
                onClick={() => setShowVerifyAllModal(false)}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeadersPage;
