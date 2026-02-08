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

  // Estado para verificar si hay filtros aplicados
  const [filtersApplied, setFiltersApplied] = useState(false);

  // ========== VERIFICAR FILTROS APLICADOS ==========
  useEffect(() => {
    const hasFilters = 
      searchText.trim() !== "" ||
      selectedStatus !== "ALL" ||
      startDate !== "" ||
      endDate !== "";
    
    setFiltersApplied(hasFilters);
  }, [searchText, selectedStatus, startDate, endDate]);

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

      // ✅ CORREGIDO: Usar el endpoint correcto con información de líder y distrito
      const participants = await apiService.request(`/activity-contribution/activity/${activityId}/with-leader-info`);
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
      setSearchText("");
      setStartDate("");
      setEndDate("");
      setFiltersApplied(false);

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
  }, [allActivities, selectedStatus, searchText, startDate, endDate]);

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
    setError(""); // Limpiar errores previos
    log("Generando PDF de actividades");

    // Mostrar loading
    setLoading(true);

    let title = "Reporte de Actividades";
    let subtitle = "";

    // Crear subtítulo con filtros aplicados
    const filterLabels = [];

    if (selectedStatus !== "ALL") {
      const statusLabels = {
        "ACTIVE": "Activas",
        "INACTIVE": "Inactivas",
        "ENDING_SOON": "Por finalizar",
        "FINISHED": "Finalizadas",
      };
      filterLabels.push(`Estado: ${statusLabels[selectedStatus] || selectedStatus}`);
    }

    if (searchText.trim()) {
      filterLabels.push(`Búsqueda: "${searchText}"`);
    }

    if (startDate && endDate) {
      filterLabels.push(`Período: ${startDate} al ${endDate}`);
    } else if (startDate) {
      filterLabels.push(`Fecha: ${startDate}`);
    }

    subtitle = filterLabels.join(" • ");

    const data = {
      title,
      subtitle: subtitle || "Todos los registros",
      date: new Date().toLocaleDateString("es-CO"),
      activities: filteredActivities,
      statistics: {
        totalActivities: filteredActivities.length,
        totalActive: filteredActivities.filter(a => a.isActive).length,
        totalParticipants: filteredActivities.reduce((sum, a) => sum + (a.quantity || 0), 0),
        totalValue: filteredActivities.reduce((sum, a) => sum + (a.price || 0) * (a.quantity || 0), 0),
      },
    };

    // 🔧 Generar PDF
    const success = await generateActivityPDF(data, "reporte-actividades");

    if (success) {
      log("PDF generado exitosamente");
      
      logUserAction("export_activity_pdf", {
        activityCount: filteredActivities.length,
        filtersApplied: filtersApplied,
        timestamp: new Date().toISOString(),
      });
      
      // Mostrar mensaje de éxito
      alert(`✅ PDF generado exitosamente\n📄 Se descargó el archivo: reporte-actividades-${new Date().toISOString().split('T')[0]}.pdf`);
    } else {
      throw new Error("No se pudo generar el PDF");
    }
  } catch (err) {
    logError("Error generando PDF:", err);
    setError("Error al generar PDF. Por favor, intente nuevamente.");
  } finally {
    setLoading(false);
  }
}, [filteredActivities, selectedStatus, searchText, startDate, endDate, filtersApplied]);

  // ========== INSCRIBIR PARTICIPANTE ==========
 // ========== INSCRIBIR PARTICIPANTE ==========
