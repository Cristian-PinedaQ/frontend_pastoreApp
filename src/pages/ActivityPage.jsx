// ============================================
// ActivityPage.jsx - Gestión de Actividades
// ============================================

import React, { useState, useEffect, useCallback } from "react";
import apiService from "../apiService";
import ModalAddActivity from "../components/ModalAddActivity";
import ModalActivityDetails from "../components/ModalActivityDetails";
import ModalActivityParticipants from "../components/ModalActivityParticipants";
import ModalActivityFinance from "../components/ModalActivityFinance";
import { generateActivityPDF } from "../services/activityPdfGenerator";
import { logSecurityEvent, logUserAction } from "../utils/securityLogger";
import "../css/ActivityPage.css";

// 🔐 Debug condicional
const DEBUG = process.env.REACT_APP_DEBUG === "true";

const log = (message, data) => {
  if (DEBUG) {
    console.log(`[ActivityPage] ${message}`, data || "");
  }
};

const logError = (message, error) => {
  console.error(`[ActivityPage] ${message}`, error);
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

// ✅ Validación de cantidad
const validateAmount = (amount) => {
  const num = parseFloat(amount);
  if (isNaN(num)) return 0;
  if (num < 0) return 0;
  if (num > 999999999) return 999999999;
  return num;
};

// ✅ Formatear fecha
const formatDate = (dateString) => {
  try {
    if (!dateString) return "-";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "-";
    return date.toLocaleDateString("es-CO", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch (error) {
    logError("Error formateando fecha:", error);
    return "-";
  }
};

// ✅ Estado de actividad
const getStatusLabel = (isActive, endDate) => {
  try {
    if (!isActive) return { text: "🔴 Inactiva", color: "danger" };
    
    const today = new Date();
    const end = new Date(endDate);
    
    if (isNaN(end.getTime())) return { text: "🟡 Activa", color: "warning" };
    
    if (end < today) return { text: "⚫ Finalizada", color: "dark" };
    if (end.getTime() - today.getTime() <= 7 * 24 * 60 * 60 * 1000) {
      return { text: "🟠 Por finalizar", color: "warning" };
    }
    
    return { text: "🟢 Activa", color: "success" };
  } catch (error) {
    return { text: "⚪ Desconocido", color: "secondary" };
  }
};

// ✅ Formato de moneda
const formatCurrency = (amount) => {
  if (amount === null || amount === undefined) return "$ 0";
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const ActivityPage = () => {
  // ========== ESTADOS ==========
  const [allActivities, setAllActivities] = useState([]);
  const [filteredActivities, setFilteredActivities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Filtros
  const [searchText, setSearchText] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [selectedTimeframe, setSelectedTimeframe] = useState("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Modales
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showParticipantsModal, setShowParticipantsModal] = useState(false);
  const [showFinanceModal, setShowFinanceModal] = useState(false);
  
  // Datos seleccionados
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [activityBalance, setActivityBalance] = useState(null);
  const [activityParticipants, setActivityParticipants] = useState([]);

  // ========== CARGAR ACTIVIDADES ==========
  const loadActivities = useCallback(async () => {
    setLoading(true);
    setError(""); // 🔧 Limpiar errores previos

    try {
      log("Cargando actividades");

      const response = await apiService.request("/activity");
      
      // 🔧 Validación mejorada de respuesta
      if (!response) {
        log("Respuesta vacía del servidor");
        setAllActivities([]);
        setFilteredActivities([]);
        return;
      }

      // 🔧 Asegurar que response es un array
      const activities = Array.isArray(response) ? response : [];

      log("Actividades cargadas", { count: activities.length });

      // 🔧 Si no hay actividades, establecer arrays vacíos sin error
      if (activities.length === 0) {
        log("No hay actividades registradas");
        setAllActivities([]);
        setFilteredActivities([]);
        
        logUserAction("load_activities", {
          activityCount: 0,
          timestamp: new Date().toISOString(),
        });
        
        return;
      }

      const processedActivities = activities.map((activity) => ({
        id: activity.id,
        activityName: escapeHtml(activity.activityName || "Sin nombre"),
        price: validateAmount(activity.price),
        registrationDate: activity.registrationDate,
        endDate: activity.endDate,
        quantity: activity.quantity || 0,
        isActive: activity.isActive === true,
        status: getStatusLabel(activity.isActive, activity.endDate),
      }));

      log("Actividades procesadas", { count: processedActivities.length });
      setAllActivities(processedActivities);

      logUserAction("load_activities", {
        activityCount: processedActivities.length,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      logError("Error cargando actividades:", err);
      
      // 🔧 Mensaje de error más claro
      const errorMessage = err.message || "Error al cargar actividades";
      setError(errorMessage);
      
      // 🔧 Establecer arrays vacíos en caso de error
      setAllActivities([]);
      setFilteredActivities([]);

      logSecurityEvent("activity_load_error", {
        errorType: "api_error",
        errorMessage: errorMessage,
        timestamp: new Date().toISOString(),
      });
    } finally {
      setLoading(false);
    }
  }, []);

  // ========== CARGAR BALANCE DE ACTIVIDAD ==========
  const loadActivityBalance = useCallback(async (activityId) => {
    try {
      log("Cargando balance de actividad", { activityId });

      const balance = await apiService.request(`/activity/balance/${activityId}`);
      setActivityBalance(balance);

      log("Balance cargado", balance);
      return balance;
    } catch (err) {
      // 🔧 Solo loguear en modo DEBUG, no en producción
      if (DEBUG) {
        logError("Error cargando balance (no crítico):", err);
      }
      // Establecer balance como null silenciosamente
      setActivityBalance(null);
      return null;
    }
  }, []);

  // ========== CARGAR PARTICIPANTES ==========
  const loadActivityParticipants = useCallback(async (activityId) => {
    try {
      log("Cargando participantes", { activityId });

      const participants = await apiService.request(`/activity-contribution/activity/${activityId}`);
      setActivityParticipants(participants || []);

      log("Participantes cargados", { count: participants?.length || 0 });
      return participants || [];
    } catch (err) {
      // 🔧 Solo loguear en modo DEBUG, no en producción
      if (DEBUG) {
        logError("Error cargando participantes (no crítico):", err);
      }
      // Establecer array vacío silenciosamente
      setActivityParticipants([]);
      return [];
    }
  }, []);

  // ========== RECARGAR Y LIMPIAR FILTROS ==========
  const handleReloadAndClearFilters = useCallback(async () => {
    try {
      log("Recargando datos y limpiando filtros");

      // 🔧 Limpiar error antes de recargar
      setError("");
      setSelectedStatus("ALL");
      setSelectedTimeframe("ALL");
      setSearchText("");
      setStartDate("");
      setEndDate("");

      await loadActivities();

      log("Filtros limpiados y datos recargados");
    } catch (error) {
      logError("Error recargando:", error);
      setError("Error al recargar datos");
    }
  }, [loadActivities]);

  // ========== APLICAR FILTROS ==========
  const applyFilters = useCallback(() => {
    try {
      let filtered = [...allActivities];

      // Ordenar por fecha de finalización (más cercanas primero)
      filtered.sort((a, b) => {
        try {
          const dateA = new Date(a.endDate || 0).getTime();
          const dateB = new Date(b.endDate || 0).getTime();
          return dateA - dateB;
        } catch (e) {
          return 0;
        }
      });

      // Filtrar por estado
      if (selectedStatus !== "ALL") {
        filtered = filtered.filter((activity) => {
          if (selectedStatus === "ACTIVE") return activity.isActive === true;
          if (selectedStatus === "INACTIVE") return activity.isActive === false;
          if (selectedStatus === "ENDING_SOON") {
            const endDate = new Date(activity.endDate);
            const today = new Date();
            const daysLeft = (endDate - today) / (1000 * 60 * 60 * 24);
            return activity.isActive && daysLeft <= 7 && daysLeft >= 0;
          }
          if (selectedStatus === "FINISHED") {
            const endDate = new Date(activity.endDate);
            const today = new Date();
            return endDate < today;
          }
          return true;
        });
      }

      // Filtrar por período de tiempo
      if (selectedTimeframe !== "ALL") {
        const today = new Date();
        filtered = filtered.filter((activity) => {
          const endDate = new Date(activity.endDate);
          if (isNaN(endDate.getTime())) return false;

          const daysDifference = (endDate - today) / (1000 * 60 * 60 * 24);
          
          if (selectedTimeframe === "THIS_WEEK") return daysDifference <= 7 && daysDifference >= 0;
          if (selectedTimeframe === "THIS_MONTH") return daysDifference <= 30 && daysDifference >= 0;
          if (selectedTimeframe === "NEXT_MONTH") return daysDifference <= 60 && daysDifference > 30;
          if (selectedTimeframe === "PAST") return daysDifference < 0;
          return true;
        });
      }

      // Filtrar por fechas personalizadas
      if (startDate && !endDate) {
        const targetDate = startDate;
        filtered = filtered.filter((activity) => {
          try {
            const activityDate = new Date(activity.endDate);
            const activityDateString = activityDate.toISOString().split('T')[0];
            return activityDateString === targetDate;
          } catch (e) {
            return false;
          }
        });
      } else if (startDate && endDate) {
        filtered = filtered.filter((activity) => {
          try {
            const activityDate = new Date(activity.endDate);
            const activityDateString = activityDate.toISOString().split('T')[0];
            return activityDateString >= startDate && activityDateString <= endDate;
          } catch (e) {
            return false;
          }
        });
      }

      // Filtrar por búsqueda
      if (searchText.trim()) {
        const search = searchText.toLowerCase();
        filtered = filtered.filter((activity) =>
          activity.activityName.toLowerCase().includes(search)
        );
      }

      log("Filtros aplicados", { count: filtered.length });
      setFilteredActivities(filtered);
    } catch (error) {
      logError("Error aplicando filtros:", error);
      setFilteredActivities(allActivities);
    }
  }, [allActivities, selectedStatus, selectedTimeframe, searchText, startDate, endDate]);

  // ========== CARGA INICIAL ==========
  useEffect(() => {
    loadActivities();
  }, [loadActivities]);

  // ========== APLICAR FILTROS AL CAMBIAR ==========
  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  // ========== AGREGAR ACTIVIDAD ==========
  const handleAddActivity = useCallback(async (activityData) => {
    try {
      log("Creando nueva actividad");

      if (!activityData || typeof activityData !== "object") {
        setError("Datos de actividad inválidos");
        return;
      }

      await apiService.request("/activity/save", {
        method: "POST",
        body: JSON.stringify(activityData),
      });

      log("Actividad creada exitosamente");

      logUserAction("create_activity", {
        name: activityData.activityName,
        price: activityData.price,
        timestamp: new Date().toISOString(),
      });

      alert("Actividad creada exitosamente");
      setShowAddModal(false);
      loadActivities();
    } catch (err) {
      logError("Error creando actividad:", err);
      setError("Error al crear actividad: " + (err.message || ""));
    }
  }, [loadActivities]);

  // ========== ACTUALIZAR ACTIVIDAD ==========
  const handleUpdateActivity = useCallback(async (activityId, activityData) => {
    try {
      if (!activityId) {
        setError("ID de actividad inválido");
        return;
      }

      if (!activityData || typeof activityData !== "object") {
        setError("Datos de actividad inválidos");
        return;
      }

      log("Actualizando actividad", { activityId });

      await apiService.request(`/activity/patch/${activityId}`, {
        method: "PATCH",
        body: JSON.stringify(activityData),
      });

      log("Actividad actualizada exitosamente");

      logUserAction("update_activity", {
        activityId,
        timestamp: new Date().toISOString(),
      });

      alert("Actividad actualizada exitosamente");
      setShowAddModal(false);
      setSelectedActivity(null);
      loadActivities();
    } catch (err) {
      logError("Error actualizando actividad:", err);
      setError("Error al actualizar actividad: " + (err.message || ""));
    }
  }, [loadActivities]);

  // ========== ELIMINAR/DESACTIVAR ACTIVIDAD ==========
  const handleDeleteActivity = useCallback(async (activityId) => {
    try {
      if (!activityId) {
        setError("ID de actividad inválido");
        return;
      }

      if (!window.confirm("¿Estás seguro de que deseas desactivar esta actividad?")) {
        return;
      }

      log("Desactivando actividad", { activityId });

      await apiService.request(`/activity/delete/${activityId}`, {
        method: "DELETE",
      });

      log("Actividad desactivada exitosamente");

      logUserAction("delete_activity", {
        activityId,
        timestamp: new Date().toISOString(),
      });

      alert("Actividad desactivada exitosamente");
      loadActivities();
    } catch (err) {
      logError("Error desactivando actividad:", err);
      setError("Error al desactivar actividad: " + (err.message || ""));
    }
  }, [loadActivities]);

  // ========== VER DETALLES DE ACTIVIDAD ==========
  const handleViewDetails = useCallback(async (activity) => {
    log("Mostrando detalles de actividad", { activityId: activity.id });
    
    // 🔧 Abrir modal INMEDIATAMENTE sin esperar
    setSelectedActivity(activity);
    setShowDetailsModal(true);
    
    // 🔧 Cargar balance en segundo plano (no bloqueante)
    loadActivityBalance(activity.id);

    logUserAction("view_activity_details", {
      activityId: activity.id,
      timestamp: new Date().toISOString(),
    });
  }, [loadActivityBalance]);

  // ========== VER PARTICIPANTES ==========
  const handleViewParticipants = useCallback(async (activity) => {
    log("Mostrando participantes", { activityId: activity.id });
    
    // 🔧 Abrir modal INMEDIATAMENTE sin esperar
    setSelectedActivity(activity);
    setShowParticipantsModal(true);
    
    // 🔧 Cargar participantes en segundo plano (no bloqueante)
    loadActivityParticipants(activity.id);

    logUserAction("view_activity_participants", {
      activityId: activity.id,
      timestamp: new Date().toISOString(),
    });
  }, [loadActivityParticipants]);

  // ========== VER FINANZAS ==========
  const handleViewFinance = useCallback(async (activity) => {
    log("Mostrando finanzas", { activityId: activity.id });
    
    // 🔧 Abrir modal INMEDIATAMENTE sin esperar
    setSelectedActivity(activity);
    setShowFinanceModal(true);
    
    // 🔧 Cargar balance en segundo plano (no bloqueante)
    loadActivityBalance(activity.id);

    logUserAction("view_activity_finance", {
      activityId: activity.id,
      timestamp: new Date().toISOString(),
    });
  }, [loadActivityBalance]);

  // ========== EXPORTAR PDF ==========
  const handleExportPDF = useCallback(async () => {
    try {
      log("Generando PDF de actividades");

      let title = "Reporte de Actividades";
      let subtitle = "";

      if (selectedStatus !== "ALL") {
        const statusLabels = {
          "ACTIVE": "Activas",
          "INACTIVE": "Inactivas",
          "ENDING_SOON": "Por finalizar",
          "FINISHED": "Finalizadas",
        };
        subtitle = `Estado: ${statusLabels[selectedStatus] || selectedStatus}`;
      }

      if (startDate && endDate) {
        subtitle += (subtitle ? " • " : "") + `Período: ${startDate} al ${endDate}`;
      }

      const data = {
        title,
        subtitle,
        date: new Date().toLocaleDateString("es-CO"),
        activities: filteredActivities,
        statistics: {
          totalActivities: filteredActivities.length,
          totalActive: filteredActivities.filter(a => a.isActive).length,
          totalParticipants: filteredActivities.reduce((sum, a) => sum + (a.quantity || 0), 0),
          totalValue: filteredActivities.reduce((sum, a) => sum + (a.price || 0) * (a.quantity || 0), 0),
        },
      };

      generateActivityPDF(data, "activity-report");

      log("PDF generado exitosamente");

      logUserAction("export_activity_pdf", {
        activityCount: filteredActivities.length,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      logError("Error generando PDF:", err);
      setError("Error al generar PDF");
    }
  }, [filteredActivities, selectedStatus, startDate, endDate]);

  // ========== INSCRIBIR PARTICIPANTE ==========
  const handleEnrollParticipant = useCallback(async (activityId, memberId, initialPayment) => {
    try {
      log("Inscribiendo participante", { activityId, memberId });

      const enrollmentData = {
        memberId,
        activityId,
        initialPaymentAmount: initialPayment || 0,
        recordedBy: apiService.getCurrentUser()?.username || "Sistema",
        incomeMethod: "CASH",
      };

      await apiService.request("/activity-contribution/create-with-initial-payment", {
        method: "POST",
        body: JSON.stringify(enrollmentData),
      });

      log("Participante inscrito exitosamente");

      logUserAction("enroll_participant", {
        activityId,
        memberId,
        timestamp: new Date().toISOString(),
      });

      alert("Participante inscrito exitosamente");
      
      // Recargar datos si estamos viendo participantes o detalles
      if (showParticipantsModal) {
        await loadActivityParticipants(activityId);
      }
      if (showDetailsModal || showFinanceModal) {
        await loadActivityBalance(activityId);
      }
      
      return true;
    } catch (err) {
      logError("Error inscribiendo participante:", err);
      setError("Error al inscribir participante");
      return false;
    }
  }, [showParticipantsModal, showDetailsModal, showFinanceModal, loadActivityParticipants, loadActivityBalance]);

  // ========== RENDER ==========
  return (
    <div className="activity-page">
      <div className="activity-page-container">
        {/* HEADER */}
        <div className="activity-page__header">
          <h1>📋 Gestión de Actividades</h1>
          <p>Crea y administra actividades, inscripciones y finanzas</p>
        </div>

        {/* CONTROLES */}
        <div className="activity-page__controls">
          <div className="activity-page__controls-grid">
            {/* Búsqueda */}
            <div className="activity-page__filter-item">
              <label>🔍 Buscar Actividad</label>
              <input
                type="text"
                placeholder="Nombre de la actividad..."
                value={searchText}
                onChange={(e) => setSearchText(validateSearchText(e.target.value))}
                maxLength="100"
              />
            </div>

            {/* Filtro por estado */}
            <div className="activity-page__filter-item">
              <label>📊 Estado</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
              >
                <option value="ALL">Todos los Estados</option>
                <option value="ACTIVE">🟢 Activas</option>
                <option value="INACTIVE">🔴 Inactivas</option>
                <option value="ENDING_SOON">🟠 Por finalizar</option>
                <option value="FINISHED">⚫ Finalizadas</option>
              </select>
            </div>

            {/* Filtro por tiempo */}
            <div className="activity-page__filter-item">
              <label>⏰ Período</label>
              <select
                value={selectedTimeframe}
                onChange={(e) => setSelectedTimeframe(e.target.value)}
              >
                <option value="ALL">Todo el tiempo</option>
                <option value="THIS_WEEK">Esta semana</option>
                <option value="THIS_MONTH">Este mes</option>
                <option value="NEXT_MONTH">Próximo mes</option>
                <option value="PAST">Pasadas</option>
              </select>
            </div>

            {/* Filtro por fechas */}
            <div className="activity-page__filter-item">
              <label>📅 Desde</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="activity-page__filter-item">
              <label>📅 Hasta</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          {/* ACCIONES PRINCIPALES */}
          <div className="activity-page__actions">
            <button
              className="activity-page__btn activity-page__btn--primary"
              onClick={() => {
                setSelectedActivity(null);
                setShowAddModal(true);
              }}
              title="Crear nueva actividad"
            >
              ➕ Nueva Actividad
            </button>

            <button
              className="activity-page__btn activity-page__btn--secondary"
              onClick={handleExportPDF}
              disabled={filteredActivities.length === 0}
              title="Exportar reporte en PDF"
            >
              📄 Exportar PDF
            </button>

            <button
              className="activity-page__btn activity-page__btn--refresh"
              onClick={handleReloadAndClearFilters}
              disabled={loading}
              title="Recargar datos y limpiar filtros"
            >
              🔄 Recargar
            </button>
          </div>
        </div>

        {/* INFORMACIÓN DE FILTROS */}
        <div className="activity-page__filter-info">
          <p>
            Mostrando <strong>{filteredActivities.length}</strong> de{" "}
            <strong>{allActivities.length}</strong> actividades
            {selectedStatus !== "ALL" && ` · ${selectedStatus === "ACTIVE" ? "🟢 Activas" : 
              selectedStatus === "INACTIVE" ? "🔴 Inactivas" : 
              selectedStatus === "ENDING_SOON" ? "🟠 Por finalizar" : 
              "⚫ Finalizadas"}`}
            {selectedTimeframe !== "ALL" && ` · ${selectedTimeframe === "THIS_WEEK" ? "Esta semana" : 
              selectedTimeframe === "THIS_MONTH" ? "Este mes" : 
              selectedTimeframe === "NEXT_MONTH" ? "Próximo mes" : "Pasadas"}`}
            {startDate && endDate && ` · 📅 ${startDate} al ${endDate}`}
          </p>
        </div>

        {/* MENSAJES DE ERROR */}
        {error && (
          <div className="activity-page__error">
            ❌ {error}
            <button 
              onClick={() => setError("")}
              style={{ 
                marginLeft: '10px', 
                background: 'none', 
                border: 'none', 
                color: 'inherit', 
                cursor: 'pointer',
                fontSize: '1.2em'
              }}
            >
              ✖
            </button>
          </div>
        )}

        {/* LOADING */}
        {loading ? (
          <div className="activity-page__loading">
            ⏳ Cargando actividades...
          </div>
        ) : filteredActivities.length === 0 ? (
          <div className="activity-page__empty">
            {/* 🔧 Mensaje mejorado cuando no hay actividades */}
            {allActivities.length === 0 ? (
              <>
                <p>📋 No hay actividades registradas</p>
                <p className="activity-page__empty-hint">
                  💡 Comienza creando tu primera actividad con el botón "➕ Nueva Actividad"
                </p>
              </>
            ) : (
              <>
                <p>📋 No hay actividades que coincidan con los filtros aplicados</p>
                <p className="activity-page__empty-hint">
                  💡 Intenta ajustar o limpiar los filtros para ver más resultados
                </p>
              </>
            )}
          </div>
        ) : (
          /* TABLA DE ACTIVIDADES */
          <div className="activity-page__table-container">
            <table className="activity-page__table">
              <thead>
                <tr>
                  <th className="activity-page__col-name">Actividad</th>
                  <th className="activity-page__col-price">Precio</th>
                  <th className="activity-page__col-participants">Participantes</th>
                  <th className="activity-page__col-status">Estado</th>
                  <th className="activity-page__col-date">Fecha Fin</th>
                  <th className="activity-page__col-actions">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredActivities.map((activity) => (
                  <tr 
                    key={activity.id} 
                    className={`activity-${activity.status.color} activity-row-clickable`}
                    onClick={() => handleViewDetails(activity)}
                    title="Clic para ver detalles"
                  >
                    <td className="activity-page__col-name">
                      <div className="activity-page__activity-info">
                        <span className="activity-page__icon">📋</span>
                        <div>
                          <span className="activity-page__activity-name">
                            {activity.activityName}
                          </span>
                          {activity.quantity && activity.quantity > 0 && (
                            <small className="activity-page__capacity">
                              Capacidad: {activity.quantity}
                            </small>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="activity-page__col-price">
                      <span className="activity-page__price">
                        {formatCurrency(activity.price)}
                      </span>
                    </td>

                    <td className="activity-page__col-participants">
                      <span className="activity-page__participants">
                        👥 {activity.quantity || 0}
                      </span>
                    </td>

                    <td className="activity-page__col-status">
                      <span className={`activity-page__status-badge ${activity.status.color}`}>
                        {activity.status.text}
                      </span>
                    </td>

                    <td className="activity-page__col-date">
                      {formatDate(activity.endDate)}
                    </td>

                    <td className="activity-page__col-actions" onClick={(e) => e.stopPropagation()}>
                      <div className="activity-page__action-buttons">
                        <button
                          className="activity-page__btn-action participants"
                          onClick={() => handleViewParticipants(activity)}
                          title="Ver participantes"
                        >
                          👥
                        </button>
                        <button
                          className="activity-page__btn-action finance"
                          onClick={() => handleViewFinance(activity)}
                          title="Ver finanzas"
                        >
                          💰
                        </button>
                        <button
                          className="activity-page__btn-action edit"
                          onClick={() => {
                            setSelectedActivity(activity);
                            setShowAddModal(true);
                          }}
                          title="Editar actividad"
                        >
                          ✏️
                        </button>
                        <button
                          className="activity-page__btn-action delete"
                          onClick={() => handleDeleteActivity(activity.id)}
                          title="Desactivar actividad"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODALES */}
      <ModalAddActivity
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setSelectedActivity(null);
        }}
        onSave={selectedActivity ? 
          (data) => handleUpdateActivity(selectedActivity.id, data) : 
          handleAddActivity}
        initialData={selectedActivity}
        isEditing={!!selectedActivity}
      />

      <ModalActivityDetails
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedActivity(null);
          setActivityBalance(null);
        }}
        activity={selectedActivity}
        balance={activityBalance}
        onEnrollParticipant={handleEnrollParticipant}
      />

      <ModalActivityParticipants
        isOpen={showParticipantsModal}
        onClose={() => {
          setShowParticipantsModal(false);
          setSelectedActivity(null);
          setActivityParticipants([]);
        }}
        activity={selectedActivity}
        participants={activityParticipants}
        onEnrollParticipant={handleEnrollParticipant}
      />

      <ModalActivityFinance
        isOpen={showFinanceModal}
        onClose={() => {
          setShowFinanceModal(false);
          setSelectedActivity(null);
          setActivityBalance(null);
        }}
        activity={selectedActivity}
        balance={activityBalance}
      />

      <style>{`
        .activity-page {
          transition: all 0.3s ease;
        }
        
        .activity-page__error button:hover {
          opacity: 0.7;
        }
        
        /* Estilos para filas clickeables */
        .activity-row-clickable {
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .activity-row-clickable:hover {
          background-color: rgba(0, 123, 255, 0.05) !important;
          transform: scale(1.01);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
        
        .activity-row-clickable:active {
          transform: scale(0.99);
        }
        
        /* Evitar que la columna de acciones active el clic de la fila */
        .activity-page__col-actions {
          pointer-events: auto;
        }
      `}</style>
    </div>
  );
};

export default ActivityPage;