// ========== INSCRIBIR PARTICIPANTE ==========
// ========== INSCRIBIR PARTICIPANTE ==========
const handleEnrollParticipant = useCallback(async (activityId, memberId, initialPayment) => {
  try {
    log("Inscribiendo participante", { activityId, memberId, initialPayment });

    const currentUser = apiService.getCurrentUser();
    const recordedBy = currentUser?.username || "Sistema";

    // CORRECCIÓN: Verificar si realmente hay pago inicial
    const hasInitialPayment = initialPayment && parseFloat(initialPayment) > 0;

    // PRIMERO: Verificar si el miembro ya está inscrito en esta actividad
    log("Verificando si el miembro ya está inscrito...");
    
    let alreadyEnrolled = false;
    try {
      // Cargar los participantes actuales de la actividad
      const currentParticipants = await apiService.request(`/activity-contribution/activity/${activityId}/with-leader-info`);
      
      if (Array.isArray(currentParticipants)) {
        alreadyEnrolled = currentParticipants.some(
          participant => {
            // Verificar por memberId directo
            if (participant.memberId === memberId) return true;
            
            // Verificar por objeto member anidado
            if (participant.member && participant.member.id === memberId) return true;
            
            // Verificar por miembro como objeto en member
            if (participant.member && participant.member.memberId === memberId) return true;
            
            return false;
          }
        );
        
        if (alreadyEnrolled) {
          const errorMsg = "❌ Este miembro ya está inscrito en esta actividad";
          setError(errorMsg);
          log("Miembro ya inscrito", { activityId, memberId });
          return false; // 🔴 IMPORTANTE: Retornar false para detener la ejecución
        }
      }
    } catch (checkError) {
      log("No se pudo verificar inscripción previa, continuando...", checkError);
      // Continuamos aunque falle la verificación, el backend lo validará
    }

    // 🔴 CORRECCIÓN: Si ya está inscrito, NO continuar
    if (alreadyEnrolled) {
      return false;
    }

    let response;
    let endpoint;
    let enrollmentData;

    if (hasInitialPayment) {
      // CASO 1: Con pago inicial
      endpoint = "/activity-contribution/create-with-initial-payment";
      enrollmentData = {
        memberId,
        activityId,
        incomeMethod: "CASH", // Valor por defecto
        recordedBy,
        initialPaymentAmount: parseFloat(initialPayment),
      };
    } else {
      // CASO 2: Sin pago inicial - usar endpoint diferente
      endpoint = "/activity-contribution/save";
      enrollmentData = {
        memberId,
        activityId,
        recordedBy,
        // NO enviar initialPaymentAmount ni incomeMethod
      };
    }

    log(`Enviando a ${endpoint}`, enrollmentData);

    response = await apiService.request(endpoint, {
      method: "POST",
      body: JSON.stringify(enrollmentData),
    });

    log("Participante inscrito exitosamente", response);

    logUserAction("enroll_participant", {
      activityId,
      memberId,
      hasInitialPayment,
      timestamp: new Date().toISOString(),
    });

    alert(`✅ Participante inscrito ${hasInitialPayment ? `con pago de $${parseFloat(initialPayment).toLocaleString("es-CO")}` : "sin pago inicial"}`);
    
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
    
    // Mensaje de error más específico
    let errorMessage = "Error al inscribir participante";
    if (err.response?.data?.error) {
      errorMessage = err.response.data.error;
    } else if (err.message) {
      errorMessage = err.message;
    } else if (err.fields) {
      const fieldErrors = Object.values(err.fields).join(', ');
      errorMessage = `Error de validación: ${fieldErrors}`;
    }
    
    setError(errorMessage);
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

            {/* Filtro por fechas - DESDE */}
            <div className="activity-page__filter-item">
              <label>📅 Desde</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            {/* Filtro por fechas - HASTA */}
            <div className="activity-page__filter-item">
              <label>📅 Hasta</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
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
              disabled={!filtersApplied || filteredActivities.length === 0}
              title={!filtersApplied ? "Aplica al menos un filtro para exportar" : "Exportar reporte en PDF"}
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
            {searchText.trim() && ` · 🔍 "${searchText}"`}
            {startDate && endDate && ` · 📅 ${startDate} al ${endDate}`}
            {startDate && !endDate && ` · 📅 ${startDate}`}
          </p>
          {filtersApplied && (
            <div className="activity-page__filters-applied">
              <small>✅ Filtros aplicados: El botón Exportar PDF está habilitado</small>
            </div>
          )}
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
        
        /* Estilo para indicador de filtros aplicados */
        .activity-page__filters-applied {
          margin-top: 5px;
          padding: 5px 10px;
          background-color: rgba(0, 123, 255, 0.1);
          border-radius: 4px;
          color: #007bff;
          font-size: 0.9em;
        }
        
        /* Estilo para botón deshabilitado con tooltip */
        .activity-page__btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          position: relative;
        }
        
        .activity-page__btn:disabled:hover::after {
          content: attr(title);
          position: absolute;
          bottom: 100%;
          left: 50%;
          transform: translateX(-50%);
          background: #333;
          color: white;
          padding: 5px 10px;
          border-radius: 4px;
          font-size: 0.8em;
          white-space: nowrap;
          z-index: 1000;
        }
      `}</style>
    </div>
  );
};

export default ActivityPage;